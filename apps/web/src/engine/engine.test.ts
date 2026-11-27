import { describe, expect, it, vi } from "vitest";
import type { Change, ElementView, StrokeStyle } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { paramsOf, turnShown } from "../core/image-params";
import type { FrameLoopDeps } from "../proto/frame-loop";
import { fitFor, fitWidth, worldToScreen, type Camera } from "./camera";
import { createEngine, ENGINE_FRAME_HISTORY, pageShortcut, WHEEL_ZOOM_SPEED, type EngineDeps, type ToolFactories } from "./engine";
import { DEFAULT_ITEM_STYLE, type ItemStyle } from "./item-style";
import type { CloseReason } from "./input/gesture";
import type { KeyLike } from "./input/keys";
import { linkBadgeBox } from "./render/link-badge";
import type { InputSample } from "./input/sampler";
import { DEFAULT_CAMERA, type ModelCamera } from "./render/model-frames";
import { EMPTY_OVERLAY, type EditOverlay } from "./render/overlay";
import type { GridPreview, ImagePreview, LiveLayer, PageView, Renderer } from "./render/renderer";
import { DEFAULT_TEXT_SIZE } from "./text-layout";
import { createSelectTool } from "./tools/select";
import { createShapeTool } from "./tools/shape";
import type { TableCellState } from "./table-geom";
import { createTableTool, type TablePicker } from "./tools/table";
import { plainSpans } from "../core/rich-text";
import type { FormatState } from "./rich-edit";
import type { TextEditorHost, TextEditSession, TextStyle, TextTool } from "./tools/text";
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
  readonly previews: (GridPreview | null)[] = [];
  setGridPreview(p: GridPreview | null): void {
    this.previews.push(p);
  }
  readonly imagePreviews: (ImagePreview | null)[] = [];
  setImagePreview(p: ImagePreview | null): void {
    this.imagePreviews.push(p);
  }
  /** OG23 (T8) : couleur rendue à chaque lecture de la pipette, et points demandés. */
  color: string | null = "#abcdef";
  readonly asked: [number, number][] = [];
  colorAt(x: number, y: number): string | null {
    this.asked.push([x, y]);
    return this.color;
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

function setup(extra: Pick<EngineDeps, "fitTop" | "pageMode"> = {}) {
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
  const engine = createEngine({ doc, renderer, frames, tools, ...extra });
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

  it("nextOrAdd sur la dernière page ajoute une page au mode du profil, Ctrl+Z la retire", () => {
    const { doc, engine } = setup({ pageMode: () => "portrait" });
    expect(engine.nextOrAdd()).toBe(true);
    expect(doc.pageIds()).toHaveLength(2);
    expect(engine.state()).toMatchObject({ pageIndex: 1, pageCount: 2, pageLayout: "portrait", pageMode: "page" });
    engine.undo();
    expect(doc.pageIds()).toHaveLength(1);
  });

  it("nextOrAdd ailleurs : page suivante", () => {
    const { doc, engine } = setup();
    engine.addPage();
    engine.prevPage();
    expect(engine.nextOrAdd()).toBe(true);
    expect(engine.state()).toMatchObject({ pageIndex: 1, pageCount: 2 });
    expect(doc.pageIds()).toHaveLength(2);
  });

  it("movePage garde la page montrée", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    engine.addPage();
    engine.addPage();
    engine.showPage(p1);
    expect(engine.movePage(p1, 2)).toBe(true);
    expect(doc.pageIds()[2]).toBe(p1);
    expect(engine.state()).toMatchObject({ page: p1, pageIndex: 2 });
  });

  it("duplicatePage montre la copie", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    expect(engine.duplicatePage()).toBe(true);
    const ids = doc.pageIds();
    expect(ids).toHaveLength(2);
    expect(engine.state().page).toBe(ids[1]);
    expect(engine.state().page).not.toBe(p1);
  });

  it("setPageMode portrait : fitPage montre tout le cadre", () => {
    const { engine } = setup();
    engine.resize(1000, 800, 1);
    expect(engine.state().pageLayout).toBe("landscape");
    expect(engine.setPageMode("portrait")).toBe(true);
    expect(engine.state().pageLayout).toBe("portrait");
    engine.fitPage();
    const cam = engine.camera();
    // cadre portrait entier visible : hauteur du cadre (1920 × 16 / 9) × zoom ≤ hauteur de la vue
    expect(cam.zoom * ((1920 * 16) / 9)).toBeLessThanOrEqual(800 + 1e-6);
  });

  it("pageMode / pageLayout dans l'état", () => {
    const { engine } = setup();
    expect(engine.state()).toMatchObject({ pageMode: "page", pageLayout: "landscape" });
    engine.setPageMode("infinite");
    expect(engine.state()).toMatchObject({ pageMode: "infinite", pageLayout: "infinite" });
  });

  const keyEv = (key: string, o: Partial<KeyLike> & { repeat?: boolean } = {}) =>
    ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null, ...o });

  it("PageDown tenu sur la dernière page : une seule page", () => {
    const { doc, engine } = setup();
    expect(pageShortcut(keyEv("PageDown"), engine)).toBe(true);
    expect(pageShortcut(keyEv("PageDown", { repeat: true }), engine)).toBe(false);
    expect(pageShortcut(keyEv("PageDown", { repeat: true }), engine)).toBe(false);
    expect(doc.pageIds()).toHaveLength(2);
    expect(pageShortcut(keyEv("PageUp"), engine)).toBe(true);
    expect(pageShortcut(keyEv("PageDown", { repeat: true }), engine)).toBe(true);
    expect(doc.pageIds()).toHaveLength(2);
  });

  it("Ctrl+M ajoute, Ctrl+Maj+D duplique, Ctrl+Maj+P ouvre la barre latérale", () => {
    const { doc, engine } = setup();
    const toggle = vi.fn();
    expect(pageShortcut(keyEv("m", { ctrlKey: true }), engine, toggle)).toBe(true);
    expect(pageShortcut(keyEv("D", { ctrlKey: true, shiftKey: true }), engine, toggle)).toBe(true);
    expect(doc.pageIds()).toHaveLength(3);
    expect(pageShortcut(keyEv("P", { ctrlKey: true, shiftKey: true }), engine, toggle)).toBe(true);
    expect(toggle).toHaveBeenCalledWith("pages");
    // Lot 2 : Ctrl+Maj+L, sans effet au lot 1, ouvre l'onglet Calques (cadrage, décision 22).
    expect(pageShortcut(keyEv("L", { ctrlKey: true, shiftKey: true }), engine, toggle)).toBe(true);
    expect(toggle).toHaveBeenLastCalledWith("calques");
  });

  it("dans un champ de saisie, PageDown et Ctrl+M ne font rien de la page", () => {
    const { doc, engine } = setup();
    const input = { tagName: "INPUT" };
    expect(pageShortcut(keyEv("PageDown", { target: input }), engine)).toBe(false);
    expect(pageShortcut(keyEv("m", { ctrlKey: true, target: input }), engine)).toBe(false);
    expect(pageShortcut(keyEv("PageDown", { isComposing: true }), engine)).toBe(false);
    expect(doc.pageIds()).toHaveLength(1);
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

  it("OF83 : fitTop pose le haut de la page sous les îlots, à l'ouverture, sur une page neuve et après « ajuster »", () => {
    let top = 152;
    const { engine } = setup({ fitTop: () => top });
    engine.resize(1920, 1080, 1);
    expect(engine.camera()).toEqual(fitWidth(1920, 1080, undefined, undefined, 152));
    engine.addPage();
    expect(engine.camera().ty).toBe(152);
    top = 170;
    engine.view.zoomAt(10, 10, 2);
    engine.fitPage();
    expect(engine.camera()).toEqual(fitWidth(1920, 1080, undefined, undefined, 170));
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

  it("deleteElements (Couper) : comme Suppr, Ctrl+Z resélectionne les éléments rendus", () => {
    const { engine, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    sel().setSelection([a, b]);
    engine.deleteElements([a, b]);
    expect(engine.state().selection).toEqual([]);
    engine.undo();
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

  it("previewGrid (DAE1) : aperçu posé sur la page montrée, scène redessinée, rien d'écrit ; endGridPreview l'ôte une fois", () => {
    const { doc, engine, renderer, frames } = setup();
    engine.resize(800, 600, 1);
    frames.tick();
    const p = engine.state().page;
    const v = doc.version();
    const n = renderer.scenes.length;
    const g = { visible: true, snap: false, above: false, levels: [] };
    engine.previewGrid(g);
    frames.tick();
    expect(renderer.previews).toEqual([{ page: p, grid: g }]);
    expect(renderer.scenes.length).toBe(n + 1);
    expect(doc.version()).toBe(v);
    expect(engine.state().canUndo).toBe(false);
    engine.endGridPreview();
    engine.endGridPreview();
    frames.tick();
    expect(renderer.previews).toEqual([{ page: p, grid: g }, null]);
    expect(renderer.scenes.length).toBe(n + 2);
  });

  it("switchTo coupe l'aperçu (E8) : page changée → setGridPreview(null), une seule fois", () => {
    const { engine, renderer } = setup();
    const p = engine.state().page;
    engine.previewGrid(null);
    expect(engine.addPage()).toBe(true);
    expect(renderer.previews).toEqual([{ page: p, grid: null }, null]);
    engine.endGridPreview();
    expect(renderer.previews).toHaveLength(2);
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
  let ranges = false;
  let fmt: FormatState | null = null;
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
    clearRange: () => {
      log.push("clearRange");
      return ranges;
    },
    prune: () => {
      log.push("prune");
    },
    navigate: () => false,
    compositionStart: () => undefined,
    compositionEnd: () => undefined,
    requestCommit: () => undefined,
    format: (a) => {
      log.push(`table.format ${a.type}`);
    },
    formatState: () => fmt,
    formatChanged: () => ctx.stateChanged?.(),
  };
  return {
    tool,
    setFormat(f: FormatState | null): void {
      fmt = f;
      ctx.stateChanged?.();
    },
    setCell(c: TableCellState | null): void {
      cell = c;
      ctx.stateChanged?.();
    },
    setClears(v: boolean): void {
      clears = v;
    },
    setRanges(v: boolean): void {
      ranges = v;
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
    spans: () => plainSpans(host.text),
    format: () => undefined,
    formatState: () => null,
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

describe("moteur — C10b (F29, F14)", () => {
  const tableEl = (id: string, merged: boolean, shades: number): ElementView => ({
    id,
    kind: "table",
    transform: [1, 0, 0, 1, 0, 0],
    table: {
      color: "#000000",
      size: 36,
      cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }],
      rows: [{ id: "r1", height: 64 }],
      cells: Array.from({ length: shades }, (_, i) => ({ row: "r1", col: `c${i + 1}`, text: "", fill: null, shade: "#94a3b8", spans: [{ text: "", attrs: {} }] })),
      merges: merged ? [{ row: "r1", col: "c1", rows: 1, cols: 2 }] : [],
    },
  });

  it("tableMerges, tableShades : comptés sur tous les tableaux de la page montrée, quel que soit l'outil (F29, S1)", () => {
    const { doc, engine } = setup();
    const page = doc.pageIds()[0] ?? "";
    const els = new Map<string, ElementView>([["a", tableEl("a", true, 2)], ["b", tableEl("b", false, 1)]]);
    const realIds = doc.elementIds.bind(doc);
    const realEl = doc.element.bind(doc);
    doc.elementIds = (p) => (p === page ? [...realIds(p), ...els.keys()] : realIds(p));
    const realKind = doc.elementIdsOfKind.bind(doc);
    doc.elementIdsOfKind = (p, k) => (p === page && k === "table" ? [...realKind(p, k), ...els.keys()] : realKind(p, k));
    doc.element = (id) => els.get(id) ?? realEl(id);
    engine.run({ type: "AddPage", after: page });
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 3]);
    engine.setTool("pen");
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 3]);
    els.delete("b");
    engine.run({ type: "AddPage", after: page });
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 2]);
  });

  it("OE23 (Q7) : tableMerges, tableShades : seule la vue des candidats « table » est lue, jamais celle d'un trait", () => {
    const { doc, engine } = setup();
    const page = doc.pageIds()[0] ?? "";
    const stroke = doc.apply({ type: "CommitStroke", page, points: new Float32Array([10, 10, 0.5, 20, 20, 0.5]), style: PEN }).ids[0] ?? "";
    const table = doc.apply({ type: "AddTable", page, x: 100, y: 200, cols: 2, rows: 1, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const read = vi.spyOn(doc, "element");
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([0, 0]);
    const ids = read.mock.calls.map(([id]) => id);
    expect(ids).toContain(table);
    expect(ids).not.toContain(stroke);
  });

  it("OE23 (H4) : un candidat « table » dont la vue n'est pas un tableau (mal formé, vue unknown) ne compte pas", () => {
    const { doc, engine } = setup();
    const page = doc.pageIds()[0] ?? "";
    const views = new Map<string, ElementView>([
      ["a", tableEl("a", true, 2)],
      ["m", { id: "m", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "table", w: 10, h: 10 } }],
    ]);
    const realEl = doc.element.bind(doc);
    doc.elementIdsOfKind = (p, k) => (p === page && k === "table" ? [...views.keys()] : []);
    doc.element = (id) => views.get(id) ?? realEl(id);
    engine.run({ type: "AddPage", after: page });
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 2]);
  });

  it("textStyle : couleur du stylo, taille par défaut (cible d'import, F21)", () => {
    const { engine } = setup();
    engine.setPenStyle({ color: "#1d4ed8", width: 4 });
    expect(engine.textStyle()).toEqual({ color: "#1d4ed8", size: DEFAULT_TEXT_SIZE });
  });

  it("Échap avec l'outil Tableau (PC18) : pris si l'outil retire une plage ; sinon rien ; autre outil : jamais appelé", () => {
    const { engine, log, table } = setupTable();
    engine.setTool("table");
    table.setRanges(true);
    expect(engine.key(key("Escape"))).toBe(true);
    table.setRanges(false);
    expect(engine.key(key("Escape"))).toBe(false);
    engine.setTool("pen");
    expect(engine.key(key("Escape"))).toBe(false);
    expect(log.filter((l) => l === "clearRange")).toHaveLength(2);
  });
});

/** Faux outil Texte (C7b) : journalise les actions de format ; `setFormat` change l'état publié et prévient le moteur. */
function fakeTextTool(ctx: ToolContext, log: string[]) {
  let fmt: FormatState | null = null;
  const tool: TextTool = {
    begin: () => undefined,
    extend: () => undefined,
    frame: () => undefined,
    close: () => undefined,
    live: () => NO_LIVE,
    active: () => false,
    editing: () => null,
    composing: () => false,
    compositionStart: () => undefined,
    compositionEnd: () => undefined,
    requestCommit: () => undefined,
    format: (a) => {
      log.push(`text.format ${a.type}`);
    },
    formatState: () => fmt,
    formatChanged: () => ctx.stateChanged?.(),
  };
  return {
    tool,
    setFormat(f: FormatState | null): void {
      fmt = f;
      ctx.stateChanged?.();
    },
  };
}

function setupFormat() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const holder: { text?: ReturnType<typeof fakeTextTool>; table?: ReturnType<typeof fakeTableTool> } = {};
  const tools: ToolFactories = {
    pen: (ctx) => fakeTool("pen", log, ctx),
    eraser: (ctx) => fakeTool("eraser", log, ctx),
    text: (ctx) => {
      holder.text = fakeTextTool(ctx, log);
      return holder.text.tool;
    },
    table: (ctx) => {
      holder.table = fakeTableTool(ctx, log);
      return holder.table.tool;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const { text, table } = holder;
  if (text === undefined || table === undefined) throw new Error("outils non créés");
  return { engine, log, text, table };
}

describe("moteur — barre de format (C7b, DAR4)", () => {
  const BOLD: FormatState = { bold: true, italic: false, underline: false, size: 36, color: "default" };

  it("textFormat(a) : relayé à l'outil Texte ou Tableau actif ; autre outil : rien", () => {
    const { engine, log } = setupFormat();
    engine.setTool("text");
    engine.textFormat({ type: "bold" });
    engine.setTool("table");
    engine.textFormat({ type: "italic" });
    engine.setTool("pen");
    engine.textFormat({ type: "underline" });
    expect(log.filter((l) => l.includes(".format"))).toEqual(["text.format bold", "table.format italic"]);
  });

  it("state().textFormat : celui de l'outil actif ; stateChanged republie ; autre outil : null", () => {
    const { engine, text, table } = setupFormat();
    const seen: (FormatState | null)[] = [];
    engine.onState((s) => seen.push(s.textFormat));
    engine.setTool("text");
    text.setFormat(BOLD);
    expect(seen.at(-1)).toEqual(BOLD);
    expect(engine.state().textFormat).toEqual(BOLD);
    engine.setTool("table");
    expect(engine.state().textFormat).toBeNull();
    table.setFormat({ ...BOLD, bold: false });
    expect(engine.state().textFormat).toEqual({ ...BOLD, bold: false });
    engine.setTool("pen");
    expect(engine.state().textFormat).toBeNull();
  });

  it("sans fabrique text ni table : textFormat null, action sans effet", () => {
    const { engine } = setup();
    engine.setTool("text");
    expect(engine.state().textFormat).toBeNull();
    expect(() => engine.textFormat({ type: "bold" })).not.toThrow();
  });
});

describe("moteur — pot (C6a)", () => {
  const inert: GestureTool = { begin() {}, extend() {}, frame() {}, close() {}, live: () => NO_LIVE, active: () => false };

  it("drawScene reçoit le fond de la page montrée (DA4)", () => {
    const { doc, engine, frames, renderer } = setup();
    engine.redraw();
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.background).toBe("#ffffff");
    const page = doc.page.bind(doc);
    doc.page = (id) => {
      const p = page(id);
      return p === null ? null : { ...p, background: "#bfdbfe" };
    };
    engine.redraw();
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.background).toBe("#bfdbfe");
  });

  it("drawScene reçoit largeur, hauteur et mode de la page montrée (T10 : plus de Page 1920 × 1080 par défaut)", () => {
    const { doc, engine, frames, renderer } = setup();
    const page = doc.page.bind(doc);
    doc.page = (id) => {
      const p = page(id);
      return p === null ? null : { ...p, width: 1080, height: 1920, mode: "page" };
    };
    engine.redraw();
    frames.tick();
    expect(renderer.scenes.at(-1)?.page).toMatchObject({ width: 1080, height: 1920, mode: "page" });
  });

  it("setPageMode réajuste la caméra par fitPage (T10)", () => {
    const { engine } = setup();
    const fit = vi.spyOn(engine, "fitPage");
    expect(engine.setPageMode("infinite")).toBe(true);
    expect(fit).toHaveBeenCalledTimes(1);
  });

  it("setPageMode au mode déjà actif : pas de recadrage (T18)", () => {
    const { engine } = setup();
    engine.resize(1000, 800, 1);
    const fit = vi.spyOn(engine, "fitPage");
    expect(engine.setPageMode("landscape")).toBe(true);
    expect(fit).not.toHaveBeenCalled();
    expect(engine.setPageMode("infinite")).toBe(true);
    expect(fit).toHaveBeenCalledTimes(1);
    expect(engine.setPageMode("infinite")).toBe(true);
    expect(fit).toHaveBeenCalledTimes(1);
  });

  it("fitPage : page paysage au fond PDF A4 (cadre plus haut que large) cadrée par la largeur ; page portrait choisie : cadre entier (décision 10, T18)", () => {
    const pdf = fakeCore.fromPdfPages({ id: "ab".repeat(32), name: "a.pdf", mime: "application/pdf", size: 3 }, [{ w: 595, h: 842 }]);
    const mk = (doc: typeof pdf) => createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools: { pen: (ctx) => fakeTool("pen", [], ctx), eraser: (ctx) => fakeTool("eraser", [], ctx) } });
    const view = pdf.page(pdf.pageIds()[0]!)!;
    expect(view.height).toBeLessThan(view.width);
    expect(view.backdrop?.rect?.y1).toBeGreaterThan(view.width);
    const e = mk(pdf);
    e.resize(1000, 800, 1);
    expect(e.camera()).toEqual(fitWidth(1000, 800));
    const { engine } = setup();
    engine.resize(1000, 800, 1);
    engine.setPageMode("portrait");
    const portrait = fitFor("portrait", 1000, 800, { x0: 0, y0: 0, x1: 1920, y1: (1920 * 16) / 9 }, null, 16);
    expect(engine.camera().zoom).toBeCloseTo(portrait.zoom, 6);
  });

  it("setFillColor : défaut rouge, couleur valide gardée, invalide ignorée, null = « Aucune » ; le stylo ne change pas (D16)", () => {
    const { engine } = setup();
    expect(engine.state().fillColor).toBe("#dc2626");
    engine.setFillColor("#facc15");
    expect(engine.state().fillColor).toBe("#facc15");
    engine.setFillColor("");
    engine.setFillColor("pas une couleur !");
    expect(engine.state().fillColor).toBe("#facc15");
    engine.setFillColor(null);
    expect(engine.state().fillColor).toBeNull();
    expect(engine.textStyle().color).toBe("#000000");
  });

  it("fabrique fill : reçoit la couleur courante ; setTool(fill) : outil Pot actif", () => {
    const got: { color?: () => string | null } = {};
    const engine = createEngine({
      doc: fakeCore.blank(),
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: () => inert,
        eraser: () => inert,
        fill: (_ctx, c) => {
          got.color = c;
          return inert;
        },
      },
    });
    engine.setFillColor("#16a34a");
    expect(got.color?.()).toBe("#16a34a");
    engine.setTool("fill");
    expect(engine.state().tool).toBe("fill");
  });

  it("C6b fabrique fill : tolérance 5 par défaut, arrondie et bornée à 0-100, lue par l'outil (B10)", () => {
    const got: { tolerance?: () => number } = {};
    const engine = createEngine({
      doc: fakeCore.blank(),
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: () => inert,
        eraser: () => inert,
        fill: (_ctx, _c, t) => {
          got.tolerance = t;
          return inert;
        },
      },
    });
    expect([engine.state().fillTolerance, got.tolerance?.()]).toEqual([5, 5]);
    engine.setFillTolerance(12.6);
    expect(got.tolerance?.()).toBe(13);
    engine.setFillTolerance(250);
    expect(engine.state().fillTolerance).toBe(100);
    engine.setFillTolerance(-3);
    expect(engine.state().fillTolerance).toBe(0);
    engine.setFillTolerance(Number.NaN);
    expect(engine.state().fillTolerance).toBe(0);
  });
});

