import { describe, expect, it, vi } from "vitest";
import type { Camera } from "../camera";
import { visibleGridRect } from "../page";
import type { PdfFile, TileBitmap, TileRect } from "./pdf-port";
import { createPdfTiles, levelFor, MAX_TILES, tilesFor } from "./pdf-tiles";

interface Call {
  readonly index: number;
  readonly scale: number;
  readonly tile: TileRect;
  readonly signal: AbortSignal;
  resolve(b: TileBitmap): void;
  reject(e: unknown): void;
}
function fakeFile(): { file: PdfFile; calls: Call[]; destroy: ReturnType<typeof vi.fn> } {
  const calls: Call[] = [];
  const destroy = vi.fn();
  const file: PdfFile = {
    pageCount: 3,
    pageSize: async () => ({ w: 612, h: 792 }),
    renderTile: (index, scale, tile, signal) => new Promise<TileBitmap>((resolve, reject) => void calls.push({ index, scale, tile, signal, resolve, reject })),
    destroy,
  };
  return { file, calls, destroy };
}
const ASSET = "ab".repeat(32);
const RECT = { x0: 0, y0: 0, x1: 1920, y1: (792 * 1920) / 612 };
const B = { asset: ASSET, page: 1, w: 612, rect: RECT };
const CAM: Camera = { zoom: 1, tx: 0, ty: 0 };
const VIEW = { w: 2100, h: 1100, dpr: 1 };
const bmp = (): TileBitmap & { close: ReturnType<typeof vi.fn> } => ({ close: vi.fn() }) as unknown as TileBitmap & { close: ReturnType<typeof vi.fn> };
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const ctx = () => {
  const drawn: number[][] = [];
  const c = { drawImage: (_b: unknown, x: number, y: number, w: number, h: number) => void drawn.push([x, y, w, h]) } as unknown as CanvasRenderingContext2D;
  return { c, drawn };
};
const closed = (made: readonly ReturnType<typeof bmp>[]): number => made.filter((b) => b.close.mock.calls.length > 0).length;

