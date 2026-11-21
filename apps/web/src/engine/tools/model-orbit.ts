/**
 * Séance d'orbite d'un objet 3D (C15, X21, X23) : tant qu'elle est ouverte, le moteur lui passe les gestes de la scène
 * (l'outil publié reste `select`). Un glisser tourne la caméra ; le relâché valide (`onCommit`, une écriture côté
 * session) ; un abandon rend la vue d'avant le geste. Rien n'est écrit ici (PC2).
 */
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { clampCamera, DEFAULT_CAMERA, ORBIT_RAD_PER_PX, type ModelCamera } from "../render/model-frames";
import { NO_LIVE, type GestureTool } from "./tool";

export interface ModelOrbitDeps {
  readonly id: string;
  /** Vue de départ : celle de l'élément. */
  readonly view: ModelCamera;
  /** Vue pendant le geste (aperçu, rien d'écrit). */
  onView(v: ModelCamera): void;
  /** Vue validée (relâché, « Vue initiale ») : la session écrit `SetModel3dView`. */
  onCommit(v: ModelCamera): void;
  /** Séance fermée : le moteur l'oublie. */
  closed(): void;
}

export interface ModelOrbit {
  readonly id: string;
  view(): ModelCamera;
  /** « Vue initiale » : vue par défaut, validée si elle diffère. */
  reset(): void;
  close(): void;
}

export interface ModelOrbitSession extends ModelOrbit {
  readonly gesture: GestureTool;
}

const same = (a: ModelCamera, b: ModelCamera): boolean => a.yaw === b.yaw && a.pitch === b.pitch;

export function createModelOrbit(deps: ModelOrbitDeps): ModelOrbitSession {
  let view = deps.view;
  let before = view;
  let pointer: number | null = null;
  let last: InputSample | null = null;
  let open = true;
  const gesture: GestureTool = {
    begin(id, samples) {
      if (!open || pointer !== null) return;
      pointer = id;
      before = view;
      last = samples[samples.length - 1] ?? null;
    },
    extend(id, samples) {
      if (id !== pointer) return;
      for (const s of samples) {
        if (last !== null) {
          view = clampCamera({ yaw: view.yaw + (s.x - last.x) * ORBIT_RAD_PER_PX, pitch: view.pitch + (s.y - last.y) * ORBIT_RAD_PER_PX });
        }
        last = s;
      }
      deps.onView(view);
    },
    frame() {},
    close(id, how: CloseReason) {
      if (id !== pointer) return;
      pointer = null;
      last = null;
      if (how === "end") {
        if (!same(view, before)) deps.onCommit(view);
      } else {
        view = before;
        deps.onView(view);
      }
    },
    live: () => NO_LIVE,
    active: () => pointer !== null,
  };
  return {
    id: deps.id,
    gesture,
    view: () => view,
    reset() {
      if (!open) return;
      const was = view;
      view = DEFAULT_CAMERA;
      deps.onView(view);
      if (!same(was, view)) deps.onCommit(view);
    },
    close() {
      if (!open) return;
      open = false;
      if (pointer !== null) {
        pointer = null;
        view = before;
      }
      deps.closed();
    },
  };
}
