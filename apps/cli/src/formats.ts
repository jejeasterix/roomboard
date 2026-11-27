/**
 * Formats de la CLI et lot qui les livre (cadrage cli, D9, D13, carte 3.5). Clés = extensions d'`IMPORT_EXTENSIONS`
 * (`files.ts`) et d'`OFFICE_EXTENSIONS` (`office-import.ts`), point compris, en minuscules : un test l'exige. `read` et
 * `write` : lot où l'import et l'export arrivent (null : jamais) ; `handler` : id du lecteur de `import.ts`.
 * Précision de forme par rapport au cadrage (`{ lot, read, write, handler }`) : un lot par sens, parce que `.rbitem`
 * s'écrit au lot 1 et ne s'insère qu'au lot 2 ; `formats` rend toujours `{ ext, read, write, readLot, writeLot, notes }` (DA2).
 * D27 (cli-lot2) : le code 3 se lit sur `covered`, par format et par sens ; `LOT_LIVRE` = plus haut lot dont toutes les
 * entrées sont couvertes, un test l'exige. Un chantier qui livre un format change ses lots ici et passe son `covered` (§ 7).
 * cli-lot3 (D42) : `.pdf` couvert. cli-lot4 (D68, D73) : le dernier lot couvert en lecture (écriture `null`), `LOT_LIVRE = 4` ;
 * le code 3 ne sort plus que d'une variante non lue : en-tête illisible, convertisseur Office absent, format laissé de côté
 * (H48).
 */
export type Lot = 1 | 2 | 3 | 4;
export const LOT_LIVRE: Lot = 4;

export interface Coverage {
  readonly read: boolean;
  readonly write: boolean;
}
export interface FormatEntry {
  readonly read: Lot | null;
  readonly write: Lot | null;
  readonly handler: string;
  /** D27 : sens branchés dans la CLI. */
  readonly covered: Coverage;
  readonly notes: readonly string[];
}
const make = (read: Lot | null, write: Lot | null, handler: string, covered: Coverage, notes: readonly string[]): FormatEntry =>
  Object.freeze({ read, write, handler, covered: Object.freeze({ ...covered }), notes: Object.freeze([...notes]) });
/** Entrée dont seuls les sens du lot 1 sont couverts. */
const entry = (read: Lot | null, write: Lot | null, handler: string, ...notes: string[]): FormatEntry =>
  make(read, write, handler, { read: read === 1, write: write === 1 }, notes);
/** Entrée branchée par un chantier du lot 2 : sens couverts donnés. */
const branched = (read: Lot | null, write: Lot | null, handler: string, covered: Coverage, ...notes: string[]): FormatEntry =>
  make(read, write, handler, covered, notes);

export interface FormatRow {
  readonly ext: string;
  readonly read: boolean;
  readonly write: boolean;
  /** Lot qui livre la lecture (null : jamais). */
  readonly readLot: Lot | null;
  /** Lot qui livre l'écriture (null : jamais). */
  readonly writeLot: Lot | null;
  readonly notes: readonly string[];
}

/** cli-lot4 (H48) : préfixe de la note d'un format laissé de côté (`read: null`), suivi de sa raison. */
export const LEFT_ASIDE = "laissé de côté : ";
/** cli-lot4 : entrée lue par la CLI, jamais écrite (lecture seule, comme la page). */
const lot4 = (handler: string, ...notes: string[]): FormatEntry => branched(4, null, handler, { read: true, write: false }, ...notes);
const IMAGES_BY_HEADER = "images lues par leur en-tête";
const HEADER_SIZE = "taille lue dans l'en-tête ; illisible : code 3";
const PDF_EXPORT = "export .pdf : refusé, aucun décodeur d'image dans la CLI (code 1, D69)";

const each = (exts: readonly string[], e: FormatEntry): Array<readonly [string, FormatEntry]> => exts.map((x) => [x, e] as const);

