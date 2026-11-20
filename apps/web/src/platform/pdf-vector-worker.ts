/**
 * Entrée du Worker d'écriture PDF (C12, PF22, DAPF4) : sa propre instance du module `formats`, une réponse `{ bytes }`
 * ou `{ error }`, puis arrêté par `runOnce` (`one-shot-worker.ts`). Une panique Wasm (krilla) arrive en `RuntimeError`
 * et ne touche jamais l'instance de la page qui enregistre le `.roomboard` (HR6). Module sans écrivain (construit avant
 * C12) : `{ error }`, le producteur retombe sur le PNG. Créé par `main.ts`, jamais par un test.
 */
import { hasPdfWriter } from "./container";
import { loadFormatsModule } from "./container-load";

interface Job {
  readonly ops: Float32Array;
  readonly texts: string[];
  readonly fonts: Uint8Array;
  readonly fontSizes: Uint32Array;
  readonly images: Uint8Array;
  readonly imageSizes: Uint32Array;
}

self.onmessage = async (e: MessageEvent<Job>): Promise<void> => {
  try {
    const mod = await loadFormatsModule();
    if (!hasPdfWriter(mod)) throw new Error("module de l'écrivain PDF indisponible");
    const j = e.data;
    const bytes = mod.write_pdf_pages(j.ops, j.texts, j.fonts, j.fontSizes, j.images, j.imageSizes);
    self.postMessage({ bytes }, { transfer: [bytes.buffer] });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
