/**
 * Module image (DAR3, U26, U33) : reconnaissance par octets magiques, taille lue dans l'en-tête (PNG, JPEG seulement,
 * R15), décodage par le navigateur (R13), géométrie d'insertion (R4, R5) et l'entrée `image` du registre d'import (R1).
 * Partagé par le dépôt, le collage, « Importer » et le cache des bitmaps du rendu. Jamais de SVG dans le DOM.
 */
import type { Change, Command, Matrix } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { screenToWorld, type Camera } from "../engine/camera";
import { PAGE_WIDTH } from "../engine/page";
import { messageOf } from "./controller";
import type { Point } from "./files";
import type { ImportHandler } from "./import";

export type ImageKind = "png" | "jpeg" | "gif" | "webp" | "bmp" | "ico" | "svg" | "avif" | "heic";

export const IMAGE_MIME: Readonly<Record<ImageKind, string>> = Object.freeze({
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
});

export const HEAD_BYTES = 4096;
export const MAX_PIXELS = 100_000_000;
export const DISPLAY_MAX = 4096;
export const CASCADE_STEP = 24;
export const FIT_SHARE = 0.8;
export const HEIC_UNREADABLE = "HEIC illisible sur ce poste";
export const TAB_CLOSED_MESSAGE = "onglet fermé pendant l'import, image non insérée";
export const TOO_MANY_PIXELS = "image trop grande (plus de 100 millions de pixels)";
/** Le SOFn d'un JPEG est cherché dans le premier Mio (blocs EXIF compris). */
const JPEG_SCAN = 1 << 20;

const starts = (h: Uint8Array, sig: readonly number[]): boolean => sig.every((b, i) => h[i] === b);
const ascii = (h: Uint8Array, from: number, to: number): string => String.fromCharCode(...h.subarray(from, to));

function isSvg(head: Uint8Array, name: string): boolean {
  const text = new TextDecoder("utf-8").decode(head).replace(/^\uFEFF/, "").trimStart();
  if (!text.startsWith("<")) return false;
  // Prologue `<?xml …?>`, commentaires et `<!DOCTYPE svg …>` d'abord ; une page HTML qui contient un <svg> n'en est pas un.
  const rest = text.replace(/^(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE\s+svg\b[^>[]*(?:\[[\s\S]*?\])?\s*>)+/i, "");
  if (/^<svg[\s>/]/i.test(rest)) return true;
  // En-tête coupé dans le prologue (4 Kio) : le nom `.svg` tranche.
  return name.toLowerCase().endsWith(".svg") && (rest === "" || /^(?:<\?|<!--|<!DOCTYPE\s+svg)/i.test(rest));
}

/** Format d'image d'après les premiers octets ; `name` ne sert qu'au SVG sans balise `<svg` dans l'en-tête. */
export function sniffImage(head: Uint8Array, name: string): ImageKind | null {
  if (starts(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts(head, [0xff, 0xd8, 0xff])) return "jpeg";
  const six = ascii(head, 0, 6);
  if (six === "GIF87a" || six === "GIF89a") return "gif";
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") return "webp";
  if (ascii(head, 0, 2) === "BM" && head.length >= 26) return "bmp";
  if (starts(head, [0x00, 0x00, 0x01, 0x00]) && head.length >= 6 && ((head[4] ?? 0) | (head[5] ?? 0)) !== 0) return "ico";
  if (ascii(head, 4, 8) === "ftyp") {
    const size = (((head[0] ?? 0) << 24) | ((head[1] ?? 0) << 16) | ((head[2] ?? 0) << 8) | (head[3] ?? 0)) >>> 0;
    const brands = ascii(head, 8, Math.min(head.length, Math.max(12, size)));
    if (/avi[fs]/.test(brands)) return "avif";
    if (/hei[cxms]|hev[cx]|mif1|msf1/.test(brands)) return "heic";
  }
  if (isSvg(head, name)) return "svg";
  return null;
}

export function kindOfMime(mime: string): ImageKind | null {
  if (mime === "image/vnd.microsoft.icon") return "ico";
  if (mime === "image/heif") return "heic";
  const found = (Object.keys(IMAGE_MIME) as ImageKind[]).find((k) => IMAGE_MIME[k] === mime);
  return found ?? null;
}

/** Premier segment SOFn (C0 à CF sauf C4, C8, CC) : hauteur puis largeur, gros-boutistes. */
export function jpegSize(b: Uint8Array): { readonly w: number; readonly h: number } | null {
  let i = 2;
  while (i + 8 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1] ?? 0;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: ((b[i + 5] ?? 0) << 8) | (b[i + 6] ?? 0), w: ((b[i + 7] ?? 0) << 8) | (b[i + 8] ?? 0) };
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    i += 2 + (((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0));
  }
  return null;
}

/** Taille lue dans l'en-tête, avant tout décodage (R15) : PNG (IHDR) et JPEG (SOFn) ; null pour les autres. */
export async function probeSize(blob: Blob, kind: ImageKind): Promise<{ readonly w: number; readonly h: number } | null> {
  if (kind === "png") {
    const h = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
    if (h.length < 24 || ascii(h, 12, 16) !== "IHDR") return null;
    const v = new DataView(h.buffer, h.byteOffset, h.byteLength);
    return { w: v.getUint32(16), h: v.getUint32(20) };
  }
  if (kind === "jpeg") return jpegSize(new Uint8Array(await blob.slice(0, JPEG_SCAN).arrayBuffer()));
  return null;
}

export interface DecodedImage {
  readonly bitmap: ImageBitmap;
  /** Taille source orientée (EXIF appliqué), en pixels. */
  readonly w: number;
  readonly h: number;
}

export interface DecodePorts {
  createImageBitmap(src: ImageBitmapSource, opts?: ImageBitmapOptions): Promise<ImageBitmap>;
  /** SVG : `HTMLImageElement` hors DOM sur une URL `blob:` (R13). */
  loadSvg(blob: Blob): Promise<ImageBitmapSource>;
}

export type ImageDecoder = (blob: Blob, kind: ImageKind) => Promise<DecodedImage>;

export class ImageTooLargeError extends Error {
  constructor() {
    super(TOO_MANY_PIXELS);
    this.name = "ImageTooLargeError";
  }
}

export function browserDecodePorts(): DecodePorts {
  return {
    createImageBitmap: (src, opts) => globalThis.createImageBitmap(src, opts),
    loadSvg: (blob) =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("SVG illisible"));
        };
        img.src = url;
      }),
  };
}

