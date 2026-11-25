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

/** `withEditOriginal` : « Modifier dans l'application d'origine » (C16, O19), absent du profil simple. */
const pagesBar = (withEditOriginal = false) => ({
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
        ...(withEditOriginal ? [{ ...action("edit-original", "Modifier dans l'application d'origine"), requires: ["officeConverter"] }] : []),
        action("export-pdf", "Exporter en PDF…"),
        action("export-iwb", "Enregistrer une copie au format .iwb…"),
        action("export-ubz", "Enregistrer une copie au format .ubz…"),
      ],
    },
  ],
});

/** C11a (P6, P19) : éléments qui exigent la capacité (masqués sur le web, l'iPad et Android). */
const needs = <T extends object>(item: T) => ({ ...item, requires: ["desktopAnnotation"] });
/** C11a (P6) : entrée « Annotation du bureau », gardée dans la barre d'outils (design-l4, L4-5). */
const annotationEntry = () => needs(action("desktop-annotation", "Annotation du bureau"));
const annotationZone = () => needs({ id: "depot-annotation", kind: "dropzone", label: "Déposer ici" });
/** design-l4 (L4-5) : outil ou action présent aussi dans la barre d'outils : préfixe `ann-` (un id est unique dans tout
 *  le profil, `toolbar.ts:322`). */
const annTool = (t: string, label: string) => ({ id: `ann-${t}`, kind: "tool", tool: t, label });
const annAction = (a: string, label: string) => ({ id: `ann-${a}`, kind: "action", action: a, label });
const pointer = () => needs(action("annotation-pointer", "Souris"));
// C11b (P29) : figer le bureau, envoyer au tableau, envoyer dans un nouvel onglet.
const freeze = () => needs(action("annotation-freeze", "Figer le bureau"));
const screen = () => needs(action("annotation-screen", "Écran suivant"));
const send = () => needs(action("annotation-send", "Envoyer au tableau"));
const sendNew = () => needs(action("annotation-send-new", "Envoyer dans un nouvel onglet"));
const leave = () => needs(annAction("desktop-annotation", "Annotation du bureau"));

/** design-l4 (L4-6, Q9) : barre d'annotation de `defaut` et `annotation`, en haut, dernière de `toolbars` (L4-1). */
const defaultAnnotationBar = () => ({
  id: "annotation",
  role: "annotation",
  dock: "top",
  groups: [
    { id: "mode", items: [pointer()] },
    { id: "dessin", items: [sep("ann-sep-1"), annTool("pen", "Stylo"), annTool("eraser", "Gomme"), annAction("eraser-mode", "Gomme : partielle"), annTool("arrow", "Flèche"), annTool("rect", "Rectangle"), annTool("text", "Texte")] },
    { id: "bureau", items: [sep("ann-sep-2"), annAction("undo", "Annuler"), freeze(), screen()] },
    { id: "envoi", items: [sep("ann-sep-3"), annotationZone(), send(), sendNew()] },
    { id: "sortie", items: [sep("ann-sep-4"), leave()] },
  ],
});

/** design-l4 (L4-7) : barre d'annotation de `simple`, à gauche comme sa barre d'outils, sans zone. */
const simpleAnnotationBar = () => ({
  id: "annotation",
  role: "annotation",
  dock: "left",
  groups: [
    { id: "mode", items: [pointer()] },
    { id: "dessin", items: [sep("ann-sep-1"), annTool("pen", "Stylo"), annTool("eraser", "Gomme")] },
    { id: "historique", items: [sep("ann-sep-2"), annAction("undo", "Annuler")] },
    { id: "bureau", items: [sep("ann-sep-3"), freeze(), screen()] },
    { id: "envoi", items: [sep("ann-sep-4"), send(), sendNew()] },
    { id: "sortie", items: [sep("ann-sep-5"), leave()] },
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
      { id: "edition", items: [sep("sep-1"), tool("select", "Sélection"), tool("rect", "Rectangle"), tool("ellipse", "Ellipse"), tool("line", "Ligne"), tool("arrow", "Flèche"), tool("text", "Texte"), tool("table", "Tableau"), tool("fill", "Pot")] },
      { id: "historique", items: [sep("sep-2"), action("undo", "Annuler"), action("redo", "Rétablir")] },
      { id: "fichier", items: [sep("sep-3"), action("file-new", "Nouveau"), action("file-open", "Ouvrir"), action("file-import", "Importer"), action("file-save", "Enregistrer"), action("file-save-as", "Enregistrer sous")] },
      { id: "vue", items: [sep("sep-4"), action("fit-page", "Ajuster la page"), action("grid", "Grille"), action("library", "Bibliothèque"), action("profiles", "Profil"), action("settings", "Réglages"), annotationEntry()] },
    ],
  },
  pagesBar(true),
  defaultAnnotationBar(),
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
        { id: "vue", items: [sep("sep-2"), action("fit-page", "Ajuster la page"), action("profiles", "Profil"), action("settings", "Réglages"), annotationEntry()] },
      ],
    },
    pagesBar(),
    simpleAnnotationBar(),
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
