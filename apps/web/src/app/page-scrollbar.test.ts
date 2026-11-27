// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { PageScroll } from "../engine/engine";
import { createPageScrollbar, THUMB_MIN, thumbHeight } from "./page-scrollbar";

function setup(scroll: PageScroll | null = { at: 0, visible: 0.25, top: 120, span: 600 }) {
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
  const bar = createPageScrollbar(stage, engine);
  const el = bar.element;
  const thumb = el.firstElementChild as HTMLElement;
  const set = (n: PageScroll | null): void => {
    s = n;
  };
  return { stage, el, thumb, engine, bar, set };
}

const pointer = (type: string, clientY: number, o: PointerEventInit = {}): PointerEvent =>
  new PointerEvent(type, { clientY, pointerId: 1, pointerType: "touch", button: 0, bubbles: true, cancelable: true, ...o });

describe("ascenseur du portrait (OG24)", () => {
  it("thumbHeight : part visible du rail, 44 px au moins, jamais plus que le rail", () => {
    expect(thumbHeight(600, 0.25)).toBe(150);
    expect(thumbHeight(600, 0.01)).toBe(THUMB_MIN);
    expect(thumbHeight(30, 0.5)).toBe(30);
  });
  it("update : posé sous le haut de page ajustée, curseur placé, valeur ARIA ; caché sans défilement", () => {
    const { el, thumb, bar, set } = setup();
    bar.update();
    expect(el.hidden).toBe(false);
    expect(el.getAttribute("role")).toBe("scrollbar");
    expect(el.style.top).toBe("120px");
    expect(el.style.bottom).toBe("16px");
    expect(thumb.style.height).toBe("150px");
    expect(el.getAttribute("aria-valuenow")).toBe("0");
    set({ at: 0.5, visible: 0.25, top: 120, span: 600 });
    bar.update();
    expect(thumb.style.transform).toBe("translateY(225px)");
    expect(el.getAttribute("aria-valuenow")).toBe("50");
    set(null);
    bar.update();
    expect(el.hidden).toBe(true);
  });
  it("glisser le curseur : la page suit sans saut ; la scène ne voit aucun pointeur saisi", () => {
    const { stage, thumb, engine, bar } = setup();
    bar.update();
    const seen = vi.fn();
    for (const t of ["pointerdown", "pointermove", "pointerup"]) stage.addEventListener(t, seen);
    thumb.dispatchEvent(pointer("pointerdown", 170));
    expect(engine.scrollPageTo).not.toHaveBeenCalled();
    thumb.dispatchEvent(pointer("pointermove", 170 + 225));
    expect(engine.scrollPageTo).toHaveBeenLastCalledWith(0.5);
    thumb.dispatchEvent(pointer("pointermove", 170 + 300, { pointerId: 2 }));
    expect(engine.scrollPageTo).toHaveBeenCalledTimes(1);
    thumb.dispatchEvent(pointer("pointerup", 400));
    expect(seen).toHaveBeenCalledTimes(1); // le seul pointermove de l'autre pointeur passe
    thumb.dispatchEvent(pointer("pointermove", 600));
    expect(engine.scrollPageTo).toHaveBeenCalledTimes(1);
  });
  it("bouton droit ou milieu de la souris : rien, le pointeur passe à la scène", () => {
    const { stage, thumb, engine, bar } = setup();
    bar.update();
    const seen = vi.fn();
    stage.addEventListener("pointerdown", seen);
    thumb.dispatchEvent(pointer("pointerdown", 170, { pointerType: "mouse", button: 1 }));
    thumb.dispatchEvent(pointer("pointermove", 400, { pointerType: "mouse" }));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(engine.scrollPageTo).not.toHaveBeenCalled();
  });
  it("rejet de paume (D18) : un toucher pendant qu'un stylet touche la scène passe à la scène", () => {
    const { stage, thumb, engine, bar } = setup();
    bar.update();
    stage.dispatchEvent(pointer("pointerdown", 300, { pointerType: "pen", pointerId: 7 }));
    const seen = vi.fn();
    stage.addEventListener("pointerdown", seen);
    thumb.dispatchEvent(pointer("pointerdown", 170));
    thumb.dispatchEvent(pointer("pointermove", 400));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(engine.scrollPageTo).not.toHaveBeenCalled();
    stage.dispatchEvent(pointer("pointerup", 300, { pointerType: "pen", pointerId: 7 }));
    thumb.dispatchEvent(pointer("pointerdown", 170, { pointerId: 3 }));
    thumb.dispatchEvent(pointer("pointermove", 170 + 225, { pointerId: 3 }));
    expect(engine.scrollPageTo).toHaveBeenLastCalledWith(0.5);
  });
});
