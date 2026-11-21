/**
 * Pot dans une zone fermée (C8, Q18) : durée du clic à l'écriture d'une commande `Fill` de cible `zone` (mesure
 * `performance.measure("pot-zone")`), cellules du masque (`zoneCells`) et nombre d'éléments `fill` de la page montrée ;
 * lus par l'essai C8 dans `#stage[data-zones]`, `data-zone-ms`, `data-zone-cells` (patron B21, `stage-tags.ts`).
 */
import type { Change, Command } from "../core/api";

/** Ce que les marques lisent du document (structurel : `CoreDocument` convient). */
export interface ZoneDoc {
  elementIds(page: string): readonly string[];
  element(id: string): { readonly kind: string } | null;
  zoneCells(page: string, tol: number): number;
}
export interface ZoneTags { readonly zones: string; readonly zoneMs: string; readonly zoneCells: string }
export interface ZoneMarks {
  /** `run` mesuré quand la commande est un `Fill` de cible `zone` ; toute autre commande passe telle quelle. */
  timed(run: (c: Command) => Change | null): (c: Command) => Change | null;
  /** Marques de la page montrée ; le compte des `fill` n'est relu que si la page ou la version change, et jamais pendant
   * une commande mesurée : l'état du moteur, émis dans `run`, rappelle `tags`, et le recompte lit chaque élément par le
   * pont ; `onMarked` le relance juste après la mesure. */
  tags(page: string, version: number): ZoneTags;
}

interface ZoneTarget { readonly kind: string; readonly tol?: unknown }
const zoneOf = (c: Command): { readonly page: string; readonly tol: number } | null => {
  if (c.type !== "Fill") return null;
  const t = c.target as ZoneTarget;
  return t.kind === "zone" && typeof t.tol === "number" ? { page: c.page, tol: t.tol } : null;
};

export function createZoneMarks(
  doc: ZoneDoc,
  now: () => number = () => performance.now(),
  measure: (start: number, end: number) => void = (start, end) => {
    performance.measure("pot-zone", { start, end });
  },
  /** Appelé une fois les marques écrites (après une commande `Fill` de zone seulement) : la session relit alors `tags`. */
  onMarked: () => void = () => undefined,
): ZoneMarks {
  let zoneMs = "";
  let zoneCells = "";
  let counted: { readonly page: string; readonly version: number; readonly zones: string } | null = null;
  let running = false;
  return {
    timed: (run) => (c) => {
      const z = zoneOf(c);
      if (z === null) return run(c);
      const start = now();
      running = true;
      let change: Change | null;
      try {
        change = run(c);
      } finally {
        running = false;
      }
      const end = now();
      measure(start, end);
      zoneMs = (Math.round((end - start) * 10) / 10).toFixed(1);
      zoneCells = String(doc.zoneCells(z.page, z.tol));
      onMarked();
      return change;
    },
    tags: (page, version) => {
      if (counted === null || (!running && (counted.page !== page || counted.version !== version))) {
        const zones = doc.elementIds(page).filter((id) => doc.element(id)?.kind === "fill").length;
        counted = { page, version, zones: String(zones) };
      }
      return { zones: counted.zones, zoneMs, zoneCells };
    },
  };
}
