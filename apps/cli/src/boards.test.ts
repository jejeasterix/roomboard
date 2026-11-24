import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { nodeBoardPorts } from "./board-node";
import { main } from "./main";
import { createSession, INTERRUPTED_MESSAGE, nodeSession } from "./session";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { loadNodePdfjs } from "./pdf-node";
import { readBoardFile } from "../../web/src/app/board-convert";
import { boardWarningsMessage } from "../../web/src/app/board-files";
import { TOO_MANY_TABS } from "../../web/src/app/tabs";
import { createAssetStore } from "../../web/src/core/asset-store";
import { APP_VERSION, messageOf } from "../../web/src/platform/controller";
import { nodeDecode } from "./importer";
import { boardFixtures, borrowedAfterPanic, describeWasm, formatsWith, memoryIO, panickingFormats, pdfFixture, pngBytes, stampOf, tmpDir, warmModules, type Json } from "./testing";

async function stateOf(path: string): Promise<Json> {
  const io = memoryIO();
  expect(await main(["state", path], io)).toBe(0);
  return io.json()[0];
}
async function noticesOf(path: string): Promise<string> {
  const s = await nodeSession(memoryIO());
  await s.open(path);
  return s.deps.notices.join(" ");
}

describeWasm("S2 — lire les cinq tableaux (D22)", () => {
  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test
  it("S2 — .iwb ZIP : 1 page, 8 objets, avis de la vidéo non lue ; .iwb XML brut : 3 pages", async () => {
    const f = boardFixtures(tmpDir());
    const st = await stateOf(f.iwb);
    expect(st.pages).toHaveLength(1);
    expect(st.pages[0].elements).toHaveLength(8);
    expect(await noticesOf(f.iwb)).toContain("vidéo");
    expect((await stateOf(f.iwbRaw)).pages).toHaveLength(3);
  });
  it("S2 — .ubz : 4 objets ; .notebook : 2 pages dans l'ordre du manifeste (4 puis 1 objets)", async () => {
    const f = boardFixtures(tmpDir());
    expect((await stateOf(f.ubz)).pages[0].elements).toHaveLength(4);
    const nb = await stateOf(f.notebook);
    expect(nb.pages.map((p: Json) => p.elements.length)).toEqual([4, 1]);
  });
  it("S2 — .olf : 3 objets, fond #ffeecc ; .flipchart : 2 pages, 5 objets en page 1, TIFF et action en avis", async () => {
    const f = boardFixtures(tmpDir());
    const olf = await stateOf(f.olf);
    expect(olf.pages[0].elements).toHaveLength(3);
    expect(olf.pages[0].page.background.toLowerCase()).toBe("#ffeecc");
    const fc = await stateOf(f.flipchart);
    expect(fc.pages).toHaveLength(2);
    expect(fc.pages[0].elements).toHaveLength(5);
    const said = await noticesOf(f.flipchart);
    expect(said).toContain("TIFF");
    expect(said).toContain("action");
  });
  it("S2 — run lecon.iwb --save : code 2, fichier non modifié ; --out x.roomboard : 0", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const before = stampOf(f.iwb);
    expect(await main(["run", f.iwb, "--save"], memoryIO([]))).toBe(2);
    expect(stampOf(f.iwb)).toEqual(before);
    const out = join(dir, "l.roomboard");
    expect(await main(["run", f.iwb, "--out", out], memoryIO([]))).toBe(0);
    expect((await stateOf(out)).pages[0].elements).toHaveLength(8);
  });
  it("import a.roomboard lecon.iwb : ouvert en onglet (opened), a non écrit ; import a.roomboard p.rbpack : code 2, renvoi à library", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, f.iwb], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ opened: ["lecon.iwb"], inserted: [] });
    expect(stampOf(a)).toEqual(before);
    const pack = memoryIO();
    expect(await main(["import", a, join(dir, "p.rbpack")], pack)).toBe(2);
    expect(pack.errors()[0].error.message).toContain("library");
  });
  it("RF2 — majuscules : LECON.IWB lu ; run X.ROOMBOARD --save accepté (D23 sans casse)", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const upper = join(dir, "LECON.IWB");
    writeFileSync(upper, readFileSync(f.iwb));
    expect((await stateOf(upper)).pages[0].elements).toHaveLength(8);
    const x = join(dir, "X.ROOMBOARD");
    expect(await main(["new", x], memoryIO())).toBe(0);
    expect(await main(["run", x, "--save"], memoryIO([]))).toBe(0);
  });
  it("RF3 — .ubz qui n'est pas un ZIP : code 1, message du produit, rien d'écrit", async () => {
    const dir = tmpDir();
    const faux = join(dir, "faux.ubz");
    writeFileSync(faux, "bonjour");
    const io = memoryIO();
    expect(await main(["state", faux], io)).toBe(1);
    expect(io.errors()[0].error.message).toContain("un .ubz est une archive ZIP");
    const out = join(dir, "o.roomboard");
    expect(await main(["run", faux, "--out", out], memoryIO([]))).toBe(1);
    expect(existsSync(out)).toBe(false);
  });
  it("D29 — module des formats interrompu : save et write refusent (code 1), rien d'écrit", async () => {
    const s0 = await nodeSession(memoryIO());
    const s = createSession({ ...s0.deps, interrupted: () => true });
    const tab = s.newTab().session;
    const out = join(tmpDir(), "x.roomboard");
    await expect(s.save(tab, out)).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    await expect(s.write(out, pngBytes(1, 1))).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
  it("D29 — panique (puis free() qui lève) pendant la lecture d'un tableau : la session refuse ensuite d'écrire", async () => {
    const dir = tmpDir();
    const raw = join(dir, "brut.iwb");
    writeFileSync(raw, "<iwb/>");
    const mod = formatsWith(borrowedAfterPanic);
    let hit = false;
    const s0 = await nodeSession(memoryIO());
    const s = createSession({ ...s0.deps, board: nodeBoardPorts(async () => mod, () => void (hit = true)), interrupted: () => hit });
    await expect(s.open(raw)).rejects.toMatchObject({ code: "format" });
    const out = join(dir, "x.roomboard");
    await expect(s.save(s.newTab().session, out)).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
  it("D22 — un tableau ouvert est un onglet sans fichier (file: null), un .roomboard garde son chemin", async () => {
    const f = boardFixtures(tmpDir());
    const s = await nodeSession(memoryIO());
    const board = await s.open(f.iwb);
    expect(board.session.file).toBeNull();
    const doc = join(tmpDir(), "a.roomboard");
    expect(await main(["new", doc], memoryIO())).toBe(0);
    expect((await s.open(doc)).session.file).toBe(doc);
    expect(s.tabs.list().map((t) => t.session.file)).toEqual([null, doc]);
  });
  it("D29 — main import : panique (puis free() qui lève) pendant la lecture d'un tableau, rapport imprimé puis refus (code 1), a.roomboard intact (H15)", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const img = join(dir, "img.png");
    writeFileSync(img, pngBytes(2, 2));
    const bad = join(dir, "bad.iwb");
    writeFileSync(bad, "<iwb/>");
    const before = stampOf(a);
    const io = memoryIO([], {}, undefined, { formats: panickingFormats() });
    expect(await main(["import", a, img, bad], io)).toBe(1);
    const report = io.json()[0];
    expect(report.inserted.length).toBeGreaterThan(0);
    expect(report.failed.length + report.refused.length).toBeGreaterThan(0);
    expect(io.errors()[0].error.message).toContain(INTERRUPTED_MESSAGE);
    expect(stampOf(a)).toEqual(before);
  });
});

describeWasm("caractérisation cli-partage (D13) : ouverture d'un tableau par la CLI", () => {
  beforeAll(async () => {
    await loadNodePdfjs();
    await loadPdfLib();
    await (await nodeSession(memoryIO())).deps.formats();
  });
  async function readerOf(path: string): Promise<{ why: string | null; warnings: string[] }> {
    const s = await nodeSession(memoryIO());
    const deps = { core: s.deps.core, ports: s.deps.board, makeAssets: () => createAssetStore(), decode: nodeDecode, now: () => s.deps.now(), appVersion: APP_VERSION };
    try {
      const r = await readBoardFile({ name: "x.iwb", blob: new Blob([readFileSync(path) as BlobPart]), format: "iwb" }, deps);
      r.doc.free();
      return { why: null, warnings: r.warnings };
    } catch (e) {
      return { why: messageOf(e), warnings: [] };
    }
  }
  const abimeIn = (dir: string): string => {
    const p = join(dir, "abime.iwb");
    writeFileSync(p, "<iwb");
    return p;
  };

  it("caractérisation cli-partage — state abime.iwb : code 1, stderr { code format, « Ouverture impossible (abime.iwb) : <message du lecteur> » }", async () => {
    const abime = abimeIn(tmpDir());
    const { why } = await readerOf(abime);
    expect(why).not.toBeNull();
    const io = memoryIO();
    expect(await main(["state", abime], io)).toBe(1);
    expect(io.errors()).toEqual([{ error: { code: "format", message: `Ouverture impossible (abime.iwb) : ${why}` } }]);
  });

  it("caractérisation cli-partage — import a.roomboard lecon.iwb three.pdf : code 0, deux ouverts, un seul avis = boardWarningsMessage du lecteur", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const three = await pdfFixture(dir);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const { warnings } = await readerOf(f.iwb);
    expect(warnings.length).toBeGreaterThan(0);
    const io = memoryIO();
    expect(await main(["import", a, f.iwb, three], io)).toBe(0);
    const [r] = io.json();
    expect(r).toMatchObject({ opened: ["lecon.iwb", "three.pdf"], inserted: [], refused: [], failed: [] });
    expect(r.notices).toEqual([boardWarningsMessage("lecon.iwb", warnings)]);
    expect(io.stderr).toEqual([]);
  });

  it("caractérisation cli-partage — import a.roomboard abime.iwb : code 1, « import partiel : abime.iwb (en échec) », avis « Ouverture impossible (abime.iwb) : … »", async () => {
    const dir = tmpDir();
    const abime = abimeIn(dir);
    const { why } = await readerOf(abime);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const io = memoryIO();
    expect(await main(["import", a, abime], io)).toBe(1);
    const [r] = io.json();
    expect(r).toMatchObject({ opened: [], inserted: [], refused: [], failed: ["abime.iwb"] });
    expect(r.notices).toEqual([`Ouverture impossible (abime.iwb) : ${why}`]);
    expect(io.errors()).toEqual([{ error: { code: "command", message: "import partiel : abime.iwb (en échec)" } }]);
  });

  it("caractérisation cli-partage — 12 onglets (run --new, 11 tab.new) puis op import lecon.iwb : op 12 en échec, avis nommé « 12 onglets au plus »", async () => {
    const f = boardFixtures(tmpDir());
    const lines = [...Array.from({ length: 11 }, () => JSON.stringify({ op: "tab.new" })), JSON.stringify({ op: "import", files: [f.iwb] })];
    const io = memoryIO(lines);
    expect(await main(["run", "--new"], io)).toBe(1);
    const failed = io.json().find((l: Json) => l.op === 12);
    expect(failed).toMatchObject({ ok: false, error: { code: "command", message: "import partiel : lecon.iwb (en échec)" }, opened: [], failed: ["lecon.iwb"] });
    expect(failed.notices).toEqual([`Ouverture impossible (lecon.iwb) : ${TOO_MANY_TABS}`]);
  });
});
