// OG11 (DA-6) : une seule table des raccourcis — le menu ☰ les affiche, l'Aide (lot 2) les liste.
import { inEditable, type KeyLike } from "../engine/input/keys";
export interface Shortcut { readonly id: string; readonly group: string; readonly label: string; readonly keys: string }
const s = (id: string, group: string, label: string, keys: string): Shortcut => Object.freeze({ id, group, label, keys });
export const SHORTCUTS: readonly Shortcut[] = Object.freeze([
  s("file-new", "Fichier", "Nouveau", "Ctrl+N"),
  s("file-open", "Fichier", "Ouvrir", "Ctrl+O"),
  s("file-save", "Fichier", "Enregistrer", "Ctrl+S"),
  s("file-save-as", "Fichier", "Enregistrer sous", "Ctrl+Maj+S"),
  s("export-pdf", "Fichier", "Exporter en PDF…", "Ctrl+Maj+E"),
  s("undo", "Édition", "Annuler", "Ctrl+Z"),
  s("redo", "Édition", "Rétablir", "Ctrl+Y"),
  s("copy", "Édition", "Copier", "Ctrl+C"),
  s("cut", "Édition", "Couper", "Ctrl+X"),
  s("paste", "Édition", "Coller", "Ctrl+V"),
  s("group", "Édition", "Grouper", "Ctrl+G"),
  s("ungroup", "Édition", "Dégrouper", "Ctrl+Maj+G"),
  s("duplicate", "Édition", "Dupliquer", "Ctrl+D"),
  s("delete", "Édition", "Supprimer", "Suppr"),
  s("escape", "Édition", "Désélectionner", "Échap"),
  s("link", "Édition", "Lien", "Ctrl+K"),
  s("front", "Disposition", "Premier plan", "Ctrl+Maj+↑"),
  s("forward", "Disposition", "Avancer", "Ctrl+↑"),
  s("backward", "Disposition", "Reculer", "Ctrl+↓"),
  s("back", "Disposition", "Arrière-plan", "Ctrl+Maj+↓"),
  s("pan", "Vue", "Déplacer la vue", "Espace + glisser"),
  s("help", "Vue", "Aide", "?"),
  s("bold", "Texte", "Gras, italique, souligné", "Ctrl+B, I, U"),
  s("stroke-picker", "Options", "Couleur du trait", "S"),
  s("fill-picker", "Options", "Couleur de l'arrière-plan", "G"),
]);
const MAC: ReadonlyArray<readonly [string, string]> = [["Ctrl+", "⌘"], ["Maj+", "⇧"], ["Alt+", "⌥"]];
export function shortcutText(id: string, mac: boolean): string | null {
  const hit = SHORTCUTS.find((x) => x.id === id);
  if (hit === undefined) return null;
  return mac ? MAC.reduce((t, [a, b]) => t.split(a).join(b), hit.keys) : hit.keys;
}
export const isMac = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** « ? » : ouvre l'Aide ; hors champ de saisie, sans Ctrl, Méta ni Alt (Maj admis : « ? » le demande), hors composition. */
export function isHelpKey(e: Omit<KeyLike, "target"> & { readonly target: unknown }): boolean {
  return e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !inEditable(e.target as KeyLike["target"]);
}
