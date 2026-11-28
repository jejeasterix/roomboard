/** Calque d'édition (lot 4, CL4-1) : aperçus des outils d'édition, peints sur la scène après les éléments. */
import type { Bounds, LinkDir, Look, Matrix, ShapeKind, StrokeStyle } from "../../core/api";
import { worldToScreen, type Camera } from "../camera";
import { HANDLE_GRAB_PX, MOVE_REACH_MOUSE_PX, MOVE_REACH_TOUCH_PX, handlesOf, moveHandlePoint } from "../tools/handles";
import { LINK_REACH_PX, POINT_REACH_PX, POINT_REACH_TOUCH_PX } from "../tools/line-points";
import { LINK_MOUSE_PX, LINK_TOUCH_PX, copyBadgeBox, linkBadgeBox } from "./link-badge";

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

/** personnalisation-3 (D13, D18) : poignée de l'outil Tableau, point monde ; 44 px de cible, disque de 16 px dessiné. */
export interface OverlayGrip { readonly x: number; readonly y: number; readonly kind: "col" | "row" }
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
  /** personnalisation-3 : cadre de la case visée (monde), ou null. */
  readonly target?: Bounds | null;
  /** personnalisation-3 (D13) : poignées de taille de la case active. */
  readonly grips?: readonly OverlayGrip[];
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
    target: present.find((p) => (p.target ?? null) !== null)?.target ?? null,
    grips: present.flatMap((p) => p.grips ?? []),
    ...(pts.length > 0 ? { points: pts } : {}),
    ...(bind ? { bind } : {}),
    ...(links.length > 0 ? { links } : {}),
  };
}

/** Clé de comparaison : le moteur redessine la scène quand elle change (petit objet, une fois par image). */
export const overlayKey = (o: EditOverlay): string => JSON.stringify(o);

export const isEmptyOverlay = (o: EditOverlay): boolean =>
  o.ghosts.length === 0 && o.shapes.length === 0 && o.frame === null && o.band === null && (o.target ?? null) === null && (o.grips ?? []).length === 0 &&
  (o.points?.length ?? 0) === 0 && !o.bind && (o.links?.length ?? 0) === 0;

/** OG41 (DA2) : rectangle écran, px CSS de la scène. Même forme que `Rect` (ui/island-place.ts). */
export interface ScreenRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
/** Badges d'un élément sélectionné (lien T18, « copie » OG23), lus sur son aspect par le moteur. */
export interface ElementBadges { readonly bounds: Bounds; readonly link: boolean; readonly copy: boolean }

/** OG41 (DA2) : ce qui entoure la sélection, cibles comprises, en px de la scène : huit poignées de taille (prise
 *  `HANDLE_GRAB_PX`), « Déplacer » (22 px au doigt, 12 à la souris), « + » (`LINK_REACH_PX`), points d'une ligne ou d'une
 *  flèche seule (calque sans cadre, `select.ts:375-380` : `POINT_REACH_TOUCH_PX` au doigt, `POINT_REACH_PX` à la
 *  souris), badges de lien et de copie (44 px au doigt, 24 à la souris). Une seule source pour la barre d'objet : une
 *  poignée ajoutée au calque (rotation d'OG33) n'est évitée que si elle entre ici. Calque vide : rien. */
export function overlayKeepOut(o: EditOverlay, camera: Camera, touch: boolean, badges: readonly ElementBadges[] = []): readonly ScreenRect[] {
  const out: ScreenRect[] = [];
  const square = (x: number, y: number, half: number): void => void out.push({ x: x - half, y: y - half, w: 2 * half, h: 2 * half });
  const world = (x: number, y: number, half: number): void => {
    const [sx, sy] = worldToScreen(camera, x, y);
    square(sx, sy, half);
  };
  for (const p of o.points ?? []) world(p.x, p.y, touch ? POINT_REACH_TOUCH_PX : POINT_REACH_PX);
  if (o.frame !== null && o.handles) {
    for (const h of handlesOf(o.frame)) world(h.x, h.y, HANDLE_GRAB_PX);
    if (o.move === true) {
      // Le rond dessiné (24 px, `paintMoveHandle`, link-badge.ts:142) tient dans la prise, 12 px de demi-côté au moins.
      const [mx, my] = moveHandlePoint(o.frame, camera.zoom);
      world(mx, my, touch ? MOVE_REACH_TOUCH_PX : MOVE_REACH_MOUSE_PX);
    }
  }
  for (const k of o.links ?? []) world(k.x, k.y, LINK_REACH_PX);
  const reach = (touch ? LINK_TOUCH_PX : LINK_MOUSE_PX) / 2;
  for (const b of badges) {
    const boxes = [...(b.link ? [linkBadgeBox(b.bounds, camera)] : []), ...(b.copy ? [copyBadgeBox(b.bounds, camera)] : [])];
    for (const x of boxes) square(x.x + x.size / 2, x.y + x.size / 2, Math.max(x.size / 2, reach));
  }
  return out;
}
