import { describe, expect, it } from "vitest";
import type { GestureSink } from "./gesture";
import { PREDICT_MAX_PX, predictLinear, withLinearPrediction } from "./predict";
import type { InputSample } from "./sampler";

const s = (x: number, y: number, t: number, pressure = 0.5): InputSample => ({ x, y, pressure, tiltX: 0, tiltY: 0, t });
const xs = (out: readonly InputSample[]): number[][] => out.map((p) => [p.x, p.y, p.t]);

function spy() {
  const calls: { id: number; samples: readonly InputSample[]; predicted: readonly InputSample[] }[] = [];
  const log: string[] = [];
  const sink: GestureSink = {
    begin: (id, tool, samples) => log.push(`begin ${id} ${tool} ${samples.length}`),
    extend: (id, samples, predicted) => calls.push({ id, samples, predicted }),
    close: (id, how) => log.push(`close ${id} ${how}`),
  };
  return { sink, calls, log };
}

describe("predictLinear (échelon 2)", () => {
  it("vitesse constante : deux points à 8 et 16 ms devant le dernier", () => {
    expect(xs(predictLinear([s(0, 0, 0), s(10, 5, 10)]))).toEqual([
      [18, 9, 18],
      [26, 13, 26],
    ]);
  });

  it("fenêtre de 32 ms : un échantillon plus ancien n'entre pas dans la vitesse", () => {
    expect(xs(predictLinear([s(0, 0, 0), s(100, 0, 50), s(110, 0, 60)]))).toEqual([
      [118, 0, 68],
      [126, 0, 76],
    ]);
  });

  it("même horodatage : aucune prédiction", () => {
    expect(predictLinear([s(0, 0, 5), s(4, 0, 5)])).toEqual([]);
  });

  it("un seul échantillon ou aucun : aucune prédiction", () => {
    expect(predictLinear([s(1, 1, 1)])).toEqual([]);
    expect(predictLinear([])).toEqual([]);
  });

  it("queue bornée à 48 px", () => {
    expect(PREDICT_MAX_PX).toBe(48);
    const out = predictLinear([s(0, 0, 0), s(100, 0, 10)]);
    expect(out).toHaveLength(2);
    expect(out[0]?.x).toBeCloseTo(124);
    expect(out[1]?.x).toBeCloseTo(148);
  });

  it("pression et inclinaison du dernier échantillon recopiées", () => {
    const last: InputSample = { x: 4, y: 0, pressure: 0.8, tiltX: 30, tiltY: -10, t: 4 };
    const out = predictLinear([s(0, 0, 0, 0.2), last]);
    expect(out).toHaveLength(2);
    for (const p of out) expect([p.pressure, p.tiltX, p.tiltY]).toEqual([0.8, 30, -10]);
  });
});

describe("withLinearPrediction (échelon 2 derrière le réglage)", () => {
  it("allumée : remplace les prédits natifs par l'extrapolation", () => {
    const { sink, calls } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], [s(99, 99, 11)]);
    expect(xs(calls[0]?.predicted ?? [])).toEqual([
      [18, 0, 18],
      [26, 0, 26],
    ]);
  });

  it("éteinte : prédits natifs transmis tels quels", () => {
    const { sink, calls } = spy();
    const native = [s(99, 99, 11)];
    const g = withLinearPrediction(sink, () => false);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], native);
    expect(calls[0]?.predicted).toBe(native);
  });

  it("réglage lu à chaque image : bascule à chaud", () => {
    const { sink, calls } = spy();
    let on = false;
    const native = [s(99, 99, 11)];
    const g = withLinearPrediction(sink, () => on);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], native);
    on = true;
    g.extend(1, [s(20, 0, 20)], native);
    expect(calls[0]?.predicted).toBe(native);
    expect(xs(calls[1]?.predicted ?? [])).toEqual([
      [28, 0, 28],
      [36, 0, 36],
    ]);
  });

  it("image sans échantillon nouveau : aucune queue", () => {
    const { sink, calls } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], []);
    g.extend(1, [], []);
    expect(calls[1]?.predicted).toEqual([]);
  });

  it("close : historique oublié, un nouveau geste ne reprend pas l'ancien", () => {
    const { sink, calls } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], []);
    g.close(1, "end");
    g.begin(1, "pen", [s(100, 0, 20)]);
    g.extend(1, [s(110, 0, 30)], []);
    expect(xs(calls[1]?.predicted ?? [])).toEqual([
      [118, 0, 38],
      [126, 0, 46],
    ]);
  });

  it("begin et close transmis tels quels (outil, raison) ; échantillons transmis sans copie", () => {
    const { sink, calls, log } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(2, "eraser", [s(0, 0, 0)]);
    const more = [s(1, 0, 1)];
    g.extend(2, more, []);
    g.close(2, "cancel");
    expect(log).toEqual(["begin 2 eraser 1", "close 2 cancel"]);
    expect(calls[0]?.samples).toBe(more);
  });
});
