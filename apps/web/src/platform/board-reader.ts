/**
 * Lecture et écriture des tableaux `.iwb` et `.ubz` hors de l'instance qui enregistre (C13, D1, D6, DAB4) : un Worker
 * jetable par tâche (`runOnce`) charge sa propre instance du module `formats`, lit les XML en flux BoardList
 * (`BoardReader`) ou écrit les XML d'une copie (`write_board_xml`), répond, puis est arrêté — après la réponse, après
 * `onerror`, ou au bout de `BOARD_WORKER_TIMEOUT_MS`. Une panique Wasm revient en `BOARD_FAILED_MESSAGE` (ou
 * `BOARD_WRITE_FAILED_MESSAGE`) et ne touche jamais l'instance de la page (HR6). Créé par l'amorce (`main.ts`) : aucun
 * test ne résout `board-worker.ts` ni `src/wasm-formats/`.
 */
import { runOnce, type WorkerLike } from "./one-shot-worker";
import type { ZipFile } from "./zip-read";

export type BoardDialect = "iwb" | "ubz";
export const BOARD_WORKER_TIMEOUT_MS = 60_000;
export const BOARD_FAILED_MESSAGE = "lecture du tableau interrompue";
export const BOARD_WRITE_FAILED_MESSAGE = "écriture du tableau interrompue";
/** `BoardError::TooBig` (`board.rs`). */
export const BOARD_OBJECTS_MESSAGE = "fichier de tableau trop gros (plus de 100 000 objets)";
/** Débuts des messages de `BoardError` et de la liaison, rendus tels quels. */
const KNOWN_PREFIXES = ["fichier endommagé : ", "liste de tableau invalide : ", "format de tableau inconnu : "] as const;

/** Message rendu par le Worker : un message du module connu tel quel ; toute autre erreur (panique Wasm, module absent) : `failure`. */
export function boardErrorMessage(err: unknown, failure: string): string {
  const m = err instanceof Error ? err.message : typeof err === "string" ? err : null;
  if (m === null) return failure;
  return m === BOARD_OBJECTS_MESSAGE || KNOWN_PREFIXES.some((p) => m.startsWith(p)) ? m : failure;
}

/** Un fichier XML lu : flux BoardList (le Worker rend un `Float32Array`), textes et avertissements du lecteur. */
export interface BoardPart {
  readonly ops: ArrayLike<number>;
  readonly texts: readonly string[];
  readonly warnings: readonly string[];
}

/** Chemin d'une entrée d'archive : barres droites, sans `./` en tête (ZIP écrits sous Windows). */
export const normalBoardPath = (path: string): string => path.replace(/\\/g, "/").replace(/^(\.\/)+/, "");

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");

/** Réponse à `{ op: "read" }` : `{ error }` rendu tel quel ; toute autre forme que `{ parts: [{ ops, texts, warnings }] }` lève. */
export function checkBoardParts(d: unknown): BoardPart[] {
  const r = d as { parts?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  const parts = r?.parts;
  if (!Array.isArray(parts)) throw new Error(BOARD_FAILED_MESSAGE);
  return parts.map((p: unknown) => {
    const x = p as { ops?: unknown; texts?: unknown; warnings?: unknown } | null;
    const ops = x?.ops;
    const texts = x?.texts;
    const warnings = x?.warnings;
    if (!(ops instanceof Float32Array) || !isStrings(texts) || !isStrings(warnings)) throw new Error(BOARD_FAILED_MESSAGE);
    return { ops, texts, warnings };
  });
}

/** Réponse à `{ op: "write" }` : `[chemin, xml, …]` → fichiers en UTF-8 ; toute autre forme lève. */
export function checkBoardFiles(d: unknown): ZipFile[] {
  const r = d as { files?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  const files = r?.files;
  if (!isStrings(files) || files.length % 2 !== 0) throw new Error(BOARD_WRITE_FAILED_MESSAGE);
  const enc = new TextEncoder();
  const out: ZipFile[] = [];
  for (let i = 0; i < files.length; i += 2) out.push({ path: files[i]!, bytes: enc.encode(files[i + 1]!) });
  return out;
}

export interface BoardCodec {
  read(files: readonly Uint8Array[], dialect: BoardDialect): Promise<BoardPart[]>;
  write(list: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardDialect): Promise<ZipFile[]>;
}

/** Un Worker neuf par tâche, jamais gardé ; les octets sont copiés puis transférés (les tampons de l'appelant restent). */
export function createBoardCodec(spawn: () => WorkerLike, timeoutMs = BOARD_WORKER_TIMEOUT_MS): BoardCodec {
  return {
    read(files, dialect) {
      const copies = files.map((f) => f.slice());
      return runOnce(spawn, { op: "read", dialect, files: copies }, copies.map((c) => c.buffer as ArrayBuffer), timeoutMs, checkBoardParts, BOARD_FAILED_MESSAGE);
    },
    write(list, format) {
      const ops = list.ops.slice();
      return runOnce(spawn, { op: "write", format, ops, texts: [...list.texts] }, [ops.buffer as ArrayBuffer], timeoutMs, checkBoardFiles, BOARD_WRITE_FAILED_MESSAGE);
    },
  };
}
