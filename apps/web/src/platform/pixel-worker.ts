/**
 * Entrée du Worker de pixels (C5, I18 ; C6b, B7, B14) : sa propre instance du module `formats`, chargée au premier calcul
 * et gardée. Retouche (C5) : reçoit `{ id, bitmap, transparent?, brightness?, contrast? }` (bitmap transféré), rend
 * `{ id, bitmap }`. Remplissage (C6b) : reçoit `{ id, type: "fill", blob, kind | bitmap, seed, size, tolerance, color,
 * transparent?, brightness?, contrast? }` : original décodé à pleine résolution (`decodeImage`, `max = Infinity`), pixels
 * de C5 cuits (`applyPixels`), zone remplie (`applyFill`), PNG encodé, copie d'affichage refaite par le même
 * `decodeImage` ; rend `{ id, changed, png, bitmap }` ou `{ id, changed: 0 }`. Erreur : `{ id, error }`. Créé par
 * `main.ts`, arrêté par `pixel-runner.ts`. Aucun test ne résout ce fichier ni `src/wasm-formats/`.
 */
import { hasPixels, type PixelFormatsBinding } from "./container";
import { loadFormatsModule } from "./container-load";
import { decodeImage, DISPLAY_MAX, ImageTooLargeError, type DecodePorts, type ImageKind } from "./image-decode";
import { applyFill, applyPixels, FILL_UNREADABLE_MESSAGE, pixelErrorMessage, type PixelFillSpec, type PixelParams } from "./pixel-runner";

type AdjustMessage = PixelParams & { readonly id: number; readonly type?: undefined; readonly bitmap: ImageBitmap };
type FillMessage = PixelParams & PixelFillSpec & { readonly id: number; readonly type: "fill"; readonly blob?: Blob; readonly kind?: ImageKind; readonly bitmap?: ImageBitmap };

/** Ports du Worker : `createImageBitmap` du Worker ; pas de DOM, donc pas de SVG (la page envoie le bitmap du cache). */
const ports: DecodePorts = {
  createImageBitmap: (src, opts) => self.createImageBitmap(src, opts),
  loadSvg: () => Promise.reject(new Error("SVG non décodable dans le Worker")),
};

let loading: Promise<PixelFormatsBinding> | null = null;
const pixels = async (): Promise<PixelFormatsBinding> => {
  const m = await loadFormatsModule();
  if (!hasPixels(m)) throw new Error("module des pixels indisponible");
  return m;
};

/** Original à pleine résolution : bitmap reçu (SVG), sinon `Blob` décodé ; un échec de décodage devient « illisible ». */
async function original(d: FillMessage): Promise<ImageBitmap> {
  if (d.bitmap !== undefined) return d.bitmap;
  if (d.blob === undefined || d.kind === undefined) throw new Error(FILL_UNREADABLE_MESSAGE);
  try {
    return (await decodeImage(d.blob, d.kind, Infinity, ports)).bitmap;
  } catch (err) {
    throw err instanceof ImageTooLargeError ? err : new Error(FILL_UNREADABLE_MESSAGE);
  }
}

async function fill(mod: PixelFormatsBinding, d: FillMessage): Promise<void> {
  const src = await original(d);
  const w = src.width;
  const h = src.height;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) {
    src.close();
    throw new Error("contexte 2D indisponible dans le Worker");
  }
  ctx.drawImage(src, 0, 0);
  src.close();
  const img = ctx.getImageData(0, 0, w, h);
  const px = new Uint8Array(img.data.buffer);
  applyPixels(mod, px, w, h, d);
  const changed = applyFill(mod, px, w, h, d);
  if (changed === 0) {
    self.postMessage({ id: d.id, changed: 0 });
    return;
  }
  ctx.putImageData(img, 0, 0);
  const png = await canvas.convertToBlob({ type: "image/png" });
  const bitmap = (await decodeImage(png, "png", DISPLAY_MAX, ports)).bitmap;
  self.postMessage({ id: d.id, changed, png, bitmap }, { transfer: [bitmap] });
}

self.onmessage = async (e: MessageEvent<AdjustMessage | FillMessage>): Promise<void> => {
  const d = e.data;
  try {
    loading ??= pixels();
    const mod = await loading;
    if (d.type === "fill") {
      await fill(mod, d);
      return;
    }
    const { id, bitmap } = d;
    const w = bitmap.width;
    const h = bitmap.height;
    const ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true });
    if (ctx === null) throw new Error("contexte 2D indisponible dans le Worker");
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    applyPixels(mod, new Uint8Array(img.data.buffer), w, h, d);
    const out = await createImageBitmap(img);
    self.postMessage({ id, bitmap: out }, { transfer: [out] });
  } catch (err) {
    self.postMessage({ id: d.id, error: pixelErrorMessage(err) });
  } finally {
    // Fermer un bitmap déjà fermé est sans effet : la retouche ferme le sien, le remplissage aussi s'il en a reçu un.
    d.bitmap?.close();
  }
};
