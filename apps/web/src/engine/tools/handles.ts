/** Poignées de redimensionnement (D15, CL4-11) et matrices de déplacement, partagées par l'outil Sélection et le rendu. */
import type { Bounds, Matrix } from "../../core/api";
import { isIdentity, translateMatrix } from "../../core/shapes";

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const HANDLE_IDS: readonly HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
/** Côté dessiné d'une poignée et portée de prise, en px écran. */
export const HANDLE_PX = 10;
export const HANDLE_GRAB_PX = 12;
/** Échelle minimale en valeur absolue : jamais de matrice non inversible (refusée par le cœur). */
export const MIN_SCALE = 0.05;

const OPPOSITE: Record<HandleId, HandleId> = { nw: "se", n: "s", ne: "sw", e: "w", se: "nw", s: "n", sw: "ne", w: "e" };
const MOVES_X: ReadonlySet<HandleId> = new Set<HandleId>(["nw", "ne", "e", "se", "sw", "w"]);
const MOVES_Y: ReadonlySet<HandleId> = new Set<HandleId>(["nw", "n", "ne", "se", "s", "sw"]);

export function handlePoint(b: Bounds, h: HandleId): [number, number] {
  const x = h.includes("w") ? b.x0 : h.includes("e") ? b.x1 : (b.x0 + b.x1) / 2;
  const y = h.includes("n") ? b.y0 : h.includes("s") ? b.y1 : (b.y0 + b.y1) / 2;
  return [x, y];
}

export const handlesOf = (b: Bounds): { id: HandleId; x: number; y: number }[] =>
  HANDLE_IDS.map((id) => {
    const [x, y] = handlePoint(b, id);
    return { id, x, y };
  });

/**
 * Poignée la plus proche à moins de `reach` (unités monde, distance de Tchebychev, bord inclus), ou null ; les
 * poignées de `skip` sont écartées (ex. milieux d'un cadre trop petit pour les distinguer du centre).
 */
export function hitHandle(b: Bounds, x: number, y: number, reach: number, skip?: ReadonlySet<HandleId>): HandleId | null {
  let best: HandleId | null = null;
  let bestD = reach;
  for (const h of handlesOf(b)) {
    if (skip?.has(h.id)) continue;
    const d = Math.max(Math.abs(h.x - x), Math.abs(h.y - y));
    if (d <= bestD) {
      best = h.id;
      bestD = d;
    }
  }
  return best;
}

/** Poignée « Déplacer » (OG23, T11) : au-dessus du milieu du bord haut, hors des huit poignées de taille. */
export const MOVE_HANDLE_GAP_PX = 28;
const MOVE_REACH_TOUCH_PX = 22;
const MOVE_REACH_MOUSE_PX = 12;

/** Centre monde de la poignée « Déplacer » : milieu du bord haut, 28 px écran au-dessus. */
export function moveHandlePoint(b: Bounds, zoom: number): [number, number] {
  return [(b.x0 + b.x1) / 2, b.y0 - MOVE_HANDLE_GAP_PX / zoom];
}

/** Appui (x, y monde) sur la poignée « Déplacer » : 22 px au doigt et au stylet, 12 px à la souris. */
export function hitMoveHandle(b: Bounds, x: number, y: number, zoom: number, pointerType?: string): boolean {
  const [hx, hy] = moveHandlePoint(b, zoom);
  const reach = (pointerType === "mouse" ? MOVE_REACH_MOUSE_PX : MOVE_REACH_TOUCH_PX) / zoom;
  return Math.max(Math.abs(hx - x), Math.abs(hy - y)) <= reach;
}

/** OG33 (lot 2b, choix 4) : poignée de rotation sous le coin bas droit du cadre, à 26 px écran en diagonale : le haut est
 *  pris par « + » (40 px, n° 28) et « Déplacer » (28 px, OG23), le coin haut droit par le badge du lien (T18), le coin
 *  haut gauche par le badge « copie » (OG23). */
export const ROTATE_HANDLE_GAP_PX = 26;
const ROTATE_REACH_TOUCH_PX = 22;
const ROTATE_REACH_MOUSE_PX = 12;