/** Décode ; refuse au-delà de 100 Mpx (bitmap fermé) ; côté le plus long au-delà de `max` : bitmap d'affichage réduit. */
export async function decodeImage(
  blob: Blob,
  kind: ImageKind,
  max = DISPLAY_MAX,
  ports: DecodePorts = browserDecodePorts(),
): Promise<DecodedImage> {
  const source: ImageBitmapSource = kind === "svg" ? await ports.loadSvg(blob) : blob;
  const full = await ports.createImageBitmap(source, { imageOrientation: "from-image" });
  const w = full.width;
  const h = full.height;
  if (w * h > MAX_PIXELS) {
    full.close();
    throw new ImageTooLargeError();
  }
  const side = Math.max(w, h);
  if (side <= max) return { bitmap: full, w, h };
  const k = max / side;
  try {
    const bitmap = await ports.createImageBitmap(full, {
      resizeWidth: Math.max(1, Math.round(w * k)),
      resizeHeight: Math.max(1, Math.round(h * k)),
      resizeQuality: "high",
    });
    return { bitmap, w, h };
  } finally {
    full.close();
  }
}

/** Rectangle du stage actif en px CSS de la fenêtre (`getBoundingClientRect`). */
export interface StageRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Point d'insertion monde (R4) : `at` dans le stage → monde ; `at` nul ou hors du stage → centre de la vue. */
export function anchorOf(rect: StageRect, camera: Camera, at: Point | null): readonly [number, number] {
  const inside =
    at !== null && at.x >= rect.left && at.x <= rect.left + rect.width && at.y >= rect.top && at.y <= rect.top + rect.height;
  const [x, y] = inside
    ? screenToWorld(camera, at.x - rect.left, at.y - rect.top)
    : screenToWorld(camera, rect.width / 2, rect.height / 2);
  return [x, y];
}

/** Partie visible de la page en unités monde (R5) : largeur coupée à [0, PAGE_WIDTH], hauteur de la vue (page infinie). */
export function visibleOf(rect: StageRect, camera: Camera): { readonly w: number; readonly h: number } {
  const [x0] = screenToWorld(camera, 0, 0);
  const [x1] = screenToWorld(camera, rect.width, rect.height);
  const w = Math.min(x1, PAGE_WIDTH) - Math.max(x0, 0);
  return { w: w > 0 ? w : rect.width / camera.zoom, h: rect.height / camera.zoom };
}

