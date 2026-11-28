import { describe, expect, it } from "vitest";
import { fakeCore } from "../core/fake-core";
import type { CoreDocument, ElementView, Matrix, TableData } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { destOf, keepsMerges, movedOrder, anchorOf, cellAt, cellContaining, cellContent, cellGrips, cellHeight, cellInnerBox, cellOf, cellRect, cellTextFrame, edgeAt, expandRange, linkedBoxes, isCovered, mergeAt, mergeRanges, rangeCells, rangeRect, requiredSizes, rowHeightsFor, naturalWidth, step, tableAt, TABLE_PADDING } from "./table-geom";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;
const T: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 240 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 80 }],
  cells: [{ row: "r2", col: "c1", text: "Lundi", fill: "#fef08a", shade: null, spans: plainSpans("Lundi") }],
  merges: [],
};
const at = (row: number, col: number) => ({ row, col });
const docOf = (els: ElementView[]): Pick<CoreDocument, "elementIds" | "elementIdsOfKind" | "element"> => ({
  elementIds: () => els.map((e) => e.id),
  elementIdsOfKind: (_page, kind) => els.filter((e) => e.kind === kind).map((e) => e.id),
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

  it("F16, constat T13 : → depuis (1,1) d'un 3 × 3, zone (0,2)-(1,2) dont l'ancre précède : zone sautée, (2,0), jamais l'ancre (0,2)", () => {
    const g: TableData = {
      ...T,
      cols: [{ id: "c1", width: 240 }, { id: "c2", width: 240 }, { id: "c3", width: 240 }],
      rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }, { id: "r3", height: 64 }],
      cells: [],
      merges: [{ row: "r1", col: "c3", rows: 2, cols: 1 }],
    };
    expect(step(g, at(1, 1), "right")).toEqual(at(2, 0));
    expect(step(g, at(0, 2), "right")).toEqual(at(1, 0));
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
    expect(cellContent(T, "r2", "c1")).toEqual({ text: "Lundi", spans: plainSpans("Lundi"), fill: "#fef08a", shade: null });
    expect(cellContent(T, "r1", "c1")).toEqual({ text: "", spans: plainSpans(""), fill: null, shade: null });
  });

  it("cellHeight : même mise en lignes que le dessin (layoutRich, B1), plus deux marges (T5)", () => {
    expect(cellHeight(plainSpans(""), 36, 240, narrow)).toBe(36 * 1.25 + 2 * TABLE_PADDING);
    const text = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee";
    const want = richBoxHeight(layoutRich(plainSpans(text), { size: 36 }, 240 - 2 * TABLE_PADDING, narrow)) + 2 * TABLE_PADDING;
    expect(cellHeight(plainSpans(text), 36, 240, narrow)).toBe(want);
    expect(want).toBeGreaterThan(2 * 45 + 2 * TABLE_PADDING);
  });

  it("rowHeightsFor : par ligne, la plus haute cellule aux largeurs données (Uniformiser, T11)", () => {
    const long: TableData = {
      ...T,
      cells: [{ row: "r1", col: "c2", text: "aaaaaaaaaa bbbbbbbbbb cccccccccc", fill: null, shade: null, spans: plainSpans("aaaaaaaaaa bbbbbbbbbb cccccccccc") }],
    };
    const h = rowHeightsFor(long, [170, 170], narrow);
    expect(h[0]).toBe(cellHeight(plainSpans("aaaaaaaaaa bbbbbbbbbb cccccccccc"), 36, 170, narrow));
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

/** 3 × 3 (100 × 64) ; zone r1..r2 × c1..c2 ancrée en (0, 0), « Lundi », ombrée. */
const M: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }, { id: "c3", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }, { id: "r3", height: 64 }],
  cells: [{ row: "r1", col: "c1", text: "Lundi", fill: null, shade: "#94a3b8", spans: plainSpans("Lundi") }],
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
    const wide: TableData = { ...M, cells: [{ row: "r1", col: "c1", text, fill: null, shade: null, spans: plainSpans(text) }], merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }] };
    const hw = rowHeightsFor(wide, [100, 100, 100], narrow);
    expect(hw[0]).toBe(cellHeight(plainSpans(text), 36, 200, narrow));
    const tall: TableData = { ...M, cells: [{ row: "r1", col: "c1", text, fill: null, shade: null, spans: plainSpans(text) }], merges: [{ row: "r1", col: "c1", rows: 2, cols: 1 }] };
    const ht = rowHeightsFor(tall, [100, 100, 100], narrow);
    const one = cellHeight(plainSpans(""), 36, 100, narrow);
    expect([ht[0], ht[1], ht[2]]).toEqual([one, Math.max(one, cellHeight(plainSpans(text), 36, 100, narrow) - one), one]);
  });

  it("cellContent : texte, remplissage et ombrage d'une cellule par ids", () => {
    expect(cellContent(M, "r1", "c1")).toEqual({ text: "Lundi", spans: plainSpans("Lundi"), fill: null, shade: "#94a3b8" });
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
    const big: TableData = { ...T, cells: [{ row: "r1", col: "c1", text: "chat", fill: null, shade: null, spans: [{ text: "chat", attrs: { size: 72 } }] }] };
    expect(rowHeightsFor(big, [240, 100], narrow)[0]).toBe(72 * 1.25 + 2 * TABLE_PADDING);
  });

  it("cellContent : segments de la cellule ; cellule absente : un segment vide", () => {
    const rich: TableData = { ...T, cells: [{ row: "r1", col: "c1", text: "ab", fill: null, shade: null, spans: [{ text: "ab", attrs: { bold: true } }] }] };
    expect(cellContent(rich, "r1", "c1").spans).toEqual([{ text: "ab", attrs: { bold: true } }]);
    expect(cellContent(rich, "r2", "c2").spans).toEqual(plainSpans(""));
  });

  it("tableAt garde le plus haut (D28, elementIdsOfKind)", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const add = (x: number): string => doc.apply({ type: "AddTable", page, x, y: 0, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    add(0);
    const top = add(100);
    expect(tableAt(doc, page, 150, 10)?.id).toBe(top);
  });

  it("requiredSizes (D34) : objet + 2 × marge, plancher 64 en hauteur et 2 × 8 + 24 en largeur", () => {
    const t: TableData = { color: "#000000", size: 36, cols: [{ id: "c0", width: 240 }, { id: "c1", width: 240 }], rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }], cells: [], merges: [] };
    const measure = (s: string, size: number): number => s.length * size * 0.5;
    const r = requiredSizes(t, [{ row: "r1", col: "c1", w: 400, h: 300 }], [240, 240], measure);
    expect(r.cols).toEqual([40, 416]);
    expect(r.rows[1]).toBe(316);
    expect(r.rows[0]).toBeGreaterThanOrEqual(64);
  });
});

