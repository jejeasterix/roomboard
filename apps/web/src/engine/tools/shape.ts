/**
 * Outil Formes (D13, D38, CL4-7) : rectangle, ellipse, ligne, flèche. Aperçu dans le calque d'édition (CL4-1), une
 * seule AddShape au relâché ; "cancel" et "abort" n'écrivent rien (D39). Maj : carré, cercle, angle par pas de 15°.
 * Style courant (OG11) : couleur, épaisseur, fond (rectangle, ellipse) et aspect `look`. Plus petit que 4 px écran sur les deux axes (points bruts), points
 * aimantés confondus, ou rectangle et ellipse aplatis par l'aimant : ni aperçu ni écriture (même prédicat, `drawn`).
 */
import type { ShapeKind, StrokeStyle } from "../../core/api";
import { lookFrom, type Look } from "../../core/look";
import { isBoxShape } from "../../core/shapes";
import { DEFAULT_ITEM_STYLE, type ItemStyle } from "../item-style";
import { newSeed } from "../render/sketch";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import { EMPTY_OVERLAY, type ShapePreview } from "../render/overlay";
import { bindEnd, bindingOn, type EndBind } from "./line-points";
import type { GestureTool, LivePart, ToolContext } from "./tool";
import { magnetPoint } from "./magnet";

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
  /** Couleur et épaisseur écrites (AddShape) ; le reste du style courant est dans `look` et `fill`. */
  readonly style: StrokeStyle;
  readonly fill: string | null;
  /** OG11 : aspect du geste, graine comprise, figé à l'ouverture (même tracé à l'aperçu et posé, déc. 12) ; absent : neutre. */
  readonly look: Look | undefined;
  readonly seed: number | null;
  readonly x0: number;
  readonly y0: number;
  x1: number;
  y1: number;
  readonly zoom: number;
  /** Départ aimanté, retenu pour tout le geste ; recalculé seulement quand l'état d'Alt change (`startAlt`). */
  start: readonly [number, number];
  startAlt: boolean;
  /** OG12 : doigt ; liaison du départ (figée) et de l'extrémité courante. */
  readonly touch: boolean;
  readonly startBind: EndBind | null;
  end: EndBind | null;
}

const NONE: ReadonlySet<string> = new Set<string>();

