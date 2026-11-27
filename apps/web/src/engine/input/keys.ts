/** Raccourcis d'annulation (D11) : Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z ; Cmd sous macOS. Ctrl+G grouper, Ctrl+Maj+G dégrouper (C3, Z13). */
export interface KeyLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly isComposing: boolean;
  readonly target: { readonly tagName?: string; readonly isContentEditable?: boolean } | null;
}

export type KeyAction = "undo" | "redo" | "group" | "ungroup";

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Cible d'édition (champ, zone éditable) : ses touches lui appartiennent. Un bouton n'en est pas une. */
const inEditable = (t: KeyLike["target"]): boolean =>
  t !== null && (t.isContentEditable === true || (t.tagName !== undefined && EDITABLE.has(t.tagName.toUpperCase())));

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
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "d") return "duplicate";
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
