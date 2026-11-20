/**
 * Pose d'une grille dans l'onglet actif (C10b, F21, F22, DAB2) : collage HTML et classeur passent ici, un seul chemin
 * vers le cœur (`ImportTable`, une étape, F17). Colonnes à 240, lignes à la hauteur exigée par leur texte (au moins
 * 64, zones comprises, `rowHeightsFor`), texte de la couleur du stylo et de la taille par défaut ; matrice de
 * `placement` de l'import d'image (réduite, jamais agrandie, à 80 % du visible, centrée au point de dépôt ou au centre
 * de la vue, cascade, R4, R5). Messages : troncature à 64 × 64 (dimensions comptées sur la source), textes coupés.
 * Rien n'est sélectionné après.
 */
import type { TableData } from "../core/api";
import { TABLE_MAX_LINES } from "../core/api";
import { rowHeightsFor, TABLE_COL_WIDTH, TABLE_ROW_HEIGHT } from "../engine/table-geom";
import type { Measure } from "../engine/text-layout";
import type { Point } from "./files";
import type { TableGrid } from "./html-table";
import { anchorOf, placement, visibleOf, type ImageTarget } from "./image-import";

export const TABLE_TAB_CLOSED = "onglet fermé pendant l'import, tableau non inséré";
export const CUT_CELLS_MESSAGE = "texte coupé à 2 000 caractères dans certaines cellules";
export const truncatedMessage = (rows: number, cols: number): string =>
  `tableau limité à ${TABLE_MAX_LINES} lignes et ${TABLE_MAX_LINES} colonnes (le fichier en a ${rows} × ${cols})`;

/** Vue provisoire de la grille pour la mesure (ids `r<i>`, `c<j>`) ; textes vides et couverts écartés. */
export function gridTable(grid: TableGrid, size: number): TableData {
  const cols = Array.from({ length: grid.cols }, (_, j) => ({ id: `c${j}`, width: TABLE_COL_WIDTH }));
  const rows = Array.from({ length: grid.rows }, (_, i) => ({ id: `r${i}`, height: TABLE_ROW_HEIGHT }));
  const covered = new Set<number>();
  for (const m of grid.merges) {
    for (let i = m.row; i < m.row + m.rows; i++) {
      for (let j = m.col; j < m.col + m.cols; j++) if (i !== m.row || j !== m.col) covered.add(i * grid.cols + j);
    }
  }
  const cells = grid.cells.flatMap((text, k) =>
    text === "" || covered.has(k) ? [] : [{ row: `r${Math.floor(k / grid.cols)}`, col: `c${k % grid.cols}`, text, fill: null, shade: null }],
  );
  const merges = grid.merges.map((m) => ({ row: `r${m.row}`, col: `c${m.col}`, rows: m.rows, cols: m.cols }));
  return { color: "#000000", size, cols, rows, cells, merges };
}

/** Hauteurs exigées (F21) : `rowHeightsFor` à 240, au moins 64. */
export function gridRowHeights(grid: TableGrid, size: number, measure: Measure): number[] {
  const t = gridTable(grid, size);
  return rowHeightsFor(t, t.cols.map((c) => c.width), measure).map((h) => Math.max(TABLE_ROW_HEIGHT, h));
}

/** Pose `grid` dans la cible : une `ImportTable` ; `name` : fichier d'origine (classeur), absent pour un collage. */
export async function insertTableGrid(
  target: ImageTarget,
  grid: TableGrid,
  at: Point | null,
  index: number,
  notify: (m: string) => Promise<void>,
  name?: string,
): Promise<"inserted" | "failed"> {
  const prefix = name === undefined ? "" : `${name} : `;
  if (target.alive?.() === false) {
    await notify(`${prefix}${TABLE_TAB_CLOSED}`);
    return "failed";
  }
  const style = target.textStyle();
  const heights = gridRowHeights(grid, style.size, target.measure());
  const w = grid.cols * TABLE_COL_WIDTH;
  const h = heights.reduce((a, b) => a + b, 0);
  const rect = target.stageRect();
  const camera = target.camera();
  const change = target.run({
    type: "ImportTable",
    page: target.page(),
    matrix: placement(w, h, anchorOf(rect, camera, at), visibleOf(rect, camera), index),
    colWidth: TABLE_COL_WIDTH,
    rowHeights: heights,
    cols: grid.cols,
    cells: [...grid.cells],
    merges: grid.merges.map((m) => [m.row, m.col, m.rows, m.cols] as const),
    color: style.color,
    size: style.size,
  });
  if (change === null) return "failed";
  if (grid.sourceRows > grid.rows || grid.sourceCols > grid.cols) await notify(`${prefix}${truncatedMessage(grid.sourceRows, grid.sourceCols)}`);
  if (grid.cutCells) await notify(`${prefix}${CUT_CELLS_MESSAGE}`);
  return "inserted";
}
