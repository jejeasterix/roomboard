import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { pdfPages } from "../../../scripts/essais/fabriques/pdf.mjs";
import { PDF_FONT_FILES, PDF_WRITE_FAILED_MESSAGE } from "../../web/src/app/pdf-overlay-vector";
import { fakeCore } from "../../web/src/core/fake-core";
import type { RecordedList } from "../../web/src/engine/render/record-ctx";
import type { FormatsBinding } from "../../web/src/platform/container";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { loadNodePdfjs, NO_RASTER_SUFFIX, NO_RENDER_MESSAGE, nodeMeasureContext, nodeOverlay, nodePdfEngine, nodePdfFonts, nodePdfWriter, pdfjsFontsDir } from "./pdf-node";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, tmpDir, WEB_SRC, warmModules } from "./testing";
import { loadFormats } from "./wasm-node";

const LIST: RecordedList = { ops: new Float32Array([0]), texts: [], images: [], drawn: [1] };
const formatsOf = (mod: object): (() => Promise<FormatsBinding>) => async () => mod as unknown as FormatsBinding;
const REQ = (pageId: string) => ({ pageId, rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, box: { w: 842, h: 473.625 } });

describe("pdf.js en processus (cli-lot3, D32, D33)", () => {
  // Discrimine le patron de la page (`workerSrc`/`workerPort`, pdf-load.ts:53-55) et le faux worker laissé à pdf.js :
  // sous Node, pdf.js règle seul `workerSrc = "./pdf.worker.mjs"` et l'importe au premier document, ce qui pose aussi
  // `globalThis.pdfjsWorker` (pdf.worker.mjs) ; ce chemin relatif casse dans le fichier construit. Le worker doit donc
  // être posé par `loadNodePdfjs` lui-même, avant tout document, sans toucher `GlobalWorkerOptions`.
  it("loadNodePdfjs — worker posé sur globalThis.pdfjsWorker avant tout document ; GlobalWorkerOptions laissé à pdf.js", async () => {
    type WithWorker = { pdfjsWorker?: { WorkerMessageHandler?: unknown } };
    delete (globalThis as WithWorker).pdfjsWorker;
    await loadNodePdfjs();
    expect(typeof (globalThis as WithWorker).pdfjsWorker?.WorkerMessageHandler).toBe("function");
    expect(GlobalWorkerOptions.workerPort).toBeNull();
    expect(GlobalWorkerOptions.workerSrc).toBe("./pdf.worker.mjs");
  });
  it("nodePdfEngine — 3 pages 612 × 792 lues ; worker de pdf.js posé sur globalThis.pdfjsWorker", async () => {
    const f = await nodePdfEngine().open(new Blob([(await pdfPages(await loadPdfLib(), 3)) as BlobPart]));
    try {
      expect(f.pageCount).toBe(3);
      expect(await f.pageSize(1)).toEqual({ w: 612, h: 792 });
    } finally {
      f.destroy();
    }
    expect(typeof (globalThis as { pdfjsWorker?: { WorkerMessageHandler?: unknown } }).pdfjsWorker?.WorkerMessageHandler).toBe("function");
  });
  it("nodePdfEngine — renderTile lève « rendu en image indisponible dans la CLI » : aucun canvas", async () => {
    const f = await nodePdfEngine().open(new Blob([(await pdfPages(await loadPdfLib(), 1)) as BlobPart]));
    try {
      await expect(f.renderTile(0, 1, { x: 0, y: 0, w: 8, h: 8 }, new AbortController().signal)).rejects.toThrow(NO_RENDER_MESSAGE);
    } finally {
      f.destroy();
    }
  });
  it("nodePdfEngine — PDF invalide (%PDF-1.4 %%EOF) : open rejette ; isPasswordError faux sur une erreur ordinaire", async () => {
    await expect(nodePdfEngine().open(new Blob(["%PDF-1.4\n%%EOF\n"]))).rejects.toThrow();
    expect((await loadNodePdfjs()).isPasswordError(new Error("x"))).toBe(false);
  });
});

