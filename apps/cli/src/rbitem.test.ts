import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { NO_GRID_MESSAGE } from "../../web/src/app/fragments";
import { main } from "./main";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, pngBytes, tmpDir, warmModules, type Json } from "./testing";

const rect = { type: "AddShape", page: "$page:0", shape: "rect", x0: 10, y0: 20, x1: 110, y1: 220, style: { color: "#1e40af", width: 4 }, fill: "#fde68a" };
const GRID = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] };
const centreOf = (d: CoreDocument, ids: readonly string[]): [number, number] => {
  const b = d.bounds(ids)!;
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
};
const sizeOf = (d: CoreDocument, id: string): [number, number] => {
  const b = d.bounds([id])!;
  return [b.x1 - b.x0, b.y1 - b.y0];
};
async function source(dir: string): Promise<{ a: string; sel: string }> {
  const a = join(dir, "a.roomboard");
  const png = join(dir, "i.png");
  const sel = join(dir, "sel.rbitem");
  writeFileSync(png, pngBytes(40, 30));
  expect(await main(["new", a], memoryIO())).toBe(0);
  expect(await main(["run", a, "--save"], memoryIO([JSON.stringify(rect), JSON.stringify({ op: "import", files: [png], at: [600, 400] })]))).toBe(0);
  expect(await main(["export", a, sel, "--all"], memoryIO())).toBe(0);
  return { a, sel };
}

describeWasm("S1 — insérer un .rbitem (D18, D19)", () => {
  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test
  it("S1 — import --at 400,300 dans un tableau existant : sortes, styles, tailles, centre des bornes, assets", async () => {
    const dir = tmpDir();
    const { a, sel } = await source(dir);
    const b = join(dir, "b.roomboard");
    expect(await main(["new", b], memoryIO())).toBe(0);
    const io = memoryIO();
    expect(await main(["import", b, sel, "--at", "400,300"], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: ["sel.rbitem"], refused: [], failed: [] });
    const s = await nodeSession(memoryIO());
    const da = (await s.open(a)).session.doc;
    const db = (await s.open(b)).session.doc;
    const ea = da.elementIds(da.pageIds()[0]!);
    const eb = db.elementIds(db.pageIds()[0]!);
    expect(eb.map((id) => db.element(id)!.kind)).toEqual(ea.map((id) => da.element(id)!.kind));
    expect(eb.map((id) => (db.element(id) as { style?: unknown }).style)).toEqual(ea.map((id) => (da.element(id) as { style?: unknown }).style));
    expect(eb.map((id) => sizeOf(db, id))).toEqual(ea.map((id) => sizeOf(da, id)));
    const [cx, cy] = centreOf(db, eb);
    expect(cx).toBeCloseTo(400, 6);
    expect(cy).toBeCloseTo(300, 6);
    expect(db.citedAssets()).toEqual(da.citedAssets());
  });
  it("S1 — run --new --out avec {op:import} : le tableau neuf contient les objets, centrés sur la scène", async () => {
    const dir = tmpDir();
    const { sel } = await source(dir);
    const c = join(dir, "c.roomboard");
    expect(await main(["run", "--new", "--out", c], memoryIO([JSON.stringify({ op: "import", files: [sel] })]))).toBe(0);
    const s = await nodeSession(memoryIO());
    const dc = (await s.open(c)).session.doc;
    const ids = dc.elementIds(dc.pageIds()[0]!);
    expect(ids).toHaveLength(2);
    const [cx, cy] = centreOf(dc, ids);
    expect(cx).toBeCloseTo(960, 6);
    expect(cy).toBeCloseTo(540, 6);
  });
  it("S1 — export --grid puis import : la page de b a la grille de a ; page sans grille : code 1 ; --grid --all : code 2", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const b = join(dir, "b.roomboard");
    const g = join(dir, "g.rbitem");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["new", b], memoryIO())).toBe(0);
    const none = memoryIO();
    expect(await main(["export", a, g, "--grid"], none)).toBe(1);
    expect(none.errors()[0].error.message).toContain(NO_GRID_MESSAGE);
    expect(await main(["run", a, "--save"], memoryIO([JSON.stringify({ type: "SetGrid", page: "$page:0", grid: GRID })]))).toBe(0);
    const io = memoryIO();
    expect(await main(["export", a, g, "--grid"], io)).toBe(0);
    expect(io.json()).toEqual([{ file: g, kind: "grid" }]);
    expect(await main(["import", b, g], memoryIO())).toBe(0);
    const stA = memoryIO();
    const stB = memoryIO();
    await main(["state", a], stA);
    await main(["state", b], stB);
    expect(stB.json()[0].pages[0].page.grid).toEqual(stA.json()[0].pages[0].page.grid);
    expect(await main(["export", a, g, "--grid", "--all"], memoryIO())).toBe(2);
  });
  it("op export grid dans run : kind grid", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const g = join(dir, "g.rbitem");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const io = memoryIO([JSON.stringify({ type: "SetGrid", page: "$page:0", grid: GRID }), JSON.stringify({ op: "export", to: g, grid: true })]);
    expect(await main(["run", a], io)).toBe(0);
    expect((io.json() as Json[])[1]).toMatchObject({ op: 2, ok: true, file: g, kind: "grid" });
  });
  it("RF1 — import --page : les objets arrivent sur la page demandée, pas sur la première", async () => {
    const dir = tmpDir();
    const { sel } = await source(dir);
    const b = join(dir, "b.roomboard");
    expect(await main(["new", b], memoryIO())).toBe(0);
    expect(await main(["run", b, "--save"], memoryIO([JSON.stringify({ type: "AddPage", after: "$page:0" })]))).toBe(0);
    const st = memoryIO();
    await main(["state", b], st);
    const p2 = st.json()[0].pages[1].page.id;
    expect(await main(["import", b, sel, "--page", p2], memoryIO())).toBe(0);
    const after = memoryIO();
    await main(["state", b], after);
    const pages = after.json()[0].pages;
    expect(pages[0].elements).toHaveLength(0);
    expect(pages[1].elements).toHaveLength(2);
  });
});
