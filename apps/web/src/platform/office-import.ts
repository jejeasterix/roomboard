/**
 * Documents Office (C16, O1 à O4, O14, O25) : `office` (coque : conversion en PDF par LibreOffice ou Microsoft Office,
 * puis ouverture comme un PDF, l'original gardé) et `office-web` (web, iPad : « exportez en PDF depuis Office »). Reconnus
 * par l'extension ET l'en-tête : ZIP pour OOXML et ODF, CFB pour `.doc`, `.xls`, `.ppt` (U23). Placés avant `sheet` dans
 * le registre : sur le web, `.xlsx` et `.xlsm` restent au classeur (C10b) ; dans la coque, ils sont convertis, avec repli
 * sur le classeur sans convertisseur ou sans chemin.
 * Cycle d'import avec `import.ts` : aucune constante de ce module ne lit une valeur importée (fonctions seulement).
 */
import type { DroppedFile } from "./files";
import { hasExtension, hasZipMagic, isSheetName, type ImportHandler, type ImportOutcome } from "./import";

export const OFFICE_ZIP_EXTENSIONS: readonly string[] = Object.freeze([".docx", ".odt", ".xlsx", ".xlsm", ".ods", ".pptx", ".odp"]);
export const OFFICE_CFB_EXTENSIONS: readonly string[] = Object.freeze([".doc", ".xls", ".ppt"]);
export const OFFICE_EXTENSIONS: readonly string[] = Object.freeze([...OFFICE_ZIP_EXTENSIONS, ...OFFICE_CFB_EXTENSIONS]);
/** En-tête d'un fichier composé (CFB) : `.doc`, `.xls`, `.ppt`. */
export const CFB_MAGIC: readonly number[] = Object.freeze([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
/** Plafond de tout fichier Office (O14) : 100 Mio, la valeur de `SHEET_MAX_BYTES` (littérale : cycle d'import). */
export const OFFICE_MAX_BYTES = 100 * 1024 * 1024;

export const OFFICE_EXPORT_MESSAGE = "exportez en PDF depuis Office";
export const OFFICE_INSTALL_MESSAGE = "installez LibreOffice ou Microsoft Office";
export const OFFICE_TOO_BIG_MESSAGE = "fichier Office trop gros pour être converti";
export const OFFICE_TIMEOUT_MESSAGE = "conversion trop longue (plus de 120 s)";
export const OFFICE_FAILED_MESSAGE = "la conversion en PDF a échoué";
export const OFFICE_VALUES_MESSAGE = "importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages";
export const NOT_OFFICE_PAGE_MESSAGE = "cette page ne vient pas d'un fichier Word, Excel ou PowerPoint";
export const originalChangedMessage = (name: string): string => `${name} a été modifié. Le réimporter dans un nouvel onglet ?`;

/** Rejet de la coque : `code` = `ConvertError::code` (Rust) : `no-program`, `timeout`, `failed`, `no-output`, … */
export class OfficeConvertError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "OfficeConvertError";
  }
}

export const hasCfbMagic = (head: Uint8Array): boolean => head.length >= CFB_MAGIC.length && CFB_MAGIC.every((b, i) => head[i] === b);

const extensionOf = (name: string): string | undefined => OFFICE_EXTENSIONS.find((e) => hasExtension(name, e));

export const isOfficeName = (name: string): boolean => extensionOf(name) !== undefined;

/** O2 : extension Office ET en-tête attendu ; sinon le registre refuse comme avant (« prochaine version »). */
export function isOfficeFile(head: Uint8Array, name: string): boolean {
  if (OFFICE_ZIP_EXTENSIONS.some((e) => hasExtension(name, e))) return hasZipMagic(head);
  if (OFFICE_CFB_EXTENSIONS.some((e) => hasExtension(name, e))) return hasCfbMagic(head);
  return false;
}

const MIMES: Readonly<Record<string, string>> = Object.freeze({
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
  ".xls": "application/vnd.ms-excel",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".odp": "application/vnd.oasis.opendocument.presentation",
});

/** Type MIME de l'original gardé (O16). */
export const officeMimeOf = (name: string): string => MIMES[extensionOf(name) ?? ""] ?? "application/octet-stream";

/** Racine du nom (O5) : `Cours 3.docx` → `Cours 3` ; un nom sans extension Office est rendu tel quel. */
export function officeStemOf(name: string): string {
  const e = extensionOf(name);
  return e === undefined ? name : name.slice(0, -e.length);
}

/** O14 : message d'un rejet de la coque. */
export function convertFailureMessage(name: string, code: string): string {
  if (code === "no-program") return `${name} : ${OFFICE_INSTALL_MESSAGE}`;
  if (code === "timeout") return `${name} : ${OFFICE_TIMEOUT_MESSAGE}`;
  if (code === "too-large") return `${name} : ${OFFICE_TOO_BIG_MESSAGE}`;
  return `Import impossible (${name}) : ${OFFICE_FAILED_MESSAGE}`;
}

