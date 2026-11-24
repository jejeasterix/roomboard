/**
 * Durée et taille d'un média lues dans l'en-tête (cadrage cli-lot4, D61, DA18) : MP4, MOV, M4A, M4V (`mvhd`, `tkhd` de la
 * première piste vidéo), WebM (`Info`, `Tracks`, sinon dernier `Cluster` + dernier bloc), WAV (`fmt `, `data`), Ogg
 * (Vorbis, Opus, Theora : dernière granule), MP3 (`Xing`, `Info`, `VBRI`, sinon débit constant du premier cadre, H42).
 * Module pur, sans DOM ni dépendance, à côté de `sniffMedia` ; la page n'en dépend pas, la CLI l'injecte comme `probe`
 * (DA20). Durée arrondie au ms comme `probeMedia` ; vidéo si `width > 0` (règle M16 d'`addMedia`). null : illisible.
 */
import type { MediaFormat } from "./media-import";
import { isoBoxes, type IsoBox } from "./image-size";

export interface MediaHeader {
  /** Secondes, arrondies au ms. */
  readonly duration: number;
  /** 0 × 0 : son. */
  readonly width: number;
  readonly height: number;
}

const at = (b: Uint8Array, i: number): number => b[i] ?? 0;
const ascii = (b: Uint8Array, from: number, to: number): string => {
  let s = "";
  for (let i = from; i < to && i < b.length; i++) s += String.fromCharCode(at(b, i));
  return s;
};
const u16le = (b: Uint8Array, i: number): number => at(b, i) | (at(b, i + 1) << 8);
const u32le = (b: Uint8Array, i: number): number => (u16le(b, i) | (at(b, i + 2) << 16) | (at(b, i + 3) << 24)) >>> 0;
const u16be = (b: Uint8Array, i: number): number => (at(b, i) << 8) | at(b, i + 1);
const u24be = (b: Uint8Array, i: number): number => (at(b, i) << 16) | u16be(b, i + 1);
const u32be = (b: Uint8Array, i: number): number => ((at(b, i) << 24) | u24be(b, i + 1)) >>> 0;
const u64be = (b: Uint8Array, i: number): number => u32be(b, i) * 2 ** 32 + u32be(b, i + 4);
const uintBe = (b: Uint8Array, i: number, n: number): number => {
  let v = 0;
  for (let k = 0; k < n; k++) v = v * 256 + at(b, i + k);
  return v;
};
const i16be = (b: Uint8Array, i: number): number => {
  const v = u16be(b, i);
  return v >= 0x8000 ? v - 0x10000 : v;
};
const found = (seconds: number, width = 0, height = 0): MediaHeader | null =>
  Number.isFinite(seconds) && seconds > 0 ? { duration: Math.round(seconds * 1000) / 1000, width, height } : null;

function mvhdSeconds(b: Uint8Array, x: IsoBox): number | null {
  const v1 = at(b, x.start) === 1;
  if (x.end - x.start < (v1 ? 32 : 20)) return null;
  const scale = u32be(b, x.start + (v1 ? 20 : 12));
  const units = v1 ? u64be(b, x.start + 24) : u32be(b, x.start + 16);
  return scale > 0 ? units / scale : null;
}

function videoSize(b: Uint8Array, trak: IsoBox): { readonly width: number; readonly height: number } | null {
  let tkhd: IsoBox | null = null;
  let video = false;
  for (const x of isoBoxes(b, trak.start, trak.end)) {
    if (x.type === "tkhd") tkhd = x;
    else if (x.type === "mdia") for (const y of isoBoxes(b, x.start, x.end)) if (y.type === "hdlr" && ascii(b, y.start + 8, y.start + 12) === "vide") video = true;
  }
  if (!video || tkhd === null) return null;
  const w = tkhd.start + (at(b, tkhd.start) === 1 ? 88 : 76);
  if (w + 8 > tkhd.end) return null;
  const width = Math.round(u32be(b, w) / 65536);
  const height = Math.round(u32be(b, w + 4) / 65536);
  return width > 0 && height > 0 ? { width, height } : null;
}

function isoHeader(b: Uint8Array): MediaHeader | null {
  let moov: IsoBox | null = null;
  for (const x of isoBoxes(b, 0, b.length)) if (x.type === "moov") moov = x;
  if (moov === null) return null;
  let seconds: number | null = null;
  let size: { readonly width: number; readonly height: number } | null = null;
  for (const x of isoBoxes(b, moov.start, moov.end)) {
    if (x.type === "mvhd") seconds = mvhdSeconds(b, x);
    else if (x.type === "trak" && size === null) size = videoSize(b, x);
  }
  return seconds === null ? null : found(seconds, size?.width ?? 0, size?.height ?? 0);
}

