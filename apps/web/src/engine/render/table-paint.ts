/**
 * Fonds, ombrages et traits d'un tableau (C10a, T13, B1 ; C10b, F11, F13) : aucun texte ici — le texte des cellules
 * passe par `paintText` de `canvas2d.ts`, seul chemin de dessin du texte. Repère local du tableau (coin en 0, 0), sous
 * sa matrice. Une zone fusionnée se dessine à son rectangle réuni, traits intérieurs omis (PC15) ; un ombrage est opaque
 * (fond à sa couleur, hachures à 45°), découpé à la cellule ou à la zone, dessiné quel que soit l'outil, sous les
 * traits ; le texte d'une cellule ombrée ou couverte n'est jamais dessiné (F11).
 */
import type { ImageSource } from "./image-cache";
import type { Bounds, TableCell, TableData, TextSpan } from "../../core/api";
import {
  cellInnerBox,
  cellOf,
  cellRect,
  mergeRanges,
  rangeRect,
  TABLE_HEADER_FILL,
  TABLE_LINE_WIDTH,
  TABLE_SHADE_HATCH,
  TABLE_SHADE_HATCH_STEP,
  TABLE_SHADE_HATCH_WIDTH,
  type Cell,
  type Range,
} from "../table-geom";

export interface CellTextBox {
  readonly row: string;
  readonly col: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly spans: readonly TextSpan[];
}

/** Bords successifs : 0, puis la somme des tailles. */
const edges = (sizes: readonly number[]): number[] =>
  sizes.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + s], [0]);

/** Rangs d'une cellule de la vue, ou null si sa ligne ou sa colonne n'est plus lue, ou si une zone la couvre. */
const visibleCell = (t: TableData, zones: readonly Range[], cell: TableCell): Cell | null => {
  const at = cellOf(t, cell);
  if (at === null) return null;
  const covered = zones.some(
    (z) => at.row >= z.r0 && at.row <= z.r1 && at.col >= z.c0 && at.col <= z.c1 && (z.r0 !== at.row || z.c0 !== at.col),
  );
  return covered ? null : at;
};

/** Couleur lisible d'abord : le canvas ignore une couleur qu'il ne sait pas lire (validColor accepte tout nom de 3 à 20
 *  lettres), la valeur d'avant resterait. */
function fillBox(ctx: CanvasRenderingContext2D, b: Bounds, color: string): void {
  ctx.fillStyle = "transparent";
  ctx.fillStyle = color;
  ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

/** Ombrage (F13) : fond opaque à la couleur de la cellule, hachures à 45° découpées au rectangle. */
function paintShade(ctx: CanvasRenderingContext2D, b: Bounds, color: string): void {
  fillBox(ctx, b, color);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0, b.y0, w, h);
  ctx.clip();
  ctx.beginPath();
  for (let k = -h; k < w; k += TABLE_SHADE_HATCH_STEP) {
    ctx.moveTo(b.x0 + k, b.y1);
    ctx.lineTo(b.x0 + k + h, b.y0);
  }
  ctx.strokeStyle = TABLE_SHADE_HATCH;
  ctx.lineWidth = TABLE_SHADE_HATCH_WIDTH;
  ctx.stroke();
  ctx.restore();
}

/** Image de fond (personnalisation-3, T9) : « couvrir », centrée, découpée au rectangle de la case ; image pas encore
 *  chargée (ou taille nulle) : rien, le cache la redemandera. Taille absente (jeton du PDF vectoriel à l'en-tête
 *  illisible, C1) : l'image remplit la case, plutôt qu'un fond absent. */
function paintCellImage(ctx: CanvasRenderingContext2D, b: Bounds, asset: string, images: ImageSource): void {
  const bmp = images.bitmap(asset) as (CanvasImageSource & { width?: unknown; height?: unknown }) | null;
  if (bmp === null) return;
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const unsized = bmp.width === undefined && bmp.height === undefined;
  const iw = unsized ? w : bmp.width;
  const ih = unsized ? h : bmp.height;
  if (typeof iw !== "number" || typeof ih !== "number" || !(iw > 0) || !(ih > 0)) return;
  const k = Math.max(w / iw, h / ih);
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0, b.y0, w, h);
  ctx.clip();
  ctx.drawImage(bmp, b.x0 + (w - iw * k) / 2, b.y0 + (h - ih * k) / 2, iw * k, ih * k);
  ctx.restore();
}