describe("moteur — C3", () => {
  function c3() {
    const doc = fakeCore.blank();
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", [], ctx),
      eraser: (ctx) => fakeTool("eraser", [], ctx),
      select: (ctx) => createSelectTool(ctx),
    };
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools });
    const page = engine.state().page;
    const rect = (x: number): string =>
      doc.apply({ type: "AddShape", page, shape: "rect", x0: x, y0: 100, x1: x + 50, y1: 150, style: PEN, fill: null }).ids[0] ?? "";
    const ctrl = (key: string, shiftKey = false): KeyLike => ({ key, ctrlKey: true, metaKey: false, shiftKey, altKey: false, isComposing: false, target: null });
    return { doc, engine, page, rect, ctrl };
  }
  /** Sélection posée par un vrai geste de rectangle de l'outil Sélection. */
  const band = (engine: ReturnType<typeof createEngine>, x0: number, x1: number): void => {
    engine.setTool("select");
    engine.sink.begin(1, "select", [{ ...sample, x: x0, y: 50 }]);
    engine.sink.extend(1, [{ ...sample, x: x1, y: 250 }], []);
    engine.sink.close(1, "end");
  };

  it("état : unités et groupe de la sélection", () => {
    const { engine, rect } = c3();
    rect(100);
    rect(300);
    expect(engine.state()).toMatchObject({ selectionUnits: 0, selectionGrouped: false });
    band(engine, 50, 400);
    expect(engine.state()).toMatchObject({ selectionUnits: 2, selectionGrouped: false });
  });
  it("group() : une étape, sélection gardée, une seule unité ensuite", () => {
    const { engine, doc, rect } = c3();
    const a = rect(100);
    const b = rect(300);
    band(engine, 50, 400);
    expect(engine.group()).toBe(true);
    expect(engine.state()).toMatchObject({ selection: [a, b], selectionUnits: 1, selectionGrouped: true });
    expect(doc.element(a)?.group).toEqual(doc.element(b)?.group);
    engine.undo();
    expect(doc.element(a)?.group).toBeUndefined();
  });
  it("group() sous deux unités : faux, aucune écriture", () => {
    const { engine, doc, rect } = c3();
    rect(100);
    band(engine, 50, 200);
    const v = doc.version();
    expect(engine.group()).toBe(false);
    expect(doc.version()).toBe(v);
  });
  it("ungroup() : sans groupe faux ; avec groupe une étape", () => {
    const { engine, rect } = c3();
    rect(100);
    rect(300);
    band(engine, 50, 400);
    expect(engine.ungroup()).toBe(false);
    engine.group();
    expect(engine.ungroup()).toBe(true);
    expect(engine.state()).toMatchObject({ selectionUnits: 2, selectionGrouped: false });
  });
  it("Ctrl+G groupe, Ctrl+Maj+G dégroupe ; la touche est prise même sans effet", () => {
    const { engine, rect, ctrl } = c3();
    rect(100);
    rect(300);
    expect(engine.key(ctrl("g"))).toBe(true); // rien de sélectionné : pris, sans effet
    band(engine, 50, 400);
    expect(engine.key(ctrl("g"))).toBe(true);
    expect(engine.state().selectionGrouped).toBe(true);
    expect(engine.key(ctrl("G", true))).toBe(true);
    expect(engine.state().selectionGrouped).toBe(false);
  });
  it("insertFragment : outil Sélection, objets insérés sélectionnés, une étape", () => {
    const { engine, doc, page, rect } = c3();
    const s = fakeCore.blank();
    const sp = s.pageIds()[0]!;
    const x = s.apply({ type: "AddShape", page: sp, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: PEN, fill: null }).ids[0]!;
    rect(100);
    engine.setTool("pen");
    const c = engine.insertFragment(s.extract(sp, [x]), 24, 24);
    expect(c?.ids).toHaveLength(1);
    expect(engine.state()).toMatchObject({ tool: "select", selection: c?.ids });
    expect(doc.elementIds(page)).toHaveLength(2);
    engine.undo();
    expect(doc.elementIds(page)).toHaveLength(1);
  });
  it("insertFragment : l'écriture de l'outil quitté (texte ouvert validé) passe avant l'insertion, Annuler retire l'insertion", () => {
    const doc = fakeCore.blank();
    let armed = false;
    const tools: ToolFactories = {
      pen: (ctx) => ({
        ...fakeTool("pen", [], ctx),
        leave: () => {
          if (!armed) return;
          armed = false;
          ctx.run({ type: "AddShape", page: ctx.page(), shape: "rect", x0: 500, y0: 500, x1: 510, y1: 510, style: PEN, fill: null });
        },
      }),
      eraser: (ctx) => fakeTool("eraser", [], ctx),
      select: (ctx) => createSelectTool(ctx),
    };
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools });
    const page = engine.state().page;
    const s = fakeCore.blank();
    const sp = s.pageIds()[0]!;
    const x = s.apply({ type: "AddShape", page: sp, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: PEN, fill: null }).ids[0]!;
    engine.setTool("pen");
    armed = true; // à la sortie de l'outil, il écrit (comme un texte ouvert qu'on valide)
    const c = engine.insertFragment(s.extract(sp, [x]), 24, 24);
    expect(doc.elementIds(page)).toHaveLength(2);
    engine.undo();
    expect(doc.elementIds(page)).toHaveLength(1); // l'insertion est annulée, pas l'écriture de l'outil
    expect(doc.elementIds(page)).not.toContain(c?.ids[0]);
  });
  it("insertFragment refusé : null, erreur dans l'état, outil inchangé", () => {
    const { engine } = c3();
    engine.setTool("pen");
    const s = fakeCore.blank();
    const sp = s.pageIds()[0]!;
    const x = s.apply({ type: "AddShape", page: sp, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: PEN, fill: null }).ids[0]!;
    expect(engine.insertFragment(s.extract(sp, [x]), Number.NaN, 0)).toBeNull();
    expect(engine.state()).toMatchObject({ tool: "pen", error: "matrice invalide (six nombres finis, inversible)" });
  });
  it("insertPages : après la page montrée, la première insérée est montrée ; Annuler les retire", () => {
    const { engine, doc, page } = c3();
    const s = fakeCore.blank();
    s.apply({ type: "AddPage", after: s.pageIds()[0]! });
    const c = engine.insertPages(s);
    expect(c?.pages).toHaveLength(2);
    expect(doc.pageIds()).toEqual([page, ...(c?.pages ?? [])]);
    expect(engine.state().page).toBe(c?.pages[0]);
    engine.undo();
    expect(doc.pageIds()).toEqual([page]);
    expect(engine.state().page).toBe(page);
  });
});

