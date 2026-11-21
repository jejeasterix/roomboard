import { describe, expect, it, vi } from "vitest";
import { decodeImage, DISPLAY_MAX, ImageTooLargeError, type DecodePorts } from "./image-decode";
import * as page from "./image-import";

const bmp = (width: number, height: number) => ({ width, height, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
/** Faux ports du Worker : bitmap `w × h` au premier appel, bitmap redimensionné ensuite ; SVG refusé (pas de DOM). */
function ports(w: number, h: number) {
  const calls: (ImageBitmapOptions | undefined)[] = [];
  const made: ReturnType<typeof bmp>[] = [];
  const p: DecodePorts = {
    createImageBitmap: vi.fn(async (_src: ImageBitmapSource, opts?: ImageBitmapOptions) => {
      calls.push(opts);
      const b = opts?.resizeWidth !== undefined ? bmp(opts.resizeWidth, opts.resizeHeight ?? 0) : bmp(w, h);
      made.push(b);
      return b;
    }),
    loadSvg: vi.fn(async () => {
      throw new Error("SVG non décodable dans le Worker");
    }),
  };
  return { p, calls, made };
}
const blob = new Blob([new Uint8Array([1])]);

describe("décodage sans DOM (C6b, B7, B25)", () => {
  it("S5 h : max = Infinity : une photo de 6000 × 4000 garde sa pleine résolution, orientation EXIF appliquée (RF1)", async () => {
    const { p, calls } = ports(6000, 4000);
    const d = await decodeImage(blob, "jpeg", Infinity, p);
    expect([d.bitmap.width, d.bitmap.height, d.w, d.h]).toEqual([6000, 4000, 6000, 4000]);
    expect(calls).toEqual([{ imageOrientation: "from-image" }]);
  });
  it("copie d'affichage : côté le plus long ramené à 4096, original fermé", async () => {
    const { p, made } = ports(6000, 4000);
    const d = await decodeImage(blob, "png", DISPLAY_MAX, p);
    expect([d.bitmap.width, d.bitmap.height, d.w, d.h]).toEqual([4096, 2731, 6000, 4000]);
    expect(made[0]?.close).toHaveBeenCalledTimes(1);
  });
  it("plus de 100 Mpx : ImageTooLargeError, bitmap fermé", async () => {
    const { p, made } = ports(12000, 9000);
    await expect(decodeImage(blob, "png", Infinity, p)).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(made[0]?.close).toHaveBeenCalledTimes(1);
  });
  it("SVG : le loadSvg du Worker refuse", async () => {
    const { p } = ports(10, 10);
    await expect(decodeImage(blob, "svg", Infinity, p)).rejects.toThrow("SVG non décodable dans le Worker");
  });
  it("image-import réexporte les mêmes valeurs (appelants inchangés)", () => {
    expect(page.DISPLAY_MAX).toBe(DISPLAY_MAX);
    expect(page.ImageTooLargeError).toBe(ImageTooLargeError);
    expect(page.MAX_PIXELS).toBe(100_000_000);
  });
});
