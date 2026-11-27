import { describe, expect, it } from "vitest";
import type { ElementView } from "../core/api";
import { backgroundPicks, formValue, sectionsFor, showsPanel, strokePicks } from "./tool-options";

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
    expect(p[0]).toBe("#dc2626");
  });
  it("backgroundPicks : transparent puis 4 teintes", () => {
    const b = backgroundPicks();
    expect(b[0]).toBeNull();
    expect(b).toHaveLength(5);
  });
  it("showsPanel : masqué avec Main, Gomme, Pot, Tableau sans sélection, et en annotation", () => {
    for (const t of ["hand", "eraser", "fill", "table", "select"] as const) expect(showsPanel(t as never, 0, false)).toBe(false);
    expect(showsPanel("rect", 0, false)).toBe(true);
    expect(showsPanel("select", 1, false)).toBe(true);
    expect(showsPanel("rect", 0, true)).toBe(false);
  });
});
