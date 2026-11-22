// C13 lot 3 (T23, N14, DA4) : chaîne entière d'un paperboard à images, sur le vrai module `formats` :
// `makeFlipchart` → `readBamboo` (Worker ZIP) → `flipchartSources` → `FlipchartReader`. Les images restent des `Blob`
// côté page (DA4) : le Rust n'en reçoit que les noms, jamais les octets ; il rend le `href` (résolu dans `media`) et
// avertit une TIFF sur l'extension du nom de la table des ressources (la `.tif` n'est jamais décompressée).
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer au lieu de sauter.
import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { makeFlipchart } from "../../../../scripts/essais/fabriques/flipchart.mjs";
import { flipchartSources } from "../app/board-files";
import { BAMBOO_LIMITS, readBamboo } from "./bamboo";
import { keepBambooPath } from "./zip-worker";

interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm-formats/roomboard_formats_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);

interface Reader { ops(): Float32Array; texts(): string[]; warnings(): string[] }
interface FlipchartJs {
  initSync(o: { module: Uint8Array }): unknown;
  FlipchartReader: { open(names: string[], data: Uint8Array, ends: Uint32Array): Reader };
}
async function load(): Promise<FlipchartJs> {
  const href = new URL("../wasm-formats/roomboard_formats_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as FlipchartJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return mod;
}
const formats: FlipchartJs | null = present ? await load() : null;

const PNG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4);
const TIFF = Uint8Array.of(0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 5, 6);

/** Paperboard d'une page : `photo.png` et `scan.tif`, nommées dans la table des ressources (S4). */
function entriesOfS4(): { path: string; blob: Blob }[] {
  const data = makeFlipchart(
    [
      {
        images: [
          { name: "photo.png", bytes: PNG, x: 10, y: 20, w: 200, h: 100 },
          { name: "scan.tif", bytes: TIFF, x: 300, y: 20, w: 200, h: 100 },
        ],
      },
    ],
    zlibSync,
  ) as Uint8Array;
  return readBamboo(data, keepBambooPath, BAMBOO_LIMITS).map((e) => ({ path: e.path, blob: new Blob([new Uint8Array(e.bytes)]) }));
}

/** Même mise bout à bout que le Worker des tableaux : `names`, octets concaténés, fins cumulées. */
async function open(mod: FlipchartJs, structure: readonly { readonly path: string; readonly blob: Blob }[]): Promise<Reader> {
  const parts = await Promise.all(structure.map(async (e) => new Uint8Array(await e.blob.arrayBuffer())));
  const ends = new Uint32Array(parts.length);
  const data = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  parts.forEach((p, i) => {
    data.set(p, at);
    at += p.length;
    ends[i] = at;
  });
  return mod.FlipchartReader.open(structure.map((e) => e.path), data, ends);
}

describe("flipchartSources (T23, DA4)", () => {
  it("transmet au Rust le nom de chaque image gardée, sans ses octets ; l'image reste un Blob dans media", async () => {
    const split = flipchartSources(entriesOfS4());
    const photo = split.structure.find((e) => e.path === "photo.png");
    expect(photo?.blob.size).toBe(0);
    expect(new Uint8Array(await split.media.get("photo.png")!.arrayBuffer())).toEqual(PNG);
    // N15 : la `.tif` n'est jamais décompressée, ni nommée par le Worker.
    expect(split.media.has("scan.tif")).toBe(false);
    expect(split.structure.some((e) => e.path === "scan.tif")).toBe(false);
  });
});

describe.skipIf(formats === null && env["ROOMBOARD_WASM_REQUIRED"] !== "1")("chaîne .flipchart à images (T23, S4, N14)", () => {
  it("PNG lue avec son href résolu dans media, TIFF avertie « image TIFF non lue », aucun objet illisible", async () => {
    if (formats === null) throw new Error("module formats absent");
    const split = flipchartSources(entriesOfS4());
    const r = await open(formats, split.structure);
    expect(r.warnings()).toEqual(["page 1 : 1 image TIFF non lue"]);
    const hrefs = r.texts().filter((t) => split.media.has(t));
    expect(hrefs).toEqual(["photo.png"]);
    expect(new Uint8Array(await split.media.get(hrefs[0]!)!.arrayBuffer())).toEqual(PNG);
    // DA4 : aucun octet d'image n'est parti vers le Rust.
    const imageBytes = split.structure.filter((e) => !/(^|\/)version$|\.(in|io|ir)$/i.test(e.path)).reduce((n, e) => n + e.blob.size, 0);
    expect(imageBytes).toBe(0);
  });
});
