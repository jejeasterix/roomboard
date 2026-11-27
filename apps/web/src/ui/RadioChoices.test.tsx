// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RadioChoices, type RadioOption } from "./RadioChoices";

afterEach(cleanup);

type Dock = "top" | "left" | "floating";
const DOCKS: readonly RadioOption<Dock>[] = [
  { value: "top", label: "En haut", icon: "dock-top" },
  { value: "left", label: "À gauche", icon: "dock-left" },
  { value: "floating", label: "Flottante", icon: "dock-float", detail: "En annotation : en haut" },
];
function setup(look: "card" | "tile" | "segment" = "tile", start: Dock = "top") {
  const [value, setValue] = createSignal<Dock>(start);
  const choose = vi.fn((v: Dock) => setValue(() => v));
  const r = render(() => <RadioChoices name="dock" label="Emplacement" look={look} options={DOCKS} value={value()} choose={choose} />);
  const radio = (v: string): HTMLButtonElement => r.container.querySelector<HTMLButtonElement>(`[data-choice="${v}"]`)!;
  return { ...r, choose, value, radio };
}
const tick = (): Promise<void> => new Promise((res) => setTimeout(res, 0));

describe("RadioChoices (design-l3, L3-23, DA-L3-2)", () => {
  it("L3-23 : radiogroup nommé, data-edit et data-look ; un bouton role=radio par option, data-choice", () => {
    const { container } = setup();
    const group = container.querySelector('[role="radiogroup"]')!;
    expect(group.getAttribute("aria-label")).toBe("Emplacement");
    expect(group.getAttribute("data-edit")).toBe("dock");
    expect(group.getAttribute("data-look")).toBe("tile");
    expect([...group.querySelectorAll('[role="radio"]')].map((b) => b.getAttribute("data-choice"))).toEqual(["top", "left", "floating"]);
  });
  it("L3-23 : aria-checked vrai sur la valeur seule ; un seul arrêt de tabulation, le bouton choisi", () => {
    const { radio } = setup("tile", "left");
    expect(["top", "left", "floating"].map((v) => radio(v).getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(["top", "left", "floating"].map((v) => radio(v).getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });
  it("L3-23 : un clic choisit", () => {
    const { radio, choose } = setup();
    fireEvent.click(radio("floating"));
    expect(choose).toHaveBeenCalledWith("floating");
    expect(radio("floating").getAttribute("aria-checked")).toBe("true");
  });
  it("L3-23 : Flèche droite et bas : choix et focus au suivant ; gauche et haut : au précédent ; bouclent aux bouts", async () => {
    const { radio, choose } = setup("tile", "top");
    radio("top").focus();
    fireEvent.keyDown(radio("top"), { key: "ArrowRight" });
    await tick();
    expect(choose).toHaveBeenLastCalledWith("left");
    expect(document.activeElement).toBe(radio("left"));
    fireEvent.keyDown(radio("left"), { key: "ArrowDown" });
    await tick();
    expect(document.activeElement).toBe(radio("floating"));
    fireEvent.keyDown(radio("floating"), { key: "ArrowRight" });
    await tick();
    expect(choose).toHaveBeenLastCalledWith("top");
    fireEvent.keyDown(radio("top"), { key: "ArrowLeft" });
    await tick();
    expect(choose).toHaveBeenLastCalledWith("floating");
    fireEvent.keyDown(radio("floating"), { key: "ArrowUp" });
    await tick();
    expect(document.activeElement).toBe(radio("left"));
  });
  it("L3-23 : une autre touche ne choisit rien", () => {
    const { radio, choose } = setup();
    fireEvent.keyDown(radio("top"), { key: "a" });
    expect(choose).not.toHaveBeenCalled();
  });
  it("L3-23 : icône, libellé et détail rendus dans l'ordre ; carte choisie : pastille check, les autres non", () => {
    const { radio } = setup("card", "left");
    expect(radio("floating").querySelector("svg")?.getAttribute("data-icon")).toBe("dock-float");
    expect(radio("floating").querySelector(".rb-radio-label")?.textContent).toBe("Flottante");
    expect(radio("floating").querySelector(".rb-radio-detail")?.textContent).toBe("En annotation : en haut");
    expect(radio("left").querySelector(".rb-radio-chk svg")?.getAttribute("data-icon")).toBe("check");
    expect(radio("top").querySelector(".rb-radio-chk")).toBeNull();
  });
  it("L3-23 : aspect segment ou vignette : jamais de pastille ; textContent = libellé (+ détail)", () => {
    const { radio } = setup("segment", "left");
    expect(radio("left").querySelector(".rb-radio-chk")).toBeNull();
    expect(radio("left").textContent).toBe("À gauche");
  });
  it("L3-23 : valeur absente des options : le premier bouton garde l'arrêt de tabulation", () => {
    const { container } = render(() => <RadioChoices name="x" label="X" look="segment" options={DOCKS} value={"bottom" as unknown as Dock} choose={() => undefined} />);
    expect([...container.querySelectorAll('[role="radio"]')].map((b) => b.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });
  it("L3-23 (relecture) : une valeur contenant un guillemet : la flèche déplace le focus sans lever", async () => {
    const odd: readonly RadioOption<string>[] = [{ value: 'a"b', label: "A" }, { value: "c", label: "C" }];
    const [value, setValue] = createSignal("c");
    const { container } = render(() => <RadioChoices name="odd" label="Étrange" look="tile" options={odd} value={value()} choose={(v) => setValue(v)} />);
    const radios = container.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    radios[1]!.focus();
    fireEvent.keyDown(radios[1]!, { key: "ArrowRight" });
    await tick();
    expect(value()).toBe('a"b');
    expect(document.activeElement).toBe(radios[0]);
  });
  it("OG11 : value null : aucun enfoncé, premier tabulable ; valueAttr pose l'attribut", () => {
    const r = render(() => <RadioChoices name="dock" label="Emplacement" look="segment" options={DOCKS} value={null} valueAttr="data-option-value" choose={() => {}} />);
    const radios = [...r.container.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(radios.map((b) => b.getAttribute("aria-checked"))).toEqual(["false", "false", "false"]);
    expect(radios.map((b) => b.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    expect(radios.map((b) => b.getAttribute("data-option-value"))).toEqual(["top", "left", "floating"]);
  });
  it("personnalisation-1b : aspects rail et chips : data-look posé, flèches comme les autres", () => {
    for (const look of ["rail", "chips"] as const) {
      const choose = vi.fn();
      const r = render(() => <RadioChoices name="essai" label="Essai" look={look} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" choose={choose} />);
      const group = r.container.querySelector('[role="radiogroup"]')!;
      expect(group.getAttribute("data-look")).toBe(look);
      fireEvent.keyDown(r.container.querySelector('[data-choice="a"]')!, { key: "ArrowRight" });
      expect(choose).toHaveBeenCalledWith("b");
      r.unmount();
    }
  });
});

describe("RadioChoices : infobulle par segment (OG23, T17)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const tips: readonly RadioOption<"a" | "b">[] = [{ value: "a", label: "A", tip: "Texte de A" }, { value: "b", label: "B" }];
  it("le survol d'un segment à infobulle montre sa bulle ; un segment sans infobulle n'en a pas", () => {
    const r = render(() => <RadioChoices name="t" label="T" look="segment" options={tips} value="a" choose={() => {}} />);
    const a = r.container.querySelector<HTMLElement>('[data-choice="a"]')!;
    const b = r.container.querySelector<HTMLElement>('[data-choice="b"]')!;
    fireEvent.pointerEnter(b, { pointerType: "mouse" });
    vi.advanceTimersByTime(1000);
    expect(document.querySelector(".rb-tip")).toBeNull();
    fireEvent.pointerEnter(a, { pointerType: "mouse" });
    vi.advanceTimersByTime(1000);
    expect(document.querySelector(".rb-tip")?.textContent).toBe("Texte de A");
    fireEvent.pointerLeave(a, { pointerType: "mouse" });
  });
  it("keepFocus : l'appui d'un segment à infobulle ne prend toujours pas le focus", () => {
    const r = render(() => <RadioChoices keepFocus name="t" label="T" look="segment" options={tips} value="a" choose={() => {}} />);
    const a = r.container.querySelector<HTMLElement>('[data-choice="a"]')!;
    expect(fireEvent.pointerDown(a, { pointerType: "mouse", cancelable: true })).toBe(false);
    expect(fireEvent.mouseDown(a, { cancelable: true })).toBe(false);
  });
});
