import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACK_MAX, PACK_MIN, SECTIONS } from "./catalog";
import { DRAWN } from "./drawn";
import { PHOTOS } from "./photos";

const PUBLIC = new URL("../../public/backgrounds/", import.meta.url);
const SOURCES = JSON.parse(readFileSync(new URL("../../backgrounds/SOURCES.json", import.meta.url), "utf8")) as { photos: { id: string; retouche: string }[] };
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];
const MAX_PACK = 31_457_280;
const bytes = (rel: string): Uint8Array => new Uint8Array(readFileSync(new URL(rel, PUBLIC)));
const ascii = (b: Uint8Array, at: number, n: number): string => String.fromCharCode(...b.subarray(at, at + n));
const u32 = (b: Uint8Array, i: number): number => (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0;
/** Blocs RIFF d'un WebP (VP8, VP8L, VP8X, EXIF, XMP …). */
function chunks(b: Uint8Array): string[] {
  const out: string[] = [];
  for (let i = 12; i + 8 <= b.length; ) {
    const size = u32(b, i + 4);
    out.push(ascii(b, i, 4));
    i += 8 + size + (size & 1);
  }
  return out;
}
/** Taille lue dans l'en-tête : VP8X (toile), VP8 (image avec perte), VP8L (sans perte). */
function webpSize(b: Uint8Array): { w: number; h: number } | null {
  const kind = ascii(b, 12, 4);
  const u24 = (i: number): number => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
  if (kind === "VP8X") return { w: u24(24) + 1, h: u24(27) + 1 };
  if (kind === "VP8 ") return { w: (b[26]! | (b[27]! << 8)) & 0x3fff, h: (b[28]! | (b[29]! << 8)) & 0x3fff };
  if (kind === "VP8L") {
    const v = u32(b, 21);
    return { w: (v & 0x3fff) + 1, h: ((v >>> 14) & 0x3fff) + 1 };
  }
  return null;
}
const all = (dir: string): string[] => readdirSync(new URL(`${dir}/`, PUBLIC)).sort();

describe("personnalisation-1b : pack de photos livré (Q11, Q13, Q14, Q33)", () => {
  it("photos.ts : une entrée par photo de SOURCES.json, dans l'ordre, fichiers présents", () => {
    expect(PHOTOS.map((p) => p.id)).toEqual(SOURCES.photos.map((p) => p.id));
    for (const p of PHOTOS) {
      expect(p.photo, p.id).toEqual({ file: `photos/${p.id}.webp`, thumb: `thumbs/${p.id}.webp`, w: p.photo!.w, h: p.photo!.h });
      expect([`${p.photo!.w}x${p.photo!.h}`], p.id).toEqual([expect.stringMatching(/^(2560x1440|1920x1080)$/)]);
      expect(existsSync(new URL(p.photo!.file, PUBLIC)), p.id).toBe(true);
      expect(existsSync(new URL(p.photo!.thumb, PUBLIC)), p.id).toBe(true);
    }
    expect(all("photos")).toEqual(PHOTOS.map((p) => `${p.id}.webp`).sort());
    expect(all("thumbs")).toEqual(PHOTOS.map((p) => `${p.id}.webp`).sort());
  });

  it("WebP : photos 2560 × 1440 ou 1920 × 1080 ≤ 400 Ko, miniatures 480 × 270 ≤ 25 Ko", () => {
    for (const p of PHOTOS) {
      const big = bytes(p.photo!.file);
      const small = bytes(p.photo!.thumb);
      expect([ascii(big, 0, 4), ascii(big, 8, 4)], p.id).toEqual(["RIFF", "WEBP"]);
      expect(webpSize(big), p.id).toEqual({ w: p.photo!.w, h: p.photo!.h });
      expect(webpSize(small), p.id).toEqual({ w: 480, h: 270 });
      expect(big.length, p.id).toBeLessThanOrEqual(400 * 1024);
      expect(small.length, p.id).toBeLessThanOrEqual(25 * 1024);
    }
  });

  it("aucun bloc EXIF ni XMP dans les WebP du pack", () => {
    for (const p of PHOTOS) for (const f of [p.photo!.file, p.photo!.thumb]) expect(chunks(bytes(f)), f).not.toEqual(expect.arrayContaining(["EXIF"]));
    for (const p of PHOTOS) for (const f of [p.photo!.file, p.photo!.thumb]) expect(chunks(bytes(f)), f).not.toEqual(expect.arrayContaining(["XMP "]));
  });

  it("poids total du pack ≤ 30 Mo (31 457 280 o)", () => {
    const total = ["photos", "thumbs"].flatMap((d) => all(d).map((f) => statSync(new URL(`${d}/${f}`, PUBLIC)).size)).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(MAX_PACK);
  });

  it("catalogue complet : 150 à 200 fonds, ids uniques, photos dans les thèmes de la section Images", () => {
    const pack = [...DRAWN, ...PHOTOS];
    expect(pack.length).toBeGreaterThanOrEqual(PACK_MIN);
    expect(pack.length).toBeLessThanOrEqual(PACK_MAX);
    expect(new Set(pack.map((b) => b.id)).size).toBe(pack.length);
    const themes = SECTIONS.find((s) => s.id === "images")!.themes.map((t) => t.id);
    for (const p of PHOTOS) expect([p.section, themes.includes(p.theme), p.kind, p.grid], p.id).toEqual(["images", true, "photo", null]);
  });

  it("aucune trace d'un service extérieur dans les libellés, mots-clés et noms de fichiers du catalogue (Q33)", () => {
    for (const b of [...DRAWN, ...PHOTOS]) {
      const text = [b.id, b.label, ...b.keywords, b.photo?.file ?? "", b.photo?.thumb ?? ""].join(" ").toLowerCase();
      for (const t of TRACES) expect(text, `${b.id} : ${t}`).not.toContain(t);
    }
    const source = readFileSync(new URL("./photos.ts", import.meta.url), "utf8").toLowerCase();
    for (const t of TRACES) expect(source, t).not.toContain(t);
  });

  it("couleur de page de chaque photo en #rrggbb (bord bas mesuré)", () => {
    for (const p of PHOTOS) expect(p.color, p.id).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("SOURCES.json : retouche écrite par le producteur (qualité WebP)", () => {
    for (const p of SOURCES.photos) expect(p.retouche, p.id).toMatch(/^recadrage 16:9 centré, (2560 × 1440|1920 × 1080), WebP q\d+, métadonnées retirées ; miniature 480 × 270$/);
  });
});
