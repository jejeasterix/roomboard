import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { main } from "./main";
import { describeWasm, memoryIO, normalizeIds, pngBytes, tmpDir, type Json } from "./testing";

describeWasm("S4 — export .rbitem relu", () => {
  it("S4 — export --all puis state du .rbitem : mêmes sortes, styles, géométries et assets, ids mis à part", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const png = join(dir, "image.png");
    const frag = join(dir, "sel.rbitem");
    writeFileSync(png, pngBytes(40, 30));
    expect(await main(["new", a], memoryIO())).toBe(0);
    const ops = [
      { type: "AddShape", page: "$page:0", shape: "ellipse", x0: 10, y0: 20, x1: 110, y1: 220, style: { color: "#1e40af", width: 4 }, fill: "#fde68a" },
      { op: "import", files: [png], at: [600, 400] },
    ].map((o) => JSON.stringify(o));
    expect(await main(["run", a, "--save"], memoryIO(ops))).toBe(0);
    const sa = memoryIO();
    expect(await main(["state", a], sa)).toBe(0);
    const [stA] = sa.json();
    const page = stA.pages[0].page.id;
    const io = memoryIO();
    expect(await main(["export", a, frag, "--page", page, "--all"], io)).toBe(0);
    expect(io.json()).toEqual([{ file: frag, kind: "fragment", elements: 2 }]);
    const sf = memoryIO();
    expect(await main(["state", frag], sf)).toBe(0);
    const [stF] = sf.json();
    expect(stF.pages).toHaveLength(1);
    expect(stF.pages[0].elements.map((e: Json) => e.kind)).toEqual(["shape", "image"]);
    expect(normalizeIds(stF.pages[0].elements)).toEqual(normalizeIds(stA.pages[0].elements));
    expect(stF.assets).toEqual(stA.assets);
    expect(stF.pages[0].elements[0].id).not.toBe(stA.pages[0].elements[0].id);
  });
  it("export --ids d'un seul objet ; --ids et --all ensemble : code 2", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const frag = join(dir, "un.rbitem");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const run = memoryIO([
      JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 2 }, fill: null }),
      JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 20, y0: 0, x1: 30, y1: 10, style: { color: "#000000", width: 2 }, fill: null }),
    ]);
    expect(await main(["run", a, "--save"], run)).toBe(0);
    const first = run.json()[0].change.ids[0];
    const io = memoryIO();
    expect(await main(["export", a, frag, "--ids", first], io)).toBe(0);
    expect(io.json()[0].elements).toBe(1);
    const both = memoryIO();
    expect(await main(["export", a, frag, "--ids", first, "--all"], both)).toBe(2);
  });
  it("export vers .pdf : code 3 (lot 3) ; vers .png : code 2 ; page vide : code 1", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const pdf = memoryIO();
    expect(await main(["export", a, join(dir, "x.pdf")], pdf)).toBe(3);
    expect(pdf.errors()[0].error.message).toContain("lot 3");
    expect(await main(["export", a, join(dir, "x.png")], memoryIO())).toBe(2);
    const empty = memoryIO();
    expect(await main(["export", a, join(dir, "vide.rbitem")], empty)).toBe(1);
    expect(empty.errors()[0].error.code).toBe("command");
  });
});
