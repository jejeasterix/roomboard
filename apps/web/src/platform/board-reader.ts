/**
 * Lecture des tableaux `.iwb`, `.ubz` et `.notebook`, écriture des `.iwb` et `.ubz`, hors de l'instance qui enregistre (C13, D1, D6, DAB4) : un Worker
 * jetable par tâche (`runOnce`) charge sa propre instance du module `formats`, lit les XML en flux BoardList
 * (`BoardReader`) ou écrit les XML d'une copie (`write_board_xml`), répond, puis est arrêté — après la réponse, après
 * `onerror`, ou au bout de `BOARD_WORKER_TIMEOUT_MS`. Une panique Wasm revient en `BOARD_FAILED_MESSAGE` (ou
 * `BOARD_WRITE_FAILED_MESSAGE`) et ne touche jamais l'instance de la page (HR6). Créé par l'amorce (`main.ts`) : aucun
 * test n'exécute `board-worker.ts` (lu en texte seulement) ni ne résout `src/wasm-formats/`.
 * `.notebook` (lot 2, N6) : pages dans l'ordre du manifeste, lu par le Rust (`notebook_order`, D16), choisi par
 * `notebookOrder` dans le Worker.
 */
import { normalArchivePath } from "./archive-path";
import { runOnce, type WorkerLike } from "./one-shot-worker";
import type { ZipFile } from "./zip-read";

export type BoardDialect = "iwb" | "ubz" | "notebook";
/** C13 (N5) : format lu à l'import (plus large que le dialecte du module `formats`) ; seule définition, `board-io` la réexporte. */
export type BoardSourceFormat = BoardDialect | "olf" | "flipchart";
/** Formats de copie (N5) : `.notebook` est lu seulement (N2). */
export type BoardWriteFormat = "iwb" | "ubz";
/** Lecture d'un `.notebook` : `names[i]` = chemin normalisé de `files[i]`, manifeste `imsmanifest.xml`, `max` pages. */
export interface BoardReadOptions {
  readonly names: readonly string[];
  readonly manifest: Uint8Array | null;
  readonly max: number;
}
/** N6 : avertissement quand le manifeste manque, ne se lit pas ou ne nomme pas toutes les pages. */
export const NOTEBOOK_ORDER_GUESSED = "ordre des pages déduit des noms";
export const BOARD_WORKER_TIMEOUT_MS = 60_000;
export const BOARD_FAILED_MESSAGE = "lecture du tableau interrompue";
export const BOARD_WRITE_FAILED_MESSAGE = "écriture du tableau interrompue";
/** `BoardError::TooBig` (`board.rs`). */
export const BOARD_OBJECTS_MESSAGE = "fichier de tableau trop gros (plus de 100 000 objets)";
/** Débuts des messages de `BoardError` et de la liaison, rendus tels quels. */
const DAMAGED_PREFIX = "fichier endommagé : ";
const KNOWN_PREFIXES = [DAMAGED_PREFIX, "liste de tableau invalide : ", "format de tableau inconnu : "] as const;

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

/** Chemin d'une entrée d'archive (alias de `normalArchivePath`). */
export const normalBoardPath = normalArchivePath;

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

/**
 * Pages d'un `.notebook` dans l'ordre du manifeste (N6) ; `order` est `notebook_order` de la liaison (le XML reste au
 * Rust, D16), jamais un tri par `page<N>`. Manifeste absent, illisible ou incomplet : les pages qu'il ne nomme pas
 * suivent dans l'ordre reçu (numérique, `boardSources`) et `NOTEBOOK_ORDER_GUESSED` est rendu. Au plus `max` pages.
 */
