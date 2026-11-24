import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { main } from "./main";
import { describeWasm, memoryIO, pdfFixture, stampOf, tmpDir, type Json } from "./testing";

const backdropsOf = async (file: string): Promise<Json[]> => {
  const st = memoryIO();
  expect(await main(["state", file], st)).toBe(0);
  return st.json()[0].pages.map((x: Json) => x.page.backdrop);
};

describeWasm("S1 — lire un PDF (cli-lot3)", () => {
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