export function paintTableGrid(ctx: CanvasRenderingContext2D, t: TableData, images: ImageSource | null = null): void {
  const zones = mergeRanges(t);
  // personnalisation-3 (D17) : fond d'en-tête sous les remplissages de case (un remplissage passe au-dessus).
  if (t.header === true && t.rows.length > 0 && t.cols.length > 0) fillBox(ctx, rangeRect(t, { r0: 0, c0: 0, r1: 0, c1: t.cols.length - 1 }), TABLE_HEADER_FILL);
  for (const cell of t.cells) {
    if (cell.fill === null) continue;
    const at = visibleCell(t, zones, cell);
    if (at !== null) fillBox(ctx, cellRect(t, at), cell.fill);
  }
  if (images !== null) {
    for (const cell of t.cells) {
      if (cell.bg === undefined) continue;
      const at = visibleCell(t, zones, cell);
      if (at !== null) paintCellImage(ctx, cellRect(t, at), cell.bg, images);
    }
  }
  for (const cell of t.cells) {
    if (cell.shade === null) continue;
    const at = visibleCell(t, zones, cell);
    if (at !== null) paintShade(ctx, cellRect(t, at), cell.shade);
  }
  const xs = edges(t.cols.map((c) => c.width));
  const ys = edges(t.rows.map((r) => r.height));
  const w = xs[xs.length - 1] ?? 0;
  const h = ys[ys.length - 1] ?? 0;
  ctx.beginPath();
  if (zones.length === 0) {
    for (const x of xs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (const y of ys) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
  } else {
    // Segments par cellule ; le bord commun de deux cellules d'une même zone est omis.
    const same = (r: number, c: number, r2: number, c2: number): boolean =>
      zones.some((z) => r >= z.r0 && r <= z.r1 && c >= z.c0 && c <= z.c1 && r2 >= z.r0 && r2 <= z.r1 && c2 >= z.c0 && c2 <= z.c1);
    for (let i = 0; i < xs.length; i++) {
      for (let r = 0; r < t.rows.length; r++) {
        if (i > 0 && i < t.cols.length && same(r, i - 1, r, i)) continue;
        ctx.moveTo(xs[i] ?? 0, ys[r] ?? 0);
        ctx.lineTo(xs[i] ?? 0, ys[r + 1] ?? 0);
      }
    }
    for (let j = 0; j < ys.length; j++) {
      for (let c = 0; c < t.cols.length; c++) {
        if (j > 0 && j < t.rows.length && same(j - 1, c, j, c)) continue;
        ctx.moveTo(xs[c] ?? 0, ys[j] ?? 0);
        ctx.lineTo(xs[c + 1] ?? 0, ys[j] ?? 0);
      }
    }
  }
  ctx.strokeStyle = t.color;
  ctx.lineWidth = TABLE_LINE_WIDTH;
  ctx.lineCap = "square";
  ctx.stroke();
}

/** Boîtes de texte : cellules au texte non vide, ni couvertes ni ombrées (F11), au rectangle intérieur de leur zone. */
export function cellTextBoxes(t: TableData): CellTextBox[] {
  const out: CellTextBox[] = [];
  const zones = mergeRanges(t);
  for (const cell of t.cells) {
    if (cell.text === "" || cell.shade !== null) continue;
    const at = visibleCell(t, zones, cell);
    if (at === null) continue;
    out.push({ row: cell.row, col: cell.col, text: cell.text, ...cellInnerBox(t, at), spans: t.header === true && at.row === 0 ? cell.spans.map((s) => ({ text: s.text, attrs: { ...s.attrs, bold: true as const } })) : cell.spans });
  }
  return out;
}