export function notebookOrder(
  order: (manifest: Uint8Array) => string[],
  files: readonly Uint8Array[],
  names: readonly string[],
  manifest: Uint8Array | null,
  max: number,
): { files: Uint8Array[]; warnings: string[] } {
  let listed: string[] = [];
  if (manifest !== null) {
    try {
      listed = order(manifest).map((n) => n.toLowerCase());
    } catch (err) {
      // Seul « fichier endommagé » (manifeste illisible) est avalé : une panique Wasm ou toute autre erreur remonte.
      const m = err instanceof WebAssembly.RuntimeError ? null : err instanceof Error ? err.message : typeof err === "string" ? err : null;
      if (m === null || !m.startsWith(DAMAGED_PREFIX)) throw err;
      listed = [];
    }
  }
  const byName = new Map(names.slice(0, files.length).map((n, i) => [normalBoardPath(n).toLowerCase(), i] as const));
  const picked: number[] = [];
  for (const n of listed) {
    const i = byName.get(n);
    if (i !== undefined && !picked.includes(i)) picked.push(i);
  }
  const guessed = picked.length < files.length || files.length === 0;
  for (let i = 0; i < files.length; i++) if (!picked.includes(i)) picked.push(i);
  return { files: picked.slice(0, max).map((i) => files[i]!), warnings: guessed ? [NOTEBOOK_ORDER_GUESSED] : [] };
}

/** N6 : avis de l'ordre des pages mis en tête de la première part (les autres parts et le tableau d'entrée restent tels quels). */
export function withLeadingWarnings<P extends BoardPart>(parts: readonly P[], warnings: readonly string[]): readonly P[] {
  const [first, ...rest] = parts;
  if (first === undefined || warnings.length === 0) return parts;
  return [{ ...first, warnings: [...warnings, ...first.warnings] }, ...rest];
}

export interface BoardCodec {
  read(files: readonly Uint8Array[], dialect: BoardDialect, opts?: BoardReadOptions): Promise<BoardPart[]>;
  write(list: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardWriteFormat): Promise<ZipFile[]>;
  /** Paperboard `.flipchart` (lot 3) : entrées `.in`, `.io`, `.ir`, `version` du conteneur ; une seule partie (toutes les pages). */
  readFlipchart(entries: readonly { readonly path: string; readonly bytes: Uint8Array }[]): Promise<BoardPart>;
}

/** Un Worker neuf par tâche, jamais gardé ; les octets sont copiés puis transférés (les tampons de l'appelant restent). */
export function createBoardCodec(spawn: () => WorkerLike, timeoutMs = BOARD_WORKER_TIMEOUT_MS): BoardCodec {
  return {
    read(files, dialect, opts) {
      const copies = files.map((f) => f.slice());
      const transfer = copies.map((c) => c.buffer as ArrayBuffer);
      if (opts === undefined) return runOnce(spawn, { op: "read", dialect, files: copies }, transfer, timeoutMs, checkBoardParts, BOARD_FAILED_MESSAGE);
      const manifest = opts.manifest === null ? null : opts.manifest.slice();
      if (manifest !== null) transfer.push(manifest.buffer as ArrayBuffer);
      const job = { op: "read", dialect, files: copies, names: [...opts.names], manifest, max: opts.max };
      return runOnce(spawn, job, transfer, timeoutMs, checkBoardParts, BOARD_FAILED_MESSAGE);
    },
    async readFlipchart(entries) {
      const total = entries.reduce((n, e) => n + e.bytes.length, 0);
      const data = new Uint8Array(total);
      const ends = new Uint32Array(entries.length);
      let at = 0;
      entries.forEach((e, i) => {
        data.set(e.bytes, at);
        at += e.bytes.length;
        ends[i] = at;
      });
      const job = { op: "flipchart", names: entries.map((e) => e.path), data, ends };
      const parts = await runOnce(spawn, job, [data.buffer as ArrayBuffer], timeoutMs, checkBoardParts, BOARD_FAILED_MESSAGE);
      if (parts.length !== 1) throw new Error(BOARD_FAILED_MESSAGE);
      return parts[0]!;
    },
    write(list, format) {
      const ops = list.ops.slice();
      return runOnce(spawn, { op: "write", format, ops, texts: [...list.texts] }, [ops.buffer as ArrayBuffer], timeoutMs, checkBoardFiles, BOARD_WRITE_FAILED_MESSAGE);
    },
  };
}
