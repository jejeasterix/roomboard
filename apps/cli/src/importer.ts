/**
 * Import de la CLI (cadrage cli, D9, D10, D16, H2, H7, H10) : l'entrée unique `createImporter` avec des dépendances
 * Node ; une source d'un format reconnu mais d'un lot non livré sort en code 3 avant toute lecture ; images PNG et JPEG
 * à la taille de l'en-tête (`probeSize`, sans décodeur, EXIF non appliqué) ; classeur lu par la liaison du module formats
 * dans ce processus (`gridOf`, sans Worker : processus court, enregistrement atomique, D16) ; `.roomboard` ouvert en
 * onglet. Objets posés dans l'onglet actif au début de l'appel (R3), sur la page demandée ou la première.
 */
import { basename } from "node:path";
import { MAX_TABS } from "../../web/src/app/tabs";
import type { DroppedFile, Point } from "../../web/src/platform/files";
import type { TableGrid } from "../../web/src/platform/html-table";
import { probeSize, type ImageDecoder } from "../../web/src/platform/image-import";
import { createImporter, type ImportReport } from "../../web/src/platform/import";
import type { SheetFormatsBinding } from "../../web/src/platform/container";
import { gridOf } from "../../web/src/platform/sheet-reader";
import { CliError } from "./contract";
import { readBytes } from "./disk";
import { importBlocked, unsupportedMessage } from "./formats";
import type { Session } from "./session";
import { headlessTarget, SCENE } from "./target";

export interface ImportRequest {
  readonly sources: readonly string[];
  readonly page?: string | undefined;
  readonly at?: Point | null;
}
export interface ImportResult extends ImportReport {
  readonly notices: readonly string[];
}

/** Taille par l'en-tête (PNG, JPEG) ; tout autre format : illisible sans décodeur (lot 4). */
export const nodeDecode: ImageDecoder = async (blob, kind) => {
  const size = await probeSize(blob, kind);
  if (size === null) throw new Error(`image ${kind} : taille illisible sans décodeur (lot 4)`);
  return { bitmap: { close: () => undefined } as unknown as ImageBitmap, w: size.w, h: size.h };
};

export function nodeFile(path: string, bytes: Uint8Array): DroppedFile {
  return {
    name: basename(path),
    size: bytes.byteLength,
    mime: "",
    path,
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

/** Code 3 avant toute lecture ni écriture (D9). */
export function checkSources(sources: readonly string[]): void {
  for (const s of sources) {
    const lot = importBlocked(s);
    if (lot !== null) throw new CliError("unsupported", unsupportedMessage(s, lot));
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
  const tab = session.active();
  const pages = tab.doc.pageIds();
  const page = req.page ?? pages[0];
  if (page === undefined || !pages.includes(page)) throw new CliError("command", `page inconnue : ${req.page ?? "(aucune)"}`);
  const files = await Promise.all(req.sources.map(async (s) => nodeFile(s, await readBytes(s))));
  const { notices, formats } = session.deps;
  const before = notices.length;
  const importer = createImporter({
    openDocument: async (f) => (await session.openBytes(f.name, f.bytes, f.path ?? null)) !== null,
    notify: async (m) => {
      notices.push(m);
    },
    full: () => session.tabs.list().length >= MAX_TABS,
    target: () => headlessTarget(tab, page, notices),
    decode: nodeDecode,
    readSheet: async (blob) => readSheet(await formats(), blob),
  });
  const report = await importer.importFiles(files, req.at ?? null);
  return {
    opened: [...report.opened],
    inserted: [...report.inserted],
    refused: [...report.refused],
    failed: [...report.failed],
    notices: notices.slice(before),
  };
}
