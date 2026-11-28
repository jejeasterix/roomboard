// OG11 (DA-6) : une seule table des raccourcis — le menu ☰ les affiche, l'Aide (lot 2) les liste.
import { inEditable, type KeyLike } from "../engine/input/keys";
export interface Shortcut { readonly id: string; readonly group: string; readonly label: string; readonly keys: string }
const s = (id: string, group: string, label: string, keys: string): Shortcut => Object.freeze({ id, group, label, keys });
const TOOL_ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["select", "Sélection", "V", "1"], ["rect", "Rectangle", "R", "2"], ["diamond", "Losange", "D", "3"], ["ellipse", "Ellipse", "O", "4"],
  ["arrow", "Flèche", "A", "5"], ["line", "Ligne", "L", "6"], ["pen", "Crayon", "P", "7"], ["text", "Texte", "T", "8"], ["eraser", "Gomme", "E", "0"],
];
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
  s("line-edit", "Édition", "Modifier les points", "Ctrl+Entrée"),
  // Fusion OG12 × OG23 : Alt+Maj+flèche sert aussi « Aligner » (align-*, plus bas). Le geste contextuel prime dans son
  // contexte (engine.ts, `key`) : un rectangle ou une ellipse seul, ou une séance « Modifier les points », va à OG12 ;
  // hors de ces contextes (au moins deux unités), Aligner.
  s("linked-node", "Édition", "Objet relié", "Alt+Maj+↑ ↓ ← →"),
  s("flow-nav", "Édition", "Aller à l'objet relié", "Alt+↑ ↓ ← →"),
  s("no-binding", "Édition", "Flèche sans liaison", "Ctrl tenu"),
  s("front", "Disposition", "Premier plan", "Ctrl+Maj+↑"),
  s("forward", "Disposition", "Avancer", "Ctrl+↑"),
  s("backward", "Disposition", "Reculer", "Ctrl+↓"),
  s("back", "Disposition", "Arrière-plan", "Ctrl+Maj+↓"),
  s("flip-h", "Transformer", "Retourner horizontalement", "Maj+H"),
  s("flip-v", "Transformer", "Retourner verticalement", "Maj+V"),
  s("rotate-cw", "Transformer", "Tourner de 90° à droite", "Maj+R"),
  s("rotate-ccw", "Transformer", "Tourner de 90° à gauche", "Alt+Maj+R"),
  s("rotate-15-cw", "Transformer", "Tourner de 15° à droite", "Alt+T"),
  s("rotate-15-ccw", "Transformer", "Tourner de 15° à gauche", "Alt+Maj+T"),
  s("rotate-handle", "Transformer", "Tourner (poignée ; Maj : pas de 15°)", "Maj + glisser"),
  s("align-left", "Aligner", "Aligner à gauche", "Alt+Maj+←"),
  s("align-right", "Aligner", "Aligner à droite", "Alt+Maj+→"),
  s("align-top", "Aligner", "Aligner en haut", "Alt+Maj+↑"),
  s("align-bottom", "Aligner", "Aligner en bas", "Alt+Maj+↓"),
  s("align-center", "Aligner", "Centrer horizontalement", "Alt+Maj+H"),
  s("align-middle", "Aligner", "Centrer verticalement", "Alt+Maj+V"),
  s("distribute-h", "Aligner", "Répartir horizontalement", "Alt+H"),
  s("distribute-v", "Aligner", "Répartir verticalement", "Alt+V"),
  s("nudge", "Aligner", "Déplacer la sélection (Maj : 5 px)", "←"),
  s("pan", "Vue", "Déplacer la vue", "Espace + glisser"),
  s("help", "Vue", "Aide", "?"),
  // OG19 (H1-11) : actions de la barre d'outils ; l'id est celui de l'action, l'infobulle de son bouton le montre.
  // Une ligne se range dans le bloc de son groupe : l'Aide affiche les groupes dans l'ordre de la table.
  s("backgrounds", "Vue", "Fonds", "Ctrl+Maj+F"),
  s("bold", "Texte", "Gras, italique, souligné", "Ctrl+B, I, U"),
  s("stroke-picker", "Options", "Couleur du trait", "S"),
  s("fill-picker", "Options", "Couleur de l'arrière-plan", "G"),
  s("pipette", "Options", "Pipette (sélecteur ouvert)", "I"),
  s("cell-place", "Tableau", "Loger la sélection dans la case", "Alt+Entrée"),
  s("table-fit", "Tableau", "Agrandir ou rétrécir pour les objets", "Alt+F"),
  s("cell-image", "Tableau", "Mettre l'image logée en fond", "Alt+I"),
  s("table-header", "Tableau", "Basculer l'en-tête", "Alt+E"),
  s("table-fit-content", "Tableau", "Ajuster au contenu", "Alt+A"),
  s("table-border-set", "Tableau", "Bordure de la case", "Alt+B"),
  s("table-border-none", "Tableau", "Aucune bordure", "Alt+Maj+B"),
  s("table-ha-next", "Tableau", "Alignement horizontal suivant", "Alt+Maj+C"),
  s("table-va-next", "Tableau", "Alignement vertical suivant", "Alt+Maj+M"),
  s("table-col-wider", "Tableau", "Élargir la colonne", "Alt+→"),
  s("table-col-narrower", "Tableau", "Rétrécir la colonne", "Alt+←"),
  s("table-row-taller", "Tableau", "Agrandir la ligne", "Alt+↓"),
  s("table-row-shorter", "Tableau", "Réduire la ligne", "Alt+↑"),
  s("table-row-up", "Tableau", "Monter la ligne", "Ctrl+Maj+↑"),
  s("table-row-down", "Tableau", "Descendre la ligne", "Ctrl+Maj+↓"),
  s("table-col-left", "Tableau", "Colonne à gauche", "Ctrl+Maj+←"),
  s("table-col-right", "Tableau", "Colonne à droite", "Ctrl+Maj+→"),
  s("cell-unplace", "Tableau", "Sortir la sélection de sa case", "Alt+Maj+Entrée"),
  s("page-prev", "Pages", "Page précédente", "Pg préc"),
  s("page-next", "Pages", "Page suivante", "Pg suiv"),
  s("page-number", "Pages", "Barre latérale, onglet Pages", "Ctrl+Maj+P"),
  // OG25 (déc. 27) : coupe ou rallume la gomme automatique à la paume (réglage de l'appareil), avec un avis.
  // Lot 2a (n° 35) : lettres et chiffres d'outil d'Excalidraw ; S et G (sélecteurs de couleur) restent pris, 9 sans outil.
  ...TOOL_ROWS.flatMap(([id, label, letter, digit]) => [s(`tool-${id}`, "Outils", label, letter), s(`tool-${id}-num`, "Outils", `${label} (chiffre)`, digit)]),
  s("tool-hand", "Outils", "Main", "H"),
  s("palm-eraser", "Outils", "Gomme automatique à la paume", "Ctrl+Maj+H"),
]);
const MAC: ReadonlyArray<readonly [string, string]> = [["Ctrl+", "⌘"], ["Maj+", "⇧"], ["Alt+", "⌥"]];
export function shortcutText(id: string, mac: boolean): string | null {
  const hit = SHORTCUTS.find((x) => x.id === id);
  if (hit === undefined) return null;
  return mac ? MAC.reduce((t, [a, b]) => t.split(a).join(b), hit.keys) : hit.keys;
}
/** Noms `aria-keyshortcuts` (WAI-ARIA) des parties d'un raccourci de la table. */
const ARIA: Readonly<Record<string, string>> = { Maj: "Shift", Alt: "Alt", Suppr: "Delete", "Échap": "Escape", "Pg préc": "PageUp", "Pg suiv": "PageDown", "↑": "ArrowUp", "↓": "ArrowDown", "←": "ArrowLeft", "→": "ArrowRight", "Entrée": "Enter" };
/** OG19 : valeur `aria-keyshortcuts` d'un raccourci (Ctrl → Control, ou Meta sous macOS) ; null pour un geste
 *  (« Espace + glisser »), une liste (« Ctrl+B, I, U ») ou un id absent de la table. */
