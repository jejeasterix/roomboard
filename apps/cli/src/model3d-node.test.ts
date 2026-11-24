import { afterEach, describe, expect, it, vi } from "vitest";
import { cubeMtl, cubeObj, glbPlain, glbTextured, gltfPair, plyTriangle, png1, stlTriangle } from "../../../scripts/essais/fabriques/modeles.mjs";
import { DEFAULT_CAMERA } from "../../web/src/engine/render/model-frames";
import type { ModelSource } from "../../web/src/platform/model-view";
import { quietError } from "./quiet";
import { nodeModel3d, withThreeGlobals } from "./model3d-node";
import { fabZip } from "./testing";

const SLOTS = ["self", "ProgressEvent", "document"] as const;
const present = (): boolean[] => SLOTS.map((k) => k in globalThis);
const blob = (b: Uint8Array): Blob => new Blob([b as BlobPart]);
const src = (format: ModelSource["format"], name: string, main: Uint8Array, files: Array<[string, Uint8Array]> = []): ModelSource => ({
  format,
  name,
  main: blob(main),
  files: new Map(files.map(([p, b]) => [p, blob(b)])),
});

/** Les cas exigés de S4 : GLB sans et avec texture incorporée, glTF + .bin, OBJ + MTL citant une texture, STL, PLY. */
const s4 = (): ModelSource[] => {
  const { gltf, bin } = gltfPair();
  return [
    src("glb", "tri.glb", glbPlain()),
    src("glb", "tex.glb", glbTextured()),
    src("gltf", "tri.gltf", gltf, [["tri.bin", bin]]),
    src("obj", "cube.obj", cubeObj(), [["cube.mtl", cubeMtl()], ["tex.png", png1()]]),
    src("stl", "tri.stl", stlTriangle()),
    src("ply", "tri.ply", plyTriangle()),
  ];
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("nodeModel3d (cli-lot4, D67)", () => {
  it("S4 — GLB sans et avec texture, glTF + .bin, OBJ + MTL + texture, STL, PLY : lus sans WebGL, missing vide, instantané null", async () => {
    const view = await nodeModel3d().view();
    expect(view.available()).toBe(false);
    for (const s of s4()) {
      const m = await view.load(s);
      expect(m.missing, s.name).toEqual([]);
      expect(await view.snapshot(m, DEFAULT_CAMERA, { w: 64, h: 48 }), s.name).toBeNull();
      view.release(m);
    }
    expect(present()).toEqual([false, false, false]);
  });
  it("S4 — glTF sans son .bin : rejet, globaux retirés", async () => {
    const view = await nodeModel3d().view();
    await expect(view.load(src("gltf", "tri.gltf", gltfPair().gltf))).rejects.toThrow();
    expect(present()).toEqual([false, false, false]);
  });
  it("D77 — texture absente : missing [\"tex.png\"], le seul message de three filtré par quietError", async () => {
    const shown = vi.fn();
    const original = console.error;
    console.error = quietError(shown);
    try {
      const view = await nodeModel3d().view();
      const { gltf, bin } = gltfPair({ image: "tex.png" });
      const m = await view.load(src("gltf", "tri.gltf", gltf, [["tri.bin", bin]]));
      expect(m.missing).toEqual(["tex.png"]);
    } finally {
      console.error = original;
    }
    expect(shown).not.toHaveBeenCalled();
  });
  it("D77 — aucun console.warn ni console.error pendant la lecture des fabriques de S4", async () => {
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const view = await nodeModel3d().view();
    for (const s of s4()) view.release(await view.load(s));
    expect([warn.mock.calls, error.mock.calls]).toEqual([[], []]);
  });
  it("readZip — ZIP de deux modèles lu en processus (inlineWorker) : deux entrées", async () => {
    const entries = await nodeModel3d().readZip(new Blob([fabZip({ "a.stl": stlTriangle(), "b/c.ply": plyTriangle() }) as BlobPart]));
    expect(entries.map((e) => e.path).sort()).toEqual(["a.stl", "b/c.ply"]);
  });
});

describe("withThreeGlobals (cli-lot4, D76)", () => {
  it("D76 — self, ProgressEvent, document posés le temps de run seulement, retirés après un succès comme après un rejet ; fetch de Node gardé", async () => {
    const nodeFetch = globalThis.fetch;
    expect(present()).toEqual([false, false, false]);
    let during: boolean[] = [];
    let fetchDuring: unknown = null;
    await withThreeGlobals(async () => {
      during = present();
      fetchDuring = globalThis.fetch;
    });
    expect(during).toEqual([true, true, true]);
    expect(fetchDuring).toBe(nodeFetch);
    expect(present()).toEqual([false, false, false]);
    await expect(withThreeGlobals(async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(present()).toEqual([false, false, false]);
    expect(globalThis.fetch).toBe(nodeFetch);
  });
  it("D76 — un global déjà présent n'est ni remplacé ni retiré", async () => {
    const mine = { mine: true };
    vi.stubGlobal("document", mine);
    await withThreeGlobals(async () => expect((globalThis as { document?: unknown }).document).toBe(mine));
    expect((globalThis as { document?: unknown }).document).toBe(mine);
  });
  it("D76 — image sans canvas : contenu non vide → load, URL vide → error", async () => {
    const outcome = (b: Blob): Promise<string> =>
      withThreeGlobals(
        () =>
          new Promise<string>((resolve) => {
            const doc = (globalThis as unknown as { document: { createElementNS(ns: string, n: string): { addEventListener(t: string, cb: () => void): void; src: string } } }).document;
            const img = doc.createElementNS("http://www.w3.org/1999/xhtml", "img");
            img.addEventListener("load", () => resolve("load"));
            img.addEventListener("error", () => resolve("error"));
            img.src = URL.createObjectURL(b);
          }),
      );
    expect(await outcome(blob(png1()))).toBe("load");
    expect(await outcome(new Blob([]))).toBe("error");
  });
  it("D76 — ProgressEvent : lengthComputable, loaded, total", async () => {
    await withThreeGlobals(async () => {
      const P = (globalThis as unknown as { ProgressEvent: new (t: string, i?: object) => { type: string; loaded: number; total: number; lengthComputable: boolean } }).ProgressEvent;
      const e = new P("progress", { lengthComputable: true, loaded: 3, total: 9 });
      expect([e.type, e.lengthComputable, e.loaded, e.total]).toEqual(["progress", true, 3, 9]);
    });
  });
});
