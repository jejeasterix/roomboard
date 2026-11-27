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
  it("OF73 : begin reçoit le type de pointeur (souris, stylet, doigt)", () => {
    const types: (string | undefined)[] = [];
    const gestures: GestureSink = {
      begin: (_id, _t, _samples, pointerType) => types.push(pointerType),
      extend: () => {},
      close: () => {},
    };
    const view: ViewSink = { panBy: () => {}, zoomAt: () => {} };
    const router = createRouter(DEFAULT_ROUTER_OPTIONS, { currentTool: () => "pen", gestures, view });
    router.handle(ev("start", 1, "mouse", [s(0, 0, 0)]));
    router.handle(ev("end", 1, "mouse", []));
    router.handle(ev("start", 2, "touch", [s(0, 0, 10)]));
    router.handle(ev("end", 2, "touch", []));
    router.handle(ev("start", 3, "pen", [s(0, 0, 20)]));
    expect(types).toEqual(["mouse", "touch", "pen"]);
  });

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

    it("roleOf : edit pour sélection, formes et texte ; ink pour le stylo seulement", () => {
      for (const [tool, want] of [["select", "edit"], ["rect", "edit"], ["arrow", "edit"], ["text", "edit"], ["pen", "ink"], ["eraser", "erase"]] as const) {
        const { router } = setupTool(() => tool);
        router.handle(ev("start", 7, "mouse", [s(1, 1, 0)]));
        expect(router.roleOf(7)).toBe(want);
      }
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

describe("OG12 : doigt tardif = Maj (n° 29)", () => {
  function setupLate(tool: ToolChoice) {
    const log: string[] = [];
    const gestures: GestureSink = {
      begin: (id, t, samples) => log.push(`begin ${id} ${t} ${samples.length}`),
      extend: (id, samples) => log.push(`extend ${id} ${samples.length}`),
      close: (id, how) => log.push(`close ${id} ${how}`),
    };
    const view: ViewSink = { panBy: () => {}, zoomAt: () => {} };
    const mods: boolean[] = [];
    const router = createRouter(DEFAULT_ROUTER_OPTIONS, { currentTool: () => tool, gestures, view, modifier: (h) => mods.push(h) });
    return { router, log, mods };
  }
  it("doigt tardif pendant un geste au doigt de Sélection : modifier(true) puis modifier(false) au lever", () => {
    const { router, log, mods } = setupLate("select");
    router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "touch", [s(50, 50, 400)]));
    expect(mods).toEqual([true]);
    router.handle(ev("move", 1, "touch", [s(5, 5, 420)]));
    expect(log).toContain("extend 1 1");
    router.handle(ev("end", 2, "touch", []));
    expect(mods).toEqual([true, false]);
  });
  it("doigt tardif pendant un geste au stylet : ignoré", () => {
    const { router, log, mods } = setupLate("select");
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "touch", [s(50, 50, 400)]));
    expect(mods).toEqual([]);
    expect(log.filter((l) => l.startsWith("begin 2"))).toEqual([]);
  });
  it("doigt tardif avec le stylo ou la gomme : ignoré", () => {
    const { router, mods } = setupLate("pen");
    router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "touch", [s(50, 50, 400)]));
    expect(mods).toEqual([]);
  });
  it("second doigt sous 150 ms : pincement inchangé", () => {
    const { router, log, mods } = setupLate("select");
    router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "touch", [s(50, 50, 100)]));
    expect(log).toContain("close 1 abort");
    expect(mods).toEqual([]);
  });
  it("deux doigts tardifs : lever le premier garde Maj, lever le second la coupe", () => {
    const { router, mods } = setupLate("select");
    router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "touch", [s(50, 50, 400)]));
    router.handle(ev("start", 3, "touch", [s(90, 90, 600)]));
    router.handle(ev("end", 2, "touch", []));
    expect(mods).toEqual([true]);
    router.handle(ev("end", 3, "touch", []));
    expect(mods).toEqual([true, false]);
  });
  it("geste fermé pendant que le doigt tardif est posé : modifier(false)", () => {
    const { router, mods } = setupLate("select");
    router.handle(ev("start", 1, "touch", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "touch", [s(50, 50, 400)]));
    router.handle(ev("end", 1, "touch", []));
    expect(mods).toEqual([true, false]);
    router.handle(ev("end", 2, "touch", []));
    expect(mods).toEqual([true, false]);
  });
});

