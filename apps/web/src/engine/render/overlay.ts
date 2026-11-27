/** Calque d'édition (lot 4, CL4-1) : aperçus des outils d'édition, peints sur la scène après les éléments. */
import type { Bounds, LinkDir, Look, Matrix, ShapeKind, StrokeStyle } from "../../core/api";

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
  /** OG12 : points intérieurs en monde (absent : segment du socle). */
  readonly points?: readonly number[];
}

/** OG12 : poignée de point (« point ») ou de milieu de segment (« mid »), en monde. */
export interface PointHandle { readonly x: number; readonly y: number; readonly kind: "point" | "mid"; readonly selected: boolean }
/** OG12 : cible d'accroche éclairée et ses quatre ancres monde. */
export interface BindHint { readonly id: string; readonly anchors: readonly (readonly [number, number])[] }
/** OG12 : poignée « + » de copie liée. */
export interface LinkHandle { readonly dir: LinkDir; readonly x: number; readonly y: number }

export interface EditOverlay {
  readonly ghosts: readonly GhostView[];
  readonly shapes: readonly ShapePreview[];
  /** Cadre de la sélection (monde), ou null. */
  readonly frame: Bounds | null;
  /** Poignées dessinées sur le cadre. */
  readonly handles: boolean;
  /** Rectangle de sélection en cours (monde), ou null. */
  readonly band: Bounds | null;
  /** OG23 (T11) : poignée « Déplacer » au-dessus du cadre (sélection contenant un objet `dragCopy`). */
  readonly move?: boolean;
  readonly points?: readonly PointHandle[];
  readonly bind?: BindHint | null;
  readonly links?: readonly LinkHandle[];
}

export const EMPTY_OVERLAY: EditOverlay = { ghosts: [], shapes: [], frame: null, handles: false, band: null };

export function mergeOverlays(parts: readonly (EditOverlay | undefined)[]): EditOverlay {
  const present = parts.filter((p): p is EditOverlay => p !== undefined);
  if (present.length === 0) return EMPTY_OVERLAY;
  if (present.length === 1) return present[0] ?? EMPTY_OVERLAY;
  const pts = present.flatMap((p) => p.points ?? []);
  const bind = present.find((p) => p.bind)?.bind ?? null;
  const links = present.flatMap((p) => p.links ?? []);
  return {
    ghosts: present.flatMap((p) => p.ghosts),
    shapes: present.flatMap((p) => p.shapes),
    frame: present.find((p) => p.frame !== null)?.frame ?? null,
    handles: present.some((p) => p.handles),
    band: present.find((p) => p.band !== null)?.band ?? null,
    move: present.some((p) => p.move === true),
    ...(pts.length > 0 ? { points: pts } : {}),
    ...(bind ? { bind } : {}),
    ...(links.length > 0 ? { links } : {}),
  };
}

/** Clé de comparaison : le moteur redessine la scène quand elle change (petit objet, une fois par image). */
export const overlayKey = (o: EditOverlay): string => JSON.stringify(o);

export const isEmptyOverlay = (o: EditOverlay): boolean =>
  o.ghosts.length === 0 && o.shapes.length === 0 && o.frame === null && o.band === null &&
  (o.points?.length ?? 0) === 0 && !o.bind && (o.links?.length ?? 0) === 0;
