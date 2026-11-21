/**
 * Rendu 3D partagé (C15, X4, X22, X26, X27, DAX3, DAX4) : un seul `WebGLRenderer` pour toute l'application, sur un canvas
 * hors DOM ; un seul modèle dans la scène à la fois ; garde des URL : seules les `blob:` des fichiers du modèle passent,
 * `data:` devient `blob:`, tout le reste est une `blob:` vide comptée « fichier lié absent ». Seul fichier qui importe
 * three (GC17), chargé par `import()` au premier besoin (X20).
 */
import {
  Box3,
  BufferGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sphere,
  WebGLRenderer,
  type Material,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import type { ModelCamera } from "../engine/render/model-frames";
import {
  COMPRESSED_MESSAGE,
  baseName,
  glbJsonText,
  gltfCompression,
  normalizePath,
} from "./model3d-import";
import type { LoadedModel, ModelSource, ModelView, PixelSize } from "./model-view";

export const FIELD_OF_VIEW = 35;
export const MESH_GREY = "#b8bec6";
/** Attente des textures d'un OBJ + MTL (chargées après `parse`). */
const TEXTURE_WAIT_MS = 15_000;
/** Schéma (`http:`, `file:`…) ou `//hôte` : jamais ouvert (même règle que `resolveReference`, T3). */
const REMOTE = /^(?:[a-z][a-z0-9+.-]+:|\/\/)/i;
const DRACO = "KHR_draco_mesh_compression";

export interface UrlPort {
  create(b: Blob): string;
  revoke(u: string): void;
}
export interface RendererLike {
  setSize(w: number, h: number, style: boolean): void;
  setPixelRatio(r: number): void;
  setClearColor(c: number, a: number): void;
  render(scene: Scene, camera: PerspectiveCamera): void;
  dispose(): void;
}
export interface ThreeViewDeps {
  /** Canvas du rendu ; défaut : `document.createElement("canvas")`, jamais posé dans le DOM. */
  readonly createCanvas?: () => HTMLCanvasElement;
  /** Rendu (tests : un faux) ; défaut : `WebGLRenderer` ; une exception = pas de WebGL (X26). */
  readonly createRenderer?: (canvas: HTMLCanvasElement) => RendererLike;
  readonly urls?: UrlPort;
}

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Contenu d'une URL `data:` (base64 ou texte) ; null si mal formée. */
export function dataUrlBlob(url: string): Blob | null {
  const m = /^data:([^,]*),(.*)$/is.exec(url);
  if (m === null) return null;
  const meta = m[1] ?? "";
  const base64 = /;base64$/i.test(meta);
  const type = (base64 ? meta.slice(0, -7) : meta).split(";")[0] || "application/octet-stream";
  try {
    if (!base64) return new Blob([decodeURIComponent(m[2] ?? "")], { type });
    const bin = atob(m[2] ?? "");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new Blob([out], { type });
  } catch {
    return null;
  }
}

/** X27, DAX4 : URL demandée par three → URL sûre. `blob:` inchangée ; `data:` → `blob:` neuve ; distante → vide et
 *  absente ; connue (chemin normalisé, puis nom de base unique, URI décodée) → sa `blob:` ; inconnue → vide et absente.
 *  « Vide » : `empty`, image comprise (GLTFLoader rend alors une texture nulle, voir `load`). */
export function guardUrl(
  url: string,
  known: ReadonlyMap<string, string>,
  missing: string[],
  toBlobUrl: (b: Blob) => string,
  empty: string,
): string {
  if (url.startsWith("blob:")) return url;
  if (/^data:/i.test(url)) {
    const b = dataUrlBlob(url);
    return b === null ? empty : toBlobUrl(b);
  }
  const decoded = safeDecode(url);
  if (!REMOTE.test(url)) {
    const direct = known.get(normalizePath(decoded)) ?? known.get(normalizePath(url));
    if (direct !== undefined) return direct;
    const b = baseName(decoded).toLowerCase();
    const hits = [...known.keys()].filter((k) => baseName(k).toLowerCase() === b);
    if (b !== "" && hits.length === 1) return known.get(hits[0]!)!;
  }
  if (!missing.includes(decoded)) missing.push(decoded);
  return empty;
}

/** X4 : caméra sur la sphère englobante (centre à l'origine), à la distance qui la fait tenir dans le champ. */
export function orbitPose(
  v: ModelCamera,
  radius: number,
  aspect: number,
  fovDeg = FIELD_OF_VIEW,
): { x: number; y: number; z: number; near: number; far: number } {
  const half = (fovDeg * Math.PI) / 360;
  const fit = aspect >= 1 ? half : Math.atan(Math.tan(half) * aspect);
  const d = radius / Math.sin(fit);
  return {
    x: d * Math.cos(v.pitch) * Math.sin(v.yaw),
    y: d * Math.sin(v.pitch),
    z: d * Math.cos(v.pitch) * Math.cos(v.yaw),
    near: Math.max(d - radius * 1.5, d * 0.01),
    far: d + radius * 1.5,
  };
}

interface Internal {
  readonly pivot: Group;
  readonly radius: number;
  readonly urls: string[];
}

const grey = (vertexColors: boolean): MeshStandardMaterial =>
  new MeshStandardMaterial({ color: vertexColors ? 0xffffff : MESH_GREY, vertexColors });

function disposeTree(root: Object3D): void {
  root.traverse((o) => {
    const mesh = o as Partial<Mesh>;
    mesh.geometry?.dispose();
    const mats = mesh.material === undefined ? [] : Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats as Material[]) {
      for (const value of Object.values(m)) {
        if (value !== null && typeof value === "object" && "isTexture" in value) (value as { dispose(): void }).dispose();
      }
      m.dispose();
    }
  });
}

