// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageLayout } from "../core/api";
import type { ToolbarHost } from "../app/toolbar-host";
import type { RuntimeCapabilities, Toolbar, ToolItem } from "../toolbar";
import type { ToolbarView } from "./item-state";
import type { LayerRow } from "../app/layer-list";
import { SideBar, type LayersPort, type PagesPort } from "./SideBar";

const item = (action: string): ToolItem => ({ id: action, kind: "action", action, label: action, requires: [], rest: {} });
const bar: Toolbar = {
  id: "pages",
  role: "pages",
  dock: "floating",
  collapsed: false,
  groups: [{ id: "pages", items: ["page-prev", "page-number", "page-next", "page-add", "page-duplicate", "page-remove"].map(item), rest: {} }],
  rest: {},
};
const IDS = ["a", "b", "c"];
const ROW = 100;
const view = (over: Partial<ToolbarView> = {}): ToolbarView => ({ tool: "pen", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 3, ...over });

const CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };

function setup(o: { collapsed?: boolean; fixed?: boolean; layout?: PageLayout; thumb?: "s" | "m" | "l"; bar?: Toolbar; caps?: RuntimeCapabilities } = {}) {
  const [shown, setShown] = createSignal("a");
  const [layout, setLayout] = createSignal<PageLayout>(o.layout ?? "landscape");
  const [fixed] = createSignal(o.fixed ?? false);
  const pages = {
    ids: () => IDS,
    shown,
    layout,
    fixedByBackdrop: fixed,
    show: vi.fn((id: string) => setShown(id)),
    move: vi.fn(),
    duplicate: vi.fn(),
    remove: vi.fn(),
    addAfter: vi.fn(),
    setLayout: vi.fn((m: PageLayout) => setLayout(m)),
    thumb: vi.fn(async () => "blob:vignette"),
  } satisfies PagesPort;
  const host = { runAction: vi.fn() } as unknown as ToolbarHost;
  const store = { sidebar: vi.fn(() => ({ tab: "pages" as const, thumb: o.thumb ?? ("m" as const) })), setSidebar: vi.fn() };
  const expand = vi.fn();
  const r = render(() => <SideBar bar={o.bar ?? bar} collapsed={() => o.collapsed ?? false} caps={() => o.caps ?? CAPS} expand={expand} view={() => view()} host={host} pages={pages} store={store} />);
  const thumbs = (): HTMLButtonElement[] => [...r.container.querySelectorAll<HTMLButtonElement>(".rb-pages-list [data-page]")];
  // happy-dom ne calcule aucune mise en page : rectangles posés à la main (ligne i : [i × 100, i × 100 + 100[).
  thumbs().forEach((b, i) => {
    b.getBoundingClientRect = () => new DOMRect(0, i * ROW, 160, ROW);
    b.setPointerCapture = vi.fn();
    b.releasePointerCapture = vi.fn();
  });
  const list = r.container.querySelector<HTMLElement>(".rb-pages-list")!;
  Object.defineProperty(list, "scrollTop", { get: () => 0, set: () => undefined });
  list.getBoundingClientRect = () => new DOMRect(0, 0, 160, 3 * ROW);
  return { ...r, pages, host, store, thumbs, expand };
}
const ptr = (type: string, y: number, pointerType = "mouse"): PointerEvent => {
  const e = new PointerEvent(type, { clientX: 20, clientY: y, pointerId: 1, bubbles: true });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  return e;
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("SideBar (T10)", () => {
  it("repliée : onglet Pages visible, page-add dans le DOM mais caché ; aucun onglet Calques", () => {
    const { container } = setup({ collapsed: true });
    const tab = container.querySelector('[role="tablist"] [role="tab"][data-side-tab="pages"]')!;
    expect(tab.textContent).toContain("Pages");
    expect(tab.querySelector('[data-icon="dock-left"]')).not.toBeNull();
    expect(tab.closest("[hidden]")).toBeNull();
    const add = container.querySelector('[data-item="page-add"]')!;
    expect(add.closest("[hidden]")).not.toBeNull();
    expect(container.querySelector(".rb-pages-list")!.closest("[hidden]")).not.toBeNull();
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(1);
    expect(container.querySelector('[data-side-tab="calques"]')).toBeNull();
    // T16 : l'onglet latéral n'est pas un onglet de carnet (`[data-tab]` reste aux onglets de TabsBar).
    expect(container.querySelector("[data-tab]")).toBeNull();
    expect(container.querySelector('[data-toolbar="pages"]')).not.toBeNull();
    // la rangée d'actions n'a ni Précédente, ni numéro, ni Suivante (elles sont dans la barre d'outils)
    for (const id of ["page-prev", "page-number", "page-next"]) expect(container.querySelector(`[data-item="${id}"]`), id).toBeNull();
  });

  it("dépliée : une action lance l'hôte ; miniatures data-page 1..N, data-page-id, aria-current sur la montrée ; toucher appelle show", () => {
    const { container, host, pages, thumbs } = setup();
    expect(container.querySelector('[data-item="page-add"]')!.closest("[hidden]")).toBeNull();
    fireEvent.click(container.querySelector('[data-item="page-duplicate"]')!);
    expect(host.runAction).toHaveBeenCalledWith("page-duplicate");
    expect(thumbs().map((b) => b.getAttribute("data-page"))).toEqual(["1", "2", "3"]);
    expect(thumbs().map((b) => b.getAttribute("data-page-id"))).toEqual(IDS);
    expect(thumbs()[0]!.getAttribute("aria-current")).toBe("page");
    expect(thumbs()[1]!.hasAttribute("aria-current")).toBe(false);
    thumbs()[1]!.dispatchEvent(ptr("pointerdown", 150));
    thumbs()[1]!.dispatchEvent(ptr("pointerup", 150));
    expect(pages.show).toHaveBeenCalledWith("b");
    expect(thumbs()[1]!.getAttribute("aria-current")).toBe("page");
    fireEvent.click(thumbs()[2]!); // clavier (Entrée, Espace) : détail 0
    expect(pages.show).toHaveBeenLastCalledWith("c");
  });

  it("glisser la miniature 3 au-dessus de la 1 : move(3e id, 0), aux événements de pointeur, aucun dragstart", () => {
    const { thumbs, pages, container } = setup();
    const third = thumbs()[2]!;
    expect(third.hasAttribute("draggable")).toBe(false);
    expect(container.querySelector("[draggable]")).toBeNull();
    third.dispatchEvent(ptr("pointerdown", 250));
    third.dispatchEvent(ptr("pointermove", 20));
    third.dispatchEvent(ptr("pointerup", 20));
    expect(pages.move).toHaveBeenCalledWith("c", 0);
    expect(pages.show).not.toHaveBeenCalled();
  });

  it("appui long 500 ms : menu Insérer une page après / Dupliquer / Retirer / Monter / Descendre", () => {
    const { thumbs, pages, container } = setup();
    thumbs()[1]!.dispatchEvent(ptr("pointerdown", 150, "touch"));
    vi.advanceTimersByTime(499);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    vi.advanceTimersByTime(1);
    const menu = container.querySelector('[role="menu"]')!;
    expect([...menu.querySelectorAll('[role="menuitem"]')].map((b) => b.getAttribute("data-menu"))).toEqual(["add-after", "duplicate", "remove", "up", "down"]);
    expect([...menu.querySelectorAll('[role="menuitem"]')].map((b) => b.textContent)).toEqual(["Insérer une page après", "Dupliquer", "Retirer", "Monter", "Descendre"]);
    thumbs()[1]!.dispatchEvent(ptr("pointerup", 150, "touch"));
    expect(pages.show).not.toHaveBeenCalled(); // l'appui long n'est pas un toucher
    fireEvent.click(menu.querySelector('[data-menu="duplicate"]')!);
    expect(pages.duplicate).toHaveBeenCalledWith("b");
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("appui long relâché avant 500 ms ou déplacé : pas de menu ; Monter et Descendre déplacent d'un rang", () => {
    const { thumbs, pages, container } = setup();
    thumbs()[1]!.dispatchEvent(ptr("pointerdown", 150, "touch"));
    vi.advanceTimersByTime(300);
    thumbs()[1]!.dispatchEvent(ptr("pointerup", 150, "touch"));
    vi.advanceTimersByTime(500);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    fireEvent.contextMenu(thumbs()[1]!);
    fireEvent.click(container.querySelector('[data-menu="up"]')!);
    expect(pages.move).toHaveBeenCalledWith("b", 0);
    fireEvent.contextMenu(thumbs()[1]!);
    fireEvent.click(container.querySelector('[data-menu="down"]')!);
    expect(pages.move).toHaveBeenLastCalledWith("b", 2);
  });

  it("clavier : Ctrl+↓ move +1, Suppr remove et propagation arrêtée, ↑↓ focus voisine, Échap rend le focus", () => {
    const stage = document.createElement("div");
    stage.className = "rb-stage";
    stage.tabIndex = -1;
    document.body.append(stage);
    const { thumbs, pages } = setup();
    const [a, b] = thumbs();
    a!.focus();
    const seen = vi.fn();
    window.addEventListener("keydown", seen);
    fireEvent.keyDown(a!, { key: "ArrowDown", ctrlKey: true });
    expect(pages.move).toHaveBeenCalledWith("a", 1);
    fireEvent.keyDown(a!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(b);
    const del = new KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true });
    b!.dispatchEvent(del);
    expect(pages.remove).toHaveBeenCalledWith("b");
    expect(del.defaultPrevented).toBe(true);
    expect(seen.mock.calls.some((c) => (c[0] as KeyboardEvent).key === "Delete")).toBe(false);
    fireEvent.keyDown(b!, { key: "Escape" });
    expect(thumbs().includes(document.activeElement as HTMLButtonElement)).toBe(false);
    window.removeEventListener("keydown", seen);
  });

  it("segments Mode : portrait appelle setLayout ; PDF fixé : infobulle « cadre fixé par le fond PDF »", () => {
    const a = setup();
    const modes = a.container.querySelector('[data-edit="page-mode"]')!;
    expect([...modes.querySelectorAll("[data-choice]")].map((x) => x.getAttribute("data-choice"))).toEqual(["landscape", "portrait", "infinite"]);
    expect(modes.querySelector('[data-icon="rectangle-vertical"]')).not.toBeNull();
    fireEvent.click(modes.querySelector('[data-choice="portrait"]')!);
    expect(a.pages.setLayout).toHaveBeenCalledWith("portrait");
    expect(a.container.querySelector("[data-side-mode]")!.hasAttribute("title")).toBe(false);
    cleanup();
    const b = setup({ fixed: true });
    expect(b.container.querySelector("[data-side-mode]")!.getAttribute("title")).toBe("Cadre fixé par le fond PDF");
  });

  it("taille Grandes : miniatures pleine largeur utile (tampon × devicePixelRatio) et setSidebar appelé", async () => {
    const dpr = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    const { container, pages, store } = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(pages.thumb).toHaveBeenCalledWith("a", 440); // moyennes : 220 px CSS (largeur minimale, rien de mesuré)
    pages.thumb.mockClear();
    fireEvent.click(container.querySelector('[data-edit="page-thumb"] [data-choice="l"]')!);
    expect(store.setSidebar).toHaveBeenCalledWith({ tab: "pages", thumb: "l" });
    expect(container.querySelector<HTMLElement>(".rb-pages-list")!.getAttribute("data-thumb")).toBe("l");
    await vi.advanceTimersByTimeAsync(0);
    expect(pages.thumb).toHaveBeenCalledWith("a", 560);
    expect(container.querySelector<HTMLElement>(".rb-pages-list")!.style.getPropertyValue("--rb-thumb")).toBe("280px");
    expect(container.querySelector('[data-page="1"] img')?.getAttribute("src")).toBe("blob:vignette");
    Object.defineProperty(window, "devicePixelRatio", { value: dpr, configurable: true });
  });

  it("miniatures : la colonne de l'image prend toute la place de la ligne, l'image toute la colonne", () => {
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    const rule = (sel: string): string => css.split("\n").find((l) => l.startsWith(`${sel} {`)) ?? "";
    expect(rule(".rb-side .rb-page-thumb")).toMatch(/grid-template-columns: 24px minmax\(0, 1fr\)/);
    expect(rule(".rb-page-img")).toMatch(/inline-size: 100%;/);
    expect(rule(".rb-page-img")).toMatch(/contain: inline-size/); // l'image (tampon au dpr) ne dicte pas la largeur du panneau
    expect(rule(".rb-pages-list")).toMatch(/min-inline-size: calc\(var\(--rb-thumb\) \+ 40px\)/);
    expect(rule(".rb-page-img img")).toMatch(/inline-size: 100%; block-size: auto/);
  });

  it("miniatures : toutes les pages demandent la même largeur de tampon, tirée de la largeur mesurée de la liste", async () => {
    const dpr = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    const spy = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(340);
    const { pages } = setup({ thumb: "l" });
    await vi.advanceTimersByTimeAsync(0);
    spy.mockRestore();
    expect(pages.thumb.mock.calls.map((c) => (c as unknown as [string, number])[1])).toEqual([600, 600, 600]); // (340 − 40) × 2; thumb l = 280 au minimum
    Object.defineProperty(window, "devicePixelRatio", { value: dpr, configurable: true });
  });

  it("miniatures : un changement de mode de la page redessine ses miniatures", async () => {
    const { pages } = setup();
    await vi.advanceTimersByTimeAsync(0);
    pages.thumb.mockClear();
    pages.setLayout("portrait");
    await vi.advanceTimersByTimeAsync(0);
    expect(pages.thumb).toHaveBeenCalled();
  });

  it("cibles ≥ 44 px : miniatures, onglet, segments, menu de page lus dans rb.css", () => {
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    const rule = (sel: string): string => css.split("\n").find((l) => l.startsWith(`${sel} {`)) ?? "";
    expect(rule(".rb-side .rb-page-thumb")).toMatch(/min-block-size: var\(--rb-btn-s\)/);
    expect(rule(".rb-side .rb-tab")).toMatch(/min-block-size: var\(--rb-btn-s\)/);
    expect(rule(".rb-side-menu button")).toMatch(/min-block-size: var\(--rb-btn-s\)/);
    expect(css).toMatch(/--rb-btn-s: 44px/);
    expect(css).not.toMatch(/\.rb-side[^{]*\{[^}]*\b48px/);
  });
});

describe("SideBar — correctifs de relecture (T19)", () => {
  it("barre repliée : toucher l'onglet Pages (clic ou Entrée) déplie la barre ; dépliée : aucun appel", () => {
    const folded = setup({ collapsed: true });
    fireEvent.click(folded.container.querySelector('[data-side-tab="pages"]')!);
    expect(folded.expand).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(folded.container.querySelector('[data-side-tab="pages"]')!, { key: "Enter" });
    expect(folded.expand).toHaveBeenCalledTimes(2);
    cleanup();
    const open = setup({ collapsed: false });
    fireEvent.click(open.container.querySelector('[data-side-tab="pages"]')!);
    expect(open.expand).not.toHaveBeenCalled();
  });

  it("la rangée d'actions passe par visibleItems : action `requires` non satisfaite ou inconnue absente, satisfaite présente", () => {
    const gated: ToolItem = { ...item("annotation"), requires: ["desktopAnnotation"] };
    const b: Toolbar = { ...bar, groups: [{ id: "pages", items: [item("page-add"), gated, item("action-d-un-profil-plus-recent")], rest: {} }] };
    const without = setup({ bar: b });
    const ids = (c: HTMLElement): string[] => [...c.querySelectorAll<HTMLElement>(".rb-side-actions [data-item]")].map((e) => e.dataset["item"]!);
    expect(ids(without.container)).toEqual(["page-add"]);
    cleanup();
    const withCap = setup({ bar: b, caps: { ...CAPS, desktopAnnotation: true } });
    expect(ids(withCap.container)).toEqual(["page-add", "annotation"]);
  });

  it("Échap rend le focus à la scène depuis un onglet, un segment ou une action", () => {
    const stage = document.createElement("div");
    stage.className = "rb-stage";
    stage.tabIndex = -1;
    document.body.append(stage);
    const { container } = setup();
    const targets = [
      container.querySelector<HTMLElement>('[data-side-tab="pages"]')!,
      container.querySelector<HTMLElement>('[data-side-mode] input, [data-side-mode] button')!,
      container.querySelector<HTMLElement>('[data-item="page-add"]')!,
    ];
    for (const t of targets) {
      t.focus();
      fireEvent.keyDown(t, { key: "Escape" });
      expect(document.activeElement, t.outerHTML.slice(0, 60)).toBe(stage);
      stage.blur();
    }
  });
});

describe("SideBar — onglet Calques (T14)", () => {
  const ROWS: readonly LayerRow[] = [
    { key: "c", ids: ["c"], label: "Texte : Bonjour", kind: "text", fixed: false, icon: "text" },
    { key: "group:g", ids: ["a", "b"], label: "Groupe (2)", kind: "group", fixed: false, icon: "layers" },
    { key: "grid", ids: [], label: "Grille", kind: "grid", fixed: true, icon: "grid" },
    { key: "backdrop", ids: [], label: "Fond de la page", kind: "backdrop", fixed: true, icon: "rectangle-horizontal" },
  ];
  function withLayers(o: { selected?: readonly string[]; collapsed?: boolean } = {}) {
    const base = setup({ collapsed: o.collapsed ?? false });
    cleanup();
    const [selected, setSelected] = createSignal<readonly string[]>(o.selected ?? []);
    const rows = vi.fn(() => ROWS);
    const layers = { rows, selected, select: vi.fn((ids: readonly string[]) => setSelected(ids)), drop: vi.fn() } satisfies LayersPort;
    const host = { runAction: vi.fn() } as unknown as ToolbarHost;
    const store = { sidebar: vi.fn(() => ({ tab: "pages" as const, thumb: "m" as const })), setSidebar: vi.fn() };
    const r = render(() => <SideBar bar={bar} collapsed={() => o.collapsed ?? false} caps={() => CAPS} view={() => view()} host={host} pages={base.pages} layers={layers} store={store} />);
    const lines = (): HTMLElement[] => [...r.container.querySelectorAll<HTMLElement>(".rb-layers-list [data-layer]")];
    const movable = (): HTMLElement[] => lines().filter((l) => !l.hasAttribute("data-fixed"));
    const list = r.container.querySelector<HTMLElement>(".rb-layers-list")!;
    Object.defineProperty(list, "scrollTop", { get: () => 0, set: () => undefined });
    list.getBoundingClientRect = () => new DOMRect(0, 0, 160, 4 * ROW);
    const tab = (): HTMLElement => r.container.querySelector<HTMLElement>('[data-side-tab="calques"]')!;
    /** Montre l'onglet, puis pose les rectangles que happy-dom ne calcule pas (ligne i : [i × 100, i × 100 + 100[). */
    const open = (): void => {
      fireEvent.click(tab());
      movable().forEach((b, i) => {
        b.getBoundingClientRect = () => new DOMRect(0, i * ROW, 160, ROW);
        b.setPointerCapture = vi.fn();
        b.releasePointerCapture = vi.fn();
      });
    };
    return { ...r, layers, store, lines, movable, tab, rows, open };
  }

  it("onglet Calques : icône layers, Pages d'abord ; toucher l'onglet montre la liste, cache les miniatures, retient l'onglet", () => {
    const { container, tab, store } = withLayers();
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(tab().textContent).toContain("Calques");
    expect(tab().querySelector('[data-icon="layers"]')).not.toBeNull();
    expect(tab().getAttribute("aria-selected")).toBe("false");
    expect(container.querySelector('[data-side-tab="pages"]')!.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(".rb-layers-list")!.closest("[hidden]")).not.toBeNull();
    fireEvent.click(tab());
    expect(tab().getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector('[data-side-tab="pages"]')!.getAttribute("aria-selected")).toBe("false");
    expect(container.querySelector(".rb-layers-list")!.closest("[hidden]")).toBeNull();
    expect(container.querySelector(".rb-pages-list")!.closest("[hidden]")).not.toBeNull();
    expect(store.setSidebar).toHaveBeenLastCalledWith({ tab: "calques", thumb: "m" });
    expect(container.querySelector('[data-item="page-add"]')!.closest("[hidden]")).not.toBeNull();
  });

  it("lignes : premier plan en haut, un groupe = une ligne, lignes fixes marquées ; calculées seulement onglet montré", () => {
    const { container, tab, lines, rows } = withLayers();
    expect(rows).not.toHaveBeenCalled();
    fireEvent.click(tab());
    expect(lines().map((l) => l.textContent)).toEqual(["Texte : Bonjour", "Groupe (2)", "Grille", "Fond de la page"]);
    expect(lines().map((l) => l.hasAttribute("data-fixed"))).toEqual([false, false, true, true]);
    expect(container.querySelector(".rb-layers-list")!.hasAttribute("draggable")).toBe(false);
    expect(container.querySelector("[draggable]")).toBeNull();
  });

  it("toucher une ligne sélectionne ses ids ; Ctrl+toucher ajoute, puis retire ; une ligne fixe ne fait rien", () => {
    const { open, movable, lines, layers } = withLayers();
    open();
    const [text, group] = movable();
    text!.dispatchEvent(ptr("pointerdown", 50));
    text!.dispatchEvent(ptr("pointerup", 50));
    expect(layers.select).toHaveBeenLastCalledWith(["c"]);
    const ctrl = (el: HTMLElement): void => {
      const d = ptr("pointerdown", 150);
      Object.defineProperty(d, "ctrlKey", { value: true });
      el.dispatchEvent(d);
      el.dispatchEvent(ptr("pointerup", 150));
    };
    ctrl(group!);
    expect(layers.select).toHaveBeenLastCalledWith(["c", "a", "b"]);
    ctrl(group!);
    expect(layers.select).toHaveBeenLastCalledWith(["c"]);
    expect(text!.getAttribute("aria-pressed")).toBe("true");
    const n = vi.mocked(layers.select).mock.calls.length;
    fireEvent.click(lines()[2]!);
    expect(layers.select).toHaveBeenCalledTimes(n);
  });

  it("clavier : Entrée ou Espace (clic de détail 0) sélectionne ; ↑ ↓ déplacent le focus ; Ctrl+↑ ↓ ne sont pas pris (vont au moteur)", () => {
    const { tab, movable, layers } = withLayers();
    fireEvent.click(tab());
    const [text, group] = movable();
    text!.focus();
    fireEvent.click(text!);
    expect(layers.select).toHaveBeenLastCalledWith(["c"]);
    fireEvent.keyDown(text!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(group);
    const seen = vi.fn();
    window.addEventListener("keydown", seen);
    fireEvent.keyDown(group!, { key: "ArrowUp", ctrlKey: true });
    expect(seen).toHaveBeenCalledTimes(1);
    window.removeEventListener("keydown", seen);
  });

  it("glisser la ligne du groupe au-dessus du texte : drop(clé, 0), aux événements de pointeur, sans toucher", () => {
    const { open, movable, layers } = withLayers();
    open();
    const group = movable()[1]!;
    group.dispatchEvent(ptr("pointerdown", 150));
    group.dispatchEvent(ptr("pointermove", 20));
    group.dispatchEvent(ptr("pointerup", 20));
    expect(layers.drop).toHaveBeenCalledWith("group:g", 0);
    expect(layers.select).not.toHaveBeenCalled();
  });

  it("la sélection de la scène surligne ses lignes (aria-pressed) ; cibles ≥ 44 px lues dans rb.css", () => {
    const { tab, movable } = withLayers({ selected: ["a", "b"] });
    fireEvent.click(tab());
    expect(movable().map((l) => l.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    const rule = (sel: string): string => css.split("\n").find((l) => l.startsWith(`${sel} {`)) ?? "";
    expect(rule(".rb-side .rb-layer")).toMatch(/min-block-size: var\(--rb-btn-s\)/);
  });
});
