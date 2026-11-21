import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import type { FillRequest } from "../fill-target";
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
  return { doc, page, runs, tool, rect, ctx, setColor: (c: string | null) => (color = c) };
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

  it("C6b : avec la file, toutes les actions y passent ; image : ImageFill avec la tolérance lue au relâché (B13, B19)", () => {
    const s = setup();
    const submitted: FillRequest[] = [];
    let tol = 5;
    const queue = { tolerance: () => tol, submit: (r: FillRequest) => void submitted.push(r) };
    const tool = createFillTool(s.ctx, () => "#facc15", (t) => t.length * 10, queue);
    const img = s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 600, 100] }).ids[0] ?? "";
    tool.begin(1, [at(410, 320)]);
    tool.close(1, "end");
    tool.begin(2, [at(2 * 650 + 10, 2 * 150 + 20)]);
    tol = 12;
    tool.close(2, "end");
    expect(submitted).toEqual([
      { command: { type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: "#facc15" } },
      { type: "ImageFill", page: s.page, id: img, seed: [50, 50], color: "#facc15", tolerance: 12 },
    ]);
    expect(s.runs).toEqual([]);
  });

  it("C6b : sans file, un clic sur une image n'écrit rien (aucun repli sur le fond)", () => {
    const s = setup();
    s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 600, 100] });
    s.tool.begin(1, [at(2 * 650 + 10, 2 * 150 + 20)]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([]);
  });
});
