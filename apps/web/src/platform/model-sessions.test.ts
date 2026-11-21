/**
 * Séances 3D d'un onglet (C15, DAX3) : une seule séance (pas un lecteur par élément), rien de chargé avant `open`
 * (X20), libération au remplacement, à la fermeture et à la perte du contexte (X26).
 */
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CAMERA, type ModelCamera } from "../engine/render/model-frames";
import { createModelViewLoader, type LoadedModel, type ModelSource, type ModelView, type PixelSize } from "./model-view";
import { createModelSessions, model3dTag, MODEL3D_FAILED_MESSAGE } from "./model-sessions";

interface Loaded extends LoadedModel {
  readonly name: string;
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Vue factice : `draw` rend un objet repère, `onLost` garde le rappel. */
function fakeView(available = true) {
  let ok = available;
  let lost: (() => void) | null = null;
  const image = { repere: "rendu partagé" } as unknown as CanvasImageSource;
  const loads: ModelSource[] = [];
  const released: Loaded[] = [];
  const draws: { m: Loaded; v: ModelCamera; px: PixelSize }[] = [];
  const failing = new Set<string>();
  const gates = new Map<string, ReturnType<typeof deferred<Loaded>>>();
  const view: ModelView = {
    available: () => ok,
    load(src) {
      loads.push(src);
      if (failing.has(src.name)) return Promise.reject(new Error("illisible"));
      const g = gates.get(src.name);
      return g !== undefined ? g.promise : Promise.resolve({ missing: [], name: src.name });
    },
    draw(m, v, px) {
      draws.push({ m: m as Loaded, v, px });
      return ok ? image : null;
    },
    snapshot: async () => (ok ? new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }) : null),
    release(m) {
      released.push(m as Loaded);
    },
    onLost(cb) {
      lost = cb;
      return () => {
        lost = null;
      };
    },
  };
  return {
    view,
    image,
    loads,
    released,
    draws,
    failing,
    gates,
    lose() {
      ok = false;
      lost?.();
    },
  };
}

function setup(available = true) {
  const fv = fakeView(available);
  let renders = 0;
  const views = createModelViewLoader(async () => {
    renders++;
    return fv.view;
  });
  const redraw = vi.fn();
  const missing = new Set<string>();
  const sessions = createModelSessions({
    views,
    source: (id) => (missing.has(id) ? null : { format: "glb", name: id, main: new Blob([new Uint8Array([1])]), files: new Map() }),
    px: (id) => (id === "a" ? { w: 400, h: 200 } : { w: 100, h: 100 }),
    redraw,
  });
  return { fv, sessions, redraw, missing, renders: () => renders };
}

const TURNED: ModelCamera = { yaw: (87 * Math.PI) / 180, pitch: (20 * Math.PI) / 180 };

