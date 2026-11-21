/**
 * Worker de lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : entrées gardées par `keepZipPath`, 1 000 entrées et
 * 256 Mio décompressés au plus, comptés avant décompression sur chaque enregistrement du répertoire central, au plus
 * grand de ses deux tailles : fflate copie `size` octets d'une entrée stockée et alloue `originalSize` octets pour une
 * entrée déflatée. Entrée stockée dont les deux tailles diffèrent : refusée (ZIP malformé). Créé par
 * `main.ts`, arrêté par `zip-read.ts` après la réponse. Seul module qui importe fflate (GC17), API synchrone seule : la
 * forme asynchrone lance des Workers `blob:`, refusés par la CSP.
 * C4 : paquets `.rbpack` (lecture `mode: "pack"`, écriture `op: "zip"`), mêmes bornes, chemins rendus tels quels.
 */
import { unzipSync, zipSync, type Zippable } from "fflate";
import {
  keepZipPath,
  normalizePath,
  ZIP_MALFORMED_MESSAGE,
  ZIP_MAX_BYTES,
  ZIP_MAX_ENTRIES,
  ZIP_TOO_BIG_MESSAGE,
} from "./model3d-import";
import { isPackEntry } from "./rbpack";
import type { ZipFile } from "./zip-read";

/** C4 : entrées d'un paquet (manifeste, ressources, vignettes) ; tout autre fichier du ZIP est ignoré. */
export function keepPackPath(name: string): boolean {
  return isPackEntry(name);
}

/** Date fixe des entrées (D25 : octets stables), en heure locale comme le champ DOS du ZIP. */
const PACK_MTIME = new Date(1980, 0, 1, 0, 0, 0);

/** C4 (D17) : ZIP stocké, entrées dans l'ordre reçu (déjà trié par `buildPack`), date fixe. */
export function zipStored(files: readonly ZipFile[]): Uint8Array {
  const z: Zippable = {};
  for (const f of files) z[f.path] = f.bytes;
  return zipSync(z, { level: 0, mtime: PACK_MTIME });
}

/** Entrées gardées par `keep`, sous les bornes ; `normalize` (identité par défaut : chemins bruts du paquet, contrôlés
 *  plus loin) n'est donné que par la lecture 3D. */
export function unzipEntries(
  data: Uint8Array,
  keep: (name: string) => boolean,
  limits: { readonly entries: number; readonly bytes: number } = { entries: ZIP_MAX_ENTRIES, bytes: ZIP_MAX_BYTES },
  normalize: (name: string) => string = (n) => n,
): Array<{ path: string; bytes: Uint8Array }> {
  let count = 0;
  let total = 0;
  let tooBig = false;
  let malformed = false;
  const files = unzipSync(data, {
    filter(f) {
      count++;
      if (count > limits.entries) {
        tooBig = true;
        return false;
      }
      if (tooBig || malformed || !keep(f.name)) return false;
      if (f.compression === 0 && f.size !== f.originalSize) {
        malformed = true;
        return false;
      }
      total += Math.max(f.size, f.originalSize);
      if (total > limits.bytes) {
        tooBig = true;
        return false;
      }
      return true;
    },
  });
  if (malformed) throw new Error(ZIP_MALFORMED_MESSAGE);
  if (tooBig) throw new Error(ZIP_TOO_BIG_MESSAGE);
  return Object.entries(files)
    .map(([name, bytes]) => ({ path: normalize(name), bytes }))
    .filter((e) => e.path !== "");
}

export function unzipModelEntries(
  data: Uint8Array,
  limits?: { readonly entries: number; readonly bytes: number },
): Array<{ path: string; bytes: Uint8Array }> {
  return unzipEntries(data, keepZipPath, limits, normalizePath);
}

/** `{ bytes }` seul : lecture 3D (inchangée) ; `{ op: "unzip", mode: "pack", bytes }` ; `{ op: "zip", files }`. */
interface WorkerMessage {
  readonly op?: "unzip" | "zip";
  readonly mode?: "model3d" | "pack";
  readonly bytes?: Uint8Array;
  readonly files?: readonly ZipFile[];
}

// Branché seulement dans un Worker (le test l'importe sous Node).
if (typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== "undefined") {
  const scope = globalThis as unknown as {
    onmessage: ((e: MessageEvent<WorkerMessage>) => void) | null;
    postMessage(m: unknown, t: Transferable[]): void;
  };
  scope.onmessage = (e) => {
    const d = e.data;
    try {
      if (d.op === "zip") {
        const bytes = zipStored(d.files ?? []);
        scope.postMessage({ bytes }, [bytes.buffer as ArrayBuffer]);
        return;
      }
      const data = d.bytes ?? new Uint8Array();
      const entries = d.mode === "pack" ? unzipEntries(data, keepPackPath) : unzipModelEntries(data);
      // Deux entrées peuvent partager un tampon : cité deux fois, `postMessage` lèverait.
      scope.postMessage({ entries }, [...new Set(entries.map((x) => x.bytes.buffer as ArrayBuffer))]);
    } catch (err) {
      scope.postMessage({ error: err instanceof Error ? err.message : String(err) }, []);
    }
  };
}
