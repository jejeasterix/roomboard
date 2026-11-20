// @vitest-environment happy-dom
/**
 * Session d'un onglet (T93, CL5b-1, CL5b-2) : une scène, deux canvas, un moteur, une zone de texte par onglet ; un
 * seul jeu d'ids dans la page (celui de la session active) ; `dispose` rend le contexte WebGL2 et vide le DOM.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Camera } from "../engine/camera";
import { fakeCore } from "../core/fake-core";
import { detectSupport } from "../engine/input/support";
import { FakeGL } from "../engine/render/fake-gl";
import { createSettingsStore, echelonsTag, parseSettings, type ParsedSettings } from "../engine/settings";
import { stageTags } from "./barre";
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

let container: HTMLDivElement;
let shared: SessionShared;
let restore: () => void = () => undefined;

function sharedWith(parsed: ParsedSettings): SessionShared {
  return {
    container,
    settings: createSettingsStore(parsed.settings),
    parsed,
    support: detectSupport(),
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
    expect(on.container.querySelector("textarea")).toBeNull();
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
});
