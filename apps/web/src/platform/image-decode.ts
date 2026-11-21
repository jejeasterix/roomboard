/**
 * Décodage d'une image sans DOM (C6b, B7, B25), partagé par la page (`image-import.ts`, qui le réexporte) et le Worker de
 * pixels : orientation EXIF appliquée, refus au-delà de 100 Mpx (U26), réduction du côté le plus long à `max` (copie
 * d'affichage, `DISPLAY_MAX`) ; `max = Infinity` : l'original à pleine résolution. Les ports viennent de l'appelant (le
 * Worker n'a pas d'`HTMLImageElement` : son `loadSvg` refuse). N'importe ni le moteur, ni l'application, ni le DOM.
 */

export type ImageKind = "png" | "jpeg" | "gif" | "webp" | "bmp" | "ico" | "svg" | "avif" | "heic";

export const MAX_PIXELS = 100_000_000;
export const DISPLAY_MAX = 4096;
export const TOO_MANY_PIXELS = "image trop grande (plus de 100 millions de pixels)";

export interface DecodedImage {
  readonly bitmap: ImageBitmap;
  /** Taille source orientée (EXIF appliqué), en pixels. */
  readonly w: number;
  readonly h: number;
}

export interface DecodePorts {
  createImageBitmap(src: ImageBitmapSource, opts?: ImageBitmapOptions): Promise<ImageBitmap>;
  /** SVG : `HTMLImageElement` hors DOM sur une URL `blob:` (R13). */
  loadSvg(blob: Blob): Promise<ImageBitmapSource>;
}

export class ImageTooLargeError extends Error {
  constructor() {
    super(TOO_MANY_PIXELS);
    this.name = "ImageTooLargeError";
  }
}

/** Décode ; refuse au-delà de 100 Mpx (bitmap fermé) ; côté le plus long au-delà de `max` : bitmap d'affichage réduit. */
export async function decodeImage(blob: Blob, kind: ImageKind, max: number, ports: DecodePorts): Promise<DecodedImage> {
  const source: ImageBitmapSource = kind === "svg" ? await ports.loadSvg(blob) : blob;
  const full = await ports.createImageBitmap(source, { imageOrientation: "from-image" });
  const w = full.width;
  const h = full.height;
  if (w * h > MAX_PIXELS) {
    full.close();
    throw new ImageTooLargeError();
  }
  const side = Math.max(w, h);
  if (side <= max) return { bitmap: full, w, h };
  const k = max / side;
  try {
    const bitmap = await ports.createImageBitmap(full, {
      resizeWidth: Math.max(1, Math.round(w * k)),
      resizeHeight: Math.max(1, Math.round(h * k)),
      resizeQuality: "high",
    });
    return { bitmap, w, h };
  } finally {
    full.close();
  }
}
