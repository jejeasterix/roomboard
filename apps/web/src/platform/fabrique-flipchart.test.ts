import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { unzlibSync, zlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { bambooContainer, makeFlipchart, qCompress } from "../../../../scripts/essais/fabriques/flipchart.mjs";
import type { FabPage } from "../../../../scripts/essais/fabriques/flipchart.mjs";

// Fabrique de `.flipchart` (N19) : chaque octet est relu ici à la main, d'après le format (entiers
// petit-boutistes, longueur des chaînes en octets, sauf l'en-tête qCompress, gros-boutiste).

const deflate = (bytes: Uint8Array): Uint8Array => zlibSync(bytes);

const ascii = (bytes: Uint8Array): string => String.fromCharCode(...bytes);
const asciiBytes = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

class Cursor {
  private at = 0;
  constructor(private readonly bytes: Uint8Array) {}
  get done(): boolean {
    return this.at >= this.bytes.length;
  }
  peek(): number {
    const v = this.bytes[this.at];
    if (v === undefined) throw new Error("fin des données");
    return v;
  }
  take(n: number): Uint8Array {
    const out = this.bytes.subarray(this.at, this.at + n);
    if (out.length !== n) throw new Error("fin des données");
    this.at += n;
    return out;
  }
  u8(): number {
    return this.take(1)[0] ?? 0;
  }
  u16(): number {
    const b = this.take(2);
    return (b[0] ?? 0) | ((b[1] ?? 0) << 8);
  }
  u32(): number {
    const b = this.take(4);
    return ((b[0] ?? 0) | ((b[1] ?? 0) << 8) | ((b[2] ?? 0) << 16) | ((b[3] ?? 0) << 24)) >>> 0;
  }
  u64(): number {
    const lo = this.u32();
    return this.u32() * 2 ** 32 + lo;
  }
  // QString : u32 = longueur en octets (0xFFFFFFFF : nulle), puis UTF-16LE.
  qstr(): { text: string | null; length: number } {
    const length = this.u32();
    if (length === 0xffffffff) return { text: null, length };
    const b = this.take(length);
    let text = "";
    for (let i = 0; i + 1 < length; i += 2) text += String.fromCharCode((b[i] ?? 0) | ((b[i + 1] ?? 0) << 8));
    return { text, length };
  }
}

interface ReadEntry {
  name: string;
  nameLength: number;
  announced: number;
  compressed: number;
  stored: Uint8Array;
}

function readContainer(bytes: Uint8Array): { signature: string; version: number; format: string | null; entries: ReadEntry[] } {
  const c = new Cursor(bytes);
  const signature = ascii(c.take(8));
  const version = c.u16();
  const format = c.qstr().text;
  c.take(8);
  const entries: ReadEntry[] = [];
  while (!c.done) {
    const name = c.qstr();
    for (let i = 0; i < 3; i += 1) c.qstr();
    const announced = c.u64();
    const compressed = c.u8();
    const stored = c.take(c.u64());
    entries.push({ name: name.text ?? "", nameLength: name.length, announced, compressed, stored });
  }
  return { signature, version, format, entries };
}

const beU32 = (b: Uint8Array): number => (((b[0] ?? 0) << 24) | ((b[1] ?? 0) << 16) | ((b[2] ?? 0) << 8) | (b[3] ?? 0)) >>> 0;

function entry(container: { entries: ReadEntry[] }, name: string): ReadEntry {
  const found = container.entries.find((e) => e.name === name);
  if (found === undefined) throw new Error(`entrée absente : ${name}`);
  return found;
}

// Entrée compressée honnête : taille annoncée = en-tête qCompress = taille décompressée.
function inflate(e: ReadEntry): Uint8Array {
  expect(e.compressed).toBe(1);
  const data = unzlibSync(e.stored.subarray(4));
  expect(beU32(e.stored)).toBe(data.length);
  expect(e.announced).toBe(data.length);
  return data;
}

interface IndexNode {
  id: number;
  type: number;
  storage: number;
  children: IndexNode[];
}

// Index « culm » : `# culm #` u16 1 u16 7, puis `N u32 nœud u16 genre u32 stockage`, `S u32 s`, enfants, `n`.
function readIndex(bytes: Uint8Array): IndexNode {
  const c = new Cursor(bytes);
  expect(ascii(c.take(8))).toBe("# culm #");
  expect([c.u16(), c.u16()]).toEqual([1, 7]);
  const node = (): IndexNode => {
    expect(String.fromCharCode(c.u8())).toBe("N");
    const id = c.u32();
    const type = c.u16();
    const storage = c.u32();
    const children: IndexNode[] = [];
    for (;;) {
      const tag = String.fromCharCode(c.peek());
      if (tag === "n") {
        c.u8();
        return { id, type, storage, children };
      }
      if (tag === "S") {
        c.u8();
        c.u32();
        expect(String.fromCharCode(c.u8())).toBe("s");
        continue;
      }
      children.push(node());
    }
  };
  const root = node();
  expect(c.done).toBe(true);
  return root;
}

// Flux d'objets : ` Bamboo ` u16 1 u16 7, puis `O u16 genre u32 stockage`.
function objectType(stream: Uint8Array): number {
  const c = new Cursor(stream);
  expect(ascii(c.take(8))).toBe(" Bamboo ");
  expect([c.u16(), c.u16()]).toEqual([1, 7]);
  expect(String.fromCharCode(c.u8())).toBe("O");
  return c.u16();
}

const HEADER = [...asciiBytes(" Bamboo "), 7, 0, 6, 0, 0, 0, 0x31, 0, 0x2e, 0, 0x30, 0];
const PNG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3);
const TIFF = Uint8Array.of(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0);
const STROKE: FabPage = { strokes: [{ points: [[0, 0], [10, 10]] }] };

