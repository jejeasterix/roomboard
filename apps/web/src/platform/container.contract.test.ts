// Contrat du second module Wasm (R8, R25) : chargé en Node par `initSync` sur les octets, joué à travers `createPageCodec`.
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer le contrat au lieu de le sauter.
import { describe, expect, it } from "vitest";
import { createPageCodec, hasSheetReader, type FormatsBinding } from "./container";
import { EMPTY_SHEET_MESSAGE, gridOf, SHEET_TOO_BIG_MESSAGE, UNREADABLE_SHEET_PREFIX } from "./sheet-reader";

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

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Uint8Array): number => {
  let c = 0xffffffff;
  for (const x of b) c = (CRC_TABLE[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
/** Archive ZIP sans compression (méthode 0), fabriquée ici (GC16 : aucun autre classeur dans le dépôt) ; `declared`
 *  force la taille décompressée annoncée d'une entrée. */
function storedZip(entries: readonly { readonly name: string; readonly body: string; readonly declared?: number }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const data = enc.encode(e.body);
    const crc = crc32(data);
    const size = e.declared ?? data.length;
    const local = new Uint8Array(30 + name.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(12, 0x21, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, data.length, true);
    l.setUint32(22, size, true);
    l.setUint16(26, name.length, true);
    local.set(name, 30);
    const cd = new Uint8Array(46 + name.length);
    const c = new DataView(cd.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, size, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    cd.set(name, 46);
    parts.push(local, data);
    central.push(cd);
    offset += local.length + data.length;
  }
  const end = new Uint8Array(22);
  const v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, entries.length, true);
  v.setUint16(10, entries.length, true);
  v.setUint32(12, central.reduce((s, x) => s + x.length, 0), true);
  v.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((s, x) => s + x.length, 0));
  let at = 0;
  for (const x of all) {
    out.set(x, at);
    at += x.length;
  }
  return out;
}
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
const XML = '<?xml version="1.0" encoding="UTF-8"?>';
/** Classeur d'une feuille sans valeur, mêmes parties que `one(String::new(), &[])` de `sheet.rs`. */
const emptyXlsx = (): Uint8Array =>
  storedZip([
    { name: "[Content_Types].xml", body: `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>` },
    { name: "_rels/.rels", body: `${XML}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", body: `${XML}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="F" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", body: `${XML}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rIdS" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rIdT" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>` },
    { name: "xl/styles.xml", body: `${XML}<styleSheet xmlns="${NS}"><cellXfs count="1"><xf numFmtId="0"/></cellXfs></styleSheet>` },
    { name: "xl/sharedStrings.xml", body: `${XML}<sst xmlns="${NS}" count="0" uniqueCount="0"></sst>` },
    { name: "xl/worksheets/sheet1.xml", body: `${XML}<worksheet xmlns="${NS}"><sheetData></sheetData></worksheet>` },
  ]);
const thrown = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return "aucune erreur";
};

describe.skipIf(binding === null)("contrat C10b : classeur (vrai module formats)", () => {
  it("constat T13 : messages recopiés en TS = messages de sheet.rs (feuille vide, partie de plus de 64 Mio déclarés hors de xl/, illisible)", () => {
    const mod = need();
    if (!hasSheetReader(mod)) throw new Error("SheetReader absent du module formats");
    expect(thrown(() => mod.SheetReader.open(emptyXlsx()))).toBe(EMPTY_SHEET_MESSAGE);
    expect(thrown(() => mod.SheetReader.open(storedZip([{ name: "data/sharedStrings.xml", body: "", declared: 64 * 1024 * 1024 + 1 }])))).toBe(SHEET_TOO_BIG_MESSAGE);
    expect(thrown(() => mod.SheetReader.open(new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3])))).toMatch(new RegExp(`^${UNREADABLE_SHEET_PREFIX}`));
  });

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
