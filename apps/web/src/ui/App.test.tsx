// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BoardSession } from "../app/board-session";
import { createTabs } from "../app/tabs";
import type { TabSession, Workspace } from "../app/workspace";
import { createResourceLibrary, type ResourceLibrary } from "../app/library";
import { createMemoryLibraryFiles } from "../platform/library-files";
import { createMyBackgrounds, probeImage } from "../app/my-backgrounds";
import { fakeCore } from "../core/fake-core";
import { createAssetStore } from "../core/asset-store";
import type { EngineState } from "../engine/engine";
import { createSettingsStore, parseSettings } from "../engine/settings";
import type { FileController } from "../platform/controller";
import type { ShellPort } from "../platform/files";
import type { ProfileFiles } from "../platform/profile-files";
import { createProfileStore, type KeyValue } from "../profile-store";
import type { RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { setDock } from "../profile-edit";
import { createActiveProfile } from "./active-profile";
import { App, showStartError, type AnnotationUi, type AppProps } from "./App";
import type { AnnotationControl, AnnotationState } from "../platform/annotation-port";
import { createDeviceSettings } from "../device-settings";
import { sentToBoardToast } from "../platform/annotation-port";
import { clearToast, showToast } from "./toast";
import type { ToolbarView } from "./item-state";
import { parseProfile, type Profile, type Toolbar as Bar } from "../toolbar";
import { layoutFor } from "./layout";

// Lus sur le disque : sous vitest, un import `?raw` de CSS rend une chaîne vide.
const CSS = readFileSync(join(__dirname, "rb.css"), "utf8");
const INDEX_HTML = readFileSync(join(__dirname, "../../index.html"), "utf8");
const CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
/** design-l4 (L4-22) : `DEFAULT_PROFILE_JSON` d'origin/main @ 136cbbb, tel quel (aucune barre `annotation`). */
const BEFORE_L4: Record<string, unknown> = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "profils", "defaut-avant-l4.rbprofile"), "utf8"));
/** Copie de `defaut` faite avant L4, id `id`. */
function beforeL4Copy(id: string): Profile {
  const r = parseProfile({ ...BEFORE_L4, id, label: `Copie ${id}` });
  if ("errors" in r) throw new Error(r.errors.join("; "));
  return r.profile;
}
const barIds = (c: HTMLElement): (string | null)[] => [...c.querySelectorAll("[data-toolbar]")].map((b) => b.getAttribute("data-toolbar"));

function baseState(over: Partial<Record<string, unknown>> = {}): EngineState {
  return {
    tool: "pen",
    eraserMode: "partial",
    canUndo: false,
    canRedo: false,
    page: "p",
    pageIndex: 0,
    pageCount: 1,
    selection: [],
    selectionBounds: null,
    selectionUnits: 0,
    selectionGrouped: false,
    elementCount: 0,
    version: 0,
    error: null,
    ...over,
  } as unknown as EngineState;
}

interface FakeTab {
  readonly session: TabSession;
  readonly emit: (s: Partial<Record<string, unknown>>) => void;
  readonly run: ReturnType<typeof vi.fn>;
  readonly engine: Record<string, ReturnType<typeof vi.fn>>;
  readonly setDirty: (d: boolean) => void;
  readonly media: { toggle: ReturnType<typeof vi.fn>; seek: ReturnType<typeof vi.fn> };
  /** Pose le média « sélectionné » du faux onglet et prévient l'application (état et lecteurs). */
  readonly showMedia: (m: unknown, status?: string) => void;
  /** C15 : pose l'objet 3D « sélectionné » du faux onglet et son état, puis prévient l'application. */
  readonly showModel3d: (m: unknown, status?: string) => void;
  readonly model3d: { toggleOrbit: ReturnType<typeof vi.fn>; resetModelView: ReturnType<typeof vi.fn> };
}

