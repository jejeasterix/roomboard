/**
 * Outil Formes (D13, D38, CL4-7) : rectangle, ellipse, ligne, flèche. Aperçu dans le calque d'édition (CL4-1), une
 * seule AddShape au relâché ; "cancel" et "abort" n'écrivent rien (D39). Maj : carré, cercle, angle par pas de 15°.
 * Couleur et épaisseur du stylo, sans remplissage. Plus petit que 4 px écran sur les deux axes : rien.
 */
import type { ShapeKind, StrokeStyle } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import { EMPTY_OVERLAY, type ShapePreview } from "../render/overlay";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export const MIN_SHAPE_PX = 4;
export const ANGLE_STEP_DEG = 15;

/** Bout contraint par Maj : carré ou cercle par le plus grand côté ; segment ramené au pas de 15°, longueur gardée. */
export function constrainEnd(kind: ShapeKind, x0: number, y0: number, x1: number, y1: number): [number, number] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (kind === "line" || kind === "arrow") {
    const len = Math.hypot(dx, dy);
    if (len === 0) return [x1, y1];
    const step = (ANGLE_STEP_DEG * Math.PI) / 180;
    const a = Math.round(Math.atan2(dy, dx) / step) * step;
    return [x0 + len * Math.cos(a), y0 + len * Math.sin(a)];
  }
  const s = Math.max(Math.abs(dx), Math.abs(dy));
  return [x0 + (dx < 0 ? -s : s), y0 + (dy < 0 ? -s : s)];
}

interface Draft {
  readonly page: string;
  readonly style: StrokeStyle;
  readonly x0: number;
  readonly y0: number;
  x1: number;
  y1: number;
  readonly zoom: number;
}

const NONE: ReadonlySet<string> = new Set<string>();

export function createShapeTool(ctx: ToolContext, kind: ShapeKind, style: () => StrokeStyle): GestureTool {
  const drafts = new Map<number, Draft>();
  /** Point aimanté de la page (C9, G8) ; brut si Alt est tenue ou si rien n'accroche. */
  const snap = (page: string, x: number, y: number): readonly [number, number] =>
    ctx.alt?.() === true ? [x, y] : (ctx.doc.snapPoint(page, x, y) ?? [x, y]);
  /** Coins écrits : départ et bout aimantés, puis Maj appliquée au bout aimanté (CL4-12, G8). */
  const corners = (d: Draft): [number, number, number, number] => {
    const [x0, y0] = snap(d.page, d.x0, d.y0);
    const [bx, by] = snap(d.page, d.x1, d.y1);
    const [x1, y1] = ctx.shift?.() === true ? constrainEnd(kind, x0, y0, bx, by) : [bx, by];
    return [x0, y0, x1, y1];
  };
  /** Bout brut (Maj comprise), seul juge du seuil de taille : un petit geste n'écrit rien, même agrandi par l'aimant. */
  const rawEnd = (d: Draft): [number, number] =>
    ctx.shift?.() === true ? constrainEnd(kind, d.x0, d.y0, d.x1, d.y1) : [d.x1, d.y1];

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      const cam = ctx.camera();
      const [x, y] = screenToWorld(cam, s.x, s.y);
      drafts.set(pointerId, { page: ctx.page(), style: style(), x0: x, y0: y, x1: x, y1: y, zoom: cam.zoom });
    },
    extend(pointerId, samples) {
      const d = drafts.get(pointerId);
      const s = samples[samples.length - 1];
      if (!d || !s) return;
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      d.x1 = x;
      d.y1 = y;
    },
    frame() {
      // aperçu calculé dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drafts.get(pointerId);
      if (!d) return;
      drafts.delete(pointerId);
      if (how !== "end") return;
      const [rx, ry] = rawEnd(d);
      if (Math.abs(rx - d.x0) * d.zoom < MIN_SHAPE_PX && Math.abs(ry - d.y0) * d.zoom < MIN_SHAPE_PX) return;
      const [x0, y0, x1, y1] = corners(d);
      if (x0 === x1 && y0 === y1) return;
      ctx.run({ type: "AddShape", page: d.page, shape: kind, x0, y0, x1, y1, style: d.style, fill: null });
    },
    live(): LivePart {
      if (drafts.size === 0) return { strokes: [], erasers: [], hidden: NONE };
      const shapes: ShapePreview[] = [...drafts.values()].map((d) => {
        const [x0, y0, x1, y1] = corners(d);
        return { shape: kind, x0, y0, x1, y1, style: d.style, fill: null };
      });
      return { strokes: [], erasers: [], hidden: NONE, overlay: { ...EMPTY_OVERLAY, shapes } };
    },
    active: () => drafts.size > 0,
    leave() {
      drafts.clear();
    },
  };
}
