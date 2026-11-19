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

  it("borne mémoire : le tableau interne ne dépasse jamais 2 × N après 10 × N images, et les N dernières durées restent justes", () => {
    const N = 3;
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => {}, N);
    // Le tableau interne est observé par son seul point d'entrée, `push` d'une durée ; aucun appel à `splice` n'est supposé.
    const seen = new Set<number[]>();
    const push = Array.prototype.push;
    // Remplacement à la main (et non `vi.spyOn`, dont la comptabilité appelle `push` elle-même : récursion).
    Array.prototype.push = function (this: unknown[], ...items: unknown[]): number {
      if (items.length === 1 && typeof items[0] === "number" && items[0] % 1 === 0.5) seen.add(this as number[]);
      return push.apply(this, items);
    };
    try {
      loop.start();
      let peak = 0;
      for (let i = 0; i < 10 * N; i++) {
        clock.advance(16.5);
        for (const a of seen) peak = Math.max(peak, a.length);
      }
      expect(seen.size).toBe(1);
      expect(peak).toBeGreaterThan(N);
      expect(peak).toBeLessThanOrEqual(2 * N);
      expect(loop.durations()).toEqual([16.5, 16.5, 16.5]);
    } finally {
      Array.prototype.push = push;
    }
  });
});
