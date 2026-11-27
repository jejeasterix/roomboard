/**
 * Géométrie des cellules côté page (C10a, DAC6 ; C10b, F7, F14 à F16) : fonctions pures, sans liaison neuve. Le cœur
 * calcule les zones fusionnées (règle F2) et les rend dans la vue (`TableData.merges`) ; la page les lit en rangs sans
 * recoder la règle (DAB1). Une cellule couverte vaut pour son ancre (`cellAt`, `cellRect`, `step`) ; une plage s'élargit
 * jusqu'à contenir chaque zone qu'elle touche (`expandRange`). La page trouve le tableau le plus haut sous un point
 * (même recouvert d'encre, I2) et mesure la hauteur qu'exige un texte (DAC2) avec la mise en lignes du dessin
 * (`layoutRich`, B1) ; sur une ancre de plusieurs lignes, la dernière ligne porte le reste (F7). Tailles par défaut en
 * unités de page (T4) ; la largeur de page se lit sur la page, jamais ici.
 */
import type { Bounds, CellLink, CoreDocument, Matrix, TableData, TableElement, TextSpan } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { applyMatrix, invertMatrix } from "../core/shapes";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

export const TABLE_COL_WIDTH = 240;
export const TABLE_ROW_HEIGHT = 64;
/** Marge intérieure d'une cellule : 36 × 1,25 + 2 × 8 = 61 ≤ 64. */
export const TABLE_PADDING = 8;
export const TABLE_LINE_WIDTH = 2;
/** Ombrage (F13, HB-6, choix visuel à l'essai) : fond opaque gris, puis hachures à 45°, trait 2, pas 16 unités. */
export const TABLE_SHADE_COLOR = "#94a3b8";
export const TABLE_SHADE_HATCH = "#cbd5e1";
export const TABLE_SHADE_HATCH_WIDTH = 2;
export const TABLE_SHADE_HATCH_STEP = 16;

export type NavMove = "next" | "prev" | "left" | "right" | "up" | "down";
export type TableAction = "row-insert" | "col-insert" | "row-remove" | "col-remove" | "uniform" | "merge" | "split" | "shade" | "unshade" | "fit-toggle";
/** Cellule par rangs (0 = première ligne, première colonne). */
export interface Cell { readonly row: number; readonly col: number }
/** Cellule active par ids : survit aux insertions et suppressions des autres lignes. */
export interface CellRef { readonly id: string; readonly row: string; readonly col: string }
/** Plage ou zone en rangs, bornes comprises (r0 ≤ r1, c0 ≤ c1). */
export interface Range { readonly r0: number; readonly c0: number; readonly r1: number; readonly c1: number }
/** Ce que publie le moteur (barre, `#stage[data-table]`) : rangs de l'ancre active et taille du tableau ; C10b (PC7) :
 *  plage en rangs (null sans), cellule active fusionnée, au moins une cellule ombrée dans la plage (sinon l'active). */
export interface TableCellState {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly rows: number;
  readonly cols: number;
  readonly range?: Range | null;
  readonly merged?: boolean;
  /** Zone fusionnée de la cellule active (F16) ; null ou absente hors zone. */
  readonly zone?: Range | null;
  readonly shaded?: boolean;
  /** personnalisation-3 : nombre d'objets logés dans ce tableau (`cell[0]`), `#stage[data-table-linked]`. */
  readonly linked?: number;
}
export interface TableHit { readonly id: string; readonly transform: Matrix; readonly table: TableData; readonly cell: Cell }

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const inRange = (z: Range, c: Cell): boolean => c.row >= z.r0 && c.row <= z.r1 && c.col >= z.c0 && c.col <= z.c1;
/** Nombre de cellules d'une plage en rangs. */
export const rangeSize = (r: Range): number => (r.r1 - r.r0 + 1) * (r.c1 - r.c0 + 1);
const single = (c: Cell): Range => ({ r0: c.row, c0: c.col, r1: c.row, c1: c.col });

/** Rang de la bande qui contient `v` (bord gauche ou haut inclus) ; -1 hors du tableau ou NaN. */
function band(sizes: readonly number[], v: number): number {
  if (!(v >= 0)) return -1;
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i] ?? 0;
    if (v < acc) return i;
  }
  return -1;
}

/** Zones de la vue en rangs (F29) ; une zone dont l'ancre n'est plus lue est sautée, son étendue bornée au tableau. */
export function mergeRanges(t: TableData): Range[] {
  const out: Range[] = [];
  for (const m of t.merges) {
    const r0 = t.rows.findIndex((r) => r.id === m.row);
    const c0 = t.cols.findIndex((c) => c.id === m.col);
    if (r0 < 0 || c0 < 0) continue;
    out.push({ r0, c0, r1: Math.min(t.rows.length - 1, r0 + m.rows - 1), c1: Math.min(t.cols.length - 1, c0 + m.cols - 1) });
  }
  return out;
}