describe("moteur — fond de page (C12)", () => {
  it("drawScene reçoit le fond lu dans doc.page(id), page par page ; page sans fond : null (PF14, PF29)", () => {
    const doc = fakeCore.fromPdfPages({ id: "ab".repeat(32), name: "a.pdf", mime: "application/pdf", size: 3 }, [{ w: 612, h: 792 }, { w: 612, h: 792 }]);
    const frames = new Frames();
    const renderer = new FakeRenderer();
    const engine = createEngine({ doc, renderer, frames, tools: { pen: (ctx) => fakeTool("pen", [], ctx), eraser: (ctx) => fakeTool("eraser", [], ctx) } });
    engine.resize(800, 600, 1);
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.backdrop).toMatchObject({ kind: "pdf-page", page: 0 });
    engine.nextPage();
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.backdrop).toMatchObject({ kind: "pdf-page", page: 1 });
    const blank = setup();
    blank.engine.resize(800, 600, 1);
    blank.frames.tick();
    expect(blank.renderer.scenes.at(-1)?.page.backdrop).toBeNull();
  });
});

describe("moteur — C5 (retouche d'image)", () => {
  const ASSET = { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 };
  function c5() {
    const doc = fakeCore.blank();
    const renderer = new FakeRenderer();
    const colorAt = vi.fn((_a: string, _x: number, _y: number): string | null => "#ffffff");
    const tools: ToolFactories = { pen: (ctx) => fakeTool("pen", [], ctx), eraser: (ctx) => fakeTool("eraser", [], ctx), select: (ctx) => createSelectTool(ctx) };
    const engine = createEngine({ doc, renderer, frames: new Frames(), tools, images: { colorAt } });
    const page = engine.state().page;
    const id = doc.apply({ type: "AddImage", page, asset: ASSET, w: 200, h: 150, matrix: [1, 0, 0, 1, 100, 100] }).ids[0] ?? "";
    const drag = (a: readonly [number, number], b: readonly [number, number], pointer = 2): void => {
      engine.sink.begin(pointer, "select", [{ ...sample, x: a[0], y: a[1] }]);
      engine.sink.extend(pointer, [{ ...sample, x: b[0], y: b[1] }], []);
      engine.sink.close(pointer, "end");
    };
    engine.setTool("select");
    drag([50, 50], [350, 300], 1);
    const image = () => {
      const el = doc.element(id);
      if (el?.kind !== "image") throw new Error("image absente");
      return el;
    };
    const rect = (): string => doc.apply({ type: "AddShape", page, shape: "rect", x0: 400, y0: 100, x1: 450, y1: 150, style: PEN, fill: null }).ids[0] ?? "";
    return { doc, engine, renderer, colorAt, page, id, drag, image, rect, ctrl: (k: string) => key(k, { ctrlKey: true }) };
  }

  it("C6b I31 : un remplissage d'image écrit pendant un brouillon du panneau : brouillon jeté, aperçu retiré", () => {
    const { engine, renderer, id, page } = c5();
    const edit = engine.editImage(id)!;
    edit.preview({ brightness: 50 });
    expect(renderer.imagePreviews.at(-1)).not.toBeNull();
    engine.run({ type: "Fill", page, target: { kind: "image", id, asset: { id: "cd".repeat(32), name: "a.png", mime: "image/png", size: 9 } }, color: "#facc15" });
    expect(renderer.imagePreviews.at(-1)).toBeNull();
  });

  it("C5 selectionImage : l'image sélectionnée seule ; null à deux objets", () => {
    const { engine, id, drag, rect } = c5();
    expect(engine.state().selectionImage).toBe(id);
    rect();
    drag([50, 50], [500, 300], 3);
    expect(engine.state().selection).toHaveLength(2);
    expect(engine.state().selectionImage).toBeNull();
  });
  it("C5 editImage : null pour un id qui n'est pas une image de la page", () => {
    const { engine, rect } = c5();
    expect(engine.editImage(rect())).toBeNull();
    expect(engine.editImage("nulle-part")).toBeNull();
  });
  it("C5 geometry (Tourner ⟳) : une étape, centre gardé, boîte 150 × 200", () => {
    const { engine, doc, id, page, image } = c5();
    const edit = engine.editImage(id)!;
    expect(edit.geometry(turnShown(paramsOf(image().image), 1))).toBe(true);
    expect(image().image.quarterTurns).toBe(1);
    expect(doc.bounds([id])).toEqual({ x0: 125, y0: 75, x1: 275, y1: 275 });
    engine.undo();
    expect(image().image.quarterTurns).toBeUndefined();
    expect(doc.elementIds(page)).toEqual([id]);
  });
  it("C5 brouillon des pixels gardé par une écriture géométrique (I27), pas par une autre écriture", () => {
    const { engine, renderer, id, image } = c5();
    const edit = engine.editImage(id)!;
    edit.preview({ brightness: 50 });
    expect(renderer.imagePreviews.at(-1)).toEqual({ id, params: { brightness: 50 }, matrix: [1, 0, 0, 1, 100, 100] });
    edit.geometry(turnShown({}, 1));
    expect(image().image.brightness).toBeUndefined();
    expect(renderer.imagePreviews.at(-1)).toMatchObject({ id, params: { quarterTurns: 1, brightness: 50 } });
    expect(edit.keepsDraft(engine.state().version)).toBe(true);
    engine.undo();
    expect(edit.keepsDraft(engine.state().version)).toBe(false);
  });
  it("C5 commit : pixels du brouillon, géométrie du document, une étape ; aperçu retiré", () => {
    const { engine, renderer, id, image } = c5();
    const edit = engine.editImage(id)!;
    edit.geometry(turnShown({}, 1));
    edit.preview({ brightness: 50 });
    expect(edit.commit({ brightness: 50 })).toBe(true);
    expect(paramsOf(image().image)).toEqual({ quarterTurns: 1, brightness: 50 });
    expect(renderer.imagePreviews.at(-1)).toBeNull();
    engine.undo();
    expect(paramsOf(image().image)).toEqual({ quarterTurns: 1 });
  });
  it("T21 (I31) : Rétablir sans rien à rétablir n'écrit rien : le brouillon des pixels reste en aperçu", () => {
    const { engine, renderer, id } = c5();
    const edit = engine.editImage(id)!;
    edit.preview({ brightness: 50 });
    const v = engine.state().version;
    engine.redo();
    expect(engine.state().version).toBe(v);
    expect(renderer.imagePreviews.at(-1)).toEqual({ id, params: { brightness: 50 }, matrix: [1, 0, 0, 1, 100, 100] });
  });
  it("C5 rognage : image entière en aperçu, poignée sud-est tirée, Valider le rognage garde les pixels en place", () => {
    const { engine, renderer, id, image, drag } = c5();
    const edit = engine.editImage(id)!;
    edit.startCrop();
    expect(edit.mode()).toBe("crop");
    expect(renderer.imagePreviews.at(-1)).toEqual({ id, params: {}, matrix: [1, 0, 0, 1, 100, 100], frame: { x0: 0, y0: 0, x1: 200, y1: 150 } });
    drag([300, 250], [260, 220]);
    expect(renderer.imagePreviews.at(-1)?.frame).toEqual({ x0: 0, y0: 0, x1: 160, y1: 120 });
    expect(edit.finishCrop(true)).toBe(true);
    expect(image().image.crop).toEqual([0, 0, 160, 120]);
    expect(image().transform).toEqual([1, 0, 0, 1, 100, 100]);
    expect([edit.mode(), engine.state().selection]).toEqual(["idle", [id]]);
  });
  it("C5 fermer la séance : l'emplacement d'aperçu de l'image est jeté dans le cache (m4)", () => {
    const dropPreview = vi.fn();
    const doc = fakeCore.blank();
    const tools: ToolFactories = { pen: (ctx) => fakeTool("pen", [], ctx), eraser: (ctx) => fakeTool("eraser", [], ctx), select: (ctx) => createSelectTool(ctx) };
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools, images: { colorAt: () => null, dropPreview } });
    const id = doc.apply({ type: "AddImage", page: engine.state().page, asset: ASSET, w: 200, h: 150, matrix: [1, 0, 0, 1, 100, 100] }).ids[0] ?? "";
    engine.editImage(id)!.close();
    expect(dropPreview).toHaveBeenCalledWith(id);
  });
  it("C5 Entrée valide le rognage", () => {
    const { engine, id, image, drag } = c5();
    const edit = engine.editImage(id)!;
    edit.startCrop();
    drag([300, 250], [260, 220]);
    expect(engine.key(key("Enter"))).toBe(true);
    expect(image().image.crop).toEqual([0, 0, 160, 120]);
  });
  it("T37 Ctrl+K pendant le rognage : avalé, l'éditeur de lien ne s'ouvre pas", () => {
    const { engine, id, ctrl } = c5();
    engine.editImage(id)!.startCrop();
    expect(engine.key(ctrl("k"))).toBe(true);
    expect(engine.state().linkEditing).toBeNull();
  });
  it("C5 annuler après Tourner avec brouillon : aperçu sans brouillon, matrice du document (I31)", () => {
    const { engine, renderer, id } = c5();
    const edit = engine.editImage(id)!;
    edit.preview({ brightness: 50 });
    edit.geometry(turnShown({}, 1));
    expect(renderer.imagePreviews.at(-1)).toMatchObject({ params: { quarterTurns: 1, brightness: 50 } });
    engine.undo();
    expect(renderer.imagePreviews.at(-1)).toBeNull();
  });
  it("C5 déplacer l'image à l'outil Sélection avec brouillon : brouillon jeté, aperçu retiré (I31)", () => {
    const { engine, renderer, id, drag } = c5();
    const edit = engine.editImage(id)!;
    edit.preview({ brightness: 50 });
    expect(renderer.imagePreviews.at(-1)).not.toBeNull();
    drag([200, 200], [260, 230]);
    expect(renderer.imagePreviews.at(-1)).toBeNull();
  });
  it("C5 Entrée pendant le rognage sur un bouton : n'écrit pas le rognage", () => {
    const { engine, id, image, drag } = c5();
    const edit = engine.editImage(id)!;
    edit.startCrop();
    drag([300, 250], [260, 220]);
    expect(engine.key(key("Enter", { target: { tagName: "BUTTON" } }))).toBe(false);
    expect(image().image.crop).toBeUndefined();
    expect(edit.mode()).toBe("crop");
    expect(engine.key(key("Enter", { target: { tagName: "INPUT" } }))).toBe(false);
    expect(edit.mode()).toBe("crop");
  });
  it("C5 Ctrl+D pendant le rognage : pris sans effet, rien n'est dupliqué", () => {
    const { engine, doc, page, id } = c5();
    const edit = engine.editImage(id)!;
    edit.startCrop();
    const n = doc.elementIds(page).length;
    expect(engine.key(key("d", { ctrlKey: true }))).toBe(true);
    expect(doc.elementIds(page)).toHaveLength(n);
    expect(edit.mode()).toBe("crop");
  });
  it("C5 Échap sort du rognage sans écrire", () => {
    const { engine, doc, id } = c5();
    const edit = engine.editImage(id)!;
    edit.startCrop();
    const v = doc.version();
    expect(engine.key(key("Escape"))).toBe(true);
    expect([edit.mode(), doc.version(), engine.state().selection]).toEqual(["idle", v, [id]]);
  });
  it("C5 Suppr sous le cadre ne supprime pas", () => {
    const { engine, doc, id, page } = c5();
    const edit = engine.editImage(id)!;
    edit.startCrop();
    expect(engine.key(key("Delete"))).toBe(true);
    expect(engine.key(key("Backspace"))).toBe(true);
    expect([doc.elementIds(page), edit.mode()]).toEqual([[id], "crop"]);
  });
  it("C5 Ctrl+Z sort du rognage puis annule", () => {
    const { engine, id, image, ctrl } = c5();
    const edit = engine.editImage(id)!;
    edit.geometry(turnShown({}, 1));
    edit.startCrop();
    expect(engine.key(ctrl("z"))).toBe(true);
    expect(edit.mode()).toBe("idle");
    expect(image().image.quarterTurns).toBeUndefined();
  });
  it("C5 pipette : hors de l'image elle reste armée ; sur l'image, couleur du pixel source d'origine", async () => {
    const { engine, id, colorAt, drag } = c5();
    const edit = engine.editImage(id)!;
    const picked = edit.pick();
    expect(edit.mode()).toBe("pick");
    drag([20, 20], [20, 20]);
    expect(edit.mode()).toBe("pick");
    drag([110, 105], [110, 105]);
    await expect(picked).resolves.toBe("#ffffff");
    expect(colorAt).toHaveBeenCalledWith(ASSET.id, 10, 5);
    expect(edit.mode()).toBe("idle");
  });
  it("C5 pipette : Échap ou second appel la désarment (null)", async () => {
    const { engine, id } = c5();
    const edit = engine.editImage(id)!;
    const a = edit.pick();
    expect(engine.key(key("Escape"))).toBe(true);
    await expect(a).resolves.toBeNull();
    const b = edit.pick();
    await expect(edit.pick()).resolves.toBeNull();
    await expect(b).resolves.toBeNull();
    expect(edit.mode()).toBe("idle");
  });
  it("C5 restore : tous les réglages retirés, une étape", () => {
    const { engine, id, image } = c5();
    const edit = engine.editImage(id)!;
    edit.commit({ brightness: 20 });
    edit.geometry({ flipX: true });
    expect(edit.restore()).toBe(true);
    expect(paramsOf(image().image)).toEqual({});
    engine.undo();
    expect(paramsOf(image().image)).toEqual({ flipX: true, brightness: 20 });
  });
  it("C6b restore : la commande porte restore: true (B11)", () => {
    const { engine, doc, id } = c5();
    const apply = vi.spyOn(doc, "apply");
    engine.editImage(id)!.restore();
    expect(apply.mock.calls.at(-1)?.[0]).toMatchObject({ type: "SetImageParams", id, params: {}, restore: true });
  });
  it("C5 report : message dans l'état sans écriture", () => {
    const { engine, doc } = c5();
    const v = doc.version();
    engine.report("retouches de l'image non affichées : x");
    expect([engine.state().error, doc.version()]).toEqual(["retouches de l'image non affichées : x", v]);
  });
});

