/**
 * Entrée du Worker des tableaux (C13, D1, D6) : sa propre instance du module `formats`, une réponse `{ parts }`,
 * `{ files }` ou `{ error }`, puis arrêté par `runOnce` (`board-reader.ts`). Une panique Wasm arrive en `RuntimeError`
 * et devient le message d'échec (`boardErrorMessage`). Pages `.ubz` : une par fichier, numérotées dans l'ordre reçu
 * pour leurs avertissements. Pages `.notebook` (lot 2, N6) : remises dans l'ordre du manifeste par `notebookOrder` et
 * la liaison `notebook_order` (le XML reste au Rust, D16), puis numérotées comme les `.ubz` ; l'avertissement d'ordre
 * va en tête de la première part. Paperboard `.flipchart` (lot 3) : `FlipchartReader` lit toutes les entrées d'un coup,
 * une seule part. Créé par `main.ts`, jamais exécuté par un test.
 */
import {
  BOARD_FAILED_MESSAGE,
  BOARD_WRITE_FAILED_MESSAGE,
  boardErrorMessage,
  notebookOrder,
  withLeadingWarnings,
  type BoardDialect,
  type BoardWriteFormat,
} from "./board-reader";
import { hasBoardReader, hasFlipchartReader } from "./container";
import { loadFormatsModule } from "./container-load";

type Job =
  | {
      readonly op: "read";
      readonly dialect: BoardDialect;
      readonly files: readonly Uint8Array[];
      /** `BoardReadOptions` (`.notebook`) ; absents pour `.iwb` et `.ubz`. */
      readonly names?: readonly string[];
      readonly manifest?: Uint8Array | null;
      readonly max?: number;
    }
  | { readonly op: "flipchart"; readonly names: string[]; readonly data: Uint8Array; readonly ends: Uint32Array }
  | { readonly op: "write"; readonly format: BoardWriteFormat; readonly ops: Float32Array; readonly texts: string[] };

/** Une part lue (`ops`, `texts`, `warnings`) ; le lecteur est libéré même en cas d'erreur. */
function partOf(r: { ops(): Float32Array; texts(): string[]; warnings(): string[]; free(): void }): { ops: Float32Array; texts: string[]; warnings: string[] } {
  try {
    return { ops: r.ops(), texts: r.texts(), warnings: r.warnings() };
  } finally {
    r.free();
  }
}

self.onmessage = async (e: MessageEvent<Job>): Promise<void> => {
  const j = e.data;
  try {
    const mod = await loadFormatsModule();
    if (j.op === "flipchart") {
      if (!hasFlipchartReader(mod)) throw new Error("module des tableaux indisponible");
      const r = mod.FlipchartReader.open(j.names, j.data, j.ends);
      const part = partOf(r);
      self.postMessage({ parts: [part] }, { transfer: [part.ops.buffer as ArrayBuffer] });
      return;
    }
    if (!hasBoardReader(mod)) throw new Error("module des tableaux indisponible");
    if (j.op === "write") {
      self.postMessage({ files: mod.write_board_xml(j.ops, j.texts, j.format) });
      return;
    }
    const { files, warnings } =
      j.dialect === "notebook"
        ? notebookOrder(mod.notebook_order, j.files, j.names ?? [], j.manifest ?? null, j.max ?? j.files.length)
        : { files: j.files, warnings: [] };
    const read = files.map((xml, i) => {
      return partOf(mod.BoardReader.open(xml, j.dialect, j.dialect === "iwb" ? 1 : i + 1));
    });
    const parts = withLeadingWarnings(read, warnings);
    self.postMessage({ parts }, { transfer: parts.map((p) => p.ops.buffer as ArrayBuffer) });
  } catch (err) {
    self.postMessage({ error: boardErrorMessage(err, j.op === "write" ? BOARD_WRITE_FAILED_MESSAGE : BOARD_FAILED_MESSAGE) });
  }
};
