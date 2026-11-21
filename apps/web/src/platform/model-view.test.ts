import { describe, expect, it, vi } from "vitest";
import { createModelViewLoader, drawSize, snapshotSize, type ModelView } from "./model-view";

const fakeView = (): ModelView => ({
  available: () => true,
  load: () => Promise.resolve({ missing: [] }),
  draw: () => null,
  snapshot: () => Promise.resolve(null),
  release: () => {},
  onLost: () => () => {},
});

describe("model-view (C15, DAX3)", () => {
  it("createModelViewLoader : un seul chargement pour deux appels simultanés ; peek null puis la vue", async () => {
    const v = fakeView();
    const load = vi.fn(() => Promise.resolve(v));
    const l = createModelViewLoader(load);
    expect(l.peek()).toBeNull();
    const [a, b] = await Promise.all([l.load(), l.load()]);
    expect([a, b, load.mock.calls.length, l.peek()]).toEqual([v, v, 1, v]);
  });
  it("createModelViewLoader : échec rejoué au prochain appel", async () => {
    const v = fakeView();
    const load = vi.fn<() => Promise<ModelView>>().mockRejectedValueOnce(new Error("réseau")).mockResolvedValueOnce(v);
    const l = createModelViewLoader(load);
    await expect(l.load()).rejects.toThrow("réseau");
    expect(l.peek()).toBeNull();
    expect(await l.load()).toBe(v);
    expect([load.mock.calls.length, l.peek()]).toEqual([2, v]);
  });
  it("snapshotSize : 640 × 480 → 1024 × 768 ; 300 × 600 → 512 × 1024 ; boîte nulle → 1024 × 768", () => {
    expect(snapshotSize(640, 480)).toEqual({ w: 1024, h: 768 });
    expect(snapshotSize(300, 600)).toEqual({ w: 512, h: 1024 });
    expect(snapshotSize(0, 0)).toEqual({ w: 1024, h: 768 });
  });
  it("drawSize : 640 × 480 à dpr 2 → 1280 × 960 ; 1600 × 400 à dpr 2 → 2048 × 512 ; dpr NaN → 1", () => {
    expect(drawSize(640, 480, 2)).toEqual({ w: 1280, h: 960 });
    expect(drawSize(1600, 400, 2)).toEqual({ w: 2048, h: 512 });
    expect(drawSize(640, 480, Number.NaN)).toEqual({ w: 640, h: 480 });
  });
});
