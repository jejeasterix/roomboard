import { describe, expect, it, vi } from "vitest";
import type { Command, ShapeKind } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { DEFAULT_ITEM_STYLE, type ItemStyle } from "../item-style";
import { constrainEnd, createShapeTool } from "./shape";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const PEN = { color: "#1e40af", width: 4 };

function setup(zoom = 1) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let shift = false;
  let alt = false;
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
    alt: () => alt,
  };
  return { doc, page, ctx, runs, setShift: (v: boolean) => { shift = v; }, setAlt: (v: boolean) => { alt = v; } };
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

describe("outil Formes — magnétisme (C9, S4)", () => {
  const squares40 = {
    visible: true,
    snap: true,
    above: false,
    levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", lineWidth: 1, snap: true, visible: true }],
  };
  const draw = (shift: boolean, alt: boolean, from: [number, number], to: [number, number], kind: ShapeKind = "rect") => {
    const { ctx, page, runs, doc, setShift, setAlt } = setup();
    doc.apply({ type: "SetGrid", page, grid: squares40 });
    setShift(shift);
    setAlt(alt);
    const tool = createShapeTool(ctx, kind, () => PEN);
    tool.begin(1, [at(from[0], from[1])]);
    tool.extend(1, [at(to[0], to[1])], []);
    const preview = tool.live().overlay?.shapes[0];
    tool.close(1, "end");
    return { runs, preview };
  };

  it("départ et bout aimantés : (0, 0)-(120, 80) ; Maj : carré depuis les points aimantés ; Alt : brut", () => {
    for (const [shift, alt, want] of [
      [false, false, [0, 0, 120, 80]],
      [true, false, [0, 0, 120, 120]],
      [false, true, [13, 17, 118, 97]],
    ] as const) {
      const { runs } = draw(shift, alt, [13, 17], [118, 97]);
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({ type: "AddShape", x0: want[0], y0: want[1], x1: want[2], y1: want[3] });
    }
  });

  it("aperçu aimanté égal à l'écriture", () => {
    const { runs, preview } = draw(false, false, [13, 17], [118, 97]);
    expect(preview).toMatchObject({ x0: 0, y0: 0, x1: 120, y1: 80 });
    expect(runs[0]).toMatchObject({ x0: 0, y0: 0, x1: 120, y1: 80 });
  });

  it("petit geste : rien même agrandi par l'aimant ; points aimantés confondus : rien (G8, Review Focus 4)", () => {
    // Geste brut de 2 px que l'aimant porterait à (0, 0)-(40, 40) : le seuil se juge sur les points bruts.
    const small = draw(false, false, [19, 19], [21, 21]);
    expect(small.runs).toEqual([]);
    expect(small.preview).toBeUndefined();
    expect(draw(false, false, [13, 17], [18, 3]).runs).toEqual([]);
  });

  it("Maj et petit geste sur une grille : ni écriture ni aperçu (le seuil se juge sur le bout brut contraint)", () => {
    const { runs, preview } = draw(true, false, [19, 19], [21, 21]);
    expect(runs).toEqual([]);
    expect(preview).toBeUndefined();
  });

  it("rectangle ou ellipse aplatis par l'aimant (13, 17)-(18, 97) → (0, 0)-(0, 80) : ni écriture ni aperçu ; un trait reste", () => {
    for (const kind of ["rect", "ellipse"] as const) {
      const { runs, preview } = draw(false, false, [13, 17], [18, 97], kind);
      expect(runs, kind).toEqual([]);
      expect(preview, kind).toBeUndefined();
    }
    const line = draw(false, false, [13, 17], [18, 97], "line");
    expect(line.runs).toHaveLength(1);
    expect(line.runs[0]).toMatchObject({ shape: "line", x0: 0, y0: 0, x1: 0, y1: 80 });
    expect(line.preview).toMatchObject({ x0: 0, y0: 0, x1: 0, y1: 80 });
  });

  it("Alt pressée en cours de geste : l'aimant se coupe à l'image suivante, écriture brute (G8)", () => {
    const { ctx, page, runs, doc, setAlt } = setup();
    doc.apply({ type: "SetGrid", page, grid: squares40 });
    const tool = createShapeTool(ctx, "rect", () => PEN);
    tool.begin(1, [at(13, 17)]);
    tool.extend(1, [at(118, 97)], []);
    expect(tool.live().overlay?.shapes[0]).toMatchObject({ x0: 0, y0: 0, x1: 120, y1: 80 });
    setAlt(true);
    expect(tool.live().overlay?.shapes[0]).toMatchObject({ x0: 13, y0: 17, x1: 118, y1: 97 });
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "AddShape", page, shape: "rect", x0: 13, y0: 17, x1: 118, y1: 97, style: PEN, fill: null }]);
  });

  it("départ aimanté une fois par geste, recalculé seulement quand Alt change : un snapPoint par image (relecture finale)", () => {
    const { ctx, page, runs, doc, setAlt } = setup();
    doc.apply({ type: "SetGrid", page, grid: squares40 });
    const spy = vi.spyOn(doc, "snapPoint");
    const tool = createShapeTool(ctx, "rect", () => PEN);
    tool.begin(1, [at(13, 17)]);
    expect(spy).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i++) {
      tool.extend(1, [at(118 + i, 97)], []);
      expect(tool.live().overlay?.shapes[0]).toMatchObject({ x0: 0, y0: 0, x1: 120, y1: 80 });
    }
    expect(spy).toHaveBeenCalledTimes(6);
    setAlt(true);
    expect(tool.live().overlay?.shapes[0]).toMatchObject({ x0: 13, y0: 17, x1: 122, y1: 97 });
    expect(spy).toHaveBeenCalledTimes(6);
    setAlt(false);
    expect(tool.live().overlay?.shapes[0]).toMatchObject({ x0: 0, y0: 0, x1: 120, y1: 80 });
    expect(spy).toHaveBeenCalledTimes(8);
    tool.close(1, "end");
    expect(spy).toHaveBeenCalledTimes(9);
    expect(runs).toEqual([{ type: "AddShape", page, shape: "rect", x0: 0, y0: 0, x1: 120, y1: 80, style: PEN, fill: null }]);
  });
});

