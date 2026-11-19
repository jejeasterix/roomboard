import { describe, expect, it, vi } from "vitest";
import { createFrameLoop, type FrameLoopDeps } from "./frame-loop";

function fakeClock() {
  let t = 0;
  let next = 1;
  const queue = new Map<number, (ts: number) => void>();
  const deps: FrameLoopDeps = {
    requestFrame: (cb) => {
      const id = next++;
      queue.set(id, cb);
      return id;
    },
    cancelFrame: (id) => {
      queue.delete(id);
    },
    now: () => t,
  };
  return {
    deps,
    advance(ms: number): void {
      t += ms;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb(t);
    },
    pending: () => queue.size,
  };
}

describe("createFrameLoop", () => {
  it("appelle onFrame à chaque image et mesure les intervalles", () => {
    const clock = fakeClock();
    const seen: number[] = [];
    const loop = createFrameLoop(clock.deps, (now) => seen.push(now));
    loop.start();
    clock.advance(16);
    clock.advance(16);
    clock.advance(20);
    expect(seen).toEqual([16, 32, 52]);
    expect(loop.durations()).toEqual([16, 20]);
  });

  it("start deux fois : une seule image en attente", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => undefined);
    loop.start();
    loop.start();
    expect(clock.pending()).toBe(1);
    expect(loop.running()).toBe(true);
  });

  it("stop annule l'image en attente", () => {
    const clock = fakeClock();
    const seen: number[] = [];
    const loop = createFrameLoop(clock.deps, (now) => seen.push(now));
    loop.start();
    loop.stop();
    clock.advance(16);
    expect(seen).toEqual([]);
    expect(clock.pending()).toBe(0);
    expect(loop.running()).toBe(false);
  });

  it("aucune durée mesurée à travers une pause", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => undefined);
    loop.start();
    clock.advance(16);
    loop.stop();
    clock.advance(500);
    loop.start();
    clock.advance(16);
    expect(loop.durations()).toEqual([]);
    clock.advance(18);
    expect(loop.durations()).toEqual([18]);
  });

  it("clear vide les durées mesurées", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => undefined);
    loop.start();
    clock.advance(16);
    clock.advance(16);
    loop.clear();
    expect(loop.durations()).toEqual([]);
  });

  it("maxDurations : seules les N dernières durées, dans l'ordre", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => {}, 3);
    loop.start();
    for (const ms of [10, 11, 12, 13, 14, 15, 16, 17]) clock.advance(ms);
    expect(loop.durations()).toEqual([15, 16, 17]);
  });

  it("sans borne : toutes les durées (banc du lot 1)", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => {});
    loop.start();
    for (let i = 0; i < 1000; i++) clock.advance(16);
    expect(loop.durations()).toHaveLength(999);
  });

  it("borne invalide (0, négative, NaN) : sans borne", () => {
    for (const max of [0, -5, Number.NaN]) {
      const clock = fakeClock();
      const loop = createFrameLoop(clock.deps, () => {}, max);
      loop.start();
      for (let i = 0; i < 10; i++) clock.advance(16);
      expect(loop.durations()).toHaveLength(9);
    }
  });

  it("borne mémoire : le tableau interne est élagué par paquets (splice), jamais plus de 2 × N", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => {}, 3);
    const splice = vi.spyOn(Array.prototype, "splice");
    try {
      loop.start();
      for (let i = 0; i < 4; i++) clock.advance(16); // 3 durées : sous 2 × N, aucun élagage
      expect(splice).not.toHaveBeenCalled();
      for (let i = 0; i < 20; i++) clock.advance(16);
      expect(splice).toHaveBeenCalled();
    } finally {
      splice.mockRestore();
    }
  });
});