/** OG11 : le style courant (`ItemStyle`) ; un style de stylo seul (couleur, épaisseur) vaut le reste neutre. */
export function createShapeTool(ctx: ToolContext, kind: ShapeKind, style: () => StrokeStyle & Partial<ItemStyle>): GestureTool {
  const drafts = new Map<number, Draft>();
  const linear = kind === "line" || kind === "arrow";
  const binding = (): boolean => bindingOn(ctx);
  let hovered: EndBind | null = null;
  /** Point aimanté de la page (C9, G8) ; brut si Alt est tenue ou si rien n'accroche. */
  const snap = (page: string, x: number, y: number): readonly [number, number] => magnetPoint(ctx, page, x, y);
  /** Départ aimanté du geste : un seul `snapPoint` tant qu'Alt ne change pas. */
  const start = (d: Draft): readonly [number, number] => {
    const alt = ctx.alt?.() === true;
    if (alt !== d.startAlt) {
      d.start = snap(d.page, d.x0, d.y0);
      d.startAlt = alt;
    }
    return d.start;
  };
  /** Coins écrits : départ et bout aimantés, puis Maj appliquée au bout aimanté (CL4-12, G8). */
  const corners = (d: Draft): [number, number, number, number] => {
    const [x0, y0] = start(d);
    const [bx, by] = snap(d.page, d.x1, d.y1);
    const [x1, y1] = ctx.shift?.() === true ? constrainEnd(kind, x0, y0, bx, by) : [bx, by];
    return [x0, y0, x1, y1];
  };
  /** Bout brut (Maj comprise), seul juge du seuil de taille : un petit geste n'écrit rien, même agrandi par l'aimant. */
  const rawEnd = (d: Draft): [number, number] =>
    ctx.shift?.() === true ? constrainEnd(kind, d.x0, d.y0, d.x1, d.y1) : [d.x1, d.y1];
  /** Geste sous `MIN_SHAPE_PX` écran sur les deux axes, jugé sur les points bruts (G8). */
  const tooSmall = (d: Draft): boolean => {
    const [rx, ry] = rawEnd(d);
    return Math.abs(rx - d.x0) * d.zoom < MIN_SHAPE_PX && Math.abs(ry - d.y0) * d.zoom < MIN_SHAPE_PX;
  };
  /** Coins montrés et écrits, ou null : geste trop petit, points aimantés confondus, rectangle ou ellipse aplati. */
  const drawn = (d: Draft): [number, number, number, number] | null => {
    if (tooSmall(d)) return null;
    const c = corners(d);
    const [x0, y0, x1, y1] = c;
    if (x0 === x1 && y0 === y1) return null;
    if (isBoxShape(kind) && (x0 === x1 || y0 === y1)) return null;
    return c;
  };

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      const cam = ctx.camera();
      const [x, y] = screenToWorld(cam, s.x, s.y);
      const page = ctx.page();
      const startAlt = ctx.alt?.() === true;
      const st: ItemStyle = { ...DEFAULT_ITEM_STYLE, ...style() };
      // Graine tirée au début du geste et gardée dans le brouillon, jamais au relâché (déc. 12).
      const seed = st.roughness > 0 ? newSeed() : null;
      const fill = isBoxShape(kind) ? st.background : null;
      const touch = ctx.pointerType?.() === "touch";
      const arrow = kind === "arrow";
      const look = lookFrom(
        {
          ...st,
          roundness: kind === "rect" || kind === "line" ? st.roundness : arrow && st.arrowType === "round" ? "round" : "sharp",
          elbowed: arrow && st.arrowType === "elbow",
          fillStyle: fill === null ? "solid" : st.fillStyle,
          startArrowhead: arrow ? st.startArrowhead : DEFAULT_ITEM_STYLE.startArrowhead,
          endArrowhead: arrow ? st.endArrowhead : DEFAULT_ITEM_STYLE.endArrowhead,
          textAlign: "left",
        },
        seed,
      );
      drafts.set(pointerId, { page, style: { color: st.color, width: st.width }, fill, look, seed, x0: x, y0: y, x1: x, y1: y, zoom: cam.zoom, start: snap(page, x, y), startAlt,
        touch,
        startBind: linear ? bindEnd(ctx.doc, page, x, y, cam.zoom, touch, binding()) : null,
        end: null,
      });
    },
    extend(pointerId, samples) {
      const d = drafts.get(pointerId);
      const s = samples[samples.length - 1];
      if (!d || !s) return;
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      d.x1 = x;
      d.y1 = y;
      if (linear) d.end = bindEnd(ctx.doc, d.page, x, y, d.zoom, d.touch, binding(), d.startBind?.bind?.id);
    },
    frame() {
      // aperçu calculé dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drafts.get(pointerId);
      if (!d) return;
      drafts.delete(pointerId);
      if (how !== "end") return;
      const c = drawn(d);
      if (c === null) return;
      const [x0, y0, x1, y1] = c;
      const end = linear ? bindEnd(ctx.doc, d.page, d.x1, d.y1, d.zoom, d.touch, binding(), d.startBind?.bind?.id) : null;
      ctx.run({
        type: "AddShape", page: d.page, shape: kind, x0, y0, x1, y1, style: d.style, fill: d.fill,
        ...(d.look ? { look: d.look } : {}),
        ...(d.startBind?.bind ? { start: d.startBind.bind } : {}),
        ...(end?.bind ? { end: end.bind } : {}),
      });
    },
    live(): LivePart {
      if (drafts.size === 0) {
        if (hovered?.hint) return { strokes: [], erasers: [], hidden: NONE, overlay: { ...EMPTY_OVERLAY, bind: hovered.hint } };
        return { strokes: [], erasers: [], hidden: NONE };
      }
      const shapes: ShapePreview[] = [];
      for (const d of drafts.values()) {
        const c = drawn(d);
        if (c === null) continue;
        const [x0, y0, x1, y1] = c;
        shapes.push({
          shape: kind,
          x0,
          y0,
          x1,
          y1,
          style: d.style,
          fill: d.fill,
          ...(d.look ? { look: d.look } : {}),
          ...(d.seed !== null ? { seed: d.seed } : {}),
        });
      }
      if (shapes.length === 0) return { strokes: [], erasers: [], hidden: NONE };
      return {
        strokes: [], erasers: [], hidden: NONE,
        overlay: { ...EMPTY_OVERLAY, shapes, bind: [...drafts.values()].find((x) => x.end?.hint)?.end?.hint ?? null },
      };
    },
    active: () => drafts.size > 0,
    hover(sx, sy) {
      if (!linear) return;
      const [x, y] = screenToWorld(ctx.camera(), sx, sy);
      hovered = bindEnd(ctx.doc, ctx.page(), x, y, ctx.camera().zoom, false, binding());
      ctx.requestFrame?.();
    },
    leave() {
      hovered = null;
      drafts.clear();
    },
  };
}
