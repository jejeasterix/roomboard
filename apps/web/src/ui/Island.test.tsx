// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal, type Accessor } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IslandState } from "../device-settings";
import type { Toolbar as Bar } from "../toolbar";
import { COLLAPSE_LABEL, EXPAND_LABEL, GRIP_LABEL, Island, IslandLayer, type IslandStore } from "./Island";
import type { Box, Corners, Lane } from "./island-place";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const bar = (id: string, role: string, collapsed = false): Bar => ({ id, role, dock: "floating", collapsed, groups: [], rest: {} });
const MID: Box = { w: 1280, h: 900 };
const TOP: Corners = { start: 208, end: 108, band: 56 };
const store = (saved: IslandState = { at: null, collapsed: null }) =>
  ({ island: vi.fn(() => saved), setIsland: vi.fn(() => true) }) satisfies IslandStore;

function setup(o: { b?: Bar; saved?: IslandState; sheet?: Lane | null; noStore?: boolean } = {}) {
  const s = store(o.saved);
  const [area, setArea] = createSignal<Box>(MID);
  const onPlaced = vi.fn();
  const b = o.b ?? bar("outils", "tools");
  const r = render(() => (
    <Island bar={b} anchor="top-center" movable profileId="defaut" {...(o.noStore ? {} : { store: s })} area={area} corners={() => TOP} sheet={() => o.sheet ?? null} onPlaced={onPlaced}>
      {(c) => <div data-toolbar={b.id} data-probe={c() ? "1" : "0"} />}
    </Island>
  ));
  const q = <T extends HTMLElement = HTMLElement>(sel: string): T => r.container.querySelector<T>(sel)!;
  const grip = (): HTMLButtonElement => {
    const g = q<HTMLButtonElement>("[data-island-grip]");
    g.setPointerCapture = vi.fn();
    g.releasePointerCapture = vi.fn();
    return g;
  };
  return { ...r, s, setArea, onPlaced, q, island: () => q(".rb-island"), grip, collapse: () => q<HTMLButtonElement>("[data-island-collapse]") };
}
const pos = (el: HTMLElement): string[] => [el.style.left, el.style.top];
const ptr = (type: string, x: number, y: number): PointerEvent => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, button: 0 });

/** Largeur naturelle `w` d'un `.rb-island`, bridée par son `max-inline-size` comme le ferait un navigateur : un
 *  îlot mesuré sans lever `max-inline-size` ne rend jamais plus que la largeur qu'on lui laisse. */
function natural(w: number): void {
  const real = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (!(this instanceof HTMLElement) || !this.classList.contains("rb-island")) return real.call(this);
    const m = this.style.getPropertyValue("max-inline-size");
    const width = m === "" || m === "none" ? w : Math.min(w, Number.parseInt(m, 10));
    return { x: 0, y: 0, left: 0, top: 0, width, height: 48, right: width, bottom: 48, toJSON: () => ({}) } as DOMRect;
  });
}

