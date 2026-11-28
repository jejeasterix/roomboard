/**
 * Aimant de la grille (C9, G8 ; OG69, G5) : seul endroit où un outil lit s'il est aimanté et aimante un point. Allumé :
 * la grille de la page porte `snap` et Alt n'est pas tenue (coupure temporaire, G8). Le nœud visé vient du cœur
 * (`snapPoint`, `snapDelta`) : un niveau sans magnétisme ou d'un type inconnu n'accroche rien. Le Tracé sur grille
 * (lot 2, C1) lit `magnetOn` pour montrer le nœud visé.
 */
import type { Bounds, Matrix } from "../../core/api";
import { handlePoint, resizeMatrix, type HandleId } from "./handles";
import type { ToolContext } from "./tool";

type MagnetCtx = Pick<ToolContext, "doc" | "page" | "alt">;

/** Aimant actif sur la page montrée : grille aimantée et Alt relâchée. */
export function magnetOn(ctx: MagnetCtx): boolean {
  return ctx.alt?.() !== true && ctx.doc.page(ctx.page())?.grid?.snap === true;
}

/** Point aimanté de `page` ; brut si Alt est tenue ou si rien n'accroche. */
export function magnetPoint(ctx: MagnetCtx, page: string, x: number, y: number): readonly [number, number] {
  return ctx.alt?.() === true ? [x, y] : (ctx.doc.snapPoint(page, x, y) ?? [x, y]);
}

/**
 * Redimensionnement aimanté (G5) : la poignée `h` de la boîte d'accroche `box` (sans le trait, comme à la création et au
 * déplacement) suit le pointeur décalé de (dx, dy), posée sur le nœud le plus proche ; l'échelle se fait autour de la
 * poignée opposée de cette même boîte. L'appelant lit `magnetOn` et `box` au départ du geste (aucune lecture de page par
 * image) ; ici, seule Alt est relue. Null si Alt est tenue ou si rien n'accroche : l'appelant garde son calcul brut.
 */
export function magnetResize(ctx: MagnetCtx, box: Bounds, h: HandleId, dx: number, dy: number, keepRatio: boolean): Matrix | null {
  if (ctx.alt?.() === true) return null;
  const [gx, gy] = handlePoint(box, h);
  const q = ctx.doc.snapPoint(ctx.page(), gx + dx, gy + dy);
  return q === null ? null : resizeMatrix(box, h, q[0], q[1], keepRatio);
}