describe("gomme automatique à la surface de contact (OG25)", () => {
  /** `unset` : `autoEraser` absent des options (défaut d'aujourd'hui) ; sinon accesseur sur `on`. */
  function palmSetup(o: { tool?: ToolChoice; held?: boolean; toTools?: boolean; on?: () => boolean; unset?: boolean } = {}) {
    const log: string[] = [];
    const rings: string[] = [];
    const gestures: GestureSink = {
      begin: (id, t, samples) => log.push(`begin ${id} ${t} ${samples.length}`),
      extend: (id, samples) => log.push(`extend ${id} ${samples.length}`),
      close: (id, how) => log.push(`close ${id} ${how}`),
      resize: (id, r) => log.push(`resize ${id} ${r}`),
    };
    const view: ViewSink = {
      panBy: (dx, dy) => log.push(`pan ${dx} ${dy}`),
      zoomAt: (x, y, f) => log.push(`zoom ${x} ${y} ${f}`),
    };
    const on = o.on ?? (() => true);
    const options: RouterOptions =
      o.unset === true
        ? DEFAULT_ROUTER_OPTIONS
        : {
            ...DEFAULT_ROUTER_OPTIONS,
            get autoEraser() {
              return on();
            },
          };
    const router = createRouter(options, {
      currentTool: () => o.tool ?? "pen",
      panHeld: () => o.held === true,
      gesturesToTools: () => o.toTools !== false,
      ring: (c) => rings.push(c === null ? "null" : `${c.x},${c.y},${c.radius}`),
      gestures,
      view,
    });
    return { router, log, rings };
  }
  /** Toucher ; `w`, `h` : géométrie (0 : aucune). */
  const touch = (kind: GestureKind, id: number, x: number, y: number, t: number, w = 0, h = w): GestureEvent =>
    ev(kind, id, "touch", kind === "end" || kind === "cancel" ? [] : [s(x, y, t)], w > 0 || h > 0 ? { contact: { width: w, height: h } } : {});

  it("OG25 S2 : un trait avorté à la bascule n'écrit rien — contact élargi à 140 × 120 dans sa fenêtre, gomme sous -1 au rayon 70, anneau", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 30));
    router.handle(touch("move", 5, 100, 110, 40, 140, 120));
    expect(router.roleOf(5)).toBe("erase");
    router.handle(touch("move", 5, 100, 150, 60, 140, 120));
    router.handle(touch("end", 5, 0, 0, 0));
    expect(log).toEqual(["begin 5 pen 1", "close 5 abort", "begin -1 eraser 1", "resize -1 70", "extend -1 1", "close -1 end"]);
    expect(rings).toEqual(["100,110,70", "100,150,70", "null"]);
    expect(router.roleOf(5)).toBeNull();
  });

  it("OG25 : doigt qui trace loin d'une paume posée dans sa fenêtre : le trait continue, la gomme se centre sur la paume seule (revue T10)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0));
    router.handle(touch("start", 6, 1500, 300, 200, 140, 120));
    expect(router.roleOf(5)).toBe("ink");
    expect(router.roleOf(6)).toBe("erase");
    router.handle(touch("move", 5, 110, 100, 220));
    expect(log).toEqual(["begin 5 pen 1", "begin -1 eraser 1", "resize -1 70", "extend 5 1"]);
    expect(rings).toEqual(["1500,300,70"]);
  });

  it("OG25 S1 : doigt fin (20 × 20) : trait ordinaire, aucune gomme, aucun anneau", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 0, 0, 0, 20));
    router.handle(touch("move", 5, 50, 0, 10, 20));
    router.handle(touch("end", 5, 0, 0, 0));
    expect(log).toEqual(["begin 5 pen 1", "extend 5 1", "close 5 end"]);
    expect(rings).toEqual([]);
  });

  it("OG25 : contact élargi après sa fenêtre de 250 ms : le trait continue (déc. 8)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 0, 0, 0, 30));
    router.handle(touch("move", 5, 10, 0, 300, 140));
    expect(log).toEqual(["begin 5 pen 1", "extend 5 1"]);
    expect(rings).toEqual([]);
  });

  it("OG25 S5 : stylet et souris larges ne basculent jamais (déc. 5)", () => {
    const { router, log, rings } = palmSetup();
    const big = { contact: { width: 150, height: 150 } };
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)], big));
    router.handle(ev("move", 1, "pen", [s(10, 0, 10)], big));
    router.handle(ev("end", 1, "pen", []));
    router.handle(ev("start", 2, "mouse", [s(0, 0, 20)], big));
    router.handle(ev("move", 2, "mouse", [s(10, 0, 30)], big));
    router.handle(ev("end", 2, "mouse", []));
    expect(log).toEqual(["begin 1 pen 1", "extend 1 1", "close 1 end", "begin 2 pen 1", "extend 2 1", "close 2 end"]);
    expect(rings).toEqual([]);
  });

  it("OG25 S6 : sans géométrie, trois doigts serrés gardent le comportement d'aujourd'hui (déc. 11)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 0, 0, 0));
    router.handle(touch("start", 2, 30, 0, 40));
    router.handle(touch("start", 3, 60, 0, 80));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort"]);
    expect(rings).toEqual([]);
    expect(router.roleOf(3)).toBeNull();
  });

  it("OG25 S3 : trois doigts serrés gomment ; trois doigts éloignés ou tardifs gardent le pincement (effet de bord 1)", () => {
    const a = palmSetup();
    a.router.handle(touch("start", 1, 100, 100, 0, 24));
    a.router.handle(touch("start", 2, 130, 100, 40, 24));
    a.router.handle(touch("start", 3, 160, 100, 80, 24));
    expect(a.log).toEqual(["begin 1 pen 1", "close 1 abort", "begin -1 eraser 1", "resize -1 42"]);
    expect(a.rings).toEqual(["130,100,42"]);
    expect([a.router.roleOf(1), a.router.roleOf(2), a.router.roleOf(3)]).toEqual(["erase", "erase", "erase"]);
    const far = palmSetup();
    far.router.handle(touch("start", 1, 100, 100, 0, 24));
    far.router.handle(touch("start", 2, 500, 100, 40, 24));
    far.router.handle(touch("start", 3, 900, 100, 80, 24));
    expect(far.log).toEqual(["begin 1 pen 1", "close 1 abort"]);
    const late = palmSetup();
    late.router.handle(touch("start", 1, 100, 100, 0, 24));
    late.router.handle(touch("start", 2, 130, 100, 40, 24));
    late.router.handle(touch("start", 3, 160, 100, 300, 24));
    expect(late.log).toEqual(["begin 1 pen 1", "close 1 abort"]);
    expect(late.router.roleOf(3)).toBeNull();
  });

  it("OG25 S4 : deux doigts qui s'écartent : pincement inchangé, aucune gomme (déc. 10)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 200, 100, 20, 24));
    router.handle(touch("move", 2, 300, 100, 40, 24));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort", "pan 50 0", "zoom 200 100 2"]);
    expect(rings).toEqual([]);
  });

  it("OG25 : paume posée pendant un pincement établi : ignorée, le pincement continue (effet de bord 8, déc. 32)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 200, 100, 20, 24));
    router.handle(touch("move", 2, 210, 100, 400, 24));
    router.handle(touch("start", 3, 150, 300, 420, 140));
    router.handle(touch("move", 3, 160, 300, 425, 140));
    router.handle(touch("move", 2, 220, 100, 430, 24));
    expect(log.some((l) => l.startsWith("begin -"))).toBe(false);
    expect(log.at(-1)).toMatch(/^zoom 160 100 /);
    expect(rings).toEqual([]);
    expect(router.roleOf(3)).toBeNull();
  });

  it("OG25 : paume posée pendant un défilement établi : devient la seconde moitié du pincement, comme aujourd'hui (effet de bord 8)", () => {
    const { router, log, rings } = palmSetup();
    penSeen(router, log);
    router.handle(touch("start", 5, 100, 100, 1000));
    router.handle(touch("move", 5, 110, 100, 1400));
    router.handle(touch("start", 6, 300, 100, 1420, 140));
    expect(log).toEqual(["pan 10 0"]);
    expect(router.roleOf(6)).toBe("view");
    expect(rings).toEqual([]);
  });

  it("OG25 : paume après stylet : gomme, vue revenue (effet de bord 3, déc. 34)", () => {
    const { router, log } = palmSetup();
    penSeen(router, log);
    router.handle(touch("start", 5, 100, 100, 1000, 30));
    router.handle(touch("move", 5, 110, 105, 1050, 30));
    router.handle(touch("move", 5, 120, 110, 1100, 140));
    expect(log).toEqual(["pan 10 5", "pan -10 -5", "begin -1 eraser 1", "resize -1 70"]);
  });

  it("OG25 : un stylet posé ferme la gomme sans rien écrire, même en paume souple ; un toucher annulé par le stylet aussi (effet de bord 4, déc. 15)", () => {
    const a = palmSetup();
    a.router.handle(touch("start", 5, 100, 100, 0, 140));
    a.router.handle(ev("start", 9, "pen", [s(0, 0, 10)]));
    a.router.handle(touch("move", 5, 100, 120, 20, 140));
    a.router.handle(touch("end", 5, 0, 0, 0));
    expect(a.log).toEqual(["begin -1 eraser 1", "resize -1 70", "close -1 abort", "begin 9 pen 1"]);
    expect(a.rings).toEqual(["100,100,70", "null"]);
    const b = palmSetup();
    b.router.handle(touch("start", 5, 100, 100, 0, 140));
    b.router.handle(ev("cancel", 5, "touch", [], { palm: true }));
    expect(b.log).toEqual(["begin -1 eraser 1", "resize -1 70", "close -1 abort"]);
  });

  it("OG25 : pointercancel d'un contact du groupe : la gomme continue ; le dernier annulé ferme par cancel (effet de bord 10, déc. 22)", () => {
    const { router, log } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 140));
    router.handle(touch("start", 6, 150, 100, 10, 30));
    router.handle(touch("cancel", 6, 0, 0, 0));
    router.handle(touch("move", 5, 100, 120, 20, 140));
    router.handle(touch("cancel", 5, 0, 0, 0));
    expect(log).toEqual(["begin -1 eraser 1", "resize -1 70", "extend -1 1", "extend -1 1", "close -1 cancel"]);
  });

  it("OG25 : contact loin du groupe ignoré ; pointerId du porteur réutilisé : rejoint le groupe, le geste reste -1 (déc. 12, 35)", () => {
    const { router, log } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 140));
    router.handle(touch("start", 7, 600, 100, 10, 24));
    expect(router.roleOf(7)).toBeNull();
    router.handle(touch("start", 6, 150, 100, 20, 24));
    router.handle(touch("end", 5, 0, 0, 0));
    router.handle(touch("start", 5, 120, 100, 40, 24));
    expect(router.roleOf(5)).toBe("erase");
    router.handle(touch("move", 5, 125, 100, 50, 24));
    router.handle(touch("end", 6, 0, 0, 0));
    router.handle(touch("end", 5, 0, 0, 0));
    router.handle(touch("end", 7, 0, 0, 0));
    expect(log).toEqual(["begin -1 eraser 1", "resize -1 70", "extend -1 1", "extend -1 1", "extend -1 1", "close -1 end"]);
  });

  it("OG25 : outil Sélection, contact qui grandit : aucune gomme, begin de la sélection une seule fois ; réglage coupé ou absent, Main, espace tenu, Texte, Tableau, retouche ou orbite : aucune bascule (effet de bord 9, déc. 14, 23, 25, 33)", () => {
    const cases: NonNullable<Parameters<typeof palmSetup>[0]>[] = [
      { tool: "select" },
      { on: () => false },
      { unset: true },
      { tool: "hand" },
      { held: true },
      { tool: "text" },
      { tool: "table" },
      { toTools: false },
    ];
    for (const c of cases) {
      const { router, log, rings } = palmSetup(c);
      router.handle(touch("start", 5, 100, 100, 0, 30));
      router.handle(touch("move", 5, 100, 110, 40, 140, 120));
      router.handle(touch("end", 5, 0, 0, 0));
      expect(log.some((l) => l.startsWith("begin -")), JSON.stringify(c)).toBe(false);
      expect(rings, JSON.stringify(c)).toEqual([]);
      if (c.tool === "select") expect(log.filter((l) => l.startsWith("begin"))).toEqual(["begin 5 select 1"]);
    }
  });

  it("OG25 : Rectangle, Ellipse, Ligne, Flèche, Pot, Gomme peuvent basculer (déc. 33)", () => {
    for (const tool of ["rect", "ellipse", "line", "arrow", "fill", "eraser"] as const) {
      const { router, log } = palmSetup({ tool });
      router.handle(touch("start", 5, 100, 100, 0, 30));
      router.handle(touch("move", 5, 100, 110, 40, 140, 120));
      expect(log.slice(0, 3), tool).toEqual([`begin 5 ${tool} 1`, "close 5 abort", "begin -1 eraser 1"]);
    }
  });

  it("OG25 : réglage lu à chaque pose (accesseur) ; identifiants réservés -1 puis -2", () => {
    let on = false;
    const { router, log } = palmSetup({ on: () => on });
    router.handle(touch("start", 5, 0, 0, 0, 140));
    router.handle(touch("end", 5, 0, 0, 0));
    on = true;
    router.handle(touch("start", 6, 0, 0, 1000, 140));
    router.handle(touch("end", 6, 0, 0, 0));
    router.handle(touch("start", 7, 0, 0, 2000, 140));
    expect(log).toEqual(["begin 5 pen 1", "close 5 end", "begin -1 eraser 1", "resize -1 70", "close -1 end", "begin -2 eraser 1", "resize -2 70"]);
  });

  it("OG25 : le rayon ne fait que grandir pendant le contact, borné à 160 (déc. 18, 19)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 100));
    router.handle(touch("move", 5, 100, 100, 10, 200));
    router.handle(touch("move", 5, 100, 100, 20, 60));
    router.handle(touch("move", 5, 100, 100, 30, 500));
    expect(log.filter((l) => l.startsWith("resize"))).toEqual(["resize -1 50", "resize -1 100", "resize -1 160"]);
    expect(rings).toEqual(["100,100,50", "100,100,100", "100,100,100", "100,100,160"]);
  });

  it("OG25 : trait au doigt établi : un contact large posé ensuite est ignoré, le trait continue (déc. 13)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 0, 0, 0));
    router.handle(touch("move", 1, 10, 0, 300));
    router.handle(touch("start", 2, 100, 0, 320, 140));
    router.handle(touch("move", 1, 20, 0, 330));
    expect(log).toEqual(["begin 1 pen 1", "extend 1 1", "extend 1 1"]);
    expect(rings).toEqual([]);
    expect(router.roleOf(2)).toBeNull();
  });

  it("OG25 : second doigt tardif (ignoré) qui s'élargit dans sa fenêtre : gomme, trait abandonné (règle 2, revue T4)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 30));
    router.handle(touch("start", 2, 130, 100, 170, 30));
    expect(router.roleOf(2)).toBeNull();
    router.handle(touch("move", 2, 130, 100, 220, 120));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort", "begin -1 eraser 1", "resize -1 60"]);
    expect(rings).toEqual(["130,100,60"]);
    expect([router.roleOf(1), router.roleOf(2)]).toEqual(["erase", "erase"]);
  });

  it("OG25 : trois doigts serrés posés à 0, 160 et 200 ms, le second ignoré : gomme (déc. 9, règle 3, revue T4)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 130, 100, 160, 24));
    router.handle(touch("start", 3, 160, 100, 200, 24));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort", "begin -1 eraser 1", "resize -1 42"]);
    expect(rings).toEqual(["130,100,42"]);
    expect([router.roleOf(1), router.roleOf(2), router.roleOf(3)]).toEqual(["erase", "erase", "erase"]);
  });

  it("OG25 : contact ignoré au-delà de sa fenêtre : il le reste et n'empêche pas la bascule d'une paume posée ensuite (déc. 12)", () => {
    const { router, log } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0));
    router.handle(touch("start", 2, 130, 100, 160));
    router.handle(touch("end", 1, 0, 0, 0));
    router.handle(touch("start", 3, 400, 400, 1000, 140));
    router.handle(touch("move", 2, 140, 100, 1010));
    expect(log).toEqual(["begin 1 pen 1", "close 1 end", "begin -1 eraser 1", "resize -1 70"]);
    expect(router.roleOf(2)).toBeNull();
    expect(router.roleOf(3)).toBe("erase");
  });

  it("OG25 : membre d'un pincement encore dans sa fenêtre qui s'élargit : gomme, la vue ne bouge pas (déc. 10, revue T4)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 200, 100, 20, 24));
    router.handle(touch("move", 2, 200, 100, 40, 120));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort", "begin -1 eraser 1", "resize -1 86"]);
    expect(rings).toEqual(["174,100,86"]);
    expect([router.roleOf(1), router.roleOf(2)]).toEqual(["erase", "erase"]);
  });

  it("OG25 : outil Main ou espace tenu, contact qui grandit : la vue suit chaque déplacement, aucune gomme (déc. 14, revue T4)", () => {
    const cases: NonNullable<Parameters<typeof palmSetup>[0]>[] = [{ tool: "hand" }, { held: true }];
    for (const c of cases) {
      const { router, log, rings } = palmSetup(c);
      router.handle(touch("start", 5, 100, 100, 0, 30));
      router.handle(touch("move", 5, 110, 100, 10, 140));
      router.handle(touch("move", 5, 120, 105, 20, 140));
      router.handle(touch("end", 5, 0, 0, 0));
      expect(log, JSON.stringify(c)).toEqual(["pan 10 0", "pan 10 5"]);
      expect(rings, JSON.stringify(c)).toEqual([]);
    }
  });

  it("OG25 : défilement lointain encore dans sa fenêtre à la bascule : la vue ne bouge plus, gomme centrée sur la paume (règle 5, revue T11)", () => {
    const { router, log, rings } = palmSetup();
    penSeen(router, log);
    router.handle(touch("start", 5, 100, 100, 0));
    router.handle(touch("start", 6, 1500, 300, 200, 140, 120));
    expect(router.roleOf(6)).toBe("erase");
    router.handle(touch("move", 5, 400, 100, 300));
    router.handle(touch("move", 6, 1510, 300, 320, 140, 120));
    expect(log).toEqual(["begin -1 eraser 1", "resize -1 70", "extend -1 1"]);
    expect(rings).toEqual(["1500,300,70", "1510,300,70"]);
    expect(router.roleOf(5)).toBeNull();
  });

  it("OG25 : pincement dont un doigt rejoint la gomme : la paire entre en entier ; après la fermeture, une paume suivante ouvre une gomme (revue T11)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 700, 100, 20, 24));
    router.handle(touch("start", 3, 150, 300, 100, 140));
    expect([router.roleOf(1), router.roleOf(2), router.roleOf(3)]).toEqual(["erase", "erase", "erase"]);
    router.handle(touch("move", 2, 720, 100, 150, 24));
    router.handle(touch("end", 3, 0, 0, 0));
    router.handle(touch("end", 1, 0, 0, 0));
    router.handle(touch("end", 2, 0, 0, 0));
    router.handle(touch("start", 4, 400, 500, 900, 140));
    router.handle(touch("move", 4, 420, 500, 950, 140));
    expect(log).toEqual([
      "begin 1 pen 1",
      "close 1 abort",
      "begin -1 eraser 1",
      "resize -1 160",
      "extend -1 1",
      "close -1 end",
      "begin -2 eraser 1",
      "resize -2 70",
      "extend -2 1",
    ]);
    expect(rings).toEqual(["396,229,160", "406,229,160", "null", "400,500,70", "420,500,70"]);
    expect(router.roleOf(4)).toBe("erase");
  });

  it("OG25 : trait au doigt établi à plus de 160 px : la paume ne bascule pas, le trait continue (déc. 13, 32, revue T10)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0));
    router.handle(touch("move", 5, 110, 100, 300));
    router.handle(touch("start", 6, 1500, 300, 400, 140, 120));
    router.handle(touch("move", 5, 120, 100, 410));
    expect(log).toEqual(["begin 5 pen 1", "extend 5 1", "extend 5 1"]);
    expect(rings).toEqual([]);
    expect(router.roleOf(5)).toBe("ink");
    expect(router.roleOf(6)).toBeNull();
  });

  it("OG25 : pincement lointain encore dans sa fenêtre à la bascule : la vue ne bouge plus, et il n'empêche pas une paume suivante (règle 5, revue T11)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 200, 100, 20, 24));
    router.handle(touch("start", 3, 1500, 300, 100, 140, 120));
    router.handle(touch("move", 2, 260, 100, 150, 24));
    expect([router.roleOf(1), router.roleOf(2)]).toEqual([null, null]);
    router.handle(touch("end", 3, 0, 0, 0));
    router.handle(touch("start", 4, 1500, 600, 900, 140));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort", "begin -1 eraser 1", "resize -1 70", "close -1 end", "begin -2 eraser 1", "resize -2 70"]);
    expect(rings).toEqual(["1500,300,70", "null", "1500,600,70"]);
  });
});

