/**
 * Vignette d'une ressource (C4, D12) : PNG de 128 px au plus grand côté, rendue par le peintre d'export
 * (`paintContent`, même code de dessin que l'écran) sur une toile d'export, libérée aussitôt. Objets : la boîte de
 * leurs éléments ; grille : une fenêtre monde de 320 × 320 (la grille est peinte par `paintContent`, D12).
 */
import type { Bounds, CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { BitmapDecoder, ImageSource } from "../engine/render/image-cache";
import type { PageView } from "../engine/render/renderer";
import { loadImageSource, type ContentPainter, type ExportCanvas } from "./pdf-overlay";

export const THUMB_MAX = 128;
export const GRID_THUMB_WORLD = 320;

export interface ThumbDeps {
  canvas(w: number, h: number): ExportCanvas;
  painter(ctx: CanvasRenderingContext2D, doc: CoreDocument, images: ImageSource): ContentPainter;
  readonly decode: BitmapDecoder;
}

export function thumbSize(box: Bounds): { readonly w: number; readonly h: number; readonly scale: number } | null {
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const side = Math.max(bw, bh);
  if (!(side > 0) || !Number.isFinite(side)) return null;
  const scale = THUMB_MAX / side;
  return { w: Math.max(1, Math.round(bw * scale)), h: Math.max(1, Math.round(bh * scale)), scale };
}

export async function renderThumbnail(doc: CoreDocument, assets: AssetStore, kind: "fragment" | "grid", deps: ThumbDeps): Promise<Blob | null> {
  const pageId = doc.pageIds()[0];
  if (pageId === undefined) return null;
  const view = { id: pageId, elementIds: doc.elementIds(pageId) } satisfies PageView;
  const rect: Bounds | null =
    kind === "grid" ? { x0: 0, y0: 0, x1: GRID_THUMB_WORLD, y1: GRID_THUMB_WORLD } : doc.bounds(doc.elementIds(pageId));
  if (rect === null) return null;
  const size = thumbSize(rect);
  if (size === null) return null;
  const images = await loadImageSource(doc, assets, deps.decode);
  const canvas = deps.canvas(size.w, size.h);
  try {
    canvas.ctx.fillStyle = "#ffffff";
    canvas.ctx.fillRect(0, 0, size.w, size.h);
    deps.painter(canvas.ctx, doc, images).paintContent(canvas.ctx, view, rect, size.scale);
    return new Blob([(await canvas.png()) as BlobPart], { type: "image/png" });
  } finally {
    canvas.release();
    images.dispose();
  }
}
