import { describe, expect, it } from "vitest";
import type { ElementView } from "../core/api";
import { admitsDragCopy, ALIGN_MIN_UNITS, appliesTo, backgroundPicks, DISTRIBUTE_MIN_UNITS, OPEN_BY_DEFAULT, sectionOpen, disabledIn, formValue, sectionsFor, showsPanel, strokePicks, TEXT_SIZES } from "./tool-options";

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
    expect(sectionsFor("pen", [], false)).toEqual(["strokeColor", "strokeWidth", "pressure", "opacity"]);
  });
  it("sectionsFor select vide : rien", () => {
    expect(sectionsFor("select", [], false)).toEqual([]);
  });
  it("sectionsFor select + image : transparence, image, disposition et actions", () => {
    expect(sectionsFor("select", [img], false)).toEqual(["opacity", "image", "layers", "transform", "actions"]);
  });
  it("image seule : section Image ouverte par défaut ; deux images ou un mélange : pas de section Image", () => {
    expect(sectionOpen("image", {})).toBe(true);
    expect(sectionsFor("select", [img, { ...img, id: "j" } as ElementView], false)).not.toContain("image");
    expect(sectionsFor("select", [img, rect("a", "#000000")], false)).not.toContain("image");
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
  it("strokePicks : 4 couleurs distinctes, liste fixe en complément", () => {
    const p = strokePicks({ pen: [{ color: "#dc2626", width: 4 }] } as never, "pen");
    expect(p).toHaveLength(4);
    expect(new Set(p).size).toBe(4);
    expect(p[0]!.color).toBe("#dc2626");
    expect(p[0]!.label).toBe("Rouge");
  });
  it("strokePicks : noms lisibles pour les teintes de repli", () => {
    expect(strokePicks({} as never, "pen").map((x) => x.label)).toEqual(["Noir", "Rouge", "Bleu", "Vert"]);
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
    // OG12 : « Angles » s'applique à la ligne (polyligne aux angles arrondis).
    expect(appliesTo("roundness", line)).toBe(true);
  });
  it("backgroundPicks : transparent puis jaune, vert, bleu réels", () => {
    expect(backgroundPicks()).toEqual([
      { color: null, label: "Transparent" },
      { color: "#fef08a", label: "Jaune" },
      { color: "#bbf7d0", label: "Vert" },
      { color: "#bfdbfe", label: "Bleu" },
    ]);
  });
  it("DS10 : showsPanel(table) ; sections du tableau seulement avec une case active, dans l'ordre", () => {
    expect(showsPanel("table" as never, 0, false)).toBe(true);
    expect(sectionsFor("table" as never, [], false, null, 0, false)).toEqual([]);
    expect(sectionsFor("table" as never, [], false, null, 0, true)).toEqual(["tableObjects", "tableAlign", "tableBorder", "tableRows", "tableAccept"]);
    expect(sectionsFor("rect", [], false, null, 0, true)).not.toContain("tableAlign");
  });
  it("showsPanel : masqué avec Main, Gomme, Pot, Sélection sans sélection, et en annotation", () => {
    for (const t of ["hand", "eraser", "fill", "select"] as const) expect(showsPanel(t as never, 0, false)).toBe(false);
    expect(showsPanel("rect", 0, false)).toBe(true);
    expect(showsPanel("select", 1, false)).toBe(true);
    expect(showsPanel("rect", 0, true)).toBe(false);
  });
});

