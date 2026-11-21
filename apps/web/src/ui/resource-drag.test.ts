// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAG_THRESHOLD_PX, startResourceDrag } from "./resource-drag";

const stages = document.createElement("div");
stages.className = "rb-stages";
document.body.append(stages);
afterEach(() => document.querySelectorAll(".rb-drag-ghost").forEach((g) => g.remove()));

function card() {
  const c = document.createElement("div");
  c.setPointerCapture = vi.fn();
  c.releasePointerCapture = vi.fn();
  document.body.append(c);
  return c;
}
const ev = (type: string, x: number, y: number) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true });
function down(c: HTMLElement, onDrop: (p: { x: number; y: number }) => void, hits: Element[]) {
  const e = ev("pointerdown", 10, 10);
  Object.defineProperty(e, "currentTarget", { value: c });
  startResourceDrag(e, onDrop, { label: "Moitié", hits: () => hits });
}

describe("C4 : glisser une ressource", () => {
  it("C4 : lâcher au-dessus de la scène : onDrop au point client, fantôme retiré", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, [stages]);
    c.dispatchEvent(ev("pointermove", 200, 150));
    expect(document.querySelector(".rb-drag-ghost")?.textContent).toBe("Moitié");
    c.dispatchEvent(ev("pointerup", 300, 250));
    expect(onDrop).toHaveBeenCalledWith({ x: 300, y: 250 });
    expect(document.querySelector(".rb-drag-ghost")).toBeNull();
  });

  it("C4 : lâcher hors de la scène : rien", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, [document.body]);
    c.dispatchEvent(ev("pointermove", 200, 150));
    c.dispatchEvent(ev("pointerup", 200, 150));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("C4 : lâcher sur le panneau, au-dessus de la scène : rien (D28)", () => {
    const c = card();
    const onDrop = vi.fn();
    const popover = document.createElement("div");
    popover.className = "rb-popover";
    const inPanel = document.createElement("span");
    popover.append(inPanel);
    stages.append(popover);
    down(c, onDrop, [inPanel, popover, stages]);
    c.dispatchEvent(ev("pointermove", 200, 150));
    c.dispatchEvent(ev("pointerup", 200, 150));
    expect(onDrop).not.toHaveBeenCalled();
    popover.remove();
  });

  it("C4 : sous le seuil : un clic, pas un glisser", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, [stages]);
    c.dispatchEvent(ev("pointermove", 10 + DRAG_THRESHOLD_PX - 1, 10));
    c.dispatchEvent(ev("pointerup", 10 + DRAG_THRESHOLD_PX - 1, 10));
    expect(onDrop).not.toHaveBeenCalled();
    expect(document.querySelector(".rb-drag-ghost")).toBeNull();
  });

  it("C4 : Échap annule", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, [stages]);
    c.dispatchEvent(ev("pointermove", 200, 150));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    c.dispatchEvent(ev("pointerup", 300, 250));
    expect(onDrop).not.toHaveBeenCalled();
    expect(document.querySelector(".rb-drag-ghost")).toBeNull();
  });
});
