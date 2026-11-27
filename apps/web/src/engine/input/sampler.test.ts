import { describe, expect, it } from "vitest";
import {
  createSampler,
  pressureOf,
  type GestureEvent,
  type PointerLike,
  type PointerSurface,
  type Sampler,
  type SamplerOptions,
} from "./sampler";

type Init = Partial<Omit<PointerLike, "preventDefault">> & { pointerId: number };

class FakeSurface implements PointerSurface {
  readonly handlers = new Map<string, Set<(e: Event) => void>>();
  readonly captured: number[] = [];
  failCapture = false;

  constructor(withRawUpdate = false) {
    if (withRawUpdate) {
      Object.defineProperty(this, "onpointerrawupdate", { value: null, enumerable: true });
    }
  }

  addEventListener(type: string, listener: (e: Event) => void): void {
    const set = this.handlers.get(type) ?? new Set<(e: Event) => void>();
    set.add(listener);
    this.handlers.set(type, set);
  }

  removeEventListener(type: string, listener: (e: Event) => void): void {
    this.handlers.get(type)?.delete(listener);
  }

  setPointerCapture(pointerId: number): void {
    if (this.failCapture) throw new Error("NotFoundError");
    this.captured.push(pointerId);
  }

  getBoundingClientRect(): { left: number; top: number } {
    return { left: 10, top: 20 };
  }

  listenerCount(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }

  /** Déclenche un événement ; rend vrai si `preventDefault` a été appelé. */
  fire(type: string, init: Init): boolean {
    let prevented = false;
    const e: PointerLike = {
      pointerType: "pen",
      clientX: 0,
      clientY: 0,
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
      buttons: 1,
      timeStamp: 0,
      ...init,
      preventDefault: () => {
        prevented = true;
      },
    };
    for (const listener of this.handlers.get(type) ?? []) listener(e as unknown as Event);
    return prevented;
  }
}

const pt = (clientX: number, clientY: number, timeStamp: number, pressure = 0.5): PointerLike => ({
  pointerId: 1,
  pointerType: "pen",
  clientX,
  clientY,
  pressure,
  tiltX: 0,
  tiltY: 0,
  buttons: 1,
  timeStamp,
  preventDefault: () => undefined,
});

const ALL: SamplerOptions = { coalesced: true, predicted: true, raw: false };

function record(sampler: Sampler): GestureEvent[] {
  const out: GestureEvent[] = [];
  sampler.onGesture((g) => {
    out.push(g);
  });
  return out;
}