const ROWS: ReadonlyArray<readonly [string, FormatEntry]> = [
  [".roomboard", entry(1, 1, "roomboard", "mode de page `mode` facultatif (`infinite`), hauteur portrait 3413,33 ; ordre des objets = ordre d'`elements` (`Restack`)", "options d'aspect (strokeStyle, roughness, roundness, opacity, fillStyle, arrowheads, textAlign, link)")],
  [".rbitem", branched(2, 1, "rbitem", { read: true, write: true }, "insertion par `import` ; `--grid`")],
  [".rbpack", branched(2, 2, "rbpack", { read: true, write: true }, "par `library import` / `library export`")],
  [".pdf", branched(3, 3, "pdf", { read: true, write: true }, "fond `pdf-page`, PDF d'origine gardé en asset", "export : pages d'origine recopiées, annotation vectorielle ; sans repli en image (code 1)", "couleurs nommées et texte mesurés comme H25, H26", "image GIF, WebP, BMP, ICO, SVG, AVIF, HEIC : export refusé, krilla ne prend que PNG et JPEG et aucun décodeur d'image dans la CLI (code 1, D69)")],
  [".iwb", branched(2, 2, "iwb", { read: true, write: true }, IMAGES_BY_HEADER)],
  [".ubz", branched(2, 2, "ubz", { read: true, write: true }, IMAGES_BY_HEADER)],
  [".notebook", branched(2, null, "notebook", { read: true, write: false }, "lecture seule", IMAGES_BY_HEADER)],
  [".olf", branched(2, null, "olf", { read: true, write: false }, "lecture seule", IMAGES_BY_HEADER)],
  [".flipchart", branched(2, null, "flipchart", { read: true, write: false }, "lecture seule", IMAGES_BY_HEADER)],
  [".png", entry(1, null, "image", "taille lue dans l'en-tête")],
  ...each([".jpg", ".jpeg"], entry(1, null, "image", "taille lue dans l'en-tête, orientation EXIF non appliquée (H2)")),
  ...each([".gif", ".webp", ".bmp", ".ico"], lot4("image", HEADER_SIZE, PDF_EXPORT)),
  [".svg", lot4("image", "taille du navigateur (300 × 150 sans dimensions, H39) ; illisible : code 3", PDF_EXPORT)],
  ...each([".avif", ".heic", ".heif"], lot4("image", HEADER_SIZE, "rotation irot non appliquée (H43)", PDF_EXPORT)),
  ...each([".mp4", ".m4v", ".mov", ".webm", ".ogv", ".m4a", ".mp3", ".wav", ".ogg", ".oga"], lot4("media", "durée lue dans l'en-tête, sans poster (H40) ; illisible : code 3", "inclus, 100 Mo au plus (H45)")),
  ...each([".glb", ".gltf", ".obj", ".stl", ".ply"], lot4("model3d", "validé par three, sans instantané (cadre gris dans l'application, H40)")),
  ...each([".mtl", ".bin"], lot4("model3d-companion", "avec son modèle seulement")),
  [".zip", lot4("zip3d", "modèles 3D d'un ZIP, validés par three, sans instantané")],
  ...each([".xlsx", ".xlsm"], entry(1, null, "sheet", "valeurs de la première feuille ; largeur du texte approchée (H1)", "jamais converti en pages, même avec LibreOffice (H37)")),
  ...each([".docx", ".odt", ".ods", ".pptx", ".odp", ".doc", ".xls", ".ppt"], lot4("office", "converti par roomboard-office et LibreOffice (code 3 sans eux) ; original gardé en asset", "lecture seule")),
];

export const FORMAT_LOTS: Readonly<Record<string, FormatEntry>> = Object.freeze(Object.fromEntries(ROWS));

const baseOf = (name: string): string => name.replace(/^.*[\\/]/, "");

/** Extension en minuscules, point compris ; "" sans extension (`.bashrc` compris). */
export function extOf(name: string): string {
  const base = baseOf(name);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i).toLowerCase();
}

export function formatOf(name: string): FormatEntry | null {
  const ext = extOf(name);
  return Object.hasOwn(FORMAT_LOTS, ext) ? (FORMAT_LOTS[ext] ?? null) : null;
}

const lastLot = (e: FormatEntry): Lot => Math.max(e.read ?? 1, e.write ?? 1) as Lot;

export function lotOf(name: string): Lot | null {
  const e = formatOf(name);
  return e === null ? null : lastLot(e);
}

/** D26 : un paquet `.rbpack` ne s'importe pas dans un document ; message qui renvoie à `library`. */
export const packMessage = (name: string): string => `${baseOf(name)} : un paquet .rbpack passe par la bibliothèque : roomboard library import | library export`;

/** H48 : raison d'une lecture non branchée (`covered.read` faux : note `laissé de côté : …`, sinon une raison par défaut) ; null si lue. */
export function asideReasonOf(e: FormatEntry): string | null {
  if (e.covered.read) return null;
  const note = e.notes.find((n) => n.startsWith(LEFT_ASIDE));
  return note === undefined ? "lecture non branchée" : note.slice(LEFT_ASIDE.length);
}

export function leftAsideReason(name: string): string | null {
  const e = formatOf(name);
  return e === null ? null : asideReasonOf(e);
}

/** Lignes de `formats`, tirées de la table (aucune liste recopiée). */
export function formatRows(): FormatRow[] {
  return Object.entries(FORMAT_LOTS).map(([ext, e]) => ({ ext, read: e.covered.read, write: e.covered.write, readLot: e.read, writeLot: e.write, notes: [...e.notes] }));
}
