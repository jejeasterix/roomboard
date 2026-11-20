/**
 * Entrée du Worker de pixels (C5, I18) : sa propre instance du module `formats`, chargée au premier calcul et gardée ;
 * reçoit `{ id, bitmap, transparent?, brightness?, contrast? }` (bitmap transféré), extrait le RGBA par `OffscreenCanvas`,
 * appelle le Rust (`applyPixels`), rend `{ id, bitmap }` (transféré) ou `{ id, error }`. Créé par `main.ts`, arrêté par
 * `pixel-runner.ts`. Aucun test ne résout ce fichier ni `src/wasm-formats/`.
 */
import { hasPixels, type PixelFormatsBinding } from "./container";
import { loadFormatsModule } from "./container-load";
import { applyPixels, pixelErrorMessage, type PixelParams } from "./pixel-runner";

let loading: Promise<PixelFormatsBinding> | null = null;
const pixels = async (): Promise<PixelFormatsBinding> => {
  const m = await loadFormatsModule();
  if (!hasPixels(m)) throw new Error("module des pixels indisponible");
  return m;
};

self.onmessage = async (e: MessageEvent<PixelParams & { readonly id: number; readonly bitmap: ImageBitmap }>): Promise<void> => {
  const { id, bitmap } = e.data;
  try {
    loading ??= pixels();
    const mod = await loading;
    const w = bitmap.width;
    const h = bitmap.height;
    const ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true });
    if (ctx === null) throw new Error("contexte 2D indisponible dans le Worker");
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    applyPixels(mod, new Uint8Array(img.data.buffer), w, h, e.data);
    const out = await createImageBitmap(img);
    self.postMessage({ id, bitmap: out }, { transfer: [out] });
  } catch (err) {
    self.postMessage({ id, error: pixelErrorMessage(err) });
  } finally {
    bitmap.close();
  }
};
