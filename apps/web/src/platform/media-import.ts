/**
 * Module média (C14, M10, M12, M15, M16) : reconnaissance par octets magiques, sonde (durée, taille, poster) et
 * refus des formats MKV et AVI. Aucune conversion, aucun décodeur embarqué : le navigateur lit ou ne lit pas.
 */
import type { ImportHandler } from "./import";

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
    if (IMAGE_BRANDS.has(brand)) return null;
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
