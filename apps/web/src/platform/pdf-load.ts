/**
 * Chargement réel de `pdf.js` et de `pdf-lib` (C12, PF11, PF21) : `import()` au premier besoin, comme
 * `container-load.ts`. Importé par l'amorce seule : aucun test ne résout `pdfjs-dist` ni `pdf-lib` par ce fichier.
 * Ressources locales (`./pdfjs/…`, copiées par `vite.config.ts`),
 * Worker propre (`pdf-worker.ts`) passé par `GlobalWorkerOptions.workerPort` : aucune URL distante, aucun `?url`.
 */
import type { PdfjsBinding, PdfjsDocument } from "./pdf-render";

export const PDFJS_BASE = "./pdfjs/";

export async function loadPdfjs(): Promise<PdfjsBinding> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (pdfjs.GlobalWorkerOptions.workerPort === null) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("./pdf-worker.ts", import.meta.url), { type: "module" });
  }
  const dir = (name: string): string => new URL(`${PDFJS_BASE}${name}/`, document.baseURI).href;
  const options = {
    cMapUrl: dir("cmaps"),
    cMapPacked: true,
    standardFontDataUrl: dir("standard_fonts"),
    wasmUrl: dir("wasm"),
  };
  return {
    open: async (data) => (await pdfjs.getDocument({ data, ...options }).promise) as unknown as PdfjsDocument,
    isPasswordError: (e) => e instanceof pdfjs.PasswordException || (e as { name?: unknown } | null)?.name === "PasswordException",
  };
}

export async function loadPdfLib(): Promise<typeof import("pdf-lib")> {
  return import("pdf-lib");
}
