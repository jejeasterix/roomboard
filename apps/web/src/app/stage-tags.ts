/**
 * Attributs de `#stage` lus par les scénarios S3/S4 (contrat du lot 4), déplacés de l'ancienne barre DOM (retirée par
 * T95) sans changement.
 */
import type { Bounds } from "../core/api";
import type { EngineState } from "../engine/engine";

const tenth = (v: number): string => String(Math.round(v * 10) / 10);
const boundsTag = (b: Bounds | null): string => (b === null ? "" : [b.x0, b.y0, b.x1, b.y1].map(tenth).join(","));

/** Attributs de `#stage` lus par le scénario S3/S4 (contrat du lot). */
export function stageTags(s: EngineState): Record<"page" | "selection" | "bounds" | "tool", string> {
  return {
    page: `${s.pageIndex + 1}/${s.pageCount}`,
    selection: String(s.selection.length),
    bounds: boundsTag(s.selectionBounds),
    tool: s.tool,
  };
}