describe("moteur : séance d'orbite (C15, X23)", () => {
  function c15() {
    const doc = fakeCore.blank();
    const renderer = new FakeRenderer();
    const log: string[] = [];
    const tools: ToolFactories = { pen: (ctx) => fakeTool("pen", log, ctx), eraser: (ctx) => fakeTool("eraser", log, ctx), select: (ctx) => createSelectTool(ctx) };
    const frames = new Frames();
    const engine = createEngine({ doc, renderer, frames, tools });
    engine.resize(800, 600, 1);
    frames.tick();
    const page = engine.state().page;
    const id = doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 200, y1: 200, style: PEN, fill: null }).ids[0] ?? "";
    const views: ModelCamera[] = [];
    const commits: ModelCamera[] = [];
    const closed = vi.fn();
    const open = () => engine.orbitModel(id, { view: DEFAULT_CAMERA, onView: (v) => views.push(v), onCommit: (v) => commits.push(v), closed });
    /** Échantillon à l'écran du point de page (wx, wy), selon la caméra courante. */
    const at = (wx: number, wy: number): InputSample => {
      const [x, y] = worldToScreen(engine.camera(), wx, wy);
      return { ...sample, x, y };
    };
    return { engine, doc, page, frames, renderer, log, id, views, commits, closed, open, at };
  }

  it("orbitModel : null pour un id absent de la page", () => {
    const { engine } = c15();
    expect(engine.orbitModel("nulle-part", { view: DEFAULT_CAMERA, onView: () => {}, onCommit: () => {} })).toBeNull();
  });
  it("les gestes vont à la séance, pas à l'outil ; onView puis onCommit au relâché ; une scène redemandée", () => {
    const { engine, frames, renderer, log, views, commits, open, at } = c15();
    expect(open()).not.toBeNull();
    const n = renderer.scenes.length;
    const s0 = at(150, 150); // appui sur l'objet de la séance
    engine.sink.begin(1, "pen", [s0]);
    engine.sink.extend(1, [{ ...s0, x: s0.x + 50 }], []);
    engine.sink.close(1, "end");
    expect(log.filter((l) => /^pen\.(begin|extend|close)/.test(l))).toEqual([]);
    expect(views.length).toBeGreaterThan(0);
    expect(commits).toHaveLength(1);
    expect(commits[0]!.yaw).toBeCloseTo(Math.PI / 6 + 0.5, 12);
    frames.tick();
    expect(renderer.scenes.length).toBeGreaterThan(n);
  });
  it("C1 : un appui à côté de l'objet (zone vide) ferme la séance et le geste va à l'outil courant", () => {
    const { engine, log, closed, commits, open, at } = c15();
    open();
    engine.sink.begin(3, "pen", [at(500, 500)]);
    engine.sink.close(3, "end");
    expect(closed).toHaveBeenCalledTimes(1);
    expect(log).toContain("pen.begin 3");
    expect(log).toContain("pen.close 3 end");
    expect(commits).toEqual([]);
    engine.sink.begin(4, "pen", [at(150, 150)]); // séance fermée : même sur l'objet, l'outil reçoit le geste
    expect(log).toContain("pen.begin 4");
  });
  it("mineur C15 (C1) : pincement dont le premier doigt tombe à côté de l'objet : la séance reste, l'outil ne reçoit rien", () => {
    const { engine, log, closed, open, at } = c15();
    open();
    const s0 = at(500, 500);
    engine.sink.begin(7, "pen", [s0]);
    engine.sink.extend(7, [{ ...s0, x: s0.x + 2 }], []); // le doigt bouge un peu avant le second
    engine.sink.close(7, "abort"); // le routeur passe au pincement
    expect(closed).not.toHaveBeenCalled();
    expect(log.filter((l) => /^pen\.(begin|extend|close)/.test(l))).toEqual([]);
    engine.sink.begin(8, "pen", [at(150, 150)]); // la séance garde les gestes sur l'objet
    expect(log.filter((l) => /^pen\.begin/.test(l))).toEqual([]);
  });
  it("mineur C15 (C1) : un glissé à côté de l'objet ferme la séance dès qu'il dépasse le seuil ; l'outil reçoit tous les points", () => {
    const { engine, log, closed, open, at } = c15();
    open();
    const s0 = at(500, 500);
    engine.sink.begin(9, "pen", [s0]);
    expect(closed).not.toHaveBeenCalled();
    engine.sink.extend(9, [{ ...s0, x: s0.x + 30 }], []);
    expect(closed).toHaveBeenCalledTimes(1);
    engine.sink.extend(9, [{ ...s0, x: s0.x + 60 }], []);
    engine.sink.close(9, "end");
    // premier point à `begin`, les suivants à `extend` (un outil ne lit que le premier point de `begin`)
    expect(log.filter((l) => /^pen\.(begin|extend|close) 9/.test(l))).toEqual(["pen.begin 9", "pen.extend 9", "pen.extend 9", "pen.close 9 end"]);
  });
  it("mineur C15 (C1, relecture) : rectangle de sélection à côté de l'objet, un seul pas au-delà du seuil : la sélection le suit", () => {
    const { engine, doc, page, frames, open, at } = c15();
    const other = doc.apply({ type: "AddShape", page, shape: "rect", x0: 300, y0: 300, x1: 400, y1: 400, style: PEN, fill: null }).ids[0]!;
    engine.setTool("select");
    open();
    engine.sink.begin(10, "select", [at(250, 250)]);
    engine.sink.extend(10, [at(450, 450)], []);
    frames.tick();
    engine.sink.close(10, "end");
    expect(engine.state().selection).toEqual([other]);
  });
  it("C1 : un appui sur un autre élément (pas l'objet de la séance) ferme aussi la séance", () => {
    const { engine, doc, page, log, closed, open, at } = c15();
    doc.apply({ type: "AddShape", page, shape: "rect", x0: 300, y0: 300, x1: 400, y1: 400, style: PEN, fill: null });
    open();
    engine.sink.begin(5, "pen", [at(350, 350)]);
    engine.sink.close(5, "end");
    expect(closed).toHaveBeenCalledTimes(1);
    expect(log).toContain("pen.begin 5");
  });
  it("C1 : un appui sur l'objet de la séance la garde ouverte (l'outil ne reçoit rien)", () => {
    const { engine, log, closed, open, at } = c15();
    open();
    engine.sink.begin(6, "pen", [at(150, 150)]);
    engine.sink.close(6, "end");
    expect(closed).not.toHaveBeenCalled();
    expect(log.filter((l) => /^pen\.(begin|close)/.test(l))).toEqual([]);
  });
  it("Échap ferme la séance : closed appelé, le geste suivant va à l'outil", () => {
    const { engine, log, closed, open } = c15();
    open();
    expect(engine.key(key("Escape"))).toBe(true);
    expect(closed).toHaveBeenCalledTimes(1);
    engine.sink.begin(2, "pen", [sample]);
    expect(log).toContain("pen.begin 2");
  });
  it("changer de page ferme la séance", () => {
    const { engine, closed, open } = c15();
    open();
    expect(engine.addPage()).toBe(true);
    expect(closed).toHaveBeenCalledTimes(1);
  });
  it("une seconde séance ferme la première ; dispose ferme la séance ouverte", () => {
    const { engine, closed, open } = c15();
    open();
    open();
    expect(closed).toHaveBeenCalledTimes(1);
    engine.dispose();
    expect(closed).toHaveBeenCalledTimes(2);
  });
});

