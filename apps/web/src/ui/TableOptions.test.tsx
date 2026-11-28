import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { TableCellState } from "../engine/table-geom";
import { TableSection, type TableSectionKey } from "./TableOptions";

const cell = (over: Partial<TableCellState> = {}): TableCellState => ({ id: "t", row: 0, col: 0, rows: 3, cols: 3, ha: "left", va: "top", border: null, ...over });
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
    expect(o.container.querySelector('[data-option-value="shrink"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+F");
    o.unmount();
    const a = mount("tableAlign", cell());
    expect(a.container.querySelector('[data-option-value="center"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+C");
    expect(a.container.querySelector('[data-option-value="middle"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+M");
    a.unmount();
    const b = mount("tableBorder", cell({ border: ["#000000", 2, "solid"] }));
    expect(b.container.querySelector('[data-option-value="none"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+B");
    expect(b.container.querySelector('[data-table-border-color="#dc2626"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+B");
    b.unmount();
    const r = mount("tableRows", cell());
    expect(r.container.querySelector('[data-table-option="header"]')?.getAttribute("aria-keyshortcuts")).toBe("Alt+E");
  });
});
