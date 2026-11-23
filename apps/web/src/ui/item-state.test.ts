import { describe, expect, it } from "vitest";
import type { TableCellState } from "../engine/table-geom";
import { ACTION_TABLE, type ToolItem } from "../toolbar";
import { ACTION_STATE, itemState, type ToolbarView } from "./item-state";

const view = (over: Partial<ToolbarView> = {}): ToolbarView => ({
  tool: "pen", eraserMode: "partial", canUndo: true, canRedo: true, pageIndex: 1, pageCount: 3, ...over,
});
const tool = (t: string, label = t): ToolItem => ({ id: t, kind: "tool", tool: t, label, requires: [], rest: {} });
const action = (a: string, label = a): ToolItem => ({ id: a, kind: "action", action: a, label, requires: [], rest: {} });

describe("itemState", () => {
  it("outil : pressé selon view.tool", () => {
    expect(itemState(tool("pen"), view()).pressed).toBe(true);
    expect(itemState(tool("eraser"), view()).pressed).toBe(false);
  });
  it("outil hand : pressé quand la main est active", () => {
    expect(itemState(tool("hand"), view({ tool: "hand" })).pressed).toBe(true);
    expect(itemState(tool("hand"), view()).pressed).toBe(false);
  });
  it("outil : libellé de l'élément", () => {
    expect(itemState(tool("pen", "Stylo"), view()).label).toBe("Stylo");
  });
  it("eraser-mode : libellé et pressé suivent le mode", () => {
    expect(itemState(action("eraser-mode"), view())).toMatchObject({ pressed: false, label: "Gomme : partielle" });
    expect(itemState(action("eraser-mode"), view({ eraserMode: "object" }))).toMatchObject({ pressed: true, label: "Gomme : objet" });
  });
  it("undo désactivé sans étape", () => {
    expect(itemState(action("undo"), view({ canUndo: false })).disabled).toBe(true);
    expect(itemState(action("undo"), view()).disabled).toBe(false);
  });
  it("redo désactivé sans étape", () => {
    expect(itemState(action("redo"), view({ canRedo: false })).disabled).toBe(true);
    expect(itemState(action("redo"), view()).disabled).toBe(false);
  });
  it("page-prev désactivé sur la première page", () => {
    expect(itemState(action("page-prev"), view({ pageIndex: 0 })).disabled).toBe(true);
    expect(itemState(action("page-prev"), view()).disabled).toBe(false);
  });
  it("page-next désactivé sur la dernière page", () => {
    expect(itemState(action("page-next"), view({ pageIndex: 2 })).disabled).toBe(true);
    expect(itemState(action("page-next"), view()).disabled).toBe(false);
  });
  it("page-remove désactivé avec une seule page", () => {
    expect(itemState(action("page-remove"), view({ pageCount: 1, pageIndex: 0 })).disabled).toBe(true);
    expect(itemState(action("page-remove"), view()).disabled).toBe(false);
  });
  it("action sans règle : ni pressée ni désactivée", () => {
    expect(itemState(action("file-save", "Enregistrer"), view())).toEqual({ pressed: null, disabled: false, label: "Enregistrer" });
  });
  it("identifiant hérité (toString) : sans règle", () => {
    expect(itemState(action("toString"), view()).disabled).toBe(false);
    expect(Object.hasOwn(ACTION_STATE, "toString")).toBe(false);
  });
  it("séparateur : état neutre", () => {
    const sep: ToolItem = { id: "s", kind: "separator", label: "", requires: [], rest: {} };
    expect(itemState(sep, view()).pressed).toBeNull();
  });
});

describe("état des actions du tableau (C10a, T10)", () => {
  const cell = (rows: number, cols: number) => ({ id: "t", row: 0, col: 0, rows, cols });
  it("sans cellule active : les cinq actions grisées", () => {
    for (const a of ["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform"]) {
      expect(itemState(action(a), view()).disabled, a).toBe(true);
      expect(itemState(action(a), view({ tableCell: null })).disabled, a).toBe(true);
    }
  });
  it("cellule active : tout permis ; une seule ligne ou colonne : « − » grisé ; 64 : « + » grisé (T4, HC10-9)", () => {
    expect(itemState(action("table-row-remove"), view({ tableCell: cell(3, 4) })).disabled).toBe(false);
    expect(itemState(action("table-row-remove"), view({ tableCell: cell(1, 4) })).disabled).toBe(true);
    expect(itemState(action("table-col-remove"), view({ tableCell: cell(3, 1) })).disabled).toBe(true);
    expect(itemState(action("table-row-insert"), view({ tableCell: cell(64, 4) })).disabled).toBe(true);
    expect(itemState(action("table-col-insert"), view({ tableCell: cell(3, 64) })).disabled).toBe(true);
    expect(itemState(action("table-col-insert"), view({ tableCell: cell(3, 63) })).disabled).toBe(false);
    expect(itemState(action("table-uniform"), view({ tableCell: cell(3, 4) })).disabled).toBe(false);
  });
});

