import { describe, expect, it } from "vitest";
import { fitPage, IDENTITY, MAX_ZOOM, MIN_ZOOM, panBy, screenToWorld, worldToScreen, zoomAt, type Camera } from "./camera";

describe("camera (D17)", () => {
  const cam: Camera = { zoom: 2, tx: 10, ty: -20 };

  it("écran et monde : aller-retour exact", () => {
    const [wx, wy] = screenToWorld(cam, 110, 80);
    expect([wx, wy]).toEqual([50, 50]);
    expect(worldToScreen(cam, wx, wy)).toEqual([110, 80]);
  });

  it("zoomAt garde le point du monde sous le pointeur", () => {
    const before = screenToWorld(cam, 300, 200);
    const z = zoomAt(cam, 300, 200, 1.5);
    expect(z.zoom).toBeCloseTo(3);
    const after = screenToWorld(z, 300, 200);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
  });

  it("zoomAt borne le zoom entre 10 % et 800 %", () => {
    expect(MIN_ZOOM).toBe(0.1);
    expect(MAX_ZOOM).toBe(8);
    expect(zoomAt(IDENTITY, 0, 0, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(IDENTITY, 0, 0, 0.001).zoom).toBe(MIN_ZOOM);
  });

  it("zoomAt ignore un facteur nul, négatif ou non fini", () => {
    for (const f of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(zoomAt(cam, 5, 5, f)).toBe(cam);
  });

  it("panBy déplace la vue et ignore un delta non fini", () => {
    expect(panBy(cam, 5, -7)).toEqual({ zoom: 2, tx: 15, ty: -27 });
    expect(panBy(cam, Number.NaN, 1)).toBe(cam);
  });

  it("fitPage centre la page 1920 × 1080 avec 5 % de marge", () => {
    const c = fitPage(1280, 720);
    expect(c.zoom).toBeCloseTo((1280 / 1920) * 0.95);
    expect(c.tx).toBeCloseTo(32);
    expect(c.ty).toBeCloseTo(18);
    const [x0, y0] = worldToScreen(c, 0, 0);
    const [x1, y1] = worldToScreen(c, 1920, 1080);
    expect(x0 + x1).toBeCloseTo(1280);
    expect(y0 + y1).toBeCloseTo(720);
  });

  it("fitPage sur une vue vide : identité", () => {
    expect(fitPage(0, 720)).toBe(IDENTITY);
  });
});
