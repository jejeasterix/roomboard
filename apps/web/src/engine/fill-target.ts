/**
 * Cible du pot (C6a, U28, DA3) : de l'élément le plus haut sous le point (`hitTest` tel quel, 6 px écran, D3) à la
 * commande ; null = aucune étape. Forme : bord (`edgeHit` du cœur, D5, DA2) → contour, sinon intérieur ; ligne, flèche,
 * trait : contour ; texte : mot sous le pointeur (UAX 29), sinon texte entier (D6, D7) ; tableau : mot de la cellule
 * par `SetTableCell` (D8), sinon remplissage de la cellule (D9) ; image, élément inconnu ou rien : fond de la page (D1,
 * D10). Un point de la bande de tolérance hors de la boîte d'un texte ou d'un tableau y est ramené (D7, PC10). Le pot
 * vise l'élément touché, jamais son groupe (D4).
 */
import type { Command, CoreDocument, TableElement, TextElement } from "../core/api";
import { formatSpans } from "../core/rich-text";
import { applyMatrix, invertMatrix, isSegment } from "../core/shapes";
import { cellAt, cellContent, cellInnerBox } from "./table-geom";
import { offsetAt, wordAt, type Measure } from "./text-layout";

/** Tolérance de toucher, en px d'écran (celle de l'outil Texte, D3). */
export const FILL_HIT_TOL_PX = 6;
export type FillDoc = Pick<CoreDocument, "hitTest" | "element" | "edgeHit">;

const clamp = (v: number, max: number): number => Math.min(Math.max(v, 0), max);
/** Dans [0, max) : `cellAt` exclut le bord droit et le bas. */
const within = (v: number, max: number): number => clamp(v, Math.max(0, max - 1e-6));
const sum = (vs: readonly number[]): number => vs.reduce((a, b) => a + b, 0);

const background = (page: string, color: string | null): Command => ({ type: "Fill", page, target: { kind: "background" }, color });

/** Mot sous le point, mis en lignes comme le dessin (`canvas2d.ts`, `linesOf`) ; hors mot : texte entier. */
function textCommand(el: TextElement, x: number, y: number, color: string | null, measure: Measure): Command {
  const t = el.text;
  const whole: Command = { type: "FormatText", id: el.id, start: 0, len: t.content.length, attrs: { color } };
  const inv = invertMatrix(el.transform);
  if (inv === null) return whole;
  const [lx, ly] = applyMatrix(inv, x, y);
  const at = offsetAt(t.spans, { size: t.size }, t.boxWidth, measure, within(lx, t.boxWidth), within(ly, t.boxHeight));
  const word = at === null ? null : wordAt(t.content, at);
  return word === null ? whole : { type: "FormatText", id: el.id, start: word[0], len: word[1] - word[0], attrs: { color } };
}

/** Mot d'une cellule par `SetTableCell.spans` (jamais `FormatText`, qui ne vise qu'un texte), mis en lignes comme le
 *  dessin des cellules (`cellTextBoxes` : boîte intérieure de la zone, taille du tableau) ; sinon remplissage (D8, D9). */
function tableCommand(page: string, el: TableElement, x: number, y: number, color: string | null, measure: Measure): Command {
  const t = el.table;
  const inv = invertMatrix(el.transform);
  if (inv === null) return background(page, color);
  const [lx, ly] = applyMatrix(inv, x, y);
  const cx = within(lx, sum(t.cols.map((c) => c.width)));
  const cy = within(ly, sum(t.rows.map((r) => r.height)));
  const cell = cellAt(t, cx, cy);
  const row = cell === null ? undefined : t.rows[cell.row]?.id;
  const col = cell === null ? undefined : t.cols[cell.col]?.id;
  if (cell === null || row === undefined || col === undefined) return background(page, color);
  const fill: Command = { type: "SetTableFill", id: el.id, row, col, fill: color };
  const content = cellContent(t, row, col);
  if (content.text === "" || content.shade !== null) return fill;
  const box = cellInnerBox(t, cell);
  const at = offsetAt(content.spans, { size: t.size }, box.w, measure, cx - box.x, cy - box.y);
  const word = at === null ? null : wordAt(content.text, at);
  if (word === null) return fill;
  return { type: "SetTableCell", id: el.id, row, col, content: content.text, spans: formatSpans(content.spans, word[0], word[1] - word[0], { color }) };
}

/** Commande du pot au point (x, y) monde de `page`, caméra au `zoom` ; null : aucune étape (« Aucune » sur un contour
 *  ou un trait, D11). */
export function fillCommand(doc: FillDoc, page: string, x: number, y: number, zoom: number, color: string | null, measure: Measure): Command | null {
  const tol = FILL_HIT_TOL_PX / zoom;
  const id = doc.hitTest(page, x, y, tol);
  const el = id === null ? null : doc.element(id);
  if (!el) return background(page, color);
  const edge = (): Command | null => (color === null ? null : { type: "Fill", page, target: { kind: "edge", id: el.id }, color });
  if (el.kind === "stroke") return edge();
  if (el.kind === "shape") {
    if (isSegment(el.shape.shape) || doc.edgeHit(el.id, x, y, tol)) return edge();
    return { type: "Fill", page, target: { kind: "inside", id: el.id }, color };
  }
  if (el.kind === "text") return textCommand(el, x, y, color, measure);
  if (el.kind === "table") return tableCommand(page, el, x, y, color, measure);
  return background(page, color);
}
