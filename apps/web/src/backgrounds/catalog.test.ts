import { describe, expect, it } from "vitest";
import { GRID_KINDS } from "../core/api";
import { ALL_THEMES, DEFAULT_SECTION, loadPack, SECTIONS } from "./catalog";
import { DRAWN } from "./drawn";
import { PHOTOS } from "./photos";
import { SVG_H, SVG_W, svgOf } from "./svg";

const themesOf = (section: string): string[] => SECTIONS.find((s) => s.id === section)?.themes.map((t) => t.id) ?? [];
const byId = (id: string) => DRAWN.find((b) => b.id === id);

describe("personnalisation-1b : catalogue des fonds (Q7 à Q10)", () => {
  it("sections dans l'ordre du cadrage, Couleurs par défaut, thèmes de Q8", () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(["mine", "colors", "lines", "lessons", "images"]);
    expect(SECTIONS.map((s) => s.label)).toEqual(["Mes fonds", "Couleurs", "Lignes et grilles", "Modèles de cours", "Images"]);
    expect(DEFAULT_SECTION).toBe("colors");
    expect(ALL_THEMES).toBe("all");
    expect(themesOf("colors")).toEqual(["claires", "sombres", "degrades"]);
    expect(themesOf("lines")).toEqual(["lignages", "quadrillages", "seyes", "points", "isometrique", "portees"]);
    expect(themesOf("lessons")).toEqual(["organisation", "reflexion", "mathematiques", "ecriture", "sport"]);
    expect(themesOf("images")).toEqual(["nature", "mer-ciel", "matieres", "saisons", "abstrait"]);
    expect(themesOf("mine")).toEqual([]);
  });

  it("DRAWN : au moins 110 fonds dessinés, ids uniques en [a-z0-9-]", () => {
    expect(DRAWN.length).toBeGreaterThanOrEqual(110);
    expect(DRAWN).toHaveLength(118);
    const ids = DRAWN.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9-]+$/);
  });

  it("chaque fond est rangé dans une section et un thème connus, avec un libellé et des mots-clés", () => {
    for (const b of DRAWN) {
      expect(themesOf(b.section), b.id).toContain(b.theme);
      expect(b.label.length, b.id).toBeGreaterThan(0);
      expect(b.keywords.length, b.id).toBeGreaterThanOrEqual(3);
      expect(b.color, b.id).toMatch(/^#[0-9a-f]{6}$/);
    }
    const count = (section: string) => DRAWN.filter((b) => b.section === section).length;
    expect([count("colors"), count("lines"), count("lessons"), count("images")]).toEqual([52, 54, 12, 0]);
  });

  it("forme par genre : couleur seule, grille vectorielle du cœur, SVG en 3840 × 2160", () => {
    for (const b of DRAWN) {
      expect(b.photo, b.id).toBeNull();
      if (b.kind === "color") expect(b.grid, b.id).toBeNull();
      if (b.kind === "grid") {
        const level = b.grid?.levels[0];
        expect(b.grid?.levels, b.id).toHaveLength(1);
        expect(GRID_KINDS, b.id).toContain(level?.kind);
        expect(level?.spacingX, b.id).toBeGreaterThan(0);
        expect(b.grid?.snap, b.id).toBe(false);
      }
      if (b.kind === "svg") {
        expect(b.grid, b.id).toBeNull();
        const s = svgOf(b.id);
        expect(s.startsWith("<svg "), b.id).toBe(true);
        expect(s, b.id).toContain(`width="${SVG_W}" height="${SVG_H}" viewBox="0 0 1920 1080"`);
      }
    }
    expect(DRAWN.filter((b) => b.kind === "svg")).toHaveLength(30);
  });

  it("fonds nommés par les scénarios : seyes-8mm, quadrillage-5mm, ardoise, blanc, une portée", () => {
    expect(byId("seyes-8mm")).toMatchObject({ label: "Seyès 8 mm", section: "lines", theme: "seyes", kind: "grid", color: "#fbf7ec" });
    expect(byId("seyes-8mm")?.grid?.levels[0]).toMatchObject({ kind: "seyes", spacingX: 30.24, spacingY: 30.24 });
    expect(byId("quadrillage-5mm")).toMatchObject({ label: "Quadrillage 5 mm", kind: "grid", color: "#ffffff" });
    expect(byId("quadrillage-5mm")?.grid?.levels[0]).toMatchObject({ kind: "squares", spacingX: 18.9 });
    expect(byId("ardoise")).toMatchObject({ label: "Ardoise", section: "colors", theme: "sombres", kind: "color", color: "#2f3e46" });
    expect(byId("ardoise")?.keywords).toContain("tableau noir");
    expect(byId("blanc")).toMatchObject({ label: "Blanc (aucun fond)", kind: "color", color: "#ffffff", grid: null });
    expect(byId("portees-moyennes")).toMatchObject({ label: "Portées moyennes", theme: "portees" });
    expect(byId("venn")?.kind).toBe("svg");
    expect(byId("degrade-ocean")?.kind).toBe("svg");
  });

  it("svgOf : un fond inconnu lève une erreur lisible", () => {
    expect(() => svgOf("bidule")).toThrow("fond dessiné inconnu : bidule");
    expect(() => svgOf("seyes-8mm")).toThrow("fond dessiné inconnu : seyes-8mm");
  });

  it("SVG : aucune adresse hors de l'espace de noms SVG, aucune image externe", () => {
    for (const b of DRAWN.filter((x) => x.kind === "svg")) {
      const s = svgOf(b.id).replaceAll('xmlns="http://www.w3.org/2000/svg"', "");
      expect(s, b.id).not.toMatch(/https?:|www\.|<image|href=/i);
    }
  });

  it("loadPack : dessinés puis photos, mêmes objets", async () => {
    const pack = await loadPack();
    expect(pack).toEqual([...DRAWN, ...PHOTOS]);
  });
});
