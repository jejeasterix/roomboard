import { describe, expect, it, vi } from "vitest";
import { MAX_GRID_DOTS, NO_CHANGE, type Bounds, type GridLines } from "../../core/api";
import { cacheMargin, cacheRect, GridLinesCache, visibleLines } from "./grid-cache";
import { MIN_DOT_PX } from "./grid-paint";

const V: Bounds = { x0: 0, y0: 1000, x1: 800, y1: 1600 };
const one = (segments: number[], dots: number[] = []): GridLines => ({
  above: true,
  levels: [{ color: "#000000", line: "solid", alpha: 1, lineWidth: 1, segments, dots }],
});

describe("rectangle gardé (E3, S4)", () => {
  it("S4, Review Focus 3 : vues jusqu'à 3840 × 2160, tout zoom : le rectangle gardé tient sous MAX_GRID_DOTS au pas minimal ; vue seule au-delà : marge 0", () => {
    for (const [w, h] of [[800, 600], [1280, 720], [1920, 1080], [3840, 2160]] as const) {
      for (const z of [0.15, 0.37, 1, 2.5, 8]) {
        const v = { x0: 0, y0: 5000, x1: w / z, y1: 5000 + h / z };
        const r = cacheRect(v, z, 1920);
        const dots = (b: Bounds): number => (((Math.min(b.x1, 1920) - b.x0) * z) / MIN_DOT_PX + 1) * (((b.y1 - b.y0) * z) / MIN_DOT_PX + 1);
        expect(r.x0 <= v.x0 && r.y0 <= v.y0 && r.x1 >= v.x1 && r.y1 >= v.y1, `${w}×${h} z=${z}`).toBe(true);
        expect(r.y1 - v.y1).toBeLessThanOrEqual(h / 2 / z + 1e-9);
        if (dots(v) <= MAX_GRID_DOTS) expect(dots(r), `${w}×${h} z=${z}`).toBeLessThanOrEqual(MAX_GRID_DOTS);
        else expect(r).toEqual(v);
      }
    }
  });

  it("marge : une demi-hauteur de vue quand elle tient (786,7 × 600 à z = 1 : 300 px) ; vue vide : 0", () => {
    expect(cacheMargin(786.7, 600, 1, 1920)).toBe(300);
    expect(cacheMargin(0, 0, 1, 1920)).toBe(0);
  });
});

describe("visibleLines (E3)", () => {
  it("verticales et horizontales bornées à la vue, valeurs exactes ; hors vue retirées ; above gardé", () => {
    const lines = one([0, 400, 0, 2200, 40, 400, 40, 2200, 900, 400, 900, 2200, 0, 1040, 1920, 1040, 0, 1700, 1920, 1700]);
    expect(visibleLines(lines, V)).toEqual(one([0, 1000, 0, 1600, 40, 1000, 40, 1600, 0, 1040, 800, 1040]));
  });

  it("ligne posée sur un bord de la vue : gardée (Review Focus 2)", () => {
    expect(visibleLines(one([800, 400, 800, 2200, 0, 1000, 1920, 1000]), V)).toEqual(one([800, 1000, 800, 1600, 0, 1000, 800, 1000]));
  });

  it("oblique recoupée (Liang-Barsky) ; points hors vue retirés ; groupe vidé retiré", () => {
    const iso: GridLines = {
      above: false,
      levels: [
        { color: "#111111", line: "solid", alpha: 1, lineWidth: 2, segments: [0, 900, 1000, 1900], dots: [] },
        { color: "#222222", line: "solid", alpha: 1, lineWidth: 1, segments: [], dots: [10, 1010, 900, 1010, 10, 2000] },
        { color: "#333333", line: "solid", alpha: 0.5, lineWidth: 1, segments: [900, 0, 900, 50], dots: [] },
      ],
    };
    const out = visibleLines(iso, V);
    expect(out.levels.map((l) => [l.color, l.lineWidth])).toEqual([["#111111", 2], ["#222222", 1]]);
    // y = x + 900 : entre dans V en (100, 1000), en sort en (700, 1600).
    expect(out.levels[0]!.segments.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 1000, 700, 1600]);
    expect(out.levels[1]!.dots).toEqual([10, 1010]);
  });
});

describe("GridLinesCache (E3, S4)", () => {
  const setup = () => {
    const compute = vi.fn((_page: string, r: Bounds, _minStep: number, _minDotStep: number): GridLines | null => one([0, r.y0, 0, r.y1]));
    return { compute, cache: new GridLinesCache(compute) };
  };
  const at = (dy: number): Bounds => ({ x0: 0, y0: 1000 + dy, x1: 800, y1: 1600 + dy });

  it("S4 : même vue → 1 appel ; défilement dans la marge → 1 ; au-delà → 2 ; zoom → 3 ; page → 4", () => {
    const { compute, cache } = setup();
    for (let i = 0; i < 10; i++) cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(compute.mock.calls[0]?.slice(2)).toEqual([4, 8]);
    expect(cache.get("p", at(50), 1, 1920)).toEqual(one([0, 1050, 0, 1650]));
    expect(compute).toHaveBeenCalledTimes(1);
    cache.get("p", at(400), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(2);
    cache.get("p", at(400), 2, 1920);
    expect(compute).toHaveBeenCalledTimes(3);
    expect(compute.mock.calls[2]?.slice(2)).toEqual([2, 4]);
    cache.get("q", at(400), 2, 1920);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it("invalidate : autre page → rien ; la page ou full → recalcul ; clear → recalcul", () => {
    const { compute, cache } = setup();
    cache.get("p", at(0), 1, 1920);
    cache.invalidate({ ...NO_CHANGE, pages: ["q"] });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(1);
    cache.invalidate({ ...NO_CHANGE, pages: ["p"] });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(2);
    cache.invalidate({ ...NO_CHANGE, full: true });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(3);
    cache.clear();
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it("page sans grille : null gardé aussi (aucun appel par image)", () => {
    const compute = vi.fn(() => null);
    const cache = new GridLinesCache(compute);
    expect(cache.get("p", at(0), 1, 1920)).toBeNull();
    expect(cache.get("p", at(10), 1, 1920)).toBeNull();
    expect(compute).toHaveBeenCalledTimes(1);
  });
});
