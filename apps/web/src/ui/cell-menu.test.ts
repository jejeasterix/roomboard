// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createCellMenu, placeCellMenu } from "./cell-menu";

describe("menu de case (cell-menu, personnalisation-3 T7)", () => {
  it("cell-menu : ouvre un menu dont les boutons font au moins 44 px ; clic : l'action part et le menu se ferme", () => {
    const run = vi.fn();
    const menu = createCellMenu(document.body);
    menu.open(10, 20, [{ id: "fit", label: "Rétrécir", run }]);
    const root = document.body.querySelector<HTMLElement>('div[role="menu"].rb-cell-menu');
    expect(root).not.toBeNull();
    expect(root?.hidden).toBe(false);
    const b = root?.querySelector<HTMLButtonElement>("button");
    expect(b?.style.minHeight).toBe("44px");
    expect(b?.textContent).toContain("Rétrécir");
    b?.click();
    expect(run).toHaveBeenCalledTimes(1);
    expect(root?.hidden).toBe(true);
  });

  it("cell-menu : Échap ferme sans lancer l'action", () => {
    const run = vi.fn();
    const menu = createCellMenu(document.body);
    menu.open(0, 0, [{ id: "fit", label: "Rétrécir", run }]);
    const root = document.body.querySelector<HTMLElement>(".rb-cell-menu");
    root?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root?.hidden).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  const items3 = [
    { id: "fit", label: "Rétrécir", run: () => undefined },
    { id: "cell-image", label: "Mettre en fond", run: () => undefined },
    { id: "unplace", label: "Sortir", run: () => undefined },
  ] as const;
  const key = (root: HTMLElement | null | undefined, k: string, o: KeyboardEventInit = {}): KeyboardEvent => {
    const ev = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...o });
    (document.activeElement ?? root)?.dispatchEvent(ev);
    return ev;
  };

  it("cell-menu : l'écouteur d'appui du document n'existe que menu ouvert ; destroy le retire et retire la racine", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const menu = createCellMenu(document.body);
    expect(add.mock.calls.filter((c) => c[0] === "pointerdown")).toHaveLength(0);
    menu.open(0, 0, items3);
    expect(add.mock.calls.filter((c) => c[0] === "pointerdown")).toHaveLength(1);
    menu.close();
    expect(remove.mock.calls.filter((c) => c[0] === "pointerdown")).toHaveLength(1);
    menu.open(0, 0, items3);
    menu.destroy();
    expect(remove.mock.calls.filter((c) => c[0] === "pointerdown")).toHaveLength(2);
    expect(menu.element.isConnected).toBe(false);
    add.mockRestore();
    remove.mockRestore();
  });

  it("cell-menu : aria-label, flèches bas et haut avec bouclage", () => {
    const menu = createCellMenu(document.body);
    menu.open(0, 0, items3);
    expect(menu.element.getAttribute("aria-label")).toBe("Actions de la case");
    const names = (): string | undefined => (document.activeElement as HTMLElement | null)?.dataset["menuItem"];
    expect(names()).toBe("fit");
    key(menu.element, "ArrowDown");
    expect(names()).toBe("cell-image");
    key(menu.element, "ArrowUp");
    key(menu.element, "ArrowUp");
    expect(names()).toBe("unplace");
    key(menu.element, "ArrowDown");
    expect(names()).toBe("fit");
    menu.destroy();
  });

  it("cell-menu : Échap rend le focus à l'élément d'avant ; Tab ferme sans le rendre ; Ctrl+Z n'est pas avalé", () => {
    const before = document.createElement("button");
    document.body.append(before);
    before.focus();
    const menu = createCellMenu(document.body);
    menu.open(0, 0, items3);
    key(menu.element, "Escape");
    expect(menu.element.hidden).toBe(true);
    expect(document.activeElement).toBe(before);
    menu.open(0, 0, items3);
    key(menu.element, "Tab");
    expect(menu.element.hidden).toBe(true);
    menu.open(0, 0, items3);
    const seen = vi.fn();
    document.addEventListener("keydown", seen);
    key(menu.element, "z", { ctrlKey: true });
    key(menu.element, "x");
    document.removeEventListener("keydown", seen);
    expect(seen).toHaveBeenCalledTimes(1);
    menu.destroy();
    before.remove();
  });

  it("cell-menu : icônes en 24 px aux bouts ronds (comme Icon)", () => {
    const menu = createCellMenu(document.body);
    menu.open(0, 0, items3);
    const svg = menu.element.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("stroke-linecap")).toBe("round");
    expect(svg?.getAttribute("stroke-linejoin")).toBe("round");
    menu.destroy();
  });

  it("placeCellMenu : borné au conteneur, au-dessus du point quand il manque la place dessous", () => {
    const menu = { width: 160, height: 100 };
    const host = { width: 400, height: 300 };
    expect(placeCellMenu(50, 60, menu, host)).toEqual({ left: 50, top: 60 });
    expect(placeCellMenu(390, 60, menu, host)).toEqual({ left: 240, top: 60 });
    expect(placeCellMenu(50, 290, menu, host)).toEqual({ left: 50, top: 190 });
    expect(placeCellMenu(-5, 10, { width: 160, height: 500 }, host)).toEqual({ left: 0, top: 0 });
  });

  it("cell-menu : une touche Alt passée au document ferme le menu (libellé périmé)", () => {
    const menu = createCellMenu(document.body);
    menu.open(0, 0, [{ id: "fit", label: "Rétrécir", run: () => undefined }]);
    const root = [...document.body.querySelectorAll<HTMLElement>(".rb-cell-menu")].at(-1);
    expect(root?.hidden).toBe(false);
    root?.querySelector("button")?.dispatchEvent(new KeyboardEvent("keydown", { key: "f", altKey: true, bubbles: true }));
    expect(root?.hidden).toBe(true);
  });
});
