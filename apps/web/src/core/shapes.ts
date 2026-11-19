/** Miroir TS de `crates/roomboard-core/src/shape.rs` (D13) : mêmes coins, mêmes polygones ; joué par le contrat (T54). */
import type { Matrix, ShapeKind } from "./api";

export const SHAPE_KINDS: readonly ShapeKind[] = ["rect", "ellipse", "line", "arrow"];
export const isShapeKind = (s: string): s is ShapeKind => (SHAPE_KINDS as readonly string[]).includes(s);
export const isSegment = (k: ShapeKind): boolean => k === "line" || k === "arrow";
export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];
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

/** Polygone local de collision et de bornes, élargi de la demi-épaisseur (au moins 1) : `shape_polygon` du cœur. */
export function shapePolygon(kind: ShapeKind, w: number, h: number, width: number): number[] {
  const half = Math.max(width / 2, 1);
  if (!isSegment(kind)) return [-half, -half, w + half, -half, w + half, h + half, -half, h + half];
  const len = Math.hypot(w, h);
  const ux = len > 1e-9 ? w / len : 1;
  const uy = len > 1e-9 ? h / len : 0;
  const nx = -uy * half;
  const ny = ux * half;
  const bx = -ux * half;
  const by = -uy * half;
  const ex = w + ux * half;
  const ey = h + uy * half;
  return [bx + nx, by + ny, ex + nx, ey + ny, ex - nx, ey - ny, bx - nx, by - ny];
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
