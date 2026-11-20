/**
 * Mise en lignes du texte (D14, CL4-4, CL4-5, C7) : une seule implémentation (`layoutRich`) pour la hauteur de boîte
 * envoyée au cœur (outil Texte) et pour le rendu (Canvas 2D) ; `layoutText` en est le cas d'un seul segment sans
 * attribut. Coupure gloutonne aux espaces, un mot peut traverser plusieurs segments, mot trop long coupé par graphème.
 */
import type { TextAttrs, TextSpan } from "../core/api";

export const TEXT_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif';
export const TEXT_SIZES: readonly number[] = [24, 36, 48, 72];
export const DEFAULT_TEXT_SIZE = 36;
export const TEXT_LINE_HEIGHT = 1.25;
export const DEFAULT_TEXT_BOX_WIDTH = 600;

/** Gras, italique, police d'un segment (C7) ; absente : le style du socle. */
export interface Face {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly font?: string;
}

/** `[italic ][bold ]<taille>px <famille>` ; une police nommée passe devant Atkinson, qui reste le repli (T15, D27). */
export const textFont = (size: number, face?: Face): string =>
  `${face?.italic ? "italic " : ""}${face?.bold ? "bold " : ""}${size}px ${face?.font ? `"${face.font}", ${TEXT_FONT_FAMILY}` : TEXT_FONT_FAMILY}`;

/** Largeur d'un texte à une taille et une face, en unités monde (= px CSS de la police à cette taille). */
export type Measure = (text: string, size: number, face?: Face) => number;

/** Mesure par un contexte 2D : la même police que le rendu, puis `measureText`. */
export const measureWith =
  (ctx: CanvasRenderingContext2D): Measure =>
  (text, size, face) => {
    ctx.font = textFont(size, face);
    return ctx.measureText(text).width;
  };

let cache: { readonly ctor: typeof Intl.Segmenter; readonly seg: Intl.Segmenter } | null = null;

/** Graphèmes (emoji ZWJ, drapeaux, teintes entiers) ; repli par points de code sans Intl.Segmenter. */
export function graphemes(s: string): string[] {
  const ctor = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!ctor) return Array.from(s);
  if (cache?.ctor !== ctor) cache = { ctor, seg: new ctor(undefined, { granularity: "grapheme" }) };
  return Array.from(cache.seg.segment(s), (x) => x.segment);
}

/** Style résolu d'un segment (T3) : `color` null = couleur de l'élément, `font` null = police du socle. */
export interface SegmentStyle {
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly font: string | null;
  readonly color: string | null;
}
export interface RichSegment {
  readonly text: string;
  readonly style: SegmentStyle;
  readonly x: number;
  readonly width: number;
}
export interface RichLine {
  readonly segments: readonly RichSegment[];
  readonly top: number;
  readonly height: number;
  /** Plus grande taille de la ligne (taille du `\n` ou de l'élément pour une ligne vide). */
  readonly size: number;
}

export const styleOf = (attrs: TextAttrs, base: { readonly size: number }): SegmentStyle => ({
  size: attrs.size ?? base.size,
  bold: attrs.bold === true,
  italic: attrs.italic === true,
  underline: attrs.underline === true,
  font: attrs.font ?? null,
  color: attrs.color ?? null,
});

const sameStyle = (a: SegmentStyle, b: SegmentStyle): boolean =>
  a.size === b.size && a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.font === b.font && a.color === b.color;

/** Face mesurée et dessinée ; undefined pour le style du socle (même police, même mesure qu'au socle). */
export const faceOf = (s: SegmentStyle): Face | undefined =>
  s.bold || s.italic || s.font !== null ? { bold: s.bold, italic: s.italic, ...(s.font !== null ? { font: s.font } : {}) } : undefined;

interface Piece {
  readonly text: string;
  readonly style: SegmentStyle;
}

/** Concatène en fusionnant les voisins de même style (un seul segment sans attribut = une seule mesure, comme au socle). */
function append(pieces: readonly Piece[], more: readonly Piece[]): Piece[] {
  const out = [...pieces];
  for (const p of more) {
    if (p.text === "") continue;
    const last = out[out.length - 1];
    if (last && sameStyle(last.style, p.style)) out[out.length - 1] = { text: last.text + p.text, style: last.style };
    else out.push(p);
  }
  return out;
}

const textOf = (pieces: readonly Piece[]): string => pieces.map((p) => p.text).join("");

function trimEnd(pieces: readonly Piece[]): Piece[] {
  const out = [...pieces];
  for (let last = out[out.length - 1]; last; last = out[out.length - 1]) {
    const t = last.text.trimEnd();
    if (t !== "") {
      out[out.length - 1] = { text: t, style: last.style };
      break;
    }
    out.pop();
  }
  return out;
}

