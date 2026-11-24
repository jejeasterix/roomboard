import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { PDF_CUT_MESSAGE, PDF_RASTER_MISSING_MESSAGE } from "../../web/src/app/pdf-export";
import { PDF_WRITE_FAILED_MESSAGE } from "../../web/src/app/pdf-overlay-vector";
import { UNREAD_ASSETS_MESSAGE } from "../../web/src/platform/controller";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { exportPdfFile } from "./exporter";
import { main } from "./main";
import { loadNodePdfjs, NO_RASTER_SUFFIX } from "./pdf-node";
import { INTERRUPTED_MESSAGE, nodeSession } from "./session";
import { describeWasm, memoryIO, pdfFixture, pdfPanickingFormats, readPdfBack, refusingPdfLib, stampOf, tmpDir, WEB_SRC, type Json } from "./testing";

const backdropsOf = async (file: string): Promise<Json[]> => {
  const st = memoryIO();
  expect(await main(["state", file], st)).toBe(0);
  return st.json()[0].pages.map((x: Json) => x.page.backdrop);
};

describeWasm("S1 — lire un PDF (cli-lot3)", () => {
  // Premier chargement du fichier (pdf.js et son worker, pdf-lib, Wasm du cœur et des formats) fait une fois ici, hors
  // du délai du premier test : sous charge, S1 dépassait 5000 ms en le payant seul (T8).
  beforeAll(async () => {
    await loadNodePdfjs();
    await loadPdfLib();
    await (await nodeSession(memoryIO())).deps.formats();
  });
  it("S1 — convert three.pdf p.roomboard : 3 pages de 1920, fonds pdf-page 0..2, un asset application/pdf ; state three.pdf identique", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const p = join(dir, "p.roomboard");
    const cv = memoryIO();
    expect(await main(["convert", three, p], cv)).toBe(0);
    expect(cv.json()[0]).toMatchObject({ file: p, from: three, pages: 3 });
    expect(cv.stderr).toEqual([]);
    const st = memoryIO();
    expect(await main(["state", p], st)).toBe(0);
    const s = st.json()[0];
    expect(s.pages.map((x: Json) => [x.page.width, x.page.backdrop.kind, x.page.backdrop.page])).toEqual([[1920, "pdf-page", 0], [1920, "pdf-page", 1], [1920, "pdf-page", 2]]);
    expect(s.assets).toHaveLength(1);
    expect(s.assets[0]).toMatchObject({ name: "three.pdf", mime: "application/pdf" });
    expect(s.pages.every((x: Json) => x.page.backdrop.asset === s.assets[0].id)).toBe(true);
    const sp = memoryIO();
    expect(await main(["state", three], sp)).toBe(0);
    expect(sp.json()[0].file).toBe(three);
    expect(sp.json()[0].pages.map((x: Json) => x.page.backdrop)).toEqual(s.pages.map((x: Json) => x.page.backdrop));
  });
  it("S1 — import a.roomboard three.pdf : opened, a non écrit ; dans run, import et tab.open ouvrent des onglets sans fichier", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, three], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ opened: ["three.pdf"], inserted: [], refused: [], failed: [] });
    expect(stampOf(a)).toEqual(before);
    const run = memoryIO([JSON.stringify({ op: "import", files: [three] }), JSON.stringify({ op: "tab.open", file: three }), JSON.stringify({ op: "tab.list" })]);
    expect(await main(["run", a], run)).toBe(0);
    expect(run.json()[2].tabs).toEqual([
      { id: "t1", file: a, active: false },
      { id: "t2", file: null, active: false },
      { id: "t3", file: null, active: true },
    ]);
  });
  it("S1 — run three.pdf --save : code 2, rien d'écrit ; run three.pdf --out p.roomboard : 3 fonds pdf-page", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const before = stampOf(three);
    expect(await main(["run", three, "--save"], memoryIO([]))).toBe(2);
    expect(stampOf(three)).toEqual(before);
    const out = join(dir, "p.roomboard");
    expect(await main(["run", three, "--out", out], memoryIO([]))).toBe(0);
    expect((await backdropsOf(out)).map((b) => b.kind)).toEqual(["pdf-page", "pdf-page", "pdf-page"]);
  });
  it("S1 — 501 pages : code 0, 500 pages, avis « gros.pdf : 500 premières pages importées sur 501 »", { timeout: 120_000 }, async () => {
    const dir = tmpDir();
    const gros = await pdfFixture(dir, "gros.pdf", 501);
    const st = memoryIO();
    expect(await main(["state", gros], st)).toBe(0);
    expect(st.json()[0].pages).toHaveLength(500);
    expect(st.json()[0].notices).toEqual(["gros.pdf : 500 premières pages importées sur 501"]);
  });
  it("S1 — PDF invalide : state code 1 « Ouverture impossible (bad.pdf) : … » ; import : partiel, code 1, a intact", async () => {
    const dir = tmpDir();
    const bad = join(dir, "bad.pdf");
    writeFileSync(bad, "%PDF-1.4\n%%EOF\n");
    const st = memoryIO();
    expect(await main(["state", bad], st)).toBe(1);
    expect(st.errors()[0].error.code).toBe("format");
    expect(st.errors()[0].error.message).toMatch(/^Ouverture impossible \(bad\.pdf\) : /);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, bad], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ failed: ["bad.pdf"] });
    expect(io.json()[0].notices.join(" ")).toContain("Ouverture impossible (bad.pdf)");
    expect(stampOf(a)).toEqual(before);
  });
  it("S3 — convert three.pdf t.iwb et t.ubz : code 0, avis « fonds PDF non exportés »", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    for (const ext of ["iwb", "ubz"]) {
      const io = memoryIO();
      expect(await main(["convert", three, join(dir, `t.${ext}`)], io)).toBe(0);
      expect(io.json()[0].notices.join(" ")).toContain("fonds PDF non exportés");
    }
  });
  it("RF1 — extension en majuscules : COURS.PDF lu comme un PDF", async () => {
    const dir = tmpDir();
    const cours = await pdfFixture(dir, "COURS.PDF");
    expect((await backdropsOf(cours)).map((b) => b.kind)).toEqual(["pdf-page", "pdf-page", "pdf-page"]);
  });
  it("RF2 — pages de tailles mixtes : chaque fond garde la taille de sa page (portrait puis paysage)", async () => {
    const dir = tmpDir();
    const lib = await loadPdfLib();
    const d = await lib.PDFDocument.create();
    d.addPage([612, 792]);
    d.addPage([792, 612]);
    const mixed = join(dir, "mixte.pdf");
    writeFileSync(mixed, await d.save());
    expect((await backdropsOf(mixed)).map((b) => [b.w, b.h])).toEqual([[612, 792], [792, 612]]);
  });
});

