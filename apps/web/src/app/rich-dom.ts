/**
 * Aller-retour segments ↔ DOM de la zone de saisie riche (C7b, R3, R4, DAR2). Rendu : un `<span>` par segment non vide,
 * style en ligne tiré des attributs (taille en unités monde, gras, italique, souligné, couleur, police), puis un
 * `<br data-rb-fin>` si le texte finit par « \n » (le curseur tient sur la dernière ligne vide). Lecture robuste : un
 * `<br>` ou une frontière de bloc insérés par le navigateur valent « \n » ; le `<br data-rb-fin>` et le `<br>` qui
 * finit seul un bloc (marque de ligne vide) ne sont jamais lus (PC8). Sélection en unités UTF-16 du texte lu. Sans état.
 */
import type { TextAttrs, TextSpan } from "../core/api";
import { spansText, TEXT_ATTR_KEYS } from "../core/rich-text";
import { faceOf, styleOf, TEXT_FONT_FAMILY } from "../engine/text-layout";

export const END_BR = "data-rb-fin";
const ATTRS = "data-rb-attrs";
const BLOCKS: ReadonlySet<string> = new Set(["DIV", "P", "LI"]);
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
/** `NodeFilter.SHOW_TEXT`. */
const SHOW_TEXT = 4;

/** Taille de l'élément ou du tableau : celle d'un segment sans `size`. */
export interface DomBase {
  readonly size: number;
}
export interface DomSelection {
  readonly start: number;
  readonly end: number;
}

/** Clé stable des attributs (ordre de `TEXT_ATTR_KEYS`) : deux objets égaux ont la même clé. */
export const attrsKey = (a: TextAttrs): string => JSON.stringify(TEXT_ATTR_KEYS.map((k) => a[k] ?? null));

export function renderSpans(root: HTMLElement, spans: readonly TextSpan[], base: DomBase): void {
  const doc = root.ownerDocument;
  const nodes: Node[] = [];
  for (const s of spans) {
    if (s.text === "") continue;
    const el = doc.createElement("span");
    const st = styleOf(s.attrs, base);
    const face = faceOf(st);
    el.style.fontSize = `${st.size}px`;
    if (face?.bold) el.style.fontWeight = "bold";
    if (face?.italic) el.style.fontStyle = "italic";
    if (face?.font !== undefined) el.style.fontFamily = `"${face.font}", ${TEXT_FONT_FAMILY}`;
    if (st.underline) el.style.textDecoration = "underline";
    if (st.color !== null) el.style.color = st.color;
    el.setAttribute(ATTRS, attrsKey(s.attrs));
    el.textContent = s.text;
    nodes.push(el);
  }
  if (spansText(spans).endsWith("\n")) {
    const br = doc.createElement("br");
    br.setAttribute(END_BR, "");
    nodes.push(br);
  }
  root.replaceChildren(...nodes);
}

/** Vrai si le DOM de `root` est exactement le rendu de `spans` : sinon la zone redessine (R3). */
export function sameRender(root: HTMLElement, spans: readonly TextSpan[]): boolean {
  const want = spans.filter((s) => s.text !== "");
  const end = spansText(spans).endsWith("\n");
  const kids = Array.from(root.childNodes);
  if (kids.length !== want.length + (end ? 1 : 0)) return false;
  const spansOk = want.every((s, i) => {
    const k = kids[i];
    return (
      k !== undefined &&
      k.nodeName === "SPAN" &&
      (k as Element).getAttribute(ATTRS) === attrsKey(s.attrs) &&
      k.childNodes.length === 1 &&
      k.firstChild?.nodeType === TEXT_NODE &&
      k.textContent === s.text
    );
  });
  const last = kids[kids.length - 1];
  return spansOk && (!end || (last !== undefined && last.nodeName === "BR" && (last as Element).hasAttribute(END_BR)));
}

/** Borne DOM (nœud, décalage), comme celles d'une `Selection`. */
interface DomPoint {
  readonly node: Node;
  readonly offset: number;
}

