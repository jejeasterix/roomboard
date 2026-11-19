import { describe, expect, it } from "vitest";
import { applyMatrix, boxPolygon, composeMatrix, isShapeKind, normalizeShape, shapePolygon } from "./shapes";

describe("shapes (miroir de shape.rs)", () => {
  it("normalizeShape : rectangle et ellipse au coin haut-gauche, tailles positives", () => {
    expect(normalizeShape("rect", 300, 200, 100, 50)).toEqual({ tx: 100, ty: 50, w: 200, h: 150 });
    expect(normalizeShape("ellipse", 10, 10, 30, 5)).toEqual({ tx: 10, ty: 5, w: 20, h: 5 });
  });

  it("normalizeShape : ligne et flèche gardent le départ et le sens", () => {
    expect(normalizeShape("arrow", 300, 200, 100, 50)).toEqual({ tx: 300, ty: 200, w: -200, h: -150 });
  });

  it("shapePolygon : boîte élargie de la demi-épaisseur, au moins 1", () => {
    expect(shapePolygon("rect", 200, 100, 4)).toEqual([-2, -2, 202, -2, 202, 102, -2, 102]);
    expect(shapePolygon("ellipse", 10, 10, 0.5)[0]).toBe(-1);
    expect(boxPolygon(600, 45)).toEqual([0, 0, 600, 0, 600, 45, 0, 45]);
  });

  it("shapePolygon : segment épaissi qui couvre ses bouts", () => {
    expect(shapePolygon("line", 100, 0, 4).map((v) => v + 0)).toEqual([-2, 2, 102, 2, 102, -2, -2, -2]);
    expect(shapePolygon("line", 0, 0, 4)).toHaveLength(8);
  });

  it("composeMatrix(m, t) applique t puis m", () => {
    const t = [1, 0, 0, 1, 100, 100] as const;
    const m = [2, 0, 0, 2, 0, 0] as const;
    expect(composeMatrix([1, 0, 0, 1, 10, 0], composeMatrix(m, t))).toEqual([2, 0, 0, 2, 210, 200]);
    expect(applyMatrix([2, 0, 0, 2, 10, 0], 3, 4)).toEqual([16, 8]);
  });

  it("isShapeKind : les quatre noms seulement", () => {
    expect(["rect", "ellipse", "line", "arrow", "triangle"].map(isShapeKind)).toEqual([true, true, true, true, false]);
  });
});
