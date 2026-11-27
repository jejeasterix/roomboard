// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createCellMenu } from "./cell-menu";

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
});
