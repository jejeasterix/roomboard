// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { EngineState } from "../engine/engine";
import { pagesLabel } from "../ui/item-state";
import { stageTags } from "./stage-tags";

const base: EngineState = {
  tool: "pen",
  eraserMode: "partial",
  canUndo: false,
  canRedo: false,
  page: "p",
  pageIndex: 0,
  pageCount: 1,
  pageMode: "page",
  pageLayout: "landscape",
  selection: [],
  selectionBounds: null,
  selectionUnits: 0,
  selectionGrouped: false,
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
    expect(stageTags(s)).toEqual({ page: "2/3", selection: "2", bounds: "98,-2.3,202,202.4", tool: "select", pageMode: "landscape", table: "", tableMerges: "0", tableShades: "0", units: "0", grouped: "0", pixels: "", image: "", pot: "", zones: "", zoneMs: "", zoneCells: "" });
    expect(stageTags({ ...base, pageIndex: 0, pageCount: 1 })).toEqual({ page: "1/1", selection: "0", bounds: "", tool: "pen", pageMode: "landscape", table: "", tableMerges: "0", tableShades: "0", units: "0", grouped: "0", pixels: "", image: "", pot: "", zones: "", zoneMs: "", zoneCells: "" });
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

describe("stageTags (C3)", () => {
  it("units et grouped (PC9)", () => {
    expect(stageTags({ ...base, selection: ["a", "b", "c"], selectionUnits: 1, selectionGrouped: true })).toMatchObject({ units: "1", grouped: "1" });
    expect(stageTags(base)).toMatchObject({ units: "0", grouped: "0" });
  });
});

describe("stageTags (C5, I33)", () => {
  it("pixels et image : vides par défaut ; état des pixels et boîte affichée en pixels source", () => {
    expect([stageTags(base).pixels, stageTags(base).image]).toEqual(["", ""]);
    const t = stageTags(base, { pixels: "pret", image: [160, 120] });
    expect([t.pixels, t.image]).toEqual(["pret", "160x120"]);
    expect(stageTags(base, { pixels: "echec", image: null }).image).toBe("");
  });
});

describe("stageTags (C6b, B21)", () => {
  it("pot : état de la file du pot ; absent : vide", () => {
    expect(stageTags(base).pot).toBe("");
    expect(stageTags(base, { pot: "attente" }).pot).toBe("attente");
  });
});
describe("stageTags (C8, Q18)", () => {
  it("C8 zones, zoneMs, zoneCells : recopiés ; vides par défaut", () => {
    expect(stageTags(base, { zones: "1", zoneMs: "12.3", zoneCells: "4032064" })).toMatchObject({ zones: "1", zoneMs: "12.3", zoneCells: "4032064" });
    expect(stageTags(base)).toMatchObject({ zones: "", zoneMs: "", zoneCells: "" });
  });
});

describe("data-page-mode", () => {
  it("data-page-mode suit la page montrée", () => {
    expect(stageTags({ ...base, pageLayout: "portrait" }).pageMode).toBe("portrait");
    expect(stageTags({ ...base, pageMode: "infinite", pageLayout: "infinite" }).pageMode).toBe("infinite");
  });
});
