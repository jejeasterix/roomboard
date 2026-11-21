/**
 * Lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : `fflate.unzipSync` dans un Worker jetable (`runOnce`), jamais dans la
 * page ni par le module `formats`. Réponse contrôlée : `{ entries: [{ path, bytes }] }` ou `{ error }`.
 */
import { runOnce, type WorkerLike } from "./one-shot-worker";

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

/** Un Worker neuf par ZIP (`spawn`), le contenu transféré, arrêté après la réponse ou au bout de `timeoutMs`. */
export function createZipReader(spawn: () => WorkerLike, timeoutMs = ZIP_WORKER_TIMEOUT_MS): (blob: Blob) => Promise<ZipEntry[]> {
  return async (blob) => {
    const buf = await blob.arrayBuffer();
    return runOnce(spawn, { bytes: new Uint8Array(buf) }, [buf], timeoutMs, checkZipReply, ZIP_FAILED_MESSAGE);
  };
}
