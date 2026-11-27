// @vitest-environment happy-dom
/**
 * Session d'un onglet (T93, CL5b-1, CL5b-2) : une scène, deux canvas, un moteur, une zone de texte par onglet ; un
 * seul jeu d'ids dans la page (celui de la session active) ; `dispose` rend le contexte WebGL2 et vide le DOM.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Camera } from "../engine/camera";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { detectSupport } from "../engine/input/support";
import { FakeGL } from "../engine/render/fake-gl";
import type { PdfEngine, PdfFile, TileBitmap } from "../engine/render/pdf-port";
import { createSettingsStore, echelonsTag, parseSettings, type ParsedSettings } from "../engine/settings";
import { readSelection, readText, setSelection } from "./rich-dom";
import type { WorkerLike } from "../platform/sheet-reader";
import { stageTags } from "./stage-tags";
import { createBoardSession, type SessionShared } from "./board-session";
import { DEFAULT_ITEM_STYLE, type ItemStyle } from "../engine/item-style";
import { DEFAULT_MODEL3D_PITCH, DEFAULT_MODEL3D_YAW } from "../core/api";
import { createModelViewLoader, snapshotSize, type ModelView, type PixelSize } from "../platform/model-view";
import { FILL_ABANDONED_MESSAGE, FILL_NO_RUNNER, fillFailure } from "./image-fill";

/** Caméras reçues par `follow` de chaque zone de texte créée (le module réel, enveloppé). */
const follows = vi.hoisted(() => [] as Camera[]);
vi.mock("./text-editor", async (importOriginal) => {
  const m = await importOriginal<typeof import("./text-editor")>();
  return {
    ...m,
    createTextEditor: (...args: Parameters<typeof m.createTextEditor>) => {
      const editor = m.createTextEditor(...args);
      const follow = editor.follow.bind(editor);
      (editor as { follow: (c: Camera) => void }).follow = (c) => {
        follows.push(c);
        follow(c);
      };
      return editor;
    },
  };
});

/** Faux contexte 2D : toute méthode est un no-op (happy-dom ne fournit pas de contexte). */
function fake2d(canvas: HTMLCanvasElement): unknown {
  const target: Record<string | symbol, unknown> = { canvas };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : k === "then" ? undefined : () => undefined),
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  });
}

type Makers = Partial<Record<"2d" | "webgl2", (c: HTMLCanvasElement) => unknown>>;

/** Pose les contextes du genre demandé sur tous les canvas ; rend la restauration. */
function stubGetContext(makers: Makers): () => void {
  const made = new WeakMap<HTMLCanvasElement, Map<string, unknown>>();
  const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement,
    kind: string,
  ) {
    const make = makers[kind as keyof Makers];
    if (!make) return null;
    let byKind = made.get(this);
    if (!byKind) made.set(this, (byKind = new Map()));
    if (!byKind.has(kind)) byKind.set(kind, make(this));
    return byKind.get(kind);
  } as never);
  return () => spy.mockRestore();
}

const IDS = ["stage", "scene", "interaction", "texte-edition"];
/** Sondé une fois, avant tout faux contexte (detectSupport ouvre un canvas 2D). */
const SUPPORT = detectSupport();

let container: HTMLDivElement;
let shared: SessionShared;
let restore: () => void = () => undefined;

function sharedWith(parsed: ParsedSettings): SessionShared {
  return {
    container,
    settings: createSettingsStore(parsed.settings),
    parsed,
    support: SUPPORT,
    measure: (s, size) => s.length * size * 0.6,
    coreVersion: "fake-core-1",
  };
}

/** Échelon 4 actif, comme au démarrage avec l'adresse qui le demande (lu par la session dans `parsed`). */
function webglOn(): SessionShared {
  const parsed = parseSettings("");
  return sharedWith({ ...parsed, settings: { ...parsed.settings, webgl: "on" } });
}

beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.append(container);
  shared = sharedWith(parseSettings(""));
  follows.length = 0;
  restore = stubGetContext({ "2d": fake2d });
});

afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

