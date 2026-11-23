/**
 * Objets 3D, partie pure (C15, X11, X14, X15, X16, X18) : détection par octets puis extension, références d'un modèle
 * (OBJ → MTL → textures, glTF, GLB), résolution contre les fichiers d'un même dépôt ou d'un ZIP, regroupement, bornes et
 * messages. Aucun chargeur, aucun DOM, aucun import de la page : le Worker ZIP l'importe (PC9). Les gestionnaires du
 * registre vivent dans `model3d-handlers.ts` (T8).
 */

import type { Model3dFormat } from "../core/api";
import { safeArchivePath } from "./archive-path";

/** `Model3dFormat` d'`api.ts` (T2, PC1), réexporté pour les lecteurs de ce module. */
export type { Model3dFormat };

/** En-tête d'un GLB : « glTF » (X11). */
export const GLB_MAGIC: readonly number[] = Object.freeze([0x67, 0x6c, 0x54, 0x46]);
/** Plafond d'un fichier 3D (X17), ZIP compris, coque comprise. */
export const MODEL3D_MAX_BYTES = 100 * 1024 * 1024;
export const MODEL_EXTENSIONS = ["glb", "gltf", "obj", "stl", "ply"] as const;
export const COMPANION_EXTENSIONS = ["mtl", "bin", "png", "jpg", "jpeg", "webp", "gif", "bmp"] as const;
export const MODEL3D_MIME = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  obj: "model/obj",
  stl: "model/stl",
  ply: "model/x-ply",
  mtl: "model/mtl",
  bin: "application/octet-stream",
} as const;
/** Bornes d'un ZIP (X16, HX2-4). */
export const ZIP_MAX_ENTRIES = 1000;
export const ZIP_MAX_BYTES = 256 * 1024 * 1024;
export const ZIP_MAX_MODELS = 20;
/** Fichiers liés d'un objet (X3). */
export const MAX_LINKED_FILES = 256;
const MAX_PATH_CHARS = 1024;
const COMPRESSIONS = ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"] as const;

export const MTL_MISSING_MESSAGE =
  "déposé sans son .mtl, modèle sans matières ni textures ; déposez le .obj avec son .mtl et ses textures, ou un ZIP";
export const COMPRESSED_MESSAGE = "modèle 3D compressé (Draco, meshopt ou KTX2) non lu ; exportez-le sans compression";
export const COMPANION_ALONE_MESSAGE = "fichier lié d'un modèle 3D : déposez-le avec son modèle";
export const ZIP_EMPTY_MESSAGE = "aucun modèle 3D dans ce ZIP";
export const ZIP_TOO_BIG_MESSAGE = "ZIP trop gros (plus de 1 000 entrées ou de 256 Mio décompressés)";
export const ZIP_MALFORMED_MESSAGE = "ZIP malformé (taille déclarée d'une entrée incohérente)";
export const NO_WEBGL_MESSAGE = "3D indisponible sur ce poste : l'objet garde son image";
export const MODEL3D_TOO_BIG_MESSAGE = "fichier trop gros pour un objet 3D (plus de 100 Mo)";
export const missingFilesMessage = (name: string, missing: readonly string[]): string =>
  `${name} : fichiers liés absents (${missing.join(", ")})`;

/** Dernier segment d'un chemin (`/` ou `\`). */
export function baseName(path: string): string {
  const p = path.replace(/\\/g, "/");
  return p.slice(p.lastIndexOf("/") + 1);
}

/** Extension en minuscules, sans le point ; "" sans extension ou pour un nom qui s'y réduit (`.obj`). */
export function extensionOf(name: string): string {
  const b = baseName(name);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i + 1).toLowerCase() : "";
}

/** Référence normalisée (X3) : `\` → `/`, segments vides et `.` retirés, `..` résolus ; sortie de la racine : "". */
export function normalizePath(p: string): string {
  const out: string[] = [];
  for (const seg of p.replace(/\\/g, "/").split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length === 0) return "";
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join("/");
}

/** Chemin rangé dans `files[].path` (PC6) : la référence normalisée, ou son nom de base si elle sort de son dossier ;
 *  null si inutilisable (vide, `:`, plus de 1 024 caractères). Accepté par `valid_path` du cœur. */
export function storedPath(ref: string): string | null {
  const n = normalizePath(ref) || baseName(ref);
  if (n === "" || n.includes(":") || [...n].length > MAX_PATH_CHARS) return null;
  return n;
}

