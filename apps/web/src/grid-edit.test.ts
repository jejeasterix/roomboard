import { describe, expect, it } from "vitest";
import type { GridLevel, GridView } from "./core/api";
import {
  colorInputValue,
  draftOf,
  GRID_CHOICES,
  GRID_DEFAULT_SPACING,
  lineWidthOptions,
  NEW_GRID_COLOR,
  spacingFieldText,
  spacingOf,
  toGrid,
  withColor,
  withKind,
  withLineWidth,
  withSnap,
  withSpacing,
} from "./grid-edit";

const level = (kind: string, s: number, over: Partial<GridLevel> = {}): GridLevel => ({
  kind, spacingX: s, spacingY: s, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: true, visible: true, ...over,
});
const grid = (levels: GridLevel[], over: Partial<GridView> = {}): GridView => ({ visible: true, snap: true, above: false, levels, ...over });

describe("brouillon de la grille (C9 éditeur, E4 à E6)", () => {
  it("S2, E6 : page sans grille → « Aucune » ; Seyès crée un niveau seyes 30,24, #94a3b8, lineWidth 1", () => {
    const d = draftOf(null);
    expect(d.kind).toBe("none");
    expect(toGrid(d)).toBeNull();
    expect(toGrid(withKind(d, "seyes"))).toEqual({
      visible: true,
      snap: false,
      above: false,
      levels: [{ kind: "seyes", spacingX: 30.24, spacingY: 30.24, originX: 0, originY: 0, color: NEW_GRID_COLOR, line: "solid", lineWidth: 1, snap: true, visible: true }],
    });
  });

  it("E5 : choisir un type pose son pas par défaut, garde couleur, épaisseur et magnétisme", () => {
    const d = withSnap(withLineWidth(withColor(withKind(draftOf(null), "squares"), "#ff0000"), 3), true);
    for (const k of ["squares", "lines", "dots", "isometric", "music", "seyes"] as const) {
      expect(withKind(d, k === "squares" ? "lines" : k), k).toMatchObject({ color: "#ff0000", lineWidth: 3, snap: true });
      expect(withKind(withKind(d, "none"), k).spacing, k).toBe(GRID_DEFAULT_SPACING[k]);
    }
    expect(GRID_DEFAULT_SPACING).toEqual({ squares: 40, lines: 40, dots: 40, isometric: 40, music: 20, seyes: 30.24 });
    expect(GRID_CHOICES).toEqual(["none", "squares", "lines", "dots", "isometric", "music", "seyes"]);
  });

  it("E5 : un seul pas écrit dans spacingX et spacingY ; non touché, les deux valeurs du document restent", () => {
    const g = grid([level("lines", 40, { spacingY: 25 })]);
    expect(toGrid(draftOf(g))).toEqual(g);
    expect(toGrid(withSpacing(draftOf(g), 60))?.levels[0]).toMatchObject({ spacingX: 60, spacingY: 60 });
  });

  it("HE9, Review Focus 4 : pas borné à [4, 400] ; vide ou illisible : valeur précédente", () => {
    const d = draftOf(grid([level("squares", 40)]));
    expect(withSpacing(d, 2).spacing).toBe(4);
    expect(withSpacing(d, 1000).spacing).toBe(400);
    expect(withSpacing(d, spacingOf(""))).toBe(d);
    expect(withSpacing(d, spacingOf("abc"))).toBe(d);
    expect(withSpacing(d, spacingOf(" 80 ")).spacing).toBe(80);
  });

  it("E1 : épaisseur hors [1, 8] ou non finie refusée ; couleur vide refusée ; choix 1 à 4 plus la valeur du document", () => {
    const d = draftOf(grid([level("squares", 40)]));
    for (const w of [0, 9, Number.NaN]) expect(withLineWidth(d, w)).toBe(d);
    expect(withLineWidth(d, 8).lineWidth).toBe(8);
    expect(withColor(d, "")).toBe(d);
    expect(lineWidthOptions(2)).toEqual([1, 2, 3, 4]);
    expect(lineWidthOptions(6)).toEqual([1, 2, 3, 4, 6]);
    expect([colorInputValue("#7B68EE"), colorInputValue("red")]).toEqual(["#7b68ee", "#000000"]);
  });

  it("S2, E4 : deux niveaux dont un hexagon en second : le second, above, visible et originX ressortent à l'identique", () => {
    const g = grid([level("squares", 40, { originX: 7, line: "dashed", snap: false }), level("hexagon", 12)], { above: true, visible: false });
    const out = toGrid(withLineWidth(withColor(withSpacing(draftOf(g), 80), "#123456"), 2));
    expect(out).toEqual({ ...g, levels: [{ ...g.levels[0], spacingX: 80, spacingY: 80, color: "#123456", lineWidth: 2 }, g.levels[1]] });
  });

  it("S2, E4 : premier niveau hexagon → « other », gardé ; choisir un type le remplace", () => {
    const g = grid([level("hexagon", 12, { originY: 3 }), level("dots", 40)]);
    const d = draftOf(g);
    expect(d.kind).toBe("other");
    expect(toGrid(withSnap(d, false))).toEqual({ ...g, snap: false });
    expect(toGrid(withKind(d, "squares"))?.levels).toEqual([{ ...g.levels[0], kind: "squares", spacingX: 40, spacingY: 40 }, g.levels[1]]);
  });

  it("S2, E4 : « Aucune » → null (toute la grille retirée, niveaux suivants compris)", () => {
    expect(toGrid(withKind(draftOf(grid([level("squares", 40), level("dots", 20)])), "none"))).toBeNull();
  });

  it("G5 : brouillon inchangé → la grille du document à l'identique (Appliquer sans réglage = aucune étape)", () => {
    const g = grid([level("music", 12, { color: "red", lineWidth: 2.5 })], { snap: false });
    expect(toGrid(draftOf(g))).toEqual(g);
  });

  it("E5 (T8) : pas modifié puis ramené à la valeur du document : spacingX et spacingY écrits (pas de garde par valeur)", () => {
    const g = grid([level("lines", 40, { spacingY: 25 })]);
    const out = toGrid(withSpacing(withSpacing(draftOf(g), 60), 40));
    expect(out?.levels[0]).toMatchObject({ spacingX: 40, spacingY: 40 });
  });

  it("E2, G5 (T8) : grille sans niveau lisible, brouillon inchangé : la grille du document, pas null", () => {
    const g = grid([]);
    expect(draftOf(g).kind).toBe("none");
    expect(toGrid(draftOf(g))).toEqual(g);
    expect(toGrid(withKind(withKind(draftOf(g), "squares"), "none"))).toBeNull();
  });

  it("OG69 (G5) : grille choisie sur une page sans grille → aimant allumé, sauf Seyès et portée ; touché à la main, il ne suit plus le type", () => {
    const d = draftOf(null);
    expect(withKind(d, "squares").snap).toBe(true);
    expect(withKind(d, "dots").snap).toBe(true);
    expect(withKind(d, "seyes").snap).toBe(false);
    expect(withKind(d, "music").snap).toBe(false);
    expect(withKind(withKind(d, "squares"), "seyes").snap).toBe(false);
    expect(withKind(withSnap(d, true), "seyes").snap).toBe(true);
    expect(withKind(withSnap(withKind(d, "squares"), false), "dots").snap).toBe(false);
    // Grille du document : son aimant est gardé au changement de type.
    expect(withKind(draftOf(grid([level("seyes", 30)], { snap: false })), "squares").snap).toBe(false);
  });

  it("OG69 (G3) : texte du champ Pas ramené à la borne dès la saisie ; un chiffre 1 à 3, début possible d'un pas valide, attend", () => {
    expect(spacingFieldText("2")).toBeNull();
    expect(spacingFieldText("3")).toBeNull();
    expect(spacingFieldText("40")).toBeNull();
    expect(spacingFieldText("")).toBeNull();
    expect(spacingFieldText("0")).toBe("4");
    expect(spacingFieldText("0.5")).toBe("4");
    expect(spacingFieldText("2.5")).toBe("4");
    expect(spacingFieldText("-3")).toBe("4");
    expect(spacingFieldText("401")).toBe("400");
    expect(spacingFieldText("9000")).toBe("400");
  });
});
