/**
 * Module média (C14, M10, M12, M15, M16) : reconnaissance par octets magiques, sonde (durée, taille, poster) et
 * refus des formats MKV et AVI. Aucune conversion, aucun décodeur embarqué : le navigateur lit ou ne lit pas.
 */
import type { AssetRef, MediaType } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { messageOf } from "./controller";
import type { DroppedFile } from "./files";
import { anchorOf, placement, visibleOf, type ImageTarget } from "./image-import";
import type { ImportContext, ImportHandler, ImportOutcome } from "./import";

export type MediaFormat = "mp4" | "mov" | "webm" | "mp3" | "wav" | "ogg" | "m4a";
export type MediaSniff = { readonly format: MediaFormat; readonly mime: string } | { readonly unsupported: "mkv" | "avi" };

export const MEDIA_MIME: Readonly<Record<MediaFormat, string>> = Object.freeze({
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
});

export const MEDIA_INCLUDE_MAX_BYTES = 50 * 1024 * 1024;
export const MEDIA_PASTE_MAX_BYTES = 100 * 1024 * 1024;
export const PROBE_TIMEOUT_MS = 15_000;
export const POSTER_MAX = 1920;
export const POSTER_QUALITY = 0.85;
export const POSTER_MIME = "image/jpeg";
export const AUDIO_BOX: { readonly w: 480; readonly h: 120 } = Object.freeze({ w: 480, h: 120 });
export const CODEC_UNREADABLE = "codec non lu sur ce poste";
export const MEDIA_TOO_BIG = "trop lourd pour être inclus (plus de 100 Mo)";
export const MEDIA_LINKED_NOTE = "vidéo non incluse dans le document (liée, plus de 50 Mo)";
/** R4 : `linkMedia` a rejeté (`NotGranted`, `NotMedia`, `Io`) ; suivi de la raison. */
export const MEDIA_NOT_LINKED = "vidéo non liée";
export const MEDIA_TAB_CLOSED = "onglet fermé pendant l'import, média non inséré";
export const unsupportedMediaMessage = (kind: "mkv" | "avi"): string =>
  `format ${kind.toUpperCase()} non lu par RoomBoard ; convertissez-le en MP4 ou WebM`;

