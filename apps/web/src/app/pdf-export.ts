/**
 * Export PDF (C12, PF20, PF21, DAPF3) : un seul export, assemblé par `pdf-lib` (chargé au premier export par
 * `deps.loadPdfLib`). Pages dans l'ordre du document. Page à fond `pdf-page` : la page d'origine recopiée
 * (`copyPages` : flux, polices, texte, annotations intacts), puis la superposition du contenu RoomBoard posée sur la
 * CropBox en tenant compte de /Rotate ; sans contenu, recopiée telle quelle. Autre page (ou indice au-delà du PDF
 * d'origine, PC7) : page neuve de 842 pt de large, hauteur max(1080, bas du contenu) × 842 / 1920. La superposition
 * vient d'un producteur interchangeable : PNG (b, `pdf-overlay.ts`) ou page vectorielle `krilla` (c).
 *
 * Le document n'est lu qu'au départ, avant le premier `await` : l'onglet peut se fermer pendant l'export (`dispose`
 * libère le document Wasm, `board-session.ts`). `deps.alive()` est relu entre les étapes, comme les opérations de
 * l'espace de travail (`workspace.ts`, `alive: () => !released.has(t)`) ; onglet fermé : l'export rend null.
 *
 * Repli (PF20) : un PDF que pdf.js a ouvert mais que `pdf-lib` refuse sort en image de ses pages (rendues par pdf.js,
 * `deps.rasterPage`), l'annotation au-dessus, avec `rasterized` vrai (avis `PDF_RASTER_MESSAGE`) ; jamais ailleurs, le
 * texte et les vecteurs d'origine seraient perdus (U34).
 */
import type { PDFDocument, PDFPage } from "pdf-lib";
import { PAGE_HEIGHT, PAGE_WIDTH, PDF_PAGE_KIND, type Bounds } from "../core/api";
import type { AssetStore } from "../core/asset-store";

export const NEW_PAGE_WIDTH = 842;
export const PDF_CUT_MESSAGE = "du contenu hors des pages PDF n'est pas exporté";
export const PDF_RASTER_MISSING_MESSAGE = "page d'origine du PDF illisible : page vierge à la place";
export const PDF_RASTER_MESSAGE = "PDF d'origine non recopié : pages en image";

export type PdfLib = Pick<typeof import("pdf-lib"), "PDFDocument" | "degrees">;

/** Ce que l'export lit d'un fond et d'un document : un `CoreDocument` s'y branche tel quel. */
export interface ExportBackdrop {
  readonly asset: string;
  readonly kind: string;
  readonly page: number | null;
  readonly rect: Bounds | null;
}
export interface ExportSource {
  pageIds(): string[];
  elementIds(page: string): string[];
  bounds(ids: readonly string[]): Bounds | null;
  page(id: string): { readonly backdrop: ExportBackdrop | null; readonly grid: { readonly visible: boolean } | null } | null;
}
/** Superposition demandée : rectangle monde exporté, boîte vue (points, après /Rotate) où la poser. */
export interface OverlayRequest {
  readonly pageId: string;
  readonly rect: Bounds;
  readonly box: { readonly w: number; readonly h: number };
}
export type Overlay = { readonly kind: "png"; readonly bytes: Uint8Array } | { readonly kind: "pdf"; readonly bytes: Uint8Array; readonly index: number };
/** Producteur interchangeable (DAPF3, PC6) : une réponse par requête, dans l'ordre ; null : rien à poser. */
export interface OverlayProducer {
  pages(requests: readonly OverlayRequest[]): Promise<readonly (Overlay | null)[]>;
}
/** Page d'origine rendue en PNG par pdf.js ; `w` × `h` : taille de la page vue, en points (viewport à l'échelle 1). */
export interface RasterPage {
  readonly png: Uint8Array;
  readonly w: number;
  readonly h: number;
}
export interface ExportDeps {
  loadPdfLib(): Promise<PdfLib>;
  readonly overlay: OverlayProducer;
  /** Faux dès que l'onglet est fermé : l'export s'arrête et rend null. */
  alive(): boolean;
  /** Repli seulement, quand `pdf-lib` refuse le PDF d'origine ; null : page absente du PDF (page neuve, PC7). */
  rasterPage(asset: string, index: number): Promise<RasterPage | null>;
}
export interface ExportResult {
  readonly bytes: Uint8Array;
  readonly pages: number;
  /** Du contenu sortait d'une page PDF et a été coupé (PF20, `PDF_CUT_MESSAGE`). */
  readonly cut: boolean;
  /** Au moins une page d'origine reprise : nom `<base> annoté.pdf` (PF19). */
  readonly annotated: boolean;
  /** Au moins un PDF d'origine refusé par `pdf-lib`, ses pages reprises en image (`PDF_RASTER_MESSAGE`). */
  readonly rasterized: boolean;
  /** Repli en image sans image pour au moins une page d'origine : page neuve à la place (`PDF_RASTER_MISSING_MESSAGE`). */
  readonly rasterMissing: boolean;
}

