import { describe, expect, it } from "vitest";
import type { GestureEvent, InputSample } from "../engine/input/sampler";
import type { BenchOptions } from "../engine/input/stats";
import { createRecorder } from "./recorder";

const OPTS: BenchOptions = { coalesced: true, predicted: true, raw: false, desynchronized: true, inkTrail: false };

const s = (x: number, t: number, pressure = 0.5, tiltX = 0): InputSample => ({ x, y: 0, pressure, tiltX, tiltY: 0, t });

const g = (kind: GestureEvent["kind"], samples: InputSample[] = [], over: Partial<GestureEvent> = {}): GestureEvent => ({
  kind,
  pointerId: 1,
  pointerType: "pen",
  eraserButton: false,
  samples,
  predicted: [],
  ...over,
});

describe("createRecorder", () => {
  it("start et move alimentent un trait vif avec ses prédits", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4), s(2, 8)], { predicted: [s(3, 12)] }));
    const live = r.live();
    expect(live).toHaveLength(1);
    expect(live[0]?.points.map((p) => p.x)).toEqual([0, 1, 2]);
    expect(live[0]?.predicted.map((p) => p.x)).toEqual([3]);
    expect(live[0]?.drawn).toBe(0);
  });

  it("markDrawn mesure le retard des seuls points pas encore dessinés", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4)]));
    r.markDrawn(10);
    expect(r.live()[0]?.drawn).toBe(2);
    r.markDrawn(30);
    r.handle(g("move", [s(2, 20)]));
    r.markDrawn(26);
    r.handle(g("end"));
    expect(r.strokes()[0]?.latencies).toEqual([10, 6, 6]);
  });

  it("end produit la mesure du trait et vide les traits vifs", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0, 0.2, -5)]));
    r.handle(g("move", [s(1, 4, 0.4), s(2, 8, 0.6)]));
    r.handle(g("move", [s(3, 12, 0.6)]));
    r.handle(g("end"));
    expect(r.live()).toEqual([]);
    expect(r.strokes()).toEqual([
      {
        pointerType: "pen",
        options: OPTS,
        pressures: [0.2, 0.4, 0.6, 0.6],
        tiltX: [-5, 0, 0, 0],
        tiltY: [0, 0, 0, 0],
        moveTimes: [8, 12],
        sampleTimes: [0, 4, 8, 12],
        latencies: [],
        eraserSeen: false,
        cancelled: false,
        palm: false,
      },
    ]);
  });

  it("cancel garde le trait jusqu'au dernier point reçu", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4)]));
    r.handle(g("cancel"));
    expect(r.strokes()[0]).toMatchObject({ cancelled: true, pressures: [0.5, 0.5] });
  });

  it("bouton gomme vu pendant le trait", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4)], { eraserButton: true }));
    expect(r.live()[0]?.eraserButton).toBe(true);
    r.handle(g("end", [], { eraserButton: true }));
    expect(r.strokes()[0]?.eraserSeen).toBe(true);
  });

  it("setOptions ne vaut que pour les traits suivants", () => {
    const r = createRecorder(OPTS);
    const other: BenchOptions = { ...OPTS, predicted: false };
    r.handle(g("start", [s(0, 0)]));
    r.setOptions(other);
    r.handle(g("end"));
    r.handle(g("start", [s(0, 20)]));
    r.handle(g("end"));
    expect(r.strokes().map((m) => m.options.predicted)).toEqual([true, false]);
  });

  it("fin d'un pointeur inconnu ignorée", () => {
    const r = createRecorder(OPTS);
    r.handle(g("end", [], { pointerId: 9 }));
    r.handle(g("move", [s(1, 1)], { pointerId: 9 }));
    expect(r.strokes()).toEqual([]);
    expect(r.live()).toEqual([]);
  });

  it("deux pointeurs, deux traits", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)], { pointerId: 1 }));
    r.handle(g("start", [s(50, 1)], { pointerId: 2, pointerType: "mouse" }));
    r.handle(g("move", [s(51, 5)], { pointerId: 2, pointerType: "mouse" }));
    expect(r.live().map((l) => l.points.length)).toEqual([1, 2]);
    r.handle(g("end", [], { pointerId: 2, pointerType: "mouse" }));
    expect(r.strokes().map((m) => m.pointerType)).toEqual(["mouse"]);
    expect(r.live().map((l) => l.pointerId)).toEqual([1]);
  });

  it("reset vide traits vifs et mesures", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("end"));
    r.handle(g("start", [s(0, 0)], { pointerId: 2 }));
    r.reset();
    expect(r.strokes()).toEqual([]);
    expect(r.live()).toEqual([]);
  });

  it("un cancel d'abandon (bascule) ferme le trait vif et garde l'encre reçue", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4)]));
    r.handle(g("cancel"));
    expect(r.live()).toHaveLength(0);
    expect(r.strokes()).toHaveLength(1);
    expect(r.strokes()[0]?.cancelled).toBe(true);
    expect(r.strokes()[0]?.pressures).toHaveLength(2);
  });

  it("garde l'encre des traits finis pour la redessiner après un redimensionnement, même interrompus (D39)", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4), s(2, 8)]));
    r.handle(g("end"));
    r.handle(g("start", [s(5, 10)], { pointerId: 2 }));
    r.handle(g("move", [s(6, 14)], { pointerId: 2 }));
    r.handle(g("cancel", [], { pointerId: 2 }));
    expect(r.ink().map((k) => k.points.map((p) => p.x))).toEqual([
      [0, 1, 2],
      [5, 6],
    ]);
    expect(r.ink().map((k) => k.eraserButton)).toEqual([false, false]);
  });

  it("clearInk efface l'encre à redessiner mais garde les mesures ; reset vide les deux", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("end"));
    r.clearInk();
    expect(r.ink()).toEqual([]);
    expect(r.strokes()).toHaveLength(1);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("end"));
    r.reset();
    expect(r.ink()).toEqual([]);
  });

  it("un trait au bouton gomme interrompu est annulé sans écriture (D39), sa mesure reste", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)], { eraserButton: true }));
    r.handle(g("move", [s(1, 4)], { eraserButton: true }));
    r.handle(g("cancel", [], { eraserButton: true }));
    expect(r.ink()).toEqual([]);
    expect(r.strokes()[0]).toMatchObject({ cancelled: true, eraserSeen: true });
  });

  it("paume annulée par D18 : mesure marquée palm, distincte d'un trait interrompu", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)], { pointerType: "touch" }));
    r.handle(g("cancel", [], { pointerType: "touch", palm: true }));
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("cancel"));
    expect(r.strokes().map((m) => [m.cancelled, m.palm])).toEqual([
      [true, true],
      [true, false],
    ]);
  });
});
