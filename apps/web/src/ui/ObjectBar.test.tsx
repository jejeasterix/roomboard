// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { Camera } from "../engine/camera";
import { MORE_LABEL, OBJECT_BAR_LABEL, ObjectBar, type ObjectBarView } from "./ObjectBar";

const BASE: ObjectBarView = { tool: "select", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1, selection: ["i"], selectionUnits: 1, selectionImage: "i", selectionBounds: { x0: 200, y0: 300, x1: 400, y1: 400 } };
let restore: (() => void) | null = null;
beforeEach(() => {
  const w = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const h = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get(this: HTMLElement) { return this.classList.contains("rb-object-bar") ? 180 : 0; } });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get(this: HTMLElement) { return this.classList.contains("rb-object-bar") ? 44 : 0; } });
  restore = () => {
    if (w) Object.defineProperty(HTMLElement.prototype, "offsetWidth", w);
    if (h) Object.defineProperty(HTMLElement.prototype, "offsetHeight", h);
  };
});
afterEach(() => {
  cleanup();
  restore?.();
  document.body.replaceChildren();
});

function setup(v: ObjectBarView = BASE, obs: { x: number; y: number; w: number; h: number }[] = []) {
  const [view, setView] = createSignal<ObjectBarView>(v);
  let cam: Camera = { zoom: 1, tx: 0, ty: 0 };
  const cbs = new Set<(c: Camera) => void>();
  const engine = { camera: () => cam, onCamera: (cb: (c: Camera) => void) => (cbs.add(cb), () => void cbs.delete(cb)), selectionKeepOut: () => [] };
  const host = { selection: vi.fn(), runAction: vi.fn(), imagePanel: vi.fn() } as unknown as ToolbarHost;
  const mount = document.createElement("main");
  Object.defineProperty(mount, "clientWidth", { value: 1280 });
  Object.defineProperty(mount, "clientHeight", { value: 900 });
  const stage = document.createElement("div");
  stage.tabIndex = -1;
  mount.append(stage);
  document.body.append(mount);
  render(() => <ObjectBar view={view} host={host} engine={() => engine} stage={() => stage} mount={mount} obstacles={() => obs} />);
  const bar = (): HTMLElement => mount.querySelector<HTMLElement>("[data-object-bar]")!;
  const ids = (): string[] => [...bar().querySelectorAll("[data-object-button]")].map((b) => b.getAttribute("data-selection-action") ?? "more");
  const moveCamera = (c: Camera): void => {
    cam = c;
    for (const cb of cbs) cb(c);
  };
  return { view, setView, host, mount, stage, bar, ids, moveCamera };
}

/** Texte visible d'un bouton : tout sauf le libellé réservé aux lecteurs d'écran (`.rb-sr`) et l'infobulle. */
const visibleText = (b: Element): string => {
  const c = b.cloneNode(true) as Element;
  for (const n of [...c.querySelectorAll(".rb-sr, [role=tooltip], [aria-hidden=true]:not(svg)")]) n.remove();
  return c.textContent?.trim() ?? "";
};

