import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { createFillTool } from "./fill";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });

/** Caméra zoom 2, décalée de (10, 20) : l'écran (410, 320) est le monde (200, 150). */
function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 2, tx: 10, ty: 20 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
  };
  let color: string | null = "#facc15";
  const tool = createFillTool(ctx, () => color, (s) => s.length * 10);
  const rect = doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
  return { doc, page, runs, tool, rect, setColor: (c: string | null) => (color = c) };
}

describe("outil Pot (C6a, D15)", () => {
  it("relâché : une commande, au point d'appui (pas au point de relâché)", () => {
    const s = setup();
    s.tool.begin(1, [at(410, 320)]);
    s.tool.extend(1, [at(2000, 2000)], []);
    expect(s.runs).toEqual([]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([{ type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: "#facc15" }]);
  });

  it("cancel et abort : aucune commande (HC6-5)", () => {
    const s = setup();
    s.tool.begin(1, [at(410, 320)]);
    s.tool.close(1, "cancel");
    s.tool.begin(2, [at(410, 320)]);
    s.tool.close(2, "abort");
    expect(s.runs).toEqual([]);
  });

  it("la couleur est lue au relâché (PC12)", () => {
    const s = setup();
    s.tool.begin(1, [at(410, 320)]);
    s.setColor("#16a34a");
    s.tool.close(1, "end");
    expect(s.runs[0]).toMatchObject({ color: "#16a34a" });
  });

  it("« Aucune » sur un contour : aucune commande (D11)", () => {
    const s = setup();
    s.setColor(null);
    s.tool.begin(1, [at(10 + 2 * 102, 320)]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([]);
  });

  it("active() pendant l'appui seulement ; aucun aperçu", () => {
    const s = setup();
    expect(s.tool.active()).toBe(false);
    s.tool.begin(1, [at(410, 320)]);
    expect(s.tool.active()).toBe(true);
    expect(s.tool.live().hidden.size).toBe(0);
    s.tool.close(1, "end");
    expect(s.tool.active()).toBe(false);
  });

  it("close sans begin, begin sans point fini : rien", () => {
    const s = setup();
    s.tool.close(9, "end");
    s.tool.begin(1, [at(Number.NaN, 0)]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([]);
  });
});