function wavHeader(b: Uint8Array): MediaHeader | null {
  if (ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 12) !== "WAVE") return null;
  let byteRate = 0;
  let i = 12;
  while (i + 8 <= b.length) {
    const id = ascii(b, i, i + 4);
    const size = u32le(b, i + 4);
    if (id === "fmt " && size >= 16 && i + 20 <= b.length) byteRate = u32le(b, i + 16);
    if (id === "data") {
      const data = Math.min(size, b.length - i - 8);
      return byteRate > 0 ? found(data / byteRate) : null;
    }
    i += 8 + size + (size & 1);
  }
  return null;
}

/** Éléments maîtres de WebM parcourus en profondeur : Segment, Info, Tracks, TrackEntry, Video, Cluster, BlockGroup. */
const EBML_MASTERS: ReadonlySet<number> = new Set([0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0, 0x1f43b675, 0xa0]);

/** Entier à longueur variable d'EBML ; `id` : marqueur gardé ; taille « inconnue » (tous les bits à 1) : -1. */
function vint(b: Uint8Array, i: number, id: boolean): { readonly value: number; readonly length: number } | null {
  const first = at(b, i);
  if (first === 0 || i >= b.length) return null;
  const length = Math.clz32(first) - 23;
  if (i + length > b.length) return null;
  let value = id ? first : first & (0xff >> length);
  let ones = value === 0xff >> length;
  for (let k = 1; k < length; k++) {
    const x = at(b, i + k);
    value = value * 256 + x;
    if (x !== 0xff) ones = false;
  }
  return { value: !id && ones ? -1 : value, length };
}

/**
 * WebM, parcours à plat : un maître n'est pas sauté (ses enfants suivent), ce qui lit aussi les `Segment` et `Cluster` de
 * taille inconnue (MediaRecorder). `Duration` (unités de `TimecodeScale` ns), sinon dernier temps de cluster + dernier bloc.
 */
function webmHeader(b: Uint8Array): MediaHeader | null {
  let scale = 1_000_000;
  let duration: number | null = null;
  let width = 0;
  let height = 0;
  let cluster = 0;
  let last: number | null = null;
  let i = 0;
  while (i < b.length) {
    const id = vint(b, i, true);
    if (id === null) break;
    const size = vint(b, i + id.length, false);
    if (size === null) break;
    const data = i + id.length + size.length;
    if (EBML_MASTERS.has(id.value)) {
      i = data;
      continue;
    }
    if (size.value < 0 || data + size.value > b.length) break;
    const n = size.value;
    if (id.value === 0x2ad7b1) scale = uintBe(b, data, n);
    else if (id.value === 0x4489 && (n === 4 || n === 8)) {
      const v = new DataView(b.buffer, b.byteOffset + data, n);
      duration = n === 4 ? v.getFloat32(0) : v.getFloat64(0);
    } else if (id.value === 0xb0 && width === 0) width = uintBe(b, data, n);
    else if (id.value === 0xba && height === 0) height = uintBe(b, data, n);
    else if (id.value === 0xe7) cluster = uintBe(b, data, n);
    else if (id.value === 0xa3 || id.value === 0xa1) {
      const track = vint(b, data, false);
      if (track !== null && track.length + 2 <= n) last = cluster + i16be(b, data + track.length);
    }
    i = data + n;
  }
  const units = duration ?? last;
  return units === null ? null : found((units * scale) / 1e9, width, height);
}

/** Ogg : codec du premier paquet du premier flux, dernière granule de ce flux ; Vorbis, Opus, Theora seulement (H42). */
function oggHeader(b: Uint8Array): MediaHeader | null {
  let serial: number | null = null;
  let codec: "vorbis" | "opus" | "theora" | null = null;
  let rate = 0;
  let preSkip = 0;
  let width = 0;
  let height = 0;
  let frn = 0;
  let frd = 0;
  let shift = 0;
  let granule: number | null = null;
  let i = 0;
  while (i + 27 <= b.length && ascii(b, i, i + 4) === "OggS") {
    const segments = at(b, i + 26);
    let body = 0;
    for (let k = 0; k < segments; k++) body += at(b, i + 27 + k);
    const p = i + 27 + segments;
    if (p + body > b.length) break;
    const s = u32le(b, i + 14);
    if (serial === null) {
      serial = s;
      if (ascii(b, p, p + 7) === "\x01vorbis") {
        codec = "vorbis";
        rate = u32le(b, p + 12);
      } else if (ascii(b, p, p + 8) === "OpusHead") {
        codec = "opus";
        rate = 48000;
        preSkip = u16le(b, p + 10);
      } else if (ascii(b, p, p + 7) === "\x80theora") {
        codec = "theora";
        width = u24be(b, p + 14);
        height = u24be(b, p + 17);
        frn = u32be(b, p + 22);
        frd = u32be(b, p + 26);
        shift = (u16be(b, p + 40) >> 5) & 0x1f;
      } else return null;
    } else if (s === serial) {
      const lo = u32le(b, i + 6);
      const hi = u32le(b, i + 10);
      if (!(lo === 0xffffffff && hi === 0xffffffff)) granule = hi * 2 ** 32 + lo;
    }
    i = p + body;
  }
  if (codec === null || granule === null) return null;
  if (codec === "theora") {
    if (frn === 0 || frd === 0) return null;
    const unit = 2 ** shift;
    const frames = Math.floor(granule / unit) + (granule % unit);
    return found((frames * frd) / frn, width, height);
  }
  return rate > 0 ? found((granule - preSkip) / rate) : null;
}

