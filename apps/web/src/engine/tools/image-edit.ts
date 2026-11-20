/**
 * Séance de retouche d'une image (C5, DAI4, I27-I30) : aperçu non écrit (`Renderer.setImagePreview`), rognage par un
 * cadre à huit poignées, pipette, écritures `SetImageParams` (une étape chacune, matrice par `placeAfter`). Le moteur lui
 * passe les gestes de la scène pendant le rognage et la pipette (l'outil publié reste `select`) et Échap, Entrée, Suppr,
 * Ctrl+Z, Ctrl+Y (I28). Le brouillon des pixels survit aux écritures géométriques (Retourner, Tourner, Valider le
 * rognage), qui n'écrivent que la géométrie avec les pixels du document (I27). C6b étendra `restore` (`sourceAsset`).
 */
import type { Bounds, ImageData, ImageElement, ImageParams, Matrix } from "../../core/api";
import { cropFromDisplay, cropOf, displaySize, displayToSource, frameOf, geometryOf, paramsOf, pixelsOf, placeAfter } from "../../core/image-params";
import { applyMatrix, invertMatrix } from "../../core/shapes";
import { screenToWorld } from "../camera";
import type { InputSample } from "../input/sampler";
import type { ImagePreview } from "../render/renderer";
import { HANDLE_GRAB_PX, hitHandle, type HandleId } from "./handles";
import { NO_LIVE, type GestureTool, type ToolContext } from "./tool";

export interface ImageEdit {
  readonly id: string;
  /** Brouillon (luminosité, contraste, couleur transparente) montré en aperçu ; null : aucun. Rien n'est écrit. */
  preview(p: ImageParams | null): void;
  /** Arme la pipette : couleur `#rrggbb` d'origine du prochain appui sur l'image ; null si désarmée. */
  pick(): Promise<string | null>;
  startCrop(): void;
  /** Sort du rognage ; `apply` : écrit le cadre (une étape). Vrai si écrit. */
  finishCrop(apply: boolean): boolean;
  /** Retourner, Tourner : géométrie de `next`, pixels du document ; vrai si écrit (ou déjà dans cet état). */
  geometry(next: ImageParams): boolean;
  /** « Valider » : pixels de `p`, géométrie du document ; vrai si écrit (ou déjà dans cet état). */
  commit(p: ImageParams): boolean;
  /** « Rétablir l'original » : tous les réglages retirés. */
  restore(): boolean;
  mode(): "idle" | "crop" | "pick";
  /** Vrai si l'écriture de la version `v` vient d'une retouche géométrique de cette séance (I27, I31). */
  keepsDraft(v: number): boolean;
  close(): void;
}

export interface ImageEditDeps {
  readonly ctx: ToolContext;
  readonly id: string;
  setPreview(p: ImagePreview | null): void;
  colorAt(asset: string, x: number, y: number): string | null;
  /** Séance fermée : le moteur l'oublie. */
  closed(): void;
}

export interface ImageEditSession extends ImageEdit {
  /** Gestes de la scène pendant le rognage et la pipette. */
  readonly gesture: GestureTool;
  /** Échap pendant un mode : en sort sans écrire. */
  cancelMode(): void;
  /** Le document a changé (version `v`) : si l'écriture n'est pas une retouche géométrique de la séance, le brouillon est jeté (I31). */
  changed(v: number): void;
}

export type Drag = { readonly handle: HandleId | "move"; readonly start: readonly [number, number]; readonly from: Bounds };

/** Cadre après un glissé de (dx, dy) depuis `d.from` (boîte affichée de l'image entière) : poignée = bords qu'elle tient,
 *  intérieur = déplacement ; borné à (0, 0)-(bw, bh), une unité au moins (I28). */
