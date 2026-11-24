import { PDFDict, PDFDocument, PDFName, PDFStream, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pdfPages, readPdf } from "../../../../scripts/essais/fabriques/pdf.mjs";

const FONTS = new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href;

describe("fabriques PDF (cli-lot3, D43)", () => {
  it("fabriques PDF — pdfPages : 3 pages 612 × 792 ; readPdf : 3 pages, « RoomBoard page i » sur la page i, aucune superposition, tampon non détaché", async () => {
    const bytes = await pdfPages({ PDFDocument, StandardFonts });
    const size = bytes.byteLength;
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const r = await readPdf(bytes, { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl: FONTS });
    expect(r.pages).toBe(3);
    expect(r.texts.map((t, i) => t.includes(`RoomBoard page ${i + 1}`))).toEqual([true, true, true]);
    expect(r.overlays).toEqual([[], [], []]);
    expect(bytes.byteLength).toBe(size);
    expect((await PDFDocument.load(bytes)).getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });
  it("fabriques PDF — pdfPages(lib, 501, « P ») : 501 pages, libellé donné", async () => {
    const bytes = await pdfPages({ PDFDocument, StandardFonts }, 501, "P");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(501);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const one = await pdfPages({ PDFDocument, StandardFonts }, 1, "P");
    expect((await readPdf(one, { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl: FONTS })).texts[0]).toContain("P 1");
  });
});
