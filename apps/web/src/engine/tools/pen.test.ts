import { describe, expect, it } from "vitest";
import type { Command, StrokeBuilderApi, StrokeStyle } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { Camera } from "../camera";
import type { InputSample } from "../input/sampler";
import { createPenTool } from "./pen";
import type { ToolContext } from "./tool";

const s = (x: number, y: number, pressure = 0.5): InputSample => ({ x, y, pressure, tiltX: 0, tiltY: 0, t: 0 });
const PEN: StrokeStyle = { color: "#000000", width: 4 };

function setup(cam: Camera = { zoom: 1, tx: 0, ty: 0 }, refuse = false) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  const builders = { created: 0, pushes: 0, freed: 0, aheads: [] as number[][] };
  const original = doc.newStrokeBuilder.bind(doc);
  doc.newStrokeBuilder = (st: StrokeStyle): StrokeBuilderApi => {
    builders.created++;
    const b = original(st);
    return {
      push: (p, ahead) => {
        builders.pushes++;
        builders.aheads.push(Array.from(ahead ?? []));
        return b.push(p, ahead);
      },
      finish: () => b.finish(),
      free: () => {
        builders.freed++;
        b.free();
      },
    };
  };
  let style = PEN;
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => cam,
    run: (c) => {
      runs.push(c);
      return refuse ? null : doc.apply(c);
    },
  };
  const tool = createPenTool(ctx, () => style);
  return { doc, page, runs, builders, tool, setStyle: (st: StrokeStyle) => { style = st; } };
}

function commitOf(runs: Command[]): Extract<Command, { type: "CommitStroke" }> {
  const c = runs[0];
  if (c?.type !== "CommitStroke") throw new Error("CommitStroke attendue");
  return c;
}

