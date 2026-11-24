/**
 * Tailles d'images lues dans l'en-tête (cadrage cli-lot4, D63, D64, DA19) : GIF, WebP (VP8, VP8L, VP8X), BMP (info et
 * core), ICO (plus grande entrée), AVIF et HEIC (`ispe` de l'élément principal), SVG (taille que le navigateur donne).
 * Lecteurs purs, sans DOM ni décodeur, appelés par `probeSize` (page, CLI, tableaux blancs) ; null : illisible.
 * H43 : rotation `irot` non appliquée.
 */
import type { ImageKind } from "./image-decode";

export type HeaderKind = Exclude<ImageKind, "png" | "jpeg">;
type Size = { readonly w: number; readonly h: number };

export const at = (b: Uint8Array, i: number): number => b[i] ?? 0;
export const ascii = (b: Uint8Array, from: number, to: number): string => {
  let s = "";
  for (let i = from; i < to && i < b.length; i++) s += String.fromCharCode(at(b, i));
  return s;
};
export const u16le = (b: Uint8Array, i: number): number => at(b, i) | (at(b, i + 1) << 8);
const u24le = (b: Uint8Array, i: number): number => u16le(b, i) | (at(b, i + 2) << 16);
export const u32le = (b: Uint8Array, i: number): number => (u24le(b, i) | (at(b, i + 3) << 24)) >>> 0;
const i32le = (b: Uint8Array, i: number): number => u24le(b, i) | (at(b, i + 3) << 24);
export const u16be = (b: Uint8Array, i: number): number => (at(b, i) << 8) | at(b, i + 1);
export const u32be = (b: Uint8Array, i: number): number => ((at(b, i) << 24) | (at(b, i + 1) << 16) | (at(b, i + 2) << 8) | at(b, i + 3)) >>> 0;
const sized = (w: number, h: number): Size | null => (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { w, h } : null);

function gifSize(b: Uint8Array): Size | null {
  return b.length < 10 ? null : sized(u16le(b, 6), u16le(b, 8));
}

