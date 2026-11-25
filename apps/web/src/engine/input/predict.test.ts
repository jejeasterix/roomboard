import { describe, expect, it } from "vitest";
import type { GestureSink } from "./gesture";
import { PREDICT_MAX_PX, PREDICT_NATIVE_MAX_PX, PREDICT_NATIVE_MAX_TURN_DEG, guardNative, predictLinear, withPrediction } from "./predict";
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

describe("withPrediction (échelon 2 derrière le réglage)", () => {
  it("allumée : remplace les prédits natifs par l'extrapolation", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "linear");
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], [s(99, 99, 11)]);
    expect(xs(calls[0]?.predicted ?? [])).toEqual([
      [18, 0, 18],
      [26, 0, 26],
    ]);
  });

  it("native : prédits natifs dans l'axe du trait transmis tels quels", () => {
    const { sink, calls } = spy();
    const native = [s(14, 0, 11), s(18, 1, 12)];
    const g = withPrediction(sink, () => "native");
    g.begin(1, "pen", [s(0, 0, 0)], "pen");
    g.extend(1, [s(10, 0, 10)], native);
    expect(calls[0]?.predicted).toEqual(native);
  });

  it("réglage lu à chaque image : bascule à chaud", () => {
    const { sink, calls } = spy();
    let source: "native" | "linear" = "native";
    const native = [s(14, 0, 11)];
    const g = withPrediction(sink, () => source);
    g.begin(1, "pen", [s(0, 0, 0)], "pen");
    g.extend(1, [s(10, 0, 10)], native);
    source = "linear";
    g.extend(1, [s(20, 0, 20)], native);
    expect(calls[0]?.predicted).toEqual(native);
    expect(xs(calls[1]?.predicted ?? [])).toEqual([
      [28, 0, 28],
      [36, 0, 36],
    ]);
  });

  it("image sans échantillon nouveau : aucune queue", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "linear");
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], []);
    g.extend(1, [], []);
    expect(calls[1]?.predicted).toEqual([]);
  });

  it("close : historique oublié, un nouveau geste ne reprend pas l'ancien", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "linear");
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

  it("close seul (sans nouveau begin) : l'historique est vide, le geste suivant n'a rien à extrapoler", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "linear");
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], []);
    g.close(1, "end");
    g.extend(1, [s(110, 0, 30)], []);
    expect(calls[1]?.predicted).toEqual([]);
  });

  it("échantillon non fini (x, y ou t NaN) : ignoré, la prédiction repart du dernier échantillon sain", () => {
    for (const bad of [s(Number.NaN, 0, 20), s(30, Number.NaN, 20), s(30, 0, Number.NaN), s(Number.POSITIVE_INFINITY, 0, 20)]) {
      const { sink, calls } = spy();
      const g = withPrediction(sink, () => "linear");
      g.begin(1, "pen", [s(0, 0, 0)]);
      g.extend(1, [s(10, 0, 10)], []);
      g.extend(1, [bad], []);
      expect(xs(calls[1]?.predicted ?? [])).toEqual([
        [18, 0, 18],
        [26, 0, 26],
      ]);
    }
  });

  it("historique plafonné à 8 échantillons : la vitesse ne remonte pas au-delà", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "linear");
    const all = Array.from({ length: 12 }, (_, i) => s(i * i * 0.1, 0, i));
    g.begin(1, "pen", [all[0] as InputSample]);
    g.extend(1, all.slice(1), []);
    const expected = predictLinear(all.slice(-8));
    expect(xs(calls[0]?.predicted ?? [])).toEqual(xs(expected));
    expect(xs(expected)).not.toEqual(xs(predictLinear(all)));
  });

  it("begin et close transmis tels quels (outil, raison) ; échantillons transmis sans copie", () => {
    const { sink, calls, log } = spy();
    const g = withPrediction(sink, () => "linear");
    g.begin(2, "eraser", [s(0, 0, 0)]);
    const more = [s(1, 0, 1)];
    g.extend(2, more, []);
    g.close(2, "cancel");
    expect(log).toEqual(["begin 2 eraser 1", "close 2 cancel"]);
    expect(calls[0]?.samples).toBe(more);
  });
});

