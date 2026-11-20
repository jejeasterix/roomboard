/**
 * Calculs de pixels hors de l'instance qui enregistre (C5, U30, DAI3, I18, I19) : un Worker par onglet, créé au premier
 * calcul, gardé tant qu'il a du travail, arrêté `PIXEL_IDLE_MS` après sa dernière réponse, après une erreur ou au bout
 * de `PIXEL_TIMEOUT_MS` sans réponse (une panique Wasm ne casse ni l'encre ni l'instance qui enregistre). File avec
 * remplacement : au plus un calcul en attente par emplacement (`<id>`, `<id>#apercu`) ; un calcul remplacé se résout à
 * null sans être lancé (sa copie de bitmap n'est jamais faite). Un seul calcul à la fois dans le Worker. La péremption à
 * l'arrivée est jugée par l'appelant (clé de son emplacement, `image-cache.ts`). Le Worker est créé par l'amorce
 * (`main.ts`) : aucun test ne résout `pixel-worker.ts` ni `src/wasm-formats/`.
 */
import type { PixelFormatsBinding } from "./container";
import type { WorkerLike } from "./sheet-reader";

export const PIXEL_IDLE_MS = 10_000;
/** Même délai que la lecture d'un classeur (C10b, `SHEET_WORKER_TIMEOUT_MS`). */
export const PIXEL_TIMEOUT_MS = 60_000;
export const PIXELS_FAILED_MESSAGE = "calcul des pixels interrompu";
/** Message de `#etat` au premier échec d'un onglet (I24). */
export const pixelNotice = (cause: string): string => `retouches de l'image non affichées : ${cause}`;

/** Réglages calculés par le Worker (sous-ensemble structurel d'`ImageParams`). */
export interface PixelParams {
  readonly transparent?: { readonly color: string; readonly tolerance: number; readonly soft: number; readonly contiguous: boolean };
  readonly brightness?: number;
  readonly contrast?: number;
}
export interface PixelJob extends PixelParams {
  /** `pixelKey` de l'image (I19). */
  readonly key: string;
  /** Copie transférable du bitmap d'affichage ; appelée seulement quand le calcul part. */
  bitmap(): Promise<ImageBitmap>;
}
export interface PixelRunner {
  /** null : calcul remplacé avant d'être lancé, ou lanceur fermé ; rejet : erreur du Worker, délai, module absent. */
  run(slot: string, job: PixelJob): Promise<ImageBitmap | null>;
  dispose(): void;
}

interface Waiting {
  readonly job: PixelJob;
  readonly resolve: (b: ImageBitmap | null) => void;
  readonly reject: (e: Error) => void;
}
interface Busy {
  readonly id: number;
  readonly w: Waiting;
  readonly timer: ReturnType<typeof setTimeout>;
}

export function createPixelRunner(spawn: () => WorkerLike, opts: { readonly idleMs?: number; readonly timeoutMs?: number } = {}): PixelRunner {
  const idleMs = opts.idleMs ?? PIXEL_IDLE_MS;
  const timeoutMs = opts.timeoutMs ?? PIXEL_TIMEOUT_MS;
  const queue = new Map<string, Waiting>();
  let worker: WorkerLike | null = null;
  let busy: Busy | null = null;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let seq = 0;
  let disposed = false;

  const stop = (): void => {
    clearTimeout(idle);
    idle = undefined;
    worker?.terminate();
    worker = null;
  };
  /** Le calcul en cours se termine (réponse, erreur, délai) : rend son attente. */
  const settle = (): Waiting | null => {
    const b = busy;
    if (b === null) return null;
    clearTimeout(b.timer);
    busy = null;
    return b.w;
  };
  const fail = (message: string): void => {
    const w = settle();
    stop();
    w?.reject(new Error(message));
    pump();
  };
  function ensure(): WorkerLike {
    if (worker !== null) return worker;
    const w = spawn();
    w.onmessage = (e) => {
      const d = e.data as { readonly id?: unknown; readonly bitmap?: unknown; readonly error?: unknown } | null;
      if (busy === null || typeof d !== "object" || d === null || d.id !== busy.id) return;
      if (typeof d.error === "string" || d.bitmap === undefined || d.bitmap === null) {
        fail(typeof d.error === "string" ? d.error : PIXELS_FAILED_MESSAGE);
        return;
      }
      settle()?.resolve(d.bitmap as ImageBitmap);
      pump();
    };
    w.onerror = () => fail(PIXELS_FAILED_MESSAGE);
    worker = w;
    return w;
  }
  function pump(): void {
    if (disposed || busy !== null) return;
    const next = queue.entries().next();
    if (next.done === true) {
      clearTimeout(idle);
      idle = worker === null ? undefined : setTimeout(stop, idleMs);
      return;
    }
    const [slot, w] = next.value;
    queue.delete(slot);
    clearTimeout(idle);
    const id = ++seq;
    busy = { id, w, timer: setTimeout(() => fail(PIXELS_FAILED_MESSAGE), timeoutMs) };
    const { job } = w;
    job.bitmap().then(
      (bitmap) => {
        if (busy?.id !== id) {
          bitmap.close();
          return;
        }
        const msg = { id, bitmap, transparent: job.transparent, brightness: job.brightness, contrast: job.contrast };
        ensure().postMessage(msg, [bitmap]);
      },
      () => {
        if (busy?.id === id) fail(PIXELS_FAILED_MESSAGE);
      },
    );
  }
  return {
    run(slot, job) {
      if (disposed) return Promise.resolve(null);
      return new Promise<ImageBitmap | null>((resolve, reject) => {
        queue.get(slot)?.resolve(null);
        queue.set(slot, { job, resolve, reject });
        pump();
      });
    },
    dispose() {
      disposed = true;
      for (const w of queue.values()) w.resolve(null);
      queue.clear();
      settle()?.resolve(null);
      stop();
    },
  };
}

/** `#rrggbb` → [r, g, b]. */
export function rgbOf(c: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(c);
  if (m === null) throw new Error(`couleur illisible : ${c}`);
  return [parseInt(m[1] ?? "0", 16), parseInt(m[2] ?? "0", 16), parseInt(m[3] ?? "0", 16)];
}

/** Calcul d'un travail sur les octets RGBA (I10) : couleur transparente décidée sur les couleurs d'origine, puis
 *  luminosité et contraste (alpha gardé). Appelé par le Worker ; testé avec un faux module. */
export function applyPixels(mod: Pick<PixelFormatsBinding, "image_transparent" | "image_adjust">, px: Uint8Array, w: number, h: number, p: PixelParams): void {
  const t = p.transparent;
  if (t !== undefined) {
    const [r, g, b] = rgbOf(t.color);
    mod.image_transparent(px, w, h, r, g, b, t.tolerance, t.soft, t.contiguous);
  }
  const brightness = p.brightness ?? 0;
  const contrast = p.contrast ?? 0;
  if (brightness !== 0 || contrast !== 0) mod.image_adjust(px, brightness, contrast);
}

/** Message rendu par le Worker : celui d'une erreur ordinaire ; une panique Wasm (`RuntimeError` « unreachable ») ou une
 *  valeur quelconque : `PIXELS_FAILED_MESSAGE`. */
export function pixelErrorMessage(err: unknown): string {
  if (err instanceof WebAssembly.RuntimeError || !(err instanceof Error) || err.message === "") return PIXELS_FAILED_MESSAGE;
  return err.message;
}