/** Attente des chargements lancés par le gestionnaire après `parse` (textures d'un MTL). */
function settled(manager: LoadingManager): { started(): boolean; done: Promise<void> } {
  let begun = false;
  let finish: () => void = () => undefined;
  const done = new Promise<void>((r) => {
    finish = r;
  });
  manager.onStart = () => {
    begun = true;
  };
  manager.onLoad = () => finish();
  return { started: () => begun, done };
}

const record = (x: unknown): Record<string, unknown> | null =>
  x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** JSON sans Draco s'il n'est qu'« utilisé » (les primitives gardent leurs attributs non compressés) ; null si rien à
 *  retirer. Sans cela, three exige un `DRACOLoader` dès que l'extension figure dans `extensionsUsed`. */
function withoutOptionalDraco(text: string): string | null {
  let json: Record<string, unknown> | null;
  try {
    json = record(JSON.parse(text));
  } catch {
    return null;
  }
  const used = json?.extensionsUsed;
  if (json === null || !Array.isArray(used) || !used.includes(DRACO)) return null;
  json.extensionsUsed = used.filter((e) => e !== DRACO);
  for (const mesh of list(json.meshes)) {
    for (const p of list(record(mesh)?.primitives)) {
      const ext = record(record(p)?.extensions);
      if (ext !== null) delete ext[DRACO];
    }
  }
  return JSON.stringify(json);
}

/** GLB dont le bloc JSON est remplacé par `json` (bourré d'espaces), les blocs suivants gardés tels quels. */
function withJsonChunk(glb: ArrayBuffer, json: string): ArrayBuffer {
  const bytes = new Uint8Array(glb);
  const v = new DataView(glb);
  const end = Math.min(v.getUint32(8, true), bytes.length);
  const rest = bytes.subarray(20 + v.getUint32(12, true), end);
  const text = new TextEncoder().encode(json);
  const jl = (text.length + 3) & ~3;
  const out = new Uint8Array(20 + jl + rest.length);
  out.set(bytes.subarray(0, 8));
  const o = new DataView(out.buffer);
  o.setUint32(8, out.length, true);
  o.setUint32(12, jl, true);
  o.setUint32(16, 0x4e4f534a, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + jl);
  out.set(rest, 20 + jl);
  return out.buffer;
}

/** X18 : compression exigée (Draco, meshopt, KTX2) → refus avec le message ; Draco seulement utilisé → retiré. */
function prepareGltf(format: "glb" | "gltf", buf: ArrayBuffer): string | ArrayBuffer {
  const text = format === "gltf" ? new TextDecoder().decode(buf) : glbJsonText(new Uint8Array(buf));
  if (text === null) return buf; // GLB mal formé : three le refuse
  if (gltfCompression(text) !== null) throw new Error(COMPRESSED_MESSAGE);
  const lean = withoutOptionalDraco(text);
  if (format === "gltf") return lean ?? text;
  return lean === null ? buf : withJsonChunk(buf, lean);
}

async function parse(src: ModelSource, manager: LoadingManager): Promise<Object3D> {
  const buf = await src.main.arrayBuffer();
  if (src.format === "glb" || src.format === "gltf") {
    const data = prepareGltf(src.format, buf);
    return (await new GLTFLoader(manager).parseAsync(data, "")).scene; // animations ignorées (X22)
  }
  if (src.format === "obj") {
    const obj = new OBJLoader(manager);
    const mtl = [...src.files.entries()].find(([p]) => p.toLowerCase().endsWith(".mtl"));
    if (mtl !== undefined) {
      const creator = new MTLLoader(manager).parse(await mtl[1].text(), "");
      creator.preload();
      obj.setMaterials(creator);
    }
    const group = obj.parse(new TextDecoder().decode(buf));
    if (mtl === undefined) {
      group.traverse((o) => {
        if (o instanceof Mesh) o.material = grey(false);
      });
    }
    return group;
  }
  const geometry: BufferGeometry = src.format === "stl" ? new STLLoader(manager).parse(buf) : new PLYLoader(manager).parse(buf);
  const colors = geometry.hasAttribute("color");
  let object: Object3D;
  if (src.format === "ply" && geometry.index === null) {
    object = new Points(
      geometry,
      new PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: colors, color: colors ? 0xffffff : MESH_GREY }),
    );
  } else {
    if (src.format === "stl" || !geometry.hasAttribute("normal")) geometry.computeVertexNormals();
    object = new Mesh(geometry, grey(colors));
  }
  object.rotation.x = -Math.PI / 2; // HX1-7 : Z en haut → Y en haut
  const g = new Group();
  g.add(object);
  return g;
}

