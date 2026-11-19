import { describe, expect, it } from "vitest";
import type { DrawTool, GestureSink, ToolChoice, ViewSink } from "./gesture";
import { createRouter, DEFAULT_ROUTER_OPTIONS, SECOND_FINGER_MS, type RouterOptions } from "./router";
import type { GestureEvent, GestureKind, InputSample } from "./sampler";

const s = (x: number, y: number, t: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t });

function ev(
  kind: GestureKind,
  pointerId: number,
  pointerType: string,
  samples: InputSample[],
  extra: Partial<GestureEvent> = {},
): GestureEvent {
  return { kind, pointerId, pointerType, eraserButton: false, samples, predicted: [], ...extra };
}

function setup(opts: RouterOptions = DEFAULT_ROUTER_OPTIONS, tool: DrawTool = "pen") {
  const log: string[] = [];
  const gestures: GestureSink = {
    begin: (id, t, samples) => log.push(`begin ${id} ${t} ${samples.length}`),
    extend: (id, samples) => log.push(`extend ${id} ${samples.length}`),
    close: (id, how) => log.push(`close ${id} ${how}`),
  };
  const view: ViewSink = {
    panBy: (dx, dy) => log.push(`pan ${dx} ${dy}`),
    zoomAt: (x, y, f) => log.push(`zoom ${x} ${y} ${f}`),
  };
  return { router: createRouter(opts, { currentTool: () => tool, gestures, view }), log };
}

/** Un trait au stylet, relâché : le stylet a été vu. */
function penSeen(router: ReturnType<typeof createRouter>, log: string[]): void {
  router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
  router.handle(ev("end", 1, "pen", []));
  log.length = 0;
}

function setupTool(tool: () => ToolChoice, held: () => boolean = () => false, opts: RouterOptions = DEFAULT_ROUTER_OPTIONS) {
  const log: string[] = [];
  const gestures: GestureSink = {
    begin: (id, t, samples) => log.push(`begin ${id} ${t} ${samples.length}`),
    extend: (id, samples) => log.push(`extend ${id} ${samples.length}`),
    close: (id, how) => log.push(`close ${id} ${how}`),
  };
  const view: ViewSink = {
    panBy: (dx, dy) => log.push(`pan ${dx} ${dy}`),
    zoomAt: (x, y, f) => log.push(`zoom ${x} ${y} ${f}`),
  };
  return { router: createRouter(opts, { currentTool: tool, panHeld: held, gestures, view }), log };
}

