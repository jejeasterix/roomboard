import { describe, expect, it } from "vitest";
import type { ViewSink } from "./gesture";
import { createMiddlePan } from "./middle-pan";
import type { PointerLike, PointerSurface } from "./sampler";

type Init = Partial<Omit<PointerLike, "preventDefault">> & { pointerId: number };

class Surface implements PointerSurface {
  readonly handlers = new Map<string, Set<(e: Event) => void>>();
  readonly captured: number[] = [];
  addEventListener(type: string, l: (e: Event) => void): void {
    const set = this.handlers.get(type) ?? new Set<(e: Event) => void>();
    set.add(l);
    this.handlers.set(type, set);
  }
  removeEventListener(type: string, l: (e: Event) => void): void {
    this.handlers.get(type)?.delete(l);
  }
  setPointerCapture(pointerId: number): void {
    this.captured.push(pointerId);
  }
  getBoundingClientRect(): { left: number; top: number } {
    return { left: 0, top: 0 };
  }
  count(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }
  /** Déclenche un événement souris au bouton du milieu par défaut ; rend vrai si preventDefault a été appelé. */
  fire(type: string, init: Init): boolean {
    let prevented = false;
    const e: PointerLike = {
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      buttons: 4,
      timeStamp: 0,
      ...init,
      preventDefault: () => {
        prevented = true;
      },
    };
    for (const l of this.handlers.get(type) ?? []) l(e as unknown as Event);
    return prevented;
  }
}

function setup() {
  const surface = new Surface();
  const log: string[] = [];
  const view: ViewSink = {
    panBy: (dx, dy) => log.push(`pan ${dx} ${dy}`),
    zoomAt: () => log.push("zoom"),
  };
  return { surface, log, pan: createMiddlePan(surface, view) };
}

describe("createMiddlePan (D17)", () => {
  it("bouton du milieu : glisser déplace la vue du déplacement du pointeur", () => {
    const { surface, log } = setup();
    surface.fire("pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
    surface.fire("pointermove", { pointerId: 1, clientX: 130, clientY: 90 });
    surface.fire("pointermove", { pointerId: 1, clientX: 130, clientY: 90 });
    surface.fire("pointermove", { pointerId: 1, clientX: 100, clientY: 95 });
    expect(log).toEqual(["pan 30 -10", "pan -30 5"]);
  });

  it("défilement automatique empêché ; aucune capture du pointeur (réservée à sampler.ts, cadrage § 3)", () => {
    const { surface } = setup();
    expect(surface.fire("pointerdown", { pointerId: 1 })).toBe(true);
    expect(surface.captured).toEqual([]);
  });

  it("bouton gauche, droit, gauche et milieu ensemble, stylet ou doigt : rien", () => {
    const { surface, log } = setup();
    const inits: Partial<Omit<PointerLike, "preventDefault">>[] = [{ buttons: 1 }, { buttons: 2 }, { buttons: 5 }, { pointerType: "pen" }, { pointerType: "touch" }];
    for (const init of inits) {
      expect(surface.fire("pointerdown", { pointerId: 1, ...init })).toBe(false);
      surface.fire("pointermove", { pointerId: 1, clientX: 50, ...init });
      surface.fire("pointerup", { pointerId: 1, buttons: 0 });
    }
    expect(log).toEqual([]);
  });

  it("relâché, pointercancel ou capture perdue : la vue ne bouge plus", () => {
    for (const end of ["pointerup", "pointercancel", "lostpointercapture"]) {
      const { surface, log } = setup();
      surface.fire("pointerdown", { pointerId: 1 });
      surface.fire(end, { pointerId: 1, buttons: 0 });
      surface.fire("pointermove", { pointerId: 1, clientX: 40 });
      expect(log).toEqual([]);
    }
  });

  it("bouton du milieu lâché hors de la zone (buttons sans 4 au retour) : fin du glisser", () => {
    const { surface, log } = setup();
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1, clientX: 10, buttons: 0 });
    surface.fire("pointermove", { pointerId: 1, clientX: 20 });
    expect(log).toEqual([]);
  });

  it("dispose retire les écouteurs", () => {
    const { surface, pan } = setup();
    expect(surface.count()).toBe(5);
    pan.dispose();
    expect(surface.count()).toBe(0);
  });
});