export type Quarter = 0 | 90 | 180 | 270;
export interface Box4 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly rotate: Quarter;
}

/** /Rotate ramené à 0, 90, 180 ou 270 (sens horaire, multiple de 90). */
export const quarterOf = (angle: number): Quarter => ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Quarter;

/** Taille de la page vue (points) : CropBox, largeur et hauteur échangées à 90° et 270°. */
export function viewBox(cropBox: Box4, rotate: number): { w: number; h: number } {
  const q = quarterOf(rotate);
  return q === 90 || q === 270 ? { w: cropBox.height, h: cropBox.width } : { w: cropBox.width, h: cropBox.height };
}

/**
 * Coin bas gauche et rotation (sens trigonométrique, `drawImage` / `drawPage` de pdf-lib) d'une superposition dessinée
 * dans le repère de la page vue, posée sur une page tournée de `rotate` (/Rotate, sens horaire). Viewport de pdf.js :
 * 0° u = x − x0, v = y1 − y ; 90° u = y − y0, v = x − x0 ; 180° u = x1 − x, v = y − y0 ; 270° u = y1 − y, v = x1 − x.
 */
export function placement(cropBox: Box4, rotate: number): Placement {
  const { x, y, width, height } = cropBox;
  const q = quarterOf(rotate);
  if (q === 90) return { x: x + width, y, rotate: 90 };
  if (q === 180) return { x: x + width, y: y + height, rotate: 180 };
  if (q === 270) return { x, y: y + height, rotate: 270 };
  return { x, y, rotate: 0 };
}

/** Ce que l'export garde d'une page, lu avant le premier `await`. */
interface Snapshot {
  readonly id: string;
  readonly pdf: { readonly asset: string; readonly index: number; readonly rect: Bounds } | null;
  readonly bounds: Bounds | null;
  readonly content: boolean;
}

const outside = (b: Bounds, r: Bounds): boolean => b.x0 < r.x0 || b.y0 < r.y0 || b.x1 > r.x1 || b.y1 > r.y1;

function snapshot(doc: ExportSource): Snapshot[] {
  return doc.pageIds().map((id) => {
    const view = doc.page(id);
    const ids = doc.elementIds(id);
    const bounds = ids.length > 0 ? doc.bounds(ids) : null;
    const b = view?.backdrop ?? null;
    const pdf = b !== null && b.kind === PDF_PAGE_KIND && b.page !== null && b.rect !== null ? { asset: b.asset, index: b.page, rect: { ...b.rect } } : null;
    return { id, pdf, bounds: bounds === null ? null : { ...bounds }, content: ids.length > 0 || view?.grid?.visible === true };
  });
}

