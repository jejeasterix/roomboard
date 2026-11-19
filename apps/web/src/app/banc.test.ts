import { describe, expect, it } from "vitest";
import type { GestureEvent, InputSample, Sampler, SamplerStats } from "../engine/input/sampler";
import { REPORT_FORMAT, type Environment } from "../engine/input/stats";
import { createAppBench, panelText, PANEL_RECENT_FRAMES, type AppBenchDeps } from "./banc";

const ENV: Environment = {
  userAgent: "test",
  devicePixelRatio: 1,
  support: { coalesced: true, predicted: true, desynchronized: true, inkPresenter: false, pointerRawUpdate: false, secureContext: true },
};
const STATS: SamplerStats = {
  moveEvents: 2,
  samples: 3,
  rawUpdateUsed: false,
  pointerCancels: 0,
  lostCaptures: 0,
  touchIgnored: 1,
  eraserSeen: false,
  gestures: 1,
};

const smp = (t: number): InputSample => ({ x: t, y: 0, pressure: 0.5, tiltX: 0, tiltY: 0, t });
const gest = (kind: GestureEvent["kind"], samples: InputSample[] = []): GestureEvent => ({
  kind,
  pointerId: 1,
  pointerType: "pen",
  eraserButton: false,
  samples,
  predicted: [],
});

function setup() {
  return setupWith([16, 17, 30]);
}

function setupWith(durations: number[]) {
  const gestureCbs = new Set<(g: GestureEvent) => void>();
  const drawnCbs = new Set<(now: number) => void>();
  const sampler: Pick<Sampler, "onGesture" | "stats"> = {
    onGesture: (cb) => {
      gestureCbs.add(cb);
      return () => {
        gestureCbs.delete(cb);
      };
    },
    stats: () => STATS,
  };
  const deps: AppBenchDeps = {
    sampler,
    onLiveDrawn: (cb) => {
      drawnCbs.add(cb);
      return () => {
        drawnCbs.delete(cb);
      };
    },
    frameDurations: () => durations,
    options: { coalesced: true, predicted: true, raw: false, desynchronized: true, inkTrail: false },
    environment: ENV,
    coreVersion: "0.1.0",
    now: () => "2026-11-19T09:00:00.000Z",
  };
  const fire = (g: GestureEvent): void => {
    for (const cb of gestureCbs) cb(g);
  };
  const draw = (now: number): void => {
    for (const cb of drawnCbs) cb(now);
  };
  return { deps, bench: createAppBench(deps), fire, draw, gestureCbs, drawnCbs };
}

describe("createAppBench", () => {
  it("rapport roomboard-stylet/1, géométrie du produit et version du cœur", () => {
    const { bench } = setup();
    const r = bench.report();
    expect(r.format).toBe(REPORT_FORMAT);
    expect(r.geometry).toBe("freedraw");
    expect(r.coreVersion).toBe("0.1.0");
    expect(r.createdAt).toBe("2026-11-19T09:00:00.000Z");
    expect(r.frames?.count).toBe(3);
    expect(r.counters.touchIgnored).toBe(1);
  });

  it("un trait : points et retards mesurés aux images du moteur", () => {
    const { bench, fire, draw } = setup();
    fire(gest("start", [smp(0)]));
    fire(gest("move", [smp(4), smp(8)]));
    draw(20);
    fire(gest("end"));
    const strokes = bench.report().strokes;
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.points).toBe(3);
    expect(strokes[0]?.pointerType).toBe("pen");
    expect(bench.report().totals.penLatencyP95).toBe(20);
  });

  it("report(n) : résumé borné aux n dernières images ; sans argument, toutes (export)", () => {
    const { deps, bench } = setupWith(Array.from({ length: 1000 }, (_, i) => 10 + (i % 5)));
    expect(deps).toBeDefined();
    expect(bench.report(100).frames?.count).toBe(100);
    expect(bench.report().frames?.count).toBe(1000);
  });

  it("dispose : désabonné du moteur et de l'échantillonneur", () => {
    const { bench, gestureCbs, drawnCbs } = setup();
    bench.dispose();
    expect(gestureCbs.size).toBe(0);
    expect(drawnCbs.size).toBe(0);
  });

  it("report(n) garde les n dernières images, pas les n premières", () => {
    const { bench } = setupWith([...Array.from({ length: 900 }, () => 10), ...Array.from({ length: 100 }, () => 40)]);
    expect(bench.report(100).frames).toMatchObject({ count: 100, p50: 40, p95: 40 });
    expect(bench.report().frames?.count).toBe(1000);
  });

  it("panneau : le résumé dit qu'il porte sur les 600 dernières images", () => {
    const { bench } = setup();
    expect(PANEL_RECENT_FRAMES).toBe(600);
    const text = panelText(bench.report(PANEL_RECENT_FRAMES));
    expect(text.split("\n")).toHaveLength(4);
    expect(text).toContain("les 600 dernières images au plus");
  });
});
