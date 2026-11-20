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
  tableMerges: 0,
  tableShades: 0,
  textFormat: null,
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
    expect(stageTags(s)).toEqual({ page: "2/3", selection: "2", bounds: "98,-2.3,202,202.4", tool: "select", table: "", tableMerges: "0", tableShades: "0" });
    expect(stageTags({ ...base, pageIndex: 0, pageCount: 1 })).toEqual({ page: "1/1", selection: "0", bounds: "", tool: "pen", table: "", tableMerges: "0", tableShades: "0" });
    expect(pagesLabel(s)).toBe("2 / 3");
  });

  it("table : colonnes x lignes @ rang, colonne ; vide sans cellule (C10a, T15)", () => {
    expect(stageTags(base).table).toBe("");
    expect(stageTags({ ...base, tableCell: { id: "t", row: 2, col: 3, rows: 3, cols: 4 } }).table).toBe("4x3@2,3");
  });
});

describe("stageTags (C10b, F29)", () => {
  it("table : avec une plage, `<c>x<l>@<r>,<c>-<r2>,<c2>` ; sans plage, forme de C10a", () => {
    const cell = { id: "t", row: 0, col: 0, rows: 3, cols: 4 };
    expect(stageTags({ ...base, tableCell: { ...cell, range: { r0: 0, c0: 0, r1: 0, c1: 1 } } }).table).toBe("4x3@0,0-0,1");
    expect(stageTags({ ...base, tableCell: { ...cell, range: null } }).table).toBe("4x3@0,0");
  });
  it("tableMerges, tableShades : comptes de la page montrée en texte", () => {
    const t = stageTags({ ...base, tableMerges: 2, tableShades: 3 });
    expect([t.tableMerges, t.tableShades]).toEqual(["2", "3"]);
  });
});
