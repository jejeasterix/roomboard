/**
 * Producteur PNG de la superposition (C12, PF21, lot b) : le contenu de chaque page (grille et éléments) dessiné par
 * `paintContent` du rendu Canvas 2D (même code que l'écran, D7) dans une toile de rect × échelle, échelle
 * min(2, 4096 / plus grand côté) px par unité, puis encodé en PNG.
 *
 * Images : l'`ImageSource` du rendu est synchrone, une image pas encore décodée y devient un cadre gris
 * (`canvas2d.ts`, `paintPlaceholder`). Le cache de la scène décode en arrière-plan : ici, toutes les images citées sont
 * décodées et attendues avant le premier dessin, puis fermées après.
 *
 * Onglet fermé pendant l'export : le dessin relit le document Wasm, libéré par `dispose`. Les ids des pages sont lus
 * avant le premier `await`, et `deps.alive()` est relu avant chaque dessin ; faux, plus rien n'est peint (null).
 */
import type { Bounds, CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { BitmapDecoder, BitmapLike, ImageSource } from "../engine/render/image-cache";
import type { PageView } from "../engine/render/renderer";
import { typed } from "./container-io";
import type { Overlay, OverlayProducer } from "./pdf-export";

export const OVERLAY_MAX_PX = 4096;
export const OVERLAY_MAX_SCALE = 2;

export const overlayScale = (rect: Bounds): number =>
  Math.min(OVERLAY_MAX_SCALE, OVERLAY_MAX_PX / Math.max(rect.x1 - rect.x0, rect.y1 - rect.y0));

/** Le `Canvas2DRenderer` (T5) s'y branche tel quel. */
export interface ContentPainter {
  paintContent(ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number): void;
}
export interface ExportCanvas {
  readonly ctx: CanvasRenderingContext2D;
  png(): Promise<Uint8Array>;
  release(): void;
}
export interface PngOverlayDeps {
  readonly doc: Pick<CoreDocument, "elementIds" | "citedAssets">;
  readonly assets: Pick<AssetStore, "get">;
  readonly decode: BitmapDecoder;
  /** Faux dès que l'onglet est fermé : plus aucun dessin (il relirait le document libéré). */
  alive(): boolean;
  canvas(w: number, h: number): ExportCanvas;
  painter(ctx: CanvasRenderingContext2D, images: ImageSource): ContentPainter;
}

/** Bitmaps des images citées (type `image/*` seulement), décodés d'avance ; un échec laisse le cadre gris. */
export async function loadImageSource(
  doc: Pick<CoreDocument, "citedAssets">,
  assets: Pick<AssetStore, "get">,
  decode: BitmapDecoder,
): Promise<ImageSource & { dispose(): void }> {
  const cited = doc.citedAssets().filter((a) => a.mime.startsWith("image/"));
  const done = new Map<string, BitmapLike>();
  for (const a of cited) {
    const blob = assets.get(a.id);
    if (blob === undefined) continue;
    try {
      done.set(a.id, await decode(typed(blob, a.mime)));
    } catch (e) {
      console.warn(`RoomBoard : image ${a.id} non exportée (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  return {
    bitmap: (id) => done.get(id) ?? null,
    dispose() {
      for (const b of done.values()) b.close?.();
      done.clear();
    },
  };
}

export function createPngOverlay(deps: PngOverlayDeps): OverlayProducer {
  return {
    async pages(requests) {
      const views = requests.map((r) => ({ r, page: { id: r.pageId, elementIds: deps.doc.elementIds(r.pageId) } satisfies PageView }));
      const images = await loadImageSource(deps.doc, deps.assets, deps.decode);
      try {
        const out: (Overlay | null)[] = [];
        for (const { r, page } of views) {
          if (!deps.alive()) {
            out.push(null);
            continue;
          }
          const scale = overlayScale(r.rect);
          const w = Math.max(1, Math.round((r.rect.x1 - r.rect.x0) * scale));
          const h = Math.max(1, Math.round((r.rect.y1 - r.rect.y0) * scale));
          const c = deps.canvas(w, h);
          try {
            deps.painter(c.ctx, images).paintContent(c.ctx, page, r.rect, scale);
            out.push({ kind: "png", bytes: await c.png() });
          } finally {
            c.release();
          }
        }
        return out;
      } finally {
        images.dispose();
      }
    },
  };
}

/** Toile du navigateur : `toBlob("image/png")`, libérée en remettant sa taille à 0 (mémoire de l'iPad). */
export function browserExportCanvas(w: number, h: number): ExportCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("canvas 2D indisponible");
  return {
    ctx,
    png: () =>
      new Promise<Uint8Array>((ok, ko) =>
        canvas.toBlob((b) => (b === null ? ko(new Error("PNG impossible")) : void b.arrayBuffer().then((a) => ok(new Uint8Array(a)), ko)), "image/png"),
      ),
    release() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
