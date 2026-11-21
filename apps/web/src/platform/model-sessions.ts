/**
 * Séances 3D d'un onglet (C15, X20, X22, X23, X26, DAX3) : au plus un objet chargé dans le rendu partagé (celui de la
 * séance), sa caméra courante, son image par le port `ModelFrames`, son état pour la barre et l'oracle. Rien n'est écrit
 * ici : la session écrit `SetModel3dView`. Contrairement aux lecteurs de média (un par élément), ouvrir un autre objet
 * libère le précédent, et rien n'est chargé avant `open` (X20).
 */
import { degrees, type ModelCamera, type ModelFrames } from "../engine/render/model-frames";
import type { LoadedModel, ModelSource, ModelView, ModelViewLoader, PixelSize } from "./model-view";

export type ModelState = "instantane" | "chargement" | "orbite" | "sans-webgl" | "echec";
export const MODEL3D_FAILED_MESSAGE = "objet 3D illisible sur ce poste : il garde son image";

export interface ModelSessionDeps {
  readonly views: ModelViewLoader;
  /** Source du modèle `id` (élément et magasin) ; null : illisible (asset absent). */
  source(id: string): ModelSource | null;
  /** Taille du rendu à l'écran pour `id` (`drawSize`). */
  px(id: string): PixelSize;
  redraw(): void;
}

export interface ModelSessions {
  readonly frames: ModelFrames;
  /** Charge l'objet `id` (libère la séance d'un autre) ; vrai s'il est prêt à tourner. */
  open(id: string, view: ModelCamera): Promise<boolean>;
  /** Caméra courante de la séance (aperçu), redessin. */
  look(id: string, v: ModelCamera): void;
  /** PNG de l'objet de la séance à la vue `v` ; null sans séance prête ou sans WebGL. */
  snapshot(id: string, v: ModelCamera, px: PixelSize): Promise<Blob | null>;
  current(): string | null;
  close(): void;
  state(id: string): ModelState;
  onChange(cb: () => void): () => void;
  dispose(): void;
}

interface Session {
  readonly id: string;
  view: ModelView | null;
  model: LoadedModel | null;
  camera: ModelCamera;
  status: "chargement" | "orbite";
}

/** `#stage[data-model3d]` (X36) : "" sans objet ; sinon `<format>;<état>;<yaw°>;<pitch°>`. */
export function model3dTag(m: { readonly format: string } | null, state: ModelState | null, camera: ModelCamera | null): string {
  if (m === null || state === null || camera === null) return "";
  return `${m.format};${state};${degrees(camera.yaw)};${degrees(camera.pitch)}`;
}

export function createModelSessions(deps: ModelSessionDeps): ModelSessions {
  let cur: Session | null = null;
  let noWebgl = false;
  let disposed = false;
  let offLost: (() => void) | null = null;
  const failed = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = (): void => {
    for (const cb of [...listeners]) cb();
  };
  /** Une séance à la fois : le modèle de la séance courante est rendu au rendu partagé. */
  const release = (): void => {
    const s = cur;
    cur = null;
    if (s?.view != null && s.model !== null) s.view.release(s.model);
  };
  /** Sans `load` réussi du rendu, rien n'est connu (PC4) : « Tourner » reste actif jusqu'au premier clic. */
  const unavailable = (): boolean => noWebgl || deps.views.peek()?.available() === false;
  return {
    frames: {
      frame(id) {
        const s = cur;
        if (s === null || s.id !== id || s.status !== "orbite" || s.view === null || s.model === null) return null;
        return s.view.draw(s.model, s.camera, deps.px(id));
      },
    },
    async open(id, view) {
      if (disposed) return false;
      if (cur?.id === id && cur.status === "orbite") {
        cur.camera = view;
        return true;
      }
      release();
      const s: Session = { id, view: null, model: null, camera: view, status: "chargement" };
      cur = s;
      emit();
      try {
        const v = await deps.views.load();
        if (cur !== s) return false;
        offLost ??= v.onLost(() => {
          noWebgl = true;
          release();
          emit();
          deps.redraw();
        });
        if (!v.available()) {
          noWebgl = true;
          cur = null;
          emit();
          return false;
        }
        const src = deps.source(id);
        if (src === null) throw new Error("source de l'objet 3D absente");
        const m = await v.load(src);
        if (cur !== s) {
          v.release(m);
          return false;
        }
        s.view = v;
        s.model = m;
        s.status = "orbite";
        failed.delete(id);
        emit();
        deps.redraw();
        return true;
      } catch {
        if (cur === s) cur = null;
        failed.add(id);
        emit();
        return false;
      }
    },
    look(id, v) {
      if (cur?.id !== id) return;
      cur.camera = v;
      deps.redraw();
    },
    async snapshot(id, v, px) {
      const s = cur;
      if (s === null || s.id !== id || s.view === null || s.model === null) return null;
      return s.view.snapshot(s.model, v, px);
    },
    current: () => cur?.id ?? null,
    close() {
      if (cur === null) return;
      release();
      emit();
      deps.redraw();
    },
    state(id) {
      if (cur?.id === id) return cur.status;
      if (unavailable()) return "sans-webgl";
      return failed.has(id) ? "echec" : "instantane";
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      disposed = true;
      release();
      offLost?.();
      listeners.clear();
    },
  };
}
