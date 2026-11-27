// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColorPicker } from "./ColorPicker";
import { OPEN_COLOR } from "./open-color";

afterEach(cleanup);

function mount(value: string | null = null) {
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  const choose = vi.fn();
  const close = vi.fn();
  const r = render(() => <ColorPicker value={value} choose={choose} close={close} anchor={anchor} />);
  const cells = (): HTMLElement[] => [...r.container.querySelectorAll<HTMLElement>("[data-color-picker] [role=gridcell]")];
  return { ...r, anchor, choose, close, cells };
}

describe("open-color", () => {
  it("15 teintes de 5 nuances, toutes en #rrggbb", () => {
    expect(OPEN_COLOR).toHaveLength(15);
    for (const row of OPEN_COLOR) {
      expect(row).toHaveLength(5);
      for (const c of row) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it("aucune couleur en double dans la grille", () => {
    const all = OPEN_COLOR.flat();
    expect(new Set(all).size).toBe(all.length);
  });
  it("une couleur courante n'enfonce qu'une seule case", () => {
    const m = render(() => <ColorPicker value="#868e96" choose={() => {}} close={() => {}} anchor={document.body} />);
    expect(m.container.querySelectorAll("[role=gridcell][aria-selected=true]")).toHaveLength(1);
  });
});

describe("ColorPicker (OG11, T16)", () => {
  it("montage : grille de 75 cases, focus sur la première", () => {
    const m = mount();
    expect(m.container.querySelector("[data-color-picker] [role=grid]")).not.toBeNull();
    expect(m.cells()).toHaveLength(75);
    expect(document.activeElement).toBe(m.cells()[0]);
  });
  it("flèches dans la grille : droite d'une case, bas d'une ligne, bornes tenues", () => {
    const m = mount();
    const grid = m.container.querySelector("[role=grid]")!;
    fireEvent.keyDown(m.cells()[0]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(m.cells()[1]);
    fireEvent.keyDown(m.cells()[1]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(m.cells()[6]);
    fireEvent.keyDown(m.cells()[6]!, { key: "ArrowUp" });
    fireEvent.keyDown(m.cells()[1]!, { key: "ArrowLeft" });
    fireEvent.keyDown(m.cells()[0]!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(m.cells()[0]);
    expect(grid).not.toBeNull();
  });
  it("Entrée choisit la case", () => {
    const m = mount();
    fireEvent.keyDown(m.cells()[2]!, { key: "Enter" });
    expect(m.choose).toHaveBeenCalledWith(OPEN_COLOR[0]![2]);
  });
  it("clic choisit la case", () => {
    const m = mount();
    fireEvent.click(m.cells()[7]!);
    expect(m.choose).toHaveBeenCalledWith(OPEN_COLOR[1]![2]);
  });
  it("Échap rend le focus", () => {
    const m = mount();
    fireEvent.keyDown(m.cells()[0]!, { key: "Escape" });
    expect(m.close).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(m.anchor);
  });
  it("hexadécimal invalide refusé", () => {
    const m = mount();
    const input = m.container.querySelector<HTMLInputElement>("input[data-color-hex]")!;
    input.value = "#12345";
    fireEvent.keyDown(input, { key: "Enter" });
    expect(m.choose).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
  it("hexadécimal valide accepté (avec ou sans dièse)", () => {
    const m = mount();
    const input = m.container.querySelector<HTMLInputElement>("input[data-color-hex]")!;
    input.value = "#123456";
    fireEvent.keyDown(input, { key: "Enter" });
    expect(m.choose).toHaveBeenLastCalledWith("#123456");
    input.value = "ABCDEF";
    fireEvent.keyDown(input, { key: "Enter" });
    expect(m.choose).toHaveBeenLastCalledWith("#abcdef");
  });
  it("le champ hexadécimal ne valide pas à la perte du focus (clic sur une case)", () => {
    const m = mount("#1e1e1e");
    const input = m.container.querySelector<HTMLInputElement>("input[data-color-hex]")!;
    input.focus();
    m.cells()[3]!.focus();
    fireEvent.blur(input);
    expect(m.choose).not.toHaveBeenCalled();
    expect(m.close).not.toHaveBeenCalled();
  });
  it("Maj+Tab depuis le champ ne choisit rien", () => {
    const m = mount("#1e1e1e");
    const input = m.container.querySelector<HTMLInputElement>("input[data-color-hex]")!;
    input.focus();
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    fireEvent.blur(input);
    expect(m.choose).not.toHaveBeenCalled();
  });
  it("la case de la valeur courante est enfoncée", () => {
    const m = mount(OPEN_COLOR[3]![4]);
    expect(m.cells()[19]!.getAttribute("aria-selected")).toBe("true");
  });
});

describe("ColorPicker transparent (OG23, T5)", () => {
  it("Transparent dans le sélecteur", () => {
    const choose = vi.fn();
    const m = render(() => <ColorPicker value={null} transparent choose={choose} close={() => {}} anchor={document.body} />);
    const t = m.container.querySelector("[data-color-transparent]")!;
    expect(t).not.toBeNull();
    fireEvent.click(t);
    expect(choose).toHaveBeenCalledWith(null);
    m.unmount();
    const off = render(() => <ColorPicker value={null} choose={() => {}} close={() => {}} anchor={document.body} />);
    expect(off.container.querySelector("[data-color-transparent]")).toBeNull();
  });
  it("75 cellules de grille avec la case Transparent", () => {
    const m = render(() => <ColorPicker value={null} transparent choose={() => {}} close={() => {}} anchor={document.body} />);
    expect(m.container.querySelectorAll("[role=gridcell]")).toHaveLength(75);
    expect(m.container.querySelectorAll(".rb-color-cell")).toHaveLength(75);
  });
});
