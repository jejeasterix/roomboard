import { describe, expect, it, vi } from "vitest";
import { IDENTITY } from "../engine/camera";
import {
  anchorOf,
  decodeImage,
  imageHandler,
  ImageTooLargeError,
  jpegSize,
  kindOfMime,
  placement,
  probeSize,
  sniffImage,
  TAB_CLOSED_MESSAGE,
  visibleOf,
  type DecodePorts,
} from "./image-import";

const bytes = (...parts: Array<readonly number[] | string>): Uint8Array<ArrayBuffer> =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : [...p])));
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function pngHead(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([...PNG_SIG, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}
/** SOI, APP0 de 16 octets, puis SOF0 (hauteur, largeur gros-boutistes). */
const jpeg = (w: number, h: number): Uint8Array<ArrayBuffer> =>
  bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "JFIF\0", [1, 1, 0, 0, 1, 0, 1, 0, 0],
    [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);

describe("sniffImage (R1, R14)", () => {
  const cases: Array<[string, Uint8Array, string]> = [
    ["png", pngHead(1, 1), "a"],
    ["jpeg", bytes([0xff, 0xd8, 0xff, 0xe0]), "a"],
    ["gif", bytes("GIF89a", [1, 0, 1, 0]), "a"],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "), "a"],
    ["bmp", bytes("BM", new Array<number>(24).fill(0)), "a"],
    ["ico", bytes([0, 0, 1, 0, 1, 0, 16, 16]), "a"],
    ["avif", bytes([0, 0, 0, 0x1c], "ftypavif", [0, 0, 0, 0], "avifmif1"), "a"],
    ["heic", bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic"), "a"],
    ["svg", bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>'), "a"],
    ["svg", bytes([0xef, 0xbb, 0xbf], "  <svg viewBox='0 0 1 1'></svg>"), "dessin"],
  ];
  for (const [kind, head, name] of cases) it(`${kind} reconnu par ses octets`, () => expect(sniffImage(head, name)).toBe(kind));

  it("SVG : seulement si le texte commence par <svg (après prologue, commentaires, DOCTYPE)", () => {
    const doc = bytes('<?xml version="1.0"?><!-- c --><!DOCTYPE svg PUBLIC "x" "y">\n<svg/>');
    expect(sniffImage(doc, "a")).toBe("svg");
    expect(sniffImage(bytes("<!DOCTYPE html><html><body><svg width='1'></svg></body></html>"), "page.svg")).toBeNull();
    expect(sniffImage(bytes("<html><svg/></html>"), "a")).toBeNull();
    // SVG d'Illustrator : DOCTYPE avec sous-ensemble interne (entités).
    const ai = bytes('<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [\n<!ENTITY ns_svg "http://www.w3.org/2000/svg">\n]>\n<svg xmlns="&ns_svg;"/>');
    expect(sniffImage(ai, "a")).toBe("svg");
    expect(sniffImage(bytes('<!DOCTYPE html [<!ENTITY a "b">]><html><svg/></html>'), "page.svg")).toBeNull();
  });

  it("TIFF, ZIP, texte et HTML : non reconnus (R14 : TIFF refusé)", () => {
    expect(sniffImage(bytes([0x49, 0x49, 0x2a, 0x00]), "photo.tif")).toBeNull();
    expect(sniffImage(bytes([0x4d, 0x4d, 0x00, 0x2a]), "photo.tiff")).toBeNull();
    expect(sniffImage(bytes([0x50, 0x4b, 3, 4]), "a.png")).toBeNull();
    expect(sniffImage(bytes("bonjour"), "a.txt")).toBeNull();
    expect(sniffImage(bytes("<html><body></body></html>"), "a.html")).toBeNull();
  });

  it("le nom ne décide pas : un PNG nommé .jpg est un PNG", () => expect(sniffImage(pngHead(1, 1), "photo.jpg")).toBe("png"));
});

describe("kindOfMime", () => {
  it("types connus, variantes ICO et HEIF ; inconnu : null", () => {
    expect(["image/png", "image/vnd.microsoft.icon", "image/heif", "", "application/octet-stream"].map(kindOfMime))
      .toEqual(["png", "ico", "heic", null, null]);
  });
});

describe("probeSize (R15 : en-tête PNG et JPEG seulement)", () => {
  it("PNG : IHDR", async () => expect(await probeSize(new Blob([pngHead(640, 480)]), "png")).toEqual({ w: 640, h: 480 }));
  it("JPEG : premier SOFn après APP0", async () => expect(await probeSize(new Blob([jpeg(640, 480)]), "jpeg")).toEqual({ w: 640, h: 480 }));
  it("autres formats : null (contrôlés après décodage)", async () => expect(await probeSize(new Blob([bytes("GIF89a")]), "gif")).toBeNull());
  it("JPEG : SOS avant tout SOFn → null", () => expect(jpegSize(bytes([0xff, 0xd8, 0xff, 0xda, 0, 2], new Array<number>(10).fill(0)))).toBeNull());
});

function ports(w: number, h: number) {
  const made: Array<{ width: number; height: number; close: ReturnType<typeof vi.fn> }> = [];
  const calls: Array<[unknown, ImageBitmapOptions | undefined]> = [];
  const loadSvg = vi.fn(async () => ({ svg: true }) as unknown as ImageBitmapSource);
  const p: DecodePorts = {
    async createImageBitmap(src, opts) {
      calls.push([src, opts]);
      const bmp = { width: opts?.resizeWidth ?? w, height: opts?.resizeHeight ?? h, close: vi.fn() };
      made.push(bmp);
      return bmp as unknown as ImageBitmap;
    },
    loadSvg,
  };
  return { p, made, calls, loadSvg };
}

describe("decodeImage (R13, R15)", () => {
  it("petite image : bitmap rendu tel quel, orientation EXIF appliquée", async () => {
    const t = ports(640, 480);
    const d = await decodeImage(new Blob([pngHead(640, 480)]), "png", 4096, t.p);
    expect([d.w, d.h, d.bitmap]).toEqual([640, 480, t.made[0]]);
    expect(t.calls[0]![1]).toEqual({ imageOrientation: "from-image" });
    expect(t.made[0]!.close).not.toHaveBeenCalled();
  });

  it("côté le plus long au-delà de 4 096 : bitmap réduit, taille source rendue, original fermé", async () => {
    const t = ports(8192, 4096);
    const d = await decodeImage(new Blob([pngHead(8192, 4096)]), "png", 4096, t.p);
    expect(t.calls[1]![1]).toEqual({ resizeWidth: 4096, resizeHeight: 2048, resizeQuality: "high" });
    expect([d.w, d.h, d.bitmap]).toEqual([8192, 4096, t.made[1]]);
    expect(t.made[0]!.close).toHaveBeenCalledTimes(1);
  });

  it("plus de 100 Mpx après décodage : ImageTooLargeError, bitmap fermé", async () => {
    const t = ports(20000, 6000);
    await expect(decodeImage(new Blob([bytes("GIF89a")]), "gif", 4096, t.p)).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(t.made[0]!.close).toHaveBeenCalledTimes(1);
    expect(t.calls).toHaveLength(1);
  });

  it("SVG : image hors DOM sur une URL blob:, puis createImageBitmap de cette image", async () => {
    const t = ports(4, 4);
    const blob = new Blob([bytes("<svg/>")], { type: "image/svg+xml" });
    await decodeImage(blob, "svg", 4096, t.p);
    expect(t.loadSvg).toHaveBeenCalledWith(blob);
    expect(t.calls[0]![0]).toEqual({ svg: true });
  });
});

describe("géométrie d'insertion (R4, R5)", () => {
  const rect = { left: 10, top: 20, width: 800, height: 600 };
  const cam = { zoom: 2, tx: 100, ty: 50 };

  it("anchorOf : point dans le stage → monde ; nul ou hors du stage → centre de la vue", () => {
    expect(anchorOf(rect, cam, { x: 110, y: 70 })).toEqual([0, 0]);
    expect(anchorOf(rect, cam, null)).toEqual([150, 125]);
    expect(anchorOf(rect, cam, { x: 5, y: 5 })).toEqual([150, 125]);
  });

  it("visibleOf : largeur coupée au bord de la page, hauteur de la vue ; page hors vue : largeur de la vue", () => {
    expect(visibleOf({ left: 0, top: 0, width: 800, height: 600 }, IDENTITY)).toEqual({ w: 800, h: 600 });
    expect(visibleOf({ left: 0, top: 0, width: 1280, height: 900 }, { zoom: 0.5, tx: 0, ty: 0 })).toEqual({ w: 1920, h: 1800 });
    expect(visibleOf({ left: 0, top: 0, width: 800, height: 600 }, { zoom: 1, tx: -3000, ty: 0 })).toEqual({ w: 800, h: 600 });
  });

  it("placement : centrée, 1 px = 1 unité, cascade de 24", () => {
    expect(placement(200, 100, [400, 300], { w: 800, h: 600 }, 0)).toEqual([1, 0, 0, 1, 300, 250]);
    expect(placement(200, 100, [400, 300], { w: 800, h: 600 }, 2)).toEqual([1, 0, 0, 1, 348, 298]);
  });

  it("placement : réduite pour tenir dans 80 % du visible, jamais agrandie", () => {
    const m = placement(4000, 1000, [400, 300], { w: 800, h: 600 }, 0);
    for (const [i, v] of [0.16, 0, 0, 0.16, 80, 220].entries()) expect(m[i]).toBeCloseTo(v, 9);
    expect(placement(10, 10, [0, 0], { w: 800, h: 600 }, 0)[0]).toBe(1);
  });

  it("placement : rapport extrême (50 000 × 1) : facteur fini et positif", () => {
    const m = placement(50000, 1, [0, 0], { w: 800, h: 600 }, 0);
    expect(m[0]).toBeCloseTo(0.0128, 9);
    expect(m.every(Number.isFinite)).toBe(true);
  });

  it("placement : vue nulle (stage caché) : taille source, jamais 0", () => {
    expect(placement(200, 100, [0, 0], { w: 0, h: 0 }, 0)[0]).toBe(1);
  });
});

describe("imageHandler : onglet fermé pendant put (garde après l'écriture au magasin)", () => {
  it("ne touche plus le moteur et dit TAB_CLOSED_MESSAGE", async () => {
    let open = true;
    const calls: string[] = [];
    const target = {
      assets: { put: vi.fn(async () => { open = false; return "sha"; }) },
      alive: () => open,
      page: () => { calls.push("page"); return "p"; },
      camera: () => { calls.push("camera"); return IDENTITY; },
      stageRect: () => { calls.push("stageRect"); return { left: 0, top: 0, width: 100, height: 100 }; },
      run: vi.fn(() => { calls.push("run"); return null; }),
    };
    const notify = vi.fn(async () => {});
    const blob = new Blob([pngHead(2, 2)], { type: "image/png" });
    const decode = vi.fn(async () => ({ bitmap: { close() {} } as unknown as ImageBitmap, w: 2, h: 2 }));
    const out = await imageHandler({ decode }).run(
      { name: "a.png" } as never,
      { blob, head: pngHead(2, 2), at: null, inserted: 0, target, notify } as never,
    );
    expect(out).toBe("failed");
    expect(target.assets.put).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([]);
    expect(notify).toHaveBeenCalledWith(`a.png : ${TAB_CLOSED_MESSAGE}`);
  });
});
