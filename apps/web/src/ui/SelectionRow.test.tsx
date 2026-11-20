// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";
import { SELECTION_ACTIONS, SelectionRow } from "./SelectionRow";

afterEach(cleanup);
const base: ToolbarView = { tool: "select", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const btn = (c: HTMLElement, id: string): HTMLButtonElement | null => c.querySelector(`[data-selection-action="${id}"]`);
function setup(v: ToolbarView) {
  const [view, setView] = createSignal(v);
  const selection = vi.fn();
  const host = { selection } as unknown as ToolbarHost;
  const { container } = render(() => <SelectionRow view={view} host={host} />);
  return { container, setView, selection };
}

describe("rangée Sélection (Z13)", () => {
  it("montrée avec l'outil Sélection seulement, cinq boutons dans l'ordre", () => {
    const { container, setView } = setup({ ...base, tool: "pen" });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setView({ ...base });
    const ids = [...container.querySelectorAll("[data-selection-action]")].map((b) => [b.getAttribute("data-selection-action"), b.textContent]);
    expect(ids).toEqual([["group", "Grouper"], ["ungroup", "Dégrouper"], ["copy", "Copier"], ["paste", "Coller"], ["export", "Exporter"]]);
    expect(SELECTION_ACTIONS.map((a) => a.id)).toEqual(["group", "ungroup", "copy", "paste", "export"]);
  });
  it("Grouper : désactivé sous deux unités", () => {
    const { container, setView } = setup({ ...base, selection: ["a"], selectionUnits: 1 });
    expect(btn(container, "group")!.disabled).toBe(true);
    setView({ ...base, selection: ["a", "b"], selectionUnits: 2 });
    expect(btn(container, "group")!.disabled).toBe(false);
  });
  it("Dégrouper : désactivé sans groupe dans la sélection", () => {
    const { container, setView } = setup({ ...base, selection: ["a"], selectionUnits: 1, selectionGrouped: false });
    expect(btn(container, "ungroup")!.disabled).toBe(true);
    setView({ ...base, selection: ["a"], selectionUnits: 1, selectionGrouped: true });
    expect(btn(container, "ungroup")!.disabled).toBe(false);
  });
  it("Copier, Exporter : désactivés sans sélection ; Coller : désactivé sans presse-papiers interne", () => {
    const { container, setView } = setup({ ...base });
    expect([btn(container, "copy")!.disabled, btn(container, "export")!.disabled, btn(container, "paste")!.disabled]).toEqual([true, true, true]);
    setView({ ...base, selection: ["a"], canPaste: true });
    expect([btn(container, "copy")!.disabled, btn(container, "export")!.disabled, btn(container, "paste")!.disabled]).toEqual([false, false, false]);
  });
  it("clic : host.selection(id)", () => {
    const { container, selection } = setup({ ...base, selection: ["a", "b"], selectionUnits: 2, canPaste: true });
    for (const id of ["group", "copy", "paste", "export"]) fireEvent.click(btn(container, id)!);
    expect(selection.mock.calls.map((c) => c[0])).toEqual(["group", "copy", "paste", "export"]);
  });
});
