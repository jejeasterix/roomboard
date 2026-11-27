/**
 * Badge du lien d'un élément (T18, H5, déc. 38) : un seul calcul pour le dessin (`canvas2d.ts`) et le toucher (moteur).
 * Carré de 16 px CSS hors de la boîte, en haut à droite, arrondi au pixel de l'appareil ; zone de toucher de 44 px
 * (24 px à la souris). Icône : Lucide `link` (ISC, voir THIRD_PARTY_NOTICES.md), tracé vectoriel, jamais une image.
 */
import type { Bounds } from "../../core/api";
import { worldToScreen, type Camera } from "../camera";

/** Badge en px CSS de la zone de dessin. */
export interface LinkBadge {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export const LINK_BADGE_PX = 16;
export const LINK_BADGE_GAP_PX = 6;
export const LINK_TOUCH_PX = 44;
export const LINK_MOUSE_PX = 24;
/** Lucide `link` (ISC), tracés repris tels quels (viewBox 24 × 24). */
export const LINK_ICON_PATHS: readonly string[] = [
  "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
  "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
];

/** Badge de la boîte `b` (monde) : hors de la boîte, coin bas-gauche à 6 px du coin haut-droit, au pixel de l'appareil. */
export function linkBadgeBox(b: Bounds, camera: Camera, dpr = 1): LinkBadge {
  const snap = (v: number): number => Math.round(v * dpr) / dpr;
  const [right, top] = worldToScreen(camera, b.x1, b.y0);
  return { x: snap(right + LINK_BADGE_GAP_PX), y: snap(top - LINK_BADGE_GAP_PX - LINK_BADGE_PX), size: LINK_BADGE_PX };
}

/** Point (px CSS) dans la zone de toucher du badge : 44 px centrés au doigt et au stylet, 24 px à la souris. */
export function inLinkBadge(badge: LinkBadge, x: number, y: number, pointerType?: string): boolean {
  const half = (pointerType === "mouse" ? LINK_MOUSE_PX : LINK_TOUCH_PX) / 2;
  return Math.abs(x - (badge.x + badge.size / 2)) <= half && Math.abs(y - (badge.y + badge.size / 2)) <= half;
}

let icon: Path2D[] | null = null;
/** Chemins de l'icône, faits une fois ; null hors navigateur (Node n'a pas Path2D). */
const iconPaths = (): Path2D[] | null => {
  if (icon === null && typeof Path2D === "function") icon = LINK_ICON_PATHS.map((d) => new Path2D(d));
  return icon;
};

/** Pastille blanche à bord de 1 px (posé sur le demi-pixel : net), icône de 12 px au trait de 1 px. `ctx` en px CSS. */
export function paintLinkBadge(ctx: CanvasRenderingContext2D, b: LinkBadge, color: string): void {
  const r = 4;
  const x = b.x + 0.5;
  const y = b.y + 0.5;
  const s = b.size - 1;
  ctx.save();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + s, y, x + s, y + s, r);
  ctx.arcTo(x + s, y + s, x, y + s, r);
  ctx.arcTo(x, y + s, x, y, r);
  ctx.arcTo(x, y, x + s, y, r);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.stroke();
  const paths = iconPaths();
  if (paths !== null) {
    const k = 12 / 24;
    ctx.translate(b.x + (b.size - 12) / 2, b.y + (b.size - 12) / 2);
    ctx.scale(k, k);
    ctx.lineWidth = 2; // 2 unités Lucide à l'échelle 1/2 : 1 px CSS
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const p of paths) ctx.stroke(p);
  }
  ctx.restore();
}

export const COPY_BADGE_PX = 18;
/** Lucide `copy` (ISC) : le dos et le carré de devant (viewBox 24 × 24). */
export const COPY_ICON_PATHS: readonly string[] = [
  "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
  "M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z",
];
/** Lucide `move` (ISC) : poignée « Déplacer » (viewBox 24 × 24). */
export const MOVE_ICON_PATHS: readonly string[] = ["M12 2v20", "m15 19-3 3-3-3", "m19 9 3 3-3 3", "M2 12h20", "m5 9-3 3 3 3", "m9 5 3-3 3 3"];

/** Badge « copie » de la boîte `b` (monde) : rond de 18 px, coin bas-droit à 6 px du coin haut gauche, au pixel de l'appareil. */
export function copyBadgeBox(b: Bounds, camera: Camera, dpr = 1): LinkBadge {
  const snap = (v: number): number => Math.round(v * dpr) / dpr;
  const [left, top] = worldToScreen(camera, b.x0, b.y0);
  return { x: snap(left - LINK_BADGE_GAP_PX - COPY_BADGE_PX), y: snap(top - LINK_BADGE_GAP_PX - COPY_BADGE_PX), size: COPY_BADGE_PX };
}

/** Chemins `d` mis en Path2D ; null hors navigateur. */
export const pathsOf = (ds: readonly string[]): Path2D[] | null => (typeof Path2D === "function" ? ds.map((d) => new Path2D(d)) : null);

/** Rond blanc à bord de 1 px (demi-pixel) et icône de 12 px au trait de 1 px, centrés dans `b`. `ctx` en px CSS. */
export function paintRoundIcon(ctx: CanvasRenderingContext2D, b: LinkBadge, paths: readonly Path2D[] | null, color: string): void {
  ctx.save();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // Rond tracé par quatre arcTo (comme `paintLinkBadge`), rayon = moitié du côté.
  const r = (b.size - 1) / 2;
  const x = b.x + 0.5;
  const y = b.y + 0.5;
  const w = b.size - 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + w, r);
  ctx.arcTo(x + w, y + w, x, y + w, r);
  ctx.arcTo(x, y + w, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.stroke();
  if (paths !== null) {
    ctx.translate(b.x + (b.size - 12) / 2, b.y + (b.size - 12) / 2);
    ctx.scale(0.5, 0.5);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const p of paths) ctx.stroke(p);
  }
  ctx.restore();
}

let copyIcon: Path2D[] | null = null;
export function paintCopyBadge(ctx: CanvasRenderingContext2D, b: LinkBadge, color: string): void {
  if (copyIcon === null) copyIcon = pathsOf(COPY_ICON_PATHS);
  paintRoundIcon(ctx, b, copyIcon, color);
}

let moveIcon: Path2D[] | null = null;
/** Poignée « Déplacer » (rond de 24 px CSS) centrée sur (cx, cy) px CSS. */
export function paintMoveHandle(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  if (moveIcon === null) moveIcon = pathsOf(MOVE_ICON_PATHS);
  paintRoundIcon(ctx, { x: cx - 12, y: cy - 12, size: 24 }, moveIcon, color);
}
