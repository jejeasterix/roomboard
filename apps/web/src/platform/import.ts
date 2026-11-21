/**
 * Entrée unique des fichiers (U23, R1) : dépôt web, dépôt dans la coque, collage, « Importer » et fichier passé au
 * lancement passent par `importFiles`. Registre par nature : `roomboard` (document, reconnu par l'extension) ouvre un
 * nouvel onglet (R2) ; `rbitem` (objet, nom + en-tête ZIP) s'insère comme une image ; `image` (objet, reconnue par ses octets) s'insère dans l'onglet actif au début de l'appel (R3).
 * Non reconnu : refusé avec `LATER_FORMAT_MESSAGE`. Hôtes web : 100 Mo au plus par fichier, contrôlé avant lecture (R15).
 * C12 (PF2, PF3) : `pdf` (document, reconnu par `%PDF-` dans le premier Kio) ouvre un nouvel onglet par `openPdf`.
 * C10b (F28) : `sheet` (objet, `.xlsx`/`.xlsm` et en-tête ZIP) lit la première feuille dans un Worker jetable et pose un tableau.
 * C14 (M10 à M15) : `media` (objet, reconnu par ses octets, avant `image`) ; MKV et AVI refusés avant lecture ; dans la
 * coque, un média qui a un chemin et dépasse 50 Mo est lié (`link`), sans lecture ni plafond.
 * C15 (DAX2) : appel de plusieurs fichiers, pré-passe dans `importFiles` (seule chaîne, U23) : chaque gestionnaire qui a
 * `companions` reçoit les autres fichiers ; ceux qu'il réclame sortent de la boucle et lui arrivent dans `ctx.companions`.
 * Les en-têtes et le contenu lus par la pré-passe sont repris par la boucle, jamais relus.
 * C4 (U25) : `rbpack` (paquet, nom + en-tête ZIP) importé dans la bibliothèque par `importPack`, au plafond des ZIP ;
 * nature `paquet` : il n'ouvre aucun onglet, les onglets pleins ne l'arrêtent pas.
 */