const ANNOTATE = [
  { type: "AddShape", page: "$page:1", shape: "rect", x0: 100, y0: 100, x1: 500, y1: 300, style: { color: "#dc2626", width: 6 }, fill: null },
  { type: "SetText", page: "$page:1", id: null, x: 200, y: 400, content: "Annotation CLI", color: "#000000", size: 48, boxWidth: 800, boxHeight: 60 },
].map((o) => JSON.stringify(o));

/** three.pdf converti en p.roomboard, page 2 annotée (rectangle, « Annotation CLI »), enregistré. */
async function annotatedBoard(dir: string): Promise<{ three: string; p: string }> {
  const three = await pdfFixture(dir);
  const p = join(dir, "p.roomboard");
  expect(await main(["convert", three, p], memoryIO())).toBe(0);
  expect(await main(["run", p, "--save"], memoryIO(ANNOTATE))).toBe(0);
  return { three, p };
}

describeWasm("S2 à S4 — écrire un PDF (cli-lot3)", () => {
  it("S2 — export p.roomboard p.pdf : kind pdf, 3 pages, annoté ; relu : « RoomBoard page 2 » et « Annotation CLI » en page 2, /Form en page 2 seule", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "p.pdf");
    const io = memoryIO();
    expect(await main(["export", p, out], io)).toBe(0);
    expect(io.json()).toEqual([{ file: out, kind: "pdf", pages: 3, annotated: true }]);
    expect(io.stderr).toEqual([]);
    const back = await readPdfBack(out);
    expect(back.pages).toBe(3);
    expect(back.texts[1]).toContain("RoomBoard page 2");
    expect(back.texts[1]).toContain("Annotation CLI");
    expect(back.overlays).toEqual([[], ["/Form"], []]);
  });
  it("S3 — aller-retour : convert p.pdf back.roomboard : 3 pages à fond pdf-page", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "p.pdf");
    expect(await main(["export", p, out], memoryIO())).toBe(0);
    const back = join(dir, "back.roomboard");
    const cv = memoryIO();
    expect(await main(["convert", out, back], cv)).toBe(0);
    expect(cv.json()[0]).toMatchObject({ file: back, from: out, pages: 3 });
    const st = memoryIO();
    expect(await main(["state", back], st)).toBe(0);
    expect(st.json()[0].pages.map((x: Json) => [x.page.backdrop.kind, x.page.backdrop.page])).toEqual([["pdf-page", 0], ["pdf-page", 1], ["pdf-page", 2]]);
  });
  it("S3 — document sans fond PDF : export a.pdf, 1 page de 842 pt, annotated faux", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["run", a, "--save"], memoryIO([JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null })]))).toBe(0);
    const out = join(dir, "a.pdf");
    const io = memoryIO();
    expect(await main(["export", a, out], io)).toBe(0);
    expect(io.json()).toEqual([{ file: out, kind: "pdf", pages: 1, annotated: false }]);
    const lib = await loadPdfLib();
    expect((await lib.PDFDocument.load(readFileSync(out))).getPage(0).getWidth()).toBe(842);
  });
  it("S3 — refus d'usage : --ids, --page, --name vers .pdf : 2 ; convert p.pdf p.PDF : 2 ; new z.pdf : 2, rien d'écrit", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    for (const flags of [["--ids", "x"], ["--page", "x"], ["--name", "n"], ["--all"], ["--grid"]]) {
      expect(await main(["export", p, join(dir, "x.pdf"), ...flags], memoryIO()), flags.join(" ")).toBe(2);
    }
    expect(existsSync(join(dir, "x.pdf"))).toBe(false);
    const out = join(dir, "p.pdf");
    expect(await main(["export", p, out], memoryIO())).toBe(0);
    const before = stampOf(out);
    expect(await main(["convert", out, join(dir, "p.PDF")], memoryIO())).toBe(2);
    expect(stampOf(out)).toEqual(before);
    expect(await main(["new", join(dir, "z.pdf")], memoryIO())).toBe(2);
    expect(existsSync(join(dir, "z.pdf"))).toBe(false);
  });
  it("S4 — pdf-lib refuse le PDF d'origine : code 1, message de D39, aucun fichier", async () => {
    const dir = tmpDir();
    // Sans annotation : aucune superposition krilla, que `refusingPdfLib` refuserait aussi (`pdf-export.ts:258`) ;
    // seul le PDF d'origine passe par `load`, refusé : `rasterMissing`.
    const three = await pdfFixture(dir);
    const p = join(dir, "p.roomboard");
    expect(await main(["convert", three, p], memoryIO())).toBe(0);
    const out = join(dir, "refus.pdf");
    const io = memoryIO([], {}, WEB_SRC, { pdfLib: refusingPdfLib() });
    expect(await main(["export", p, out], io)).toBe(1);
    expect(io.errors()[0].error).toEqual({ code: "command", message: `${PDF_RASTER_MISSING_MESSAGE}${NO_RASTER_SUFFIX}` });
    expect(existsSync(out)).toBe(false);
  });
  it("S4 — panique de write_pdf_pages : code 1, rien d'écrit ; dans la session, plus aucun save (D29)", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "panique.pdf");
    const io = memoryIO([], {}, WEB_SRC, { formats: pdfPanickingFormats() });
    expect(await main(["export", p, out], io)).toBe(1);
    expect(io.errors()[0].error.message).toBe(`Export impossible : superposition vectorielle impossible (${PDF_WRITE_FAILED_MESSAGE})${NO_RASTER_SUFFIX}`);
    expect(existsSync(out)).toBe(false);
    const s = await nodeSession(memoryIO([], {}, WEB_SRC, { formats: pdfPanickingFormats() }));
    const tab = (await s.open(p)).session;
    await expect(exportPdfFile(s, out)).rejects.toMatchObject({ code: "command" });
    expect(s.deps.interrupted()).toBe(true);
    const after = join(dir, "apres.roomboard");
    await expect(s.save(tab, after)).rejects.toMatchObject({ message: INTERRUPTED_MESSAGE });
    expect(existsSync(after)).toBe(false);
  });
  it("S4 — image GIF annotée (H24) : code 1, « image/gif » dans le message, rien d'écrit", async () => {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    const gif = new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0])], { type: "image/gif" });
    const id = await tab.assets.put(gif);
    await s.exec(JSON.stringify({ type: "AddImage", page: "$page:0", asset: { id, name: "a.gif", mime: "image/gif", size: gif.size }, w: 40, h: 40, matrix: [1, 0, 0, 1, 100, 100] }));
    const out = join(tmpDir(), "gif.pdf");
    await expect(exportPdfFile(s, out)).rejects.toMatchObject({ code: "command", message: expect.stringContaining("image/gif") });
    expect(existsSync(out)).toBe(false);
  });
  it("D41 — image du document non lue : UNREAD_ASSETS_MESSAGE, code 1, rien d'écrit", async () => {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    tab.doc.apply({ type: "AddImage", page: tab.doc.pageIds()[0]!, asset: { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    const out = join(tmpDir(), "x.pdf");
    await expect(exportPdfFile(s, out)).rejects.toMatchObject({ code: "command", exit: 1, message: UNREAD_ASSETS_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
  it("S4 — formats : .pdf lu et écrit ; import a.roomboard x.docx : 3 « lot 4 » ; convert a.roomboard x.docx : 2", async () => {
    const dir = tmpDir();
    const f = memoryIO();
    expect(await main(["formats"], f)).toBe(0);
    expect(f.json()[0].formats).toContainEqual(expect.objectContaining({ ext: ".pdf", read: true, write: true, readLot: 3, writeLot: 3 }));
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const imp = memoryIO();
    expect(await main(["import", a, join(dir, "x.docx")], imp)).toBe(3);
    expect(imp.errors()[0].error.message).toContain("lot 4");
    expect(await main(["convert", a, join(dir, "x.docx")], memoryIO())).toBe(2);
  });
  it("RF3 — convert d'un PDF vers un PDF (H33) : 3 pages, texte et superposition d'origine gardés", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const first = join(dir, "p.pdf");
    expect(await main(["export", p, first], memoryIO())).toBe(0);
    const second = join(dir, "y.pdf");
    const cv = memoryIO();
    expect(await main(["convert", first, second], cv)).toBe(0);
    expect(cv.json()[0]).toMatchObject({ file: second, from: first, pages: 3 });
    const back = await readPdfBack(second);
    expect(back.pages).toBe(3);
    expect(back.texts[1]).toContain("Annotation CLI");
    expect(back.overlays).toEqual([[], ["/Form"], []]);
  });
  it("RF4 — contenu hors des pages PDF : code 0, avis PDF_CUT_MESSAGE dans notices (H27)", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const p = join(dir, "p.roomboard");
    expect(await main(["convert", three, p], memoryIO())).toBe(0);
    expect(await main(["run", p, "--save"], memoryIO([JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 3000, x1: 300, y1: 3100, style: { color: "#000000", width: 4 }, fill: null })]))).toBe(0);
    const io = memoryIO();
    expect(await main(["export", p, join(dir, "cut.pdf")], io)).toBe(0);
    expect(io.json()[0].notices).toEqual([PDF_CUT_MESSAGE]);
  });
  it("RF5 — op export vers .pdf dans run : une ligne kind pdf ; avec « page » : code 2", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "op.pdf");
    const run = memoryIO([JSON.stringify({ op: "export", to: out })]);
    expect(await main(["run", p], run)).toBe(0);
    expect(run.json()[0]).toMatchObject({ op: 1, ok: true, file: out, kind: "pdf", pages: 3, annotated: true });
    const bad = memoryIO([JSON.stringify({ op: "export", to: join(dir, "x.pdf"), page: "$page:0" })]);
    expect(await main(["run", p], bad)).toBe(2);
    expect(existsSync(join(dir, "x.pdf"))).toBe(false);
  });
});
