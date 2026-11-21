/**
 * Lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : `fflate.unzipSync` dans un Worker jetable (`runOnce`), jamais dans la
 * page ni par le module `formats`. Réponse contrôlée : `{ entries: [{ path, bytes }] }` ou `{ error }`.
 * C4 : lecture d'un paquet (`mode: "pack"`, chemins tels quels) et écriture d'un ZIP stocké (`createZipWriter`).
 */
import { runOnce, type WorkerLike } from "./one-shot-worker";
import type { ZipFile } from "./rbpack";

export interface ZipEntry {
  readonly path: string;
  readonly blob: Blob;
}
export const ZIP_WORKER_TIMEOUT_MS = 60_000;
export const ZIP_FAILED_MESSAGE = "lecture du ZIP interrompue";

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
  if (!(r?.bytes instanceof Uint8Array)) throw new Error(ZIP_FAILED_MESSAGE);
  return r.bytes;
}

/** Un Worker neuf par ZIP (`spawn`), le contenu transféré, arrêté après la réponse ou au bout de `timeoutMs`.
 *  `mode: "pack"` (C4) garde les chemins du paquet tels quels ; le message 3D reste `{ bytes }` seul. */
export function createZipReader(
  spawn: () => WorkerLike,
  timeoutMs = ZIP_WORKER_TIMEOUT_MS,
  mode: "model3d" | "pack" = "model3d",
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
  return (files) => runOnce(spawn, { op: "zip", files }, [], timeoutMs, checkZipBytesReply, ZIP_FAILED_MESSAGE);
}