describe("OF73 : la pointe ne gigote plus", () => {
  it("souris : aucun point prédit, ni natif ni TS", () => {
    for (const source of ["native", "linear"] as const) {
      const { sink, calls } = spy();
      const g = withPrediction(sink, () => source);
      g.begin(1, "pen", [s(0, 0, 0)], "mouse");
      g.extend(1, [s(10, 0, 10)], [s(14, 0, 11)]);
      g.extend(1, [s(20, 0, 20)], [s(24, 0, 21)]);
      expect(calls.map((c) => c.predicted)).toEqual([[], []]);
    }
  });

  it("éteinte (none) : les prédits natifs sont coupés aussi", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "none");
    g.begin(1, "pen", [s(0, 0, 0)], "pen");
    g.extend(1, [s(10, 0, 10)], [s(14, 0, 11)]);
    expect(calls[0]?.predicted).toEqual([]);
  });

  it("stylet : un prédit à contre-sens est écarté, la suite aussi", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "native");
    g.begin(1, "pen", [s(0, 0, 0)], "pen");
    g.extend(1, [s(10, 0, 10)], [s(5, 0, 11), s(14, 0, 12)]);
    expect(calls[0]?.predicted).toEqual([]);
  });

  it("stylet : la pointe garde les prédits jusqu'au premier qui tourne trop", () => {
    const h = [s(0, 0, 0), s(10, 0, 10)];
    // 59° depuis le dernier point réel : au-delà de la borne.
    expect(guardNative(h, [s(14, 0, 11), s(16, 10, 12)])).toEqual([s(14, 0, 11)]);
    // Juste sous la borne : gardé.
    const a = ((PREDICT_NATIVE_MAX_TURN_DEG - 1) * Math.PI) / 180;
    const ok = s(10 + 10 * Math.cos(a), 10 * Math.sin(a), 11);
    expect(guardNative(h, [ok])).toEqual([ok]);
  });

  it("stylet : longueur bornée, le dernier gardé est ramené sur la borne", () => {
    const out = guardNative([s(0, 0, 0), s(10, 0, 10)], [s(20, 0, 11), s(80, 0, 12), s(90, 0, 13)]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual(s(20, 0, 11));
    expect(out[1]?.x).toBeCloseTo(10 + PREDICT_NATIVE_MAX_PX);
    expect(out[1]?.y).toBeCloseTo(0);
    expect(out[1]?.t).toBe(12);
  });

  it("stylet : un prédit qui revient en arrière ou zigzague après un premier prédit est écarté", () => {
    const h = [s(0, 0, 0), s(10, 0, 10)];
    expect(guardNative(h, [s(20, 0, 11), s(12, 1, 12)])).toEqual([s(20, 0, 11)]);
    const up = s(10 + 10 * Math.cos(0.5), 10 * Math.sin(0.5), 11);
    expect(guardNative(h, [up, s(up.x + 10 * Math.cos(-0.5), up.y + 10 * Math.sin(-0.5), 12)])).toEqual([up]);
  });

  it("stylet : un prédit sur le dernier point gardé clôt la liste", () => {
    expect(guardNative([s(0, 0, 0), s(10, 0, 10)], [s(14, 0, 11), s(14, 0, 12), s(18, 0, 13)])).toEqual([s(14, 0, 11)]);
  });

  it("stylet : sans direction réelle (un seul point, immobile), aucun prédit", () => {
    expect(guardNative([s(0, 0, 0)], [s(4, 0, 1)])).toEqual([]);
    expect(guardNative([s(0, 0, 0), s(0, 0, 10)], [s(4, 0, 11)])).toEqual([]);
    expect(guardNative([], [s(4, 0, 11)])).toEqual([]);
  });

  it("stylet : prédit non fini écarté avec la suite", () => {
    expect(guardNative([s(0, 0, 0), s(10, 0, 10)], [s(Number.NaN, 0, 11), s(14, 0, 12)])).toEqual([]);
  });

  it("type de pointeur transmis au sink ; un même pointerId passe de la souris au stylet", () => {
    const types: (string | undefined)[] = [];
    const calls: (readonly InputSample[])[] = [];
    const sink: GestureSink = {
      begin: (_id, _tool, _samples, pointerType) => types.push(pointerType),
      extend: (_id, _samples, predicted) => calls.push(predicted),
      close: () => {},
    };
    const g = withPrediction(sink, () => "native");
    g.begin(1, "pen", [s(0, 0, 0)], "mouse");
    g.extend(1, [s(10, 0, 10)], [s(14, 0, 11)]);
    g.close(1, "end");
    g.begin(1, "pen", [s(0, 0, 20)], "pen");
    g.extend(1, [s(10, 0, 30)], [s(14, 0, 31)]);
    g.begin(1, "pen", [s(0, 0, 40)], "mouse");
    g.extend(1, [s(10, 0, 50)], [s(14, 0, 51)]);
    expect(types).toEqual(["mouse", "pen", "mouse"]);
    expect(calls).toEqual([[], [s(14, 0, 31)], []]);
  });

  it("doigt : même garde que le stylet", () => {
    const { sink, calls } = spy();
    const g = withPrediction(sink, () => "native");
    g.begin(1, "pen", [s(0, 0, 0)], "touch");
    g.extend(1, [s(10, 0, 10)], [s(14, 0, 11), s(10, 8, 12)]);
    expect(calls[0]?.predicted).toEqual([s(14, 0, 11)]);
  });
});
