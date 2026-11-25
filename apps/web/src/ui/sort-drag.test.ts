// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SORT_EDGE_PX, slotOf, startSortDrag, type SortDragOptions } from "./sort-drag";

const ROW = 48;
const TOP = 100;
const mid = (i: number): number => TOP + i * ROW + ROW / 2;
afterEach(() => {
  document.body.innerHTML = "";
});

/** Liste de `n` lignes de 48 px à partir de y = 100, dans un `scroller` de [top, bottom] ; rectangles posés à la main
 *  (happy-dom ne calcule aucune mise en page). */
function list(n: number, view = { top: 0, bottom: 2000 }) {
  const scroller = document.createElement("div");
  let scroll = 0;
  Object.defineProperty(scroller, "scrollTop", { get: () => scroll, set: (v: number) => void (scroll = Math.max(0, v)) });
  scroller.getBoundingClientRect = () => new DOMRect(0, view.top, 500, view.bottom - view.top);
  const ul = document.createElement("ul");
  const rows = Array.from({ length: n }, (_, i) => {
    const li = document.createElement("li");
    li.getBoundingClientRect = () => new DOMRect(0, TOP + i * ROW - scroll, 500, ROW);
    const grip = document.createElement("button");
    grip.setPointerCapture = vi.fn();
    grip.releasePointerCapture = vi.fn();
    li.append(grip);
    ul.append(li);
    return li;
  });
  scroller.append(ul);
  document.body.append(scroller);
  return { scroller, rows };
}
const ev = (type: string, y: number, pointerType = "mouse"): PointerEvent => {
  const e = new PointerEvent(type, { clientX: 20, clientY: y, pointerId: 1, bubbles: true });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  return e;
};
function drag(rows: HTMLElement[], scroller: HTMLElement, from: number, pointerType = "mouse") {
  const opts = {
    rows: () => rows,
    scroller,
    from,
    moved: vi.fn<(dy: number, slot: number) => void>(),
    drop: vi.fn<(to: number) => void>(),
    tap: vi.fn<() => void>(),
    cancel: vi.fn<() => void>(),
  } satisfies SortDragOptions;
  const grip = rows[from]!.querySelector("button")!;
  const down = ev("pointerdown", mid(from), pointerType);
  Object.defineProperty(down, "currentTarget", { value: grip });
  startSortDrag(down, opts);
  return {
    opts,
    to: (y: number) => grip.dispatchEvent(ev("pointermove", y, pointerType)),
    up: (y: number) => grip.dispatchEvent(ev("pointerup", y, pointerType)),
    grip,
  };
}
const steps = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let y = from; from > to ? y > to : y < to; y += from > to ? -8 : 8) out.push(y);
  return [...out, to];
};

