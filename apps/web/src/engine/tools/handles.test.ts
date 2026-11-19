import { describe, expect, it } from "vitest";
import type { Bounds } from "../../core/api";
import { handlePoint, handlesOf, hitHandle, isIdentity, MIN_SCALE, resizeMatrix, transformBounds, translateMatrix } from "./handles";

const b: Bounds = { x0: 100, y0: 100, x1: 300, y1: 200 };
const apply = (m: readonly number[], x: number, y: number): [number, number] => [
  (m[0] ?? 0) * x + (m[2] ?? 0) * y + (m[4] ?? 0),
  (m[1] ?? 0) * x + (m[3] ?? 0) * y + (m[5] ?? 0),
];

describe("poignées (D15, CL4-11)", () => {
  it("8 poignées : coins et milieux des bords", () => {
    expect(handlesOf(b).map((h) => [h.id, h.x, h.y])).toEqual([
      ["nw", 100, 100], ["n", 200, 100], ["ne", 300, 100], ["e", 300, 150],
      ["se", 300, 200], ["s", 200, 200], ["sw", 100, 200], ["w", 100, 150],
    ]);
  });

  it("hitHandle : les poignées écartées (skip) ne sont pas prises", () => {
    expect(hitHandle(b, 200, 200, 12, new Set(["n", "s", "e", "w"] as const))).toBeNull();
    expect(hitHandle(b, 200, 200, 12)).not.toBeNull();
  });

  it("hitHandle : la plus proche dans la portée, sinon null", () => {
    expect(hitHandle(b, 305, 203, 12)).toBe("se");
    expect(hitHandle(b, 200, 150, 12)).toBeNull();
  });

  it("poignée de coin : échelle autour du coin opposé", () => {
    const m = resizeMatrix(b, "se", 500, 300, false);
    expect(m).toEqual([2, 0, 0, 2, -100, -100]);
    expect(apply(m, 100, 100)).toEqual([100, 100]);
    expect(apply(m, 300, 200)).toEqual([500, 300]);
  });

  it("poignée de bord : un seul axe ; Maj : proportions", () => {
    expect(resizeMatrix(b, "e", 500, 999, false)).toEqual([2, 0, 0, 1, -100, 0]);
    const kept = resizeMatrix(b, "se", 500, 220, true);
    expect(kept[0]).toBe(2);
    expect(kept[3]).toBe(2);
  });

  it("resizeMatrix ne s'écrase jamais", () => {
    const flat = resizeMatrix(b, "se", 100, 100, false);
    expect(Math.abs(flat[0])).toBe(MIN_SCALE);
    expect(Math.abs(flat[3])).toBe(MIN_SCALE);
    const flipped = resizeMatrix(b, "e", 0, 150, false);
    expect(flipped[0]).toBe(-0.5);
    for (const m of [flat, flipped, resizeMatrix(b, "n", 200, Number.NaN, true)]) {
      expect(Math.abs(m[0] * m[3] - m[1] * m[2])).toBeGreaterThan(0);
      expect(m.every((v) => Number.isFinite(v))).toBe(true);
    }
  });

  it("translateMatrix, isIdentity, transformBounds", () => {
    expect(translateMatrix(10, -5)).toEqual([1, 0, 0, 1, 10, -5]);
    expect(isIdentity([1, 0, 0, 1, 0, 0])).toBe(true);
    expect(isIdentity(translateMatrix(0, 1))).toBe(false);
    expect(transformBounds([2, 0, 0, 2, -100, -100], b)).toEqual({ x0: 100, y0: 100, x1: 500, y1: 300 });
    expect(transformBounds([-1, 0, 0, 1, 0, 0], b)).toEqual({ x0: -300, y0: 100, x1: -100, y1: 200 });
  });

  it("handlePoint : milieu du bord nord", () => {
    expect(handlePoint(b, "n")).toEqual([200, 100]);
  });
});
