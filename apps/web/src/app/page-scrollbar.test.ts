// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { PageScroll } from "../engine/engine";
import { createPageScrollbar, THUMB_MIN, thumbHeight } from "./page-scrollbar";

function setup(scroll: PageScroll | null = { at: 0, visible: 0.25, span: 600 }) {
  const stage = document.createElement("div");
  document.body.append(stage);
  let s = scroll;
  const engine = {
    pageScroll: () => s,
    scrollPageTo: vi.fn((at: number) => {
      if (s !== null) s = { ...s, at: Math.min(1, Math.max(0, at)) };
      return true;
    }),
  };
  const bar = createPageScrollbar(stage, engine, () => 120);
  const el = bar.element;
  // happy-dom ne fait aucune mise en page : rail de 600 px à y 120, curseur lu sur son style.
  Object.defineProperty(el, "clientHeight", { value: 600 });
  el.getBoundingClientRect = () => ({ top: 120, bottom: 720, height: 600, left: 0, right: 44, width: 44, x: 0, y: 120, toJSON: () => ({}) });
  const thumb = el.firstElementChild as HTMLElement;
  thumb.getBoundingClientRect = () => {
    const y = 120 + Number(/translateY\(([-\d.]+)px\)/.exec(thumb.style.transform)?.[1] ?? 0);
    const h = parseFloat(thumb.style.height);
    return { top: y, bottom: y + h, height: h, left: 0, right: 44, width: 44, x: 0, y, toJSON: () => ({}) };
  };
  const set = (n: PageScroll | null): void => {
    s = n;
  };
  return { stage, el, thumb, engine, bar, set };
}

const pointer = (type: string, clientY: number, pointerId = 1): PointerEvent =>
  new PointerEvent(type, { clientY, pointerId, bubbles: true, cancelable: true });

describe("ascenseur du portrait (OG24)", () => {
  it("thumbHeight : part visible du rail, 44 px au moins, jamais plus que le rail", () => {
    expect(thumbHeight(600, 0.25)).toBe(150);
    expect(thumbHeight(600, 0.01)).toBe(THUMB_MIN);
    expect(thumbHeight(30, 0.5)).toBe(30);
  });
  it("update : visible sous le haut de page ajustée, curseur placé, valeur ARIA ; caché sans défilement", () => {
    const { el, thumb, bar, set } = setup();
    bar.update();
    expect(el.hidden).toBe(false);
    expect(el.getAttribute("role")).toBe("scrollbar");
    expect(el.style.top).toBe("120px");
    expect(el.style.bottom).toBe("16px");
    expect(thumb.style.height).toBe("150px");
    expect(el.getAttribute("aria-valuenow")).toBe("0");
    set({ at: 0.5, visible: 0.25, span: 600 });
    bar.update();
    expect(thumb.style.transform).toBe("translateY(225px)");
    expect(el.getAttribute("aria-valuenow")).toBe("50");
    set(null);
    bar.update();
    expect(el.hidden).toBe(true);
  });
  it("glisser le curseur : la page suit, sans saut au toucher ; la scène ne voit aucun pointeur", () => {
    const { stage, el, engine, bar } = setup();
    bar.update();
    const seen = vi.fn();
    stage.addEventListener("pointerdown", seen);
    stage.addEventListener("pointermove", seen);
    stage.addEventListener("pointerup", seen);
    el.dispatchEvent(pointer("pointerdown", 170));
    expect(engine.scrollPageTo).not.toHaveBeenCalled();
    el.dispatchEvent(pointer("pointermove", 170 + 225));
    expect(engine.scrollPageTo).toHaveBeenLastCalledWith(0.5);
    el.dispatchEvent(pointer("pointermove", 170 + 225, 2));
    expect(engine.scrollPageTo).toHaveBeenCalledTimes(1);
    el.dispatchEvent(pointer("pointerup", 400));
    el.dispatchEvent(pointer("pointermove", 600));
    expect(engine.scrollPageTo).toHaveBeenCalledTimes(1);
    expect(seen).not.toHaveBeenCalled();
  });
  it("toucher le rail : le milieu du curseur y vient, puis le glisser suit", () => {
    const { el, engine, bar } = setup();
    bar.update();
    el.dispatchEvent(pointer("pointerdown", 120 + 450 + 75));
    expect(engine.scrollPageTo).toHaveBeenLastCalledWith(1);
    el.dispatchEvent(pointer("pointermove", 120 + 225 + 75));
    expect(engine.scrollPageTo).toHaveBeenLastCalledWith(0.5);
    el.dispatchEvent(pointer("pointercancel", 0));
  });
});
