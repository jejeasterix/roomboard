/**
 * Routeur d'entrées (D18) : pour chaque geste de l'échantillonneur, tracer, déplacer la vue, pincer ou ignorer.
 * Un geste par pointerId. Stylet et souris tracent avec l'outil courant (bouton gomme du stylet : gomme). Doigt : trace
 * tant qu'aucun stylet n'a été vu (ENI sans stylet), sinon déplace la vue (réglable). Un second doigt posé dans les
 * 150 ms du premier annule le trait commencé (rien d'écrit) et passe en pincement. L'outil d'un geste est fixé au début.
 * Outil main ou espace tenu : tout geste déplace la vue (D17).
 */
import type { CloseReason, DrawTool, GestureSink, ToolChoice, ViewSink } from "./gesture";
import type { GestureEvent, InputSample } from "./sampler";

export const SECOND_FINGER_MS = 150;

export interface RouterOptions {
  /** Après un stylet vu dans la séance, le doigt seul déplace la vue au lieu de tracer (D18, réglable). */
  readonly fingerPansAfterPen: boolean;
  readonly secondFingerMs: number;
}

export const DEFAULT_ROUTER_OPTIONS: RouterOptions = { fingerPansAfterPen: true, secondFingerMs: SECOND_FINGER_MS };

export interface RouterDeps {
  /** Outil courant ; "hand" (outil main, D17) : tout geste déplace la vue. */
  currentTool(): ToolChoice;
  /** Barre d'espace tenue (D17) : lue au début du geste ; absent = jamais tenue. */
  panHeld?(): boolean;
  readonly gestures: GestureSink;
  readonly view: ViewSink;
}

export interface Router {
  handle(g: GestureEvent): void;
  penSeen(): boolean;
  /**
   * Rôle du geste en cours de ce pointeur : "ink" (trace), "erase" (gomme), "view" (déplacement ou pincement de la vue),
   * null (inconnu, ignoré, annulé ou fini). Source unique pour la traînée déléguée (échelon 3).
   */
  roleOf(pointerId: number): "ink" | "erase" | "edit" | "view" | null;
}

type Role = "draw" | "pan" | "pinch" | "ignored";

interface Track {
  role: Role;
  tool: DrawTool;
  readonly pointerType: string;
  readonly startT: number;
  x: number;
  y: number;
}

const lastOf = (samples: readonly InputSample[]): InputSample | undefined => samples[samples.length - 1];

export function createRouter(opts: RouterOptions, deps: RouterDeps): Router {
  const tracks = new Map<number, Track>();
  let seenPen = false;

  const touches = (role: Role): [number, Track][] =>
    [...tracks].filter(([, t]) => t.pointerType === "touch" && t.role === role);

  const pinchPair = (): [Track, Track] | null => {
    const p = touches("pinch");
    const a = p[0];
    const b = p[1];
    return a && b ? [a[1], b[1]] : null;
  };

  const onStart = (g: GestureEvent): void => {
    const s = g.samples[0];
    if (!s) return;
    const track: Track = { role: "ignored", tool: "pen", pointerType: g.pointerType, startT: s.t, x: s.x, y: s.y };
    tracks.set(g.pointerId, track);
    if (g.pointerType === "pen") seenPen = true;
    const tool = deps.currentTool();
    const held = deps.panHeld?.() === true;
    if (g.pointerType !== "touch") {
      if (tool === "hand" || held) {
        track.role = "pan";
        return;
      }
      track.role = "draw";
      track.tool = g.eraserButton ? "eraser" : tool;
      deps.gestures.begin(g.pointerId, track.tool, g.samples, g.pointerType);
      return;
    }
    if (pinchPair()) return; // troisième doigt : ignoré
    const drawing = touches("draw")[0];
    const panning = touches("pan")[0];
    if (drawing && s.t - drawing[1].startT <= opts.secondFingerMs) {
      deps.gestures.close(drawing[0], "abort");
      drawing[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (panning) {
      panning[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (drawing) return; // second doigt tardif : ignoré, le trait continue
    if (tool === "hand" || held || (seenPen && opts.fingerPansAfterPen)) {
      track.role = "pan";
      return;
    }
    track.role = "draw";
    track.tool = tool;
    deps.gestures.begin(g.pointerId, tool, g.samples, g.pointerType);
  };

  const onMove = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    const s = lastOf(g.samples);
    if (!t || !s) return;
    if (t.role === "draw") {
      deps.gestures.extend(g.pointerId, g.samples, g.predicted);
    } else if (t.role === "pan") {
      deps.view.panBy(s.x - t.x, s.y - t.y);
    } else if (t.role === "pinch") {
      const pair = pinchPair();
      if (pair) {
        const [a, b] = pair;
        const cx0 = (a.x + b.x) / 2;
        const cy0 = (a.y + b.y) / 2;
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        t.x = s.x;
        t.y = s.y;
        const cx1 = (a.x + b.x) / 2;
        const cy1 = (a.y + b.y) / 2;
        const d1 = Math.hypot(a.x - b.x, a.y - b.y);
        deps.view.panBy(cx1 - cx0, cy1 - cy0);
        if (d0 > 0 && d1 > 0) deps.view.zoomAt(cx1, cy1, d1 / d0);
      }
    }
    t.x = s.x;
    t.y = s.y;
  };

  const onClose = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    if (!t) return;
    tracks.delete(g.pointerId);
    if (t.role === "draw") {
      const how: CloseReason = g.palm === true ? "abort" : g.kind === "cancel" ? "cancel" : "end";
      deps.gestures.close(g.pointerId, how);
    } else if (t.role === "pinch") {
      for (const [, other] of touches("pinch")) other.role = "ignored";
    }
  };

  return {
    handle(g) {
      if (g.kind === "start") onStart(g);
      else if (g.kind === "move") onMove(g);
      else onClose(g);
    },
    penSeen: () => seenPen,
    roleOf(pointerId) {
      const t = tracks.get(pointerId);
      if (!t) return null;
      if (t.role === "draw") return t.tool === "eraser" ? "erase" : t.tool === "pen" ? "ink" : "edit";
      return t.role === "pan" || t.role === "pinch" ? "view" : null;
    },
  };
}
