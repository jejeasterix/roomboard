// Texte riche par plages côté page (C7, cadrage T4 à T7) : seule copie TS des règles du cœur
// (`crates/roomboard-core/src/rich_text.rs`), pour la fausse liaison et l'outil Texte ; D33 : le contrat compare les
// deux. Différence en points de code (`Array.from`), positions de FormatText en unités UTF-16.
import type { TextAttrs, TextAttrsPatch, TextSpan } from "./api";

/** Clés des attributs d'un segment (`TextAttrs`), partagées avec le style résolu de `text-layout.ts`. */
export const TEXT_ATTR_KEYS = ["bold", "italic", "underline", "color", "size", "font"] as const;

export const plainSpans = (content: string): TextSpan[] => [{ text: content, attrs: {} }];

export const sameAttrs = (a: TextAttrs, b: TextAttrs): boolean => TEXT_ATTR_KEYS.every((k) => a[k] === b[k]);

interface Char {
  readonly ch: string;
  readonly attrs: TextAttrs;
}

const charsOf = (spans: readonly TextSpan[]): Char[] => spans.flatMap((s) => Array.from(s.text, (ch) => ({ ch, attrs: s.attrs })));

/** Voisins aux attributs égaux fusionnés ; aucun caractère : un segment vide sans attribut (comme `read_spans`). */
function spansOf(chars: readonly Char[]): TextSpan[] {
  const out: TextSpan[] = [];
  for (const c of chars) {
    const last = out[out.length - 1];
    if (last && sameAttrs(last.attrs, c.attrs)) out[out.length - 1] = { text: last.text + c.ch, attrs: last.attrs };
    else out.push({ text: c.ch, attrs: c.attrs });
  }
  return out.length === 0 ? plainSpans("") : out;
}

/**
 * Segments après `SetText` (T4, T5) : plus long préfixe commun, puis plus long suffixe commun des restes, en points de
 * code ; le milieu neuf prend les attributs du caractère qui le précède, aucun en tête.
 */
export function editSpans(spans: readonly TextSpan[], content: string): TextSpan[] {
  const old = charsOf(spans);
  const fresh = Array.from(content);
  let p = 0;
  while (p < old.length && p < fresh.length && old[p]?.ch === fresh[p]) p++;
  const room = Math.min(old.length, fresh.length) - p;
  let s = 0;
  while (s < room && old[old.length - 1 - s]?.ch === fresh[fresh.length - 1 - s]) s++;
  const inherited: TextAttrs = p === 0 ? {} : (old[p - 1]?.attrs ?? {});
  const middle = fresh.slice(p, fresh.length - s).map((ch) => ({ ch, attrs: inherited }));
  return spansOf([...old.slice(0, p), ...middle, ...old.slice(old.length - s)]);
}

/** Curseur `caret` (unités UTF-16 du nouveau contenu, borné au contenu) en points de code. */
const caretCodePoints = (content: string, caret: number): number => Array.from(content.slice(0, Math.min(Math.max(0, caret), content.length))).length;

/**
 * Plus long suffixe commun borné par le curseur (`s ≤ longueur − curseur`, en points de code), puis plus long préfixe
 * commun des restes (C7b, R3) : la différence ne passe jamais à gauche du curseur relu après la frappe. Rend [p, s].
 */
function anchoredEnds(old: readonly string[], fresh: readonly string[], caretCp: number): readonly [number, number] {
  const maxS = Math.min(old.length, fresh.length - caretCp);
  let s = 0;
  while (s < maxS && old[old.length - 1 - s] === fresh[fresh.length - 1 - s]) s++;
  const room = Math.min(old.length, fresh.length) - s;
  let p = 0;
  while (p < room && old[p] === fresh[p]) p++;
  return [p, s];
}

/**
 * Segments après une frappe relue du DOM (C7b, R3) : différence ancrée au curseur (`anchoredEnds`) ; le milieu neuf
 * prend les attributs du caractère qui le précède, aucun en tête (règle T5 du cœur). `caret` en unités UTF-16 du
 * nouveau contenu. Le cœur peut placer le même texte autrement : sans effet, l'état voulu envoyé fixe les attributs.
 */
export function editSpansAt(spans: readonly TextSpan[], content: string, caret: number): TextSpan[] {
  const old = charsOf(spans);
  const fresh = Array.from(content);
  const [p, s] = anchoredEnds(old.map((c) => c.ch), fresh, caretCodePoints(content, caret));
  const inherited: TextAttrs = p === 0 ? {} : (old[p - 1]?.attrs ?? {});
  const middle = fresh.slice(p, fresh.length - s).map((ch) => ({ ch, attrs: inherited }));
  return spansOf([...old.slice(0, p), ...middle, ...old.slice(old.length - s)]);
}

/** Milieu neuf d'`editSpansAt` dans le nouveau contenu, [début, fin) en unités UTF-16 (vide pour un effacement). */
export function insertedRange(old: string, content: string, caret: number): readonly [number, number] {
  const fresh = Array.from(content);
  const [p, s] = anchoredEnds(Array.from(old), fresh, caretCodePoints(content, caret));
  const start = fresh.slice(0, p).join("").length;
  return [start, start + fresh.slice(p, fresh.length - s).join("").length];
}

/** Une clé à `undefined` vaut une clé absente (T7) : serde-wasm-bindgen la lirait comme `null`, donc comme un retrait. */
export function cleanPatch(patch: TextAttrsPatch): TextAttrsPatch {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as TextAttrsPatch;
}

