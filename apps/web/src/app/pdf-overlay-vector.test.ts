import { PDFDict, PDFDocument, PDFName, PDFStream } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { AssetInfo } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { RecordingContext2D, type RecordedList } from "../engine/render/record-ctx";
import { hasPdfWriter, type FormatsBinding } from "../platform/container";
import type { WorkerLike } from "../platform/one-shot-worker";
import { createVectorOverlay, fallbackOverlay, PDF_WRITE_FAILED_MESSAGE, vectorPainter, workerPdfWriter, type PdfWriter } from "./pdf-overlay-vector";
import type { OverlayProducer } from "./pdf-export";

interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm-formats/roomboard_formats_wasm_bg.wasm", import.meta.url);
const fontFile = new URL("../../../../crates/roomboard-formats/tests/fixtures/LiberationSans-Regular.ttf", import.meta.url);
const present = fs.existsSync(wasmFile);
it("le module formats est présent quand il est exigé", () => {
  if (env["ROOMBOARD_WASM_REQUIRED"] === "1") expect(present).toBe(true);
});
async function loadFormats(): Promise<FormatsBinding> {
  const mod = (await import(/* @vite-ignore */ new URL("../wasm-formats/roomboard_formats_wasm.js", import.meta.url).href)) as FormatsBinding & { initSync(o: { module: Uint8Array }): unknown };
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return mod;
}
const formats = present ? await loadFormats() : null;