const ascii = (h: Uint8Array, from: number, to: number): string => {
  let s = "";
  for (let i = from; i < to && i < h.length; i++) s += String.fromCharCode(h[i] ?? 0);
  return s;
};
const at = (h: Uint8Array, i: number): number => h[i] ?? 0;
const IMAGE_BRANDS = new Set(["avif", "avis", "heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "mif2"]);
const EBML_SCAN = 64;
/** R5 (M11) : marques d'image cherchées comme `sniffImage` (image-import.ts:62-67), dans toute la boîte `ftyp` lue
 *  (majeure, version, compatibles) : ce que l'image revendique, le média le laisse. */
const IMAGE_BRAND_SCAN = /avi[fs]|hei[cxms]|hev[cx]|mif[12]|msf1/;

const found = (format: MediaFormat): MediaSniff => ({ format, mime: MEDIA_MIME[format] });

function ebmlDocType(head: Uint8Array): string | null {
  const last = Math.min(head.length, EBML_SCAN) - 3;
  for (let i = 4; i < last; i++) {
    if (head[i] === 0x42 && head[i + 1] === 0x82) {
      const size = at(head, i + 2);
      if ((size & 0x80) === 0) return null;
      return ascii(head, i + 3, i + 3 + (size & 0x7f));
    }
  }
  return null;
}

/** Format audio/vidéo d'après les premiers octets (M10) ; `name` ne sert qu'aux atomes QuickTime sans `ftyp`. */
export function sniffMedia(head: Uint8Array, name: string): MediaSniff | null {
  if (head.length < 3) return null;
  if (ascii(head, 4, 8) === "ftyp") {
    const brand = ascii(head, 8, 12);
    if (brand === "qt  ") return found("mov");
    if (brand === "M4A " || brand === "M4B ") return found("m4a");
    const size = ((at(head, 0) << 24) | (at(head, 1) << 16) | (at(head, 2) << 8) | at(head, 3)) >>> 0;
    if (IMAGE_BRANDS.has(brand) || IMAGE_BRAND_SCAN.test(ascii(head, 8, Math.min(head.length, Math.max(12, size))))) return null;
    return found("mp4");
  }
  if (/^(moov|mdat|wide|free)$/.test(ascii(head, 4, 8)) && name.toLowerCase().endsWith(".mov")) return found("mov");
  if (at(head, 0) === 0x1a && at(head, 1) === 0x45 && at(head, 2) === 0xdf && at(head, 3) === 0xa3) {
    const doc = ebmlDocType(head);
    if (doc === "webm") return found("webm");
    if (doc === "matroska") return { unsupported: "mkv" };
    return null;
  }
  if (ascii(head, 0, 4) === "RIFF") {
    const kind = ascii(head, 8, 12);
    if (kind === "WAVE") return found("wav");
    if (kind === "AVI ") return { unsupported: "avi" };
    return null;
  }
  if (ascii(head, 0, 4) === "OggS") return found("ogg");
  if (ascii(head, 0, 3) === "ID3") return found("mp3");
  if (at(head, 0) === 0xff && (at(head, 1) & 0xe6) === 0xe2) return found("mp3");
  return null;
}

/** Taille du poster : plus grand côté ≤ `POSTER_MAX`, jamais agrandi, chaque côté ≥ 1. */
export function posterSize(w: number, h: number): { readonly w: number; readonly h: number } {
  const k = Math.min(1, POSTER_MAX / Math.max(w, h, 1));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

type ProbeEvent = "loadedmetadata" | "durationchange" | "seeked" | "error";

export interface ProbeVideo {
  src: string;
  preload: string;
  muted: boolean;
  playsInline: boolean;
  crossOrigin: string | null;
  currentTime: number;
  readonly duration: number;
  readonly videoWidth: number;
  readonly videoHeight: number;
  addEventListener(t: ProbeEvent, cb: () => void): void;
  removeEventListener(t: ProbeEvent, cb: () => void): void;
  removeAttribute(n: "src"): void;
  load(): void;
}

export interface MediaPorts {
  createVideo(): ProbeVideo;
  snapshot(video: ProbeVideo, w: number, h: number): Promise<Blob | null>;
  setTimer(cb: () => void, ms: number): () => void;
}

export interface MediaProbe {
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  readonly poster: Blob | null;
}

export interface LinkedMedia {
  readonly id: string;
  readonly url: string;
}

/** Ports du navigateur : `<video>` hors DOM, poster par canvas (JPEG 0,85) ; toile salie : null. */
export function browserMediaPorts(): MediaPorts {
  return {
    createVideo: () => document.createElement("video") as unknown as ProbeVideo,
    async snapshot(video, w, h) {
      try {
        if (!(video instanceof HTMLVideoElement)) return null;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const g = canvas.getContext("2d");
        if (g === null) return null;
        g.drawImage(video, 0, 0, w, h);
        return await new Promise<Blob | null>((resolve) => {
          try {
            canvas.toBlob(resolve, POSTER_MIME, POSTER_QUALITY);
          } catch {
            resolve(null);
          }
        });
      } catch {
        return null;
      }
    },
    setTimer(cb, ms) {
      const id = setTimeout(cb, ms);
      return () => clearTimeout(id);
    },
  };
}

/** Sonde d'un média (M15) : durée, taille et poster ; rejette `CODEC_UNREADABLE` sur erreur ou délai global. */
export async function probeMedia(url: string, ports: MediaPorts = browserMediaPorts(), timeoutMs: number = PROBE_TIMEOUT_MS): Promise<MediaProbe> {
  const video = ports.createVideo();
  const cleanups: (() => void)[] = [];
  let reject!: (e: Error) => void;
  const failure = new Promise<never>((_, r) => {
    reject = r;
  });
  failure.catch(() => undefined);
  const fail = (): void => reject(new Error(CODEC_UNREADABLE));
  video.addEventListener("error", fail);
  cleanups.push(() => video.removeEventListener("error", fail));
  cleanups.push(ports.setTimer(fail, timeoutMs));
  /** Attend `t` (écouteur posé avant `trigger`) ou l'échec. */
  const wait = (t: ProbeEvent, trigger: () => void): Promise<void> => {
    const arrived = new Promise<void>((resolve) => {
      const cb = (): void => {
        video.removeEventListener(t, cb);
        resolve();
      };
      video.addEventListener(t, cb);
      cleanups.push(() => video.removeEventListener(t, cb));
    });
    trigger();
    return Promise.race([arrived, failure]);
  };
  try {
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    await wait("loadedmetadata", () => {
      video.src = url;
    });
    if (video.duration === Infinity) {
      await wait("durationchange", () => {
        video.currentTime = 1e101;
      });
    }
    const d = video.duration;
    const duration = Number.isFinite(d) && d > 0 ? Math.round(d * 1000) / 1000 : 0;
    const width = video.videoWidth;
    const height = video.videoHeight;
    let poster: Blob | null = null;
    if (width > 0) {
      await wait("seeked", () => {
        video.currentTime = Math.min(1, duration / 10);
      });
      const size = posterSize(width, height);
      poster = await Promise.race([ports.snapshot(video, size.w, size.h), failure]);
    }
    return { duration, width, height, poster };
  } finally {
    for (const c of cleanups) c();
    video.removeAttribute("src");
    video.load();
  }
}

/** Refus d'un format (M12) : détecté par les octets, plafond -1 pour que `importFiles` le dise avant toute lecture. */
export function unsupportedMediaHandler(kind: "mkv" | "avi"): ImportHandler {
  return {
    id: `media-${kind}`,
    nature: "objet",
    detect: (head, name) => {
      const s = sniffMedia(head, name);
      return s !== null && "unsupported" in s && s.unsupported === kind;
    },
    limit: { maxBytes: -1, message: unsupportedMediaMessage(kind) },
    run: async () => "failed",
  };
}

export interface MediaHandlerDeps {
  readonly probe: (url: string) => Promise<MediaProbe>;
  readonly urls: { create(blob: Blob): string; revoke(url: string): void };
  linkMedia?(path: string): Promise<LinkedMedia>;
}

type Supported = Extract<MediaSniff, { readonly format: MediaFormat }>;

function supported(head: Uint8Array, name: string): Supported | null {
  const s = sniffMedia(head, name);
  return s !== null && "format" in s ? s : null;
}

/** PC7 : la cible garde `Pick<AssetStore, "put">` ; le lien n'est posé que si son magasin sait lier. */
const canLink = (assets: ImageTarget["assets"]): assets is Pick<AssetStore, "put" | "link"> =>
  "link" in assets && typeof (assets as { link?: unknown }).link === "function";

/** Fin commune des deux branches, sur le patron d'`imageHandler` : poster au magasin, onglet vivant après la dernière
 *  attente, `AddMedia` en une étape placé par `placement(anchorOf, visibleOf, inserted)`. */
async function addMedia(
  file: DroppedFile,
  sniff: Supported,
  ctx: Omit<ImportContext, "blob">,
  target: ImageTarget,
  probed: MediaProbe,
  assetOf: AssetRef,
  linked: string | null,
): Promise<ImportOutcome> {
  // M16 : le genre suit la sonde (aucune image : un son, quel que soit le conteneur) ; le MIME suit le genre.
  const mediaType: MediaType = probed.width > 0 ? "video" : "audio";
  const asset: AssetRef = { ...assetOf, mime: `${mediaType}/${sniff.mime.slice(sniff.mime.indexOf("/") + 1)}` };
  let poster: AssetRef | null = null;
  if (mediaType === "video" && probed.poster !== null) {
    const p = probed.poster.type === POSTER_MIME ? probed.poster : new Blob([probed.poster], { type: POSTER_MIME });
    poster = { id: await target.assets.put(p), name: `${file.name}.jpg`, mime: POSTER_MIME, size: p.size };
  }
  // Vérifié après la dernière attente (sonde, `put`), juste avant le premier appel au moteur.
  if (target.alive?.() === false) {
    await ctx.notify(`${file.name} : ${MEDIA_TAB_CLOSED}`);
    return "failed";
  }
  const { w, h } = mediaType === "audio" ? AUDIO_BOX : { w: probed.width, h: probed.height };
  const rect = target.stageRect();
  const camera = target.camera();
  const change = target.run({
    type: "AddMedia",
    page: target.page(),
    asset,
    linked,
    mediaType,
    w,
    h,
    duration: probed.duration,
    poster,
    matrix: placement(w, h, anchorOf(rect, camera, ctx.at), visibleOf(rect, camera), ctx.inserted),
  });
  return change === null ? "failed" : "inserted";
}

/**
 * Entrée `media` du registre (C14, M13 à M15) : reconnue par ses octets, avant `image` ; 100 Mo au plus inclus (au-delà,
 * `MEDIA_TOO_BIG` avant toute lecture). Avec `linkMedia` (coque), un fichier qui a un chemin et dépasse 50 Mo passe par
 * `link` : `importFiles` l'appelle avant le plafond et sans jamais lire le fichier.
 */
export function mediaHandler(deps: MediaHandlerDeps): ImportHandler {
  const linkMedia = deps.linkMedia?.bind(deps);
  return {
    id: "media",
    nature: "objet",
    detect: (head, name) => supported(head, name) !== null,
    limit: { maxBytes: MEDIA_PASTE_MAX_BYTES, message: MEDIA_TOO_BIG },
    ...(linkMedia === undefined
      ? {}
      : {
          link: {
            aboveBytes: MEDIA_INCLUDE_MAX_BYTES,
            async run(file: DroppedFile, path: string, ctx: Omit<ImportContext, "blob">): Promise<ImportOutcome> {
              const sniff = supported(ctx.head, file.name);
              const target = ctx.target;
              if (sniff === null || target === null) return "failed";
              if (!canLink(target.assets)) {
                await ctx.notify(`${file.name} : ${MEDIA_TOO_BIG}`);
                return "failed";
              }
              try {
                let linked: LinkedMedia;
                try {
                  linked = await linkMedia(path);
                } catch (e) {
                  await ctx.notify(`${file.name} : ${MEDIA_NOT_LINKED} : ${messageOf(e)}`);
                  return "failed";
                }
                let probed: MediaProbe;
                try {
                  probed = await deps.probe(linked.url);
                } catch {
                  await ctx.notify(`${file.name} : ${CODEC_UNREADABLE}`);
                  return "failed";
                }
                target.assets.link(linked.id, path);
                const asset: AssetRef = { id: linked.id, name: file.name, mime: sniff.mime, size: file.size };
                const outcome = await addMedia(file, sniff, ctx, target, probed, asset, path);
                if (outcome === "inserted") await ctx.notify(`${file.name} : ${MEDIA_LINKED_NOTE}`);
                return outcome;
              } catch (e) {
                await ctx.notify(`Import impossible (${file.name}) : ${messageOf(e)}`);
                return "failed";
              }
            },
          },
        }),
    async run(file, ctx) {
      const sniff = supported(ctx.head, file.name);
      const target = ctx.target;
      if (sniff === null || target === null) return "failed";
      try {
        // R3 : la coque rend un Blob sans type ; retypé par les octets, comme `imageHandler`.
        const blob = ctx.blob.type === sniff.mime ? ctx.blob : new Blob([ctx.blob], { type: sniff.mime });
        const url = deps.urls.create(blob);
        let probed: MediaProbe;
        try {
          probed = await deps.probe(url);
        } catch {
          await ctx.notify(`${file.name} : ${CODEC_UNREADABLE}`);
          return "failed";
        } finally {
          deps.urls.revoke(url);
        }
        const id = await target.assets.put(blob);
        return await addMedia(file, sniff, ctx, target, probed, { id, name: file.name, mime: sniff.mime, size: blob.size }, null);
      } catch (e) {
        await ctx.notify(`Import impossible (${file.name}) : ${messageOf(e)}`);
        return "failed";
      }
    },
  };
}
