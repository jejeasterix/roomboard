/**
 * Lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : `fflate.unzipSync` dans un Worker jetable (`runOnce`), jamais dans la
 * page ni par le module `formats`. Réponse contrôlée : `{ entries: [{ path, bytes }] }` ou `{ error }`.
 * C4 : lecture d'un paquet (`mode: "pack"`, chemins tels quels) et écriture d'un ZIP stocké (`createZipWriter`).
 * C13 lot 2 : `content.json` d'un `.olf` lu dans le même Worker (`createOlfReader`), rendu en flux BoardList.
 * C13 lot 3 : conteneur Bamboo d'un `.flipchart` (`mode: "bamboo"`), chemins `<page>.fpg/<nom>`.
 */
import type { ZipFile } from "./archive-path";
import { BOARD_FAILED_MESSAGE, checkBoardParts, type BoardPart } from "./board-reader";
import { OLF_MAX_JSON_BYTES, OLF_TOO_BIG_MESSAGE } from "./olf-read";
import { runOnce, type WorkerLike } from "./one-shot-worker";

export interface ZipEntry {
  readonly path: string;
  readonly blob: Blob;
}
/** Fichier à écrire dans un ZIP (C4) : `archive-path.ts` (OF13, D7), réexporté ici pour `rbpack.ts` et ses importeurs. */
export type { ZipFile } from "./archive-path";
export const ZIP_WORKER_TIMEOUT_MS = 60_000;
export const ZIP_FAILED_MESSAGE = "lecture du ZIP interrompue";
export const ZIP_WRITE_FAILED_MESSAGE = "écriture du ZIP interrompue";

/** Réponse du Worker : `{ error }` rend son texte tel quel ; toute autre forme que `{ entries: [{ path, bytes }] }` lève. */
export function checkZipReply(d: unknown): ZipEntry[] {
  const r = d as { entries?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  if (!Array.isArray(r?.entries)) throw new Error(ZIP_FAILED_MESSAGE);
  return r.entries.map((e: unknown) => {
    const x = e as { path?: unknown; bytes?: unknown } | null;
    if (typeof x?.path !== "string" || !(x.bytes instanceof Uint8Array)) throw new Error(ZIP_FAILED_MESSAGE);
    return { path: x.path, blob: new Blob([x.bytes as Uint8Array<ArrayBuffer>]) };
  });
}

/** Réponse du Worker à `{ op: "zip" }` : `{ error }` rend son texte tel quel ; toute autre forme que `{ bytes }` lève. */
export function checkZipBytesReply(d: unknown): Uint8Array {
  const r = d as { bytes?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  if (!(r?.bytes instanceof Uint8Array)) throw new Error(ZIP_WRITE_FAILED_MESSAGE);
  return r.bytes;
}

/** Un Worker neuf par ZIP (`spawn`), le contenu transféré, arrêté après la réponse ou au bout de `timeoutMs`.
 *  `mode: "pack"` (C4), `mode: "board"` et `mode: "bamboo"` (C13) gardent les chemins tels quels ; le message 3D reste
 *  `{ bytes }` seul. */
export function createZipReader(
  spawn: () => WorkerLike,
  timeoutMs = ZIP_WORKER_TIMEOUT_MS,
  mode: "model3d" | "pack" | "board" | "bamboo" = "model3d",
): (blob: Blob) => Promise<ZipEntry[]> {
  return async (blob) => {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const message = mode === "model3d" ? { bytes } : { op: "unzip", mode, bytes };
    return runOnce(spawn, message, [buf], timeoutMs, checkZipReply, ZIP_FAILED_MESSAGE);
  };
}

/** C4 (D17) : ZIP stocké écrit dans un Worker jetable. */
export function createZipWriter(spawn: () => WorkerLike, timeoutMs = ZIP_WORKER_TIMEOUT_MS): (files: readonly ZipFile[]) => Promise<Uint8Array> {
  return (files) => runOnce(spawn, { op: "zip", files }, [], timeoutMs, checkZipBytesReply, ZIP_WRITE_FAILED_MESSAGE);
}

/** C13 lot 2 : flux d'un `.olf` (`ops` en `Float32Array`) et `total`, pages avant la coupe à 500 (avis écrit par la page). */
export interface OlfPart extends BoardPart {
  readonly ops: Float32Array;
  readonly total: number;
}

/** Réponse à `{ op: "olf" }` : `{ error }` rendu tel quel ; toute autre forme que `{ part: { ops, texts, warnings, total } }`
 *  lève `BOARD_FAILED_MESSAGE` (contrôle de `checkBoardParts`). */
export function checkOlfReply(d: unknown): OlfPart {
  const r = d as { part?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  const total = (r?.part as { total?: unknown } | null | undefined)?.total;
  const [part] = checkBoardParts({ parts: [r?.part] });
  if (typeof total !== "number" || !Number.isInteger(total) || total < 0) throw new Error(BOARD_FAILED_MESSAGE);
  return { ops: part!.ops as Float32Array, texts: part!.texts, warnings: part!.warnings, total };
}

/** C13 lot 2 (N8) : `content.json` lu dans un Worker ZIP jetable, contenu transféré ; jamais de `JSON.parse` sur la page. */
export function createOlfReader(spawn: () => WorkerLike, timeoutMs = ZIP_WORKER_TIMEOUT_MS): (json: Blob) => Promise<OlfPart> {
  return async (json) => {
    // Borne de 64 Mio avant la copie : le Worker la contrôle encore (`olfPart`), mais la page n'alloue rien au-delà.
    if (json.size > OLF_MAX_JSON_BYTES) throw new Error(OLF_TOO_BIG_MESSAGE);
    const buf = await json.arrayBuffer();
    return runOnce(spawn, { op: "olf", bytes: new Uint8Array(buf) }, [buf], timeoutMs, checkOlfReply, BOARD_FAILED_MESSAGE);
  };
}