export function ariaShortcut(id: string, mac: boolean): string | null {
  const keys = SHORTCUTS.find((x) => x.id === id)?.keys;
  if (keys === undefined || keys.includes(",") || keys.includes(" + ") || /[↑↓←→] [↑↓←→]/.test(keys)) return null;
  return keys
    .split("+")
    .map((k) => (k === "Ctrl" ? (mac ? "Meta" : "Control") : Object.hasOwn(ARIA, k) ? ARIA[k]! : k))
    .join("+");
}
export const isMac = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** « ? » : ouvre l'Aide ; hors champ de saisie, sans Ctrl, Méta ni Alt (Maj admis : « ? » le demande), hors composition. */
export function isHelpKey(e: Omit<KeyLike, "target"> & { readonly target: unknown }): boolean {
  return e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !inEditable(e.target as KeyLike["target"]);
}

/** OG19 : raccourci d'un bouton de barre, lu dans la table par l'id de son action ; null sans raccourci. */
export function buttonShortcut(action: string | undefined): { readonly text: string; readonly aria: string | null } | null {
  if (action === undefined) return null;
  const mac = isMac();
  const text = shortcutText(action, mac);
  return text === null ? null : { text, aria: ariaShortcut(action, mac) };
}

/** OG33 (lot 2b, choix 2) : lettre et chiffre d'un outil (lignes `tool-<id>` et `tool-<id>-num`), montrés dans son
 *  infobulle : « R ou 2 » ; `aria-keyshortcuts` « R 2 » (deux raccourcis séparés par une espace, WAI-ARIA) ; null sans lettre. */
export function toolShortcut(tool: string | undefined): { readonly text: string; readonly aria: string } | null {
  if (tool === undefined) return null;
  const letter = shortcutText(`tool-${tool}`, false);
  if (letter === null) return null;
  const digit = shortcutText(`tool-${tool}-num`, false);
  return digit === null ? { text: letter, aria: letter } : { text: `${letter} ou ${digit}`, aria: `${letter} ${digit}` };
}
