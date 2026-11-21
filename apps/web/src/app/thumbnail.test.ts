// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { ExportCanvas } from "./pdf-overlay";
import { GRID_THUMB_WORLD, renderThumbnail, THUMB_MAX, thumbSize, type ThumbDeps } from "./thumbnail";

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