function webpSize(b: Uint8Array): Size | null {
  if (b.length < 25 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 12) !== "WEBP") return null;
  const chunk = ascii(b, 12, 16);
  if (chunk === "VP8 ") {
    if (b.length < 30 || at(b, 23) !== 0x9d || at(b, 24) !== 0x01 || at(b, 25) !== 0x2a) return null;
    return sized(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  }
  if (chunk === "VP8L") {
    if (at(b, 20) !== 0x2f) return null;
    const v = u32le(b, 21);
    return sized((v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8X") return b.length < 30 ? null : sized(u24le(b, 24) + 1, u24le(b, 27) + 1);
  return null;
}

function bmpSize(b: Uint8Array): Size | null {
  if (b.length < 26 || ascii(b, 0, 2) !== "BM") return null;
  const dib = u32le(b, 14);
  if (dib === 12) return sized(u16le(b, 18), u16le(b, 20));
  return dib >= 40 ? sized(Math.abs(i32le(b, 18)), Math.abs(i32le(b, 22))) : null;
}

function icoSize(b: Uint8Array): Size | null {
  if (b.length < 6 || u16le(b, 0) !== 0 || u16le(b, 2) !== 1) return null;
  let best: Size | null = null;
  for (let i = 0; i < u16le(b, 4); i++) {
    const e = 6 + 16 * i;
    if (e + 16 > b.length) break;
    const w = at(b, e) || 256;
    const h = at(b, e + 1) || 256;
    if (best === null || w * h > best.w * best.h) best = { w, h };
  }
  return best;
}

export interface IsoBox {
  readonly type: string;
  /** Début du contenu (après la taille, le type et la taille longue éventuelle). */
  readonly start: number;
  readonly end: number;
}

/** Boîtes ISO (ISOBMFF) de `b` entre `from` et `to` ; une boîte qui dépasse `to` est rendue jusqu'à `to` (en-tête
 *  tronqué), puis le parcours s'arrête ; taille 0 : jusqu'à `to`. */
export function* isoBoxes(b: Uint8Array, from: number, to: number): Generator<IsoBox> {
  let i = from;
  while (i + 8 <= to) {
    let size = u32be(b, i);
    const type = ascii(b, i + 4, i + 8);
    let head = 8;
    if (size === 1) {
      if (i + 16 > to) return;
      size = u32be(b, i + 8) * 2 ** 32 + u32be(b, i + 12);
      head = 16;
    } else if (size === 0) size = to - i;
    if (size < head) return;
    if (i + size > to) {
      yield { type, start: i + head, end: to };
      return;
    }
    yield { type, start: i + head, end: i + size };
    i += size;
  }
}

const childOf = (b: Uint8Array, parent: IsoBox, type: string, skip = 0): IsoBox | null => {
  for (const x of isoBoxes(b, parent.start + skip, parent.end)) if (x.type === type) return x;
  return null;
};

/** AVIF, HEIC : `ispe` associé à l'élément principal (`pitm`, `ipma`), sinon le plus grand `ispe`. */
function heifSize(b: Uint8Array): Size | null {
  let meta: IsoBox | null = null;
  for (const x of isoBoxes(b, 0, b.length)) if (x.type === "meta") meta = x;
  if (meta === null) return null;
  const pitm = childOf(b, meta, "pitm", 4); // `meta` est une boîte pleine : version et drapeaux d'abord
  const iprp = childOf(b, meta, "iprp", 4);
  const ipco = iprp === null ? null : childOf(b, iprp, "ipco");
  if (iprp === null || ipco === null) return null;
  const props = [...isoBoxes(b, ipco.start, ipco.end)];
  const ispeOf = (p: IsoBox | undefined): Size | null =>
    p !== undefined && p.type === "ispe" && p.end - p.start >= 12 ? sized(u32be(b, p.start + 4), u32be(b, p.start + 8)) : null;
  const ipma = childOf(b, iprp, "ipma");
  if (pitm !== null && ipma !== null) {
    const primary = at(b, pitm.start) === 0 ? u16be(b, pitm.start + 4) : u32be(b, pitm.start + 4);
    const version = at(b, ipma.start);
    const wide = (at(b, ipma.start + 3) & 1) === 1;
    let i = ipma.start + 8;
    const count = u32be(b, ipma.start + 4);
    for (let e = 0; e < count && i < ipma.end; e++) {
      const item = version < 1 ? u16be(b, i) : u32be(b, i);
      i += version < 1 ? 2 : 4;
      const n = at(b, i);
      i += 1;
      for (let k = 0; k < n; k++) {
        const index = wide ? u16be(b, i) & 0x7fff : at(b, i) & 0x7f;
        i += wide ? 2 : 1;
        if (item === primary) {
          const s = ispeOf(props[index - 1]);
          if (s !== null) return s;
        }
      }
    }
  }
  let best: Size | null = null;
  for (const p of props) {
    const s = ispeOf(p);
    if (s !== null && (best === null || s.w * s.h > best.w * best.h)) best = s;
  }
  return best;
}

/** Unités absolues en px CSS (D64) ; `em` = 16 px. */
const UNITS: Readonly<Record<string, number>> = Object.freeze({ "": 1, px: 1, pt: 4 / 3, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, em: 16 });

function lengthOf(v: string | undefined): number | null {
  if (v === undefined) return null;
  if (v.length > 64) return null;
  const m = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(v);
  if (m === null) return null;
  const unit = (m[2] ?? "").toLowerCase();
  if (!Object.hasOwn(UNITS, unit)) return null;
  const n = Number(m[1]) * (UNITS[unit] ?? Number.NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function attributesOf(tag: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of tag.matchAll(/(?<=\s)([A-Za-z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out.set((m[1] ?? "").toLowerCase(), m[2] ?? m[3] ?? "");
  return out;
}

const ROOT_MAX = 8192;

/** Attributs de la balise racine `<svg …>` (borné à `ROOT_MAX` signes, parcours linéaire) ; null : aucune balise. */
function rootTag(text: string): string | null {
  const open = /<svg(?=[\s>/])/gi;
  const m = open.exec(text);
  if (m === null) return null;
  const from = m.index + 4;
  const close = text.indexOf(">", from);
  return close < 0 || close - from > ROOT_MAX ? null : text.slice(from, close);
}

/**
 * Taille d'un SVG comme le navigateur la donne (D64, mesures Chrome 151) : `width` et `height` absolus ; une seule
 * dimension : l'autre par le `viewBox`, sinon le défaut du navigateur (300 de large, 150 de haut) ; aucune : `viewBox` →
 * 300 × 300·h/w, sinon 300 × 150. `%` n'est pas absolu. Arrondi au pixel.
 */
function svgSize(b: Uint8Array): Size | null {
  const root = rootTag(new TextDecoder("utf-8").decode(b));
  if (root === null) return null;
  const a = attributesOf(root);
  const w = lengthOf(a.get("width"));
  const h = lengthOf(a.get("height"));
  const vb = (a.get("viewbox") ?? "").trim().split(/[\s,]+/).map(Number);
  const vw = vb[2] ?? 0;
  const vh = vb[3] ?? 0;
  const ratio = vb.length === 4 && vb.every(Number.isFinite) && vw > 0 && vh > 0 ? vh / vw : null;
  let size: [number, number];
  if (w !== null && h !== null) size = [w, h];
  else if (w !== null) size = [w, ratio === null ? 150 : w * ratio];
  else if (h !== null) size = [ratio === null ? 300 : h / ratio, h];
  else size = ratio === null ? [300, 150] : [300, 300 * ratio];
  return sized(Math.max(1, Math.round(size[0])), Math.max(1, Math.round(size[1])));
}

/** Taille lue dans l'en-tête de `bytes` (le premier Mio suffit) ; null : illisible. */
export function headerSize(bytes: Uint8Array, kind: HeaderKind): Size | null {
  switch (kind) {
    case "gif":
      return gifSize(bytes);
    case "webp":
      return webpSize(bytes);
    case "bmp":
      return bmpSize(bytes);
    case "ico":
      return icoSize(bytes);
    case "avif":
    case "heic":
      return heifSize(bytes);
    case "svg":
      return svgSize(bytes);
  }
}
