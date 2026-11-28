// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";
import { SelectionRow } from "./SelectionRow";

afterEach(cleanup);
const base: ToolbarView = { tool: "select", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
function setup(v: ToolbarView) {
  const [view, setView] = createSignal(v);
  const selection = vi.fn();
  const host = { selection } as unknown as ToolbarHost;
  const { container } = render(() => <SelectionRow view={view} host={host} />);
  return { container, setView, selection };
}

describe("rangée Sélection (OG41, D22)", () => {
  it("outil Sélection, aucune sélection, presse-papiers plein : un seul bouton icône « Coller »", () => {
    const { container } = setup({ ...base, canPaste: true });
    const all = [...container.querySelectorAll("[data-selection-action]")];
    expect(all.map((b) => b.getAttribute("data-selection-action"))).toEqual(["paste"]);
    expect(all[0]!.getAttribute("aria-label")).toBe("Coller");
    expect(all[0]!.querySelector("svg")).not.toBeNull();
  });
  it("une sélection (la barre d'objet prend le relais), un autre outil ou rien à coller : rien", () => {
    const { container, setView } = setup({ ...base, canPaste: true, selection: ["a"] });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setView({ ...base, canPaste: false });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setView({ ...base, tool: "pen", canPaste: true });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
  });
  it("toucher : host.selection('paste')", () => {
    const { container, selection } = setup({ ...base, canPaste: true });
    fireEvent.click(container.querySelector('[data-selection-action="paste"]')!);
    expect(selection).toHaveBeenCalledWith("paste");
  });
});
