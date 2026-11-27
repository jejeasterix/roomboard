/**
 * Outil Sélection (D15, D38, CL4-10, CL4-11) : clic = l'élément le plus haut (6 px écran), Maj = ajouter ou retirer,
 * glisser dans le vide = rectangle (éléments entièrement inclus), glisser un élément = le déplacer, 8 poignées =
 * redimensionner autour de la poignée opposée (Maj : proportions). Aperçu : éléments masqués de la scène et redessinés
 * en fantômes avec la matrice provisoire (CL4-1) ; une seule Transform au relâché ; "cancel" et "abort" n'écrivent
 * rien (D39) ; un clic sans glisser (< 2 px écran) non plus. Un seul pointeur à la fois (CL4-14).
 * C10b (F10) : un toucher sans glisser (< 8 px écran, REVEAL_TAP_PX), sans Maj, sur une cellule ombrée du tableau le plus
 * haut sous le point la révèle (SetTableShade à null, une étape), sélection inchangée ; au-delà, le glisser sélectionne et déplace.
 * C3 (Z2) : un clic prend le groupe extérieur entier, Maj+clic l'ajoute ou le retire entier, le rectangle ne prend un
 * groupe qu'entier (`engine/groups.ts`).
 */
import type { Bounds, LinkDir, Matrix, ShapeElement, ElementView } from "../../core/api";
import { elbowedOf } from "../../core/look";
import { IDENTITY_MATRIX, isSegment } from "../../core/shapes";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import { isDoubleTap, type Tap } from "../input/double-tap";
import type { InputSample } from "../input/sampler";
import { BOUND_DRAG_PX, dragLine, linkHandles, linkedCopy, pickHandle, pickLink, pointHandles, worldPoints, type DraggedLine, type PointHit } from "./line-points";
import { EMPTY_OVERLAY, type EditOverlay, type ShapePreview } from "../render/overlay";
import {
  HANDLE_GRAB_PX,
  handlePoint,
  hitHandle,
  isIdentity,
  resizeMatrix,
  transformBounds,
  translateMatrix,
  type HandleId,
} from "./handles";
import { expandToGroups, keepWholeGroups, viewsOf, type GroupedView } from "../groups";
import { cellContent, tableAt } from "../table-geom";
import type { LivePart, SelectionTool, ToolContext } from "./tool";

export const SELECT_TOL_PX = 6;
export const DRAG_THRESHOLD_PX = 2;
/** Toucher qui révèle un ombrage (F10, HB-24) : seuil propre, le glisser de 2 px est trop petit au doigt. */
export const REVEAL_TAP_PX = 8;

type Mode = "move" | "resize" | "band" | "none" | "tap-shade" | "line-end" | "line-mid" | "link";

/** Cellule ombrée retenue au `begin` (F10), révélée au `close` si le pointeur n'a pas glissé. */
interface Reveal {
  readonly id: string;
  readonly row: string;
  readonly col: string;
}

interface Drag {
  readonly pointerId: number;
  /** `tap-shade` devient `move` au-delà de `REVEAL_TAP_PX`. */
  mode: Mode;
  readonly x0: number;
  readonly y0: number;
  x: number;
  y: number;
  readonly zoom: number;
  readonly handle: HandleId | null;
  readonly base: Bounds | null;
  readonly shift: boolean;
  readonly reveal: Reveal | null;
  /** OG12 : poignée de point prise, direction « + », ligne liée (seuil 10 px), cible touchée, doigt ; premier échantillon. */
  readonly hit?: PointHit;
  readonly link?: LinkDir;
  bound?: boolean;
  target?: string | null;
  readonly touch?: boolean;
  readonly t: number;
  readonly sx: number;
  readonly sy: number;
}

const isLine = (v: ElementView | null): v is ShapeElement => v?.kind === "shape" && isSegment(v.shape.shape);
const isNode = (v: ElementView | null): boolean => v?.kind === "shape" && (v.shape.shape === "rect" || v.shape.shape === "ellipse");
/** n° 39 : poignées hors édition : les deux bouts ; le milieu si deux points et non coudée. */
const endHandles = (v: ShapeElement): { pts: [number, number][]; mids: boolean } => {
  const all = worldPoints(v);
  const mids = all.length === 2 && !elbowedOf(v.look);
  return { pts: mids ? all : [all[0]!, all[all.length - 1]!], mids };
};

const NONE: ReadonlySet<string> = new Set<string>();
/** `a` suivi des éléments de `b` qui n'y sont pas. */
const union = (a: readonly string[], b: readonly string[]): string[] => [...a, ...b.filter((id) => !a.includes(id))];
const norm = (ax: number, ay: number, bx: number, by: number): Bounds => ({
  x0: Math.min(ax, bx),
  y0: Math.min(ay, by),
  x1: Math.max(ax, bx),
  y1: Math.max(ay, by),
});