describe("tool-options lot 2 (T15)", () => {
  const filled = { ...rect("f", "#000000"), shape: { shape: "rect", w: 10, h: 10, fill: "#facc15" } } as unknown as ElementView;
  it("texte : police, taille et alignement", () => {
    const k = sectionsFor("text", [], true);
    expect(k).toEqual(expect.arrayContaining(["font", "fontSize", "textAlign"]));
    expect(k.indexOf("font")).toBeLessThan(k.indexOf("opacity"));
  });
  it("disabledIn : Police, Taille et Trait grisés en saisie", () => {
    for (const key of ["font", "fontSize", "strokeColor"] as const) {
      expect(disabledIn(key, true)).toBe(true);
      expect(disabledIn(key, false)).toBe(false);
    }
    expect(disabledIn("textAlign", true)).toBe(false);
    expect(disabledIn("opacity", true)).toBe(false);
  });
  it("fillStyle masqué si fond transparent, visible avec un fond", () => {
    expect(sectionsFor("rect", [rect("a", "#000000")], false)).not.toContain("fillStyle");
    const k = sectionsFor("rect", [filled], false);
    expect(k).toContain("fillStyle");
    expect(k.indexOf("fillStyle")).toBe(k.indexOf("background") + 1);
    expect(sectionsFor("rect", [], false, "#facc15")).toContain("fillStyle");
    expect(sectionsFor("rect", [], false, null)).not.toContain("fillStyle");
  });
  it("flèche : pointes avant la transparence ; Disposition seulement avec une sélection", () => {
    const arrow = { ...rect("w", "#000000"), shape: { shape: "arrow", w: 10, h: 10, fill: null } } as unknown as ElementView;
    const k = sectionsFor("arrow", [arrow], false);
    expect(k.indexOf("arrowheads")).toBeLessThan(k.indexOf("opacity"));
    expect(k.indexOf("layers")).toBe(k.indexOf("opacity") + 1);
    expect(k.at(-1)).toBe("actions");
    expect(sectionsFor("arrow", [], false)).not.toContain("layers");
    expect(sectionsFor("rect", [rect("a", "#000000")], false)).not.toContain("arrowheads");
  });
  it("Type de flèche : section de l'outil Flèche, juste avant Pointes ; Angles pour la ligne", () => {
    const k = sectionsFor("arrow", [], false);
    expect(k.indexOf("arrowType")).toBe(k.indexOf("arrowheads") - 1);
    const l = sectionsFor("line", [], false);
    expect(l).toContain("roundness");
    expect(l).not.toContain("arrowType");
    const arrow = { ...rect("w", "#000000"), shape: { shape: "arrow", w: 10, h: 10, fill: null } } as unknown as ElementView;
    expect(sectionsFor("select", [arrow], false)).toContain("arrowType");
    expect(sectionsFor("select", [rect("a", "#000000")], false)).not.toContain("arrowType");
  });
  it("TEXT_SIZES", () => {
    expect(TEXT_SIZES).toEqual([24, 36, 48, 72]);
  });
});