const widthOf = (pieces: readonly Piece[], measure: Measure): number =>
  pieces.reduce((w, p) => w + measure(p.text, p.style.size, faceOf(p.style)), 0);

const graphemePieces = (pieces: readonly Piece[]): Piece[] => pieces.flatMap((p) => graphemes(p.text).map((g) => ({ text: g, style: p.style })));

/** Morceaux de [a, b) (unités UTF-16 du paragraphe) ; les bornes tombent aux espaces, jamais dans une paire. */
function slicePieces(pieces: readonly Piece[], a: number, b: number): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  for (const p of pieces) {
    const s = Math.max(a, at);
    const e = Math.min(b, at + p.text.length);
    if (s < e) out.push({ text: p.text.slice(s - at, e - at), style: p.style });
    at += p.text.length;
  }
  return out;
}

interface Paragraph {
  readonly pieces: readonly Piece[];
  /** Taille du `\n` qui termine le paragraphe ; null pour le dernier. */
  readonly end: number | null;
}

function paragraphs(spans: readonly TextSpan[], base: { readonly size: number }): Paragraph[] {
  const out: Paragraph[] = [];
  let current: Piece[] = [];
  for (const span of spans) {
    const style = styleOf(span.attrs, base);
    span.text.split("\n").forEach((part, i) => {
      if (i > 0) {
        out.push({ pieces: current, end: style.size });
        current = [];
      }
      current = append(current, [{ text: part, style }]);
    });
  }
  out.push({ pieces: current, end: null });
  return out;
}

/** La boucle de `layoutText` du socle, sur des morceaux stylés : mêmes coupures pour un seul segment sans attribut. */
function breakParagraph(pieces: readonly Piece[], boxWidth: number, measure: Measure): Piece[][] {
  const out: Piece[][] = [];
  let line: Piece[] = [];
  let at = 0;
  for (const token of textOf(pieces).split(/(\s+)/)) {
    const range = slicePieces(pieces, at, at + token.length);
    at += token.length;
    if (token === "") continue;
    const candidate = append(line, range);
    if (line.length === 0 || widthOf(trimEnd(candidate), measure) <= boxWidth) {
      line = candidate;
    } else {
      out.push(trimEnd(line));
      line = /^\s+$/.test(token) ? [] : range;
    }
    while (graphemePieces(trimEnd(line)).length > 1 && widthOf(trimEnd(line), measure) > boxWidth) {
      // par graphème (jamais au milieu d'un emoji) ; recherche dichotomique : la largeur croît avec le préfixe
      const points = graphemePieces(line);
      let lo = 1;
      let hi = points.length - 1;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (widthOf(append([], points.slice(0, mid)), measure) > boxWidth) hi = mid - 1;
        else lo = mid;
      }
      out.push(append([], points.slice(0, lo)));
      line = append([], points.slice(lo));
    }
  }
  out.push(trimEnd(line));
  return out;
}

function toLine(pieces: readonly Piece[], top: number, emptySize: number, measure: Measure): RichLine {
  let x = 0;
  const segments = pieces.map((p): RichSegment => {
    const width = measure(p.text, p.style.size, faceOf(p.style));
    const s = { text: p.text, style: p.style, x, width };
    x += width;
    return s;
  });
  const size = pieces.length === 0 ? emptySize : Math.max(...pieces.map((p) => p.style.size));
  return { segments, top, height: size * TEXT_LINE_HEIGHT, size };
}

/** Lignes d'un texte riche (T9) : hauteur = plus grande taille × 1,25 ; ligne vide = taille du `\n`, sinon de l'élément. */
export function layoutRich(spans: readonly TextSpan[], base: { readonly size: number }, boxWidth: number, measure: Measure): RichLine[] {
  const lines: RichLine[] = [];
  let top = 0;
  for (const para of paragraphs(spans, base)) {
    const broken = breakParagraph(para.pieces, boxWidth, measure);
    broken.forEach((pieces, i) => {
      const empty = i === broken.length - 1 && para.end !== null ? para.end : base.size;
      const line = toLine(pieces, top, empty, measure);
      lines.push(line);
      top += line.height;
    });
  }
  return lines;
}

export function layoutText(content: string, size: number, boxWidth: number, measure: Measure): string[] {
  return layoutRich([{ text: content, attrs: {} }], { size }, boxWidth, measure).map((l) => l.segments.map((s) => s.text).join(""));
}

export const textBoxHeight = (lines: number, size: number): number => Math.max(1, lines) * size * TEXT_LINE_HEIGHT;

/** Hauteur de boîte d'un texte riche : somme des lignes (au moins une, `layoutRich` en rend toujours une). */
export const richBoxHeight = (lines: readonly RichLine[]): number => lines.reduce((h, l) => h + l.height, 0);