const EDGE_EPS_PX = 1e-6;
const NO_EW: ReadonlySet<HandleId> = new Set<HandleId>(["e", "w"]);
const NO_NS: ReadonlySet<HandleId> = new Set<HandleId>(["n", "s"]);
const NO_MID: ReadonlySet<HandleId> = new Set<HandleId>(["n", "s", "e", "w"]);

/**
 * Poignée prise par un appui. Un appui à l'intérieur d'une petite sélection la déplace (CL4-10, D15) : la portée de
 * prise ne dépasse jamais la moitié du plus petit côté écran (bord exclu), et les milieux de côté qui couvriraient
 * le centre (`narrow` : e/w ; `short` : n/s) sont écartés.
 */
function grabbedHandle(frame: Bounds, x: number, y: number, zoom: number): HandleId | null {
  const wPx = (frame.x1 - frame.x0) * zoom;
  const hPx = (frame.y1 - frame.y0) * zoom;
  const reachPx = Math.min(HANDLE_GRAB_PX, Math.min(wPx, hPx) / 2 - EDGE_EPS_PX);
  const narrow = wPx <= 2 * HANDLE_GRAB_PX;
  const short = hPx <= 2 * HANDLE_GRAB_PX;
  const skip = narrow && short ? NO_MID : narrow ? NO_EW : short ? NO_NS : undefined;
  return hitHandle(frame, x, y, reachPx / zoom, skip);
}

