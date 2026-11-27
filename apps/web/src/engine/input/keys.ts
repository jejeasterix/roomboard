import type { ArrangeHow } from "../../core/arrange";
/** Raccourcis d'annulation (D11) : Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z ; Cmd sous macOS. Ctrl+G grouper, Ctrl+Maj+G dégrouper (C3, Z13). */
export interface KeyLike {
  readonly key: string;
  readonly code?: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly isComposing: boolean;
  /** Touche déjà prise par un contrôle de l'interface (`preventDefault`) : le moteur ne la rejoue pas (T17). */
  readonly defaultPrevented?: boolean;
  readonly target: {
    readonly tagName?: string;
    readonly type?: string;
    readonly isContentEditable?: boolean;
    readonly getAttribute?: (name: string) => string | null;
  } | null;
}

export type KeyAction = "undo" | "redo" | "group" | "ungroup";

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Cible d'édition (champ, zone éditable) : ses touches lui appartiennent. Un bouton n'en est pas une. */
const NON_TEXT_INPUTS = new Set(["range", "checkbox", "radio", "button", "submit", "reset", "color", "file", "image"]);
export const inEditable = (t: KeyLike["target"]): boolean => {
  if (t === null) return false;
  if (t.isContentEditable === true) return true;
  if (t.tagName === undefined) return false;
  const tag = t.tagName.toUpperCase();
  // Une réglette, une case ou un bouton gardent le focus après un réglage : ils n'attendent pas de saisie (cf. Excalidraw isWritableElement).
  if (tag === "INPUT" && t.type !== undefined && NON_TEXT_INPUTS.has(t.type.toLowerCase())) return false;
  return EDITABLE.has(tag);
};

const CONTROL_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
const CONTROL_ROLES = new Set(["radio", "gridcell", "tab", "menuitem", "menuitemradio", "menuitemcheckbox", "slider", "option"]);
/** Contrôle de l'interface qui garde les flèches (bouton, champ de tout type, réglette, case de grille, onglet, menu,
 *  segment, option, zone éditable) ; la scène et le body n'en sont pas (OG23, T17). */
export const inControl = (t: KeyLike["target"]): boolean => {
  if (t === null) return false;
  if (t.isContentEditable === true) return true;
  if (t.tagName !== undefined && CONTROL_TAGS.has(t.tagName.toUpperCase())) return true;
  const role = t.getAttribute?.("role");
  return role !== null && role !== undefined && CONTROL_ROLES.has(role);
};

/** Barre d'espace sans Ctrl, Cmd ni Alt, hors champ de saisie et hors composition IME (D17 : espace + glisser). */
export function isPanKey(e: KeyLike): boolean {
  return e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !inEditable(e.target);
}

export function keyAction(e: KeyLike): KeyAction | null {
  // Composition IME : la touche appartient à l'IME (D14). Alt Gr = Ctrl+Alt sous Windows : un caractère, pas un raccourci.
  if (e.isComposing || e.altKey) return null;
  if (!(e.ctrlKey || e.metaKey)) return null;
  if (inEditable(e.target)) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y" && !e.shiftKey) return "redo";
  if (key === "g") return e.shiftKey ? "ungroup" : "group";
  return null;
}

/** OG11 (DA-6) : raccourcis d'objet. Lot 1 : Ctrl+D (Dupliquer), pris au navigateur par preventDefault. */
export type ObjectKey = "duplicate" | "link" | "stroke-picker" | "fill-picker" | "help";
export function objectKey(e: KeyLike): ObjectKey | null {
  if (e.isComposing || e.altKey || inEditable(e.target)) return null;
  // T16 : S ouvre le sélecteur du Trait, G celui de l'Arrière-plan ; lettre seule, sans Ctrl, Cmd ni Maj.
  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const k = e.key.toLowerCase();
    if (k === "s") return "stroke-picker";
    if (k === "g") return "fill-picker";
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "d") return "duplicate";
  // T18 (déc. 38, 39) : Ctrl+K (Cmd+K sous macOS) ouvre l'éditeur de lien ; Ctrl+Maj+K reste au navigateur.
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "k") return "link";
  return null;
}

export type EditAction = "delete" | "escape";

/** Suppr / Retour arrière (supprimer la sélection, D12) et Échap (la vider), hors champ, hors composition, sans modificateur. */
export function editAction(e: KeyLike): EditAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || inEditable(e.target)) return null;
  if (e.key === "Delete" || e.key === "Backspace") return "delete";
  if (e.key === "Escape") return "escape";
  return null;
}

