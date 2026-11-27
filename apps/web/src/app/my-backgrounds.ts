/**
 * « Mes fonds » (personnalisation-1b, Q18, Q19, Q22, Q36, DA4) : fonds de l'utilisateur rangés sur l'appareil, troisième
 * racine de la bibliothèque (`LibraryRoot` « backgrounds » : IndexedDB sur le web, `Documents/RoomBoard/Fonds` dans la
 * coque), jamais dans le document. Une entrée : compagnon `<nom>.json` (`format: "roomboard-background"`, `schema: 1`),
 * image `<nom>.<ext>` (octets gardés tels quels), miniature `<nom>.thumb.png`. Pas `ResourceLibrary` (C4) : un fond n'est
 * pas un `.rbitem`. Lecture tolérante : un compagnon illisible est ignoré ; un compagnon n'est jamais réécrit à la
 * lecture (clés inconnues gardées).
 */
import type { GridInput } from "../core/api";
import type { BackgroundSource } from "../backgrounds/source";
import { HEAD_BYTES, IMAGE_MIME, MAX_PIXELS, probeSize, sniffImage, TOO_MANY_PIXELS } from "../platform/image-import";
import type { LibraryFiles } from "../platform/library-files";
import { fileNameOf } from "./library";

export const BACKGROUND_FORMAT = "roomboard-background";
export const BACKGROUND_SCHEMA = 1;
export const NOT_AN_IMAGE_MESSAGE = "seules les images deviennent des fonds";

export type BackgroundOrigin = "image" | "page" | "grid";
export interface MyBackgroundImage {
  readonly file: string;
  readonly mime: string;
  readonly w: number;
  readonly h: number;
}
export interface MyBackground {
  /** Chemin du compagnon dans la racine (`<nom>.json`) : la clé de l'entrée. */
  readonly file: string;
  readonly name: string;
  readonly created: string;
  readonly origin: BackgroundOrigin;
  readonly color: string;
  readonly grid: GridInput | null;
  readonly image: MyBackgroundImage | null;
}
export interface ProbedImage {
  readonly mime: string;
  readonly w: number;
  readonly h: number;
}
export interface MyBackgroundsDeps {
  now(): string;
  probe(blob: Blob, name: string): Promise<ProbedImage | null>;
  thumbnail(src: BackgroundSource): Promise<Blob | null>;
}
export interface MyBackgrounds {
  list(): Promise<readonly MyBackground[]>;
  addImage(blob: Blob, name: string): Promise<MyBackground>;
  addSource(src: BackgroundSource, name: string, origin: BackgroundOrigin): Promise<MyBackground>;
  read(entry: MyBackground): Promise<BackgroundSource>;
  thumbnail(entry: MyBackground): Promise<Blob | null>;
  remove(entry: MyBackground): Promise<void>;
  onChange(listener: () => void): () => void;
}

const JSON_EXT = ".json";
const THUMB_EXT = ".thumb.png";
const ORIGINS: readonly string[] = ["image", "page", "grid"];
const EXT: Readonly<Record<string, string>> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  "image/bmp": "bmp", "image/avif": "avif", "image/heic": "heic", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico",
};
const baseOf = (file: string): string => file.slice(0, -JSON_EXT.length);

export function stampOf(d: Date): string {
  const p = (v: number): string => String(v).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Type et taille d'une image d'après son en-tête (Q22) ; null : pas une image lisible. */
export async function probeImage(blob: Blob, name: string): Promise<ProbedImage | null> {
  const head = new Uint8Array(await blob.slice(0, HEAD_BYTES).arrayBuffer());
  const kind = sniffImage(head, name);
  if (kind === null) return null;
  const size = await probeSize(blob, kind);
  return size === null ? null : { mime: IMAGE_MIME[kind], w: size.w, h: size.h };
}

function parse(file: string, text: string): MyBackground | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o["format"] !== BACKGROUND_FORMAT || o["schema"] !== BACKGROUND_SCHEMA) return null;
  const { name, created, origin, color, image, grid } = o;
  if (typeof name !== "string" || typeof created !== "string" || typeof color !== "string") return null;
  if (typeof origin !== "string" || !ORIGINS.includes(origin)) return null;
  if (image === undefined) return null;
  let im: MyBackgroundImage | null = null;
  if (image !== null) {
    if (typeof image !== "object") return null;
    const r = image as Record<string, unknown>;
    const { file: f, mime, w, h } = r;
    if (typeof f !== "string" || typeof mime !== "string" || typeof w !== "number" || typeof h !== "number") return null;
    im = { file: f, mime, w, h };
  }
  return { file, name, created, origin: origin as BackgroundOrigin, color, grid: (grid ?? null) as GridInput | null, image: im };
}

