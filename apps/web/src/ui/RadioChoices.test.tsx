// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
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
});
