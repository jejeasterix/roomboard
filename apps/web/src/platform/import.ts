/**
 * Entrée unique des fichiers (U23, R1) : dépôt web, dépôt dans la coque, collage, « Importer » et fichier passé au
 * lancement passent par `importFiles`. Registre par nature : `roomboard` (document, reconnu par l'extension) ouvre un
 * nouvel onglet (R2) ; `rbitem` (objet, nom + en-tête ZIP) s'insère comme une image ; `image` (objet, reconnue par ses octets) s'insère dans l'onglet actif au début de l'appel (R3).
 * Non reconnu : refusé avec `LATER_FORMAT_MESSAGE`. Hôtes web : 100 Mo au plus par fichier, contrôlé avant lecture (R15).
 * C10b (F28) : `sheet` (objet, `.xlsx`/`.xlsm` et en-tête ZIP) lit la première feuille dans un Worker jetable et pose un tableau.
 */
import { messageOf } from "./controller";
import { RBITEM_EXTENSION, ROOMBOARD_EXTENSION, type DroppedFile, type Point, type SaveTarget } from "./files";
import type { TableGrid } from "./html-table";
import { HEAD_BYTES, imageHandler, type ImageDecoder, type ImageTarget } from "./image-import";
import { EMPTY_SHEET_MESSAGE, SHEET_TOO_BIG_MESSAGE } from "./sheet-reader";
import { insertTableGrid } from "./table-insert";

export const LATER_FORMAT_MESSAGE = "format pris en charge dans une prochaine version";
/** Limite des hôtes web (R15) ; la coque n'en a pas. */
export const WEB_MAX_BYTES = 100 * 1024 * 1024;

export const tooBigMessage = (names: readonly string[], max: number): string =>
  `${names.join(", ")} : fichier trop gros (plus de ${Math.round(max / (1024 * 1024))} Mo)`;

export interface ImportReport {
  readonly opened: readonly string[];
  readonly inserted: readonly string[];
  readonly refused: readonly string[];
  readonly failed: readonly string[];
}

export interface ImportDeps {
  /** Ouvre le document dans un nouvel onglet (T93) ; false si illisible (le message est déjà dit). */
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }): Promise<boolean>;
  notify(message: string): Promise<void>;
  /** Vrai quand plus aucun onglet ne peut s'ouvrir : un refus de `openDocument` arrête alors les documents suivants. */
  full?(): boolean;
  /** Onglet qui reçoit les objets, lu une fois au début de `importFiles` (R3) ; absent ou null : aucun objet inséré. */
  target?(): ImageTarget | null;
  /** Taille maximale d'un fichier (R15 : `WEB_MAX_BYTES` sur les hôtes web) ; absente ou null : aucune limite. */
  readonly maxBytes?: number | null;
  /** Décodeur des images (tests) ; défaut : `decodeImage` du navigateur. */
  readonly decode?: ImageDecoder;
  /** Lecture d'un classeur dans un Worker jetable (C10b, F28) ; absente : `.xlsx` refusé comme avant. */
  readSheet?(file: Blob): Promise<TableGrid>;
}

export interface Importer {
  importFiles(files: readonly DroppedFile[], at?: Point | null): Promise<ImportReport>;
}

export interface ImportContext {
  /** Contenu du fichier, lu une fois (la coque le lit par morceaux, `grantedFile`). */
  readonly blob: Blob;
  /** `HEAD_BYTES` premiers octets ; vide pour un `.roomboard` (reconnu par son nom). */
  readonly head: Uint8Array;
  /** Point de dépôt en px CSS de la fenêtre ; null : collage, « Importer », lancement. */
  readonly at: Point | null;
  /** Images déjà insérées par cet appel (cascade, R4). */
  readonly inserted: number;
  readonly target: ImageTarget | null;
  notify(message: string): Promise<void>;
}

export type ImportOutcome = "opened" | "inserted" | "failed";

export interface ImportHandler {
  readonly id: string;
  readonly nature: "document" | "objet";
  detect(head: Uint8Array, name: string): boolean;
  /** Plafond propre au gestionnaire (F22), contrôlé par `importFiles` sur `f.size` **avant** `f.blob()` (la coque lit
   *  le fichier en entier) : dépassé, « <nom> : <message> », compté en échec. */
  readonly limit?: { readonly maxBytes: number; readonly message: string };
  /** Dit lui-même ses messages d'échec. */
  run(file: DroppedFile, ctx: ImportContext): Promise<ImportOutcome>;
}

/** Nom qui se termine par `ext` (minuscules, point compris) et ne s'y réduit pas. */
function hasExtension(name: string, ext: string): boolean {
  return name.toLowerCase().endsWith(ext) && name.length > ext.length;
}

export function isRoomboardName(name: string): boolean {
  return hasExtension(name, ROOMBOARD_EXTENSION);
}

function roomboardHandler(deps: ImportDeps): ImportHandler {
  return {
    id: "roomboard",
    nature: "document",
    detect: (_head, name) => isRoomboardName(name),
    async run(f, ctx) {
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await ctx.blob.arrayBuffer());
      } catch (e) {
        await ctx.notify(`Ouverture impossible (${f.name}) : ${messageOf(e)}`);
        return "failed";
      }
      return (await deps.openDocument({ name: f.name, bytes, target: null })) ? "opened" : "failed";
    },
  };
}

/** En-tête d'un ZIP (`PK\x03\x04`) : un `.rbitem` (Z10) comme un `.xlsx` (F28) est un ZIP ; chacun est reconnu par son
 *  nom ET cet en-tête, le nom seul les départage. */
export const ZIP_MAGIC: readonly number[] = Object.freeze([0x50, 0x4b, 0x03, 0x04]);

