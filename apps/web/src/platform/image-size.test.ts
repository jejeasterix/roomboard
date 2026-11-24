import { describe, expect, it } from "vitest";
import { bmp, gif, heif, ico, svg, webp } from "../../../../scripts/essais/fabriques/images.mjs";
import { probeSize, sniffImage } from "./image-import";
import { headerSize, isoBoxes } from "./image-size";

const text = (s: string): Uint8Array => new TextEncoder().encode(s);
const svgOf = (attrs: string) => headerSize(svg(attrs), "svg");

describe("headerSize (cli-lot4, D63, DA19)", () => {
  it("headerSize — GIF : écran logique", () => expect(headerSize(gif(320, 200), "gif")).toEqual({ w: 320, h: 200 }));
  it("headerSize — WebP VP8, VP8L, VP8X", () => {
    expect(headerSize(webp("VP8 ", 640, 480), "webp")).toEqual({ w: 640, h: 480 });
    expect(headerSize(webp("VP8L", 300, 7), "webp")).toEqual({ w: 300, h: 7 });
    expect(headerSize(webp("VP8X", 5000, 3000), "webp")).toEqual({ w: 5000, h: 3000 });
  });
  it("headerSize — BMP info, hauteur négative (de haut en bas), core", () => {
    expect(headerSize(bmp(33, 21), "bmp")).toEqual({ w: 33, h: 21 });
    expect(headerSize(bmp(33, 21, { topDown: true }), "bmp")).toEqual({ w: 33, h: 21 });
    expect(headerSize(bmp(12, 9, { core: true }), "bmp")).toEqual({ w: 12, h: 9 });
  });
  it("headerSize — ICO : plus grande entrée, 0 = 256", () => {
    expect(headerSize(ico([[16, 16], [48, 48], [32, 32]]), "ico")).toEqual({ w: 48, h: 48 });
    expect(headerSize(ico([[16, 16], [256, 256]]), "ico")).toEqual({ w: 256, h: 256 });
  });
  it("headerSize — AVIF et HEIC : ispe de l'élément principal (pitm, ipma), pas le plus grand", () => {
    expect(headerSize(heif("avif", 40, 30), "avif")).toEqual({ w: 40, h: 30 });
    expect(headerSize(heif("heic", 4032, 3024), "heic")).toEqual({ w: 4032, h: 3024 });
  });
  it("headerSize — AVIF sans pitm : le plus grand ispe", () => expect(headerSize(heif("avif", 40, 30, { pitm: false }), "avif")).toEqual({ w: 64, h: 64 }));
  it("headerSize — SVG width/height absolus, unités (D64)", () => {
    expect(svgOf('width="40" height="30"')).toEqual({ w: 40, h: 30 });
    expect(svgOf('width="40px" height="30px"')).toEqual({ w: 40, h: 30 });
    expect(svgOf('width="1in" height="72pt"')).toEqual({ w: 96, h: 96 });
    expect(svgOf('width="2.54cm" height="25.4mm"')).toEqual({ w: 96, h: 96 });
    expect(svgOf('width="1pc" height="2em"')).toEqual({ w: 16, h: 32 });
  });
  it("headerSize — SVG viewBox seul : 300 de large (S5 : vb.svg 400 × 100 → 300 × 75)", () =>
    expect(svgOf('viewBox="0 0 400 100"')).toEqual({ w: 300, h: 75 }));
  it("headerSize — SVG sans dimension ni viewBox : 300 × 150 (H39)", () => expect(svgOf("")).toEqual({ w: 300, h: 150 }));
  it("headerSize — SVG une seule dimension : l'autre par le viewBox, sinon défaut du navigateur", () => {
    expect(svgOf('width="200" viewBox="0,0,400,100"')).toEqual({ w: 200, h: 50 });
    expect(svgOf('height="50" viewBox="0 0 400 100"')).toEqual({ w: 200, h: 50 });
    expect(svgOf('width="200"')).toEqual({ w: 200, h: 150 });
    expect(svgOf('height="50"')).toEqual({ w: 300, h: 50 });
  });
  it("RF5 — SVG à 100 % et viewBox, SVG en em : taille du navigateur", () => {
    expect(svgOf('width="100%" height="100%" viewBox="0 0 400 200"')).toEqual({ w: 300, h: 150 });
    expect(svgOf('width="10em" height="5em"')).toEqual({ w: 160, h: 80 });
  });
  it("headerSize — en-têtes illisibles : null", () => {
    expect(headerSize(text("GIF89a"), "gif")).toBeNull();
    expect(headerSize(text("RIFF\0\0\0\0WEBPVP8 "), "webp")).toBeNull();
    expect(headerSize(text("BM"), "bmp")).toBeNull();
    expect(headerSize(Uint8Array.of(0, 0, 1, 0, 0, 0), "ico")).toBeNull();
    expect(headerSize(heif("avif", 40, 30).subarray(0, 24), "avif")).toBeNull();
    expect(headerSize(text("<html><body>pas un svg</body></html>"), "svg")).toBeNull();
    expect(headerSize(gif(0, 10), "gif")).toBeNull();
  });
  it("RF1 — chaque préfixe d'une image fabriquée : taille ou null, jamais d'exception", () => {
    const all: Array<[Uint8Array, "gif" | "webp" | "bmp" | "ico" | "avif" | "svg"]> = [
      [gif(3, 4), "gif"], [webp("VP8X", 3, 4), "webp"], [bmp(3, 4), "bmp"], [ico([[3, 4]]), "ico"], [heif("avif", 3, 4), "avif"], [svg('width="3" height="4"'), "svg"],
    ];
    for (const [bytes, kind] of all) for (let n = 0; n <= bytes.length; n++) expect(() => headerSize(bytes.subarray(0, n), kind)).not.toThrow();
  });
  it("SVG hostile de 1 Mio (chiffres, attribut sans fin) : résultat en moins de 200 ms", () => {
    const digits = text(`<svg width="${"1".repeat(1 << 20)}!" height="10">`);
    const letters = text(`<svg ${"a".repeat(1 << 20)}>`);
    for (const bytes of [digits, letters]) {
      const t0 = performance.now();
      expect(() => headerSize(bytes, "svg")).not.toThrow();
      expect(performance.now() - t0).toBeLessThan(200);
    }
  });
  it("HEIF : ipma en version 1 à drapeau large lu ; boîtes de taille 0 ou 1 : taille ou null, sans exception", () => {
    expect(headerSize(heif("avif", 120, 80, { wide: true }), "avif")).toEqual({ w: 120, h: 80 });
    const real = heif("avif", 7, 5);
    const head = (n: number) => Uint8Array.of(n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
    const mk = (size: number[], rest: Uint8Array) => Uint8Array.from([...size, ...text("meta"), ...rest]);
    const hostile = [mk([0, 0, 0, 0], real.subarray(20)), mk([0, 0, 0, 1], real.subarray(20)), mk([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 3], new Uint8Array(0)), Uint8Array.from([...real, ...head(0), ...text("free")]), Uint8Array.from([...real, ...head(1), ...text("free")])];
    for (const bytes of hostile) for (const kind of ["avif", "heic"] as const) expect(() => headerSize(bytes, kind)).not.toThrow();
    expect([...isoBoxes(Uint8Array.from([...head(0), ...text("free"), 1, 2]), 0, 10)].map((x) => x.end)).toEqual([10]);
    expect([...isoBoxes(Uint8Array.from([...head(1), ...text("free"), ...head(0), ...head(16)]), 0, 16)].map((x) => x.end)).toEqual([16]);
  });
  it("isoBoxes — boîtes d'un fichier HEIF ; boîte trop longue rendue jusqu'à la fin puis arrêt", () => {
    const b = heif("heic", 8, 8);
    expect([...isoBoxes(b, 0, b.length)].map((x) => x.type)).toEqual(["ftyp", "meta", "mdat"]);
    expect([...isoBoxes(b, 0, 20)].map((x) => [x.type, x.end])).toEqual([["ftyp", 20]]);
  });
  it("chaque fabrique est reconnue par sniffImage et mesurée par probeSize (D63)", async () => {
    const cases: Array<[Uint8Array, string, string, { w: number; h: number }]> = [
      [gif(320, 200), "i.gif", "gif", { w: 320, h: 200 }],
      [webp("VP8 ", 64, 48), "i.webp", "webp", { w: 64, h: 48 }],
      [bmp(33, 21), "i.bmp", "bmp", { w: 33, h: 21 }],
      [ico([[48, 48]]), "i.ico", "ico", { w: 48, h: 48 }],
      [heif("avif", 120, 80), "i.avif", "avif", { w: 120, h: 80 }],
      [heif("heic", 120, 80), "i.heic", "heic", { w: 120, h: 80 }],
      [svg('width="40" height="30"'), "i.svg", "svg", { w: 40, h: 30 }],
    ];
    for (const [bytes, name, kind, size] of cases) {
      expect(sniffImage(bytes.subarray(0, 4096), name), name).toBe(kind);
      expect(await probeSize(new Blob([bytes as BlobPart]), kind as never), name).toEqual(size);
    }
  });
});