describe("moteur — style courant, Dupliquer, Supprimer (OG11 T9)", () => {
  function styleSetup(deps: Partial<Pick<EngineDeps, "itemStyle" | "penStyle" | "openLink">> = {}) {
    const doc = fakeCore.blank();
    const frames = new Frames();
    const renderer = new FakeRenderer();
    let select: ReturnType<typeof createSelectTool> | null = null;
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", [], ctx),
      eraser: (ctx) => fakeTool("eraser", [], ctx),
      select: (ctx) => {
        select = createSelectTool(ctx);
        return select;
      },
      shape: (ctx, kind, style) => createShapeTool(ctx, kind, style),
    };
    const engine = createEngine({ doc, renderer, frames, tools, ...deps });
    const page = engine.state().page;
    let n = 0;
    const addRect = (): string => {
      const x = 100 + 200 * n++;
      return doc.apply({ type: "AddShape", page, shape: "rect", x0: x, y0: 100, x1: x + 50, y1: 150, style: PEN, fill: null }).ids[0] ?? "";
    };
    const sel = () => {
      if (!select) throw new Error("outil Sélection absent");
      return select;
    };
    const colorOf = (id: string): string | undefined => {
      const el = doc.element(id);
      return el?.kind === "shape" ? el.style.color : undefined;
    };
    const lookOf = (id: string): Record<string, unknown> | undefined => {
      const el = doc.element(id) as { look?: Record<string, unknown> } | null;
      return el?.look;
    };
    /** Rectangle tracé de (10, 10) à (110, 60) ; deux images pendant le geste ; graines vues dans l'aperçu. */
    const drawRect = (): { seeds: unknown[]; id: string } => {
      const seeds: unknown[] = [];
      const seen = (): void => {
        const o = renderer.overlays[renderer.overlays.length - 1];
        const s = o?.shapes[0] as { seed?: unknown } | undefined;
        if (s !== undefined) seeds.push(s.seed);
      };
      engine.sink.begin(1, "rect", [{ ...sample, x: 10, y: 10 }]);
      engine.sink.extend(1, [{ ...sample, x: 80, y: 40 }], []);
      frames.tick();
      seen();
      engine.sink.extend(1, [{ ...sample, x: 110, y: 60 }], []);
      frames.tick();
      seen();
      engine.sink.close(1, "end");
      const ids = doc.elementIds(page);
      return { seeds, id: ids[ids.length - 1] ?? "" };
    };
    return { doc, frames, renderer, engine, page, addRect, sel, colorOf, lookOf, drawRect };
  }

  it("setItemStyle : une étape sur la sélection, et style courant", () => {
    const { engine, doc, addRect, sel, colorOf } = styleSetup();
    const a = addRect();
    const b = addRect();
    sel().setSelection([a, b]);
    const v = doc.version();
    engine.setItemStyle({ color: "#1d4ed8" });
    expect(colorOf(a)).toBe("#1d4ed8");
    expect(colorOf(b)).toBe("#1d4ed8");
    expect(engine.itemStyle().color).toBe("#1d4ed8");
    expect(engine.state().itemStyle?.color).toBe("#1d4ed8");
    expect(doc.version()).toBeGreaterThan(v);
    // Une seule étape : un Annuler rend les deux éléments à leur couleur (deux étapes laisseraient `a` en bleu).
    engine.undo();
    expect(colorOf(a)).toBe("#000000");
    expect(colorOf(b)).toBe("#000000");
  });

  it("arrange align-left : une étape", () => {
    const { engine, doc, addRect, sel } = styleSetup();
    const ids = [addRect(), addRect(), addRect()];
    sel().setSelection(ids);
    const before = ids.map((id) => doc.bounds([id]));
    expect(engine.arrange("align-left")).toBe(true);
    const xs = ids.map((id) => doc.bounds([id])?.x0);
    expect(new Set(xs).size).toBe(1);
    engine.undo();
    expect(ids.map((id) => doc.bounds([id]))).toEqual(before);
  });

  it("arrange sans sélection : faux", () => {
    const { engine } = styleSetup();
    expect(engine.arrange("align-left")).toBe(false);
  });

  it("arrange : groupe en bloc", () => {
    const { engine, doc, addRect, sel } = styleSetup();
    const a = addRect();
    const b = addRect();
    const c = addRect();
    sel().setSelection([a, b]);
    engine.group();
    sel().setSelection([a, c]);
    const before = [a, b, c].map((id) => doc.bounds([id])!);
    expect(engine.arrange("align-right")).toBe(true);
    const after = [a, b, c].map((id) => doc.bounds([id])!);
    expect(after[0]!.x0 - before[0]!.x0).toBe(after[1]!.x0 - before[1]!.x0);
    expect(after[0]!.x0).not.toBe(before[0]!.x0);
  });

  it("flèche : une Transform, une étape", () => {
    const { engine, doc, addRect, sel } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    const x0 = doc.bounds([a])!.x0;
    const y0 = doc.bounds([a])!.y0;
    expect(engine.key(key("ArrowRight"))).toBe(true);
    expect(doc.bounds([a])!.x0).toBe(x0 + 1);
    engine.view.zoomAt(0, 0, 2);
    expect(engine.key(key("ArrowDown", { shiftKey: true }))).toBe(true);
    expect(doc.bounds([a])!.y0).toBe(y0 + 5);
    engine.undo();
    engine.undo();
    expect(doc.bounds([a])!.x0).toBe(x0);
    expect(doc.bounds([a])!.y0).toBe(y0);
  });

  it("flèche sans sélection : la touche passe", () => {
    const { engine } = styleSetup();
    expect(engine.key(key("ArrowLeft"))).toBe(false);
    expect(engine.key(key("H", { shiftKey: true, code: "KeyH" }))).toBe(false);
  });

  it("Maj+H retourne", () => {
    const { engine, doc, page, addRect, sel } = styleSetup();
    const r = addRect();
    const f = doc.apply({ type: "AddShape", page, shape: "arrow", x0: 300, y0: 100, x1: 400, y1: 150, style: PEN, fill: null }).ids[0] ?? "";
    sel().setSelection([r, f]);
    expect(engine.key(key("H", { shiftKey: true, code: "KeyH" }))).toBe(true);
    // Miroir horizontal autour du centre de la sélection : la flèche (à droite) passe à gauche du rectangle.
    expect(doc.bounds([f])!.x1).toBeLessThan(doc.bounds([r])!.x0);
  });

  it("style courant : transparent jamais gardé", () => {
    const seen: string[] = [];
    const { engine, addRect, sel, colorOf } = styleSetup();
    engine.onItemStyle((s) => seen.push(s.color));
    const a = addRect();
    const b = addRect();
    sel().setSelection([a, b]);
    engine.setItemStyle({ color: "transparent" });
    expect(colorOf(a)).toBe("transparent");
    expect(colorOf(b)).toBe("transparent");
    expect(engine.itemStyle().color).toBe("#000000");
    expect(seen).not.toContain("transparent");
  });

  it("setItemStyle sans sélection : style courant seul, rien d'écrit", () => {
    const { engine, doc } = styleSetup();
    const v = doc.version();
    engine.setItemStyle({ opacity: 40 });
    expect(engine.itemStyle().opacity).toBe(40);
    expect(doc.version()).toBe(v);
    expect(engine.state().canUndo).toBe(false);
  });

  it("setPenStyle garde la transparence (fusion, S2.4)", () => {
    const { engine } = styleSetup();
    engine.setItemStyle({ opacity: 40, strokeStyle: "dashed" });
    engine.setPenStyle({ color: "#dc2626", width: 4 });
    expect(engine.itemStyle()).toMatchObject({ color: "#dc2626", width: 4, opacity: 40, strokeStyle: "dashed" });
  });

  it("setPenStyle (préréglage) n'écrit pas la sélection", () => {
    const { engine, doc, addRect, sel, colorOf } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    const v = doc.version();
    engine.setPenStyle({ color: "#dc2626", width: 6 });
    expect(colorOf(a)).toBe("#000000");
    expect(doc.version()).toBe(v);
    expect(engine.itemStyle()).toMatchObject({ color: "#dc2626", width: 6 });
  });

  it("choisir un outil garde le style courant", () => {
    const { engine, lookOf, drawRect } = styleSetup();
    engine.setItemStyle({ color: "#1d4ed8", opacity: 40, strokeStyle: "dashed" });
    engine.setTool("pen");
    expect(engine.itemStyle()).toMatchObject({ color: "#1d4ed8", opacity: 40, strokeStyle: "dashed" });
    engine.setTool("rect");
    expect(engine.itemStyle()).toMatchObject({ color: "#1d4ed8", opacity: 40, strokeStyle: "dashed" });
    const { id } = drawRect();
    expect(lookOf(id)).toMatchObject({ strokeStyle: "dashed", opacity: 40 });
  });

  it("style courant de départ : deps.itemStyle, sinon penStyle fusionné au défaut", () => {
    const given = { ...DEFAULT_ITEM_STYLE, strokeStyle: "dotted" as const, opacity: 60 };
    expect(styleSetup({ itemStyle: given }).engine.itemStyle()).toEqual(given);
    expect(styleSetup({ penStyle: { color: "#dc2626", width: 6 } }).engine.itemStyle()).toEqual({
      ...DEFAULT_ITEM_STYLE,
      color: "#dc2626",
      width: 6,
    });
    expect(styleSetup().engine.itemStyle()).toEqual(DEFAULT_ITEM_STYLE);
  });

  it("onItemStyle : prévenu à setItemStyle et setPenStyle ; désabonnement", () => {
    const { engine } = styleSetup();
    const got: ItemStyle[] = [];
    const off = engine.onItemStyle((s) => got.push(s));
    engine.setItemStyle({ opacity: 40 });
    engine.setPenStyle({ color: "#dc2626", width: 4 });
    expect(got).toHaveLength(2);
    expect(got[1]).toMatchObject({ color: "#dc2626", opacity: 40 });
    off();
    engine.setItemStyle({ opacity: 50 });
    expect(got).toHaveLength(2);
  });

  it("duplicateSelection +10/+10, copie sélectionnée, une étape", () => {
    const { engine, doc, addRect, sel } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    expect(engine.duplicateSelection()).toBe(true);
    const s = engine.state().selection;
    expect(s).toHaveLength(1);
    const copy = s[0] ?? "";
    expect(copy).not.toBe(a);
    const ta = doc.element(a)?.transform ?? [];
    const tc = doc.element(copy)?.transform ?? [];
    expect(tc[4]).toBe((ta[4] ?? Number.NaN) + 10);
    expect(tc[5]).toBe((ta[5] ?? Number.NaN) + 10);
    expect(engine.state().elementCount).toBe(2);
    engine.undo();
    expect(doc.element(copy)).toBeNull();
    expect(engine.state().elementCount).toBe(1);
  });

  describe("Glisser une copie (OG23, T11)", () => {
    const withCopyProp = () => {
      const s = styleSetup();
      const a = s.addRect();
      s.doc.apply({ type: "SetStyle", ids: [a], patch: { dragCopy: true } });
      s.sel().setSelection([a]);
      return { ...s, a };
    };

    it("dragCopy : copie sans la propriété, sélectionnée", () => {
      const { engine, doc, a } = withCopyProp();
      expect(engine.duplicate([a], 200, 0, true)).toBe(true);
      const copy = engine.state().selection[0] ?? "";
      expect(copy).not.toBe(a);
      expect(doc.element(copy)?.look?.dragCopy).toBeUndefined();
      expect(doc.element(a)?.look?.dragCopy).toBe(true);
      expect(doc.element(copy)?.transform?.[4]).toBe((doc.element(a)?.transform?.[4] ?? Number.NaN) + 200);
    });

    it("Ctrl+D garde dragCopy", () => {
      const { engine, doc } = withCopyProp();
      expect(engine.duplicateSelection()).toBe(true);
      const copy = engine.state().selection[0] ?? "";
      expect(doc.element(copy)?.look?.dragCopy).toBe(true);
    });

    it("setDragCopy : une étape, hors style courant", () => {
      const { engine, doc, addRect, sel } = styleSetup();
      const a = addRect();
      sel().setSelection([a]);
      const before = engine.itemStyle();
      expect(engine.setDragCopy(true)).toBe(true);
      expect(doc.element(a)?.look?.dragCopy).toBe(true);
      expect(engine.itemStyle()).toEqual(before);
      engine.undo();
      expect(doc.element(a)?.look?.dragCopy).toBeUndefined();
    });

    it("glisser encore l'original : 3 objets, Ctrl+Z : 2", () => {
      const { engine, a } = withCopyProp();
      engine.duplicate([a], 200, 0, true);
      engine.select([a]);
      engine.duplicate([a], 400, 0, true);
      expect(engine.state().elementCount).toBe(3);
      engine.undo();
      expect(engine.state().elementCount).toBe(2);
    });
  });

  describe("Disposition (T15)", () => {
    const three = () => {
      const s = styleSetup();
      const [a, b, c] = [s.addRect(), s.addRect(), s.addRect()] as [string, string, string];
      const order = (): string[] => s.doc.elementIds(s.engine.state().page);
      return { ...s, a, b, c, order };
    };
    it("bringToFront une étape, ordre lu", () => {
      const { engine, doc, a, b, c, order, sel } = three();
      sel().setSelection([a]);
      const v = doc.version();
      expect(engine.bringToFront()).toBe(true);
      expect(order()).toEqual([b, c, a]);
      expect(doc.version()).toBe(v + 1);
      engine.undo();
      expect(order()).toEqual([a, b, c]);
    });
    it("sendToBack, reorder up, reorder down : un rang à la fois", () => {
      const { engine, a, b, c, order, sel } = three();
      sel().setSelection([c]);
      expect(engine.sendToBack()).toBe(true);
      expect(order()).toEqual([c, a, b]);
      expect(engine.reorder("up")).toBe(true);
      expect(order()).toEqual([a, c, b]);
      expect(engine.reorder("down")).toBe(true);
      expect(order()).toEqual([c, a, b]);
    });
    it("déjà au bout ou sans sélection : faux, aucune étape", () => {
      const { engine, doc, a, c, sel } = three();
      sel().setSelection([c]);
      let v = doc.version();
      expect(engine.bringToFront()).toBe(false);
      expect(engine.reorder("up")).toBe(false);
      sel().setSelection([a]);
      expect(engine.reorder("down")).toBe(false);
      sel().setSelection([]);
      expect(engine.sendToBack()).toBe(false);
      expect(doc.version()).toBe(v);
    });
    it("bloc de deux objets : l'ordre relatif est gardé", () => {
      const { engine, a, b, c, order, sel } = three();
      sel().setSelection([a, b]);
      expect(engine.reorder("up")).toBe(true);
      expect(order()).toEqual([c, a, b]);
    });
    it("Avancer saute un groupe voisin entier, sans le couper (stepTarget d'OG4)", () => {
      const { engine, doc, a, b, c, order, sel } = three();
      doc.apply({ type: "Group", ids: [b, c] });
      sel().setSelection([a]);
      expect(engine.reorder("up")).toBe(true);
      expect(order()).toEqual([b, c, a]);
    });
    it("Ctrl+Maj+↑ premier plan, Ctrl+↓ recule", () => {
      const { engine, a, b, c, order, sel } = three();
      sel().setSelection([a]);
      expect(engine.key(key("ArrowUp", { ctrlKey: true, shiftKey: true }))).toBe(true);
      expect(order()).toEqual([b, c, a]);
      expect(engine.key(key("ArrowDown", { ctrlKey: true }))).toBe(true);
      expect(order()).toEqual([b, a, c]);
    });
  });

  it("duplicateSelection sans sélection : faux, rien d'écrit", () => {
    const { engine, doc } = styleSetup();
    const v = doc.version();
    expect(engine.duplicateSelection()).toBe(false);
    expect(doc.version()).toBe(v);
  });

  it("Ctrl+D duplique", () => {
    const { engine, addRect, sel } = styleSetup();
    sel().setSelection([addRect()]);
    expect(engine.key(key("d", { ctrlKey: true }))).toBe(true);
    expect(engine.state().elementCount).toBe(2);
  });

  it("T18 Ctrl+K avec un seul élément : ouvre l'éditeur de lien (linkEditing), rien d'écrit", () => {
    const { engine, doc, addRect, sel } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    const v = doc.version();
    expect(engine.state().linkEditing).toBeNull();
    expect(engine.key(key("k", { ctrlKey: true }))).toBe(true);
    expect(engine.state().linkEditing).toBe(a);
    expect(doc.version()).toBe(v);
  });

  it("T18 Ctrl+K avec deux éléments ou aucun : rien, la touche passe", () => {
    const { engine, addRect, sel } = styleSetup();
    expect(engine.key(key("k", { ctrlKey: true }))).toBe(false);
    sel().setSelection([addRect(), addRect()]);
    expect(engine.key(key("k", { ctrlKey: true }))).toBe(false);
    expect(engine.state().linkEditing).toBeNull();
  });

  it("T18 setLink : un SetStyle { link }, une étape, n'entre pas dans le style courant", () => {
    const { engine, doc, addRect, sel, lookOf } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    engine.key(key("k", { ctrlKey: true }));
    const v = doc.version();
    expect(engine.setLink("https://example.org")).toBe(true);
    expect(lookOf(a)?.["link"]).toBe("https://example.org");
    expect(doc.version()).toBe(v + 1);
    expect(engine.state().linkEditing).toBeNull();
    expect("link" in engine.itemStyle()).toBe(false);
    engine.undo();
    expect(lookOf(a)?.["link"]).toBeUndefined();
  });

  it("T18 setLink(null) retire le lien ; javascript: refusé par le cœur, rien d'écrit", () => {
    const { engine, doc, addRect, sel, lookOf } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    engine.setLink("mailto:a@example.org");
    const v = doc.version();
    expect(engine.setLink("javascript:alert(1)")).toBe(false);
    expect(doc.version()).toBe(v);
    expect(lookOf(a)?.["link"]).toBe("mailto:a@example.org");
    expect(engine.setLink(null)).toBe(true);
    expect(lookOf(a)?.["link"]).toBeUndefined();
  });

  it("T18 toucher du badge avec l'outil Sélection : ouvre le lien une fois ; glisser ou autre outil : rien", () => {
    const openLink = vi.fn();
    const { engine, doc, addRect, sel } = styleSetup({ openLink });
    const a = addRect();
    sel().setSelection([a]);
    expect(engine.setLink("https://example.org")).toBe(true);
    expect(openLink).not.toHaveBeenCalled();
    sel().setSelection([]);
    const badge = linkBadgeBox(doc.bounds([a])!, engine.camera());
    const at = (dx = 0, dy = 0) => [{ x: badge.x + 8 + dx, y: badge.y + 8 + dy, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }];
    engine.setTool("pen");
    engine.sink.begin(1, "pen", at(), "touch");
    engine.sink.close(1, "end");
    expect(openLink).not.toHaveBeenCalled();
    engine.setTool("select");
    engine.sink.begin(2, "select", at(), "touch");
    engine.sink.extend(2, at(30, 30), []);
    engine.sink.close(2, "end");
    engine.sink.begin(3, "select", at(), "touch");
    engine.sink.close(3, "cancel");
    expect(openLink).not.toHaveBeenCalled();
    // Dans la zone de 44 px, hors du dessin de 16 px.
    engine.sink.begin(4, "select", at(18, -18), "touch");
    engine.sink.close(4, "end");
    expect(openLink.mock.calls).toEqual([["https://example.org"]]);
  });

  it("T18 Échap ferme l'éditeur de lien sans vider la sélection", () => {
    const { engine, addRect, sel } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    engine.key(key("k", { ctrlKey: true }));
    engine.closeLink();
    expect(engine.state().linkEditing).toBeNull();
    expect(engine.state().selection).toEqual([a]);
  });

  it("setItemStyle : style courant déjà égal, la sélection est quand même écrite", () => {
    const blue = "#1d4ed8";
    const { engine, addRect, sel, colorOf } = styleSetup({ itemStyle: { ...DEFAULT_ITEM_STYLE, color: blue } });
    const a = addRect();
    sel().setSelection([a]);
    expect(colorOf(a)).toBe("#000000");
    engine.setItemStyle({ color: blue });
    expect(colorOf(a)).toBe(blue);
  });

  it("setItemStyle : champ invalide avec sélection : aucune commande", () => {
    const { engine, doc, addRect, sel } = styleSetup();
    sel().setSelection([addRect()]);
    const v = doc.version();
    engine.setItemStyle({ opacity: 150 });
    expect(doc.version()).toBe(v);
    expect(engine.itemStyle().opacity).toBe(DEFAULT_ITEM_STYLE.opacity);
  });

  it("adoptItemStyle : style adopté tel quel, sélection intacte, rien d'écrit, pas d'écho à onItemStyle", () => {
    const { engine, doc, addRect, sel, colorOf } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    const seen: ItemStyle[] = [];
    engine.onItemStyle((st) => seen.push(st));
    const v = doc.version();
    engine.adoptItemStyle({ ...DEFAULT_ITEM_STYLE, color: "#1d4ed8", opacity: 40 });
    expect(engine.itemStyle()).toMatchObject({ color: "#1d4ed8", opacity: 40 });
    expect(engine.state().selection).toEqual([a]);
    expect(colorOf(a)).toBe("#000000");
    expect(doc.version()).toBe(v);
    expect(seen).toEqual([]);
  });

  it("Ctrl+D sans sélection : pris (preventDefault, comme Excalidraw), rien d'écrit", () => {
    const { engine, doc } = styleSetup();
    const v = doc.version();
    expect(engine.key(key("d", { ctrlKey: true }))).toBe(true);
    expect(doc.version()).toBe(v);
  });

  it("deleteSelection : une étape, faux sans sélection, Annuler resélectionne", () => {
    const { engine, addRect, sel } = styleSetup();
    const a = addRect();
    sel().setSelection([a]);
    expect(engine.deleteSelection()).toBe(true);
    expect(engine.state().elementCount).toBe(0);
    expect(engine.deleteSelection()).toBe(false);
    engine.undo();
    expect(engine.state().selection).toEqual([a]);
  });

  it("seed tiré au début du geste : aperçu et objet posé", () => {
    const { engine, lookOf, drawRect } = styleSetup();
    engine.setTool("rect");
    engine.setItemStyle({ roughness: 1 });
    const { seeds, id } = drawRect();
    expect(seeds).toHaveLength(2);
    expect(typeof seeds[0]).toBe("number");
    // Même graine sur toutes les images du geste et sur l'objet posé (tirée à l'ouverture, jamais au relâché).
    expect(seeds[1]).toBe(seeds[0]);
    expect(lookOf(id)?.["seed"]).toBe(seeds[0]);
  });

  it("forme au style neutre : aucun look écrit", () => {
    const { engine, lookOf, drawRect } = styleSetup();
    engine.setTool("rect");
    const { id } = drawRect();
    expect(lookOf(id)).toBeUndefined();
  });
});

