/** Miroir TS de `crates/roomboard-core/src/shape.rs` (D13) : mêmes coins, mêmes polygones ; joué par le contrat (T54). */
import type { Matrix, ShapeKind } from "./api";

export const SHAPE_KINDS: readonly ShapeKind[] = ["rect", "ellipse", "line", "arrow"];
export const isShapeKind = (s: string): s is ShapeKind => (SHAPE_KINDS as readonly string[]).includes(s);
export const isSegment = (k: ShapeKind): boolean => k === "line" || k === "arrow";
export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];
export const translateMatrix = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy];
export const isIdentity = (m: Matrix): boolean =>
  m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;
/** Sommets du polygone inscrit d'une ellipse (CL4-7, constat 5 de T60) : `ELLIPSE_VERTICES` de `shape.rs`. */
export const ELLIPSE_VERTICES = 64;

export interface ShapeGeometry {
  readonly tx: number;
  readonly ty: number;
  readonly w: number;
  readonly h: number;
}

export function normalizeShape(kind: ShapeKind, x0: number, y0: number, x1: number, y1: number): ShapeGeometry {
  if (isSegment(kind)) return { tx: x0, ty: y0, w: x1 - x0, h: y1 - y0 };
  return { tx: Math.min(x0, x1), ty: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}

/**
 * Pointe de flèche (D13), `arrow_wings` du cœur, appelé aussi par le rendu (`canvas2d.ts`) : extrémités des deux
 * ailes, longueur max(12, 3 × épaisseur) à ±25° derrière la fin du segment ; null pour un segment nul.
 */
export function arrowWings(w: number, h: number, width: number): [number, number, number, number] | null {
  if (Math.hypot(w, h) < 1e-9) return null;
  const l = Math.max(12, 3 * width);
  const back = Math.atan2(-h, -w);
  const a = (25 * Math.PI) / 180;
  return [w + l * Math.cos(back + a), h + l * Math.sin(back + a), w + l * Math.cos(back - a), h + l * Math.sin(back - a)];
}

/**
 * Polygone local de collision et de bornes, élargi de la demi-épaisseur (au moins 1) : `shape_polygon` du cœur.
 * Rectangle entier, ellipse en `ELLIPSE_VERTICES` sommets inscrits (CL4-7), segment épaissi ; la flèche y ajoute sa
 * pointe (constat 4 de T60) : pied de chaque aile sur le bord du fût, puis son extrémité.
 */
export function shapePolygon(kind: ShapeKind, w: number, h: number, width: number): number[] {
  const half = Math.max(width / 2, 1);
  if (kind === "rect") return [-half, -half, w + half, -half, w + half, h + half, -half, h + half];
  if (kind === "ellipse") {
    // Départ à l'angle π, n multiple de 4 : les quatre extrêmes sont des sommets, les bornes restent exactes.
    const cx = w / 2;
    const cy = h / 2;
    const rx = w / 2 + half;
    const ry = h / 2 + half;
    const out: number[] = [];
    for (let k = 0; k < ELLIPSE_VERTICES; k++) {
      const t = Math.PI + (2 * Math.PI * k) / ELLIPSE_VERTICES;
      out.push(cx + rx * Math.cos(t), cy + ry * Math.sin(t));
    }
    return out;
  }
  const len = Math.hypot(w, h);
  const ux = len > 1e-9 ? w / len : 1;
  const uy = len > 1e-9 ? h / len : 0;
  const nx = -uy * half;
  const ny = ux * half;
  const bx = -ux * half;
  const by = -uy * half;
  const ex = w + ux * half;
  const ey = h + uy * half;
  const wings = kind === "arrow" && len > 1e-9 ? arrowWings(w, h, width) : null;
  if (!wings) return [bx + nx, by + ny, ex + nx, ey + ny, ex - nx, ey - ny, bx - nx, by - ny];
  // Aile `back + a` du côté −n, aile `back − a` du côté +n ; pied = projection de l'extrémité sur l'axe, jamais en
  // deçà du départ élargi.
  const [x1, y1, x2, y2] = wings;
  const k = Math.max(x2 * ux + y2 * uy, -half);
  const kx = k * ux;
  const ky = k * uy;
  return [bx + nx, by + ny, kx + nx, ky + ny, x2, y2, ex + nx, ey + ny, ex - nx, ey - ny, x1, y1, kx - nx, ky - ny, bx - nx, by - ny];
}

export const boxPolygon = (w: number, h: number): number[] => [0, 0, w, 0, w, h, 0, h];

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** `m ∘ t` : applique `t` puis `m` (`element::compose` du cœur). */
export function composeMatrix(m: Matrix, t: Matrix): Matrix {
  return [
    m[0] * t[0] + m[2] * t[1],
    m[1] * t[0] + m[3] * t[1],
    m[0] * t[2] + m[2] * t[3],
    m[1] * t[2] + m[3] * t[3],
    m[0] * t[4] + m[2] * t[5] + m[4],
    m[1] * t[4] + m[3] * t[5] + m[5],
  ];
}
