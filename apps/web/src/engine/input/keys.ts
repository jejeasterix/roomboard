/** Raccourcis d'annulation (D11) : Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z ; Cmd sous macOS. */
export interface KeyLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly isComposing: boolean;
  readonly target: { readonly tagName?: string; readonly isContentEditable?: boolean } | null;
}

export type KeyAction = "undo" | "redo";

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function keyAction(e: KeyLike): KeyAction | null {
  // Composition IME : la touche appartient à l'IME (D14). Alt Gr = Ctrl+Alt sous Windows : un caractère, pas un raccourci.
  if (e.isComposing || e.altKey) return null;
  if (!(e.ctrlKey || e.metaKey)) return null;
  const t = e.target;
  if (t !== null && (t.isContentEditable === true || (t.tagName !== undefined && EDITABLE.has(t.tagName.toUpperCase())))) {
    return null;
  }
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y" && !e.shiftKey) return "redo";
  return null;
}
