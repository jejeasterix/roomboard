import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { PACK_NOT_ROOMBOARD_MESSAGE } from "../../web/src/platform/rbpack";
import { createPageCodec } from "../../web/src/platform/container";
import { libraryExport, libraryImport, libraryList, nodeDirFs, openLibrary } from "./library";
import { main } from "./main";
import { describeWasm, FIXED_NOW, memoryIO, tmpDir, WEB_SRC, warmModules } from "./testing";
import { loadCore, loadFormats } from "./wasm-node";

const shape = (x: number) => JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: x, y0: 0, x1: x + 50, y1: 50, style: { color: "#000000", width: 2 }, fill: null });
async function lib(dir: string) {
  const core = await loadCore(WEB_SRC);
  return openLibrary(dir, { core, codec: createPageCodec(loadFormats(WEB_SRC)), now: () => new Date(Number(FIXED_NOW)).toISOString() });
}
async function itemsIn(folder: string): Promise<void> {
  mkdirSync(folder, { recursive: true });
  const a = join(tmpDir(), "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  expect(await main(["run", a, "--save"], memoryIO([shape(0), shape(100)]))).toBe(0);
  expect(await main(["export", a, join(folder, "carre.rbitem"), "--all"], memoryIO())).toBe(0);
  expect(await main(["export", a, join(folder, "rond.rbitem"), "--all"], memoryIO())).toBe(0);
}

it("nodeDirFs : readDir, mkdir récursif, writeFile atomique, remove", async () => {
  const d = tmpDir();
  await nodeDirFs.mkdir(join(d, "x", "y"), { recursive: true });
  await nodeDirFs.writeFile(join(d, "x", "f.bin"), new Uint8Array([1, 2]));
  expect(await nodeDirFs.readFile(join(d, "x", "f.bin"))).toEqual(new Uint8Array([1, 2]));
  expect([...(await nodeDirFs.readDir(join(d, "x")))].sort((p, q) => p.name.localeCompare(q.name))).toEqual([{ name: "f.bin", isDirectory: false }, { name: "y", isDirectory: true }]);
  await nodeDirFs.remove(join(d, "x"), { recursive: true });
  expect(existsSync(join(d, "x"))).toBe(false);
});

describeWasm("S4 — bibliothèque sur disque (DA9)", () => {
  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test
  it("S4 — export du dossier Formes en .rbpack puis import dans une autre bibliothèque, list", async () => {
    const root = tmpDir();
    const libA = join(root, "lib");
    await itemsIn(join(libA, "Formes"));
    const pack = join(root, "p.rbpack");
    const out = await libraryExport(await lib(libA), pack, "Formes");
    expect(out).toEqual({ file: pack, name: "Formes.rbpack", skipped: [] });
    const libB = join(root, "lib2");
    const imp = await libraryImport(await lib(libB), pack);
    expect(imp).toMatchObject({ folder: "Formes", count: 2 });
    expect(imp.notices).toHaveLength(1);
    expect(imp.notices[0]).toContain("p.rbpack");
    const list = await libraryList(await lib(libB), "Formes");
    expect(list.items.map((i) => i.name).sort()).toEqual(["carre", "rond"]);
    expect(list.items.every((i) => i.kind === "fragment")).toBe(true);
    expect(existsSync(join(libB, "Formes", "carre.rbitem"))).toBe(true);
  });
  it("extensions : import d'un non-.rbpack et export vers un non-.rbpack → usage", async () => {
    const root = tmpDir();
    const l = await lib(join(root, "lib"));
    await expect(libraryImport(l, join(root, "x.zip"))).rejects.toMatchObject({ code: "usage" });
    await expect(libraryExport(l, join(root, "x.zip"), "")).rejects.toMatchObject({ code: "usage" });
  });
  it("RF4 — paquet endommagé : refus (command), aucun fichier créé dans la bibliothèque", async () => {
    const root = tmpDir();
    const bad = join(root, "bad.rbpack");
    writeFileSync(bad, "pas un zip");
    const libB = join(root, "lib2");
    await expect(libraryImport(await lib(libB), bad)).rejects.toMatchObject({ code: "command", message: PACK_NOT_ROOMBOARD_MESSAGE });
    expect(existsSync(libB) ? readdirSync(libB) : []).toEqual([]);
  });
});