describe("outil Formes : arrondi (OG11 T9b)", () => {
  const round = { ...DEFAULT_ITEM_STYLE, ...PEN, roundness: "round" as const };
  const drawn = (kind: ShapeKind): Extract<Command, { type: "AddShape" }> => {
    const { ctx, runs } = setup();
    const tool = createShapeTool(ctx, kind, () => round);
    tool.begin(1, [at(10, 10)]);
    tool.extend(1, [at(110, 80)], []);
    tool.close(1, "end");
    const c = runs[0];
    if (c?.type !== "AddShape") throw new Error("AddShape attendue");
    return c;
  };
  it("roundness : seul le rectangle porte l'arrondi", () => {
    expect(drawn("rect").look).toEqual({ roundness: "round" });
    for (const k of ["ellipse", "line", "arrow"] as const) expect(drawn(k).look).toBeUndefined();
  });
});

describe("outil Formes : style courant du lot 2 (T28)", () => {
  const cur: ItemStyle = { ...DEFAULT_ITEM_STYLE, ...PEN, background: "#ffff00", fillStyle: "hachure", startArrowhead: "triangle", endArrowhead: "none" };
  const drawn = (kind: ShapeKind, style: ItemStyle): Extract<Command, { type: "AddShape" }> => {
    const { ctx, runs } = setup();
    const tool = createShapeTool(ctx, kind, () => style);
    tool.begin(1, [at(10, 10)]);
    tool.extend(1, [at(110, 80)], []);
    tool.close(1, "end");
    const c = runs[0];
    if (c?.type !== "AddShape") throw new Error("AddShape attendue");
    return c;
  };
  it("rectangle neuf : hachures du style courant", () => {
    expect(drawn("rect", cur).look).toEqual({ fillStyle: "hachure" });
    expect(drawn("ellipse", cur).look).toEqual({ fillStyle: "hachure" });
    expect(drawn("rect", { ...cur, background: null }).look).toBeUndefined();
    // T37 (déc. 17) : les pointes sont réservées à la flèche, une ligne neuve ne les reçoit pas.
    expect(drawn("line", cur).look).toBeUndefined();
  });
  it("flèche neuve : pointes du style courant", () => {
    expect(drawn("arrow", cur).look).toEqual({ startArrowhead: "triangle", endArrowhead: "none" });
    expect(drawn("arrow", { ...cur, startArrowhead: "none", endArrowhead: "arrow" }).look).toBeUndefined();
    expect(drawn("rect", cur).look).not.toHaveProperty("startArrowhead");
  });
});
