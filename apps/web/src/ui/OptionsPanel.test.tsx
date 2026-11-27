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
interface Opts { units?: number; tool: string; selection: ElementView[]; size?: ButtonSize; annotating?: boolean; editing?: boolean; itemStyle?: ItemStyle; hidden?: boolean }
function mount(o: Opts) {
  const calls: Partial<ItemStyle>[] = [];
  const engine = {
    setItemStyle: vi.fn((p: Partial<ItemStyle>) => { calls.push(p); }),
    duplicateSelection: vi.fn(() => true),
    deleteSelection: vi.fn(() => true),
    run: vi.fn(() => null),
    runAll: vi.fn(() => null),
    bringToFront: vi.fn(() => true),
    sendToBack: vi.fn(() => true),
    reorder: vi.fn(() => true),
    arrange: vi.fn(() => true),
  };
  const state = { tool: o.tool, selection: o.selection.map((e) => e.id), itemStyle: o.itemStyle ?? DEFAULT_ITEM_STYLE, selectionUnits: o.units ?? o.selection.length, textFormat: o.editing ? {} : null } as unknown as EngineState;
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
      hidden={() => o.hidden ?? false}
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
    expect(labels).toEqual(["Noir", "Rouge", "Bleu", "Vert"]);
    const bg = [...container.querySelectorAll('[data-option="background"] .rb-pick')].map((b) => b.getAttribute("aria-label"));
    expect(bg).toEqual(["Transparent", "Jaune", "Vert", "Bleu"]);
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

const filledRect = (id: string): ElementView =>
  ({ id, kind: "shape", style: { color: "#000000", width: 4 }, shape: { shape: "rect", w: 10, h: 10, fill: "#facc15" } }) as unknown as ElementView;
const arrowEl = (id: string): ElementView =>
  ({ id, kind: "shape", style: { color: "#000000", width: 4 }, shape: { shape: "arrow", w: 10, h: 10, fill: null } }) as unknown as ElementView;
const textEl = (id: string, content = "abc", font?: string): ElementView =>
  ({ id, kind: "text", style: { color: "#000000", width: 4 }, text: { content, size: 36, boxWidth: 100, boxHeight: 40, spans: [{ text: content, attrs: font ? { font } : {} }] } }) as unknown as ElementView;

describe("OptionsPanel lot 2 (T15)", () => {
  it("en saisie Police grisée, Taille et Trait aussi ; Alignement actif", () => {
    const { container, calls } = mount({ tool: "text", selection: [], editing: true });
    for (const name of ["font", "fontSize"]) {
      const bs = container.querySelectorAll<HTMLButtonElement>(`[data-option="${name}"] button`);
      expect(bs.length).toBeGreaterThan(0);
      for (const b of bs) expect(b.disabled, name).toBe(true);
    }
    for (const b of container.querySelectorAll<HTMLButtonElement>('[data-option="strokeColor"] button')) expect(b.disabled).toBe(true);
    const align = container.querySelector<HTMLButtonElement>('[data-option="textAlign"] [data-choice="center"]')!;
    expect(align.disabled).toBe(false);
    fireEvent.click(align);
    expect(calls).toContainEqual({ textAlign: "center" });
  });
  it("hors saisie : Police et Taille écrivent un FormatText sur tout le texte", () => {
    const { container, engine } = mount({ tool: "select", selection: [textEl("t", "abcde")] });
    fireEvent.click(container.querySelector('[data-option="font"] [data-choice="Georgia"]')!);
    fireEvent.click(container.querySelector('[data-option="fontSize"] [data-choice="48"]')!);
    fireEvent.click(container.querySelector('[data-option="font"] [data-choice="default"]')!);
    expect(engine.runAll).toHaveBeenNthCalledWith(1, [{ type: "FormatText", id: "t", start: 0, len: 5, attrs: { font: "Georgia" } }]);
    expect(engine.runAll).toHaveBeenNthCalledWith(2, [{ type: "FormatText", id: "t", start: 0, len: 5, attrs: { size: 48 } }]);
    expect(engine.runAll).toHaveBeenNthCalledWith(3, [{ type: "FormatText", id: "t", start: 0, len: 5, attrs: { font: null } }]);
  });
  it("T37 : Police sur trois textes : un seul runAll (une étape d'annulation), aucun run", () => {
    const { container, engine } = mount({ tool: "select", selection: [textEl("a", "ab"), textEl("b", "cde"), textEl("c", "f")] });
    fireEvent.click(container.querySelector('[data-option="font"] [data-choice="Georgia"]')!);
    expect(engine.run).not.toHaveBeenCalled();
    expect(engine.runAll).toHaveBeenCalledTimes(1);
    expect(engine.runAll).toHaveBeenCalledWith([
      { type: "FormatText", id: "a", start: 0, len: 2, attrs: { font: "Georgia" } },
      { type: "FormatText", id: "b", start: 0, len: 3, attrs: { font: "Georgia" } },
      { type: "FormatText", id: "c", start: 0, len: 1, attrs: { font: "Georgia" } },
    ]);
  });
  it("fillStyle : absent sans fond, trois choix avec un fond", () => {
    expect(mount({ tool: "rect", selection: [] }).container.querySelector('[data-option="fillStyle"]')).toBeNull();
    const { container, calls } = mount({ tool: "select", selection: [filledRect("r")] });
    const choices = [...container.querySelectorAll('[data-option="fillStyle"] [data-choice]')].map((b) => b.getAttribute("data-choice"));
    expect(choices).toEqual(["solid", "hachure", "cross-hatch"]);
    fireEvent.click(container.querySelector('[data-option="fillStyle"] [data-choice="hachure"]')!);
    expect(calls).toContainEqual({ fillStyle: "hachure" });
  });
  it("Pointes : début et fin, quatre choix chacune", () => {
    const { container, calls } = mount({ tool: "select", selection: [arrowEl("a")] });
    const end = container.querySelectorAll('[data-option="arrowheads"] [data-edit="endArrowhead"] [data-choice]');
    expect([...end].map((b) => b.getAttribute("data-choice"))).toEqual(["none", "arrow", "triangle", "triangle_outline"]);
    expect(container.querySelector('[data-edit="endArrowhead"] [data-choice="arrow"]')!.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector('[data-edit="startArrowhead"] [data-choice="none"]')!.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(container.querySelector('[data-edit="endArrowhead"] [data-choice="triangle"]')!);
    fireEvent.click(container.querySelector('[data-edit="startArrowhead"] [data-choice="arrow"]')!);
    expect(calls).toEqual([{ endArrowhead: "triangle" }, { startArrowhead: "arrow" }]);
  });
  it("Disposition : quatre boutons, les fonctions d'ordre d'OG4 (Restack), un appel chacun", () => {
    const { container, engine } = mount({ tool: "select", selection: [rectEl("a", "#000000")] });
    for (const v of ["front", "forward", "backward", "back"]) fireEvent.click(container.querySelector(`[data-option="layers"] [data-option-value="${v}"]`)!);
    expect(engine.bringToFront).toHaveBeenCalledTimes(1);
    expect(engine.reorder).toHaveBeenNthCalledWith(1, "up");
    expect(engine.reorder).toHaveBeenNthCalledWith(2, "down");
    expect(engine.reorder).toHaveBeenCalledTimes(2);
    expect(engine.sendToBack).toHaveBeenCalledTimes(1);
    expect("bringForward" in engine || "sendBackward" in engine).toBe(false);
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

describe("OptionsPanel : sélecteur de couleur complet (T16)", () => {
  it("le bouton « Autres couleurs » ouvre le sélecteur du Trait, un choix écrit la couleur et rend le focus", () => {
    const { container, calls } = mount({ tool: "rect", selection: [] });
    const btn = container.querySelector<HTMLButtonElement>('[data-more-colors="strokeColor"]')!;
    fireEvent.click(btn);
    expect(container.querySelector("[data-color-picker]")).not.toBeNull();
    fireEvent.click(container.querySelectorAll<HTMLElement>("[data-color-picker] [role=gridcell]")[7]!);
    expect(calls.at(-1)).toEqual({ color: "#ced4da" });
    expect(container.querySelector("[data-color-picker]")).toBeNull();
    expect(document.activeElement).toBe(btn);
  });
  it("S ouvre le trait, G le fond ; hors panneau, rien", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    fireEvent.keyDown(window, { key: "s" });
    expect(container.querySelector("[data-color-picker]")).not.toBeNull();
    fireEvent.keyDown(container.querySelector("[data-color-picker] [role=gridcell]")!, { key: "Escape" });
    expect(container.querySelector("[data-color-picker]")).toBeNull();
    fireEvent.keyDown(window, { key: "g" });
    expect(container.querySelector("[data-color-picker]")).not.toBeNull();
    fireEvent.click(container.querySelectorAll<HTMLElement>("[data-color-picker] [role=gridcell]")[0]!);
    expect(container.querySelector("[data-color-picker]")).toBeNull();
  });
  it("G choisit l'arrière-plan", () => {
    const { container, calls } = mount({ tool: "rect", selection: [] });
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.click(container.querySelectorAll<HTMLElement>("[data-color-picker] [role=gridcell]")[2]!);
    expect(calls.at(-1)).toEqual({ background: "#adb5bd" });
  });
  it("S sans section Trait (outil sélection vide) : rien", () => {
    const { container } = mount({ tool: "select", selection: [] });
    fireEvent.keyDown(window, { key: "s" });
    expect(container.querySelector("[data-color-picker]")).toBeNull();
  });
});

describe("OptionsPanel : avant la saisie, focus, sélecteur borné (T31)", () => {
  it("outil Texte sans texte : Georgia et 48 deviennent le style courant et s'affichent enfoncés", () => {
    const { container, calls } = mount({ tool: "text", selection: [], itemStyle: { ...DEFAULT_ITEM_STYLE, font: "Georgia", fontSize: 48 } });
    fireEvent.click(container.querySelector('[data-option="font"] [data-choice="Courier New"]')!);
    fireEvent.click(container.querySelector('[data-option="fontSize"] [data-choice="72"]')!);
    expect(calls).toContainEqual({ font: "Courier New" });
    expect(calls).toContainEqual({ fontSize: 72 });
    expect(container.querySelector('[data-option="font"] [data-choice="Georgia"]')!.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector('[data-option="fontSize"] [data-choice="48"]')!.getAttribute("aria-checked")).toBe("true");
  });
  it("un texte choisi : le style courant suit aussi (Excalidraw), en plus du FormatText", () => {
    const { container, calls, engine } = mount({ tool: "select", selection: [textEl("t", "abcde")] });
    fireEvent.click(container.querySelector('[data-option="font"] [data-choice="Georgia"]')!);
    expect(calls).toContainEqual({ font: "Georgia" });
    expect(engine.runAll).toHaveBeenCalledWith([{ type: "FormatText", id: "t", start: 0, len: 5, attrs: { font: "Georgia" } }]);
  });
  it("un appui sur un bouton du panneau ne prend pas le focus (pointerdown et mousedown annulés)", () => {
    const { container } = mount({ tool: "text", selection: [], editing: true });
    const right = container.querySelector('[data-option="textAlign"] [data-choice="right"]')!;
    expect(fireEvent.pointerDown(right)).toBe(false);
    expect(fireEvent.mouseDown(right)).toBe(false);
  });
  it("sélecteur de couleur : le bas reste dans la fenêtre, hauteur réelle mesurée", () => {
    const h = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get() { return (this as HTMLElement).classList.contains("rb-color-pop") ? 800 : 0; } });
    const inner = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    try {
      const { container } = mount({ tool: "rect", selection: [] });
      const btn = container.querySelector<HTMLButtonElement>('[data-more-colors="strokeColor"]')!;
      btn.getBoundingClientRect = () => ({ top: 700, bottom: 744, left: 10, right: 54, width: 44, height: 44, x: 10, y: 700, toJSON: () => ({}) });
      fireEvent.click(btn);
      const pop = container.querySelector<HTMLElement>(".rb-color-pop")!;
      expect(parseInt(pop.style.top, 10) + 800).toBeLessThanOrEqual(900 - 8);
      expect(parseInt(pop.style.top, 10)).toBeGreaterThanOrEqual(8);
    } finally {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: inner });
      if (h) Object.defineProperty(HTMLElement.prototype, "offsetHeight", h); else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
    }
  });
  it("fenêtre plus basse que le sélecteur : haut à 8 px, défilement interne (hauteur max = fenêtre − 16)", () => {
    const h = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get() { return (this as HTMLElement).classList.contains("rb-color-pop") ? 700 : 0; } });
    const inner = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 500 });
    try {
      const { container } = mount({ tool: "rect", selection: [] });
      fireEvent.click(container.querySelector('[data-more-colors="strokeColor"]')!);
      const pop = container.querySelector<HTMLElement>(".rb-color-pop")!;
      expect(pop.style.top).toBe("8px");
      expect(pop.style.maxBlockSize).toBe("484px");
    } finally {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: inner });
      if (h) Object.defineProperty(HTMLElement.prototype, "offsetHeight", h); else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
    }
  });
  it("sélecteur ouvert : le panneau porte data-picker (passe au-dessus des autres îlots)", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    const aside = container.querySelector("[data-options]")!;
    expect(aside.hasAttribute("data-picker")).toBe(false);
    fireEvent.click(container.querySelector('[data-more-colors="strokeColor"]')!);
    expect(aside.hasAttribute("data-picker")).toBe(true);
  });
  it("T32 : Disposition et Actions gardent aussi le focus de la saisie", () => {
    const { container } = mount({ tool: "select", selection: [rectEl("a", "#000000")] });
    for (const v of ["front", "duplicate", "delete", "link"]) {
      const b = container.querySelector(`[data-option-value="${v}"]`)!;
      expect(fireEvent.pointerDown(b), v).toBe(false);
    }
  });
  it("T32 : sélecteur posé en pixels entiers même avec une ancre fractionnaire", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    const btn = container.querySelector<HTMLButtonElement>('[data-more-colors="strokeColor"]')!;
    btn.getBoundingClientRect = () => ({ top: 100.6, bottom: 144.6, left: 10.3, right: 54.3, width: 44, height: 44, x: 10.3, y: 100.6, toJSON: () => ({}) });
    fireEvent.click(btn);
    const pop = container.querySelector<HTMLElement>(".rb-color-pop")!;
    expect(pop.style.left).toMatch(/^\d+px$/);
    expect(pop.style.top).toMatch(/^\d+px$/);
  });
  it("T33 : masqué quand l'Aide est ouverte (hidden)", () => {
    expect(mount({ tool: "rect", selection: [], hidden: true }).container.querySelector("[data-options]")).toBeNull();
    expect(mount({ tool: "rect", selection: [] }).container.querySelector("[data-options]")).not.toBeNull();
  });
  it("T33 : le sélecteur s'ancre à droite du panneau (bord droit + 8 px), entier", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    container.querySelector<HTMLElement>("[data-options]")!.getBoundingClientRect = () => ({ top: 112, bottom: 700, left: 16, right: 247.5, width: 231.5, height: 588, x: 16, y: 112, toJSON: () => ({}) });
    fireEvent.click(container.querySelector('[data-more-colors="strokeColor"]')!);
    expect(container.querySelector<HTMLElement>(".rb-color-pop")!.style.left).toBe("256px");
  });
  it("T33 : le sélecteur ne monte pas au-dessus du haut du panneau et défile au besoin", () => {
    const h = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get() { return (this as HTMLElement).classList.contains("rb-color-pop") ? 780 : 0; } });
    const inner = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    try {
      const { container } = mount({ tool: "rect", selection: [] });
      container.querySelector<HTMLElement>("[data-options]")!.getBoundingClientRect = () => ({ top: 112, bottom: 700, left: 16, right: 248, width: 232, height: 588, x: 16, y: 112, toJSON: () => ({}) });
      fireEvent.click(container.querySelector('[data-more-colors="strokeColor"]')!);
      const pop = container.querySelector<HTMLElement>(".rb-color-pop")!;
      expect(parseInt(pop.style.top, 10)).toBeGreaterThanOrEqual(112);
      expect(pop.style.maxBlockSize).toBe("780px");
    } finally {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: inner });
      if (h) Object.defineProperty(HTMLElement.prototype, "offsetHeight", h); else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
    }
  });
});

