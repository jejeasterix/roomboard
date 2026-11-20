import { describe, expect, it } from "vitest";
import type { ToolItem } from "../toolbar";
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