describe("Island (design-l2 L2-7 à L2-16)", () => {
  it("design-l2 L2-8 : barre d'outils : poignée en tête, Replier en fin, libellés et icônes", () => {
    const { island, grip, collapse } = setup();
    const kids = [...island().children];
    expect(kids[0]!.hasAttribute("data-island-grip")).toBe(true);
    expect(kids.at(-1)!.hasAttribute("data-island-collapse")).toBe(true);
    expect(grip().getAttribute("aria-label")).toBe(GRIP_LABEL);
    expect(grip().querySelector("svg")?.getAttribute("data-icon")).toBe("grip");
    expect(collapse().getAttribute("aria-label")).toBe(COLLAPSE_LABEL);
    expect(collapse().getAttribute("aria-expanded")).toBe("true");
    expect(collapse().querySelector("svg")?.getAttribute("data-icon")).toBe("collapse");
    expect([island().getAttribute("data-island"), island().getAttribute("data-anchor")]).toEqual(["outils", "top-center"]);
  });

  it("design-l2 L2-12 : sans position : voie du haut, centrée, px entiers par left / top, aucun transform", () => {
    const { island } = setup();
    // largeur 0 sous happy-dom : centre de 1280 ; place symétrique 1280 - 2 × (16 + 208 + 8) = 816
    expect(pos(island())).toEqual(["640px", "16px"]);
    expect(island().style.getPropertyValue("max-inline-size")).toBe("816px");
    expect(island().style.transform).toBe("");
  });

  it("design-l2 L2-12 (discrimine) : largeur impaire 301 : left = Math.round(979 / 2) = 490, jamais 50 %, translate ni demi-pixel", () => {
    natural(301);
    const { island } = setup();
    expect(pos(island())).toEqual(["490px", "16px"]);
    expect(island().style.transform).toBe("");
    expect(island().getAttribute("style") ?? "").not.toMatch(/translate|%|\d\.\d/);
  });

  it("design-l2 L2-30 (discrimine) : largeur lue max-inline-size levée : 900 > 816, l'îlot descend sous la rangée du haut", () => {
    // Mesuré bridé à 816 (la place symétrique), il resterait sur la rangée du haut en (232, 16) et défilerait.
    natural(900);
    const { island } = setup();
    expect(pos(island())).toEqual(["190px", "80px"]);
    expect(island().style.getPropertyValue("max-inline-size")).toBe("1248px");
  });

  it("design-l2 L2-30 (a) : poignée et Replier hors de la partie qui défile ([data-toolbar])", () => {
    const { island, q } = setup();
    expect(q("[data-toolbar]").querySelector("[data-island-grip], [data-island-collapse]")).toBeNull();
    expect(q("[data-island-grip]").parentElement).toBe(island());
    expect(q("[data-island-collapse]").parentElement).toBe(island());
  });

  it("design-l2 L2-15 : habillage par la règle .rb-island de rb.css (jetons), jamais en style en ligne : le style ne porte que la position", () => {
    const { island } = setup();
    expect(island().classList.contains("rb-island")).toBe(true);
    const css = island().getAttribute("style") ?? "";
    for (const t of ["--rf-white", "--rf-radius-xl", "--rf-gray-300", "--rf-shadow-hover", "background", "border-radius", "box-shadow"]) expect(css, t).not.toContain(t);
  });

  it("design-l2 L2-7 : position et repli lus sur l'appareil au montage", () => {
    const { island, s, q } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: true } });
    expect(s.island).toHaveBeenCalledWith("defaut", "outils");
    expect(pos(island())).toEqual(["40px", "200px"]);
    expect(island().getAttribute("data-collapsed")).toBe("1");
    expect(q("[data-probe]").getAttribute("data-probe")).toBe("1");
  });

  it("design-l2 L2-8 : Replier puis Déplier : data-collapsed, icône down, aria-expanded, écrit sur l'appareil", () => {
    const { island, collapse, s, q } = setup();
    fireEvent.click(collapse());
    expect(island().getAttribute("data-collapsed")).toBe("1");
    expect(q("[data-probe]").getAttribute("data-probe")).toBe("1");
    expect(collapse().getAttribute("aria-expanded")).toBe("false");
    expect(collapse().getAttribute("aria-label")).toBe(EXPAND_LABEL);
    expect(collapse().querySelector("svg")?.getAttribute("data-icon")).toBe("down");
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: null, collapsed: true });
    fireEvent.click(collapse());
    expect(island().hasAttribute("data-collapsed")).toBe(false);
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: null, collapsed: false });
  });

  it("design-l2 L2-7 : collapsed du profil = état de départ quand l'appareil n'a rien", () => {
    const { island } = setup({ b: bar("outils", "tools", true) });
    expect(island().getAttribute("data-collapsed")).toBe("1");
  });

  it("design-l2 L2-10 : flèche droite +16, Maj + flèche bas +64, écrits ; Début recentre et efface la position", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    fireEvent.keyDown(grip(), { key: "ArrowRight" });
    expect(pos(island())).toEqual(["56px", "200px"]);
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: { x: 56, y: 200 }, collapsed: null });
    fireEvent.keyDown(grip(), { key: "ArrowDown", shiftKey: true });
    expect(pos(island())).toEqual(["56px", "264px"]);
    fireEvent.keyDown(grip(), { key: "Home" });
    expect(pos(island())).toEqual(["640px", "16px"]);
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: null, collapsed: null });
  });

  it("design-l2 L2-10 : une autre touche ne déplace rien et n'écrit rien", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    fireEvent.keyDown(grip(), { key: "a" });
    expect(pos(island())).toEqual(["40px", "200px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-10 : double appui sur la poignée : recentré", () => {
    const { island, grip } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    fireEvent.dblClick(grip());
    expect(pos(island())).toEqual(["640px", "16px"]);
  });

  it("design-l2 L2-9 : glisser la poignée : l'îlot suit, écrit au lâcher seulement", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    const g = grip();
    g.dispatchEvent(ptr("pointerdown", 100, 100));
    g.dispatchEvent(ptr("pointermove", 130, 400));
    expect(pos(island())).toEqual(["70px", "500px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
    g.dispatchEvent(ptr("pointerup", 130, 400));
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: { x: 70, y: 500 }, collapsed: null });
  });

  it("design-l2 L2-9 : Échap pendant le glisser : retour au départ, rien d'écrit", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    const g = grip();
    g.dispatchEvent(ptr("pointerdown", 100, 100));
    g.dispatchEvent(ptr("pointermove", 160, 160));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(pos(island())).toEqual(["40px", "200px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-11 : position bornée à l'affichage, jamais réécrite au redimensionnement", () => {
    const { island, setArea, s } = setup({ saved: { at: { x: 1000, y: 800 }, collapsed: null } });
    setArea({ w: 300, h: 300 });
    expect(pos(island())).toEqual(["300px", "300px"]);
    setArea(MID);
    expect(pos(island())).toEqual(["1000px", "800px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-16 : panneau ouvert : voie imposée, plusieurs rangées (data-wrap), clavier sans effet", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null }, sheet: { x: 16, y: 80, maxWidth: 392 } });
    expect(pos(island())).toEqual(["16px", "80px"]);
    expect(island().style.getPropertyValue("max-inline-size")).toBe("392px");
    expect(island().getAttribute("data-wrap")).toBe("1");
    fireEvent.keyDown(grip(), { key: "ArrowRight" });
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-4, H4 : îlot de coin : ni poignée ni Replier, aucune position en ligne, appareil jamais lu", () => {
    const s = store({ at: { x: 1, y: 1 }, collapsed: true });
    const r = render(() => (
      <Island bar={bar("menu", "menu")} anchor="top-start" movable={false} profileId="defaut" store={s} area={() => MID} corners={() => TOP} sheet={() => null}>
        {() => <div />}
      </Island>
    ));
    const el = r.container.querySelector<HTMLElement>(".rb-island")!;
    expect(el.querySelector("[data-island-grip], [data-island-collapse]")).toBeNull();
    expect(el.style.left).toBe("");
    expect(el.hasAttribute("data-collapsed")).toBe(false);
    expect(s.island).not.toHaveBeenCalled();
  });

  it("design-l2 L2-7 : sans réglage d'appareil : repli en mémoire", () => {
    const { island, collapse } = setup({ noStore: true });
    fireEvent.click(collapse());
    expect(island().getAttribute("data-collapsed")).toBe("1");
  });

  it("design-l2 L2-30 (c) : onPlaced rend la position et dit si l'îlot est déplacé", () => {
    const { onPlaced } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    expect(onPlaced).toHaveBeenLastCalledWith({ x: 40, y: 200, w: 0, h: 0, moved: true });
  });
});

