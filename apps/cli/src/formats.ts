/**
 * Formats de la CLI et lot qui les livre (cadrage cli, D9, D13, carte 3.5). Clés = extensions d'`IMPORT_EXTENSIONS`
 * (`files.ts`) et d'`OFFICE_EXTENSIONS` (`office-import.ts`), point compris, en minuscules : un test l'exige. `read` et
 * `write` : lot où l'import et l'export arrivent (null : jamais) ; `handler` : id du lecteur de `import.ts`.
 * Précision de forme par rapport au cadrage (`{ lot, read, write, handler }`) : un lot par sens, parce que `.rbitem`
 * s'écrit au lot 1 et ne s'insère qu'au lot 2 ; `formats` rend toujours `{ ext, read, write, readLot, writeLot, notes }` (DA2).
 * Un chantier qui livre un format change ses lots ici et passe `read` / `write` à vrai dans `formats` (§ 7).
 */
export type Lot = 1 | 2 | 3 | 4;
export const LOT_LIVRE: Lot = 1;

export interface FormatEntry {
  readonly read: Lot | null;
  readonly write: Lot | null;
  readonly handler: string;
  readonly notes: readonly string[];
}

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

const entry = (read: Lot | null, write: Lot | null, handler: string, ...notes: string[]): FormatEntry =>
  Object.freeze({ read, write, handler, notes: Object.freeze(notes) });
const each = (exts: readonly string[], e: FormatEntry): Array<readonly [string, FormatEntry]> => exts.map((x) => [x, e] as const);

const ROWS: ReadonlyArray<readonly [string, FormatEntry]> = [
  [".roomboard", entry(1, 1, "roomboard")],
  [".rbitem", entry(2, 1, "rbitem", "`state x.rbitem` le lit déjà ; l'insertion arrive au lot 2")],
  [".rbpack", entry(2, 2, "rbpack")],
  [".pdf", entry(3, 3, "pdf")],
  [".iwb", entry(2, 2, "iwb")],
  [".ubz", entry(2, 2, "ubz")],
  [".notebook", entry(2, null, "notebook")],
  [".olf", entry(2, null, "olf")],
  [".flipchart", entry(2, null, "flipchart")],
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

const delivered = (lot: Lot | null): boolean => lot !== null && lot <= LOT_LIVRE;
const lastLot = (e: FormatEntry): Lot => Math.max(e.read ?? 1, e.write ?? 1) as Lot;

export function lotOf(name: string): Lot | null {
  const e = formatOf(name);
  return e === null ? null : lastLot(e);
}

/** Lot d'un format reconnu dont l'import n'est pas livré ; null si lisible ou inconnu (le registre décide). */
export function importBlocked(name: string): Lot | null {
  const e = formatOf(name);
  return e === null || e.read === null || delivered(e.read) ? null : e.read;
}

/** Lot d'un format reconnu dont l'export arrive plus tard ; null si écrit aujourd'hui, jamais écrit ou inconnu. */
export function exportBlocked(name: string): Lot | null {
  const e = formatOf(name);
  return e === null || e.write === null || delivered(e.write) ? null : e.write;
}

export const unsupportedMessage = (name: string, lot: Lot): string => `${baseOf(name)} : format pris en charge par la CLI au lot ${lot}`;

/** Lignes de `formats`, tirées de la table (aucune liste recopiée). */
export function formatRows(): FormatRow[] {
  return Object.entries(FORMAT_LOTS).map(([ext, e]) => ({ ext, read: delivered(e.read), write: delivered(e.write), readLot: e.read, writeLot: e.write, notes: [...e.notes] }));
}