/** Parcours de `readText` ; `stop` : position, dans le texte lu, de cette borne (null si elle n'est pas rencontrée).
 *  Le parcours se fait sur le vrai DOM : un `<br>` qui finit son bloc y est jugé tel, jamais sur une copie partielle. */
function scan(root: Node, stop: DomPoint | null): { readonly text: string; readonly at: number | null } {
  let out = "";
  let closed = false;
  let at: number | null = null;
  const mark = (): void => {
    if (at === null) at = out.length;
  };
  const emit = (s: string): void => {
    if (closed) out += "\n";
    closed = false;
    out += s;
  };
  const walk = (n: Node): void => {
    const kids = Array.from(n.childNodes);
    kids.forEach((c, i) => {
      if (n === stop?.node && i === stop.offset) mark();
      if (c.nodeType === TEXT_NODE) {
        const v = c.nodeValue ?? "";
        if (c === stop?.node) {
          const head = v.slice(0, stop.offset);
          if (head !== "") emit(head);
          mark();
          const tail = v.slice(stop.offset);
          if (tail !== "") emit(tail);
        } else if (v !== "") emit(v);
      } else if (c.nodeName === "BR") {
        const lineMark = BLOCKS.has(n.nodeName) && i === kids.length - 1;
        if (!(c as Element).hasAttribute(END_BR) && !lineMark) emit("\n");
      } else if (c.nodeType === ELEMENT_NODE) {
        const block = BLOCKS.has(c.nodeName);
        if (block) {
          if (closed || (out !== "" && !out.endsWith("\n"))) out += "\n";
          closed = false;
        }
        walk(c);
        if (block) closed = true;
      }
    });
    if (n === stop?.node && stop.offset >= kids.length) mark();
  };
  walk(root);
  return { text: out, at };
}

/** Texte du DOM (R3, PC8) : nœuds texte ; `<br>` = « \n » ; entrée dans un bloc = « \n » si un bloc vient de se
 *  fermer, ou si du texte précède sans finir par « \n ». */
export function readText(root: Node): string {
  return scan(root, null).text;
}

/** Position UTF-16, dans le texte lu, d'une borne DOM ; null hors de `root`. */
function offsetOf(root: HTMLElement, node: Node, offset: number): number | null {
  if (node !== root && !root.contains(node)) return null;
  return scan(root, { node, offset }).at;
}

export function readSelection(root: HTMLElement): DomSelection | null {
  const sel = root.ownerDocument.getSelection();
  if (sel === null || sel.rangeCount === 0 || sel.anchorNode === null || sel.focusNode === null) return null;
  const a = offsetOf(root, sel.anchorNode, sel.anchorOffset);
  const f = offsetOf(root, sel.focusNode, sel.focusOffset);
  if (a === null || f === null) return null;
  return { start: Math.min(a, f), end: Math.max(a, f) };
}

/** Borne DOM de la position UTF-16 `at` d'un texte rendu par `renderSpans` : dans le premier nœud texte qui la
 *  contient ; en fin d'un texte qui finit par « \n », devant le `<br data-rb-fin>`. */
function pointAt(root: HTMLElement, at: number): { readonly node: Node; readonly offset: number } {
  const kids = Array.from(root.childNodes);
  const last = kids[kids.length - 1];
  if (at >= readText(root).length && last?.nodeName === "BR" && (last as Element).hasAttribute(END_BR)) {
    return { node: root, offset: kids.length - 1 };
  }
  let pos = 0;
  const walker = root.ownerDocument.createTreeWalker(root, SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const len = (n.nodeValue ?? "").length;
    if (at <= pos + len) return { node: n, offset: Math.max(0, at - pos) };
    pos += len;
  }
  return { node: root, offset: kids.length };
}

export function setSelection(root: HTMLElement, start: number, end: number): void {
  const sel = root.ownerDocument.getSelection();
  if (sel === null) return;
  const a = pointAt(root, start);
  const b = pointAt(root, end);
  sel.setBaseAndExtent(a.node, a.offset, b.node, b.offset);
}