describe("moteur — ordre des objets (lot 2)", () => {
  function stack() {
    const doc = fakeCore.blank();
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", [], ctx),
      eraser: (ctx) => fakeTool("eraser", [], ctx),
      select: (ctx) => createSelectTool(ctx),
    };
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools });
    const page = engine.state().page;
    const rect = (x: number): string =>
      doc.apply({ type: "AddShape", page, shape: "rect", x0: x, y0: 100, x1: x + 50, y1: 150, style: PEN, fill: null }).ids[0] ?? "";
    const ctrl = (key: string, shiftKey = false): KeyLike => ({ key, ctrlKey: true, metaKey: false, shiftKey, altKey: false, isComposing: false, target: null });
    return { doc, engine, page, rect, ctrl };
  }
  it("select(ids) : outil Sélection, sélection posée, état émis ; select([]) la vide", () => {
    const { engine, rect } = stack();
    const a = rect(0);
    engine.setTool("pen");
    engine.select([a]);
    expect(engine.tool()).toBe("select");
    expect(engine.state().selection).toEqual([a]);
    engine.select([]);
    expect(engine.state().selection).toEqual([]);
  });
  it("bringToFront() : une étape, un seul Annuler rend l'ordre ; déjà au premier plan : faux", () => {
    const { engine, doc, page, rect } = stack();
    const a = rect(0);
    const b = rect(100);
    const c = rect(200);
    engine.select([a]);
    expect(engine.bringToFront()).toBe(true);
    expect(doc.elementIds(page)).toEqual([b, c, a]);
    const v = doc.version();
    expect(engine.bringToFront()).toBe(false);
    expect(doc.version()).toBe(v);
    engine.undo();
    expect(doc.elementIds(page)).toEqual([a, b, c]);
  });
  it("sendToBack() : la sélection descend au rang 0, ordre relatif gardé ; sans sélection : faux", () => {
    const { engine, doc, page, rect } = stack();
    const a = rect(0);
    const b = rect(100);
    const c = rect(200);
    expect(engine.sendToBack()).toBe(false);
    engine.select([b, c]);
    expect(engine.sendToBack()).toBe(true);
    expect(doc.elementIds(page)).toEqual([b, c, a]);
    expect(engine.sendToBack()).toBe(false); // déjà à l'arrière-plan : aucune étape
    engine.undo();
    expect(doc.elementIds(page)).toEqual([a, b, c]);
  });
  it("restack(ids, to) : relayé au cœur ; refus (rang hors bornes) : faux, erreur dans l'état", () => {
    const { engine, doc, page, rect } = stack();
    const a = rect(0);
    const b = rect(100);
    expect(engine.restack([a], 1)).toBe(true);
    expect(doc.elementIds(page)).toEqual([b, a]);
    expect(engine.restack([a], 5)).toBe(false);
    expect(engine.state().error).not.toBeNull();
  });
  it("Ctrl+↑ / Ctrl+↓ : un rang ; Ctrl+Maj+↑ / ↓ : extrémités ; touche prise seulement avec une sélection", () => {
    const { engine, doc, page, rect, ctrl } = stack();
    const a = rect(0);
    const b = rect(100);
    const c = rect(200);
    expect(engine.key(ctrl("ArrowUp"))).toBe(false);
    engine.select([a]);
    expect(engine.key(ctrl("ArrowUp"))).toBe(true);
    expect(doc.elementIds(page)).toEqual([b, a, c]);
    expect(engine.key(ctrl("ArrowUp", true))).toBe(true);
    expect(doc.elementIds(page)).toEqual([b, c, a]);
    expect(engine.key(ctrl("ArrowDown"))).toBe(true);
    expect(doc.elementIds(page)).toEqual([b, a, c]);
    expect(engine.key(ctrl("ArrowDown", true))).toBe(true);
    expect(doc.elementIds(page)).toEqual([a, b, c]);
  });
  it("Ctrl+Maj+L : ouvre l'onglet Calques (pageShortcut), Ctrl+Maj+P : Pages", () => {
    const seen: string[] = [];
    const eng = { prevPage: () => false, nextPage: () => false, nextOrAdd: () => false, addPage: () => false, duplicatePage: () => false };
    const ev = (key: string): KeyLike => ({ key, ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, isComposing: false, target: null });
    expect(pageShortcut(ev("L"), eng, (t) => seen.push(t))).toBe(true);
    expect(pageShortcut(ev("P"), eng, (t) => seen.push(t))).toBe(true);
    expect(seen).toEqual(["calques", "pages"]);
    expect(pageShortcut(ev("L"), eng)).toBe(false);
  });
});

