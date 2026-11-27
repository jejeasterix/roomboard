import type { ToolChoice } from "./engine/input/gesture";

/** Identifiant d'outil : chaîne ouverte, connue par `TOOL_TABLE` (usage § 8 point 3), jamais une union figée. */
export type ToolId = string;

// ---------------------------------------------------------------------------------------------------------------
// Profil de barre versionné (D22, DA10 étendu par U11-U14 ; usage § 8 points 1-7, 11, 17).
// Chaque objet garde ses clés inconnues dans `rest` ; `serializeProfile` écrit `{ ...rest, ...champs connus }` à
// chaque niveau : un profil d'une mineure plus récente se réécrit sans rien perdre.
// ---------------------------------------------------------------------------------------------------------------

export const PROFILE_FORMAT = "roomboard-profile";
export const PROFILE_SCHEMA = 1;
export const PROFILE_MINOR = 1;

export type Dock = "top" | "bottom" | "left" | "right" | "floating";
export const DOCKS: readonly Dock[] = Object.freeze(["top", "bottom", "left", "right", "floating"]);
export type ItemKind = "tool" | "action" | "dropzone" | "separator";
export const ITEM_KINDS: readonly ItemKind[] = Object.freeze(["tool", "action", "dropzone", "separator"]);
export type ButtonSize = "s" | "m" | "l";
export const BUTTON_SIZES: readonly ButtonSize[] = Object.freeze(["s", "m", "l"]);
export type StartMode = "board" | "desktop-annotation";
export const START_MODES: readonly StartMode[] = Object.freeze(["board", "desktop-annotation"]);
/** personnalisation-1a (décisions 20, 22) : coin ou bord où l'îlot d'une barre se pose ; absent : voie par défaut. */
export type BarAnchor = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center" | "side-start" | "side-end";
export const BAR_ANCHORS: readonly BarAnchor[] = Object.freeze([
  "top-start",
  "top-center",
  "top-end",
  "bottom-start",
  "bottom-center",
  "side-start",
  "side-end",
]);
/** personnalisation-1a (décision 7) : mode d'une page neuve ; réexporté tel quel par `core/api.ts`. */
export type PageLayout = "landscape" | "portrait" | "infinite";
const PAGE_LAYOUTS: readonly PageLayout[] = Object.freeze(["landscape", "portrait", "infinite"]);
export type ActionId = string;
export type CapabilityKey = "desktopAnnotation" | "multiWindow" | "dropPaths" | "officeConverter";
export const CAPABILITY_KEYS: readonly CapabilityKey[] = Object.freeze([
  "desktopAnnotation",
  "multiWindow",
  "dropPaths",
  "officeConverter",
]);
export type RuntimeCapabilities = Readonly<Record<CapabilityKey, boolean>>;
export type Rest = Readonly<Record<string, unknown>>;

export interface ToolItem {
  readonly id: string;
  readonly kind: ItemKind;
  readonly tool?: ToolId;
  readonly action?: ActionId;
  readonly label: string;
  readonly icon?: string;
  readonly options?: Rest;
  /** Masqué par l'utilisateur (D22 : masqué, pas supprimé) ; écrit seulement s'il est vrai (C1, P2). */
  readonly hidden?: boolean;
  /** Capacités exigées ; une clé inconnue (profil plus récent) est gardée et rend l'élément invisible. */
  readonly requires: readonly CapabilityKey[];
  readonly rest: Rest;
}
export interface ToolbarGroup { readonly id: string; readonly items: readonly ToolItem[]; readonly rest: Rest }
export interface Toolbar {
  readonly id: string;
  readonly role: string;
  readonly dock: Dock;
  /** Écrit seulement s'il est posé ; une valeur inconnue est lue absente (avertissement). */
  readonly anchor?: BarAnchor;
  readonly collapsed: boolean;
  readonly groups: readonly ToolbarGroup[];
  readonly rest: Rest;
}
export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
  readonly width?: number;
  readonly size?: number;
  readonly rest: Rest;
}
export interface Profile {
  readonly schema: number;
  readonly minor: number;
  readonly id: string;
  readonly label: string;
  /** Profil livré dont celui-ci dérive, écrit par « Enregistrer comme nouveau » (C1, P3). */
  readonly basedOn?: string;
  readonly interface: { readonly buttonSize: ButtonSize; readonly rest: Rest };
  readonly toolbars: readonly Toolbar[];
  readonly presets: Readonly<Record<ToolId, readonly Preset[]>>;
  readonly behavior: { readonly startMode: StartMode; readonly pageMode: PageLayout; readonly rest: Rest };
  readonly rest: Rest;
}
export type ParsedProfile = { readonly profile: Profile; readonly warnings: string[] } | { readonly errors: string[] };

export interface ToolEntry { readonly label: string; readonly choice: ToolChoice }

/** Outils connus du moteur : un outil de profil absent d'ici est gardé et masqué (U13). */
export const TOOL_TABLE: Readonly<Record<ToolId, ToolEntry>> = Object.freeze({
  pen: { label: "Stylo", choice: "pen" },
  eraser: { label: "Gomme", choice: "eraser" },
  hand: { label: "Main", choice: "hand" },
  select: { label: "Sélection", choice: "select" },
  rect: { label: "Rectangle", choice: "rect" },
  ellipse: { label: "Ellipse", choice: "ellipse" },
  line: { label: "Ligne", choice: "line" },
  arrow: { label: "Flèche", choice: "arrow" },
  text: { label: "Texte", choice: "text" },
  table: { label: "Tableau", choice: "table" },
  fill: { label: "Pot", choice: "fill" },
});

