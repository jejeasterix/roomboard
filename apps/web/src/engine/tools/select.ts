/**
 * Outil Sélection (D15, D38, CL4-10, CL4-11) : clic = l'élément le plus haut (6 px écran), Maj = ajouter ou retirer,
 * glisser dans le vide = rectangle (éléments entièrement inclus), glisser un élément = le déplacer, 8 poignées =
 * redimensionner autour de la poignée opposée (Maj : proportions). Aperçu : éléments masqués de la scène et redessinés
 * en fantômes avec la matrice provisoire (CL4-1) ; une seule Transform au relâché ; "cancel" et "abort" n'écrivent
 * rien (D39) ; un clic sans glisser (< 2 px écran) non plus. Un seul pointeur à la fois (CL4-14).
 */
import type { Bounds, Matrix } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { EMPTY_OVERLAY, type EditOverlay } from "../render/overlay";
import {
  HANDLE_GRAB_PX,
  handlePoint,
  handlesOf,
  isIdentity,
  resizeMatrix,
  transformBounds,
  translateMatrix,
  type HandleId,
} from "./handles";
import type { LivePart, SelectionTool, ToolContext } from "./tool";

export const SELECT_TOL_PX = 6;
export const DRAG_THRESHOLD_PX = 2;

type Mode = "move" | "resize" | "band" | "none";

interface Drag {
  readonly pointerId: number;
  readonly mode: Mode;
  readonly x0: number;
  readonly y0: number;
  x: number;
  y: number;
  readonly zoom: number;
  readonly handle: HandleId | null;
  readonly base: Bounds | null;
  readonly shift: boolean;
}

const NONE: ReadonlySet<string> = new Set<string>();
const IDENT: Matrix = [1, 0, 0, 1, 0, 0];
const norm = (ax: number, ay: number, bx: number, by: number): Bounds => ({
  x0: Math.min(ax, bx),
  y0: Math.min(ay, by),
  x1: Math.max(ax, bx),
  y1: Math.max(ay, by),
});

/**
 * Poignée prise par un appui (portée `reach` en unités monde, bord exclu). Sur un cadre dont un côté écran est plus
 * petit que deux fois la zone de prise, les poignées de milieu de ces côtés sont écartées : elles couvriraient le
 * centre et l'appui déplacerait au lieu de redimensionner (CL4-11).
 */
function grabbedHandle(frame: Bounds, x: number, y: number, zoom: number): HandleId | null {
  const reach = HANDLE_GRAB_PX / zoom;
  const narrow = (frame.x1 - frame.x0) * zoom <= 2 * HANDLE_GRAB_PX;
  const short = (frame.y1 - frame.y0) * zoom <= 2 * HANDLE_GRAB_PX;
  let best: HandleId | null = null;
  let bestD = reach;
  for (const h of handlesOf(frame)) {
    if (narrow && (h.id === "n" || h.id === "s")) continue;
    if (short && (h.id === "e" || h.id === "w")) continue;
    const d = Math.max(Math.abs(h.x - x), Math.abs(h.y - y));
    if (d < bestD) {
      best = h.id;
      bestD = d;
    }
  }
  return best;
}

export function createSelectTool(ctx: ToolContext): SelectionTool {
  let selection: string[] = [];
  let drag: Drag | null = null;

  const world = (s: InputSample): [number, number] => screenToWorld(ctx.camera(), s.x, s.y);
  const moved = (d: Drag): boolean => Math.hypot(d.x - d.x0, d.y - d.y0) * d.zoom >= DRAG_THRESHOLD_PX;

  /** Matrice provisoire du glisser ; identité tant que le seuil n'est pas franchi. */
  const matrixOf = (d: Drag): Matrix => {
    if (!moved(d)) return IDENT;
    if (d.mode === "move") return translateMatrix(d.x - d.x0, d.y - d.y0);
    if (d.mode === "resize" && d.base && d.handle) {
      const [gx, gy] = handlePoint(d.base, d.handle);
      return resizeMatrix(d.base, d.handle, gx + d.x - d.x0, gy + d.y - d.y0, ctx.shift?.() === true);
    }
    return IDENT;
  };

  const startDrag = (pointerId: number, mode: Mode, x: number, y: number, extra: { handle?: HandleId; base?: Bounds } = {}): void => {
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
    };
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
    },
    frame() {
      // rien à pousser : l'aperçu se calcule dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drag;
      if (!d || d.pointerId !== pointerId) return;
      drag = null;
      if (how !== "end") return;
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
      const m = d && (d.mode === "move" || d.mode === "resize") ? matrixOf(d) : IDENT;
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
