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

/** Source structurelle du cadre : `PageView` (core/api.ts) y entre tel quel. `mode` : "infinite" = Infini, le reste = Page. */
export interface FrameSource {
  readonly width: number;
  readonly height: number;
  readonly backdrop: { readonly rect: { readonly y1: number } | null } | null;
  readonly mode?: string;
}
export type FrameLayout = "landscape" | "portrait" | "infinite";

/** Cadre d'une page Page : (0, 0) → (width, max(height, bas du fond)) ; null en Infini (DA4). */
export function pageFrame(p: FrameSource): PageRect | null {
  if (p.mode === "infinite") return null;
  const bottom = Math.max(p.height, p.backdrop?.rect?.y1 ?? 0);
  return { x0: 0, y0: 0, x1: p.width, y1: bottom };
}

/** Orientation montrée par le segment : infini, portrait si le cadre est plus haut que large, sinon paysage. */
export function pageLayoutOf(p: FrameSource): FrameLayout {
  const f = pageFrame(p);
  return f === null ? "infinite" : f.y1 - f.y0 > f.x1 - f.x0 ? "portrait" : "landscape";
}

/** Partie visible du cadre (fond blanc) ; Infini (frame null) : toute la vue. null si rien n'est visible. */
export function visiblePageRect(c: Camera, viewW: number, viewH: number, frame: PageRect | null): PageRect | null;
/** @deprecated ancienne forme (cadre « largeur fixe, hauteur sans fin »), jusqu'à T9. */
export function visiblePageRect(c: Camera, viewH: number): PageRect | null;
export function visiblePageRect(c: Camera, a: number, b?: number, frame?: PageRect | null): PageRect | null {
  if (b === undefined) {
    const bottom = (a - c.ty) / c.zoom;
    if (!(bottom > 0)) return null;
    return { x0: 0, y0: 0, x1: PAGE_WIDTH, y1: bottom };
  }
  return clipToFrame(c, a, b, frame ?? null);
}

function clipToFrame(c: Camera, viewW: number, viewH: number, frame: PageRect | null): PageRect | null {
  const vx0 = 0 - c.tx / c.zoom;
  const vy0 = 0 - c.ty / c.zoom;
  const vx1 = (viewW - c.tx) / c.zoom;
  const vy1 = (viewH - c.ty) / c.zoom;
  const x0 = frame ? Math.max(frame.x0, vx0) : vx0;
  const y0 = frame ? Math.max(frame.y0, vy0) : vy0;
  const x1 = frame ? Math.min(frame.x1, vx1) : vx1;
  const y1 = frame ? Math.min(frame.y1, vy1) : vy1;
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}

/**
 * Partie visible de la page pour la grille (C9, G9), en monde : toute la vue, ramenée à x ≥ 0 et y ≥ 0 (haut de vue
 * compris, pas y = 0) ; null si la vue est vide, ou entièrement au-dessus ou à gauche de la page. Le cœur la recoupe
 * avec la largeur réelle de la page. Avec `frame` : recoupée au cadre ; `null` (Infini) : toute la vue, coordonnées
 * négatives comprises.
 */
export function visibleGridRect(c: Camera, viewW: number, viewH: number, frame?: PageRect | null): PageRect | null {
  if (frame !== undefined) return clipToFrame(c, viewW, viewH, frame);
  const x0 = Math.max(0, -c.tx / c.zoom);
  const y0 = Math.max(0, -c.ty / c.zoom);
  const x1 = (viewW - c.tx) / c.zoom;
  const y1 = (viewH - c.ty) / c.zoom;
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}