/** Actions connues : celles de l'ancienne barre (inventaire du plan du lot 5b), et « Grille » (C9 éditeur). */
export const ACTION_TABLE: Readonly<Record<ActionId, { readonly label: string }>> = Object.freeze({
  "eraser-mode": { label: "Gomme : partielle" },
  undo: { label: "Annuler" },
  redo: { label: "Rétablir" },
  "page-prev": { label: "Page précédente" },
  "page-next": { label: "Page suivante" },
  "page-add": { label: "Ajouter une page" },
  "page-remove": { label: "Retirer la page" },
  "page-insert-file": { label: "Insérer des pages…" },
  "page-number": { label: "Numéro de page" },
  "page-duplicate": { label: "Dupliquer la page" },
  "edit-original": { label: "Modifier dans l'application d'origine" },
  "export-pdf": { label: "Exporter en PDF…" },
  "export-iwb": { label: "Enregistrer une copie au format .iwb…" },
  "export-ubz": { label: "Enregistrer une copie au format .ubz…" },
  "fit-page": { label: "Ajuster la page" },
  "file-new": { label: "Nouveau" },
  "file-open": { label: "Ouvrir" },
  "file-import": { label: "Importer" },
  "file-save": { label: "Enregistrer" },
  "file-save-as": { label: "Enregistrer sous" },
  settings: { label: "Réglages" },
  profiles: { label: "Profil" },
  grid: { label: "Grille" },
  library: { label: "Bibliothèque" },
  backgrounds: { label: "Fonds" },
  "desktop-annotation": { label: "Annotation du bureau" },
  "annotation-pointer": { label: "Souris" },
  "annotation-screen": { label: "Écran suivant" },
  "annotation-freeze": { label: "Figer le bureau" },
  "annotation-send": { label: "Envoyer au tableau" },
  "annotation-send-new": { label: "Envoyer dans un nouvel onglet" },
  "table-row-insert": { label: "+ Ligne" },
  "table-col-insert": { label: "+ Colonne" },
  "table-row-remove": { label: "− Ligne" },
  "table-col-remove": { label: "− Colonne" },
  "table-uniform": { label: "Uniformiser" },
  "table-merge": { label: "Fusionner" },
  "table-split": { label: "Diviser" },
  "table-shade": { label: "Ombrer" },
  "table-unshade": { label: "Désombrer" },
});

/** Boutons de structure du tableau (C10a, DAC4 ; C10b, F15), dans l'ordre de la rangée contextuelle. */
export const TABLE_ACTIONS: readonly ActionId[] = Object.freeze([
  "table-row-insert",
  "table-col-insert",
  "table-row-remove",
  "table-col-remove",
  "table-uniform",
  "table-merge",
  "table-split",
  "table-shade",
  "table-unshade",
]);

/** Pastille de remplissage d'une cellule (T12, HC10-5) ; `color` null : retire le remplissage. */
export interface TableFill { readonly id: string; readonly label: string; readonly color: string | null }
/** Aucune, puis cinq teintes claires (le texte noir reste lisible). */
export const TABLE_FILLS: readonly TableFill[] = Object.freeze([
  { id: "aucun", label: "Aucun", color: null },
  { id: "jaune", label: "Jaune", color: "#fef08a" },
  { id: "vert", label: "Vert", color: "#bbf7d0" },
  { id: "bleu", label: "Bleu", color: "#bfdbfe" },
  { id: "rose", label: "Rose", color: "#fecdd3" },
  { id: "gris", label: "Gris", color: "#e5e7eb" },
]);

/** Couleur du pot (C6a, D16, D17) : celle d'un préréglage `presets.fill` ou de la liste figée. */
export interface FillColor { readonly id: string; readonly label: string; readonly color: string }
/** Liste figée du pot, quand le profil n'a pas de `presets.fill`. */
export const FILL_COLORS: readonly FillColor[] = Object.freeze([
  { id: "rouge", label: "Rouge", color: "#dc2626" },
  { id: "jaune", label: "Jaune", color: "#facc15" },
  { id: "vert", label: "Vert", color: "#16a34a" },
  { id: "bleu", label: "Bleu", color: "#1d4ed8" },
  { id: "noir", label: "Noir", color: "#000000" },
]);
/** Bouton qui retire la couleur du pot (D11) : le pot rend alors le fond blanc et retire l'intérieur. */
export const FILL_NONE_LABEL = "Aucune";

/** Couleurs offertes au pot : dès que le profil a la clé `presets.fill` (même vide) elle fait foi, un préréglage sans couleur y est sauté (PC7). */
export function fillChoices(table: Profile["presets"]): readonly FillColor[] {
  if (!Object.hasOwn(table, "fill")) return FILL_COLORS;
  return presetsOf(table, "fill").flatMap((p) => (p.color === undefined ? [] : [{ id: p.id, label: p.label, color: p.color }]));
}

/** Clé propre de la table (jamais héritée : `toString`, `constructor`… ne sont pas des outils). */
export function isKnownTool(id: string): boolean {
  return Object.hasOwn(TOOL_TABLE, id);
}

