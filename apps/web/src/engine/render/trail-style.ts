/** Style de la traînée déléguée : seul un geste que le routeur a classé « ink » en reçoit un (le routeur décide, rien n'est recopié). */
import type { InkTrailStyle, TrailEvent } from "./ink-trail";

export type TrailRole = "ink" | "erase" | "edit" | "view" | null;

export function trailStyleFor(
  roleOf: (pointerId: number) => TrailRole,
  pen: { readonly color: string; readonly width: number },
  zoom: () => number,
): (e: TrailEvent) => InkTrailStyle | null {
  return (e) => (roleOf(e.pointerId) === "ink" ? { color: pen.color, diameter: pen.width * zoom() } : null);
}