describe("moteur — style courant du texte et alignement en saisie (T31)", () => {
  function build(editingId: string | null) {
    const doc = fakeCore.blank();
    const applied: unknown[] = [];
    const real = doc.apply.bind(doc);
    doc.apply = ((c: never) => { applied.push(c); return real(c); }) as typeof doc.apply;
    const log: string[] = [];
    const styles: { text?: () => TextStyle; table?: () => TextStyle } = {};
    const base = fakeTextTool({ stateChanged: () => undefined } as ToolContext, log).tool;
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", log, ctx),
      eraser: (ctx) => fakeTool("eraser", log, ctx),
      table: (ctx, style) => { styles.table = style; return fakeTableTool(ctx, log).tool; },
      text: (_ctx, style) => ({ ...(styles.text = style, base), editing: () => (editingId === null ? null : ({ id: editingId, page: "p", matrix: [1, 0, 0, 1, 0, 0], boxWidth: 600, color: "#000000", size: 36, initial: "x", spans: plainSpans("x") } as TextEditSession)) }),
    };
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools });
    return { engine, applied, styles };
  }
  it("police et taille choisies sans texte : style courant, aucune commande, textStyle les porte", () => {
    const { engine, applied, styles } = build(null);
    engine.setTool("text");
    engine.setItemStyle({ font: "Georgia", fontSize: 48 });
    expect(applied).toEqual([]);
    expect(engine.itemStyle()).toMatchObject({ font: "Georgia", fontSize: 48 });
    expect(styles.text?.()).toMatchObject({ size: 48, font: "Georgia" });
  });
  it("T32 : l'outil Tableau et l'import gardent la taille par défaut et aucune police", () => {
    const { engine, styles } = build(null);
    engine.setItemStyle({ font: "Georgia", fontSize: 48, textAlign: "center" });
    expect(styles.table?.()).toEqual({ color: "#000000", size: DEFAULT_TEXT_SIZE, textAlign: "center" });
    expect(engine.textStyle()).toEqual({ color: "#000000", size: DEFAULT_TEXT_SIZE, textAlign: "center" });
  });
  it("texte rouvert en saisie : Droite écrit un SetStyle sur ce texte", () => {
    const { engine, applied } = build("t1");
    engine.setTool("text");
    engine.setItemStyle({ textAlign: "right" });
    expect(applied).toContainEqual({ type: "SetStyle", ids: ["t1"], patch: { textAlign: "right" } });
  });
  it("texte neuf en saisie : Droite ne change que le style courant", () => {
    const { engine, applied } = build(null);
    engine.setTool("text");
    engine.setItemStyle({ textAlign: "right" });
    expect(applied).toEqual([]);
    expect(engine.itemStyle().textAlign).toBe("right");
  });
});

