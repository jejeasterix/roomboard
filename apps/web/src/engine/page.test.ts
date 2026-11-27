import { describe, expect, it } from "vitest";
import { PAGE_WIDTH, pageFrame, pageLayoutOf, visibleGridRect, visiblePageRect } from "./page";

describe("page infinie en hauteur (D5 amendée)", () => {
  it("le fond va jusqu'au bas de la vue, même loin sous 1080", () => {
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: -5000 }, 600)).toEqual({ x0: 0, y0: 0, x1: PAGE_WIDTH, y1: 5600 });
    expect(visiblePageRect({ zoom: 0.5, tx: 10, ty: 20 }, 600)).toEqual({ x0: 0, y0: 0, x1: PAGE_WIDTH, y1: 1160 });
  });
  it("haut de page sous la vue : rien à peindre", () => {
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: 700 }, 600)).toBeNull();
  });
});

describe("partie visible de la grille (C9, G9)", () => {
  it("haut de vue compris, loin sous le haut de page ; x et y ramenés à 0", () => {
    const r = visibleGridRect({ zoom: 1, tx: 13.3, ty: -1_000_007 }, 800, 600);
    expect(r?.x0).toBe(0);
    expect(r?.y0).toBe(1_000_007);
    expect(r?.x1).toBeCloseTo(786.7);
    expect(r?.y1).toBe(1_000_607);
    expect(visibleGridRect({ zoom: 0.5, tx: 100, ty: 50 }, 800, 600)).toEqual({ x0: 0, y0: 0, x1: 1400, y1: 1100 });
  });
  it("vue vide ou entièrement au-dessus de la page : null", () => {
    expect(visibleGridRect({ zoom: 1, tx: 0, ty: 0 }, 0, 600)).toBeNull();
    expect(visibleGridRect({ zoom: 1, tx: 0, ty: 700 }, 800, 600)).toBeNull();
  });
});

const bd = (y1: number) => ({ rect: { y1 } });

describe("pageFrame (DA4)", () => {
  it("pageFrame : page sans mode 1920 × 1080", () => {
    expect(pageFrame({ width: 1920, height: 1080, backdrop: null })).toEqual({ x0: 0, y0: 0, x1: 1920, y1: 1080 });
  });
  it("pageFrame : fond PDF plus haut : cadre jusqu'au bas du fond (1920 × 2715)", () => {
    expect(pageFrame({ width: 1920, height: 1080, backdrop: bd(2715), mode: "page" })).toEqual({ x0: 0, y0: 0, x1: 1920, y1: 2715 });
  });
  it("pageFrame : infini : null", () => {
    expect(pageFrame({ width: 1920, height: 1080, backdrop: null, mode: "infinite" })).toBeNull();
  });
  it("pageLayoutOf : portrait 3413,33, PDF 2715 portrait, infini", () => {
    expect(pageLayoutOf({ width: 1920, height: 1080, backdrop: null })).toBe("landscape");
    expect(pageLayoutOf({ width: 1920, height: 3413.33, backdrop: null })).toBe("portrait");
    expect(pageLayoutOf({ width: 1920, height: 1080, backdrop: bd(2715) })).toBe("portrait");
    expect(pageLayoutOf({ width: 1920, height: 1080, backdrop: null, mode: "infinite" })).toBe("infinite");
  });
});

describe("rectangles visibles selon le cadre", () => {
  it("visibleGridRect infini : coordonnées négatives gardées", () => {
    expect(visibleGridRect({ zoom: 1, tx: 100, ty: 50 }, 800, 600, null)).toEqual({ x0: -100, y0: -50, x1: 700, y1: 550 });
  });
  it("visibleGridRect page : recoupée au cadre (y ≤ 1080)", () => {
    const frame = { x0: 0, y0: 0, x1: 1920, y1: 1080 };
    expect(visibleGridRect({ zoom: 1, tx: 0, ty: -500 }, 800, 2000, frame)).toEqual({ x0: 0, y0: 500, x1: 800, y1: 1080 });
    expect(visibleGridRect({ zoom: 1, tx: 0, ty: -2000 }, 800, 600, frame)).toBeNull();
  });
  it("visiblePageRect : cadre recoupé à la vue, infini = toute la vue", () => {
    const frame = { x0: 0, y0: 0, x1: 1920, y1: 1080 };
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: 0 }, 800, 600, frame)).toEqual({ x0: 0, y0: 0, x1: 800, y1: 600 });
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: 0 }, 800, 600, null)).toEqual({ x0: 0, y0: 0, x1: 800, y1: 600 });
  });
});
