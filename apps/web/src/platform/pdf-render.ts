/**
 * Moteur PDF de la page (C12, PF12, DAPF1) : `pdf.js` derrière le port `PdfEngine` du moteur (le moteur ne porte jamais
 * un PDF, DAU5). Chargé au premier besoin par `load` (`loadPdfjs` dans l'amorce, un faux dans les tests). Chiffré (PF8) :
 * mot de passe d'ouverture (`isPasswordError`) ou dictionnaire d'infos portant `EncryptFilterName` → `PdfEncryptedError`.
 * Une tuile est rendue dans une toile de sa taille, viewport décalé de (-x, -y), puis rendue en bitmap.
 */
import type { PdfEngine, PdfFile, TileBitmap, TileRect } from "../engine/render/pdf-port";

export const PDF_ENCRYPTED_MESSAGE = "PDF chiffré, non pris en charge";
export const PDF_CLOSED_MESSAGE = "PDF fermé";

export class PdfEncryptedError extends Error {
  constructor() {
    super(PDF_ENCRYPTED_MESSAGE);
    this.name = "PdfEncryptedError";
  }
}

/** Sous-ensemble de `pdf.js` utilisé ici (typé localement : aucun test ne charge `pdfjs-dist`). */
export interface PdfjsViewport {
  readonly width: number;
  readonly height: number;
}
export interface PdfjsRenderTask {
  readonly promise: Promise<void>;
  cancel(): void;
}
export interface PdfjsPage {
  getViewport(p: { scale: number; offsetX?: number; offsetY?: number }): PdfjsViewport;
  render(p: { canvas: HTMLCanvasElement; viewport: PdfjsViewport }): PdfjsRenderTask;
}
export interface PdfjsDocument {
  readonly numPages: number;
  getPage(pageNumber: number): Promise<PdfjsPage>;
  getMetadata(): Promise<{ readonly info: unknown }>;
  destroy(): Promise<void>;
}
export interface PdfjsBinding {
  open(data: Uint8Array): Promise<PdfjsDocument>;
  isPasswordError(e: unknown): boolean;
}

/** Toile d'une tuile : rendue en bitmap puis libérée (mémoire de l'iPad, HU1-10). */
export interface TileCanvas {
  readonly canvas: HTMLCanvasElement;
  bitmap(): Promise<TileBitmap>;
  release(): void;
}
export interface PdfDom {
  tile(w: number, h: number): TileCanvas;
}

export const browserPdfDom: PdfDom = {
  tile(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return {
      canvas,
      bitmap: () => createImageBitmap(canvas),
      release() {
        canvas.width = 0;
        canvas.height = 0;
      },
    };
  },
};

const encrypted = (info: unknown): boolean =>
  typeof info === "object" && info !== null && typeof (info as Record<string, unknown>)["EncryptFilterName"] === "string";

function fileOf(doc: PdfjsDocument, dom: PdfDom): PdfFile {
  const pages = new Map<number, Promise<PdfjsPage>>();
  let destroyed = false;
  const page = (i: number): Promise<PdfjsPage> => {
    let p = pages.get(i);
    if (p === undefined) {
      p = doc.getPage(i + 1);
      pages.set(i, p);
    }
    return p;
  };
  return {
    pageCount: doc.numPages,
    async pageSize(i) {
      const v = (await page(i)).getViewport({ scale: 1 });
      return { w: v.width, h: v.height };
    },
    async renderTile(i, scale, tile: TileRect, signal) {
      if (destroyed) throw new Error(PDF_CLOSED_MESSAGE);
      signal.throwIfAborted();
      const p = await page(i);
      signal.throwIfAborted();
      const viewport = p.getViewport({ scale, offsetX: -tile.x, offsetY: -tile.y });
      const c = dom.tile(tile.w, tile.h);
      try {
        const task = p.render({ canvas: c.canvas, viewport });
        const abort = (): void => task.cancel();
        signal.addEventListener("abort", abort, { once: true });
        try {
          await task.promise;
        } finally {
          signal.removeEventListener("abort", abort);
        }
        signal.throwIfAborted();
        return await c.bitmap();
      } finally {
        c.release();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pages.clear();
      void doc.destroy();
    },
  };
}

export function createPdfEngine(load: () => Promise<PdfjsBinding>, dom: PdfDom = browserPdfDom): PdfEngine {
  let binding: Promise<PdfjsBinding> | null = null;
  return {
    async open(blob) {
      binding ??= load();
      let pdfjs: PdfjsBinding;
      try {
        pdfjs = await binding;
      } catch (e) {
        binding = null; // morceau absent ou réseau local coupé : réessayé au prochain PDF
        throw e;
      }
      let doc: PdfjsDocument;
      try {
        doc = await pdfjs.open(new Uint8Array(await blob.arrayBuffer()));
      } catch (e) {
        if (pdfjs.isPasswordError(e)) throw new PdfEncryptedError();
        throw e;
      }
      const meta = await doc.getMetadata().catch(() => ({ info: null }));
      if (encrypted(meta.info)) {
        await doc.destroy();
        throw new PdfEncryptedError();
      }
      return fileOf(doc, dom);
    },
  };
}