function fakeTab(name: string, over: Partial<Record<string, unknown>> = {}): FakeTab {
  let state = baseState(over);
  const listeners = new Set<(s: EngineState) => void>();
  const engine = {
    state: vi.fn(() => state),
    onState: vi.fn((cb: (s: EngineState) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
    setTool: vi.fn(),
    setEraserMode: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    addPage: vi.fn(),
    removePage: vi.fn(),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    fitPage: vi.fn(),
    setPenStyle: vi.fn(),
    showPage: vi.fn(() => true),
    setPageMode: vi.fn(() => true),
    movePage: vi.fn(() => true),
    duplicatePage: vi.fn(() => true),
    releaseKeys: vi.fn(),
    previewGrid: vi.fn(),
    endGridPreview: vi.fn(),
    run: vi.fn(() => ({ pages: ["p"], ids: [], removed: [], full: false, version: 1 })),
  };
  const mediaListeners = new Set<() => void>();
  const media = {
    onChange: vi.fn((cb: () => void) => {
      mediaListeners.add(cb);
      return () => mediaListeners.delete(cb);
    }),
    toggle: vi.fn(async () => undefined),
    seek: vi.fn(async () => undefined),
  };
  const mediaView: { current: unknown; status: string } = { current: null, status: "poster" };
  const modelView: { current: unknown; status: string } = { current: null, status: "instantane" };
  const model3d = { toggleOrbit: vi.fn(async () => undefined), resetModelView: vi.fn(async () => undefined) };
  let dirty = false;
  const dirtyListeners = new Set<() => void>();
  const run = vi.fn();
  const files = {
    run,
    name: () => name,
    isDirty: () => dirty,
    onChange: (cb: () => void) => {
      dirtyListeners.add(cb);
      return () => dirtyListeners.delete(cb);
    },
  } as unknown as FileController;
  const stage = document.createElement("div");
  stage.className = "rb-stage";
  const board = {
    engine,
    stage,
    doc: {
      pageIds: () => ["p1", "p2", "p3"],
      page: (id: string) => ({ id, width: 1920, height: 1080, background: "#ffffff", backdrop: null, grid: null }),
      asset: (id: string) => (id === "ef".repeat(32) ? { id, name: "chaise.glb", mime: "model/gltf-binary", size: 4 } : null),
    },
    media,
    selectedModel3d: () => modelView.current,
    modelState: () => modelView.status,
    toggleOrbit: model3d.toggleOrbit,
    resetModelView: model3d.resetModelView,
    selectedMedia: () => mediaView.current,
    mediaState: () => ({ status: mediaView.status, time: 0 }),
    choice: { note: null, diagnostics: () => ({ webgl: "off", lost: false, badColors: [] }) },
    effective: () => ({ prediction: false, inkTrail: "off", webgl: "off" }),
    activate: vi.fn(),
    deactivate: vi.fn(),
    dispose: vi.fn(),
  } as unknown as BoardSession;
  return {
    session: { board, files, assets: createAssetStore() },
    emit(s) {
      state = baseState({ ...(state as unknown as Record<string, unknown>), ...s });
      for (const cb of listeners) cb(state);
    },
    run,
    engine,
    media,
    showMedia(m, status = "poster") {
      mediaView.current = m;
      mediaView.status = status;
      for (const cb of mediaListeners) cb();
      state = baseState({ ...(state as unknown as Record<string, unknown>), version: Number((state as unknown as { version: number }).version) + 1 });
      for (const cb of listeners) cb(state);
    },
    model3d,
    showModel3d(m, status = "instantane") {
      modelView.current = m;
      modelView.status = status;
      state = baseState({ ...(state as unknown as Record<string, unknown>), version: Number((state as unknown as { version: number }).version) + 1 });
      for (const cb of listeners) cb(state);
    },
    setDirty(d) {
      dirty = d;
      for (const cb of dirtyListeners) cb();
    },
  };
}

function fakeWorkspace(first: FakeTab): Workspace {
  let n = 0;
  const tabs = createTabs<TabSession>(() => `t${++n}`);
  tabs.add("board", first.session, true);
  return {
    tabs,
    active: () => tabs.active()!.session,
    openDocument: vi.fn(async () => true),
    newBlank: vi.fn(async () => undefined),
    close: vi.fn(async () => true),
    importFiles: vi.fn(async () => ({ opened: [], rejected: [] })),
    hasSelection: () => false,
    copySelection: vi.fn(async () => undefined),
    pasteItems: vi.fn(async () => true),
    pasteInternal: vi.fn(async () => false),
    exportSelection: vi.fn(async () => false),
    insertPages: vi.fn(async () => false),
    pageThumb: vi.fn(async () => null),
    openPdf: vi.fn(async () => true),
    exportPdf: vi.fn(async () => false),
    selection: vi.fn(),
    insertResource: vi.fn(async () => "inserted"),
    captureResource: vi.fn(async () => null),
    ask: vi.fn(async () => true),
    say: vi.fn(async () => undefined),
    setDropDiverter: vi.fn(),
    pickFiles: vi.fn(async () => []),
    canPaste: () => false,
    onClipboard: () => () => undefined,
    anyDirty: () => false,
    key: vi.fn(() => false),
    quitRequested: vi.fn(async () => undefined),
    dispose: vi.fn(),
  } as unknown as Workspace;
}

const shell = { confirm: vi.fn(async () => true), notify: vi.fn(async () => undefined) } as unknown as ShellPort;
let disposers: (() => void)[] = [];

function fakeFiles(picks: ({ name: string; text: string } | null)[] = []) {
  return {
    pick: vi.fn(async () => picks.shift() ?? null),
    save: vi.fn(async (_name: string, _text: string) => true),
  } satisfies ProfileFiles;
}

function renderApp(opts: { tab?: FakeTab; profile?: string; caps?: RuntimeCapabilities; files?: ReturnType<typeof fakeFiles>; kv?: KeyValue; library?: AppProps["library"]; annotation?: AnnotationUi; device?: AppProps["device"]; backgrounds?: AppProps["backgrounds"]; sidebar?: AppProps["sidebar"] } = {}) {
  const tab = opts.tab ?? fakeTab("Sans titre.roomboard");
  const workspace = fakeWorkspace(tab);
  const store = createProfileStore(opts.kv ?? null, BUILTIN_PROFILES);
  if (opts.profile) store.setActive(opts.profile);
  const active = createActiveProfile(store, opts.caps ?? CAPS);
  const files = opts.files ?? fakeFiles();
  const settings = createSettingsStore(parseSettings("").settings);
  const navigate = vi.fn();
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  const container = document.createElement("div");
  document.body.append(container);
  const stages = document.createElement("main");
  stages.className = "rb-stages";
  const dispose = render(
    () => (
      <App
        workspace={workspace}
        active={active}
        store={store}
        settings={settings}
        notes={["note de démarrage"]}
        shell={shell}
        profileFiles={files}
        stages={stages}
        navigate={navigate}
        {...(opts.library ? { library: opts.library } : {})}
        {...(opts.annotation ? { annotation: opts.annotation } : {})}
        {...(opts.device ? { device: opts.device } : {})}
        {...(opts.backgrounds ? { backgrounds: opts.backgrounds } : {})}
        {...(opts.sidebar ? { sidebar: opts.sidebar } : {})}
      />
    ),
    container,
  );
  disposers.push(() => {
    dispose();
    container.remove();
    style.remove();
  });
  return { container, workspace, tab, store, active, settings, navigate, files };
}

/** `activateOnEnter` faux : `enter` ne change pas l'état (la barre reste celle du tableau, menu Profil utilisable). */
function fakeAnnotationUi(start = false, activateOnEnter = true) {
  let st: AnnotationState = { active: start, pointer: "draw", screen: null, screens: 1 };
  const cbs = new Set<() => void>();
  const views = new Set<(v: ToolbarView) => void>();
  const remoteCalls: string[] = [];
  const set = (n: Partial<AnnotationState>) => {
    st = { ...st, ...n };
    for (const cb of [...cbs]) cb();
  };
  const control: AnnotationControl = {
    state: () => st,
    enter: vi.fn(async () => (activateOnEnter ? set({ active: true }) : undefined)),
    exit: vi.fn(async () => set({ active: false })),
    close: vi.fn(async () => true),
    toggle: vi.fn(async () => undefined),
    pointer: vi.fn(async () => undefined),
    nextScreen: vi.fn(async () => undefined),
    freeze: vi.fn(async () => undefined),
    send: vi.fn(async () => undefined),
    onTool: vi.fn(),
    command: vi.fn(),
    sendProfile: vi.fn(),
    dropOnZone: vi.fn(async () => undefined),
    onChange: (cb) => {
      cbs.add(cb);
      return () => {
        cbs.delete(cb);
      };
    },
  };
  const ui: AnnotationUi = {
    control,
    remote: (local) => ({ ...local, setTool: (tool) => void remoteCalls.push(`setTool ${tool}`) }),
    onView: (cb) => {
      views.add(cb);
      return () => {
        views.delete(cb);
      };
    },
  };
  return { ui, control, remoteCalls, set, view: (v: ToolbarView) => { for (const cb of [...views]) cb(v); } };
}

/** Copie de `defaut` faite avant C11a (aucun élément C11a), id « ma-copie ». */
function oldCopy(): Profile {
  const NEW = ["desktop-annotation", "annotation-pointer", "annotation-screen", "depot-annotation"];
  const json = structuredClone(BEFORE_L4) as { toolbars: { groups: { items: { id: string }[] }[] }[] };
  for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => !NEW.includes(i.id));
  const r = parseProfile({ ...json, id: "ma-copie", label: "Ma copie" });
  if ("errors" in r) throw new Error(r.errors.join("; "));
  return r.profile;
}

const click = (el: Element | null): void => {
  expect(el).not.toBeNull();
  (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

/** Noms des cases de la grille (`grid-template-areas`). */
const areaNames = (areas: string): Set<string> => new Set(areas.match(/[A-Za-z0-9_-]+/g) ?? []);

afterEach(() => {
  for (const d of disposers) d();
  disposers = [];
  document.body.innerHTML = "";
});

describe("App (T95)", () => {
  it("personnalisation-1b (Q28) : le bouton Fonds et Ctrl+Maj+F ouvrent la fenêtre des fonds, Ctrl+Maj+F la referme", async () => {
    const mine = createMyBackgrounds(createMemoryLibraryFiles("backgrounds"), { now: () => "n", probe: probeImage, thumbnail: async () => null });
    const backgrounds = {
      mine, core: fakeCore, makeAssets: () => createAssetStore(), files: { read: async () => new Blob() }, now: () => new Date(2026, 10, 27),
      thumbs: {} as never, loadPack: async () => [],
    } as AppProps["backgrounds"];
    const { container } = renderApp({ backgrounds });
    const dialog = (): Element | null => document.querySelector('[data-panel="backgrounds"]');
    expect(dialog()).toBeNull();
    click(container.querySelector('button[data-item="backgrounds"]'));
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    const chord = new KeyboardEvent("keydown", { key: "F", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(chord);
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(chord.defaultPrevented).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "F", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
  });

  it("C4 : le bouton Bibliothèque ouvre le panneau, calé en popover", async () => {
    const library: ResourceLibrary = createResourceLibrary({
      files: [createMemoryLibraryFiles("mine")],
      zip: { unzip: async () => [], zip: async () => new Uint8Array() },
      now: () => "n",
      appVersion: "t",
    });
    const shared = { desktop: false, chosen: () => false, choose: async () => false };
    const { container } = renderApp({ library: { library, shared, packs: { pick: async () => null, save: async () => true } } });
    click(container.querySelector('button[data-item="library"]'));
    await vi.waitFor(() => expect(container.querySelector('.rb-popover[data-panel="library"] #bibliotheque')).not.toBeNull());
  });

  it("App : Exporter en PDF (C12) — le bouton de la barre des pages appelle workspace.exportPdf", () => {
    const { container, workspace } = renderApp();
    click(container.querySelector('button[data-item="export-pdf"]'));
    expect(workspace.exportPdf).toHaveBeenCalledTimes(1);
  });

  it("inventaire : chaque bouton de l'ancienne barre a son élément", () => {
    const { container } = renderApp();
    for (const id of ["pen", "eraser", "hand", "eraser-mode", "undo", "redo", "select", "rect", "ellipse", "line", "arrow", "text",
      "page-prev", "page-next", "page-add", "page-remove", "file-new", "file-open", "file-save", "file-save-as", "fit-page", "settings", "profiles", "grid"]) {
      expect(container.querySelector(`button[data-item="${id}"]`), id).not.toBeNull();
    }
    expect(container.querySelector("#pages")?.textContent).toBe("1 / 1");
    expect(container.querySelector("#etat")?.getAttribute("role")).toBe("status");
    click(container.querySelector('button[data-item="settings"]'));
    for (const k of ["finger", "palm", "prediction", "inkTrail", "webgl"]) {
      expect(container.querySelector(`button[data-reglage="${k}"]`), k).not.toBeNull();
    }
    expect(container.querySelector("#echelons-notes")?.textContent).toContain("note de démarrage");
  });

  it("la scène est dans sa case : aucune barre ancrée en position absolue", () => {
    const { container, store, active } = renderApp();
    const bandes = setDock(setDock(BUILTIN_PROFILES[0]!, "outils", "top"), "pages", "bottom");
    store.save({ ...bandes, id: "bandes", label: "Bandes" });
    active.choose("bandes");
    const layout = container.querySelector<HTMLElement>(".rb-layout");
    expect(layout, ".rb-layout").not.toBeNull();
    const docked = bandes.toolbars.filter((b) => b.role !== "annotation" && b.dock !== "floating");
    const expected = layoutFor(docked);
    const names = areaNames(expected.areas);
    expect(names.has("stage")).toBe(true);
    const stages = container.querySelector<HTMLElement>("main.rb-stages")!;
    expect(stages, "main.rb-stages").not.toBeNull();
    expect(stages.parentElement).toBe(layout);
    expect(getComputedStyle(stages).position).toBe("relative");
    const bars = [...container.querySelectorAll<HTMLElement>("[data-toolbar]")].filter((b) => b.dataset["dock"] !== "floating");
    expect(bars.map((b) => b.dataset["toolbar"])).toEqual(docked.map((b) => b.id));
    for (const bar of bars) {
      // La barre n'est pas dans la scène, et elle occupe sa propre case de la grille.
      expect(stages.contains(bar), bar.dataset["toolbar"]).toBe(false);
      expect(["absolute", "fixed"]).not.toContain(getComputedStyle(bar).position);
      let slot: HTMLElement = bar;
      while (slot.parentElement && slot.parentElement !== layout) slot = slot.parentElement;
      expect(slot.parentElement, "barre dans la grille").toBe(layout);
      expect(["absolute", "fixed"]).not.toContain(getComputedStyle(slot).position);
      const area = slot.style.gridArea || slot.style.getPropertyValue("grid-area");
      expect(names.has(area), `case ${area}`).toBe(true);
      expect(area).not.toBe("stage");
    }
    expect(layout!.style.gridTemplateColumns).toBe(expected.columns);
    expect(layout!.style.gridTemplateRows).toBe(expected.rows);
  });

  it("rb.css : la grille réserve la case de la scène, aucune barre ancrée n'est superposée", () => {
    const css = CSS.replace(/\s+/g, " ");
    expect(css).toMatch(/\.rb-stages \{[^}]*grid-area: stage;[^}]*position: relative;[^}]*overflow: hidden;/);
    expect(css).toMatch(/\.rb-layout \{[^}]*display: grid;/);
    for (const rule of css.match(/[^{}]+\{[^}]*\}/g) ?? []) {
      const [selector = ""] = rule.split("{");
      if (/\.rb-bar(?![-\w])/.test(selector) && !selector.includes('data-dock="floating"')) {
        expect(rule, selector).not.toMatch(/position: (absolute|fixed)/);
      }
    }
  });

  it("styles de la scène repris d'index.html (touch-action, user-select, canvas inertes)", () => {
    const css = CSS.replace(/\s+/g, " ");
    expect(css).toMatch(/\.rb-stage \{[^}]*touch-action: none;[^}]*user-select: none;/);
    expect(css).toMatch(/\.rb-stage canvas \{[^}]*position: absolute;[^}]*inset: 0;[^}]*pointer-events: none;/);
    expect(css).toMatch(/\.rb-stage\[hidden\] \{[^}]*display: none;/);
  });

  it("index.html : plus de barre DOM ni de barre posée en absolu, un seul point de montage", () => {
    const html = INDEX_HTML.replace(/\s+/g, " ");
    expect(html).toContain('<div id="app"></div>');
    for (const gone of ['id="barre"', 'id="reglages"', 'id="edition"', "position: absolute", "top: 60px", "top: 104px"]) {
      expect(html).not.toContain(gone);
    }
    expect(html).toMatch(/html, body \{[^}]*margin: 0;[^}]*height: 100%;[^}]*overflow: hidden;/);
  });

  it("changer de profil : barre à gauche, grands boutons, sans formes", () => {
    const { container } = renderApp();
    click(container.querySelector('button[data-item="profiles"]'));
    click(container.querySelector('[data-profile="simple"]'));
    const bar = container.querySelector<HTMLElement>('[data-toolbar="outils"]')!;
    expect(bar.dataset["dock"]).toBe("left");
    expect(bar.dataset["size"]).toBe("l");
    expect(container.querySelector('button[data-item="rect"]')).toBeNull();
    expect(container.querySelector('button[data-item="pen"]')).not.toBeNull();
    expect(container.querySelector<HTMLElement>(".rb-layout")!.style.gridTemplateColumns).toBe("auto minmax(0, 1fr)");
  });

  it("onglets : la barre des onglets suit le workspace (ajout, actif, modifié)", () => {
    const { container, workspace } = renderApp();
    expect(container.querySelectorAll("[data-tab]")).toHaveLength(1);
    const second = fakeTab("B.roomboard");
    workspace.tabs.add("board", second.session, true);
    const tabs = [...container.querySelectorAll<HTMLElement>("[data-tab]")];
    expect(tabs).toHaveLength(2);
    expect(tabs[1]!.textContent).toContain("B.roomboard");
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("false");
    second.setDirty(true);
    expect(container.querySelectorAll("[data-tab]")[1]!.querySelector(".rb-tab-dirty")).not.toBeNull();
  });

  it("l'erreur du moteur s'affiche dans #etat", () => {
    const { container, tab } = renderApp();
    expect(container.querySelector("#etat")?.textContent).toBe("");
    tab.emit({ error: "trait refusé" });
    expect(container.querySelector("#etat")?.textContent).toContain("trait refusé");
  });

  it("Ouvrir dans la barre → contrôleur de l'onglet actif", () => {
    const { container, workspace, tab } = renderApp();
    const second = fakeTab("B.roomboard");
    workspace.tabs.add("board", second.session, true);
    click(container.querySelector('button[data-item="file-open"]'));
    expect(second.run).toHaveBeenCalledWith("open");
    expect(tab.run).not.toHaveBeenCalled();
    click(container.querySelector('button[data-item="page-add"]'));
    expect(second.engine["addPage"]).toHaveBeenCalledTimes(1);
    expect(tab.engine["addPage"]).not.toHaveBeenCalled();
  });

  it("le compteur #pages et les boutons suivent le moteur de l'onglet actif", () => {
    const { container, workspace, tab } = renderApp({ tab: fakeTab("A.roomboard", { pageIndex: 2, pageCount: 7 }) });
    expect(container.querySelector("#pages")?.textContent).toBe("3 / 7");
    const second = fakeTab("B.roomboard");
    workspace.tabs.add("board", second.session, true);
    expect(container.querySelector("#pages")?.textContent).toBe("1 / 1");
    second.emit({ pageCount: 2, canUndo: true });
    expect(container.querySelector("#pages")?.textContent).toBe("1 / 2");
    expect(container.querySelector<HTMLButtonElement>('button[data-item="undo"]')!.disabled).toBe(false);
    tab.emit({ pageCount: 9 }); // onglet caché : rien ne bouge
    expect(container.querySelector("#pages")?.textContent).toBe("1 / 2");
  });

  it("changer d'onglet pendant une saisie : la zone de texte quittée est validée avant l'activation", () => {
    const { container, workspace } = renderApp();
    const first = workspace.tabs.list()[0]!;
    workspace.tabs.add("board", fakeTab("B.roomboard").session, true);
    const area = document.createElement("textarea");
    container.querySelector("main.rb-stages")!.append(area);
    area.focus();
    expect(document.activeElement).toBe(area);
    const log: string[] = [];
    area.addEventListener("blur", () => log.push("blur"));
    const activate = workspace.tabs.activate.bind(workspace.tabs);
    workspace.tabs.activate = (id: string) => {
      log.push(`activate ${id}`);
      return activate(id);
    };
    click(container.querySelector(`[data-tab="${first.id}"]`));
    expect(log).toEqual(["blur", `activate ${first.id}`]);
    expect(document.activeElement).not.toBe(area);
  });

  it("onglet changé hors de la barre (Nouveau, Ouvrir) pendant une saisie : la zone quittée est validée", () => {
    const { container, workspace } = renderApp();
    const area = document.createElement("textarea");
    container.querySelector("main.rb-stages")!.append(area);
    area.focus();
    const blurred = vi.fn();
    area.addEventListener("blur", blurred);
    workspace.tabs.add("board", fakeTab("Nouveau.roomboard").session, true);
    expect(blurred).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(area);
  });

  it("barre des pages : un numéro montre sa page dans le moteur de l'onglet actif", () => {
    const { container, tab } = renderApp({ tab: fakeTab("A.roomboard", { pageCount: 3 }) });
    click(container.querySelector('button[data-page="3"]'));
    expect(tab.engine["showPage"]).toHaveBeenCalledWith("p3");
  });

  it("échec du démarrage : #etat créé s'il manque, message et data-erreur posés", () => {
    showStartError(document, new Error("wasm absent"));
    const etat = document.getElementById("etat")!;
    expect(etat.getAttribute("role")).toBe("status");
    expect(etat.textContent).toBe("RoomBoard n'a pas pu démarrer : wasm absent");
    expect(document.body.dataset["erreur"]).toBe("wasm absent");
    showStartError(document, "encore");
    expect(document.querySelectorAll("#etat")).toHaveLength(1);
    expect(document.getElementById("etat")!.textContent).toBe("RoomBoard n'a pas pu démarrer : encore");
  });
  it("panneau image : ouvert par le bouton « Image », gardé par une écriture, fermé quand la sélection change (I31)", () => {
    const tab = fakeTab("Sans titre.roomboard");
    const edit = { id: "i", preview: vi.fn(), pick: vi.fn(async () => null), startCrop: vi.fn(), finishCrop: vi.fn(() => false), geometry: vi.fn(() => true), commit: vi.fn(() => true), restore: vi.fn(() => true), mode: () => "idle" as const, keepsDraft: () => false, close: vi.fn() };
    tab.engine["editImage"] = vi.fn(() => edit);
    (tab.session.board.doc as unknown as Record<string, unknown>)["element"] = (id: string) => ({ id, kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: "ab".repeat(32), w: 200, h: 150 } });
    const { container } = renderApp({ tab });
    tab.emit({ tool: "select", selection: ["i"], selectionUnits: 1, selectionImage: "i" });
    click(container.querySelector('[data-selection-action="image"]'));
    expect(container.querySelector('.rb-popover[data-panel="image"] #image-retouche')).not.toBeNull();
    tab.emit({ version: 5 });
    expect(container.querySelector("#image-retouche")).not.toBeNull();
    tab.emit({ selection: [], selectionUnits: 0, selectionImage: null });
    expect(container.querySelector("#image-retouche")).toBeNull();
    expect(edit.close).toHaveBeenCalledTimes(1);
  });
});

