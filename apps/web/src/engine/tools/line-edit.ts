/**
 * « Modifier les points » (OG12, n° 20 à 23, DA-7) : édition des points d'une ligne ou d'une flèche non coudée, adaptée de
 * `LinearElementEditor` d'Excalidraw (packages/element/src/linearElementEditor.ts, MIT). Une SetLinePoints au relâché
 * (une étape par glisser) ; aperçu dans le calque d'édition, élément masqué pendant le glisser.
 * Ligne fermée (lot 2a) : milieu du segment de fermeture, aucune liaison, trois sommets au moins ; comportement adapté de
 * `linearElementEditor.ts` (Excalidraw, MIT).
 * Licence : le comportement reprend Excalidraw (MIT, © Excalidraw contributors), voir THIRD_PARTY_NOTICES.md.
 */
import type { ShapeElement } from "../../core/api";
import { elbowedOf } from "../../core/look";
import { isClosedShape, isSegment } from "../../core/shapes";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import { EMPTY_OVERLAY } from "../render/overlay";
import { dragLine, pickHandle, pointHandles, worldPoints, type DraggedLine, type PointHit } from "./line-points";
import { DRAG_THRESHOLD_PX, SELECT_TOL_PX } from "./select";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export interface LineEditor extends GestureTool {
  readonly id: string;
  selectedPoints(): readonly number[];
  removeSelected(): boolean;
}

interface Drag {
  readonly pointerId: number;
  readonly hit: PointHit;
  readonly x0: number;
  readonly y0: number;
  x: number;
  y: number;
  readonly zoom: number;
  readonly touch: boolean;
}

const NONE: ReadonlySet<string> = new Set<string>();

export function createLineEditor(ctx: ToolContext, id: string, exit: () => void): LineEditor {
  let selected: number[] = [];
  let drag: Drag | null = null;
  const view = (): ShapeElement | null => {
    const v = ctx.doc.element(id);
    return v?.kind === "shape" && isSegment(v.shape.shape) && !elbowedOf(v.look) ? v : null;
  };
  const moved = (d: Drag): boolean => Math.hypot(d.x - d.x0, d.y - d.y0) * d.zoom >= DRAG_THRESHOLD_PX;
  const dragged = (v: ShapeElement, d: Drag): DraggedLine => dragLine(ctx, v, d.hit, d.x, d.y, d.zoom, d.touch);
  return {
    id,
    begin(pointerId, samples) {
      const s = samples[0];
      if (!s || drag !== null) return;
      const v = view();
      if (v === null) {
        exit();
        return;
      }
      const cam = ctx.camera();
      const [x, y] = screenToWorld(cam, s.x, s.y);
      const touch = ctx.pointerType?.() === "touch";
      const hit = pickHandle(worldPoints(v), x, y, cam.zoom, touch, true, isClosedShape(v.shape));
      if (hit === null) {
        if (ctx.doc.hitTest(ctx.page(), x, y, SELECT_TOL_PX / cam.zoom) !== id) exit(); // n° 22 : toucher hors de l'objet
        return;
      }
      if (hit.kind === "point") {
        const i = hit.index;
        selected = ctx.shift?.() === true ? (selected.includes(i) ? selected.filter((k) => k !== i) : [...selected, i]) : [i];
      }
      drag = { pointerId, hit, x0: x, y0: y, x, y, zoom: cam.zoom, touch };
    },
    extend(pointerId, samples) {
      const s = samples[samples.length - 1];
      if (!drag || drag.pointerId !== pointerId || !s) return;
      [drag.x, drag.y] = screenToWorld(ctx.camera(), s.x, s.y);
    },
    frame() {
      // aperçu calculé dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drag;
      if (!d || d.pointerId !== pointerId) return;
      drag = null;
      const v = view();
      if (how !== "end" || v === null || !moved(d)) return;
      const { pts, index, start, end } = dragged(v, d);
      ctx.run({ type: "SetLinePoints", id, points: pts.flat(), start, end });
      selected = [index];
    },
    live(): LivePart {
      const v = view();
      if (v === null) return { strokes: [], erasers: [], hidden: NONE };
      const zoom = ctx.camera().zoom;
      const d = drag;
      if (d && moved(d)) {
        const { pts, index, hint } = dragged(v, d);
        const first = pts[0]!;
        const last = pts[pts.length - 1]!;
        return {
          strokes: [],
          erasers: [],
          hidden: new Set([id]),
          overlay: {
            ...EMPTY_OVERLAY,
            shapes: [{ shape: v.shape.shape, x0: first[0], y0: first[1], x1: last[0], y1: last[1], points: pts.slice(1, -1).flat(), style: v.style, fill: isClosedShape(v.shape) ? v.shape.fill : null, ...(v.look ? { look: v.look } : {}), ...(isClosedShape(v.shape) ? { polygon: true as const } : {}) }],
            points: pointHandles(pts, [index], zoom, false, isClosedShape(v.shape)),
            bind: hint,
          },
        };
      }
      return { strokes: [], erasers: [], hidden: NONE, overlay: { ...EMPTY_OVERLAY, points: pointHandles(worldPoints(v), selected, zoom, true, isClosedShape(v.shape)) } };
    },
    active: () => drag !== null,
    leave() {
      drag = null;
      selected = [];
    },
    selectedPoints: () => selected,
    removeSelected() {
      const v = view();
      if (v === null || selected.length === 0) return false;
      const pts = worldPoints(v);
      if (isClosedShape(v.shape) && pts.length - selected.length < 3) return false;
      const gone = new Set(selected);
      const keep = pts.filter((_, i) => !gone.has(i));
      selected = [];
      if (keep.length < 2) {
        ctx.run({ type: "Delete", ids: [id] });
        exit();
        return true;
      }
      const start = gone.has(0) ? null : (v.shape.start ?? null);
      const end = gone.has(pts.length - 1) ? null : (v.shape.end ?? null);
      ctx.run({ type: "SetLinePoints", id, points: keep.flat(), start, end });
      return true;
    },
  };
}
