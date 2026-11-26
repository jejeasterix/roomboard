/** Caméra d'une page (D17) : écran (px CSS) = monde × zoom + (tx, ty). Hors document, jamais annulée. */
import { PAGE_HEIGHT, PAGE_WIDTH } from "./page";

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

/** Écart entre un îlot et sa rangée contextuelle (`rb.css`, `.rb-context`, posée 8 px sous la barre). */
export const CONTEXT_GAP_PX = 8;

/** OF83 : haut de page, en px de scène, sous les îlots du haut (maquette 01 : y 152). Sous chaque îlot du haut, une
 *  rangée contextuelle de même hauteur est réservée, présente ou non : le cadrage ne change pas avec l'outil actif.
 *  Puis `gap` px ; 16 sans îlot. Îlot du haut : commence dans le premier quart de la scène et tient en moins d'un tiers
 *  de sa hauteur (une barre verticale posée sur un côté n'en est pas un). Une boîte de hauteur nulle est ignorée. */
export function topBelowIslands(stage: VBox, islands: readonly VBox[], gap = 12, min = 16): number {
  const h = stage.bottom - stage.top;
  let low = -Infinity;
  for (const b of islands) {
    const height = b.bottom - b.top;
    if (!(height > 0) || b.top - stage.top >= h / 4 || height >= h / 3) continue;
    low = Math.max(low, b.bottom - stage.top + CONTEXT_GAP_PX + height);
  }
  return Math.max(min, Math.ceil(low + gap));
}

/** « Ajuster la page » (D5 amendée, CL5b-7) : largeur de page × margin, centrée ; haut de page à `top` px. */
export function fitWidth(viewW: number, viewH: number, pageW: number = PAGE_WIDTH, margin = 0.95, top = 16): Camera {
  if (!(viewW > 0) || !(viewH > 0)) return IDENTITY;
  const zoom = clampZoom((viewW / pageW) * margin);
  return { zoom, tx: (viewW - pageW * zoom) / 2, ty: top };
}
