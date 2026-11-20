import { describe, expect, it } from "vitest";
import type { CoreDocument, ElementView, Matrix, TableData } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { anchorOf, cellAt, cellContent, cellHeight, cellInnerBox, cellOf, cellRect, expandRange, isCovered, mergeAt, mergeRanges, rangeCells, rangeRect, rowHeightsFor, step, tableAt, TABLE_PADDING } from "./table-geom";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;
const T: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 240 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 80 }],
  cells: [{ row: "r2", col: "c1", text: "Lundi", fill: "#fef08a", shade: null }],
  merges: [],
};
const at = (row: number, col: number) => ({ row, col });
const docOf = (els: ElementView[]): Pick<CoreDocument, "elementIds" | "element"> => ({
  elementIds: () => els.map((e) => e.id),
  element: (id) => els.find((e) => e.id === id) ?? null,
});
const table = (id: string, transform: Matrix): ElementView => ({ id, kind: "table", transform, table: T });
const ink: ElementView = { id: "s", kind: "stroke", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 4 } };

describe("géométrie des cellules (C10a, DAC6)", () => {
  it("cellAt : cellule sous un point local ; bords gauche et haut inclus ; hors du tableau ou NaN : null", () => {
    expect(cellAt(T, 0, 0)).toEqual(at(0, 0));
    expect(cellAt(T, 239.9, 63.9)).toEqual(at(0, 0));
    expect(cellAt(T, 240, 64)).toEqual(at(1, 1));
    expect(cellAt(T, 339.9, 143.9)).toEqual(at(1, 1));
    for (const [x, y] of [[-0.1, 10], [10, -0.1], [340, 10], [10, 144], [Number.NaN, 10]] as const) expect(cellAt(T, x, y)).toBeNull();
  });

  it("cellRect : rectangle local d'une cellule", () => {
    expect(cellRect(T, at(0, 0))).toEqual({ x0: 0, y0: 0, x1: 240, y1: 64 });
    expect(cellRect(T, at(1, 1))).toEqual({ x0: 240, y0: 64, x1: 340, y1: 144 });
  });

  it("step : Tab et ←/→ dans l'ordre de lecture, ↑/↓ dans la colonne ; ajout de ligne seulement par Tab en dernière cellule (T8, PC4)", () => {
    expect(step(T, at(0, 1), "next")).toEqual(at(1, 0));
    expect(step(T, at(1, 1), "next")).toBe("add-row");
    expect(step(T, at(0, 1), "right")).toEqual(at(1, 0));
    expect(step(T, at(1, 1), "right")).toBeNull();
    expect(step(T, at(1, 0), "prev")).toEqual(at(0, 1));
    expect(step(T, at(0, 0), "prev")).toBeNull();
    expect(step(T, at(1, 0), "left")).toEqual(at(0, 1));
    expect(step(T, at(0, 0), "left")).toBeNull();
    expect(step(T, at(1, 1), "up")).toEqual(at(0, 1));
    expect(step(T, at(0, 1), "up")).toBeNull();
    expect(step(T, at(0, 1), "down")).toEqual(at(1, 1));
    expect(step(T, at(1, 1), "down")).toBeNull();
  });

  it("cellOf, cellContent : par ids ; ligne disparue : null ; cellule absente : vide", () => {
    expect(cellOf(T, { id: "t", row: "r2", col: "c2" })).toEqual(at(1, 1));
    expect(cellOf(T, { id: "t", row: "r9", col: "c2" })).toBeNull();
    expect(cellContent(T, "r2", "c1")).toEqual({ text: "Lundi", fill: "#fef08a", shade: null });
    expect(cellContent(T, "r1", "c1")).toEqual({ text: "", fill: null, shade: null });
  });

  it("cellHeight : même mise en lignes que le dessin (layoutRich, B1), plus deux marges (T5)", () => {
    expect(cellHeight("", 36, 240, narrow)).toBe(36 * 1.25 + 2 * TABLE_PADDING);
    const text = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee";
    const want = richBoxHeight(layoutRich(plainSpans(text), { size: 36 }, 240 - 2 * TABLE_PADDING, narrow)) + 2 * TABLE_PADDING;
    expect(cellHeight(text, 36, 240, narrow)).toBe(want);
    expect(want).toBeGreaterThan(2 * 45 + 2 * TABLE_PADDING);
  });

  it("rowHeightsFor : par ligne, la plus haute cellule aux largeurs données (Uniformiser, T11)", () => {
    const long: TableData = { ...T, cells: [{ row: "r1", col: "c2", text: "aaaaaaaaaa bbbbbbbbbb cccccccccc", fill: null, shade: null }] };
    const h = rowHeightsFor(long, [170, 170], narrow);
    expect(h[0]).toBe(cellHeight("aaaaaaaaaa bbbbbbbbbb cccccccccc", 36, 170, narrow));
    expect(h[1]).toBe(cellHeight("", 36, 170, narrow));
  });

  it("tableAt : le tableau le plus haut sous le point, même sous un trait (I2) ; point ramené au repère du tableau", () => {
    const d = docOf([table("bas", [1, 0, 0, 1, 0, 0]), table("haut", [2, 0, 0, 2, 100, 50]), ink]);
    expect(tableAt(d, "p", 100 + 2 * 250, 50 + 2 * 70)).toMatchObject({ id: "haut", cell: at(1, 1) });
    expect(tableAt(d, "p", 10, 10)).toMatchObject({ id: "bas", cell: at(0, 0), transform: [1, 0, 0, 1, 0, 0] });
    expect(tableAt(d, "p", 5000, 5000)).toBeNull();
  });

  it("tableAt : matrice non inversible sautée", () => {
    const d = docOf([table("bas", [1, 0, 0, 1, 0, 0]), table("plat", [0, 0, 0, 0, 0, 0])]);
    expect(tableAt(d, "p", 10, 10)?.id).toBe("bas");
  });
});

