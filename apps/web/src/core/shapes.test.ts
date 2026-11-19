import { describe, expect, it } from "vitest";
import { arrowHead } from "../engine/render/canvas2d";
import { applyMatrix, boxPolygon, composeMatrix, ELLIPSE_VERTICES, isShapeKind, normalizeShape, shapePolygon } from "./shapes";

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

// Constats 4 et 5 de T60 : miroir de `shape.rs` ; les ailes sont celles que le rendu dessine (`arrowHead`).
describe("shapePolygon : pointe de flèche et ellipse (T60)", () => {
  const pairs = (p: number[]): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i + 1 < p.length; i += 2) out.push([p[i] ?? Number.NaN, p[i + 1] ?? Number.NaN]);
    return out;
  };
  const has = (p: number[], x: number, y: number): boolean => pairs(p).some(([a, b]) => Math.abs(a - x) < 1e-9 && Math.abs(b - y) < 1e-9);

  it("les extrémités des ailes dessinées sont des sommets du polygone de la flèche", () => {
    for (const [w, h, width] of [[100, 0, 4], [0, 200, 10], [-200, -150, 4], [3, 4, 1]] as const) {
      const head = arrowHead(w, h, width);
      if (head === null) throw new Error("pointe attendue");
      const p = shapePolygon("arrow", w, h, width);
      expect(has(p, head[0], head[1]), `aile 1 de ${w}, ${h}`).toBe(true);
      expect(has(p, head[2], head[3]), `aile 2 de ${w}, ${h}`).toBe(true);
    }
    expect(shapePolygon("line", 100, 0, 4)).toHaveLength(8);
    expect(shapePolygon("arrow", 0, 0, 4)).toHaveLength(8);
  });

  it("l'ellipse est un polygone inscrit de ELLIPSE_VERTICES sommets, bornes exactes", () => {
    const p = shapePolygon("ellipse", 100, 50, 4);
    expect(p).toHaveLength(2 * ELLIPSE_VERTICES);
    for (const [x, y] of pairs(p)) expect(((x - 50) / 52) ** 2 + ((y - 25) / 27) ** 2).toBeCloseTo(1, 9);
    const xs = pairs(p).map(([x]) => x);
    const ys = pairs(p).map(([, y]) => y);
    expect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]).toEqual([-2, -2, 102, 52]);
    expect(has(p, -2, -2)).toBe(false);
  });
});
