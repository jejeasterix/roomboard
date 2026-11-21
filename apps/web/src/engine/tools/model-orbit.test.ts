import { describe, expect, it, vi } from "vitest";
import type { InputSample } from "../input/sampler";
import { DEFAULT_CAMERA, degrees, PITCH_LIMIT, type ModelCamera } from "../render/model-frames";
import { createModelOrbit } from "./model-orbit";

const s = (x: number, y = 0): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
function orbit(view: ModelCamera = DEFAULT_CAMERA) {
  const views: ModelCamera[] = [];
  const commits: ModelCamera[] = [];
  const closed = vi.fn();
  const o = createModelOrbit({ id: "m", view, onView: (v) => views.push(v), onCommit: (v) => commits.push(v), closed });
  return { o, views, commits, closed };
}
describe("orbite (C15, X21)", () => {
  it("glisser de 100 px vers la droite : yaw + 1 rad (≈ 57°), une validation au relâché (S2)", () => {
    const { o, commits } = orbit();
    o.gesture.begin(1, [s(10)]);
    o.gesture.extend(1, [s(60), s(110)], []);
    expect(o.view().yaw).toBeCloseTo(Math.PI / 6 + 1, 12);
    o.gesture.close(1, "end");
    expect(commits).toHaveLength(1);
    expect(degrees(commits[0]!.yaw) - degrees(DEFAULT_CAMERA.yaw)).toBe(57);
  });
  it("vers le bas : pitch borné à 85°", () => {
    const { o } = orbit();
    o.gesture.begin(1, [s(0, 0)]);
    o.gesture.extend(1, [s(0, 500)], []);
    expect(o.view().pitch).toBe(PITCH_LIMIT);
  });
  it("relâché sans mouvement : aucune validation", () => {
    const { o, commits } = orbit();
    o.gesture.begin(1, [s(5)]);
    o.gesture.close(1, "end");
    expect(commits).toEqual([]);
  });
  it("abandon (cancel, abort) : vue d'avant le geste rendue, rien de validé", () => {
    const { o, views, commits } = orbit();
    o.gesture.begin(1, [s(0)]);
    o.gesture.extend(1, [s(50)], []);
    o.gesture.close(1, "cancel");
    expect([o.view(), views.at(-1), commits]).toEqual([DEFAULT_CAMERA, DEFAULT_CAMERA, []]);
  });
  it("second pointeur ignoré pendant un geste ; active() suit le pointeur", () => {
    const { o } = orbit();
    o.gesture.begin(1, [s(0)]);
    o.gesture.begin(2, [s(0)]);
    o.gesture.extend(2, [s(90)], []);
    expect([o.gesture.active(), o.view()]).toEqual([true, DEFAULT_CAMERA]);
    o.gesture.close(1, "end");
    expect(o.gesture.active()).toBe(false);
  });
  it("reset : vue par défaut validée si elle diffère ; close : une fois, puis plus rien", () => {
    const { o, commits, closed } = orbit({ yaw: 1, pitch: 0.2 });
    o.reset();
    expect(commits).toEqual([DEFAULT_CAMERA]);
    o.reset();
    expect(commits).toHaveLength(1);
    o.close();
    o.close();
    o.gesture.begin(1, [s(0)]);
    expect([closed.mock.calls.length, o.gesture.active()]).toEqual([1, false]);
  });
});