describe("mesure sans canvas (D37, H25, H26)", () => {
  it("nodeMeasureContext — fillStyle normalisé : #F00 → #ff0000 ; « red » illisible → précédente ; rgba gardée ; #rrggbbaa → rgba", () => {
    const m = nodeMeasureContext();
    expect(m.fillStyle).toBe("#000000");
    m.fillStyle = "#F00";
    expect(m.fillStyle).toBe("#ff0000");
    m.fillStyle = "red";
    expect(m.fillStyle).toBe("#ff0000");
    m.fillStyle = "rgba(0, 128, 255, 0.5)";
    expect(m.fillStyle).toBe("rgba(0, 128, 255, 0.5)");
    m.fillStyle = "#11223380";
    expect(m.fillStyle).toBe(`rgba(17, 34, 51, ${0x80 / 255})`);
  });
  it("nodeMeasureContext — measureText : 0,6 × taille lue dans font × longueur", () => {
    const m = nodeMeasureContext();
    m.font = 'bold 20px "Atkinson Hyperlegible", sans-serif';
    expect(m.measureText("abc").width).toBeCloseTo(36);
  });
});

describe("polices lues dans pdfjs-dist installé (D48, H31)", () => {
  // Discrimine la copie (greffon de vite.config.ts, dossier de dist/) : le dossier lu est celui du paquet installé.
  it("pdfjsFontsDir — standard_fonts du paquet pdfjs-dist 6.5.438 installé, aucun exemplaire copié", () => {
    const pkg = JSON.parse(readFileSync(join(pdfjsFontsDir(), "..", "package.json"), "utf8")) as { name?: unknown; version?: unknown };
    expect([pkg.name, pkg.version]).toEqual(["pdfjs-dist", "6.5.438"]);
  });
  it("nodePdfFonts — quatre faces TrueType lues une fois (même promesse au second appel)", async () => {
    const fonts = nodePdfFonts();
    const first = fonts();
    expect(fonts()).toBe(first);
    const faces = await first;
    expect(faces).toHaveLength(PDF_FONT_FILES.length);
    for (const f of faces) expect([...f.subarray(0, 4)]).toEqual([0, 1, 0, 0]);
  });
  it("nodePdfFonts — dossier sans police : « police … absente », relue au prochain appel", async () => {
    const fonts = nodePdfFonts(tmpDir());
    await expect(fonts()).rejects.toThrow(/^police LiberationSans-[A-Za-z]+\.ttf absente$/);
    await expect(fonts()).rejects.toThrow(/absente/);
  });
});

describe("krilla en processus (D38, D29)", () => {
  it("nodePdfWriter — octets du module rendus ; onPanic non appelé", async () => {
    const onPanic = vi.fn();
    const write = nodePdfWriter(formatsOf({ write_pdf_pages: () => new Uint8Array([1, 2, 3]) }), onPanic);
    expect(await write(LIST, [new Uint8Array([9])], [])).toEqual(new Uint8Array([1, 2, 3]));
    expect(onPanic).not.toHaveBeenCalled();
  });
  it("nodePdfWriter — erreur ordinaire du module : rejet avec son message, onPanic non appelé", async () => {
    const onPanic = vi.fn();
    const write = nodePdfWriter(formatsOf({ write_pdf_pages: () => { throw new Error("page refusée"); } }), onPanic);
    await expect(write(LIST, [], [])).rejects.toThrow("page refusée");
    expect(onPanic).not.toHaveBeenCalled();
  });
  it("nodePdfWriter — panique (RuntimeError) : rejet « écriture du PDF interrompue », onPanic une fois", async () => {
    const onPanic = vi.fn();
    const write = nodePdfWriter(formatsOf({ write_pdf_pages: () => { throw new WebAssembly.RuntimeError("unreachable"); } }), onPanic);
    await expect(write(LIST, [], [])).rejects.toThrow(PDF_WRITE_FAILED_MESSAGE);
    expect(onPanic).toHaveBeenCalledTimes(1);
  });
  it("nodePdfWriter — module sans écrivain : « module de l'écrivain PDF indisponible »", async () => {
    await expect(nodePdfWriter(formatsOf({}), vi.fn())(LIST, [], [])).rejects.toThrow("module de l'écrivain PDF indisponible");
  });
  // Discrimine le chemin de référence (board-node.ts:24, `formats()` hors du `try`) : un module absent n'est pas une
  // panique, l'instance n'est pas tenue pour non sûre.
  it("nodePdfWriter — module formats absent (formats() rejette) : rejet « écriture du PDF interrompue », onPanic non appelé", async () => {
    const onPanic = vi.fn();
    const write = nodePdfWriter(async () => {
      throw new Error("module formats introuvable");
    }, onPanic);
    await expect(write(LIST, [], [])).rejects.toThrow(PDF_WRITE_FAILED_MESSAGE);
    expect(onPanic).not.toHaveBeenCalled();
  });
});

