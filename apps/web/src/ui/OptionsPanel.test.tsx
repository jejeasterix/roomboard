// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
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

  it("pastilles : noms lisibles, pas le code hex", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    const labels = [...container.querySelectorAll('[data-option="strokeColor"] .rb-pick')].map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Noir", "Rouge", "Bleu", "Vert", "Jaune"]);
    const bg = [...container.querySelectorAll('[data-option="background"] .rb-pick')].map((b) => b.getAttribute("aria-label"));
    expect(bg).toEqual(["Transparent", "Jaune", "Vert", "Bleu", "Rose"]);
  });
  it("bascule : aria-expanded suit le repli ; libellés Plein et Droits", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    const t = container.querySelector("[data-options-toggle]")!;
    expect(t.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[data-option="strokeStyle"] [data-choice="solid"]')!.textContent).toContain("Plein");
    expect(container.querySelector('[data-option="roundness"] [data-choice="sharp"]')!.textContent).toContain("Droits");
    fireEvent.click(t);
    expect(container.querySelector("[data-options-toggle]")!.getAttribute("aria-expanded")).toBe("false");
  });
});

/** Faux moteur dont l'état change : chaque écriture met le style courant à jour. */
function live(tool: string, selection: ElementView[] = []) {
  const [state, setState] = createSignal({ tool, selection: selection.map((e) => e.id), itemStyle: DEFAULT_ITEM_STYLE } as unknown as EngineState);
  const calls: Partial<ItemStyle>[] = [];
  const engine = {
    setItemStyle: (p: Partial<ItemStyle>) => {
      calls.push(p);
      setState((s) => ({ ...s, itemStyle: { ...s.itemStyle!, ...p } }) as EngineState);
    },
    duplicateSelection: () => true,
    deleteSelection: () => true,
  };
  const r = render(() => (
    <OptionsPanel
      engine={() => engine as never}
      state={state}
      element={(id) => selection.find((e) => e.id === id) ?? null}
      presets={() => presets}
      size={() => "s"}
      profileId={() => "p"}
      settings={createDeviceSettings(null)}
      annotating={() => false}
      sideStart={() => null}
    />
  ));
  return { ...r, calls };
}
const shape = (id: string, kind: string, look?: unknown, fill: string | null = null): ElementView =>
  ({ id, kind: "shape", style: { color: "#000000", width: 4 }, shape: { shape: kind, w: 10, h: 10, fill }, ...(look ? { look } : {}) }) as unknown as ElementView;
const stroke = (id: string): ElementView => ({ id, kind: "stroke", style: { color: "#000000", width: 4 } }) as unknown as ElementView;
const pressed = (c: HTMLElement, sec: string): string | null =>
  c.querySelector(`[data-option="${sec}"] [aria-pressed="true"], [data-option="${sec}"] [aria-checked="true"]`)?.getAttribute("data-option-value") ?? null;

describe("OptionsPanel : état vivant (T20)", () => {
  it("mixte : propriété absente ignorée (rectangle en tirets + trait de stylo)", () => {
    const { container } = live("select", [shape("a", "rect", { strokeStyle: "dashed" }), stroke("b")]);
    expect(container.querySelector('[data-option="strokeStyle"]')).not.toBeNull();
    expect(container.querySelector('[data-option="strokeStyle"]')!.hasAttribute("data-mixed")).toBe(false);
    expect(pressed(container, "strokeStyle")).toBe("dashed");
  });
  it("mixte : propriété absente ignorée (rectangle arrondi + ellipse : Angles = arrondi)", () => {
    const { container } = live("select", [shape("a", "rect", { roundness: "round" }), shape("b", "ellipse")]);
    expect(container.querySelector('[data-option="roundness"]')!.hasAttribute("data-mixed")).toBe(false);
    expect(pressed(container, "roundness")).toBe("round");
  });
  it("mixte : propriété absente ignorée (rectangle à fond jaune + ligne : Arrière-plan = jaune)", () => {
    const { container } = live("select", [shape("a", "rect", undefined, "#fef08a"), shape("b", "line")]);
    expect(container.querySelector('[data-option="background"]')!.hasAttribute("data-mixed")).toBe(false);
    expect(pressed(container, "background")).toBe("#fef08a");
  });
  it("focus gardé après une flèche (Largeur), puis une seconde flèche change encore", async () => {
    const { container, calls } = live("rect");
    const sec = container.querySelector<HTMLElement>('[data-option="strokeWidth"]')!;
    sec.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')!.focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    await Promise.resolve();
    expect(calls).toEqual([{ width: 8 }]);
    expect(container.querySelector('[data-option="strokeWidth"]')!.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    await Promise.resolve();
    expect(calls).toHaveLength(2);
    expect(container.querySelector('[data-option="strokeWidth"]')!.contains(document.activeElement)).toBe(true);
  });
  it("focus gardé après un changement de la réglette Transparence", () => {
    const { container, calls } = live("rect");
    const r = container.querySelector<HTMLInputElement>('[data-option="opacity"] input')!;
    r.focus();
    r.value = "50";
    fireEvent.change(r);
    expect(calls).toEqual([{ opacity: 50 }]);
    expect(document.activeElement).toBe(container.querySelector('[data-option="opacity"] input'));
    const r2 = container.querySelector<HTMLInputElement>('[data-option="opacity"] input')!;
    r2.value = "30";
    fireEvent.change(r2);
    expect(calls).toHaveLength(2);
  });
});
