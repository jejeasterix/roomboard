import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, CoreFactory } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { PdfEngine, PdfFile, TileBitmap } from "../engine/render/pdf-port";
import { officeMimeOf } from "../platform/office-import";
import { PdfEncryptedError } from "../platform/pdf-render";
import { PDF_CUT_MESSAGE, PDF_RASTER_MESSAGE, PDF_RASTER_MISSING_MESSAGE, type OverlayProducer, type PdfLib } from "./pdf-export";
import { PDF_NO_PAGE_MESSAGE, readPdfFile, writePdfFile, type PdfWriteDeps } from "./pdf-convert";

const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
const PNG_1PX = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const NOW = "2026-11-24T00:00:00.000Z";

function fakePdf(o: { pages?: number; encrypted?: boolean; fail?: string } = {}) {
  const destroy = vi.fn();
  const pageSize = vi.fn(async (_i: number) => ({ w: 612, h: 792 }));
  const engine: PdfEngine = {
    async open(): Promise<PdfFile> {
      if (o.encrypted === true) throw new PdfEncryptedError();
      if (o.fail !== undefined) throw new Error(o.fail);
      return { pageCount: o.pages ?? 3, pageSize, renderTile: async () => ({}) as TileBitmap, destroy };
    },
  };
  return { engine, destroy, pageSize };
}
const readDeps = (pdf: PdfEngine) => ({ core: fakeCore, pdf, makeAssets: (): AssetStore => createAssetStore() });
const backdrops = (doc: CoreDocument) => doc.pageIds().map((id) => doc.page(id)?.backdrop ?? null);

const none: OverlayProducer = { pages: async (reqs) => reqs.map(() => null) };
const realLib = (): Promise<PdfLib> => import("pdf-lib");
async function refusingLib(): Promise<PdfLib> {
  const base = await realLib();
  return { ...base, PDFDocument: { create: base.PDFDocument.create, load: async () => { throw new Error("refusé"); } } as unknown as PdfLib["PDFDocument"] };
}
async function pdfDoc(count = 1): Promise<{ doc: CoreDocument; assets: AssetStore; id: string }> {
  const d = await PDFDocument.create();
  for (let i = 0; i < count; i++) d.addPage([612, 792]);
  const blob = new Blob([new Uint8Array(await d.save())], { type: "application/pdf" });
  const assets = createAssetStore();
  const id = await assets.put(blob);
  const sizes = Array.from({ length: count }, () => ({ w: 612, h: 792 }));
  const doc = fakeCore.fromPdfPages({ id, name: "a.pdf", mime: "application/pdf", size: blob.size }, sizes);
  return { doc, assets, id };
}
const rect = (doc: CoreDocument, y0: number) =>
  doc.apply({ type: "AddShape", page: doc.pageIds()[0]!, shape: "rect", x0: 100, y0, x1: 300, y1: y0 + 100, style: { color: "#000000", width: 4 }, fill: null });
const writeDeps = (o: Partial<PdfWriteDeps> = {}): PdfWriteDeps => ({ core: fakeCore, now: () => NOW, loadPdfLib: realLib, overlay: () => none, alive: () => true, ...o });

describe("readPdfFile (cli-lot3, D35)", () => {
  it("readPdfFile — 3 pages : fonds pdf-page 0..2, asset application/pdf au nom du fichier, onglet « Cours.roomboard », aucun avis, PdfFile détruit", async () => {
    const pdf = fakePdf();
    const r = await readPdfFile({ name: "Cours.pdf", blob: new Blob([PDF_HEAD]) }, readDeps(pdf.engine));
    expect(backdrops(r.doc).map((b) => [b?.kind, b?.page])).toEqual([["pdf-page", 0], ["pdf-page", 1], ["pdf-page", 2]]);
    const a = r.doc.citedAssets()[0];
    expect([a?.name, a?.mime, a?.size]).toEqual(["Cours.pdf", "application/pdf", PDF_HEAD.byteLength]);
    expect(r.assets.get(a?.id ?? "")?.type).toBe("application/pdf");
    expect([r.tabName, r.warnings]).toEqual(["Cours.roomboard", []]);
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
  });
  it("readPdfFile — 501 pages : 500 tailles lues, avis « gros.pdf : 500 premières pages importées sur 501 »", async () => {
    const pdf = fakePdf({ pages: 501 });
    const r = await readPdfFile({ name: "gros.pdf", blob: new Blob([PDF_HEAD]) }, readDeps(pdf.engine));
    expect(r.doc.pageIds()).toHaveLength(500);
    expect(pdf.pageSize).toHaveBeenCalledTimes(500);
    expect(r.warnings).toEqual(["gros.pdf : 500 premières pages importées sur 501"]);
  });
  // Distingue le patron de `openBoard`/`readBoardFile` (cause brute, préfixe ajouté par l'appelant) : sous ce patron,
  // le chiffré deviendrait « Ouverture impossible (secret.pdf) : … » et le sans-page porterait deux préfixes.
  it("readPdfFile — refus au message complet du produit : chiffré, illisible, sans page (un seul préfixe, PdfFile détruit)", async () => {
    const blob = new Blob([PDF_HEAD]);
    await expect(readPdfFile({ name: "secret.pdf", blob }, readDeps(fakePdf({ encrypted: true }).engine))).rejects.toMatchObject({ message: "secret.pdf : PDF chiffré, non pris en charge" });
    await expect(readPdfFile({ name: "x.pdf", blob }, readDeps(fakePdf({ fail: "Invalid PDF structure." }).engine))).rejects.toMatchObject({ message: "Ouverture impossible (x.pdf) : Invalid PDF structure." });
    const empty = fakePdf({ pages: 0 });
    await expect(readPdfFile({ name: "vide.pdf", blob }, readDeps(empty.engine))).rejects.toMatchObject({ message: `Ouverture impossible (vide.pdf) : ${PDF_NO_PAGE_MESSAGE}` });
    expect(empty.destroy).toHaveBeenCalledTimes(1);
  });
  it("readPdfFile — PDF converti d'un original Office : asset « Lettre.pdf », original gardé à son type, onglet « Lettre.roomboard »", async () => {
    const r = await readPdfFile({ name: "Lettre.docx", blob: new Blob([PDF_HEAD]), original: new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]) }, readDeps(fakePdf({ pages: 1 }).engine));
    const b = backdrops(r.doc)[0];
    expect(r.tabName).toBe("Lettre.roomboard");
    expect(r.doc.citedAssets().find((x) => x.id === b?.asset)?.name).toBe("Lettre.pdf");
    expect(typeof b?.original).toBe("string");
    expect(r.assets.get(b?.original ?? "")?.type).toBe(officeMimeOf("Lettre.docx"));
  });
});

