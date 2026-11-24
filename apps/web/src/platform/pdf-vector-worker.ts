/**
 * Entrée du Worker d'écriture PDF (C12, PF22, DAPF4) : sa propre instance du module `formats`, une réponse `{ bytes }`
 * ou `{ error }`, puis arrêté par `runOnce` (`one-shot-worker.ts`). Une panique Wasm (krilla) arrive en `RuntimeError`
 * et ne touche jamais l'instance de la page qui enregistre le `.roomboard` (HR6). Module sans écrivain (construit avant
 * C12) : `{ error }`, le producteur retombe sur le PNG. Créé par `main.ts`, jamais par un test.
 * Corps dans `pdfJobReply` (cli-lot3, D38, DA13) : cette coquille charge le module, poste la réponse et son tampon, et
 * rend en `{ error }` ce qui en sort (panique relancée par `pdfJobReply`, module absent).
 */
import { pdfJobReply, type PdfJob } from "./container";
import { loadFormatsModule } from "./container-load";

self.onmessage = async (e: MessageEvent<PdfJob>): Promise<void> => {
  try {
    const r = pdfJobReply(await loadFormatsModule(), e.data);
    self.postMessage(r.data, { transfer: r.transfer });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
