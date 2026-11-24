/**
 * PDF sans onglet (cadrage cli-lot3, DA11, D35, D36) : lecture d'un PDF en document (`readPdfFile`) et écriture d'un
 * PDF annoté (`writePdfFile`), code déplacé tel quel de `workspace.ts` (`openPdf`, `exportPdf`). La page garde onglets,
 * `exporting`, boîte d'enregistrement, nom proposé et avis ; la CLI (`apps/cli`) appelle les mêmes fonctions.
 * Constats ouverts emportés tels quels (`typed`, BoardSources) : ni corrigés ni aggravés.
 */
import { PDF_MAX_PAGES, type AssetRef, type CoreDocument, type CoreFactory, type PdfPageSize } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { PdfEngine, PdfFile } from "../engine/render/pdf-port";
import { APP_VERSION, messageOf } from "../platform/controller";
import { PDF_EXTENSION, PDF_MIME, ROOMBOARD_EXTENSION } from "../platform/files";
import { openFailedMessage } from "../platform/messages";
import { officeMimeOf, officeStemOf } from "../platform/office-import";
import { PDF_ENCRYPTED_MESSAGE, PdfEncryptedError } from "../platform/pdf-render";
import { stem } from "./board-files";
import { typed } from "./container-io";
import { exportPdf as assemblePdf, PDF_CUT_MESSAGE, PDF_RASTER_MESSAGE, PDF_RASTER_MISSING_MESSAGE, type ExportResult, type OverlayProducer, type PdfLib, type RasterPage } from "./pdf-export";

/** C12 : avis de l'import PDF (PF7) ; réexportés par `workspace.ts`. */
export const PDF_NO_PAGE_MESSAGE = "PDF sans page";
export const pdfFirstPagesMessage = (name: string, total: number): string => `${name} : ${PDF_MAX_PAGES} premières pages importées sur ${total}`;

export interface PdfSource {
  /** Nom affiché (jamais un chemin : l'appelant passe le nom de base). */
  readonly name: string;
  readonly blob: Blob;
  /** C16 (O5) : original Office d'un PDF converti, gardé en asset. */
  readonly original?: Blob;
}
export interface PdfReadDeps {
  readonly core: CoreFactory;
  readonly pdf: PdfEngine;
  makeAssets(): AssetStore;
}
export interface PdfRead {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  /** `<racine>.roomboard` (onglet de la page, PF10). */
  readonly tabName: string;
  /** Avis d'ouverture (« 500 premières pages », PF7), dans l'ordre du produit. */
  readonly warnings: string[];
}

const failed = (name: string, why: string): Error => new Error(openFailedMessage(name, why));

/**
 * Rejette avec le message complet du produit (chiffré, illisible, sans page), un seul préfixe : l'appelant le dit tel
 * quel, sans rien ajouter. Le `PdfFile` est toujours détruit.
 */
export async function readPdfFile(file: PdfSource, deps: PdfReadDeps): Promise<PdfRead> {
  const name = file.name;
  let opened: PdfFile;
  try {
    opened = await deps.pdf.open(file.blob);
  } catch (e) {
    throw e instanceof PdfEncryptedError ? new Error(`${name} : ${PDF_ENCRYPTED_MESSAGE}`) : failed(name, messageOf(e));
  }
  try {
    const total = opened.pageCount;
    if (total === 0) throw failed(name, PDF_NO_PAGE_MESSAGE); // hors du `catch` ci-dessous : jamais deux préfixes
    try {
      const sizes: PdfPageSize[] = [];
      for (let i = 0; i < Math.min(total, PDF_MAX_PAGES); i++) sizes.push(await opened.pageSize(i));
      const assets = deps.makeAssets();
      const blob = typed(file.blob, PDF_MIME);
      // C16 (O5, O16) : PDF converti nommé `<racine>.pdf`, original gardé (nom et type Office), onglet `<racine>.roomboard`.
      const original = file.original;
      const root = original === undefined ? stem(name, PDF_EXTENSION) : officeStemOf(name);
      const id = await assets.put(blob);
      const pdfRef: AssetRef = { id, name: original === undefined ? name : `${root}${PDF_EXTENSION}`, mime: PDF_MIME, size: blob.size };
      let originalRef: AssetRef | undefined;
      if (original !== undefined) {
        const ob = typed(original, officeMimeOf(name));
        originalRef = { id: await assets.put(ob), name, mime: ob.type, size: ob.size };
      }
      const doc = deps.core.fromPdfPages(pdfRef, sizes, originalRef);
      return { doc, assets, tabName: `${root}${ROOMBOARD_EXTENSION}`, warnings: total > PDF_MAX_PAGES ? [pdfFirstPagesMessage(name, total)] : [] };
    } catch (e) {
      throw failed(name, messageOf(e));
    }
  } finally {
    opened.destroy(); // l'onglet rouvre le PDF au premier dessin (PC11, HPF2-10)
  }
}

export interface PdfWriteDeps {
  readonly core: CoreFactory;
  now(): string;
  loadPdfLib(): Promise<PdfLib>;
  /** Superposition du contenu de `copy`, la copie prise au départ (DAPF3). */
  overlay(copy: CoreDocument): OverlayProducer;
  /** Faux dès que l'onglet est fermé : l'export rend null. */
  alive(): boolean;
  /** Repli en image d'une page que pdf-lib refuse (page seulement) ; absent : `rasterMissing`. */
  rasterPage?(blob: Blob, index: number): Promise<RasterPage | null>;
  /** Fin de l'assemblage (réussi, refusé ou en erreur) : libère ce que `rasterPage` a gardé ouvert ; une fois. */
  rasterClose?(): void;
}
export type PdfWritten = ExportResult & { readonly notices: readonly string[] };

/** Copie du document (DAPF3), assemblage par `exportPdf`, avis dans l'ordre du produit ; null : onglet fermé. */
export async function writePdfFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, deps: PdfWriteDeps): Promise<PdfWritten | null> {
  let copy: CoreDocument | null = null;
  let rasterClosed = false;
  /** Sessions de rendu ouvertes par `rasterPage` : fermées dès l'assemblage fini (avant l'enregistrement, long), une fois. */
  const closeRaster = (): void => {
    if (rasterClosed) return;
    rasterClosed = true;
    deps.rasterClose?.();
  };
  try {
    // Copie prise au départ (DAPF3) : fermer l'onglet pendant l'export libère son document, pas celle-ci.
    const [manifest, ybin] = doc.saveParts(deps.now(), APP_VERSION);
    const own = deps.core.loadParts(manifest, ybin);
    copy = own;
    const blobs = new Map<string, Blob>(); // un seul `Blob` par asset pendant l'export : `rasterPage` ouvre le PDF une fois
    const r = await assemblePdf(own, assets, {
      loadPdfLib: () => deps.loadPdfLib(),
      overlay: deps.overlay(own),
      alive: () => deps.alive(),
      rasterPage: async (asset, index) => {
        const blob = blobs.get(asset) ?? assets.get(asset);
        if (blob !== undefined) blobs.set(asset, blob);
        return blob === undefined || deps.rasterPage === undefined ? null : deps.rasterPage(blob, index);
      },
    });
    closeRaster();
    if (r === null) return null;
    const notices: string[] = [];
    if (r.rasterized) notices.push(PDF_RASTER_MESSAGE);
    if (r.rasterMissing) notices.push(PDF_RASTER_MISSING_MESSAGE);
    if (r.cut) notices.push(PDF_CUT_MESSAGE);
    return { ...r, notices };
  } finally {
    copy?.free();
    closeRaster(); // même en cas d'erreur
  }
}
