import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { createSelectTool } from "./select";
import type { SelectionTool, ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });

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
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
    shift: () => shift,
  };
  const tool = createSelectTool(ctx);
  const rect = (x0: number, y0: number, x1: number, y1: number): string =>
    doc.apply({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
  return { doc, tool, runs, rect, setShift: (v: boolean) => { shift = v; } };
}

function gesture(tool: SelectionTool, pts: [number, number][], how: CloseReason = "end", id = 1): void {
  const [first, ...rest] = pts;
  if (!first) return;
  tool.begin(id, [at(first[0], first[1])]);
  for (const [x, y] of rest) tool.extend(id, [at(x, y)], []);
  tool.close(id, how);
}

describe("outil Sélection (D15, D38)", () => {
  it("clic sur un élément : il est sélectionné, sans écriture", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([a]);
    expect(runs).toEqual([]);
  });

  it("un clic sans glisser n'écrit rien", () => {
    const { tool, runs, rect } = setup();
    rect(100, 100, 200, 200);
    gesture(tool, [[150, 150], [151, 150]]);
    expect(runs).toEqual([]);
  });

  it("glisser un élément : aperçu sans écriture, puis une Transform de translation au relâché", () => {
    const { doc, tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    tool.begin(1, [at(150, 150)]);
    tool.extend(1, [at(250, 180)], []);
    const live = tool.live();
    expect([...live.hidden]).toEqual([a]);
    expect(live.overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 100, 30] }]);
    expect(live.overlay?.frame).toEqual({ x0: 198, y0: 128, x1: 302, y1: 232 });
    expect(runs).toEqual([]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 100, 30] }]);
    expect(doc.element(a)?.transform).toEqual([1, 0, 0, 1, 200, 130]);
    expect(tool.live().hidden.size).toBe(0);
  });

  it("glisser un élément non sélectionné : le sélectionne et le déplace dans le même geste", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    gesture(tool, [[450, 150], [460, 150]]);
    expect(tool.selection()).toEqual([b]);
    expect(runs).toEqual([{ type: "Transform", ids: [b], matrix: [1, 0, 0, 1, 10, 0] }]);
    expect(tool.selection()).not.toContain(a);
  });

  it("Maj+clic ajoute puis retire", () => {
    const { tool, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[450, 150]]);
    expect(tool.selection()).toEqual([a, b]);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([b]);
  });

  it("rectangle dans le vide : éléments entièrement inclus, rectangle en aperçu", () => {
    const { tool, rect } = setup();
    const a = rect(100, 100, 200, 200);
    rect(400, 100, 500, 200);
    tool.begin(1, [at(50, 50)]);
    tool.extend(1, [at(300, 300)], []);
    expect(tool.live().overlay?.band).toEqual({ x0: 50, y0: 50, x1: 300, y1: 300 });
    tool.close(1, "end");
    expect(tool.selection()).toEqual([a]);
  });

  it("Maj + rectangle ajoute à la sélection ; rectangle sans Maj la remplace", () => {
    const { tool, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[350, 50], [600, 300]]);
    expect(tool.selection()).toEqual([a, b]);
    setShift(false);
    gesture(tool, [[350, 50], [600, 300]]);
    expect(tool.selection()).toEqual([b]);
  });

  it("poignée de coin : Transform d'échelle autour du coin opposé", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200); // bornes 98..202 (demi-épaisseur 2)
    gesture(tool, [[150, 150]]);
    gesture(tool, [[202, 202], [306, 306]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [2, 0, 0, 2, -98, -98] }]);
  });

  it("Maj tenue avant la poignée : proportions", () => {
    const { tool, runs, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200); // bornes 98..202
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[202, 202], [306, 250]]);
    expect(tool.selection()).toEqual([a]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [2, 0, 0, 2, -98, -98] }]);
  });

  it("tiret de 20×4 unités à zoom 1 : appui au centre puis glisser = déplacer, pas redimensionner", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 120, 104);
    tool.setSelection([a]);
    gesture(tool, [[110, 102], [140, 112]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 30, 10] }]);
  });

  it("zoom 2 : poignée de coin et déplacement en unités monde", () => {
    const { tool, runs, rect } = setup(2);
    const a = rect(100, 100, 200, 200); // bornes 98..202, soit 196..404 à l'écran
    gesture(tool, [[300, 300]]);
    gesture(tool, [[404, 404], [612, 612]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [2, 0, 0, 2, -98, -98] }]);
  });

  it("zoom 2 : glisser le corps déplace de l'écart en unités monde", () => {
    const { tool, runs, rect } = setup(2);
    const a = rect(100, 100, 200, 200);
    gesture(tool, [[300, 300], [500, 360]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 100, 30] }]);
  });

  it("cancel et abort n'écrivent rien", () => {
    const { tool, runs, rect } = setup();
    rect(100, 100, 200, 200);
    gesture(tool, [[150, 150], [250, 150]], "cancel");
    gesture(tool, [[150, 150], [250, 150]], "abort");
    expect(runs).toEqual([]);
    expect(tool.active()).toBe(false);
  });

  it("prune retire les ids absents ; leave vide la sélection ; cadre et poignées au repos", () => {
    const { doc, tool, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    tool.setSelection([a, b]);
    expect(tool.live().overlay).toMatchObject({ handles: true, frame: { x0: 98, y0: 98, x1: 502, y1: 202 } });
    doc.apply({ type: "Delete", ids: [b] });
    tool.prune();
    expect(tool.selection()).toEqual([a]);
    tool.leave?.("tool");
    expect(tool.selection()).toEqual([]);
    expect(tool.live().overlay).toBeUndefined();
  });
});
