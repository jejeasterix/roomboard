/**
 * Ports des tableaux dans le processus de la CLI (cadrage cli-lot2, D20, D29) : `createBoardPorts` du produit sur
 * `inlineWorker` ; XML par `boardJobReply` sur l'instance unique du module formats, ZIP par `zipJobReply`.
 * D29 : l'instance est tenue pour non sûre (`onPanic`, la session refuse ensuite toute écriture) quand `boardJobReply`
 * lève (une `RuntimeError`, seule relancée) OU rend l'échec générique (`BOARD_FAILED_MESSAGE`,
 * `BOARD_WRITE_FAILED_MESSAGE`), c'est-à-dire tout échec qui n'est pas un message connu du module selon
 * `boardErrorMessage`. Le second cas est un filet : une erreur générique inconnue reste traitée comme non sûre (depuis
 * le correctif de `partOf`, l'`Error` de `free()` ne masque plus la `RuntimeError`, qui est relancée).
 * Un message connu (« fichier endommagé : … ») vient d'un `Err` rendu normalement par le Rust : instance intacte.
 */
import { createBoardPorts } from "../../web/src/app/board-convert";
import type { BoardPorts } from "../../web/src/app/board-io";
import { BOARD_FAILED_MESSAGE, BOARD_WRITE_FAILED_MESSAGE, boardJobReply, createBoardCodec, type BoardJob } from "../../web/src/platform/board-reader";
import type { FormatsBinding } from "../../web/src/platform/container";
import { inlineWorker, type WorkerReply } from "../../web/src/platform/one-shot-worker";
import { zipJobReply, type ZipJob } from "../../web/src/platform/zip-worker";

/** Échecs génériques de `boardJobReply` : ni message du module, ni réussite (D29) ; filet pour une erreur inconnue. */
const UNSAFE_REPLIES: ReadonlySet<unknown> = new Set([BOARD_FAILED_MESSAGE, BOARD_WRITE_FAILED_MESSAGE]);

export function nodeBoardPorts(formats: () => Promise<FormatsBinding>, onPanic: () => void): BoardPorts {
  const codec = createBoardCodec(
    inlineWorker(async (m) => {
      const mod = await formats();
      let reply: WorkerReply;
      try {
        reply = boardJobReply(mod, m as BoardJob);
      } catch (e) {
        onPanic(); // seule une RuntimeError sort de boardJobReply
        throw e;
      }
      if (UNSAFE_REPLIES.has((reply.data as { readonly error?: unknown }).error)) onPanic();
      return reply;
    }),
  );
  return createBoardPorts({ zip: inlineWorker((m) => zipJobReply(m as ZipJob)) }, codec);
}