/** Zone qui contient la cellule ; null pour une cellule simple. */
export function mergeAt(t: TableData, c: Cell): Range | null {
  return mergeRanges(t).find((z) => inRange(z, c)) ?? null;
}

/** Ancre de la zone qui contient la cellule ; la cellule elle-même sinon. */
export function anchorOf(t: TableData, c: Cell): Cell {
  const z = mergeAt(t, c);
  return z === null ? c : { row: z.r0, col: z.c0 };
}

/** Cellule couverte par une zone (et qui n'en est pas l'ancre). */
export function isCovered(t: TableData, c: Cell): boolean {
  const z = mergeAt(t, c);
  return z !== null && (z.r0 !== c.row || z.c0 !== c.col);
}

/** Cellule sous un point local : l'ancre d'une cellule couverte (F16) ; hors du tableau ou NaN : null. */
export function cellAt(t: TableData, lx: number, ly: number): Cell | null {
  const col = band(t.cols.map((c) => c.width), lx);
  const row = band(t.rows.map((r) => r.height), ly);
  return col < 0 || row < 0 ? null : anchorOf(t, { row, col });
}

/** Rectangle local d'une plage en rangs. */
export function rangeRect(t: TableData, r: Range): Bounds {
  const widths = t.cols.map((c) => c.width);
  const heights = t.rows.map((x) => x.height);
  return {
    x0: sum(widths.slice(0, r.c0)),
    y0: sum(heights.slice(0, r.r0)),
    x1: sum(widths.slice(0, r.c1 + 1)),
    y1: sum(heights.slice(0, r.r1 + 1)),
  };
}

/** Rectangle local d'une cellule : celui de sa zone si elle en a une. */
export function cellRect(t: TableData, c: Cell): Bounds {
  return rangeRect(t, mergeAt(t, c) ?? single(c));
}

/** Plage de `a` à `b`, élargie jusqu'à contenir entièrement chaque zone qu'elle touche (F14). */
export function expandRange(t: TableData, a: Cell, b: Cell): Range {
  let r: Range = { r0: Math.min(a.row, b.row), c0: Math.min(a.col, b.col), r1: Math.max(a.row, b.row), c1: Math.max(a.col, b.col) };
  const zones = mergeRanges(t);
  for (let changed = true; changed; ) {
    changed = false;
    for (const z of zones) {
      if (z.r1 < r.r0 || z.r0 > r.r1 || z.c1 < r.c0 || z.c0 > r.c1) continue;
      const n = { r0: Math.min(r.r0, z.r0), c0: Math.min(r.c0, z.c0), r1: Math.max(r.r1, z.r1), c1: Math.max(r.c1, z.c1) };
      if (n.r0 !== r.r0 || n.c0 !== r.c0 || n.r1 !== r.r1 || n.c1 !== r.c1) {
        r = n;
        changed = true;
      }
    }
  }
  return r;
}

/** Ancres et cellules simples de la plage, dans l'ordre de lecture. */
export function rangeCells(t: TableData, r: Range): Cell[] {
  const zones = mergeRanges(t);
  const out: Cell[] = [];
  for (let row = r.r0; row <= r.r1; row++) {
    for (let col = r.c0; col <= r.c1; col++) {
      const z = zones.find((x) => inRange(x, { row, col }));
      if (z === undefined || (z.r0 === row && z.c0 === col)) out.push({ row, col });
    }
  }
  return out;
}

/** Rangs d'une cellule par ids (une `CellRef`, ou une cellule de `t.cells`) ; null si sa ligne ou sa colonne n'est plus lue. */
export function cellOf<R extends Pick<CellRef, "row" | "col">>(t: TableData, ref: R): Cell | null {
  const row = t.rows.findIndex((r) => r.id === ref.row);
  const col = t.cols.findIndex((c) => c.id === ref.col);
  return row < 0 || col < 0 ? null : { row, col };
}

export function cellContent(
  t: TableData,
  rowId: string,
  colId: string,
): { readonly text: string; readonly spans: readonly TextSpan[]; readonly fill: string | null; readonly shade: string | null } {
  const c = t.cells.find((x) => x.row === rowId && x.col === colId);
  return { text: c?.text ?? "", spans: c?.spans ?? plainSpans(c?.text ?? ""), fill: c?.fill ?? null, shade: c?.shade ?? null };
}

