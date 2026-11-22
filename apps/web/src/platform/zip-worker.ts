/**
 * Worker de lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : entrées gardées par `keepZipPath`, 1 000 entrées et
 * 256 Mio décompressés au plus, comptés avant décompression sur chaque enregistrement du répertoire central, au plus
 * grand de ses deux tailles : fflate copie `size` octets d'une entrée stockée et alloue `originalSize` octets pour une
 * entrée déflatée. Entrée stockée dont les deux tailles diffèrent : refusée (ZIP malformé). Créé par
 * `main.ts`, arrêté par `zip-read.ts` après la réponse. Seul module qui importe fflate (GC17), avec `bamboo.ts` (`Unzlib`,
 * appelé d'ici seul), API synchrone seule : la forme asynchrone lance des Workers `blob:`, refusés par la CSP.
 * C4 : paquets `.rbpack` (lecture `mode: "pack"`, écriture `op: "zip"`), mêmes bornes, chemins rendus tels quels.
 * C13 : tableaux `.iwb` et `.ubz` (lecture `mode: "board"`, `keepBoardPath`), mêmes bornes, chemins rendus tels quels.
 * C13 lot 2 (N8, N13) : `content.json` d'un `.olf` (`op: "olf"`) lu ici, jamais sur le fil principal : 64 Mio au plus
 * (refus avant décodage), `readOlf`, puis flux BoardList (`encodeBoardList`) que la page repasse par `decodeBoardList`.
 * C13 lot 3 (N11, N13) : paperboards ActivInspire (`mode: "bamboo"`) : conteneur Bamboo lu par `readBamboo` sous
 * `BAMBOO_LIMITS`, entrées gardées par `keepBambooPath`, chemins `<page>.fpg/<nom>`.
 */
import { unzipSync, zipSync, type Zippable } from "fflate";
import {
  extensionOf,
  keepZipPath,
  normalizePath,
  ZIP_MALFORMED_MESSAGE,
  ZIP_MAX_BYTES,
  ZIP_MAX_ENTRIES,
  ZIP_TOO_BIG_MESSAGE,
} from "./model3d-import";
import { safeArchivePath } from "./archive-path";
import { BAMBOO_LIMITS, BAMBOO_STRUCTURE_EXTENSIONS, readBamboo } from "./bamboo";
import { sniffImage } from "./image-import";
import { isPackEntry } from "./rbpack";
import { encodeBoardList } from "../app/board-io";
import { OLF_MAX_JSON_BYTES, OLF_TOO_BIG_MESSAGE, readOlf } from "../app/olf-read";
import type { OlfPart, ZipFile } from "./zip-read";

/** C4 : entrées d'un paquet (manifeste, ressources, vignettes) ; tout autre fichier du ZIP est ignoré. */
export function keepPackPath(name: string): boolean {
  return isPackEntry(name);
}

