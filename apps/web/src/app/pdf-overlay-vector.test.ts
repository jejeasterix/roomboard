import { PDFDict, PDFDocument, PDFName, PDFStream } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { AssetInfo, TableData } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { OP, RecordingContext2D, SEG, type RecordedList } from "../engine/render/record-ctx";
import { paintTableGrid } from "../engine/render/table-paint";
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

/** Traits d'une liste enregistrée (codes de `record-ctx.ts`) : alpha de la couleur, tirets, nombre de cubiques. */
function strokesOf(l: RecordedList): { alpha: number; dash: number[]; cubics: number }[] {
  const o = Array.from(l.ops);
  const out: { alpha: number; dash: number[]; cubics: number }[] = [];
  let k = 0;
  const path = (): number => {
    const n = o[k++] ?? 0;
    let cubics = 0;
    for (let i = 0; i < n; i++) {
      const s = o[k++];
      if (s === SEG.move || s === SEG.line) k += 2;
      else if (s === SEG.cubic) (k += 6), cubics++;
    }
    return cubics;
  };
  while (k < o.length) {
    const op = o[k++];
    if (op === OP.page) k += 2;
    else if (op === OP.save || op === OP.restore) continue;
    else if (op === OP.fill) (k += 11), path();
    else if (op === OP.clip) (k += 7), path();
    else if (op === OP.text) k += 16;
    else if (op === OP.image) k += 12;
    else if (op === OP.stroke) {
      k += 6;
      const alpha = o[k + 3] ?? 1;
      k += 7;
      const n = o[k++] ?? 0;
      const dash = o.slice(k, k + n);
      k += n + 1;
      out.push({ alpha, dash, cubics: path() });
    } else throw new Error(`code inconnu ${String(op)} à ${k - 1}`);
  }
  return out;
}

describe("vectorPainter (OG11, T8)", () => {
  it("export vectoriel : tirets et alpha — rectangle en tirets, transparence 50, angles arrondis : dash [8, 12], alpha 0,5, Bézier", async () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null });
    const look = { strokeStyle: "dashed", opacity: 50, roundness: "round" } as const;
    // Le faux cœur ne pose pas encore `look` (T4) : la vue de l'élément le reçoit ici, le reste est le cœur tel quel.
    const withLook = new Proxy(doc, {
      get(t, k) {
        if (k === "element") return (id: string) => {
          const v = t.element(id);
          return v && v.kind === "shape" ? { ...v, look } : v;
        };
        const v: unknown = Reflect.get(t, k, t);
        return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(t) : v;
      },
    });
    const lists: RecordedList[] = [];
    await createVectorOverlay({
      doc: withLook,
      assets: { get: () => undefined },
      alive: () => true,
      measure: new Real() as unknown as CanvasRenderingContext2D,
      painter: vectorPainter(withLook),
      fonts: async () => [new Uint8Array([9])],
      toPng: async () => new Uint8Array(0),
      write: async (l) => {
        lists.push(l);
        return new Uint8Array([7]);
      },
    }).pages([req(page)]);
    expect(lists).toHaveLength(1);
    const strokes = strokesOf(lists[0]!);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]!.dash).toEqual([8, 12]);
    expect(strokes[0]!.alpha).toBeCloseTo(0.5);
    expect(strokes[0]!.cubics).toBe(4);
  });

  it("export vectoriel : architecte — même rectangle sans aspect : trait plein, opaque, sans Bézier", async () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null });
    const lists: RecordedList[] = [];
    await createVectorOverlay({
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
    expect(strokesOf(lists[0]!)).toEqual([{ alpha: 1, dash: [], cubics: 0 }]);
  });
});

/** PNG réduit à sa signature et à son IHDR : `probeSize` y lit la taille, sans décodage. */
function pngHeader(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  return b;
}

/** Position de la suite `seq` dans les opérations enregistrées, -1 si absente. */
function indexOfSeq(ops: ArrayLike<number>, seq: readonly number[]): number {
  for (let i = 0; i + seq.length <= ops.length; i++) if (seq.every((x, k) => ops[i + k] === x)) return i;
  return -1;
}

