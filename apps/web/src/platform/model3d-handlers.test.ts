import { zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL3D_PITCH, DEFAULT_MODEL3D_YAW, type Command } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { IDENTITY } from "../engine/camera";
import { DEFAULT_CAMERA } from "../engine/render/model-frames";
import type { DroppedFile } from "./files";
import { anchorOf, placement, visibleOf, type ImageTarget } from "./image-import";
import { createImporter, LATER_FORMAT_MESSAGE } from "./import";
import { MODEL3D_TAB_CLOSED, MODEL3D_UNREADABLE, MODEL_BOX, linkedMime, type Model3dDeps } from "./model3d-handlers";
import { cubeGlb, cubeMtl, cubeObj, gltfWithBin } from "./model3d-fixtures";
import {
  COMPANION_ALONE_MESSAGE, COMPRESSED_MESSAGE, MODEL3D_MAX_BYTES, MODEL3D_TOO_BIG_MESSAGE, MTL_MISSING_MESSAGE, NO_WEBGL_MESSAGE,
  ZIP_EMPTY_MESSAGE,
} from "./model3d-import";
import { snapshotSize, type ModelSource, type ModelView } from "./model-view";
import { checkZipReply } from "./zip-read";
import { unzipModelEntries } from "./zip-worker";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const file = (name: string, bytes: Uint8Array | string): DroppedFile => {
  const b = typeof bytes === "string" ? enc(bytes) : bytes;
  return { name, size: b.length, mime: "", head: async (n: number) => b.slice(0, n), blob: async () => new Blob([b as Uint8Array<ArrayBuffer>]) };
};
function pngHead(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}
const RECT = { left: 0, top: 0, width: 800, height: 600 };
function fakeTarget(rect = RECT) {
  const cmds: Command[] = [];
  const assets = createAssetStore();
  const target: ImageTarget = {
    assets,
    page: () => "p1",
    camera: () => IDENTITY,
    stageRect: () => rect,
    measure: () => (s: string) => s.length * 10,
    textStyle: () => ({ color: "#000000", size: 36 }),
    run: (cmd) => {
      cmds.push(cmd);
      return { pages: [], ids: [`e${cmds.length}`], removed: [], full: false, version: cmds.length };
    },
  };
  return { target, cmds, assets };
}
const decoded = (w: number, h: number) =>
  vi.fn(async (_b: Blob, _k: string) => ({ bitmap: { close: vi.fn() } as unknown as ImageBitmap, w, h }));

function fakeView(opts: { webgl?: boolean; missing?: string[]; fail?: boolean } = {}) {
  const loads: ModelSource[] = [];
  const view: ModelView = {
    available: () => opts.webgl ?? true,
    load: vi.fn(async (s: ModelSource) => {
      loads.push(s);
      if (opts.fail) throw new Error("x");
      return { missing: opts.missing ?? [] };
    }),
    draw: () => null,
    snapshot: vi.fn(async () => ((opts.webgl ?? true) ? new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }) : null)),
    release: vi.fn(),
    onLost: () => () => undefined,
  };
  return { view, loads };
}
const zipOf = (files: Record<string, Uint8Array | string>): Uint8Array =>
  zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === "string" ? new TextEncoder().encode(v) : v])));
const realZip = { readZip: async (b: Blob) => checkZipReply({ entries: unzipModelEntries(new Uint8Array(await b.arrayBuffer())) }) };
type AddModel3d = Extract<Command, { type: "AddModel3d" }>;
type AddImage = Extract<Command, { type: "AddImage" }>;