import { messageOf } from "./controller";
import { IWB_EXTENSION, UBZ_EXTENSION, RBITEM_EXTENSION, RBPACK_EXTENSION, ROOMBOARD_EXTENSION, type DroppedFile, type Point, type SaveTarget } from "./files";
import type { TableGrid } from "./html-table";
import { HEAD_BYTES, imageHandler, type ImageDecoder, type ImageTarget } from "./image-import";
import { mediaHandler, probeMedia, unsupportedMediaHandler, type LinkedMedia, type MediaHandlerDeps, type MediaProbe } from "./media-import";
import { companionHandler, model3dHandler, zip3dHandler, type Model3dDeps, type Model3dShared } from "./model3d-handlers";
import { ZIP_MAX_BYTES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";
import { EMPTY_SHEET_MESSAGE, SHEET_TOO_BIG_MESSAGE } from "./sheet-reader";
import { insertTableGrid } from "./table-insert";
import { officeHandler, officeNoConverterHandler, officeSheetNoConverterHandler, officeWebHandler, type OfficeOpenFile } from "./office-import";

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
  /** C14 (R1) : `path`, chemin du fichier déposé ou passé au lancement (null : collage, web), pour les liens relatifs. */
  openDocument(file: {
    readonly name: string;
    readonly bytes: Uint8Array;
    readonly target: SaveTarget | null;
    readonly path?: string | null;
  }): Promise<boolean>;
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
  /** C12 (PF2, PF10) : ouvre un PDF dans un nouvel onglet ; false si refusé (message déjà dit) ; absente : `.pdf`
   *  refusé comme avant. */
  openPdf?(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>;
  /** C13 (D4, D5) : ouvre un tableau `.iwb` (ZIP ou XML) ou `.ubz` dans un nouvel onglet ; false si refusé (message
   *  déjà dit) ; absente : `.iwb` et `.ubz` refusés comme avant. */
  openBoard?(file: { readonly name: string; readonly blob: Blob; readonly format: "iwb" | "ubz" }): Promise<boolean>;
  /** C4 (U25, D19) : paquet `.rbpack` importé dans la bibliothèque ; faux si refusé (avis déjà dit). Absent : refusé. */
  importPack?(name: string, bytes: Uint8Array): Promise<boolean>;
  /** C14 (M15) : sonde d'un média (durée, taille, poster) ; absente : la sonde du navigateur (T8). */
  readonly probe?: (url: string) => Promise<MediaProbe>;
  /** C14 : lie un fichier de la coque sans le copier (T8, T10). */
  linkMedia?(path: string): Promise<LinkedMedia>;
  /** URL `blob:` de la sonde (tests) ; défaut : `URL.createObjectURL` / `URL.revokeObjectURL`. */
  readonly mediaUrls?: MediaHandlerDeps["urls"];
  /** C15 (X39) : rendu partagé et lecteur de ZIP ; absent : fichiers 3D et `.zip` refusés comme avant. */
  readonly model3d?: Model3dDeps;
  /** C16 (O4, O35) : conversion par la coque du fichier `path` en PDF ; absente (web, iPad) : « exportez en PDF depuis
   *  Office », `.xlsx` en valeurs. Rejette `OfficeConvertError` (code de la coque). */
  convertOffice?(path: string): Promise<Blob>;
  /** C16 (O5, O16) : ouvre le PDF converti dans un nouvel onglet, l'original gardé ; false si refusé (avis déjà dit). */
  openOffice?(file: OfficeOpenFile): Promise<boolean>;
  /** C16 (O24) : la coque a un convertisseur ; faux : « installez LibreOffice ou Microsoft Office » sans lire le fichier,
   *  `.xlsx` au classeur. Absent : vrai. */
  readonly officeConverter?: boolean;
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
  /** C15 (DAX2) : fichiers du même appel réclamés par `companions` ; [] sinon (appel d'un seul fichier, lien). */
  readonly companions: readonly DroppedFile[];
}

export type ImportOutcome = "opened" | "inserted" | "failed";

export interface ImportHandler {
  readonly id: string;
  /** `document` ouvre un onglet (compte les onglets pleins) ; `objet` va dans l'onglet actif ; `paquet` dans la bibliothèque. */
  readonly nature: "document" | "objet" | "paquet";
  detect(head: Uint8Array, name: string): boolean;
  /** Plafond propre au gestionnaire (F22), contrôlé par `importFiles` sur `f.size` **avant** `f.blob()` (la coque lit
   *  le fichier en entier) : dépassé, « <nom> : <message> », compté en échec. */
  readonly limit?: { readonly maxBytes: number; readonly message: string };
  /** C14 (PC4, M14) : fichier qui a un chemin (coque) et dépasse `aboveBytes` : `run` lie le fichier sans le lire ;
   *  appelé par `importFiles` avant `limit` et sans `f.blob()`. Dit lui-même ses messages. */
  readonly link?: {
    readonly aboveBytes: number;
    run(file: DroppedFile, path: string, ctx: Omit<ImportContext, "blob">): Promise<ImportOutcome>;
  };
  /** C15 (DAX2) : fichiers de `siblings` que ce fichier cite ; ils sortent de la boucle et arrivent dans `ctx.companions`.
   *  Appelé seulement pour un appel de plusieurs fichiers, après les plafonds, avec l'en-tête et le contenu déjà lus. */
  readonly companions?: (file: DroppedFile, blob: Blob, head: Uint8Array, siblings: readonly DroppedFile[]) => Promise<readonly DroppedFile[]>;
  /** Dit lui-même ses messages d'échec. */
  run(file: DroppedFile, ctx: ImportContext): Promise<ImportOutcome>;
}

/** Nom qui se termine par `ext` (minuscules, point compris) et ne s'y réduit pas. */
export function hasExtension(name: string, ext: string): boolean {
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
      return (await deps.openDocument({ name: f.name, bytes, target: null, path: f.path ?? null })) ? "opened" : "failed";
    },
  };
}