describe("OG12 × OG25 : doigt tardif (Maj) ou membre de la paume", () => {
  function shared(tool: ToolChoice) {
    const log: string[] = [];
    const gestures: GestureSink = {
      begin: (id, t) => log.push(`begin ${id} ${t}`),
      extend: () => {},
      close: (id, how) => log.push(`close ${id} ${how}`),
      resize: () => {},
    };
    const view: ViewSink = { panBy: () => {}, zoomAt: () => {} };
    const router = createRouter(
      { ...DEFAULT_ROUTER_OPTIONS, autoEraser: true },
      { currentTool: () => tool, gestures, view, modifier: (h) => log.push(`mod ${h}`) },
    );
    return { router, log, mods: () => log.filter((l) => l.startsWith("mod ")) };
  }
  const touch = (kind: GestureKind, id: number, x: number, y: number, t: number, w = 0): GestureEvent =>
    ev(kind, id, "touch", kind === "end" || kind === "cancel" ? [] : [s(x, y, t)], w > 0 ? { contact: { width: w, height: w } } : {});

  it("doigt tardif compté puis élargi dans sa fenêtre (A-1) : la paume gagne, Maj retombe avant la gomme", () => {
    const { router, log, mods } = shared("rect");
    router.handle(touch("start", 1, 100, 100, 0, 20));
    router.handle(touch("start", 2, 150, 100, SECOND_FINGER_MS + 10, 20));
    expect(mods()).toEqual(["mod true"]);
    router.handle(touch("move", 2, 150, 100, 200, 140));
    expect(router.roleOf(2)).toBe("erase");
    expect(log).toEqual(["begin 1 rect", "mod true", "close 1 abort", "mod false", "begin -1 eraser"]);
    router.handle(touch("end", 2, 0, 0, 0));
    router.handle(touch("end", 1, 0, 0, 0));
    expect(mods()).toEqual(["mod true", "mod false"]);
  });

  it("trois doigts serrés dont un doigt tardif déjà compté : la paume gagne, Maj retombe", () => {
    const { router, log, mods } = shared("rect");
    router.handle(touch("start", 1, 100, 100, 0, 20));
    router.handle(touch("start", 2, 140, 100, SECOND_FINGER_MS + 10, 20));
    router.handle(touch("start", 3, 120, 140, 200, 20));
    expect(router.roleOf(3)).toBe("erase");
    expect(log).toEqual(["begin 1 rect", "mod true", "close 1 abort", "mod false", "begin -1 eraser"]);
    for (const id of [3, 2, 1]) router.handle(touch("end", id, 0, 0, 0));
    expect(mods()).toEqual(["mod true", "mod false"]);
  });

  it("paume posée loin du trait (A-2) : le trait garde son geste et son Maj", () => {
    const { router, log, mods } = shared("rect");
    router.handle(touch("start", 1, 100, 100, 0, 20));
    router.handle(touch("start", 2, 150, 100, SECOND_FINGER_MS + 10, 20));
    router.handle(touch("start", 3, 1000, 100, 200, 140));
    expect([router.roleOf(1), router.roleOf(3)]).toEqual(["edit", "erase"]);
    expect(log).toEqual(["begin 1 rect", "mod true", "begin -1 eraser"]);
    router.handle(touch("end", 1, 0, 0, 0));
    expect(mods()).toEqual(["mod true", "mod false"]);
  });

  it("doigt tardif posé large dans la fenêtre du trait : paume, jamais Maj", () => {
    const { router, log, mods } = shared("rect");
    router.handle(touch("start", 1, 100, 100, 0, 20));
    router.handle(touch("start", 2, 150, 100, SECOND_FINGER_MS + 10, 140));
    expect(router.roleOf(2)).toBe("erase");
    expect(log).toEqual(["begin 1 rect", "close 1 abort", "begin -1 eraser"]);
    router.handle(touch("end", 2, 0, 0, 0));
    expect(mods()).toEqual([]);
  });

  it("trait établi (au-delà de 250 ms, déc. 13) : le doigt tardif large reste Maj, même élargi", () => {
    const { router, log } = shared("rect");
    router.handle(touch("start", 1, 100, 100, 0, 20));
    router.handle(touch("start", 2, 150, 100, 400, 140));
    router.handle(touch("move", 2, 150, 100, 450, 160));
    expect(router.roleOf(1)).toBe("edit");
    expect(router.roleOf(2)).toBeNull();
    router.handle(touch("end", 1, 0, 0, 0));
    expect(log).toEqual(["begin 1 rect", "mod true", "close 1 end", "mod false"]);
  });

  it("Sélection (hors des outils qui basculent, déc. 33) : le doigt tardif large vaut Maj", () => {
    const { router, log, mods } = shared("select");
    router.handle(touch("start", 1, 100, 100, 0, 20));
    router.handle(touch("start", 2, 150, 100, SECOND_FINGER_MS + 10, 140));
    expect(mods()).toEqual(["mod true"]);
    expect(log.some((l) => l.includes("eraser"))).toBe(false);
    router.handle(touch("end", 2, 0, 0, 0));
    expect(mods()).toEqual(["mod true", "mod false"]);
  });
});
