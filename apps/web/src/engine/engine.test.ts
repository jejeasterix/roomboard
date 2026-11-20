import { describe, expect, it } from "vitest";
import type { Change, StrokeStyle } from "../core/api";
import { fakeCore } from "../core/fake-core";
import type { FrameLoopDeps } from "../proto/frame-loop";
import { fitWidth, type Camera } from "./camera";
import { createEngine, ENGINE_FRAME_HISTORY, WHEEL_ZOOM_SPEED, type ToolFactories } from "./engine";
import type { CloseReason } from "./input/gesture";
import type { KeyLike } from "./input/keys";
import type { InputSample } from "./input/sampler";
import { EMPTY_OVERLAY, type EditOverlay } from "./render/overlay";
import type { LiveLayer, PageView, Renderer } from "./render/renderer";
import { createSelectTool } from "./tools/select";
import { createShapeTool } from "./tools/shape";
import type { TableCellState } from "./table-geom";
import { createTableTool, type TablePicker } from "./tools/table";
import type { TextEditorHost, TextEditSession } from "./tools/text";
import { NO_LIVE, type GestureTool, type TableTool, type ToolContext } from "./tools/tool";

class Frames implements FrameLoopDeps {
  private next = 1;
  private readonly queue = new Map<number, (ts: number) => void>();
  t = 0;
  requestFrame(cb: (ts: number) => void): number {
    const id = this.next++;
    this.queue.set(id, cb);
    return id;
  }
  cancelFrame(id: number): void {
    this.queue.delete(id);
  }
  now(): number {
    return this.t;
  }
  pending(): number {
    return this.queue.size;
  }
  tick(): void {
    this.t += 16;
    const cbs = [...this.queue.values()];
    this.queue.clear();
    for (const cb of cbs) cb(this.t);
  }
}

class FakeRenderer implements Renderer {
  readonly scenes: { page: PageView; camera: Camera; hidden: string[] }[] = [];
  readonly lives: LiveLayer[] = [];
  readonly sizes: number[][] = [];
  readonly changes: Change[] = [];
  readonly overlays: (EditOverlay | undefined)[] = [];
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void {
    this.scenes.push({ page, camera, hidden: [...hidden] });
    this.overlays.push(overlay);
  }
  drawLive(live: LiveLayer): void {
    this.lives.push(live);
  }
  resize(width: number, height: number, dpr: number): void {
    this.sizes.push([width, height, dpr]);
  }
  invalidate(change: Change): void {
    this.changes.push(change);
  }
}

const PEN: StrokeStyle = { color: "#000000", width: 4 };
const sample: InputSample = { x: 1, y: 2, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 };

interface FakeTool extends GestureTool {
  hide(ids: string[]): void;
}

/** Faux outil : journalise ; le faux stylo écrit un trait au relâché "end" (comme T21). */
function fakeTool(name: "pen" | "eraser", log: string[], ctx: ToolContext): FakeTool {
  const active = new Set<number>();
  let hidden: ReadonlySet<string> = new Set<string>();
  return {
    hide(ids) {
      hidden = new Set(ids);
    },
    begin(id) {
      active.add(id);
      log.push(`${name}.begin ${id}`);
    },
    extend(id) {
      log.push(`${name}.extend ${id}`);
    },
    frame() {
      log.push(`${name}.frame`);
    },
    close(id: number, how: CloseReason) {
      active.delete(id);
      log.push(`${name}.close ${id} ${how}`);
      if (name === "pen" && how === "end") {
        ctx.run({ type: "CommitStroke", page: ctx.page(), points: new Float32Array([10, 10, 0.5, 20, 20, 0.5]), style: PEN });
      }
    },
    live: () => ({ strokes: [], erasers: [], hidden }),
    active: () => active.size > 0,
  };
}

function setup() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const made = new Map<string, FakeTool>();
  const tools: ToolFactories = {
    pen: (ctx) => {
      const t = fakeTool("pen", log, ctx);
      made.set("pen", t);
      return t;
    },
    eraser: (ctx) => {
      const t = fakeTool("eraser", log, ctx);
      made.set("eraser", t);
      return t;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const tool = (n: string): FakeTool => {
    const t = made.get(n);
    if (!t) throw new Error(`outil absent : ${n}`);
    return t;
  };
  return { doc, frames, renderer, log, engine, tool };
}

const key = (k: string, mods: Partial<Omit<KeyLike, "key">> = {}): KeyLike => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  isComposing: false,
  target: null,
  ...mods,
});

