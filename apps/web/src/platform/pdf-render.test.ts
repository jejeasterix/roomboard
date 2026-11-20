import { describe, expect, it, vi } from "vitest";
import { createPdfEngine, PDF_ENCRYPTED_MESSAGE, PdfEncryptedError, type PdfDom, type PdfjsBinding, type PdfjsDocument, type PdfjsPage } from "./pdf-render";

class PasswordError extends Error {}

function fakePage(w: number, h: number, log: string[], delay = 0): PdfjsPage {
  return {
    getViewport: ({ scale, offsetX = 0, offsetY = 0 }) => {
      log.push(`viewport ${scale} ${offsetX} ${offsetY}`);
      return { width: w * scale, height: h * scale };
    },
    render: (p) => {
      log.push(`render ${p.canvas.width}x${p.canvas.height}`);
      let fail: (e: Error) => void = () => undefined;
      const promise = new Promise<void>((ok, ko) => {
        fail = ko;
        setTimeout(ok, delay);
      });
      return { promise, cancel: () => (log.push("cancel"), fail(new Error("annulé"))) };
    },
  };
}
function fakeDoc(log: string[], o: { pages?: number; info?: unknown; delay?: number } = {}): PdfjsDocument {
  return {
    numPages: o.pages ?? 2,
    getPage: async (n) => (log.push(`getPage ${n}`), fakePage(792, 612, log, o.delay)),
    getMetadata: async () => ({ info: o.info ?? { PDFFormatVersion: "1.7" } }),
    destroy: async () => void log.push("destroy"),
  };
}
const binding = (open: (d: Uint8Array) => Promise<PdfjsDocument>): PdfjsBinding => ({ open, isPasswordError: (e) => e instanceof PasswordError });
const dom = (log: string[]): PdfDom => ({
  tile: (w, h) => ({
    canvas: { width: w, height: h } as HTMLCanvasElement,
    bitmap: async () => ({ w, h }) as unknown as CanvasImageSource,
    release: () => void log.push(`release ${w}x${h}`),
  }),
});
const PDF = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])]);
const live = (): AbortSignal => new AbortController().signal;

describe("moteur PDF (PF8, PF12)", () => {
  it("open : document lu, pageCount, pageSize = viewport à l'échelle 1 (après /Rotate), pages demandées à partir de 1", async () => {
    const log: string[] = [];
    const seen: number[][] = [];
    const engine = createPdfEngine(async () => binding(async (d) => (seen.push([...d]), fakeDoc(log, { pages: 3 }))), dom(log));
    const f = await engine.open(PDF);
    expect([f.pageCount, seen]).toEqual([3, [[0x25, 0x50, 0x44, 0x46, 0x2d]]]);
    expect(await f.pageSize(2)).toEqual({ w: 792, h: 612 });
    expect(log).toEqual(["getPage 3", "viewport 1 0 0"]);
  });

  it("mot de passe d'ouverture : PdfEncryptedError, message « PDF chiffré, non pris en charge » (S2)", async () => {
    const engine = createPdfEngine(async () => binding(async () => Promise.reject(new PasswordError("No password given"))));
    const e = await engine.open(PDF).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(PdfEncryptedError);
    expect((e as Error).message).toBe(PDF_ENCRYPTED_MESSAGE);
    expect(PDF_ENCRYPTED_MESSAGE).toBe("PDF chiffré, non pris en charge");
  });

  it("EncryptFilterName dans les infos (mot de passe de droits seul) : PdfEncryptedError, document détruit (Review Focus 2)", async () => {
    const log: string[] = [];
    const engine = createPdfEngine(async () => binding(async () => fakeDoc(log, { info: { EncryptFilterName: "Standard" } })));
    await expect(engine.open(PDF)).rejects.toBeInstanceOf(PdfEncryptedError);
    expect(log).toContain("destroy");
  });

  it("autre erreur d'ouverture : relancée telle quelle", async () => {
    const engine = createPdfEngine(async () => binding(async () => Promise.reject(new Error("Invalid PDF structure."))));
    await expect(engine.open(PDF)).rejects.toThrow("Invalid PDF structure.");
  });

  it("renderTile : viewport à l'échelle, décalé de -x, -y ; toile de la taille de la tuile, bitmap rendu, toile libérée", async () => {
    const log: string[] = [];
    const f = await createPdfEngine(async () => binding(async () => fakeDoc(log)), dom(log)).open(PDF);
    const bmp = await f.renderTile(1, 2.5, { x: 1024, y: 2048, w: 1024, h: 500 }, live());
    expect(bmp).toEqual({ w: 1024, h: 500 });
    expect(log).toEqual(["getPage 2", "viewport 2.5 -1024 -2048", "render 1024x500", "release 1024x500"]);
  });

  it("renderTile annulé en cours : task.cancel, rejet, toile libérée ; signal déjà annulé : aucun rendu", async () => {
    const log: string[] = [];
    const f = await createPdfEngine(async () => binding(async () => fakeDoc(log, { delay: 50 })), dom(log)).open(PDF);
    const ctrl = new AbortController();
    const p = f.renderTile(0, 1, { x: 0, y: 0, w: 10, h: 10 }, ctrl.signal);
    await vi.waitFor(() => expect(log).toContain("render 10x10"));
    ctrl.abort();
    await expect(p).rejects.toBeTruthy();
    expect(log.slice(-2)).toEqual(["cancel", "release 10x10"]);
    const gone = new AbortController();
    gone.abort();
    const before = log.length;
    await expect(f.renderTile(0, 1, { x: 0, y: 0, w: 10, h: 10 }, gone.signal)).rejects.toBeTruthy();
    expect(log.slice(before).filter((l) => l.startsWith("render"))).toEqual([]);
  });

  it("chargeur appelé une fois pour deux ouvertures ; chargeur en échec : réessayé à l'ouverture suivante", async () => {
    const log: string[] = [];
    let calls = 0;
    const engine = createPdfEngine(async () => {
      calls += 1;
      if (calls === 1) throw new Error("morceau absent");
      return binding(async () => fakeDoc(log));
    });
    await expect(engine.open(PDF)).rejects.toThrow("morceau absent");
    await engine.open(PDF);
    await engine.open(PDF);
    expect(calls).toBe(2);
  });

  it("destroy : document détruit ; renderTile ensuite rejeté", async () => {
    const log: string[] = [];
    const f = await createPdfEngine(async () => binding(async () => fakeDoc(log)), dom(log)).open(PDF);
    f.destroy();
    await expect(f.renderTile(0, 1, { x: 0, y: 0, w: 1, h: 1 }, live())).rejects.toThrow("PDF fermé");
    expect(log.filter((l) => l === "destroy")).toHaveLength(1);
  });
});