const COLOR = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|[A-Za-z]{3,20})$/;
/** T15 : `#rgb`, `#rrggbb`, `#rrggbbaa`, ou un nom CSS de 3 à 20 lettres ASCII (`valid_color` du cœur). */
export const validColor = (c: string): boolean => COLOR.test(c);
/** T15 : 1 à 48 points de code, sans `"`, `\`, `;`, `{`, `}` ni caractère de contrôle Unicode (Cc, dont `\n`, `\r`,
 *  `\f`) : `valid_font` du cœur (T11, T12). */
export function validFont(f: string): boolean {
  const n = Array.from(f).length;
  return n >= 1 && n <= 48 && !/["\\;{}]|\p{Cc}/u.test(f);
}
/** Le cœur reçoit `size` en f32 : 1e39 y devient infini. */
const validSize = (v: number): boolean => {
  const f = Math.fround(v);
  return Number.isFinite(f) && f > 0;
};

/** Même règle que `read_patch` → `wire_attr` (liaison) puis `valid_attrs` (cœur) ; à appeler sur un patch nettoyé. */
export function validPatch(patch: TextAttrsPatch): boolean {
  return Object.entries(patch).every(([k, v]) => {
    if (v === null) return (TEXT_ATTR_KEYS as readonly string[]).includes(k);
    switch (k) {
      case "bold":
      case "italic":
      case "underline":
        return typeof v === "boolean";
      case "color":
        return typeof v === "string" && validColor(v);
      case "size":
        return typeof v === "number" && validSize(v);
      case "font":
        return typeof v === "string" && validFont(v);
      default:
        return false;
    }
  });
}

const isHigh = (u: number): boolean => u >= 0xd800 && u <= 0xdbff;
const isLow = (u: number): boolean => u >= 0xdc00 && u <= 0xdfff;
const boundary = (s: string, i: number): boolean => i === 0 || i === s.length || !(isHigh(s.charCodeAt(i - 1)) && isLow(s.charCodeAt(i)));

/** Bornes de FormatText (T6) : entiers ≥ 0, dans le texte, jamais au milieu d'une paire de substitution. */
export function utf16Bounds(content: string, start: number, len: number): boolean {
  if (!Number.isInteger(start) || !Number.isInteger(len) || start < 0 || len < 0) return false;
  const end = start + len;
  return end <= content.length && boundary(content, start) && boundary(content, end);
}

export function patched(attrs: TextAttrs, patch: TextAttrsPatch): TextAttrs {
  const out: Record<string, unknown> = { ...attrs };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === false || v === undefined) delete out[k];
    else out[k] = k === "size" && typeof v === "number" ? Math.fround(v) : v;
  }
  return out as TextAttrs;
}

/** Patch posé sur les caractères dont l'unité UTF-16 de début est dans [start, start + len) ; bornes déjà vérifiées. */
export function formatSpans(spans: readonly TextSpan[], start: number, len: number, patch: TextAttrsPatch): TextSpan[] {
  let at = 0;
  const chars = charsOf(spans).map((c) => {
    const inside = at >= start && at < start + len;
    at += c.ch.length;
    return inside ? { ch: c.ch, attrs: patched(c.attrs, patch) } : c;
  });
  return spansOf(chars);
}

export const sameSpans = (a: readonly TextSpan[], b: readonly TextSpan[]): boolean =>
  a.length === b.length &&
  a.every((s, i) => {
    const t = b[i];
    return t !== undefined && s.text === t.text && sameAttrs(s.attrs, t.attrs);
  });

/** Concaténation des textes des segments. */
export const spansText = (spans: readonly TextSpan[]): string => spans.map((s) => s.text).join("");

/** `text` à la place de [start, end) (unités UTF-16, bornes vérifiées par l'appelant), avec les attributs `attrs`
 *  (collage, Entrée : C7b, R12). */
export function spliceSpans(spans: readonly TextSpan[], start: number, end: number, text: string, attrs: TextAttrs): TextSpan[] {
  let at = 0;
  const before: Char[] = [];
  const after: Char[] = [];
  for (const c of charsOf(spans)) {
    if (at < start) before.push(c);
    else if (at >= end) after.push(c);
    at += c.ch.length;
  }
  return spansOf([...before, ...Array.from(text, (ch) => ({ ch, attrs })), ...after]);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** État voulu d'un SetText ou d'un SetTableCell (C7b, R7) : segments bien formés, concaténation égale au contenu,
 *  attributs aux valeurs permises (`validPatch` du patch nettoyé : même règle que la liaison puis le cœur). */
export function validSpans(content: string, spans: readonly TextSpan[]): boolean {
  return (
    spans.every((s: unknown) => isRecord(s) && typeof s["text"] === "string" && isRecord(s["attrs"])) &&
    spansText(spans) === content &&
    spans.every((s) => validPatch(cleanPatch(s.attrs)))
  );
}

/** Forme que rend la lecture d'un état voulu (`read_spans` du cœur) : false et null retirés, size en f32, voisins
 *  égaux fusionnés, segments vides retirés ; aucun caractère : un segment vide. */
export function normalSpans(spans: readonly TextSpan[]): TextSpan[] {
  return spansOf(spans.flatMap((s) => {
    const attrs = patched({}, cleanPatch(s.attrs));
    return Array.from(s.text, (ch) => ({ ch, attrs }));
  }));
}
