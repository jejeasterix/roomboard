import { describe, expect, it } from "vitest";
import {
  AUTO_ERASER_MAX_RADIUS_PX,
  AUTO_ERASER_MIN_RADIUS_PX,
  CLUSTER_COUNT,
  CLUSTER_PX,
  contactGeometry,
  DETECT_MS,
  eraserCircle,
  isLargeContact,
  isTightCluster,
  joinsCluster,
  LARGE_CONTACT_PX,
  type ContactBox,
} from "./contact";

const box = (x: number, y: number, width = 0, height = width): ContactBox => ({ x, y, width, height });

describe("contact (OG25, A3)", () => {
  it("OG25 contact : valeurs du cadrage (déc. 7, 8, 9, 18)", () => {
    expect([LARGE_CONTACT_PX, CLUSTER_PX, CLUSTER_COUNT, DETECT_MS]).toEqual([80, 160, 3, 250]);
    expect([AUTO_ERASER_MIN_RADIUS_PX, AUTO_ERASER_MAX_RADIUS_PX]).toEqual([24, 160]);
  });

  it("OG25 contact : contactGeometry — 1 × 1 (W3C), 0 × 0 (Windows), absente, NaN : null ; un côté invalide vaut 0", () => {
    expect(contactGeometry(20, 20)).toEqual({ width: 20, height: 20 });
    expect(contactGeometry(1, 1)).toBeNull();
    expect(contactGeometry(0, 0)).toBeNull();
    expect(contactGeometry()).toBeNull();
    expect(contactGeometry(Number.NaN, Number.NaN)).toBeNull();
    expect(contactGeometry(0.5, 0.9)).toBeNull();
    expect(contactGeometry(Number.POSITIVE_INFINITY, 5)).toEqual({ width: 0, height: 5 });
    expect(contactGeometry(-3, 140)).toEqual({ width: 0, height: 140 });
    expect(contactGeometry(140, undefined)).toEqual({ width: 140, height: 0 });
  });

  it("OG25 contact : isLargeContact — D = max(largeur, hauteur) ≥ 80, tranchant de la main compris", () => {
    expect(isLargeContact(null)).toBe(false);
    expect(isLargeContact({ width: 79, height: 20 })).toBe(false);
    expect(isLargeContact({ width: 80, height: 10 })).toBe(true);
    expect(isLargeContact({ width: 20, height: 140 })).toBe(true);
  });

  it("OG25 contact : isTightCluster — trois centres dans 160 px, au moins une géométrie", () => {
    expect(isTightCluster([box(100, 100, 24), box(130, 100, 24), box(160, 100, 24)])).toBe(true);
    expect(isTightCluster([box(100, 100, 24), box(130, 100, 24)])).toBe(false);
    expect(isTightCluster([box(100, 100, 24), box(500, 100, 24), box(900, 100, 24)])).toBe(false);
    expect(isTightCluster([box(0, 0, 24), box(80, 0, 24), box(160, 160, 24)])).toBe(true);
    expect(isTightCluster([box(0, 0, 24), box(80, 0, 24), box(161, 0, 24)])).toBe(false);
    expect(isTightCluster([box(0, 0), box(30, 0), box(60, 0)])).toBe(false);
    expect(isTightCluster([box(0, 0), box(30, 0, 24), box(60, 0)])).toBe(true);
  });

  it("OG25 contact : eraserCircle — centre de la boîte englobante, rayon = moitié du plus grand côté, borné à [24, 160]", () => {
    expect(eraserCircle([box(100, 200, 140, 120)])).toEqual({ x: 100, y: 200, radius: 70 });
    expect(eraserCircle([box(100, 100, 20, 20)]).radius).toBe(24);
    expect(eraserCircle([box(100, 100, 600, 100)]).radius).toBe(160);
    expect(eraserCircle([box(100, 100, 24), box(130, 100, 24), box(160, 100, 24)])).toEqual({ x: 130, y: 100, radius: 42 });
    expect(eraserCircle([])).toEqual({ x: 0, y: 0, radius: 24 });
  });

  it("OG25 contact : joinsCluster — à 160 px au plus de la boîte du groupe ; groupe vide : faux", () => {
    const group = [box(100, 100, 140, 140)]; // boîte 30..170
    expect(joinsCluster(group, box(150, 100, 24))).toBe(true);
    expect(joinsCluster(group, box(330, 100, 24))).toBe(true);
    expect(joinsCluster(group, box(331, 100, 24))).toBe(false);
    expect(joinsCluster(group, box(100, 331))).toBe(false);
    expect(joinsCluster([], box(0, 0, 24))).toBe(false);
  });

  it("OG25 contact : fonctions pures — les entrées ne sont pas modifiées", () => {
    const boxes = Object.freeze([Object.freeze(box(1, 2, 90)), Object.freeze(box(3, 4, 90)), Object.freeze(box(5, 6, 90))]);
    expect(() => eraserCircle(boxes)).not.toThrow();
    expect(() => isTightCluster(boxes)).not.toThrow();
    expect(() => joinsCluster(boxes, box(0, 0))).not.toThrow();
  });
});