describe("séances 3D (C15, DAX3)", () => {
  it("rien n'est chargé avant open : state, frame et snapshot ne chargent pas le rendu (X20)", async () => {
    const { sessions, renders, fv } = setup();
    expect(sessions.state("a")).toBe("instantane");
    expect(sessions.frames.frame("a")).toBeNull();
    expect(await sessions.snapshot("a", DEFAULT_CAMERA, { w: 10, h: 10 })).toBeNull();
    expect(sessions.current()).toBeNull();
    expect(renders()).toBe(0);
    expect(fv.loads).toHaveLength(0);
  });

  it("open : chargement puis orbite ; frame(id) = image du rendu, frame(autre) null ; un seul chargement du rendu", async () => {
    const { sessions, renders, fv } = setup();
    const p = sessions.open("a", DEFAULT_CAMERA);
    expect(sessions.state("a")).toBe("chargement");
    expect(sessions.current()).toBe("a");
    expect(await p).toBe(true);
    expect(sessions.state("a")).toBe("orbite");
    expect(sessions.frames.frame("a")).toBe(fv.image);
    expect(sessions.frames.frame("b")).toBeNull();
    sessions.close();
    expect(await sessions.open("a", DEFAULT_CAMERA)).toBe(true);
    expect(renders()).toBe(1);
  });

  it("ouvrir un autre objet libère le premier (un modèle à la fois)", async () => {
    const { sessions, fv } = setup();
    await sessions.open("a", DEFAULT_CAMERA);
    expect(fv.released).toHaveLength(0);
    expect(await sessions.open("b", DEFAULT_CAMERA)).toBe(true);
    expect(fv.released.map((m) => m.name)).toEqual(["a"]);
    expect(sessions.current()).toBe("b");
    expect(sessions.frames.frame("a")).toBeNull();
    expect(sessions.frames.frame("b")).toBe(fv.image);
    expect(sessions.state("a")).toBe("instantane");
    expect(sessions.state("b")).toBe("orbite");
  });

  it("close : modèle libéré, frame null, état instantane, redraw demandé", async () => {
    const { sessions, fv, redraw } = setup();
    await sessions.open("a", DEFAULT_CAMERA);
    redraw.mockClear();
    sessions.close();
    expect(fv.released.map((m) => m.name)).toEqual(["a"]);
    expect(sessions.frames.frame("a")).toBeNull();
    expect(sessions.state("a")).toBe("instantane");
    expect(sessions.current()).toBeNull();
    expect(redraw).toHaveBeenCalled();
  });

  it("rendu indisponible : open faux, sans-webgl pour tous les objets, aucun load du modèle (X26, PC4)", async () => {
    const { sessions, fv } = setup(false);
    expect(sessions.state("a")).toBe("instantane"); // PC4 : rien ne le révèle avant le premier clic
    expect(await sessions.open("a", DEFAULT_CAMERA)).toBe(false);
    expect(sessions.state("a")).toBe("sans-webgl");
    expect(sessions.state("b")).toBe("sans-webgl");
    expect(sessions.current()).toBeNull();
    expect(fv.loads).toHaveLength(0);
  });

  it("load du modèle rejeté ou source absente : echec pour cet objet seulement", async () => {
    const { sessions, fv, missing } = setup();
    fv.failing.add("a");
    expect(await sessions.open("a", DEFAULT_CAMERA)).toBe(false);
    expect(sessions.state("a")).toBe("echec");
    expect(sessions.state("b")).toBe("instantane");
    missing.add("c");
    expect(await sessions.open("c", DEFAULT_CAMERA)).toBe(false);
    expect(sessions.state("c")).toBe("echec");
    expect(sessions.state("b")).toBe("instantane");
    expect(sessions.current()).toBeNull();
    expect(MODEL3D_FAILED_MESSAGE).toBe("objet 3D illisible sur ce poste : il garde son image");
  });

  it("contexte perdu : sans-webgl, séance fermée, un seul message", async () => {
    const { sessions, fv } = setup();
    await sessions.open("a", DEFAULT_CAMERA);
    const changes = vi.fn();
    sessions.onChange(changes);
    fv.lose();
    expect(fv.released.map((m) => m.name)).toEqual(["a"]);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(sessions.state("a")).toBe("sans-webgl");
    expect(sessions.current()).toBeNull();
    expect(sessions.frames.frame("a")).toBeNull();
  });

  it("look : caméra de la séance ; frame dessine à cette caméra et à la taille px(id)", async () => {
    const { sessions, fv, redraw } = setup();
    await sessions.open("a", DEFAULT_CAMERA);
    redraw.mockClear();
    sessions.look("a", TURNED);
    expect(redraw).toHaveBeenCalled();
    sessions.look("b", DEFAULT_CAMERA); // pas la séance : ignoré
    expect(sessions.frames.frame("a")).toBe(fv.image);
    const last = fv.draws[fv.draws.length - 1]!;
    expect(last.v).toEqual(TURNED);
    expect(last.px).toEqual({ w: 400, h: 200 });
    expect(last.m.name).toBe("a");
  });

  it("open remplacé pendant le chargement : le modèle arrivé en retard est libéré", async () => {
    const { sessions, fv } = setup();
    const gate = deferred<Loaded>();
    fv.gates.set("a", gate);
    const first = sessions.open("a", DEFAULT_CAMERA);
    await vi.waitFor(() => expect(fv.loads.map((s) => s.name)).toEqual(["a"]));
    expect(await sessions.open("b", DEFAULT_CAMERA)).toBe(true);
    gate.resolve({ missing: [], name: "a" });
    expect(await first).toBe(false);
    expect(fv.released.map((m) => m.name)).toEqual(["a"]);
    expect(sessions.current()).toBe("b");
    expect(sessions.frames.frame("b")).toBe(fv.image);
  });

  it("model3dTag : vide sans objet ; « glb;orbite;87;20 » (X36)", () => {
    expect(model3dTag(null, null, null)).toBe("");
    expect(model3dTag({ format: "glb" }, "orbite", TURNED)).toBe("glb;orbite;87;20");
    expect(model3dTag({ format: "stl" }, "instantane", DEFAULT_CAMERA)).toBe("stl;instantane;30;20");
  });
});
