import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CAMERA } from "../engine/render/model-frames";
import { COMPRESSED_MESSAGE } from "./model3d-import";
import { cubeGlb, cubeMtl, cubeObj, gltfWithBin, plyAscii, stlBinary } from "./model3d-fixtures";
import {
  createThreeModelView,
  dataUrlBlob,
  guardUrl,
  orbitPose,
  type RendererLike,
} from "./model-view-three";
import * as viewThree from "./model-view-three";

/** Canvas factice : écouteurs, `toBlob` en PNG d'un octet, aucun contexte. */
function fakeCanvas() {
  const listeners = new Map<string, (e: { preventDefault(): void }) => void>();
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => null,
    addEventListener: (t: string, cb: (e: { preventDefault(): void }) => void) => listeners.set(t, cb),
    removeEventListener: () => undefined,
    toBlob: (cb: (b: Blob | null) => void, type: string) => cb(new Blob([new Uint8Array([1])], { type })),
  } as unknown as HTMLCanvasElement;
  return { canvas, fire: (t: string) => listeners.get(t)?.({ preventDefault: () => undefined }) };
}

type RenderedScene = Parameters<RendererLike["render"]>[0];
/** Objets de premier niveau de la scène qui portent une géométrie (un modèle). */
const modelsIn = (scene: RenderedScene): number =>
  scene.children.filter((c) => {
    let has = false;
    c.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh === true || (o as { isPoints?: boolean }).isPoints === true) has = true;
    });
    return has;
  }).length;

function fakeRenderer(): RendererLike & { sizes: Array<[number, number]>; renders: number; models: number[] } {
  const r = {
    sizes: [] as Array<[number, number]>,
    renders: 0,
    models: [] as number[],
    setSize: (w: number, h: number) => {
      r.sizes.push([w, h]);
    },
    setPixelRatio: () => undefined,
    setClearColor: () => undefined,
    render: (scene: RenderedScene) => {
      r.renders++;
      r.models.push(modelsIn(scene));
    },
    dispose: () => undefined,
  };
  return r;
}
/** Port d'URL factice ; `live` garde le contenu de chaque `blob:` vivante (le réseau factice le sert). */
function fakeUrls() {
  let n = 0;
  const live = new Map<string, Blob>();
  return {
    live,
    port: {
      create: (b: Blob) => {
        const u = `blob:essai/${++n}`;
        live.set(u, b);
        return u;
      },
      revoke: (u: string) => {
        live.delete(u);
      },
    },
  };
}
type Part = string | Uint8Array;
/** `slice()` : copie sur un `ArrayBuffer` (un `BlobPart`), quel que soit le tampon des fixtures. */
const part = (p: Part): BlobPart => (typeof p === "string" ? p : p.slice());
const src = (format: "glb" | "gltf" | "obj" | "stl" | "ply", main: Part, files: Array<[string, Part]> = []) => ({
  format,
  name: `m.${format}`,
  main: new Blob([part(main)]),
  files: new Map(files.map(([p, b]) => [p, new Blob([part(b)])])),
});

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
/** PNG fait main (signature, IHDR 1×1) : le décodeur factice ne lit que la signature. */
const pngBytes = (): Uint8Array =>
  new Uint8Array([...PNG_SIGNATURE, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0, 0, 0, 0]);
/** Décodeur factice : comme le navigateur, refuse ce qui n'est pas une image (une `blob:` vide, un `.bin`). */
async function decodable(b: Blob | undefined): Promise<boolean> {
  if (b === undefined) return false;
  const h = new Uint8Array(await b.arrayBuffer());
  return PNG_SIGNATURE.every((x, i) => h[i] === x);
}

/** Réseau factice : `fetch`, `<img>` et `createImageBitmap` ne servent que les `blob:` vivantes du port ; chaque URL
 *  demandée est notée. `bitmap` : chemin `ImageBitmapLoader` de GLTFLoader (navigateurs récents) ; sinon `<img>`
 *  (`TextureLoader`, Safari < 17, et toujours pour un MTL). */
