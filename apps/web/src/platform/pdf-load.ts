/**
 * Chargement réel de `pdf.js` et de `pdf-lib` (C12, PF11, PF21) : `import()` au premier besoin, comme
 * `container-load.ts`. Importé par l'amorce seule : aucun test ne résout `pdfjs-dist` ni `pdf-lib` par ce fichier.
 * Ressources locales (`./pdfjs/…`, copiées par `vite.config.ts`),
 * Worker propre (`pdf-worker.ts`) passé par `GlobalWorkerOptions.workerPort` : aucune URL distante, aucun `?url`.
 */
import type { PdfjsBinding, PdfjsDocument } from "./pdf-render";

export const PDFJS_BASE = "./pdfjs/";

interface PdfjsLoadingTask {
  readonly promise: Promise<object>;
  destroy(): Promise<void>;
}

/**
 * pdf.js porte `destroy()` sur la tâche de chargement, pas sur le document rendu : on la greffe sur le document
 * pour que `PdfjsDocument.destroy()` libère aussi le Worker et la mémoire.
 */
export async function openPdfDocument(
  getDocument: (params: { data: Uint8Array } & Record<string, unknown>) => PdfjsLoadingTask,
  data: Uint8Array,
  options: Record<string, unknown>,
): Promise<PdfjsDocument> {
  const task = getDocument({ data, ...options });
  const doc = await task.promise;
  return Object.assign(doc, { destroy: () => task.destroy() }) as unknown as PdfjsDocument;
}

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
    open: (data) => openPdfDocument((p) => pdfjs.getDocument(p), data, options),
    isPasswordError: (e) => e instanceof pdfjs.PasswordException || (e as { name?: unknown } | null)?.name === "PasswordException",
  };
}

export async function loadPdfLib(): Promise<typeof import("pdf-lib")> {
  return import("pdf-lib");
}
