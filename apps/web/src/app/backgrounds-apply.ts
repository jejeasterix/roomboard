/**
 * Appliquer un fond (personnalisation-1b, Q14, Q26, Q31, Q35, DA1) : un fond du pack devient une `BackgroundSource`
 * (couleur, grille, image) ; l'image entre au magasin `assets` de l'onglet (empreinte SHA-256 : un même fond sur 30 pages
 * = un seul asset), puis une seule commande `ApplyBackground` : une étape d'annulation. Partagé par l'interface et la CLI
 * (Q32) : `resolvePack` et `backgroundCommand` sont le chemin commun.
 *
 * Pas de pose page par page (`SetBackdrop` et une mise au magasin par page, comme la capture du bureau) : N étapes
 * d'annulation et N écritures pour un seul geste. De la capture, seule la forme `typed(blob, mime)` → `put` → `AssetRef`
 * est gardée.
 */
import type { Command, CoreDocument, CoreFactory, PageView } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { PackBackground } from "../backgrounds/catalog";
import type { BackgroundSource } from "../backgrounds/source";
import { SVG_H, SVG_W, svgOf } from "../backgrounds/svg";
import { typed } from "./container-io";
import { renderPageImage, type ThumbDeps } from "./thumbnail";

export interface PackFiles {
  read(file: string): Promise<Blob>;
}
/** Dossier servi du pack, relatif au document (web et coque, `frontendDist`). */
export const PACK_BASE = "./backgrounds/";
export const missingPackFile = (file: string): string => `fond introuvable : ${file}`;
export const appliedMessage = (n: number): string => `Fond appliqué à ${n} pages`;
export const pdfKeptMessage = (n: number): string =>
  `${n} ${n > 1 ? "pages PDF gardent leur page" : "page PDF garde sa page"} : couleur et grille seulement`;
export const OUTSIDE_FRAME_MESSAGE = "objets hors du cadre non repris";
/** Miniatures rendues (Q29) : 1920 × 1080 → 480 × 270, deux fois la carte. */
export const THUMB_SCALE = 0.25;

/** Fichiers du pack servis à côté du document ; réseau coupé ou fichier absent : « fond introuvable : <fichier> ». */
export function fetchPackFiles(fetchFn: (url: string) => Promise<Response> = (u) => fetch(u), base: string = PACK_BASE): PackFiles {
  return {
    async read(file) {
      let r: Response;
      try {
        r = await fetchFn(`${base}${file}`);
      } catch {
        throw new Error(missingPackFile(file));
      }
      if (!r.ok) throw new Error(missingPackFile(file));
      return r.blob();
    },
  };
}

/** Q14 : la photo pleine n'est lue qu'ici, au moment d'appliquer ; couleur, grille et SVG ne lisent aucun fichier. */
export async function resolvePack(b: PackBackground, files: PackFiles): Promise<BackgroundSource> {
  switch (b.kind) {
    case "color":
      return { color: b.color, grid: null, image: null };
    case "grid":
      return { color: b.color, grid: b.grid, image: null };
    case "svg": {
      const blob = new Blob([svgOf(b.id)], { type: "image/svg+xml" });
      return { color: b.color, grid: null, image: { blob, name: `${b.id}.svg`, mime: "image/svg+xml", w: SVG_W, h: SVG_H } };
    }
    case "photo": {
      const p = b.photo;
      if (p === null) throw new Error(missingPackFile(b.id));
      const blob = typed(await files.read(p.file), "image/webp");
      return { color: b.color, grid: null, image: { blob, name: `${b.id}.webp`, mime: "image/webp", w: p.w, h: p.h } };
    }
  }
}

/** Cœur commun (interface et CLI) : une seule mise au magasin, une seule commande pour toutes les pages visées. */
export async function backgroundCommand(assets: Pick<AssetStore, "put">, src: BackgroundSource, pages: readonly string[]): Promise<Command> {
  const im = src.image;
  if (im === null) return { type: "ApplyBackground", pages, color: src.color, grid: src.grid, backdrop: null };
  const blob = typed(im.blob, im.mime);
  const id = await assets.put(blob);
  return {
    type: "ApplyBackground",
    pages,
    color: src.color,
    grid: src.grid,
    backdrop: { asset: { id, name: im.name, mime: im.mime, size: blob.size }, w: im.w, h: im.h, fit: "width" },
  };
}

export interface ApplyTarget {
  run(cmd: Command): unknown;
  readonly assets: Pick<AssetStore, "put">;
  pageIds(): readonly string[];
}

/** Vrai si la commande est prise (`run` ne rend pas null ; le moteur rend null sur un refus, message dans son état). */
export async function applyBackground(target: ApplyTarget, src: BackgroundSource, pages: "current" | "all", current: string): Promise<boolean> {
  const ids = pages === "all" ? target.pageIds() : [current];
  return target.run(await backgroundCommand(target.assets, src, ids)) !== null;
}

/** Q35 : pages visées dont le fond est une page PDF (elles ne gardent que couleur et grille). */
export function pdfPagesAmong(doc: Pick<CoreDocument, "page">, pages: readonly string[]): number {
  return pages.filter((p) => doc.page(p)?.backdrop?.kind === "pdf-page").length;
}

/** Q20 : un objet dépasse le cadre de la page (la page a une hauteur sans fin) : « Cette page » ne le reprend pas. */
export function outsideFrame(doc: Pick<CoreDocument, "page" | "elementIds" | "bounds">, pageId: string): boolean {
  const page = doc.page(pageId);
  const ids = doc.elementIds(pageId);
  if (page === null || ids.length === 0) return false;
  const b = doc.bounds(ids);
  return b !== null && (b.x0 < 0 || b.y0 < 0 || b.x1 > page.width || b.y1 > page.height);
}

/** Marqueur `data-look` de la scène (lu par les essais) : couleur|types de grille|genre:empreinte du fond. */
export function lookTag(page: PageView | null): string {
  if (page === null) return "";
  const grid = page.grid === null ? "-" : page.grid.levels.map((l) => l.kind).join("+") || "vide";
  const b = page.backdrop;
  return `${page.background}|${grid}|${b === null ? "-" : `${b.kind}:${b.asset.slice(0, 12)}`}`;
}

/** Miniature d'une source (Q29) : document temporaire d'une page, fond appliqué, rendu à `THUMB_SCALE`, puis libéré. */
export async function sourceThumbnail(core: Pick<CoreFactory, "blank">, src: BackgroundSource, deps: ThumbDeps, makeAssets: () => AssetStore): Promise<Blob | null> {
  const doc = core.blank();
  try {
    const page = doc.pageIds()[0];
    if (page === undefined) return null;
    const assets = makeAssets();
    doc.apply(await backgroundCommand(assets, src, [page]));
    return await renderPageImage(doc, assets, page, THUMB_SCALE, deps);
  } finally {
    doc.free();
  }
}