describe("App — profils (C1)", () => {
  const openMenu = (c: HTMLElement): void => click(c.querySelector('button[data-item="profiles"]'));
  const openEditor = (c: HTMLElement): void => {
    openMenu(c);
    click(c.querySelector('[data-profile-cmd="edit"]'));
  };
  const change = (el: Element | null, value: string): void => {
    expect(el).not.toBeNull();
    (el as HTMLSelectElement).value = value;
    el!.dispatchEvent(new Event("change", { bubbles: true }));
  };
  /** design-l3 (L3-10) : vignette d'emplacement de la barre d'outils dans le panneau. */
  const dockTile = (d: string): string => `[data-edit-bar="outils"] [data-edit="dock"] [data-choice="${d}"]`;

  it("S5 : profil annotation au navigateur : tableau ordinaire, aucun message (console ni #etat)", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = renderApp({ profile: "annotation" });
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(container.querySelector("#etat")?.textContent).toBe("");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("floating");
    info.mockRestore();
    warn.mockRestore();
  });

  it("design-l4 T6 : S2 : éditeur, « Barre d'annotation » ; masquer ann-text la retire de la barre d'annotation, la barre d'outils garde Texte", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    openEditor(container);
    click(container.querySelector('[data-edit="bar"] [data-choice="annotation"]'));
    expect(container.querySelector('[data-edit-bar="annotation"] h4')?.textContent).toBe("Barre d'annotation");
    click(container.querySelector('[data-edit-item="ann-text"] button[data-edit="shown"]'));
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector('[data-toolbar="outils"] [data-item="text"]')).not.toBeNull();
    await a.control.enter();
    expect(container.querySelector('[data-toolbar="annotation"] [data-item="ann-text"]')).toBeNull();
    expect(container.querySelector('[data-toolbar="annotation"] [data-item="ann-rect"]')).not.toBeNull();
  });
  it("C11a : profil annotation et capacité : enter une fois au montage, pas au changement de profil (P22)", () => {
    const a = fakeAnnotationUi(false, false);
    const { container } = renderApp({ profile: "annotation", caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(a.control.enter).toHaveBeenCalledTimes(1);
    openMenu(container);
    click(container.querySelector('[data-profile="defaut"]'));
    openMenu(container);
    click(container.querySelector('[data-profile="annotation"]'));
    expect(a.control.enter).toHaveBeenCalledTimes(1);
  });
  it("C11a : en annotation, barre seule (data-mode), barre des pages absente, outils vers l'hôte distant, vue de annotate", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(container.querySelector(".rb-layout")?.getAttribute("data-mode")).toBe("board");
    await a.control.enter();
    expect(container.querySelector(".rb-layout")?.getAttribute("data-mode")).toBe("annotation");
    expect(container.querySelector('[data-toolbar="annotation"]')).not.toBeNull();
    expect(container.querySelector('[data-toolbar="pages"]')).toBeNull();
    click(container.querySelector('[data-item="ann-pen"]'));
    expect(a.remoteCalls).toEqual(["setTool pen"]);
    a.view({ tool: "eraser", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 });
    expect(container.querySelector('[data-item="ann-eraser"]')?.getAttribute("aria-pressed")).toBe("true");
    const exit = container.querySelector('[data-item="ann-desktop-annotation"]');
    expect(exit?.textContent).toBe("Quitter l'annotation");
    expect(exit?.getAttribute("aria-pressed")).toBe("true");
  });
  it("design-l4 (fin de lot) : contrôleur distant sans pointer : le segment inactif rejoue l'action sur l'hôte distant", async () => {
    const a = fakeAnnotationUi();
    const ui: AnnotationUi = {
      ...a.ui,
      remote: (local) => {
        const { pointer: _sans, ...reste } = a.ui.remote(local);
        return { ...reste, runAction: (id) => void a.remoteCalls.push(`runAction ${id}`) };
      },
    };
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: ui });
    await a.control.enter();
    a.view({ tool: "pen", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1, annotation: { active: true, pointer: "draw", screens: 1 } });
    click(container.querySelector('[data-segment="mouse"]'));
    expect(a.remoteCalls).toEqual(["runAction annotation-pointer"]);
  });
  it("design-l4 T6 : S2 : barre d'annotation montrée en annotation ; au tableau, jamais de barre annotation (L4-2, L4-3)", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(barIds(container)).toEqual(["menu", "panneaux", "historique", "outils", "pages"]);
    await a.control.enter();
    expect(barIds(container)).toEqual(["annotation"]);
    await a.control.exit();
    expect(barIds(container)).toEqual(["menu", "panneaux", "historique", "outils", "pages"]);
  });
  it("design-l4 T6 : S2 : première barre tools sinon : profil figé d'avant L4, sans barre annotation (L4-2, L4-22)", async () => {
    const a = fakeAnnotationUi();
    const { container, store, active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    const copy = beforeL4Copy("copie-l4");
    expect(copy.toolbars.some((b) => b.role === "annotation")).toBe(false);
    store.save(copy);
    active.choose("copie-l4");
    expect(barIds(container)).toEqual(["outils", "pages"]);
    await a.control.enter();
    expect(barIds(container)).toEqual(["outils"]);
    expect(container.querySelector('[data-toolbar="outils"] [data-item="depot-annotation"]')).not.toBeNull();
  });
  it("design-l4 T6 : L4-3 : barre d'annotation flottante, jamais montrée au tableau ; posée en haut en annotation", async () => {
    const a = fakeAnnotationUi();
    const { container, store, active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    store.save({ ...setDock(BUILTIN_PROFILES[0]!, "annotation", "floating"), id: "flottante", label: "Flottante" });
    active.choose("flottante");
    expect(container.querySelector('[data-toolbar="annotation"]')).toBeNull();
    expect(container.querySelector('.rb-islands [data-toolbar="annotation"]')).toBeNull();
    await a.control.enter();
    expect(container.querySelector('[data-toolbar="annotation"]')?.getAttribute("data-dock")).toBe("top");
  });
  it("design-l4 T6 : L4-4 : préréglages du stylo dans la barre d'annotation en annotation, dans outils au tableau", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')).toHaveLength(3);
    await a.control.enter();
    expect(container.querySelectorAll('[data-toolbar="annotation"] button[data-preset]')).toHaveLength(3);
  });
  it("design-l4 T6 : L4-9 : segment « Souris » de la barre d'annotation → control.pointer(\"mouse\")", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    click(container.querySelector('[data-toolbar="annotation"] button[data-segment="mouse"]'));
    expect(a.control.pointer).toHaveBeenCalledWith("mouse");
  });
  it("C11b revue E : l'état figé et la cible d'envoi du contrôleur arrivent à la barre (« Bureau vivant », envoi en nouvel onglet grisé)", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    const freeze = () => container.querySelector('[data-item="annotation-freeze"]');
    const sendNew = () => container.querySelector<HTMLButtonElement>('[data-item="annotation-send-new"]');
    expect(freeze()?.textContent).toBe("Figer le bureau");
    expect(sendNew()?.disabled).toBe(false);
    a.set({ frozen: true, sendTarget: "new" });
    expect(freeze()?.textContent).toBe("Bureau vivant");
    expect(freeze()?.getAttribute("aria-pressed")).toBe("true");
    expect(sendNew()?.disabled).toBe(true);
  });
  it("C11a : la vue de annotate est oubliée à la sortie : à la réentrée, pas l'ancienne vue", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    const pressed = () => container.querySelector('[data-item="ann-eraser-mode"]')?.getAttribute("aria-pressed");
    const before = pressed();
    a.view({ tool: "select", eraserMode: "object", canUndo: true, canRedo: false, pageIndex: 0, pageCount: 1 });
    expect(pressed()).toBe("true");
    await a.control.exit();
    await a.control.enter();
    expect(pressed()).toBe(before);
  });
  it("C11a : profil d'avant C11a en annotation : « Quitter l'annotation » ajouté au rendu (P7)", async () => {
    const a = fakeAnnotationUi();
    const { container, store, active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    store.save(oldCopy());
    active.choose("ma-copie");
    await a.control.enter();
    expect(container.querySelector('[data-item="desktop-annotation-ajout"]')?.textContent).toBe("Quitter l'annotation");
  });
  it("C11a : profil changé en annotation : renvoyé à annotate (RF5, P21)", async () => {
    const a = fakeAnnotationUi();
    const { active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    active.choose("simple");
    expect(a.control.sendProfile).toHaveBeenCalledWith(expect.objectContaining({ id: "simple" }));
  });

  it("menu Profil : commandes sous les profils ; livré sans copie : remise grisée, pas de Supprimer ; Modifier… ouvre l'éditeur", () => {
    const { container } = renderApp();
    openMenu(container);
    expect(container.querySelectorAll("[data-profile]")).toHaveLength(3);
    expect([...container.querySelectorAll("[data-profile-cmd]")].map((b) => b.getAttribute("data-profile-cmd"))).toEqual(["edit", "import", "export", "reset", "reset-all"]);
    expect(container.querySelector<HTMLButtonElement>('[data-profile-cmd="reset"]')!.disabled).toBe(true);
    click(container.querySelector('[data-profile-cmd="edit"]'));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(container.querySelector("[data-profiles]")).toBeNull();
  });

  it("design-l3 L3-3 : la barre suit le brouillon en direct ; Enregistrer garde (barre à gauche, grands boutons)", () => {
    const { container, store } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    click(container.querySelector('[data-edit="button-size"] [data-choice="l"]'));
    const bar = () => container.querySelector<HTMLElement>('[data-toolbar="outils"]')!;
    expect(bar().dataset["dock"]).toBe("left");
    expect(bar().dataset["size"]).toBe("l");
    expect(store.hasOverride("defaut")).toBe(false);
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(bar().dataset["dock"]).toBe("left");
    expect(bar().dataset["size"]).toBe("l");
    expect(store.hasOverride("defaut")).toBe(true);
    expect(container.querySelector<HTMLElement>(".rb-layout")!.style.gridTemplateColumns).toBe("auto minmax(0, 1fr)");
  });

  it("design-l3 L3-3 : Fermer, Oui : la barre d'avant revient, rien n'est écrit", async () => {
    const { container, store } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
    vi.mocked(shell.confirm).mockClear();
    click(container.querySelector('button[data-edit="close"]'));
    expect(shell.confirm).toHaveBeenCalledWith("Abandonner les changements du profil « Par défaut » ?");
    await vi.waitFor(() => expect(container.querySelector("[data-profile-editor]")).toBeNull());
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("floating");
    expect(store.hasOverride("defaut")).toBe(false);
  });

  it("Enregistrer, écriture refusée : l'éditeur reste ouvert, un message est notifié", () => {
    const map = new Map<string, string>();
    let refuse = false;
    const kv: KeyValue = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => {
        if (refuse) throw new Error("QuotaExceededError");
        map.set(k, v);
      },
      removeItem: (k) => void map.delete(k),
    };
    const { container } = renderApp({ kv });
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    vi.mocked(shell.notify).mockClear();
    refuse = true;
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(String(vi.mocked(shell.notify).mock.calls[0]?.[0])).toMatch(/^Profil non enregistré : .*QuotaExceededError/);
  });

  it("Enregistrer comme nouveau : cm1 actif, dans le menu", () => {
    const { container, store } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    const name = container.querySelector<HTMLInputElement>('input[data-edit="new-name"]')!;
    name.value = "CM1";
    name.dispatchEvent(new InputEvent("input", { bubbles: true }));
    click(container.querySelector('button[data-edit="save-new"]'));
    expect(store.activeId()).toBe("cm1");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
    openMenu(container);
    expect(container.querySelector('[data-profile="cm1"]')?.getAttribute("aria-checked")).toBe("true");
  });

  it("changer de panneau abandonne le brouillon", async () => {
    const { container } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    click(container.querySelector('button[data-item="settings"]'));
    await vi.waitFor(() => expect(container.querySelector("[data-profile-editor]")).toBeNull());
    click(container.querySelector('button[data-item="settings"]'));
    openEditor(container);
    expect(container.querySelector(dockTile("floating"))?.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("floating");
  });

  it("rangée des préréglages : clic sur Rouge → setPenStyle puis setTool(pen) de l'onglet actif", () => {
    const { container, tab } = renderApp();
    const presets = [...container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')].map((b) => b.getAttribute("data-preset"));
    expect(presets).toEqual(["noir", "rouge", "bleu"]);
    expect(container.querySelector('[data-toolbar="pages"] button[data-preset]')).toBeNull();
    click(container.querySelector('button[data-preset="rouge"]'));
    expect(tab.engine["setPenStyle"]).toHaveBeenCalledWith({ color: "#dc2626", width: 4 });
    expect(tab.engine["setTool"]).toHaveBeenCalledWith("pen");
  });

  it("préréglages : une seule rangée, dans la première barre de rôle tools (T11)", async () => {
    const bar = (id: string) => ({ id, role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: `pen-${id}`, kind: "tool", tool: "pen", label: "Stylo" }, { id: `profiles-${id}`, kind: "action", action: "profiles", label: "Profil" }] }] });
    const text = JSON.stringify({
      format: "roomboard-profile", schema: 1, id: "deux", label: "Deux",
      toolbars: [bar("a"), bar("b")],
      presets: { pen: [{ id: "noir", label: "Noir", color: "#000000", width: 2 }] },
    });
    const files = fakeFiles([{ name: "deux.rbprofile", text }]);
    const { container } = renderApp({ files });
    openMenu(container);
    click(container.querySelector('[data-profile-cmd="import"]'));
    await vi.waitFor(() => expect(container.querySelector('[data-toolbar="b"]')).not.toBeNull());
    expect(container.querySelectorAll('[data-toolbar="a"] button[data-preset]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-toolbar="b"] button[data-preset]')).toHaveLength(0);
  });

  it("Importer… : le profil choisi devient actif", async () => {
    const text = JSON.stringify({
      format: "roomboard-profile", schema: 1, id: "importe", label: "Importé", interface: { buttonSize: "l" },
      toolbars: [{ id: "outils", role: "tools", dock: "left", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] }],
    });
    const files = fakeFiles([{ name: "importe.rbprofile", text }]);
    const { container, store } = renderApp({ files });
    openMenu(container);
    click(container.querySelector('[data-profile-cmd="import"]'));
    expect(files.pick).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left"));
    expect(store.activeId()).toBe("importe");
    expect(container.querySelector("[data-profiles]")).toBeNull();
  });

  it("Exporter… : ProfileFiles.save(par-defaut.rbprofile, JSON du profil)", async () => {
    const files = fakeFiles();
    const { container } = renderApp({ files });
    openMenu(container);
    click(container.querySelector('[data-profile-cmd="export"]'));
    await vi.waitFor(() => expect(files.save).toHaveBeenCalledTimes(1));
    const [name, text] = files.save.mock.calls[0]!;
    expect(name).toBe("par-defaut.rbprofile");
    expect(JSON.parse(text).id).toBe("defaut");
  });

  it("design-l3 L3-1 : l'éditeur est un aside.rb-sheet « Profils » dans .rb-popover[data-panel=\"profils\"]", () => {
    const { container } = renderApp();
    openEditor(container);
    const sheet = container.querySelector('.rb-popover[data-panel="profils"] > aside.rb-sheet[data-profile-editor]');
    expect(sheet?.getAttribute("role")).toBe("dialog");
    expect(sheet?.getAttribute("aria-label")).toBe("Profils");
  });

  it("design-l3 H15 : un préréglage ajouté au brouillon marche dans la barre montrée", () => {
    const { container, tab } = renderApp();
    openEditor(container);
    click(container.querySelector('button[data-edit="preset-add"]'));
    expect([...container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')].map((b) => b.getAttribute("data-preset"))).toEqual(["noir", "rouge", "bleu", "couleur"]);
    click(container.querySelector('[data-toolbar="outils"] button[data-preset="couleur"]'));
    expect(tab.engine["setPenStyle"]).toHaveBeenCalledWith({ color: "#000000", width: 4 });
  });

  it("design-l3 L3-4 : choisir « Simple » dans le sélecteur du panneau : éditeur remonté sur Simple, focus sur le sélecteur", async () => {
    const { container, store } = renderApp();
    openEditor(container);
    change(container.querySelector('select[data-edit="profile"]'), "simple");
    expect(store.activeId()).toBe("simple");
    expect(container.querySelector<HTMLInputElement>('input[data-edit="label"]')?.value).toBe("Simple (grands boutons)");
    await new Promise((r) => setTimeout(r, 0));
    const select = container.querySelector<HTMLSelectElement>('select[data-edit="profile"]');
    expect(document.activeElement).toBe(select);
    expect(select?.value).toBe("simple");
  });

  it("design-l3 L3-21 : Exporter du panneau écrit le brouillon ; Exporter… du menu, le profil enregistré", async () => {
    const files = fakeFiles();
    const { container } = renderApp({ files });
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    click(container.querySelector('button[data-edit="export"]'));
    await vi.waitFor(() => expect(files.save).toHaveBeenCalledTimes(1));
    expect(JSON.parse(files.save.mock.calls[0]![1]).toolbars[0].dock).toBe("left");
    click(container.querySelector('button[data-edit="close"]'));
    await vi.waitFor(() => expect(container.querySelector("[data-profile-editor]")).toBeNull());
    openMenu(container);
    click(container.querySelector('[data-profile-cmd="export"]'));
    await vi.waitFor(() => expect(files.save).toHaveBeenCalledTimes(2));
    expect(JSON.parse(files.save.mock.calls[1]![1]).toolbars[0].dock).toBe("floating");
  });

  it("design-l3 L3-21 : Importer du panneau : le profil importé devient actif, l'éditeur remonte dessus", async () => {
    const text = JSON.stringify({
      format: "roomboard-profile", schema: 1, id: "importe", label: "Importé", interface: { buttonSize: "l" },
      toolbars: [{ id: "outils", role: "tools", dock: "left", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] }],
    });
    const files = fakeFiles([{ name: "importe.rbprofile", text }]);
    const { container, store } = renderApp({ files });
    openEditor(container);
    click(container.querySelector('button[data-edit="import"]'));
    await vi.waitFor(() => expect(store.activeId()).toBe("importe"));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(container.querySelector<HTMLSelectElement>('select[data-edit="profile"]')?.value).toBe("importe");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
  });

  it("design-l3 L3-19 : Revenir à l'origine sur une copie de defaut : copie retirée, éditeur remonté, taille m", () => {
    const { container, store } = renderApp();
    openEditor(container);
    click(container.querySelector('[data-edit="button-size"] [data-choice="s"]'));
    click(container.querySelector('button[data-edit="save"]'));
    expect(store.hasOverride("defaut")).toBe(true);
    openEditor(container);
    expect(container.querySelector('[data-edit="profile-tag"]')?.textContent).toBe("Fourni, modifié");
    click(container.querySelector('button[data-edit="revert"]'));
    expect(store.hasOverride("defaut")).toBe(false);
    expect(container.querySelector('[data-edit="profile-tag"]')?.textContent).toBe("Fourni");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-size")).toBe("m");
  });

  it("design-l3 L3-19 (relecture) : après Revenir à l'origine, le focus revient sur le sélecteur de profil", async () => {
    const { container } = renderApp();
    openEditor(container);
    click(container.querySelector('[data-edit="button-size"] [data-choice="s"]'));
    click(container.querySelector('button[data-edit="save"]'));
    openEditor(container);
    click(container.querySelector('button[data-edit="revert"]'));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(container.querySelector('select[data-edit="profile"]'));
  });

  it("design-l3 L3-21 (relecture) : après un import depuis le panneau, le focus revient sur le sélecteur de profil", async () => {
    const text = JSON.stringify({
      format: "roomboard-profile", schema: 1, id: "importe", label: "Importé", interface: { buttonSize: "l" },
      toolbars: [{ id: "outils", role: "tools", dock: "left", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] }],
    });
    const { container, store } = renderApp({ files: fakeFiles([{ name: "importe.rbprofile", text }]) });
    openEditor(container);
    click(container.querySelector('button[data-edit="import"]'));
    await vi.waitFor(() => expect(store.activeId()).toBe("importe"));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(container.querySelector('select[data-edit="profile"]'));
  });

  it("design-l3 L3-4 (relecture) : choix refusé dans le sélecteur du panneau (id inconnu) : l'éditeur rouvert ensuite ne prend pas le focus", async () => {
    const { container, store } = renderApp();
    openEditor(container);
    const editor = container.querySelector("[data-profile-editor]");
    vi.mocked(shell.notify).mockClear();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    change(container.querySelector('select[data-edit="profile"]'), "inconnu");
    warn.mockRestore();
    expect(String(vi.mocked(shell.notify).mock.calls[0]?.[0])).toMatch(/^Le choix du profil ne sera pas gardé/);
    expect(store.activeId()).toBe("defaut");
    expect(container.querySelector("[data-profile-editor]")).toBe(editor); // profil inchangé : aucun remontage
    click(container.querySelector('button[data-edit="close"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    openEditor(container);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).not.toBe(container.querySelector('select[data-edit="profile"]'));
  });

  it("design-l3 L3-4 (relecture) : après un choix réussi dans le panneau, l'éditeur rouvert ensuite ne prend pas le focus", async () => {
    const { container, store } = renderApp();
    openEditor(container);
    change(container.querySelector('select[data-edit="profile"]'), "simple");
    expect(store.activeId()).toBe("simple");
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(container.querySelector('select[data-edit="profile"]'));
    click(container.querySelector('button[data-edit="close"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    openEditor(container);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).not.toBe(container.querySelector('select[data-edit="profile"]'));
  });

  it("design-l3 L3-32 : brouillon modifié, Réglages : question ; Non : panneau gardé, barre à gauche ; Oui : Réglages, barre en haut", async () => {
    const { container } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    vi.mocked(shell.confirm).mockClear();
    vi.mocked(shell.confirm).mockResolvedValueOnce(false);
    click(container.querySelector('button[data-item="settings"]'));
    expect(shell.confirm).toHaveBeenCalledWith("Abandonner les changements du profil « Par défaut » ?");
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(container.querySelector("#reglages")).toBeNull();
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
    click(container.querySelector('button[data-item="settings"]'));
    await vi.waitFor(() => expect(container.querySelector("#reglages")).not.toBeNull());
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("floating");
  });

  it("design-l3 L3-32 : brouillon égal, Réglages : aucune question, Réglages ouverts dans le même tour", () => {
    const { container } = renderApp();
    openEditor(container);
    vi.mocked(shell.confirm).mockClear();
    click(container.querySelector('button[data-item="settings"]'));
    expect(shell.confirm).not.toHaveBeenCalled();
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(container.querySelector("#reglages")).not.toBeNull();
  });

  it("design-l3 L3-32 : brouillon modifié, entrée en annotation : panneau fermé sans question ; à la sortie, la barre enregistrée", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    vi.mocked(shell.confirm).mockClear();
    await a.control.enter();
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(shell.confirm).not.toHaveBeenCalled();
    await a.control.exit();
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("floating");
  });

  it("design-l3 L3-2 : panneau ouvert : .rb-layout[data-panneau=\"profils\"] ; fermé : absent", () => {
    const { container } = renderApp();
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.hasAttribute("data-panneau")).toBe(false);
    openEditor(container);
    expect(layout.getAttribute("data-panneau")).toBe("profils");
    click(container.querySelector('button[data-edit="close"]'));
    expect(layout.hasAttribute("data-panneau")).toBe(false);
  });

  it("design-l3 L3-2 : barre d'outils à droite, panneau ouvert : la barre garde sa case, le panneau est dans la scène", () => {
    const { container, store, active } = renderApp();
    store.save(setDock(BUILTIN_PROFILES[0]!, "outils", "right"));
    active.refresh();
    openEditor(container);
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.style.gridTemplateColumns).toBe("minmax(0, 1fr) auto");
    const bar = container.querySelector('[data-toolbar="outils"]')!;
    const popover = container.querySelector('.rb-popover[data-panel="profils"]')!;
    expect(popover.parentElement).toBe(layout);
    expect(popover.contains(bar)).toBe(false);
    const slot = bar.closest<HTMLElement>(".rb-slot")!;
    expect(slot.style.gridArea || slot.style.getPropertyValue("grid-area")).toBe("outils");
  });

  it("design-l3 L3-22 : menu Profil en îlot : icône et texte par ligne, profil actif marqué check, textes inchangés", () => {
    const { container } = renderApp();
    openMenu(container);
    expect(container.querySelector("[data-profiles]")!.parentElement!.getAttribute("data-panel")).toBe("menu-profils");
    const rows = [...container.querySelectorAll("[data-profile-cmd]")].map((b) => [b.getAttribute("data-profile-cmd"), b.querySelector("svg")?.getAttribute("data-icon"), b.textContent]);
    expect(rows).toEqual([
      ["edit", "profile", "Modifier…"],
      ["import", "import", "Importer…"],
      ["export", "export", "Exporter…"],
      ["reset", "reset", "Remettre à zéro ce profil"],
      ["reset-all", "reset", "Tout remettre à zéro"],
    ]);
    expect(container.querySelector('[data-profile="defaut"] svg')?.getAttribute("data-icon")).toBe("check");
    expect(container.querySelector('[data-profile="simple"] svg')).toBeNull();
    expect(container.querySelector('[data-profile="defaut"]')?.textContent).toBe("Par défaut");
  });
});

