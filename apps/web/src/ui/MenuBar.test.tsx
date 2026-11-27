// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Toolbar as Bar, ToolItem } from "../toolbar";
import type { ToolbarView } from "./item-state";
import { MENU_LABEL, MenuBar, placeMenu } from "./MenuBar";

afterEach(cleanup);

const action = (id: string, label: string): ToolItem => ({ id, kind: "action", action: id, label, requires: [], rest: {} });
const ITEMS: readonly ToolItem[] = [
  action("file-new", "Nouveau"),
  action("undo", "Annuler"), // grisé : canUndo faux
  { id: "sep-x", kind: "separator", label: "", requires: [], rest: {} },
  action("grid", "Grille"),
  { id: "zone", kind: "dropzone", label: "Déposer ici", requires: [], rest: {} },
  { id: "rect", kind: "tool", tool: "rect", label: "Rectangle", requires: [], rest: {} },
];
const VIEW: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const bar = (dock: Bar["dock"] = "floating"): Bar => ({ id: "menu", role: "menu", dock, collapsed: false, groups: [], rest: {} });

function setup(dock: Bar["dock"] = "floating") {
  const host = { setTool: vi.fn(), runAction: vi.fn() };
  const r = render(() => <MenuBar bar={bar(dock)} items={() => ITEMS} view={() => VIEW} size={() => "m"} host={host} />);
  const toggle = (): HTMLButtonElement => r.container.querySelector<HTMLButtonElement>("[data-menu-toggle]")!;
  const list = (): HTMLElement => r.container.querySelector<HTMLElement>("[data-menu-list]")!;
  const row = (id: string): HTMLButtonElement => list().querySelector<HTMLButtonElement>(`[data-item="${id}"]`)!;
  return { ...r, host, toggle, list, row };
}
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const focused = (): string | null => document.activeElement?.getAttribute("data-item") ?? null;
const key = (k: string, more: KeyboardEventInit = {}): boolean => fireEvent.keyDown(document.activeElement!, { key: k, ...more });