describe("writePdfFile (cli-lot3, D36)", () => {
  it("writePdfFile — page d'origine recopiée : 1 page, annotated vrai, aucun avis ; la superposition reçoit une copie, jamais le document", async () => {
    const { doc, assets } = await pdfDoc();
    const seen: CoreDocument[] = [];
    const r = await writePdfFile(doc, assets, writeDeps({ overlay: (copy) => (seen.push(copy), none) }));
    expect([r?.pages, r?.annotated, r?.rasterized, r?.rasterMissing, r?.cut, r?.notices]).toEqual([1, true, false, false, false, []]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toBe(doc);
    expect((await PDFDocument.load(r!.bytes)).getPageCount()).toBe(1);
  });
  it("writePdfFile — pdf-lib refuse le PDF d'origine, sans rasterPage : rasterMissing, avis PDF_RASTER_MISSING_MESSAGE ; rasterClose une fois", async () => {
    const { doc, assets } = await pdfDoc();
    const rasterClose = vi.fn();
    const r = await writePdfFile(doc, assets, writeDeps({ loadPdfLib: refusingLib, rasterClose }));
    expect([r?.rasterMissing, r?.notices]).toEqual([true, [PDF_RASTER_MISSING_MESSAGE]]);
    expect(rasterClose).toHaveBeenCalledTimes(1);
  });
  it("writePdfFile — repli en image : rasterPage reçoit le Blob de l'asset et l'indice ; avis PDF_RASTER_MESSAGE", async () => {
    const { doc, assets, id } = await pdfDoc();
    const rasterPage = vi.fn(async (_b: Blob, _i: number) => ({ png: PNG_1PX, w: 612, h: 792 }));
    const r = await writePdfFile(doc, assets, writeDeps({ loadPdfLib: refusingLib, rasterPage }));
    expect([r?.rasterized, r?.notices]).toEqual([true, [PDF_RASTER_MESSAGE]]);
    expect(rasterPage).toHaveBeenCalledWith(assets.get(id), 0);
  });
  it("writePdfFile — contenu hors de la page PDF : avis PDF_CUT_MESSAGE", async () => {
    const { doc, assets } = await pdfDoc();
    rect(doc, 5000);
    const r = await writePdfFile(doc, assets, writeDeps());
    expect(r?.notices).toEqual([PDF_CUT_MESSAGE]);
  });
  // Seul cas où l'ordre du produit se voit (les trois avis ensemble) : un ordre ou un dédoublonnage différent le fait échouer.
  it("writePdfFile — trois avis à la fois, dans l'ordre du produit : image, page vierge, contenu coupé ; rasterClose une fois", async () => {
    const { doc, assets, id } = await pdfDoc(2);
    rect(doc, 5000);
    const rasterPage = vi.fn(async (_b: Blob, i: number) => (i === 0 ? { png: PNG_1PX, w: 612, h: 792 } : null));
    const rasterClose = vi.fn();
    const r = await writePdfFile(doc, assets, writeDeps({ loadPdfLib: refusingLib, rasterPage, rasterClose }));
    expect([r?.rasterized, r?.rasterMissing, r?.cut]).toEqual([true, true, true]);
    expect(r?.notices).toEqual([PDF_RASTER_MESSAGE, PDF_RASTER_MISSING_MESSAGE, PDF_CUT_MESSAGE]);
    expect(rasterPage.mock.calls.map(([b, i]) => [b === assets.get(id), i])).toEqual([[true, 0], [true, 1]]);
    expect(rasterClose).toHaveBeenCalledTimes(1);
  });
  it("writePdfFile — superposition en échec : rejet avec son message, rasterClose une fois, copie libérée", async () => {
    const { doc, assets } = await pdfDoc();
    rect(doc, 100);
    const freed = vi.fn();
    const core: CoreFactory = {
      ...fakeCore,
      loadParts: (m, y) => {
        const d = fakeCore.loadParts(m, y);
        const free = d.free.bind(d);
        d.free = () => {
          freed();
          free();
        };
        return d;
      },
    };
    const rasterClose = vi.fn();
    const failing: OverlayProducer = { pages: async () => { throw new Error("krilla"); } };
    await expect(writePdfFile(doc, assets, writeDeps({ core, overlay: () => failing, rasterClose }))).rejects.toThrow("krilla");
    expect(rasterClose).toHaveBeenCalledTimes(1);
    expect(freed).toHaveBeenCalledTimes(1);
  });
  it("writePdfFile — onglet fermé pendant l'export (alive faux) : null", async () => {
    const { doc, assets } = await pdfDoc();
    expect(await writePdfFile(doc, assets, writeDeps({ alive: () => false }))).toBeNull();
  });
});