describe("App — grille (C9 éditeur, E7, E8)", () => {
  const GRID = 'button[data-item="grid"]';
  const panelOf = (c: HTMLElement): Element | null => c.querySelector("#grille");
  const chooseKind = (c: HTMLElement, kind: string): void => {
    const el = c.querySelector<HTMLSelectElement>('#grille select[data-grille="kind"]');
    expect(el).not.toBeNull();
    el!.value = kind;
    el!.dispatchEvent(new Event("change", { bubbles: true }));
  };

  it("E7 : « Grille » ouvre #grille ; Carreaux → aperçu sur l'onglet actif ; second clic : fermé, aperçu coupé, rien d'écrit", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    expect(panelOf(container)).not.toBeNull();
    chooseKind(container, "squares");
    expect(tab.engine.previewGrid).toHaveBeenCalledTimes(1);
    expect(tab.engine.previewGrid!.mock.calls[0]![0]).toMatchObject({ levels: [{ kind: "squares", spacingX: 40, color: "#94a3b8", lineWidth: 1 }] });
    click(container.querySelector(GRID));
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(tab.engine.run).not.toHaveBeenCalled();
  });

  it("S2 : Appliquer → un SetGrid sur la page montrée, aperçu coupé, panneau fermé", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    chooseKind(container, "squares");
    click(container.querySelector('#grille [data-grille="apply"]'));
    expect(tab.engine.run).toHaveBeenCalledTimes(1);
    expect(tab.engine.run!.mock.calls[0]![0]).toMatchObject({ type: "SetGrid", page: "p", grid: { levels: [{ kind: "squares" }] } });
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(panelOf(container)).toBeNull();
  });

  it("E8, CR6 : Appliquer refusé par le cœur : panneau ouvert, message affiché, aperçu gardé", () => {
    const { container, tab } = renderApp();
    tab.engine.run!.mockReturnValueOnce(null);
    click(container.querySelector(GRID));
    chooseKind(container, "squares");
    tab.emit({ error: "grille invalide" });
    click(container.querySelector('#grille [data-grille="apply"]'));
    expect(tab.engine.run).toHaveBeenCalledTimes(1);
    expect(panelOf(container)).not.toBeNull();
    expect(container.querySelector('#grille [data-grille="error"]')?.textContent).toBe("grille invalide");
    expect(tab.engine.endGridPreview).not.toHaveBeenCalled();
  });

  it("CR3 : aperçu, autre onglet, retour : aucune grille (aperçu coupé sur le moteur de départ, jamais rouvert)", () => {
    const { container, workspace, tab } = renderApp();
    click(container.querySelector(GRID));
    chooseKind(container, "squares");
    const second = fakeTab("B.roomboard");
    workspace.tabs.add("board", second.session, true);
    workspace.tabs.activate(workspace.tabs.list()[0]!.id);
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.previewGrid).toHaveBeenCalledTimes(1);
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(tab.engine.endGridPreview!.mock.invocationCallOrder[0]!).toBeGreaterThan(tab.engine.previewGrid!.mock.invocationCallOrder[0]!);
    expect(second.engine.previewGrid).not.toHaveBeenCalled();
    expect(second.engine.endGridPreview).not.toHaveBeenCalled();
    expect(tab.engine.run).not.toHaveBeenCalled();
  });

  it("E8 : page ou version qui change pendant la séance : panneau fermé, rien d'écrit ; une erreur seule ne ferme pas", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    tab.emit({ error: "refus" });
    expect(panelOf(container)).not.toBeNull();
    tab.emit({ page: "p2" });
    expect(panelOf(container)).toBeNull();
    click(container.querySelector(GRID));
    tab.emit({ version: 7 });
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.run).not.toHaveBeenCalled();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(2);
  });

  it("E8, Review Focus 5 : onglet changé pendant la séance : panneau fermé, aperçu coupé sur l'onglet de départ seulement", () => {
    const { container, workspace, tab } = renderApp();
    click(container.querySelector(GRID));
    chooseKind(container, "dots");
    const second = fakeTab("B.roomboard");
    workspace.tabs.add("board", second.session, true);
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(second.engine.endGridPreview).not.toHaveBeenCalled();
    expect(second.engine.previewGrid).not.toHaveBeenCalled();
  });

  it("E7 : ouvrir un autre panneau abandonne la séance", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    chooseKind(container, "squares");
    click(container.querySelector('button[data-item="settings"]'));
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(tab.engine.run).not.toHaveBeenCalled();
  });
});

