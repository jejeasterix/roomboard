/**
 * Fonds et traits d'un tableau (C10a, T13, B1) : aucun texte ici — le texte des cellules passe par `paintText` de
 * `canvas2d.ts`, seul chemin de dessin du texte. Repère local du tableau (coin en 0, 0), sous sa matrice.
 */
import type { TableData } from "../../core/api";
import { cellInnerBox, cellOf, cellRect, TABLE_LINE_WIDTH } from "../table-geom";

export interface CellTextBox {
  readonly row: string;
  readonly col: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Bords successifs : 0, puis la somme des tailles. */
const edges = (sizes: readonly number[]): number[] =>
  sizes.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + s], [0]);

export function paintTableGrid(ctx: CanvasRenderingContext2D, t: TableData): void {
  for (const cell of t.cells) {
    if (cell.fill === null) continue;
    const at = cellOf(t, cell);
    if (at === null) continue;
    const b = cellRect(t, at);
    // Couleur lisible d'abord : le canvas ignore une couleur qu'il ne sait pas lire (validColor accepte tout nom de 3 à
    // 20 lettres), la valeur d'avant resterait.
    ctx.fillStyle = "transparent";
    ctx.fillStyle = cell.fill;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  }
  const xs = edges(t.cols.map((c) => c.width));
  const ys = edges(t.rows.map((r) => r.height));
  const w = xs[xs.length - 1] ?? 0;
  const h = ys[ys.length - 1] ?? 0;
  ctx.beginPath();
  for (const x of xs) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (const y of ys) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.strokeStyle = t.color;
  ctx.lineWidth = TABLE_LINE_WIDTH;
  ctx.lineCap = "square";
  ctx.stroke();
}

export function cellTextBoxes(t: TableData): CellTextBox[] {
  const out: CellTextBox[] = [];
  for (const cell of t.cells) {
    if (cell.text === "") continue;
    // Ligne ou colonne plus lue : rien à écrire.
    const at = cellOf(t, cell);
    if (at === null) continue;
    out.push({ row: cell.row, col: cell.col, text: cell.text, ...cellInnerBox(t, at) });
  }
  return out;
}