describe("OptionsPanel accordéon et couleurs (OG23, T5)", () => {
  const head = (c: HTMLElement, k: string): HTMLElement => c.querySelector<HTMLElement>(`[data-option-head="${k}"]`)!;
  it("sections repliées par défaut, état relu", () => {
    const m = mount({ tool: "rect", selection: [] });
    expect(head(m.container, "strokeWidth").getAttribute("aria-expanded")).toBe("true");
    expect(head(m.container, "strokeStyle").getAttribute("aria-expanded")).toBe("false");
    expect(m.container.querySelector<HTMLElement>("#opt-body-strokeStyle")!.hidden).toBe(true);
    fireEvent.click(head(m.container, "strokeStyle"));
    expect(head(m.container, "strokeStyle").getAttribute("aria-expanded")).toBe("true");
    expect(m.settings.optionSections().strokeStyle).toBe(true);
    m.unmount();
    const again = render(() => (
      <OptionsPanel engine={() => m.engine as never} state={() => ({ tool: "rect", selection: [], itemStyle: DEFAULT_ITEM_STYLE, textFormat: null }) as unknown as EngineState}
        element={() => null} presets={() => presets} size={() => "s"} profileId={() => "p"} settings={m.settings} annotating={() => false} sideStart={() => null} />
    ));
    expect(head(again.container, "strokeStyle").getAttribute("aria-expanded")).toBe("true");
  });
  it("en-tête : Entrée et Espace basculent", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    const h = head(container, "roundness");
    expect(h.tagName).toBe("BUTTON");
    expect(h.getAttribute("aria-controls")).toBe("opt-body-roundness");
    // Un bouton natif bascule par Entrée ou Espace via `click` : on joue le clic que le navigateur déclenche.
    fireEvent.click(h);
    expect(h.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(h);
    expect(h.getAttribute("aria-expanded")).toBe("false");
  });
  it("résumé de valeur", () => {
    const m = mount({ tool: "rect", selection: [] });
    expect(head(m.container, "roughness").textContent).toContain("Style de tracé");
    expect(head(m.container, "roughness").textContent).toContain("· Net");
    const a = rectEl("a", "#000000");
    const b = { ...rectEl("b", "#000000"), look: { roughness: 2 } } as unknown as ElementView;
    const mx = mount({ tool: "select", selection: [a, b] });
    expect(head(mx.container, "roughness").textContent).toContain("· Mixte");
  });
  it("S ouvre Trait replié puis le sélecteur", async () => {
    const { container, settings } = mount({ tool: "rect", selection: [] });
    fireEvent.click(head(container, "strokeColor")); // ouverte par défaut : on la replie
    expect(head(container, "strokeColor").getAttribute("aria-expanded")).toBe("false");
    expect(settings.optionSections().strokeColor).toBe(false);
    fireEvent.keyDown(window, { key: "s", code: "KeyS" });
    expect(head(container, "strokeColor").getAttribute("aria-expanded")).toBe("true");
    await Promise.resolve();
    expect(container.querySelector("[data-color-picker]")).not.toBeNull();
  });
  it("4 pastilles et palette sur une ligne", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    expect(container.querySelectorAll('[data-option="strokeColor"] .rb-pick')).toHaveLength(4);
    expect(container.querySelector('[data-more-colors="strokeColor"] [data-icon="palette"]')).not.toBeNull();
  });
  it("trait transparent : sélecteur seulement, rectangles seulement", () => {
    const m = mount({ tool: "select", selection: [rectEl("a", "#000000"), rectEl("b", "#dc2626")] });
    expect(m.container.querySelector('[data-option="strokeColor"] [data-transparent]')).toBeNull();
    fireEvent.click(m.container.querySelector('[data-more-colors="strokeColor"]')!);
    const t = m.container.querySelector('[data-color-transparent]')!;
    expect(t).not.toBeNull();
    fireEvent.click(t);
    expect(m.calls).toContainEqual({ color: "transparent" });
    m.unmount();
    const pen = mount({ tool: "pen", selection: [] });
    fireEvent.click(pen.container.querySelector('[data-more-colors="strokeColor"]')!);
    expect(pen.container.querySelector("[data-color-transparent]")).toBeNull();
    pen.unmount();
    const bg = mount({ tool: "rect", selection: [] });
    fireEvent.click(bg.container.querySelector('[data-more-colors="background"]')!);
    expect(bg.container.querySelector("[data-color-transparent]")).not.toBeNull();
  });
  it("Largeur : icône et mot ; Style de tracé : Net, À main levée, Très à main levée", () => {
    const { container } = mount({ tool: "rect", selection: [] });
    const w = container.querySelector('[data-option="strokeWidth"] [data-choice="2"]')!;
    expect(w.querySelector('[data-icon="width-thin"]')).not.toBeNull();
    expect(w.textContent).toContain("Fin");
    const labels = [...container.querySelectorAll('[data-option="roughness"] .rb-radio')].map((b) => b.textContent);
    expect(labels).toEqual(["Net", "À main levée", "Très à main levée"]);
  });
});