describe("moteur — plusieurs commandes en une étape d'annulation (T37)", () => {
  function texts() {
    const { doc, engine, renderer } = setup();
    const page = engine.state().page;
    const add = (x: number, content: string): string =>
      doc.apply({ type: "SetText", page, id: null, x, y: 10, content, color: "#000000", size: 36, boxWidth: 200, boxHeight: 50 }).ids[0] ?? "";
    const ids = [add(0, "un"), add(300, "deux"), add(600, "trois")];
    const lenOf = (id: string): number => {
      const el = doc.element(id);
      return el?.kind === "text" ? el.text.content.length : 0;
    };
    const fmt = (attrs: { font?: string | null; size?: number }) =>
      ids.map((id) => ({ type: "FormatText" as const, id, start: 0, len: lenOf(id), attrs }));
    const fontOf = (id: string): string | undefined => {
      const el = doc.element(id);
      return el?.kind === "text" ? el.text.spans[0]?.attrs.font : undefined;
    };
    const sizeOf = (id: string): number | undefined => {
      const el = doc.element(id);
      return el?.kind === "text" ? el.text.spans[0]?.attrs.size : undefined;
    };
    return { doc, engine, renderer, ids, fmt, fontOf, sizeOf };
  }
  it("runAll Police : un seul annuler les rétablit tous, un seul rétablir les refait", () => {
    const { engine, ids, fmt, fontOf } = texts();
    expect(engine.runAll(fmt({ font: "Georgia" }))).not.toBeNull();
    for (const id of ids) expect(fontOf(id)).toBe("Georgia");
    engine.undo();
    for (const id of ids) expect(fontOf(id)).toBeUndefined();
    engine.redo();
    for (const id of ids) expect(fontOf(id)).toBe("Georgia");
    engine.undo();
    for (const id of ids) expect(fontOf(id)).toBeUndefined();
  });
  it("runAll Taille : un seul annuler les rétablit tous", () => {
    const { engine, ids, fmt, sizeOf } = texts();
    engine.runAll(fmt({ size: 48 }));
    for (const id of ids) expect(sizeOf(id)).toBe(48);
    engine.undo();
    for (const id of ids) expect(sizeOf(id)).not.toBe(48);
  });
  it("runAll n'efface pas l'étape d'avant : un second annuler défait l'écriture précédente", () => {
    const { doc, engine, ids, fmt, fontOf } = texts();
    engine.runAll(fmt({ font: "Georgia" }));
    engine.runAll(fmt({ font: "Courier New" }));
    engine.undo();
    for (const id of ids) expect(fontOf(id)).toBe("Georgia");
    engine.undo();
    for (const id of ids) expect(fontOf(id)).toBeUndefined();
    expect(doc.canUndo()).toBe(true);
  });
  it("rétablir sans rien à rétablir ne jette pas la pile : un annuler défait encore tout le lot", () => {
    const { engine, ids, fmt, fontOf } = texts();
    engine.runAll(fmt({ font: "Georgia" }));
    engine.redo();
    engine.undo();
    for (const id of ids) expect(fontOf(id)).toBeUndefined();
  });
  it("un annuler de trop (pile vide) ne jette pas la pile de rétablir : un rétablir refait tout le lot", () => {
    const { doc, engine } = setup();
    const page = engine.state().page;
    const add = (x: number) => ({ type: "SetText" as const, page, id: null, x, y: 10, content: "t", color: "#000000", size: 36, boxWidth: 200, boxHeight: 50 });
    engine.runAll([add(0), add(300), add(600)]);
    expect(doc.elementIds(page).length).toBe(3);
    engine.undo();
    expect(doc.elementIds(page).length).toBe(0);
    engine.undo();
    engine.redo();
    expect(doc.elementIds(page).length).toBe(3);
  });
  it("une écriture hors commit puis une écriture par commit : les piles sont jetées, l'annuler retombe sur une étape", () => {
    const { doc, engine, ids, fmt, fontOf } = texts();
    const page = engine.state().page;
    engine.runAll(fmt({ font: "Georgia" }));
    doc.apply({ type: "SetText", page, id: null, x: 0, y: 400, content: "hors", color: "#000000", size: 36, boxWidth: 200, boxHeight: 50 });
    engine.run({ type: "SetText", page, id: null, x: 0, y: 500, content: "via", color: "#000000", size: 36, boxWidth: 200, boxHeight: 50 });
    const count = doc.elementIds(page).length;
    engine.undo();
    expect(doc.elementIds(page).length).toBe(count - 1);
    engine.undo();
    expect(doc.elementIds(page).length).toBe(count - 2);
    for (const id of ids) expect(fontOf(id)).toBe("Georgia");
  });
  it("runAll refusé au milieu : écritures gardées, scène invalidée, un annuler défait la première", () => {
    const { engine, renderer, ids, fmt, fontOf } = texts();
    const cmds = [...fmt({ font: "Georgia" }).slice(0, 1), { type: "FormatText" as const, id: "absent", start: 0, len: 1, attrs: { font: "Georgia" } }];
    const seen = renderer.changes.length;
    expect(engine.runAll(cmds)).toBeNull();
    expect(engine.state().error).not.toBeNull();
    expect(fontOf(ids[0] ?? "")).toBe("Georgia");
    expect(renderer.changes.length).toBeGreaterThan(seen);
    engine.undo();
    expect(fontOf(ids[0] ?? "")).toBeUndefined();
  });
  it("runAll d'une seule commande ou d'une liste vide : comme run, sans erreur", () => {
    const { engine, ids, fmt, fontOf } = texts();
    expect(engine.runAll([])).toBeNull();
    engine.runAll(fmt({ font: "Georgia" }).slice(0, 1));
    engine.undo();
    expect(fontOf(ids[0] ?? "")).toBeUndefined();
  });
});

describe("OG23 T8 : pipette de scène", () => {
  it("pickColor : un toucher, Échap annule", async () => {
    const { engine, renderer, log } = setup();
    const p = engine.pickColor();
    expect(engine.state().picking).toBe(true);
    engine.sink.begin(1, "pen", [{ ...sample, x: 7, y: 9 }]);
    engine.sink.close(1, "end");
    expect(await p).toBe("#abcdef");
    expect(renderer.asked).toEqual([[7, 9]]);
    expect(log).toEqual([]); // le toucher lu n'atteint aucun outil
    expect(engine.state().picking).toBe(false);
    // le toucher suivant redevient un geste ordinaire
    engine.sink.begin(2, "pen", [sample]);
    engine.sink.close(2, "end");
    expect(log).toContain("pen.begin 2");
    // Échap annule
    const q = engine.pickColor();
    expect(engine.key(key("Escape"))).toBe(true);
    expect(await q).toBeNull();
    expect(engine.state().picking).toBe(false);
    // un second appel résout le premier à null
    const a = engine.pickColor();
    const b = engine.pickColor();
    expect(await a).toBeNull();
    expect(engine.state().picking).toBe(true);
    renderer.color = null;
    engine.sink.begin(3, "pen", [sample]);
    expect(await b).toBeNull();
  });
});
