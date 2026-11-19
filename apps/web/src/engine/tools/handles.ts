/** Poignées de redimensionnement (D15, CL4-11) et matrices de déplacement, partagées par l'outil Sélection et le rendu. */
import type { Bounds, Matrix } from "../../core/api";

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

/** Poignée la plus proche à moins de `reach` (unités monde, distance de Tchebychev), ou null. */
export function hitHandle(b: Bounds, x: number, y: number, reach: number): HandleId | null {
  let best: HandleId | null = null;
  let bestD = reach;
  for (const h of handlesOf(b)) {
    const d = Math.max(Math.abs(h.x - x), Math.abs(h.y - y));
    if (d <= bestD) {
      best = h.id;
      bestD = d;
    }
  }
  return best;
}

export const translateMatrix = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy];

export const isIdentity = (m: Matrix): boolean =>
  m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

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
