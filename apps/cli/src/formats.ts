/**
 * Formats de la CLI et lot qui les livre (cadrage cli, D9, D13, carte 3.5). Clés = extensions d'`IMPORT_EXTENSIONS`
 * (`files.ts`) et d'`OFFICE_EXTENSIONS` (`office-import.ts`), point compris, en minuscules : un test l'exige. `read` et
 * `write` : lot où l'import et l'export arrivent (null : jamais) ; `handler` : id du lecteur de `import.ts`.
 * Précision de forme par rapport au cadrage (`{ lot, read, write, handler }`) : un lot par sens, parce que `.rbitem`
 * s'écrit au lot 1 et ne s'insère qu'au lot 2 ; `formats` rend toujours `{ ext, read, write, readLot, writeLot, notes }` (DA2).
 * D27 (cli-lot2) : le code 3 se lit sur `covered`, par format et par sens ; `LOT_LIVRE` = plus haut lot dont toutes les
 * entrées sont couvertes, un test l'exige. Un chantier qui livre un format change ses lots ici et passe `read` / `write` à vrai dans `formats` (§ 7).
 */
export type Lot = 1 | 2 | 3 | 4;
export const LOT_LIVRE: Lot = 1;

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

/** Images d'un tableau que la CLI ne sait pas mesurer sans décodeur (lot 4). */
const UNREAD_IMAGES = "images GIF, WebP, BMP, SVG non lues (lot 4)";

const each = (exts: readonly string[], e: FormatEntry): Array<readonly [string, FormatEntry]> => exts.map((x) => [x, e] as const);

const ROWS: ReadonlyArray<readonly [string, FormatEntry]> = [
  [".roomboard", entry(1, 1, "roomboard")],
  [".rbitem", branched(2, 1, "rbitem", { read: true, write: true }, "insertion par `import` ; `--grid`")],
  [".rbpack", entry(2, 2, "rbpack")],
  [".pdf", entry(3, 3, "pdf")],
  [".iwb", branched(2, 2, "iwb", { read: true, write: false }, UNREAD_IMAGES)],
  [".ubz", branched(2, 2, "ubz", { read: true, write: false }, UNREAD_IMAGES)],
  [".notebook", branched(2, null, "notebook", { read: true, write: false }, "lecture seule", UNREAD_IMAGES)],
  [".olf", branched(2, null, "olf", { read: true, write: false }, "lecture seule", UNREAD_IMAGES)],
  [".flipchart", branched(2, null, "flipchart", { read: true, write: false }, "lecture seule", UNREAD_IMAGES)],
  [".png", entry(1, null, "image", "taille lue dans l'en-tête")],
  ...each([".jpg", ".jpeg"], entry(1, null, "image", "taille lue dans l'en-tête, orientation EXIF non appliquée (H2)")),
  ...each([".gif", ".webp", ".bmp", ".ico", ".svg", ".avif", ".heic", ".heif"], entry(4, null, "image")),
  ...each([".mp4", ".m4v", ".mov", ".webm", ".ogv", ".m4a", ".mp3", ".wav", ".ogg", ".oga"], entry(4, null, "media")),
  ...each([".glb", ".gltf", ".obj", ".stl", ".ply"], entry(4, null, "model3d")),
  ...each([".mtl", ".bin"], entry(4, null, "model3d-companion")),
  [".zip", entry(4, null, "zip3d")],
  ...each([".xlsx", ".xlsm"], entry(1, null, "sheet", "valeurs de la première feuille ; largeur du texte approchée (H1)")),
  ...each([".docx", ".odt", ".ods", ".pptx", ".odp", ".doc", ".xls", ".ppt"], entry(4, null, "office")),
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

/** Lot d'un format reconnu dont l'import n'est pas livré ; null si lisible ou inconnu (le registre décide). */
export function importBlocked(name: string): Lot | null {
  const e = formatOf(name);
  return e === null || e.read === null || e.covered.read ? null : e.read;
}

/** Lot d'un format reconnu dont l'export arrive plus tard ; null si écrit aujourd'hui, jamais écrit ou inconnu. */
export function exportBlocked(name: string): Lot | null {
  const e = formatOf(name);
  return e === null || e.write === null || e.covered.write ? null : e.write;
}

/** D26 : un paquet `.rbpack` ne s'importe pas dans un document ; message qui renvoie à `library`. */
export const packMessage = (name: string): string => `${baseOf(name)} : un paquet .rbpack passe par la bibliothèque : roomboard library import | library export`;

export const unsupportedMessage = (name: string, lot: Lot): string => `${baseOf(name)} : format pris en charge par la CLI au lot ${lot}`;

/** Lignes de `formats`, tirées de la table (aucune liste recopiée). */
export function formatRows(): FormatRow[] {
  return Object.entries(FORMAT_LOTS).map(([ext, e]) => ({ ext, read: e.covered.read, write: e.covered.write, readLot: e.read, writeLot: e.write, notes: [...e.notes] }));
}
