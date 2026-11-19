import { describe, expect, it } from "vitest";
import {
  attachInkTrail,
  type InkLike,
  type InkPresenterLike,
  type InkTrailDeps,
  type InkTrailStyle,
  type TrailEvent,
} from "./ink-trail";

class Surface {
  readonly handlers = new Map<string, Set<(e: Event) => void>>();
  addEventListener(type: string, l: (e: Event) => void): void {
    const set = this.handlers.get(type) ?? new Set<(e: Event) => void>();
    set.add(l);
    this.handlers.set(type, set);
  }
  removeEventListener(type: string, l: (e: Event) => void): void {
    this.handlers.get(type)?.delete(l);
  }
  count(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }
  move(e: TrailEvent): void {
    for (const l of this.handlers.get("pointermove") ?? []) l(e as unknown as Event);
  }
}

const AREA = { id: "interaction" } as unknown as Element;
const STYLE: InkTrailStyle = { color: "#000000", diameter: 4 };

function setup(over: Partial<InkTrailDeps> = {}) {
  const surface = new Surface();
  const updates: InkTrailStyle[] = [];
  const asked: unknown[] = [];
  const presenter: InkPresenterLike = {
    updateInkTrailStartPoint: (_e, style) => {
      updates.push(style);
    },
  };
  const ink: InkLike = {
    requestPresenter: async (p) => {
      asked.push(p?.presentationArea);
      return presenter;
    },
  };
  const deps: InkTrailDeps = { enabled: true, ink, area: AREA, surface, styleFor: () => STYLE, ...over };
  return { surface, updates, asked, deps };
}

describe("attachInkTrail (échelon 3)", () => {
  it("réglage éteint : statut off, présentateur jamais demandé, aucun écouteur", async () => {
    const { deps, asked, surface } = setup({ enabled: false });
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("off");
    expect(asked).toEqual([]);
    expect(surface.count()).toBe(0);
  });

  it("API absente : statut absent, aucun écouteur", async () => {
    const { deps, surface } = setup({ ink: undefined });
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("absent");
    expect(surface.count()).toBe(0);
  });

  it("requestPresenter refusé : statut refused, aucun écouteur", async () => {
    const { deps, surface } = setup({ ink: { requestPresenter: () => Promise.reject(new Error("NotAllowedError")) } });
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("refused");
    expect(surface.count()).toBe(0);
  });

  it("allumée : présentateur demandé sur la zone d'interaction, chaque pointermove pressé met la pointe à jour", async () => {
    const { deps, surface, updates, asked } = setup();
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("on");
    expect(asked).toEqual([AREA]);
    surface.move({ pointerId: 1, pointerType: "pen", buttons: 1 });
    surface.move({ pointerId: 1, pointerType: "mouse", buttons: 1 });
    expect(updates).toEqual([STYLE, STYLE]);
  });

  it("styleFor rend null (gomme, main, vue) ou un diamètre nul : aucune mise à jour", async () => {
    let style: InkTrailStyle | null = null;
    const { deps, surface, updates } = setup({ styleFor: () => style });
    await attachInkTrail(deps);
    surface.move({ pointerId: 1, pointerType: "pen", buttons: 1 });
    style = { color: "#000000", diameter: 0 };
    surface.move({ pointerId: 1, pointerType: "pen", buttons: 1 });
    expect(updates).toEqual([]);
  });

  it("pointeur levé (buttons 0) : aucune mise à jour", async () => {
    const { deps, surface, updates } = setup();
    await attachInkTrail(deps);
    surface.move({ pointerId: 1, pointerType: "pen", buttons: 0 });
    expect(updates).toEqual([]);
  });

  it("updateInkTrailStartPoint qui lève : compté, jamais propagé", async () => {
    const { deps, surface } = setup({
      ink: {
        requestPresenter: async () => ({
          updateInkTrailStartPoint: () => {
            throw new Error("InvalidStateError");
          },
        }),
      },
    });
    const t = await attachInkTrail(deps);
    expect(() => surface.move({ pointerId: 1, pointerType: "pen", buttons: 1 })).not.toThrow();
    expect(t.failures()).toBe(1);
  });

  it("dispose retire l'écouteur", async () => {
    const { deps, surface } = setup();
    const t = await attachInkTrail(deps);
    expect(surface.count()).toBe(1);
    t.dispose();
    expect(surface.count()).toBe(0);
  });
});
