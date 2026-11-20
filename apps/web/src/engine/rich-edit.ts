/**
 * Séance de saisie riche (C7b, DAR2, DAR3) : modèle pur des segments, de la sélection (unités UTF-16 du texte), du
 * format en attente au curseur (R9), de l'historique local (R10) et de l'état de la barre (R15). Aucun DOM :
 * `app/text-editor.ts` relit le DOM et appelle ce modèle, qui se teste en `node`. Types posés par T2 ; la fabrique
 * `createRichEdit` est écrite par T7.
 */
import type { TextAttrs, TextAttrsPatch, TextSpan } from "../core/api";
import { editSpans, editSpansAt, formatSpans, insertedRange, patched, sameSpans, spansText, spliceSpans } from "../core/rich-text";

/** Action de la barre ou d'un raccourci (R8) : bascule G, I, S ; une des tailles ; couleur, `null` = « Défaut ». */
export type FormatAction =
  | { readonly type: "bold" }
  | { readonly type: "italic" }
  | { readonly type: "underline" }
  | { readonly type: "size"; readonly size: number }
  | { readonly type: "color"; readonly color: string | null };

/** État de la barre (R15) : bascules vraies si toute la sélection porte l'attribut ; taille effective (attribut,
 *  sinon celle de l'élément) ; couleur `"default"` sans attribut ; `"mixed"` si la sélection mêle plusieurs valeurs. */
export interface FormatState {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly size: number | "mixed";
  readonly color: string | "default" | "mixed";
}

/** Taille et couleur de l'élément (texte) ou du tableau (cellule) : les défauts des segments. */
export interface RichBase {
  readonly size: number;
  readonly color: string;
}

export interface RichEditState {
  readonly spans: readonly TextSpan[];
  /** Sélection en unités UTF-16 du texte, start ≤ end. */
  readonly start: number;
  readonly end: number;
  /** Format en attente au curseur (R9, PC10) ; null sans attente. */
  readonly pending: TextAttrsPatch | null;
}

export interface RichEdit {
  state(): RichEditState;
  text(): string;
  /** Frappe ou composition relues (R3) : texte du DOM et sélection d'après la frappe ; -1, -1 : curseur illisible
   *  (PC9). Vrai si les segments ont changé. */
  input(text: string, start: number, end: number): boolean;
  /** Sélection relue à `selectionchange` (R9) : différente de celle du modèle, elle oublie le format en attente. */
  select(start: number, end: number): void;
  /** Collage, Entrée (R12, R3) : `text` à la place de la sélection, attributs du caractère précédent plus l'attente ;
   *  une étape. */
  insert(text: string): void;
  /** Action sur la sélection (R8) ; curseur seul : format en attente, aucune étape (R9). Vrai si les segments ont
   *  changé. */
  format(a: FormatAction): boolean;
  formatState(): FormatState;
  /** Historique local de la séance (R10) ; faux s'il n'y a rien à annuler ou à rétablir. */
  undo(): boolean;
  redo(): boolean;
}

interface Snapshot {
  readonly spans: readonly TextSpan[];
  readonly start: number;
  readonly end: number;
}

const clamp = (v: number, hi: number): number => Math.min(hi, Math.max(0, v));

/** Attributs du caractère qui finit à l'unité UTF-16 `at` (règle T5) ; en tête ou texte vide : aucun. */
export function attrsBefore(spans: readonly TextSpan[], at: number): TextAttrs {
  let end = 0;
  for (const s of spans) {
    const start = end;
    end += s.text.length;
    if (s.text !== "" && at > start && at <= end) return s.attrs;
  }
  return {};
}

/** Attributs des segments non vides qui recouvrent [start, end). */
function attrsIn(spans: readonly TextSpan[], start: number, end: number): TextAttrs[] {
  const out: TextAttrs[] = [];
  let at = 0;
  for (const s of spans) {
    const s0 = at;
    at += s.text.length;
    if (s.text !== "" && s0 < end && at > start) out.push(s.attrs);
  }
  return out;
}

/** Patch d'une action (R8) sur des caractères d'attributs `list` : bascule (tous l'ont → retrait) ; taille de
 *  l'élément → retrait ; couleur `null` (« Défaut ») → retrait. */