describe("createBoardSession (T93)", () => {
  it("mousedown empêché aussi pour l'outil Tableau (C10a)", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    const down = (): boolean => {
      const e = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      s.stage.dispatchEvent(e);
      return e.defaultPrevented;
    };
    s.engine.setTool("table");
    expect(down()).toBe(true);
    s.engine.setTool("select");
    expect(down()).toBe(false);
  });

  it("outil Tableau : grille, saisie, Tab (C10a) — clic dans le vide, 2 × 2 choisi, Tab va à l'outil Tableau", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    s.activate();
    s.engine.setTool("table");
    const c = s.engine.camera();
    const [sx, sy] = [200 * c.zoom + c.tx, 150 * c.zoom + c.ty];
    s.engine.sink.begin(1, "table", [{ x: sx, y: sy, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    const picker = container.querySelector<HTMLElement>(".rb-table-picker");
    expect(picker?.hidden).toBe(false);
    picker!.querySelector<HTMLButtonElement>('button[data-cols="2"][data-rows="2"]')!.click();
    expect(s.stage.dataset["table"]).toBe("2x2@0,0");
    const area = document.getElementById("texte-edition") as HTMLElement;
    expect(area.hidden).toBe(false);
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    area.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(s.stage.dataset["table"]).toBe("2x2@0,1");
    s.deactivate();
    expect(picker?.hidden).toBe(true);
    s.dispose();
    expect(container.querySelector(".rb-table-picker")).toBeNull();
  });

  it("outil Pot (C6a) : un clic dans le vide colore le fond de la page (fabrique branchée, rouge par défaut)", async () => {
    const doc = fakeCore.blank();
    const s = await createBoardSession(doc, shared);
    s.activate();
    s.engine.setTool("fill");
    const c = s.engine.camera();
    const [sx, sy] = [1500 * c.zoom + c.tx, 900 * c.zoom + c.ty];
    s.engine.sink.begin(1, "fill", [{ x: sx, y: sy, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    expect(doc.page(doc.pageIds()[0] ?? "")?.background).toBe("#dc2626");
    s.dispose();
  });

  /** Le navigateur insère `s` à la sélection de la zone (DOM aplati), place le curseur après, puis émet `input`. */
  const typeIn = (zone: HTMLElement, s: string): void => {
    const sel = readSelection(zone) ?? { start: 0, end: 0 };
    const t = readText(zone);
    zone.textContent = t.slice(0, sel.start) + s + t.slice(sel.end);
    setSelection(zone, sel.start + s.length, sel.start + s.length);
    zone.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: s }));
  };

  it("session — texte riche (C7b) : outil Texte, la zone est un contenteditable ; Ctrl+B publie textFormat ; Échap : null", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    s.activate();
    s.engine.setTool("text");
    const c = s.engine.camera();
    s.engine.sink.begin(1, "text", [{ x: 200 * c.zoom + c.tx, y: 150 * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    const zone = document.getElementById("texte-edition") as HTMLElement;
    expect([zone.hidden, zone.getAttribute("contenteditable")]).toEqual([false, "true"]);
    expect(s.engine.state().textFormat).toMatchObject({ bold: false });
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true, cancelable: true }));
    expect(s.engine.state().textFormat?.bold).toBe(true);
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(s.engine.state().textFormat).toBeNull();
    s.dispose();
  });

  it("session — texte riche (C7b) : cellule, Ctrl+B puis « Total », Tab : SetTableCell en gras (S1)", async () => {
    const doc = fakeCore.blank();
    const s = await createBoardSession(doc, shared);
    s.activate();
    s.engine.setTool("table");
    const c = s.engine.camera();
    s.engine.sink.begin(1, "table", [{ x: 200 * c.zoom + c.tx, y: 150 * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    container.querySelector<HTMLElement>(".rb-table-picker")!.querySelector<HTMLButtonElement>('button[data-cols="2"][data-rows="2"]')!.click();
    const zone = document.getElementById("texte-edition") as HTMLElement;
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true, cancelable: true }));
    typeIn(zone, "Total");
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    const id = doc.elementIds(doc.pageIds()[0] ?? "").at(-1) ?? "";
    const el = doc.element(id);
    if (el?.kind !== "table") throw new Error("tableau attendu");
    expect(el.table.cells[0]?.spans).toEqual([{ text: "Total", attrs: { bold: true } }]);
    expect(s.stage.dataset["table"]).toBe("2x2@0,1");
    s.dispose();
  });

  it("création qui échoue : aucune scène ne reste dans le conteneur, l'erreur est relancée", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor() {
          throw new Error("boum");
        }
      },
    );
    try {
      await expect(createBoardSession(fakeCore.blank(), shared)).rejects.toThrow("boum");
    } finally {
      vi.unstubAllGlobals();
    }
    expect(container.querySelectorAll(".rb-stage")).toHaveLength(0);
    expect(container.children).toHaveLength(0);
  });

  it("activate pose les ids #stage/#scene/#interaction/#texte-edition ; deactivate les retire et cache la scène", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    s.activate();
    expect(document.getElementById("stage")).toBe(s.stage);
    expect(s.stage.hidden).toBe(false);
    expect(document.getElementById("scene")?.parentElement).toBe(s.stage);
    expect(document.getElementById("interaction")).toBe(s.choice.interaction);
    expect(document.getElementById("texte-edition")).not.toBeNull();
    // CL4-2 : la zone de texte reste hors de la scène.
    expect(s.stage.contains(document.getElementById("texte-edition"))).toBe(false);
    s.deactivate();
    for (const id of IDS) expect(document.getElementById(id), id).toBeNull();
    expect(s.stage.hidden).toBe(true);
    expect(s.stage.classList.contains("rb-stage")).toBe(true);
    expect(s.stage.hasAttribute("data-tab")).toBe(true);
  });

  it("deux sessions : un seul #stage, un seul #texte-edition", async () => {
    const a = await createBoardSession(fakeCore.blank(), shared);
    a.activate();
    // Une session créée pendant qu'une autre est active ne prend aucun id.
    const b = await createBoardSession(fakeCore.blank(), shared);
    b.deactivate();
    for (const id of IDS) expect(document.querySelectorAll(`#${id}`), id).toHaveLength(1);
    expect(document.getElementById("stage")).toBe(a.stage);
    expect(a.stage.contains(document.getElementById("scene"))).toBe(true);
    a.deactivate();
    b.activate();
    expect(document.getElementById("stage")).toBe(b.stage);
    expect(b.stage.contains(document.getElementById("scene"))).toBe(true);
    for (const id of IDS) expect(document.querySelectorAll(`#${id}`), id).toHaveLength(1);
    expect(container.querySelectorAll(".rb-stage")).toHaveLength(2);
    expect(a.stage.hidden).toBe(true);
    expect(a.engine).not.toBe(b.engine);
  });

  it("dispose : contexte WebGL2 perdu, scène retirée, document libéré", async () => {
    restore();
    const gl = new FakeGL();
    restore = stubGetContext({ "2d": fake2d, webgl2: () => gl });
    const doc = fakeCore.blank();
    const free = vi.spyOn(doc, "free");
    const on = webglOn();
    const s = await createBoardSession(doc, on);
    expect(s.choice.webgl).toBe(true);
    s.activate();
    s.dispose();
    expect(gl.log.filter((l) => l === "loseContext")).toHaveLength(1);
    expect(on.container.contains(s.stage)).toBe(false);
    expect(on.container.querySelector("#texte-edition, [contenteditable]")).toBeNull();
    for (const id of IDS) expect(document.getElementById(id), id).toBeNull();
    expect(free).toHaveBeenCalledTimes(1);
    expect(() => s.dispose()).not.toThrow(); // idempotent : free et loseContext toujours une fois
    expect(free).toHaveBeenCalledTimes(1);
    expect(gl.log.filter((l) => l === "loseContext")).toHaveLength(1);
  });

  it("dispose : le moteur ne publie plus rien, les réglages ne marquent plus la scène", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    // Prédiction basculée vers l'état opposé : la marque changerait si l'abonnement survivait.
    const flip = s.effective().prediction ? "off" : "on";
    s.dispose();
    const before = s.stage.dataset["echelons"];
    shared.settings.set({ ...shared.settings.get(), prediction: flip });
    expect(echelonsTag(s.effective())).not.toBe(before);
    expect(s.stage.dataset["echelons"]).toBe(before);
  });

  it("la zone de texte suit la caméra (onCamera → follow)", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    follows.length = 0;
    s.engine.view.zoomAt(10, 20, 2);
    expect(follows).toHaveLength(1);
    expect(follows[0]).toEqual(s.engine.camera());
  });

  it("attributs data-* de #stage publiés comme avant (elements, version, page, selection, bounds, tool, echelons)", async () => {
    const doc = fakeCore.blank();
    const s = await createBoardSession(doc, shared);
    const check = (): void => {
      const st = s.engine.state();
      const tags = stageTags(st);
      expect(s.stage.dataset["elements"]).toBe(String(st.elementCount));
      expect(s.stage.dataset["version"]).toBe(String(st.version));
      expect(s.stage.dataset["page"]).toBe(tags.page);
      expect(s.stage.dataset["selection"]).toBe(tags.selection);
      expect(s.stage.dataset["bounds"]).toBe(tags.bounds);
      expect(s.stage.dataset["tool"]).toBe(tags.tool);
    };
    check();
    expect(s.stage.dataset["echelons"]).toBe(echelonsTag(s.effective()));
    s.engine.setTool("hand");
    check();
    expect(s.stage.style.cursor).toBe("grab");
    expect(s.engine.addPage()).toBe(true);
    check();
  });

  it("data-camera suit le zoom (zoomAt ×2 → zoom doublé à 3 décimales)", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    const z0 = s.engine.camera().zoom;
    s.engine.view.zoomAt(100, 50, 2);
    const c = s.engine.camera();
    expect(c.zoom).toBeCloseTo(z0 * 2, 9);
    expect(s.stage.dataset["camera"]).toBe(`${(z0 * 2).toFixed(3)},${c.tx.toFixed(1)},${c.ty.toFixed(1)}`);
    s.engine.view.panBy(12.34, -5.67);
    const p = s.engine.camera();
    expect(s.stage.dataset["camera"]).toBe(`${p.zoom.toFixed(3)},${p.tx.toFixed(1)},${p.ty.toFixed(1)}`);
  });

  it('webglcontextlost sur choice.interaction → data-webgl-perdu="1"', async () => {
    restore();
    const gl = new FakeGL();
    restore = stubGetContext({ "2d": fake2d, webgl2: () => gl });
    const s = await createBoardSession(fakeCore.blank(), webglOn());
    expect(s.choice.webgl).toBe(true);
    expect(s.stage.dataset["webglPerdu"]).toBeUndefined();
    s.choice.interaction.dispatchEvent(new Event("webglcontextlost"));
    expect(s.stage.dataset["webglPerdu"]).toBe("1");
  });

  it("bench() : options.inkTrail suit trail.status, echelons = echelonsTag(effective()), coreVersion = shared.coreVersion", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    const b = s.bench();
    expect(b.sampler).toBe(s.sampler);
    expect(b.options).toEqual({
      coalesced: s.samplerOptions.coalesced,
      predicted: s.samplerOptions.predicted,
      raw: s.samplerOptions.raw,
      desynchronized: true,
      inkTrail: s.trail.status === "on",
    });
    expect(b.coreVersion).toBe("fake-core-1");
    expect(b.echelons()).toBe(echelonsTag(s.effective()));
    expect(b.environment).toEqual({
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio || 1,
      support: shared.support,
    });
    expect(b.frameDurations()).toEqual(s.engine.frameDurations());
    expect(typeof b.onLiveDrawn(() => undefined)).toBe("function");
    expect(Number.isNaN(Date.parse(b.now()))).toBe(false);
  });

  it("mousedown empêché seulement pour l'outil Texte (CL4-2)", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    const down = (): boolean => {
      const e = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      s.stage.dispatchEvent(e);
      return e.defaultPrevented;
    };
    s.engine.setTool("text");
    expect(down()).toBe(true);
    s.engine.setTool("pen");
    expect(down()).toBe(false);
  });

  it("dispose : aucun écouteur matchMedia restant", async () => {
    const live = new Set<() => void>();
    const spy = vi.spyOn(window, "matchMedia").mockImplementation(
      () =>
        ({
          addEventListener: (_t: string, cb: () => void) => live.add(cb),
          removeEventListener: (_t: string, cb: () => void) => live.delete(cb),
        }) as unknown as MediaQueryList,
    );
    try {
      const s = await createBoardSession(fakeCore.blank(), shared);
      expect(live.size).toBeGreaterThan(0);
      s.dispose();
      expect(live.size).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("aucun écouteur posé sur window", async () => {
    const spy = vi.spyOn(window, "addEventListener");
    const s = await createBoardSession(fakeCore.blank(), shared);
    s.activate();
    s.deactivate();
    s.dispose();
    const kinds = spy.mock.calls.map((c) => c[0]);
    for (const k of ["keydown", "keyup", "blur"]) expect(kinds, k).not.toContain(k);
  });

  it("deactivate relâche les touches tenues (engine.releaseKeys)", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    s.activate();
    const space = { key: " ", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null };
    s.engine.key(space);
    expect(s.engine.panHeld()).toBe(true);
    s.deactivate();
    expect(s.engine.panHeld()).toBe(false);
  });

  it("activate ajuste la taille par la case CSS de la scène (clientWidth, clientHeight), pas la fenêtre", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    Object.defineProperty(s.stage, "clientWidth", { configurable: true, value: 640 });
    Object.defineProperty(s.stage, "clientHeight", { configurable: true, value: 480 });
    const resize = vi.spyOn(s.engine, "resize");
    s.activate();
    expect(resize).toHaveBeenLastCalledWith(640, 480, window.devicePixelRatio || 1);
  });

  it("image du document : décodée depuis le magasin de l'onglet, bitmap fermé à dispose (R12, R16)", async () => {
    const doc = fakeCore.blank();
    const id = "cd".repeat(32);
    doc.apply({ type: "AddImage", page: doc.pageIds()[0]!, asset: { id, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    const assets = createAssetStore();
    assets.adopt(id, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    const close = vi.fn();
    const decode = vi.fn(async (_b: Blob) => ({ width: 10, height: 10, close }) as unknown as ImageBitmap);
    const s = await createBoardSession(doc, { ...shared, decode }, assets);
    s.activate();
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(Array.from(new Uint8Array(await decode.mock.calls[0]![0].arrayBuffer()))).toEqual([1, 2, 3]);
    s.dispose();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("S5 (I24) : module des pixels en échec : image brute, data-pixels=echec, message dans l'état, un seul Worker", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 10, height: 10, close: vi.fn() })));
    try {
      const doc = fakeCore.blank();
      const page = doc.pageIds()[0]!;
      const asset = "cd".repeat(32);
      const el = doc.apply({ type: "AddImage", page, asset: { id: asset, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
      doc.apply({ type: "SetImageParams", id: el, params: { brightness: 20 }, matrix: [1, 0, 0, 1, 0, 0] });
      const assets = createAssetStore();
      assets.adopt(asset, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
      const decode = vi.fn(async (_b: Blob) => ({ width: 10, height: 10, close: vi.fn() }) as unknown as ImageBitmap);
      const spawn = vi.fn((): WorkerLike => {
        const w: WorkerLike = {
          onmessage: null,
          onerror: null,
          postMessage: (m) => queueMicrotask(() => w.onmessage?.({ data: { id: (m as { id: number }).id, error: "module des pixels indisponible" } })),
          terminate: vi.fn(),
        };
        return w;
      });
      const s = await createBoardSession(doc, { ...shared, decode, pixels: spawn }, assets);
      s.activate();
      await vi.waitFor(() => expect(s.stage.dataset["pixels"]).toBe("echec"), { timeout: 5000 });
      expect(s.engine.state().error).toBe("retouches de l'image non affichées : module des pixels indisponible");
      expect(spawn).toHaveBeenCalledTimes(1);
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("session — fond PDF (C12, PF15)", () => {
  const PDF = { id: "ef".repeat(32), name: "a.pdf", mime: "application/pdf", size: 5 };
  function pdfEngine() {
    const close = vi.fn();
    const destroy = vi.fn();
    const renderTile = vi.fn(async (_index: number, ..._rest: unknown[]) => ({ close }) as unknown as TileBitmap);
    const open = vi.fn(async (_b: Blob): Promise<PdfFile> => ({ pageCount: 1, pageSize: async () => ({ w: 612, h: 792 }), renderTile, destroy }));
    return { engine: { open } satisfies PdfEngine, open, renderTile, close, destroy };
  }
  async function pdfSession(o: { pdf?: PdfEngine; withAsset?: boolean } = {}) {
    const doc = fakeCore.fromPdfPages(PDF, [{ w: 612, h: 792 }]);
    const assets = createAssetStore();
    if (o.withAsset !== false) assets.adopt(PDF.id, new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], { type: "application/pdf" }));
    const s = await createBoardSession(doc, { ...shared, ...(o.pdf ? { pdf: o.pdf } : {}) }, assets);
    Object.defineProperty(s.stage, "clientWidth", { configurable: true, value: 640 });
    Object.defineProperty(s.stage, "clientHeight", { configurable: true, value: 480 });
    s.activate();
    return s;
  }

  it("fond pdf-page : PDF ouvert depuis le magasin de l'onglet, tuiles rendues, data-fond « pret » (S1, S3)", async () => {
    const pdf = pdfEngine();
    const s = await pdfSession({ pdf: pdf.engine });
    await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("pret"), { timeout: 5000 });
    expect(pdf.open).toHaveBeenCalledTimes(1);
    expect(pdf.renderTile.mock.calls[0]?.[0]).toBe(0);
    s.dispose();
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
    expect(pdf.close).toHaveBeenCalled();
  });

  it("deactivate libère tuiles et PdfFile (12 onglets possibles) ; activate les recrée au dessin suivant (PF32, contre-relecture)", async () => {
    const pdf = pdfEngine();
    const s = await pdfSession({ pdf: pdf.engine });
    await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("pret"), { timeout: 5000 });
    s.deactivate();
    expect([pdf.destroy.mock.calls.length, pdf.close.mock.calls.length > 0]).toEqual([1, true]);
    s.activate();
    await vi.waitFor(() => expect(pdf.open).toHaveBeenCalledTimes(2), { timeout: 5000 });
    await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("pret"), { timeout: 5000 });
    s.dispose();
  });

  it("après deactivate, un redimensionnement à 0 x 0 (ResizeObserver) ne rouvre pas le PDF (relecture T16)", async () => {
    const seen: Array<() => void> = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          seen.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    try {
      const pdf = pdfEngine();
      const s = await pdfSession({ pdf: pdf.engine });
      await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("pret"), { timeout: 5000 });
      s.deactivate();
      Object.defineProperty(s.stage, "clientWidth", { configurable: true, value: 0 });
      Object.defineProperty(s.stage, "clientHeight", { configurable: true, value: 0 });
      for (const cb of seen) cb();
      await new Promise((r) => setTimeout(r, 50));
      expect(pdf.open).toHaveBeenCalledTimes(1);
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("un dessin déjà demandé qui passe entre deactivate et le ResizeObserver (rAF avant RO) n'ouvre pas le PDF ; activate le redessine (relecture T17)", async () => {
    const pdf = pdfEngine();
    const s = await pdfSession({ pdf: pdf.engine });
    await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("pret"), { timeout: 5000 });
    s.deactivate();
    s.engine.setTool(s.engine.tool() === "select" ? "pen" : "select"); // scène sale, taille d'avant (le RO n'est pas encore passé)
    await new Promise((r) => setTimeout(r, 100));
    expect(pdf.open).toHaveBeenCalledTimes(1);
    s.activate();
    await vi.waitFor(() => expect(pdf.open).toHaveBeenCalledTimes(2), { timeout: 5000 });
    await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("pret"), { timeout: 5000 });
    s.dispose();
  });

  it("sans moteur PDF (amorce partielle) : data-fond « echec »", async () => {
    const s = await pdfSession();
    await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("echec"), { timeout: 5000 });
    s.dispose();
  });

  it("asset absent du magasin : « echec », PDF jamais ouvert", async () => {
    const pdf = pdfEngine();
    const s = await pdfSession({ pdf: pdf.engine, withAsset: false });
    await vi.waitFor(() => expect(s.stage.dataset["fond"]).toBe("echec"), { timeout: 5000 });
    expect(pdf.open).not.toHaveBeenCalled();
    s.dispose();
  });
});

describe("session — médias (C14)", () => {
  const ASSET = "ab".repeat(32);
  const ASSET2 = "cd".repeat(32);
  const ref = (id: string) => ({ id, name: "v.webm", mime: "video/webm", size: 4 });

  interface FakeVid {
    readonly video: Record<string, unknown> & { src: string; volume: number; pause: ReturnType<typeof vi.fn> };
    readonly fire: (type: string) => void;
    readonly removed: ReturnType<typeof vi.fn>;
  }
  function fakes() {
    const made: FakeVid[] = [];
    const createVideo = (): never => {
      const listeners = new Map<string, Array<() => void>>();
      const removed = vi.fn();
      const video = {
        src: "", currentTime: 0, volume: 1, preload: "", playsInline: false, crossOrigin: null, paused: true, ended: false, readyState: 4, duration: 2.5,
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
        removeAttribute: vi.fn(),
        load: vi.fn(),
        addEventListener: (t: string, cb: () => void) => listeners.set(t, [...(listeners.get(t) ?? []), cb]),
      };
      made.push({ video, fire: (t) => (listeners.get(t) ?? []).forEach((f) => f()), removed });
      return { video, image: {}, onFrame: () => () => undefined, remove: removed } as never;
    };
    return { made, createVideo };
  }

  const created: string[] = [];
  const revoked: string[] = [];
  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    Object.assign(URL, {
      createObjectURL: vi.fn(() => {
        const u = `blob:m${created.length}`;
        created.push(u);
        return u;
      }),
      revokeObjectURL: vi.fn((u: string) => void revoked.push(u)),
    });
  });

  async function mediaSession(o: { linked?: string; blob?: boolean; extra?: Partial<SessionShared>; second?: boolean } = {}) {
    const f = fakes();
    const assets = createAssetStore();
    if (o.blob !== false) assets.adopt(ASSET, new Blob([new Uint8Array([1, 2, 3, 4])], { type: "video/webm" }));
    if (o.linked !== undefined) assets.link(ASSET, o.linked);
    const s = await createBoardSession(fakeCore.blank(), { ...shared, createVideo: f.createVideo, ...o.extra }, assets);
    Object.defineProperty(s.stage, "clientWidth", { configurable: true, value: 640 });
    Object.defineProperty(s.stage, "clientHeight", { configurable: true, value: 480 });
    s.activate();
    const page = s.engine.state().page;
    const add = (asset: string, x: number) =>
      s.engine.run({
        type: "AddMedia", page, asset: ref(asset), linked: o.linked ?? null, mediaType: "video", w: 200, h: 100, duration: 2.5, poster: null,
        matrix: [1, 0, 0, 1, x, 0] as never,
      })!.ids[0]!;
    const id = add(ASSET, 0);
    const second = o.second === true ? add(ASSET2, 300) : null;
    const click = (px: number, py: number): void => {
      s.engine.setTool("select");
      const c = s.engine.camera();
      s.engine.sink.begin(1, "select", [{ x: px * c.zoom + c.tx, y: py * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
      s.engine.sink.close(1, "end");
    };
    return { s, f, id, second, click, page, assets };
  }
  it("carte du son : le peintre reçoit assetName et écrit le nom du fichier (R7, M20)", async () => {
    const texts: string[] = [];
    restore();
    restore = stubGetContext({
      "2d": (canvas) => {
        const base = fake2d(canvas) as Record<string, unknown>;
        return new Proxy(base, {
          get: (t, k) => (k === "fillText" ? (x: string) => void texts.push(x) : (t as Record<string | symbol, unknown>)[k]),
          set: (t, k, v) => {
            (t as Record<string | symbol, unknown>)[k] = v;
            return true;
          },
        });
      },
    });
    const assets = createAssetStore();
    assets.adopt(ASSET, new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/ogg" }));
    const s = await createBoardSession(fakeCore.blank(), { ...shared }, assets);
    Object.defineProperty(s.stage, "clientWidth", { configurable: true, value: 640 });
    Object.defineProperty(s.stage, "clientHeight", { configurable: true, value: 480 });
    s.activate();
    const page = s.engine.state().page;
    s.engine.run({
      type: "AddMedia", page, asset: { id: ASSET, name: "chant.ogg", mime: "audio/ogg", size: 4 }, linked: null, mediaType: "audio",
      w: 200, h: 60, duration: 2.5, poster: null, matrix: [1, 0, 0, 1, 0, 0] as never,
    });
    await vi.waitFor(() => expect(texts).toContain("chant.ogg"), { timeout: 3000 });
    s.dispose();
  });
  const spec = (s: Awaited<ReturnType<typeof createBoardSession>>) => {
    const m = s.selectedMedia()!.media;
    return { asset: m.asset, mediaType: m.mediaType, duration: m.duration, trimStart: m.trimStart, trimEnd: m.trimEnd, loop: m.loop, volume: m.volume };
  };

  it("data-media vide sans sélection ; média sélectionné : video;poster;0.0;0.0-2.5;0;100 (M26)", async () => {
    const { s, click } = await mediaSession();
    expect(s.stage.dataset["media"]).toBe("");
    expect(s.selectedMedia()).toBeNull();
    click(100, 50);
    expect(s.selectedMedia()?.kind).toBe("media");
    expect(s.stage.dataset["media"]).toBe("video;poster;0.0;0.0-2.5;0;100");
    s.dispose();
  });

  it("Lecture : source blob: du magasin, data-media lecture", async () => {
    const { s, f, id, click } = await mediaSession();
    click(100, 50);
    await s.media.toggle(id, spec(s));
    expect(created).toEqual(["blob:m0"]);
    expect(f.made[0]!.video.src).toBe("blob:m0");
    expect(s.stage.dataset["media"]?.startsWith("video;lecture;")).toBe(true);
    s.dispose();
  });

  it("changement de page : lecteurs jetés, poster revenu (Review Focus 4)", async () => {
    const { s, f, id, click, page } = await mediaSession();
    click(100, 50);
    await s.media.toggle(id, spec(s));
    s.engine.addPage();
    expect(s.media.state(id)).toBeNull();
    expect(f.made[0]!.removed).toHaveBeenCalled();
    s.engine.showPage(page);
    click(100, 50);
    expect(s.stage.dataset["media"]?.startsWith("video;poster;")).toBe(true);
    s.dispose();
  });

  it("deactivate : tous en pause (H1-6)", async () => {
    const { s, f, id, click } = await mediaSession();
    click(100, 50);
    await s.media.toggle(id, spec(s));
    s.deactivate();
    expect(s.media.state(id)?.status).toBe("pause");
    expect(f.made[0]!.video.pause).toHaveBeenCalled();
    s.dispose();
  });

  it("suppression du média en lecture : lecteur jeté, data-media vide (Review Focus 3)", async () => {
    const { s, id, click } = await mediaSession();
    click(100, 50);
    await s.media.toggle(id, spec(s));
    s.engine.deleteElements([id]);
    expect(s.media.state(id)).toBeNull();
    expect(s.stage.dataset["media"]).toBe("");
    s.dispose();
  });

  it("annuler un réglage : le lecteur relit le volume (M23)", async () => {
    const { s, f, id, click } = await mediaSession();
    click(100, 50);
    await s.media.toggle(id, spec(s));
    s.engine.run({ type: "SetMedia", id, trimStart: 0, trimEnd: null, loop: false, volume: 0.5 });
    expect(f.made[0]!.video.volume).toBe(0.5);
    s.engine.undo();
    expect(f.made[0]!.video.volume).toBe(1);
    s.dispose();
  });

  it("vidéo liée : URL par shared.mediaUrl (S5)", async () => {
    const mediaUrl = vi.fn((p: string) => `asset://${p}`);
    const { s, f, id, click } = await mediaSession({ blob: false, linked: "/v/a.webm", extra: { mediaUrl } });
    click(100, 50);
    await s.media.toggle(id, spec(s));
    expect(mediaUrl).toHaveBeenCalledWith("/v/a.webm");
    expect(f.made.at(-1)!.video.src).toBe("asset:///v/a.webm");
    expect(created).toEqual([]);
    s.dispose();
  });

  it("dispose : lecteurs jetés, URL révoquée", async () => {
    const { s, f, id, click } = await mediaSession();
    click(100, 50);
    await s.media.toggle(id, spec(s));
    s.dispose();
    expect(revoked).toEqual(["blob:m0"]);
    expect(f.made[0]!.removed).toHaveBeenCalled();
  });

  it("média groupé : selectedMedia null", async () => {
    const { s, id, second, click } = await mediaSession({ second: true });
    s.engine.run({ type: "Group", ids: [id, second!] });
    click(100, 50);
    expect(s.engine.state().selection.length).toBeGreaterThan(0);
    expect(s.selectedMedia()).toBeNull();
    s.dispose();
  });

  it("image prête après un seek en pause : redessin (note de T5)", async () => {
    const { s, f, id, click } = await mediaSession();
    click(100, 50);
    await s.media.seek(id, 1, spec(s));
    const redraw = vi.spyOn(s.engine, "redraw");
    f.made[0]!.fire("seeked");
    expect(redraw).toHaveBeenCalled();
    s.dispose();
  });

  it("R8 : média lié introuvable, état echec dès la sélection, sans clic de lecture (M31)", async () => {
    const { s, f, click } = await mediaSession({ blob: false, linked: "/v/absent.webm", extra: { mediaUrl: (p) => `asset://${p}` } });
    click(100, 50);
    expect(s.stage.dataset["media"]?.startsWith("video;echec;")).toBe(false);
    f.made.at(-1)!.fire("error");
    expect(s.mediaState(s.selectedMedia()!.id)?.status).toBe("echec");
    expect(s.stage.dataset["media"]?.startsWith("video;echec;")).toBe(true);
    s.dispose();
  });

  it("R8 : un média lié en échec puis redéposé (octets reçus) n'est plus en echec", async () => {
    const { s, f, click, id, assets } = await mediaSession({ blob: false, linked: "/v/absent.webm", extra: { mediaUrl: (p) => `asset://${p}` } });
    click(100, 50);
    f.made.at(-1)!.fire("error");
    expect(s.mediaState(id)?.status).toBe("echec");
    assets.adopt(ASSET, new Blob([new Uint8Array([1, 2, 3, 4])], { type: "video/webm" }));
    expect(s.mediaState(id)?.status).not.toBe("echec");
    s.dispose();
  });
});

describe("session — objets 3D (C15)", () => {
  const MAIN = "ef".repeat(32);
  const SNAP = "12".repeat(32);
  const D_YAW = DEFAULT_MODEL3D_YAW;

  /** Vue 3D factice (aucun three) : `draw` rend un repère, `snapshot` passe par une porte quand on la tient. */
  function fakeView3d(webgl: boolean) {
    let ok = webgl;
    let lost: (() => void) | null = null;
    const image = { repere: "rendu partagé" } as unknown as CanvasImageSource;
    const loads: unknown[] = [];
    const released: unknown[] = [];
    const draws: PixelSize[] = [];
    const snaps: PixelSize[] = [];
    let hold: { open: Promise<void>; release: () => void } | null = null;
    const view: ModelView = {
      available: () => ok,
      load: async (src) => {
        loads.push(src);
        return { missing: [] };
      },
      draw: (_m, _v, px) => {
        draws.push(px);
        return ok ? image : null;
      },
      snapshot: async (_m, _v, px) => {
        snaps.push(px);
        if (hold !== null) await hold.open;
        return ok ? new Blob([new Uint8Array([137, 80, 78, 71, snaps.length])], { type: "image/png" }) : null;
      },
      release: (m) => void released.push(m),
      onLost: (cb) => {
        lost = cb;
        return () => {
          lost = null;
        };
      },
    };
    return {
      view, image, loads, released, draws, snaps,
      lose() {
        ok = false;
        lost?.();
      },
      /** Retient les instantanés jusqu'à l'appel rendu. */
      holdSnapshots(): () => void {
        let release!: () => void;
        const open = new Promise<void>((r) => {
          release = r;
        });
        hold = { open, release };
        return () => {
          hold = null;
          release();
        };
      },
    };
  }

  async function modelSession(o: { webgl?: boolean; matrix?: readonly number[]; yaw?: number; pitch?: number; snapshot?: boolean } = {}) {
    const fv = fakeView3d(o.webgl ?? true);
    const loader = { calls: 0 };
    const modelView = createModelViewLoader(async () => {
      loader.calls++;
      return fv.view;
    });
    const assets = createAssetStore();
    assets.adopt(MAIN, new Blob([new Uint8Array([103, 108, 84, 70])], { type: "model/gltf-binary" }));
    const snap = o.snapshot === false ? null : { id: SNAP, name: "chaise.glb.png", mime: "image/png", size: 4 };
    if (snap !== null) assets.adopt(SNAP, new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }));
    const s = await createBoardSession(fakeCore.blank(), { ...shared, modelView }, assets);
    Object.defineProperty(s.stage, "clientWidth", { configurable: true, value: 640 });
    Object.defineProperty(s.stage, "clientHeight", { configurable: true, value: 480 });
    s.activate();
    const page = s.engine.state().page;
    const id = s.engine.run({
      type: "AddModel3d", page, asset: { id: MAIN, name: "chaise.glb", mime: "model/gltf-binary", size: 4 }, format: "glb", files: [],
      w: 200, h: 100, yaw: o.yaw ?? DEFAULT_MODEL3D_YAW, pitch: o.pitch ?? DEFAULT_MODEL3D_PITCH, snapshot: snap,
      matrix: (o.matrix ?? [1, 0, 0, 1, 0, 0]) as never,
    })!.ids[0]!;
    const at = (px: number, py: number) => {
      const c = s.engine.camera();
      return { x: px * c.zoom + c.tx, y: py * c.zoom + c.ty };
    };
    const sample = (p: { x: number; y: number }, t: number) => ({ x: p.x, y: p.y, pressure: 0.5, tiltX: 0, tiltY: 0, t });
    const click = (px: number, py: number): void => {
      s.engine.setTool("select");
      s.engine.sink.begin(1, "select", [sample(at(px, py), 0)]);
      s.engine.sink.close(1, "end");
    };
    /** Glisser horizontal de `dx` px d'écran depuis (100, 50) ; `end` faux : laissé ouvert. */
    const drag = (dx: number, end = true, pointer = 2): void => {
      const p = at(100, 50);
      s.engine.sink.begin(pointer, "select", [sample(p, 0)]);
      s.engine.sink.extend(pointer, [sample({ x: p.x + dx, y: p.y }, 16)], []);
      if (end) s.engine.sink.close(pointer, "end");
    };
    const model = () => {
      const e = s.doc.element(id);
      return e !== null && e.kind === "model3d" ? e.model3d : null;
    };
    const tag = () => s.stage.dataset["model3d"];
    return { s, fv, loader, id, click, drag, model, tag, assets, page };
  }

  it("data-model3d vide sans objet 3D ; « glb;instantane;30;20 » sélectionné ; aucun chargement du rendu (X20, X36)", async () => {
    const { s, fv, loader, id, click, tag } = await modelSession();
    expect(tag()).toBe("");
    expect(s.selectedModel3d()).toBeNull();
    click(100, 50);
    expect(s.selectedModel3d()?.id).toBe(id);
    expect(tag()).toBe("glb;instantane;30;20");
    expect(s.modelState(id)).toBe("instantane");
    await Promise.resolve();
    expect(loader.calls).toBe(0);
    expect(fv.loads).toHaveLength(0);
    expect(s.models.current()).toBeNull();
    s.dispose();
  });

  it("toggleOrbit : orbite, le port rend l'image ; Tourner à nouveau : instantane, modèle libéré", async () => {
    const { s, fv, id, click, tag } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    expect(tag()).toBe("glb;orbite;30;20");
    expect(s.models.current()).toBe(id);
    expect(s.models.frames.frame(id)).toBe(fv.image);
    await s.toggleOrbit();
    expect(tag()).toBe("glb;instantane;30;20");
    expect(fv.released).toHaveLength(1);
    expect(s.models.frames.frame(id)).toBeNull();
    s.dispose();
  });

  it("un seul aspect : rendu vivant et instantané au ratio de la boîte à l'écran après un étirement non uniforme", async () => {
    const { s, fv, click, drag, model } = await modelSession({ matrix: [2, 0, 0, 1, 0, 0] });
    click(100, 50);
    await s.toggleOrbit();
    s.models.frames.frame(s.models.current()!);
    const live = fv.draws[fv.draws.length - 1]!;
    expect(live.w / live.h).toBeCloseTo(4, 1);
    drag(100);
    await vi.waitFor(() => expect(model()!.snapshot).not.toBe(SNAP));
    expect(fv.snaps[0]).toEqual(snapshotSize(400, 100));
    expect(fv.snaps[0]!.w / fv.snaps[0]!.h).toBeCloseTo(live.w / live.h, 1);
    s.dispose();
  });

  it("contexte perdu pendant l'orbite : orbite fermée, le glisser ne tourne plus l'objet", async () => {
    const { s, fv, click, drag, model, tag } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    fv.lose();
    expect(tag()).toBe("glb;sans-webgl;30;20");
    drag(100);
    expect(tag()).toBe("glb;sans-webgl;30;20");
    await Promise.resolve();
    expect(model()!.yaw).toBe(D_YAW);
    s.dispose();
  });

  it("second glissé rapide : l'écriture du premier ne ferme pas l'orbite", async () => {
    const { s, click, drag, model, tag } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    drag(100);
    drag(50, false, 3);
    await vi.waitFor(() => expect(model()!.yaw).toBeCloseTo(D_YAW + 1, 6));
    expect(tag()).toBe("glb;orbite;116;20");
    s.engine.sink.close(3, "end");
    await vi.waitFor(() => expect(model()!.yaw).toBeCloseTo(D_YAW + 1.5, 6));
    expect(tag()).toBe("glb;orbite;116;20");
    s.dispose();
  });

  it("sans WebGL : sans-webgl après le premier Tourner, aucune séance (S5, PC4)", async () => {
    const { s, fv, loader, id, click, tag } = await modelSession({ webgl: false });
    click(100, 50);
    expect(tag()).toBe("glb;instantane;30;20");
    expect(loader.calls).toBe(0);
    await s.toggleOrbit();
    expect(tag()).toBe("glb;sans-webgl;30;20");
    expect(s.modelState(id)).toBe("sans-webgl");
    expect(s.models.current()).toBeNull();
    expect(fv.loads).toHaveLength(0);
    s.dispose();
  });

  it("Vue initiale sans séance : vue par défaut et instantané en une étape ; déjà à la vue par défaut avec instantané : aucune étape", async () => {
    const turned = await modelSession({ yaw: 1.5, pitch: 0.3 });
    turned.click(100, 50);
    const v0 = turned.s.engine.state().version;
    await turned.s.resetModelView();
    expect(turned.model()!.yaw).toBe(DEFAULT_MODEL3D_YAW);
    expect(turned.model()!.pitch).toBe(DEFAULT_MODEL3D_PITCH);
    expect(turned.model()!.snapshot).not.toBe(SNAP);
    expect(turned.model()!.snapshot).not.toBeNull();
    expect(turned.s.engine.state().version).toBe(v0 + 1);
    expect(turned.s.models.current()).toBeNull();
    turned.s.dispose();
    const plain = await modelSession();
    plain.click(100, 50);
    const v1 = plain.s.engine.state().version;
    await plain.s.resetModelView();
    expect(plain.s.engine.state().version).toBe(v1);
    expect(plain.loader.calls).toBe(0);
    plain.s.dispose();
  });

  it("orbite validée : instantané puis SetModel3dView en une étape ; annuler : ancienne vue et ancien instantané, séance fermée (S2)", async () => {
    const { s, fv, click, drag, model, tag } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    const v0 = s.engine.state().version;
    drag(100, false);
    expect(tag()).toBe("glb;orbite;87;20");
    expect(model()!.yaw).toBe(D_YAW);
    s.engine.sink.close(2, "end");
    await vi.waitFor(() => expect(model()!.yaw).toBeCloseTo(D_YAW + 1, 6));
    expect(fv.snaps).toHaveLength(1);
    expect(model()!.snapshot).not.toBe(SNAP);
    expect(s.engine.state().version).toBe(v0 + 1);
    expect(tag()).toBe("glb;orbite;87;20");
    s.engine.undo();
    expect(model()!.yaw).toBe(D_YAW);
    expect(model()!.snapshot).toBe(SNAP);
    expect(s.models.current()).toBeNull();
    expect(tag()).toBe("glb;instantane;30;20");
    s.dispose();
  });

  it("C2 : Ctrl+Z pendant l'instantané du second glissé : le second n'est pas écrit, le rétablissement reste possible", async () => {
    const { s, fv, click, drag, model } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    drag(100); // v1 écrit
    await vi.waitFor(() => expect(model()!.yaw).toBeCloseTo(D_YAW + 1, 6));
    const free = fv.holdSnapshots();
    drag(50, true, 3); // v2 : instantané retenu
    await vi.waitFor(() => expect(fv.snaps).toHaveLength(2));
    s.engine.undo(); // annule v1 ; l'orbite tombe
    expect(model()!.yaw).toBe(D_YAW);
    expect(s.engine.state().canRedo).toBe(true);
    free();
    await new Promise((r) => setTimeout(r, 20));
    expect(model()!.yaw).toBe(D_YAW);
    expect(s.engine.state().canRedo).toBe(true);
    s.engine.redo();
    expect(model()!.yaw).toBeCloseTo(D_YAW + 1, 6);
    s.dispose();
  });

  it("mineur C15 (C2) : un autre élément change pendant l'instantané : l'orbite est quand même écrite", async () => {
    const { s, fv, click, drag, model } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    const free = fv.holdSnapshots();
    drag(100); // instantané retenu
    await vi.waitFor(() => expect(fv.snaps).toHaveLength(1));
    const page = s.engine.state().page;
    s.engine.run({ type: "AddShape", page, shape: "rect", x0: 300, y0: 300, x1: 350, y1: 350, style: { color: "#000000", width: 4 }, fill: null });
    free();
    await vi.waitFor(() => expect(model()!.yaw).toBeCloseTo(D_YAW + 1, 6));
    s.dispose();
  });

  it("mineur C15 (C2, relecture) : Ctrl+Z d'un autre élément pendant l'instantané : l'orbite n'est pas écrite, le rétablissement reste possible", async () => {
    const { s, fv, click, drag, model } = await modelSession();
    const page = s.engine.state().page;
    s.engine.run({ type: "AddShape", page, shape: "rect", x0: 300, y0: 300, x1: 350, y1: 350, style: { color: "#000000", width: 4 }, fill: null });
    click(100, 50);
    await s.toggleOrbit();
    const free = fv.holdSnapshots();
    drag(100); // instantané retenu
    await vi.waitFor(() => expect(fv.snaps).toHaveLength(1));
    s.engine.undo(); // annule le rectangle, pas l'orbite
    expect(s.engine.state().canRedo).toBe(true);
    free();
    await new Promise((r) => setTimeout(r, 20));
    expect(model()!.yaw).toBe(D_YAW);
    expect(s.engine.state().canRedo).toBe(true);
    s.dispose();
  });

  it("mineur C15 (C2, contre-relecture) : deux relâchés, le premier écrit, Ctrl+Z puis une autre action pendant l'instantané du second : le second n'est pas écrit", async () => {
    const { s, fv, click, drag, model } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    const free1 = fv.holdSnapshots();
    drag(100); // R1 : instantané retenu
    const free2 = fv.holdSnapshots();
    drag(50, true, 3); // R2 : même état de départ que R1
    await vi.waitFor(() => expect(fv.snaps).toHaveLength(2));
    free1();
    await vi.waitFor(() => expect(model()!.yaw).toBeCloseTo(D_YAW + 1, 6));
    s.engine.undo(); // l'objet revient à son état de départ
    const page = s.engine.state().page;
    s.engine.run({ type: "AddShape", page, shape: "rect", x0: 300, y0: 300, x1: 350, y1: 350, style: { color: "#000000", width: 4 }, fill: null });
    free2();
    await new Promise((r) => setTimeout(r, 20));
    expect(model()!.yaw).toBe(D_YAW);
    s.dispose();
  });

  it("C2 : deux relâchés puis un clic à côté : écritures dans l'ordre des relâchés, la dernière vue gagne (S2)", async () => {
    const { s, fv, click, drag, model, tag } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    const v0 = s.engine.state().version;
    const free1 = fv.holdSnapshots();
    drag(100); // v1 : instantané retenu
    fv.holdSnapshots()(); // v2 : instantané immédiat
    drag(50, true, 3);
    await vi.waitFor(() => expect(fv.snaps).toHaveLength(2));
    const c = s.engine.camera();
    s.engine.sink.begin(4, "select", [{ x: 400 * c.zoom + c.tx, y: 300 * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(4, "end"); // clic à côté : orbite fermée, désélection
    expect(tag()).toBe("");
    await new Promise((r) => setTimeout(r, 20));
    free1();
    await vi.waitFor(() => expect(s.engine.state().version).toBe(v0 + 2));
    expect(model()!.yaw).toBeCloseTo(D_YAW + 1.5, 6);
    s.engine.undo();
    expect(model()!.yaw).toBeCloseTo(D_YAW + 1, 6);
    s.dispose();
  });

  it("commit après suppression : aucune commande, séance fermée", async () => {
    const { s, fv, id, click, drag } = await modelSession();
    click(100, 50);
    await s.toggleOrbit();
    const free = fv.holdSnapshots();
    const run = vi.spyOn(s.engine, "run");
    drag(100);
    await vi.waitFor(() => expect(fv.snaps).toHaveLength(1));
    s.engine.deleteElements([id]);
    expect(s.models.current()).toBeNull();
    free();
    await new Promise((r) => setTimeout(r, 20));
    expect(run.mock.calls.filter(([c]) => c.type === "SetModel3dView")).toHaveLength(0);
    expect(s.doc.element(id)).toBeNull();
    s.dispose();
  });

  it("changement de sélection, de page, deactivate : séance fermée (X23)", async () => {
    const { s, fv, click, page, tag } = await modelSession();
    const other = s.engine.run({
      type: "AddModel3d", page, asset: { id: MAIN, name: "chaise.glb", mime: "model/gltf-binary", size: 4 }, format: "glb", files: [],
      w: 50, h: 50, yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH, snapshot: null, matrix: [1, 0, 0, 1, 400, 300] as never,
    })!.ids[0]!;
    click(100, 50);
    await s.toggleOrbit();
    s.engine.deleteElements([other]); // la sélection tombe, l'objet de l'orbite reste
    expect(s.selectedModel3d()).toBeNull();
    expect(s.models.current()).toBeNull();
    expect(fv.released).toHaveLength(1);
    s.engine.undo();
    click(100, 50);
    await s.toggleOrbit();
    await s.toggleOrbit();
    s.engine.addPage();
    expect(s.models.current()).toBeNull();
    expect(fv.released).toHaveLength(2);
    s.engine.showPage(page);
    click(100, 50);
    await s.toggleOrbit();
    expect(tag()).toBe("glb;orbite;30;20");
    s.deactivate();
    expect(s.models.current()).toBeNull();
    expect(fv.released).toHaveLength(3);
    s.dispose();
  });
});

describe("session — pot sur image (C6b, B13, B21)", () => {
  const ORIGINAL = "cd".repeat(32);
  const NEW = "ef".repeat(32);
  /** Image 10 × 10 en (0, 0) ; magasin à empreinte fixe ; Worker factice qui garde les messages. */
  async function setup(withPixels = true, hash: () => Promise<string> = async () => NEW) {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 10, height: 10, close: vi.fn() })));
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    const el = doc.apply({ type: "AddImage", page, asset: { id: ORIGINAL, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    const assets = createAssetStore(hash);
    assets.adopt(ORIGINAL, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    const decode = vi.fn(async (_b: Blob) => ({ width: 10, height: 10, close: vi.fn() }) as unknown as ImageBitmap);
    const posted: { id: number; type?: string }[] = [];
    const workers: WorkerLike[] = [];
    const spawn = (): WorkerLike => {
      const w: WorkerLike = { onmessage: null, onerror: null, postMessage: (m) => void posted.push(m as { id: number; type?: string }), terminate: vi.fn() };
      workers.push(w);
      return w;
    };
    const { pixels: _none, ...base } = { ...shared, decode };
    const s = await createBoardSession(doc, withPixels ? { ...base, pixels: spawn } : base, assets);
    s.activate();
    const click = (x: number, y: number): void => {
      const c = s.engine.camera();
      const sample = { x: x * c.zoom + c.tx, y: y * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 };
      s.engine.sink.begin(9, "fill", [sample]);
      s.engine.sink.close(9, "end");
    };
    s.engine.setFillColor("#facc15");
    s.engine.setTool("fill");
    const reply = (data: Record<string, unknown>): void => {
      const m = posted.find((x) => x.type === "fill");
      workers[0]?.onmessage?.({ data: { id: m?.id, ...data } });
    };
    return { s, doc, page, el, posted, click, reply };
  }

  it("pot sur une image : data-pot attente puis pret ; nouvel asset et sourceAsset écrits, fond de la page inchangé", async () => {
    const { s, doc, page, el, posted, click, reply } = await setup();
    try {
      const bg = doc.page(page)?.background;
      click(5, 5);
      await vi.waitFor(() => expect(posted.some((m) => m.type === "fill")).toBe(true), { timeout: 5000 });
      expect(s.stage.dataset["pot"]).toBe("attente");
      const out = { width: 10, height: 10, close: vi.fn() };
      reply({ changed: 4, png: new Blob([new Uint8Array([9])], { type: "image/png" }), bitmap: out });
      await vi.waitFor(() => expect(s.stage.dataset["pot"]).toBe("pret"), { timeout: 5000 });
      const e = doc.element(el);
      expect(e?.kind === "image" ? [e.image.asset, e.image.sourceAsset] : null).toEqual([NEW, ORIGINAL]);
      expect(doc.page(page)?.background).toBe(bg);
      expect(out.close).not.toHaveBeenCalled();
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("S5 c (session) : trait, pot sur l'image, Ctrl+Z pendant le calcul : trait annulé, rien d'écrit, data-pot=abandon, bitmap fermé ; Ctrl+Y rend le trait", async () => {
    const { s, doc, page, el, posted, click, reply } = await setup();
    try {
      s.engine.run({ type: "CommitStroke", page, points: new Float32Array([50, 50, 0.5, 80, 50, 0.5]), style: { color: "#000000", width: 4 } });
      expect(doc.elementIds(page)).toHaveLength(2);
      click(5, 5);
      await vi.waitFor(() => expect(posted.some((m) => m.type === "fill")).toBe(true), { timeout: 5000 });
      s.engine.undo();
      const out = { width: 10, height: 10, close: vi.fn() };
      reply({ changed: 4, png: new Blob([new Uint8Array([9])], { type: "image/png" }), bitmap: out });
      await vi.waitFor(() => expect(s.stage.dataset["pot"]).toBe("abandon"), { timeout: 5000 });
      expect(out.close).toHaveBeenCalledTimes(1);
      expect(doc.elementIds(page)).toEqual([el]);
      const e = doc.element(el);
      expect(e?.kind === "image" ? e.image.asset : null).toBe(ORIGINAL);
      expect(s.engine.state().error).toBe(FILL_ABANDONED_MESSAGE);
      s.engine.redo();
      expect(doc.elementIds(page)).toHaveLength(2);
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
  /** Accès au document à partir de maintenant (le vrai cœur lève sur un document libéré) ; OE23 : listes d'ids comprises. */
  const watchDoc = (doc: ReturnType<typeof fakeCore.blank>) => {
    const spies = [vi.spyOn(doc, "version"), vi.spyOn(doc, "element"), vi.spyOn(doc, "apply"), vi.spyOn(doc, "elementIds"), vi.spyOn(doc, "elementIdsOfKind")];
    return {
      reset: (): void => spies.forEach((x) => x.mockClear()),
      counts: (): number[] => spies.map((x) => x.mock.calls.length),
    };
  };

  it("RF4 (session) : onglet fermé pendant un calcul, un clic en file : ni message ni accès au document libéré, data-pot reste attente", async () => {
    const { s, doc, posted, click } = await setup();
    try {
      click(5, 5);
      await vi.waitFor(() => expect(posted.some((m) => m.type === "fill")).toBe(true), { timeout: 5000 });
      click(6, 6); // en file derrière le calcul : il lirait le document au départ de son calcul
      const error = s.engine.state().error;
      const access = watchDoc(doc);
      s.dispose();
      access.reset();
      await tick();
      await tick();
      expect(access.counts()).toEqual([0, 0, 0, 0, 0]);
      expect(s.stage.dataset["pot"]).toBe("attente");
      expect(s.engine.state().error).toBe(error);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("RF4 (session) : onglet fermé pendant l'enregistrement du PNG : bitmap fermé, rien d'écrit, document libéré jamais relu", async () => {
    let release!: () => void;
    const hash = vi.fn(() => new Promise<string>((r) => (release = () => r(NEW))));
    const { s, doc, posted, click, reply } = await setup(true, hash);
    try {
      click(5, 5);
      await vi.waitFor(() => expect(posted.some((m) => m.type === "fill")).toBe(true), { timeout: 5000 });
      const out = { width: 10, height: 10, close: vi.fn() };
      reply({ changed: 4, png: new Blob([new Uint8Array([9])], { type: "image/png" }), bitmap: out });
      await vi.waitFor(() => expect(hash).toHaveBeenCalled(), { timeout: 5000 });
      const access = watchDoc(doc);
      s.dispose();
      access.reset();
      release();
      await tick();
      await tick();
      expect(out.close).toHaveBeenCalledTimes(1);
      expect(access.counts()).toEqual([0, 0, 0, 0, 0]);
      expect(s.stage.dataset["pot"]).toBe("attente");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("S5 e (session) : aucun Worker de pixels : data-pot=echec, message dans l'état, aucune étape", async () => {
    const { s, doc, click } = await setup(false);
    try {
      const v = doc.version();
      click(5, 5);
      await vi.waitFor(() => expect(s.stage.dataset["pot"]).toBe("echec"), { timeout: 5000 });
      expect(s.engine.state().error).toBe(fillFailure(FILL_NO_RUNNER));
      expect(doc.version()).toBe(v);
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("session : style courant (OG11 T9)", () => {
  it("session : style courant passé au moteur, et chaque changement rendu à shared.onItemStyle", async () => {
    const dashed = { ...DEFAULT_ITEM_STYLE, strokeStyle: "dashed" as const };
    const seen: ItemStyle[] = [];
    const s = await createBoardSession(fakeCore.blank(), { ...shared, itemStyle: () => dashed, onItemStyle: (st) => seen.push(st) });
    expect(s.engine.itemStyle().strokeStyle).toBe("dashed");
    s.engine.setItemStyle({ opacity: 40 });
    expect(seen[seen.length - 1]).toMatchObject({ strokeStyle: "dashed", opacity: 40 });
  });
  it("session : style courant absent ou illisible (null) : style par défaut", async () => {
    const s = await createBoardSession(fakeCore.blank(), { ...shared, itemStyle: () => null });
    expect(s.engine.itemStyle()).toEqual(DEFAULT_ITEM_STYLE);
  });
});
