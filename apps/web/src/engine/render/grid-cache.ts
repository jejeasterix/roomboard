/**
 * Cache des lignes de grille (C9 éditeur, E3 ; reste d'OD48). Le cœur calcule les lignes d'un rectangle élargi autour de
 * la vue ; tant que la vue reste dedans, à même page et même zoom, aucun appel au cœur : les lignes gardées sont recoupées
 * à la vue (`visibleLines`), si bien que `paintGrid` reçoit ce qu'il recevait sans cache. Vidé par `clear` (resize,
 * aperçu) et par `invalidate` (`full`, ou `pages` qui contient la page gardée), comme `paths` et `textLines` de
 * `canvas2d.ts`. Une seule entrée : une page, un zoom.
 */
import { MAX_GRID_DOTS, type Bounds, type Change, type GridLines, type LevelLines } from "../../core/api";
import { MIN_DOT_PX, MIN_GRID_PX } from "./grid-paint";

/** Calcul des lignes par le cœur (ou l'aperçu) pour un rectangle monde. */
export type GridCompute = (page: string, rect: Bounds, minStep: number, minDotStep: number) => GridLines | null;

/** Tolérance de recoupe, en unités de page : une ligne posée sur un bord de la vue reste dedans (comme `EPS` du cœur). */
export const EDGE_EPS = 1e-6;

/**
 * Marge du rectangle gardé, en pixels CSS : la plus grande, au plus une demi-hauteur de vue, qui garde
 * `(cw / MIN_DOT_PX + 1)·(ch / MIN_DOT_PX + 1) ≤ MAX_GRID_DOTS` (cw borné à la largeur de page × zoom) : aucun niveau de
 * points n'est sauté à cause de la marge ; 0 si la vue seule dépasse.
 */
export function cacheMargin(viewW: number, viewH: number, zoom: number, pageWidth: number): number {
  const fits = (m: number): boolean => {
    const cw = Math.min(viewW + 2 * m, pageWidth * zoom);
    const ch = viewH + 2 * m;
    return (cw / MIN_DOT_PX + 1) * (ch / MIN_DOT_PX + 1) <= MAX_GRID_DOTS;
  };
  const max = viewH / 2;
  if (!(max > 0) || !fits(0)) return 0;
  if (fits(max)) return max;
  let lo = 0;
  let hi = max;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Rectangle gardé : la vue élargie de `cacheMargin` de chaque côté (en monde), ramenée à x ≥ 0 et y ≥ 0. */
export function cacheRect(visible: Bounds, zoom: number, pageWidth: number): Bounds {
  const m = cacheMargin((visible.x1 - visible.x0) * zoom, (visible.y1 - visible.y0) * zoom, zoom, pageWidth) / zoom;
  return { x0: Math.max(0, visible.x0 - m), y0: Math.max(0, visible.y0 - m), x1: visible.x1 + m, y1: visible.y1 + m };
}

const inside = (v: number, lo: number, hi: number): boolean => v >= lo - EDGE_EPS && v <= hi + EDGE_EPS;
const contains = (outer: Bounds, inner: Bounds): boolean =>
  inner.x0 >= outer.x0 && inner.y0 >= outer.y0 && inner.x1 <= outer.x1 && inner.y1 <= outer.y1;

/** Segment recoupé à `v` : verticale et horizontale par simple bornage (valeurs exactes, celles que le cœur rendrait pour
 *  la vue), oblique par Liang-Barsky ; null s'il sort de la vue. */
function clipSegment(x0: number, y0: number, x1: number, y1: number, v: Bounds): readonly [number, number, number, number] | null {
  if (x0 === x1) {
    if (!inside(x0, v.x0, v.x1)) return null;
    const a = Math.max(Math.min(y0, y1), v.y0);
    const b = Math.min(Math.max(y0, y1), v.y1);
    return a <= b ? [x0, a, x1, b] : null;
  }
  if (y0 === y1) {
    if (!inside(y0, v.y0, v.y1)) return null;
    const a = Math.max(Math.min(x0, x1), v.x0);
    const b = Math.min(Math.max(x0, x1), v.x1);
    return a <= b ? [a, y0, b, y1] : null;
  }
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const sides: readonly (readonly [number, number])[] = [
    [-dx, x0 - v.x0],
    [dx, v.x1 - x0],
    [-dy, y0 - v.y0],
    [dy, v.y1 - y0],
  ];
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
  }
  return t0 < t1 ? [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy] : null;
}

/** Lignes recoupées à la vue ; un groupe qui n'y a ni segment ni point disparaît (le cœur ne le rendrait pas). */
export function visibleLines(lines: GridLines, visible: Bounds): GridLines {
  const levels: LevelLines[] = [];
  for (const l of lines.levels) {
    const segments: number[] = [];
    for (let i = 0; i + 3 < l.segments.length; i += 4) {
      const s = clipSegment(l.segments[i] ?? 0, l.segments[i + 1] ?? 0, l.segments[i + 2] ?? 0, l.segments[i + 3] ?? 0, visible);
      if (s !== null) segments.push(...s);
    }
    const dots: number[] = [];
    for (let i = 0; i + 1 < l.dots.length; i += 2) {
      const x = l.dots[i] ?? 0;
      const y = l.dots[i + 1] ?? 0;
      if (inside(x, visible.x0, visible.x1) && inside(y, visible.y0, visible.y1)) dots.push(x, y);
    }
    if (segments.length > 0 || dots.length > 0) levels.push({ ...l, segments, dots });
  }
  return { above: lines.above, levels };
}

interface Entry {
  readonly page: string;
  readonly zoom: number;
  readonly rect: Bounds;
  readonly lines: GridLines | null;
}

export class GridLinesCache {
  private entry: Entry | null = null;

  constructor(private readonly compute: GridCompute) {}

  /** Lignes de `page` dans `visible` (monde) au zoom donné ; un appel à `compute` seulement hors de l'entrée gardée. */
  get(page: string, visible: Bounds, zoom: number, pageWidth: number): GridLines | null {
    let e = this.entry;
    if (e === null || e.page !== page || e.zoom !== zoom || !contains(e.rect, visible)) {
      const rect = cacheRect(visible, zoom, pageWidth);
      e = { page, zoom, rect, lines: this.compute(page, rect, MIN_GRID_PX / zoom, MIN_DOT_PX / zoom) };
      this.entry = e;
    }
    return e.lines === null ? null : visibleLines(e.lines, visible);
  }

  clear(): void {
    this.entry = null;
  }

  /** `full`, ou la page gardée dans `pages` : l'entrée est oubliée. */
  invalidate(change: Change): void {
    if (this.entry !== null && (change.full || change.pages.includes(this.entry.page))) this.entry = null;
  }
}
