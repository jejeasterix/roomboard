/** OG33 (lot 2b, choix 10) : objet relié dans une direction, au modèle de `FlowChartNavigator` d'Excalidraw
 *  (packages/excalidraw/components/App.flowchart.ts, MIT) réduit au plus proche : flèches ou lignes liées par un bout à
 *  `id`, autre bout lié à un objet de la page dont le centre est dans `dir` (axe dominant). */
import type { CoreDocument, LinkDir } from "../core/api";

export function linkedNodeIn(doc: CoreDocument, page: string, id: string, dir: LinkDir): string | null {
  const center = (k: string): [number, number] | null => {
    const b = doc.bounds([k]);
    return b === null ? null : [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  };
  const c0 = center(id);
  if (c0 === null) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const k of doc.elementIds(page)) {
    const v = doc.element(k);
    if (v?.kind !== "shape") continue;
    const [a, b] = [v.shape.start?.id, v.shape.end?.id];
    const other = a === id ? b : b === id ? a : undefined;
    if (other === undefined || other === id) continue;
    const c = center(other);
    if (c === null) continue;
    const [dx, dy] = [c[0] - c0[0], c[1] - c0[1]];
    const ok = dir === "right" ? dx > Math.abs(dy) : dir === "left" ? -dx > Math.abs(dy) : dir === "down" ? dy > Math.abs(dx) : -dy > Math.abs(dx);
    const d = Math.hypot(dx, dy);
    if (ok && d < bestD) [best, bestD] = [other, d];
  }
  return best;
}