describe("tuiles PDF par palier (PF13, DAPF2)", () => {
  it("levelFor : 2^⌈log2(zoom × dpr)⌉ borné à [1/4, 8]", () => {
    expect([levelFor(1, 1), levelFor(1, 2), levelFor(0.3, 1), levelFor(0.1, 1), levelFor(8, 2), levelFor(1.5, 1), levelFor(0.5, 1), levelFor(Number.NaN, 1)]).toEqual([1, 2, 0.5, 0.25, 8, 2, 0.5, 1]);
  });

  it("tilesFor : tuiles de 1024 px qui recoupent la vue, coupées au bord de la page", () => {
    const t1 = tilesFor(RECT, 1, { x0: 0, y0: 0, x1: 1280, y1: 900 }, "k");
    expect(t1.map((t) => [t.key, t.px.x, t.px.y, t.px.w, t.px.h])).toEqual([
      ["k|1|0|0", 0, 0, 1024, 1024],
      ["k|1|1|0", 1024, 0, 896, 1024],
    ]);
    expect(t1[1]?.world).toEqual({ x0: 1024, y0: 0, x1: 1920, y1: 1024 });
    const t2 = tilesFor(RECT, 2, { x0: 0, y0: 0, x1: 640, y1: 450 }, "k");
    expect(t2.map((t) => t.key)).toEqual(["k|2|0|0", "k|2|1|0"]);
    expect(t2[1]?.world).toEqual({ x0: 512, y0: 0, x1: 1024, y1: 512 });
    expect(tilesFor(RECT, 1, { x0: 0, y0: 5000, x1: 100, y1: 6000 }, "k")).toEqual([]);
  });

  it("fond sans indice, sans taille ou sans rect : echec, rien d'ouvert (Review Focus 5)", () => {
    const open = vi.fn(() => null);
    const tiles = createPdfTiles(open, () => undefined);
    for (const b of [{ ...B, page: null }, { ...B, w: null }, { ...B, rect: null }]) expect(tiles.paint(ctx().c, b, CAM, VIEW)).toBe("echec");
    expect(open).not.toHaveBeenCalled();
  });

  it("asset absent du magasin (open rend null) : echec", () => {
    expect(createPdfTiles(() => null, () => undefined).paint(ctx().c, B, CAM, VIEW)).toBe("echec");
  });

  it("premier dessin : PDF ouvert une fois, attente ; puis tuiles visibles demandées, 2 au plus, à palier × 1920 / w (S3)", async () => {
    const { file, calls } = fakeFile();
    const open = vi.fn(async () => file);
    const ready = vi.fn();
    const tiles = createPdfTiles(open, ready);
    expect(tiles.paint(ctx().c, B, CAM, VIEW)).toBe("attente");
    await flush();
    expect([open.mock.calls.length, ready.mock.calls.length, calls.length]).toEqual([1, 1, 0]);
    expect(tiles.paint(ctx().c, B, CAM, VIEW)).toBe("attente");
    expect(calls).toHaveLength(2);
    expect([calls[0]?.index, calls[0]?.scale, calls[0]?.tile]).toEqual([1, 1920 / 612, { x: 0, y: 0, w: 1024, h: 1024 }]);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("tuiles prêtes : dessinées à leur place monde, ready à chaque arrivée ; toutes prêtes : pret (S3, PF15)", async () => {
    const { file, calls } = fakeFile();
    const ready = vi.fn();
    const tiles = createPdfTiles(async () => file, ready);
    const view = { w: 1280, h: 900, dpr: 1 };
    tiles.paint(ctx().c, B, CAM, view);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    for (const c of calls) c.resolve(bmp());
    await flush();
    expect(ready).toHaveBeenCalledTimes(3);
    const { c, drawn } = ctx();
    expect(tiles.paint(c, B, CAM, view)).toBe("pret");
    expect(drawn).toEqual([
      [0, 0, 1024, 1024],
      [1024, 0, 896, 1024],
    ]);
  });

  it("tuile sortie de la vue : rendu annulé ; bitmap arrivé après l'annulation fermé, jamais gardé (Review Focus 3)", async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    tiles.paint(ctx().c, B, CAM, VIEW);
    await flush();
    tiles.paint(ctx().c, B, CAM, VIEW);
    expect(calls.map((c) => c.signal.aborted)).toEqual([false, false]);
    expect(tiles.paint(ctx().c, B, { zoom: 1, tx: 0, ty: -6000 }, VIEW)).toBe("pret");
    expect(calls.map((c) => c.signal.aborted)).toEqual([true, true]);
    const late = bmp();
    calls[0]?.resolve(late);
    await flush();
    expect(late.close).toHaveBeenCalledTimes(1);
    tiles.paint(ctx().c, B, CAM, VIEW);
    expect(calls.length).toBe(4);
  });

  it("palier plus grossier en cache dessiné d'abord, puis le palier courant demandé (S3 : court flou, puis net)", async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    const view = { w: 1280, h: 900, dpr: 1 };
    tiles.paint(ctx().c, B, CAM, view);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    for (const c of calls) c.resolve(bmp());
    await flush();
    const { c, drawn } = ctx();
    expect(tiles.paint(c, B, { zoom: 2, tx: 0, ty: 0 }, view)).toBe("attente");
    expect(drawn).toEqual([[0, 0, 1024, 1024]]);
    expect(calls.slice(2).map((x) => [x.scale, x.tile.x])).toEqual([
      [(2 * 1920) / 612, 0],
      [(2 * 1920) / 612, 1024],
    ]);
  });

  it(`LRU de ${MAX_TILES} tuiles : la plus ancienne fermée à l'éviction (Review Focus 3, HU1-10)`, async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    const tall = { ...B, rect: { x0: 0, y0: 0, x1: 1920, y1: 40000 } };
    const view = { w: 1000, h: 1000, dpr: 1 };
    tiles.paint(ctx().c, tall, CAM, view);
    await flush();
    const made: ReturnType<typeof bmp>[] = [];
    for (let k = 0; k <= MAX_TILES; k++) {
      tiles.paint(ctx().c, tall, { zoom: 1, tx: 0, ty: -1024 * k }, view);
      const b = bmp();
      made.push(b);
      calls[k]?.resolve(b);
      await flush();
    }
    expect(calls).toHaveLength(MAX_TILES + 1);
    expect(made.map((b) => b.close.mock.calls.length)).toEqual([1, ...new Array<number>(MAX_TILES).fill(0)]);
  });

  it(`54 tuiles visibles (5K, dpr 2, palier 4) > ${MAX_TILES} : le fond converge, chaque tuile rendue une fois, aucune visible évincée ; vue réduite : retour à ${MAX_TILES}`, async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    const wide = { ...B, rect: { x0: 0, y0: 0, x1: 2400, y1: 3200 } };
    const cam: Camera = { zoom: 1.25, tx: -160, ty: -240 };
    const view = { w: 2560, h: 1440, dpr: 2 };
    const visible = visibleGridRect(cam, view.w, view.h);
    expect(levelFor(cam.zoom, view.dpr)).toBe(4);
    expect(visible === null ? 0 : tilesFor(wide.rect, 4, visible, "k").length).toBe(54);
    const made: ReturnType<typeof bmp>[] = [];
    let state = tiles.paint(ctx().c, wide, cam, view);
    await flush();
    for (let i = 0; i < 200 && state !== "pret"; i++) {
      state = tiles.paint(ctx().c, wide, cam, view);
      for (const c of calls.slice(made.length)) {
        const b = bmp();
        made.push(b);
        c.resolve(b);
      }
      await flush();
    }
    expect([state, calls.length, closed(made)]).toEqual(["pret", 54, 0]);
    const { c, drawn } = ctx();
    expect(tiles.paint(c, wide, cam, view)).toBe("pret");
    expect([drawn.length, calls.length, closed(made)]).toEqual([54, 54, 0]);
    tiles.paint(ctx().c, wide, { zoom: 0.25, tx: 0, ty: 0 }, { w: 1000, h: 800, dpr: 1 });
    expect(calls).toHaveLength(55);
    const small = bmp();
    made.push(small);
    calls[54]?.resolve(small);
    await flush();
    expect([closed(made), small.close.mock.calls.length]).toEqual([54 + 1 - MAX_TILES, 0]);
  });

  it("échec de rendu (hors annulation) : echec", async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    tiles.paint(ctx().c, B, CAM, VIEW);
    await flush();
    tiles.paint(ctx().c, B, CAM, VIEW);
    calls[0]?.reject(new Error("rendu impossible"));
    await flush();
    expect(tiles.paint(ctx().c, B, CAM, VIEW)).toBe("echec");
  });

  it("vue vide (0 x 0) : rien n'est ouvert ni dessiné, « pret » ; le PDF ne s'ouvre qu'à une vue visible (deactivate, ResizeObserver)", () => {
    const { file } = fakeFile();
    const open = vi.fn(async () => file);
    const tiles = createPdfTiles(open, () => undefined);
    const { c, drawn } = ctx();
    expect(tiles.paint(c, B, CAM, { w: 0, h: 0, dpr: 1 })).toBe("pret");
    expect([open.mock.calls.length, drawn.length]).toEqual([0, 0]);
    tiles.paint(c, B, CAM, VIEW);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("dispose : rendus annulés, bitmaps fermés, PDF détruit ; un PDF ouvert après dispose est détruit aussitôt", async () => {
    const { file, calls, destroy } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    const view = { w: 1280, h: 900, dpr: 1 };
    tiles.paint(ctx().c, B, CAM, view);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    const kept = bmp();
    calls[0]?.resolve(kept);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    tiles.dispose();
    expect([kept.close.mock.calls.length, destroy.mock.calls.length, calls[1]?.signal.aborted]).toEqual([1, 1, true]);
    const other = fakeFile();
    let release: (f: PdfFile) => void = () => undefined;
    const late = createPdfTiles(() => new Promise<PdfFile>((r) => (release = r)), () => undefined);
    late.paint(ctx().c, B, CAM, view);
    late.dispose();
    release(other.file);
    await flush();
    expect(other.destroy).toHaveBeenCalledTimes(1);
  });
});