describe("createSampler", () => {
  it("start : coordonnées locales, pression du stylet et capture du pointeur", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, clientX: 110, clientY: 220, pressure: 0.3, tiltX: 12, timeStamp: 5 });
    expect(surface.captured).toEqual([1]);
    expect(out).toEqual([
      {
        kind: "start",
        pointerId: 1,
        pointerType: "pen",
        eraserButton: false,
        samples: [{ x: 100, y: 200, pressure: 0.3, tiltX: 12, tiltY: 0, t: 5 }],
        predicted: [],
      },
    ]);
  });

  it("move : un échantillon par événement fusionné quand l'option est active", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", {
      pointerId: 1,
      timeStamp: 3,
      getCoalescedEvents: () => [pt(11, 21, 1), pt(12, 22, 2), pt(13, 23, 3)],
    });
    expect(out[1]?.kind).toBe("move");
    expect(out[1]?.samples.map((s) => s.t)).toEqual([1, 2, 3]);
    expect(out[1]?.samples[0]).toMatchObject({ x: 1, y: 1 });
    expect(sampler.stats()).toMatchObject({ moveEvents: 1, samples: 4, gestures: 1 });
  });

  it("move : l'événement seul quand les fusionnés sont coupés", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, { ...ALL, coalesced: false }));
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", {
      pointerId: 1,
      timeStamp: 9,
      getCoalescedEvents: () => [pt(11, 21, 1), pt(12, 22, 2)],
    });
    expect(out[1]?.samples.map((s) => s.t)).toEqual([9]);
  });

  it("move : liste de fusionnés vide, l'événement lui-même", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1, timeStamp: 7, getCoalescedEvents: () => [] });
    expect(out[1]?.samples.map((s) => s.t)).toEqual([7]);
  });

  it("prédits rendus seulement si l'option est active", () => {
    const on = new FakeSurface();
    const outOn = record(createSampler(on, ALL));
    const off = new FakeSurface();
    const outOff = record(createSampler(off, { ...ALL, predicted: false }));
    for (const [surface] of [[on], [off]] as const) {
      surface.fire("pointerdown", { pointerId: 1 });
      surface.fire("pointermove", { pointerId: 1, getPredictedEvents: () => [pt(50, 60, 20), pt(52, 62, 24)] });
    }
    expect(outOn[1]?.predicted.map((s) => s.t)).toEqual([20, 24]);
    expect(outOff[1]?.predicted).toEqual([]);
  });

  it("souris et doigt : pression constante 0,5", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, pointerType: "mouse", pressure: 0 });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch", pressure: 1 });
    expect(out.map((g) => g.samples[0]?.pressure)).toEqual([0.5, 0.5]);
  });

  it("pointerup ferme le geste sans point de pression nulle", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, pressure: 0.4 });
    // Le relâché du stylet porte une pression nulle, y compris dans ses fusionnés : rien n'en est retenu.
    surface.fire("pointerup", {
      pointerId: 1,
      pressure: 0,
      buttons: 0,
      getCoalescedEvents: () => [pt(30, 40, 9, 0)],
    });
    surface.fire("pointermove", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "end"]);
    expect(out[1]?.samples).toEqual([]);
    expect(out.flatMap((g) => g.samples).every((s) => s.pressure > 0)).toBe(true);
    expect(sampler.stats().samples).toBe(1);
  });

  it("lostpointercapture après pointerup est ignoré", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointerup", { pointerId: 1 });
    surface.fire("lostpointercapture", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "end"]);
    expect(sampler.stats().lostCaptures).toBe(0);
  });

  it("pointercancel ferme le geste par cancel", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointercancel", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "cancel"]);
    expect(sampler.stats().pointerCancels).toBe(1);
  });

  it("lostpointercapture pendant le geste ferme par cancel", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("lostpointercapture", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "cancel"]);
    expect(sampler.stats().lostCaptures).toBe(1);
  });

  it("contextmenu est empêché", () => {
    const surface = new FakeSurface();
    createSampler(surface, ALL);
    expect(surface.fire("contextmenu", { pointerId: 1 })).toBe(true);
  });

  it("bouton gomme vu au pointerdown et pendant le geste", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, buttons: 32 });
    surface.fire("pointerdown", { pointerId: 2, buttons: 1 });
    surface.fire("pointermove", { pointerId: 2, buttons: 33 });
    expect(out[0]?.eraserButton).toBe(true);
    expect(out[1]?.eraserButton).toBe(false);
    expect(out[2]?.eraserButton).toBe(true);
    expect(sampler.stats().eraserSeen).toBe(true);
  });

  it("contact tactile ignoré tant qu'un stylet touche", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    expect(out.map((g) => g.pointerId)).toEqual([1]);
    expect(surface.captured).toEqual([1]);
    expect(sampler.stats().touchIgnored).toBe(1);
    surface.fire("pointerup", { pointerId: 1 });
    surface.fire("pointerdown", { pointerId: 3, pointerType: "touch" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:1", "end:1", "start:3"]);
  });

  it("paume posée avant le stylet : son geste est annulé quand le stylet touche", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointermove", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerup", { pointerId: 1 });
    // Stylet levé, la paume reste posée : son contact ne reprend pas le trait.
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerup", { pointerId: 2, pointerType: "touch" });
    surface.fire("lostpointercapture", { pointerId: 2, pointerType: "touch" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual([
      "start:2",
      "cancel:2",
      "start:1",
      "move:1",
      "end:1",
    ]);
    expect(sampler.stats()).toMatchObject({ touchIgnored: 1, pointerCancels: 0, lostCaptures: 0 });
  });

  it("deux pointeurs tracent ensemble, un geste par pointerId", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "mouse" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "mouse", timeStamp: 4 });
    surface.fire("pointermove", { pointerId: 1, pointerType: "pen", timeStamp: 5 });
    expect(out.map((g) => `${g.kind}:${g.pointerId}:${g.pointerType}`)).toEqual([
      "start:1:pen",
      "start:2:mouse",
      "move:2:mouse",
      "move:1:pen",
    ]);
  });

  it("pointerrawupdate remplace pointermove si demandé et disponible", () => {
    const surface = new FakeSurface(true);
    const sampler = createSampler(surface, { ...ALL, raw: true });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1, timeStamp: 1 });
    surface.fire("pointerrawupdate", { pointerId: 1, timeStamp: 2 });
    expect(out.map((g) => g.kind)).toEqual(["start", "move"]);
    expect(out[1]?.samples[0]?.t).toBe(2);
    expect(sampler.stats()).toMatchObject({ rawUpdateUsed: true, moveEvents: 1 });
  });

  it("pointerrawupdate demandé mais absent : pointermove", () => {
    const surface = new FakeSurface(false);
    const sampler = createSampler(surface, { ...ALL, raw: true });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "move"]);
    expect(sampler.stats().rawUpdateUsed).toBe(false);
  });

  it("setPointerCapture qui échoue n'empêche pas le geste", () => {
    const surface = new FakeSurface();
    surface.failCapture = true;
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start"]);
  });

  it("dispose retire tous les écouteurs et onGesture se désabonne", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const seen: string[] = [];
    const unsubscribe = sampler.onGesture((g) => {
      seen.push(g.kind);
    });
    expect(surface.listenerCount()).toBe(6);
    unsubscribe();
    surface.fire("pointerdown", { pointerId: 1 });
    expect(seen).toEqual([]);
    sampler.dispose();
    expect(surface.listenerCount()).toBe(0);
  });

  it("dispose émet cancel pour chaque geste actif (D39), puis se tait", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    sampler.dispose();
    const cancels = out.filter((g) => g.kind === "cancel");
    expect(cancels.map((g) => g.pointerId).sort()).toEqual([1, 2]);
    expect(cancels.every((g) => g.samples.length === 0)).toBe(true);
    sampler.dispose();
    expect(out.filter((g) => g.kind === "cancel")).toHaveLength(2);
  });
  it("paume stricte explicite (cancelTouchesOnPen: true) : même effet que le défaut", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, { ...ALL, cancelTouchesOnPen: true }));
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}${g.palm === true ? ":palm" : ""}`)).toEqual([
      "start:2",
      "cancel:2:palm",
      "start:1",
    ]);
  });

  it("paume souple (cancelTouchesOnPen: false) : le contact posé avant le stylet continue de tracer", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, { ...ALL, cancelTouchesOnPen: false });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerup", { pointerId: 2, pointerType: "touch" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:2", "start:1", "move:2", "end:2"]);
    expect(sampler.stats().touchIgnored).toBe(0);
  });

  it("paume souple : un contact posé pendant que le stylet touche reste ignoré (D18)", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, { ...ALL, cancelTouchesOnPen: false });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:1"]);
    expect(sampler.stats().touchIgnored).toBe(1);
  });

  it("réglage de la paume lu à chaque pose du stylet (accesseur de la page)", () => {
    let strict = false;
    const opts: SamplerOptions = {
      ...ALL,
      get cancelTouchesOnPen() {
        return strict;
      },
    };
    const surface = new FakeSurface();
    const out = record(createSampler(surface, opts));
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerup", { pointerId: 1 });
    strict = true;
    surface.fire("pointerdown", { pointerId: 3, pointerType: "pen" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:2", "start:1", "end:1", "cancel:2", "start:3"]);
  });
});

describe("corrections de la relecture du lot 1 (T6c)", () => {
  it("sous pointerrawupdate, aucun prédit n'est lu, même demandé (Chromium n'en donne pas)", () => {
    const surface = new FakeSurface(true);
    const out = record(createSampler(surface, { ...ALL, raw: true }));
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointerrawupdate", { pointerId: 1, getPredictedEvents: () => [pt(50, 60, 20)] });
    expect(out[1]?.predicted).toEqual([]);
  });

  it("paume annulée par D18 : son cancel est marqué palm, un pointercancel ne l'est pas", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointercancel", { pointerId: 1 });
    expect(out.map((g) => `${g.kind}:${g.pointerId}:${g.palm === true}`)).toEqual([
      "start:2:false",
      "cancel:2:true",
      "start:1:false",
      "cancel:1:false",
    ]);
  });

  it("pressureOf : pression du stylet, 0,5 pour souris et doigt (D8)", () => {
    expect(pressureOf("pen", 0.73)).toBe(0.73);
    expect(pressureOf("mouse", 0)).toBe(0.5);
    expect(pressureOf("touch", 1)).toBe(0.5);
  });
});

describe("souris : seul le bouton gauche trace (T27)", () => {
  const sansGeste = (buttons: number): void => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, pointerType: "mouse", buttons });
    surface.fire("pointermove", { pointerId: 1, pointerType: "mouse", buttons, clientX: 30, clientY: 40 });
    surface.fire("pointerup", { pointerId: 1, pointerType: "mouse", buttons: 0 });
    expect(out).toEqual([]);
    expect(surface.captured).toEqual([]);
    expect(sampler.stats().gestures).toBe(0);
  };

  it("souris au bouton du milieu : aucun geste", () => {
    sansGeste(4);
  });

  it("souris au bouton droit : aucun geste", () => {
    sansGeste(2);
  });

  it("souris au bouton gauche : trace comme avant", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, pointerType: "mouse", buttons: 1 });
    surface.fire("pointermove", { pointerId: 1, pointerType: "mouse", buttons: 1, clientX: 30, clientY: 40 });
    surface.fire("pointerup", { pointerId: 1, pointerType: "mouse", buttons: 0 });
    expect(out.map((g) => g.kind)).toEqual(["start", "move", "end"]);
  });
});

describe("géométrie du contact (OG25, déc. 2, 3)", () => {
  it("OG25 : contact posé sur start et move quand width et height portent une géométrie (celle de l'événement envoyé)", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 4, pointerType: "touch", width: 30, height: 28 });
    surface.fire("pointermove", {
      pointerId: 4,
      pointerType: "touch",
      width: 140,
      height: 120,
      getCoalescedEvents: () => [{ ...pt(1, 1, 1), width: 5, height: 5 }],
    });
    surface.fire("pointerup", { pointerId: 4, pointerType: "touch", width: 140, height: 120 });
    expect(out[0]?.contact).toEqual({ width: 30, height: 28 });
    expect(out[1]?.contact).toEqual({ width: 140, height: 120 });
    expect(out[2] && "contact" in out[2]).toBe(false);
  });

  it("OG25 : sans géométrie (1 × 1, 0 × 0, absente, NaN) : aucune clé contact", () => {
    for (const geo of [{ width: 1, height: 1 }, { width: 0, height: 0 }, {}, { width: Number.NaN, height: Number.NaN }]) {
      const surface = new FakeSurface();
      const out = record(createSampler(surface, ALL));
      surface.fire("pointerdown", { pointerId: 4, pointerType: "touch", ...geo });
      surface.fire("pointermove", { pointerId: 4, pointerType: "touch", ...geo });
      expect(out).toHaveLength(2);
      expect(out.every((g) => !("contact" in g))).toBe(true);
    }
  });
});
