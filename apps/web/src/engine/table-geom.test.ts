import { describe, expect, it } from "vitest";
import type { CoreDocument, ElementView, Matrix, TableData } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { cellAt, cellContent, cellHeight, cellOf, cellRect, rowHeightsFor, step, tableAt, TABLE_PADDING } from "./table-geom";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;
const T: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 240 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 80 }],
  cells: [{ row: "r2", col: "c1", text: "Lundi", fill: "#fef08a", spans: plainSpans("Lundi") }],
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
    expect(cellContent(T, "r2", "c1")).toEqual({ text: "Lundi", spans: plainSpans("Lundi"), fill: "#fef08a" });
    expect(cellContent(T, "r1", "c1")).toEqual({ text: "", spans: plainSpans(""), fill: null });
  });

  it("cellHeight : même mise en lignes que le dessin (layoutRich, B1), plus deux marges (T5)", () => {
    expect(cellHeight(plainSpans(""), 36, 240, narrow)).toBe(36 * 1.25 + 2 * TABLE_PADDING);
    const text = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee";
    const want = richBoxHeight(layoutRich(plainSpans(text), { size: 36 }, 240 - 2 * TABLE_PADDING, narrow)) + 2 * TABLE_PADDING;
    expect(cellHeight(plainSpans(text), 36, 240, narrow)).toBe(want);
    expect(want).toBeGreaterThan(2 * 45 + 2 * TABLE_PADDING);
  });

  it("rowHeightsFor : par ligne, la plus haute cellule aux largeurs données (Uniformiser, T11)", () => {
    const long: TableData = { ...T, cells: [{ row: "r1", col: "c2", text: "aaaaaaaaaa bbbbbbbbbb cccccccccc", fill: null, spans: plainSpans("aaaaaaaaaa bbbbbbbbbb cccccccccc") }] };
    const h = rowHeightsFor(long, [170, 170], narrow);
    expect(h[0]).toBe(cellHeight("aaaaaaaaaa bbbbbbbbbb cccccccccc", 36, 170, narrow));
    expect(h[1]).toBe(cellHeight(plainSpans(""), 36, 170, narrow));
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

describe("table-geom — cellules par segments (C7b, R17)", () => {
  /** Mesure par face : 10 par caractère, 30 en gras. */
  const byFace: Measure = (s, _size, face) => s.length * (face?.bold ? 30 : 10);

  it("cellHeight : segments mesurés avec leur face ; un mot gras qui ne tient plus passe à la ligne", () => {
    const plainH = cellHeight(plainSpans("aaaa aaaa"), 36, 240, byFace);
    const boldH = cellHeight([{ text: "aaaa aaaa", attrs: { bold: true } }], 36, 240, byFace);
    expect(plainH).toBe(36 * 1.25 + 2 * TABLE_PADDING);
    expect(boldH).toBe(2 * 36 * 1.25 + 2 * TABLE_PADDING);
  });

  it("cellHeight : un segment de taille 72 fixe la hauteur de sa ligne", () => {
    expect(cellHeight([plainSpans("Le ")[0]!, { text: "chat", attrs: { size: 72 } }], 36, 240, narrow)).toBe(72 * 1.25 + 2 * TABLE_PADDING);
  });

  it("cellule sans attribut : même hauteur que le texte brut d'avant (C10a)", () => {
    expect(cellHeight(plainSpans("Lundi"), 36, 240, narrow)).toBe(richBoxHeight(layoutRich(plainSpans("Lundi"), { size: 36 }, 240 - 2 * TABLE_PADDING, narrow)) + 2 * TABLE_PADDING);
  });

  it("rowHeightsFor : mesure les segments de chaque cellule", () => {
    const big: TableData = { ...T, cells: [{ row: "r1", col: "c1", text: "chat", fill: null, spans: [{ text: "chat", attrs: { size: 72 } }] }] };
    expect(rowHeightsFor(big, [240, 100], narrow)[0]).toBe(72 * 1.25 + 2 * TABLE_PADDING);
  });

  it("cellContent : segments de la cellule ; cellule absente : un segment vide", () => {
    const rich: TableData = { ...T, cells: [{ row: "r1", col: "c1", text: "ab", fill: null, spans: [{ text: "ab", attrs: { bold: true } }] }] };
    expect(cellContent(rich, "r1", "c1").spans).toEqual([{ text: "ab", attrs: { bold: true } }]);
    expect(cellContent(rich, "r2", "c2").spans).toEqual(plainSpans(""));
  });
});