/** En-tête d'un ZIP (`PK\x03\x04`) : un `.rbitem` (Z10) comme un `.xlsx` (F28) est un ZIP ; chacun est reconnu par son
 *  nom ET cet en-tête, le nom seul les départage. */
export const ZIP_MAGIC: readonly number[] = Object.freeze([0x50, 0x4b, 0x03, 0x04]);

export const hasZipMagic = (head: Uint8Array): boolean => head.length >= ZIP_MAGIC.length && ZIP_MAGIC.every((b, i) => head[i] === b);

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

export function isRbpackName(name: string): boolean {
  return hasExtension(name, RBPACK_EXTENSION);
}

/** Entrée `rbpack` (C4, U25 « Paquet → importé dans la bibliothèque ») : aucun onglet visé. */
export function rbpackHandler(deps: { importPack(name: string, bytes: Uint8Array): Promise<boolean> }): ImportHandler {
  return {
    id: "rbpack",
    nature: "paquet",
    detect: (head, name) => isRbpackName(name) && hasZipMagic(head),
    limit: { maxBytes: ZIP_MAX_BYTES, message: ZIP_TOO_BIG_MESSAGE },
    async run(f, ctx) {
      try {
        const bytes = new Uint8Array(await ctx.blob.arrayBuffer());
        return (await deps.importPack(f.name, bytes)) ? "opened" : "failed";
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

/** C12 (PF3) : en-tête `%PDF-`, cherché dans le premier Kio (la norme tolère des octets avant), sans regarder le nom. */
export const PDF_MAGIC: readonly number[] = Object.freeze([0x25, 0x50, 0x44, 0x46, 0x2d]);
export const PDF_HEAD_SCAN = 1024;

export function hasPdfMagic(head: Uint8Array): boolean {
  const last = Math.min(head.length, PDF_HEAD_SCAN) - PDF_MAGIC.length;
  for (let i = 0; i <= last; i++) {
    if (PDF_MAGIC.every((b, k) => head[i + k] === b)) return true;
  }
  return false;
}

/** Entrée `pdf` du registre (C12, PF2, Q1) : document, ouvert dans un nouvel onglet par `openPdf`, qui dit ses refus
 *  (chiffré, illisible, onglets pleins). */
export function pdfHandler(deps: { openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean> }): ImportHandler {
  return {
    id: "pdf",
    nature: "document",
    detect: (head) => hasPdfMagic(head),
    async run(f, ctx) {
      return (await deps.openPdf({ name: f.name, blob: ctx.blob })) ? "opened" : "failed";
    },
  };
}

/** C13 (D4) : plafond d'un tableau, ZIP comme XML brut, aussi dans la coque où `maxBytes` est nul. */
export const BOARD_TOO_BIG_MESSAGE = "fichier de tableau trop gros (plus de 256 Mio)";

export function isIwbName(name: string): boolean {
  return hasExtension(name, IWB_EXTENSION);
}

export function isUbzName(name: string): boolean {
  return hasExtension(name, UBZ_EXTENSION);
}

/** C13 (D4) : en-tête XML d'un `.iwb` en SVG brut : `<?xml` ou `<iwb`, après un BOM UTF-8 et des blancs. */
export function hasXmlHead(head: Uint8Array): boolean {
  let i = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf ? 3 : 0;
  while (i < head.length && (head[i] === 0x20 || head[i] === 0x09 || head[i] === 0x0a || head[i] === 0x0d)) i++;
  const text = new TextDecoder("utf-8").decode(head.subarray(i, i + 5));
  return text === "<?xml" || text.startsWith("<iwb");
}

/** C13 (D4, D5) : `iwb` = nom `.iwb` et en-tête ZIP ou XML ; `ubz` = nom `.ubz` et en-tête ZIP. Document : nouvel onglet
 *  par `openBoard`, qui dit ses refus (endommagé, onglets pleins). */
export function boardHandler(format: "iwb" | "ubz", deps: { openBoard: NonNullable<ImportDeps["openBoard"]> }): ImportHandler {
  return {
    id: format,
    nature: "document",
    detect: format === "iwb" ? (_head, name) => isIwbName(name) : (head, name) => isUbzName(name) && hasZipMagic(head),
    limit: { maxBytes: ZIP_MAX_BYTES, message: BOARD_TOO_BIG_MESSAGE },
    async run(f, ctx) {
      return (await deps.openBoard({ name: f.name, blob: ctx.blob, format })) ? "opened" : "failed";
    },
  };
}

const EMPTY = new Uint8Array(0);

/** C14 (PC4, M14) : chemin du fichier quand `handler` le lie (coque, au-delà de `link.aboveBytes`) ; null : il est lu. */
const linkPathOf = (handler: ImportHandler, f: DroppedFile): string | null =>
  handler.link !== undefined && f.path !== undefined && f.path !== "" && f.size > handler.link.aboveBytes ? f.path : null;

export function createImporter(deps: ImportDeps): Importer {
  const readSheet = deps.readSheet;
  const sheet = readSheet ? sheetHandler({ readSheet }) : undefined;
  const openPdf = deps.openPdf?.bind(deps);
  const openBoard = deps.openBoard?.bind(deps);
  const importPack = deps.importPack?.bind(deps);
  const linkMedia = deps.linkMedia?.bind(deps);
  const model3d = deps.model3d;
  const shared3d: Model3dShared = { warnedNoWebgl: false }; // X26 : « 3D indisponible » une fois par importeur
  const media: MediaHandlerDeps = {
    probe: deps.probe ?? ((url) => probeMedia(url)),
    urls: deps.mediaUrls ?? { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) },
    ...(linkMedia ? { linkMedia } : {}),
  };
  const convertOffice = deps.convertOffice?.bind(deps);
  const openOffice = deps.openOffice?.bind(deps);
  // C14 (M11) : `media` avant `image` ; `sniffMedia` laisse à l'image tout en-tête que `sniffImage` revendique.
  return importerOf(
    [
      roomboardHandler(deps),
      rbitemHandler(),
      ...(importPack ? [rbpackHandler({ importPack })] : []),
      ...(openPdf ? [pdfHandler({ openPdf })] : []),
      ...(openBoard ? [boardHandler("iwb", { openBoard }), boardHandler("ubz", { openBoard })] : []), // C13 : avant `media`
      mediaHandler(media),
      unsupportedMediaHandler("mkv"),
      unsupportedMediaHandler("avi"),
      imageHandler(deps.decode ? { decode: deps.decode } : {}),
      ...(model3d ? [model3dHandler(model3d, shared3d)] : []), // C15 (X12) : après `image`
      // C16 (O3, O4, O33) : avant `sheet` ; coque : conversion, `.xlsx` compris (repli sur `sheet` sans convertisseur) ;
      // web : message, `.xlsx` laissé à `sheet`.
      ...(convertOffice && openOffice
        ? deps.officeConverter === false
          ? [officeNoConverterHandler(), ...(sheet ? [officeSheetNoConverterHandler(sheet)] : [])]
          : [officeHandler({ convert: convertOffice, open: openOffice, ...(sheet ? { sheet } : {}) })]
        : [officeWebHandler()]),
      ...(sheet ? [sheet] : []),
      ...(model3d ? [zip3dHandler(model3d, shared3d), companionHandler()] : []), // après `sheet` : `.xlsx` d'abord
    ],
    deps,
  );
}

/** Importeur sur un registre donné (tests, `createImporter`). */
export function importerOf(registry: readonly ImportHandler[], deps: ImportDeps): Importer {
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
      // C15 (DAX2) : un en-tête ou un contenu lu par la pré-passe est repris par la boucle (la coque lit par morceaux,
      // `grantedFile`) ; une lecture en échec n'est pas retentée, la boucle dit l'échec comme avant.
      const heads = new Map<DroppedFile, Promise<Uint8Array>>();
      const headOf = (f: DroppedFile): Promise<Uint8Array> => {
        let read = heads.get(f);
        if (read === undefined) {
          read = (async () => (await f.head(HEAD_BYTES)).subarray(0, HEAD_BYTES))();
          heads.set(f, read);
        }
        return read;
      };
      const blobs = new Map<DroppedFile, Promise<Blob>>();
      // C15 (DAX2) : pré-passe des appels de plusieurs fichiers ; un fichier réclamé passe à son modèle, pas au registre.
      const companionsOf = new Map<DroppedFile, readonly DroppedFile[]>();
      const claimed = new Set<DroppedFile>();
      // X17 : fichier réclamé au-delà du plafond de son réclamant (la coque n'a pas `maxBytes`) : jamais passé, dit trop gros.
      const overLimit = new Map<DroppedFile, string>();
      if (files.length > 1 && registry.some((h) => h.companions !== undefined)) {
        const fits = (o: DroppedFile): boolean => max === null || o.size <= max;
        for (const f of files) {
          if (claimed.has(f) || !fits(f) || isRoomboardName(f.name)) continue;
          let head: Uint8Array;
          try {
            head = await headOf(f);
          } catch {
            continue; // la boucle reprend l'échec et le dit
          }
          const handler = registry.find((h) => h.detect(head, f.name));
          const claim = handler?.companions;
          if (handler === undefined || claim === undefined) continue;
          if (handler.limit !== undefined && f.size > handler.limit.maxBytes) continue;
          if (linkPathOf(handler, f) !== null) continue; // C14 : la boucle le lie sans le lire ; rien de réclamé
          const read = (async () => f.blob())();
          blobs.set(f, read);
          let blob: Blob;
          try {
            blob = await read;
          } catch {
            continue;
          }
          const siblings = files.filter((o) => o !== f && !claimed.has(o) && !companionsOf.has(o) && fits(o) && !isRoomboardName(o.name));
          let companions: readonly DroppedFile[] = [];
          try {
            companions = (await claim(f, blob, head, siblings)).filter((c) => siblings.includes(c));
          } catch {
            companions = [];
          }
          for (const c of companions) claimed.add(c);
          const cap = handler.limit;
          if (cap !== undefined) for (const c of companions) if (c.size > cap.maxBytes) overLimit.set(c, cap.message);
          companionsOf.set(f, companions.filter((c) => !overLimit.has(c)));
        }
      }
      for (const f of files) {
        if (claimed.has(f)) {
          // C15 : fichier lié, passé à son modèle ; au-delà du plafond, dit comme le plafond du gestionnaire plus bas (F22).
          const over = overLimit.get(f);
          if (over !== undefined) {
            failed.push(f.name);
            await deps.notify(`${f.name} : ${over}`);
          }
          continue;
        }
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
          head = roomboard ? EMPTY : await headOf(f);
        } catch (e) {
          await fail(e);
          continue;
        }
        const handler = registry.find((h) => h.detect(head, f.name));
        if (handler === undefined) {
          refused.push(f.name);
          continue;
        }
        // Onglets pleins (PF10, PC18) : un document suivant reconnu par ses octets (PDF) n'est pas tenté non plus.
        if (handler.nature === "document" && stopped) {
          failed.push(f.name);
          continue;
        }
        let outcome: ImportOutcome;
        const link = handler.link;
        const path = linkPathOf(handler, f);
        if (link !== undefined && path !== null) {
          // C14 (PC4, M14) : lié avant le plafond et sans `f.blob()` ; la coque lirait 2 Go en entier.
          outcome = await link.run(f, path, { head, at, inserted: inserted.length, target, notify: deps.notify, companions: [] });
        } else {
          // F22 : plafond du gestionnaire avant toute lecture du fichier (un `.xlsx` de 2 Go n'est jamais lu).
          if (handler.limit !== undefined && f.size > handler.limit.maxBytes) {
            failed.push(f.name);
            await deps.notify(`${f.name} : ${handler.limit.message}`);
            continue;
          }
          let blob: Blob;
          try {
            blob = await (blobs.get(f) ?? f.blob());
          } catch (e) {
            await fail(e);
            continue;
          }
          outcome = await handler.run(f, { blob, head, at, inserted: inserted.length, target, notify: deps.notify, companions: companionsOf.get(f) ?? [] });
        }
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