const dirOf = (path: string): string => {
  const p = normalizePath(path);
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
};

/** Schéma d'au moins deux lettres (`http:`, `data:`, `blob:`, `file:`) ou `//hôte` : jamais résolu (X27). */
const REMOTE = /^(?:[a-z][a-z0-9+.-]+:|\/\/)/i;
const ABSOLUTE = /^(?:\/|\\|[a-z]:[\\/])/i;

/** X11 : octets d'abord (GLB, PLY), puis extension (`.gltf` + `{`, `.obj` sans octet nul, `.stl`). */
export function sniffModel3d(head: Uint8Array, name: string): Model3dFormat | null {
  if (head.length >= 4 && GLB_MAGIC.every((b, i) => head[i] === b)) return "glb";
  if (head[0] === 0x70 && head[1] === 0x6c && head[2] === 0x79 && (head[3] === 0x0a || (head[3] === 0x0d && head[4] === 0x0a))) {
    return "ply";
  }
  const ext = extensionOf(name);
  if (ext === "gltf") {
    let i = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf ? 3 : 0;
    while (i < head.length && (head[i] === 0x20 || head[i] === 0x09 || head[i] === 0x0a || head[i] === 0x0d)) i++;
    return head[i] === 0x7b ? "gltf" : null;
  }
  if (ext === "obj") return head.length > 0 && !head.includes(0) ? "obj" : null;
  if (ext === "stl") return head.length > 0 ? "stl" : null;
  return null;
}

/** `.mtl` ou `.bin` : fichier lié d'un modèle, jamais importé seul (X12). */
export const isCompanionName = (name: string): boolean => extensionOf(name) === "mtl" || extensionOf(name) === "bin";

const MTL_MAP_KEYS = new Set(["map_kd", "map_ka", "map_ks", "map_ns", "map_d", "map_bump", "bump", "disp", "norm", "refl"]);

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** X14 : références citées, dans l'ordre, sans doublon, `data:` exclus. OBJ : `mtllib` (reste de la ligne) ; MTL :
 *  dernier mot des clés de texture (sans casse) ; glTF : `buffers[].uri`, `images[].uri` (URI décodée). */
export function references(kind: "obj" | "mtl" | "gltf", text: string): string[] {
  const out: string[] = [];
  const add = (r: string): void => {
    const t = r.trim();
    if (t !== "" && !t.toLowerCase().startsWith("data:") && !out.includes(t)) out.push(t);
  };
  if (kind === "gltf") {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return [];
    }
    for (const key of ["buffers", "images"]) {
      const list = (json as Record<string, unknown> | null)?.[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const uri = (item as { uri?: unknown } | null)?.uri;
        if (typeof uri === "string") add(safeDecode(uri));
      }
    }
    return out;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const words = line.split(/\s+/);
    const key = (words[0] ?? "").toLowerCase();
    if (kind === "obj" && key === "mtllib") add(line.slice(words[0]!.length));
    if (kind === "mtl" && MTL_MAP_KEYS.has(key) && words.length > 1) add(words[words.length - 1]!);
  }
  return out;
}

/** Bloc JSON d'un GLB (chunk 0 de type `JSON`) ; null si l'en-tête ou le bloc manque. */
export function glbJsonText(bytes: Uint8Array): string | null {
  if (bytes.length < 20 || !GLB_MAGIC.every((b, i) => bytes[i] === b)) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = v.getUint32(12, true);
  if (v.getUint32(16, true) !== 0x4e4f534a || 20 + len > bytes.length) return null;
  return new TextDecoder().decode(bytes.subarray(20, 20 + len));
}

/** X18 : extension de compression **requise** (Draco, meshopt, KTX2), sinon null (seulement « utilisée » : null). */
export function gltfCompression(json: string): string | null {
  let j: unknown;
  try {
    j = JSON.parse(json);
  } catch {
    return null;
  }
  const req = (j as { extensionsRequired?: unknown } | null)?.extensionsRequired;
  if (!Array.isArray(req)) return null;
  return COMPRESSIONS.find((e) => req.includes(e)) ?? null;
}

/** X14 : nom de `names` qui répond à `ref` cité par `mainPath` : chemin exact relatif au dossier du principal, puis sans
 *  casse, puis nom de base unique (sans casse) ; distant jamais ; absolu : nom de base seulement. */