describe("createEngine", () => {
  it("redraw : une scène de plus à l'image suivante (bitmap arrivé)", () => {
    const { engine, frames, renderer } = setup();
    engine.resize(800, 600, 1);
    frames.tick();
    const n = renderer.scenes.length;
    engine.redraw();
    frames.tick();
    expect(renderer.scenes.length).toBe(n + 1);
  });

  it("démarre sur la première page : rien à annuler, aucune erreur, outil stylo", () => {
    const { doc, engine } = setup();
    expect(engine.state()).toMatchObject({
      tool: "pen",
      eraserMode: "partial",
      canUndo: false,
      canRedo: false,
      elementCount: 0,
      error: null,
    });
    expect(engine.state().page).toBe(doc.pageIds()[0]);
  });

  it("resize : rendu redimensionné, caméra ajustée à la page une seule fois", () => {
    const { engine, renderer } = setup();
    engine.resize(1280, 720, 2);
    const fitted = engine.camera();
    expect(fitted.zoom).toBeCloseTo((1280 / 1920) * 0.95);
    engine.view.panBy(10, 0);
    engine.resize(1000, 700, 2);
    expect(engine.camera().tx).toBeCloseTo(fitted.tx + 10);
    expect(renderer.sizes).toEqual([
      [1280, 720, 2],
      [1000, 700, 2],
    ]);
  });

  it("sink : le geste va à l'outil demandé par le routeur, la boucle d'image démarre", () => {
    const { engine, log, frames } = setup();
    engine.sink.begin(1, "eraser", [sample]);
    engine.sink.extend(1, [sample], []);
    expect(log).toEqual(["eraser.begin 1", "eraser.extend 1"]);
    expect(frames.pending()).toBe(1);
  });

  it("une image : frame des outils, scène si sale, couche vive, onLiveDrawn", () => {
    const { engine, renderer, frames, log } = setup();
    const drawn: number[] = [];
    engine.onLiveDrawn((now) => drawn.push(now));
    engine.sink.begin(1, "pen", [sample]);
    frames.tick();
    expect(log).toEqual(["pen.begin 1", "pen.frame", "eraser.frame"]);
    expect(renderer.scenes).toHaveLength(1);
    expect(renderer.lives).toHaveLength(1);
    expect(drawn).toEqual([16]);
    frames.tick();
    expect(renderer.scenes).toHaveLength(1);
    expect(renderer.lives).toHaveLength(2);
  });

  it("fin du geste : une écriture, scène redessinée avec l'élément, état émis, boucle arrêtée", () => {
    const { engine, renderer, frames } = setup();
    const states: boolean[] = [];
    engine.onState((s) => states.push(s.canUndo));
    engine.sink.begin(1, "pen", [sample]);
    frames.tick();
    engine.sink.close(1, "end");
    expect(states).toEqual([true]);
    expect(engine.state().elementCount).toBe(1);
    expect(renderer.changes).toHaveLength(1);
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.elementIds).toHaveLength(1);
    expect(frames.pending()).toBe(0);
  });

  it("Err(LastPage) attrapé : run rend null, message dans l'état, rien ne lève", () => {
    const { engine } = setup();
    const errors: (string | null)[] = [];
    engine.onState((s) => errors.push(s.error));
    let result: Change | null | undefined;
    expect(() => {
      result = engine.run({ type: "RemovePage", page: engine.state().page });
    }).not.toThrow();
    expect(result).toBeNull();
    expect(errors).toEqual(["la dernière page ne se supprime pas"]);
    expect(engine.state().error).toBe("la dernière page ne se supprime pas");
  });

  it("l'erreur s'efface à la commande réussie suivante", () => {
    const { engine } = setup();
    engine.run({ type: "RemovePage", page: engine.state().page });
    const ok = engine.run({ type: "CommitStroke", page: engine.state().page, points: new Float32Array([1, 1, 0.5]), style: PEN });
    expect(ok?.ids).toHaveLength(1);
    expect(engine.state().error).toBeNull();
  });

  it("Ctrl+Z annule, Ctrl+Y et Ctrl+Maj+Z rétablissent ; invalidation complète", () => {
    const { engine, renderer } = setup();
    engine.sink.begin(1, "pen", [sample]);
    engine.sink.close(1, "end");
    expect(engine.key(key("z", { ctrlKey: true }))).toBe(true);
    expect(engine.state()).toMatchObject({ elementCount: 0, canUndo: false, canRedo: true });
    expect(renderer.changes.at(-1)?.full).toBe(true);
    expect(engine.key(key("y", { ctrlKey: true }))).toBe(true);
    expect(engine.state().elementCount).toBe(1);
    engine.key(key("z", { ctrlKey: true }));
    expect(engine.key(key("Z", { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(engine.state().elementCount).toBe(1);
    expect(engine.key(key("a", { ctrlKey: true }))).toBe(false);
  });

  it("Ctrl+Z sur un document neuf : rien, aucune erreur, la page initiale reste (D37)", () => {
    const { engine, doc } = setup();
    expect(engine.key(key("z", { ctrlKey: true }))).toBe(true);
    expect(doc.pageIds()).toHaveLength(1);
    expect(engine.state().error).toBeNull();
  });

  it("molette : défilement ; Ctrl+molette : zoom autour du pointeur", () => {
    const { engine } = setup();
    engine.wheel({ x: 0, y: 0, deltaX: 10, deltaY: 100, ctrlKey: false });
    expect(engine.camera()).toEqual({ zoom: 1, tx: -10, ty: -100 });
    engine.wheel({ x: 50, y: 50, deltaX: 0, deltaY: -100, ctrlKey: true });
    expect(engine.camera().zoom).toBeCloseTo(Math.exp(100 * WHEEL_ZOOM_SPEED));
  });

  it("masquage d'aperçu : la scène est redessinée quand l'ensemble masqué change", () => {
    const { engine, renderer, frames, tool } = setup();
    engine.sink.begin(1, "eraser", [sample]);
    frames.tick();
    tool("eraser").hide(["x"]);
    frames.tick();
    expect(renderer.scenes.map((s) => s.hidden)).toEqual([[], ["x"]]);
    frames.tick();
    expect(renderer.scenes).toHaveLength(2);
  });

  it("view : pincement et défilement déplacent la caméra et redessinent la scène", () => {
    const { engine, renderer, frames } = setup();
    engine.view.zoomAt(0, 0, 2);
    engine.view.panBy(5, 5);
    frames.tick();
    expect(engine.camera()).toEqual({ zoom: 2, tx: 5, ty: 5 });
    expect(renderer.scenes.at(-1)?.camera).toEqual({ zoom: 2, tx: 5, ty: 5 });
    expect(frames.pending()).toBe(0);
  });

  it("dispose : les gestes en cours sont fermés sans écriture (abort), la boucle s'arrête", () => {
    const { engine, log, frames } = setup();
    engine.sink.begin(1, "pen", [sample]);
    engine.dispose();
    expect(log).toContain("pen.close 1 abort");
    expect(frames.pending()).toBe(0);
  });

  it("outil main : setTool('hand') dans l'état et dans tool()", () => {
    const { engine } = setup();
    const seen: string[] = [];
    engine.onState((s) => seen.push(s.tool));
    engine.setTool("hand");
    expect(engine.tool()).toBe("hand");
    expect(seen).toEqual(["hand"]);
  });

  it("espace : keydown tient la vue (panHeld), keyup la rend ; les deux demandent preventDefault", () => {
    const { engine } = setup();
    expect(engine.panHeld()).toBe(false);
    expect(engine.key(key(" "))).toBe(true);
    expect(engine.panHeld()).toBe(true);
    expect(engine.key(key(" "))).toBe(true);
    expect(engine.keyUp(key(" "))).toBe(true);
    expect(engine.panHeld()).toBe(false);
    expect(engine.keyUp(key(" "))).toBe(false);
    expect(engine.keyUp(key("z"))).toBe(false);
  });

  it("espace dans un champ de saisie : rien, la touche reste au champ", () => {
    const { engine } = setup();
    expect(engine.key(key(" ", { target: { tagName: "INPUT" } }))).toBe(false);
    expect(engine.panHeld()).toBe(false);
    expect(engine.keyUp(key(" ", { target: { tagName: "INPUT" } }))).toBe(false);
  });

  it("releaseKeys : espace relâché à la perte du focus", () => {
    const { engine } = setup();
    engine.key(key(" "));
    engine.releaseKeys();
    expect(engine.panHeld()).toBe(false);
  });

  it("caméra par page : chaque page garde sa vue", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    expect(engine.run({ type: "AddPage", after: p1 })).not.toBeNull();
    const p2 = doc.pageIds().find((id) => id !== p1) ?? "";
    engine.resize(1280, 720, 1);
    engine.view.panBy(100, 0);
    const cam1: Camera = engine.camera();
    expect(engine.showPage(p2)).toBe(true);
    expect(engine.state().page).toBe(p2);
    expect(engine.camera()).toEqual(fitWidth(1280, 720));
    engine.view.zoomAt(0, 0, 2);
    const cam2 = engine.camera();
    expect(engine.showPage(p1)).toBe(true);
    expect(engine.camera()).toEqual(cam1);
    expect(engine.showPage(p2)).toBe(true);
    expect(engine.camera()).toEqual(cam2);
  });

  it("showPage d'une page inconnue : false, rien ne change", () => {
    const { engine } = setup();
    const before = engine.state();
    const cam = engine.camera();
    expect(engine.showPage("inconnue")).toBe(false);
    expect(engine.state()).toEqual(before);
    expect(engine.camera()).toBe(cam);
  });

  it("showPage ferme les gestes en cours sans écriture (abort) et redessine la page montrée", () => {
    const { doc, engine, log, frames, renderer } = setup();
    const p1 = engine.state().page;
    engine.run({ type: "AddPage", after: p1 });
    const p2 = doc.pageIds().find((id) => id !== p1) ?? "";
    engine.sink.begin(1, "pen", [sample]);
    expect(engine.showPage(p2)).toBe(true);
    expect(log).toContain("pen.close 1 abort");
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.id).toBe(p2);
    expect(doc.elementIds(p1)).toEqual([]);
  });

  it("frameDurations plafonné à 3 600 images (ENGINE_FRAME_HISTORY)", () => {
    const { engine, frames } = setup();
    expect(ENGINE_FRAME_HISTORY).toBe(3600);
    engine.sink.begin(1, "pen", [sample]);
    for (let i = 0; i < 3700; i++) frames.tick();
    expect(engine.frameDurations()).toHaveLength(3600);
  });

  it("addPage : insère après la page montrée et la montre", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    expect(engine.addPage()).toBe(true);
    const [, p2] = doc.pageIds();
    expect(engine.state()).toMatchObject({ page: p2, pageIndex: 1, pageCount: 2 });
    expect(engine.prevPage()).toBe(true);
    expect(engine.state().page).toBe(p1);
    expect(engine.addPage()).toBe(true);
    const ids = doc.pageIds();
    expect(ids).toHaveLength(3);
    expect(ids[2]).toBe(p2);
    expect(engine.state()).toMatchObject({ page: ids[1], pageIndex: 1 });
  });

  it("removePage de la page montrée : la précédente est montrée (CL4-9)", () => {
    const { doc, engine } = setup();
    engine.addPage();
    engine.addPage();
    const [p1, p2, p3] = doc.pageIds();
    engine.showPage(p2 ?? "");
    expect(engine.removePage()).toBe(true);
    expect(doc.pageIds()).toEqual([p1, p3]);
    expect(engine.state()).toMatchObject({ page: p1, pageIndex: 0, pageCount: 2, error: null });
  });

  it("removePage de la première page : la nouvelle première est montrée", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    engine.addPage();
    engine.showPage(p1);
    expect(engine.removePage()).toBe(true);
    expect(engine.state().page).toBe(doc.pageIds()[0]);
    expect(engine.state().pageCount).toBe(1);
  });

  it("removePage sur la dernière page : refus dans l'état, rien ne change (D37)", () => {
    const { engine } = setup();
    const p = engine.state().page;
    expect(engine.removePage()).toBe(false);
    expect(engine.state()).toMatchObject({ page: p, pageCount: 1, error: "la dernière page ne se supprime pas" });
  });

  it("annuler l'ajout montre la page précédente, rétablir la remontre", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    engine.addPage();
    const p2 = engine.state().page;
    engine.undo();
    expect(doc.pageIds()).toEqual([p1]);
    expect(engine.state()).toMatchObject({ page: p1, pageIndex: 0, pageCount: 1, error: null });
    engine.redo();
    expect(engine.state()).toMatchObject({ page: p2, pageIndex: 1, pageCount: 2 });
  });

  it("annuler le retrait remontre la page avec ses éléments", () => {
    const { engine } = setup();
    engine.addPage();
    const p2 = engine.state().page;
    engine.run({ type: "CommitStroke", page: p2, points: new Float32Array([10, 10, 0.5, 20, 20, 0.5]), style: PEN });
    engine.removePage();
    expect(engine.state().page).not.toBe(p2);
    engine.undo();
    expect(engine.state()).toMatchObject({ page: p2, elementCount: 1 });
  });

  it("retirer une page garde sa caméra : annuler le retrait rend sa vue", () => {
    const { engine } = setup();
    engine.resize(1280, 720, 1);
    engine.addPage();
    engine.view.panBy(40, 0);
    const cam = engine.camera();
    engine.removePage();
    engine.undo();
    expect(engine.camera()).toEqual(cam);
  });

  it("nextPage et prevPage s'arrêtent aux bords", () => {
    const { engine } = setup();
    expect(engine.nextPage()).toBe(false);
    expect(engine.prevPage()).toBe(false);
    engine.addPage();
    expect(engine.nextPage()).toBe(false);
    expect(engine.prevPage()).toBe(true);
    expect(engine.prevPage()).toBe(false);
    expect(engine.nextPage()).toBe(true);
    expect(engine.state()).toMatchObject({ pageIndex: 1, pageCount: 2, selection: [], selectionBounds: null });
  });

  function editSetup() {
    const doc = fakeCore.blank();
    const frames = new Frames();
    const renderer = new FakeRenderer();
    const leaves: string[] = [];
    let select: ReturnType<typeof createSelectTool> | null = null;
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", [], ctx),
      eraser: (ctx) => fakeTool("eraser", [], ctx),
      select: (ctx) => {
        const s = createSelectTool(ctx);
        const leave = s.leave?.bind(s);
        select = { ...s, leave: (r) => { leaves.push(`select ${r}`); leave?.(r); } };
        return select;
      },
      shape: (ctx, kind, style) => createShapeTool(ctx, kind, style),
    };
    const engine = createEngine({ doc, renderer, frames, tools });
    const page = engine.state().page;
    const rect = (x0: number, y0: number, x1: number, y1: number): string =>
      doc.apply({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: PEN, fill: null }).ids[0] ?? "";
    const sel = () => {
      if (!select) throw new Error("outil Sélection absent");
      return select;
    };
    return { doc, frames, renderer, engine, page, rect, sel, leaves };
  }

  it("outils d'édition absents : outils inertes, sélection vide", () => {
    const { engine } = setup();
    engine.setTool("select");
    expect(() => {
      engine.sink.begin(1, "select", [sample]);
      engine.sink.close(1, "end");
      engine.sink.begin(2, "text", [sample]);
      engine.sink.close(2, "end");
    }).not.toThrow();
    expect(engine.state()).toMatchObject({ tool: "select", selection: [], selectionBounds: null });
  });

  it("le geste d'une forme va à l'outil de la forme : une AddShape au relâché", () => {
    const { engine, doc, page } = editSetup();
    engine.sink.begin(1, "ellipse", [{ ...sample, x: 10, y: 10 }]);
    engine.sink.extend(1, [{ ...sample, x: 110, y: 60 }], []);
    engine.sink.close(1, "end");
    const id = doc.elementIds(page)[0] ?? "";
    expect(doc.element(id)).toMatchObject({ kind: "shape", shape: { shape: "ellipse", w: 100, h: 50 } });
  });

  it("calque d'édition : passé à drawScene, scène redessinée quand il change", () => {
    const { engine, frames, renderer, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    sel().setSelection([a]);
    engine.view.panBy(0, 0);
    frames.tick();
    expect(renderer.overlays.at(-1)).toMatchObject({ handles: true, frame: { x0: 98, y0: 98, x1: 202, y1: 202 } });
    const n = renderer.scenes.length;
    sel().setSelection([]);
    engine.sink.begin(1, "select", [{ ...sample, x: 500, y: 500 }]);
    frames.tick();
    expect(renderer.scenes.length).toBe(n + 1);
    expect(renderer.overlays.at(-1)).toMatchObject({ band: { x0: 500, y0: 500, x1: 500, y1: 500 } });
    expect(renderer.overlays.at(-1)).not.toBe(EMPTY_OVERLAY);
  });

  it("Suppr supprime la sélection en une étape ; annuler la rend", () => {
    const { engine, doc, page, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    sel().setSelection([a, b]);
    expect(engine.key(key("Delete"))).toBe(true);
    expect(doc.elementIds(page)).toEqual([]);
    expect(engine.state().selection).toEqual([]);
    engine.undo();
    expect(doc.elementIds(page)).toEqual([a, b]);
  });

  it("Suppr ou Échap sans sélection : touche laissée à la page ; Suppr dans un champ : rien", () => {
    const { engine, doc, page, rect, sel } = editSetup();
    expect(engine.key(key("Delete"))).toBe(false);
    expect(engine.key(key("Escape"))).toBe(false);
    const a = rect(100, 100, 200, 200);
    sel().setSelection([a]);
    expect(engine.key(key("Delete", { target: { tagName: "TEXTAREA" } }))).toBe(false);
    expect(doc.elementIds(page)).toEqual([a]);
  });

  it("Échap vide la sélection sans écrire", () => {
    const { engine, doc, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    sel().setSelection([a]);
    const v = doc.version();
    expect(engine.key(key("Escape"))).toBe(true);
    expect(engine.state().selection).toEqual([]);
    expect(doc.version()).toBe(v);
  });

  it("changer d'outil ou de page fait quitter l'outil (leave) et vide la sélection", () => {
    const { engine, rect, sel, leaves } = editSetup();
    const a = rect(100, 100, 200, 200);
    engine.setTool("select");
    sel().setSelection([a]);
    engine.setTool("pen");
    expect(leaves).toContain("select tool");
    expect(engine.state().selection).toEqual([]);
    sel().setSelection([a]);
    engine.addPage();
    expect(leaves).toContain("select page");
    expect(engine.state().selection).toEqual([]);
  });

  it("Maj suivie : ctx.shift() vrai entre keydown et keyup, faux après releaseKeys ; la touche n'est pas prise", () => {
    let seen: ToolContext | null = null;
    const doc = fakeCore.blank();
    const engine = createEngine({
      doc,
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: (ctx) => {
          seen = ctx;
          return fakeTool("pen", [], ctx);
        },
        eraser: (ctx) => fakeTool("eraser", [], ctx),
      },
    });
    const shift = (): boolean => (seen as ToolContext | null)?.shift?.() === true;
    expect(engine.key(key("Shift", { shiftKey: true }))).toBe(false);
    expect(shift()).toBe(true);
    expect(engine.keyUp(key("Shift"))).toBe(false);
    expect(shift()).toBe(false);
    engine.key(key("Shift", { shiftKey: true }));
    engine.releaseKeys();
    expect(shift()).toBe(false);
  });

  it("ctx.requestFrame() redessine la scène (outil à l'arrêt)", () => {
    let seen: ToolContext | null = null;
    const frames = new Frames();
    const renderer = new FakeRenderer();
    createEngine({
      doc: fakeCore.blank(),
      renderer,
      frames,
      tools: {
        pen: (ctx) => {
          seen = ctx;
          return fakeTool("pen", [], ctx);
        },
        eraser: (ctx) => fakeTool("eraser", [], ctx),
      },
    });
    frames.tick();
    const n = renderer.scenes.length;
    (seen as ToolContext | null)?.requestFrame?.();
    frames.tick();
    expect(renderer.scenes.length).toBe(n + 1);
  });

  it("état : sélection et boîte de la sélection ; un geste de sélection émet l'état", () => {
    const { engine, rect } = editSetup();
    const a = rect(100, 100, 200, 200);
    const states: number[] = [];
    engine.onState((s) => states.push(s.selection.length));
    engine.sink.begin(1, "select", [{ ...sample, x: 150, y: 150 }]);
    engine.sink.close(1, "end");
    expect(states).toEqual([1]);
    expect(engine.state()).toMatchObject({ selection: [a], selectionBounds: { x0: 98, y0: 98, x1: 202, y1: 202 } });
  });

  it("page jamais vue : cadrée par la largeur", () => {
    const { engine } = setup();
    engine.resize(1000, 400, 1);
    expect(engine.camera()).toEqual(fitWidth(1000, 400));
  });

  it("fitPage recadre après un zoom", () => {
    const { engine } = setup();
    engine.resize(1000, 400, 1);
    engine.view.zoomAt(10, 10, 2);
    engine.fitPage();
    expect(engine.camera()).toEqual(fitWidth(1000, 400));
  });

  it("onCamera : pan, zoom, page, ajustement", () => {
    const { engine } = setup();
    engine.resize(1000, 400, 1);
    engine.addPage();
    const got: Camera[] = [];
    const off = engine.onCamera((c) => got.push(c));
    engine.view.panBy(5, 5);
    engine.view.zoomAt(0, 0, 2);
    engine.prevPage();
    engine.fitPage();
    expect(got.length).toBe(4);
    off();
    engine.view.panBy(1, 1);
    expect(got.length).toBe(4);
  });

  it("setPenStyle : le trait suivant prend la couleur et l'épaisseur", () => {
    // le faux stylo ignore le style : la forme lit le même `style` du moteur (getter partagé avec le stylo)
    const { engine, doc, page } = editSetup();
    const draw = (): unknown => {
      engine.sink.begin(1, "rect", [{ ...sample, x: 10, y: 10 }]);
      engine.sink.extend(1, [{ ...sample, x: 110, y: 60 }], []);
      engine.sink.close(1, "end");
      const ids = doc.elementIds(page);
      return JSON.stringify(doc.element(ids[ids.length - 1] ?? ""));
    };
    engine.setPenStyle({ color: "#dc2626", width: 6 });
    const ok = draw();
    expect(ok).toContain("#dc2626");
    expect(ok).toContain("6");
    engine.setPenStyle({ color: "", width: 7 });
    engine.setPenStyle({ color: "#00ff00", width: Number.NaN });
    const kept = draw();
    expect(kept).toContain("#dc2626");
    expect(kept).not.toContain("#00ff00");
  });

  it("Ctrl+Z après Suppr resélectionne les éléments rendus (CL5b-12)", () => {
    const { engine, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    sel().setSelection([a, b]);
    expect(engine.key(key("Delete"))).toBe(true);
    expect(engine.state().selection).toEqual([]);
    engine.key(key("z", { ctrlKey: true }));
    expect([...engine.state().selection].sort()).toEqual([a, b].sort());
  });

  it("Ctrl+Z après Suppr puis un autre geste : pas de resélection", () => {
    const { engine, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    sel().setSelection([a]);
    engine.key(key("Delete"));
    rect(600, 600, 700, 700);
    engine.run({ type: "AddShape", page: engine.state().page, shape: "rect", x0: 1, y0: 1, x1: 9, y1: 9, style: PEN, fill: null });
    engine.key(key("z", { ctrlKey: true }));
    engine.key(key("z", { ctrlKey: true }));
    expect(engine.state().selection).toEqual([]);
  });
});

describe("createEngine — Alt (C9)", () => {
  it("Alt suivie (C9, G8) : ctx.alt() vrai entre keydown et keyup, faux après releaseKeys ; la touche n'est pas prise", () => {
    let seen: ToolContext | null = null;
    const engine = createEngine({
      doc: fakeCore.blank(),
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: (ctx) => {
          seen = ctx;
          return fakeTool("pen", [], ctx);
        },
        eraser: (ctx) => fakeTool("eraser", [], ctx),
      },
    });
    const alt = (): boolean => (seen as ToolContext | null)?.alt?.() === true;
    expect(alt()).toBe(false);
    expect(engine.key(key("Alt", { altKey: true }))).toBe(false);
    expect(alt()).toBe(true);
    expect(engine.keyUp(key("Alt"))).toBe(false);
    expect(alt()).toBe(false);
    engine.key(key("Alt", { altKey: true }));
    engine.releaseKeys();
    expect(alt()).toBe(false);
  });
});

/** Faux outil Tableau : journalise ; `setCell` change la cellule publiée et prévient le moteur (stateChanged). */
function fakeTableTool(ctx: ToolContext, log: string[]) {
  let cell: TableCellState | null = null;
  let clears = false;
  const tool: TableTool = {
    begin: () => {
      log.push("table.begin");
    },
    extend: () => undefined,
    frame: () => undefined,
    close: () => undefined,
    live: () => NO_LIVE,
    active: () => false,
    cell: () => (cell === null ? null : { id: cell.id, row: "r", col: "c" }),
    cellState: () => cell,
    act: (a) => {
      log.push(`act ${a}`);
    },
    fill: (c) => {
      log.push(`fill ${String(c)}`);
    },
    clearCell: () => {
      log.push("clear");
      return clears;
    },
    prune: () => {
      log.push("prune");
    },
    navigate: () => false,
    compositionStart: () => undefined,
    compositionEnd: () => undefined,
    requestCommit: () => undefined,
  };
  return {
    tool,
    setCell(c: TableCellState | null): void {
      cell = c;
      ctx.stateChanged?.();
    },
    setClears(v: boolean): void {
      clears = v;
    },
  };
}

function setupTable() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const holder: { t?: ReturnType<typeof fakeTableTool> } = {};
  const tools: ToolFactories = {
    pen: (ctx) => fakeTool("pen", log, ctx),
    eraser: (ctx) => fakeTool("eraser", log, ctx),
    table: (ctx) => {
      holder.t = fakeTableTool(ctx, log);
      return holder.t.tool;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const table = holder.t;
  if (table === undefined) throw new Error("outil Tableau non créé");
  return { doc, engine, log, table };
}

describe("moteur — outil Tableau (C10a, contrat T4)", () => {
  const CELL: TableCellState = { id: "t", row: 0, col: 1, rows: 3, cols: 4 };

  it("tableCell : publié par l'outil ; stateChanged émet un état", () => {
    const { engine, table } = setupTable();
    const seen: (TableCellState | null)[] = [];
    engine.onState((s) => seen.push(s.tableCell));
    expect(engine.state().tableCell).toBeNull();
    table.setCell(CELL);
    expect(seen[seen.length - 1]).toEqual(CELL);
    expect(engine.state().tableCell).toEqual(CELL);
  });

  it("prune de l'outil Tableau après chaque commande et chaque annuler / rétablir (I1)", () => {
    const { doc, engine, log } = setupTable();
    engine.run({ type: "AddPage", after: doc.pageIds()[0] ?? null });
    expect(log.filter((l) => l === "prune")).toHaveLength(1);
    engine.undo();
    engine.redo();
    expect(log.filter((l) => l === "prune")).toHaveLength(3);
  });

  it("Suppr avec l'outil Tableau (T7) : pris si l'outil vide une cellule, sinon rien ; autre outil : clearCell jamais appelé", () => {
    const { engine, log, table } = setupTable();
    engine.setTool("table");
    table.setClears(true);
    expect(engine.key(key("Delete"))).toBe(true);
    table.setClears(false);
    expect(engine.key(key("Backspace"))).toBe(false);
    expect(log.filter((l) => l === "clear")).toHaveLength(2);
    engine.setTool("pen");
    expect(engine.key(key("Delete"))).toBe(false);
    expect(log.filter((l) => l === "clear")).toHaveLength(2);
  });

  it("tableAction, tableFill : délégués à l'outil Tableau", () => {
    const { engine, log } = setupTable();
    engine.tableAction("row-insert");
    engine.tableAction("uniform");
    engine.tableFill("#fef08a");
    engine.tableFill(null);
    expect(log.filter((l) => l.startsWith("act") || l.startsWith("fill"))).toEqual(["act row-insert", "act uniform", "fill #fef08a", "fill null"]);
  });

  it("geste avec l'outil Tableau : begin reçu par l'outil", () => {
    const { engine, log } = setupTable();
    engine.setTool("table");
    engine.sink.begin(1, "table", [sample]);
    expect(log).toContain("table.begin");
  });

  it("sans fabrique table : outil inerte, tableCell null, actions et Suppr sans effet", () => {
    const { engine } = setup();
    engine.setTool("table");
    expect(engine.state().tableCell).toBeNull();
    engine.tableAction("uniform");
    engine.tableFill(null);
    expect(engine.key(key("Delete"))).toBe(false);
  });
});

function setupRealTable() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const host: TextEditorHost & { text: string } = {
    text: "",
    open(s: TextEditSession) {
      host.text = s.initial;
    },
    close() {},
    value: () => host.text,
  };
  let pick: ((c: number, r: number) => void) | null = null;
  const picker: TablePicker = {
    open: (_at, p) => {
      pick = p;
    },
    close: () => {
      pick = null;
    },
    isOpen: () => pick !== null,
  };
  const holder: { t?: TableTool } = {};
  const tools: ToolFactories = {
    pen: (ctx) => fakeTool("pen", log, ctx),
    eraser: (ctx) => fakeTool("eraser", log, ctx),
    table: (ctx, style) => {
      holder.t = createTableTool(ctx, host, picker, style, (s) => s.length * 10);
      return holder.t;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const tool = holder.t;
  if (tool === undefined) throw new Error("outil Tableau non créé");
  engine.setTool("table");
  /** Clic au point monde (caméra identité) puis choix cols × rows dans la grille. */
  const create = (x: number, y: number, cols: number, rows: number): void => {
    engine.sink.begin(1, "table", [{ ...sample, x, y }]);
    engine.sink.close(1, "end");
    const p = pick;
    pick = null;
    p?.(cols, rows);
  };
  return { doc, engine, host, tool, create };
}

describe("moteur et outil Tableau (C10a, S2)", () => {
  it("Ctrl+Z qui retire la ligne de la cellule active : tableCell null (I1)", () => {
    const { engine, tool, create } = setupRealTable();
    create(100, 200, 2, 1);
    expect(engine.state().tableCell).toMatchObject({ row: 0, col: 0, rows: 1, cols: 2 });
    tool.navigate("next");
    tool.navigate("next");
    tool.requestCommit();
    expect(engine.state().tableCell).toMatchObject({ row: 1, col: 0, rows: 2 });
    expect(engine.key(key("z", { ctrlKey: true }))).toBe(true);
    expect(engine.state().tableCell).toBeNull();
  });

  it("Suppr, outil Tableau, cellule active : vide la cellule, une étape ; outil Sélection : Suppr à la sélection", () => {
    const { doc, engine, host, tool, create } = setupRealTable();
    create(100, 200, 2, 2);
    host.text = "xy";
    tool.requestCommit();
    const v = doc.version();
    expect(engine.key(key("Delete"))).toBe(true);
    expect(doc.version()).toBe(v + 1);
    engine.setTool("select");
    expect(engine.state().tableCell).toBeNull();
    expect(engine.key(key("Delete"))).toBe(false);
  });

  it("− Ligne par engine.tableAction : la cellule active passe à la voisine, l'état suit", () => {
    const { engine, tool, create } = setupRealTable();
    create(100, 200, 1, 3);
    tool.navigate("next");
    tool.requestCommit();
    engine.tableAction("row-remove");
    expect(engine.state().tableCell).toMatchObject({ row: 1, col: 0, rows: 2 });
  });
});