function patchFor(a: FormatAction, list: readonly TextAttrs[], base: RichBase): TextAttrsPatch {
  if (a.type === "size") return { size: a.size === base.size ? null : a.size };
  if (a.type === "color") return { color: a.color };
  const flag = list.length > 0 && list.every((x) => x[a.type] === true) ? null : true;
  if (a.type === "bold") return { bold: flag };
  if (a.type === "italic") return { italic: flag };
  return { underline: flag };
}

/** La valeur commune, sinon "mixed". */
function one<T>(xs: readonly T[]): T | "mixed" {
  const first = xs[0];
  return first !== undefined && xs.every((x) => x === first) ? first : "mixed";
}

export function createRichEdit(initial: readonly TextSpan[], base: RichBase): RichEdit {
  let spans: readonly TextSpan[] = initial;
  const n0 = spansText(initial).length;
  let sel = { start: n0, end: n0 };
  let pending: TextAttrsPatch | null = null;
  /** Suite de frappe en cours (R10, HC7b-11) : une seule étape, coupée par toute autre action ou un déplacement. */
  let typing = false;
  const past: Snapshot[] = [];
  const future: Snapshot[] = [];

  const snap = (): Snapshot => ({ spans, start: sel.start, end: sel.end });
  const push = (): void => {
    past.push(snap());
    future.length = 0;
  };
  const restore = (s: Snapshot): void => {
    spans = s.spans;
    sel = { start: s.start, end: s.end };
    pending = null;
    typing = false;
  };
  /** Attributs d'une insertion au curseur : caractère précédent, puis l'attente. */
  const caretAttrs = (): TextAttrs => patched(attrsBefore(spans, sel.start), pending ?? {});

  return {
    state: () => ({ spans, start: sel.start, end: sel.end, pending }),
    text: () => spansText(spans),
    input(content, start, end) {
      const old = spansText(spans);
      const readable = start >= 0 && end >= 0;
      const s = readable ? clamp(Math.min(start, end), content.length) : content.length;
      const e = readable ? clamp(Math.max(start, end), content.length) : content.length;
      if (content === old) {
        sel = { start: s, end: e };
        return false;
      }
      if (!typing) {
        push();
        typing = true;
      }
      if (readable) {
        // Différence ancrée au curseur relu (R3) : jamais `editSpans`, dont le préfixe d'abord place le neuf après les
        // caractères égaux qui suivent le curseur.
        let next = editSpansAt(spans, content, s);
        const [a, b] = insertedRange(old, content, s);
        if (pending !== null && b > a) {
          next = formatSpans(next, a, b - a, pending);
          pending = null;
        }
        spans = next;
      } else {
        // PC9 : curseur illisible, différence sans borne (C7).
        spans = editSpans(spans, content);
      }
      sel = { start: s, end: e };
      return true;
    },
    select(start, end) {
      const n = spansText(spans).length;
      const s = clamp(Math.min(start, end), n);
      const e = clamp(Math.max(start, end), n);
      if (s === sel.start && e === sel.end) return;
      sel = { start: s, end: e };
      pending = null;
      typing = false;
    },
    insert(text) {
      if (text === "" && sel.start === sel.end) return;
      push();
      typing = false;
      spans = spliceSpans(spans, sel.start, sel.end, text, caretAttrs());
      pending = null;
      const at = sel.start + text.length;
      sel = { start: at, end: at };
    },
    format(a) {
      typing = false;
      if (sel.start === sel.end) {
        pending = { ...(pending ?? {}), ...patchFor(a, [caretAttrs()], base) };
        return false;
      }
      const patch = patchFor(a, attrsIn(spans, sel.start, sel.end), base);
      const next = formatSpans(spans, sel.start, sel.end - sel.start, patch);
      if (sameSpans(next, spans)) return false;
      push();
      spans = next;
      return true;
    },
    formatState() {
      const found = sel.start === sel.end ? [caretAttrs()] : attrsIn(spans, sel.start, sel.end);
      const list: readonly TextAttrs[] = found.length > 0 ? found : [{}];
      const all = (k: "bold" | "italic" | "underline"): boolean => list.every((x) => x[k] === true);
      return {
        bold: all("bold"),
        italic: all("italic"),
        underline: all("underline"),
        size: one(list.map((x) => x.size ?? base.size)),
        color: one(list.map((x) => x.color ?? "default")),
      };
    },
    undo() {
      const p = past.pop();
      if (p === undefined) return false;
      future.push(snap());
      restore(p);
      return true;
    },
    redo() {
      const f = future.pop();
      if (f === undefined) return false;
      past.push(snap());
      restore(f);
      return true;
    },
  };
}