export function isKnownAction(id: string): boolean {
  return Object.hasOwn(ACTION_TABLE, id);
}

/** Action qui ouvre le menu Profil : jamais masquable, toujours présente dans une barre `tools` (C1, P33). */
export const PROFILES_ACTION: ActionId = "profiles";

export function isProfilesAccess(it: ToolItem): boolean {
  return it.kind === "action" && it.action === PROFILES_ACTION;
}

/** Préréglages de l'outil `tool` dans la table d'un profil (vide si l'outil n'en a pas). */
export function presetsOf(table: Profile["presets"], tool: ToolId): readonly Preset[] {
  return Object.hasOwn(table, tool) ? (table[tool] ?? []) : [];
}

/** `base` s'il est libre, sinon `<base>-<n>` avec le premier n ≥ 2 libre (C1 : P15, P28, P33). */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!taken.has(id)) return id;
  }
}

// --- Analyse ----------------------------------------------------------------------------------------------------

type Raw = Readonly<Record<string, unknown>>;

interface Ctx {
  readonly errors: string[];
  readonly warnings: string[];
  /** Identifiants d'éléments déjà vus : uniques dans tout le profil. */
  readonly seen: Set<string>;
}

const PROFILE_KEYS = ["format", "schema", "minor", "id", "label", "basedOn", "interface", "toolbars", "presets", "behavior"];
const INTERFACE_KEYS = ["buttonSize"];
const BEHAVIOR_KEYS = ["startMode", "pageMode"];
/** Noms de cases fixes de la grille (`ui/layout.ts`, `layoutFor`) : un identifiant de barre ne peut pas les prendre. */
export const RESERVED_BAR_IDS: readonly string[] = Object.freeze(["tabs", "stage"]);

const BAR_KEYS = ["id", "role", "dock", "collapsed", "groups", "anchor"];
const GROUP_KEYS = ["id", "items"];
const ITEM_KEYS = ["id", "kind", "tool", "action", "label", "icon", "options", "requires", "hidden"];
const PRESET_KEYS = ["id", "label", "color", "width", "size"];

const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const includes = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);
const show = (v: unknown): string => JSON.stringify(v) ?? String(v);

/** Clés inconnues de `raw`, gardées telles quelles (`Object.fromEntries` : `__proto__` reste une clé propre). */
function restOf(raw: Raw, known: readonly string[]): Rest {
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !known.includes(k)));
}

function nonEmptyField(raw: Raw, key: string, path: string, ctx: Ctx): string {
  const v = raw[key];
  if (isNonEmpty(v)) return v;
  ctx.errors.push(`${path}.${key} : chaîne non vide attendue`);
  return "";
}

function list(raw: Raw, key: string, path: string, ctx: Ctx): readonly unknown[] {
  const v = raw[key];
  if (Array.isArray(v)) return v;
  ctx.errors.push(`${path}.${key} : liste attendue`);
  return [];
}

function optionalString(raw: Raw, key: string, path: string, ctx: Ctx): string | undefined {
  const v = raw[key];
  if (v === undefined || typeof v === "string") return v;
  ctx.errors.push(`${path}.${key} : chaîne attendue`);
  return undefined;
}

function optionalPositive(raw: Raw, key: string, path: string, ctx: Ctx): number | undefined {
  const v = raw[key];
  if (v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  ctx.errors.push(`${path}.${key} : nombre fini > 0 attendu`);
  return undefined;
}

/** Ce que chaque sorte d'élément exige au-delà de `id` et `kind` (table par sorte, pas de branchement). */
const ITEM_RULES: Readonly<Record<ItemKind, (raw: Raw, id: string, path: string, ctx: Ctx) => void>> = {
  tool: (raw, id, path, ctx) => {
    requireLabel(raw, id, ctx);
    if (!isNonEmpty(raw.tool)) ctx.errors.push(`${path}.tool : identifiant d'outil attendu`);
    else if (!isKnownTool(raw.tool)) ctx.warnings.push(`outil inconnu masqué : ${raw.tool}`);
  },
  action: (raw, id, path, ctx) => {
    requireLabel(raw, id, ctx);
    if (!isNonEmpty(raw.action)) ctx.errors.push(`${path}.action : identifiant d'action attendu`);
    else if (!isKnownAction(raw.action)) ctx.warnings.push(`action inconnue masquée : ${raw.action}`);
  },
  dropzone: (raw, id, _path, ctx) => requireLabel(raw, id, ctx),
  separator: () => undefined,
};

function requireLabel(raw: Raw, id: string, ctx: Ctx): void {
  if (!isNonEmpty(raw.label)) ctx.errors.push(`libellé vide : ${id}`);
}

function parseRequires(raw: Raw, id: string, path: string, ctx: Ctx): readonly CapabilityKey[] {
  const v = raw.requires;
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    ctx.errors.push(`${path}.requires : liste attendue`);
    return [];
  }
  const out: string[] = [];
  for (const key of v) {
    if (typeof key !== "string") {
      ctx.errors.push(`${path}.requires : chaînes attendues`);
      continue;
    }
    if (!includes(CAPABILITY_KEYS, key)) ctx.warnings.push(`capacité inconnue : ${key} (élément ${id} masqué)`);
    out.push(key);
  }
  // Une clé inconnue est gardée pour la réécriture ; `visibleItems` la tient pour fausse.
  return out as CapabilityKey[];
}

