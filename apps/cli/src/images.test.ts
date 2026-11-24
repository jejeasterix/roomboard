import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { bmp, gif, heif, ico, svg, webp } from "../../../scripts/essais/fabriques/images.mjs";
import { IWB_HEAD } from "../../../scripts/essais/fabriques/tableaux.mjs";
import { main } from "./main";
import { describeWasm, fabZip, memoryIO, stampOf, tmpDir, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}
const nameOf = (state: Json, id: string): string => state.assets.find((x: Json) => x.id === id)?.name;

describeWasm("S5 — autres images (cli-lot4)", () => {
  it("S5 — huit images insérées aux tailles de l'en-tête (vb.svg à viewBox seul : 300 × 75)", async () => {
    const { dir, a } = await board();
    const files: Record<string, Uint8Array> = {
      "i.gif": gif(320, 200), "i.webp": webp("VP8 ", 64, 48), "i.bmp": bmp(33, 21), "i.ico": ico([[16, 16], [48, 48]]),
      "i.svg": svg('width="40" height="30"'), "vb.svg": svg('viewBox="0 0 400 100"'), "i.avif": heif("avif", 120, 80), "i.heic": heif("heic", 90, 60),
    };
    for (const [n, b] of Object.entries(files)) writeFileSync(join(dir, n), b);
    const io = memoryIO();
    expect(await main(["import", a, ...Object.keys(files).map((n) => join(dir, n))], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: Object.keys(files), refused: [], failed: [] });
    expect(io.stderr).toEqual([]);
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const s = st.json()[0];
    const sizes = Object.fromEntries(s.pages[0].elements.map((e: Json) => [nameOf(s, e.image.asset), [e.image.w, e.image.h]]));
    expect(sizes).toEqual({
      "i.gif": [320, 200], "i.webp": [64, 48], "i.bmp": [33, 21], "i.ico": [48, 48],
      "i.svg": [40, 30], "vb.svg": [300, 75], "i.avif": [120, 80], "i.heic": [90, 60],
    });
  });
  it("S5 — import casse.gif : code 3 « taille de l'image gif illisible dans l'en-tête », rien écrit", async () => {
    const { dir, a } = await board();
    const casse = join(dir, "casse.gif");
    writeFileSync(casse, "GIF89a");
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, casse], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: "casse.gif : taille de l'image gif illisible dans l'en-tête (la CLI ne décode pas les images)" });
    expect(stampOf(a)).toEqual(before);
  });
  it("S5 — convert gif.iwb : l'image GIF du tableau est lue, aucun avis d'image sautée", async () => {
    const dir = tmpDir();
    const xml = `${IWB_HEAD}<svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1"><svg:image id="i1" xlink:href="images/i.gif" x="10" y="10" width="64" height="64"/></svg:page></svg:pageset></svg:svg></iwb>`;
    const iwb = join(dir, "gif.iwb");
    writeFileSync(iwb, fabZip({ "content.xml": new TextEncoder().encode(xml), "images/i.gif": gif(64, 64) }));
    const out = join(dir, "g.roomboard");
    const io = memoryIO();
    expect(await main(["convert", iwb, out], io)).toBe(0);
    expect(io.json()[0].notices.join(" ")).not.toMatch(/image/i);
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    expect(st.json()[0].pages[0].elements.filter((e: Json) => e.kind === "image")).toHaveLength(1);
  });
  it("S5 — formats : chaque format est lu, aucune note ne cite un lot (D68)", async () => {
    const io = memoryIO();
    expect(await main(["formats"], io)).toBe(0);
    const rows = io.json()[0].formats as Json[];
    expect(rows.filter((r) => r.read !== true && !r.notes.some((n: string) => n.startsWith("laissé de côté : "))).map((r) => r.ext)).toEqual([]);
    expect(rows.flatMap((r) => r.notes).filter((n: string) => /\blots?\b/i.test(n))).toEqual([]);
  });
  it("D69 — export .pdf d'un tableau qui porte une image GIF : code 1, raison « aucun décodeur d'image »", async () => {
    const { dir, a } = await board();
    writeFileSync(join(dir, "i.gif"), gif(8, 8));
    expect(await main(["import", a, join(dir, "i.gif")], memoryIO())).toBe(0);
    const io = memoryIO();
    expect(await main(["export", a, join(dir, "x.pdf")], io)).toBe(1);
    expect(io.errors()[0].error.message).toContain("aucun décodeur d'image");
  });
});
