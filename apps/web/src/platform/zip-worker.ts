/**
 * Worker de lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : entrées gardées par `keepZipPath`, 1 000 entrées et
 * 256 Mio décompressés au plus (comptés avant décompression, par la taille d'origine du répertoire central). Créé par
 * `main.ts`, arrêté par `zip-read.ts` après la réponse. Seul module qui importe fflate (GC17), API synchrone seule : la
 * forme asynchrone lance des Workers `blob:`, refusés par la CSP.
 */
import { unzipSync } from "fflate";
import { keepZipPath, normalizePath, ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";

export function unzipModelEntries(
  data: Uint8Array,
  limits: { readonly entries: number; readonly bytes: number } = { entries: ZIP_MAX_ENTRIES, bytes: ZIP_MAX_BYTES },
): Array<{ path: string; bytes: Uint8Array }> {
  let count = 0;
  let total = 0;
  let tooBig = false;
  const files = unzipSync(data, {
    filter(f) {
      count++;
      if (count > limits.entries) {
        tooBig = true;
        return false;
      }
      if (tooBig || !keepZipPath(f.name)) return false;
      total += f.originalSize;
      if (total > limits.bytes) {
        tooBig = true;
        return false;
      }
      return true;
    },
  });
  if (tooBig) throw new Error(ZIP_TOO_BIG_MESSAGE);
  return Object.entries(files)
    .map(([name, bytes]) => ({ path: normalizePath(name), bytes }))
    .filter((e) => e.path !== "");
}

// Branché seulement dans un Worker (le test l'importe sous Node).
if (typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== "undefined") {
  const scope = globalThis as unknown as {
    onmessage: ((e: MessageEvent<{ readonly bytes: Uint8Array }>) => void) | null;
    postMessage(m: unknown, t: Transferable[]): void;
  };
  scope.onmessage = (e) => {
    try {
      const entries = unzipModelEntries(e.data.bytes);
      // Deux entrées peuvent partager un tampon : cité deux fois, `postMessage` lèverait.
      scope.postMessage({ entries }, [...new Set(entries.map((x) => x.bytes.buffer as ArrayBuffer))]);
    } catch (err) {
      scope.postMessage({ error: err instanceof Error ? err.message : String(err) }, []);
    }
  };
}
