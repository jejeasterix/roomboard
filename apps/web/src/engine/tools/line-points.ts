/** OG12 : aides pures des poignées de points, de la liaison d'une extrémité et des poignées « + », partagées par les
 *  outils Formes (T8), Sélection (T8) et « Modifier les points » (T9). Distances écran converties par `zoom`. */
import type { Bounds, CoreDocument, LineBinding, LinkDir, ShapeElement } from "../../core/api";
import { ANCHOR_RATIOS, applyMatrix, linePath } from "../../core/shapes";
import type { BindHint, LinkHandle, PointHandle } from "../render/overlay";
import { HANDLE_GRAB_PX } from "./handles";

export const BIND_PX = 15;
export const BIND_TOUCH_PX = 30;
export const ANCHOR_SNAP_PX = 16;
export const ANCHOR_SNAP_TOUCH_PX = 24;
export const POINT_REACH_PX = HANDLE_GRAB_PX;
export const POINT_REACH_TOUCH_PX = 22;
export const MID_MIN_PX = 40;
export const LINK_OFFSET_PX = 40;
export const LINK_REACH_PX = 22;
/** n° 8 : une flèche liée déplacée seule ne bouge qu'au-delà de 10 px écran (`DRAGGING_THRESHOLD` d'Excalidraw). */
export const BOUND_DRAG_PX = 10;

export function worldPoints(v: ShapeElement): [number, number][] {
  return linePath(v.shape.w, v.shape.h, v.shape.points ?? []).map(([x, y]) => applyMatrix(v.transform, x, y));
}

const mid = (a: readonly [number, number], b: readonly [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const longEnough = (a: readonly [number, number], b: readonly [number, number], zoom: number): boolean =>
  Math.hypot(b[0] - a[0], b[1] - a[1]) * zoom >= MID_MIN_PX;

export interface PointHit { readonly kind: "point" | "mid"; readonly index: number }

/** Poignée sous (x, y) monde : le point le plus proche à portée (12 px, 22 au doigt), sinon le milieu d'un segment d'au
 *  moins 40 px écran (si `mids`). */
export function pickHandle(pts: readonly (readonly [number, number])[], x: number, y: number, zoom: number, touch: boolean, mids: boolean): PointHit | null {
  const reach = (touch ? POINT_REACH_TOUCH_PX : POINT_REACH_PX) / zoom;
  let best: PointHit | null = null;
  let bestD = reach;
  pts.forEach((p, i) => {
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d <= bestD) { best = { kind: "point", index: i }; bestD = d; }
  });
  if (best !== null || !mids) return best;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (!longEnough(a, b, zoom)) continue;
    const m = mid(a, b);
    const d = Math.hypot(m[0] - x, m[1] - y);
    if (d <= bestD) { best = { kind: "mid", index: i }; bestD = d; }
  }
  return best;
}

export function pointHandles(pts: readonly (readonly [number, number])[], selected: readonly number[], zoom: number, mids: boolean): PointHandle[] {
  const out: PointHandle[] = pts.map(([x, y], i) => ({ x, y, kind: "point", selected: selected.includes(i) }));
  if (mids) {
    for (let i = 0; i + 1 < pts.length; i++) {
      if (longEnough(pts[i]!, pts[i + 1]!, zoom)) {
        const [x, y] = mid(pts[i]!, pts[i + 1]!);
        out.push({ x, y, kind: "mid", selected: false });
      }
    }
  }
  return out;
}

export interface EndBind { readonly at: readonly [number, number]; readonly bind: LineBinding | null; readonly hint: BindHint | null }

/** Liaison d'une extrémité posée en (x, y) monde (n° 17, 18, 19) : `enabled` faux (réglage coupé, ou Ctrl qui l'inverse)
 *  = libre ; sinon `bindTarget` à 15 px écran (30 au doigt) ; une ancre à moins de 16 px (24 au doigt) l'emporte. */
export function bindEnd(doc: CoreDocument, page: string, x: number, y: number, zoom: number, touch: boolean, enabled: boolean, exclude?: string): EndBind {
  const free: EndBind = { at: [x, y], bind: null, hint: null };
  if (!enabled) return free;
  const hit = doc.bindTarget(page, x, y, (touch ? BIND_TOUCH_PX : BIND_PX) / zoom);
  if (hit === null || hit.id === exclude) return free;
  const snap = (touch ? ANCHOR_SNAP_TOUCH_PX : ANCHOR_SNAP_PX) / zoom;
  let fixed: readonly [number, number] = hit.fixed;
  let bestD = snap;
  hit.anchors.forEach((a, i) => {
    const d = Math.hypot(a[0] - x, a[1] - y);
    if (d <= bestD) { bestD = d; fixed = ANCHOR_RATIOS[i]!; }
  });
  return { at: [x, y], bind: { id: hit.id, fx: fixed[0], fy: fixed[1] }, hint: { id: hit.id, anchors: hit.anchors } };
}

/** Poignées « + » (n° 28) : centrées à 40 px écran des milieux du cadre, haut, droite, bas, gauche. */
export function linkHandles(f: Bounds, zoom: number): LinkHandle[] {
  const o = LINK_OFFSET_PX / zoom;
  const cx = (f.x0 + f.x1) / 2;
  const cy = (f.y0 + f.y1) / 2;
  return [
    { dir: "up", x: cx, y: f.y0 - o }, { dir: "right", x: f.x1 + o, y: cy },
    { dir: "down", x: cx, y: f.y1 + o }, { dir: "left", x: f.x0 - o, y: cy },
  ];
}

export function pickLink(handles: readonly LinkHandle[], x: number, y: number, zoom: number): LinkDir | null {
  const reach = LINK_REACH_PX / zoom;
  return handles.find((h) => Math.hypot(h.x - x, h.y - y) <= reach)?.dir ?? null;
}
