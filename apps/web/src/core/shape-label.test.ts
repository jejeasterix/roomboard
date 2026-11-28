import { describe, expect, it } from "vitest";
import { labelBox, labelPlacement, labelTop } from "./shape-label";

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

describe("texte de forme : placement en monde (C5, constats 2 et 4)", () => {
  const rect = { shape: "rect", w: 200, h: 100 } as const;
  it("forme sans matrice : même boîte que labelBox, repère identité", () => {
    expect(labelPlacement(rect, [1, 0, 0, 1, 0, 0])).toEqual({ box: { x: 5, w: 190, cy: 50 }, frame: [1, 0, 0, 1, 0, 0] });
  });
  it("étirée ×2 en largeur : boîte de 390 en monde, repère sans échelle", () => {
    expect(labelPlacement(rect, [2, 0, 0, 1, 30, 40])).toEqual({ box: { x: 5, w: 390, cy: 50 }, frame: [1, 0, 0, 1, 30, 40] });
  });
  it("tournée d'un quart et doublée : rotation gardée, échelle ôtée, coin de la forme en origine", () => {
    const p = labelPlacement(rect, [0, 2, -2, 0, 0, 0]);
    expect(p?.box).toEqual({ x: 5, w: 390, cy: 100 });
    expect(p?.frame).toEqual([0, 1, -1, 0, 0, 0]);
  });
  it("retournée : le retournement est gardé, comme le plan le garde", () => {
    expect(labelPlacement(rect, [-1, 0, 0, 1, 200, 0])?.frame).toEqual([-1, 0, 0, 1, 200, 0]);
  });
  it("réduite à 0,3 : boîte de 50 ; trop petite en monde : null ; agrandie : la boîte existe", () => {
    expect(labelPlacement(rect, [0.3, 0, 0, 0.3, 0, 0])?.box).toEqual({ x: 5, w: 50, cy: 15 });
    expect(labelPlacement(rect, [0.1, 0, 0, 0.1, 0, 0])).toBeNull();
    expect(labelPlacement({ shape: "rect", w: 30, h: 100 }, [4, 0, 0, 1, 0, 0])?.box.w).toBe(110);
    expect(labelPlacement(rect, [0, 0, 0, 0, 0, 0])).toBeNull();
  });
});
