// OG11 (DA-6) : une seule table des raccourcis — le menu ☰ les affiche, l'Aide (lot 2) les liste.
export interface Shortcut { readonly id: string; readonly group: string; readonly label: string; readonly keys: string }
const s = (id: string, group: string, label: string, keys: string): Shortcut => Object.freeze({ id, group, label, keys });
export const SHORTCUTS: readonly Shortcut[] = Object.freeze([
  s("file-new", "Fichier", "Nouveau", "Ctrl+N"),
  s("file-open", "Fichier", "Ouvrir", "Ctrl+O"),
  s("file-save", "Fichier", "Enregistrer", "Ctrl+S"),
  s("file-save-as", "Fichier", "Enregistrer sous", "Ctrl+Maj+S"),
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
  s("pan", "Vue", "Déplacer la vue", "Espace + glisser"),
  s("bold", "Texte", "Gras, italique, souligné", "Ctrl+B, I, U"),
  // OG19 (H1-11) : actions de la barre d'outils ; l'id est celui de l'action, l'infobulle de son bouton le montre.
  s("backgrounds", "Vue", "Fonds", "Ctrl+Maj+F"),
  s("cell-place", "Tableau", "Loger la sélection dans la case", "Alt+Entrée"),
  s("table-fit", "Tableau", "Agrandir ou rétrécir pour les objets", "Alt+F"),
  s("cell-image", "Tableau", "Mettre l'image logée en fond", "Alt+I"),
  s("cell-unplace", "Tableau", "Sortir la sélection de sa case", "Alt+Maj+Entrée"),
  s("page-prev", "Pages", "Page précédente", "Pg préc"),
  s("page-next", "Pages", "Page suivante", "Pg suiv"),
  s("page-number", "Pages", "Barre latérale, onglet Pages", "Ctrl+Maj+P"),
]);
const MAC: ReadonlyArray<readonly [string, string]> = [["Ctrl+", "⌘"], ["Maj+", "⇧"], ["Alt+", "⌥"]];
export function shortcutText(id: string, mac: boolean): string | null {
  const hit = SHORTCUTS.find((x) => x.id === id);
  if (hit === undefined) return null;
  return mac ? MAC.reduce((t, [a, b]) => t.split(a).join(b), hit.keys) : hit.keys;
}
/** Noms `aria-keyshortcuts` (WAI-ARIA) des parties d'un raccourci de la table. */
const ARIA: Readonly<Record<string, string>> = { Maj: "Shift", Alt: "Alt", Suppr: "Delete", "Échap": "Escape", "Pg préc": "PageUp", "Pg suiv": "PageDown" };
/** OG19 : valeur `aria-keyshortcuts` d'un raccourci (Ctrl → Control, ou Meta sous macOS) ; null pour un geste
 *  (« Espace + glisser »), une liste (« Ctrl+B, I, U ») ou un id absent de la table. */
export function ariaShortcut(id: string, mac: boolean): string | null {
  const keys = SHORTCUTS.find((x) => x.id === id)?.keys;
  if (keys === undefined || keys.includes(",") || keys.includes(" + ")) return null;
  return keys
    .split("+")
    .map((k) => (k === "Ctrl" ? (mac ? "Meta" : "Control") : Object.hasOwn(ARIA, k) ? ARIA[k]! : k))
    .join("+");
}
export const isMac = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** OG19 : raccourci d'un bouton de barre, lu dans la table par l'id de son action ; null sans raccourci. */
export function buttonShortcut(action: string | undefined): { readonly text: string; readonly aria: string | null } | null {
  if (action === undefined) return null;
  const mac = isMac();
  const text = shortcutText(action, mac);
  return text === null ? null : { text, aria: ariaShortcut(action, mac) };
}
