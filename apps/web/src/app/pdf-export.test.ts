import { degrees, PDFDict, PDFDocument, PDFName, PDFStream, StandardFonts } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { Bounds } from "../core/api";
import {
  exportPdf,
  PDF_RASTER_MESSAGE,
  placement,
  viewBox,
  type ExportBackdrop,
  type ExportDeps,
  type ExportResult,
  type ExportSource,
  type OverlayProducer,
  type OverlayRequest,
  type PdfLib,
} from "./pdf-export";

const A = "ab".repeat(32);
const B = "cd".repeat(32);
const bytesOf = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const PNG_1PX = bytesOf("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
const PNG_2PX = bytesOf("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8DwHwyBNBAwNAAAR0sIeRPxYNAAAAAASUVORK5CYII=");
const rectOf = (w: number, h: number): Bounds => ({ x0: 0, y0: 0, x1: 1920, y1: (h * 1920) / w });

async function sourcePdf(o: { pages?: number; rotate?: number; rotates?: readonly number[]; crop?: readonly [number, number, number, number]; label?: string } = {}): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  const n = o.rotates?.length ?? o.pages ?? 3;
  for (let i = 1; i <= n; i++) {
    const p = d.addPage([612, 792]);
    p.drawText(`${o.label ?? "RoomBoard page"} ${i}`, { x: 72, y: 700, size: 24, font });
    const r = o.rotates?.[i - 1] ?? o.rotate;
    if (r !== undefined) p.setRotation(degrees(r));
    if (o.crop !== undefined) p.setCropBox(...o.crop);
  }
  return d.save();
}
interface FakePage { readonly backdrop?: Partial<ExportBackdrop> | null; readonly elements?: number; readonly bounds?: Bounds; readonly grid?: boolean }
function source(pages: readonly FakePage[]): ExportSource {
  const at = (id: string): FakePage | undefined => pages[Number(id.slice(1).split("e")[0])];
  return {
    pageIds: () => pages.map((_, i) => `p${i}`),
    elementIds: (id) => Array.from({ length: at(id)?.elements ?? 0 }, (_, k) => `${id}e${k}`),
    bounds: (ids) => (ids[0] === undefined ? null : (at(ids[0])?.bounds ?? { x0: 100, y0: 100, x1: 200, y1: 200 })),
    page: (id) => {
      const p = at(id);
      if (p === undefined) return null;
      const backdrop = p.backdrop === undefined || p.backdrop === null ? null : { asset: A, kind: "pdf-page", page: 0, rect: rectOf(612, 792), ...p.backdrop };
      return { backdrop, grid: p.grid === true ? { visible: true } : null };
    },
  };
}
const store = (files: Record<string, Uint8Array>) => ({ get: (id: string) => (files[id] === undefined ? undefined : new Blob([new Uint8Array(files[id])])) });
const pngProducer = (seen: OverlayRequest[] = []): OverlayProducer => ({
  pages: async (reqs) => {
    seen.push(...reqs);
    return reqs.map(() => ({ kind: "png" as const, bytes: PNG_1PX }));
  },
});
const lib = (o: { refuse?: boolean } = {}): PdfLib & { loads: () => number } => {
  const load = vi.fn((bytes: Uint8Array, opts?: Parameters<typeof PDFDocument.load>[1]) =>
    o.refuse === true ? Promise.reject(new Error("Failed to parse PDF document (line:0 col:0 offset=0): No PDF header found")) : PDFDocument.load(bytes, opts),
  );
  const PDF = { create: (opts?: Parameters<typeof PDFDocument.create>[0]) => PDFDocument.create(opts), load } as unknown as PdfLib["PDFDocument"];
  return { PDFDocument: PDF, degrees, loads: () => load.mock.calls.length };
};
/** Dépendances d'un export : la page d'origine se recopie, jamais en image (patron écarté (2), U34). */
const deps = (o: { lib?: PdfLib; overlay?: OverlayProducer } & Partial<ExportDeps> = {}): ExportDeps => ({
  loadPdfLib: async () => o.lib ?? lib(),
  overlay: o.overlay ?? pngProducer(),
  alive: () => true,
  rasterPage: async () => {
    throw new Error("rasterPage appelé : la page d'origine devait être recopiée");
  },
  ...o,
});
async function done(p: Promise<ExportResult | null>): Promise<ExportResult> {
  const r = await p;
  if (r === null) throw new Error("export arrêté");
  return r;
}
async function xobjects(bytes: Uint8Array): Promise<string[][]> {
  const d = await PDFDocument.load(bytes);
  return d.getPages().map((p) => {
    const xo = p.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    return xo === undefined ? [] : xo.keys().map((k) => String(xo.lookup(k, PDFStream).dict.get(PDFName.of("Subtype"))));
  });
}
/** Nombre d'objets police du PDF (un par ressource partagée si les pages sont recopiées d'un seul bloc). */
async function fontObjects(bytes: Uint8Array): Promise<number> {
  const d = await PDFDocument.load(bytes);
  let n = 0;
  for (const [, o] of d.context.enumerateIndirectObjects()) if (o instanceof PDFDict && o.get(PDFName.of("Type")) === PDFName.of("Font")) n++;
  return n;
}
async function sizes(bytes: Uint8Array): Promise<number[][]> {
  return (await PDFDocument.load(bytes)).getPages().map((p) => [p.getWidth(), p.getHeight()].map((v) => Math.round(v * 1000) / 1000));
}
async function openPdfjs(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: bytes.slice() });
  return { pdfjs, doc: await task.promise, close: () => task.destroy() };
}
async function texts(bytes: Uint8Array): Promise<string[]> {
  const { doc, close } = await openPdfjs(bytes);
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    out.push(c.items.map((it) => ("str" in it ? it.str : "")).join(""));
  }
  await close();
  return out;
}
type Matrix = readonly [number, number, number, number, number, number];
const compose = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const r3 = (v: number): number => Math.round(v * 1000) / 1000 + 0;
/**
 * Images dessinées sur chaque page, vues par pdf.js comme l'écran les voit (`pdf-render.ts`, viewport à l'échelle 1) :
 * taille en pixels, coins haut gauche, haut droit, bas droit de l'image dans le viewport (points, origine en haut à gauche).
 */