describe("createPenTool (D20, D38)", () => {
  it("rien n'est écrit avant le relâché (D38)", () => {
    const { doc, runs, tool } = setup();
    tool.begin(1, [s(10, 10)]);
    tool.extend(1, [s(20, 10), s(30, 10)], []);
    tool.frame();
    expect(runs).toEqual([]);
    expect(doc.version()).toBe(0);
    expect(tool.active()).toBe(true);
    expect(tool.live().strokes).toHaveLength(1);
    expect(tool.live().strokes[0]?.outline.length).toBeGreaterThan(0);
  });

  it("relâché : une CommitStroke en coordonnées monde, triplets x, y, pression", () => {
    const { doc, page, runs, tool } = setup({ zoom: 2, tx: 10, ty: 20 });
    tool.begin(1, [s(30, 60, 0.4)]);
    tool.extend(1, [s(50, 60, 0.6)], []);
    tool.close(1, "end");
    expect(runs).toHaveLength(1);
    const c = commitOf(runs);
    expect(c.page).toBe(page);
    expect(Array.from(c.points)).toEqual([10, 20, 0.4, 20, 20, 0.6].map((v) => Math.fround(v)));
    expect(c.style).toEqual(PEN);
    expect(doc.elementIds(page)).toHaveLength(1);
    expect(tool.active()).toBe(false);
  });

  it("un push du builder par image, seulement s'il y a des points nouveaux", () => {
    const { builders, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(5, 0)], []);
    tool.extend(1, [s(9, 0)], []);
    tool.frame();
    tool.frame();
    expect(builders.pushes).toBe(1);
  });

  it("pointercancel (cancel) garde l'encre reçue (D39)", () => {
    const { runs, builders, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(5, 0)], []);
    tool.close(1, "cancel");
    expect(commitOf(runs).points.length).toBe(6);
    expect(builders.freed).toBe(1);
  });

  it("abort (second doigt, paume) : rien d'écrit, builder libéré", () => {
    const { doc, runs, builders, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(5, 0)], []);
    tool.frame();
    tool.close(1, "abort");
    expect(runs).toEqual([]);
    expect(doc.version()).toBe(0);
    expect([builders.created, builders.freed]).toEqual([1, 1]);
    expect(tool.live().strokes).toHaveLength(0);
  });

  it("points prédits (OF44) : contour du builder prolongé, à la pression du dernier point reçu, sans queue à part", () => {
    const { builders, tool } = setup();
    tool.begin(1, [s(0, 0, 0.3)]);
    tool.extend(1, [s(10, 0, 0.3)], [s(14, 0, 0.9), s(18, 0, 0.9)]);
    tool.frame();
    expect(builders.aheads).toEqual([[14, 0, 0.3, 18, 0, 0.3].map((v) => Math.fround(v))]);
    const view = tool.live().strokes[0];
    expect(Array.from(view?.outline ?? [])).toEqual([0, 0, 10, 0, 14, 0, 18, 0]);
    expect(view && "predicted" in view).toBe(false);
  });

  it("points prédits retirés sur la première image sans point nouveau, puis plus aucun push", () => {
    const { builders, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(10, 0)], [s(14, 0), s(18, 0)]);
    tool.frame();
    tool.frame();
    expect(Array.from(tool.live().strokes[0]?.outline ?? [])).toEqual([0, 0, 10, 0]);
    expect(builders.aheads).toEqual([[14, 0, 0.5, 18, 0, 0.5], []]);
    tool.frame();
    expect(builders.pushes).toBe(2);
  });

  it("le relâché n'enregistre aucun point prédit", () => {
    const { runs, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(10, 0)], [s(14, 0), s(18, 0)]);
    tool.frame();
    tool.close(1, "end");
    expect(Array.from(commitOf(runs).points)).toEqual([0, 0, 0.5, 10, 0, 0.5]);
  });

  it("échantillon non fini ignoré : aucune erreur « points invalides »", () => {
    const { doc, page, runs, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(Number.NaN, 5), s(10, Number.POSITIVE_INFINITY), s(10, 10)], []);
    tool.close(1, "end");
    const c = commitOf(runs);
    expect(c.points.length).toBe(6);
    expect(c.points.every((v) => Number.isFinite(v))).toBe(true);
    expect(doc.elementIds(page)).toHaveLength(1);
  });

  it("stylet qui ne rend que 0 ou 0,5 : pression constante 0,5 (D8)", () => {
    const { runs, tool } = setup();
    tool.begin(1, [s(0, 0, 0)]);
    tool.extend(1, [s(5, 0, 0), s(9, 0, 0.5)], []);
    tool.close(1, "end");
    const c = commitOf(runs);
    expect([c.points[2], c.points[5], c.points[8]]).toEqual([0.5, 0.5, 0.5]);
  });

  it("deux pointeurs : deux traits indépendants ; le style est figé au début du geste", () => {
    const { runs, tool, setStyle } = setup();
    tool.begin(1, [s(0, 0)]);
    setStyle({ color: "#dc2626", width: 8 });
    tool.begin(2, [s(100, 100)]);
    tool.extend(1, [s(5, 0)], []);
    tool.extend(2, [s(105, 100)], []);
    tool.frame();
    expect(tool.live().strokes).toHaveLength(2);
    tool.close(2, "end");
    tool.close(1, "end");
    expect(runs.map((c) => (c.type === "CommitStroke" ? c.style.color : c.type))).toEqual(["#dc2626", "#000000"]);
  });

  it("écriture refusée par le cœur (run rend null) : aucune exception, geste fermé", () => {
    const { tool } = setup(undefined, true);
    tool.begin(1, [s(0, 0)]);
    expect(() => tool.close(1, "end")).not.toThrow();
    expect(tool.active()).toBe(false);
  });
});

describe("createPenTool — grille (C9)", () => {
  it("grille aimantée sur la page : le tracé garde ses points bruts (C9, S3)", () => {
    const { doc, page, runs, tool } = setup();
    doc.apply({
      type: "SetGrid",
      page,
      grid: { visible: true, snap: true, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", lineWidth: 1, snap: true, visible: true }] },
    });
    tool.begin(1, [s(13, 17)]);
    tool.extend(1, [s(53, 21), s(118, 97)], []);
    tool.frame();
    tool.close(1, "end");
    expect(Array.from(commitOf(runs).points)).toEqual([13, 17, 0.5, 53, 21, 0.5, 118, 97, 0.5].map((v) => Math.fround(v)));
  });
});