describe("tool-options : losange et ligne fermée (OG12 lot 2a)", () => {
  const sh = (shape: string, extra: object = {}): ElementView =>
    ({ id: "x", kind: "shape", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000", width: 4 }, shape: { shape, w: 10, h: 10, fill: "#fff", ...extra } }) as unknown as ElementView;
  it("losange et ligne fermée : options de forme, sans Angles ni pointes", () => {
    expect(sectionsFor("select", [sh("diamond")], false)).not.toContain("roundness");
    expect(sectionsFor("diamond" as never, [], false)).not.toContain("roundness");
    expect(sectionsFor("select", [sh("line", { polygon: true })], false)).toEqual(
      ["strokeColor", "background", "fillStyle", "strokeWidth", "strokeStyle", "roughness", "opacity", "layers", "transform", "actions"]);
    expect(sectionsFor("select", [sh("line")], false)).toContain("roundness");
  });
  it("showsPanel : l'outil losange montre le panneau", () => {
    expect(showsPanel("diamond" as never, 0, false)).toBe(true);
  });
});

describe("tool-options OG23 (T2) : accordéon, pression, disposition", () => {
  const stroke = { id: "s", kind: "stroke" } as unknown as ElementView;
  it("sectionOpen : défauts puis état gardé", () => {
    expect(sectionOpen("strokeWidth", {})).toBe(true);
    expect(sectionOpen("strokeStyle", {})).toBe(false);
    expect(sectionOpen("strokeStyle", { strokeStyle: true })).toBe(true);
    expect(sectionOpen("background", { background: false })).toBe(false);
    expect(sectionOpen("strokeStyle", { strokeStyle: "oui" } as never)).toBe(false);
    expect([...OPEN_BY_DEFAULT].sort()).toEqual(["background", "image", "media", "model3d", "strokeColor", "strokeWidth", "tableAlign", "tableBorder"]);
  });
  it("pressure : stylo et trait seulement", () => {
    expect(sectionsFor("pen", [], false)).toEqual(["strokeColor", "strokeWidth", "pressure", "opacity"]);
    expect(sectionsFor("rect", [], false)).not.toContain("pressure");
    expect(sectionsFor("select", [stroke], false)).toContain("pressure");
    expect(sectionsFor("select", [rect("a", "#000000")], false)).not.toContain("pressure");
  });
  it("align à partir de 2 unités, transform pour toute cible", () => {
    const two = [rect("a", "#000000"), rect("b", "#000000")];
    const s2 = sectionsFor("select", two, false, null, 2);
    expect(s2).toContain("align");
    expect(s2).toContain("transform");
    expect(s2.indexOf("align")).toBeGreaterThan(s2.indexOf("layers"));
    expect(s2.indexOf("transform")).toBeGreaterThan(s2.indexOf("align"));
    expect(sectionsFor("select", two, false, null, 1)).not.toContain("align");
    expect(sectionsFor("select", [rect("a", "#000000")], false, null, 1)).toContain("transform");
    expect(sectionsFor("rect", [], false)).not.toContain("transform");
    expect([ALIGN_MIN_UNITS, DISTRIBUTE_MIN_UNITS]).toEqual([2, 3]);
  });
  it("4 pastilles", () => {
    expect(strokePicks({} as never, "pen").map((x) => x.label)).toEqual(["Noir", "Rouge", "Bleu", "Vert"]);
    expect(backgroundPicks().map((x) => x.color)).toEqual([null, "#fef08a", "#bbf7d0", "#bfdbfe"]);
    expect(backgroundPicks().map((x) => x.label)).toEqual(["Transparent", "Jaune", "Vert", "Bleu"]);
  });
});

describe("tool-options : Glisser une copie pour tout objet (OG23, T18)", () => {
  it("admitsDragCopy : tous les genres d'objets, hors inconnu", () => {
    for (const kind of ["stroke", "shape", "text", "image", "table", "media", "model3d"]) expect(admitsDragCopy({ id: "a", kind } as unknown as ElementView), kind).toBe(true);
    // Zone du pot (`fill`) : le cœur n'y écrit jamais `dragCopy` (style.rs `writes_for`) : la bascule ne la compte pas.
    expect(admitsDragCopy({ id: "z", kind: "fill" } as unknown as ElementView)).toBe(false);
    expect(admitsDragCopy({ id: "a", kind: "unknown" } as unknown as ElementView)).toBe(false);
  });
});

describe("tool-options OG34 : sections Média et Objet 3D", () => {
  const media = { id: "m", kind: "media", transform: [1, 0, 0, 1, 0, 0], media: {} } as unknown as ElementView;
  const model = { id: "o", kind: "model3d", transform: [1, 0, 0, 1, 0, 0], model3d: {} } as unknown as ElementView;
  it("média seul : section Média en tête, ouverte par défaut", () => {
    expect(sectionsFor("select", [media], false)).toEqual(["media", "layers", "transform", "actions"]);
    expect(sectionOpen("media", {})).toBe(true);
  });
  it("objet 3D seul : section Objet 3D en tête, ouverte par défaut", () => {
    expect(sectionsFor("select", [model], false)).toEqual(["model3d", "layers", "transform", "actions"]);
    expect(sectionOpen("model3d", {})).toBe(true);
  });
  it("deux médias, ou un média et un objet 3D : ni Média ni Objet 3D", () => {
    expect(sectionsFor("select", [media, { ...media, id: "n" } as ElementView], false)).not.toContain("media");
    const both = sectionsFor("select", [media, model], false);
    expect(both).not.toContain("media");
    expect(both).not.toContain("model3d");
  });
});