describe("fabrique de .flipchart", () => {
  it("fabrique : en-tête Bamboo v7", () => {
    const empty = bambooContainer([], deflate);
    expect(empty.length).toBe(HEADER.length + 8);
    expect([...empty.subarray(0, HEADER.length)]).toEqual(HEADER);
    const file = makeFlipchart([STROKE], deflate);
    expect([...file.subarray(0, HEADER.length)]).toEqual(HEADER);
    const root = readContainer(file);
    expect([root.signature, root.version, root.format]).toEqual([" Bamboo ", 7, "1.0"]);
    expect(root.entries.length).toBeGreaterThan(0);
  });

  it("fabrique : qCompress big-endian", () => {
    const data = new Uint8Array(258).fill(0x41);
    const marker = Uint8Array.of(0xde, 0xad, 0xbe, 0xef);
    expect([...qCompress(data, () => marker)]).toEqual([0, 0, 1, 2, 0xde, 0xad, 0xbe, 0xef]);
    const real = qCompress(data, deflate);
    expect([...real.subarray(0, 4)]).toEqual([0, 0, 1, 2]);
    expect(unzlibSync(real.subarray(4))).toEqual(data);
  });

  it("fabrique : deux pages en .fpg imbriqués", () => {
    const pages: FabPage[] = [STROKE, { rects: [{ x: 5, y: 5, w: 40, h: 30, fill: 0x00ff00 }] }];
    const root = readContainer(makeFlipchart(pages, deflate));
    expect(root.entries.map((e) => e.name).slice(0, 4)).toEqual(["101.in", "100.io", "1003.fpg", "2003.fpg"]);
    expect(readIndex(inflate(entry(root, "101.in"))).children.map((n) => [n.id, n.type, n.storage])).toEqual([
      [1003, 2, 1002],
      [2003, 2, 2002],
    ]);
    expect(objectType(inflate(entry(root, "100.io")))).toBe(1);
    for (const base of [1003, 2003]) {
      const inner = readContainer(inflate(entry(root, `${base}.fpg`)));
      expect([inner.signature, inner.version]).toEqual([" Bamboo ", 7]);
      const names = inner.entries.map((e) => e.name);
      expect(names.slice(0, 2)).toEqual([`${base}.in`, `${base - 1}.io`]);
      expect(names.length).toBe(3);
      expect(names.every((n) => /^\d+\.(in|io)$/.test(n))).toBe(true);
      const index = readIndex(inflate(entry(inner, `${base}.in`)));
      expect([index.id, index.type, index.storage]).toEqual([base, 2, base - 1]);
      expect(objectType(inflate(entry(inner, `${base - 1}.io`)))).toBe(2);
    }
  });

  it("fabrique : taille mensongère posée", () => {
    const root = readContainer(makeFlipchart([STROKE, STROKE], deflate, { lie: { entry: "1003.fpg", announced: 1024 } }));
    const lied = entry(root, "1003.fpg");
    expect([lied.announced, beU32(lied.stored)]).toEqual([1024, 1024]);
    expect(unzlibSync(lied.stored.subarray(4)).length).not.toBe(1024);
    inflate(entry(root, "2003.fpg"));

    // Au-delà du budget : 300 Mio annoncés dans le `.fpg`, rien de tel n'est écrit.
    const huge = 300 * 2 ** 20;
    const file = makeFlipchart([STROKE], deflate, { lie: { entry: "1003.in", announced: huge } });
    expect(file.length).toBeLessThan(64 * 1024);
    const inner = readContainer(inflate(entry(readContainer(file), "1003.fpg")));
    const index = entry(inner, "1003.in");
    expect([index.announced, beU32(index.stored)]).toEqual([huge, huge]);
  });

  it("fabrique : .fpg dans un .fpg (nestFpg)", () => {
    const root = readContainer(makeFlipchart([STROKE, STROKE], deflate, { nestFpg: true }));
    const first = readContainer(inflate(entry(root, "1003.fpg")));
    expect(readContainer(inflate(entry(first, "9003.fpg"))).signature).toBe(" Bamboo ");
    const second = readContainer(inflate(entry(root, "2003.fpg")));
    expect(second.entries.some((e) => e.name.endsWith(".fpg"))).toBe(false);
  });

  it("fabrique : entrées en trop (extraEntries)", () => {
    const root = readContainer(makeFlipchart([STROKE], deflate, { extraEntries: 20_001 }));
    const extra = root.entries.filter((e) => /^extra-\d+\.bin$/.test(e.name));
    expect(extra.length).toBe(20_001);
    expect(extra.every((e) => e.compressed === 0 && e.stored.length === 0 && e.announced === 0)).toBe(true);
  });

  it("fabrique : chaîne UTF-16 de longueur impaire (oddUtf16)", () => {
    const root = readContainer(makeFlipchart([STROKE], deflate, { oddUtf16: true }));
    expect(root.entries[0]?.nameLength).toBe(11);
    expect(root.entries.slice(1).every((e) => e.nameLength % 2 === 0)).toBe(true);
    expect(readContainer(makeFlipchart([STROKE], deflate)).entries.every((e) => e.nameLength % 2 === 0)).toBe(true);
  });

  it("fabrique : objets de S4 dans l'index, les flux et les ressources", () => {
    const page: FabPage = {
      strokes: [{ points: [[0, 0], [20, 10]], color: 0xff0000, width: 3 }],
      lines: [{ points: [[0, 50], [100, 50]] }],
      rects: [{ x: 10, y: 10, w: 80, h: 40, fill: 0x3366cc }],
      texts: [{ x: 200, y: 100, runs: [{ text: "Bonjour ", bold: true, size: 24 }, { text: "monde", color: 0x0000ff }] }],
      images: [
        { name: "photo.png", bytes: PNG, x: 300, y: 300, w: 64, h: 48 },
        { name: "scan.tif", bytes: TIFF, x: 400, y: 300, w: 32, h: 32 },
      ],
      actions: 1,
    };
    const root = readContainer(makeFlipchart([page, {}], deflate));
    const inner = readContainer(inflate(entry(root, "1003.fpg")));
    const children = readIndex(inflate(entry(inner, "1003.in"))).children;
    expect(children.map((n) => n.type)).toEqual([3, 5, 7, 11, 9, 9, 28]);
    for (const n of children) expect(objectType(inflate(entry(inner, `${n.storage}.io`)))).toBe(n.type);
    const resources = root.entries.filter((e) => e.name.endsWith(".ir")).map((e) => objectType(inflate(e)));
    expect(resources.sort((a, b) => a - b)).toEqual([4, 6, 10, 10, 12]);
    for (const [name, bytes] of [["photo.png", PNG], ["scan.tif", TIFF]] as const) {
      const image = entry(root, name);
      expect([image.compressed, image.announced]).toEqual([0, bytes.length]);
      expect(image.stored).toEqual(bytes);
    }
    expect(readIndex(inflate(entry(readContainer(inflate(entry(root, "2003.fpg"))), "2003.in"))).children).toEqual([]);
  });

  it("fabrique : deflate injecté, aucun zlib importé", () => {
    let calls = 0;
    makeFlipchart([STROKE], (bytes) => {
      calls += 1;
      return deflate(bytes);
    });
    expect(calls).toBeGreaterThan(0);
    const source = readFileSync(fileURLToPath(new URL("../../../../scripts/essais/fabriques/flipchart.mjs", import.meta.url)), "utf8");
    expect(source).not.toMatch(/["'](?:fflate|node:zlib|zlib)["']|require\(/);
  });
});
