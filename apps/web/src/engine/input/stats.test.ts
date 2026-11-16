import { describe, expect, it } from "vitest";
import {
  REPORT_FORMAT,
  buildReport,
  effectiveOptions,
  frameStats,
  frequencyHz,
  isConstantPressure,
  penPressureNote,
  percentile,
  pressureStats,
  summarizeStroke,
  sumCounters,
  type BenchOptions,
  type Environment,
  type StrokeMeasure,
} from "./stats";

const OPTS: BenchOptions = { coalesced: true, predicted: false, raw: false, desynchronized: true, inkTrail: false };

const ENV: Environment = {
  userAgent: "test",
  devicePixelRatio: 1.5,
  support: {
    coalesced: true,
    predicted: true,
    desynchronized: true,
    inkPresenter: false,
    pointerRawUpdate: true,
    secureContext: true,
  },
};

const measure = (over: Partial<StrokeMeasure> = {}): StrokeMeasure => ({
  pointerType: "pen",
  options: OPTS,
  pressures: [0.2, 0.4, 0.6],
  tiltX: [-30, 10],
  tiltY: [5],
  moveTimes: [0, 10, 20],
  sampleTimes: [0, 5, 10, 15, 20],
  latencies: [4, 6, 8, 30],
  eraserSeen: false,
  cancelled: false,
  palm: false,
  ...over,
});

describe("percentile", () => {
  it("rang le plus proche, null sans données", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([7], 0)).toBe(7);
    expect(percentile([], 50)).toBeNull();
  });
});

describe("pressureStats", () => {
  it("min, max, écart type", () => {
    const s = pressureStats([0.2, 0.4, 0.6]);
    expect(s?.min).toBe(0.2);
    expect(s?.max).toBe(0.6);
    expect(s?.stdDev).toBeCloseTo(0.1633, 3);
    expect(s?.zeroShare).toBe(0);
  });

  it("part des valeurs 0 et 0,5", () => {
    expect(pressureStats([0, 0.5, 0.5, 0])).toMatchObject({ count: 4, zeroShare: 0.5, halfShare: 0.5 });
    expect(pressureStats([])).toBeNull();
  });

  it("pression constante détectée", () => {
    expect(isConstantPressure(pressureStats([0, 0.5, 0.5, 0]))).toBe(true);
    expect(isConstantPressure(pressureStats([0.7, 0.7, 0.7]))).toBe(true);
    expect(isConstantPressure(null)).toBe(true);
    expect(isConstantPressure(pressureStats([0.2, 0.4, 0.6]))).toBe(false);
  });
});

describe("frequencyHz", () => {
  it("intervalles réguliers de 10 ms = 100 Hz ; null si moins de deux instants distincts", () => {
    expect(frequencyHz([0, 10, 20, 30])).toBe(100);
    expect(frequencyHz([5])).toBeNull();
    expect(frequencyHz([5, 5])).toBeNull();
  });
});

describe("frameStats", () => {
  it("p50, p95 et part des images au-delà du budget", () => {
    expect(frameStats([16, 16, 16, 40])).toEqual({ count: 4, p50: 16, p95: 40, overBudgetShare: 0.25 });
    expect(frameStats([])).toBeNull();
  });
});

describe("summarizeStroke", () => {
  it("résume un trait au stylet", () => {
    expect(summarizeStroke(measure(), 1)).toMatchObject({
      index: 1,
      pointerType: "pen",
      points: 3,
      constantPressure: false,
      maxTiltX: 30,
      maxTiltY: 5,
      eventsHz: 100,
      samplesHz: 200,
      latencyP50: 6,
      latencyP95: 30,
    });
  });

  it("trait d'un seul point : fréquences et inclinaison neutres", () => {
    const s = summarizeStroke(measure({ pressures: [0.5], moveTimes: [], sampleTimes: [3], tiltX: [], tiltY: [], latencies: [] }), 2);
    expect(s).toMatchObject({ eventsHz: null, samplesHz: null, maxTiltX: 0, latencyP50: null, constantPressure: true });
  });
});

