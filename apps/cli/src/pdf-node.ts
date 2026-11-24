/**
 * PDF dans le processus de la CLI (cadrage cli-lot3, D32, D33, D37, D38, D39, D48, DA12, DA13, DA15).
 * - pdf.js : le module de worker de pdf.js (celui que `platform/pdf-worker.ts` charge dans le Worker de la page) posé sur
 *   `globalThis.pdfjsWorker`, voie que pdf.js prévoit pour tourner dans le processus ; lien par `pdfjsBinding` (partagé
 *   avec la page) ; moteur par `createPdfEngine` avec un `PdfDom` qui lève : aucun canvas, aucun rendu (D33).
 *   `GlobalWorkerOptions` n'est pas touché : sous Node, pdf.js y met `./pdf.worker.mjs`, relatif à son propre fichier,
 *   introuvable dans le fichier construit ; le worker posé avant tout document l'emporte.
 * - krilla : `pdfJobReply` (corps du Worker de la page) joué par `inlineWorker` ; une panique (`RuntimeError`, seule
 *   relancée) appelle `onPanic` (D29 : plus aucune écriture dans le processus). Patron : `board-node.ts`.
 * - Superposition : `createVectorOverlay` du produit, peintre `vectorPainter`, mesure sans canvas (couleurs par
 *   `tryParseColor`, largeur par `measureOrFallback(null)`, H25, H26), polices Liberation lues dans `pdfjs-dist`
 *   installé, jamais copiées (D48). Pas de repli en image : un échec lève, suffixé de `NO_RASTER_SUFFIX` (D39).
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { OverlayProducer } from "../../web/src/app/pdf-export";
import { createVectorOverlay, PDF_FONT_FILES, vectorPainter, workerPdfWriter, type PdfWriter } from "../../web/src/app/pdf-overlay-vector";
import type { CoreDocument } from "../../web/src/core/api";
import type { AssetStore } from "../../web/src/core/asset-store";
import type { PdfEngine } from "../../web/src/engine/render/pdf-port";
import { tryParseColor } from "../../web/src/engine/render/webgl2";
import { measureOrFallback } from "../../web/src/engine/text-layout";
import { pdfJobReply, type FormatsBinding, type PdfJob } from "../../web/src/platform/container";
import { messageOf } from "../../web/src/platform/controller";
import { inlineWorker } from "../../web/src/platform/one-shot-worker";
import { pdfjsBinding } from "../../web/src/platform/pdf-load";
import { createPdfEngine, type PdfDom, type PdfjsBinding } from "../../web/src/platform/pdf-render";

export const NO_RENDER_MESSAGE = "rendu en image indisponible dans la CLI";
/** D39 : suffixe du message quand la page aurait pris un repli en image. */
export const NO_RASTER_SUFFIX = " (repli en image indisponible dans la CLI)";

/** pdf.js joué dans le processus (D32) : worker posé une fois, puis le module principal ; documents à `verbosity: 0`. */
export async function loadNodePdfjs(): Promise<PdfjsBinding> {
  const g = globalThis as { pdfjsWorker?: unknown };
  g.pdfjsWorker ??= await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsBinding(pdfjs, { verbosity: 0 });
}

/** Aucun rendu en image dans la CLI (D33) : `renderTile` n'est jamais appelé ; s'il l'était, il lève. */
export const NO_RENDER: PdfDom = {
  tile() {
    throw new Error(NO_RENDER_MESSAGE);
  },
};

export function nodePdfEngine(): PdfEngine {
  return createPdfEngine(loadNodePdfjs, NO_RENDER);
}

const channel = (c: number): number => Math.round(c * 255);

/**
 * Contexte de mesure sans canvas (D37) : `fillStyle` normalisé comme un canvas (`#rrggbb` opaque, sinon
 * `rgba(r, g, b, a)`), écriture illisible (couleur nommée, H25) : la précédente reste ; `measureText` par le repli
 * `0,6 × taille × longueur` (H26), taille lue dans `font`.
 */
export function nodeMeasureContext(): Pick<CanvasRenderingContext2D, "fillStyle" | "font" | "measureText"> {
  const measure = measureOrFallback(null);
  let fill = "#000000";
  return {
    font: "10px sans-serif",
    get fillStyle(): string {
      return fill;
    },
    set fillStyle(v: string | CanvasGradient | CanvasPattern) {
      const c = typeof v === "string" ? tryParseColor(v) : null;
      if (c === null) return;
      const [r, g, b, a] = c;
      fill = a === 1 ? `#${[r, g, b].map((x) => channel(x).toString(16).padStart(2, "0")).join("")}` : `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${a})`;
    },
    measureText(text: string): TextMetrics {
      const size = /(\d+(?:\.\d+)?)px/.exec(this.font);
      return { width: measure(text, size === null ? 10 : Number(size[1])) } as TextMetrics;
    },
  };
}

/** Dossier `standard_fonts/` du `pdfjs-dist` installé (dépendance de la CLI, D44, D48). */
export function pdfjsFontsDir(): string {
  return join(dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")), "standard_fonts");
}

/** Les quatre faces de `PDF_FONT_FILES`, lues une fois (D48) ; absente : « police <f> absente », relue au prochain appel. */
export function nodePdfFonts(dir?: string): () => Promise<readonly Uint8Array[]> {
  let loaded: Promise<readonly Uint8Array[]> | null = null;
  return () =>
    (loaded ??= (async () => {
      const from = dir ?? pdfjsFontsDir();
      return Promise.all(
        PDF_FONT_FILES.map(async (f) => {
          try {
            return new Uint8Array(await readFile(join(from, f)));
          } catch {
            throw new Error(`police ${f} absente`);
          }
        }),
      );
    })().catch((e: unknown) => {
      loaded = null;
      throw e;
    }));
}

/** krilla dans le processus (D38) : `pdfJobReply` par `inlineWorker` ; panique → `onPanic` (D29). */
export function nodePdfWriter(formats: () => Promise<FormatsBinding>, onPanic: () => void): PdfWriter {
  return workerPdfWriter(
    inlineWorker(async (m) => {
      const mod = await formats(); // hors du `try` : un module absent n'est pas une panique (board-node.ts)
      try {
        return pdfJobReply(mod, m as PdfJob);
      } catch (e) {
        onPanic(); // seule une RuntimeError sort de pdfJobReply
        throw e;
      }
    }),
  );
}

const SHARED_FONTS = nodePdfFonts();

/**
 * Superposition vectorielle de la CLI (D37) : `createVectorOverlay` du produit ; image autre que PNG ou JPEG : lève
 * (lot 4, H24) ; tout échec lève « superposition vectorielle impossible (…) (repli en image indisponible dans la CLI) ».
 */
export function nodeOverlay(doc: CoreDocument, assets: Pick<AssetStore, "get">, write: PdfWriter, fonts: () => Promise<readonly Uint8Array[]> = SHARED_FONTS): OverlayProducer {
  const vector = createVectorOverlay({
    doc,
    assets,
    alive: () => true,
    measure: nodeMeasureContext(),
    painter: vectorPainter(doc),
    fonts,
    toPng: async (_blob, mime) => {
      throw new Error(`image ${mime} : conversion en PNG indisponible dans la CLI (lot 4)`);
    },
    write,
  });
  return {
    async pages(requests) {
      try {
        return await vector.pages(requests);
      } catch (e) {
        throw new Error(`superposition vectorielle impossible (${messageOf(e)})${NO_RASTER_SUFFIX}`);
      }
    },
  };
}