function parseItem(raw: unknown, path: string, ctx: Ctx): ToolItem | null {
  if (!isObject(raw)) {
    ctx.errors.push(`${path} : objet attendu`);
    return null;
  }
  const id = nonEmptyField(raw, "id", path, ctx);
  if (id !== "") {
    if (ctx.seen.has(id)) ctx.errors.push(`doublon : ${id}`);
    ctx.seen.add(id);
  }
  const kind = raw.kind;
  if (!includes(ITEM_KINDS, kind)) {
    ctx.errors.push(`${path}.kind : ${show(kind)} inconnu (${ITEM_KINDS.join(", ")})`);
    return null;
  }
  ITEM_RULES[kind](raw, id || path, path, ctx);
  const tool = optionalString(raw, "tool", path, ctx);
  const action = optionalString(raw, "action", path, ctx);
  const label = optionalString(raw, "label", path, ctx) ?? "";
  const icon = optionalString(raw, "icon", path, ctx);
  let options: Rest | undefined;
  if (raw.options !== undefined) {
    if (isObject(raw.options)) options = raw.options;
    else ctx.errors.push(`${path}.options : objet attendu`);
  }
  if (raw.hidden !== undefined && typeof raw.hidden !== "boolean") ctx.errors.push(`${path}.hidden : booléen attendu`);
  return {
    id,
    kind,
    ...(tool !== undefined ? { tool } : {}),
    ...(action !== undefined ? { action } : {}),
    label,
    ...(icon !== undefined ? { icon } : {}),
    ...(options !== undefined ? { options } : {}),
    ...(raw.hidden === true ? { hidden: true } : {}),
    requires: parseRequires(raw, id || path, path, ctx),
    rest: restOf(raw, ITEM_KEYS),
  };
}

function parseGroup(raw: unknown, path: string, ctx: Ctx): ToolbarGroup | null {
  if (!isObject(raw)) {
    ctx.errors.push(`${path} : objet attendu`);
    return null;
  }
  const id = nonEmptyField(raw, "id", path, ctx);
  const items = list(raw, "items", path, ctx)
    .map((it, i) => parseItem(it, `${path}.items[${i}]`, ctx))
    .filter((it): it is ToolItem => it !== null);
  return { id, items, rest: restOf(raw, GROUP_KEYS) };
}

function parseBar(raw: unknown, path: string, ctx: Ctx): Toolbar | null {
  if (!isObject(raw)) {
    ctx.errors.push(`${path} : objet attendu`);
    return null;
  }
  const id = nonEmptyField(raw, "id", path, ctx);
  if (includes(RESERVED_BAR_IDS, id)) {
    ctx.errors.push(`${path}.id : « ${id} » est réservé à la grille (${RESERVED_BAR_IDS.join(", ")})`);
  }
  const role = nonEmptyField(raw, "role", path, ctx);
  let dock: Dock = "top";
  if (includes(DOCKS, raw.dock)) dock = raw.dock;
  else ctx.errors.push(`${path}.dock : ${show(raw.dock)} n'est pas une position (${DOCKS.join(", ")})`);
  // Ancre (patron `startMode`) : inconnue, avertissement et champ absent ; jamais gardée dans `rest`.
  let anchor: BarAnchor | undefined;
  if (includes(BAR_ANCHORS, raw.anchor)) anchor = raw.anchor;
  else if (typeof raw.anchor === "string") ctx.warnings.push(`${path}.anchor : ${show(raw.anchor)} inconnue, ancre ignorée`);
  else if (raw.anchor !== undefined) ctx.errors.push(`${path}.anchor : chaîne attendue`);
  let collapsed = false;
  if (typeof raw.collapsed === "boolean") collapsed = raw.collapsed;
  else if (raw.collapsed !== undefined) ctx.errors.push(`${path}.collapsed : booléen attendu`);
  const groups = list(raw, "groups", path, ctx)
    .map((g, i) => parseGroup(g, `${path}.groups[${i}]`, ctx))
    .filter((g): g is ToolbarGroup => g !== null);
  return { id, role, dock, ...(anchor !== undefined ? { anchor } : {}), collapsed, groups, rest: restOf(raw, BAR_KEYS) };
}

function parsePreset(raw: unknown, path: string, ctx: Ctx): Preset | null {
  if (!isObject(raw)) {
    ctx.errors.push(`${path} : objet attendu`);
    return null;
  }
  const id = nonEmptyField(raw, "id", path, ctx);
  const label = nonEmptyField(raw, "label", path, ctx);
  const color = optionalString(raw, "color", path, ctx);
  const width = optionalPositive(raw, "width", path, ctx);
  const size = optionalPositive(raw, "size", path, ctx);
  return {
    id,
    label,
    ...(color !== undefined ? { color } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(size !== undefined ? { size } : {}),
    rest: restOf(raw, PRESET_KEYS),
  };
}

function parsePresets(raw: unknown, ctx: Ctx): Readonly<Record<ToolId, readonly Preset[]>> {
  if (raw === undefined) return {};
  if (!isObject(raw)) {
    ctx.errors.push("presets : objet attendu");
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw).map(([tool, presets]) => {
      const path = `presets.${tool}`;
      if (!Array.isArray(presets)) {
        ctx.errors.push(`${path} : liste attendue`);
        return [tool, []];
      }
      const parsed = presets
        .map((p, i) => parsePreset(p, `${path}[${i}]`, ctx))
        .filter((p): p is Preset => p !== null);
      return [tool, parsed];
    }),
  );
}