/** Le tableau le plus haut de `tables` (ordre de la pile) sous (x, y) monde (I2) ; matrice non inversible : sauté. */
export function tableHitIn(tables: readonly TableElement[], x: number, y: number): TableHit | null {
  for (let i = tables.length - 1; i >= 0; i--) {
    const el = tables[i];
    if (el === undefined) continue;
    const inv = invertMatrix(el.transform);
    if (inv === null) continue;
    const [lx, ly] = applyMatrix(inv, x, y);
    const cell = cellAt(el.table, lx, ly);
    if (cell !== null) return { id: el.id, transform: el.transform, table: el.table, cell };
  }
  return null;
}

/** Le tableau le plus haut sous (x, y) monde ; lit les seuls tableaux (`elementIdsOfKind`, D28), dans l'ordre de la pile. */
export function tableAt(doc: Pick<CoreDocument, "elementIdsOfKind" | "element">, page: string, x: number, y: number): TableHit | null {
  const tables = doc.elementIdsOfKind(page, "table").flatMap((id) => {
    const el = doc.element(id);
    return el?.kind === "table" ? [el] : [];
  });
  return tableHitIn(tables, x, y);
}

/** D10 : case du tableau le plus haut sous le premier point qui contient `box` (monde), à `tol` près ; null sinon
 *  (case ombrée, boîte qui déborde). Quatre coins passés par la matrice du tableau : l'englobante reste valable. */
export function cellContaining(doc: Pick<CoreDocument, "elementIdsOfKind" | "element">, page: string, box: Bounds, firstX: number, firstY: number, tol: number): CellLink | null {
  const hit = tableAt(doc, page, firstX, firstY);
  if (hit === null) return null;
  const row = hit.table.rows[hit.cell.row];
  const col = hit.table.cols[hit.cell.col];
  if (row === undefined || col === undefined) return null;
  if ((hit.table.cells.find((c) => c.row === row.id && c.col === col.id)?.shade ?? null) !== null) return null;
  const r = cellRect(hit.table, hit.cell);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]] as const) {
    const [wx, wy] = applyMatrix(hit.transform, x, y);
    xs.push(wx);
    ys.push(wy);
  }
  const inside = box.x0 >= Math.min(...xs) - tol && box.y0 >= Math.min(...ys) - tol && box.x1 <= Math.max(...xs) + tol && box.y1 <= Math.max(...ys) + tol;
  return inside ? [hit.id, row.id, col.id] : null;
}

/** Cellule voisine (T8, PC4, F16, PC14). Tab / Maj+Tab : ancres et cellules simples dans l'ordre de lecture ; Tab en
 *  dernière : "add-row". → : première cellule après la zone dont l'ancre vient après ; ← : la cellule avant l'ancre,
 *  ramenée à son ancre ; ↑ / ↓ : la ligne avant le début / après la fin de la zone, à la colonne de l'ancre ; au bord :
 *  null. */
export function step(t: TableData, c: Cell, move: NavMove): Cell | "add-row" | null {
  const zones = mergeRanges(t);
  const zoneOf = (x: Cell): Range => zones.find((z) => inRange(z, x)) ?? single(x);
  const cols = t.cols.length;
  const count = t.rows.length * cols;
  const nth = (i: number): Cell => ({ row: Math.floor(i / cols), col: i % cols });
  const anchorIndex = (i: number): number => {
    const z = zoneOf(nth(i));
    return z.r0 * cols + z.c0;
  };
  const here = zoneOf(c);
  const at = here.r0 * cols + here.c0;
  const toAnchor = (i: number): Cell => {
    const z = zoneOf(nth(i));
    return { row: z.r0, col: z.c0 };
  };
  if (move === "next" || move === "right") {
    // F16 dit « arrivée sur une cellule couverte → son ancre ». Écart voulu : toute cellule couverte dont l'ancre
    // précède est sautée, car la ramener à son ancre reculerait et bouclerait (3 × 3, zone (0,2)-(1,2) : → depuis (1,1)
    // rendrait (0,2), puis (1,0), (1,1), (0,2)…) ; → depuis (1,1) donne donc (2,0) (test « F16, constat T13 »).
    for (let i = at + 1; i < count; i++) if (anchorIndex(i) > at) return toAnchor(i);
    return move === "next" ? "add-row" : null;
  }
  if (move === "prev") {
    for (let i = at - 1; i >= 0; i--) if (anchorIndex(i) === i) return nth(i);
    return null;
  }
  if (move === "left") return at > 0 ? toAnchor(at - 1) : null;
  if (move === "up") return here.r0 > 0 ? toAnchor((here.r0 - 1) * cols + here.c0) : null;
  return here.r1 + 1 < t.rows.length ? toAnchor((here.r1 + 1) * cols + here.c0) : null;
}

