// @vitest-environment happy-dom
import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { TableCellState } from "../engine/table-geom";
import { TableSection, type TableSectionKey } from "./TableOptions";

const cell = (over: Partial<TableCellState> = {}): TableCellState => ({ id: "t", row: 0, col: 0, rows: 3, cols: 3, ha: "left", va: "top", border: null, ...over });
/** Cible d'au moins 44 px : chaque bouton est un `rb-opt-btn` ou une pastille `rb-pick` (`--rb-btn-size`), ou un
 *  segment d'un groupe `data-look="segment"` ; au moins un bouton par section. */
const targets = (root: HTMLElement): void => {
  const buttons = [...root.querySelectorAll<HTMLElement>('button, [role="radio"]')];
  expect(buttons.length).toBeGreaterThan(0);
  for (const b of buttons) {
    const sized = b.classList.contains("rb-opt-btn") || b.classList.contains("rb-pick") || b.closest('[data-look="segment"]') !== null;
    expect(sized, b.outerHTML.slice(0, 120)).toBe(true);
  }
};
const mount = (section: TableSectionKey, c: TableCellState) => {
  const host = { act: vi.fn(), look: vi.fn() };
  const r = render(() => <TableSection section={section} cell={() => c} host={host} picks={() => [{ color: "#000000", label: "Noir" }, { color: "#dc2626", label: "Rouge" }]} />);
  return { ...r, host };
};
describe("TableOptions (DS10)", () => {
  it("DS10 : Alignement : « Centré » puis « Au milieu » : deux look ; l'alignement courant est enfoncé", () => {
    const { container, host } = mount("tableAlign", cell({ ha: "right" }));
    const right = container.querySelector('[data-option-value="right"]');
    expect(right?.getAttribute("aria-checked") ?? right?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelector('[data-option-value="center"]')!);
    fireEvent.click(container.querySelector('[data-option-value="middle"]')!);
    expect(host.look.mock.calls.map((c) => c[0])).toEqual([{ key: "ha", value: "center" }, { key: "va", value: "middle" }]);
  });
  it("DS10 : Bordures : pastille rouge, « Épais », « Tirets » : chaque appui garde les deux autres réglages", () => {
    const { container, host } = mount("tableBorder", cell({ border: ["#000000", 2, "solid"] }));
    fireEvent.click(container.querySelector('[data-table-border-color="#dc2626"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#dc2626", 2, "solid"] });
    fireEvent.click(container.querySelector('[data-option-value="8"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#000000", 8, "solid"] });
    fireEvent.click(container.querySelector('[data-option-value="dashed"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#000000", 2, "dashed"] });
  });
  it("DS10 : Bordures : « Aucune bordure » et « Par défaut »", () => {
    const { container, host } = mount("tableBorder", cell({ border: ["#dc2626", 8, "dashed"] }));
    fireEvent.click(container.querySelector('[data-option-value="none"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#dc2626", 8, "none"] });
    fireEvent.click(container.querySelector("[data-table-border-default]")!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: null });
  });
  it("DS10 : Objets : Rétrécir (fit-toggle) seulement s'il change ; Ajuster au contenu (fit-content)", () => {
    const { container, host } = mount("tableObjects", cell());
    fireEvent.click(container.querySelector('[data-option-value="grow"]')!);
    expect(host.act).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('[data-option-value="shrink"]')!);
    fireEvent.click(container.querySelector('[data-table-option="fit-content"]')!);
    expect(host.act.mock.calls.map((c) => c[0])).toEqual(["fit-toggle", "fit-content"]);
  });
  it("DS10 : Lignes : Trier croissant et décroissant (act sort-asc, sort-desc)", () => {
    const { container, host } = mount("tableRows", cell());
    fireEvent.click(container.querySelector('[data-table-option="sort-asc"]')!);
    fireEvent.click(container.querySelector('[data-table-option="sort-desc"]')!);
    expect(host.act.mock.calls.map((c) => c[0])).toEqual(["sort-asc", "sort-desc"]);
  });
  it("DS10 : Lignes : En-tête est un interrupteur (aria-checked) qui bascule", () => {
    const { container, host } = mount("tableRows", cell({ header: true }));
    const b = container.querySelector('[data-table-option="header"]')!;
    expect(b.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(b);
    expect(host.act).toHaveBeenCalledWith("header-toggle");
  });
  it("DS10 : chaque geste porte son raccourci (aria-keyshortcuts) et sa cible d'au moins 44 px (classe rb-opt-btn ou segment)", () => {
    const o = mount("tableObjects", cell());
    expect(o.container.querySelector('[data-table-option="fit-content"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+A");
    // Alt+F bascule : annoncé par le groupe, aucun segment (il ne pose pas exactement sa valeur).
    expect(o.container.querySelector('[data-edit="tableFit"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+F");
    expect(o.container.querySelectorAll('[data-edit="tableFit"] [aria-keyshortcuts]').length).toBe(0);
    targets(o.container);
    o.unmount();
    const a = mount("tableAlign", cell());
    expect(a.container.querySelector('[data-edit="tableHa"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+C");
    expect(a.container.querySelector('[data-edit="tableVa"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+M");
    targets(a.container);
    a.unmount();
    const b = mount("tableBorder", cell({ border: ["#000000", 2, "solid"] }));
    expect(b.container.querySelector('[data-option-value="none"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+B");
    // Alt+B pose une bordure, pas la couleur de la pastille : annoncé par le groupe des pastilles, aucune pastille.
    expect(b.container.querySelector('[role="group"][aria-label="Couleur de la bordure"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+B");
    expect(b.container.querySelector('[data-table-border-color="#dc2626"]')?.hasAttribute("aria-keyshortcuts")).toBe(false);
    expect(b.container.querySelector('[data-table-border-color="#dc2626"]')?.classList.contains("rb-pick")).toBe(true);
    targets(b.container);
    b.unmount();
    const r = mount("tableRows", cell());
    expect(r.container.querySelector('[data-table-option="header"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+E");
    targets(r.container);
  });
  it("DS10 : Bordures : les pastilles de couleur reprennent celles de la barre (rb-pick, rb-pick-dot plein, enfoncée)", () => {
    const { container } = mount("tableBorder", cell({ border: ["#dc2626", 2, "solid"] }));
    const b = container.querySelector('[data-table-border-color="#dc2626"]')!;
    expect(b.classList.contains("rb-pick")).toBe(true);
    expect(b.getAttribute("aria-pressed")).toBe("true");
    const dot = b.querySelector(".rb-pick-dot") as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.style.backgroundColor).not.toBe("");
    expect(container.querySelector('[data-table-border-color="#000000"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector(".rb-swatch")).toBeNull();
  });
});