export async function exportPdf(doc: ExportSource, assets: Pick<AssetStore, "get">, deps: ExportDeps): Promise<ExportResult | null> {
  const snap = snapshot(doc);
  const lib = await deps.loadPdfLib();
  if (!deps.alive()) return null;

  /** PDF d'origine chargé une fois par asset ; null : refusé par `pdf-lib` (repli en image). */
  const sources = new Map<string, Promise<PDFDocument | null>>();
  const sourceOf = (asset: string): Promise<PDFDocument | null> => {
    const hit = sources.get(asset);
    if (hit !== undefined) return hit;
    const blob = assets.get(asset);
    if (blob === undefined) throw new Error(`PDF d'origine absent (${asset})`);
    const loaded = blob.arrayBuffer().then(
      (a) =>
        lib.PDFDocument.load(new Uint8Array(a), { updateMetadata: false })
          .then((d) => {
            // en-tête seul : `load` accepte, puis le décompte lève (TypeError « Pages ») ; 0 page : refus aussi
            return d.getPageCount() > 0 ? d : null;
          })
          .catch(() => null),
      () => null,
    );
    sources.set(asset, loaded);
    return loaded;
  };

  /**
   * Pages à recopier d'un asset, par position dans le document : un seul `copyPages` pour toutes (un copieur par appel
   * dans pdf-lib 1.17.1 : page à page, polices et XObjects partagés seraient recopiés pour chaque page). Si le bloc
   * échoue (une page abîmée), page par page : seule la page abîmée tombe en repli.
   */
  const copies = new Map<string, Promise<Map<number, PDFPage>>>();
  const copiesOf = (asset: string, src: PDFDocument): Promise<Map<number, PDFPage>> => {
    const hit = copies.get(asset);
    if (hit !== undefined) return hit;
    const wanted = snap.flatMap((q, pos) => (q.pdf !== null && q.pdf.asset === asset && q.pdf.index < src.getPageCount() ? [{ pos, index: q.pdf.index }] : []));
    const run = async (): Promise<Map<number, PDFPage>> => {
      const result = new Map<number, PDFPage>();
      try {
        const all = await out.copyPages(src, wanted.map((w) => w.index));
        for (const [i, w] of wanted.entries()) {
          const c = all[i];
          if (c === undefined) throw new Error(`page ${w.index + 1} illisible dans le PDF d'origine`);
          result.set(w.pos, c);
        }
      } catch {
        result.clear();
        for (const w of wanted) {
          try {
            const [c] = await out.copyPages(src, [w.index]);
            if (c !== undefined) result.set(w.pos, c);
          } catch {
            // page abîmée : absente du résultat, repli en image
          }
        }
      }
      return result;
    };
    const started = run();
    copies.set(asset, started);
    return started;
  };

  const out = await lib.PDFDocument.create({ updateMetadata: false });
  const pages: PDFPage[] = [];
  const requests: OverlayRequest[] = [];
  const requestOf = new Map<number, number>();
  let cut = false;
  let annotated = false;
  let rasterized = false;
  let rasterMissing = false;
  for (const [k, p] of snap.entries()) {
    if (!deps.alive()) return null;
    let page: PDFPage | null = null;
    if (p.pdf !== null) {
      const src = await sourceOf(p.pdf.asset);
      let refused = src === null;
      if (src !== null && p.pdf.index < src.getPageCount()) {
        const copied = (await copiesOf(p.pdf.asset, src)).get(k);
        if (copied === undefined) refused = true; // PDF chargé mais abîmé : même repli qu'un refus de `load`
        else page = out.addPage(copied);
      }
      if (refused) {
        if (!deps.alive()) return null;
        const raster = await deps.rasterPage(p.pdf.asset, p.pdf.index);
        if (raster !== null) {
          page = out.addPage([raster.w, raster.h]);
          page.drawImage(await out.embedPng(raster.png), { x: 0, y: 0, width: raster.w, height: raster.h });
          rasterized = true;
        } else {
          rasterMissing = true; // page d'origine non rendue : page neuve ci-dessous, mais signalée
        }
      }
    }
    const kept = page !== null && p.pdf !== null;
    const rect = kept && p.pdf !== null ? p.pdf.rect : { x0: 0, y0: 0, x1: PAGE_WIDTH, y1: Math.max(PAGE_HEIGHT, p.bounds?.y1 ?? 0) };
    if (page === null) page = out.addPage([NEW_PAGE_WIDTH, ((rect.y1 - rect.y0) * NEW_PAGE_WIDTH) / PAGE_WIDTH]);
    annotated ||= kept;
    cut ||= kept && p.bounds !== null && outside(p.bounds, rect);
    pages.push(page);
    if (p.content) {
      requestOf.set(k, requests.length);
      requests.push({ pageId: p.id, rect, box: viewBox(page.getCropBox(), page.getRotation().angle) });
    }
  }

  if (!deps.alive()) return null;
  const overlays = requests.length > 0 ? await deps.overlay.pages(requests) : [];
  if (!deps.alive()) return null;
  // Un `embedPages` par jeu d'octets (un seul copieur : ressources partagées embarquées une fois)
  const groups = new Map<Uint8Array, { src: PDFDocument; items: { k: number; index: number }[] }>();
  for (const [k] of pages.entries()) {
    const i = requestOf.get(k);
    const o = i === undefined ? null : (overlays[i] ?? null);
    if (o === null || o.kind !== "pdf") continue;
    let g = groups.get(o.bytes);
    if (g === undefined) {
      g = { src: await lib.PDFDocument.load(o.bytes, { updateMetadata: false }), items: [] };
      groups.set(o.bytes, g);
    }
    g.items.push({ k, index: o.index });
  }
  const forms = new Map<number, Awaited<ReturnType<PDFDocument["embedPage"]>>>();
  for (const g of groups.values()) {
    const embeddedPages = await out.embedPages(g.items.map((it) => g.src.getPage(it.index)));
    for (const [n, it] of g.items.entries()) {
      const f = embeddedPages[n];
      if (f !== undefined) forms.set(it.k, f);
    }
  }
  for (const [k, page] of pages.entries()) {
    const i = requestOf.get(k);
    if (i === undefined) continue;
    const o = overlays[i] ?? null;
    const r = requests[i];
    if (o === null || r === undefined) continue;
    const at = placement(page.getCropBox(), page.getRotation().angle);
    const where = { x: at.x, y: at.y, width: r.box.w, height: r.box.h, rotate: lib.degrees(at.rotate) };
    if (o.kind === "png") {
      page.drawImage(await out.embedPng(o.bytes), where);
    } else {
      const form = forms.get(k);
      if (form !== undefined) page.drawPage(form, where);
    }
  }
  const bytes = await out.save({ useObjectStreams: false });
  if (!deps.alive()) return null;
  return { bytes, pages: pages.length, cut, annotated, rasterized, rasterMissing };
}
