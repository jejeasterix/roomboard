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
    return { s, f, id, second, click, page };
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
});
