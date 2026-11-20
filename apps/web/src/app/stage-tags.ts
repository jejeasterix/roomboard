/**
 * Attributs de `#stage` lus par les scénarios S3/S4 (contrat du lot 4), déplacés de l'ancienne barre DOM (retirée par
 * T95) sans changement ; C10a (`table`) ; C10b (F29) : plage dans `table`, `tableMerges`, `tableShades` ; C3 (PC9) : `units`, `grouped`.
 */
import type { Bounds } from "../core/api";
import type { EngineState } from "../engine/engine";
import type { TableCellState } from "../engine/table-geom";

const tenth = (v: number): string => String(Math.round(v * 10) / 10);
const boundsTag = (b: Bounds | null): string => (b === null ? "" : [b.x0, b.y0, b.x1, b.y1].map(tenth).join(","));

/** `#stage[data-table]` (C10a, T15 ; C10b, F29) : `<colonnes>x<lignes>@<rang>,<colonne>` de la cellule active, ou
 *  `…@<r>,<c>-<r2>,<c2>` d'une plage ; vide sans cellule. */
const tableTag = (c: TableCellState | null): string => {
  if (c === null) return "";
  const r = c.range ?? null;
  return r === null ? `${c.cols}x${c.rows}@${c.row},${c.col}` : `${c.cols}x${c.rows}@${r.r0},${r.c0}-${r.r1},${r.c1}`;
};

/** Attributs de `#stage` lus par les scénarios S3/S4, S1 de C10a (`table`) et S1 à S4 de C10b (`tableMerges`, `tableShades`). */
export function stageTags(s: EngineState): Record<"page" | "selection" | "bounds" | "tool" | "table" | "tableMerges" | "tableShades" | "units" | "grouped", string> {
  return {
    page: `${s.pageIndex + 1}/${s.pageCount}`,
    selection: String(s.selection.length),
    bounds: boundsTag(s.selectionBounds),
    tool: s.tool,
    table: tableTag(s.tableCell),
    tableMerges: String(s.tableMerges),
    tableShades: String(s.tableShades),
    units: String(s.selectionUnits),
    grouped: s.selectionGrouped ? "1" : "0",
  };
}
