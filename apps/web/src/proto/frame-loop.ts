/** Boucle d'image du banc : un rappel par image tant qu'elle tourne, intervalles mesurés (D30). */

export interface FrameLoopDeps {
  requestFrame(cb: (ts: number) => void): number;
  cancelFrame(id: number): void;
  now(): number;
}

export interface FrameLoop {
  start(): void;
  stop(): void;
  running(): boolean;
  durations(): number[];
  clear(): void;
}

/**
 * `maxDurations` : au plus N durées gardées, les plus récentes (retrait par paquets : coût amorti constant, jamais plus
 * de 2 × N en mémoire). Absent, nul, négatif ou non fini : toutes (banc du lot 1).
 */
export function createFrameLoop(
  deps: FrameLoopDeps,
  onFrame: (now: number) => void,
  maxDurations: number = Number.POSITIVE_INFINITY,
): FrameLoop {
  const cap = Number.isFinite(maxDurations) && maxDurations >= 1 ? Math.floor(maxDurations) : Number.POSITIVE_INFINITY;
  let id: number | null = null;
  let last: number | null = null;
  let measured: number[] = [];

  const tick = (): void => {
    const now = deps.now();
    if (last !== null) {
      measured.push(now - last);
      if (measured.length > 2 * cap) measured.splice(0, measured.length - cap);
    }
    last = now;
    id = deps.requestFrame(tick);
    onFrame(now);
  };

  return {
    start() {
      if (id !== null) return;
      last = null;
      id = deps.requestFrame(tick);
    },
    stop() {
      if (id !== null) deps.cancelFrame(id);
      id = null;
      last = null;
    },
    running: () => id !== null,
    durations: () => (measured.length > cap ? measured.slice(-cap) : measured.slice()),
    clear() {
      measured = [];
    },
  };
}
