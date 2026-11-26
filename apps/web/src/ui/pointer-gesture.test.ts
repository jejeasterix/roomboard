// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAG_THRESHOLD_PX, startPointerGesture, type PointerGesture } from "./pointer-gesture";
import { DRAG_THRESHOLD_PX as FROM_RESOURCE, startResourceDrag } from "./resource-drag";
import { startSortDrag } from "./sort-drag";

// Espion autour du vrai squelette (comportement inchangé) : prouve que les deux gestes le rappellent au lieu de le
// recopier (DA-L3-1).
vi.mock("./pointer-gesture", async (importOriginal) => {
  const m = await importOriginal<typeof import("./pointer-gesture")>();
  return { ...m, startPointerGesture: vi.fn(m.startPointerGesture) };
});

afterEach(() => {
  // OF83 : chaque geste resté ouvert est abandonné ; sinon son écouteur d'Échap sur `document` fuit dans les tests suivants.
  for (const r of vi.mocked(startPointerGesture).mock.results) if (r.type === "return") r.value();
  vi.mocked(startPointerGesture).mockClear();
  document.body.innerHTML = "";
});

function source(): HTMLButtonElement {
  const s = document.createElement("button");
  s.setPointerCapture = vi.fn();
  s.releasePointerCapture = vi.fn();
  document.body.append(s);
  return s;
}
const ev = (type: string, x: number, y: number, pointerType = "mouse", button = 0): PointerEvent => {
  const e = new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, button });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  return e;
};
function start(s: HTMLElement, over: Pick<PointerGesture, "accept"> = {}, pointerType = "mouse", button = 0) {
  const g = { move: vi.fn<(m: PointerEvent) => void>(), finish: vi.fn<(u: PointerEvent | null, dragged: boolean) => void>(), ...over };
  const down = ev("pointerdown", 10, 10, pointerType, button);
  Object.defineProperty(down, "currentTarget", { value: s });
  startPointerGesture(down, g);
  return g;
}

