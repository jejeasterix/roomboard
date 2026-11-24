// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Show, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ICONS } from "./icons";
import { Icon, IconButton } from "./IconButton";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const tips = (): Element[] => [...document.querySelectorAll('[role="tooltip"]')];
const one = (icon: string | null = "rect", label = "Rectangle", onPress = vi.fn()) => {
  const r = render(() => <IconButton icon={icon} label={label} attrs={{ "data-item": "rect" }} onPress={onPress} />);
  return { ...r, btn: r.container.querySelector("button")!, onPress };
};

describe("Icon (L1-1)", () => {
  it("svg calé, trait 1,5, caché aux lecteurs d'écran, un enfant SVG par entrée d'ICONS", () => {
    const { container } = render(() => <Icon name="table" />);
    const svg = container.querySelector("svg.rb-icon")!;
    expect(svg.getAttribute("viewBox")).toBe("-0.25 -0.25 24 24");
    expect(svg.getAttribute("stroke-width")).toBe("1.5");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(svg.getAttribute("data-icon")).toBe("table");
    expect([...svg.children].map((c) => c.tagName.toLowerCase())).toEqual(ICONS.table!.map(([t]) => t));
    expect(svg.children[0]!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.querySelector("rect")!.getAttribute("rx")).toBe("2");
  });
  it("aucun innerHTML dans IconButton.tsx (rendu par Dynamic)", () => {
    expect(readFileSync(join(__dirname, "IconButton.tsx"), "utf8")).not.toMatch(/innerHTML/);
  });
});

describe("IconButton (L1-4)", () => {
  it("icône : svg, aria-label, libellé en rb-sr (textContent = libellé), classe rb-ib, aucun title", () => {
    const { btn } = one();
    expect(btn.querySelector("svg.rb-icon")?.getAttribute("data-icon")).toBe("rect");
    expect(btn.getAttribute("aria-label")).toBe("Rectangle");
    expect(btn.querySelector(".rb-sr")?.textContent).toBe("Rectangle");
    expect(btn.textContent).toBe("Rectangle");
    expect(btn.classList.contains("rb-ib")).toBe(true);
    expect(btn.hasAttribute("title")).toBe(false);
    expect(btn.getAttribute("data-item")).toBe("rect");
    expect(btn.getAttribute("type")).toBe("button");
  });
  it("sans icône ni enfant : libellé visible, aucun svg, jamais vide", () => {
    const { btn } = one(null, "Laser");
    expect(btn.querySelector("svg")).toBeNull();
    expect(btn.querySelector(".rb-sr")).toBeNull();
    expect(btn.textContent).toBe("Laser");
    expect(btn.classList.contains("rb-ib")).toBe(false);
  });
  it("pastille (enfant) : enfant + rb-sr, classe d'attrs gardée", () => {
    const { container } = render(() => (
      <IconButton icon={null} label="Rouge" attrs={{ class: "rb-preset", "data-preset": "rouge" }} onPress={() => {}}>
        <span class="rb-swatch" />
      </IconButton>
    ));
    const btn = container.querySelector("button")!;
    expect(btn.querySelector(".rb-swatch")).not.toBeNull();
    expect(btn.textContent).toBe("Rouge");
    expect([btn.classList.contains("rb-preset"), btn.classList.contains("rb-ib")]).toEqual([true, true]);
    expect(btn.getAttribute("data-preset")).toBe("rouge");
  });
  it("clic → onPress ; pressed null : pas d'aria-pressed ; true : aria-pressed ; disabled", () => {
    const { btn, onPress } = one();
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(btn.hasAttribute("aria-pressed")).toBe(false);
    cleanup();
    const { container } = render(() => <IconButton icon="pen" label="Stylo" pressed={true} disabled={true} onPress={() => {}} />);
    const b = container.querySelector("button")!;
    expect([b.getAttribute("aria-pressed"), b.disabled]).toEqual(["true", true]);
  });
  it("survol souris : une infobulle dans body à 400 ms, hors du bouton, au libellé ; sortie : partie", () => {
    const { btn } = one();
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    vi.advanceTimersByTime(399);
    expect(tips()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(tips()).toHaveLength(1);
    expect(tips()[0]!.textContent).toBe("Rectangle");
    expect(btn.contains(tips()[0]!)).toBe(false);
    expect(tips()[0]!.classList.contains("rb-tip")).toBe(true);
    expect(btn.textContent).toBe("Rectangle");
    fireEvent.pointerLeave(btn, { pointerType: "mouse" });
    expect(tips()).toHaveLength(0);
  });
  it("focus clavier (:focus-visible) : infobulle tout de suite ; blur : partie", () => {
    const { btn } = one();
    btn.focus();
    expect(tips().map((t) => t.textContent)).toEqual(["Rectangle"]);
    btn.blur();
    expect(tips()).toHaveLength(0);
  });
  it("focus que le navigateur ne marque pas :focus-visible : pas d'infobulle", () => {
    const { btn } = one();
    const matches = btn.matches.bind(btn);
    vi.spyOn(btn, "matches").mockImplementation((s: string) => s !== ":focus-visible" && matches(s));
    btn.focus();
    expect(tips()).toHaveLength(0);
  });
  it("clic puis départ et retour de fenêtre (blur, focus) : pas d'infobulle", () => {
    const { btn } = one();
    fireEvent.pointerDown(btn, { pointerType: "mouse" });
    btn.focus();
    fireEvent.pointerUp(btn, { pointerType: "mouse" });
    fireEvent.click(btn);
    expect(tips()).toHaveLength(0);
    const away = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    btn.blur();
    away.mockRestore();
    btn.focus();
    expect(tips()).toHaveLength(0);
  });
  it("appui long au doigt : infobulle à 500 ms, le clic passe, pointerleave tactile ignoré, partie 1 500 ms après", () => {
    const { btn, onPress } = one();
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    vi.advanceTimersByTime(500);
    expect(tips()).toHaveLength(1);
    fireEvent.pointerUp(btn, { pointerType: "touch" });
    fireEvent.pointerLeave(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1499);
    expect(tips()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(tips()).toHaveLength(0);
  });
  it("une seule infobulle à la fois entre deux boutons", () => {
    const { container } = render(() => (
      <>
        <IconButton icon="pen" label="Stylo" onPress={() => {}} />
        <IconButton icon="undo" label="Annuler" onPress={() => {}} />
      </>
    ));
    const [a, b] = [...container.querySelectorAll("button")];
    a!.focus();
    expect(tips().map((t) => t.textContent)).toEqual(["Stylo"]);
    fireEvent.pointerEnter(b!, { pointerType: "mouse" });
    vi.advanceTimersByTime(400);
    expect(tips().map((t) => t.textContent)).toEqual(["Annuler"]);
  });
  it("le libellé change pendant l'affichage : l'infobulle suit", () => {
    const [label, setLabel] = createSignal("Souris");
    const { container } = render(() => <IconButton icon="pointer" label={label()} onPress={() => {}} />);
    container.querySelector("button")!.focus();
    expect(tips().map((t) => t.textContent)).toEqual(["Souris"]);
    setLabel("Dessin");
    expect(tips().map((t) => t.textContent)).toEqual(["Dessin"]);
  });
  it("bouton démonté pendant l'affichage : l'infobulle part avec lui", () => {
    const [on, setOn] = createSignal(true);
    const { container } = render(() => (
      <Show when={on()}>
        <IconButton icon="table" label="Tableau" onPress={() => {}} />
      </Show>
    ));
    container.querySelector("button")!.focus();
    expect(tips()).toHaveLength(1);
    setOn(false);
    expect(tips()).toHaveLength(0);
  });
});