function block(raw: unknown, name: string, ctx: Ctx): Raw {
  if (raw === undefined) return {};
  if (isObject(raw)) return raw;
  ctx.errors.push(`${name} : objet attendu`);
  return {};
}

function parseInterface(raw: unknown, ctx: Ctx): Profile["interface"] {
  const o = block(raw, "interface", ctx);
  let buttonSize: ButtonSize = "m";
  if (includes(BUTTON_SIZES, o.buttonSize)) buttonSize = o.buttonSize;
  else if (o.buttonSize !== undefined) {
    ctx.errors.push(`interface.buttonSize : ${show(o.buttonSize)} n'est pas une taille (${BUTTON_SIZES.join(", ")})`);
  }
  return { buttonSize, rest: restOf(o, INTERFACE_KEYS) };
}

/** `startMode` inconnu (version plus récente) : avertissement et `board`, valeur non gardée (CL5b-16). */
function parseBehavior(raw: unknown, ctx: Ctx): Profile["behavior"] {
  const o = block(raw, "behavior", ctx);
  let startMode: StartMode = "board";
  if (includes(START_MODES, o.startMode)) startMode = o.startMode;
  else if (typeof o.startMode === "string") {
    ctx.warnings.push(`behavior.startMode : ${show(o.startMode)} inconnu, board utilisé`);
  } else if (o.startMode !== undefined) ctx.errors.push("behavior.startMode : chaîne attendue");
  // personnalisation-1a (décision 7) : même règle pour le mode de la page neuve, `landscape` par défaut.
  let pageMode: PageLayout = "landscape";
  if (includes(PAGE_LAYOUTS, o.pageMode)) pageMode = o.pageMode;
  else if (typeof o.pageMode === "string") {
    ctx.warnings.push(`behavior.pageMode : ${show(o.pageMode)} inconnu, landscape utilisé`);
  } else if (o.pageMode !== undefined) ctx.errors.push("behavior.pageMode : chaîne attendue");
  return { startMode, pageMode, rest: restOf(o, BEHAVIOR_KEYS) };
}

const isVersion = (v: unknown, min: number): v is number => Number.isInteger(v) && (v as number) >= min;

/** Ajoute `item` en fin du dernier groupe de `bar` (groupe `groupId` créé si la barre n'en a aucun). */
export function appendToLastGroup(bar: Toolbar, item: ToolItem, groupId: string): Toolbar {
  if (bar.groups.length === 0) return { ...bar, groups: [{ id: groupId, items: [item], rest: {} }] };
  const last = bar.groups.length - 1;
  return { ...bar, groups: bar.groups.map((g, i) => (i === last ? { ...g, items: [...g.items, item] } : g)) };
}

/**
 * Jamais enfermé hors du menu Profil (C1, P33) : dans toute barre de rôle autre qu'`annotation` (design-l2, L2-20 : la
 * barre `panneaux` porte Profil), un élément Profil masqué est montré (avertissement) ; sans élément Profil sans
 * capacité exigée, un élément est ajouté en fin de la première barre `tools`,
 * ou dans une barre `outils` ajoutée en haut s'il n'y en a aucune.
 */
function ensureProfilesAccess(bars: readonly Toolbar[], ctx: Ctx): readonly Toolbar[] {
  let reachable = false;
  const shown = bars.map((b): Toolbar => {
    if (b.role === ANNOTATION_ROLE) return b;
    return {
      ...b,
      groups: b.groups.map((g) => ({
        ...g,
        items: g.items.map((it) => {
          if (!isProfilesAccess(it)) return it;
          if (it.requires.length === 0) reachable = true;
          if (it.hidden !== true) return it;
          ctx.warnings.push(`${it.id} : l'accès au menu Profil ne se masque pas, élément montré`);
          const { hidden: _shown, ...kept } = it;
          return kept;
        }),
      })),
    };
  });
  if (reachable) return shown;
  ctx.warnings.push("accès au menu Profil ajouté");
  const id = uniqueId(PROFILES_ACTION, ctx.seen);
  ctx.seen.add(id);
  const item: ToolItem = { id, kind: "action", action: PROFILES_ACTION, label: ACTION_TABLE[PROFILES_ACTION]!.label, requires: [], rest: {} };
  const first = shown.findIndex((b) => b.role === "tools");
  if (first === -1) {
    const barId = uniqueId("outils", new Set(shown.map((b) => b.id)));
    return [...shown, { id: barId, role: "tools", dock: "top", collapsed: false, groups: [{ id: "profil", items: [item], rest: {} }], rest: {} }];
  }
  return shown.map((b, i) => (i === first ? appendToLastGroup(b, item, "profil") : b));
}

