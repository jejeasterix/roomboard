/** Miroir TS de `crates/roomboard-core/src/shape.rs` (D13) : mêmes coins, mêmes polygones ; joué par le contrat (T54). */
// OG12 : chemin, courbe et ancrage, miroir de crates/roomboard-core/src/linear.rs ; courbe (curveCatmullRomCubicApproxPoints,
// packages/math/src/curve.ts) et écart (getBindingGap, packages/element/src/binding.ts) adaptés d'Excalidraw,
// Copyright (c) 2020 Excalidraw, licence MIT.
import { elbowedOf, roundnessOf, type Look } from "./look";
import type { Matrix, ShapeData, ShapeKind } from "./api";

export const MAX_INNER_POINTS = 512;
export const CURVE_STEPS = 16;
export const CURVE_TENSION = 0.5;
export const BIND_RATIO_MAX = 10;
export const BASE_BINDING_GAP = 5;
export const ANCHOR_RATIOS: readonly (readonly [number, number])[] = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
export type Pt = readonly [number, number];

export function linePath(w: number, h: number, inner: readonly number[] = []): Pt[] {
  const out: Pt[] = [[0, 0]];
  for (let i = 0; i + 1 < inner.length; i += 2) out.push([inner[i]!, inner[i + 1]!]);
  out.push([w, h]);
  return out;
}

export function catmullRom(pts: readonly Pt[]): [Pt, Pt, Pt, Pt][] {
  const n = pts.length;
  const out: [Pt, Pt, Pt, Pt][] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]!;
    const p1 = pts[i]!;
    const p2 = pts[Math.min(i + 1, n - 1)]!;
    const p3 = pts[Math.min(i + 2, n - 1)]!;
    const t1 = [(p2[0] - p0[0]) * CURVE_TENSION, (p2[1] - p0[1]) * CURVE_TENSION];
    const t2 = [(p3[0] - p1[0]) * CURVE_TENSION, (p3[1] - p1[1]) * CURVE_TENSION];
    out.push([p1, [p1[0] + t1[0]! / 3, p1[1] + t1[1]! / 3], [p2[0] - t2[0]! / 3, p2[1] - t2[1]! / 3], p2]);
  }
  return out;
}

export function flattenPath(pts: readonly Pt[], curve: boolean): Pt[] {
  if (!curve || pts.length < 3) return [...pts];
  const out: Pt[] = [pts[0]!];
  for (const [a, b, c, d] of catmullRom(pts)) {
    for (let k = 1; k <= CURVE_STEPS; k++) {
      const t = k / CURVE_STEPS;
      const u = 1 - t;
      const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
      out.push([w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * d[0], w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * d[1]]);
    }
  }
  return out;
}

