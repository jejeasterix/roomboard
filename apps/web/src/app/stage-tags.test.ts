// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { EngineState } from "../engine/engine";
import { pagesLabel } from "../ui/PagesBar";
import { stageTags } from "./stage-tags";

const base: EngineState = {
  tool: "pen",
  eraserMode: "partial",
  canUndo: false,
  canRedo: false,
  page: "p",
  pageIndex: 0,
  pageCount: 1,
  selection: [],
  selectionBounds: null,
  elementCount: 0,
  version: 0,
  error: null,
  tableCell: null,
};

describe("stageTags (repris des tests de l'ancienne barre DOM)", () => {
  it("stageTags : page, sélection, boîte au dixième, outil ; pagesLabel", () => {
    const s: EngineState = {
      ...base,
      tool: "select",
      pageIndex: 1,
      pageCount: 3,
      selection: ["a", "b"],
      selectionBounds: { x0: 98.04, y0: -2.26, x1: 202, y1: 202.36 },
    };
    expect(stageTags(s)).toEqual({ page: "2/3", selection: "2", bounds: "98,-2.3,202,202.4", tool: "select", table: "" });
    expect(stageTags({ ...base, pageIndex: 0, pageCount: 1 })).toEqual({ page: "1/1", selection: "0", bounds: "", tool: "pen", table: "" });
    expect(pagesLabel(s)).toBe("2 / 3");
  });

  it("table : colonnes x lignes @ rang, colonne ; vide sans cellule (C10a, T15)", () => {
    expect(stageTags(base).table).toBe("");
    expect(stageTags({ ...base, tableCell: { id: "t", row: 2, col: 3, rows: 3, cols: 4 } }).table).toBe("4x3@2,3");
  });
});
