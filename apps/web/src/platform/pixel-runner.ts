/**
 * Calculs de pixels hors de l'instance qui enregistre (C5, U30, DAI3, I18, I19) : un Worker par onglet, créé au premier
 * calcul, gardé tant qu'il a du travail, arrêté `PIXEL_IDLE_MS` après sa dernière réponse, après une erreur ou au bout
 * de `PIXEL_TIMEOUT_MS` sans réponse (une panique Wasm ne casse ni l'encre ni l'instance qui enregistre). File avec
 * remplacement : au plus un calcul en attente par emplacement (`<id>`, `<id>#apercu`) ; un calcul remplacé se résout à
 * null sans être lancé (sa copie de bitmap n'est jamais faite). Un seul calcul à la fois dans le Worker. La péremption à
 * l'arrivée est jugée par l'appelant (clé de son emplacement, `image-cache.ts`). Le Worker est créé par l'amorce
 * (`main.ts`) : aucun test ne résout `pixel-worker.ts` ni `src/wasm-formats/`. C6b (B14) : `fill(job)` passe dans la même
 * file sous un emplacement unique (jamais remplacé) ; le message part avec l'original (`Blob`) ou un bitmap transféré (SVG).
 */
import type { ImageParams } from "../core/api";
import type { PixelFormatsBinding } from "./container";
import type { ImageKind } from "./image-decode";
import type { WorkerLike } from "./sheet-reader";

export const PIXEL_IDLE_MS = 10_000;
/** Même délai que la lecture d'un classeur (C10b, `SHEET_WORKER_TIMEOUT_MS`). */
export const PIXEL_TIMEOUT_MS = 60_000;
export const PIXELS_FAILED_MESSAGE = "calcul des pixels interrompu";
/** Message de `#etat` au premier échec d'un onglet (I24). */
export const pixelNotice = (cause: string): string => `retouches de l'image non affichées : ${cause}`;
/** Erreur rendue par le Worker quand l'original ne se décode pas (B20). */
export const FILL_UNREADABLE_MESSAGE = "pot : image illisible";
/** Module `formats` d'avant C6b : `image_flood_fill` ne rend pas de nombre. */
export const FILL_MODULE_OLD_MESSAGE = "module des pixels sans pot sur image";