describeWasm("superposition vectorielle de la CLI sur le vrai module (D37)", () => {
  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test
  async function drawn() {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    await s.exec(JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null }));
    await s.exec(JSON.stringify({ type: "SetText", page: "$page:0", id: null, x: 400, y: 100, content: "Annotation CLI", color: "red", size: 36, boxWidth: 600, boxHeight: 45 }));
    return { tab, page: tab.doc.pageIds()[0]! };
  }
  it("nodeOverlay — un rectangle et un texte (couleur nommée, H25) : une page PDF krilla, onPanic non appelé", async () => {
    const { tab, page } = await drawn();
    const onPanic = vi.fn();
    const out = await nodeOverlay(tab.doc, tab.assets, nodePdfWriter(loadFormats(WEB_SRC), onPanic)).pages([REQ(page)]);
    expect(out).toHaveLength(1);
    const o = out[0]!;
    expect(o.kind).toBe("pdf");
    expect(new TextDecoder().decode(o.bytes.subarray(0, 5))).toBe("%PDF-");
    expect(onPanic).not.toHaveBeenCalled();
  });
  it("nodeOverlay — écrivain en échec : « superposition vectorielle impossible (krilla) (repli en image indisponible dans la CLI) »", async () => {
    const { tab, page } = await drawn();
    const failing = async (): Promise<Uint8Array> => {
      throw new Error("krilla");
    };
    await expect(nodeOverlay(tab.doc, tab.assets, failing).pages([REQ(page)])).rejects.toThrow(`superposition vectorielle impossible (krilla)${NO_RASTER_SUFFIX}`);
  });
});

/** PNG valide w × h, RVB uni : krilla le décode et l'embarque. */
function solidPng(w: number, h: number): Uint8Array<ArrayBuffer> {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Uint8Array): number => {
    let c = 0xffffffff;
    for (const x of b) c = ((table[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8)) >>> 0;
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    v.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, w);
  new DataView(ihdr.buffer).setUint32(4, h);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const raw = new Uint8Array(h * (1 + 3 * w));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([200, 30, 30], y * (1 + 3 * w) + 1 + 3 * x);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", new Uint8Array(deflateSync(raw))), chunk("IEND", new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
  let at = 0;
  for (const x of parts) {
    png.set(x, at);
    at += x.length;
  }
  return png;
}

describeWasm("export PDF de la CLI : image de fond de case (personnalisation-3, C1)", () => {
  beforeAll(warmModules);
  it("nodeOverlay — case à fond PNG 20 × 10 : image couvrant la case dans la liste écrite, PDF krilla rendu avec une image", async () => {
    const ID = "ab".repeat(32);
    const png = solidPng(20, 10);
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    const table = doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 1, rows: 1, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0]!;
    const image = doc.apply({ type: "AddImage", page, asset: { id: ID, name: "fond.png", mime: "image/png", size: png.length }, w: 20, h: 10, matrix: [1, 0, 0, 1, 1000, 1000] }).ids[0]!;
    const view = doc.element(table);
    if (view?.kind !== "table") throw new Error("tableau");
    const row = view.table.rows[0]!.id;
    const col = view.table.cols[0]!.id;
    doc.apply({ type: "PlaceInCell", ids: [image], matrix: [1, 0, 0, 1, 8, 8], cell: [table, row, col], sizes: [] });
    doc.apply({ type: "SetCellImage", id: table, row, col, from: image });
    const onPanic = vi.fn();
    const real = nodePdfWriter(loadFormats(WEB_SRC), onPanic);
    const seen: { list: RecordedList; images: readonly Uint8Array[] }[] = [];
    const assets = { get: (id: string) => (id === ID ? new Blob([png], { type: "image/png" }) : undefined) };
    const out = await nodeOverlay(doc, assets, async (list, fonts, images) => {
      seen.push({ list, images });
      return real(list, fonts, images);
    }).pages([REQ(page)]);
    const after = doc.element(table);
    if (after?.kind !== "table") throw new Error("tableau");
    const w = after.table.cols[0]!.width;
    const h = after.table.rows[0]!.height;
    const k = Math.max(w / 20, h / 10);
    const ops = seen[0]!.list.ops;
    const want = [0, (w - 20 * k) / 2, (h - 10 * k) / 2, 20 * k, 10 * k];
    const found = Array.from({ length: ops.length }, (_, i) => i).some((i) => want.every((x, j) => ops[i + j] === x));
    expect(seen[0]!.list.images).toHaveLength(1);
    expect(seen[0]!.images).toEqual([png]);
    expect(found).toBe(true);
    const o = out[0]!;
    expect(o.kind).toBe("pdf");
    const text = new TextDecoder("latin1").decode(o.bytes);
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toMatch(/\/Subtype\s*\/Image/);
    expect(onPanic).not.toHaveBeenCalled();
  });
});
