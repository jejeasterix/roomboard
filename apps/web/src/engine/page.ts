import type { Camera } from "./camera";

/** Cadre de page (D5 amendée : largeur fixe, hauteur sans fin) et couleurs de la scène. */
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
export const PAGE_BACKGROUND = "#ffffff";
/** Pourtour de la page (plan non borné autour du cadre) : « fond autour de la page » de la charte (--rf-gray-50). Jamais exporté. */
export const SURROUND_COLOR = "#f5f5f8";

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

/**
 * Partie visible de la page pour la grille (C9, G9), en monde : toute la vue, ramenée à x ≥ 0 et y ≥ 0 (haut de vue
 * compris, pas y = 0) ; null si la vue est vide, ou entièrement au-dessus ou à gauche de la page. Le cœur la recoupe
 * avec la largeur réelle de la page.
 */
export function visibleGridRect(c: Camera, viewW: number, viewH: number): PageRect | null {
  const x0 = Math.max(0, -c.tx / c.zoom);
  const y0 = Math.max(0, -c.ty / c.zoom);
  const x1 = (viewW - c.tx) / c.zoom;
  const y1 = (viewH - c.ty) / c.zoom;
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}
