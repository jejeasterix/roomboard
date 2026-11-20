import { describe, expect, it, vi } from "vitest";
import { createImageCache, type BitmapLike } from "./image-cache";

const ID = "ab".repeat(32);
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
function store(entries: Record<string, Blob> = { [ID]: new Blob([new Uint8Array([1])]) }) {
  return { get: vi.fn((id: string) => entries[id]) };
}
const bitmap = (): BitmapLike & { close: ReturnType<typeof vi.fn> } => ({ close: vi.fn() }) as unknown as BitmapLike & { close: ReturnType<typeof vi.fn> };

describe("cache des bitmaps par empreinte (DAR2, R16)", () => {
  it("premier appel : null et un décodage ; prêt → bitmap, ready appelé une fois", async () => {
    const bmp = bitmap();
    const decode = vi.fn(async () => bmp);
    const ready = vi.fn();
    const c = createImageCache(store(), decode, ready);
    expect(c.bitmap(ID)).toBeNull();
    expect(c.bitmap(ID)).toBeNull(); // en cours : pas de second décodage
    await flush();
    expect(c.bitmap(ID)).toBe(bmp);
    expect([decode.mock.calls.length, ready.mock.calls.length]).toEqual([1, 1]);
  });

  it("asset absent du magasin : null, aucun décodage", () => {
    const decode = vi.fn(async () => bitmap());
    expect(createImageCache(store({}), decode, vi.fn()).bitmap(ID)).toBeNull();
    expect(decode).not.toHaveBeenCalled();
  });

  it("décodage en échec : null ensuite, sans nouvel essai", async () => {
    const decode = vi.fn(async (): Promise<BitmapLike> => {
      throw new Error("illisible");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const c = createImageCache(store(), decode, vi.fn());
    c.bitmap(ID);
    await flush();
    expect(c.bitmap(ID)).toBeNull();
    expect(decode).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("dispose ferme les bitmaps prêts", async () => {
    const bmp = bitmap();
    const c = createImageCache(store(), async () => bmp, vi.fn());
    c.bitmap(ID);
    await flush();
    c.dispose();
    expect(bmp.close).toHaveBeenCalledTimes(1);
    expect(c.bitmap(ID)).toBeNull();
  });

  it("dispose puis décodage fini : bitmap fermé aussitôt, ready jamais appelé", async () => {
    const bmp = bitmap();
    let resolve!: (b: BitmapLike) => void;
    const ready = vi.fn();
    const c = createImageCache(store(), () => new Promise<BitmapLike>((r) => (resolve = r)), ready);
    c.bitmap(ID);
    c.dispose();
    resolve(bmp);
    await flush();
    expect(bmp.close).toHaveBeenCalledTimes(1);
    expect(ready).not.toHaveBeenCalled();
  });
});
