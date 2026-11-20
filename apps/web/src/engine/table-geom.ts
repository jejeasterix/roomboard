/**
 * Géométrie des cellules côté page (C10a, DAC6) : fonctions pures, sans liaison neuve. Le cœur ne connaît que la boîte
 * entière du tableau ; la page trouve le tableau le plus haut sous un point (même recouvert d'encre, I2), la cellule
 * sous un point local, son rectangle, la suivante (T8), et mesure la hauteur qu'exige un texte (DAC2) avec la mise en
 * lignes du dessin (`layoutRich`, B1). Tailles par défaut en unités de page (T4) ; la largeur de page se lit sur la
 * page, jamais ici.
 */
import type { Bounds, CoreDocument, Matrix, TableData, TextSpan } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { applyMatrix, invertMatrix } from "../core/shapes";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

export const TABLE_COL_WIDTH = 240;
export const TABLE_ROW_HEIGHT = 64;
/** Marge intérieure d'une cellule : 36 × 1,25 + 2 × 8 = 61 ≤ 64. */
export const TABLE_PADDING = 8;
export const TABLE_LINE_WIDTH = 2;

export type NavMove = "next" | "prev" | "left" | "right" | "up" | "down";
export type TableAction = "row-insert" | "col-insert" | "row-remove" | "col-remove" | "uniform";
/** Cellule par rangs (0 = première ligne, première colonne). */
export interface Cell { readonly row: number; readonly col: number }
/** Cellule active par ids : survit aux insertions et suppressions des autres lignes. */
export interface CellRef { readonly id: string; readonly row: string; readonly col: string }
/** Ce que publie le moteur (barre, `#stage[data-table]`) : rangs et taille du tableau. */
export interface TableCellState { readonly id: string; readonly row: number; readonly col: number; readonly rows: number; readonly cols: number }
export interface TableHit { readonly id: string; readonly transform: Matrix; readonly table: TableData; readonly cell: Cell }

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

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

export function cellAt(t: TableData, lx: number, ly: number): Cell | null {
  const col = band(t.cols.map((c) => c.width), lx);
  const row = band(t.rows.map((r) => r.height), ly);
  return col < 0 || row < 0 ? null : { row, col };
}

export function cellRect(t: TableData, c: Cell): Bounds {
  const x0 = sum(t.cols.slice(0, c.col).map((x) => x.width));
  const y0 = sum(t.rows.slice(0, c.row).map((x) => x.height));
  return { x0, y0, x1: x0 + (t.cols[c.col]?.width ?? 0), y1: y0 + (t.rows[c.row]?.height ?? 0) };
}

/** Rangs d'une cellule par ids (une `CellRef`, ou une cellule de `t.cells`) ; null si sa ligne ou sa colonne n'est plus lue. */
export function cellOf<R extends Pick<CellRef, "row" | "col">>(t: TableData, ref: R): Cell | null {
  const row = t.rows.findIndex((r) => r.id === ref.row);
  const col = t.cols.findIndex((c) => c.id === ref.col);
  return row < 0 || col < 0 ? null : { row, col };
}

export function cellContent(t: TableData, rowId: string, colId: string): { readonly text: string; readonly spans: readonly TextSpan[]; readonly fill: string | null } {
  const c = t.cells.find((x) => x.row === rowId && x.col === colId);
  return { text: c?.text ?? "", spans: c?.spans ?? plainSpans(c?.text ?? ""), fill: c?.fill ?? null };
}

/** Le tableau le plus haut sous (x, y) monde, du dessus vers le dessous (I2) ; matrice non inversible : sauté. */
export function tableAt(doc: Pick<CoreDocument, "elementIds" | "element">, page: string, x: number, y: number): TableHit | null {
  const ids = doc.elementIds(page);
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    if (id === undefined) continue;
    const el = doc.element(id);
    if (el?.kind !== "table") continue;
    const inv = invertMatrix(el.transform);
    if (inv === null) continue;
    const [lx, ly] = applyMatrix(inv, x, y);
    const cell = cellAt(el.table, lx, ly);
    if (cell !== null) return { id, transform: el.transform, table: el.table, cell };
  }
  return null;
}

/** Cellule voisine (T8, PC4) : Tab et ←/→ dans l'ordre de lecture ; ↑/↓ dans la colonne ; Tab en dernière cellule :
 *  "add-row" ; au bord, null. */
export function step(t: TableData, c: Cell, move: NavMove): Cell | "add-row" | null {
  const cols = t.cols.length;
  const count = t.rows.length * cols;
  const flat = c.row * cols + c.col;
  const nth = (i: number): Cell => ({ row: Math.floor(i / cols), col: i % cols });
  if (move === "next") return flat + 1 < count ? nth(flat + 1) : "add-row";
  if (move === "right") return flat + 1 < count ? nth(flat + 1) : null;
  if (move === "prev" || move === "left") return flat > 0 ? nth(flat - 1) : null;
  if (move === "up") return c.row > 0 ? { row: c.row - 1, col: c.col } : null;
  return c.row + 1 < t.rows.length ? { row: c.row + 1, col: c.col } : null;
}

/** Largeur du texte dans une colonne de `colWidth` : moins les deux marges, 1 au moins. */
const innerWidth = (colWidth: number): number => Math.max(1, colWidth - 2 * TABLE_PADDING);

/** Zone intérieure d'une cellule, repère local du tableau : coin après la marge, largeur et hauteur moins les marges. */
export interface CellBox { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export function cellInnerBox(t: TableData, c: Cell): CellBox {
  const r = cellRect(t, c);
  return { x: r.x0 + TABLE_PADDING, y: r.y0 + TABLE_PADDING, w: innerWidth(r.x1 - r.x0), h: Math.max(0, r.y1 - r.y0 - 2 * TABLE_PADDING) };
}

/** Hauteur exigée par les segments `spans` (C7b, R17) dans une colonne de `colWidth` (T5, B1) : lignes du dessin + deux marges. */
export function cellHeight(spans: readonly TextSpan[], size: number, colWidth: number, measure: Measure): number {
  return richBoxHeight(layoutRich(spans, { size }, innerWidth(colWidth), measure)) + 2 * TABLE_PADDING;
}

/** Hauteur exigée de chaque ligne aux largeurs `colWidths` (Uniformiser, T11) ; cellule vide : une ligne de texte. */
export function rowHeightsFor(t: TableData, colWidths: readonly number[], measure: Measure): number[] {
  return t.rows.map((r) =>
    Math.max(...t.cols.map((c, i) => cellHeight(cellContent(t, r.id, c.id).spans, t.size, colWidths[i] ?? c.width, measure))),
  );
}