export function createThreeModelView(deps: ThreeViewDeps = {}): ModelView {
  const urls: UrlPort = deps.urls ?? { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) };
  const canvas = (deps.createCanvas ?? (() => document.createElement("canvas")))();
  const make =
    deps.createRenderer ??
    ((c: HTMLCanvasElement) => new WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }));
  let renderer: RendererLike | null = null;
  try {
    renderer = make(canvas);
    renderer.setClearColor(0x000000, 0);
  } catch {
    renderer = null; // X26 : aucune exception ne sort, l'instantané reste
  }
  let alive = renderer !== null;
  const lost = new Set<() => void>();
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (!alive) return;
    alive = false;
    for (const cb of [...lost]) cb();
  });
  // three restaure lui-même son état sur le contexte rendu ; la vue redevient disponible (une nouvelle perte est redite).
  canvas.addEventListener("webglcontextrestored", () => {
    alive = renderer !== null;
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 4 / 3, 0.01, 1000);
  scene.add(new HemisphereLight(0xffffff, 0x444444, 1.2));
  const key = new DirectionalLight(0xffffff, 1.5);
  key.position.set(1, 1, 2);
  camera.add(key); // X22 : lumière liée à la caméra
  scene.add(camera);
  const models = new WeakMap<LoadedModel, Internal>();
  let shown: Internal | null = null;

  const draw = (m: LoadedModel, v: ModelCamera, px: PixelSize): HTMLCanvasElement | null => {
    const it = models.get(m);
    if (renderer === null || !alive || it === undefined) return null;
    if (shown !== it) {
      if (shown !== null) scene.remove(shown.pivot);
      scene.add(it.pivot);
      shown = it;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(px.w, px.h, false);
    const pose = orbitPose(v, it.radius, px.w / px.h);
    camera.aspect = px.w / px.h;
    camera.near = pose.near;
    camera.far = pose.far;
    camera.position.set(pose.x, pose.y, pose.z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    return canvas;
  };

  return {
    available: () => renderer !== null && alive,
    async load(src) {
      const own: string[] = [];
      const mk = (b: Blob): string => {
        const u = urls.create(b);
        own.push(u);
        return u;
      };
      const known = new Map<string, string>();
      for (const [p, b] of src.files) known.set(normalizePath(p), mk(b));
      const empty = mk(new Blob([]));
      const missing: string[] = [];
      const manager = new LoadingManager();
      // Image absente : `blob:` vide aussi. GLTFLoader 0.187 rend alors une texture nulle (`loadTextureImage` rattrape
      // l'erreur) et le matériau garde sa couleur de base ; un PNG transparent de remplacement la noircirait.
      manager.setURLModifier((u) => guardUrl(u, known, missing, mk, empty));
      const wait = settled(manager);
      try {
        const root = await parse(src, manager);
        if (wait.started()) {
          let timer: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([
            wait.done,
            new Promise<void>((r) => {
              timer = setTimeout(r, TEXTURE_WAIT_MS);
            }),
          ]);
          clearTimeout(timer);
        }
        const sphere = new Box3().setFromObject(root).getBoundingSphere(new Sphere());
        if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error("modèle 3D vide");
        root.position.sub(sphere.center);
        const pivot = new Group();
        pivot.add(root);
        const m: LoadedModel = { missing };
        models.set(m, { pivot, radius: sphere.radius, urls: own });
        return m;
      } catch (e) {
        for (const u of own) urls.revoke(u);
        throw e instanceof Error ? e : new Error(String(e));
      }
    },
    draw,
    snapshot(m, v, px) {
      const c = draw(m, v, px);
      if (c === null) return Promise.resolve(null);
      return new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), "image/png"));
    },
    release(m) {
      const it = models.get(m);
      if (it === undefined) return;
      models.delete(m);
      if (shown === it) {
        scene.remove(it.pivot);
        shown = null;
      }
      disposeTree(it.pivot);
      for (const u of it.urls) urls.revoke(u);
    },
    onLost(cb) {
      lost.add(cb);
      return () => {
        lost.delete(cb);
      };
    },
  };
}
