/**
 * Bitmaps des images par empreinte (DAR2, R16, HR12) : le rendu de la scène est synchrone, le décodage ne l'est pas.
 * `bitmap(asset)` rend le bitmap prêt, ou null (absent du magasin, en cours, en échec) et lance le décodage au premier
 * appel ; `ready` (branché sur `engine.redraw()`) est appelé quand un bitmap arrive. Une instance par onglet :
 * `dispose` ferme les bitmaps, et ferme aussitôt ceux qui arrivent après.
 */
import type { AssetStore } from "../../core/asset-store";

export interface ImageSource {
  bitmap(asset: string): CanvasImageSource | null;
}

export type BitmapLike = CanvasImageSource & { close?(): void };
export type BitmapDecoder = (blob: Blob) => Promise<BitmapLike>;

export interface ImageCache extends ImageSource {
  dispose(): void;
}

export function createImageCache(assets: Pick<AssetStore, "get">, decode: BitmapDecoder, ready: () => void): ImageCache {
  const done = new Map<string, BitmapLike>();
  const pending = new Set<string>();
  const failed = new Set<string>();
  let disposed = false;
  return {
    bitmap(asset) {
      const hit = done.get(asset);
      if (hit !== undefined) return hit;
      if (disposed || pending.has(asset) || failed.has(asset)) return null;
      const blob = assets.get(asset);
      if (blob === undefined) return null;
      pending.add(asset);
      decode(blob).then(
        (b) => {
          pending.delete(asset);
          if (disposed) {
            b.close?.();
            return;
          }
          done.set(asset, b);
          ready();
        },
        (e: unknown) => {
          pending.delete(asset);
          failed.add(asset);
          console.warn(`RoomBoard : image ${asset} illisible (${e instanceof Error ? e.message : String(e)})`);
        },
      );
      return null;
    },
    dispose() {
      disposed = true;
      for (const b of done.values()) b.close?.();
      done.clear();
    },
  };
}