describe("D10 : cellContaining (T8)", () => {
  it("D10 : cellContaining rend la case qui contient la boîte (tolérance demi-épaisseur), null si elle déborde", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const id = doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 3, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const v = doc.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    expect(cellContaining(doc, page, { x0: 20, y0: 70, x1: 200, y1: 126 }, 20, 90, 2)).toEqual([id, v.table.rows[1]?.id, v.table.cols[0]?.id]);
    expect(cellContaining(doc, page, { x0: 20, y0: 70, x1: 300, y1: 126 }, 20, 90, 2)).toBeNull();
  });
});

describe("cellContent : fond d'image (T9, S5)", () => {
  it("S5 : bg présent quand la case a un fond, absent sinon", () => {
    const bg = "a".repeat(64);
    const t = { color: "#000000", size: 36, cols: [{ id: "c", width: 240 }], rows: [{ id: "r", height: 64 }], cells: [{ row: "r", col: "c", text: "", fill: null, shade: null, spans: [], bg }], merges: [] };
    expect(cellContent(t, "r", "c").bg).toBe(bg);
    expect("bg" in cellContent({ ...t, cells: [] }, "r", "c")).toBe(false);
  });
});

describe("TB1 bordures", () => {
  const t3 = (): TableData => ({
    color: "#000", size: 36, merges: [], cells: [],
    cols: [{ id: "a", width: 240 }, { id: "b", width: 240 }, { id: "c", width: 240 }],
    rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
  });
  it("TB1 edgeAt : bord droit de la colonne 0 à ± tol ; bord gauche exclu ; bord bas de la ligne 1", () => {
    expect(edgeAt(t3(), 243, 30, 6)).toEqual({ axis: "col", index: 0 });
    expect(edgeAt(t3(), 3, 30, 6)).toBeNull();
    expect(edgeAt(t3(), 100, 131, 6)).toEqual({ axis: "row", index: 1 });
    expect(edgeAt(t3(), 100, 30, 6)).toBeNull();
  });
  it("TB1 cellGrips : milieu du bord droit et du bord bas de la zone", () => {
    expect(cellGrips(t3(), { row: 1, col: 1 })).toEqual([
      { kind: "col", x: 480, y: 96, index: 1 },
      { kind: "row", x: 360, y: 128, index: 1 },
    ]);
  });
  it("TB1 linkedBoxes : boîte locale des objets liés au tableau, `skip` exclu", () => {
    const doc = {
      elementIds: () => ["t", "o", "p"],
      element: (id: string) => (id === "o" ? { id, cell: ["t", "r1", "b"] } : id === "p" ? { id, cell: ["x", "r0", "a"] } : { id }) as never,
      bounds: (ids: readonly string[]) => (ids[0] === "o" ? { x0: 1010, y0: 2010, x1: 1110, y1: 2060 } : null),
    };
    expect(linkedBoxes(doc, "pg", { id: "t", transform: [1, 0, 0, 1, 1000, 2000] })).toEqual([{ row: "r1", col: "b", w: 100, h: 50 }]);
    expect(linkedBoxes(doc, "pg", { id: "t", transform: [1, 0, 0, 1, 1000, 2000] }, ["o"])).toEqual([]);
  });
});

