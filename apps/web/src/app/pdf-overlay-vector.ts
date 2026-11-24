/**
 * Producteur vectoriel de la superposition (C12, PF22, DAPF4, lot c) : `paintContent` (même code que l'écran, D7)
 * enregistré par `RecordingContext2D`, une page `krilla` par requête (taille = boîte vue, échelle = points par unité),
 * écrite dans un Worker jetable du module `formats` (`write_pdf_pages`, `runOnce`). Même interface que le producteur PNG
 * (`pdf-overlay.ts`) : ids lus avant le premier `await`, `deps.alive()` relu avant chaque dessin. Images citées passées
 * en PNG ou JPEG, les autres converties en PNG ; Liberation Sans en quatre faces (HPF1-5). Page sans dessin : null
 * (pdf-lib refuse d'embarquer une page vide). `fallbackOverlay` garde le PNG en repli (PC14).
 *
 * Jamais d'instance du module `formats` gardée dans la page (à l'inverse de `createPageCodec`) : une panique de `krilla`
 * casserait celle qui enregistre les `.roomboard` (HR6). Un Worker neuf par export, arrêté après la réponse.
 */
import type { CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { ImageSource } from "../engine/render/image-cache";
import { Canvas2DRenderer, exportPainterOptions } from "../engine/render/canvas2d";
import { RecordingContext2D, RecordingPath, type RecordedList } from "../engine/render/record-ctx";
import type { PdfJob } from "../platform/container";
import { runOnce, type WorkerLike } from "../platform/one-shot-worker";
import { typed } from "./container-io";
import type { Overlay, OverlayProducer } from "./pdf-export";
import type { ContentPainter } from "./pdf-overlay";

export const PDF_WORKER_TIMEOUT_MS = 60_000;
export const PDF_WRITE_FAILED_MESSAGE = "écriture du PDF interrompue";
/** Faces 0 normal, 1 gras, 2 italique, 3 gras italique (table de T11), servies sous `./pdfjs/standard_fonts/` (T3). */
export const PDF_FONT_FILES = ["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf", "LiberationSans-Italic.ttf", "LiberationSans-BoldItalic.ttf"] as const;

export type PdfWriter = (list: RecordedList, fonts: readonly Uint8Array[], images: readonly Uint8Array[]) => Promise<Uint8Array>;

export interface VectorOverlayDeps {
  readonly doc: Pick<CoreDocument, "elementIds" | "citedAssets">;
  readonly assets: Pick<AssetStore, "get">;
  /** Faux dès que l'onglet est fermé : plus aucun dessin (il relirait le document libéré). */
  alive(): boolean;
  /** Vrai contexte : couleurs normalisées et `measureText` (mêmes lignes qu'à l'écran). */
  readonly measure: Pick<CanvasRenderingContext2D, "fillStyle" | "font" | "measureText">;
  painter(ctx: CanvasRenderingContext2D, images: ImageSource): ContentPainter;
  fonts(): Promise<readonly Uint8Array[]>;
  /** Image d'un autre type que PNG ou JPEG convertie en PNG (décodage du navigateur). */
  toPng(blob: Blob, mime: string): Promise<Uint8Array>;
  readonly write: PdfWriter;
}

const cat = (xs: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(xs.reduce((n, x) => n + x.length, 0));
  let at = 0;
  for (const x of xs) {
    out.set(x, at);
    at += x.length;
  }
  return out;
};

/** Écriture dans un Worker jetable (patron C10b, `runOnce`) ; réponse `{ bytes }` ou `{ error }`. Octets copiés : la
 *  liste de l'appelant n'est pas détachée par le transfert. */
export function workerPdfWriter(spawn: () => WorkerLike): PdfWriter {
  return (list, fonts, images) => {
    const job: PdfJob = {
      ops: list.ops.slice(),
      texts: [...list.texts],
      fonts: cat(fonts),
      fontSizes: Uint32Array.from(fonts.map((f) => f.length)),
      images: cat(images),
      imageSizes: Uint32Array.from(images.map((i) => i.length)),
    };
    return runOnce(
      spawn,
      job,
      [job.ops.buffer, job.fonts.buffer, job.images.buffer],
      PDF_WORKER_TIMEOUT_MS,
      (d) => {
        const r = typeof d === "object" && d !== null ? (d as { bytes?: unknown; error?: unknown }) : {};
        if (r.bytes instanceof Uint8Array) return r.bytes;
        throw new Error(typeof r.error === "string" ? r.error : PDF_WRITE_FAILED_MESSAGE);
      },
      PDF_WRITE_FAILED_MESSAGE,
    );
  };
}

/** Peintre du contenu pour la superposition vectorielle (cli-lot3, D37) : celui de l'écran, chemins enregistrés
 *  (`RecordingPath`, aucun `Path2D`) ; seule définition, l'amorce de la page et la CLI l'appellent. */
export function vectorPainter(doc: CoreDocument): VectorOverlayDeps["painter"] {
  return (ctx, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images, { makePath: () => new RecordingPath() as unknown as Path2D }));
}

/** Jeton d'une image citée : `drawImage` l'enregistre tel quel, ses octets sont lus après le dessin. */
interface Token {
  readonly asset: string;
  readonly mime: string;
}

export function createVectorOverlay(deps: VectorOverlayDeps): OverlayProducer {
  return {
    async pages(requests) {
      // Document lu ici seulement, sans `await` : ids, images citées, puis le dessin de chaque page.
      const views = requests.map((r) => ({ r, page: { id: r.pageId, elementIds: deps.doc.elementIds(r.pageId) } }));
      const tokens = new Map<string, Token>();
      for (const a of deps.doc.citedAssets()) {
        if (a.mime.startsWith("image/") && deps.assets.get(a.id) !== undefined) tokens.set(a.id, { asset: a.id, mime: a.mime });
      }
      const images: ImageSource = { bitmap: (id) => (tokens.get(id) as unknown as CanvasImageSource | undefined) ?? null };
      const rec = new RecordingContext2D(deps.measure);
      const ctx = rec as unknown as CanvasRenderingContext2D;
      const painter = deps.painter(ctx, images);
      for (const { r, page } of views) {
        rec.page(r.box.w, r.box.h);
        if (deps.alive()) painter.paintContent(ctx, page, r.rect, r.box.w / (r.rect.x1 - r.rect.x0));
      }
      const list = rec.encode();
      if (list.drawn.every((n) => n === 0)) return requests.map(() => null);
      const bytes: Uint8Array[] = [];
      for (const t of list.images as readonly Token[]) {
        const blob = deps.assets.get(t.asset);
        if (blob === undefined) throw new Error(`image ${t.asset} absente`);
        bytes.push(t.mime === "image/png" || t.mime === "image/jpeg" ? new Uint8Array(await blob.arrayBuffer()) : await deps.toPng(typed(blob, t.mime), t.mime));
      }
      const pdf = await deps.write(list, await deps.fonts(), bytes);
      return requests.map((_, k): Overlay | null => ((list.drawn[k] ?? 0) === 0 ? null : { kind: "pdf", bytes: pdf, index: k }));
    },
  };
}

/** Vecteur d'abord, PNG en repli (PC14) : écrivain absent, panique, délai, image illisible. */
export function fallbackOverlay(primary: OverlayProducer, secondary: OverlayProducer): OverlayProducer {
  return {
    async pages(requests) {
      try {
        return await primary.pages(requests);
      } catch (e) {
        console.warn(`RoomBoard : superposition vectorielle impossible, image à la place (${e instanceof Error ? e.message : String(e)})`);
        return secondary.pages(requests);
      }
    },
  };
}
