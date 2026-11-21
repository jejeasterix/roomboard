/**
 * Entrée du Worker des tableaux (C13, D1, D6) : sa propre instance du module `formats`, une réponse `{ parts }`,
 * `{ files }` ou `{ error }`, puis arrêté par `runOnce` (`board-reader.ts`). Une panique Wasm arrive en `RuntimeError`
 * et devient le message d'échec (`boardErrorMessage`). Pages `.ubz` : une par fichier, numérotées dans l'ordre reçu
 * pour leurs avertissements. Créé par `main.ts`, jamais par un test.
 */
import { BOARD_FAILED_MESSAGE, BOARD_WRITE_FAILED_MESSAGE, boardErrorMessage, type BoardDialect } from "./board-reader";
import { hasBoardReader } from "./container";
import { loadFormatsModule } from "./container-load";

type Job =
  | { readonly op: "read"; readonly dialect: BoardDialect; readonly files: readonly Uint8Array[] }
  | { readonly op: "write"; readonly format: BoardDialect; readonly ops: Float32Array; readonly texts: string[] };

self.onmessage = async (e: MessageEvent<Job>): Promise<void> => {
  const j = e.data;
  try {
    const mod = await loadFormatsModule();
    if (!hasBoardReader(mod)) throw new Error("module des tableaux indisponible");
    if (j.op === "write") {
      self.postMessage({ files: mod.write_board_xml(j.ops, j.texts, j.format) });
      return;
    }
    const parts = j.files.map((xml, i) => {
      const r = mod.BoardReader.open(xml, j.dialect, j.dialect === "ubz" ? i + 1 : 1);
      try {
        return { ops: r.ops(), texts: r.texts(), warnings: r.warnings() };
      } finally {
        r.free();
      }
    });
    self.postMessage({ parts }, { transfer: parts.map((p) => p.ops.buffer as ArrayBuffer) });
  } catch (err) {
    self.postMessage({ error: boardErrorMessage(err, j.op === "write" ? BOARD_WRITE_FAILED_MESSAGE : BOARD_FAILED_MESSAGE) });
  }
};
