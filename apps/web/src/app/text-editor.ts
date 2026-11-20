/**
 * Zone de saisie du texte (D14, CL4-2, CL4-3) : `<textarea>` visible, hors de `#stage` (ses événements ne passent pas
 * par l'échantillonneur), placée par la matrice CSS caméra × élément, en unités monde ; police et interligne du rendu
 * (`engine/text-layout.ts`). Relaie la composition IME, Échap (hors composition), la perte du focus, et pour l'outil Tableau Tab, Maj+Tab et les
 * flèches au bord du texte (`navigate`, C10a DAC3) à l'outil actif,
 * qui seul écrit (une SetText par validation, différée pendant une composition).
 */
import type { Matrix } from "../core/api";
import type { Camera } from "../engine/camera";
import { textFont, TEXT_LINE_HEIGHT } from "../engine/text-layout";
import type { TextEditorHost, TextEditSession } from "../engine/tools/text";

export const TEXT_EDITOR_ID = "texte-edition";

/** Mouvement demandé par la zone (C10a, DAC3) : même union que `NavMove` de `engine/table-geom.ts` (PC7). */
export type EditorMove = "next" | "prev" | "left" | "right" | "up" | "down";

export interface TextEditorEvents {
  compositionStart(): void;
  compositionEnd(): void;
  requestCommit(): void;
  /** Tab, Maj+Tab, flèches au bord du texte ; vrai si l'outil prend la touche. Absent (outil Texte) : rien n'est pris. */
  navigate?(move: EditorMove): boolean;
}

interface MoveKey {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
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

export interface TextEditor extends TextEditorHost {
  readonly element: HTMLTextAreaElement;
  /** Session ouverte : réapplique la matrice CSS pour la caméra donnée (CL4-15) ; fermée : rien. */
  follow(camera: Camera): void;
}

/** Écran (px CSS) = caméra ∘ m : `matrix(z·a, z·b, z·c, z·d, z·e + tx, z·f + ty)`. */
export function cssMatrix(camera: Camera, m: Matrix): string {
  const z = camera.zoom;
  const [a, b, c, d, e, f] = m;
  return `matrix(${z * a}, ${z * b}, ${z * c}, ${z * d}, ${z * e + camera.tx}, ${z * f + camera.ty})`;
}

export function createTextEditor(parent: HTMLElement, events: () => TextEditorEvents | null): TextEditor {
  const area = parent.ownerDocument.createElement("textarea");
  area.id = TEXT_EDITOR_ID;
  area.hidden = true;
  area.spellcheck = false;
  area.setAttribute("aria-label", "Texte");
  const s = area.style;
  s.position = "absolute";
  s.left = "0px";
  s.top = "0px";
  s.transformOrigin = "0 0";
  s.margin = "0";
  s.padding = "0";
  s.border = "1px dashed #1e3a8a";
  s.background = "transparent";
  s.outline = "none";
  s.resize = "none";
  s.overflow = "hidden";
  s.whiteSpace = "pre-wrap";
  s.zIndex = "3";
  let opened = false;
  let current: TextEditSession | null = null;
  const grow = (): void => {
    s.height = "auto";
    s.height = `${area.scrollHeight}px`;
  };
  area.addEventListener("input", grow);
  area.addEventListener("compositionstart", () => events()?.compositionStart());
  area.addEventListener("compositionend", () => events()?.compositionEnd());
  area.addEventListener("keydown", (e: KeyboardEvent) => {
    // Pendant une composition, toute touche appartient à l'IME (choix d'un candidat, CL4-3) : rien n'est pris.
    if (e.isComposing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      events()?.requestCommit();
      return;
    }
    const move = editorMove(e, area.value, area.selectionStart, area.selectionEnd);
    if (move !== null && events()?.navigate?.(move) === true) e.preventDefault();
  });
  // Perte du focus : l'outil valide, ou attend compositionend si une composition est en cours (CL4-3).
  area.addEventListener("blur", () => {
    if (opened) events()?.requestCommit();
  });
  parent.append(area);

  return {
    element: area,
    open(session: TextEditSession, camera: Camera) {
      opened = true;
      current = session;
      area.value = session.initial;
      s.transform = cssMatrix(camera, session.matrix);
      s.width = `${session.boxWidth}px`;
      s.minHeight = `${session.size * TEXT_LINE_HEIGHT}px`;
      s.font = textFont(session.size);
      s.lineHeight = String(TEXT_LINE_HEIGHT);
      s.color = session.color;
      s.background = session.background ?? "transparent";
      area.hidden = false;
      grow();
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
    },
    close() {
      current = null;
      opened = false; // avant de cacher : le blur qui suit ne redemande rien
      area.hidden = true;
      area.value = "";
    },
    follow(camera) {
      if (current) s.transform = cssMatrix(camera, current.matrix);
    },
    value: () => area.value,
  };
}
