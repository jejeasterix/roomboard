/**
 * Zone de saisie riche (D14, CL4-2, CL4-3 ; C7b R1-R5, R9-R12) : un `<div contenteditable>` visible, hors de `#stage`
 * (ses événements ne passent pas par l'échantillonneur), placé par la matrice CSS caméra × élément, en unités monde ;
 * police et interligne du rendu. Pour l'outil Texte et les cellules de l'outil Tableau (C10a DAC3). Le navigateur mute
 * le DOM à la frappe et pendant la composition IME (jamais nous) ; hors composition, chaque `input` et la fin d'une
 * composition relisent texte et sélection du DOM et les appliquent au modèle (`engine/rich-edit.ts`, différence ancrée
 * au curseur), puis le DOM est redessiné s'il diffère (`app/rich-dom.ts`). Entrée, collage, dépôt, gras natif et
 * annulation native sont pris à `beforeinput` ou à leur événement : le navigateur ne pose jamais de mise en forme ni
 * ne rejoue son propre historique, que le modèle ignorerait. Relaie à l'outil actif la composition, Échap, la perte du
 * focus, Tab et les flèches au bord (`navigate`) et chaque changement de format (`formatChanged`). L'outil seul écrit
 * (une commande par validation, différée pendant une composition par `engine/tools/commit-gate.ts`).
 */
import type { Matrix, TextSpan } from "../core/api";
import { plainSpans } from "../core/rich-text";
import type { Camera } from "../engine/camera";
import { createRichEdit, type FormatAction, type FormatState, type RichEdit } from "../engine/rich-edit";
import { textFont, TEXT_LINE_HEIGHT } from "../engine/text-layout";
import type { TextEditorHost, TextEditSession } from "../engine/tools/text";
import { readSelection, readText, renderSpans, sameRender, setSelection } from "./rich-dom";

export const TEXT_EDITOR_ID = "texte-edition";

/** Mouvement demandé par la zone (C10a, DAC3) : même union que `NavMove` de `engine/table-geom.ts` (PC7). */
export type EditorMove = "next" | "prev" | "left" | "right" | "up" | "down";

export interface TextEditorEvents {
  compositionStart(): void;
  compositionEnd(): void;
  requestCommit(): void;
  /** Tab, Maj+Tab, flèches au bord du texte ; vrai si l'outil prend la touche. Absent (outil Texte) : rien n'est pris. */
  navigate?(move: EditorMove): boolean;
  /** C7b (R15, PC12) : sélection, format en attente ou segments changés ; l'outil republie l'état de la barre. */
  formatChanged?(): void;
}

interface KeyMods {
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

interface MoveKey extends KeyMods {
  readonly key: string;
  readonly shiftKey?: boolean;
}

/** Touche → mouvement : Tab (Maj+Tab) toujours ; flèche sans modificateur, curseur sans sélection, au bord du texte
 *  (← au début, → à la fin, ↑ sans saut de ligne avant le curseur, ↓ sans saut de ligne après, HC10-8). */
export function editorMove(e: MoveKey, value: string, start: number, end: number): EditorMove | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === "Tab") return e.shiftKey ? "prev" : "next";
  if (e.shiftKey || start !== end) return null;
  if (e.key === "ArrowLeft") return start === 0 ? "left" : null;
  if (e.key === "ArrowRight") return start === value.length ? "right" : null;
  if (e.key === "ArrowUp") return value.slice(0, start).includes("\n") ? null : "up";
  if (e.key === "ArrowDown") return value.slice(start).includes("\n") ? null : "down";
  return null;
}

/** Raccourci de format (R11, PC16) : Ctrl ou Cmd + B, I, U ; jamais avec Alt (Alt Gr = Ctrl+Alt sous Windows). */
export function formatKey(e: KeyMods & { readonly key: string }): FormatAction | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "b") return { type: "bold" };
  if (k === "i") return { type: "italic" };
  if (k === "u") return { type: "underline" };
  return null;
}

/** Annuler, rétablir dans la zone (R10, PC16) : Ctrl ou Cmd + Z ; Ctrl+Y ou Ctrl+Maj+Z ; jamais avec Alt. */
export function historyKey(e: KeyMods & { readonly key: string; readonly shiftKey?: boolean }): "undo" | "redo" | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "z") return e.shiftKey ? "redo" : "undo";
  if (k === "y" && !e.shiftKey) return "redo";
  return null;
}

/** Texte simple du presse-papiers (R12) : `\r\n` et `\r` → « \n ». */
export const plainPaste = (s: string): string => s.replace(/\r\n?/g, "\n");

/** `beforeinput` de mise en forme natif (Ctrl+B d'un contenteditable) → action du modèle (R3) ; autre : null. */
function formatInput(inputType: string): FormatAction | null {
  if (inputType === "formatBold") return { type: "bold" };
  if (inputType === "formatItalic") return { type: "italic" };
  if (inputType === "formatUnderline") return { type: "underline" };
  return null;
}