describe("sort-drag (design-l3, L3-13, L3-14)", () => {
  it("L3-13 : slotOf : nombre de milieux au-dessus du pointeur (strictement)", () => {
    expect(slotOf([124, 172, 220], 100)).toBe(0);
    expect(slotOf([124, 172, 220], 150)).toBe(1);
    expect(slotOf([124, 172, 220], 172)).toBe(1);
    expect(slotOf([124, 172, 220], 500)).toBe(3);
    expect(slotOf([], 10)).toBe(0);
  });
  it("L3-13 : bord de défilement à 48 px", () => {
    expect(SORT_EDGE_PX).toBe(48);
  });
  it("L3-13 : souris, Texte (rang 3) tiré jusqu'en tête : la ligne suit, les autres s'écartent ; un seul drop(0)", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    for (const y of steps(mid(3), 110)) d.to(y);
    expect(rows[3]!.style.transform).toBe("translateY(-158px)");
    expect(rows[3]!.hasAttribute("data-dragging")).toBe(true);
    expect(rows.slice(0, 3).map((r) => r.style.transform)).toEqual(["translateY(48px)", "translateY(48px)", "translateY(48px)"]);
    expect(rows[4]!.style.transform).toBe("");
    expect(d.opts.moved).toHaveBeenLastCalledWith(-158, 0);
    expect(d.opts.drop).not.toHaveBeenCalled();
    d.up(110);
    expect(d.opts.drop).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).toHaveBeenCalledWith(0);
    expect(rows.map((r) => r.style.transform)).toEqual(["", "", "", "", ""]);
    expect(rows[3]!.hasAttribute("data-dragging")).toBe(false);
    expect(d.opts.tap).not.toHaveBeenCalled();
    expect(d.opts.cancel).not.toHaveBeenCalled();
  });
  it("L3-13 : vers le bas jusqu'en fin (sous la dernière ligne) : drop(4), les lignes passées remontent", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 0);
    for (const y of steps(mid(0), mid(4) + 40)) d.to(y);
    expect(rows.slice(1).map((r) => r.style.transform)).toEqual(["translateY(-48px)", "translateY(-48px)", "translateY(-48px)", "translateY(-48px)"]);
    d.up(mid(4) + 40);
    expect(d.opts.drop).toHaveBeenCalledWith(4);
  });
  it("L3-13 : au doigt, même geste : drop(0)", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3, "touch");
    for (const y of steps(mid(3), 110)) d.to(y);
    d.up(110);
    expect(d.opts.drop).toHaveBeenCalledWith(0);
  });
  it("L3-13 : Échap pendant le geste : cancel, lignes remises, aucun drop au lâcher", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    for (const y of steps(mid(3), 200)) d.to(y);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(d.opts.cancel).toHaveBeenCalledTimes(1);
    expect(rows.every((r) => r.style.transform === "")).toBe(true);
    d.up(110);
    expect(d.opts.drop).not.toHaveBeenCalled();
  });
  it("L3-13 : capture perdue (ligne redessinée) : cancel, aucun drop", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    d.to(200);
    d.grip.dispatchEvent(ev("lostpointercapture", 200));
    expect(d.opts.cancel).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).not.toHaveBeenCalled();
  });
  it("L3-15 : toucher sous le seuil : tap, ni drop ni cancel", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    d.to(mid(3) - 2);
    d.up(mid(3) - 2);
    expect(d.opts.tap).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).not.toHaveBeenCalled();
    expect(d.opts.cancel).not.toHaveBeenCalled();
  });
  it("L3-13 : lâché à son propre rang : cancel, aucun drop", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    d.to(mid(3) - 30);
    d.to(mid(3) + 5);
    d.up(mid(3) + 5);
    expect(d.opts.cancel).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).not.toHaveBeenCalled();
  });
  it("L3-13 : pointeur à moins de 48 px du bas du corps : le corps défile, et s'arrête au lâcher", async () => {
    const { rows, scroller } = list(5, { top: 0, bottom: 300 });
    const d = drag(rows, scroller, 3);
    d.to(mid(3) + 20);
    await new Promise((r) => setTimeout(r, 80));
    expect(scroller.scrollTop).toBeGreaterThan(0);
    d.up(mid(3) + 20);
    const stopped = scroller.scrollTop;
    await new Promise((r) => setTimeout(r, 80));
    expect(scroller.scrollTop).toBe(stopped);
  });
  it("L3-13 : aucune ligne au rang donné : rien (ni capture ni rappel)", () => {
    const { rows, scroller } = list(2);
    const opts = { rows: () => rows, scroller, from: 5, moved: vi.fn(), drop: vi.fn(), tap: vi.fn(), cancel: vi.fn() };
    const down = ev("pointerdown", 10);
    Object.defineProperty(down, "currentTarget", { value: rows[0]!.querySelector("button")! });
    startSortDrag(down, opts);
    expect(rows[0]!.querySelector("button")!.setPointerCapture).not.toHaveBeenCalled();
  });
  it("L3-13 : la ligne tirée ne quitte pas la liste : aucun fantôme dans body, aucune cible par elementsFromPoint (DA-L3-1)", () => {
    const { rows, scroller } = list(5);
    const elementsFromPoint = vi.fn(() => [] as Element[]);
    Object.defineProperty(document, "elementsFromPoint", { value: elementsFromPoint, configurable: true });
    try {
      const before = document.body.childElementCount;
      const d = drag(rows, scroller, 3);
      for (const y of steps(mid(3), 110)) d.to(y);
      expect(document.body.childElementCount).toBe(before);
      expect(rows[3]!.parentElement?.parentElement).toBe(scroller);
      d.up(110);
      expect(d.opts.drop).toHaveBeenCalledWith(0);
      expect(elementsFromPoint).not.toHaveBeenCalled();
    } finally {
      delete (document as { elementsFromPoint?: unknown }).elementsFromPoint;
    }
  });
  it("L3-13 : aucun glisser HTML5 dans le module (U12)", () => {
    const src = readFileSync(join(__dirname, "sort-drag.ts"), "utf8");
    expect(src).not.toMatch(/draggable|dragstart|dragover|ondrop/);
  });
});
