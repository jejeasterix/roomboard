/**
 * Cache des lignes de grille (C9 éditeur, E3 ; reste d'OD48). Le cœur calcule les lignes d'un rectangle élargi autour de
 * la vue ; tant que la vue reste dedans, à même page et même zoom, aucun appel au cœur (marge nulle : la même vue
 * seulement) : les lignes gardées sont recoupées à la vue (`visibleLines`), si bien que `paintGrid` reçoit ce qu'il
 * recevait sans cache. Vidé par `clear` (resize,
 * aperçu) et par `invalidate` (`full`, ou `pages` qui contient la page gardée), comme `paths` et `textLines` de
 * `canvas2d.ts`. Une seule entrée : une page, un zoom.
 */
import { MAX_GRID_DOTS, type Bounds, type Change, type GridLines, type LevelLines } from "../../core/api";
import type { PageRect } from "../page";
import { MIN_DOT_PX, MIN_GRID_PX } from "./grid-paint";

/** Calcul des lignes par le cœur (ou l'aperçu) pour un rectangle monde. */
export type GridCompute = (page: string, rect: Bounds, minStep: number, minDotStep: number) => GridLines | null;

/**
 * Tolérance de recoupe, absolue, en unités de page : une ligne posée sur un bord de la vue, à 1e-6 près, reste dedans.
 * Le cœur compte, lui, en fraction du pas (`EPS` = 1e-9 · pas, `grid.rs`), mais le pas d'un niveau ne vient pas avec ses
 * lignes (`LevelLines`). Écart réel : une ligne hors d'un bord de plus de 1e-9 · pas et de moins de 1e-6 est gardée ici,
 * écartée par le cœur (pas < 1000) ; au-delà d'un pas de 1000, l'inverse. Une telle ligne se peint comme une ligne
 * posée sur le bord.
 */
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

/** Marge du rectangle gardé, en monde ; largeur sans borne en Infini. */
const worldMargin = (visible: Bounds, zoom: number, frame: PageRect | null): number =>
  cacheMargin((visible.x1 - visible.x0) * zoom, (visible.y1 - visible.y0) * zoom, zoom, frame === null ? Infinity : frame.x1 - frame.x0) / zoom;

/**
 * Vue élargie de `m` ; la marge s'arrête aux bornes passées par l'appelant (le cadre de la page), la vue jamais : le
 * rectangle gardé la contient toujours. `null` (Infini) : aucune borne, x0 et y0 < 0 permis.
 */
const grow = (visible: Bounds, m: number, frame: PageRect | null): Bounds => {
  if (frame === null) return { x0: visible.x0 - m, y0: visible.y0 - m, x1: visible.x1 + m, y1: visible.y1 + m };
  return {
    x0: Math.max(Math.min(frame.x0, visible.x0), visible.x0 - m),
    y0: Math.max(Math.min(frame.y0, visible.y0), visible.y0 - m),
    x1: Math.min(Math.max(frame.x1, visible.x1), visible.x1 + m),
    y1: Math.min(Math.max(frame.y1, visible.y1), visible.y1 + m),
  };
};

/** Rectangle gardé : la vue élargie de `cacheMargin` de chaque côté (en monde), recoupée au cadre (`null` : sans borne). */
export function cacheRect(visible: Bounds, zoom: number, frame: PageRect | null): Bounds {
  return grow(visible, worldMargin(visible, zoom, frame), frame);
}

const inside = (v: number, lo: number, hi: number): boolean => v >= lo - EDGE_EPS && v <= hi + EDGE_EPS;
const contains = (outer: Bounds, inner: Bounds): boolean =>
  inner.x0 >= outer.x0 && inner.y0 >= outer.y0 && inner.x1 <= outer.x1 && inner.y1 <= outer.y1;
const same = (a: Bounds, b: Bounds): boolean => a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1 && a.y1 === b.y1;

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
  /**
   * Vue du calcul quand la marge valait 0 (vue seule au-delà du plafond), sinon null. Le cœur a pu sauter un niveau de
   * points pour cette vue (plus de `MAX_GRID_DOTS`) qu'une vue plus petite garderait : l'entrée ne sert qu'elle. Avec
   * une marge, le rectangle tient sous le plafond au pas minimal : aucune vue comprise n'y voit un niveau sauté.
   */
  readonly only: Bounds | null;
  readonly lines: GridLines | null;
}

export class GridLinesCache {
  private entry: Entry | null = null;

  constructor(private readonly compute: GridCompute) {}

  /** Lignes de `page` dans `visible` (monde) au zoom donné, bornées à `frame` (`null` : Infini, sans borne) ; un appel à
   *  `compute` seulement hors de l'entrée gardée. */
  get(page: string, visible: Bounds, zoom: number, frame: PageRect | null): GridLines | null {
    let e = this.entry;
    if (e === null || e.page !== page || e.zoom !== zoom || !(e.only === null ? contains(e.rect, visible) : same(e.only, visible))) {
      const m = worldMargin(visible, zoom, frame);
      const rect = grow(visible, m, frame);
      const only = m === 0 ? { x0: visible.x0, y0: visible.y0, x1: visible.x1, y1: visible.y1 } : null;
      e = { page, zoom, rect, only, lines: this.compute(page, rect, MIN_GRID_PX / zoom, MIN_DOT_PX / zoom) };
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
