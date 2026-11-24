/**
 * Import de la CLI (cadrage cli, D9, D10, D16, H2, H7, H10) : l'entrée unique `createImporter` avec des dépendances
 * Node ; une source d'un format laissé de côté sort en code 3 avant toute lecture ; images à la taille de l'en-tête
 * (`probeSize`, sans décodeur, EXIF non appliqué) ; classeur lu par la liaison du module formats
 * dans ce processus (`gridOf`, sans Worker : processus court, enregistrement atomique, D16) ; `.roomboard` ouvert en
 * onglet. Objets posés dans l'onglet actif au début de l'appel (R3), sur la page demandée ou la première.
 * cli-lot4 (D56, D58, D60, D63, D65, D67, DA17) : Office converti par roomboard-office (`checkOffice` avant toute lecture),
 * médias sondés par leur en-tête (`nodeMedia`), modèles 3D validés sans WebGL (`nodeModel3d`), images de tout format à la
 * taille de l'en-tête ; une image ou un média d'en-tête illisible sort en code 3 avant `createImporter` (`headerBlocked`) ;
 * un classeur n'a pas de chemin : tableau en valeurs.
 */
import { basename } from "node:path";
import type { DroppedFile, Point } from "../../web/src/platform/files";
import type { TableGrid } from "../../web/src/platform/html-table";
import { probeSize, type ImageDecoder } from "../../web/src/platform/image-import";
import { createImporter, isSheetName, type ImportReport } from "../../web/src/platform/import";
import type { SheetFormatsBinding } from "../../web/src/platform/container";
import { gridOf } from "../../web/src/platform/sheet-reader";
import { CliError } from "./contract";
import { readBytes } from "./disk";
import { extOf, leftAsideReason, packMessage } from "./formats";
import { headerBlocked, nodeMedia } from "./media-node";
import { nodeModel3d } from "./model3d-node";
import { checkOffice, convertOfficeFile } from "./office-node";
import type { Session } from "./session";
import { pageOf } from "./state";
import { headlessTarget, SCENE } from "./target";

/** DA17 : refus avant écriture, importables d'ici. */
export { checkOffice } from "./office-node";
export { headerBlocked } from "./media-node";

export interface ImportRequest {
  readonly sources: readonly string[];
  readonly page?: string | undefined;
  readonly at?: Point | null;
}
export interface ImportResult extends ImportReport {
  readonly notices: readonly string[];
}

/** Taille par l'en-tête (tous les formats, D63) ; illisible : l'image est refusée (aucun décodeur d'image dans la CLI). */
export const nodeDecode: ImageDecoder = async (blob, kind) => {
  const size = await probeSize(blob, kind);
  if (size === null) throw new Error(`image ${kind} : taille illisible dans l'en-tête (aucun décodeur d'image dans la CLI)`);
  return { bitmap: { close: () => undefined } as unknown as ImageBitmap, w: size.w, h: size.h };
};

export function nodeFile(path: string, bytes: Uint8Array): DroppedFile {
  const name = basename(path);
  return {
    name,
    size: bytes.byteLength,
    mime: "",
    // D58 : un classeur n'a pas de chemin : `officeHandler` le laisse au lecteur `sheet` (valeurs), aucun binaire lancé.
    ...(isSheetName(name) ? {} : { path }),
    head: async (n) => bytes.subarray(0, n),
    blob: async () => new Blob([bytes as BlobPart]),
  };
}

/** Point monde de la scène fixe (H7) ; hors de 0..1920 × 0..1080, la page retomberait au centre sans avis : usage. */
export function atOf(x: unknown, y: unknown): Point {
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new CliError("usage", "--at : deux nombres x,y attendus");
  }
  if (x < 0 || x > SCENE.width || y < 0 || y > SCENE.height) {
    throw new CliError("usage", `--at ${x},${y} hors de la scène (0..${SCENE.width}, 0..${SCENE.height})`);
  }
  return { x, y };
}

export function parseAt(text: string): Point {
  const parts = text.split(",");
  if (parts.length !== 2 || parts.some((s) => s.trim() === "")) throw new CliError("usage", "--at : deux nombres x,y attendus");
  return atOf(Number(parts[0]), Number(parts[1]));
}

/** Code 3 avant toute lecture ni écriture (D9) : format laissé de côté (H48) ; un paquet `.rbpack` :
 *  code 2, renvoi à `library` (D26). Le convertisseur Office (`checkOffice`) se contrôle à la suite, avant toute lecture. */
export function checkSources(sources: readonly string[]): void {
  for (const s of sources) {
    if (extOf(s) === ".rbpack") throw new CliError("usage", packMessage(s)); // D26 : un paquet va dans une bibliothèque
    const why = leftAsideReason(s);
    if (why !== null) throw new CliError("unsupported", `${basename(s)} : format non lu par la CLI : ${why}`);
  }
}

export const partialMessage = (r: ImportReport): string =>
  `import partiel : ${[...r.refused.map((n) => `${n} (refusé)`), ...r.failed.map((n) => `${n} (en échec)`)].join(", ")}`;

async function readSheet(mod: SheetFormatsBinding, blob: Blob): Promise<TableGrid> {
  const reader = mod.SheetReader.open(new Uint8Array(await blob.arrayBuffer()));
  try {
    return gridOf(reader);
  } finally {
    reader.free();
  }
}

export async function importInto(session: Session, req: ImportRequest): Promise<ImportResult> {
  checkSources(req.sources);
  const env = session.deps.env ?? process.env;
  await checkOffice(req.sources, env); // D56 : code 3 avant toute lecture (`--check` une fois par processus)
  const tab = session.active();
  const page = pageOf(tab, req.page);
  const read = await Promise.all(req.sources.map(async (s) => ({ s, bytes: await readBytes(s) })));
  for (const { s, bytes } of read) {
    const blocked = await headerBlocked(s, bytes); // D62, D65 : code 3 avant `createImporter`, rien écrit
    if (blocked !== null) throw new CliError("unsupported", blocked);
  }
  const files = read.map(({ s, bytes }) => {
    session.noteSource(s); // un tableau importé n'a pas de chemin dans `openBoard` : la source est retenue ici
    return nodeFile(s, bytes);
  });
  const { notices, formats } = session.deps;
  const before = notices.length;
  const importer = createImporter({
    openDocument: async (f) => (await session.openBytes(f.name, f.bytes, f.path ?? null)) !== null,
    openBoard: (f) => session.openBoard(f), // D22 : tableau en onglet sans fichier
    openPdf: (f) => session.openPdf(f), // D40 : PDF en onglet sans fichier
    notify: async (m) => {
      notices.push(m);
    },
    full: () => session.tabs.full(),
    target: () => headlessTarget(tab, page, notices, session.deps.fragments),
    decode: nodeDecode,
    readSheet: async (blob) => readSheet(await formats(), blob),
    ...nodeMedia(), // D60 : `probe` et `mediaUrls` par les URL de Node, durée lue dans l'en-tête, aucun lien
    model3d: nodeModel3d(), // D67 : three sans WebGL, instantané null
    convertOffice: (path) => convertOfficeFile(path, env), // D57 : roomboard-office
    openOffice: (f) => session.openPdf({ name: f.name, blob: f.pdf, original: f.original }), // comme la page (workspace.ts:461-465)
    officeConverter: true, // D56 : vérifié par `checkOffice` avant toute lecture
  });
  const report = await importer.importFiles(files, req.at ?? null);
  return { ...report, notices: notices.slice(before) };
}