const hasZipMagic = (head: Uint8Array): boolean => head.length >= ZIP_MAGIC.length && ZIP_MAGIC.every((b, i) => head[i] === b);

export function isRbitemName(name: string): boolean {
  return hasExtension(name, RBITEM_EXTENSION);
}

/** Entrée `rbitem` (objet, Z10) : remis à l'onglet lu au début de l'appel (R3), au rang de cascade de l'appel. */
export function rbitemHandler(): ImportHandler {
  return {
    id: "rbitem",
    nature: "objet",
    detect: (head, name) => isRbitemName(name) && hasZipMagic(head),
    async run(f, ctx) {
      const insert = ctx.target?.insertFragment?.bind(ctx.target);
      if (insert === undefined) {
        await ctx.notify(`Import impossible (${f.name}) : aucun onglet ne peut recevoir cet objet`);
        return "failed";
      }
      try {
        const bytes = new Uint8Array(await ctx.blob.arrayBuffer());
        return (await insert(bytes, ctx.at, ctx.inserted, f.name)) ? "inserted" : "failed";
      } catch (e) {
        await ctx.notify(`Import impossible (${f.name}) : ${messageOf(e)}`);
        return "failed";
      }
    },
  };
}

/** Plafond d'un classeur (F22), aussi dans la coque où `maxBytes` est nul. */
export const SHEET_MAX_BYTES = 100 * 1024 * 1024;

export function isSheetName(name: string): boolean {
  return hasExtension(name, ".xlsx") || hasExtension(name, ".xlsm");
}

/** Entrée `sheet` du registre (F28) : nom `.xlsx` / `.xlsm` et en-tête ZIP ; une `ImportTable` dans l'onglet actif. */
export function sheetHandler(deps: { readSheet(file: Blob): Promise<TableGrid> }): ImportHandler {
  return {
    id: "sheet",
    nature: "objet",
    detect: (head, name) => isSheetName(name) && hasZipMagic(head),
    limit: { maxBytes: SHEET_MAX_BYTES, message: SHEET_TOO_BIG_MESSAGE },
    async run(f, ctx) {
      const target = ctx.target;
      if (target === null) return "failed";
      let grid: TableGrid;
      try {
        grid = await deps.readSheet(ctx.blob);
      } catch (e) {
        const m = messageOf(e);
        await ctx.notify(m === EMPTY_SHEET_MESSAGE || m === SHEET_TOO_BIG_MESSAGE ? `${f.name} : ${m}` : `Import impossible (${f.name}) : ${m}`);
        return "failed";
      }
      return insertTableGrid(target, grid, ctx.at, ctx.inserted, ctx.notify, f.name);
    },
  };
}

const EMPTY = new Uint8Array(0);

export function createImporter(deps: ImportDeps): Importer {
  const readSheet = deps.readSheet;
  const registry: readonly ImportHandler[] = [
    roomboardHandler(deps),
    rbitemHandler(),
    imageHandler(deps.decode ? { decode: deps.decode } : {}),
    ...(readSheet ? [sheetHandler({ readSheet })] : []),
  ];
  return {
    async importFiles(files, at = null) {
      const opened: string[] = [];
      const inserted: string[] = [];
      const refused: string[] = [];
      const failed: string[] = [];
      const tooBig: string[] = [];
      const target = deps.target?.() ?? null; // onglet actif au début de l'appel (R3)
      const max = deps.maxBytes ?? null;
      let stopped = false; // onglets pleins : une seule boîte, les documents suivants ne sont pas tentés
      for (const f of files) {
        if (max !== null && f.size > max) {
          tooBig.push(f.name);
          continue;
        }
        const roomboard = isRoomboardName(f.name);
        if (roomboard && stopped) {
          failed.push(f.name);
          continue;
        }
        /** Lecture du fichier en échec : compté, signalé. */
        const fail = async (e: unknown): Promise<void> => {
          failed.push(f.name);
          await deps.notify(`${roomboard ? "Ouverture" : "Import"} impossible (${f.name}) : ${messageOf(e)}`);
        };
        // OD56 (DAC5) : l'en-tête seul avant la détection ; un fichier non reconnu n'est jamais lu en entier.
        let head: Uint8Array;
        try {
          head = roomboard ? EMPTY : (await f.head(HEAD_BYTES)).subarray(0, HEAD_BYTES);
        } catch (e) {
          await fail(e);
          continue;
        }
        const handler = registry.find((h) => h.detect(head, f.name));
        if (handler === undefined) {
          refused.push(f.name);
          continue;
        }
        // F22 : plafond du gestionnaire avant toute lecture du fichier (un `.xlsx` de 2 Go n'est jamais lu).
        if (handler.limit !== undefined && f.size > handler.limit.maxBytes) {
          failed.push(f.name);
          await deps.notify(`${f.name} : ${handler.limit.message}`);
          continue;
        }
        let blob: Blob;
        try {
          blob = await f.blob();
        } catch (e) {
          await fail(e);
          continue;
        }
        const outcome = await handler.run(f, { blob, head, at, inserted: inserted.length, target, notify: deps.notify });
        if (outcome === "opened") opened.push(f.name);
        else if (outcome === "inserted") inserted.push(f.name);
        else {
          failed.push(f.name);
          if (handler.nature === "document" && deps.full?.() === true) stopped = true;
        }
      }
      if (tooBig.length > 0 && max !== null) await deps.notify(tooBigMessage(tooBig, max));
      if (refused.length > 0) await deps.notify(`${refused.join(", ")} : ${LATER_FORMAT_MESSAGE}`);
      return { opened, inserted, refused: [...tooBig, ...refused], failed };
    },
  };
}
