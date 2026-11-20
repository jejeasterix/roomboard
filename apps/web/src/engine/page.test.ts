import { describe, expect, it } from "vitest";
import { PAGE_WIDTH, visibleGridRect, visiblePageRect } from "./page";

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