describe("buildReport", () => {
  it("totaux du stylet séparés de la souris", () => {
    const r = buildReport({
      createdAt: "2026-11-16T14:00:00.000Z",
      environment: ENV,
      counters: { pointerCancels: 1, lostCaptures: 0, touchIgnored: 3, moveEvents: 0, samples: 0, rawUpdateUsed: false },
      frameDurations: [16, 17],
      strokes: [measure(), measure({ pointerType: "mouse", pressures: [0.5, 0.5], latencies: [100], cancelled: true })],
    });
    expect(r.format).toBe(REPORT_FORMAT);
    expect(r.strokes.map((s) => s.index)).toEqual([1, 2]);
    expect(r.totals).toMatchObject({
      strokes: 2,
      penStrokes: 1,
      cancelledStrokes: 1,
      penConstantPressure: false,
      penEventsHzP50: 100,
      penSamplesHzP50: 200,
      latencyP95: 100,
    });
    expect(r.totals.penPressure?.count).toBe(3);
    expect(r.frames?.count).toBe(2);
  });

  it("le rapport survit à JSON.stringify", () => {
    const r = buildReport({
      createdAt: "2026-11-16T14:00:00.000Z",
      environment: ENV,
      counters: { pointerCancels: 0, lostCaptures: 0, touchIgnored: 0, moveEvents: 0, samples: 0, rawUpdateUsed: false },
      frameDurations: [],
      strokes: [measure({ pressures: [], moveTimes: [], sampleTimes: [], latencies: [], tiltX: [], tiltY: [] })],
    });
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    expect(r.totals.penPressure).toBeNull();
    expect(r.frames).toBeNull();
  });
});

describe("corrections de la relecture du lot 1 (T6c)", () => {
  const input = (strokes: StrokeMeasure[]) => ({
    createdAt: "2026-11-16T00:00:00.000Z",
    environment: ENV,
    counters: { pointerCancels: 0, lostCaptures: 0, touchIgnored: 0, moveEvents: 0, samples: 0, rawUpdateUsed: false },
    frameDurations: [],
    strokes,
  });

  it("fréquence = 1000 / médiane des intervalles : une pause de 0,6 s à 250 Hz ne la fausse pas", () => {
    const times: number[] = [];
    for (let i = 0; i < 100; i++) times.push(i * 4);
    for (let i = 0; i < 100; i++) times.push(396 + 600 + i * 4);
    expect(frequencyHz(times)).toBeCloseTo(250, 6);
  });

  it("fréquence : intervalles nuls ignorés, null sans intervalle positif", () => {
    expect(frequencyHz([0, 0, 4, 4, 8])).toBeCloseTo(250, 6);
    expect(frequencyHz([5, 5])).toBeNull();
    expect(frequencyHz([5])).toBeNull();
  });

  it("sans trait au stylet, la pression n'est pas dite constante : « aucun trait au stylet »", () => {
    const r = buildReport(input([measure({ pointerType: "mouse", pressures: [0.5, 0.5, 0.5] })]));
    expect(r.totals.penStrokes).toBe(0);
    expect(r.totals.penConstantPressure).toBe(false);
    expect(penPressureNote(r.totals)).toBe("aucun trait au stylet");
  });

  it("pression du stylet constante signalée, variable sans note", () => {
    const flat = buildReport(input([measure({ pressures: [0.5, 0.5, 0.5] })]));
    expect(penPressureNote(flat.totals)).toBe("CONSTANTE");
    const varied = buildReport(input([measure()]));
    expect(penPressureNote(varied.totals)).toBe("");
  });

  it("sous pointerrawupdate, les prédits ne sont pas effectifs (Chromium n'en donne aucun)", () => {
    expect(effectiveOptions({ ...OPTS, raw: true, predicted: true }).predicted).toBe(false);
    expect(effectiveOptions({ ...OPTS, raw: false, predicted: true }).predicted).toBe(true);
    expect(effectiveOptions({ ...OPTS, raw: true, predicted: true }).raw).toBe(true);
  });

  it("paumes annulées (D18) comptées à part des traits interrompus", () => {
    const r = buildReport(input([measure({ cancelled: true }), measure({ pointerType: "touch", cancelled: true, palm: true })]));
    expect(r.totals.cancelledStrokes).toBe(1);
    expect(r.totals.palmStrokes).toBe(1);
    expect(r.strokes[1]?.palm).toBe(true);
  });

  it("retard séparé stylet / autres pointeurs, global gardé", () => {
    const r = buildReport(input([measure({ latencies: [4, 6] }), measure({ pointerType: "mouse", latencies: [100, 120] })]));
    expect(r.totals).toMatchObject({
      penLatencyP50: 4,
      penLatencyP95: 6,
      otherLatencyP50: 100,
      otherLatencyP95: 120,
      latencyP95: 120,
    });
  });

  it("sumCounters additionne les compteurs ; rawUpdateUsed si l'un l'a utilisé", () => {
    const a = { pointerCancels: 1, lostCaptures: 0, touchIgnored: 2, moveEvents: 10, samples: 40, rawUpdateUsed: false };
    const b = { pointerCancels: 0, lostCaptures: 1, touchIgnored: 0, moveEvents: 5, samples: 5, rawUpdateUsed: true };
    expect(sumCounters(a, b)).toEqual({
      pointerCancels: 1,
      lostCaptures: 1,
      touchIgnored: 2,
      moveEvents: 15,
      samples: 45,
      rawUpdateUsed: true,
    });
  });
});