export function createSelectTool(ctx: ToolContext): SelectionTool {
  let selection: string[] = [];
  let drag: Drag | null = null;
  let lastTap: (Tap & { id: string }) | null = null;
  let first: InputSample | null = null;
  const one = (): ElementView | null => (selection.length === 1 ? ctx.doc.element(selection[0]!) : null);

  const world = (s: InputSample): [number, number] => screenToWorld(ctx.camera(), s.x, s.y);
  const moved = (d: Drag): boolean => Math.hypot(d.x - d.x0, d.y - d.y0) * d.zoom >= (d.bound ? BOUND_DRAG_PX : DRAG_THRESHOLD_PX);

  /** Vues de la page montrée (C3, Z2), lues au geste, jamais gardées. */
  const pageViews = (): GroupedView[] => viewsOf(ctx.doc, ctx.doc.elementIds(ctx.page()));

  /**
   * Déplacement du glisser (C9, G7, G8) : aimanté depuis le déplacement brut, à chaque image et au relâché (l'aperçu
   * et la Transform écrite sont le même calcul) ; brut si Alt est tenue.
   */
  const moveDelta = (d: Drag): readonly [number, number] => {
    const dx = d.x - d.x0;
    const dy = d.y - d.y0;
    return ctx.alt?.() === true ? [dx, dy] : ctx.doc.snapDelta(ctx.page(), selection, dx, dy);
  };

  /** Matrice provisoire du glisser ; identité tant que le seuil n'est pas franchi. */
  const matrixOf = (d: Drag): Matrix => {
    if (!moved(d)) return IDENTITY_MATRIX;
    if (d.mode === "move") return translateMatrix(...moveDelta(d));
    if (d.mode === "resize" && d.base && d.handle) {
      const [gx, gy] = handlePoint(d.base, d.handle);
      return resizeMatrix(d.base, d.handle, gx + d.x - d.x0, gy + d.y - d.y0, ctx.shift?.() === true);
    }
    return IDENTITY_MATRIX;
  };

  const startDrag = (pointerId: number, mode: Mode, x: number, y: number, extra: { handle?: HandleId; base?: Bounds; reveal?: Reveal; hit?: PointHit; link?: LinkDir; bound?: boolean; target?: string | null; touch?: boolean } = {}): void => {
    drag = {
      pointerId,
      mode,
      x0: x,
      y0: y,
      x,
      y,
      zoom: ctx.camera().zoom,
      handle: extra.handle ?? null,
      base: extra.base ?? null,
      shift: ctx.shift?.() === true,
      reveal: extra.reveal ?? null,
      ...(extra.hit ? { hit: extra.hit } : {}),
      ...(extra.link ? { link: extra.link } : {}),
      bound: extra.bound === true,
      target: extra.target ?? null,
      touch: extra.touch === true,
      t: first?.t ?? 0,
      sx: first?.x ?? 0,
      sy: first?.y ?? 0,
    };
  };

  /** Ligne après le glisser d'une poignée : bout déplacé (aimanté, Maj 15°) et lié sous le doigt, ou point inséré. Les
   *  poignées hors édition n'offrent que les deux bouts : l'indice 1 est le dernier point. */
  const draggedLine = (v: ShapeElement, d: Drag): DraggedLine => {
    const hit = d.hit!;
    const norm: PointHit = hit.kind === "point" && hit.index !== 0 ? { kind: "point", index: worldPoints(v).length - 1 } : hit;
    return dragLine(ctx, v, norm, d.x, d.y, d.zoom, d.touch === true);
  };

  /** Cellule ombrée sous (x, y) monde du tableau `id` (ancre d'une zone), ou null. */
  const shadedCellAt = (id: string, x: number, y: number): Reveal | null => {
    const h = tableAt(ctx.doc, ctx.page(), x, y);
    if (h?.id !== id) return null;
    const r = h.table.rows[h.cell.row];
    const k = h.table.cols[h.cell.col];
    if (r === undefined || k === undefined) return null;
    return cellContent(h.table, r.id, k.id).shade === null ? null : { id, row: r.id, col: k.id };
  };

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (drag !== null || !s) return;
      first = s;
      const [x, y] = world(s);
      const zoom = ctx.camera().zoom;
      const shift = ctx.shift?.() === true;
      const frame = selection.length > 0 ? ctx.doc.bounds(selection) : null;
      const v = one();
      const touch = ctx.pointerType?.() === "touch";
      if (isLine(v)) {
        const { pts, mids } = endHandles(v);
        const hit = pickHandle(pts, x, y, zoom, touch, mids);
        if (hit) {
          startDrag(pointerId, hit.kind === "point" ? "line-end" : "line-mid", x, y, { hit, touch });
          return;
        }
      } else if (isNode(v) && frame) {
        const dir = pickLink(linkHandles(frame, zoom), x, y, zoom);
        if (dir) {
          startDrag(pointerId, "link", x, y, { link: dir });
          return;
        }
      }
      // Poignée cherchée avant hitTest, Maj tenue ou non : Maj sur une poignée = proportions (D15, CL4-11).
      // n° 39 : une ligne seule n'a pas de cadre à 8 poignées.
      const h = frame && !isLine(v) ? grabbedHandle(frame, x, y, zoom) : null;
      if (frame && h) {
        startDrag(pointerId, "resize", x, y, { handle: h, base: frame });
        return;
      }
      const hit = ctx.doc.hitTest(ctx.page(), x, y, SELECT_TOL_PX / zoom);
      if (hit !== null) {
        // F10 : sans Maj, une cellule ombrée du tableau le plus haut est retenue ; le relâché décide.
        const reveal = shift ? null : shadedCellAt(hit, x, y);
        if (reveal !== null) {
          startDrag(pointerId, "tap-shade", x, y, { reveal });
          return;
        }
        const unit = expandToGroups([hit], pageViews()); // C3 : le groupe extérieur entier
        if (shift) {
          selection = selection.includes(hit)
            ? selection.filter((id) => !unit.includes(id))
            : union(selection, unit);
          startDrag(pointerId, "none", x, y);
          return;
        }
        if (!selection.includes(hit)) selection = unit;
        const sel = one();
        startDrag(pointerId, "move", x, y, { bound: isLine(sel) && !!(sel.shape.start || sel.shape.end), target: hit, touch });
        return;
      }
      if (!shift) selection = [];
      startDrag(pointerId, "band", x, y);
    },
    extend(pointerId, samples) {
      const s = samples[samples.length - 1];
      if (!drag || drag.pointerId !== pointerId || !s) return;
      const [x, y] = world(s);
      drag.x = x;
      drag.y = y;
      // F10 : au-delà de 8 px écran, le toucher devient un déplacement depuis le point d'appui.
      if (drag.mode === "tap-shade" && Math.hypot(x - drag.x0, y - drag.y0) * drag.zoom >= REVEAL_TAP_PX) {
        const id = drag.reveal?.id;
        if (id !== undefined && !selection.includes(id)) selection = expandToGroups([id], pageViews());
        drag.mode = "move";
      }
    },
    frame() {
      // rien à pousser : l'aperçu se calcule dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drag;
      if (!d || d.pointerId !== pointerId) return;
      drag = null;
      if (how !== "end") return;
      if (!moved(d)) {
        // Un relâché sans mouvement sur une poignée de la ligne sélectionnée compte comme un toucher sur la ligne.
        const id = d.mode === "move" ? d.target ?? null : d.mode === "line-end" || d.mode === "line-mid" ? selection[0] ?? null : null;
        const cur: Tap = { t: d.t, x: d.sx, y: d.sy };
        const view = id === null ? null : ctx.doc.element(id);
        if (id !== null && lastTap?.id === id && isDoubleTap(lastTap, cur) && isLine(view) && !elbowedOf(view.look)) {
          lastTap = null;
          ctx.editPoints?.(id);
          return;
        }
        lastTap = id === null ? null : { ...cur, id };
      }
      if (d.mode === "link") {
        if (!moved(d) && d.link) {
          const ch = ctx.run({ type: "AddLinked", id: selection[0]!, dir: d.link });
          const copy = ch ? linkedCopy(ctx.doc, ch.ids, selection[0]!) : null;
          if (copy !== null) selection = [copy];
        }
        return;
      }
      if (d.mode === "line-end" || d.mode === "line-mid") {
        const v = one();
        if (!isLine(v) || !moved(d) || !d.hit) return;
        const next = draggedLine(v, d);
        ctx.run({ type: "SetLinePoints", id: v.id, points: next.pts.flat(), start: next.start, end: next.end });
        return;
      }
      if (d.mode === "tap-shade") {
        const r = d.reveal;
        if (r !== null) ctx.run({ type: "SetTableShade", id: r.id, from: { row: r.row, col: r.col }, to: { row: r.row, col: r.col }, shade: null });
        return;
      }
      if (d.mode === "band") {
        const ids = keepWholeGroups(ctx.doc.idsInRect(ctx.page(), norm(d.x0, d.y0, d.x, d.y)), pageViews());
        selection = d.shift ? union(selection, ids) : ids;
        return;
      }
      if (d.mode === "none" || selection.length === 0) return;
      const m = matrixOf(d);
      if (isIdentity(m)) return;
      ctx.run({ type: "Transform", ids: [...selection], matrix: m });
    },
    live(): LivePart {
      const d = drag;
      if (d && d.mode === "band") {
        return { strokes: [], erasers: [], hidden: NONE, overlay: { ...EMPTY_OVERLAY, band: norm(d.x0, d.y0, d.x, d.y) } };
      }
      if (selection.length === 0) return { strokes: [], erasers: [], hidden: NONE };
      const bounds = ctx.doc.bounds(selection);
      const zoom = ctx.camera().zoom;
      const v = one();
      if (isLine(v)) {
        // n° 39 : ligne seule : un point à chaque bout, un milieu ; aucun cadre à 8 poignées.
        if (d && (d.mode === "line-end" || d.mode === "line-mid") && moved(d) && d.hit) {
          const next = draggedLine(v, d);
          const p = next.pts;
          const a = p[0]!;
          const z = p[p.length - 1]!;
          const inner = p.slice(1, -1).flat();
          const preview: ShapePreview = {
            shape: v.shape.shape, x0: a[0], y0: a[1], x1: z[0], y1: z[1], style: v.style, fill: null,
            ...(v.look ? { look: v.look } : {}),
            ...(inner.length > 0 ? { points: inner } : {}),
          };
          const overlay: EditOverlay = { ...EMPTY_OVERLAY, shapes: [preview], points: pointHandles(p, [], zoom, false), bind: next.hint };
          return { strokes: [], erasers: [], hidden: new Set([v.id]), overlay };
        }
        const m = d && d.mode === "move" ? matrixOf(d) : IDENTITY_MATRIX;
        const dragging = !isIdentity(m);
        const { pts, mids } = endHandles(v);
        const overlay: EditOverlay = {
          ...EMPTY_OVERLAY,
          ghosts: dragging ? [{ id: v.id, matrix: m }] : [],
          ...(dragging ? {} : { points: pointHandles(pts, [], zoom, mids) }),
        };
        return { strokes: [], erasers: [], hidden: dragging ? new Set(selection) : NONE, overlay };
      }
      const m = d && (d.mode === "move" || d.mode === "resize") ? matrixOf(d) : IDENTITY_MATRIX;
      const dragging = !isIdentity(m);
      const overlay: EditOverlay = {
        ...EMPTY_OVERLAY,
        ghosts: dragging ? selection.map((id) => ({ id, matrix: m })) : [],
        frame: bounds === null ? null : dragging ? transformBounds(m, bounds) : bounds,
        handles: !dragging,
        ...(isNode(v) && !dragging && bounds ? { links: linkHandles(bounds, zoom) } : {}),
      };
      return { strokes: [], erasers: [], hidden: dragging ? new Set(selection) : NONE, overlay };
    },
    active: () => drag !== null,
    selection: () => selection,
    setSelection(ids) {
      selection = [...ids];
    },
    prune() {
      const present = new Set(ctx.doc.elementIds(ctx.page()));
      selection = selection.filter((id) => present.has(id));
    },
    leave() {
      selection = [];
      drag = null;
    },
  };
}
