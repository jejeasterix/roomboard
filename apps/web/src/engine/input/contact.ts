/**
 * OG25 (cadrage gomme-surface-contact, A3) : seuils et calculs purs de la gomme automatique à la surface de contact.
 * Px CSS de la scène. Sans géométrie (W3C : 1 × 1 ; Windows : 0 × 0), rien ne bascule : la détection échoue du côté sûr.
 * TS pur : ni DOM, ni moteur ; le routeur garde l'état des contacts et appelle ces fonctions.
 */

/** Taille D = max(largeur, hauteur) à partir de laquelle un contact est « large » (déc. 7). */
export const LARGE_CONTACT_PX = 80;
/** Côté maximal de la boîte des centres des doigts serrés, et portée d'un contact qui rejoint le groupe (déc. 9, 12). */
export const CLUSTER_PX = 160;
/** Nombre de contacts posés ensemble pour la règle des doigts serrés (déc. 9). */
export const CLUSTER_COUNT = 3;
/** Fenêtre de détection qui suit la pose d'un contact (déc. 8). */
export const DETECT_MS = 250;
/** Bornes du rayon de la gomme automatique, px d'écran (déc. 18). */
export const AUTO_ERASER_MIN_RADIUS_PX = 24;
export const AUTO_ERASER_MAX_RADIUS_PX = 160;

export interface ContactGeometry {
  readonly width: number;
  readonly height: number;
}

/** Contact centré en (x, y), de largeur et hauteur données ; 0 × 0 sans géométrie. */
export interface ContactBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const side = (v: number | undefined): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** Géométrie de `PointerEvent.width` / `height` ; null quand les deux sont ≤ 1, non finies ou absentes (déc. 3). Un côté
 *  invalide vaut 0. */
export function contactGeometry(width?: number, height?: number): ContactGeometry | null {
  const w = side(width);
  const h = side(height);
  return w <= 1 && h <= 1 ? null : { width: w, height: h };
}

/** Contact large : D = max(largeur, hauteur) ≥ LARGE_CONTACT_PX (déc. 6, 7). */
export function isLargeContact(g: ContactGeometry | null): boolean {
  return g !== null && Math.max(g.width, g.height) >= LARGE_CONTACT_PX;
}

const hasGeometry = (b: ContactBox): boolean => b.width > 1 || b.height > 1;

/** CLUSTER_COUNT contacts ou plus dont les centres tiennent dans une boîte de CLUSTER_PX de côté, au moins un avec
 *  géométrie (déc. 9, 11). */
export function isTightCluster(boxes: readonly ContactBox[]): boolean {
  if (boxes.length < CLUSTER_COUNT || !boxes.some(hasGeometry)) return false;
  const xs = boxes.map((b) => b.x);
  const ys = boxes.map((b) => b.y);
  return Math.max(...xs) - Math.min(...xs) <= CLUSTER_PX && Math.max(...ys) - Math.min(...ys) <= CLUSTER_PX;
}

interface Bounds {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function boundsOf(boxes: readonly ContactBox[]): Bounds {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x - b.width / 2);
    x1 = Math.max(x1, b.x + b.width / 2);
    y0 = Math.min(y0, b.y - b.height / 2);
    y1 = Math.max(y1, b.y + b.height / 2);
  }
  return { x0, y0, x1, y1 };
}

/** Un contact dont le centre est à CLUSTER_PX au plus de la boîte englobante du groupe le rejoint (déc. 12). */
export function joinsCluster(group: readonly ContactBox[], b: ContactBox): boolean {
  if (group.length === 0) return false;
  const r = boundsOf(group);
  const dx = Math.max(r.x0 - b.x, 0, b.x - r.x1);
  const dy = Math.max(r.y0 - b.y, 0, b.y - r.y1);
  return dx <= CLUSTER_PX && dy <= CLUSTER_PX;
}

/** Gomme du groupe : centre de la boîte englobante (chaque contact avec sa largeur et sa hauteur), rayon = moitié de son
 *  plus grand côté, borné à [24, 160] px (déc. 17, 18). Vide : rayon minimal en (0, 0). */
export function eraserCircle(boxes: readonly ContactBox[]): { x: number; y: number; radius: number } {
  if (boxes.length === 0) return { x: 0, y: 0, radius: AUTO_ERASER_MIN_RADIUS_PX };
  const r = boundsOf(boxes);
  const half = Math.max(r.x1 - r.x0, r.y1 - r.y0) / 2;
  return {
    x: (r.x0 + r.x1) / 2,
    y: (r.y0 + r.y1) / 2,
    radius: Math.min(AUTO_ERASER_MAX_RADIUS_PX, Math.max(AUTO_ERASER_MIN_RADIUS_PX, half)),
  };
}
