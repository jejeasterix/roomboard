import type { Camera } from "./camera";

/** Cadre de page (D5 amendée : largeur fixe, hauteur sans fin) et couleurs de la scène. */
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
export const PAGE_BACKGROUND = "#ffffff";
/** Pourtour de la page (plan non borné autour du cadre). */
export const SURROUND_COLOR = "#d4d4d8";

export interface PageRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Fond de page visible (monde) : x de 0 à PAGE_WIDTH, y de 0 au bas de la vue ; null si le haut de page est sous la vue. */
export function visiblePageRect(c: Camera, viewH: number): PageRect | null {
  const bottom = (viewH - c.ty) / c.zoom;
  if (!(bottom > 0)) return null;
  return { x0: 0, y0: 0, x1: PAGE_WIDTH, y1: bottom };
}
