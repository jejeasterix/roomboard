// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BoardSession } from "../app/board-session";
import { createTabs } from "../app/tabs";
import type { TabSession, Workspace } from "../app/workspace";
import type { EngineState } from "../engine/engine";
import { createSettingsStore, parseSettings } from "../engine/settings";
import type { FileController } from "../platform/controller";
import type { ShellPort } from "../platform/files";
import { createProfileStore } from "../profile-store";
import type { RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { createActiveProfile } from "./active-profile";
import { App, showStartError } from "./App";
import { layoutFor } from "./layout";

const CSS = readFileSync(fileURLToPath(new URL("./rb.css", import.meta.url)), "utf8");
const INDEX_HTML = readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf8");
const CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };

function baseState(over: Partial<Record<string, unknown>> = {}): EngineState {
  return {
    tool: "pen",
    eraserMode: "partial",
    canUndo: false,
    canRedo: false,
    pageIndex: 0,
    pageCount: 1,
    selection: [],
    selectionBounds: null,
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
    releaseKeys: vi.fn(),
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
  const board = { engine, stage, activate: vi.fn(), deactivate: vi.fn(), dispose: vi.fn() } as unknown as BoardSession;
  return {
    session: { board, files },
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
    anyDirty: () => false,
    key: vi.fn(() => false),
    quitRequested: vi.fn(async () => undefined),
    dispose: vi.fn(),
  } as unknown as Workspace;
}

const shell = { confirm: vi.fn(async () => true), notify: vi.fn(async () => undefined) } as unknown as ShellPort;
let disposers: (() => void)[] = [];

function renderApp(opts: { tab?: FakeTab; profile?: string } = {}) {
  const tab = opts.tab ?? fakeTab("Sans titre.roomboard");
  const workspace = fakeWorkspace(tab);
  const store = createProfileStore(null, BUILTIN_PROFILES);
  if (opts.profile) store.setActive(opts.profile);
  const active = createActiveProfile(store, CAPS);
  const settings = createSettingsStore(parseSettings("").settings);
  const navigate = vi.fn();
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = render(
    () => <App workspace={workspace} active={active} store={store} settings={settings} notes={["note de démarrage"]} shell={shell} navigate={navigate} />,
    container,
  );
  disposers.push(() => {
    dispose();
    container.remove();
    style.remove();
  });
  return { container, workspace, tab, store, active, settings, navigate };
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
      "page-prev", "page-next", "page-add", "page-remove", "file-new", "file-open", "file-save", "file-save-as", "fit-page", "settings", "profiles"]) {
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
    const bars = [...container.querySelectorAll<HTMLElement>(".rb-bar")];
    expect(bars.length).toBeGreaterThanOrEqual(2);
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
