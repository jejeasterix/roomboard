/** Raccourcis d'annulation (D11) : Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z ; Cmd sous macOS. Ctrl+G grouper, Ctrl+Maj+G dégrouper (C3, Z13). */
export interface KeyLike {
  readonly key: string;
  readonly code?: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly isComposing: boolean;
  readonly target: { readonly tagName?: string; readonly type?: string; readonly isContentEditable?: boolean } | null;
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

/** Barre d'espace sans Ctrl, Cmd ni Alt, hors champ de saisie et hors composition IME (D17 : espace + glisser). */
export function isPanKey(e: KeyLike): boolean {
  return e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !inEditable(e.target);
}

export type LinkDir = "up" | "down" | "left" | "right";
/** OG12 (n° 21) : Ctrl+Entrée (Cmd+Entrée sous macOS) entre dans « Modifier les points » ; hors champ, hors IME. */
export function lineEditKey(e: KeyLike): boolean {
  return e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !e.isComposing && !inEditable(e.target);
}
const LINK_KEYS: Readonly<Record<string, LinkDir>> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
/** OG12 (n° 28, H2) : Alt+Maj+flèche crée un objet relié ; Ctrl+flèche reste au rangement (OG14). */
export function linkedKey(e: KeyLike): LinkDir | null {
  if (e.isComposing || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || inEditable(e.target)) return null;
  return Object.hasOwn(LINK_KEYS, e.key) ? LINK_KEYS[e.key]! : null;
}
/** OG12 (n° 19) : touche Ctrl ou Cmd seule (tenue pendant un glisser). */
export const isCtrlKey = (e: { readonly key: string }): boolean => e.key === "Control" || e.key === "Meta";

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

export type CellKey = "place" | "unplace" | "fit" | "cell-image";
/** personnalisation-3 (H12) : Alt+Entrée loger, Alt+Maj+Entrée sortir, Alt+F agrandir / rétrécir, Alt+I fond de case ;
 *  par `code` (Alt change `key` sous macOS) ; hors champ, hors IME, sans Ctrl ni Cmd (Alt Gr = Ctrl+Alt refusé). */
export function cellKey(e: KeyLike): CellKey | null {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.isComposing || inEditable(e.target)) return null;
  const code = e.code ?? "";
  if (code === "Enter" || e.key === "Enter") return e.shiftKey ? "unplace" : "place";
  if (e.shiftKey) return null;
  if (code === "KeyF") return "fit";
  if (code === "KeyI") return "cell-image";
  return null;
}

export type TableKey = "header-toggle" | "col-wider" | "col-narrower" | "row-taller" | "row-shorter";
/** personnalisation-3 (H12) : touches de l'outil Tableau : Alt+→ ← largeur ± 8, Alt+↓ ↑ hauteur ± 8 (Ctrl+Alt+flèche est pris par le système : bureau, rotation d'écran ; Ctrl+flèche = ordre, Alt+Maj+flèche = objet relié, OG12) ; hors champ,
 *  hors IME, sans Ctrl, Cmd ni Maj. Le moteur la prend avec l'outil Tableau et une case active, et la page appelle preventDefault (Alt+← = page précédente). */
export function tableKey(e: KeyLike): TableKey | null {
  if (e.isComposing || e.metaKey || inEditable(e.target)) return null;
  if (!e.altKey || e.ctrlKey || e.shiftKey) return null;
  if (e.code === "KeyE") return "header-toggle";
  if (e.key === "ArrowRight") return "col-wider";
  if (e.key === "ArrowLeft") return "col-narrower";
  if (e.key === "ArrowDown") return "row-taller";
  if (e.key === "ArrowUp") return "row-shorter";
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

export type ScrollKey = "up" | "down" | "screen-up" | "screen-down" | "top" | "bottom";

/** OG24 (ascenseur du portrait) : ↑ ↓ d'un cran, Maj+↑ ↓ d'un écran (PageUp/PageDown changent de page, DA9), Début et Fin ;
 *  sans Ctrl, Cmd ni Alt (Ctrl+↑ ↓ : ordre des objets), hors IME, hors champ et hors contrôle de formulaire (une réglette
 *  ou une liste focalisée garde ses flèches, Début et Fin). */
export function scrollKey(e: KeyLike): ScrollKey | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || inEditable(e.target)) return null;
  if (EDITABLE.has(e.target?.tagName?.toUpperCase() ?? "")) return null;
  if (e.key === "ArrowUp") return e.shiftKey ? "screen-up" : "up";
  if (e.key === "ArrowDown") return e.shiftKey ? "screen-down" : "down";
  if (e.shiftKey) return null;
  if (e.key === "Home") return "top";
  if (e.key === "End") return "bottom";
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

export type AppShortcut = "backgrounds" | "palm-eraser";

/** personnalisation-1b (Q28) : raccourcis de l'application, écoutés par `App.tsx` (jamais par le moteur) : Ctrl+Maj+F
 *  (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre des fonds ; OG25 : Ctrl+Maj+H (Cmd+Maj+H) coupe ou rallume la gomme
 *  automatique à la paume ; hors champ de saisie, hors composition, jamais avec Alt. */
export function appShortcut(e: KeyLike): AppShortcut | null {
  if (e.isComposing || e.altKey || !e.shiftKey || !(e.ctrlKey || e.metaKey)) return null;
  if (inEditable(e.target)) return null;
  const key = e.key.toLowerCase();
  return key === "f" ? "backgrounds" : key === "h" ? "palm-eraser" : null;
}
