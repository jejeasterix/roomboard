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
