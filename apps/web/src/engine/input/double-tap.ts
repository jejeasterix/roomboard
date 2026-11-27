/** OG12 (n° 21) : double toucher ou double-clic (`TAP_TWICE_TIMEOUT` 300 ms, `DOUBLE_TAP_POSITION_THRESHOLD` 35 px
 *  d'Excalidraw) ; px écran. */
export const TAP_TWICE_MS = 300;
export const DOUBLE_TAP_PX = 35;
export interface Tap { readonly t: number; readonly x: number; readonly y: number }
export function isDoubleTap(prev: Tap | null, cur: Tap): boolean {
  return prev !== null && cur.t - prev.t <= TAP_TWICE_MS && cur.t >= prev.t && Math.hypot(cur.x - prev.x, cur.y - prev.y) <= DOUBLE_TAP_PX;
}