describe("MenuBar (design-l2 L2-6)", () => {
  it("design-l2 L2-6 : bouton Menu (icône menu, aria-haspopup, aria-expanded faux) ; liste fermée, présente dans le DOM", () => {
    const { container, toggle, list } = setup();
    expect(toggle().getAttribute("aria-haspopup")).toBe("menu");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(toggle().getAttribute("aria-label")).toBe(MENU_LABEL);
    expect(toggle().querySelector("svg")?.getAttribute("data-icon")).toBe("menu");
    expect(list().hidden).toBe(true);
    expect(list().getAttribute("role")).toBe("menu");
    expect([...list().querySelectorAll('button[role="menuitem"]')].map((b) => b.getAttribute("data-item"))).toEqual(["file-new", "undo", "grid", "rect"]);
    const root = container.querySelector('[data-toolbar="menu"]')!;
    expect([root.getAttribute("data-role"), root.getAttribute("data-dock"), root.getAttribute("data-size")]).toEqual(["menu", "floating", "m"]);
  });

  it("design-l2 L2-6 : lignes à icône et libellé ; séparateur en filet ; zone de dépôt non rendue ; état par itemState", () => {
    const { list, row } = setup();
    expect(row("file-new").querySelector("svg")?.getAttribute("data-icon")).toBe("file-new");
    expect(row("file-new").querySelector("span:not([data-shortcut])")?.textContent).toBe("Nouveau");
    expect(row("rect").querySelector("svg")?.getAttribute("data-icon")).toBe("rect");
    expect(row("undo").disabled).toBe(true);
    expect(list().querySelectorAll('.rb-menu-sep[role="separator"]')).toHaveLength(1);
    expect(list().querySelector('[data-item="zone"]')).toBeNull();
  });

  it("design-l2 L2-6 : ouvrir : aria-expanded vrai, liste visible, focus sur la première ligne active", async () => {
    const { toggle, list } = setup();
    fireEvent.click(toggle());
    await tick();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(list().hidden).toBe(false);
    expect(focused()).toBe("file-new");
  });

  it("design-l2 L2-6 : flèches bas et haut (bouclage, lignes grisées sautées), Début, Fin", async () => {
    const { toggle } = setup();
    fireEvent.click(toggle());
    await tick();
    key("ArrowDown");
    expect(focused()).toBe("grid");
    key("ArrowDown");
    expect(focused()).toBe("rect");
    key("ArrowDown");
    expect(focused()).toBe("file-new");
    key("ArrowUp");
    expect(focused()).toBe("rect");
    key("Home");
    expect(focused()).toBe("file-new");
    key("End");
    expect(focused()).toBe("rect");
  });

  it("design-l2 L2-6 : Échap ferme et rend le focus au bouton Menu", async () => {
    const { toggle, list } = setup();
    fireEvent.click(toggle());
    await tick();
    key("Escape");
    expect(list().hidden).toBe(true);
    expect(document.activeElement).toBe(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });

  it("design-l2 L2-6 : touches du moteur gardées (Retour arrière, Suppr, Espace, Échap ne remontent pas à window) ; Ctrl+S remonte", async () => {
    const { toggle } = setup();
    const seen: string[] = [];
    const spy = (e: KeyboardEvent): void => void seen.push(`${e.ctrlKey ? "Ctrl+" : ""}${e.key}`);
    window.addEventListener("keydown", spy);
    try {
      fireEvent.click(toggle());
      await tick();
      for (const k of ["Backspace", "Delete", " "]) key(k);
      key("s", { ctrlKey: true });
      key("Escape");
      expect(seen).toEqual(["Ctrl+s"]);
    } finally {
      window.removeEventListener("keydown", spy);
    }
  });

  it("design-l2 L2-6 : choisir une action : runAction, menu fermé ; un outil : setTool", async () => {
    const { toggle, list, row, host } = setup();
    fireEvent.click(toggle());
    await tick();
    fireEvent.click(row("grid"));
    expect(host.runAction).toHaveBeenCalledWith("grid");
    expect(list().hidden).toBe(true);
    fireEvent.click(toggle());
    await tick();
    fireEvent.click(row("rect"));
    expect(host.setTool).toHaveBeenCalledWith("rect");
  });

  it("design-l2 L2-6 : un appui hors du menu le ferme ; un appui dedans, non", async () => {
    const { toggle, list } = setup();
    fireEvent.click(toggle());
    await tick();
    fireEvent.pointerDown(list());
    expect(list().hidden).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(list().hidden).toBe(true);
  });

  it("design-l2 L2-6 : un clic direct sur une ligne d'une liste fermée lance l'action (clics de App.test.tsx)", () => {
    const { row, host } = setup();
    fireEvent.click(row("file-new"));
    expect(host.runAction).toHaveBeenCalledWith("file-new");
  });

  it("design-l2 L2-6 : même rendu en bande", () => {
    const { toggle, list, container } = setup("top");
    expect(container.querySelector('[data-toolbar="menu"]')?.getAttribute("data-dock")).toBe("top");
    expect(toggle()).not.toBeNull();
    expect(list().querySelectorAll('button[role="menuitem"]')).toHaveLength(4);
  });

  it("design-l2 T12 : placeMenu : sous le bouton, au pixel entier, borné à la fenêtre (bande basse ou à droite : au-dessus, calée)", () => {
    const view = { width: 1000, height: 700 };
    const list = { width: 320, height: 300 };
    expect(placeMenu({ left: 16.4, right: 64, top: 16, bottom: 64 }, list, view)).toEqual({ left: 16, top: 72 });
    expect(placeMenu({ left: 900, right: 948, top: 16, bottom: 64 }, list, view)).toEqual({ left: 680, top: 72 });
    expect(placeMenu({ left: 16, right: 64, top: 640, bottom: 688 }, list, view)).toEqual({ left: 16, top: 332 });
    expect(placeMenu({ left: 16, right: 64, top: 10, bottom: 30 }, { width: 320, height: 900 }, view)).toEqual({ left: 16, top: 0 });
  });

  it("design-l2 T12 : en bande, la liste ouverte est en position fixe, dans la fenêtre", async () => {
    const { toggle, list } = setup("bottom");
    vi.spyOn(toggle(), "getBoundingClientRect").mockReturnValue({ left: 900, right: 948, top: 650, bottom: 698, width: 48, height: 48, x: 900, y: 650, toJSON: () => ({}) });
    vi.spyOn(list(), "getBoundingClientRect").mockReturnValue({ left: 0, right: 320, top: 0, bottom: 300, width: 320, height: 300, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.click(toggle());
    await tick();
    const l = parseInt(list().style.left, 10);
    const t = parseInt(list().style.top, 10);
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l + 320).toBeLessThanOrEqual(window.innerWidth);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t + 300).toBeLessThanOrEqual(window.innerHeight);
  });

  it("design-l2 T14 : un choix à la souris ne rend pas le focus au bouton Menu (pas d'infobulle) ; au clavier, si", async () => {
    const { toggle, row } = setup();
    fireEvent.click(toggle());
    await tick();
    fireEvent.pointerDown(row("grid"), { pointerType: "mouse" });
    row("grid").focus();
    fireEvent.click(row("grid"), { detail: 1 });
    await tick();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).not.toBe(toggle());
  });

  it("design-l2 T14 : la liste ouverte est replacée quand la fenêtre change de taille ; plus après fermeture", async () => {
    const { toggle, list } = setup("bottom");
    const anchor = { left: 900, right: 948, top: 650, bottom: 698, width: 48, height: 48, x: 900, y: 650, toJSON: () => ({}) };
    vi.spyOn(toggle(), "getBoundingClientRect").mockImplementation(() => anchor);
    vi.spyOn(list(), "getBoundingClientRect").mockReturnValue({ left: 0, right: 320, top: 0, bottom: 300, width: 320, height: 300, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.click(toggle());
    await tick();
    const before = list().style.left;
    const w = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 700, configurable: true });
    fireEvent(window, new Event("resize"));
    expect(list().style.left).toBe("380px");
    expect(list().style.left).not.toBe(before);
    fireEvent.click(toggle());
    list().style.left = "1px";
    fireEvent(window, new Event("resize"));
    expect(list().style.left).toBe("1px");
    Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  });

  it("design-l2 T12 : le focus qui sort du menu le ferme ; un choix au clavier rend le focus au bouton Menu", async () => {
    const { toggle, list, row } = setup();
    fireEvent.click(toggle());
    await tick();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    row("grid").focus();
    fireEvent.click(row("grid"));
    await tick();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle());
    fireEvent.click(toggle());
    await tick();
    const outside = document.createElement("button");
    document.body.append(outside);
    fireEvent.focusOut(list().querySelector("button")!, { relatedTarget: outside });
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    outside.remove();
  });

  it("raccourci affiché à droite de la ligne", () => {
    const { row } = setup();
    expect(row("file-new").querySelector("[data-shortcut]")?.textContent).toBe("Ctrl+N");
    expect(row("grid").querySelector("[data-shortcut]")).toBeNull();
  });

  it("Tab ferme sans reprendre le focus", async () => {
    const { toggle, list } = setup();
    fireEvent.click(toggle());
    await tick();
    key("Tab");
    expect(list().hidden).toBe(true);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).not.toBe(toggle());
  });
});
