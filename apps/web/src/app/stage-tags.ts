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

/** C5 (I33) : état des pixels (`PixelState` du cache) et boîte affichée de l'image sélectionnée seule (pixels source). */
export interface StageExtras {
  readonly pixels?: string;
  readonly image?: readonly [number, number] | null;
  /** C6b (B21) : état de la file du pot (`PotState`). */
  readonly pot?: string;
  /** C8 (Q18) : nombre de `fill` de la page, durée du dernier pot de zone (ms, au dixième), cellules de son masque. */
  readonly zones?: string;
  readonly zoneMs?: string;
  readonly zoneCells?: string;
}

/** Attributs de `#stage` lus par les scénarios S3/S4, S1 de C10a (`table`), S1 à S4 de C10b (`tableMerges`, `tableShades`)
 *  C5 (`pixels`, `image`) C6b (`pot`), C8 (`zones`, `zoneMs`, `zoneCells`) et OG12 (`lineEdit`, `bind`, `linePoints`). */
export function stageTags(
  s: EngineState,
  extra: StageExtras = {},
): Record<"page" | "pageMode" | "selection" | "bounds" | "tool" | "table" | "tableLinked" | "tableMerges" | "tableShades" | "units" | "grouped" | "pixels" | "image" | "pot" | "zones" | "zoneMs" | "zoneCells" | "lineEdit" | "bind" | "linePoints", string> {
  return {
    page: `${s.pageIndex + 1}/${s.pageCount}`,
    pageMode: s.pageLayout,
    selection: String(s.selection.length),
    bounds: boundsTag(s.selectionBounds),
    tool: s.tool,
    table: tableTag(s.tableCell),
    tableLinked: s.tableCell?.linked === undefined ? "" : String(s.tableCell.linked),
    tableMerges: String(s.tableMerges),
    tableShades: String(s.tableShades),
    units: String(s.selectionUnits),
    grouped: s.selectionGrouped ? "1" : "0",
    pixels: extra.pixels ?? "",
    pot: extra.pot ?? "",
    zones: extra.zones ?? "",
    zoneMs: extra.zoneMs ?? "",
    zoneCells: extra.zoneCells ?? "",
    image: extra.image ? `${Math.round(extra.image[0])}x${Math.round(extra.image[1])}` : "",
    // OG12 T11 : ligne en « Modifier les points », cible surlignée, nombre de points choisis.
    lineEdit: s.lineEditing ?? "",
    bind: s.bindHint ?? "",
    linePoints: String(s.linePointsSelected ?? 0),
  };
}