describe("App : barre du média (C14)", () => {
  const MEDIA = {
    id: "m1",
    kind: "media",
    media: { asset: "ab".repeat(32), mediaType: "video", w: 200, h: 100, duration: 2.5, poster: null, trimStart: 0, trimEnd: null, loop: false, volume: 1 },
  };

  it("la classe rb-media-bar n'est posée qu'une fois (enveloppe), sans doubler bordure et ombre", async () => {
    const { container, tab } = renderApp();
    tab.showMedia(MEDIA);
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).not.toBeNull());
    expect(container.querySelectorAll(".rb-media-bar")).toHaveLength(1);
    expect(container.querySelector("[data-media-bar]")!.parentElement!.className).toBe("rb-popover rb-media-bar");
  });

  it("visible pour un média sélectionné, absente sinon", async () => {
    const { container, tab } = renderApp();
    expect(container.querySelector("[data-media-bar]")).toBeNull();
    tab.showMedia(MEDIA);
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).not.toBeNull());
    tab.showMedia(null);
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).toBeNull());
  });

  it("Lecture : le lecteur de la session reçoit l'élément et ses réglages", async () => {
    const { container, tab } = renderApp();
    tab.showMedia(MEDIA);
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).not.toBeNull());
    container.querySelector<HTMLButtonElement>('[data-media="toggle"]')!.click();
    expect(tab.media.toggle).toHaveBeenCalledWith("m1", expect.objectContaining({ asset: MEDIA.media.asset, duration: 2.5, volume: 1 }));
  });

  it("« Début ici » écrit un SetMedia par engine.run", async () => {
    const { container, tab } = renderApp();
    tab.showMedia(MEDIA);
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).not.toBeNull());
    container.querySelector<HTMLButtonElement>('[data-media="start"]')!.click();
    expect(tab.engine["run"]).toHaveBeenCalledWith(expect.objectContaining({ type: "SetMedia", id: "m1", trimEnd: null, loop: false, volume: 1 }));
  });

  it("refus du cœur : message dans la barre", async () => {
    const { container, tab } = renderApp();
    tab.engine["run"]!.mockReturnValueOnce(null);
    tab.emit({ error: "durée inconnue" });
    tab.showMedia(MEDIA);
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).not.toBeNull());
    container.querySelector<HTMLButtonElement>('[data-media="end"]')!.click();
    await vi.waitFor(() => expect(container.querySelector('[data-media="error"]')?.textContent).toBe("durée inconnue"));
  });

  it("R8 : média lié introuvable, lecture grisée dès l'ouverture de la barre (M31)", async () => {
    const { container, tab } = renderApp();
    tab.showMedia(MEDIA, "echec");
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).not.toBeNull());
    expect(container.querySelector<HTMLButtonElement>('[data-media="toggle"]')!.disabled).toBe(true);
  });
});

