/**
 * Vignette d'une ressource (C4, D12) : PNG de 128 px au plus grand côté, rendue par le peintre d'export
 * (`paintContent`, même code de dessin que l'écran) sur une toile d'export, libérée aussitôt. Objets : la boîte de
 * leurs éléments ; grille : une fenêtre monde de 320 × 320 (la grille est peinte par `paintContent`, D12). Miniature de
 * page (DA7) : `renderPageThumb`, au cadre de la page.
 */
import { PDF_PAGE_KIND, type BackdropView, type Bounds, type CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { PAGE_BACKGROUND, pageFrame } from "../engine/page";
import type { BitmapDecoder, ImageSource } from "../engine/render/image-cache";
import type { BackdropPainter, PageView } from "../engine/render/renderer";
import { pageExportRect } from "./pdf-export";
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

/** personnalisation-1b (Q20) : échelle de « Cette page » : 1920 × 1080 → 3840 × 2160, net sur un écran à 200 %. */
export const PAGE_IMAGE_SCALE = 2;

/**
 * Page entière en PNG (personnalisation-1b, Q20, Q29) : cadre (0, 0, largeur × hauteur de la page) à l'échelle
 * `scale` ; couleur de la page, fond `image` sur son rect, puis grille et objets par le peintre d'export
 * (`paintContent`, même code de dessin que l'écran). Un fond `pdf-page` n'est pas repris. Null : page inconnue.
 */
export async function renderPageImage(doc: CoreDocument, assets: AssetStore, pageId: string, scale: number, deps: ThumbDeps): Promise<Blob | null> {
  const page = doc.page(pageId);
  if (page === null) return null;
  const w = Math.max(1, Math.round(page.width * scale));
  const h = Math.max(1, Math.round(page.height * scale));
  const images = await loadImageSource(doc, assets, deps.decode);
  const canvas = deps.canvas(w, h);
  try {
    const ctx = canvas.ctx;
    // Blanc d'abord : une couleur que la toile refuse laisse le blanc, pas le noir d'une toile neuve.
    ctx.fillStyle = "#ffffff";
    ctx.fillStyle = page.background;
    ctx.fillRect(0, 0, w, h);
    const b = page.backdrop;
    if (b !== null && b.kind === "image" && b.rect !== null) {
      const bmp = images.bitmap(b.asset);
      if (bmp !== null) ctx.drawImage(bmp, b.rect.x0 * scale, b.rect.y0 * scale, (b.rect.x1 - b.rect.x0) * scale, (b.rect.y1 - b.rect.y0) * scale);
    }
    const view = { id: pageId, elementIds: doc.elementIds(pageId) } satisfies PageView;
    deps.painter(ctx, doc, images).paintContent(ctx, view, { x0: 0, y0: 0, x1: page.width, y1: page.height }, scale);
    return new Blob([(await canvas.png()) as BlobPart], { type: "image/png" });
  } finally {
    canvas.release();
    images.dispose();
  }
}

/** Fond de page (PF14) peint une fois, à son rectangle (H16) : bitmap d'un fond `image`, peintre d'un fond `pdf-page`. */
function paintBackdrop(ctx: CanvasRenderingContext2D, b: BackdropView, images: ImageSource, rect: Bounds, scale: number, size: { readonly w: number; readonly h: number }, painter: BackdropPainter | undefined): void {
  const r = b.rect;
  if (r === null) return;
  const camera = { zoom: scale, tx: -rect.x0 * scale, ty: -rect.y0 * scale };
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, camera.tx, camera.ty);
  if (b.kind === "image") {
    const bmp = images.bitmap(b.asset);
    if (bmp) ctx.drawImage(bmp, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  } else if (b.kind === PDF_PAGE_KIND) {
    painter?.paint(ctx, b, camera, { w: size.w, h: size.h, dpr: 1 });
  }
  ctx.restore();
}

/**
 * Miniature d'une page (DA7), `width` en pixels du tampon (le panneau passe sa largeur CSS × devicePixelRatio : traits
 * nets). Rectangle : Page → son cadre (`pageFrame`) ; Infini → boîte du contenu ∪ fond (`pageExportRect`, règle de
 * l'export PDF) ; page infinie vide → 1920 × 1080 (16:9), fond de page. Même peintre que l'écran (`paintContent`).
 */
export async function renderPageThumb(
  doc: CoreDocument,
  assets: AssetStore,
  pageId: string,
  width: number,
  deps: ThumbDeps & { backdrop?: BackdropPainter },
): Promise<ImageBitmap | Blob | null> {
  const page = doc.page(pageId);
  if (page === null || !(width > 0)) return null;
  const ids = doc.elementIds(pageId);
  const frame = pageFrame(page);
  const rect = frame ?? pageExportRect(null, ids.length > 0 ? doc.bounds(ids) : null, page.backdrop?.rect ?? null);
  const w = Math.max(1, Math.round(width));
  const scale = w / (rect.x1 - rect.x0);
  const h = Math.max(1, Math.round((rect.y1 - rect.y0) * scale));
  const view: PageView = { id: pageId, elementIds: ids, background: page.background, backdrop: page.backdrop, width: page.width, height: page.height, mode: page.mode };
  const images = await loadImageSource(doc, assets, deps.decode);
  const canvas = deps.canvas(w, h);
  try {
    canvas.ctx.fillStyle = PAGE_BACKGROUND;
    canvas.ctx.fillStyle = page.background || PAGE_BACKGROUND;
    canvas.ctx.fillRect(0, 0, w, h);
    if (page.backdrop) paintBackdrop(canvas.ctx, page.backdrop, images, rect, scale, { w, h }, deps.backdrop);
    deps.painter(canvas.ctx, doc, images).paintContent(canvas.ctx, view, rect, scale);
    return new Blob([(await canvas.png()) as BlobPart], { type: "image/png" });
  } finally {
    canvas.release();
    images.dispose();
  }
}