function setup(opts: { webgl?: boolean; missing?: string[]; fail?: boolean; target?: ImageTarget } = {}) {
  const t = fakeTarget();
  const notify = vi.fn(async (_m: string) => undefined);
  const { view, loads } = fakeView(opts);
  const model3d: Model3dDeps = { view: vi.fn(async () => view), readZip: vi.fn(realZip.readZip) };
  const target = opts.target ?? t.target;
  const importer = createImporter({ openDocument: vi.fn(async () => true), notify, target: () => target, decode: decoded(10, 10), model3d });
  const messages = (): string[] => notify.mock.calls.map((c) => c[0]);
  const models = (): AddModel3d[] => t.cmds.filter((c): c is AddModel3d => c.type === "AddModel3d");
  return { t, notify, view, loads, model3d, importer, messages, models };
}

describe("gestionnaire 3D (C15)", () => {
  it("GLB seul : AddModel3d en une commande, boîte 640 × 480 au point de dépôt, vue par défaut, instantané PNG (S1, X6, X7)", async () => {
    const s = setup();
    const at = { x: 120, y: 90 };
    const glb = cubeGlb();
    const r = await s.importer.importFiles([file("cube.glb", glb)], at);
    expect(r).toEqual({ opened: [], inserted: ["cube.glb"], refused: [], failed: [] });
    // Une seule commande : ni AddImage pour l'instantané, ni seconde écriture (X7, GC10).
    expect(s.t.cmds.map((c) => c.type)).toEqual(["AddModel3d"]);
    const cmd = s.t.cmds[0] as AddModel3d;
    expect(MODEL_BOX).toEqual({ w: 640, h: 480 });
    expect(cmd).toMatchObject({ page: "p1", format: "glb", w: 640, h: 480, yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH, files: [] });
    expect(cmd.asset).toMatchObject({ name: "cube.glb", mime: "model/gltf-binary", size: glb.length });
    expect(cmd.snapshot).toMatchObject({ name: "cube.glb.png", mime: "image/png", size: 4 });
    expect(cmd.matrix).toEqual(placement(640, 480, anchorOf(RECT, IDENTITY, at), visibleOf(RECT, IDENTITY), 0));
    expect(s.t.assets.has(cmd.asset.id)).toBe(true);
    expect(s.t.assets.has(cmd.snapshot!.id)).toBe(true);
    expect(s.view.snapshot).toHaveBeenCalledWith(expect.anything(), DEFAULT_CAMERA, snapshotSize(640, 480));
    expect(s.view.release).toHaveBeenCalledTimes(1);
    expect(s.loads[0]).toMatchObject({ format: "glb", name: "cube.glb" });
    expect(s.notify).not.toHaveBeenCalled();
  });

  it("OBJ + MTL ensemble : un élément, le .mtl en fichier lié, aucun avertissement, le .mtl non importé seul (S3)", async () => {
    const s = setup();
    const r = await s.importer.importFiles([file("cube.obj", cubeObj()), file("cube.mtl", cubeMtl())], null);
    expect(r).toEqual({ opened: [], inserted: ["cube.obj"], refused: [], failed: [] });
    expect(s.t.cmds).toHaveLength(1);
    const cmd = s.models()[0]!;
    expect(cmd.format).toBe("obj");
    expect(cmd.files.map((f) => [f.path, f.asset.name, f.asset.mime])).toEqual([["cube.mtl", "cube.mtl", "model/mtl"]]);
    expect(s.t.assets.has(cmd.files[0]!.asset.id)).toBe(true);
    expect(s.loads[0]!.files.get("cube.mtl")?.type).toBe("model/mtl");
    expect(s.notify).not.toHaveBeenCalled();
  });

  it(".obj seul : inséré, avertissement « déposé sans son .mtl » (X15)", async () => {
    const s = setup();
    const r = await s.importer.importFiles([file("seul.obj", cubeObj())], null);
    expect(r.inserted).toEqual(["seul.obj"]);
    expect(s.models()).toHaveLength(1);
    expect(s.messages()).toEqual([`seul.obj : ${MTL_MISSING_MESSAGE}`]);
  });

  it("texture citée absente et absents du rendu : « fichiers liés absents (bleu.png, https://cdn.test/x.png) » (X14, X27)", async () => {
    const s = setup({ missing: ["https://cdn.test/x.png"] });
    const r = await s.importer.importFiles([file("cube.obj", cubeObj()), file("cube.mtl", cubeMtl("bleu.png"))], null);
    // Le modèle reste inséré, le fichier lié absent n'est qu'un avertissement (le rendu T7 s'en charge).
    expect(r).toEqual({ opened: [], inserted: ["cube.obj"], refused: [], failed: [] });
    expect(s.models()).toHaveLength(1);
    expect(s.models()[0]!.files.map((f) => f.path)).toEqual(["cube.mtl"]);
    expect(s.messages()).toEqual(["cube.obj : fichiers liés absents (bleu.png, https://cdn.test/x.png)"]);
  });

  it("glTF à Draco requis : refusé, rien d'inséré (X18)", async () => {
    const s = setup();
    const glb = cubeGlb({ extensionsRequired: ["KHR_draco_mesh_compression"], extensionsUsed: ["KHR_draco_mesh_compression"] });
    const r = await s.importer.importFiles([file("cube.glb", glb)], null);
    expect(r.failed).toEqual(["cube.glb"]);
    expect(s.t.cmds).toEqual([]);
    expect(s.messages()).toEqual([`cube.glb : ${COMPRESSED_MESSAGE}`]);
    expect(s.view.load).not.toHaveBeenCalled();
  });

  it("sans WebGL : inséré sans instantané, « 3D indisponible » une seule fois pour deux modèles (S5, X26)", async () => {
    const s = setup({ webgl: false });
    const r = await s.importer.importFiles([file("a.glb", cubeGlb()), file("b.glb", cubeGlb())], null);
    expect(r.inserted).toEqual(["a.glb", "b.glb"]);
    expect(s.models().map((c) => c.snapshot)).toEqual([null, null]);
    expect(s.messages()).toEqual([NO_WEBGL_MESSAGE]);
    // Un seul message par importeur : ni au dépôt suivant, ni par le ZIP (état partagé des gestionnaires).
    await s.importer.importFiles([file("c.glb", cubeGlb())], null);
    await s.importer.importFiles([file("d.zip", zipOf({ "e.glb": cubeGlb() }))], null);
    expect(s.models()).toHaveLength(4);
    expect(s.messages()).toEqual([NO_WEBGL_MESSAGE]);
  });

  it("modèle illisible : échec, « modèle 3D illisible », rien d'inséré", async () => {
    const s = setup({ fail: true });
    const r = await s.importer.importFiles([file("cube.glb", cubeGlb())], null);
    expect(r.failed).toEqual(["cube.glb"]);
    expect(s.t.cmds).toEqual([]);
    expect(s.messages()).toEqual([`Import impossible (cube.glb) : ${MODEL3D_UNREADABLE} (x)`]);
    // Onglet fermé pendant l'import : rien d'inséré, dit une fois.
    const t = fakeTarget();
    const closed = setup({ target: { ...t.target, alive: () => false } });
    expect((await closed.importer.importFiles([file("cube.glb", cubeGlb())], null)).failed).toEqual(["cube.glb"]);
    expect(t.cmds).toEqual([]);
    expect(closed.messages()).toEqual([`cube.glb : ${MODEL3D_TAB_CLOSED}`]);
  });

  it("un .zip sans modèle : aucun modèle 3D dans ce ZIP", async () => {
    const s = setup();
    const r = await s.importer.importFiles([file("a.zip", zipOf({ "lisez-moi.txt": "x" }))], null);
    expect(r).toEqual({ opened: [], inserted: [], refused: [], failed: ["a.zip"] });
    expect(s.messages()).toEqual([`a.zip : ${ZIP_EMPTY_MESSAGE}`]);
    expect(s.messages()).toEqual(["a.zip : aucun modèle 3D dans ce ZIP"]);
  });

  it("ZIP : glTF + .bin + PNG dans un sous-dossier : un élément, deux liés (S3)", async () => {
    const s = setup();
    const { gltf, bin } = gltfWithBin();
    const zip = zipOf({ "modele/scene.gltf": gltf, "modele/cube.bin": bin, "modele/tex/a.png": pngHead(4, 4) });
    const r = await s.importer.importFiles([file("a.zip", zip)], null);
    expect(r).toEqual({ opened: [], inserted: ["a.zip"], refused: [], failed: [] });
    expect(s.t.cmds.map((c) => c.type)).toEqual(["AddModel3d"]);
    const cmd = s.models()[0]!;
    expect([cmd.format, cmd.asset.name]).toEqual(["gltf", "scene.gltf"]);
    expect(cmd.files.map((f) => f.path)).toEqual(["cube.bin", "tex/a.png"]);
    expect(cmd.files.map((f) => f.asset.mime)).toEqual(["application/octet-stream", "image/png"]);
    expect(cmd.files.map((f) => f.asset.name)).toEqual(["cube.bin", "a.png"]);
    expect([...s.loads[0]!.files.keys()]).toEqual(["cube.bin", "tex/a.png"]);
    expect(s.notify).not.toHaveBeenCalled();
    expect([linkedMime("x/y.JPG"), linkedMime("m.mtl"), linkedMime("data.bin")]).toEqual(["image/jpeg", "model/mtl", "application/octet-stream"]);
  });

  it("ZIP : deux modèles → deux éléments en cascade ; 21 modèles → 20 (X16)", async () => {
    const s = setup();
    const r = await s.importer.importFiles([file("deux.zip", zipOf({ "a.glb": cubeGlb(), "b.glb": cubeGlb() }))], null);
    expect(r.inserted).toEqual(["deux.zip"]);
    const anchor = anchorOf(RECT, IDENTITY, null);
    const visible = visibleOf(RECT, IDENTITY);
    expect(s.models().map((c) => c.matrix)).toEqual([placement(640, 480, anchor, visible, 0), placement(640, 480, anchor, visible, 1)]);
    const [m0, m1] = s.models().map((c) => c.matrix);
    expect(m1).not.toEqual(m0);
    expect(s.models().map((c) => c.asset.name)).toEqual(["a.glb", "b.glb"]);
    const many = setup();
    const big = zipOf(Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`m${i}.glb`, cubeGlb()])));
    expect((await many.importer.importFiles([file("vingt-et-un.zip", big)], null)).inserted).toEqual(["vingt-et-un.zip"]);
    expect(many.models()).toHaveLength(20);
    expect(many.t.cmds).toHaveLength(20);
  });

  it(".mtl ou .bin déposé seul : « fichier lié d'un modèle 3D : déposez-le avec son modèle » (X12)", async () => {
    const s = setup();
    const r = await s.importer.importFiles([file("cube.mtl", cubeMtl())], null);
    expect(r.failed).toEqual(["cube.mtl"]);
    const r2 = await s.importer.importFiles([file("donnees.bin", new Uint8Array([1, 2, 3, 4]))], null);
    expect(r2.failed).toEqual(["donnees.bin"]);
    expect(s.t.cmds).toEqual([]);
    expect(s.messages()).toEqual([`cube.mtl : ${COMPANION_ALONE_MESSAGE}`, `donnees.bin : ${COMPANION_ALONE_MESSAGE}`]);
    expect(COMPANION_ALONE_MESSAGE).toBe("fichier lié d'un modèle 3D : déposez-le avec son modèle");
  });

  it("sans deps.model3d : .glb, .mtl et .zip refusés comme avant (X39)", async () => {
    const t = fakeTarget();
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => t.target })
      .importFiles([file("cube.glb", cubeGlb()), file("cube.mtl", cubeMtl()), file("a.zip", zipOf({ "a.glb": cubeGlb() }))], null);
    expect(r).toEqual({ opened: [], inserted: [], refused: ["cube.glb", "cube.mtl", "a.zip"], failed: [] });
    expect(notify.mock.calls.map((c) => c[0])).toEqual([`cube.glb, cube.mtl, a.zip : ${LATER_FORMAT_MESSAGE}`]);
    expect(t.cmds).toEqual([]);
  });

  it("plus de 100 Mo : refusé avant lecture (X17)", async () => {
    const s = setup();
    const head = cubeGlb();
    const blob = vi.fn(async (): Promise<Blob> => {
      throw new Error("lu en entier");
    });
    const big: DroppedFile = { name: "big.glb", size: MODEL3D_MAX_BYTES + 1, mime: "", head: async (n: number) => head.slice(0, n), blob };
    const r = await s.importer.importFiles([big], null);
    expect(r.failed).toEqual(["big.glb"]);
    expect(blob).not.toHaveBeenCalled();
    expect(s.messages()).toEqual([`big.glb : ${MODEL3D_TOO_BIG_MESSAGE}`]);
  });

  it("X17, coque (constat Q2) : un .mtl cité de plus de 100 Mo n'est ni lu ni lié ; dit trop gros, le modèle inséré", async () => {
    const s = setup();
    const blob = vi.fn(async (): Promise<Blob> => {
      throw new Error("lu en entier");
    });
    const big: DroppedFile = { ...file("cube.mtl", cubeMtl()), size: MODEL3D_MAX_BYTES + 1, blob };
    const r = await s.importer.importFiles([file("cube.obj", cubeObj()), big], null);
    expect(blob).not.toHaveBeenCalled();
    expect(r).toEqual({ opened: [], inserted: ["cube.obj"], refused: [], failed: ["cube.mtl"] });
    expect(s.models()[0]!.files).toEqual([]);
    expect(s.messages()).toEqual([`cube.mtl : ${MODEL3D_TOO_BIG_MESSAGE}`]); // dit trop gros, pas aussi « sans son .mtl » (mineur C15)
  });

  it("mineur C15 : une texture déposée de plus de 100 Mo est dite trop grosse, pas aussi « fichiers liés absents »", async () => {
    const s = setup();
    const blob = vi.fn(async (): Promise<Blob> => {
      throw new Error("lu en entier");
    });
    const big: DroppedFile = { ...file("bleu.png", pngHead(8, 8)), size: MODEL3D_MAX_BYTES + 1, blob };
    const r = await s.importer.importFiles([file("cube.obj", cubeObj()), file("cube.mtl", cubeMtl("bleu.png")), big], null);
    expect(r).toEqual({ opened: [], inserted: ["cube.obj"], refused: [], failed: ["bleu.png"] });
    expect(s.messages()).toEqual([`bleu.png : ${MODEL3D_TOO_BIG_MESSAGE}`]);
  });

  it("mineur C15 : ZIP, une texture de plus de 100 Mo est dite trop grosse, pas aussi « fichiers liés absents »", async () => {
    const s = setup();
    const read = vi.fn(() => {
      throw new Error("lu en entier");
    });
    const huge = { size: MODEL3D_MAX_BYTES + 1, type: "", slice: read, arrayBuffer: read, text: read, stream: read } as unknown as Blob;
    const blobOf = (x: Uint8Array | string): Blob => new Blob([(typeof x === "string" ? enc(x) : x) as Uint8Array<ArrayBuffer>]);
    s.model3d.readZip = vi.fn(async () => [
      { path: "cube.obj", blob: blobOf(cubeObj()) },
      { path: "cube.mtl", blob: blobOf(cubeMtl("tex/bleu.png")) },
      { path: "tex/bleu.png", blob: huge },
    ]);
    const r = await s.importer.importFiles([file("a.zip", zipOf({ "x.txt": "x" }))], null);
    expect(r.inserted).toEqual(["a.zip"]);
    expect(s.messages()).toEqual([`tex/bleu.png (a.zip) : ${MODEL3D_TOO_BIG_MESSAGE}`]);
  });

  it("X17, ZIP compris (constat Q3) : une entrée de plus de 100 Mo n'est jamais lue ni rangée ; dite trop grosse", async () => {
    const s = setup();
    const read = vi.fn(() => {
      throw new Error("lu en entier");
    });
    const huge = { size: MODEL3D_MAX_BYTES + 1, type: "", slice: read, arrayBuffer: read, text: read, stream: read } as unknown as Blob;
    const blobOf = (x: Uint8Array | string): Blob => new Blob([(typeof x === "string" ? enc(x) : x) as Uint8Array<ArrayBuffer>]);
    s.model3d.readZip = vi.fn(async () => [
      { path: "big.glb", blob: huge },
      { path: "cube.obj", blob: blobOf(cubeObj()) },
      { path: "cube.mtl", blob: blobOf(cubeMtl()) },
    ]);
    const r = await s.importer.importFiles([file("a.zip", zipOf({ "x.txt": "x" }))], null);
    expect(read).not.toHaveBeenCalled();
    expect(r).toEqual({ opened: [], inserted: ["a.zip"], refused: [], failed: [] });
    expect(s.models().map((m) => [m.asset.name, m.files.map((f) => f.path)])).toEqual([["cube.obj", ["cube.mtl"]]]);
    expect(s.messages()).toEqual([`big.glb (a.zip) : ${MODEL3D_TOO_BIG_MESSAGE}`]);
  });

  it("mineur C15 (relecture) : ZIP à deux modèles, le .mtl trop gros de l'un ne tait pas le .mtl absent de l'autre", async () => {
    const s = setup();
    const read = vi.fn(() => {
      throw new Error("lu en entier");
    });
    const huge = { size: MODEL3D_MAX_BYTES + 1, type: "", slice: read, arrayBuffer: read, text: read, stream: read } as unknown as Blob;
    const blobOf = (x: Uint8Array | string): Blob => new Blob([(typeof x === "string" ? enc(x) : x) as Uint8Array<ArrayBuffer>]);
    s.model3d.readZip = vi.fn(async () => [
      { path: "a.obj", blob: blobOf(cubeObj("a.mtl")) },
      { path: "a.mtl", blob: huge },
      { path: "b.obj", blob: blobOf(cubeObj("b.mtl")) },
    ]);
    const r = await s.importer.importFiles([file("x.zip", zipOf({ "x.txt": "x" }))], null);
    expect(r.inserted).toEqual(["x.zip"]);
    expect(s.messages()).toEqual([`a.mtl (x.zip) : ${MODEL3D_TOO_BIG_MESSAGE}`, `b.obj : ${MTL_MISSING_MESSAGE}`]);
  });

  it("image déposée avec un modèle qui la cite : pas d'AddImage ; non citée : AddImage (effet de bord, HX2-6)", async () => {
    const s = setup();
    const r = await s.importer.importFiles(
      [file("cube.obj", cubeObj()), file("cube.mtl", cubeMtl("bleu.png")), file("bleu.png", pngHead(8, 8)), file("photo.png", pngHead(10, 10))],
      null,
    );
    expect(r).toEqual({ opened: [], inserted: ["cube.obj", "photo.png"], refused: [], failed: [] });
    expect(s.t.cmds.map((c) => c.type)).toEqual(["AddModel3d", "AddImage"]);
    expect((s.t.cmds[1] as AddImage).asset.name).toBe("photo.png");
    const cmd = s.models()[0]!;
    expect(cmd.files.map((f) => [f.path, f.asset.mime])).toEqual([["cube.mtl", "model/mtl"], ["bleu.png", "image/png"]]);
    expect(s.loads[0]!.files.get("bleu.png")?.type).toBe("image/png");
    expect(s.notify).not.toHaveBeenCalled();
  });
});
