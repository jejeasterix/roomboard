import { describe, expect, it } from "vitest";
import { Canvas2DRenderer } from "./canvas2d";
import { FakeGL } from "./fake-gl";
import type { SceneSource } from "./renderer";
import { chooseRenderer } from "./select";
import { WebGL2LiveRenderer } from "./webgl2";

/** Faux canvas : rend le contexte demandé s'il est prévu, sinon null (comme un navigateur sans WebGL2). */
class FakeCanvas {
  readonly asked: string[] = [];
  replacedBy: FakeCanvas | null = null;
  constructor(private readonly contexts: Record<string, unknown>) {}
  getContext(kind: string): unknown {
    this.asked.push(kind);
    return this.contexts[kind] ?? null;
  }
  cloneNode(): FakeCanvas {
    return new FakeCanvas({ "2d": ctx2d() });
  }
  replaceWith(n: FakeCanvas): void {
    this.replacedBy = n;
  }
}

const ctx2d = (): unknown => ({ canvas: { width: 0, height: 0 } });
const SRC: SceneSource = { element: () => null, outline: () => null };
const el = (c: FakeCanvas): HTMLCanvasElement => c as unknown as HTMLCanvasElement;

describe("chooseRenderer (échelon 4 et repli)", () => {
  it("réglage éteint : Canvas 2D, contexte WebGL2 jamais demandé", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ "2d": ctx2d(), webgl2: new FakeGL() });
    const c = chooseRenderer(el(scene), el(live), SRC, false);
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c).toMatchObject({ webgl: false, note: null });
    expect(live.asked).toEqual(["2d"]);
  });

  it("réglage allumé et WebGL2 donné : rendu WebGL2, scène en Canvas 2D", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ webgl2: new FakeGL() });
    const c = chooseRenderer(el(scene), el(live), SRC, true);
    expect(c.renderer).toBeInstanceOf(WebGL2LiveRenderer);
    expect(c).toMatchObject({ webgl: true, note: null });
    expect(live.asked).toEqual(["webgl2"]);
    expect(scene.asked).toEqual(["2d"]);
  });

  it("contexte WebGL2 nul : repli Canvas 2D, note dite", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ "2d": ctx2d() });
    const c = chooseRenderer(el(scene), el(live), SRC, true);
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c).toMatchObject({ webgl: false, note: "WebGL2 indisponible : repli Canvas 2D" });
    expect(live.asked).toEqual(["webgl2", "2d"]);
  });

  it("programme refusé : canvas remplacé par un clone, repli Canvas 2D, note avec la cause", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ webgl2: gl });
    const c = chooseRenderer(el(scene), el(live), SRC, true);
    expect(live.replacedBy).not.toBeNull();
    expect(live.replacedBy?.asked).toEqual(["2d"]);
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c.webgl).toBe(false);
    expect(c.note).toMatch(/^WebGL2 refusé \(WebGL2 : shader refusé.*\) : repli Canvas 2D$/);
  });
});