/** Centre monde de la poignée de rotation : coin bas droit du cadre, 26 px écran en diagonale. */
export function rotateHandlePoint(b: Bounds, zoom: number): [number, number] {
  return [b.x1 + ROTATE_HANDLE_GAP_PX / zoom, b.y1 + ROTATE_HANDLE_GAP_PX / zoom];
}

/** Appui (x, y monde) sur la poignée de rotation : 22 px au doigt et au stylet (cible de 44 px), 12 px à la souris. */
export function hitRotateHandle(b: Bounds, x: number, y: number, zoom: number, pointerType?: string): boolean {
  const [hx, hy] = rotateHandlePoint(b, zoom);
  const reach = (pointerType === "mouse" ? ROTATE_REACH_MOUSE_PX : ROTATE_REACH_TOUCH_PX) / zoom;
  return Math.max(Math.abs(hx - x), Math.abs(hy - y)) <= reach;
}

/** Pas de la rotation calée : `SHIFT_LOCKING_ANGLE` d'Excalidraw (π/12, MIT). */
export const ROTATE_STEP_DEG = 15;

/** Angle (degrés, sens horaire à l'écran) de (x0, y0) à (x, y) autour de (cx, cy) ; `snap` : l'angle absolu `base + Δ`
 *  calé au pas de 15°, rendu en Δ (choix 5), comme `rotateSingleElement` d'Excalidraw (resizeElements.ts, MIT). */
export function rotateAngle(cx: number, cy: number, x0: number, y0: number, x: number, y: number, snap: boolean, base = 0): number {
  const raw = ((Math.atan2(y - cy, x - cx) - Math.atan2(y0 - cy, x0 - cx)) * 180) / Math.PI;
  return snap ? Math.round((base + raw) / ROTATE_STEP_DEG) * ROTATE_STEP_DEG - base : raw;
}

/** Partie linéaire alignée sur les axes ou quart de tour : le cadre et ses huit poignées restent justes (choix 7). */
export function isAxisAligned(m: Matrix, eps = 1e-9): boolean {
  return (Math.abs(m[1]) <= eps && Math.abs(m[2]) <= eps) || (Math.abs(m[0]) <= eps && Math.abs(m[3]) <= eps);
}

/** Angle (degrés, sens horaire à l'écran) de la partie linéaire d'une matrice. */
export const matrixAngle = (m: Matrix): number => (Math.atan2(m[1], m[0]) * 180) / Math.PI;

export { isIdentity, translateMatrix };

function clampScale(s: number): number {
  if (!Number.isFinite(s)) return 1;
  return (s < 0 ? -1 : 1) * Math.max(MIN_SCALE, Math.abs(s));
}

/** Échelle autour de la poignée opposée qui amène la poignée `h` en (x, y) monde ; Maj : facteur dominant aux deux axes. */
export function resizeMatrix(b: Bounds, h: HandleId, x: number, y: number, keepRatio: boolean): Matrix {
  const [ax, ay] = handlePoint(b, OPPOSITE[h]);
  const [gx, gy] = handlePoint(b, h);
  let sx = MOVES_X.has(h) && gx !== ax ? (x - ax) / (gx - ax) : 1;
  let sy = MOVES_Y.has(h) && gy !== ay ? (y - ay) / (gy - ay) : 1;
  if (keepRatio) {
    const s = !MOVES_X.has(h) ? sy : !MOVES_Y.has(h) ? sx : Math.abs(sx) >= Math.abs(sy) ? sx : sy;
    sx = s;
    sy = s;
  }
  sx = clampScale(sx);
  sy = clampScale(sy);
  return [sx, 0, 0, sy, ax - sx * ax, ay - sy * ay];
}

/** Boîte monde, alignée sur les axes, de `b` transformée par `m`. */
export function transformBounds(m: Matrix, b: Bounds): Bounds {
  const corners: [number, number][] = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
  const xs = corners.map(([x, y]) => m[0] * x + m[2] * y + m[4]);
  const ys = corners.map(([x, y]) => m[1] * x + m[3] * y + m[5]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
