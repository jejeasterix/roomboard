/**
 * Entrée du Worker de lecture d'un classeur (C10b, F28, DAB4) : sa propre instance du module `formats`, la première
 * feuille, une réponse `{ grid }` ou `{ error }`. Créé par `main.ts`, arrêté par `sheet-reader.ts` après la réponse.
 */
import { hasSheetReader } from "./container";
import { loadFormatsModule } from "./container-load";
import { gridOf } from "./sheet-reader";

self.onmessage = async (e: MessageEvent<{ readonly bytes: Uint8Array }>): Promise<void> => {
  try {
    const mod = await loadFormatsModule();
    if (!hasSheetReader(mod)) throw new Error("module des classeurs indisponible");
    const reader = mod.SheetReader.open(e.data.bytes);
    try {
      self.postMessage({ grid: gridOf(reader) });
    } finally {
      reader.free();
    }
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