/** Entrée seule (validation d'un mode d'édition, C5) : hors champ, hors composition, et pas sur un bouton, dont elle est l'activation. */
export function enterAction(e: KeyLike): boolean {
  if (e.key !== "Enter" || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || inEditable(e.target)) return false;
  return e.target?.tagName?.toUpperCase() !== "BUTTON";
}

export type OrderKey = "up" | "down" | "front" | "back";

/** Ordre des objets (lot 2) : Ctrl/Cmd+↑ ↓ d'un rang, Ctrl/Cmd+Maj+↑ ↓ premier plan et arrière-plan ; hors champ, hors IME, Alt Gr refusé. */
export function orderKey(e: KeyLike): OrderKey | null {
  if (e.isComposing || e.altKey || inEditable(e.target) || !(e.ctrlKey || e.metaKey)) return null;
  if (e.key === "ArrowUp") return e.shiftKey ? "front" : "up";
  if (e.key === "ArrowDown") return e.shiftKey ? "back" : "down";
  return null;
}

export type PageKey = "prev" | "next" | "add" | "duplicate" | "sidebar-pages" | "sidebar-layers";

/** Raccourcis de page (DA9) : PageUp/PageDown, Ctrl+M (Ctrl aussi sous macOS), Ctrl/Cmd+Maj+D/P/L ; hors champ, hors IME, Alt Gr refusé. */
export function pageKey(e: KeyLike): PageKey | null {
  if (e.isComposing || e.altKey || inEditable(e.target)) return null;
  const mod = e.ctrlKey || e.metaKey;
  if (!mod && !e.shiftKey) {
    if (e.key === "PageUp") return "prev";
    if (e.key === "PageDown") return "next";
    return null;
  }
  const key = e.key.toLowerCase();
  if (e.ctrlKey && !e.metaKey && !e.shiftKey && key === "m") return "add";
  if (mod && e.shiftKey) {
    if (key === "d") return "duplicate";
    if (key === "p") return "sidebar-pages";
    if (key === "l") return "sidebar-layers";
  }
  return null;
}

export type AppShortcut = "backgrounds";

/** personnalisation-1b (Q28) : raccourcis de l'application, écoutés par `App.tsx` (jamais par le moteur) : Ctrl+Maj+F
 *  (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre des fonds ; hors champ de saisie, hors composition, jamais avec Alt. */
export function appShortcut(e: KeyLike): AppShortcut | null {
  if (e.isComposing || e.altKey || !e.shiftKey || !(e.ctrlKey || e.metaKey)) return null;
  if (inEditable(e.target)) return null;
  return e.key.toLowerCase() === "f" ? "backgrounds" : null;
}

/** OG23 (déc. 24) : avec Alt, la lettre est lue par `code` (Option+H donne « ˙ » sous macOS), sinon par `key` ; H, V, R
 *  sont à la même place en AZERTY, QWERTY et QWERTZ. Jamais avec Ctrl ni Cmd, hors champ et contrôle de l'interface (comme `nudgeKey`), hors composition, ni si déjà traité. */
export function arrangeKey(e: KeyLike): ArrangeHow | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.defaultPrevented === true || inEditable(e.target) || inControl(e.target)) return null;
  const letter = e.altKey ? (e.code ?? "").replace(/^Key/, "").toLowerCase() : e.key.toLowerCase();
  if (e.altKey && e.shiftKey) {
    if (e.key === "ArrowLeft") return "align-left";
    if (e.key === "ArrowRight") return "align-right";
    if (e.key === "ArrowUp") return "align-top";
    if (e.key === "ArrowDown") return "align-bottom";
    if (letter === "h") return "align-center";
    if (letter === "v") return "align-middle";
    if (letter === "r") return "rotate-ccw";
    return null;
  }
  if (e.altKey) return letter === "h" ? "distribute-h" : letter === "v" ? "distribute-v" : null;
  if (e.shiftKey) return letter === "h" ? "flip-h" : letter === "v" ? "flip-v" : letter === "r" ? "rotate-cw" : null;
  return null;
}

/** Flèche seule : 1 px ; Maj : 5 px (Excalidraw) ; jamais avec Ctrl, Cmd ou Alt (Ctrl+flèches = Disposition d'OG4). */
export function nudgeKey(e: KeyLike): { dx: number; dy: number } | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented === true || inEditable(e.target) || inControl(e.target)) return null;
  const s = e.shiftKey ? 5 : 1;
  if (e.key === "ArrowLeft") return { dx: -s, dy: 0 };
  if (e.key === "ArrowRight") return { dx: s, dy: 0 };
  if (e.key === "ArrowUp") return { dx: 0, dy: -s };
  if (e.key === "ArrowDown") return { dx: 0, dy: s };
  return null;
}
