// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BoardSession } from "../app/board-session";
import { createTabs } from "../app/tabs";
import type { TabSession, Workspace } from "../app/workspace";
import { createAssetStore } from "../core/asset-store";
import type { EngineState } from "../engine/engine";
import { createSettingsStore, parseSettings } from "../engine/settings";
import type { FileController } from "../platform/controller";
import type { ShellPort } from "../platform/files";
import type { ProfileFiles } from "../platform/profile-files";
import { createProfileStore, type KeyValue } from "../profile-store";
import type { RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { createActiveProfile } from "./active-profile";
import { App, showStartError } from "./App";
import { layoutFor } from "./layout";

// Lus sur le disque : sous vitest, un import `?raw` de CSS rend une chaîne vide.
const CSS = readFileSync(join(__dirname, "rb.css"), "utf8");
const INDEX_HTML = readFileSync(join(__dirname, "../../index.html"), "utf8");
const CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };

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
    releaseKeys: vi.fn(),
    previewGrid: vi.fn(),
    endGridPreview: vi.fn(),
    run: vi.fn(() => ({ pages: ["p"], ids: [], removed: [], full: false, version: 1 })),
  };
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
    },
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
    selection: vi.fn(),
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

function renderApp(opts: { tab?: FakeTab; profile?: string; caps?: RuntimeCapabilities; files?: ReturnType<typeof fakeFiles>; kv?: KeyValue } = {}) {
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

  it("la scène est dans sa case : aucune barre en position absolue", () => {
    const { container } = renderApp();
    const layout = container.querySelector<HTMLElement>(".rb-layout");
    expect(layout, ".rb-layout").not.toBeNull();
    const profile = BUILTIN_PROFILES.find((p) => p.id === "defaut")!;
    const expected = layoutFor(profile.toolbars);
    const names = areaNames(expected.areas);
    expect(names.has("stage")).toBe(true);
    const stages = container.querySelector<HTMLElement>("main.rb-stages")!;
    expect(stages, "main.rb-stages").not.toBeNull();
    expect(stages.parentElement).toBe(layout);
    expect(getComputedStyle(stages).position).toBe("relative");
    const bars = [...container.querySelectorAll<HTMLElement>("[data-toolbar]")];
    expect(bars.map((b) => b.dataset["toolbar"])).toEqual(profile.toolbars.map((b) => b.id));
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
    expect(container.querySelectorAll("[data-tab]")[1]!.textContent).toContain("•");
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
  const DOCK = '[data-edit-bar="outils"] select[data-edit="dock"]';

  it("S5 : profil annotation au navigateur : tableau ordinaire, aucun message (console ni #etat)", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = renderApp({ profile: "annotation" });
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(container.querySelector("#etat")?.textContent).toBe("");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
    info.mockRestore();
    warn.mockRestore();
  });

  it("S5 : capacité vraie : setMode(desktop-annotation) une fois au montage, pas au changement de profil", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { container, tab } = renderApp({ profile: "annotation", caps: { ...CAPS, desktopAnnotation: true } });
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]![0])).toContain("C11a");
    openMenu(container);
    click(container.querySelector('[data-profile="defaut"]'));
    openMenu(container);
    click(container.querySelector('[data-profile="annotation"]'));
    expect(info).toHaveBeenCalledTimes(1);
    expect(tab.engine["setTool"]).not.toHaveBeenCalled();
    info.mockRestore();
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

  it("éditeur : la barre ne bouge pas avant Enregistrer ; Enregistrer applique (barre à gauche, grands boutons)", () => {
    const { container, store } = renderApp();
    openEditor(container);
    change(container.querySelector(DOCK), "left");
    change(container.querySelector('select[data-edit="button-size"]'), "l");
    const bar = () => container.querySelector<HTMLElement>('[data-toolbar="outils"]')!;
    expect(bar().dataset["dock"]).toBe("top");
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(bar().dataset["dock"]).toBe("left");
    expect(bar().dataset["size"]).toBe("l");
    expect(store.hasOverride("defaut")).toBe(true);
    expect(container.querySelector<HTMLElement>(".rb-layout")!.style.gridTemplateColumns).toBe("auto minmax(0, 1fr)");
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
    change(container.querySelector(DOCK), "left");
    vi.mocked(shell.notify).mockClear();
    refuse = true;
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(String(vi.mocked(shell.notify).mock.calls[0]?.[0])).toMatch(/^Profil non enregistré : .*QuotaExceededError/);
  });

  it("Enregistrer comme nouveau : cm1 actif, dans le menu", () => {
    const { container, store } = renderApp();
    openEditor(container);
    change(container.querySelector(DOCK), "left");
    const name = container.querySelector<HTMLInputElement>('input[data-edit="new-name"]')!;
    name.value = "CM1";
    name.dispatchEvent(new InputEvent("input", { bubbles: true }));
    click(container.querySelector('button[data-edit="save-new"]'));
    expect(store.activeId()).toBe("cm1");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
    openMenu(container);
    expect(container.querySelector('[data-profile="cm1"]')?.getAttribute("aria-checked")).toBe("true");
  });

  it("changer de panneau abandonne le brouillon", () => {
    const { container } = renderApp();
    openEditor(container);
    change(container.querySelector(DOCK), "left");
    click(container.querySelector('button[data-item="settings"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    click(container.querySelector('button[data-item="settings"]'));
    openEditor(container);
    expect(container.querySelector<HTMLSelectElement>(DOCK)!.value).toBe("top");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
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