class Real {
  private v = "#000000";
  font = "";
  get fillStyle(): string { return this.v; }
  set fillStyle(c: string) { if (/^#[0-9a-f]{6}$/i.test(c)) this.v = c; }
  measureText(t: string): TextMetrics { return { width: t.length * 10 } as TextMetrics; }
}
const IMG = "ab".repeat(32);
const info = (id: string, mime: string): AssetInfo => ({ id, name: id, mime, size: 3 });
const req = (pageId: string) => ({ pageId, rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, box: { w: 842, h: 473.625 } });

function producer(
  write: PdfWriter,
  draw: (ctx: CanvasRenderingContext2D, page: string, images: { bitmap(id: string): CanvasImageSource | null }) => void,
  cited: AssetInfo[] = [],
  alive: () => boolean = () => true,
) {
  return createVectorOverlay({
    doc: { elementIds: (p) => [`${p}-a`], citedAssets: () => cited },
    assets: { get: () => new Blob([new Uint8Array([1, 2, 3])]) },
    alive,
    measure: new Real() as unknown as CanvasRenderingContext2D,
    painter: (_ctx, images) => ({ paintContent: (ctx, page) => draw(ctx, page.id, images) }),
    fonts: async () => [new Uint8Array([9])],
    toPng: async () => new Uint8Array([8]),
    write,
  });
}

/** Faux Worker dont la réponse est jouée au `postMessage` ; garde ce qu'il a reçu et ses arrêts. */
function fakeWorkers(replies: readonly ((w: WorkerLike) => void)[]) {
  const made: { posted: unknown[]; terminate: ReturnType<typeof vi.fn> }[] = [];
  const spawn = vi.fn((): WorkerLike => {
    const k = made.length;
    const rec = { posted: [] as unknown[], terminate: vi.fn() };
    made.push(rec);
    const w: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage: (m) => {
        rec.posted.push(m);
        queueMicrotask(() => replies[k]?.(w));
      },
      terminate: rec.terminate,
    };
    return w;
  });
  return { spawn, made };
}

describe("superposition vectorielle (C12, PF22)", () => {
  it("une page krilla par requête, à la boîte vue, en un seul appel ; page sans dessin : null", async () => {
    const lists: RecordedList[] = [];
    const write = vi.fn(async (l: RecordedList) => (lists.push(l), new Uint8Array([7])));
    const out = await producer(write, (ctx, page) => {
      if (page === "p1") ctx.fillRect(0, 0, 10, 10);
    }).pages([req("p1"), req("p2")]);
    expect(write).toHaveBeenCalledTimes(1);
    expect(Array.from(lists[0]!.ops.slice(0, 3))).toEqual([1, 842, 473.625]);
    expect(lists[0]!.drawn).toEqual([1, 0]);
    expect(out).toEqual([{ kind: "pdf", bytes: new Uint8Array([7]), index: 0 }, null]);
  });

  it("images : PNG et JPEG passés tels quels, autre type converti en PNG ; une entrée par image dessinée, dans l'ordre", async () => {
    const seen: (readonly Uint8Array[])[] = [];
    const write: PdfWriter = async (_l, _f, images) => (seen.push(images), new Uint8Array([7]));
    const cited = [info(IMG, "image/png"), info("cd".repeat(32), "image/webp"), info("ef".repeat(32), "application/pdf")];
    await producer(write, (ctx, _p, images) => {
      for (const id of [IMG, "cd".repeat(32), "ef".repeat(32)]) {
        const b = images.bitmap(id);
        if (b !== null) ctx.drawImage(b, 0, 0, 5, 5);
      }
    }, cited).pages([req("p1")]);
    expect(seen[0]?.map((b) => Array.from(b))).toEqual([[1, 2, 3], [8]]);
  });

  it("onglet fermé (alive faux) : rien n'est peint ni écrit, null partout (comme le producteur PNG)", async () => {
    const write = vi.fn(async () => new Uint8Array([7]));
    const draw = vi.fn((ctx: CanvasRenderingContext2D) => ctx.fillRect(0, 0, 10, 10));
    expect(await producer(write, draw, [], () => false).pages([req("p1"), req("p2")])).toEqual([null, null]);
    expect([draw.mock.calls.length, write.mock.calls.length]).toEqual([0, 0]);
  });

  it("workerPdfWriter : un Worker neuf par export, arrêté après sa réponse ; une panique n'atteint pas l'export suivant (HR6)", async () => {
    const { spawn, made } = fakeWorkers([
      (w) => w.onerror?.(new Error("unreachable")),
      (w) => w.onmessage?.({ data: { bytes: new Uint8Array([7]) } }),
    ]);
    const write = workerPdfWriter(spawn);
    const rec = new RecordingContext2D(new Real() as unknown as CanvasRenderingContext2D);
    rec.page(10, 10);
    rec.fillRect(0, 0, 1, 1);
    const list = rec.encode();
    await expect(write(list, [new Uint8Array([9])], [])).rejects.toThrow(PDF_WRITE_FAILED_MESSAGE);
    expect(await write(list, [new Uint8Array([9])], [])).toEqual(new Uint8Array([7]));
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(made.map((m) => [m.posted.length, m.terminate.mock.calls.length])).toEqual([[1, 1], [1, 1]]);
    expect(Array.from(list.ops.slice(0, 3))).toEqual([1, 10, 10]);
  });

  it("garde hasPdfWriter ; module sans écrivain : réponse { error }, Worker arrêté, PNG en repli (PC14)", async () => {
    const old = { ContainerReader: { open: () => { throw new Error("x"); } }, write_container: () => new Uint8Array() } as unknown as FormatsBinding;
    expect([hasPdfWriter(old), hasPdfWriter({ ...old, write_pdf_pages: () => new Uint8Array() } as FormatsBinding)]).toEqual([false, true]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { spawn, made } = fakeWorkers([(w) => w.onmessage?.({ data: { error: "module de l'écrivain PDF indisponible" } })]);
    const png: OverlayProducer = { pages: async (r) => r.map(() => ({ kind: "png" as const, bytes: new Uint8Array([4]) })) };
    const both = fallbackOverlay(producer(workerPdfWriter(spawn), (ctx) => ctx.fillRect(0, 0, 10, 10)), png);
    expect(await both.pages([req("p1")])).toEqual([{ kind: "png", bytes: new Uint8Array([4]) }]);
    expect(made.map((m) => m.terminate.mock.calls.length)).toEqual([1]);
    expect(String(warn.mock.calls[0]?.[0])).toContain("module de l'écrivain PDF indisponible");
    warn.mockRestore();
  });

  it("fallbackOverlay : vecteur réussi, PNG jamais appelé ; vecteur en échec, PNG et avertissement", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const pngPages = vi.fn(async (r: readonly unknown[]) => r.map(() => ({ kind: "png" as const, bytes: new Uint8Array([4]) })));
    const png: OverlayProducer = { pages: pngPages };
    const vec: OverlayProducer = { pages: async () => [{ kind: "pdf", bytes: new Uint8Array([7]), index: 0 }] };
    expect(await fallbackOverlay(vec, png).pages([req("p1")])).toEqual([{ kind: "pdf", bytes: new Uint8Array([7]), index: 0 }]);
    expect([pngPages.mock.calls.length, warn.mock.calls.length]).toEqual([0, 0]);
    const broken: OverlayProducer = { pages: async () => Promise.reject(new Error("krilla")) };
    expect(await fallbackOverlay(broken, png).pages([req("p1")])).toEqual([{ kind: "png", bytes: new Uint8Array([4]) }]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it.skipIf(formats === null)("vrai module formats : aucune image, texte en police, une page par requête (S5)", async () => {
    const mod = formats!;
    expect(hasPdfWriter(mod)).toBe(true);
    if (!hasPdfWriter(mod)) return;
    const write: PdfWriter = async (l, fonts, images) => {
      const cat = (xs: readonly Uint8Array[]) => {
        const out = new Uint8Array(xs.reduce((n, x) => n + x.length, 0));
        let at = 0;
        for (const x of xs) (out.set(x, at), (at += x.length));
        return out;
      };
      return mod.write_pdf_pages(l.ops, [...l.texts], cat(fonts), Uint32Array.from(fonts.map((f) => f.length)), cat(images), Uint32Array.from(images.map((i) => i.length)));
    };
    const font = fs.readFileSync(fontFile);
    const out = await createVectorOverlay({
      doc: { elementIds: () => ["a"], citedAssets: () => [] },
      assets: { get: () => undefined },
      alive: () => true,
      measure: new Real() as unknown as CanvasRenderingContext2D,
      painter: () => ({
        paintContent: (ctx) => {
          ctx.font = "36px sans-serif";
          ctx.textBaseline = "top";
          ctx.fillText("RoomBoard vectoriel", 20, 20);
          ctx.beginPath();
          ctx.rect(10, 100, 200, 50);
          ctx.stroke();
        },
      }),
      fonts: async () => [font, font, font, font],
      toPng: async () => new Uint8Array(),
      write,
    }).pages([req("p1"), req("p2")]);
    const bytes = out[0]?.kind === "pdf" ? out[0].bytes : new Uint8Array();
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    const res = pdf.getPage(0).node.Resources();
    const xo = res?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    const kinds = xo === undefined ? [] : xo.keys().map((k) => String(xo.lookup(k, PDFStream).dict.get(PDFName.of("Subtype"))));
    expect(kinds).not.toContain("/Image");
    expect(res?.lookupMaybe(PDFName.of("Font"), PDFDict)?.keys().length ?? 0).toBeGreaterThan(0);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({ data: bytes.slice() });
    const doc = await task.promise;
    const text = (await (await doc.getPage(1)).getTextContent()).items.map((it) => ("str" in it ? it.str : "")).join("");
    await task.destroy();
    expect(text).toContain("RoomBoard vectoriel");
  });
});

describe("vectorPainter (cli-lot3, D37)", () => {
  it("vectorPainter — peint le contenu de la page avec des chemins enregistrés : un rectangle → un dessin, une page krilla demandée", async () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null });
    const lists: RecordedList[] = [];
    const out = await createVectorOverlay({
      doc,
      assets: { get: () => undefined },
      alive: () => true,
      measure: new Real() as unknown as CanvasRenderingContext2D,
      painter: vectorPainter(doc),
      fonts: async () => [new Uint8Array([9])],
      toPng: async () => new Uint8Array(0),
      write: async (l) => {
        lists.push(l);
        return new Uint8Array([7]);
      },
    }).pages([req(page)]);
    expect(out).toEqual([{ kind: "pdf", bytes: new Uint8Array([7]), index: 0 }]);
    expect(lists).toHaveLength(1);
    expect(lists[0]!.drawn[0]).toBeGreaterThan(0);
  });
  it("vectorPainter — trait d'encre : contour tracé par RecordingPath, jamais Path2D (piégé : le peintre de l'écran lèverait)", async () => {
    // pdf.js (legacy) pose un Path2D de remplacement dans Node : piégé ici, indépendamment de l'ordre des tests.
    vi.stubGlobal(
      "Path2D",
      class {
        constructor() {
          throw new Error("Path2D appelé");
        }
      },
    );
    try {
      await paintStroke();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/** Un trait d'encre peint par `vectorPainter` : son contour passe par `makePath` (`Canvas2DRenderer.pathOf`). */
async function paintStroke(): Promise<void> {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0]!;
  doc.apply({ type: "CommitStroke", page, points: new Float32Array([100, 700, 0.5, 200, 700, 0.5, 300, 760, 0.5]), style: { color: "#000000", width: 4 } });
  const lists: RecordedList[] = [];
  const out = await createVectorOverlay({
    doc,
    assets: { get: () => undefined },
    alive: () => true,
    measure: new Real() as unknown as CanvasRenderingContext2D,
    painter: vectorPainter(doc),
    fonts: async () => [new Uint8Array([9])],
    toPng: async () => new Uint8Array(0),
    write: async (l) => {
      lists.push(l);
      return new Uint8Array([7]);
    },
  }).pages([req(page)]);
  expect(out).toEqual([{ kind: "pdf", bytes: new Uint8Array([7]), index: 0 }]);
  expect(lists[0]!.drawn[0]).toBeGreaterThan(0);
}
