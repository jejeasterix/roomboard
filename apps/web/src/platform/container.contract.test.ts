// Contrat du second module Wasm (R8, R25) : chargé en Node par `initSync` sur les octets, joué à travers `createPageCodec`.
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer le contrat au lieu de le sauter.
import { describe, expect, it } from "vitest";
import { createPageCodec, hasSheetReader, type FormatsBinding } from "./container";
import { gridOf } from "./sheet-reader";

// `apps/web` n'a pas `@types/node` : `node:fs` par import dynamique typé localement.
interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm-formats/roomboard_formats_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);
const required = env["ROOMBOARD_WASM_REQUIRED"] === "1";

it("le module formats est présent quand il est exigé", () => {
  if (required) expect(present).toBe(true);
});

interface FormatsJs extends FormatsBinding { initSync(o: { module: Uint8Array }): unknown }
async function loadFormats(): Promise<FormatsBinding> {
  const href = new URL("../wasm-formats/roomboard_formats_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as FormatsJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return mod;
}
const binding: FormatsBinding | null = present ? await loadFormats() : null;
const need = (): FormatsBinding => {
  if (binding === null) throw new Error("module formats absent");
  return binding;
};

const hex = (b: ArrayBuffer): string => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> => hex(await crypto.subtle.digest("SHA-256", bytes));
const MANIFEST = new TextEncoder().encode(
  JSON.stringify({ format: "roomboard", formatVersion: 1, schema: 1, appVersion: "0.1.0", created: "c", modified: "m" }),
);
const YBIN = new Uint8Array([0, 0]);

describe.skipIf(binding === null)("contrat du module formats (R8)", () => {
  it("écrire puis lire : manifeste, ybin et asset rendus à l'identique, empreinte SHA-256", async () => {
    const codec = createPageCodec(async () => need());
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const id = await sha256(png);
    const file = await codec.write(MANIFEST, YBIN, [{ id, mime: "image/png", blob: new Blob([png]) }]);
    const back = await codec.read(new Blob([file.slice()]));
    expect([Array.from(back.manifest), Array.from(back.ybin), back.warnings]).toEqual([Array.from(MANIFEST), [0, 0], []]);
    expect(back.assets.map(([i]) => i)).toEqual([id]);
    expect(Array.from(new Uint8Array(await back.assets[0]![1].arrayBuffer()))).toEqual(Array.from(png));
  });

  it("empreinte fausse : écriture refusée avec le message du conteneur", async () => {
    const codec = createPageCodec(async () => need());
    await expect(codec.write(MANIFEST, YBIN, [{ id: "0".repeat(64), mime: "image/png", blob: new Blob([new Uint8Array([1])]) }]))
      .rejects.toThrow("ne correspond pas à son empreinte");
  });

  it("octets qui ne sont pas un .roomboard : message du cœur", async () => {
    await expect(createPageCodec(async () => need()).read(new Blob([new Uint8Array([1, 2, 3])])))
      .rejects.toThrow("ce fichier n'est pas un document RoomBoard");
  });
});

describe.skipIf(binding === null)("contrat C10b : classeur (vrai module formats)", () => {
  it("SheetReader sur valeurs.xlsx (S4, F23, F24) : 64 × 6, source 70 × 6, valeurs en français, fusion ; octets corrompus : illisible", () => {
    const mod = need();
    if (!hasSheetReader(mod)) throw new Error("SheetReader absent du module formats");
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-formats/tests/fixtures/valeurs.xlsx", import.meta.url)));
    const r = mod.SheetReader.open(bytes);
    try {
      const g = gridOf(r);
      expect([g.rows, g.cols, g.sourceRows, g.sourceCols, g.cutCells]).toEqual([64, 6, 70, 6, false]);
      expect(g.cells.slice(0, 6)).toEqual(["texte", "42", "3,5", "20/11/2026", "VRAI", "#DIV/0!"]);
      expect(g.merges).toEqual([{ row: 1, col: 0, rows: 1, cols: 2 }]);
    } finally {
      r.free();
    }
    expect(() => mod.SheetReader.open(new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]))).toThrow("classeur illisible");
  });
});
