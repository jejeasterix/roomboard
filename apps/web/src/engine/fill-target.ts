/**
 * Cible du pot (C6a, U28, DA3) : de l'élément le plus haut sous le point (`hitTest` tel quel, 6 px écran, D3) à la
 * commande ; null = aucune étape. Forme : bord (`edgeHit` du cœur, D5, DA2) → contour, sinon intérieur ; ligne, flèche,
 * trait : contour ; texte : mot sous le pointeur (UAX 29), sinon texte entier (D6, D7) ; tableau : mot de la cellule
 * par `SetTableCell` (D8), sinon remplissage de la cellule (D9) ; image : zone de pixels sous le point (C6b, B19 ; action `ImageFill`, écrite plus tard par la file du pot de
 * l'application) ; élément inconnu : fond de la page (D1, D10) ; rien : zone fermée (C8, `Fill zone`, décidée par le cœur, sinon le fond) ; `fill` : recoloré, ou supprimé par « Aucune » (Q14). Un point de la bande de tolérance hors de la boîte d'un texte ou d'un tableau y est ramené (D7, PC10). Le pot
 * vise l'élément touché, jamais son groupe (D4).
 */
import type { Command, CoreDocument, TableElement, TextElement } from "../core/api";
import { sourcePixelAt } from "../core/image-params";
import { formatSpans } from "../core/rich-text";
import { applyMatrix, invertMatrix, isSegment } from "../core/shapes";
import { cellAt, cellContent, cellInnerBox, cellLook, cellTextFrame, shownSpans } from "./table-geom";
import { layoutRich, offsetAt, richBoxHeight, wordAt, type Measure } from "./text-layout";

/** Tolérance de toucher, en px d'écran (celle de l'outil Texte, D3). */
export const FILL_HIT_TOL_PX = 6;
/** Tolérance de fermeture d'une zone, en px d'écran (C8, U28 : « tolérance de fermeture 2 px », Q7). */
export const ZONE_CLOSE_TOL_PX = 2;
export type FillDoc = Pick<CoreDocument, "hitTest" | "element" | "edgeHit">;

/** C6b (B5, B19) : remplissage d'une zone d'image demandé au point ; calculé et écrit par la file du pot
 *  (`app/image-fill.ts`), jamais par le moteur. */
export interface ImageFillAt {
  readonly type: "ImageFill";
  readonly page: string;
  readonly id: string;
  /** Pixel source sous le clic (`sourcePixelAt`, point de la bande de tolérance ramené dans la boîte). */
  readonly seed: readonly [number, number];
  readonly color: string | null;
}
/** Remplissage d'image avec la tolérance lue au relâché (B10). */
export type ImageFillRequest = ImageFillAt & { readonly tolerance: number };
/** Ce que l'outil Pot confie à la file (B13) : une commande vectorielle, ou un remplissage d'image. */
export type FillRequest = { readonly command: Command } | ImageFillRequest;

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
 *  dessin des cellules (`cellTextBoxes` : boîte intérieure de la zone, taille du tableau ; cadre aligné `cellTextFrame`,
 *  D15) ; sinon remplissage (D8, D9). */
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
  if (content.text === "" || (content.shade !== null && !cellLook(t, row, col).open)) return fill;
  // D15 : même cadre aligné que le dessin (`paintCellTexts`) ; `offsetAt` décale la ligne par `lineShift`. Mise en lignes
  // sur les segments affichés (gras d'en-tête, `shownSpans`) ; la commande garde ceux du contenu.
  const box = cellInnerBox(t, cell);
  const shown = shownSpans(t, cell);
  const frame = cellTextFrame(t, cell, richBoxHeight(layoutRich(shown, { size: t.size }, box.w, measure)));
  const at = offsetAt(shown, { size: t.size }, frame.w, measure, cx - frame.x, cy - frame.y, frame.ha);
  const word = at === null ? null : wordAt(content.text, at);
  if (word === null) return fill;
  return { type: "SetTableCell", id: el.id, row, col, content: content.text, spans: formatSpans(content.spans, word[0], word[1] - word[0], { color }) };
}

/** Commande du pot au point (x, y) monde de `page`, caméra au `zoom` ; null : aucune étape (« Aucune » sur un contour
 *  ou un trait, D11). */
export function fillCommand(doc: FillDoc, page: string, x: number, y: number, zoom: number, color: string | null, measure: Measure): Command | ImageFillAt | null {
  const tol = FILL_HIT_TOL_PX / zoom;
  const id = doc.hitTest(page, x, y, tol);
  const el = id === null ? null : doc.element(id);
  if (!el) return { type: "Fill", page, target: { kind: "zone", x, y, tol: ZONE_CLOSE_TOL_PX / zoom }, color };
  if (el.kind === "fill") return color === null ? { type: "Delete", ids: [el.id] } : { type: "Fill", page, target: { kind: "inside", id: el.id }, color };
  const edge = (): Command | null => (color === null ? null : { type: "Fill", page, target: { kind: "edge", id: el.id }, color });
  if (el.kind === "stroke") return edge();
  if (el.kind === "shape") {
    if (isSegment(el.shape.shape) || doc.edgeHit(el.id, x, y, tol)) return edge();
    return { type: "Fill", page, target: { kind: "inside", id: el.id }, color };
  }
  if (el.kind === "text") return textCommand(el, x, y, color, measure);
  if (el.kind === "table") return tableCommand(page, el, x, y, color, measure);
  if (el.kind === "image") {
    const seed = sourcePixelAt(el.transform, el.image, x, y, true);
    return seed === null ? background(page, color) : { type: "ImageFill", page, id: el.id, seed, color };
  }
  return background(page, color);
}
