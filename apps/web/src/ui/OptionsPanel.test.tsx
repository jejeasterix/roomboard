// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ElementView } from "../core/api";
import { createDeviceSettings } from "../device-settings";
import type { EngineState } from "../engine/engine";
import { DEFAULT_ITEM_STYLE, type ItemStyle } from "../engine/item-style";
import { builtinProfile } from "../toolbar-profiles";
import type { ButtonSize } from "../toolbar";
import { OptionsPanel } from "./OptionsPanel";

afterEach(cleanup);

const presets = builtinProfile("defaut")!.presets;
function rectEl(id: string, color: string): ElementView {
  return { id, kind: "shape", style: { color, width: 4 }, shape: { shape: "rect", w: 10, h: 10, fill: null } } as unknown as ElementView;
}
interface Opts { tool: string; selection: ElementView[]; size?: ButtonSize; annotating?: boolean }
function mount(o: Opts) {
  const calls: Partial<ItemStyle>[] = [];
  const engine = {
    setItemStyle: vi.fn((p: Partial<ItemStyle>) => { calls.push(p); }),
    duplicateSelection: vi.fn(() => true),
    deleteSelection: vi.fn(() => true),
  };
  const state = { tool: o.tool, selection: o.selection.map((e) => e.id), itemStyle: DEFAULT_ITEM_STYLE } as unknown as EngineState;
  const settings = createDeviceSettings(null);
  const r = render(() => (
    <OptionsPanel
      engine={() => engine as never}
      state={() => state}
      element={(id) => o.selection.find((e) => e.id === id) ?? null}
      presets={() => presets}
      size={() => o.size ?? "s"}
      profileId={() => "p"}
      settings={settings}
      annotating={() => o.annotating ?? false}
      sideStart={() => null}
    />
  ));
  return { ...r, calls, engine, settings };
}

describe("OptionsPanel (OG11, T10)", () => {
  it("OptionsPanel rectangle : 7 sections", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    expect([...container.querySelectorAll("[data-option]")].map((e) => e.getAttribute("data-option"))).toEqual(
      ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"]);
  });
  it("masqué avec Sélection sans sélection", () => {
    expect(mount({ tool: "select", selection: [] }).container.querySelector("[data-options]")).toBeNull();
  });
  it("absent en mode annotation", () => {
    expect(mount({ tool: "rect", selection: [], annotating: true }).container.querySelector("[data-options]")).toBeNull();
  });
  it("mixte : data-mixed et aucun segment enfoncé", () => {
    const { container } = mount({ tool: "select", selection: [rectEl("a", "#000000"), rectEl("b", "#dc2626")] });
    const s = container.querySelector('[data-option="strokeColor"]')!;
    expect(s.hasAttribute("data-mixed")).toBe(true);
    expect(s.querySelector('[aria-pressed="true"]')).toBeNull();
  });
  it("sélection : actions Dupliquer et Supprimer", () => {
    const { container, engine } = mount({ tool: "select", selection: [rectEl("a", "#000000")] });
    fireEvent.click(container.querySelector('[data-option-value="duplicate"]')!);
    fireEvent.click(container.querySelector('[data-option-value="delete"]')!);
    expect(engine.duplicateSelection).toHaveBeenCalledTimes(1);
    expect(engine.deleteSelection).toHaveBeenCalledTimes(1);
  });
  it("toucher une pastille écrit le style", () => {
    const { container, calls } = mount({ tool: "rect", selection: [] });
    fireEvent.click(container.querySelector('[data-option="strokeStyle"] [data-choice="dashed"]')!);
    fireEvent.click(container.querySelector('[data-option="strokeColor"] [data-option-value="#dc2626"]')!);
    expect(calls).toContainEqual({ strokeStyle: "dashed" });
    expect(calls).toContainEqual({ color: "#dc2626" });
  });
  it("largeur et angles : valeurs typées", () => {
    const { container, calls } = mount({ tool: "rect", selection: [] });
    fireEvent.click(container.querySelector('[data-option="strokeWidth"] [data-choice="8"]')!);
    fireEvent.click(container.querySelector('[data-option="roughness"] [data-choice="2"]')!);
    fireEvent.click(container.querySelector('[data-option="roundness"] [data-choice="round"]')!);
    expect(calls).toEqual([{ width: 8 }, { roughness: 2 }, { roundness: "round" }]);
  });
  it("arrière-plan transparent : écrit null", () => {
    const { container, calls } = mount({ tool: "rect", selection: [] });
    fireEvent.click(container.querySelector('[data-option="background"] [data-option-value="transparent"]')!);
    expect(calls).toContainEqual({ background: null });
  });
  it("transparence écrite au relâché", () => {
    const { container, calls } = mount({ tool: "rect", selection: [] });
    const r = container.querySelector<HTMLInputElement>('[data-option="opacity"] input[type="range"]')!;
    r.value = "50";
    r.dispatchEvent(new Event("input", { bubbles: true }));
    expect(calls).toEqual([]);
    r.dispatchEvent(new Event("change", { bubbles: true }));
    expect(calls).toContainEqual({ opacity: 50 });
  });
  it("repli gardé", () => {
    const { container, settings } = mount({ tool: "rect", selection: [] });
    fireEvent.click(container.querySelector("[data-options-toggle]")!);
    expect(settings.island("p", "options").collapsed).toBe(true);
    expect(container.querySelector("[data-option]")).toBeNull();
    expect(container.querySelector("[data-options-toggle]")).not.toBeNull();
  });
  it("cibles à la taille du profil (S 44, M 48, L 64)", () => {
    for (const [size, px] of [["s", "44px"], ["m", "48px"], ["l", "64px"]] as const) {
      const { container, unmount } = mount({ tool: "rect", selection: [], size });
      const root = container.querySelector<HTMLElement>("[data-options]")!;
      expect(root.style.getPropertyValue("--rb-btn-size")).toBe(px);
      for (const b of root.querySelectorAll<HTMLElement>("button")) expect(b.style.getPropertyValue("--rb-btn-size")).toBe("");
      unmount();
    }
  });
});