/** 3 × 3 (100 × 64) ; zone r1..r2 × c1..c2 ancrée en (0, 0), « Lundi », ombrée. */
const M: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }, { id: "c3", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }, { id: "r3", height: 64 }],
  cells: [{ row: "r1", col: "c1", text: "Lundi", fill: null, shade: "#94a3b8" }],
  merges: [{ row: "r1", col: "c1", rows: 2, cols: 2 }],
};
const range = (r0: number, c0: number, r1: number, c1: number) => ({ r0, c0, r1, c1 });

describe("zones et plages (C10b, F14 à F16, F7)", () => {
  it("mergeRanges, mergeAt, anchorOf, isCovered : zones de la vue en rangs ; ancre inconnue : zone sautée", () => {
    expect(mergeRanges(M)).toEqual([range(0, 0, 1, 1)]);
    expect(mergeRanges({ ...M, merges: [{ row: "r9", col: "c1", rows: 2, cols: 2 }] })).toEqual([]);
    expect(mergeAt(M, at(1, 1))).toEqual(range(0, 0, 1, 1));
    expect(mergeAt(M, at(2, 2))).toBeNull();
    expect([anchorOf(M, at(1, 1)), anchorOf(M, at(2, 2))]).toEqual([at(0, 0), at(2, 2)]);
    expect([isCovered(M, at(0, 0)), isCovered(M, at(0, 1)), isCovered(M, at(2, 0))]).toEqual([false, true, false]);
  });

  it("F16 : cellAt rend l'ancre d'une cellule couverte", () => {
    expect(cellAt(M, 150, 100)).toEqual(at(0, 0));
    expect(cellAt(M, 250, 10)).toEqual(at(0, 2));
  });

  it("cellRect, cellInnerBox : rectangle réuni de la zone, pour l'ancre comme pour une couverte", () => {
    expect(cellRect(M, at(1, 0))).toEqual({ x0: 0, y0: 0, x1: 200, y1: 128 });
    expect(cellInnerBox(M, at(0, 0))).toEqual({ x: TABLE_PADDING, y: TABLE_PADDING, w: 200 - 2 * TABLE_PADDING, h: 128 - 2 * TABLE_PADDING });
  });

  it("F14 : expandRange contient chaque zone touchée ; rangeRect", () => {
    expect(expandRange(M, at(1, 1), at(2, 2))).toEqual(range(0, 0, 2, 2));
    expect(expandRange(M, at(2, 2), at(0, 2))).toEqual(range(0, 2, 2, 2));
    expect(rangeRect(M, range(0, 2, 2, 2))).toEqual({ x0: 200, y0: 0, x1: 300, y1: 192 });
  });

  it("rangeCells : ancres et cellules simples de la plage, dans l'ordre de lecture", () => {
    expect(rangeCells(M, range(0, 0, 2, 2))).toEqual([at(0, 0), at(0, 2), at(1, 2), at(2, 0), at(2, 1), at(2, 2)]);
  });

  it("F16, S5 : Tab saute les cellules couvertes ; Maj+Tab revient à l'ancre ; fin : ajout de ligne", () => {
    expect(step(M, at(0, 0), "next")).toEqual(at(0, 2));
    expect(step(M, at(0, 2), "next")).toEqual(at(1, 2));
    expect(step(M, at(1, 2), "next")).toEqual(at(2, 0));
    expect(step(M, at(2, 2), "next")).toBe("add-row");
    expect(step(M, at(1, 2), "prev")).toEqual(at(0, 2));
    expect(step(M, at(2, 0), "prev")).toEqual(at(1, 2));
    expect(step(M, at(0, 2), "prev")).toEqual(at(0, 0));
  });

  it("F16 : flèches depuis une zone : → après sa fin à la ligne de l'ancre, ↓ après sa fin à la colonne de l'ancre ; couverte : son ancre", () => {
    expect(step(M, at(0, 0), "right")).toEqual(at(0, 2));
    expect(step(M, at(0, 2), "right")).toEqual(at(1, 2));
    expect(step(M, at(0, 0), "down")).toEqual(at(2, 0));
    expect(step(M, at(2, 1), "up")).toEqual(at(0, 0));
    expect(step(M, at(1, 2), "left")).toEqual(at(0, 0));
    expect(step(M, at(0, 0), "left")).toBeNull();
    expect(step(M, at(0, 0), "up")).toBeNull();
  });

  it("F7 : rowHeightsFor : zone d'une ligne mesurée à sa largeur réunie ; ancre de deux lignes : la dernière porte le reste", () => {
    const text = "aaaaaaaa bbbbbbbb cccccccc";
    const wide: TableData = { ...M, cells: [{ row: "r1", col: "c1", text, fill: null, shade: null }], merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }] };
    const hw = rowHeightsFor(wide, [100, 100, 100], narrow);
    expect(hw[0]).toBe(cellHeight(text, 36, 200, narrow));
    const tall: TableData = { ...M, cells: [{ row: "r1", col: "c1", text, fill: null, shade: null }], merges: [{ row: "r1", col: "c1", rows: 2, cols: 1 }] };
    const ht = rowHeightsFor(tall, [100, 100, 100], narrow);
    const one = cellHeight("", 36, 100, narrow);
    expect([ht[0], ht[1], ht[2]]).toEqual([one, Math.max(one, cellHeight(text, 36, 100, narrow) - one), one]);
  });

  it("cellContent : texte, remplissage et ombrage d'une cellule par ids", () => {
    expect(cellContent(M, "r1", "c1")).toEqual({ text: "Lundi", fill: null, shade: "#94a3b8" });
  });
});