/** Document converti à ouvrir : nom, original gardé, PDF obtenu. */
export interface OfficeOpenFile {
  readonly name: string;
  readonly original: Blob;
  readonly pdf: Blob;
}

/** « Original modifié » émis par la coque (O21). */
export interface OriginalChange {
  readonly id: string;
  readonly name: string;
}

export interface OfficeHandlerDeps {
  /** Conversion par la coque (PDF lu par morceaux, dossier libéré) ; rejette `OfficeConvertError` (code de la coque). */
  convert(path: string): Promise<Blob>;
  /** Ouvre le PDF converti dans un nouvel onglet, l'original gardé (O5, O16) ; false si refusé (avis déjà dit). */
  open(f: OfficeOpenFile): Promise<boolean>;
  /** Repli du `.xlsx` sans convertisseur ou sans chemin (O4, O14) : le gestionnaire `sheet` de C10b. */
  readonly sheet?: ImportHandler;
}

/** Entrée `office` (coque) : dit elle-même ses messages (O14). */
export function officeHandler(deps: OfficeHandlerDeps): ImportHandler {
  const sheet = deps.sheet;
  const asSheet = (f: DroppedFile): ImportHandler | null => (sheet !== undefined && isSheetName(f.name) ? sheet : null);
  return {
    id: "office",
    nature: "document",
    detect: (head, name) => isOfficeFile(head, name),
    limit: { maxBytes: OFFICE_MAX_BYTES, message: OFFICE_TOO_BIG_MESSAGE },
    async run(f, ctx) {
      const path = f.path;
      if (path === undefined || path === "") {
        // Collage dans la coque : comme le web (O14).
        const s = asSheet(f);
        if (s !== null) return s.run(f, ctx);
        await ctx.notify(`${f.name} : ${OFFICE_EXPORT_MESSAGE}`);
        return "failed";
      }
      let pdf: Blob;
      try {
        pdf = await deps.convert(path);
      } catch (e) {
        const code = e instanceof OfficeConvertError ? e.code : "failed";
        const s = code === "no-program" ? asSheet(f) : null;
        if (s !== null) {
          const out = await s.run(f, ctx);
          if (out === "inserted") await ctx.notify(`${f.name} : ${OFFICE_VALUES_MESSAGE}`);
          return out;
        }
        await ctx.notify(convertFailureMessage(f.name, code));
        return "failed";
      }
      return (await deps.open({ name: f.name, original: ctx.blob, pdf })) ? "opened" : "failed";
    },
  };
}

/** Entrée `office-web` (web, iPad, O3) : rien d'inséré ; `.xlsx` et `.xlsm` laissés au classeur. */
export function officeWebHandler(): ImportHandler {
  return {
    id: "office-web",
    nature: "document",
    detect: (head, name) => !isSheetName(name) && isOfficeFile(head, name),
    limit: { maxBytes: OFFICE_MAX_BYTES, message: OFFICE_TOO_BIG_MESSAGE },
    async run(f, ctx) {
      await ctx.notify(`${f.name} : ${OFFICE_EXPORT_MESSAGE}`);
      return "failed";
    },
  };
}

/** Coque sans convertisseur (O24) : les documents disent « installez… » sans être lus (`link` dès le premier octet quand
 *  le fichier a un chemin) ; `.xlsx` et `.xlsm` laissés au classeur, comme sur le web. */
export function officeNoConverterHandler(): ImportHandler {
  const say = async (f: DroppedFile, notify: (m: string) => Promise<void>): Promise<ImportOutcome> => {
    await notify(`${f.name} : ${OFFICE_INSTALL_MESSAGE}`);
    return "failed";
  };
  return {
    id: "office-sans-convertisseur",
    nature: "document",
    detect: (head, name) => !isSheetName(name) && isOfficeFile(head, name),
    limit: { maxBytes: OFFICE_MAX_BYTES, message: OFFICE_TOO_BIG_MESSAGE },
    link: { aboveBytes: -1, run: (f, _path, ctx) => say(f, ctx.notify) },
    run: (f, ctx) => say(f, ctx.notify),
  };
}

export const CONVERSION_ATTR = "data-conversion";

/** O25 : `data-conversion="en-cours"` sur `root` pendant `run` (curseur d'attente par la feuille de style), retiré
 *  après la dernière conversion en cours, succès ou échec. */
export function withConversionMark(root: Pick<HTMLElement, "setAttribute" | "removeAttribute">): <T>(run: () => Promise<T>) => Promise<T> {
  let running = 0;
  return async <T>(run: () => Promise<T>): Promise<T> => {
    running += 1;
    root.setAttribute(CONVERSION_ATTR, "en-cours");
    try {
      return await run();
    } finally {
      running -= 1;
      if (running === 0) root.removeAttribute(CONVERSION_ATTR);
    }
  };
}
