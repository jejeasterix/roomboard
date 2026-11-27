import { describe, expect, it } from "vitest";
import type { ElementView } from "../core/api";
import { appliesTo, backgroundPicks, formValue, sectionsFor, showsPanel, strokePicks } from "./tool-options";

const rect = (id: string, color: string, look?: ElementView["look"]): ElementView =>
  ({ id, kind: "shape", transform: [1, 0, 0, 1, 0, 0], style: { color, width: 4 }, shape: { shape: "rect", w: 10, h: 10, fill: null }, ...(look ? { look } : {}) }) as ElementView;
const img = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: {} } as unknown as ElementView;

describe("tool-options", () => {
  it("sectionsFor rect : 7 sections dans l'ordre d'Excalidraw", () => {
    expect(sectionsFor("rect", [], false)).toEqual(["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"]);
  });
  it("sectionsFor ellipse : sans angles", () => {
    expect(sectionsFor("ellipse", [], false)).not.toContain("roundness");
  });
  it("sectionsFor pen : trait, largeur, transparence", () => {
    expect(sectionsFor("pen", [], false)).toEqual(["strokeColor", "strokeWidth", "opacity"]);
  });
  it("sectionsFor select vide : rien", () => {
    expect(sectionsFor("select", [], false)).toEqual([]);
  });
  it("sectionsFor select + image : transparence et actions", () => {
    expect(sectionsFor("select", [img], false)).toEqual(["opacity", "actions"]);
  });
  it("formValue commune", () => {
    expect(formValue([rect("a", "#000000"), rect("b", "#000000")], (e) => (e.kind === "shape" ? e.style.color : undefined), "#111111")).toBe("#000000");
  });
  it("formValue mixte", () => {
    expect(formValue([rect("a", "#000000"), rect("b", "#dc2626")], (e) => (e.kind === "shape" ? e.style.color : undefined), "#111111")).toBeNull();
  });
  it("formValue sans cible : valeur courante", () => {
    expect(formValue([], () => "x", "courant")).toBe("courant");
  });
  it("formValue ignore les éléments sans la propriété", () => {
    expect(formValue([rect("a", "#000000"), img], (e) => (e.kind === "shape" ? e.style.color : undefined), "#111111")).toBe("#000000");
  });
  it("strokePicks : 5 couleurs distinctes, liste fixe en complément", () => {
    const p = strokePicks({ pen: [{ color: "#dc2626", width: 4 }] } as never, "pen");
    expect(p).toHaveLength(5);
    expect(new Set(p).size).toBe(5);
    expect(p[0]!.color).toBe("#dc2626");
    expect(p[0]!.label).toBe("Rouge");
  });
  it("strokePicks : noms lisibles pour les teintes de repli", () => {
    expect(strokePicks({} as never, "pen").map((x) => x.label)).toEqual(["Noir", "Rouge", "Bleu", "Vert", "Jaune"]);
  });
  it("appliesTo : suit la table des sections de l'élément", () => {
    expect(appliesTo("strokeStyle", rect("a", "#000000"))).toBe(true);
    expect(appliesTo("roundness", rect("a", "#000000"))).toBe(true);
    expect(appliesTo("background", img)).toBe(false);
    expect(appliesTo("opacity", img)).toBe(true);
    const stroke = { id: "s", kind: "stroke" } as unknown as ElementView;
    expect(appliesTo("strokeStyle", stroke)).toBe(false);
    expect(appliesTo("opacity", stroke)).toBe(true);
    const line = { id: "l", kind: "shape", shape: { shape: "line" } } as unknown as ElementView;
    expect(appliesTo("background", line)).toBe(false);
    expect(appliesTo("roundness", line)).toBe(false);
  });
  it("backgroundPicks : transparent puis jaune, vert, bleu, rose réels", () => {
    expect(backgroundPicks()).toEqual([
      { color: null, label: "Transparent" },
      { color: "#fef08a", label: "Jaune" },
      { color: "#bbf7d0", label: "Vert" },
      { color: "#bfdbfe", label: "Bleu" },
      { color: "#fecdd3", label: "Rose" },
    ]);
  });
  it("showsPanel : masqué avec Main, Gomme, Pot, Tableau sans sélection, et en annotation", () => {
    for (const t of ["hand", "eraser", "fill", "table", "select"] as const) expect(showsPanel(t as never, 0, false)).toBe(false);
    expect(showsPanel("rect", 0, false)).toBe(true);
    expect(showsPanel("select", 1, false)).toBe(true);
    expect(showsPanel("rect", 0, true)).toBe(false);
  });
});