export interface TextEditor extends TextEditorHost {
  readonly element: HTMLElement;
  /** Session ouverte : réapplique la matrice CSS pour la caméra donnée (CL4-15) ; fermée : rien. */
  follow(camera: Camera): void;
  /** Segments de la séance (C7b, R18) ; fermée : un segment vide. */
  spans(): readonly TextSpan[];
  /** Action de la barre (R8) ; fermée ou pendant une composition : rien (R5). */
  format(a: FormatAction): void;
  /** État de la barre (R15) ; fermée : null. */
  formatState(): FormatState | null;
}

/** Écran (px CSS) = caméra ∘ m : `matrix(z·a, z·b, z·c, z·d, z·e + tx, z·f + ty)`. */
export function cssMatrix(camera: Camera, m: Matrix): string {
  const z = camera.zoom;
  const [a, b, c, d, e, f] = m;
  return `matrix(${z * a}, ${z * b}, ${z * c}, ${z * d}, ${z * e + camera.tx}, ${z * f + camera.ty})`;
}

export function createTextEditor(parent: HTMLElement, events: () => TextEditorEvents | null): TextEditor {
  const doc = parent.ownerDocument;
  const zone = doc.createElement("div");
  zone.id = TEXT_EDITOR_ID;
  zone.hidden = true;
  zone.setAttribute("contenteditable", "true");
  zone.spellcheck = false;
  zone.setAttribute("role", "textbox");
  zone.setAttribute("aria-multiline", "true");
  zone.setAttribute("aria-label", "Texte");
  const s = zone.style;
  s.position = "absolute";
  s.left = "0px";
  s.top = "0px";
  s.transformOrigin = "0 0";
  s.margin = "0";
  s.padding = "0";
  s.border = "1px dashed #1e3a8a";
  s.background = "transparent";
  s.outline = "none";
  s.overflow = "hidden";
  s.whiteSpace = "pre-wrap";
  s.overflowWrap = "anywhere";
  s.zIndex = "3";
  let opened = false;
  let current: TextEditSession | null = null;
  let model: RichEdit | null = null;
  /** Composition IME en cours (R5) : ni relecture, ni redessin, ni raccourci, ni action de barre. */
  let composing = false;

  const changed = (): void => events()?.formatChanged?.();

  /** Redessine depuis le modèle si le DOM diffère (ou toujours), sélection remise par positions UTF-16. */
  const redraw = (force: boolean): void => {
    if (model === null || current === null) return;
    const st = model.state();
    if (!force && sameRender(zone, st.spans)) return;
    renderSpans(zone, st.spans, { size: current.size });
    setSelection(zone, st.start, st.end);
  };

  /** Relit le DOM après une frappe ou une composition (R3) ; curseur illisible : -1, -1 (PC9). */
  const sync = (): void => {
    if (model === null) return;
    const sel = readSelection(zone);
    model.input(readText(zone), sel?.start ?? -1, sel?.end ?? -1);
    redraw(false);
    changed();
  };

  const apply = (a: FormatAction): void => {
    if (model === null || composing) return;
    if (model.format(a)) redraw(false);
    changed();
  };

  const history = (which: "undo" | "redo"): void => {
    if (model === null) return;
    if (which === "undo" ? model.undo() : model.redo()) redraw(true);
    changed();
  };

  const insert = (text: string): void => {
    if (model === null) return;
    model.insert(text);
    redraw(true);
    changed();
  };

  /** Clic, flèches : la sélection relue va au modèle, qui oublie l'attente si elle a bougé (R9) ; jamais pendant une
   *  composition. Le `selectionchange` d'un redessin arrive après coup : le test du texte et `select` (qui oublie
   *  l'attente seulement si la sélection a bougé) suffisent. Texte du DOM pas encore relu (frappe dont l'`input` n'est pas arrivé : un
   *  moteur qui émet `selectionchange` avant lui) : ses positions sont celles d'un autre texte, l'`input` les portera. */
  const onSelection = (): void => {
    if (!opened || composing || model === null) return;
    if (readText(zone) !== model.text()) return;
    const sel = readSelection(zone);
    if (sel === null) return;
    const was = model.state();
    model.select(sel.start, sel.end);
    // Le `selectionchange` qui suit une frappe ou un redessin ne déplace rien : `sync` a déjà publié.
    const now = model.state();
    if (now.start !== was.start || now.end !== was.end || now.pending !== was.pending) changed();
  };

  zone.addEventListener("beforeinput", (e: InputEvent) => {
    // Pendant la composition, le navigateur mute le DOM (`insertCompositionText`) : jamais empêché.
    if (e.isComposing || composing || model === null) return;
    const t = e.inputType;
    if (t === "insertParagraph" || t === "insertLineBreak") {
      e.preventDefault();
      insert("\n");
      return;
    }
    if (t === "insertFromPaste" || t === "insertFromPasteAsQuotation") {
      // Un moteur qui n'émet pas `paste` d'abord : même texte simple.
      e.preventDefault();
      const text = e.dataTransfer?.getData("text/plain") ?? "";
      if (text !== "") insert(plainPaste(text));
      return;
    }
    if (t === "insertFromDrop") {
      e.preventDefault();
      return;
    }
    const fmt = formatInput(t);
    if (fmt !== null) {
      e.preventDefault();
      apply(fmt);
      return;
    }
    if (t === "historyUndo" || t === "historyRedo") {
      e.preventDefault();
      history(t === "historyUndo" ? "undo" : "redo");
    }
  });
  zone.addEventListener("input", (e: Event) => {
    if ((e as InputEvent).isComposing || composing) return;
    sync();
  });
  zone.addEventListener("compositionstart", () => {
    composing = true;
    events()?.compositionStart();
  });
  // PC13 : une composition dont le début aurait manqué reste protégée ; aucun effet sur le modèle.
  zone.addEventListener("compositionupdate", () => {
    composing = true;
  });
  zone.addEventListener("compositionend", () => {
    composing = false;
    // R5 : relire et appliquer, redessiner, puis seulement relayer : la porte IME valide aussitôt une demande en
    // attente, et la validation lit le modèle.
    sync();
    events()?.compositionEnd();
  });
  zone.addEventListener("keydown", (e: KeyboardEvent) => {
    // Pendant une composition, toute touche appartient à l'IME (choix d'un candidat, CL4-3) : rien n'est pris.
    if (e.isComposing || composing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      events()?.requestCommit();
      return;
    }
    const fmt = formatKey(e);
    if (fmt !== null) {
      e.preventDefault();
      apply(fmt);
      return;
    }
    const h = historyKey(e);
    if (h !== null) {
      e.preventDefault();
      history(h);
      return;
    }
    const st = model?.state();
    const sel = readSelection(zone) ?? { start: st?.start ?? 0, end: st?.end ?? 0 };
    const move = editorMove(e, model?.text() ?? "", sel.start, sel.end);
    if (move !== null && events()?.navigate?.(move) === true) e.preventDefault();
  });
  zone.addEventListener("paste", (e: ClipboardEvent) => {
    if (composing) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (text !== "") insert(plainPaste(text));
  });
  // R12, PC17 : le dépôt de fichiers reste sur la scène ; rien n'est déposé dans la zone, rien ne remonte.
  zone.addEventListener("drop", (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  });
  // Perte du focus : l'outil valide, ou attend compositionend si une composition est en cours (CL4-3).
  // Le panneau d'options (`[data-options]`) n'est pas une sortie : toucher sa réglette garde la saisie, et le focus
  // revient ici après le `change`. Tout autre focus valide comme avant.
  zone.addEventListener("blur", (e: FocusEvent) => {
    if (!opened) return;
    const to = e.relatedTarget instanceof Element ? e.relatedTarget : null;
    const panel = to?.closest("[data-options]") ?? null;
    if (panel === null) {
      events()?.requestCommit();
      return;
    }
    const back = (): void => {
      panel.removeEventListener("change", back);
      panel.removeEventListener("focusout", leave);
      if (opened) zone.focus();
    };
    const leave = (f: Event): void => {
      const next = (f as FocusEvent).relatedTarget;
      if (next instanceof Node && panel.contains(next)) return;
      panel.removeEventListener("change", back);
      panel.removeEventListener("focusout", leave);
      if (opened && next !== zone) events()?.requestCommit();
    };
    panel.addEventListener("change", back);
    panel.addEventListener("focusout", leave);
  });
  parent.append(zone);

  return {
    element: zone,
    open(session: TextEditSession, camera: Camera) {
      opened = true;
      current = session;
      composing = false;
      model = createRichEdit(session.spans, { size: session.size, color: session.color });
      s.transform = cssMatrix(camera, session.matrix);
      s.width = `${session.boxWidth}px`;
      s.minHeight = `${session.size * TEXT_LINE_HEIGHT}px`;
      s.font = textFont(session.size);
      s.lineHeight = String(TEXT_LINE_HEIGHT);
      s.color = session.color;
      s.background = session.background ?? "transparent";
      zone.hidden = false;
      redraw(true);
      zone.focus();
      const st = model.state();
      setSelection(zone, st.start, st.end);
      doc.addEventListener("selectionchange", onSelection);
      changed();
    },
    close() {
      current = null;
      opened = false; // avant de cacher : le blur qui suit ne redemande rien
      composing = false;
      model = null;
      doc.removeEventListener("selectionchange", onSelection);
      zone.hidden = true;
      zone.replaceChildren();
      changed();
    },
    follow(camera) {
      if (current) s.transform = cssMatrix(camera, current.matrix);
    },
    value: () => (model === null ? "" : model.text()),
    spans: () => (model === null ? plainSpans("") : model.state().spans),
    format(a) {
      apply(a);
    },
    formatState: () => (model === null ? null : model.formatState()),
  };
}