export function dragFrame(d: Drag, dx: number, dy: number, bw: number, bh: number): Bounds {
  const f = d.from;
  if (d.handle === "move") {
    const w = f.x1 - f.x0;
    const h = f.y1 - f.y0;
    const x0 = Math.min(Math.max(0, f.x0 + dx), bw - w);
    const y0 = Math.min(Math.max(0, f.y0 + dy), bh - h);
    return { x0, y0, x1: x0 + w, y1: y0 + h };
  }
  const k = d.handle;
  return {
    x0: k.includes("w") ? Math.min(Math.max(0, f.x0 + dx), f.x1 - 1) : f.x0,
    y0: k.includes("n") ? Math.min(Math.max(0, f.y0 + dy), f.y1 - 1) : f.y0,
    x1: k.includes("e") ? Math.max(Math.min(bw, f.x1 + dx), f.x0 + 1) : f.x1,
    y1: k.includes("s") ? Math.max(Math.min(bh, f.y1 + dy), f.y0 + 1) : f.y1,
  };
}

/** Géométrie sans rognage : l'image entière montrée pendant le rognage. */
const uncropped = (p: ImageParams): ImageParams => geometryOf({ ...p, crop: undefined });

export function createImageEdit(deps: ImageEditDeps): ImageEditSession {
  const { ctx, id } = deps;
  let pixelDraft: ImageParams | null = null;
  let crop: { frame: Bounds; readonly full: ImageData; readonly matrix: Matrix } | null = null;
  let picking: ((c: string | null) => void) | null = null;
  let drag: Drag | null = null;
  let writing = false;
  let open = true;
  const own = new Set<number>();

  const current = (): ImageElement | null => {
    const el = ctx.doc.element(id);
    return el?.kind === "image" ? el : null;
  };
  /** Aperçu posé : rognage (image entière et cadre), sinon brouillon sur la géométrie du document, sinon aucun. */
  function refresh(): void {
    const el = current();
    if (el === null || (crop === null && pixelDraft === null)) deps.setPreview(null);
    else if (crop !== null) {
      const pix = pixelDraft ?? pixelsOf(paramsOf(el.image));
      deps.setPreview({ id, params: { ...uncropped(paramsOf(el.image)), ...pix }, matrix: crop.matrix, frame: crop.frame });
    } else deps.setPreview({ id, params: { ...geometryOf(paramsOf(el.image)), ...(pixelDraft ?? {}) }, matrix: el.transform });
    ctx.requestFrame?.();
  }
  function write(params: ImageParams, geometric: boolean): boolean {
    const el = current();
    if (el === null) return false;
    writing = geometric;
    const change = ctx.run({ type: "SetImageParams", id, params, matrix: placeAfter(el.transform, el.image, params) });
    writing = false;
    if (change !== null && geometric) own.add(change.version);
    return change !== null;
  }
  function disarm(): void {
    const p = picking;
    picking = null;
    if (p !== null) {
      p(null);
      ctx.stateChanged?.();
    }
  }
  const local = (s: InputSample, m: Matrix): [number, number] | null => {
    const inv = invertMatrix(m);
    return inv === null ? null : applyMatrix(inv, ...screenToWorld(ctx.camera(), s.x, s.y));
  };
  /** Portée de prise des poignées en unités de la boîte affichée (12 px écran). */
  const reach = (m: Matrix): number => {
    const k = ctx.camera().zoom * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    return k > 0 ? HANDLE_GRAB_PX / k : HANDLE_GRAB_PX;
  };

  const gesture: GestureTool = {
    begin(_pointerId, samples) {
      const s = samples[0];
      if (s === undefined) return;
      if (picking !== null) {
        const el = current();
        const p = el === null ? null : local(s, el.transform);
        if (el === null || p === null) return;
        const [bw, bh] = displaySize(el.image);
        if (p[0] < 0 || p[1] < 0 || p[0] > bw || p[1] > bh) return; // hors de l'image : la pipette reste armée
        const [sx, sy] = displayToSource(el.image, p[0], p[1]);
        const c = deps.colorAt(el.image.asset, Math.min(el.image.w - 1, Math.floor(sx)), Math.min(el.image.h - 1, Math.floor(sy)));
        if (c === null) return; // bitmap pas prêt : la pipette reste armée
        const done = picking;
        picking = null;
        done(c);
        ctx.stateChanged?.();
        return;
      }
      if (crop === null) return;
      const p = local(s, crop.matrix);
      if (p === null) return;
      const f = crop.frame;
      const h = hitHandle(f, p[0], p[1], reach(crop.matrix));
      if (h !== null) drag = { handle: h, start: p, from: f };
      else if (p[0] >= f.x0 && p[0] <= f.x1 && p[1] >= f.y0 && p[1] <= f.y1) drag = { handle: "move", start: p, from: f };
    },
    extend(_pointerId, samples) {
      const s = samples[samples.length - 1];
      if (drag === null || crop === null || s === undefined) return;
      const p = local(s, crop.matrix);
      if (p === null) return;
      const [bw, bh] = displaySize(crop.full);
      crop.frame = dragFrame(drag, p[0] - drag.start[0], p[1] - drag.start[1], bw, bh);
      refresh();
    },
    frame() {},
    close() {
      drag = null;
    },
    live: () => NO_LIVE,
    active: () => drag !== null,
  };

  const session: ImageEditSession = {
    id,
    gesture,
    preview(p) {
      pixelDraft = p === null ? null : pixelsOf(p);
      refresh();
    },
    pick() {
      if (picking !== null) {
        disarm();
        return Promise.resolve(null);
      }
      if (crop !== null || current() === null) return Promise.resolve(null);
      const armed = new Promise<string | null>((resolve) => (picking = resolve));
      ctx.stateChanged?.();
      return armed;
    },
    startCrop() {
      const el = current();
      if (el === null || crop !== null) return;
      disarm();
      const geom = uncropped(paramsOf(el.image));
      const full: ImageData = { asset: el.image.asset, w: el.image.w, h: el.image.h, ...geom };
      crop = { full, matrix: placeAfter(el.transform, el.image, geom), frame: frameOf(full, cropOf(el.image)) };
      refresh();
      ctx.stateChanged?.();
    },
    finishCrop(apply) {
      if (crop === null) return false;
      const c = cropFromDisplay(crop.full, crop.frame);
      crop = null;
      drag = null;
      const el = current();
      const ok = apply && el !== null && write({ ...geometryOf({ ...paramsOf(el.image), crop: c }), ...pixelsOf(paramsOf(el.image)) }, true);
      refresh();
      ctx.stateChanged?.();
      return ok;
    },
    geometry(next) {
      const el = current();
      if (el === null) return false;
      const ok = write({ ...geometryOf(next), ...pixelsOf(paramsOf(el.image)) }, true);
      refresh();
      return ok;
    },
    commit(p) {
      const el = current();
      if (el === null) return false;
      const ok = write({ ...geometryOf(paramsOf(el.image)), ...pixelsOf(p) }, false);
      if (ok) pixelDraft = null;
      refresh();
      return ok;
    },
    restore() {
      session.cancelMode();
      const ok = write({}, false);
      if (ok) pixelDraft = null;
      refresh();
      return ok;
    },
    mode: () => (crop !== null ? "crop" : picking !== null ? "pick" : "idle"),
    keepsDraft: (v) => writing || own.has(v),
    changed(v) {
      if (!open || writing || own.has(v)) return;
      pixelDraft = null;
      refresh();
    },
    cancelMode() {
      if (crop !== null) session.finishCrop(false);
      else disarm();
    },
    close() {
      if (!open) return;
      open = false;
      disarm();
      crop = null;
      drag = null;
      pixelDraft = null;
      deps.setPreview(null);
      ctx.requestFrame?.();
      deps.closed();
    },
  };
  return session;
}
