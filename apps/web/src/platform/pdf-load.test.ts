import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { openPdfDocument } from "./pdf-load";

describe("pdf-load : ouverture d'un document pdf.js", () => {
  it("rend un document dont destroy() libère la tâche de chargement sans erreur", async () => {
    const lib = await PDFDocument.create();
    lib.addPage([200, 100]);
    const bytes = await lib.save();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await openPdfDocument((p) => pdfjs.getDocument(p), bytes.slice(), {});
    expect(doc.numPages).toBe(1);
    await expect(doc.destroy()).resolves.toBeUndefined();
  });

  it("PDF invalide : la tâche de chargement est détruite et l'erreur d'origine est rendue (relecture T16)", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    let destroyed = 0;
    const open = openPdfDocument(
      (p) => {
        const task = pdfjs.getDocument(p);
        const destroy = task.destroy.bind(task);
        return { promise: task.promise, destroy: () => (destroyed++, destroy()) };
      },
      new Uint8Array([1, 2, 3, 4]),
      {},
    );
    await expect(open).rejects.toMatchObject({ name: "InvalidPDFException" });
    expect(destroyed).toBe(1);
  });
});