/** Analyse un profil JSON (règles du plan du lot 5b, T83) ; toutes les erreurs sont rassemblées, sauf format et version. */
export function parseProfile(json: unknown): ParsedProfile {
  if (!isObject(json)) return { errors: ["profil : objet JSON attendu"] };
  if (json.format !== PROFILE_FORMAT) {
    return { errors: [`profil : format ${show(json.format)} inconnu, ${show(PROFILE_FORMAT)} attendu`] };
  }
  if (!isVersion(json.schema, 1)) return { errors: [`profil : schema ${show(json.schema)} invalide, entier ≥ 1 attendu`] };
  if (json.schema > PROFILE_SCHEMA) {
    return {
      errors: [
        `profil de version ${json.schema} : cette version de RoomBoard lit la version ${PROFILE_SCHEMA}, mettez RoomBoard à jour`,
      ],
    };
  }
  const minor = json.minor === undefined ? 0 : json.minor;
  if (!isVersion(minor, 0)) return { errors: [`profil : minor ${show(json.minor)} invalide, entier ≥ 0 attendu`] };

  const ctx: Ctx = { errors: [], warnings: [], seen: new Set() };
  if (json.schema === PROFILE_SCHEMA && minor > PROFILE_MINOR) {
    ctx.warnings.push(
      `profil ${json.schema}.${minor} plus récent que ${PROFILE_SCHEMA}.${PROFILE_MINOR} : clés inconnues conservées`,
    );
  }
  const id = nonEmptyField(json, "id", "profil", ctx);
  const label = nonEmptyField(json, "label", "profil", ctx);
  const basedOn = json.basedOn;
  if (basedOn !== undefined && !isNonEmpty(basedOn)) ctx.errors.push("profil.basedOn : chaîne non vide attendue");
  const iface = parseInterface(json.interface, ctx);
  const toolbars = ensureProfilesAccess(
    list(json, "toolbars", "profil", ctx)
      .map((b, i) => parseBar(b, `toolbars[${i}]`, ctx))
      .filter((b): b is Toolbar => b !== null),
    ctx,
  );
  const presets = parsePresets(json.presets, ctx);
  const behavior = parseBehavior(json.behavior, ctx);
  if (ctx.errors.length > 0) return { errors: ctx.errors };
  return {
    // Reprise d'un profil ancien en mémoire (décision 19, H6) : rien n'est écrit avant « Enregistrer ».
    profile: withPageNav({
      schema: json.schema,
      minor,
      id,
      label,
      ...(isNonEmpty(basedOn) ? { basedOn } : {}),
      interface: iface,
      toolbars,
      presets,
      behavior,
      rest: restOf(json, PROFILE_KEYS),
    }),
    warnings: ctx.warnings,
  };
}

/** personnalisation-1a (décisions 19, 25, 27) : actions de navigation, posées dans la barre d'outils. */
const PAGE_NAV_ACTIONS: readonly ActionId[] = Object.freeze(["page-prev", "page-number", "page-next"]);
const isActionOf = (it: ToolItem, ids: readonly ActionId[]): boolean => it.kind === "action" && ids.includes(it.action ?? "");
const barHas = (b: Toolbar, ids: readonly ActionId[]): boolean => b.groups.some((g) => g.items.some((it) => isActionOf(it, ids)));

/**
 * Reprise d'un profil d'avant la navigation en barre d'outils (décision 19, H6) : si aucune barre n'a `page-number` et
 * qu'aucune barre hors rôle `pages` n'a précédente ni suivante, le groupe `pages` (précédente, numéro, suivante) est
 * ajouté en fin de la première barre `tools`, ids rendus libres par `uniqueId`. En mémoire : rien n'est retiré, rien
 * n'est écrit ; relu, le profil est rendu tel quel (idempotente). Sans barre `tools` : profil rendu tel quel.
 */
export function withPageNav(p: Profile): Profile {
  if (p.toolbars.some((b) => barHas(b, ["page-number"]))) return p;
  if (p.toolbars.some((b) => b.role !== "pages" && barHas(b, ["page-prev", "page-next"]))) return p;
  const first = p.toolbars.findIndex((b) => b.role === "tools");
  if (first === -1) return p;
  const taken = new Set(p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((it) => it.id))));
  const items = PAGE_NAV_ACTIONS.map((action): ToolItem => {
    const id = uniqueId(action, taken);
    taken.add(id);
    return { id, kind: "action", action, label: ACTION_TABLE[action]!.label, requires: [], rest: {} };
  });
  return {
    ...p,
    toolbars: p.toolbars.map((b, i) => {
      if (i !== first) return b;
      const id = uniqueId("pages", new Set(b.groups.map((g) => g.id)));
      return { ...b, groups: [...b.groups, { id, items, rest: {} }] };
    }),
  };
}

/** Rangée d'actions de la barre `pages` (lue par la barre latérale) : ses éléments sans précédente, numéro ni suivante. */
export function sideActions(bar: Toolbar): readonly ToolItem[] {
  return bar.groups.flatMap((g) => g.items).filter((it) => !isActionOf(it, PAGE_NAV_ACTIONS));
}

// --- Écriture ---------------------------------------------------------------------------------------------------

function serializeItem(it: ToolItem): Record<string, unknown> {
  return {
    ...it.rest,
    id: it.id,
    kind: it.kind,
    ...(it.tool !== undefined ? { tool: it.tool } : {}),
    ...(it.action !== undefined ? { action: it.action } : {}),
    label: it.label,
    ...(it.icon !== undefined ? { icon: it.icon } : {}),
    ...(it.options !== undefined ? { options: it.options } : {}),
    ...(it.hidden === true ? { hidden: true } : {}),
    ...(it.requires.length > 0 ? { requires: [...it.requires] } : {}),
  };
}

