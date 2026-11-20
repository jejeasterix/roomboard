import { describe, expect, it, vi } from "vitest";
import type { AssetInfo, Bounds } from "../core/api";
import type { ImageSource } from "../engine/render/image-cache";
import type { PageView } from "../engine/render/renderer";
import { createPngOverlay, overlayScale, type ExportCanvas } from "./pdf-overlay";

const IMG = "ab".repeat(32);
const PDF = "cd".repeat(32);
const JPG = "ef".repeat(32);
const info = (id: string, mime: string): AssetInfo => ({ id, name: id, mime, size: 3 });
const later = (): Promise<void> => new Promise((ok) => setTimeout(ok, 5));
const blankCanvas = (): ExportCanvas => ({ ctx: {} as CanvasRenderingContext2D, png: async () => new Uint8Array(), release: () => undefined });

describe("superposition PNG (PF21)", () => {
  it("échelle : min(2, 4096 / plus grand côté)", () => {
    expect([overlayScale({ x0: 0, y0: 0, x1: 1920, y1: 1080 }), overlayScale({ x0: 0, y0: 0, x1: 1920, y1: 2715 }), overlayScale({ x0: 0, y0: 0, x1: 1920, y1: 40000 })]).toEqual([2, 4096 / 2715, 4096 / 40000]);
  });

  it("une PNG par requête : toile de rect × échelle, paintContent(page, rect, échelle), toile libérée", async () => {
    const made: number[][] = [];
    const released: number[] = [];
    const painted: unknown[][] = [];
    const producer = createPngOverlay({
      doc: { elementIds: (p) => [`${p}-a`], citedAssets: () => [] },
      assets: { get: () => undefined },
      decode: vi.fn(),
      alive: () => true,
      canvas: (w, h): ExportCanvas => {
        made.push([w, h]);
        const n = made.length;
        return { ctx: { n } as unknown as CanvasRenderingContext2D, png: async () => new Uint8Array([n]), release: () => void released.push(n) };
      },
      painter: () => ({ paintContent: (ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number) => void painted.push([(ctx as unknown as { n: number }).n, page, rect, scale]) }),
    });
    const rect = { x0: 0, y0: 0, x1: 1920, y1: 2715 };
    const out = await producer.pages([{ pageId: "p2", rect, box: { w: 612, h: 865 } }]);
    const s = 4096 / 2715;
    expect(made).toEqual([[Math.round(1920 * s), 4096]]);
    expect(painted).toEqual([[1, { id: "p2", elementIds: ["p2-a"] }, rect, s]]);
    expect(out).toEqual([{ kind: "png", bytes: new Uint8Array([1]) }]);
    expect(released).toEqual([1]);
  });

  it("images décodées avant le dessin (décodage lent : bitmap présent au moment de peindre), fermées après ; asset non image ignoré ; décodage en échec : cadre gris, aucune erreur", async () => {
    const close = vi.fn();
    const bmp = { close } as unknown as ImageBitmap;
    const decode = vi.fn(async (b: Blob) => {
      await later(); // l'`ImageSource` est synchrone (canvas2d.ts:240-242) : un décodage non attendu donnerait un cadre gris
      if (b.type === "image/png") return bmp;
      throw new Error("illisible");
    });
    const atPaint: unknown[] = [];
    const producer = createPngOverlay({
      doc: { elementIds: () => [], citedAssets: () => [info(IMG, "image/png"), info(PDF, "application/pdf"), info(JPG, "image/jpeg")] },
      assets: { get: () => new Blob([new Uint8Array([1])]) },
      decode,
      alive: () => true,
      canvas: blankCanvas,
      painter: (_ctx, images: ImageSource) => ({ paintContent: () => void atPaint.push(images.bitmap(IMG), images.bitmap(JPG), close.mock.calls.length) }),
    });
    const out = await producer.pages([{ pageId: "p", rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, box: { w: 842, h: 473.625 } }]);
    expect(decode.mock.calls.map((c) => c[0].type)).toEqual(["image/png", "image/jpeg"]);
    expect(atPaint).toEqual([bmp, null, 0]);
    expect(close).toHaveBeenCalledTimes(1);
    expect(out).toHaveLength(1);
  });

  it("onglet fermé pendant le décodage : rien n'est peint, document plus relu, images fermées, aucune erreur (DAPF3, PF19)", async () => {
    let closed = false;
    let readsAfter = 0;
    const close = vi.fn();
    const decode = vi.fn(async () => {
      await later();
      closed = true; // `dispose` de l'onglet (board-session.ts:363) pendant le décodage
      return { close } as unknown as ImageBitmap;
    });
    const paint = vi.fn();
    const producer = createPngOverlay({
      doc: {
        elementIds: (p) => {
          if (closed) readsAfter++;
          return [`${p}-a`];
        },
        citedAssets: () => {
          if (closed) readsAfter++;
          return [info(IMG, "image/png")];
        },
      },
      assets: { get: () => new Blob([new Uint8Array([1])]) },
      decode,
      alive: () => !closed,
      canvas: blankCanvas,
      painter: () => ({ paintContent: paint }),
    });
    const out = await producer.pages([{ pageId: "p", rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, box: { w: 842, h: 473.625 } }]);
    expect(out).toEqual([null]);
    expect(paint).not.toHaveBeenCalled();
    expect(readsAfter).toBe(0);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
