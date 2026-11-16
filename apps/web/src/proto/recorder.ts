/** Enregistreur du banc : traits vifs pendant le geste, mesure par trait au relâché (D30). */
import type { GestureEvent, InputSample } from "../engine/input/sampler";
import type { BenchOptions, StrokeMeasure } from "../engine/input/stats";

export interface LiveStroke {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly eraserButton: boolean;
  readonly points: readonly InputSample[];
  readonly predicted: readonly InputSample[];
  readonly drawn: number;
}

/** Encre d'un trait fini, gardée pour la redessiner quand les canvas changent de taille. */
export interface InkStroke {
  readonly points: readonly InputSample[];
  readonly eraserButton: boolean;
}

export interface Recorder {
  handle(g: GestureEvent): void;
  live(): readonly LiveStroke[];
  /** Encre des traits finis, dans l'ordre ; un trait au bouton gomme interrompu n'en laisse pas (D39). */
  ink(): readonly InkStroke[];
  /** Efface l'encre à redessiner, garde les mesures (bouton « Effacer la page »). */
  clearInk(): void;
  markDrawn(now: number): void;
  strokes(): readonly StrokeMeasure[];
  setOptions(o: BenchOptions): void;
  reset(): void;
}

interface Building {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly options: BenchOptions;
  readonly points: InputSample[];
  readonly moveTimes: number[];
  readonly latencies: number[];
  predicted: readonly InputSample[];
  eraserButton: boolean;
  drawn: number;
}

export function createRecorder(options: BenchOptions): Recorder {
  let current = options;
  const building = new Map<number, Building>();
  let done: StrokeMeasure[] = [];
  let inked: InkStroke[] = [];

  const finish = (b: Building, cancelled: boolean, palm: boolean): StrokeMeasure => ({
    pointerType: b.pointerType,
    options: b.options,
    pressures: b.points.map((p) => p.pressure),
    tiltX: b.points.map((p) => p.tiltX),
    tiltY: b.points.map((p) => p.tiltY),
    moveTimes: b.moveTimes.slice(),
    sampleTimes: b.points.map((p) => p.t),
    latencies: b.latencies.slice(),
    eraserSeen: b.eraserButton,
    cancelled,
    palm,
  });

  return {
    handle(g) {
      if (g.kind === "start") {
        building.set(g.pointerId, {
          pointerId: g.pointerId,
          pointerType: g.pointerType,
          options: current,
          points: [...g.samples],
          moveTimes: [],
          latencies: [],
          predicted: [],
          eraserButton: g.eraserButton,
          drawn: 0,
        });
        return;
      }
      const b = building.get(g.pointerId);
      if (!b) return;
      if (g.eraserButton) b.eraserButton = true;
      if (g.kind === "move") {
        b.points.push(...g.samples);
        const last = g.samples[g.samples.length - 1];
        if (last) b.moveTimes.push(last.t);
        b.predicted = g.predicted;
        return;
      }
      building.delete(g.pointerId);
      const cancelled = g.kind === "cancel";
      done.push(finish(b, cancelled, cancelled && g.palm === true));
      if (!(cancelled && b.eraserButton)) inked.push({ points: b.points, eraserButton: b.eraserButton });
    },
    live() {
      return [...building.values()];
    },
    markDrawn(now) {
      for (const b of building.values()) {
        for (let i = b.drawn; i < b.points.length; i++) {
          const p = b.points[i];
          if (p) b.latencies.push(now - p.t);
        }
        b.drawn = b.points.length;
      }
    },
    ink() {
      return inked.slice();
    },
    clearInk() {
      inked = [];
    },
    strokes() {
      return done.slice();
    },
    setOptions(o) {
      current = o;
    },
    reset() {
      building.clear();
      done = [];
      inked = [];
    },
  };
}