describe("superposition vectorielle : image de fond de case (personnalisation-3, T9, C1)", () => {
  const table: TableData = {
    color: "#000000", size: 36, cols: [{ id: "c0", width: 240 }], rows: [{ id: "r0", height: 64 }],
    cells: [{ row: "r0", col: "c0", text: "", fill: null, shade: null, spans: [], bg: IMG }], merges: [],
  };
  /** Vrais jetons, vrai enregistreur, vrai peintre de tableau : seul l'écrivain est faux. */
  const run = async (bytes: Uint8Array<ArrayBuffer>) => {
    const lists: RecordedList[] = [];
    const written: (readonly Uint8Array[])[] = [];
    await createVectorOverlay({
      doc: { elementIds: (p) => [`${p}-t`], citedAssets: () => [info(IMG, "image/png")] },
      assets: { get: (id) => (id === IMG ? new Blob([bytes]) : undefined) },
      alive: () => true,
      measure: new Real() as unknown as CanvasRenderingContext2D,
      painter: (_ctx, images) => ({ paintContent: (ctx) => paintTableGrid(ctx, table, images) }),
      fonts: async () => [new Uint8Array([9])],
      toPng: async () => new Uint8Array(0),
      write: async (l, _fonts, images) => {
        lists.push(l);
        written.push(images);
        return new Uint8Array([7]);
      },
    }).pages([req("p")]);
    return { list: lists[0]!, images: written[0]! };
  };

  it("C1 : fond PNG 20 x 10 dans une case 240 x 64 — « couvrir » comme à l'écran : 240 x 120 décalé de -28, octets passés à l'écrivain", async () => {
    const png = pngHeader(20, 10);
    const { list, images } = await run(png);
    expect(list.images).toHaveLength(1);
    expect(images).toEqual([png]);
    // index de l'image, x, y, largeur, hauteur de l'opération image (la taille vient de l'en-tête, pas du jeton).
    expect(indexOfSeq(list.ops, [0, 0, -28, 240, 120])).toBeGreaterThan(-1);
    expect(list.ops.indexOf(OP.clip)).toBeGreaterThan(-1);
  });

  it("C1 bout en bout : fakeCore et vectorPainter — fond posé par SetCellImage : une image couvrant la case, octets PNG à l'écrivain", async () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    const table = doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 1, rows: 1, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0]!;
    const image = doc.apply({ type: "AddImage", page, asset: info(IMG, "image/png"), w: 20, h: 10, matrix: [1, 0, 0, 1, 1000, 1000] }).ids[0]!;
    const view = doc.element(table);
    if (view?.kind !== "table") throw new Error("tableau");
    const row = view.table.rows[0]!.id;
    const col = view.table.cols[0]!.id;
    doc.apply({ type: "PlaceInCell", ids: [image], matrix: [1, 0, 0, 1, 8, 8], cell: [table, row, col], sizes: [] });
    doc.apply({ type: "SetCellImage", id: table, row, col, from: image });
    const png = pngHeader(20, 10);
    const lists: RecordedList[] = [];
    const written: (readonly Uint8Array[])[] = [];
    await createVectorOverlay({
      doc,
      assets: { get: (id) => (id === IMG ? new Blob([png], { type: "image/png" }) : undefined) },
      alive: () => true,
      measure: new Real() as unknown as CanvasRenderingContext2D,
      painter: vectorPainter(doc),
      fonts: async () => [new Uint8Array([9])],
      toPng: async () => new Uint8Array(0),
      write: async (l, _fonts, images) => {
        lists.push(l);
        written.push(images);
        return new Uint8Array([7]);
      },
    }).pages([req(page)]);
    const after = doc.element(table);
    if (after?.kind !== "table") throw new Error("tableau");
    expect(after.table.cells.find((c) => c.row === row && c.col === col)?.bg).toBe(IMG);
    const w = after.table.cols[0]!.width;
    const h = after.table.rows[0]!.height;
    const k = Math.max(w / 20, h / 10);
    expect(lists[0]!.images).toHaveLength(1);
    expect(written[0]).toEqual([png]);
    expect(indexOfSeq(lists[0]!.ops, [0, (w - 20 * k) / 2, (h - 10 * k) / 2, 20 * k, 10 * k])).toBeGreaterThan(-1);
  });

  it("C1 : en-tête illisible — le fond remplit la case (240 x 64) plutôt que de disparaître", async () => {
    const { list } = await run(new Uint8Array([1, 2, 3]));
    expect(list.images).toHaveLength(1);
    expect(indexOfSeq(list.ops, [0, 0, 0, 240, 64])).toBeGreaterThan(-1);
  });
});

describe("superposition vectorielle : en-tête de tableau (personnalisation-3, TB2, S10)", () => {
  const mk = (header: boolean): TableData => ({
    color: "#000000", size: 36, cols: [{ id: "c0", width: 240 }], rows: [{ id: "r0", height: 64 }],
    cells: [], merges: [], ...(header ? { header: true } : {}),
  });
  const run = async (table: TableData) => {
    const lists: RecordedList[] = [];
    await createVectorOverlay({
      doc: { elementIds: (p) => [`${p}-t`], citedAssets: () => [] },
      assets: { get: () => undefined },
      alive: () => true,
      measure: new Real() as unknown as CanvasRenderingContext2D,
      painter: (_ctx, images) => ({ paintContent: (ctx) => paintTableGrid(ctx, table, images) }),
      fonts: async () => [new Uint8Array([9])],
      toPng: async () => new Uint8Array(0),
      write: async (l) => {
        lists.push(l);
        return new Uint8Array([7]);
      },
    }).pages([req("p")]);
    return lists[0]!;
  };
  const has = (l: RecordedList): boolean => indexOfSeq(l.ops, [224, 224, 232]) > -1;

  it("TB2 : le fond d'en-tête #E0E0E8 est écrit au PDF vectoriel par le même peintre ; sans en-tête : absent", async () => {
    expect(has(await run(mk(true)))).toBe(true);
    expect(has(await run(mk(false)))).toBe(false);
  });
});
