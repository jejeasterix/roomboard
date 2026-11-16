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

export function createFrameLoop(deps: FrameLoopDeps, onFrame: (now: number) => void): FrameLoop {
  let id: number | null = null;
  let last: number | null = null;
  let measured: number[] = [];

  const tick = (): void => {
    const now = deps.now();
    if (last !== null) measured.push(now - last);
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
    durations: () => measured.slice(),
    clear() {
      measured = [];
    },
  };
}