/** Matrice d'insertion (R4, R5) : réduite (jamais agrandie) à 80 % du visible, centrée sur `anchor`, décalée de 24 × `index`. */
export function placement(
  w: number,
  h: number,
  anchor: readonly [number, number],
  visible: { readonly w: number; readonly h: number },
  index: number,
): Matrix {
  const fit = (room: number, size: number): number => (room > 0 ? (FIT_SHARE * room) / size : 1);
  const s = Math.min(1, fit(visible.w, w), fit(visible.h, h));
  const d = CASCADE_STEP * index;
  return [s, 0, 0, s, anchor[0] - (s * w) / 2 + d, anchor[1] - (s * h) / 2 + d];
}

/** Onglet qui reçoit les objets (R3) : branché par l'espace de travail sur la session active. */
export interface ImageTarget {
  readonly assets: Pick<AssetStore, "put">;
  page(): string;
  camera(): Camera;
  stageRect(): StageRect;
  /** Faux une fois l'onglet fermé (décodage en cours) : plus aucun appel au moteur libéré. */
  alive?(): boolean;
  /** `engine.run` : null si le cœur refuse (message dans l'état du moteur). */
  run(cmd: Command): Change | null;
  /**
   * Z10 : insère un objet `.rbitem` (fragment, pas une `Command`) dans cet onglet ; `index` = rang dans l'appel
   * (cascade, R4). Absent : `.rbitem` refusé. Faux : refus, le message est déjà dit.
   */
  insertFragment?(rbitem: Uint8Array, at: Point | null, index: number): Promise<boolean>;
}

/** Entrée `image` du registre (R1) : en-tête, décodage, empreinte, `AddImage` en une étape (R6). */
export function imageHandler(deps: { readonly decode?: ImageDecoder } = {}): ImportHandler {
  const decode: ImageDecoder = deps.decode ?? ((b, k) => decodeImage(b, k));
  return {
    id: "image",
    nature: "objet",
    detect: (head, name) => sniffImage(head, name) !== null,
    async run(file, ctx) {
      const kind = sniffImage(ctx.head, file.name);
      const target = ctx.target;
      if (kind === null || target === null) return "failed";
      const mime = IMAGE_MIME[kind];
      try {
        const blob = ctx.blob.type === mime ? ctx.blob : new Blob([ctx.blob], { type: mime });
        const probed = await probeSize(blob, kind);
        if (probed !== null && probed.w * probed.h > MAX_PIXELS) {
          await ctx.notify(`${file.name} : ${TOO_MANY_PIXELS}`);
          return "failed";
        }
        let decoded: DecodedImage;
        try {
          decoded = await decode(blob, kind);
        } catch (e) {
          if (e instanceof ImageTooLargeError) await ctx.notify(`${file.name} : ${TOO_MANY_PIXELS}`);
          else if (kind === "heic") await ctx.notify(`${file.name} : ${HEIC_UNREADABLE}`);
          else await ctx.notify(`Image illisible (${file.name}) : ${messageOf(e)}`);
          return "failed";
        }
        decoded.bitmap.close(); // le rendu décode à nouveau depuis le magasin (cache par empreinte, DAR2)
        const id = await target.assets.put(blob);
        // Vérifié après `put` (asynchrone : lecture et SHA-256), juste avant le premier appel au moteur : l'onglet a pu se fermer pendant l'écriture.
        if (target.alive?.() === false) {
          await ctx.notify(`${file.name} : ${TAB_CLOSED_MESSAGE}`);
          return "failed";
        }
        const rect = target.stageRect();
        const camera = target.camera();
        const change = target.run({
          type: "AddImage",
          page: target.page(),
          asset: { id, name: file.name, mime, size: blob.size },
          w: decoded.w,
          h: decoded.h,
          matrix: placement(decoded.w, decoded.h, anchorOf(rect, camera, ctx.at), visibleOf(rect, camera), ctx.inserted),
        });
        return change === null ? "failed" : "inserted";
      } catch (e) {
        await ctx.notify(`Import impossible (${file.name}) : ${messageOf(e)}`);
        return "failed";
      }
    },
  };
}
