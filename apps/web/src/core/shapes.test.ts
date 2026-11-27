import { describe, expect, it } from "vitest";
import { anchorPoint, ANCHOR_RATIOS, isClosedShape, isPointsShape, applyMatrix, arrowWings, bandPolygonForTest, boxPolygon, composeMatrix, CURVE_STEPS, ELLIPSE_VERTICES, flattenPath, invertMatrix, isShapeKind, linePath, normalizeShape, shapePolygon } from "./shapes";

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

// Constats 4 et 5 de T60 : miroir de `shape.rs` ; les ailes sont celles de `arrowWings`, que le rendu dessine.
describe("shapePolygon : pointe de flèche et ellipse (T60)", () => {
  const pairs = (p: number[]): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i + 1 < p.length; i += 2) out.push([p[i] ?? Number.NaN, p[i + 1] ?? Number.NaN]);
    return out;
  };
  const has = (p: number[], x: number, y: number): boolean => pairs(p).some(([a, b]) => Math.abs(a - x) < 1e-9 && Math.abs(b - y) < 1e-9);

  it("arrowWings : ailes à ±25° derrière la fin, longueur max(12, 3 × épaisseur)", () => {
    const [x1, y1, x2, y2] = arrowWings(100, 0, 4) ?? [];
    const l = 12;
    const a = (25 * Math.PI) / 180;
    expect(x1).toBeCloseTo(100 - l * Math.cos(a), 9);
    expect(y1).toBeCloseTo(-l * Math.sin(a), 9);
    expect(x2).toBeCloseTo(100 - l * Math.cos(a), 9);
    expect(y2).toBeCloseTo(l * Math.sin(a), 9);
    const [, , u, v] = arrowWings(0, 50, 10) ?? [];
    expect(Math.hypot((u ?? 0) - 0, (v ?? 0) - 50)).toBeCloseTo(30, 9);
    expect(arrowWings(0, 0, 4)).toBeNull();
  });

  it("les extrémités des ailes sont des sommets du polygone de la flèche", () => {
    for (const [w, h, width] of [[100, 0, 4], [0, 200, 10], [-200, -150, 4], [3, 4, 1]] as const) {
      const head = arrowWings(w, h, width);
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

describe("invertMatrix (C10a, miroir de element::invert)", () => {
  it("invertMatrix : m ∘ m⁻¹ = identité ; non inversible ou NaN : null", () => {
    const m = [2, 0.5, -1, 3, 100, 50] as const;
    const inv = invertMatrix(m);
    expect(inv).not.toBeNull();
    const id = composeMatrix(m, inv ?? m);
    [1, 0, 0, 1, 0, 0].forEach((v, i) => expect(id[i]).toBeCloseTo(v, 12));
    expect(invertMatrix([1, 2, 2, 4, 0, 0])).toBeNull();
    expect(invertMatrix([Number.NaN, 0, 0, 1, 0, 0])).toBeNull();
  });
});

describe("OG12 : chemin, courbe et ancrage (miroir de linear.rs)", () => {
  it("flattenPath : deux points tels quels, trois points en 2 × 16 pas passant par le point intérieur", () => {
    expect(flattenPath(linePath(100, 0), true)).toEqual([[0, 0], [100, 0]]);
    const f = flattenPath(linePath(100, 0, [50, -80]), true);
    expect(f.length).toBe(1 + 2 * CURVE_STEPS);
    expect(f.some(([x, y]) => Math.abs(x - 50) < 1e-9 && Math.abs(y + 80) < 1e-9)).toBe(true);
  });
  it("bandPolygon : chemin vide = polygone du socle ; polyligne couvre son point intérieur", () => {
    expect(shapePolygon("arrow", 100, 0, 4, { inner: [], curve: true })).toEqual(shapePolygon("arrow", 100, 0, 4));
    const p = bandPolygonForTest([[0, 0], [50, -80], [100, 0]], 4, false);
    const xs = p.filter((_, i) => i % 2 === 0);
    const ys = p.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeLessThan(-80);
    expect(Math.max(...xs)).toBeGreaterThan(100);
  });
  it("anchorPoint : contour + écart 5 + épaisseur / 2, dedans sans écart, ellipse", () => {
    const b = { id: "a", m: [1, 0, 0, 1, 10, 20] as const, w: 100, h: 50, outline: "box" as const, gap: 7 };
    expect(anchorPoint(b, 1, 0.5)).toEqual([117, 45]);
    expect(anchorPoint(b, 0.3, 0.4)).toEqual([40, 40]);
    const [x, y] = anchorPoint({ ...b, outline: "ellipse" as const }, 0.5, 0);
    expect([x, Math.round(y * 1e9) / 1e9]).toEqual([60, 13]);
    expect(ANCHOR_RATIOS).toEqual([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]);
  });
});

describe("OG12 lot 2a : losange et ligne fermée (miroir de shape.rs)", () => {
  it("losange : polygone élargi le long des normales", () => {
    const p = shapePolygon("diamond", 100, 60, 2);
    const l = Math.hypot(100, 60);
    expect(p).toEqual([50, -l / 100, 100 + l / 60, 30, 50, 60 + l / 100, -l / 60, 30].map((v) => expect.closeTo(v, 6)));
  });
  it("losange de boîte nulle : rectangle élargi", () => {
    expect(shapePolygon("diamond", 0, 60, 2)).toEqual(shapePolygon("rect", 0, 60, 2));
  });
  it("losange : ancre du sommet droit et contour (on_outline, anchor)", () => {
    const b = { id: "d", m: [1, 0, 0, 1, 0, 0] as const, w: 100, h: 60, outline: "diamond" as const, gap: 7 };
    expect(anchorPoint(b, 1, 0.5)).toEqual([107, 30]);
    // (0.9, 0.5) du losange : dedans, pas sur le contour, rendu tel quel (une boîte le dirait dedans aussi).
    expect(anchorPoint(b, 0.9, 0.5)).toEqual([90, 30]);
    // (0.9, 0.1) : dans la boîte mais hors du losange, recalé sur son contour (75, 15) puis écarté de 7 (une boîte le
    // rendrait tel quel, (90, 6)).
    const [x, y] = anchorPoint(b, 0.9, 0.1);
    const l = Math.hypot(25, 15);
    expect(x).toBeCloseTo(75 + (7 * 25) / l, 9);
    expect(y).toBeCloseTo(15 - (7 * 15) / l, 9);
  });
  it("ligne fermée : bornes du rectangle d'origine", () => {
    const p = shapePolygon("line", 0, 50, 2, { inner: [100, 0, 100, 50], curve: false, closed: true });
    const xs = p.filter((_, i) => i % 2 === 0);
    const ys = p.filter((_, i) => i % 2 === 1);
    expect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([-1, -1, 101, 51]);
    expect(p).toHaveLength(8);
  });
  it("isClosedShape, isPointsShape", () => {
    expect(isClosedShape({ shape: "line", w: 0, h: 50, fill: null, polygon: true })).toBe(true);
    expect(isClosedShape({ shape: "line", w: 0, h: 50, fill: null })).toBe(false);
    expect(["rect", "ellipse", "diamond", "line", "arrow"].map((k) => isPointsShape(k as never))).toEqual([true, true, true, false, false]);
  });
});