describe("IslandLayer (design-l2 L2-5, L2-14)", () => {
  function layer(bars: readonly Bar[]) {
    const rendered = vi.fn((b: Bar, c: Accessor<boolean>) => <div data-toolbar={b.id} data-c={c() ? "1" : "0"} />);
    const r = render(() => (
      <IslandLayer bars={() => bars} render={rendered} head={<div data-tabs />} status={<p id="etat" role="status" />} profileId={() => "defaut"} size={() => "m"} sheetOpen={() => false} />
    ));
    const ids = (sel: string): (string | null)[] => [...r.container.querySelectorAll(sel)].map((e) => e.getAttribute("data-island"));
    return { ...r, rendered, ids };
  }
  const ALL = [bar("outils", "tools"), bar("menu", "menu"), bar("historique", "history"), bar("panneaux", "panels"), bar("pages", "pages"), bar("zoom", "zoom")];

  it("design-l2 L2-5 : menu en haut à gauche, puis onglets et #etat ; panneaux puis rôle inconnu en haut à droite ; historique en bas à gauche ; outils et pages centrés", () => {
    const { container, ids, rendered } = layer(ALL);
    expect(ids('.rb-corner[data-corner="top-start"] .rb-corner-menu > .rb-island')).toEqual(["menu"]);
    const head = container.querySelector('.rb-corner[data-corner="top-start"] > .rb-island.rb-head[data-island="onglets"]')!;
    expect(head.querySelector("[data-tabs]")).not.toBeNull();
    expect(head.nextElementSibling?.id).toBe("etat");
    expect(ids('.rb-corner[data-corner="top-end"] > .rb-island')).toEqual(["panneaux", "zoom"]);
    expect(ids('.rb-corner[data-corner="bottom-start"] > .rb-island')).toEqual(["historique"]);
    expect(ids(".rb-islands > .rb-island")).toEqual(["outils", "pages"]);
    expect(rendered).toHaveBeenCalledTimes(6);
  });

  it("design-l2 L2-12 (discrimine) : calque : îlots centrés placés par left / top en px entiers, jamais par la grille", () => {
    const { container } = layer(ALL);
    for (const id of ["outils", "pages"]) {
      const el = container.querySelector<HTMLElement>(`[data-island="${id}"]`)!;
      expect([el.style.left, el.style.top].every((v) => /^\d+px$/.test(v)), id).toBe(true);
      expect(el.style.transform, id).toBe("");
    }
  });

  it("design-l2 L2-8 : seule la barre de rôle tools porte poignée et Replier", () => {
    const { container } = layer(ALL);
    expect(container.querySelectorAll("[data-island-grip]")).toHaveLength(1);
    expect(container.querySelector('[data-island="outils"] [data-island-grip]')).not.toBeNull();
    expect(container.querySelectorAll("[data-island-collapse]")).toHaveLength(1);
  });

  it("design-l2 L2-5 : sans barre de menu (profil à bandes) : .rb-corner-menu vide, onglets au coin, #etat présent", () => {
    const { container } = layer([]);
    expect(container.querySelector(".rb-corner-menu")?.children).toHaveLength(0);
    expect(container.querySelector('.rb-corner[data-corner="top-start"] > .rb-head[data-island="onglets"]')).not.toBeNull();
    expect(container.querySelector("#etat")?.getAttribute("role")).toBe("status");
  });

  it("design-l2 L2-30 (c) : îlot des onglets : largeur maximale en px entiers, au moins 144", () => {
    const { container } = layer(ALL);
    const head = container.querySelector<HTMLElement>('[data-island="onglets"]')!;
    const w = head.style.getPropertyValue("max-inline-size");
    expect(w).toMatch(/^\d+px$/);
    expect(Number.parseInt(w, 10)).toBeGreaterThanOrEqual(144);
  });
});
