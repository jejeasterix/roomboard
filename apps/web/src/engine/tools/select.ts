/**
 * Outil Sélection (D15, D38, CL4-10, CL4-11) : clic = l'élément le plus haut (6 px écran), Maj = ajouter ou retirer,
 * glisser dans le vide = rectangle (éléments entièrement inclus), glisser un élément = le déplacer, 8 poignées =
 * redimensionner autour de la poignée opposée (Maj : proportions). Aperçu : éléments masqués de la scène et redessinés
 * en fantômes avec la matrice provisoire (CL4-1) ; une seule Transform au relâché ; "cancel" et "abort" n'écrivent
 * rien (D39) ; un clic sans glisser (< 2 px écran) non plus. Un seul pointeur à la fois (CL4-14).
 * C10b (F10) : un toucher sans glisser (< 8 px écran, REVEAL_TAP_PX), sans Maj, sur une cellule ombrée du tableau le plus
 * haut sous le point la révèle (SetTableShade à null, une étape), sélection inchangée ; au-delà, le glisser sélectionne et déplace.
 */
import type { Bounds, Matrix } from "../../core/api";
import { applyMatrix, IDENTITY_MATRIX, invertMatrix } from "../../core/shapes";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { EMPTY_OVERLAY, type EditOverlay } from "../render/overlay";
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
import { cellAt, cellContent } from "../table-geom";
import type { LivePart, SelectionTool, ToolContext } from "./tool";

export const SELECT_TOL_PX = 6;
export const DRAG_THRESHOLD_PX = 2;
/** Toucher qui révèle un ombrage (F10, HB-24) : seuil propre, le glisser de 2 px est trop petit au doigt. */
export const REVEAL_TAP_PX = 8;

type Mode = "move" | "resize" | "band" | "none" | "tap-shade";

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
}

const NONE: ReadonlySet<string> = new Set<string>();
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

  const world = (s: InputSample): [number, number] => screenToWorld(ctx.camera(), s.x, s.y);
  const moved = (d: Drag): boolean => Math.hypot(d.x - d.x0, d.y - d.y0) * d.zoom >= DRAG_THRESHOLD_PX;

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

  const startDrag = (pointerId: number, mode: Mode, x: number, y: number, extra: { handle?: HandleId; base?: Bounds; reveal?: Reveal } = {}): void => {
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
    };
  };

  /** Cellule ombrée sous (x, y) monde du tableau `id` (ancre d'une zone), ou null. */
  const shadedCellAt = (id: string, x: number, y: number): Reveal | null => {
    const el = ctx.doc.element(id);
    if (el?.kind !== "table") return null;
    const inv = invertMatrix(el.transform);
    if (inv === null) return null;
    const [lx, ly] = applyMatrix(inv, x, y);
    const c = cellAt(el.table, lx, ly);
    const r = c === null ? undefined : el.table.rows[c.row];
    const k = c === null ? undefined : el.table.cols[c.col];
    if (r === undefined || k === undefined) return null;
    return cellContent(el.table, r.id, k.id).shade === null ? null : { id, row: r.id, col: k.id };
  };

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (drag !== null || !s) return;
      const [x, y] = world(s);
      const zoom = ctx.camera().zoom;
      const shift = ctx.shift?.() === true;
      const frame = selection.length > 0 ? ctx.doc.bounds(selection) : null;
      // Poignée cherchée avant hitTest, Maj tenue ou non : Maj sur une poignée = proportions (D15, CL4-11).
      const h = frame ? grabbedHandle(frame, x, y, zoom) : null;
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
        if (shift) {
          selection = selection.includes(hit) ? selection.filter((id) => id !== hit) : [...selection, hit];
          startDrag(pointerId, "none", x, y);
          return;
        }
        if (!selection.includes(hit)) selection = [hit];
        startDrag(pointerId, "move", x, y);
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
        if (id !== undefined && !selection.includes(id)) selection = [id];
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
      if (d.mode === "tap-shade") {
        const r = d.reveal;
        if (r !== null) ctx.run({ type: "SetTableShade", id: r.id, from: { row: r.row, col: r.col }, to: { row: r.row, col: r.col }, shade: null });
        return;
      }
      if (d.mode === "band") {
        const ids = ctx.doc.idsInRect(ctx.page(), norm(d.x0, d.y0, d.x, d.y));
        selection = d.shift ? [...selection, ...ids.filter((id) => !selection.includes(id))] : ids;
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
      const m = d && (d.mode === "move" || d.mode === "resize") ? matrixOf(d) : IDENTITY_MATRIX;
      const dragging = !isIdentity(m);
      const overlay: EditOverlay = {
        ...EMPTY_OVERLAY,
        ghosts: dragging ? selection.map((id) => ({ id, matrix: m })) : [],
        frame: bounds === null ? null : dragging ? transformBounds(m, bounds) : bounds,
        handles: !dragging,
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
