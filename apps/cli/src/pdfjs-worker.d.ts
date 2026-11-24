// Types du module de worker de pdf.js (pdfjs-dist 6.5.438 n'en livre pas) : la CLI le pose sur `globalThis.pdfjsWorker`
// (cadrage cli-lot3, D32, D44).
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}
