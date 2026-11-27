/** Caméra d'une page (D17) : écran (px CSS) = monde × zoom + (tx, ty). Hors document, jamais annulée. */
import { PAGE_HEIGHT, PAGE_WIDTH, type FrameLayout, type PageRect } from "./page";

export interface Camera {
  readonly zoom: number;
  readonly tx: number;
  readonly ty: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const IDENTITY: Camera = { zoom: 1, tx: 0, ty: 0 };

const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function screenToWorld(c: Camera, sx: number, sy: number): [number, number] {
  return [(sx - c.tx) / c.zoom, (sy - c.ty) / c.zoom];
}

export function worldToScreen(c: Camera, wx: number, wy: number): [number, number] {
  return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
}

export function panBy(c: Camera, dx: number, dy: number): Camera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return c;
  return { zoom: c.zoom, tx: c.tx + dx, ty: c.ty + dy };
}

/** Zoom autour d'un point écran : le point du monde sous (sx, sy) y reste. Facteur nul, négatif ou non fini : rien. */
export function zoomAt(c: Camera, sx: number, sy: number, factor: number): Camera {
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(sx) || !Number.isFinite(sy)) return c;
  const zoom = clampZoom(c.zoom * factor);
  const [wx, wy] = screenToWorld(c, sx, sy);
  return { zoom, tx: sx - wx * zoom, ty: sy - wy * zoom };
}

/** « Ajuster la page » : page entière visible et centrée, avec une marge. Vue vide : identité. */
export function fitPage(
  viewW: number,
  viewH: number,
  pageW: number = PAGE_WIDTH,
  pageH: number = PAGE_HEIGHT,
  margin = 0.95,
): Camera {
  if (!(viewW > 0) || !(viewH > 0)) return IDENTITY;
  const zoom = clampZoom(Math.min(viewW / pageW, viewH / pageH) * margin);
  return { zoom, tx: (viewW - pageW * zoom) / 2, ty: (viewH - pageH * zoom) / 2 };
}

/** Bords haut et bas d'une boîte d'écran (px CSS). */
export interface VBox {
  readonly top: number;
  readonly bottom: number;
}

/** OF83 : haut de page, en px de scène, sous les îlots du haut (maquette 01 : y 152). Sous le plus bas d'entre eux, une
 *  rangée contextuelle est réservée, présente ou non (le cadrage ne change pas avec l'outil actif) : `contextGap` px
 *  (l'écart de `placeTip`, `ui/island-place.ts`), puis une rangée de la hauteur du plus bas des îlots du haut (un îlot sur
 *  une rangée ; une barre repliée sur plusieurs rangées ne double pas la réserve). Puis `gap` px ; 16 sans îlot.
 *  Îlot du haut : commence dans le premier quart de la scène et tient en moins d'un tiers de sa hauteur (une barre
 *  verticale posée sur un côté n'en est pas un). Une boîte de hauteur nulle, ou `side === true` (îlot latéral, OF83), est ignorée. */
export function topBelowIslands(stage: VBox, islands: readonly (VBox & { readonly side?: boolean })[], contextGap = 8, gap = 12, min = 16): number {
  const h = stage.bottom - stage.top;
  let low = -Infinity;
  let row = Infinity;
  for (const b of islands) {
    if (b.side === true) continue;
    const height = b.bottom - b.top;
    if (!(height > 0) || b.top - stage.top >= h / 4 || height >= h / 3) continue;
    low = Math.max(low, b.bottom - stage.top);
    row = Math.min(row, height);
  }
  return low === -Infinity ? min : Math.max(min, Math.ceil(low + contextGap + row + gap));
}

/** « Ajuster la page » (D5 amendée, CL5b-7) : largeur de page × margin, centrée ; haut de page à `top` px. */
export function fitWidth(viewW: number, viewH: number, pageW: number = PAGE_WIDTH, margin = 0.95, top = 16): Camera {
  if (!(viewW > 0) || !(viewH > 0)) return IDENTITY;
  const zoom = clampZoom((viewW / pageW) * margin);
  return { zoom, tx: (viewW - pageW * zoom) / 2, ty: top };
}

/** Cadre entier visible sous `top` px, centré ; réutilise `fitPage`. Vue vide : identité. */
export function fitFrame(viewW: number, viewH: number, frame: PageRect, top: number, margin = 0.95): Camera {
  if (!(viewW > 0) || !(viewH - top > 0)) return IDENTITY;
  const w = frame.x1 - frame.x0;
  const h = frame.y1 - frame.y0;
  const c = fitPage(viewW, viewH - top, w, h, margin);
  return { zoom: c.zoom, tx: c.tx - frame.x0 * c.zoom, ty: c.ty + top - frame.y0 * c.zoom };
}

/** « Ajuster la page » selon l'orientation (décision 10) : paysage = largeur ; portrait = cadre entier ; infini = contenu entier, sinon 1920 × 1080 en largeur. */
export function fitFor(
  layout: FrameLayout,
  viewW: number,
  viewH: number,
  frame: PageRect | null,
  content: PageRect | null,
  top: number,
): Camera {
  if (layout === "landscape" && frame) return fitWidth(viewW, viewH, frame.x1 - frame.x0, 0.95, top);
  if (layout === "portrait" && frame) return fitFrame(viewW, viewH, frame, top);
  if (layout === "infinite" && content) return fitFrame(viewW, viewH, content, top);
  return fitWidth(viewW, viewH, PAGE_WIDTH, 0.95, top);
}
