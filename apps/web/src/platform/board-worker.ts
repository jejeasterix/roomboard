/**
 * Entrée du Worker des tableaux (C13, D1, D6) : sa propre instance du module `formats`, une réponse `{ parts }`,
 * `{ files }` ou `{ error }`, puis arrêté par `runOnce` (`board-reader.ts`). Une panique Wasm arrive en `RuntimeError`
 * et devient le message d'échec (`boardErrorMessage`). Pages `.ubz` : une par fichier, numérotées dans l'ordre reçu
 * pour leurs avertissements. Pages `.notebook` (lot 2, N6) : remises dans l'ordre du manifeste par `notebookOrder` et
 * la liaison `notebook_order` (le XML reste au Rust, D16), puis numérotées comme les `.ubz` ; l'avertissement d'ordre
 * va en tête de la première part. Paperboard `.flipchart` (lot 3) : `FlipchartReader` lit toutes les entrées d'un coup,
 * une seule part. Créé par `main.ts` ; exécuté par le test, module simulé.
 * Corps dans `boardJobReply` (cli-lot2, D20) : cette coquille charge le module, poste la réponse et ses tampons, et
 * rend en `{ error }` ce qui en sort (panique relancée par `boardJobReply`, D29 ; module absent).
 */
import { boardErrorMessage, boardJobFailure, boardJobReply, type BoardJob } from "./board-reader";
import { loadFormatsModule } from "./container-load";

self.onmessage = async (e: MessageEvent<BoardJob>): Promise<void> => {
  const j = e.data;
  try {
    const r = boardJobReply(await loadFormatsModule(), j);
    self.postMessage(r.data, { transfer: r.transfer });
  } catch (err) {
    self.postMessage({ error: boardErrorMessage(err, boardJobFailure(j)) });
  }
};