async function imageDraws(bytes: Uint8Array): Promise<{ readonly px: number[]; readonly corners: number[][]; readonly view: number[] }[][]> {
  const { pdfjs, doc, close } = await openPdfjs(bytes);
  const out: { px: number[]; corners: number[][]; view: number[] }[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();
    const stack: Matrix[] = [];
    let ctm: Matrix = [1, 0, 0, 1, 0, 0];
    const draws: { px: number[]; corners: number[][]; view: number[] }[] = [];
    ops.fnArray.forEach((fn, k) => {
      const args = ops.argsArray[k] as unknown[];
      if (fn === pdfjs.OPS.save) stack.push(ctm);
      else if (fn === pdfjs.OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (fn === pdfjs.OPS.transform) ctm = compose(ctm, args as unknown as Matrix);
      else if (fn === pdfjs.OPS.paintImageXObject) {
        const at = (u: number, v: number): number[] => vp.convertToViewportPoint(ctm[0] * u + ctm[2] * v + ctm[4], ctm[1] * u + ctm[3] * v + ctm[5]).map(r3);
        draws.push({ px: [Number(args[1]), Number(args[2])], corners: [at(0, 1), at(1, 1), at(1, 0)], view: [r3(vp.width), r3(vp.height)] });
      }
    });
    out.push(draws);
  }
  await close();
  return out;
}
/** Une image qui couvre exactement la page vue, haut gauche en haut à gauche (aucune rotation ni décalage). */
const covering = (px: number, w: number, h: number) => ({ px: [px, px], corners: [[0, 0], [w, 0], [w, h]], view: [w, h] });
const pdfPages = (n: number, extra: (i: number) => Partial<FakePage> = () => ({})): FakePage[] =>
  Array.from({ length: n }, (_, i) => ({ backdrop: { page: i }, ...extra(i) }));

describe("export PDF annoté (PF20, PF21)", () => {
  it("pages d'origine sans contenu : recopiées telles quelles, aucune superposition demandée, texte gardé", async () => {
    const produce = vi.fn(async () => []);
    const r = await done(exportPdf(source(pdfPages(3)), store({ [A]: await sourcePdf() }), deps({ overlay: { pages: produce } })));
    expect([r.pages, r.cut, r.annotated, r.rasterized]).toEqual([3, false, true, false]);
    expect(produce).not.toHaveBeenCalled();
    expect(await xobjects(r.bytes)).toEqual([[], [], []]);
    expect(await texts(r.bytes)).toEqual(["RoomBoard page 1", "RoomBoard page 2", "RoomBoard page 3"]);
  });

  it("S1 : un trait en page 2 : une image superposée en page 2 seulement, texte « RoomBoard page 2 » gardé", async () => {
    const seen: OverlayRequest[] = [];
    const r = await done(exportPdf(source(pdfPages(3, (i) => (i === 1 ? { elements: 1 } : {}))), store({ [A]: await sourcePdf() }), deps({ overlay: pngProducer(seen) })));
    expect(seen).toEqual([{ pageId: "p1", rect: rectOf(612, 792), box: { w: 612, h: 792 } }]);
    expect(await xobjects(r.bytes)).toEqual([[], ["/Image"], []]);
    expect((await texts(r.bytes))[1]).toBe("RoomBoard page 2");
  });

  it("page tournée de 90° : boîte vue 792 × 612, superposition dans la boîte vue, texte gardé (Review Focus 1)", async () => {
    const seen: OverlayRequest[] = [];
    const doc = source([{ backdrop: { page: 0, rect: rectOf(792, 612) }, elements: 1, bounds: { x0: 10, y0: 10, x1: 20, y1: 20 } }]);
    const r = await done(exportPdf(doc, store({ [A]: await sourcePdf({ pages: 1, rotate: 90 }) }), deps({ overlay: pngProducer(seen) })));
    expect(seen[0]?.box).toEqual({ w: 792, h: 612 });
    expect(await xobjects(r.bytes)).toEqual([["/Image"]]);
    expect(await texts(r.bytes)).toEqual(["RoomBoard page 1"]);
    expect(r.cut).toBe(false);
  });

  it("page sans fond PDF : page neuve de 842 pt, hauteur max(1080, bas du contenu) × 842 / 1920 ; pas « annoté » (PF20, HPF2-3)", async () => {
    const seen: OverlayRequest[] = [];
    const r = await done(exportPdf(source([{}, { elements: 2, bounds: { x0: 0, y0: 0, x1: 300, y1: 2000 } }]), store({}), deps({ overlay: pngProducer(seen) })));
    expect(await sizes(r.bytes)).toEqual([
      [842, 473.625],
      [842, Math.round(((2000 * 842) / 1920) * 1000) / 1000],
    ]);
    expect(seen).toEqual([{ pageId: "p1", rect: { x0: 0, y0: 0, x1: 1920, y1: 2000 }, box: { w: 842, h: (2000 * 842) / 1920 } }]);
    expect([r.annotated, r.cut]).toEqual([false, false]);
  });

  it("contenu sous la page PDF : cut ; contenu dans la page : pas cut (PF20, Review Focus 4)", async () => {
    const pdf = await sourcePdf({ pages: 1 });
    const out = await done(exportPdf(source([{ backdrop: { page: 0 }, elements: 1, bounds: { x0: 100, y0: 2400, x1: 200, y1: 2600 } }]), store({ [A]: pdf }), deps()));
    const inside = await done(exportPdf(source([{ backdrop: { page: 0 }, elements: 1 }]), store({ [A]: pdf }), deps()));
    expect([out.cut, inside.cut]).toEqual([true, false]);
  });

  it("page au-delà du PDF d'origine (page 7 d'un PDF de 3) : page neuve, aucune erreur (PC7, Review Focus 5)", async () => {
    const r = await done(exportPdf(source([{ backdrop: { page: 7 } }]), store({ [A]: await sourcePdf() }), deps()));
    expect(await sizes(r.bytes)).toEqual([[842, 473.625]]);
    expect(r.annotated).toBe(false);
  });

  it("deux sources (pages insérées) : chacune chargée une fois ; pages dans l'ordre du document (PF20, S4)", async () => {
    const l = lib();
    const doc = source([{ backdrop: { page: 0 } }, { backdrop: { asset: B, page: 0 } }, { backdrop: { page: 1 } }]);
    const r = await done(exportPdf(doc, store({ [A]: await sourcePdf(), [B]: await sourcePdf({ pages: 1, label: "Autre page" }) }), deps({ lib: l })));
    expect(l.loads()).toBe(2);
    expect(await texts(r.bytes)).toEqual(["RoomBoard page 1", "Autre page 1", "RoomBoard page 2"]);
  });

  it("superposition en page PDF (lot c) : posée comme page embarquée (/Form) ; mêmes octets chargés une fois (S5)", async () => {
    const overlay = await PDFDocument.create();
    // pdf-lib refuse d'embarquer une page sans flux de contenu (MissingPageContentsEmbeddingError) : un trait par page.
    for (let k = 0; k < 2; k++) overlay.addPage([612, 792]).drawRectangle({ x: 10, y: 10, width: 5, height: 5 });
    const bytes = await overlay.save();
    const l = lib();
    const producer: OverlayProducer = { pages: async (reqs) => reqs.map((_, k) => ({ kind: "pdf" as const, bytes, index: k })) };
    const r = await done(exportPdf(source(pdfPages(2, () => ({ elements: 1 }))), store({ [A]: await sourcePdf({ pages: 2 }) }), deps({ lib: l, overlay: producer })));
    expect(await xobjects(r.bytes)).toEqual([["/Form"], ["/Form"]]);
    expect(l.loads()).toBe(2);
  });

  it("police partagée par 3 pages d'origine : recopiée une seule fois dans la sortie (copyPages groupé)", async () => {
    const r = await done(exportPdf(source(pdfPages(3)), store({ [A]: await sourcePdf({ pages: 3 }) }), deps()));
    expect(await fontObjects(r.bytes)).toBe(1);
  });

  it("superpositions vectorielles de pages partageant une police : police embarquée une seule fois (embedPages groupé)", async () => {
    const overlay = await sourcePdf({ pages: 3 });
    const producer: OverlayProducer = { pages: async (reqs) => reqs.map((_, k) => ({ kind: "pdf" as const, bytes: overlay, index: k })) };
    const r = await done(exportPdf(source([{ elements: 1 }, { elements: 1 }, { elements: 1 }]), store({}), deps({ overlay: producer })));
    expect(await fontObjects(r.bytes)).toBe(1);
  });

  it("octets stables : deux exports du même document donnent les mêmes octets (PC16)", async () => {
    const pdf = await sourcePdf();
    const run = async () => (await done(exportPdf(source(pdfPages(3, (i) => (i === 1 ? { elements: 1 } : {}))), store({ [A]: pdf }), deps()))).bytes;
    expect(Array.from(await run())).toEqual(Array.from(await run()));
  });

  it("PDF refusé par pdf-lib mais ouvert par pdf.js : pages d'origine en image sous l'annotation, avis, aucun refus (PF20)", async () => {
    const l = lib({ refuse: true });
    const seen: OverlayRequest[] = [];
    const raster = vi.fn(async (_asset: string, index: number) => (index < 3 ? { png: PNG_2PX, w: 612, h: 792 } : null));
    const doc = source(pdfPages(3, (i) => (i === 1 ? { elements: 1 } : {})));
    const r = await done(exportPdf(doc, store({ [A]: await sourcePdf() }), deps({ lib: l, overlay: pngProducer(seen), rasterPage: raster })));
    expect([r.pages, r.cut, r.annotated, r.rasterized]).toEqual([3, false, true, true]);
    expect(PDF_RASTER_MESSAGE).toBe("PDF d'origine non recopié : pages en image");
    expect(raster.mock.calls).toEqual([
      [A, 0],
      [A, 1],
      [A, 2],
    ]);
    expect(l.loads()).toBe(1);
    expect(seen).toEqual([{ pageId: "p1", rect: rectOf(612, 792), box: { w: 612, h: 792 } }]);
    // Page en image d'abord (2 px), superposition ensuite (1 px) : l'annotation reste au-dessus.
    expect(await imageDraws(r.bytes)).toEqual([[covering(2, 612, 792)], [covering(2, 612, 792), covering(1, 612, 792)], [covering(2, 612, 792)]]);
  });

  it("PDF que pdf-lib charge mais dont getPageCount lève (en-tête seul) : compté comme un refus, repli en image (PF20)", async () => {
    const junk = new TextEncoder().encode("%PDF-1.7\nn'importe quoi");
    const raster = vi.fn(async (_asset: string, index: number) => (index === 0 ? { png: PNG_2PX, w: 612, h: 792 } : null));
    const r = await done(exportPdf(source(pdfPages(1)), store({ [A]: junk }), deps({ rasterPage: raster })));
    expect([r.pages, r.rasterized]).toEqual([1, true]);
    expect(raster).toHaveBeenCalledTimes(1);
  });

  it("PDF chargé par pdf-lib mais à 0 page : compté comme un refus, repli en image, pas une page neuve (PF20)", async () => {
    // pdf-lib gonfle lui-même un document vide à 1 page : le « 0 page » vient d'un `load` qui rend un arbre vide.
    const base = lib();
    const l: PdfLib = { ...base, PDFDocument: { create: base.PDFDocument.create, load: async () => ({ getPageCount: () => 0 }) } as unknown as PdfLib["PDFDocument"] };
    const raster = vi.fn(async () => ({ png: PNG_2PX, w: 612, h: 792 }));
    const r = await done(exportPdf(source(pdfPages(1)), store({ [A]: await sourcePdf() }), deps({ lib: l, rasterPage: raster })));
    expect([r.pages, r.rasterized, raster.mock.calls.length]).toEqual([1, true, 1]);
    expect(await sizes(r.bytes)).toEqual([[612, 792]]);
  });

  it("copyPages qui lève sur un PDF chargé mais abîmé : repli en image, pas « Export impossible » (PF20)", async () => {
    const base = lib();
    const damaged = { getPageCount: () => 3 };
    const l: PdfLib = { ...base, PDFDocument: { ...base.PDFDocument, create: base.PDFDocument.create, load: async () => damaged } as unknown as PdfLib["PDFDocument"] };
    const raster = vi.fn(async () => ({ png: PNG_2PX, w: 612, h: 792 }));
    const r = await done(exportPdf(source(pdfPages(1)), store({ [A]: await sourcePdf() }), deps({ lib: l, rasterPage: raster })));
    expect([r.pages, r.rasterized, raster.mock.calls.length]).toEqual([1, true, 1]);
  });

  it("repli en image où rasterPage rend null : page blanche signalée par rasterMissing, jamais muette ; PC7 inchangé", async () => {
    const r = await done(exportPdf(source(pdfPages(1)), store({ [A]: await sourcePdf() }), deps({ lib: lib({ refuse: true }), rasterPage: async () => null })));
    expect([r.pages, r.rasterized, r.rasterMissing]).toEqual([1, false, true]);
    const ok = await done(exportPdf(source([{ backdrop: { page: 7 } }]), store({ [A]: await sourcePdf() }), deps()));
    expect(ok.rasterMissing).toBe(false);
  });

  it("onglet fermé pendant l'export : arrêt propre (null), document jamais relu après la libération (DAPF3, PF19)", async () => {
    let closed = false;
    let readsAfter = 0;
    const base = source(pdfPages(2, () => ({ elements: 1 })));
    const freed = <T extends unknown[], R>(f: (...a: T) => R) => (...a: T): R => {
      if (closed) {
        readsAfter++;
        throw new Error("null pointer passed to rust");
      }
      return f(...a);
    };
    const doc: ExportSource = { pageIds: freed(base.pageIds), elementIds: freed(base.elementIds), bounds: freed(base.bounds), page: freed(base.page) };
    const produce = vi.fn(async () => []);
    const pdf = await sourcePdf({ pages: 2 });
    const close = async (): Promise<PdfLib> => {
      closed = true; // `dispose` de l'onglet pendant le chargement de pdf-lib (board-session.ts:363)
      return lib();
    };
    const r = await exportPdf(doc, store({ [A]: pdf }), deps({ loadPdfLib: close, overlay: { pages: produce }, alive: () => !closed }));
    expect(r).toBeNull();
    expect(readsAfter).toBe(0);
    expect(produce).not.toHaveBeenCalled();
  });
});

describe("placement de la superposition (/Rotate, CropBox)", () => {
  const cb = { x: 10, y: 20, width: 600, height: 800 };
  it("coin et rotation pour /Rotate 0, 90, 180, 270 sur une CropBox décalée ; angles ramenés au quart (Review Focus 1)", () => {
    expect([0, 90, 180, 270, -90, 450].map((r) => placement(cb, r))).toEqual([
      { x: 10, y: 20, rotate: 0 },
      { x: 610, y: 20, rotate: 90 },
      { x: 610, y: 820, rotate: 180 },
      { x: 10, y: 820, rotate: 270 },
      { x: 10, y: 820, rotate: 270 },
      { x: 610, y: 20, rotate: 90 },
    ]);
  });
  it("boîte vue : largeur et hauteur échangées à 90° et 270°", () => {
    expect([0, 90, 180, 270].map((r) => viewBox(cb, r))).toEqual([
      { w: 600, h: 800 },
      { w: 800, h: 600 },
      { w: 600, h: 800 },
      { w: 800, h: 600 },
    ]);
  });
  it("vue par pdf.js comme à l'écran : la superposition couvre la page vue, haut gauche en haut à gauche, pour /Rotate 0, 90, 180, 270 et CropBox décalée", async () => {
    const rotates = [0, 90, 180, 270];
    const crop = [30, 40, 500, 700] as const;
    const view = (r: number): readonly [number, number] => (r % 180 === 0 ? [500, 700] : [700, 500]);
    const doc = source(rotates.map((r, i) => ({ backdrop: { page: i, rect: rectOf(...view(r)) }, elements: 1 })));
    const seen: OverlayRequest[] = [];
    const r = await done(exportPdf(doc, store({ [A]: await sourcePdf({ rotates, crop }) }), deps({ overlay: pngProducer(seen) })));
    expect(seen.map((q) => [q.box.w, q.box.h])).toEqual(rotates.map(view));
    expect(await imageDraws(r.bytes)).toEqual(rotates.map((q) => [covering(1, ...view(q))]));
    expect(await texts(r.bytes)).toEqual(["RoomBoard page 1", "RoomBoard page 2", "RoomBoard page 3", "RoomBoard page 4"]);
  });
});
