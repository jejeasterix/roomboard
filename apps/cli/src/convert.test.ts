import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { UNREAD_ASSETS_MESSAGE } from "../../web/src/platform/controller";
import { exportBoardFile } from "./exporter";
import { main } from "./main";
import { INTERRUPTED_MESSAGE, nodeSession } from "./session";
import { boardFixtures, describeWasm, memoryIO, pngBytes, stampOf, tmpDir, type Json } from "./testing";

const style = { color: "#1e40af", width: 4 };
async function board(dir: string): Promise<string> {
  const a = join(dir, "a.roomboard");
  const png = join(dir, "i.png");
  writeFileSync(png, pngBytes(40, 30));
  expect(await main(["new", a], memoryIO())).toBe(0);
  const ops = [
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: "#fde68a" },
    { type: "AddShape", page: "$page:0", shape: "ellipse", x0: 400, y0: 100, x1: 600, y1: 300, style, fill: null },
    { op: "import", files: [png], at: [900, 500] },
  ].map((o) => JSON.stringify(o));
  expect(await main(["run", a, "--save"], memoryIO(ops))).toBe(0);
  return a;
}
const boxes = (d: CoreDocument): Array<[string, number, number, number, number]> =>
  d.elementIds(d.pageIds()[0]!).map((id) => {
    const b = d.bounds([id])!;
    return [d.element(id)!.kind, b.x0, b.y0, b.x1, b.y1];
  });
const near = (a: number, b: number): boolean => Math.abs(a - b) <= 2;

describeWasm("S3 — écrire et relire .iwb et .ubz (D24, D25)", () => {
  for (const ext of ["iwb", "ubz"] as const) {
    it(`S3 — export a.${ext} puis convert en .roomboard : mêmes sortes et géométries (2 px)`, async () => {
      const dir = tmpDir();
      const a = await board(dir);
      const out = join(dir, `a.${ext}`);
      const io = memoryIO();
      expect(await main(["export", a, out], io)).toBe(0);
      expect(io.json()[0]).toMatchObject({ file: out, kind: ext });
      const back = join(dir, `a2-${ext}.roomboard`);
      const cv = memoryIO();
      expect(await main(["convert", out, back], cv)).toBe(0);
      expect(cv.json()[0]).toMatchObject({ file: back, from: out, pages: 1, notices: expect.any(Array) });
      const s = await nodeSession(memoryIO());
      const ba = boxes((await s.open(a)).session.doc);
      const bb = boxes((await s.open(back)).session.doc);
      expect(bb.map((x) => x[0])).toEqual(ba.map((x) => x[0]));
      bb.forEach((x, i) => expect(x.slice(1).every((v, k) => near(v as number, ba[i]![k + 1] as number)), JSON.stringify([x, ba[i]])).toBe(true));
    });
  }
  it("S3 — export .ubz avec --ids : code 2 ; vers .docx : code 2 ; vers .rbpack : code 2, renvoi à library", async () => {
    const dir = tmpDir();
    const a = await board(dir);
    expect(await main(["export", a, join(dir, "a.ubz"), "--ids", "x"], memoryIO())).toBe(2);
    const docx = memoryIO();
    expect(await main(["export", a, join(dir, "a.docx")], docx)).toBe(2);
    const pack = memoryIO();
    expect(await main(["export", a, join(dir, "a.rbpack")], pack)).toBe(2);
    expect(pack.errors()[0].error.message).toContain("library");
  });
  it("module des formats interrompu (D29) : export .iwb refusé en code command, rien d'écrit", async () => {
    const s = await nodeSession(memoryIO());
    s.newTab();
    s.deps.interrupted = () => true;
    const out = join(tmpDir(), "x.iwb");
    await expect(exportBoardFile(s, out)).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
  it("op export vers .iwb dans run : kind iwb ; avec ids : code 2", async () => {
    const dir = tmpDir();
    const a = await board(dir);
    const ok = memoryIO([JSON.stringify({ op: "export", to: join(dir, "r.iwb") })]);
    expect(await main(["run", a], ok)).toBe(0);
    expect(ok.json()[0]).toMatchObject({ op: 1, ok: true, kind: "iwb" });
    const bad = memoryIO([JSON.stringify({ op: "export", to: join(dir, "r.iwb"), ids: ["x"] })]);
    expect(await main(["run", a], bad)).toBe(2);
  });
  it("image du document non lue : UNREAD_ASSETS_MESSAGE, code command, rien d'écrit", async () => {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    tab.doc.apply({ type: "AddImage", page: tab.doc.pageIds()[0]!, asset: { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    const out = join(tmpDir(), "x.iwb");
    await expect(exportBoardFile(s, out)).rejects.toMatchObject({ code: "command", message: UNREAD_ASSETS_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
});

describeWasm("S2 — convert des cinq tableaux (D25)", () => {
  it("S2 — convert lecon.iwb : 0, 8 objets, avis de la vidéo ; pages des autres tableaux", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const cases: Array<[string, number, number | null, string | null]> = [
      [f.iwb, 1, 8, "vidéo"],
      [f.iwbRaw, 3, null, null],
      [f.ubz, 1, 4, null],
      [f.notebook, 2, 4, null],
      [f.olf, 1, 3, null],
      [f.flipchart, 2, 5, "TIFF"],
    ];
    for (const [src, pages, first, said] of cases) {
      const out = `${src}.roomboard`;
      const io = memoryIO();
      expect(await main(["convert", src, out], io), src).toBe(0);
      const r: Json = io.json()[0];
      expect(r.pages, src).toBe(pages);
      if (said !== null) expect(r.notices.join(" "), src).toContain(said);
      if (first !== null) {
        const st = memoryIO();
        await main(["state", out], st);
        expect(st.json()[0].pages[0].elements, src).toHaveLength(first);
      }
    }
  });
  it("convert : sources et sorties refusées (.docx, .rbitem, .rbpack, .png : 2)", async () => {
    const dir = tmpDir();
    const a = await board(dir);
    expect(await main(["convert", a, join(dir, "x.docx")], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "doc.docx"), join(dir, "x.roomboard")], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "s.rbitem"), join(dir, "x.roomboard")], memoryIO())).toBe(2);
    expect(await main(["convert", a, join(dir, "x.rbpack")], memoryIO())).toBe(2);
    expect(await main(["convert", a, join(dir, "x.png")], memoryIO())).toBe(2);
  });
  it("RF5 — tableau vers tableau (.ubz → .iwb) sans .roomboard, sortie existante remplacée (H16)", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const out = join(dir, "o.iwb");
    writeFileSync(out, "ancien");
    const before = stampOf(out);
    const io = memoryIO();
    expect(await main(["convert", f.ubz, out], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ file: out, pages: 1 });
    expect(stampOf(out)).not.toEqual(before);
    expect(await main(["convert", out, join(dir, "o.roomboard")], memoryIO())).toBe(0);
  });
});
