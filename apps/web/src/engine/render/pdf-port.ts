/**
 * Port PDF du moteur (C12, DAPF1, DAPF2, PF12) : types seuls. Le moteur ne porte jamais un PDF (DAU5) : il demande des
 * tuiles à un `PdfFile` que la plateforme ouvre (`platform/pdf-render.ts`, pdf.js dans la page).
 */
/** Rectangle d'une tuile en pixels du palier, origine au coin haut gauche de la page rendue. */
export interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export type TileBitmap = CanvasImageSource & { close?(): void };
export interface PdfFile {
  readonly pageCount: number;
  /** Taille de la page `index` (à partir de 0) en points, après /Rotate et CropBox. */
  pageSize(index: number): Promise<{ readonly w: number; readonly h: number }>;
  /** Tuile `tile` de la page `index` rendue à `scale` pixels par point ; rejet si `signal` est annulé. */
  renderTile(index: number, scale: number, tile: TileRect, signal: AbortSignal): Promise<TileBitmap>;
  destroy(): void;
}
export interface PdfEngine {
  /** Lève `PdfEncryptedError` (plateforme) pour un PDF chiffré (PF8). */
  open(blob: Blob): Promise<PdfFile>;
}
