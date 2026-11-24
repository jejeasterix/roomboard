import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it, vi } from "vitest";
import { pdfPages } from "../../../scripts/essais/fabriques/pdf.mjs";
import { PDF_FONT_FILES, PDF_WRITE_FAILED_MESSAGE } from "../../web/src/app/pdf-overlay-vector";
import type { RecordedList } from "../../web/src/engine/render/record-ctx";
import type { FormatsBinding } from "../../web/src/platform/container";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { loadNodePdfjs, NO_RASTER_SUFFIX, NO_RENDER_MESSAGE, nodeMeasureContext, nodeOverlay, nodePdfEngine, nodePdfFonts, nodePdfWriter, pdfjsFontsDir } from "./pdf-node";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, tmpDir, WEB_SRC } from "./testing";
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
    const g = globalThis as { pdfjsWorker?: { WorkerMessageHandler?: unknown } };
    delete g.pdfjsWorker;
    await loadNodePdfjs();
    expect(typeof g.pdfjsWorker?.WorkerMessageHandler).toBe("function");
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