describe("createRouter (D18)", () => {
  it("stylet : trace avec l'outil courant", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("move", 1, "pen", [s(1, 1, 5), s(2, 2, 6)]));
    router.handle(ev("end", 1, "pen", []));
    expect(log).toEqual(["begin 1 pen 1", "extend 1 2", "close 1 end"]);
    expect(router.penSeen()).toBe(true);
  });

  it("bouton gomme du stylet : le geste passe à la gomme", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)], { eraserButton: true }));
    expect(log).toEqual(["begin 1 eraser 1"]);
  });

  it("souris : trace avec l'outil courant (gomme choisie)", () => {
    const { router, log } = setup(DEFAULT_ROUTER_OPTIONS, "eraser");
    router.handle(ev("start", 7, "mouse", [s(0, 0, 0)]));
    expect(log).toEqual(["begin 7 eraser 1"]);
    expect(router.penSeen()).toBe(false);
  });

  it("deux stylets tracent ensemble : un geste par pointerId", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "pen", [s(9, 9, 1)]));
    router.handle(ev("move", 2, "pen", [s(10, 10, 2)]));
    router.handle(ev("end", 1, "pen", []));
    expect(log).toEqual(["begin 1 pen 1", "begin 2 pen 1", "extend 2 1", "close 1 end"]);
  });

  it("doigt seul, aucun stylet vu : trace (ENI sans stylet)", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(0, 0, 0)]));
    router.handle(ev("move", 3, "touch", [s(5, 0, 8)]));
    expect(log).toEqual(["begin 3 pen 1", "extend 3 1"]);
  });

  it(`second doigt dans les ${SECOND_FINGER_MS} ms : trait annulé sans écriture, puis pincement`, () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 150)]));
    router.handle(ev("move", 4, "touch", [s(300, 100, 160)]));
    expect(log).toEqual(["begin 3 pen 1", "close 3 abort", "pan 50 0", "zoom 200 100 2"]);
  });

  it("second doigt après 150 ms : ignoré, le trait continue", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(0, 0, 0)]));
    router.handle(ev("start", 4, "touch", [s(50, 50, 151)]));
    router.handle(ev("move", 4, "touch", [s(60, 60, 160)]));
    router.handle(ev("move", 3, "touch", [s(5, 5, 161)]));
    router.handle(ev("end", 4, "touch", []));
    router.handle(ev("end", 3, "touch", []));
    expect(log).toEqual(["begin 3 pen 1", "extend 3 1", "close 3 end"]);
  });

  it("après un stylet vu, le doigt seul déplace la vue", () => {
    const { router, log } = setup();
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(10, 10, 100)]));
    router.handle(ev("move", 3, "touch", [s(30, 25, 110)]));
    router.handle(ev("end", 3, "touch", []));
    expect(log).toEqual(["pan 20 15"]);
  });

  it("réglage coupé : le doigt trace même après un stylet", () => {
    const { router, log } = setup({ ...DEFAULT_ROUTER_OPTIONS, fingerPansAfterPen: false });
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(10, 10, 100)]));
    expect(log).toEqual(["begin 3 pen 1"]);
  });

  it("deux doigts en déplacement de vue : pincement, quel que soit le délai", () => {
    const { router, log } = setup();
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(100, 100, 1000)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 5000)]));
    router.handle(ev("move", 3, "touch", [s(0, 100, 5010)]));
    expect(log).toEqual(["pan -50 0", "zoom 100 100 2"]);
  });

  it("paume annulée par le stylet (palm) : abort, rien d'écrit", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(0, 0, 0)]));
    router.handle(ev("cancel", 3, "touch", [], { palm: true }));
    expect(log).toEqual(["begin 3 pen 1", "close 3 abort"]);
  });

  it("pointercancel d'un trait : close cancel (l'outil garde l'encre, D39)", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("cancel", 1, "pen", []));
    expect(log).toEqual(["begin 1 pen 1", "close 1 cancel"]);
  });

  it("fin du pincement : le doigt restant n'agit plus jusqu'à son relâché", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 10)]));
    router.handle(ev("end", 4, "touch", []));
    log.length = 0;
    router.handle(ev("move", 3, "touch", [s(150, 150, 50)]));
    router.handle(ev("end", 3, "touch", []));
    router.handle(ev("start", 5, "touch", [s(0, 0, 100)]));
    expect(log).toEqual(["begin 5 pen 1"]);
  });

  it("troisième doigt pendant un pincement : ignoré", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 10)]));
    log.length = 0;
    router.handle(ev("start", 5, "touch", [s(300, 300, 20)]));
    router.handle(ev("move", 5, "touch", [s(310, 300, 30)]));
    router.handle(ev("end", 5, "touch", []));
    expect(log).toEqual([]);
  });

  it("outil main : stylet et souris déplacent la vue, aucun trait", () => {
    const { router, log } = setupTool(() => "hand");
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("move", 1, "pen", [s(5, 2, 5)]));
    router.handle(ev("end", 1, "pen", []));
    router.handle(ev("start", 2, "mouse", [s(10, 10, 20)]));
    router.handle(ev("move", 2, "mouse", [s(4, 10, 25)]));
    router.handle(ev("end", 2, "mouse", []));
    expect(log).toEqual(["pan 5 2", "pan -6 0"]);
    expect(router.penSeen()).toBe(true);
  });

  it("outil main : le bouton gomme du stylet déplace aussi la vue, aucune gomme", () => {
    const { router, log } = setupTool(() => "hand");
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)], { eraserButton: true }));
    router.handle(ev("move", 1, "pen", [s(3, 0, 5)], { eraserButton: true }));
    router.handle(ev("end", 1, "pen", [], { eraserButton: true }));
    expect(log).toEqual(["pan 3 0"]);
  });

  it("outil main : un doigt déplace la vue, un second le pince, même sans stylet vu", () => {
    const { router, log } = setupTool(() => "hand");
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("move", 3, "touch", [s(110, 100, 10)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 50)]));
    router.handle(ev("move", 3, "touch", [s(20, 100, 60)]));
    expect(log).toEqual(["pan 10 0", "pan -45 0", "zoom 110 100 2"]);
  });

  it("espace maintenu : la souris déplace la vue ; relâché, elle trace de nouveau", () => {
    let held = true;
    const { router, log } = setupTool(() => "pen", () => held);
    router.handle(ev("start", 1, "mouse", [s(0, 0, 0)]));
    router.handle(ev("move", 1, "mouse", [s(7, 0, 5)]));
    router.handle(ev("end", 1, "mouse", []));
    held = false;
    router.handle(ev("start", 2, "mouse", [s(0, 0, 10)]));
    expect(log).toEqual(["pan 7 0", "begin 2 pen 1"]);
  });

  it("espace lu au début du geste : relâché pendant le glisser, la vue suit jusqu'au relâché", () => {
    let held = true;
    const { router, log } = setupTool(() => "pen", () => held);
    router.handle(ev("start", 1, "mouse", [s(0, 0, 0)]));
    held = false;
    router.handle(ev("move", 1, "mouse", [s(4, 4, 5)]));
    router.handle(ev("end", 1, "mouse", []));
    expect(log).toEqual(["pan 4 4"]);
  });

  it("réglage du doigt lu à chaque geste (accesseur) : bascule à chaud", () => {
    let pans = true;
    const opts: RouterOptions = {
      get fingerPansAfterPen() {
        return pans;
      },
      secondFingerMs: SECOND_FINGER_MS,
    };
    const { router, log } = setupTool(() => "pen", () => false, opts);
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(0, 0, 100)]));
    router.handle(ev("end", 3, "touch", []));
    pans = false;
    router.handle(ev("start", 4, "touch", [s(0, 0, 200)]));
    expect(log).toEqual(["begin 4 pen 1"]);
  });
  it("espace tenu, aucun stylet vu : un doigt déplace la vue au lieu de tracer", () => {
    const { router, log } = setupTool(() => "pen", () => true);
    router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
    router.handle(ev("move", 1, "touch", [s(3, 2, 5)]));
    router.handle(ev("end", 1, "touch", []));
    expect(log).toEqual(["pan 3 2"]);
  });

  describe("roleOf : le rôle du geste en cours, lu par la traînée déléguée (échelon 3)", () => {
    it("stylet : ink ; gomme (outil ou bouton du stylet) : erase ; inconnu ou fini : null", () => {
      const { router } = setupTool(() => "pen");
      expect(router.roleOf(9)).toBeNull();
      router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
      router.handle(ev("start", 2, "pen", [s(0, 0, 0)], { eraserButton: true }));
      expect(router.roleOf(1)).toBe("ink");
      expect(router.roleOf(2)).toBe("erase");
      router.handle(ev("end", 1, "pen", []));
      expect(router.roleOf(1)).toBeNull();
      const gum = setupTool(() => "eraser");
      gum.router.handle(ev("start", 1, "mouse", [s(0, 0, 0)]));
      expect(gum.router.roleOf(1)).toBe("erase");
    });

    it("pincement à deux doigts sans stylet : le premier doigt (ink) passe à view, le second est view", () => {
      const { router } = setupTool(() => "pen");
      router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
      expect(router.roleOf(1)).toBe("ink");
      router.handle(ev("start", 2, "touch", [s(50, 0, SECOND_FINGER_MS - 10)]));
      expect(router.roleOf(1)).toBe("view");
      expect(router.roleOf(2)).toBe("view");
    });

    it("second doigt tardif : null, le premier garde ink", () => {
      const { router } = setupTool(() => "pen");
      router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
      router.handle(ev("start", 2, "touch", [s(50, 0, SECOND_FINGER_MS + 50)]));
      expect(router.roleOf(1)).toBe("ink");
      expect(router.roleOf(2)).toBeNull();
    });

    it("paume annulée pendant que le stylet touche : null (aucune traînée pour elle)", () => {
      const { router } = setupTool(() => "pen", () => false, { ...DEFAULT_ROUTER_OPTIONS, fingerPansAfterPen: false });
      router.handle(ev("start", 3, "touch", [s(0, 0, 0)]));
      router.handle(ev("start", 1, "pen", [s(10, 10, 5)]));
      router.handle(ev("cancel", 3, "touch", [], { palm: true }));
      expect(router.roleOf(3)).toBeNull();
      expect(router.roleOf(1)).toBe("ink");
      // un doigt posé alors que le stylet touche n'arrive jamais au routeur (échantillonneur) : inconnu
      expect(router.roleOf(4)).toBeNull();
    });

    it("espace relâché pendant un glisser de vue : view jusqu'au relâché", () => {
      let held = true;
      const { router } = setupTool(() => "pen", () => held);
      router.handle(ev("start", 1, "mouse", [s(0, 0, 0)]));
      held = false;
      expect(router.roleOf(1)).toBe("view");
      router.handle(ev("end", 1, "mouse", []));
      expect(router.roleOf(1)).toBeNull();
    });
  });
});