export interface LineGeom { readonly inner: readonly number[]; readonly curve: boolean }
/** Chemin d'une forme lue (miroir de `read_shape`) : courbe = `roundness: "round"` sur ligne ou flèche non coudée. */
export function lineGeomOf(s: ShapeData, look?: Look): LineGeom {
  const seg = isSegment(s.shape);
  const elbow = s.shape === "arrow" && elbowedOf(look);
  return { inner: seg ? (s.points ?? []) : [], curve: seg && !elbow && roundnessOf(look) === "round" };
}

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
export function shapePolygon(kind: ShapeKind, w: number, h: number, width: number, line?: LineGeom): number[] {
  if (isSegment(kind) && line !== undefined) {
    const pts = flattenPath(linePath(w, h, line.inner), line.curve);
    if (pts.length > 2) return bandPolygon(pts, width, kind === "arrow");
  }
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

/** Inverse de `m` (`element::invert` du cœur) : null si le déterminant est NaN ou de valeur absolue < 1e-12. */
export function invertMatrix(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Number.isNaN(det) || Math.abs(det) < 1e-12) return null;
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

/** Polyligne épaissie (OG12) : traduction de `band_polygon` du cœur (côté gauche à l'aller, droit au retour, onglets bornés,
 *  bouts prolongés, pointe de flèche sur le dernier segment). */
function bandPolygon(raw: readonly Pt[], width: number, arrow: boolean): number[] {
  const half = Math.max(width / 2, 1);
  const pts: Pt[] = [];
  for (const p of raw) {
    const q = pts[pts.length - 1];
    if (q === undefined || Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-9) pts.push(p);
  }
  if (pts.length < 2) {
    const [x, y] = raw[0] ?? [0, 0];
    return [x - half, y - half, x + half, y - half, x + half, y + half, x - half, y + half];
  }
  const n = pts.length;
  const dir = (i: number): [number, number] => {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    let p: Pt;
    let off: Pt;
    if (i === 0) {
      const [ux, uy] = dir(0);
      p = [pts[0]![0] - ux * half, pts[0]![1] - uy * half];
      off = [-uy * half, ux * half];
    } else if (i === n - 1) {
      const [ux, uy] = dir(n - 2);
      p = [pts[i]![0] + ux * half, pts[i]![1] + uy * half];
      off = [-uy * half, ux * half];
    } else {
      const [ax, ay] = dir(i - 1);
      const [bx, by] = dir(i);
      let mx = -(ay + by);
      let my = ax + bx;
      const ml = Math.hypot(mx, my);
      if (ml < 1e-9) { mx = -ay; my = ax; } else { mx /= ml; my /= ml; }
      const cos = Math.max(mx * -ay + my * ax, 0.25);
      p = pts[i]!;
      off = [(mx * half) / cos, (my * half) / cos];
    }
    left.push([p[0] + off[0], p[1] + off[1]]);
    right.push([p[0] - off[0], p[1] - off[1]]);
  }
  const [lx, ly] = pts[n - 2]!;
  const [ex, ey] = pts[n - 1]!;
  const w = arrow ? arrowWings(ex - lx, ey - ly, width) : null;
  const out: Pt[] = [];
  if (w !== null) {
    const [x1, y1, x2, y2] = [w[0] + lx, w[1] + ly, w[2] + lx, w[3] + ly];
    const [ux, uy] = dir(n - 2);
    const len = Math.hypot(ex - lx, ey - ly);
    const k = Math.min(Math.max((x2 - lx) * ux + (y2 - ly) * uy, 0), len);
    const fx = lx + k * ux;
    const fy = ly + k * uy;
    const nx = -uy * half;
    const ny = ux * half;
    out.push(...left.slice(0, n - 1), [fx + nx, fy + ny], [x2, y2], left[n - 1]!, right[n - 1]!, [x1, y1], [fx - nx, fy - ny], ...right.slice(0, n - 1).reverse());
  } else {
    out.push(...left, ...right.reverse());
  }
  return out.flatMap(([x, y]) => [x, y]);
}
export const bandPolygonForTest = bandPolygon;

export interface BindBox { readonly id: string; readonly m: Matrix; readonly w: number; readonly h: number; readonly ellipse: boolean; readonly gap: number }
export const bindGap = (width: number): number => BASE_BINDING_GAP + width / 2;
export function onOutline(b: BindBox, qx: number, qy: number): boolean {
  const IN = 0.5;
  if (b.ellipse) {
    const rx = b.w / 2 - IN;
    const ry = b.h / 2 - IN;
    if (rx <= 0 || ry <= 0) return true;
    return ((qx - b.w / 2) / rx) ** 2 + ((qy - b.h / 2) / ry) ** 2 >= 1;
  }
  return qx <= IN || qy <= IN || qx >= b.w - IN || qy >= b.h - IN;
}
export function anchorPoint(b: BindBox, fx: number, fy: number): [number, number] {
  const cx = b.w / 2;
  const cy = b.h / 2;
  const qx = fx * b.w;
  const qy = fy * b.h;
  const dx = qx - cx;
  const dy = qy - cy;
  if (!onOutline(b, qx, qy) || Math.hypot(dx, dy) < 1e-9) return applyMatrix(b.m, qx, qy);
  const s = b.ellipse ? 1 / Math.sqrt((dx / cx) ** 2 + (dy / cy) ** 2) : 1 / Math.max(Math.abs(dx) / cx, Math.abs(dy) / cy);
  const edge = applyMatrix(b.m, cx + s * dx, cy + s * dy);
  const center = applyMatrix(b.m, cx, cy);
  const ux = edge[0] - center[0];
  const uy = edge[1] - center[1];
  const l = Math.hypot(ux, uy);
  return l < 1e-9 ? edge : [edge[0] + (ux / l) * b.gap, edge[1] + (uy / l) * b.gap];
}
