import { parseProfile, type Profile } from "./toolbar";

/**
 * Profils livrés (CL5b-9, C1 P9), figés ; une copie utilisateur de même `id` les remplace dans le magasin (U11, P5),
 * « Remettre à zéro ce profil » la retire.
 */
export const DEFAULT_PROFILE_ID = "defaut";
export const SIMPLE_PROFILE_ID = "simple";
export const ANNOTATION_PROFILE_ID = "annotation";

/** Fige un objet et tout ce qu'il contient. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

const tool = (id: string, label: string) => ({ id, kind: "tool", tool: id, label });
const action = (id: string, label: string) => ({ id, kind: "action", action: id, label });
const sep = (id: string) => ({ id, kind: "separator", label: "" });

const pagesBar = () => ({
  id: "pages",
  role: "pages",
  dock: "bottom",
  groups: [
    {
      id: "pages",
      items: [
        action("page-prev", "Page précédente"),
        action("page-next", "Page suivante"),
        action("page-add", "Ajouter une page"),
        action("page-remove", "Retirer la page"),
        action("page-insert-file", "Insérer des pages…"),
      ],
    },
  ],
});

const presets = () => ({
  pen: [
    { id: "noir", label: "Noir", color: "#000000", width: 4 },
    { id: "rouge", label: "Rouge", color: "#dc2626", width: 4 },
    { id: "bleu", label: "Bleu", color: "#1d4ed8", width: 4 },
  ],
});

/** Barres du profil par défaut : une seule source pour `defaut` et `annotation` (P9). */
const defaultToolbars = () => [
  {
    id: "outils",
    role: "tools",
    dock: "top",
    groups: [
      { id: "dessin", items: [tool("pen", "Stylo"), tool("eraser", "Gomme"), action("eraser-mode", "Gomme : partielle"), tool("hand", "Main")] },
      { id: "edition", items: [sep("sep-1"), tool("select", "Sélection"), tool("rect", "Rectangle"), tool("ellipse", "Ellipse"), tool("line", "Ligne"), tool("arrow", "Flèche"), tool("text", "Texte"), tool("table", "Tableau")] },
      { id: "historique", items: [sep("sep-2"), action("undo", "Annuler"), action("redo", "Rétablir")] },
      { id: "fichier", items: [sep("sep-3"), action("file-new", "Nouveau"), action("file-open", "Ouvrir"), action("file-import", "Importer"), action("file-save", "Enregistrer"), action("file-save-as", "Enregistrer sous")] },
      { id: "vue", items: [sep("sep-4"), action("fit-page", "Ajuster la page"), action("grid", "Grille"), action("profiles", "Profil"), action("settings", "Réglages")] },
    ],
  },
  pagesBar(),
];

export const DEFAULT_PROFILE_JSON: Readonly<Record<string, unknown>> = deepFreeze({
  format: "roomboard-profile",
  schema: 1,
  id: DEFAULT_PROFILE_ID,
  label: "Par défaut",
  interface: { buttonSize: "m" },
  toolbars: defaultToolbars(),
  presets: presets(),
  behavior: { startMode: "board" },
});

export const SIMPLE_PROFILE_JSON: Readonly<Record<string, unknown>> = deepFreeze({
  format: "roomboard-profile",
  schema: 1,
  id: SIMPLE_PROFILE_ID,
  label: "Simple (grands boutons)",
  interface: { buttonSize: "l" },
  toolbars: [
    {
      id: "outils",
      role: "tools",
      dock: "left",
      groups: [
        { id: "dessin", items: [tool("pen", "Stylo"), tool("eraser", "Gomme"), tool("hand", "Main")] },
        { id: "historique", items: [sep("sep-1"), action("undo", "Annuler"), action("redo", "Rétablir")] },
        { id: "vue", items: [sep("sep-2"), action("fit-page", "Ajuster la page"), action("profiles", "Profil"), action("settings", "Réglages")] },
      ],
    },
    pagesBar(),
  ],
  presets: presets(),
  behavior: { startMode: "board" },
});

/** « Annotation au démarrage » (U14, P9) : barres et préréglages de `defaut`, rabattu sur `board` sans la capacité. */
export const ANNOTATION_PROFILE_JSON: Readonly<Record<string, unknown>> = deepFreeze({
  format: "roomboard-profile",
  schema: 1,
  id: ANNOTATION_PROFILE_ID,
  label: "Annotation au démarrage",
  interface: { buttonSize: "m" },
  toolbars: defaultToolbars(),
  presets: presets(),
  behavior: { startMode: "desktop-annotation" },
});

function load(json: Readonly<Record<string, unknown>>): Profile {
  const r = parseProfile(json);
  if ("errors" in r) throw new Error(`profil livré ${String(json.id)} invalide : ${r.errors.join(" ; ")}`);
  return deepFreeze(r.profile);
}

/** Profils livrés, figés (usage § 8 point 7) ; lève au chargement du module si l'un est invalide. */
export const BUILTIN_PROFILES: readonly Profile[] = deepFreeze([
  load(DEFAULT_PROFILE_JSON),
  load(SIMPLE_PROFILE_JSON),
  load(ANNOTATION_PROFILE_JSON),
]);

export function builtinProfile(id: string): Profile | null {
  return BUILTIN_PROFILES.find((p) => p.id === id) ?? null;
}