describe("App : barre 3D (C15)", () => {
  const MODEL = {
    id: "o1",
    kind: "model3d",
    model3d: { asset: "ef".repeat(32), format: "glb", w: 200, h: 100, files: [], yaw: Math.PI / 6, pitch: Math.PI / 9, snapshot: null },
  };
  const MEDIA = {
    id: "m1",
    kind: "media",
    media: { asset: "ab".repeat(32), mediaType: "video", w: 200, h: 100, duration: 2.5, poster: null, trimStart: 0, trimEnd: null, loop: false, volume: 1 },
  };

  it("barre visible pour un objet 3D seul sélectionné, absente pour un groupe ou un autre élément", async () => {
    const { container, tab } = renderApp();
    expect(container.querySelector("[data-model3d-bar]")).toBeNull();
    tab.showModel3d(MODEL);
    await vi.waitFor(() => expect(container.querySelector("[data-model3d-bar]")).not.toBeNull());
    // Même enveloppe flottante que la barre du média (X24), aucune rangée.
    expect(container.querySelector("[data-model3d-bar]")!.parentElement!.className).toBe("rb-popover rb-media-bar");
    expect(container.querySelector('[data-model3d="name"]')?.textContent).toBe("chaise.glb");
    tab.showModel3d(null); // groupe : la session ne rend aucun objet 3D seul
    await vi.waitFor(() => expect(container.querySelector("[data-model3d-bar]")).toBeNull());
    tab.showMedia(MEDIA);
    await vi.waitFor(() => expect(container.querySelector("[data-media-bar]")).not.toBeNull());
    expect(container.querySelector("[data-model3d-bar]")).toBeNull();
  });

  it("Tourner et Vue initiale appellent la session active", async () => {
    const { container, tab } = renderApp();
    tab.showModel3d(MODEL);
    await vi.waitFor(() => expect(container.querySelector("[data-model3d-bar]")).not.toBeNull());
    container.querySelector<HTMLButtonElement>('[data-model3d="orbit"]')!.click();
    expect(tab.model3d.toggleOrbit).toHaveBeenCalledTimes(1);
    container.querySelector<HTMLButtonElement>('[data-model3d="reset"]')!.click();
    expect(tab.model3d.resetModelView).toHaveBeenCalledTimes(1);
  });

  it("sans WebGL : message « 3D indisponible sur ce poste : l'objet garde son image », boutons grisés", async () => {
    const { container, tab } = renderApp();
    tab.showModel3d(MODEL, "sans-webgl");
    await vi.waitFor(() => expect(container.querySelector("[data-model3d-bar]")).not.toBeNull());
    expect(container.querySelector('[data-model3d="message"]')?.textContent).toBe("3D indisponible sur ce poste : l'objet garde son image");
    expect(container.querySelector<HTMLButtonElement>('[data-model3d="orbit"]')!.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[data-model3d="reset"]')!.disabled).toBe(true);
  });
});

describe("App — design-l4 : bandeau et réglage du cadre (L4-14, L4-16)", () => {
  afterEach(() => clearToast());
  it("S4 : bandeau dans la case de la scène ; L4-16 : effacé à l'entrée en annotation", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    showToast(sentToBoardToast(2));
    expect(container.querySelector(".rb-toasts")?.parentElement).toBe(container.querySelector(".rb-layout"));
    expect(container.querySelector(".rb-toast")?.textContent).toBe("Envoyé au tableau : page 2");
    await a.control.enter();
    expect(container.querySelector(".rb-toast")).toBeNull();
  });
  it("S3 : Réglages, bouton du cadre avec la capacité d'annotation ; absent sans elle (H10)", () => {
    const device = createDeviceSettings(null);
    const on = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, device });
    click(on.container.querySelector('button[data-item="settings"]'));
    const btn = () => on.container.querySelector('button[data-reglage="cadre"]');
    expect(btn()?.textContent).toBe("Cadre de l'annotation : affiché");
    click(btn());
    expect(device.frame()).toBe(false);
    expect(btn()?.textContent).toBe("Cadre de l'annotation : masqué");
    const off = renderApp({ device: createDeviceSettings(null) });
    click(off.container.querySelector('button[data-item="settings"]'));
    expect(off.container.querySelector('button[data-reglage="cadre"]')).toBeNull();
  });
});