/** Réglages calculés par le Worker (sous-ensemble d'`ImageParams`). */
export type PixelParams = Pick<ImageParams, "transparent" | "brightness" | "contrast">;
/** OG23 (T10) : taille source (w, h) de l'élément ; le départ de la baguette est mis à l'échelle du bitmap. */
export type PixelSize = { readonly size?: readonly [number, number] };
export interface PixelJob extends PixelParams, PixelSize {
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

/** Pot sur une image (C6b, B8, B14) : graine en pixels source de l'élément ; `size` = (w, h) de l'élément (le bitmap
 *  d'un SVG peut être plus petit : la graine est mise à l'échelle) ; tolérance 0 à 100 ; couleur `#rrggbb`, ou null
 *  (« Aucune » : zone effacée). */
export interface PixelFillSpec {
  readonly seed: readonly [number, number];
  readonly size: readonly [number, number];
  readonly tolerance: number;
  readonly color: string | null;
}
export interface PixelFillJob extends PixelParams, PixelFillSpec {
  /** Original à décoder dans le Worker (`Blob` du magasin, pleine résolution) ou bitmap déjà décodé (SVG, copie du
   *  cache, transférée) ; appelé seulement quand le calcul part. */
  source(): Promise<{ readonly blob: Blob; readonly kind: ImageKind } | { readonly bitmap: ImageBitmap }>;
}
/** `changed: 0` : aucun pixel changé, ni PNG ni bitmap. Sinon : PNG pleine résolution et sa copie d'affichage. */
export type PixelFillResult = { readonly changed: 0 } | { readonly changed: number; readonly png: Blob; readonly bitmap: ImageBitmap };
export interface PixelFillRunner {
  /** Jamais remplacé (un clic = une étape) ; null : lanceur fermé ; rejet : erreur du Worker (dont
   *  `FILL_UNREADABLE_MESSAGE`), délai, module absent. */
  fill(job: PixelFillJob): Promise<PixelFillResult | null>;
}

interface Waiting {
  /** Message (sans `id`) et objets transférés, préparés quand le calcul part. */
  readonly prepare: () => Promise<{ readonly msg: Readonly<Record<string, unknown>>; readonly transfer: Transferable[] }>;
  /** Réponse sans erreur → valeur rendue ; undefined : réponse mal formée. */
  readonly accept: (d: Readonly<Record<string, unknown>>) => unknown;
  readonly resolve: (v: unknown) => void;
  readonly reject: (e: Error) => void;
}

const closeAll = (ts: readonly Transferable[]): void => {
  for (const t of ts) (t as { close?: () => void }).close?.();
};interface Busy {
  readonly id: number;
  readonly w: Waiting;
  readonly timer: ReturnType<typeof setTimeout>;
}

export function createPixelRunner(spawn: () => WorkerLike, opts: { readonly idleMs?: number; readonly timeoutMs?: number } = {}): PixelRunner & PixelFillRunner {
  const idleMs = opts.idleMs ?? PIXEL_IDLE_MS;
  const timeoutMs = opts.timeoutMs ?? PIXEL_TIMEOUT_MS;
  const queue = new Map<string, Waiting>();
  let worker: WorkerLike | null = null;
  let busy: Busy | null = null;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let seq = 0;
  let disposed = false;
  let fills = 0;

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
      const d = e.data as Readonly<Record<string, unknown>> | null;
      if (busy === null || typeof d !== "object" || d === null || d["id"] !== busy.id) return;
      if (typeof d["error"] === "string") {
        fail(d["error"]);
        return;
      }
      const out = busy.w.accept(d);
      if (out === undefined) {
        fail(PIXELS_FAILED_MESSAGE);
        return;
      }
      settle()?.resolve(out);
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
    const send = ({ msg, transfer }: { readonly msg: Readonly<Record<string, unknown>>; readonly transfer: Transferable[] }): void => {
      if (busy?.id !== id) {
        closeAll(transfer);
        return;
      }
      try {
        ensure().postMessage({ ...msg, id }, transfer);
      } catch {
        closeAll(transfer);
        fail(PIXELS_FAILED_MESSAGE);
      }
    };
    w.prepare().then(send, () => {
      if (busy?.id === id) fail(PIXELS_FAILED_MESSAGE);
    });
  }
  return {
    run(slot, job) {
      if (disposed) return Promise.resolve(null);
      return new Promise<ImageBitmap | null>((resolve, reject) => {
        queue.get(slot)?.resolve(null);
        queue.set(slot, {
          prepare: async () => {
            const bitmap = await job.bitmap();
            return { msg: { bitmap, transparent: job.transparent, brightness: job.brightness, contrast: job.contrast, size: job.size }, transfer: [bitmap] };
          },
          accept: (d) => (d["bitmap"] === undefined || d["bitmap"] === null ? undefined : d["bitmap"]),
          resolve: (v) => resolve(v as ImageBitmap | null),
          reject,
        });
        pump();
      });
    },
    fill(job) {
      if (disposed) return Promise.resolve(null);
      return new Promise<PixelFillResult | null>((resolve, reject) => {
        // Emplacement unique : un remplissage n'est jamais remplacé (les ids d'élément n'ont pas de « # »).
        queue.set(`#remplissage-${++fills}`, {
          prepare: async () => {
            const src = await job.source();
            const base = { type: "fill", seed: job.seed, size: job.size, tolerance: job.tolerance, color: job.color, transparent: job.transparent, brightness: job.brightness, contrast: job.contrast };
            return "bitmap" in src ? { msg: { ...base, bitmap: src.bitmap }, transfer: [src.bitmap] } : { msg: { ...base, blob: src.blob, kind: src.kind }, transfer: [] };
          },
          accept: (d) => {
            const changed = d["changed"];
            if (changed === 0) return { changed: 0 };
            const png = d["png"];
            const bitmap = d["bitmap"];
            if (typeof changed !== "number" || !(png instanceof Blob) || bitmap === undefined || bitmap === null) return undefined;
            return { changed, png, bitmap: bitmap as ImageBitmap };
          },
          resolve: (v) => resolve(v as PixelFillResult | null),
          reject,
        });
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
export function applyPixels(
  mod: Pick<PixelFormatsBinding, "image_transparent" | "image_adjust" | "image_transparent_seed">,
  px: Uint8Array,
  w: number,
  h: number,
  p: PixelParams & PixelSize,
): void {
  const t = p.transparent;
  if (t !== undefined) {
    const [r, g, b] = rgbOf(t.color);
    if (t.x !== undefined && t.y !== undefined && mod.image_transparent_seed !== undefined) {
      // OG23 (T10) : départ en pixels source, mis à l'échelle du bitmap (un SVG peut être décodé plus petit).
      const [sw, sh] = p.size ?? [w, h];
      const x = Math.min(w - 1, Math.floor((t.x * w) / sw));
      const y = Math.min(h - 1, Math.floor((t.y * h) / sh));
      mod.image_transparent_seed(px, w, h, r, g, b, t.tolerance, t.soft, x, y);
    } else {
      mod.image_transparent(px, w, h, r, g, b, t.tolerance, t.soft, t.contiguous);
    }
  }
  const brightness = p.brightness ?? 0;
  const contrast = p.contrast ?? 0;
  if (brightness !== 0 || contrast !== 0) mod.image_adjust(px, brightness, contrast);
}

/** Remplissage sur les octets RGBA (C6b, B8) : graine mise à l'échelle du bitmap décodé (`size` → w × h), couleur en
 *  minuscules, null = effacer ; rend le nombre de pixels changés. Appelé par le Worker ; testé avec un faux module. */
export function applyFill(mod: Pick<PixelFormatsBinding, "image_flood_fill">, px: Uint8Array, w: number, h: number, f: PixelFillSpec): number {
  const x = Math.min(w - 1, Math.floor((f.seed[0] * w) / f.size[0]));
  const y = Math.min(h - 1, Math.floor((f.seed[1] * h) / f.size[1]));
  const [r, g, b] = f.color === null ? [0, 0, 0] : rgbOf(f.color.toLowerCase());
  const n: unknown = mod.image_flood_fill(px, w, h, x, y, f.tolerance, r, g, b, f.color === null);
  if (typeof n !== "number") throw new Error(FILL_MODULE_OLD_MESSAGE);
  return n;
}

/** Message rendu par le Worker : celui d'une erreur ordinaire ; une panique Wasm (`RuntimeError` « unreachable ») ou une
 *  valeur quelconque : `PIXELS_FAILED_MESSAGE`. */
export function pixelErrorMessage(err: unknown): string {
  if (err instanceof WebAssembly.RuntimeError || !(err instanceof Error) || err.message === "") return PIXELS_FAILED_MESSAGE;
  return err.message;
}
