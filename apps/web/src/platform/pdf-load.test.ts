import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { openPdfDocument, pdfjsBinding } from "./pdf-load";

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

describe("pdfjsBinding (cli-lot3, D32)", () => {
  it("pdfjsBinding — open : getDocument reçoit les données et les options ; destroy libère la tâche", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const seen: Record<string, unknown>[] = [];
    const binding = pdfjsBinding(
      {
        getDocument: (p) => {
          seen.push(p);
          return pdfjs.getDocument(p);
        },
        PasswordException: pdfjs.PasswordException,
      },
      { verbosity: 0 },
    );
    const lib = await PDFDocument.create();
    lib.addPage([200, 100]);
    const doc = await binding.open((await lib.save()).slice());
    expect(doc.numPages).toBe(1);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ verbosity: 0 });
    expect(seen[0]?.["data"]).toBeInstanceOf(Uint8Array);
    await expect(doc.destroy()).resolves.toBeUndefined();
  });
  it("pdfjsBinding — isPasswordError : instance de la classe donnée ou nom « PasswordException » ; toute autre erreur : faux", () => {
    class Pwd extends Error {}
    const binding = pdfjsBinding(
      {
        getDocument: () => {
          throw new Error("non appelé");
        },
        PasswordException: Pwd,
      },
      {},
    );
    expect(binding.isPasswordError(new Pwd("x"))).toBe(true);
    expect(binding.isPasswordError({ name: "PasswordException" })).toBe(true);
    expect(binding.isPasswordError(new Error("x"))).toBe(false);
    expect(binding.isPasswordError(null)).toBe(false);
  });
});