function fakeNetwork(live: ReadonlyMap<string, Blob>, bitmap: boolean): string[] {
  const seen: string[] = [];
  // Globaux du navigateur absents de Node : `self.URL` (GLTFLoader, images d'un bufferView), `ProgressEvent` (FileLoader).
  vi.stubGlobal("self", globalThis);
  vi.stubGlobal(
    "ProgressEvent",
    class extends Event {
      constructor(type: string, init: { lengthComputable?: boolean; loaded?: number; total?: number } = {}) {
        super(type);
        Object.assign(this, init);
      }
    },
  );
  const serve = (u: string): Blob | undefined => {
    seen.push(u);
    return u.startsWith("blob:") ? live.get(u) : undefined;
  };
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const u = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const b = serve(u);
    if (b === undefined) throw new TypeError(`réseau refusé : ${u}`);
    return new Response(b);
  });
  vi.stubGlobal("document", {
    createElementNS: () => {
      const on = new Map<string, (this: unknown, e: unknown) => void>();
      const img = {
        width: 1,
        height: 1,
        addEventListener: (t: string, cb: (this: unknown, e: unknown) => void) => on.set(t, cb),
        removeEventListener: (t: string) => on.delete(t),
        set src(u: string) {
          void decodable(serve(u)).then((ok) => on.get(ok ? "load" : "error")?.call(img, {}));
        },
      };
      return img;
    },
  });
  if (bitmap) {
    vi.stubGlobal("createImageBitmap", async (b: Blob) => {
      if (!(await decodable(b))) throw new Error("image illisible");
      return { width: 1, height: 1, close: () => undefined };
    });
  }
  return seen;
}

