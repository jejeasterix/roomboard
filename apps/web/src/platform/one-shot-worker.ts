/**
 * Worker jetable (C10b DAB4, étendu par C12) : un Worker neuf par tâche, un message, une réponse contrôlée par `check`,
 * puis arrêté — après la réponse, après `onerror` (panique Wasm, module absent) ou au bout de `timeoutMs`. Jamais gardé :
 * à l'inverse de `createPageCodec`, qui garde son instance du module `formats` jusqu'au rechargement (HR6), une panique
 * ne survit pas à la tâche qui l'a causée. Partagé par la lecture des classeurs (`sheet-reader.ts`) et l'écriture des
 * PDF vectoriels (`app/pdf-overlay-vector.ts`).
 * cli-lot2 (DA7) : `inlineWorker` joue le corps d'un Worker dans le processus.
 */

/** Forme d'un Worker utile ici (le vrai `Worker` du navigateur, un faux dans les tests). */
export interface WorkerLike {
  onmessage: ((e: { readonly data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
  terminate(): void;
}

/** `check` lève pour refuser la réponse (son message est gardé) ; tout autre échec rejette en `failure`. */
export async function runOnce<T>(
  spawn: () => WorkerLike,
  message: unknown,
  transfer: Transferable[],
  timeoutMs: number,
  check: (d: unknown) => T,
  failure: string,
): Promise<T> {
  const worker = spawn();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(failure)), timeoutMs);
      worker.onmessage = (e) => {
        try {
          resolve(check(e.data));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(failure));
        }
      };
      worker.onerror = () => reject(new Error(failure));
      worker.postMessage(message, transfer);
    });
  } finally {
    clearTimeout(timer);
    worker.terminate();
  }
}

/** Réponse d'un corps de Worker : le message posté et ses tampons transférés. */
export interface WorkerReply {
  readonly data: unknown;
  readonly transfer: Transferable[];
}

/** Worker en processus (cli-lot2, DA7) : réponse en tâche suivante, rejet ou exception → onerror, terminate sans effet. */
export function inlineWorker(handle: (message: unknown) => WorkerReply | Promise<WorkerReply>): () => WorkerLike {
  return () => {
    const w: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage(message) {
        setTimeout(() => {
          new Promise<WorkerReply>((resolve) => resolve(handle(message))).then(
            (r) => w.onmessage?.({ data: r.data }),
            (e: unknown) => w.onerror?.(e),
          );
        }, 0);
      },
      terminate() {},
    };
    return w;
  };
}
