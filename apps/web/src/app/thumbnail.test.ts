// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { ExportCanvas } from "./pdf-overlay";
import { GRID_THUMB_WORLD, renderPageThumb, renderThumbnail, THUMB_MAX, thumbSize, type ThumbDeps } from "./thumbnail";

function depsOf() {
  const painted: { rect: unknown; scale: number }[] = [];
  const sizes: [number, number][] = [];
  const released = vi.fn();
  const ctx = { fillStyle: "", fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
  const deps: ThumbDeps = {
    canvas: (w, h): ExportCanvas => {
      sizes.push([w, h]);
      return { ctx, png: async () => new Uint8Array([0x89, 0x50]), release: released };
    },
    painter: () => ({ paintContent: (_c, _p, rect, scale) => void painted.push({ rect, scale }) }),
    decode: async () => ({ width: 1, height: 1, close() {} }) as never,
  };
  return { deps, painted, sizes, released };
}

describe("C4 : vignette", () => {
  it("C4 : thumbSize garde le rapport, 128 px au plus grand côté", () => {
    expect(thumbSize({ x0: 0, y0: 0, x1: 256, y1: 128 })).toEqual({ w: 128, h: 64, scale: 0.5 });
    expect(thumbSize({ x0: 10, y0: 10, x1: 10, y1: 90 })).toEqual({ w: 1, h: 128, scale: 1.6 });
    expect(thumbSize({ x0: 5, y0: 5, x1: 5, y1: 5 })).toBeNull();
  });

  it("C4 : objets : boîte des éléments peinte à l'échelle de la vignette, toile libérée", async () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    d.apply({ type: "CommitStroke", page: p, points: new Float32Array([0, 0, 0.5, 256, 128, 0.5]), style: { color: "#000000", width: 4 } });
    const { deps, painted, sizes, released } = depsOf();
    const box = d.bounds(d.elementIds(p))!;
    const blob = await renderThumbnail(d, createAssetStore(async () => "x"), "fragment", deps);
    expect(blob?.type).toBe("image/png");
    expect(Math.max(...sizes[0]!)).toBe(THUMB_MAX);
    expect(painted[0]!.rect).toEqual(box);
    expect(released).toHaveBeenCalledTimes(1);
  });

  it("C4 : grille : fenêtre monde 320 × 320 à 0,4", async () => {
    const d = fakeCore.blank();
    d.apply({ type: "SetGrid", page: d.pageIds()[0]!, grid: { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] } } as never);
    const { deps, painted, sizes } = depsOf();
    expect(await renderThumbnail(d, createAssetStore(async () => "x"), "grid", deps)).not.toBeNull();
    expect(sizes[0]).toEqual([THUMB_MAX, THUMB_MAX]);
    expect(painted[0]).toEqual({ rect: { x0: 0, y0: 0, x1: GRID_THUMB_WORLD, y1: GRID_THUMB_WORLD }, scale: THUMB_MAX / GRID_THUMB_WORLD });
  });

  it("C4 : objets sans élément : null, aucune toile", async () => {
    const { deps, sizes } = depsOf();
    expect(await renderThumbnail(fakeCore.blank(), createAssetStore(async () => "x"), "fragment", deps)).toBeNull();
    expect(sizes).toEqual([]);
  });
});

describe("miniature de page (DA4, DA7, T9)", () => {
  const assets = () => createAssetStore(async () => "x");
  const rectShape = (x0: number, y0: number, x1: number, y1: number) =>
    ({ type: "AddShape", shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }) as const;

  it("miniature infinie : cadre du contenu ; vide : 16:9", async () => {
    const d = fakeCore.blank("infinite");
    const p = d.pageIds()[0]!;
    d.apply({ ...rectShape(-400, -100, 600, 400), page: p });
    const box = d.bounds(d.elementIds(p))!;
    const a = depsOf();
    const out = await renderPageThumb(d, assets(), p, 200, a.deps);
    expect(out).toBeInstanceOf(Blob);
    expect(a.painted[0]).toEqual({ rect: box, scale: 200 / (box.x1 - box.x0) });
    expect(a.sizes[0]).toEqual([200, Math.round(((box.y1 - box.y0) * 200) / (box.x1 - box.x0))]);
    expect(a.released).toHaveBeenCalledTimes(1);

    const e = fakeCore.blank("infinite");
    const b = depsOf();
    await renderPageThumb(e, assets(), e.pageIds()[0]!, 192, b.deps);
    expect(b.sizes[0]).toEqual([192, 108]);
    expect(b.painted[0]?.rect).toEqual({ x0: 0, y0: 0, x1: 1920, y1: 1080 });
  });

  it("page : son cadre (1920 × 1080), contenu hors cadre compris dans le cadre seulement ; page inconnue : null", async () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    d.apply({ ...rectShape(100, 100, 3000, 2500), page: p });
    const a = depsOf();
    await renderPageThumb(d, assets(), p, 384, a.deps);
    expect(a.sizes[0]).toEqual([384, 216]);
    expect(a.painted[0]).toEqual({ rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, scale: 0.2 });
    expect(await renderPageThumb(d, assets(), "absente", 384, depsOf().deps)).toBeNull();
  });

  it("fond pdf-page : peint une seule fois à son rectangle, sous le contenu ; cadre étendu au bas du fond (H16)", async () => {
    const d = fakeCore.fromPdfPages({ id: "ab".repeat(32), name: "a.pdf", mime: "application/pdf", size: 3 }, [{ w: 612, h: 792 }]);
    const p = d.pageIds()[0]!;
    const order: string[] = [];
    const sizes: [number, number][] = [];
    const ctx = { fillStyle: "", fillRect: vi.fn(), save() {}, restore() {}, setTransform: vi.fn() } as unknown as CanvasRenderingContext2D;
    const calls: unknown[][] = [];
    await renderPageThumb(d, assets(), p, 192, {
      ...depsOf().deps,
      canvas: (w, h) => {
        sizes.push([w, h]);
        return { ctx, png: async () => new Uint8Array([0x89]), release() {} };
      },
      painter: () => ({ paintContent: () => void order.push("contenu") }),
      backdrop: { paint: (_c, b, camera, view) => (order.push("fond"), calls.push([b.rect, camera, view]), "pret") },
    });
    const bottom = (792 * 1920) / 612;
    expect(sizes[0]).toEqual([192, Math.round(bottom * 0.1)]);
    expect(order).toEqual(["fond", "contenu"]);
    expect(calls).toEqual([[{ x0: 0, y0: 0, x1: 1920, y1: bottom }, { zoom: 0.1, tx: -0, ty: -0 }, { w: 192, h: Math.round(bottom * 0.1), dpr: 1 }]]);
  });
});