const triangleBytes = (): Uint8Array => new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
const dataUri = (b: Uint8Array): string => `data:application/octet-stream;base64,${btoa(String.fromCharCode(...b))}`;
/** glTF fait main : un triangle ; tampon en `data:` (`uri`) ou bloc BIN d'un GLB (sans `uri`). */
function triangleGltf(top: Record<string, unknown> = {}, primitive: Record<string, unknown> = {}, uri?: string) {
  return {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, ...primitive }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
    bufferViews: [{ buffer: 0, byteLength: 36 }],
    buffers: [uri === undefined ? { byteLength: 36 } : { byteLength: 36, uri }],
    ...top,
  };
}
/** Triangle texturé : une texture par image citée (couleur, puis émission). */
function texturedGltf(images: readonly string[]) {
  return triangleGltf(
    {
      materials: [
        {
          pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
          ...(images.length > 1 ? { emissiveTexture: { index: 1 } } : {}),
        },
      ],
      textures: images.map((_, i) => ({ source: i })),
      images: images.map((uri) => ({ uri })),
    },
    { material: 0 },
    dataUri(triangleBytes()),
  );
}
/** GLB fait main : en-tête, bloc JSON (bourré d'espaces), bloc BIN (bourré de zéros). */
function packGlb(json: object, bin: Uint8Array): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jl = (text.length + 3) & ~3;
  const bl = (bin.length + 3) & ~3;
  const out = new Uint8Array(28 + jl + bl);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, out.length, true);
  v.setUint32(12, jl, true);
  v.setUint32(16, 0x4e4f534a, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + jl);
  v.setUint32(20 + jl, bl, true);
  v.setUint32(24 + jl, 0x004e4942, true);
  out.set(bin, 28 + jl);
  return out;
}
const view = (urls: ReturnType<typeof fakeUrls>) =>
  createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => fakeRenderer(), urls: urls.port });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rendu three (C15, X22, X27)", () => {
  it("guardUrl : blob: inchangée ; data: → blob: neuve", () => {
    const made: Blob[] = [];
    const to = (b: Blob) => {
      made.push(b);
      return "blob:neuf";
    };
    expect(guardUrl("blob:x/1", new Map(), [], to, "blob:vide")).toBe("blob:x/1");
    expect(guardUrl("data:image/png;base64,AAEC", new Map(), [], to, "blob:vide")).toBe("blob:neuf");
    expect([made[0]!.size, made[0]!.type]).toEqual([3, "image/png"]);
  });
  it("URL distante : blob vide, comptée absente (DAX4)", () => {
    const missing: string[] = [];
    const known = new Map([["tex/a.png", "blob:a"]]);
    for (const u of ["https://cdn.test/a.png", "//cdn.test/a.png", "http://127.0.0.1/a.png", "/abs/inconnu.png"]) {
      expect(guardUrl(u, known, missing, () => "blob:neuf", "blob:vide")).toBe("blob:vide");
    }
    expect(missing).toEqual(["https://cdn.test/a.png", "//cdn.test/a.png", "http://127.0.0.1/a.png", "/abs/inconnu.png"]);
  });
  it("guardUrl : chemin normalisé, URI décodée, puis nom de base unique", () => {
    const known = new Map([["tex/a b.png", "blob:a"], ["cube.bin", "blob:b"]]);
    const g = (u: string) => guardUrl(u, known, [], () => "blob:neuf", "blob:vide");
    expect([g("./tex/a%20b.png"), g("tex\\a b.png"), g("../../ailleurs/CUBE.BIN"), g("autre.png")]).toEqual([
      "blob:a",
      "blob:a",
      "blob:b",
      "blob:vide",
    ]);
  });
  it("guardUrl : absente ou distante → blob vide, image comprise (constat Q5 : ni PNG de remplacement ni `emptyImage`)", () => {
    const missing: string[] = [];
    const g = (u: string) => guardUrl(u, new Map(), missing, () => "blob:neuf", "blob:vide");
    expect([
      g("https://cdn.test/a.PNG?v=2"),
      g("tex/b.jpg"),
      g("//cdn.test/c.webp"),
      g("cube.bin"),
      g("https://cdn.test/d.bin"),
      g("notes.txt"),
    ]).toEqual(["blob:vide", "blob:vide", "blob:vide", "blob:vide", "blob:vide", "blob:vide"]);
    expect(missing).toHaveLength(6);
    // L'ancien sixième argument (`emptyImage`) n'a plus d'effet ; `placeholderPng` n'est plus exporté.
    const loose = guardUrl as unknown as (...a: unknown[]) => string;
    expect(loose("tex/b.jpg", new Map(), [], () => "blob:neuf", "blob:vide", "blob:png")).toBe("blob:vide");
    expect(Object.keys(viewThree)).not.toContain("placeholderPng");
  });
  it("dataUrlBlob : base64 et texte ; mal formée : null", async () => {
    expect(await dataUrlBlob("data:text/plain,a%20b")!.text()).toBe("a b");
    expect(dataUrlBlob("data:;base64,AAEC")!.size).toBe(3);
    expect(dataUrlBlob("data:sans-virgule")).toBeNull();
    expect(dataUrlBlob("data:;base64,@@@")).toBeNull();
  });
  it("orbitPose : distance ajustée au champ de 35°, vue par défaut devant, à droite et au-dessus", () => {
    const p = orbitPose(DEFAULT_CAMERA, 1, 4 / 3);
    const d = 1 / Math.sin((35 * Math.PI) / 360);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(d, 9);
    expect([p.x > 0, p.y > 0, p.z > 0, p.near > 0, p.far > d]).toEqual([true, true, true, true, true]);
    const tall = orbitPose(DEFAULT_CAMERA, 1, 0.5);
    expect(Math.hypot(tall.x, tall.y, tall.z)).toBeGreaterThan(d);
  });
  it("sans WebGL : GLB lu (validation), available faux, draw et snapshot null (X26)", async () => {
    const { canvas } = fakeCanvas();
    const v = createThreeModelView({
      createCanvas: () => canvas,
      createRenderer: () => {
        throw new Error("pas de WebGL");
      },
      urls: fakeUrls().port,
    });
    const m = await v.load(src("glb", cubeGlb()));
    expect([v.available(), m.missing, v.draw(m, DEFAULT_CAMERA, { w: 64, h: 48 }), await v.snapshot(m, DEFAULT_CAMERA, { w: 64, h: 48 })]).toEqual([
      false,
      [],
      null,
      null,
    ]);
  });
  it("OBJ + MTL (couleur), OBJ seul (gris), STL binaire, PLY ASCII : lus (S3)", async () => {
    const v = createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => fakeRenderer(), urls: fakeUrls().port });
    for (const s of [src("obj", cubeObj(), [["cube.mtl", cubeMtl()]]), src("obj", cubeObj(null)), src("stl", stlBinary()), src("ply", plyAscii())]) {
      const m = await v.load(s);
      expect(m.missing).toEqual([]);
      expect(v.draw(m, DEFAULT_CAMERA, { w: 32, h: 24 })).not.toBeNull();
      v.release(m);
    }
  });
  it("glTF dont le .bin manque : rejeté, toutes les URL créées révoquées", async () => {
    const urls = fakeUrls();
    const v = createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => fakeRenderer(), urls: urls.port });
    await expect(v.load(src("gltf", gltfWithBin().gltf))).rejects.toThrow();
    expect(urls.live.size).toBe(0);
  });
  it("draw : rendu à la taille demandée, une scène ; snapshot : PNG par toBlob (X5)", async () => {
    const r = fakeRenderer();
    const { canvas } = fakeCanvas();
    const v = createThreeModelView({ createCanvas: () => canvas, createRenderer: () => r, urls: fakeUrls().port });
    const m = await v.load(src("glb", cubeGlb()));
    expect(v.draw(m, DEFAULT_CAMERA, { w: 1024, h: 768 })).toBe(canvas);
    expect([r.sizes.at(-1), r.renders]).toEqual([[1024, 768], 1]);
    expect((await v.snapshot(m, DEFAULT_CAMERA, { w: 1024, h: 768 }))!.type).toBe("image/png");
  });
  it("un seul rendu pour l'application : deux modèles, un renderer, un canvas, un seul modèle dans la scène à la fois", async () => {
    const r = fakeRenderer();
    let made = 0;
    const v = createThreeModelView({
      createCanvas: () => fakeCanvas().canvas,
      createRenderer: () => {
        made++;
        return r;
      },
      urls: fakeUrls().port,
    });
    const a = await v.load(src("glb", cubeGlb()));
    const b = await v.load(src("stl", stlBinary()));
    const px = { w: 16, h: 16 };
    const ca = v.draw(a, DEFAULT_CAMERA, px);
    const cb = v.draw(b, DEFAULT_CAMERA, px);
    v.draw(a, DEFAULT_CAMERA, px);
    expect([made, ca !== null && ca === cb, r.models]).toEqual([1, true, [1, 1, 1]]);
  });
  it("aucune URL autre que blob: n'atteint fetch ni une image : glTF (data:, connue, distante) et OBJ + MTL (X27)", async () => {
    const urls = fakeUrls();
    const seen = fakeNetwork(urls.live, true);
    const v = view(urls);
    const g = await v.load(src("gltf", JSON.stringify(texturedGltf(["tex/a.png", "https://cdn.test/b.png"])), [["tex/a.png", pngBytes()]]));
    const obj = "mtllib m.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nusemtl mat\nf 1/1 2/2 3/3\n";
    const mtl = "newmtl mat\nKd 1 0 0\nmap_Kd tex/k.png\nmap_Ks https://cdn.test/s.png\n";
    const o = await v.load(src("obj", obj, [["m.mtl", mtl], ["tex/k.png", pngBytes()]]));
    expect([g.missing, o.missing]).toEqual([["https://cdn.test/b.png"], ["https://cdn.test/s.png"]]);
    expect(seen.length).toBeGreaterThanOrEqual(5);
    expect(seen.filter((u) => !u.startsWith("blob:"))).toEqual([]);
  });
  it("glTF qui cite une image distante : lu, missing = [url] (texture nulle, deux chemins d'image)", async () => {
    for (const bitmap of [true, false]) {
      const urls = fakeUrls();
      fakeNetwork(urls.live, bitmap);
      const maps: unknown[] = [];
      const r = fakeRenderer();
      r.render = (scene) =>
        scene.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh === true) maps.push((o as unknown as { material: { map: unknown } }).material.map);
        });
      const v = createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => r, urls: urls.port });
      const m = await v.load(src("gltf", JSON.stringify(texturedGltf(["https://cdn.test/a.png"]))));
      v.draw(m, DEFAULT_CAMERA, { w: 8, h: 8 });
      // Texture nulle : le matériau garde sa couleur de base (une image de remplacement noire le noircirait).
      expect([bitmap, m.missing, maps]).toEqual([bitmap, ["https://cdn.test/a.png"], [null]]);
      vi.unstubAllGlobals();
    }
  });
  it("Draco utilisé sans être exigé (glTF et GLB) : lu sans DRACOLoader, géométrie non compressée", async () => {
    const urls = fakeUrls();
    fakeNetwork(urls.live, true);
    const v = view(urls);
    const top = { extensionsUsed: ["KHR_draco_mesh_compression"] };
    const prim = { extensions: { KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: 0 } } } };
    const gltf = JSON.stringify(triangleGltf(top, prim, dataUri(triangleBytes())));
    const glb = packGlb(triangleGltf(top, prim), triangleBytes());
    for (const s of [src("gltf", gltf), src("glb", glb)]) {
      const m = await v.load(s);
      expect([m.missing, v.draw(m, DEFAULT_CAMERA, { w: 8, h: 8 }) !== null]).toEqual([[], true]);
    }
  });
  it("Draco ou KTX2 exigé (glTF et GLB) : refusé avec le message de compression, URL révoquées (X18)", async () => {
    const urls = fakeUrls();
    fakeNetwork(urls.live, true);
    const v = view(urls);
    for (const ext of ["KHR_draco_mesh_compression", "KHR_texture_basisu"]) {
      const top = { extensionsUsed: [ext], extensionsRequired: [ext] };
      await expect(v.load(src("gltf", JSON.stringify(triangleGltf(top, {}, dataUri(triangleBytes())))))).rejects.toThrow(COMPRESSED_MESSAGE);
      await expect(v.load(src("glb", packGlb(triangleGltf(top), triangleBytes())))).rejects.toThrow(COMPRESSED_MESSAGE);
    }
    expect(urls.live.size).toBe(0);
  });
  it("webglcontextlost : available() faux, onLost appelé une fois, draw null", async () => {
    const { canvas, fire } = fakeCanvas();
    const v = createThreeModelView({ createCanvas: () => canvas, createRenderer: () => fakeRenderer(), urls: fakeUrls().port });
    const m = await v.load(src("glb", cubeGlb()));
    const cb = vi.fn();
    v.onLost(cb);
    fire("webglcontextlost");
    fire("webglcontextlost");
    expect([v.available(), cb.mock.calls.length, v.draw(m, DEFAULT_CAMERA, { w: 8, h: 8 })]).toEqual([false, 1, null]);
  });
  it("webglcontextrestored (constat Q4) : available() vrai, draw rendu ; une nouvelle perte rappelle onLost", async () => {
    const { canvas, fire } = fakeCanvas();
    const v = createThreeModelView({ createCanvas: () => canvas, createRenderer: () => fakeRenderer(), urls: fakeUrls().port });
    const m = await v.load(src("glb", cubeGlb()));
    const cb = vi.fn();
    v.onLost(cb);
    fire("webglcontextlost");
    fire("webglcontextrestored");
    expect([v.available(), v.draw(m, DEFAULT_CAMERA, { w: 8, h: 8 }) !== null]).toEqual([true, true]);
    fire("webglcontextlost");
    expect([v.available(), cb.mock.calls.length]).toEqual([false, 2]);
  });
  it("release : URL révoquées, modèle oublié (draw null)", async () => {
    const urls = fakeUrls();
    const v = createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => fakeRenderer(), urls: urls.port });
    const m = await v.load(src("obj", cubeObj(), [["cube.mtl", cubeMtl()]]));
    expect(urls.live.size).toBeGreaterThan(0);
    v.release(m);
    expect([urls.live.size, v.draw(m, DEFAULT_CAMERA, { w: 8, h: 8 })]).toEqual([0, null]);
  });
});
