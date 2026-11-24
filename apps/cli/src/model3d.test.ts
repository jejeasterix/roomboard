import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { cubeMtl, cubeObj, glbTextured, gltfPair, plyTriangle, png1, stlTriangle } from "../../../scripts/essais/fabriques/modeles.mjs";
import { COMPANION_ALONE_MESSAGE, NO_WEBGL_MESSAGE } from "../../web/src/platform/model3d-import";
import { MODEL3D_UNREADABLE } from "../../web/src/platform/model3d-handlers";
import { main } from "./main";
import { describeWasm, fabZip, memoryIO, pdfFixture, tmpDir, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}
const put = (dir: string, files: Record<string, Uint8Array>): string[] =>
  Object.entries(files).map(([n, b]) => {
    writeFileSync(join(dir, n), b);
    return join(dir, n);
  });

describeWasm("S4 — 3D sans vignette (cli-lot4)", () => {
  it("S4 — import cube.obj cube.mtl tex.png tri.stl tri.gltf tri.bin tex.glb : quatre objets, instantané nul, avis une fois, stderr vide", async () => {
    const { dir, a } = await board();
    const { gltf, bin } = gltfPair();
    const paths = put(dir, { "cube.obj": cubeObj(), "cube.mtl": cubeMtl(), "tex.png": png1(), "tri.stl": stlTriangle(), "tri.gltf": gltf, "tri.bin": bin, "tex.glb": glbTextured() });
    const io = memoryIO();
    expect(await main(["import", a, ...paths], io)).toBe(0);
    const [r] = io.json();
    expect(r).toMatchObject({ inserted: ["cube.obj", "tri.stl", "tri.gltf", "tex.glb"], refused: [], failed: [] });
    expect(r.notices.filter((n: string) => n === NO_WEBGL_MESSAGE)).toHaveLength(1);
    expect(io.stderr).toEqual([]);
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const s = st.json()[0];
    const name = (id: string): string => s.assets.find((x: Json) => x.id === id)?.name;
    const models = Object.fromEntries(s.pages[0].elements.filter((e: Json) => e.kind === "model3d").map((e: Json) => [name(e.model3d.asset), e.model3d]));
    expect(Object.keys(models).sort()).toEqual(["cube.obj", "tex.glb", "tri.gltf", "tri.stl"]);
    expect(Object.values(models).every((m: Json) => m.snapshot === null)).toBe(true);
    expect(models["cube.obj"].files.map((f: Json) => f.path).sort()).toEqual(["cube.mtl", "tex.png"]);
    expect(models["tri.gltf"].files.map((f: Json) => f.path)).toEqual(["tri.bin"]);
  });
  it("S4 — .gltf sans son .bin : code 1, avis « modèle 3D illisible », aucune pile", async () => {
    const { dir, a } = await board();
    const io = memoryIO();
    expect(await main(["import", a, ...put(dir, { "seul.gltf": gltfPair().gltf })], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ failed: ["seul.gltf"] });
    expect(io.json()[0].notices.join(" ")).toContain(MODEL3D_UNREADABLE);
    expect(io.stderr.join("")).not.toMatch(/\n\s+at /);
  });
  it("S4 — seul.mtl : code 1, failed, avis du fichier lié seul", async () => {
    const { dir, a } = await board();
    const io = memoryIO();
    expect(await main(["import", a, ...put(dir, { "seul.mtl": cubeMtl(null) })], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ failed: ["seul.mtl"] });
    expect(io.json()[0].notices.join(" ")).toContain(COMPANION_ALONE_MESSAGE);
  });
  it("S4 — ZIP de deux modèles : deux objets 3D", async () => {
    const { dir, a } = await board();
    expect(await main(["import", a, ...put(dir, { "modeles.zip": fabZip({ "a.stl": stlTriangle(), "b.ply": plyTriangle() }) })], memoryIO())).toBe(0);
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    expect(st.json()[0].pages[0].elements.filter((e: Json) => e.kind === "model3d")).toHaveLength(2);
  });
  it("D76 — session run : import 3D seul : code 0, `self`, `ProgressEvent`, `document` retirés après coup", async () => {
    const { dir } = await board();
    const [stl] = put(dir, { "tri.stl": stlTriangle() });
    const io = memoryIO([JSON.stringify({ op: "import", files: [stl] })]);
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    expect(["self", "ProgressEvent", "document"].map((k) => k in globalThis)).toEqual([false, false, false]);
  });
  it("D76 — session run : import 3D puis tab.open d'un PDF : code 0, `ProgressEvent` et `document` retirés (`self` : posé par pdf.js lui-même)", async () => {
    const { dir } = await board();
    const [stl] = put(dir, { "tri.stl": stlTriangle() });
    const pdf = await pdfFixture(dir);
    const io = memoryIO([JSON.stringify({ op: "import", files: [stl] }), JSON.stringify({ op: "tab.open", file: pdf })]);
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    // pdf.js (polyfill core-js du worker `legacy`) pose `globalThis.self` à son chargement : hors de `withThreeGlobals`.
    expect(["ProgressEvent", "document"].map((k) => k in globalThis)).toEqual([false, false]);
  });
});