export function resolveReference(ref: string, mainPath: string, names: readonly string[]): string | null {
  if (REMOTE.test(ref)) return null;
  if (!ABSOLUTE.test(ref)) {
    const dir = dirOf(mainPath);
    const target = normalizePath(dir === "" ? ref : `${dir}/${ref}`);
    if (target !== "") {
      const exact = names.find((n) => normalizePath(n) === target);
      if (exact !== undefined) return exact;
      const t = target.toLowerCase();
      const loose = names.filter((n) => normalizePath(n).toLowerCase() === t);
      if (loose.length === 1) return loose[0]!;
    }
  }
  const b = baseName(ref).toLowerCase();
  if (b === "") return null;
  const same = names.filter((n) => baseName(n).toLowerCase() === b);
  return same.length === 1 ? same[0]! : null;
}

/** Fichier candidat d'un même dépôt ou d'un même ZIP : son chemin (nom seul pour un dépôt) et ses octets à la demande. */
export interface Sibling {
  readonly path: string;
  bytes(): Promise<Uint8Array>;
}
export interface GatheredFile {
  /** `storedPath` de la référence : la clé de `files[].path` et de la garde d'URL (T7). */
  readonly path: string;
  readonly sibling: Sibling;
}
export interface Gathered {
  readonly files: readonly GatheredFile[];
  /** Références citées sans fichier (telles qu'écrites) ; vide quand `mtl` est faux (X15 prime). */
  readonly missing: readonly string[];
  /** OBJ : vrai si au moins un `.mtl` cité est résolu (ou écarté car trop gros) ; null pour les autres formats. */
  readonly mtl: boolean | null;
  /** Mineur C15 : noms de `tooBig` cités par ce modèle (écartés car trop gros, déjà dits) ; jamais dans `missing`. */
  readonly skipped: readonly string[];
}

/** X13, X14 : fichiers liés d'un modèle parmi `siblings` (OBJ → MTL → textures du MTL, résolues depuis le MTL ; glTF et
 *  GLB → tampons et images) ; doublons rangés une fois, `MAX_LINKED_FILES` au plus. STL, PLY : aucun. */
export async function gatherFiles(
  format: Model3dFormat,
  mainPath: string,
  main: Uint8Array,
  siblings: readonly Sibling[],
  tooBig: readonly string[] = [],
): Promise<Gathered> {
  const names = siblings.map((s) => s.path);
  const files: GatheredFile[] = [];
  const missing: string[] = [];
  const skipped: string[] = [];
  const take = (ref: string, from: string): Sibling | "trop-gros" | null => {
    const hit = resolveReference(ref, from, names);
    const path = storedPath(ref);
    if (hit === null || path === null) {
      const big = hit === null ? resolveReference(ref, from, tooBig) : null;
      if (big !== null) {
        if (!skipped.includes(big)) skipped.push(big);
        return "trop-gros";
      }
      if (!missing.includes(ref)) missing.push(ref);
      return null;
    }
    const sibling = siblings[names.indexOf(hit)]!;
    if (!files.some((f) => f.path === path) && files.length < MAX_LINKED_FILES) files.push({ path, sibling });
    return sibling;
  };
  const text = (b: Uint8Array): string => new TextDecoder().decode(b);
  if (format === "gltf" || format === "glb") {
    const json = format === "gltf" ? text(main) : glbJsonText(main);
    for (const ref of json === null ? [] : references("gltf", json)) take(ref, mainPath);
    return { files, missing, mtl: null, skipped };
  }
  if (format !== "obj") return { files, missing, mtl: null, skipped };
  let mtl = false;
  for (const ref of references("obj", text(main))) {
    const s = take(ref, mainPath);
    if (s === null) continue;
    mtl = true;
    if (s === "trop-gros") continue;
    for (const tex of references("mtl", text(await s.bytes()))) take(tex, s.path);
  }
  return { files, missing: mtl ? missing : [], mtl, skipped };
}

/** X16 : entrée de ZIP gardée : chemin sûr selon `safeArchivePath` (C13 N16), extension 3D ou liée. */
export function keepZipPath(path: string): boolean {
  const p = safeArchivePath(path);
  if (p === null) return false;
  const ext = extensionOf(p);
  return (MODEL_EXTENSIONS as readonly string[]).includes(ext) || (COMPANION_EXTENSIONS as readonly string[]).includes(ext);
}
