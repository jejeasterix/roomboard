// Fabriques des PDF d'essai (cadrage cli-lot3, D43), déplacées de c12-pdf-navigateur.mjs : pdf-lib et pdf.js injectés,
// aucun PDF suivi ni téléchargé. Lues par c12-pdf-navigateur.mjs, les tests de apps/cli et cli-essai.mjs.

/** PDF de `n` pages 612 × 792, « <label> i » en Helvetica 36 sur la page i. */
export async function pdfPages(lib, n = 3, label = "RoomBoard page") {
  const d = await lib.PDFDocument.create();
  const font = await d.embedFont(lib.StandardFonts.Helvetica);
  for (let i = 1; i <= n; i++) d.addPage([612, 792]).drawText(`${label} ${i}`, { x: 72, y: 700, size: 36, font });
  return d.save();
}

/**
 * Relecture : pages et texte par pdf.js (sur une copie : pdf.js détache le tampon reçu, H34), sous-types des XObject de
 * chaque page par pdf-lib (`/Form` : superposition vectorielle ; `/Image` : repli PNG).
 */
export async function readPdf(bytes, libs) {
  const { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl } = libs;
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0, ...(standardFontDataUrl === undefined ? {} : { standardFontDataUrl }) });
  const doc = await task.promise;
  const texts = [];
  for (let i = 1; i <= doc.numPages; i++) texts.push((await (await doc.getPage(i)).getTextContent()).items.map((it) => it.str ?? "").join(""));
  const pages = doc.numPages;
  await task.destroy();
  const overlays = (await PDFDocument.load(bytes)).getPages().map((p) => {
    const xo = p.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    return xo ? xo.keys().map((k) => String(xo.lookup(k, PDFStream).dict.get(PDFName.of("Subtype")))) : [];
  });
  return { pages, texts, overlays };
}

/**
 * Bibliothèques de `readPdf` : pdf.js et pdf-lib résolus par `web` (le `require` d'apps/web, jamais copiés), polices
 * de pdfjs-dist. `worker` : importe d'abord le worker de pdf.js, qui pose `globalThis.pdfjsWorker` (relecture dans le
 * processus, cli-essai.mjs) ; c12-pdf-navigateur.mjs s'en passe.
 */
export async function readLibs(web, { worker = false } = {}) {
  const { pathToFileURL } = await import("node:url");
  const { dirname, join, sep } = await import("node:path");
  const href = (id) => pathToFileURL(web.resolve(id)).href;
  if (worker) await import(href("pdfjs-dist/legacy/build/pdf.worker.mjs"));
  const pdfjs = await import(href("pdfjs-dist/legacy/build/pdf.mjs"));
  const { PDFDocument, PDFName, PDFDict, PDFStream } = web("pdf-lib");
  return { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl: pathToFileURL(join(dirname(web.resolve("pdfjs-dist/package.json")), "standard_fonts") + sep).href };
}