function serializePreset(p: Preset): Record<string, unknown> {
  return {
    ...p.rest,
    id: p.id,
    label: p.label,
    ...(p.color !== undefined ? { color: p.color } : {}),
    ...(p.width !== undefined ? { width: p.width } : {}),
    ...(p.size !== undefined ? { size: p.size } : {}),
  };
}

/** Écrit `{ ...rest, ...champs connus }` à chaque niveau ; `minor` seulement s'il est > 0, `format` toujours. */
export function serializeProfile(p: Profile): Record<string, unknown> {
  return {
    ...p.rest,
    format: PROFILE_FORMAT,
    schema: p.schema,
    ...(p.minor > 0 ? { minor: p.minor } : {}),
    id: p.id,
    label: p.label,
    ...(p.basedOn !== undefined ? { basedOn: p.basedOn } : {}),
    interface: { ...p.interface.rest, buttonSize: p.interface.buttonSize },
    toolbars: p.toolbars.map((b) => ({
      ...b.rest,
      id: b.id,
      role: b.role,
      dock: b.dock,
      ...(b.anchor !== undefined ? { anchor: b.anchor } : {}),
      collapsed: b.collapsed,
      groups: b.groups.map((g) => ({ ...g.rest, id: g.id, items: g.items.map(serializeItem) })),
    })),
    presets: Object.fromEntries(Object.entries(p.presets).map(([tool, list]) => [tool, list.map(serializePreset)])),
    behavior: { ...p.behavior.rest, startMode: p.behavior.startMode, pageMode: p.behavior.pageMode },
  };
}

// --- Lecture du profil ------------------------------------------------------------------------------------------

/** Ce qui rend un élément affichable selon sa sorte (table par sorte ; les identifiants passent par les tables). */
const KNOWN_BY_KIND: Readonly<Record<ItemKind, (it: ToolItem) => boolean>> = {
  tool: (it) => it.tool !== undefined && isKnownTool(it.tool),
  action: (it) => it.action !== undefined && isKnownAction(it.action),
  dropzone: () => true,
  separator: () => true,
};

/**
 * Éléments affichés d'une barre : groupes à plat, outils et actions connus, capacités exigées toutes vraies (une clé
 * inconnue compte pour fausse) ; puis aucun séparateur en tête, en fin, ni doublé.
 */
export function visibleItems(bar: Toolbar, caps: RuntimeCapabilities): ToolItem[] {
  const out: ToolItem[] = [];
  for (const it of bar.groups.flatMap((g) => g.items)) {
    if (it.hidden === true) continue;
    if (!KNOWN_BY_KIND[it.kind](it)) continue;
    if (!it.requires.every((key) => caps[key] === true)) continue;
    if (it.kind === "separator" && (out.length === 0 || out[out.length - 1]!.kind === "separator")) continue;
    out.push(it);
  }
  while (out.length > 0 && out[out.length - 1]!.kind === "separator") out.pop();
  return out;
}

/** Capacités qu'exige une action ajoutée depuis le catalogue (même source que les profils livrés) ; absente : aucune. */
export const ACTION_REQUIRES: Readonly<Record<string, readonly CapabilityKey[]>> = Object.freeze({
  "desktop-annotation": ["desktopAnnotation"],
  "annotation-pointer": ["desktopAnnotation"],
  "annotation-screen": ["desktopAnnotation"],
  "annotation-freeze": ["desktopAnnotation"],
  "annotation-send": ["desktopAnnotation"],
  "annotation-send-new": ["desktopAnnotation"],
  "edit-original": ["officeConverter"],
});

/** C11a (P6, P8, P15) : entrée et sortie, bascule dessin / souris, écran suivant. */
const ANNOTATION_ACTION: ActionId = "desktop-annotation";
const ANNOTATION_POINTER_ACTION: ActionId = "annotation-pointer";
const ANNOTATION_SCREEN_ACTION: ActionId = "annotation-screen";
/** C11a (P20) : actions rejouées dans `annotate` (outils, préréglages, pot et format y vont par leurs méthodes de l'hôte). */
export const ANNOTATION_REMOTE_ACTIONS: ReadonlySet<ActionId> = new Set(["undo", "redo", "eraser-mode"]);
/** C11b (P5, P16, P29) : figer le bureau, envoyer au tableau, envoyer dans un nouvel onglet ; masquées en mode tableau. */
const ANNOTATION_FREEZE_ACTION: ActionId = "annotation-freeze";
const ANNOTATION_SEND_ACTION: ActionId = "annotation-send";
const ANNOTATION_SEND_NEW_ACTION: ActionId = "annotation-send-new";
export const ANNOTATION_ONLY_ACTIONS: ReadonlySet<ActionId> = new Set([ANNOTATION_FREEZE_ACTION, ANNOTATION_SEND_ACTION, ANNOTATION_SEND_NEW_ACTION]);
/** C11a (P20) : actions de la fenêtre principale en annotation ; toute autre action y est grisée. C11b : les trois en plus. */
export const ANNOTATION_MAIN_ACTIONS: ReadonlySet<ActionId> = new Set([ANNOTATION_ACTION, ANNOTATION_POINTER_ACTION, ANNOTATION_SCREEN_ACTION, ...ANNOTATION_ONLY_ACTIONS]);

