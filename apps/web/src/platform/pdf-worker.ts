/**
 * Worker de `pdf.js` (C12, PF11, PC4) : module local qui charge le worker `legacy` ; celui-ci s'amorce seul sur `self`
 * (`WorkerMessageHandler.initializeFromPort`). Créé par `loadPdfjs` (`pdf-load.ts`), jamais par un test.
 */
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
