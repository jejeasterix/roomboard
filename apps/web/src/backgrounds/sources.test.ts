import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Source {
  readonly id: string; readonly theme: string; readonly label: string; readonly keywords: readonly string[];
  readonly page: string; readonly fichier: string; readonly auteur: string; readonly licence: string;
  readonly preuve: string; readonly lu_le: string; readonly largeur: number; readonly hauteur: number; readonly retouche: string;
}
const raw = JSON.parse(readFileSync(new URL("../../backgrounds/SOURCES.json", import.meta.url), "utf8")) as { format: string; schema: number; photos: Source[] };
const NOTICE = readFileSync(new URL("../../../../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");
const THEMES = ["nature", "mer-ciel", "matieres", "saisons", "abstrait"];
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];

describe("personnalisation-1b : sources des photos du pack (Q11 à Q13, Q17)", () => {
  it("format et schéma, 40 à 50 photos, ids uniques en [a-z0-9-]", () => {
    expect([raw.format, raw.schema]).toEqual(["roomboard-background-sources", 1]);
    expect(raw.photos.length).toBeGreaterThanOrEqual(40);
    expect(raw.photos.length).toBeLessThanOrEqual(50);
    const ids = raw.photos.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  it("thèmes de la section Images, au moins 6 par thème ; mer et ciel : au moins 6 photos de mer", () => {
    for (const p of raw.photos) expect(THEMES, p.id).toContain(p.theme);
    for (const t of THEMES) expect(raw.photos.filter((p) => p.theme === t).length, t).toBeGreaterThanOrEqual(6);
    const sea = raw.photos.filter((p) => p.theme === "mer-ciel" && p.keywords.some((k) => ["mer", "océan"].includes(k)));
    expect(sea.length).toBeGreaterThanOrEqual(6);
  });
  it("licence CC0-1.0, preuve qui cite CC0, page et fichier en https, auteur, date de lecture", () => {
    for (const p of raw.photos) {
      expect(p.licence, p.id).toBe("CC0-1.0");
      expect(p.preuve, p.id).toMatch(/CC0/);
      expect(p.page, p.id).toMatch(/^https:\/\//);
      expect(p.fichier, p.id).toMatch(/^https:\/\/.+\.(jpe?g|png)$/i);
      expect(p.auteur.trim().length, p.id).toBeGreaterThan(0);
      expect(p.lu_le, p.id).toMatch(/^2026-\d\d-\d\d$/);
    }
  });
  it("aucune source exclue (Unsplash, Pixabay, Pexels)", () => {
    for (const p of raw.photos) for (const u of [p.page, p.fichier]) expect(u, p.id).not.toMatch(/unsplash|pixabay|pexels/i);
  });
  it("original d'au moins 2560 × 1440 (aucun agrandissement)", () => {
    for (const p of raw.photos) {
      expect(p.largeur, p.id).toBeGreaterThanOrEqual(2560);
      expect(p.hauteur, p.id).toBeGreaterThanOrEqual(1440);
    }
  });
  it("libellés et mots-clés français écrits à la main : 5 à 10 mots-clés, aucun nom de site ni adresse", () => {
    for (const p of raw.photos) {
      expect(p.label.trim().length, p.id).toBeGreaterThan(0);
      expect(p.keywords.length, p.id).toBeGreaterThanOrEqual(5);
      expect(p.keywords.length, p.id).toBeLessThanOrEqual(10);
      const text = [p.id, p.label, ...p.keywords].join(" ").toLowerCase();
      for (const t of TRACES) expect(text, `${p.id} : ${t}`).not.toContain(t);
    }
  });
  it("THIRD_PARTY_NOTICES : section du pack CC0 et tracés Lucide nommés", () => {
    expect(NOTICE).toContain("## Pack de fonds (images CC0), personnalisation 1b");
    expect(NOTICE).toContain("apps/web/backgrounds/SOURCES.json");
    for (const n of ["`wallpaper`", "`search`", "`image-plus`"]) expect(NOTICE).toContain(n);
  });
});