export function createMyBackgrounds(files: LibraryFiles, deps: MyBackgroundsDeps): MyBackgrounds {
  const listeners = new Set<() => void>();
  const changed = (): void => {
    for (const l of listeners) l();
  };
  /** Nom de base libre : `fileNameOf` seul (aucun autre slug, constat `library.ts:76`), puis `-2`, `-3`… */
  async function freeBase(name: string): Promise<string> {
    const taken = new Set((await files.list()).map((p) => p.path));
    const base = fileNameOf(name);
    for (let i = 1; ; i++) {
      const b = i === 1 ? base : `${base}-${i}`;
      if (!taken.has(`${b}${JSON_EXT}`)) return b;
    }
  }
  async function store(src: BackgroundSource, name: string, origin: BackgroundOrigin): Promise<MyBackground> {
    const base = await freeBase(name);
    const image: MyBackgroundImage | null =
      src.image === null ? null : { file: `${base}.${EXT[src.image.mime] ?? "img"}`, mime: src.image.mime, w: src.image.w, h: src.image.h };
    if (src.image !== null && image !== null) await files.write(image.file, src.image.blob);
    const thumb = await deps.thumbnail(src);
    if (thumb !== null) await files.write(`${base}${THUMB_EXT}`, thumb);
    const entry: MyBackground = { file: `${base}${JSON_EXT}`, name, created: deps.now(), origin, color: src.color, grid: src.grid, image };
    const json = { format: BACKGROUND_FORMAT, schema: BACKGROUND_SCHEMA, name, created: entry.created, origin, color: entry.color, grid: entry.grid, image };
    await files.write(entry.file, new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }));
    changed();
    return entry;
  }
  return {
    async list() {
      const out: MyBackground[] = [];
      for (const p of await files.list()) {
        if (p.dir || !p.path.endsWith(JSON_EXT) || p.path.includes("/")) continue;
        try {
          const e = parse(p.path, await (await files.read(p.path)).text());
          if (e !== null) out.push(e);
        } catch {
          // Entrée illisible (stockage) : ignorée, les autres restent listées.
        }
      }
      return out.sort((a, b) => (a.created === b.created ? a.file.localeCompare(b.file) : a.created < b.created ? 1 : -1));
    },
    async addImage(blob, name) {
      const probed = await deps.probe(blob, name);
      if (probed === null) throw new Error(NOT_AN_IMAGE_MESSAGE);
      if (probed.w * probed.h > MAX_PIXELS) throw new Error(TOO_MANY_PIXELS);
      return store({ color: "#ffffff", grid: null, image: { blob, name, mime: probed.mime, w: probed.w, h: probed.h } }, name, "image");
    },
    addSource: (src, name, origin) => store(src, name, origin),
    async read(entry) {
      const im = entry.image;
      return {
        color: entry.color,
        grid: entry.grid,
        image: im === null ? null : { blob: await files.read(im.file), name: im.file, mime: im.mime, w: im.w, h: im.h },
      };
    },
    async thumbnail(entry) {
      try {
        return await files.read(`${baseOf(entry.file)}${THUMB_EXT}`);
      } catch {
        return null;
      }
    },
    async remove(entry) {
      for (const p of [entry.file, `${baseOf(entry.file)}${THUMB_EXT}`, ...(entry.image === null ? [] : [entry.image.file])]) {
        try {
          await files.remove(p);
        } catch {
          // Déjà absent : rien à retirer.
        }
      }
      changed();
    },
    onChange(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