describe("App — design-l2 : îlots (L2-5, L2-6, L2-8, L2-13, L2-14, L2-19)", () => {
  const corner = (c: HTMLElement, k: string): Element => c.querySelector(`.rb-islands > .rb-corner[data-corner="${k}"]`)!;
  it("design-l2 L2-14 : defaut sans bande : grille « stage » seule ; calque .rb-islands enfant de .rb-layout", () => {
    const { container } = renderApp();
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.style.gridTemplateAreas).toBe('"stage"');
    expect(container.querySelector(".rb-islands")?.parentElement).toBe(layout);
    expect(container.querySelector(".rb-floating")).toBeNull();
    expect(container.querySelector(".rb-slot")).toBeNull();
  });
  it("design-l2 L2-5 : menu puis onglets et #etat en haut à gauche ; panneaux en haut à droite ; historique en bas à gauche ; outils et pages centrés", () => {
    const { container } = renderApp();
    expect(corner(container, "top-start").querySelector('.rb-corner-menu > .rb-island[data-island="menu"]')).not.toBeNull();
    const head = corner(container, "top-start").querySelector('.rb-island.rb-head[data-island="onglets"]')!;
    expect(head.querySelector("[data-tabs]")).not.toBeNull();
    expect(head.nextElementSibling?.id).toBe("etat");
    expect(corner(container, "top-end").querySelector('[data-island="panneaux"] button[data-item="profiles"]')).not.toBeNull();
    expect(corner(container, "bottom-start").querySelector('[data-island="historique"] button[data-item="undo"]')).not.toBeNull();
    for (const id of ["outils", "pages"]) expect(container.querySelector(`.rb-islands > .rb-island[data-island="${id}"]`), id).not.toBeNull();
    expect(container.querySelectorAll("[data-island-grip]")).toHaveLength(2); // outils et pages (barre latérale)
  });
  it("barre latérale : à side-start, data-toolbar pages ; #pages et page-prev/next dans la barre d'outils, aucun îlot bas-centre", () => {
    const { container } = renderApp();
    const island = container.querySelector<HTMLElement>('[data-island="pages"]')!;
    expect(island.dataset["anchor"]).toBe("side-start");
    expect(island.querySelector('[data-toolbar="pages"]')).not.toBeNull();
    expect(island.querySelector("#pages")).toBeNull();
    for (const id of ["page-prev", "page-next"]) expect(container.querySelector(`[data-toolbar="outils"] [data-item="${id}"]`), id).not.toBeNull();
    expect(container.querySelector('[data-toolbar="outils"] #pages')).not.toBeNull();
    expect(container.querySelector('[data-anchor="bottom-center"]')).toBeNull();
  });
  it("barre latérale : page-number et le port sidebar.toggle déplient puis replient ; focus sur la miniature montrée", () => {
    const sidebar: NonNullable<AppProps["sidebar"]> = {};
    const { container } = renderApp({ sidebar, tab: fakeTab("A.roomboard", { page: "p1" }) });
    const island = container.querySelector<HTMLElement>('[data-island="pages"]')!;
    expect(island.dataset["collapsed"]).toBe("1");
    expect(container.querySelector('[data-item="page-add"]')!.closest("[hidden]")).not.toBeNull();
    click(container.querySelector('button[data-item="page-number"]'));
    expect(island.dataset["collapsed"]).toBeUndefined();
    expect(container.querySelector('button[data-item="page-number"]')!.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector('[data-item="page-add"]')!.closest("[hidden]")).toBeNull();
    click(container.querySelector('button[data-item="page-number"]'));
    expect(island.dataset["collapsed"]).toBe("1");
    sidebar.toggle!("pages");
    expect(island.dataset["collapsed"]).toBeUndefined();
    expect(document.activeElement?.getAttribute("data-page-id")).toBe("p1");
  });
  it("barre latérale : miniatures, mode portrait et suppression vers le moteur de l'onglet actif ; miniature demandée à l'espace de travail", async () => {
    const { container, tab, workspace } = renderApp({ tab: fakeTab("A.roomboard", { page: "p2", pageIndex: 1, pageCount: 3 }) });
    click(container.querySelector('button[data-item="page-number"]'));
    expect(container.querySelectorAll(".rb-pages-list [data-page]")).toHaveLength(3);
    expect(container.querySelector('.rb-pages-list [data-page="2"]')!.getAttribute("aria-current")).toBe("page");
    click(container.querySelector('[data-edit="page-mode"] [data-choice="portrait"]'));
    expect(tab.engine["setPageMode"]).toHaveBeenCalledWith("portrait");
    await vi.waitFor(() => expect(workspace.pageThumb).toHaveBeenCalledWith(tab.session, "p2", expect.any(Number)));
    container.querySelector<HTMLElement>('.rb-pages-list [data-page="3"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    expect(tab.engine["showPage"]).toHaveBeenCalledWith("p3");
    expect(tab.engine["removePage"]).toHaveBeenCalled();
  });
  it("design-l2 L2-6 : rôle menu rendu par MenuBar ; liste fermée mais dans le DOM ; une ligne lance son action", () => {
    const { container, workspace } = renderApp();
    const toggle = container.querySelector('[data-toolbar="menu"] [data-menu-toggle]')!;
    expect(toggle.getAttribute("aria-haspopup")).toBe("menu");
    const list = container.querySelector<HTMLElement>('[data-toolbar="menu"] [data-menu-list]')!;
    expect(list.hidden).toBe(true);
    expect([...list.querySelectorAll('button[role="menuitem"]')].map((b) => b.getAttribute("data-item"))).toEqual(["file-new", "file-open", "file-import", "file-save", "file-save-as", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "help", "page-clear", "grid", "settings", "menu-profiles"]);
    click(list.querySelector('button[data-item="export-pdf"]'));
    expect(workspace.exportPdf).toHaveBeenCalledTimes(1);
  });
  it("design-l2 L2-13 : préréglages dans l'îlot contextuel, à l'intérieur de [data-toolbar=\"outils\"]", () => {
    const { container } = renderApp();
    expect(container.querySelectorAll('[data-toolbar="outils"] > [data-island-context] button[data-preset]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')).toHaveLength(3);
  });
  it("design-l2 L2-8 : Replier : data-collapsed sur la barre, gardé sur l'appareil, jamais dans le profil", () => {
    const device = createDeviceSettings(null);
    const { container, store } = renderApp({ device });
    click(container.querySelector('[data-island="outils"] [data-island-collapse]'));
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-collapsed")).toBe("1");
    expect(device.island("defaut", "outils")).toEqual({ at: null, collapsed: true });
    expect(store.get("defaut")?.toolbars.find((b) => b.id === "outils")?.collapsed).toBe(false);
  });
  it("design-l2 L2-5 : copie d'avant L2 (bandes, sans menu) : onglets et #etat en îlot au coin de la case de la scène, scène sous la bande", () => {
    const { container, store, active } = renderApp();
    store.save(beforeL4Copy("ancienne"));
    active.choose("ancienne");
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.style.gridTemplateAreas).toBe('"outils" "stage" "pages"');
    expect(corner(container, "top-start").querySelector(".rb-corner-menu")?.children).toHaveLength(0);
    expect(corner(container, "top-start").querySelector('.rb-head[data-island="onglets"] [data-tabs]')).not.toBeNull();
    expect(container.querySelector("#etat")?.getAttribute("role")).toBe("status");
    expect(container.querySelector('[data-toolbar="outils"]')?.closest(".rb-slot")).not.toBeNull();
  });
  it("design-l2 H11 : rôle inconnu flottant : en haut à droite, après panneaux", () => {
    const { container, store, active } = renderApp();
    const odd: Bar = {
      id: "zoom", role: "zoom", dock: "floating", collapsed: false, rest: {},
      groups: [{ id: "z", rest: {}, items: [{ id: "fit-2", kind: "action", action: "fit-page", label: "Ajuster", requires: [], rest: {} }] }],
    };
    store.save({ ...BUILTIN_PROFILES[0]!, id: "zoome", label: "Zoomé", toolbars: [...BUILTIN_PROFILES[0]!.toolbars, odd] });
    active.choose("zoome");
    expect([...corner(container, "top-end").children].map((e) => e.getAttribute("data-island"))).toEqual(["panneaux", "zoom"]);
  });
  it("design-l2 L2-19 : en annotation, aucun îlot de barre n'est rendu ; la bande d'annotation seule", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    expect(container.querySelector('.rb-island[data-island="outils"]')).toBeNull();
    expect(container.querySelector('.rb-slot [data-toolbar="annotation"]')).not.toBeNull();
  });
});
