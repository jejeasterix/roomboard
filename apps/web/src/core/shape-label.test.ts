import { describe, expect, it } from "vitest";
import { labelBox, labelTop } from "./shape-label";

describe("texte de forme : boîte (OG33 lot 2b, choix 8)", () => {
  it("rectangle 200 x 100 : largeur moins deux marges, centre vertical", () => {
    expect(labelBox({ shape: "rect", w: 200, h: 100 })).toEqual({ x: 5, w: 190, cy: 50 });
  });
  it("losange : moitié de la largeur ; ellipse : rectangle inscrit", () => {
    expect(labelBox({ shape: "diamond", w: 200, h: 100 })?.w).toBe(90);
    expect(labelBox({ shape: "ellipse", w: 200, h: 100 })?.w).toBeCloseTo(131.42, 1);
  });
  it("ligne, ou boîte trop étroite : null", () => {
    expect(labelBox({ shape: "line", w: 200, h: 0 })).toBeNull();
    expect(labelBox({ shape: "rect", w: 30, h: 100 })).toBeNull();
  });
  it("labelTop centre une boîte de hauteur donnée", () => {
    expect(labelTop({ cy: 50 }, 30)).toBe(35);
  });
});