describe("état des actions du tableau (C10b, F15)", () => {
  const cell = (o: Partial<TableCellState> = {}): TableCellState => ({ id: "t", row: 0, col: 0, rows: 3, cols: 4, ...o });
  it("Fusionner : plage d'au moins deux cellules ; sans plage : grisé", () => {
    expect(itemState(action("table-merge"), view({ tableCell: cell() })).disabled).toBe(true);
    expect(itemState(action("table-merge"), view({ tableCell: cell({ range: { r0: 0, c0: 0, r1: 0, c1: 1 } }) })).disabled).toBe(false);
  });
  it("Diviser : cellule active fusionnée, sans plage", () => {
    expect(itemState(action("table-split"), view({ tableCell: cell({ merged: true }) })).disabled).toBe(false);
    expect(itemState(action("table-split"), view({ tableCell: cell({ merged: true, range: { r0: 0, c0: 0, r1: 1, c1: 1 } }) })).disabled).toBe(true);
    expect(itemState(action("table-split"), view({ tableCell: cell() })).disabled).toBe(true);
  });
  it("Ombrer : une cellule active (PC21)", () => {
    expect(itemState(action("table-shade"), view({ tableCell: cell() })).disabled).toBe(false);
    expect(itemState(action("table-shade"), view({ tableCell: null })).disabled).toBe(true);
  });
  it("Désombrer : au moins une cellule ombrée dans la plage (ou l'active)", () => {
    expect(itemState(action("table-unshade"), view({ tableCell: cell({ shaded: true }) })).disabled).toBe(false);
    expect(itemState(action("table-unshade"), view({ tableCell: cell({ shaded: false }) })).disabled).toBe(true);
  });
});

describe("« − Ligne » / « − Colonne » selon l'étendue réelle (constat T13)", () => {
  const base = { id: "t", row: 0, col: 0 };
  it("plage ou zone sur toutes les lignes : « − Ligne » grisé ; sur toutes les colonnes : « − Colonne » grisé", () => {
    const range = { ...base, rows: 3, cols: 4, range: { r0: 0, c0: 1, r1: 2, c1: 2 } };
    expect(itemState(action("table-row-remove"), view({ tableCell: range })).disabled).toBe(true);
    expect(itemState(action("table-col-remove"), view({ tableCell: range })).disabled).toBe(false);
    const zone = { ...base, rows: 2, cols: 3, merged: true, zone: { r0: 0, c0: 0, r1: 1, c1: 2 } };
    expect(itemState(action("table-row-remove"), view({ tableCell: zone })).disabled).toBe(true);
    expect(itemState(action("table-col-remove"), view({ tableCell: zone })).disabled).toBe(true);
    const part = { ...base, rows: 3, cols: 3, merged: true, zone: { r0: 0, c0: 0, r1: 1, c1: 0 } };
    expect(itemState(action("table-row-remove"), view({ tableCell: part })).disabled).toBe(false);
    expect(itemState(action("table-col-remove"), view({ tableCell: part })).disabled).toBe(false);
  });
});

describe("annotation (C11a, P6, P8, P15, P20)", () => {
  const base: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: true, canRedo: true, pageIndex: 0, pageCount: 1 };
  const act = (a: string): ToolItem => ({ id: a, kind: "action", action: a, label: ACTION_TABLE[a]?.label ?? a, requires: [], rest: {} });
  const on = (pointer: "draw" | "mouse" = "draw", screens = 2): ToolbarView => ({ ...base, annotation: { active: true, pointer, screens } });
  it("desktop-annotation : « Annotation du bureau » au tableau, « Quitter l'annotation » enfoncé en annotation", () => {
    expect(itemState(act("desktop-annotation"), base)).toMatchObject({ pressed: false, label: "Annotation du bureau", disabled: false });
    expect(itemState(act("desktop-annotation"), on())).toMatchObject({ pressed: true, label: "Quitter l'annotation", disabled: false });
  });
  it("annotation-pointer : « Souris » en dessin, « Dessin » enfoncé en souris ; grisé hors annotation", () => {
    expect(itemState(act("annotation-pointer"), on("draw"))).toMatchObject({ pressed: false, label: "Souris", disabled: false });
    expect(itemState(act("annotation-pointer"), on("mouse"))).toMatchObject({ pressed: true, label: "Dessin" });
    expect(itemState(act("annotation-pointer"), base).disabled).toBe(true);
  });
  it("annotation-screen : grisé à un écran ou hors annotation", () => {
    expect(itemState(act("annotation-screen"), on("draw", 2)).disabled).toBe(false);
    expect(itemState(act("annotation-screen"), on("draw", 1)).disabled).toBe(true);
    expect(itemState(act("annotation-screen"), base).disabled).toBe(true);
  });
  it("en annotation : action non transmise grisée (file-save), transmise active (undo)", () => {
    expect(itemState(act("file-save"), on()).disabled).toBe(true);
    expect(itemState(act("undo"), on()).disabled).toBe(false);
  });
  it("sans champ annotation : rien ne change (file-save actif)", () => {
    expect(itemState(act("file-save"), base).disabled).toBe(false);
  });
});