/** Zone de dépôt d'annotation (P19) : `dropzone` qui exige `desktopAnnotation` ; toute autre zone garde son comportement. */
export function isAnnotationZone(it: ToolItem): boolean {
  return it.kind === "dropzone" && it.requires.includes("desktopAnnotation");
}

/** design-l4 (L4-1, Q9) : rôle de la barre propre à l'annotation ; `parseProfile` accepte tout rôle, le schéma ne change pas. */
export const ANNOTATION_ROLE = "annotation";
/** design-l2 (L2-3, DA-L2-1) : rôles des îlots du tableau ; `parseProfile` accepte tout rôle, le schéma ne change pas. */
export const MENU_ROLE = "menu";
export const HISTORY_ROLE = "history";
export const PANELS_ROLE = "panels";

/**
 * design-l4 (L4-2) : barre montrée et mesurée en annotation, une seule règle pour `App.tsx` (rendu) et `main.ts`
 * (épaisseur de la bande) : la première barre de rôle `annotation`, sinon la première `tools` (profil d'avant L4, comme
 * C11a P20) ; une barre flottante y est posée en haut (copie : le profil n'est pas réécrit). Null : aucune des deux.
 */
export function annotationBarOf(p: Profile): Toolbar | null {
  const bar = p.toolbars.find((b) => b.role === ANNOTATION_ROLE) ?? p.toolbars.find((b) => b.role === "tools");
  if (bar === undefined) return null;
  return bar.dock === "floating" ? { ...bar, dock: "top" } : bar;
}

/**
 * Éléments selon le mode (C11a, P7, P19 ; C11b, P29) : tableau = `visibleItems` sans zone d'annotation ni actions propres à l'annotation ; annotation = `visibleItems`,
 * plus « Annotation du bureau » (sortie) et « Souris » en fin s'ils manquent (masqués ou absents d'un profil d'avant
 * C11a). Ajout au rendu, comme `ensureProfilesAccess` : le profil n'est pas réécrit.
 */
export function itemsForMode(bar: Toolbar, caps: RuntimeCapabilities, mode: StartMode): ToolItem[] {
  const shown = visibleItems(bar, caps);
  if (mode === "board") {
    return shown.filter((it) => !isAnnotationZone(it) && !(it.kind === "action" && ANNOTATION_ONLY_ACTIONS.has(it.action ?? "")));
  }
  const out = [...shown];
  for (const action of [ANNOTATION_ACTION, ANNOTATION_POINTER_ACTION, ANNOTATION_SEND_ACTION]) {
    if (out.some((it) => it.kind === "action" && it.action === action)) continue;
    out.push({ id: `${action}-ajout`, kind: "action", action, label: ACTION_TABLE[action]!.label, requires: [], rest: {} });
  }
  return out;
}

/**
 * Mode de démarrage honoré (U14, C1 P10) : `desktop-annotation` si le profil le demande et que le poste en a la
 * capacité, sinon `board` ; `fellBack` vrai quand le profil demandait autre chose que le mode rendu.
 */
export function resolveStartMode(
  p: Profile,
  caps: RuntimeCapabilities,
): { readonly mode: StartMode; readonly fellBack: boolean } {
  const wanted = p.behavior.startMode;
  const mode: StartMode = wanted === "desktop-annotation" && caps.desktopAnnotation ? "desktop-annotation" : "board";
  return { mode, fellBack: mode !== wanted };
}

/** Élément que cette version sait afficher : outil ou action connus, capacités exigées toutes connues (C1, P16). */
export function isKnownItem(it: ToolItem): boolean {
  return KNOWN_BY_KIND[it.kind](it) && it.requires.every((k) => includes(CAPABILITY_KEYS, k));
}

/** Profil écrit par l'éditeur ou l'import : mineure relevée à `PROFILE_MINOR`, jamais baissée (C1, P4). */
export function withCurrentMinor(p: Profile): Profile {
  return p.minor >= PROFILE_MINOR ? p : { ...p, minor: PROFILE_MINOR };
}

/** Remise à zéro des options d'un élément ; les préréglages ne bougent pas. */
export function resetItemOptions(p: Profile, itemId: string): Profile {
  const strip = (it: ToolItem): ToolItem => {
    if (it.id !== itemId) return it;
    const { options: _dropped, ...kept } = it;
    return kept;
  };
  return {
    ...p,
    toolbars: p.toolbars.map((b) => ({ ...b, groups: b.groups.map((g) => ({ ...g, items: g.items.map(strip) })) })),
  };
}

/** Remise à zéro des préréglages d'un outil depuis `from` (profil d'origine) ; les barres ne bougent pas. */
export function resetPresets(p: Profile, tool: ToolId, from: Profile): Profile {
  const origin = Object.hasOwn(from.presets, tool) ? from.presets[tool] : undefined;
  const entries = Object.entries(p.presets).filter(([k]) => k !== tool);
  if (origin !== undefined) entries.push([tool, origin]);
  const order = Object.keys(p.presets);
  entries.sort(([a], [b]) => rank(order, a) - rank(order, b));
  return { ...p, presets: Object.fromEntries(entries) };
}

const rank = (order: readonly string[], key: string): number => {
  const i = order.indexOf(key);
  return i === -1 ? order.length : i;
};
