import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { constrainEnd, createShapeTool } from "./shape";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const PEN = { color: "#1e40af", width: 4 };

function setup(zoom = 1) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let shift = false;
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      return doc.apply(cmd);
    },
    shift: () => shift,
  };
  return { doc, page, ctx, runs, setShift: (v: boolean) => { shift = v; } };
}

describe("outil Formes (D13, D38)", () => {
  it("constrainEnd : carré et cercle par le plus grand côté, signe gardé", () => {
    expect(constrainEnd("rect", 0, 0, 100, 40)).toEqual([100, 100]);
    expect(constrainEnd("ellipse", 0, 0, -30, 80)).toEqual([-80, 80]);
  });

  it("constrainEnd : ligne et flèche à 15° près, longueur gardée", () => {
    const [x, y] = constrainEnd("line", 0, 0, 100, 20);
    const len = Math.hypot(100, 20);
    expect(x).toBeCloseTo(len * Math.cos(Math.PI / 12));
    expect(y).toBeCloseTo(len * Math.sin(Math.PI / 12));
    expect(constrainEnd("arrow", 5, 5, 5, 5)).toEqual([5, 5]);
  });

  it("une AddShape au relâché, aperçu avant", () => {
    const { ctx, page, runs, doc } = setup();
    const tool = createShapeTool(ctx, "rect", () => PEN);
    tool.begin(1, [at(300, 200)]);
    tool.extend(1, [at(100, 50)], []);
    expect(tool.active()).toBe(true);
    expect(tool.live().overlay?.shapes).toEqual([{ shape: "rect", x0: 300, y0: 200, x1: 100, y1: 50, style: PEN, fill: null }]);
    expect(runs).toEqual([]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "AddShape", page, shape: "rect", x0: 300, y0: 200, x1: 100, y1: 50, style: PEN, fill: null }]);
    expect(doc.elementIds(page)).toHaveLength(1);
    expect(tool.active()).toBe(false);
    expect(tool.live().overlay).toBeUndefined();
  });

  it("forme plus petite que 4 px écran sur les deux axes : rien d'écrit", () => {
    const { ctx, runs } = setup();
    const tool = createShapeTool(ctx, "ellipse", () => PEN);
    tool.begin(1, [at(100, 100)]);
    tool.extend(1, [at(103, 102)], []);
    tool.close(1, "end");
    expect(runs).toEqual([]);
  });

  it("cancel et abort : rien d'écrit", () => {
    const { ctx, runs } = setup();
    const tool = createShapeTool(ctx, "line", () => PEN);
    for (const how of ["cancel", "abort"] as const) {
      tool.begin(1, [at(0, 0)]);
      tool.extend(1, [at(200, 0)], []);
      tool.close(1, how);
    }
    expect(runs).toEqual([]);
  });

  it("Maj pendant le tracé : carré écrit", () => {
    const { ctx, runs, setShift } = setup();
    const tool = createShapeTool(ctx, "rect", () => PEN);
    tool.begin(1, [at(0, 0)]);
    tool.extend(1, [at(100, 40)], []);
    setShift(true);
    tool.close(1, "end");
    expect(runs[0]).toMatchObject({ x1: 100, y1: 100 });
  });

  it("zoom 2 : coins en coordonnées monde, seuil en px écran", () => {
    const { ctx, runs } = setup(2);
    const tool = createShapeTool(ctx, "arrow", () => PEN);
    tool.begin(1, [at(100, 100)]);
    tool.extend(1, [at(105, 100)], []);
    tool.close(1, "end");
    expect(runs[0]).toMatchObject({ shape: "arrow", x0: 50, y0: 50, x1: 52.5, y1: 50 });
  });
});
