import { describe, expect, it } from "vitest";
import { fitPage, fitWidth, topBelowIslands, IDENTITY, MAX_ZOOM, MIN_ZOOM, panBy, screenToWorld, worldToScreen, zoomAt, type Camera } from "./camera";

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

  it("fitWidth cadre la largeur : 95 % de la vue, centrée, haut de page à 16 px", () => {
    const c = fitWidth(1000, 400);
    expect(c.zoom).toBeCloseTo((1000 / 1920) * 0.95, 10);
    expect(c.tx).toBeCloseTo((1000 - 1920 * c.zoom) / 2, 10);
    expect(c.ty).toBe(16);
  });

  it("fitWidth ne dépend pas de la hauteur de la vue (page infinie)", () => {
    expect(fitWidth(1000, 400).zoom).toBe(fitWidth(1000, 4000).zoom);
  });

  it("fitWidth : vue vide → identité", () => {
    expect(fitWidth(0, 300)).toEqual({ zoom: 1, tx: 0, ty: 0 });
  });
  describe("topBelowIslands (OF83)", () => {
    const stage = { top: 0, bottom: 1080 };
    it("sans îlot : 16 px, comme avant", () => {
      expect(topBelowIslands(stage, [])).toBe(16);
    });
    it("îlots du haut de 56 px (maquette 01) : rangée contextuelle réservée dessous (8 + 56), puis 12 px : y 148", () => {
      expect(topBelowIslands(stage, [{ top: 16, bottom: 72 }, { top: 16, bottom: 72 }])).toBe(148);
    });
    it("barre sur deux rangées (104 px) : une seule rangée réservée, de la hauteur de l'îlot le plus bas d'une rangée", () => {
      expect(topBelowIslands(stage, [{ top: 16, bottom: 72 }, { top: 16, bottom: 120 }])).toBe(196);
    });
    it("écart de la rangée contextuelle donné par l'appelant", () => {
      expect(topBelowIslands(stage, [{ top: 16, bottom: 72 }], 10)).toBe(150);
    });
    it("ignore les îlots du bas et une barre verticale posée sur un côté", () => {
      expect(topBelowIslands(stage, [{ top: 16, bottom: 72 }, { top: 1008, bottom: 1064 }, { top: 16, bottom: 900 }])).toBe(148);
    });
    it("îlot vide ou caché (hauteur nulle) : ignoré", () => {
      expect(topBelowIslands(stage, [{ top: 0, bottom: 0 }])).toBe(16);
    });
    it("mesure depuis le haut de la scène", () => {
      expect(topBelowIslands({ top: 40, bottom: 1120 }, [{ top: 56, bottom: 112 }])).toBe(148);
    });
  });
});
