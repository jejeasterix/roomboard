/** Calque d'édition (lot 4, CL4-1) : aperçus des outils d'édition, peints sur la scène après les éléments. */
import type { Bounds, Look, Matrix, ShapeKind, StrokeStyle } from "../../core/api";

/** Élément masqué de la scène et redessiné avec une matrice provisoire posée avant la sienne (D38). */
export interface GhostView {
  readonly id: string;
  readonly matrix: Matrix;
}

/** Forme en cours, par ses deux coins monde (normalisée au rendu comme par le cœur). */
export interface ShapePreview {
  readonly shape: ShapeKind;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly style: StrokeStyle;
  readonly fill: string | null;
  /** OG11 : aspect de la forme en cours (absent = neutre) et graine du geste (même tracé roughjs une fois posée). */
  readonly look?: Look;
  readonly seed?: number;
}

export interface EditOverlay {
  readonly ghosts: readonly GhostView[];
  readonly shapes: readonly ShapePreview[];
  /** Cadre de la sélection (monde), ou null. */
  readonly frame: Bounds | null;
  /** Poignées dessinées sur le cadre. */
  readonly handles: boolean;
  /** Rectangle de sélection en cours (monde), ou null. */
  readonly band: Bounds | null;
}

export const EMPTY_OVERLAY: EditOverlay = { ghosts: [], shapes: [], frame: null, handles: false, band: null };

export function mergeOverlays(parts: readonly (EditOverlay | undefined)[]): EditOverlay {
  const present = parts.filter((p): p is EditOverlay => p !== undefined);
  if (present.length === 0) return EMPTY_OVERLAY;
  if (present.length === 1) return present[0] ?? EMPTY_OVERLAY;
  return {
    ghosts: present.flatMap((p) => p.ghosts),
    shapes: present.flatMap((p) => p.shapes),
    frame: present.find((p) => p.frame !== null)?.frame ?? null,
    handles: present.some((p) => p.handles),
    band: present.find((p) => p.band !== null)?.band ?? null,
  };
}

/** Clé de comparaison : le moteur redessine la scène quand elle change (petit objet, une fois par image). */
export const overlayKey = (o: EditOverlay): string => JSON.stringify(o);

export const isEmptyOverlay = (o: EditOverlay): boolean =>
  o.ghosts.length === 0 && o.shapes.length === 0 && o.frame === null && o.band === null;