/** Largeur du texte dans une colonne de `colWidth` : moins les deux marges, 1 au moins. */
const innerWidth = (colWidth: number): number => Math.max(1, colWidth - 2 * TABLE_PADDING);

/** Zone intérieure d'une cellule (de sa zone), repère local du tableau : coin après la marge, largeur et hauteur moins les marges. */
export interface CellBox { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export function cellInnerBox(t: TableData, c: Cell): CellBox {
  const r = cellRect(t, c);
  return { x: r.x0 + TABLE_PADDING, y: r.y0 + TABLE_PADDING, w: innerWidth(r.x1 - r.x0), h: Math.max(0, r.y1 - r.y0 - 2 * TABLE_PADDING) };
}

/** Hauteur exigée par les segments `spans` (C7b, R17) dans une colonne de `colWidth` (T5, B1) : lignes du dessin + deux marges. */
export function cellHeight(spans: readonly TextSpan[], size: number, colWidth: number, measure: Measure): number {
  return richBoxHeight(layoutRich(spans, { size }, innerWidth(colWidth), measure)) + 2 * TABLE_PADDING;
}

/** Hauteur exigée de chaque ligne aux largeurs `colWidths` (Uniformiser T11, import F21) ; cellule vide : une ligne de
 *  texte ; zone d'une ligne mesurée à sa largeur réunie ; ancre de plusieurs lignes : sa dernière ligne porte ce qui
 *  manque (F7) ; cellule couverte : ignorée. */
export function rowHeightsFor(t: TableData, colWidths: readonly number[], measure: Measure): number[] {
  const zones = mergeRanges(t);
  const width = (c0: number, c1: number): number => sum(t.cols.slice(c0, c1 + 1).map((c, i) => colWidths[c0 + i] ?? c.width));
  const spans = (r: number, c: number): readonly TextSpan[] => cellContent(t, t.rows[r]?.id ?? "", t.cols[c]?.id ?? "").spans;
  const empty = cellHeight(plainSpans(""), t.size, colWidths[0] ?? t.cols[0]?.width ?? 1, measure);
  const heights = t.rows.map((_, r) => {
    let h = 0;
    t.cols.forEach((col, c) => {
      const z = zones.find((x) => inRange(x, { row: r, col: c }));
      if (z !== undefined && (z.r0 !== r || z.c0 !== c)) return;
      if (z !== undefined && z.r1 > z.r0) return;
      const w = z === undefined ? (colWidths[c] ?? col.width) : width(z.c0, z.c1);
      h = Math.max(h, cellHeight(spans(r, c), t.size, w, measure));
    });
    return h > 0 ? h : empty;
  });
  for (const z of zones.filter((x) => x.r1 > x.r0).sort((a, b) => a.r1 - b.r1)) {
    const need = cellHeight(spans(z.r0, z.c0), t.size, width(z.c0, z.c1), measure);
    const above = sum(heights.slice(z.r0, z.r1));
    heights[z.r1] = Math.max(heights[z.r1] ?? 0, need - above);
  }
  return heights;
}

/** Boîte locale (repère du tableau) d'un objet logé dans la case `row`, `col` (D34). */
export interface LinkedBox { readonly row: string; readonly col: string; readonly w: number; readonly h: number }

/** Taille exigée (D34) : ligne = max(texte, objet le plus haut + 2 × marge, TABLE_ROW_HEIGHT) ; colonne = max(objet le
 *  plus large + 2 × marge, 2 × marge + 24). Objet d'une zone : la dernière ligne et la dernière colonne portent l'écart. */
export function requiredSizes(t: TableData, linked: readonly LinkedBox[], colWidths: readonly number[], measure: Measure): { rows: number[]; cols: number[] } {
  const rows = rowHeightsFor(t, colWidths, measure).map((h) => Math.max(h, TABLE_ROW_HEIGHT));
  const cols = t.cols.map(() => 2 * TABLE_PADDING + 24);
  const width = (c: number): number => colWidths[c] ?? t.cols[c]?.width ?? 0;
  const height = (r: number): number => rows[r] ?? t.rows[r]?.height ?? 0;
  for (const o of linked) {
    const cell = cellOf(t, o);
    if (cell === null) continue;
    const z = mergeAt(t, cell) ?? single(cell);
    let otherW = 0;
    for (let c = z.c0; c < z.c1; c++) otherW += width(c);
    let otherH = 0;
    for (let r = z.r0; r < z.r1; r++) otherH += height(r);
    cols[z.c1] = Math.max(cols[z.c1] ?? 0, o.w + 2 * TABLE_PADDING - otherW);
    rows[z.r1] = Math.max(rows[z.r1] ?? 0, o.h + 2 * TABLE_PADDING - otherH);
  }
  return { rows, cols };
}
