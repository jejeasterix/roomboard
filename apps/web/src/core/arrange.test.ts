// OG23 (DA-2) : `planArrange`, portage de `plan` (crates/roomboard-core/src/arrange.rs) ; mêmes cas que
// `crates/roomboard-core/tests/arrange.rs`, joués sur des unités nues.
import { describe, expect, it } from "vitest";
import type { Bounds } from "./api";
import { ARRANGE_HOWS, arrangeUnknown, isArrangeHow, planArrange, planRotate, reachOfKind, rotationMatrix, type ArrangeUnit, type Reach } from "./arrange";

const box = (x0: number, y0: number, x1: number, y1: number): Bounds => ({ x0, y0, x1, y1 });
const one = (id: string, b: Bounds, reach: Reach = "matrix"): ArrangeUnit => ({ members: [{ id, reach, bounds: b }] });

describe("planArrange (OG23)", () => {
  it("align-left : chaque unité au bord gauche de la sélection, pas nul omis", () => {
    const plan = planArrange([one("a", box(40, 0, 90, 50)), one("b", box(200, 100, 250, 150)), one("c", box(120, 200, 170, 250))], "align-left");
    expect(plan).toEqual([["b", [1, 0, 0, 1, -160, 0]], ["c", [1, 0, 0, 1, -80, 0]]]);
  });

  it("align : une seule unité, aucun pas ; unité sans membre : rien", () => {
    expect(planArrange([one("a", box(0, 0, 10, 10))], "align-right")).toEqual([]);
    expect(planArrange([one("a", box(0, 0, 10, 10)), { members: [] }], "align-left")).toEqual([]);
    expect(planArrange([], "flip-h")).toEqual([]);
  });

  it("align-center, align-bottom : centre et bord de la sélection", () => {
    const units = [one("a", box(0, 0, 100, 20)), one("b", box(150, 50, 170, 60))];
    expect(planArrange(units, "align-center")).toEqual([["a", [1, 0, 0, 1, 35, 0]], ["b", [1, 0, 0, 1, -75, 0]]]);
    expect(planArrange(units, "align-bottom")).toEqual([["a", [1, 0, 0, 1, 0, 40]]]);
  });

  it("répartir : écarts égaux, les extrêmes restent ; moins de trois unités : rien", () => {
    const units = [one("a", box(0, 0, 100, 10)), one("c", box(300, 0, 400, 10)), one("b", box(150, 0, 170, 10))];
    expect(planArrange(units, "distribute-h")).toEqual([["b", [1, 0, 0, 1, 40, 0]]]);
    expect(planArrange(units.slice(0, 2), "distribute-h")).toEqual([]);
  });

  it("répartir des boîtes qui se chevauchent : par les centres, les deux extrêmes immobiles", () => {
    const units = [one("a", box(0, 0, 100, 20)), one("b", box(20, 30, 140, 50)), one("c", box(150, 60, 250, 80))];
    expect(planArrange(units, "distribute-h")).toEqual([["b", [1, 0, 0, 1, 45, 0]]]);
  });

  it("flip-h : matrice de miroir pour un trait ou une forme, place seule pour un texte", () => {
    const plan = planArrange([one("r", box(0, 0, 100, 50)), one("t", box(300, 0, 400, 30), "place")], "flip-h");
    expect(plan).toEqual([["r", [-1, 0, 0, 1, 400, 0]], ["t", [1, 0, 0, 1, -300, 0]]]);
  });

  it("quart de tour : rotate-cw autour du centre, un `place` centré ne bouge pas", () => {
    expect(planArrange([one("r", box(0, 0, 200, 100))], "rotate-cw")).toEqual([["r", [0, 1, -1, 0, 150, -50]]]);
    expect(planArrange([one("r", box(0, 0, 200, 100))], "rotate-ccw")).toEqual([["r", [0, -1, 1, 0, 50, 150]]]);
    expect(planArrange([one("t", box(0, 0, 200, 100), "place")], "rotate-cw")).toEqual([]);
  });

  it("une unité de groupe bouge en bloc : tous ses membres du même pas", () => {
    const group: ArrangeUnit = { members: [{ id: "a", reach: "matrix", bounds: box(300, 0, 350, 50) }, { id: "b", reach: "matrix", bounds: box(400, 100, 450, 150) }] };
    expect(planArrange([group, one("c", box(100, 200, 150, 250))], "align-left")).toEqual([["a", [1, 0, 0, 1, -200, 0]], ["b", [1, 0, 0, 1, -200, 0]]]);
  });

  it("noms : douze dispositions lues, message d'une inconnue", () => {
    expect(ARRANGE_HOWS).toHaveLength(12);
    expect(ARRANGE_HOWS.every(isArrangeHow)).toBe(true);
    expect(isArrangeHow("spin")).toBe(false);
    expect(arrangeUnknown("spin")).toBe("disposition inconnue : spin");
  });
});

// OG33 (lot 2b) : `rotation` et `plan_rotate` du cœur, portés ligne à ligne.
describe("OG33 rotation", () => {
  it("rotationMatrix(cx, cy, 90) égale la matrice rotate-cw de planArrange, à l'exact", () => {
    const u = [one("a", box(0, 0, 200, 50))];
    const cw = planArrange(u, "rotate-cw")[0]?.[1];
    expect(rotationMatrix(100, 25, 90)).toEqual(cw);
    expect(planRotate(u, 90)).toEqual(planArrange(u, "rotate-cw"));
  });
  it("planRotate d'un texte seul : translation nulle omise ; angle nul modulo 360 : rien", () => {
    expect(planRotate([one("t", box(0, 0, 100, 30), "place")], 45)).toEqual([]);
    expect(planRotate([one("a", box(0, 0, 10, 10))], 360)).toEqual([]);
    expect(planRotate([one("a", box(0, 0, 10, 10))], -720)).toEqual([]);
  });
  it("reachOfKind : portée du cœur, fill jamais bougé", () => {
    expect(reachOfKind("shape")).toBe("matrix");
    expect(reachOfKind("text")).toBe("place");
    expect(reachOfKind("fill")).toBeNull();
  });
});
