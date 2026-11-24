import { describe, expect, it, vi } from "vitest";
import { IDENTITY } from "../camera";
import { Canvas2DRenderer } from "./canvas2d";
import { FakeCtx } from "./fake-ctx";
import { FakeGL } from "./fake-gl";
import type { SceneSource } from "./renderer";
import { chooseRenderer } from "./select";
import { WebGL2LiveRenderer } from "./webgl2";

/** Faux canvas : rend le contexte demandé s'il est prévu, sinon null (comme un navigateur sans WebGL2). */
class FakeCanvas {
  readonly asked: string[] = [];
  replacedBy: FakeCanvas | null = null;
  parentNode: object | null = {};
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

  it("C11a : transparent → Canvas 2D même si WebGL2 demandé, WebGL2 jamais demandé", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ "2d": ctx2d(), webgl2: new FakeGL() });
    const c = chooseRenderer(el(scene), el(live), SRC, true, { transparent: true });
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c.webgl).toBe(false);
    expect(live.asked).toEqual(["2d"]);
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

  it("édition de liens ratée : repli Canvas 2D, programme supprimé", () => {
    const gl = new FakeGL();
    gl.linkOk = false;
    const c = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ webgl2: gl })), SRC, true);
    expect(c.webgl).toBe(false);
    expect(c.note).toMatch(/^WebGL2 refusé \(WebGL2 : programme refusé/);
    expect(gl.log).toContain("deleteProgram");
  });

  it("diagnostics : off sans WebGL, repli sans contexte, état WebGL2 sur faux GL", () => {
    const mk = (): FakeCanvas => new FakeCanvas({ "2d": ctx2d() });
    expect(chooseRenderer(el(mk()), el(mk()), SRC, false).diagnostics()).toEqual({ webgl: "off", lost: false, badColors: [] });
    expect(chooseRenderer(el(mk()), el(mk()), SRC, true).diagnostics()).toEqual({ webgl: "repli", lost: false, badColors: [] });
    const gl = new FakeGL();
    const c = chooseRenderer(el(mk()), el(new FakeCanvas({ webgl2: gl })), SRC, true);
    expect(c.diagnostics()).toEqual({ webgl: "on", lost: false, badColors: [] });
    (c.renderer as WebGL2LiveRenderer).drawLive(
      { strokes: [{ outline: new Float32Array([0, 0, 1, 0, 1, 1]), color: "pas-une-couleur" }], erasers: [] },
      { zoom: 1, tx: 0, ty: 0 },
    );
    gl.fire("webglcontextlost");
    expect(c.diagnostics()).toEqual({ webgl: "on", lost: true, badColors: ["pas-une-couleur"] });
  });

  it("diagnostics : programme refusé donne repli", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    const c = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ webgl2: gl })), SRC, true);
    expect(c.diagnostics().webgl).toBe("repli");
  });

  it("repli : le contexte WebGL2 du canvas remplacé est perdu (WEBGL_lose_context)", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ webgl2: gl })), SRC, true);
    expect(gl.log).toContain("loseContext");
  });

  it("repli sans extension WEBGL_lose_context : pas d'erreur", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    gl.loseContextAvailable = false;
    const c = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ webgl2: gl })), SRC, true);
    expect(c.webgl).toBe(false);
    expect(gl.log).not.toContain("loseContext");
  });

  it("le choix rend le canvas d'interaction effectif : l'original, ou le clone après repli", () => {
    const off = new FakeCanvas({ "2d": ctx2d() });
    expect(chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(off), SRC, false).interaction).toBe(el(off));
    const ok = new FakeCanvas({ webgl2: new FakeGL() });
    expect(chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(ok), SRC, true).interaction).toBe(el(ok));
    const nul = new FakeCanvas({ "2d": ctx2d() });
    expect(chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(nul), SRC, true).interaction).toBe(el(nul));
    const gl = new FakeGL();
    gl.compileOk = false;
    const bad = new FakeCanvas({ webgl2: gl });
    const c = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(bad), SRC, true);
    expect(c.interaction).toBe(el(bad.replacedBy as FakeCanvas));
    expect(c.interaction).not.toBe(el(bad));
  });

  it("repli avec un canvas sans parent : la note le dit (le clone n'est pas dans la page)", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    const live = new FakeCanvas({ webgl2: gl });
    live.parentNode = null;
    const c = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(live), SRC, true);
    expect(c.webgl).toBe(false);
    expect(c.note).toMatch(/sans parent/);
    expect(c.note).toMatch(/repli Canvas 2D$/);
  });
});

describe("release (T93 : dispose d'une session libère le contexte WebGL2)", () => {
  it("release : branche WebGL2 → loseContext ; deux appels → un seul", () => {
    const gl = new FakeGL();
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ "2d": ctx2d(), webgl2: gl });
    const choice = chooseRenderer(el(scene), el(live), SRC, true);
    expect(choice.webgl).toBe(true);
    choice.release();
    choice.release();
    expect(gl.log.filter((l) => l === "loseContext")).toHaveLength(1);
  });

  it("release : WebGL2 non demandé → rien, aucune exception", () => {
    const choice = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ "2d": ctx2d() })), SRC, false);
    expect(() => choice.release()).not.toThrow();
  });

  it("release : extension absente → aucune exception", () => {
    const gl = new FakeGL();
    gl.loseContextAvailable = false;
    const choice = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ "2d": ctx2d(), webgl2: gl })), SRC, true);
    expect(() => choice.release()).not.toThrow();
  });

  it("release : contexte WebGL2 nul (repli) → aucune exception", () => {
    const choice = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ "2d": ctx2d() })), SRC, true);
    expect(choice.webgl).toBe(false);
    expect(() => choice.release()).not.toThrow();
  });

  it("options transmises au rendu Canvas 2D : la source d'images est lue (réglage éteint, puis WebGL2 nul)", () => {
    const IMG = "ab".repeat(32);
    const src: SceneSource = {
      element: () => ({ id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: IMG, w: 10, h: 10 } }),
      outline: () => null,
    };
    for (const want of [false, true]) {
      const bitmap = vi.fn(() => null);
      const c = chooseRenderer(el(new FakeCanvas({ "2d": new FakeCtx() })), el(new FakeCanvas({ "2d": new FakeCtx() })), src, want, { images: { bitmap } });
      c.renderer.drawScene({ id: "p", elementIds: ["i"] }, IDENTITY, new Set());
      expect(bitmap, `webgl ${want}`).toHaveBeenCalledWith(IMG);
    }
  });
});
