/**
 * Stylo (D20, D38) : encre vive par le StrokeBuilder du cœur (un push par image), une seule CommitStroke au relâché.
 * Points prédits (OF44) : passés au builder comme points provisoires, à la pression du dernier point reçu ; le contour
 * vif les couvre avec la géométrie du trait (lissage, largeur), sans queue dessinée à part ni enregistrement. "cancel" (fin anormale, D39) garde l'encre reçue ; "abort" (second doigt, paume) n'écrit rien.
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
  /** Triplets prédits monde du dernier `extend` ; lus par `flush` seulement sur une image qui reçoit des points. */
  ahead: Float32Array;
  /** Vrai quand `outline` couvre des points prédits : à recalculer sans eux sur l'image suivante sans point nouveau. */
  showsAhead: boolean;
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

  /** Un push par image : points reçus, et prédits seulement sur une image qui en reçoit (stylet arrêté, ils s'effacent). */
  const flush = (l: LiveStroke): void => {
    if (l.pending.length === 0 && !l.showsAhead) return;
    const ahead = l.pending.length > 0 ? l.ahead : EMPTY;
    l.outline = l.builder.push(new Float32Array(l.pending), ahead);
    l.showsAhead = ahead.length > 0;
    l.pending = [];
  };

  /** Prédits en triplets monde, à la pression du dernier point reçu : la pointe garde la largeur du trait. */
  const aheadOf = (l: LiveStroke, predicted: readonly InputSample[]): Float32Array => {
    const n = l.all.length;
    if (predicted.length === 0 || n < 3) return EMPTY;
    const cam = ctx.camera();
    const p = l.all[n - 1] ?? 0.5;
    const out: number[] = [];
    for (const s of predicted) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      out.push(x, y, p);
    }
    return out.length > 0 ? new Float32Array(out) : EMPTY;
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
        ahead: EMPTY,
        showsAhead: false,
      };
      strokes.set(pointerId, l);
      add(l, samples);
    },
    extend(pointerId, samples, predicted) {
      const l = strokes.get(pointerId);
      if (!l) return;
      add(l, samples);
      l.ahead = aheadOf(l, predicted);
    },
    frame() {
      for (const l of strokes.values()) flush(l);
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
        views.push({ outline: l.outline, color: l.style.color });
      }
      return { strokes: views, erasers: [], hidden: NONE };
    },
    active: () => strokes.size > 0,
  };
}
