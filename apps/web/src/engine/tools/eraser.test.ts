import { describe, expect, it } from "vitest";
import type { Command, EraseMode, StrokeStyle } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { IDENTITY, type Camera } from "../camera";
import type { InputSample } from "../input/sampler";
import { createEraserTool, ERASER_RADIUS_PX } from "./eraser";
import type { ToolContext } from "./tool";

const s = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const PEN: StrokeStyle = { color: "#000000", width: 4 };
const hline = (y: number): Float32Array => {
  const a: number[] = [];
  for (let i = 0; i <= 40; i++) a.push(100 + i * 10, y, 0.5);
  return new Float32Array(a);
};

function setup(mode: EraseMode = "partial", cam: Camera = IDENTITY) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const target = doc.apply({ type: "CommitStroke", page, points: hline(100), style: PEN }).ids[0] ?? "";
  const runs: Command[] = [];
  const probes: number[] = [];
  const original = doc.hitTestPath.bind(doc);
  doc.hitTestPath = (p: string, path: Float32Array, r: number): string[] => {
    probes.push(path.length);
    return original(p, path, r);
  };
  let current = mode;
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => cam,
    run: (c) => {
      runs.push(c);
      return doc.apply(c);
    },
  };
  const tool = createEraserTool(ctx, () => current);
  return { doc, page, target, runs, probes, tool, setMode: (m: EraseMode) => { current = m; } };
}

function eraseOf(runs: Command[]): Extract<Command, { type: "Erase" }> {
  const c = runs[0];
  if (c?.type !== "Erase") throw new Error("Erase attendue");
  return c;
}

describe("createEraserTool (D12, D38)", () => {
  it("gomme partielle : rien d'écrit pendant le geste, une seule Erase au relâché", () => {
    const { doc, page, runs, tool } = setup();
    const v = doc.version();
    tool.begin(1, [s(300, 80)]);
    tool.extend(1, [s(300, 100), s(300, 120)], []);
    tool.frame();
    expect(doc.version()).toBe(v);
    expect(tool.live().erasers).toHaveLength(1);
    expect(tool.live().erasers[0]?.mode).toBe("partial");
    expect(tool.live().hidden.size).toBe(0);
    tool.close(1, "end");
    expect(runs).toEqual([
      { type: "Erase", page, path: new Float32Array([300, 80, 300, 100, 300, 120]), radius: ERASER_RADIUS_PX, mode: "partial" },
    ]);
    expect(doc.version()).toBe(v + 1);
  });

  it("rayon constant à l'écran : 12 px divisés par le zoom ; un appui seul gomme aussi", () => {
    const { runs, tool } = setup("partial", { zoom: 2, tx: 0, ty: 0 });
    tool.begin(1, [s(600, 200)]);
    tool.close(1, "end");
    const c = eraseOf(runs);
    expect(c.radius).toBe(6);
    expect(Array.from(c.path)).toEqual([300, 100]);
  });

  it("gomme d'objet : traits touchés masqués à chaque image, sans écriture", () => {
    const { doc, target, tool } = setup("object");
    const v = doc.version();
    tool.begin(1, [s(300, 80)]);
    tool.extend(1, [s(300, 120)], []);
    tool.frame();
    expect([...tool.live().hidden]).toEqual([target]);
    expect(doc.version()).toBe(v);
  });

  it("gomme d'objet : hitTestPath ne reçoit que les points nouveaux et le point de jonction", () => {
    const { probes, tool } = setup("object");
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(1, 0), s(2, 0)], []);
    tool.frame();
    tool.extend(1, [s(3, 0)], []);
    tool.frame();
    tool.frame();
    expect(probes).toEqual([6, 4]);
  });

  it("cancel ou abort : annulé sans écriture (D39), aperçu retiré", () => {
    const { doc, runs, tool } = setup("object");
    const v = doc.version();
    for (const how of ["cancel", "abort"] as const) {
      tool.begin(1, [s(300, 80)]);
      tool.extend(1, [s(300, 120)], []);
      tool.frame();
      tool.close(1, how);
    }
    expect(runs).toEqual([]);
    expect(doc.version()).toBe(v);
    expect(tool.live().hidden.size).toBe(0);
    expect(tool.live().erasers).toHaveLength(0);
    expect(tool.active()).toBe(false);
  });

  it("le mode est figé au début du geste", () => {
    const { runs, tool, setMode } = setup("partial");
    tool.begin(1, [s(300, 80)]);
    setMode("object");
    tool.close(1, "end");
    expect(eraseOf(runs).mode).toBe("partial");
  });

  it("gomme qui ne touche rien : document inchangé, aucune étape (D38)", () => {
    const { doc, tool } = setup();
    const v = doc.version();
    tool.begin(1, [s(900, 900)]);
    tool.close(1, "end");
    expect(doc.version()).toBe(v);
  });
});