describe("ObjectBar (OG41, D18-D27)", () => {
  it("S5 : image seule : icônes Dupliquer, Copier, Image, Supprimer et « … », role toolbar, aria-label", () => {
    const t = setup();
    expect(t.bar().getAttribute("role")).toBe("toolbar");
    expect(t.bar().getAttribute("aria-label")).toBe(OBJECT_BAR_LABEL);
    expect(t.bar().hidden).toBe(false);
    expect(t.ids()).toEqual(["duplicate", "copy", "image", "delete", "more"]);
    expect(t.bar().querySelector('[data-selection-action="duplicate"]')?.getAttribute("aria-label")).toBe("Dupliquer");
    expect(t.bar().querySelector('[data-selection-action="duplicate"]')?.getAttribute("aria-keyshortcuts")).toBe("Control+D");
    expect(t.bar().querySelector("[data-object-more]")?.getAttribute("aria-label")).toBe(MORE_LABEL);
    expect(t.bar().classList.contains("rb-island")).toBe(false);
  });
  it("D18 : icônes seules (aucun libellé visible, aucun bouton grisé), aucun glisser HTML5", () => {
    const t = setup();
    const all = [...t.bar().querySelectorAll<HTMLButtonElement>("[data-object-button]")];
    expect(all.length).toBe(5);
    for (const b of all) {
      expect(b.querySelector("svg.rb-icon"), b.getAttribute("aria-label") ?? "").not.toBeNull();
      expect(visibleText(b), b.getAttribute("aria-label") ?? "").toBe("");
      expect(b.disabled).toBe(false);
      expect(b.getAttribute("aria-label")?.length ?? 0).toBeGreaterThan(0);
    }
    expect(t.bar().querySelector("[draggable=true]")).toBeNull();
  });
  it("D21, D27 : sans sélection, autre outil ou en annotation : cachée", () => {
    const t = setup();
    t.setView({ ...BASE, selection: [] });
    expect(t.bar().hidden).toBe(true);
    t.setView({ ...BASE, tool: "pen" });
    expect(t.bar().hidden).toBe(true);
    t.setView({ ...BASE, annotation: { active: true, pointer: "draw", screens: 1 } });
    expect(t.bar().hidden).toBe(true);
  });
  it("S7 : deux unités : Grouper ; groupe : Dégrouper à sa place", () => {
    const t = setup({ ...BASE, selectionImage: null, selection: ["a", "b"], selectionUnits: 2 });
    expect(t.ids()).toEqual(["duplicate", "copy", "group", "delete", "more"]);
    t.setView({ ...BASE, selectionImage: null, selection: ["a", "b"], selectionUnits: 1, selectionGrouped: true });
    expect(t.ids()).toEqual(["duplicate", "copy", "ungroup", "delete", "more"]);
  });
  it("S5 : posée 8 px au-dessus du cadre, centrée, px entiers ; suit la caméra, même taille", () => {
    const t = setup();
    expect([t.bar().style.left, t.bar().style.top]).toEqual(["210px", "248px"]);
    t.moveCamera({ zoom: 2, tx: 0, ty: -300 });
    expect([t.bar().style.left, t.bar().style.top]).toEqual(["510px", "248px"]);
  });
  it("D25 : appui long (doigt) : infobulle sans action ; toucher court : action", () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      const dup = t.bar().querySelector<HTMLButtonElement>('[data-selection-action="duplicate"]')!;
      fireEvent.pointerDown(dup, { pointerType: "touch" });
      vi.advanceTimersByTime(600);
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Dupliquer");
      fireEvent.pointerUp(dup, { pointerType: "touch" });
      fireEvent.click(dup);
      expect(t.host.selection).not.toHaveBeenCalled();
      fireEvent.pointerDown(dup, { pointerType: "touch" });
      vi.advanceTimersByTime(100);
      fireEvent.pointerUp(dup, { pointerType: "touch" });
      fireEvent.click(dup);
      expect(t.host.selection).toHaveBeenCalledWith("duplicate");
    } finally {
      vi.useRealTimers();
    }
  });
  it("D25 : appui long sur « … » : infobulle, la liste ne s'ouvre pas", () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      const more = t.bar().querySelector<HTMLButtonElement>("[data-object-more]")!;
      fireEvent.pointerDown(more, { pointerType: "touch" });
      vi.advanceTimersByTime(600);
      fireEvent.pointerUp(more, { pointerType: "touch" });
      fireEvent.click(more);
      expect(t.bar().querySelector("[data-object-menu]")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it("D21 : pointeur enfoncé dans la scène : cachée ; relâché : reposée", () => {
    const t = setup();
    fireEvent.pointerDown(t.stage, { pointerType: "touch" });
    expect(t.bar().hidden).toBe(true);
    fireEvent.pointerUp(window, { pointerType: "touch" });
    expect(t.bar().hidden).toBe(false);
  });
  it("D25 : la barre est hors de la scène (dans le conteneur) : un appui sur elle n'atteint pas la scène", () => {
    const t = setup();
    expect(t.bar().parentElement).toBe(t.mount);
    expect(t.stage.contains(t.bar())).toBe(false);
    const seen = vi.fn();
    t.stage.addEventListener("pointerdown", seen);
    fireEvent.pointerDown(t.bar().querySelector("[data-object-button]")!, { pointerType: "touch" });
    expect(seen).not.toHaveBeenCalled();
    expect(t.bar().hidden).toBe(false);
  });
  it("D20 : obstacle posé après la barre (îlot placé à l'image suivante) : la barre se décale une image plus tard", async () => {
    const obs: { x: number; y: number; w: number; h: number }[] = [];
    const t = setup(BASE, obs);
    expect(t.bar().style.left).toBe("210px");
    obs.push({ x: 200, y: 240, w: 200, h: 60 });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    expect(t.bar().style.left).toBe("408px");
  });
  it("effet de bord 12 : Suppr, Espace, Échap pressés dans la barre n'atteignent pas le moteur ; la sélection reste", () => {
    const t = setup();
    const engineKeys = vi.fn();
    window.addEventListener("keydown", engineKeys);
    fireEvent.keyDown(window, { key: "F10", shiftKey: true });
    engineKeys.mockClear();
    const first = document.activeElement as HTMLElement;
    for (const key of ["Delete", " ", "Backspace"]) fireEvent.keyDown(first, { key });
    fireEvent.keyDown(first, { key: "Escape" });
    expect(engineKeys).not.toHaveBeenCalled();
    expect(t.host.selection).not.toHaveBeenCalled();
    expect(t.bar().hidden).toBe(false);
    window.removeEventListener("keydown", engineKeys);
  });
  it("S7 : « … » : Premier plan, Arrière-plan, Exporter la sélection, icône et libellé ; jouées", () => {
    const t = setup();
    fireEvent.click(t.bar().querySelector("[data-object-more]")!);
    const rows = [...t.bar().querySelectorAll<HTMLButtonElement>("[data-object-menu] button[role=menuitem]")];
    expect(rows.map((r) => r.querySelector("span:not([data-shortcut])")?.textContent?.trim())).toEqual(["Premier plan", "Arrière-plan", "Exporter la sélection"]);
    expect(rows.every((r) => r.querySelector("svg.rb-icon") !== null)).toBe(true);
    fireEvent.click(rows[0]!);
    expect(t.host.runAction).toHaveBeenCalledWith("layer-front");
    expect(t.bar().querySelector("[data-object-menu]")).toBeNull();
  });
  it("D24 : Maj+F10 met le focus sur le premier bouton ; ←/→ sans atteindre le moteur ; Échap rend la scène", () => {
    const t = setup();
    const engineKeys = vi.fn();
    window.addEventListener("keydown", engineKeys);
    fireEvent.keyDown(window, { key: "F10", shiftKey: true });
    const first = t.bar().querySelector<HTMLElement>('[data-selection-action="duplicate"]')!;
    expect(document.activeElement).toBe(first);
    engineKeys.mockClear();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("data-selection-action")).toBe("copy");
    expect(engineKeys).not.toHaveBeenCalled();
    expect([...t.bar().querySelectorAll<HTMLElement>("[data-object-button]")].filter((b) => b.tabIndex === 0)).toHaveLength(1);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(document.activeElement).toBe(t.stage);
    window.removeEventListener("keydown", engineKeys);
  });
  it("D24 : la touche Menu (équivalent clavier du clic droit) met aussi le focus sur la barre ; sans sélection : rien", () => {
    const t = setup();
    fireEvent.keyDown(window, { key: "ContextMenu" });
    expect(document.activeElement?.getAttribute("data-selection-action")).toBe("duplicate");
    t.stage.focus();
    t.setView({ ...BASE, selection: [], selectionBounds: null });
    fireEvent.keyDown(window, { key: "ContextMenu" });
    expect(document.activeElement).toBe(t.stage);
  });
  it("D24 : sur « … », ↓ ouvre la liste, ↓ et Entrée jouent ; Échap ferme et rend le focus à « … »", () => {
    const t = setup();
    const more = t.bar().querySelector<HTMLElement>("[data-object-more]")!;
    more.focus();
    fireEvent.keyDown(more, { key: "ArrowDown" });
    const rows = (): HTMLElement[] => [...t.bar().querySelectorAll<HTMLElement>("[data-object-menu] button")];
    expect(document.activeElement).toBe(rows()[0]);
    fireEvent.keyDown(rows()[0]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows()[1]);
    fireEvent.keyDown(rows()[1]!, { key: "Escape" });
    expect(t.bar().querySelector("[data-object-menu]")).toBeNull();
    expect(document.activeElement).toBe(more);
  });
  it("sélection vidée, liste ouverte : liste et barre fermées sans erreur (Review Focus 4)", () => {
    const t = setup();
    fireEvent.click(t.bar().querySelector("[data-object-more]")!);
    expect(() => t.setView({ ...BASE, selection: [], selectionBounds: null })).not.toThrow();
    expect(t.bar().querySelector("[data-object-menu]")).toBeNull();
    expect(t.bar().hidden).toBe(true);
  });
});
