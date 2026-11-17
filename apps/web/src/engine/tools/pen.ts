/**
 * Stylo (D20, D38) : encre vive par le StrokeBuilder du cœur (un push par image), queue prédite provisoire, une seule
 * CommitStroke au relâché. "cancel" (fin anormale, D39) garde l'encre reçue ; "abort" (second doigt, paume) n'écrit rien.
 * Pression (D8, HL3-4) : 0,5 tant qu'aucune valeur hors de {0 ; 0,5} n'a été vue, suivie ensuite.
 */
import type { StrokeBuilderApi, StrokeStyle } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { LiveStrokeView } from "../render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tool";

interface LiveStroke {
  readonly page: string;
  readonly style: StrokeStyle;
  readonly builder: StrokeBuilderApi;
  /** Triplets x, y, pression monde de tout le trait (envoyés au relâché). */
  readonly all: number[];
  /** Triplets reçus depuis la dernière image. */
  pending: number[];
  outline: Float32Array;
  predicted: Float32Array;
}

const EMPTY = new Float32Array(0);
const NONE: ReadonlySet<string> = new Set<string>();

export function createPenTool(ctx: ToolContext, style: () => StrokeStyle): GestureTool {
  const strokes = new Map<number, LiveStroke>();
  let pressureVaries = false;

  const pressureFor = (raw: number): number => {
    const p = Math.min(1, Math.max(0, raw));
    if (pressureVaries) return p;
    if (p !== 0 && p !== 0.5) {
      pressureVaries = true;
      return p;
    }
    return 0.5;
  };

  const add = (l: LiveStroke, samples: readonly InputSample[]): void => {
    const cam = ctx.camera();
    for (const s of samples) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.pressure)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      const p = pressureFor(s.pressure);
      l.pending.push(x, y, p);
      l.all.push(x, y, p);
    }
  };

  const flush = (l: LiveStroke): void => {
    if (l.pending.length === 0) return;
    l.outline = l.builder.push(new Float32Array(l.pending));
    l.pending = [];
  };

  const tail = (l: LiveStroke, predicted: readonly InputSample[]): Float32Array => {
    const n = l.all.length;
    if (predicted.length === 0 || n < 3) return EMPTY;
    const cam = ctx.camera();
    const out: number[] = [l.all[n - 3] ?? 0, l.all[n - 2] ?? 0];
    for (const s of predicted) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      out.push(x, y);
    }
    return out.length >= 4 ? new Float32Array(out) : EMPTY;
  };

  return {
    begin(pointerId, samples) {
      const st = style();
      const l: LiveStroke = {
        page: ctx.page(),
        style: st,
        builder: ctx.doc.newStrokeBuilder(st),
        all: [],
        pending: [],
        outline: EMPTY,
        predicted: EMPTY,
      };
      strokes.set(pointerId, l);
      add(l, samples);
    },
    extend(pointerId, samples, predicted) {
      const l = strokes.get(pointerId);
      if (!l) return;
      add(l, samples);
      l.predicted = tail(l, predicted);
    },
    frame() {
      for (const l of strokes.values()) {
        // Queue prédite seulement sur une image qui reçoit des points : stylet arrêté, elle s'efface (lot 1).
        if (l.pending.length === 0) l.predicted = EMPTY;
        else flush(l);
      }
    },
    close(pointerId: number, how: CloseReason) {
      const l = strokes.get(pointerId);
      if (!l) return;
      strokes.delete(pointerId);
      l.builder.free();
      if (how === "abort" || l.all.length < 3) return;
      ctx.run({ type: "CommitStroke", page: l.page, points: new Float32Array(l.all), style: l.style });
    },
    live(): LivePart {
      const views: LiveStrokeView[] = [];
      for (const l of strokes.values()) {
        views.push({ outline: l.outline, predicted: l.predicted, color: l.style.color, width: l.style.width });
      }
      return { strokes: views, erasers: [], hidden: NONE };
    },
    active: () => strokes.size > 0,
  };
}