describe("naturalWidth (D14, DS7)", () => {
  const m = (s: string) => s.length * 10;
  const t = (texts: Record<string, string>, merges: TableData["merges"] = []): TableData => ({
    color: "#000", size: 36, merges,
    cols: [{ id: "a", width: 100 }, { id: "b", width: 100 }],
    rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
    cells: Object.entries(texts).map(([k, text]) => {
      const [row, col] = k.split(":");
      return { row: row ?? "", col: col ?? "", text, fill: null, shade: null, spans: [{ text, attrs: {} }] };
    }),
  });
  it("naturalWidth : ligne la plus longue sans retour + 2 × marge ; paragraphes séparés", () => {
    expect(naturalWidth(t({ "r0:a": "Photosynthèse", "r1:a": "ab\nabcdef" }), 0, m)).toBe(130 + 16);
  });
  it("naturalWidth : zone de deux colonnes ignorée ; colonne vide : 2 × marge", () => {
    expect(naturalWidth(t({ "r0:a": "abcdefghij" }, [{ row: "r0", col: "a", rows: 1, cols: 2 }]), 0, m)).toBe(16);
  });
});

describe("cellTextFrame (D15, DS6)", () => {
  const base = (cell: Partial<TableData["cells"][number]>): TableData => ({
    color: "#000", size: 36, merges: [],
    cols: [{ id: "a", width: 240 }], rows: [{ id: "r", height: 164 }],
    cells: [{ row: "r", col: "a", text: "x", fill: null, shade: null, spans: [{ text: "x", attrs: {} }], ...cell }],
  });
  it("cellTextFrame : sans alignement : la boîte intérieure, ha left", () => {
    expect(cellTextFrame(base({}), { row: 0, col: 0 }, 45)).toEqual({ x: 8, y: 8, w: 224, h: 148, ha: "left" });
  });
  it("cellTextFrame : va middle descend de (148 − 45) / 2, bottom de 148 − 45 ; ha porté", () => {
    expect(cellTextFrame(base({ va: "middle", ha: "center" }), { row: 0, col: 0 }, 45)).toEqual({ x: 8, y: 8 + 51.5, w: 224, h: 148 - 51.5, ha: "center" });
    expect(cellTextFrame(base({ va: "bottom" }), { row: 0, col: 0 }, 45)).toMatchObject({ y: 8 + 103 });
    // Texte plus haut que la case : aucune descente (jamais au-dessus du coin intérieur).
    expect(cellTextFrame(base({ va: "bottom" }), { row: 0, col: 0 }, 400)).toMatchObject({ y: 8 });
  });
});

describe("movedOrder, keepsMerges (D18, DS8)", () => {
  it("movedOrder : ligne 2 sur la ligne 0 : 2, 0, 1 ; bloc 0..1 sur la ligne 2 : 2, 0, 1", () => {
    expect(movedOrder(["a", "b", "c"], 2, 2, destOf(2, 2, 0))).toEqual(["c", "a", "b"]);
    expect(movedOrder(["a", "b", "c"], 0, 1, destOf(0, 1, 2))).toEqual(["c", "a", "b"]);
  });
  it("movedOrder : arrivée dans le bloc : ordre inchangé", () => {
    expect(movedOrder(["a", "b", "c"], 0, 1, destOf(0, 1, 1))).toEqual(["a", "b", "c"]);
  });
  it("keepsMerges : zone r0..r1 entière déplacée : vrai ; coupée : faux", () => {
    const t: TableData = {
      color: "#000", size: 36, cells: [], merges: [{ row: "a", col: "x", rows: 2, cols: 1 }],
      cols: [{ id: "x", width: 100 }], rows: [{ id: "a", height: 64 }, { id: "b", height: 64 }, { id: "c", height: 64 }],
    };
    expect(keepsMerges(t, "row", ["c", "a", "b"])).toBe(true);
    expect(keepsMerges(t, "row", ["a", "c", "b"])).toBe(false);
  });
});