/** Débits en kbit/s par couche (1 à 3), MPEG-1 puis MPEG-2 et 2.5 ; fréquences par version (bits 0 : 2.5, 2 : 2, 3 : 1). */
const KBPS_MPEG1: readonly (readonly number[])[] = [
  [],
  [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
];
const KBPS_MPEG2: readonly (readonly number[])[] = [
  [],
  [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
];
const MP3_RATES: readonly (readonly number[])[] = [[11025, 12000, 8000], [], [22050, 24000, 16000], [44100, 48000, 32000]];

interface Mp3Frame {
  readonly mpeg1: boolean;
  readonly layer: number;
  readonly rate: number;
  readonly kbps: number;
  readonly samples: number;
  readonly mono: boolean;
}

function mp3Frame(b: Uint8Array, i: number): Mp3Frame | null {
  if (at(b, i) !== 0xff || (at(b, i + 1) & 0xe0) !== 0xe0 || i + 4 > b.length) return null;
  const version = (at(b, i + 1) >> 3) & 3;
  const layerBits = (at(b, i + 1) >> 1) & 3;
  const index = at(b, i + 2) >> 4;
  const rateIndex = (at(b, i + 2) >> 2) & 3;
  if (version === 1 || layerBits === 0 || index === 0 || index === 15 || rateIndex === 3) return null;
  const layer = 4 - layerBits;
  const mpeg1 = version === 3;
  const kbps = (mpeg1 ? KBPS_MPEG1 : KBPS_MPEG2)[layer]?.[index] ?? 0;
  const rate = MP3_RATES[version]?.[rateIndex] ?? 0;
  const samples = layer === 1 ? 384 : layer === 2 ? 1152 : mpeg1 ? 1152 : 576;
  return kbps > 0 && rate > 0 ? { mpeg1, layer, rate, kbps, samples, mono: at(b, i + 3) >> 6 === 3 } : null;
}

/** MP3 : balise ID3v2 sautée, premier cadre valide dans les 64 Kio suivants ; `Xing`/`Info`, `VBRI`, sinon débit constant. */
function mp3Header(b: Uint8Array): MediaHeader | null {
  let start = 0;
  if (ascii(b, 0, 3) === "ID3" && b.length >= 10) {
    const size = ((at(b, 6) & 0x7f) << 21) | ((at(b, 7) & 0x7f) << 14) | ((at(b, 8) & 0x7f) << 7) | (at(b, 9) & 0x7f);
    start = 10 + size + ((at(b, 5) & 0x10) !== 0 ? 10 : 0);
  }
  const limit = Math.min(b.length - 4, start + 65536);
  let i = start;
  let f: Mp3Frame | null = null;
  for (; i < limit; i++) {
    f = mp3Frame(b, i);
    if (f !== null) break;
  }
  if (f === null) return null;
  const side = f.mpeg1 ? (f.mono ? 17 : 32) : f.mono ? 9 : 17;
  const x = i + 4 + side;
  const tag = ascii(b, x, x + 4);
  if (f.layer === 3 && (tag === "Xing" || tag === "Info") && (u32be(b, x + 4) & 1) === 1 && x + 12 <= b.length) return found((u32be(b, x + 8) * f.samples) / f.rate);
  if (ascii(b, i + 36, i + 40) === "VBRI" && i + 54 <= b.length) return found((u32be(b, i + 50) * f.samples) / f.rate);
  let end = b.length;
  if (end - 128 >= i && ascii(b, end - 128, end - 125) === "TAG") end -= 128;
  return found(((end - i) * 8) / (f.kbps * 1000));
}

/** Durée (et taille d'une vidéo) lue dans l'en-tête de `bytes` (le fichier entier : WebM, Ogg et MP3 lisent la fin). */
export function readMediaHeader(bytes: Uint8Array, format: MediaFormat): MediaHeader | null {
  switch (format) {
    case "mp4":
    case "mov":
    case "m4a":
      return isoHeader(bytes);
    case "webm":
      return webmHeader(bytes);
    case "wav":
      return wavHeader(bytes);
    case "ogg":
      return oggHeader(bytes);
    case "mp3":
      return mp3Header(bytes);
  }
}