describe("pointer-gesture (design-l3, DA-L3-1)", () => {
  it("DA-L3-1 : le seuil vit ici (4 px), resource-drag le réexporte", () => {
    expect(DRAG_THRESHOLD_PX).toBe(4);
    expect(FROM_RESOURCE).toBe(DRAG_THRESHOLD_PX);
  });
  it("DA-L3-1 : capture du pointeur à l'appui", () => {
    const s = source();
    start(s);
    expect(s.setPointerCapture).toHaveBeenCalledWith(1);
  });
  it("DA-L3-1 : sous le seuil, aucun move ; lâcher = un toucher, finish(u, false)", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 10 + DRAG_THRESHOLD_PX - 1, 10));
    s.dispatchEvent(ev("pointerup", 10 + DRAG_THRESHOLD_PX - 1, 10));
    expect(g.move).not.toHaveBeenCalled();
    expect(g.finish).toHaveBeenCalledTimes(1);
    expect(g.finish.mock.calls[0]![0]?.type).toBe("pointerup");
    expect(g.finish.mock.calls[0]![1]).toBe(false);
  });
  it("DA-L3-1 : au-delà du seuil, move à chaque mouvement ; lâcher = finish(u, true), capture rendue", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 30, 10));
    s.dispatchEvent(ev("pointermove", 40, 10));
    s.dispatchEvent(ev("pointerup", 40, 10));
    expect(g.move).toHaveBeenCalledTimes(2);
    expect(g.finish.mock.calls[0]![1]).toBe(true);
    expect(s.releasePointerCapture).toHaveBeenCalledWith(1);
  });
  it("DA-L3-1 : accept reçoit les écarts absolus et le type de pointeur de l'appui ; faux : finish(null, false), plus rien ensuite", () => {
    const s = source();
    const accept = vi.fn(() => false);
    const g = start(s, { accept }, "touch");
    s.dispatchEvent(ev("pointermove", 12, 60, "touch"));
    expect(accept).toHaveBeenCalledWith(2, 50, "touch");
    expect(g.finish).toHaveBeenCalledWith(null, false);
    s.dispatchEvent(ev("pointermove", 200, 60, "touch"));
    s.dispatchEvent(ev("pointerup", 200, 60, "touch"));
    expect(g.move).not.toHaveBeenCalled();
    expect(g.finish).toHaveBeenCalledTimes(1);
  });
  it("DA-L3-1 : Échap annule (finish(null, true)), le lâcher qui suit n'appelle rien", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 40, 10));
    const k = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    document.dispatchEvent(k);
    expect(k.defaultPrevented).toBe(true);
    s.dispatchEvent(ev("pointerup", 40, 10));
    expect(g.finish).toHaveBeenCalledTimes(1);
    expect(g.finish).toHaveBeenCalledWith(null, true);
  });
  it("DA-L3-1 : une autre touche qu'Échap ne fait rien", () => {
    const s = source();
    const g = start(s);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(g.finish).not.toHaveBeenCalled();
    s.dispatchEvent(ev("pointerup", 10, 10));
  });
  it("DA-L3-1 : pointercancel et capture perdue annulent, une seule fois", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 40, 10));
    s.dispatchEvent(ev("pointercancel", 40, 10));
    s.dispatchEvent(ev("lostpointercapture", 40, 10));
    expect(g.finish).toHaveBeenCalledTimes(1);
    expect(g.finish).toHaveBeenCalledWith(null, true);
    const s2 = source();
    const g2 = start(s2);
    s2.dispatchEvent(ev("lostpointercapture", 10, 10));
    expect(g2.finish).toHaveBeenCalledWith(null, false);
  });
  it("DA-L3-1 : bouton secondaire : aucun geste (ni capture ni finish)", () => {
    const s = source();
    const g = start(s, {}, "mouse", 2);
    s.dispatchEvent(ev("pointerup", 40, 10));
    expect(s.setPointerCapture).not.toHaveBeenCalled();
    expect(g.finish).not.toHaveBeenCalled();
  });
  it("DA-L3-1 : resource-drag et sort-drag rappellent ce squelette, sans le recopier", () => {
    const spy = vi.mocked(startPointerGesture);
    spy.mockClear();
    const card = source();
    const down = ev("pointerdown", 10, 10);
    Object.defineProperty(down, "currentTarget", { value: card });
    startResourceDrag(down, vi.fn(), { label: "Moitié", hits: () => [] });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBe(down);
    expect(spy.mock.calls[0]![1].accept).toBeTypeOf("function");
    card.dispatchEvent(ev("pointerup", 10, 10));

    const scroller = document.createElement("div");
    const row = document.createElement("li");
    const grip = source();
    row.append(grip);
    scroller.append(row);
    document.body.append(scroller);
    const down2 = ev("pointerdown", 10, 10);
    Object.defineProperty(down2, "currentTarget", { value: grip });
    startSortDrag(down2, { rows: () => [row], scroller, from: 0, moved: vi.fn(), drop: vi.fn(), tap: vi.fn(), cancel: vi.fn() });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]![0]).toBe(down2);
    grip.dispatchEvent(ev("pointerup", 10, 10));

    // Aucune copie du squelette : ni capture, ni écouteur, ni Échap tenus par les deux gestes eux-mêmes.
    for (const f of ["resource-drag.ts", "sort-drag.ts"]) {
      expect(readFileSync(join(__dirname, f), "utf8")).not.toMatch(/setPointerCapture|addEventListener|"Escape"/);
    }
  });
  it("DA-L3-1 : accept reçoit des écarts absolus, quel que soit le sens du mouvement", () => {
    const s = source();
    const accept = vi.fn(() => true);
    start(s, { accept }, "touch");
    s.dispatchEvent(ev("pointermove", 10 - 40, 10 + 12, "touch"));
    expect(accept).toHaveBeenLastCalledWith(40, 12, "touch");
    s.dispatchEvent(ev("pointerup", 0, 0, "touch"));
    const t = source();
    const accept2 = vi.fn(() => true);
    start(t, { accept: accept2 }, "touch");
    t.dispatchEvent(ev("pointermove", 10 + 12, 10 - 40, "touch"));
    expect(accept2).toHaveBeenLastCalledWith(12, 40, "touch");
  });
  it("DA-L3-1 : au doigt, resource-drag accepte (-40, 12) et refuse (12, -40)", () => {
    const run = (x: number, y: number): boolean => {
      const c = source();
      const down = ev("pointerdown", 10, 10, "touch");
      Object.defineProperty(down, "currentTarget", { value: c });
      startResourceDrag(down, vi.fn(), { label: "Moitié", hits: () => [] });
      c.dispatchEvent(ev("pointermove", x, y, "touch"));
      const started = document.querySelector(".rb-drag-ghost") !== null;
      c.dispatchEvent(ev("pointerup", x, y, "touch"));
      return started;
    };
    expect(run(10 - 40, 10 + 12)).toBe(true);
    expect(run(10 + 12, 10 - 40)).toBe(false);
  });
  it("DA-L3-1 : la fonction d'abandon retire les écouteurs, rend la capture, n'appelle plus finish", () => {
    const s = source();
    const g = { move: vi.fn(), finish: vi.fn() };
    const down = ev("pointerdown", 10, 10);
    Object.defineProperty(down, "currentTarget", { value: s });
    const abort = startPointerGesture(down, g);
    expect(abort).toBeTypeOf("function");
    s.dispatchEvent(ev("pointermove", 30, 10));
    expect(g.move).toHaveBeenCalledTimes(1);
    abort!();
    expect(s.releasePointerCapture).toHaveBeenCalledWith(1);
    // OF83 : l'écouteur d'Échap est retiré : l'Échap qui suit l'abandon garde son action par défaut.
    const esc = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    document.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(false);
    s.dispatchEvent(ev("pointermove", 50, 10));
    s.dispatchEvent(ev("pointerup", 50, 10));
    expect(g.move).toHaveBeenCalledTimes(1);
    expect(g.finish).not.toHaveBeenCalled();
    abort!();
    expect(s.releasePointerCapture).toHaveBeenCalledTimes(1);
  });
});