/** C13 (D3, D12) : images qu'un tableau `.iwb` ou `.ubz` peut citer ; tout autre fichier n'est jamais décompressé. */
export const BOARD_ZIP_EXTENSIONS: readonly string[] = Object.freeze(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

/** C13 (D3, N15, N16) : `content.xml` (IWB), `imsmanifest.xml` et `content.json` (racine seulement), `page<N>.svg`
 *  (OpenBoard) et images ; chemin sûr selon `safeArchivePath`. Vidéos, sons, Flash et widgets ne sont pas décompressés :
 *  le lecteur les compte depuis le XML pour l'avertissement (D15). */
export function keepBoardPath(name: string): boolean {
  const p = safeArchivePath(name);
  if (p === null) return false;
  const lower = p.toLowerCase();
  if (lower === "content.xml" || lower === "imsmanifest.xml" || lower === "content.json" || /^page\d+\.svg$/.test(lower)) return true;
  return BOARD_ZIP_EXTENSIONS.includes(extensionOf(p));
}

const BAMBOO_ENTRY_EXTENSIONS: readonly string[] = Object.freeze([...BAMBOO_STRUCTURE_EXTENSIONS, "fpg"]);

/** C13 lot 3 (N15, N16) : entrées lues d'un paperboard : index `.in`, objets `.io`, ressources `.ir`, pages `.fpg`,
 *  `version`, images de `BOARD_ZIP_EXTENSIONS` et noms de `BAMBOO_IMAGE_NAME` ; chemin sûr selon `safeArchivePath`.
 *  Miniatures `.thm`, `.tif`, sons, vidéos et Flash nommés par leur extension ne sont jamais décompressés ; une entrée
 *  de `BAMBOO_IMAGE_NAME` l'est, compte dans `BAMBOO_LIMITS`, puis est jetée si sa signature n'est pas une image. */
export function keepBambooPath(name: string): boolean {
  const p = safeArchivePath(name);
  if (p === null) return false;
  if (p.toLowerCase() === "version") return true;
  const ext = extensionOf(p);
  return BAMBOO_ENTRY_EXTENSIONS.includes(ext) || BOARD_ZIP_EXTENSIONS.includes(ext) || BAMBOO_IMAGE_NAME.test(p);
}

/** Image d'un paperboard sans extension d'image : `{rid}.ird` (ActCraft `resourceFile`), ou extension d'ActivInspire
 *  `<2 lettres><4 chiffres>` (les sept vues dans les exemples, `2747.EK1056`, `4670.gq4184`…, sont des BMP) ; gardée sur
 *  sa signature seule. Motif étroit : un gros média ainsi nommé compterait dans le budget du conteneur. */
const BAMBOO_IMAGE_NAME = /\.(?:ird|[a-z]{2}\d{4})$/i;

/** Entrées lues d'un paperboard (`keepBambooPath`) ; une image nommée par `BAMBOO_IMAGE_NAME` n'est transmise que si
 *  ses premiers octets sont ceux d'une image (comme `extensionOf` d'ActCraft) : le lecteur Rust l'affiche alors. */
export function bambooEntries(data: Uint8Array): { path: string; bytes: Uint8Array }[] {
  return readBamboo(data, keepBambooPath, BAMBOO_LIMITS).filter(
    (e) => !BAMBOO_IMAGE_NAME.test(e.path) || sniffImage(e.bytes.subarray(0, 4096), e.path) !== null,
  );
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

/** C13 lot 2 : `content.json` → flux BoardList, avertissements et pages avant la coupe ; plus de `OLF_MAX_JSON_BYTES`
 *  octets : refusé avant tout décodage. `read` n'est donné que par le test. */
export function olfPart(bytes: Uint8Array, read: typeof readOlf = readOlf): OlfPart {
  if (bytes.length > OLF_MAX_JSON_BYTES) throw new Error(OLF_TOO_BIG_MESSAGE);
  const { pages, warnings, total } = read(new TextDecoder("utf-8").decode(bytes));
  const { ops, texts } = encodeBoardList(pages);
  return { ops, texts, warnings, total };
}

/** `{ bytes }` seul : lecture 3D (inchangée) ; `{ op: "unzip", mode: "pack" | "board" | "bamboo", bytes }` ; `{ op: "zip", files }` ; `{ op: "olf", bytes }`. */
interface WorkerMessage {
  readonly op?: "unzip" | "zip" | "olf";
  readonly mode?: "model3d" | "pack" | "board" | "bamboo";
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
      if (d.op === "olf") {
        const part = olfPart(d.bytes ?? new Uint8Array());
        scope.postMessage({ part }, [part.ops.buffer as ArrayBuffer]);
        return;
      }
      const data = d.bytes ?? new Uint8Array();
      const entries =
        d.mode === "pack"
          ? unzipEntries(data, keepPackPath)
          : d.mode === "board"
            ? unzipEntries(data, keepBoardPath)
            : d.mode === "bamboo"
              ? bambooEntries(data)
              : unzipModelEntries(data);
      // Deux entrées peuvent partager un tampon : cité deux fois, `postMessage` lèverait.
      scope.postMessage({ entries }, [...new Set(entries.map((x) => x.bytes.buffer as ArrayBuffer))]);
    } catch (err) {
      scope.postMessage({ error: err instanceof Error ? err.message : String(err) }, []);
    }
  };
}
