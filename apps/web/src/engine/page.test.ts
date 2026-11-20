import { describe, expect, it } from "vitest";
import { PAGE_WIDTH, visiblePageRect } from "./page";

describe("page infinie en hauteur (D5 amendée)", () => {
  it("le fond va jusqu'au bas de la vue, même loin sous 1080", () => {
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: -5000 }, 600)).toEqual({ x0: 0, y0: 0, x1: PAGE_WIDTH, y1: 5600 });
    expect(visiblePageRect({ zoom: 0.5, tx: 10, ty: 20 }, 600)).toEqual({ x0: 0, y0: 0, x1: PAGE_WIDTH, y1: 1160 });
  });
  it("haut de page sous la vue : rien à peindre", () => {
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: 700 }, 600)).toBeNull();
  });
});