describe("OptionsPanel (OG23, T7) : Pression, Aligner, Transformer", () => {
  const rects = (n: number): ElementView[] => Array.from({ length: n }, (_, i) => rectEl(`r${i}`, "#000000"));
  it("Pression · Variable", () => {
    const { container } = mount({ tool: "pen", selection: [] });
    const head = container.querySelector('[data-option-head="pressure"]')!;
    expect(head.textContent).toContain("Pression");
    expect(head.textContent).toContain("· Variable");
  });
  it("Pression : Constante écrit variability", () => {
    const { container, calls } = mount({ tool: "pen", selection: [] });
    fireEvent.click(container.querySelector('[data-option="pressure"] [data-option-value="constant"]')!);
    expect(calls).toContainEqual({ variability: "constant" });
  });
  it("Pression : un trait constant relu comme Constante", () => {
    const stroke = { id: "s", kind: "stroke", style: { color: "#000000", width: 4 }, look: { variability: "constant" } } as unknown as ElementView;
    const { container } = mount({ tool: "select", selection: [stroke] });
    expect(container.querySelector('[data-option-head="pressure"]')!.textContent).toContain("· Constante");
    expect(container.querySelector('[data-option="pressure"] [data-option-value="constant"]')!.getAttribute("aria-checked")).toBe("true");
  });
  it("Aligner : 2 unités, Répartir à 3", () => {
    const two = mount({ tool: "select", selection: rects(2) }).container;
    expect(two.querySelectorAll('[data-option="align"] button[data-option-value]').length).toBe(6);
    expect(two.querySelector('[data-option="align"] [data-option-value="distribute-h"]')).toBeNull();
    cleanup();
    const three = mount({ tool: "select", selection: rects(3) }).container;
    expect(three.querySelectorAll('[data-option="align"] button[data-option-value]').length).toBe(8);
    expect(three.querySelector('[data-option="align"] [data-option-value="distribute-v"]')).not.toBeNull();
  });
  it("Aligner : un bouton appelle arrange, avec son raccourci", () => {
    const { container, engine } = mount({ tool: "select", selection: rects(3) });
    const b = container.querySelector('[data-option="align"] [data-option-value="align-left"]')!;
    expect(b.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+ArrowLeft");
    fireEvent.click(b);
    fireEvent.click(container.querySelector('[data-option="align"] [data-option-value="distribute-h"]')!);
    expect(engine.arrange.mock.calls).toEqual([["align-left"], ["distribute-h"]]);
  });
  it("Aligner : une seule unité, pas de section", () => {
    const { container } = mount({ tool: "select", selection: rects(1) });
    expect(container.querySelector('[data-option="align"]')).toBeNull();
  });
  it("Transformer : quatre boutons, arrange appelé", () => {
    const { container, engine } = mount({ tool: "select", selection: rects(1) });
    const btns = [...container.querySelectorAll('[data-option="transform"] button[data-option-value]')];
    expect(btns.map((b) => b.getAttribute("data-option-value"))).toEqual(["flip-h", "flip-v", "rotate-ccw", "rotate-cw"]);
    for (const b of btns) fireEvent.click(b);
    expect(engine.arrange.mock.calls).toEqual([["flip-h"], ["flip-v"], ["rotate-ccw"], ["rotate-cw"]]);
  });
  it("ordre : Disposition, Aligner, Transformer, Actions", () => {
    const { container } = mount({ tool: "select", selection: rects(2) });
    const order = [...container.querySelectorAll("[data-option]")].map((e) => e.getAttribute("data-option"));
    expect(order.slice(-4)).toEqual(["layers", "align", "transform", "actions"]);
  });
});
