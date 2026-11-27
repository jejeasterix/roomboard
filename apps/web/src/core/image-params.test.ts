import { describe, expect, it } from "vitest";
import type { ImageData, ImageParams, Matrix } from "./api";
import { applyMatrix } from "./shapes";
import {
  clean,
  cropFromDisplay,
  cropOf,
  displaySize,
  displayToSource,
  flipShown,
  frameOf,
  geometryOf,
  isNeutral,
  isPlainGeometry,
  needsPixels,
  normalizeParams,
  orientMatrix,
  paramsOf,
  pixelKey,
  pixelsOf,
  placeAfter,
  readParams,
  sameParams,
  sourcePixelAt,
  sourceToDisplay,
  turnShown,
} from "./image-params";

const A = "ab".repeat(32);
const img = (p: ImageParams = {}, w = 200, h = 100): ImageData => ({ asset: A, w, h, ...p });
/** flipX × flipY × quarterTurns : 16 combinaisons. */
const combos: ImageParams[] = [];
for (const flipX of [false, true]) for (const flipY of [false, true]) for (const quarterTurns of [0, 1, 2, 3]) combos.push(clean({ flipX, flipY, quarterTurns }));
const near = (a: readonly number[], b: readonly number[]): void => {
  expect(a.length).toBe(b.length);
  a.forEach((v, k) => expect(v).toBeCloseTo(b[k] ?? Number.NaN, 9));
};
const WHITE = { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true } as const;

describe("géométrie d'affichage (DAI1, I8-I11)", () => {
  it("displaySize : rognage, échangé par un quart de tour impair", () => {
    expect(displaySize(img())).toEqual([200, 100]);
    expect(displaySize(img({ crop: [10, 5, 80, 40] }))).toEqual([80, 40]);
    expect(displaySize(img({ crop: [10, 5, 80, 40], quarterTurns: 1 }))).toEqual([40, 80]);
    expect(displaySize(img({ quarterTurns: 2 }))).toEqual([200, 100]);
    expect(cropOf(img())).toEqual([0, 0, 200, 100]);
  });

  it("sourceToDisplay : un quart de tour horaire envoie le coin haut gauche en haut à droite", () => {
    expect(sourceToDisplay(img({ quarterTurns: 1 }), 0, 0)).toEqual([100, 0]);
    expect(sourceToDisplay(img({ quarterTurns: 1 }), 200, 0)).toEqual([100, 200]);
    expect(sourceToDisplay(img({ flipX: true }), 0, 0)).toEqual([200, 0]);
    expect(sourceToDisplay(img({ crop: [10, 5, 80, 40] }), 10, 5)).toEqual([0, 0]);
  });

  it("aller-retour source ↔ affichage, 16 combinaisons (flipX × flipY × quarterTurns)", () => {
    for (const p of combos) {
      const i = img({ ...p, crop: [10, 5, 80, 40] });
      const [bw, bh] = displaySize(i);
      for (const [x, y] of [[10, 5], [90, 45], [33, 17], [10, 45]] as const) {
        const [dx, dy] = sourceToDisplay(i, x, y);
        expect(dx).toBeGreaterThanOrEqual(0);
        expect(dx).toBeLessThanOrEqual(bw);
        expect(dy).toBeGreaterThanOrEqual(0);
        expect(dy).toBeLessThanOrEqual(bh);
        near(displayToSource(i, dx, dy), [x, y]);
      }
    }
  });

  it("orientMatrix : même résultat que sourceToDisplay, 16 combinaisons", () => {
    for (const p of combos) {
      const i = img({ ...p, crop: [10, 5, 80, 40] });
      const o = orientMatrix(i);
      for (const [x, y] of [[10, 5], [90, 45], [40, 20]] as const) near(applyMatrix(o, x - 10, y - 5), sourceToDisplay(i, x, y));
    }
  });

  it("flipShown voit l'image telle qu'affichée, 16 combinaisons", () => {
    for (const p of combos) {
      for (const axis of ["h", "v"] as const) {
        const before = img(p);
        const after = img(flipShown(p, axis));
        const [bw, bh] = displaySize(before);
        for (const [x, y] of [[0, 0], [150, 20], [37, 81]] as const) {
          const [X, Y] = sourceToDisplay(before, x, y);
          near(sourceToDisplay(after, x, y), axis === "h" ? [bw - X, Y] : [X, bh - Y]);
        }
      }
    }
  });

  it("turnShown : un quart de tour de l'image affichée, dans les deux sens", () => {
    for (const p of combos) {
      const before = img(p);
      const [bw, bh] = displaySize(before);
      for (const [x, y] of [[0, 0], [150, 20]] as const) {
        const [X, Y] = sourceToDisplay(before, x, y);
        near(sourceToDisplay(img(turnShown(p, 1)), x, y), [bh - Y, X]);
        near(sourceToDisplay(img(turnShown(p, -1)), x, y), [Y, bw - X]);
      }
    }
    expect(turnShown({ quarterTurns: 3 }, 1)).toEqual({});
  });

  it("placeAfter garde le centre, échelle diag(2, 1), ⟳", () => {
    const i = img();
    const m: Matrix = [2, 0, 0, 1, 10, 20];
    const next = turnShown({}, 1);
    const m2 = placeAfter(m, i, next);
    near(m2, [1, 0, 0, 2, 160, -130]);
    near(applyMatrix(m2, ...sourceToDisplay(img(next), 100, 50)), applyMatrix(m, 100, 50));
  });

  it("rogner garde les pixels gardés sous une échelle ≠ 1", () => {
    const i = img({}, 200, 150);
    const m: Matrix = [2, 0, 0, 3, 10, 20];
    const next: ImageParams = { crop: [40, 30, 100, 80] };
    const m2 = placeAfter(m, i, next);
    near(m2, [2, 0, 0, 3, 90, 110]);
    for (const [x, y] of [[60, 50], [139, 109], [40, 30]] as const) {
      near(applyMatrix(m2, ...sourceToDisplay(img(next, 200, 150), x, y)), applyMatrix(m, x, y));
    }
  });

  it("retourner garde le centre ; rétablir garde les pixels qui étaient visibles", () => {
    const i = img({ crop: [40, 20, 100, 60] });
    const m: Matrix = [1, 0, 0, 1, 5, 5];
    near(applyMatrix(placeAfter(m, i, flipShown(paramsOf(i), "h")), 50, 30), applyMatrix(m, 50, 30));
    const restored = placeAfter(m, i, {});
    near(applyMatrix(restored, ...sourceToDisplay(img(), 70, 40)), applyMatrix(m, ...sourceToDisplay(i, 70, 40)));
  });

  it("rogner après Tourner ⟳ : le cadre tracé à l'écran donne le bon rectangle source", () => {
    const full = img({ quarterTurns: 1 });
    expect(cropFromDisplay(full, { x0: 10, y0: 20, x1: 60, y1: 120 })).toEqual([20, 40, 100, 50]);
    expect(frameOf(full, [20, 40, 100, 50])).toEqual({ x0: 10, y0: 20, x1: 60, y1: 120 });
  });

  it("cropFromDisplay : arrondi au pixel, borné à l'image, 1 pixel au moins", () => {
    const full = img();
    expect(cropFromDisplay(full, { x0: -5, y0: 0.4, x1: 50.6, y1: 300 })).toEqual([0, 0, 51, 100]);
    expect(cropFromDisplay(full, { x0: 30.2, y0: 10, x1: 30.3, y1: 10.1 })).toEqual([30, 10, 1, 1]);
    expect(cropFromDisplay(full, { x0: 200, y0: 100, x1: 230, y1: 130 })).toEqual([199, 99, 1, 1]);
  });
});

describe("domaine, neutres et clé des pixels (I4, I5, I19)", () => {
  it("normalizeParams : neutres retirés, rognage entier = absent", () => {
    expect(normalizeParams({ crop: [0, 0, 200, 100], flipX: false, quarterTurns: 0, brightness: 0, contrast: 0 }, 200, 100)).toEqual({});
    const all: ImageParams = { crop: [1, 2, 3, 4], flipY: true, quarterTurns: 3, brightness: -100, contrast: 100, transparent: { color: "#00ff7f", tolerance: 0, soft: 100, contiguous: false } };
    expect(normalizeParams(all, 200, 100)).toEqual(all);
  });

  it("normalizeParams : hors domaine → null", () => {
    const bad = [
      { crop: [150, 0, 51, 10] },
      { crop: [0, 0, 0, 10] },
      { crop: [0.5, 0, 10, 10] },
      { crop: [-1, 0, 10, 10] },
      { crop: [0, 0, 10] },
      { quarterTurns: 4 },
      { quarterTurns: 1.5 },
      { brightness: 101 },
      { contrast: -101 },
      { brightness: Number.NaN },
      { flipX: "oui" },
      { transparent: { ...WHITE, color: "#FFFFFF" } },
      { transparent: { ...WHITE, color: "white" } },
      { transparent: { ...WHITE, tolerance: 101 } },
      { transparent: { ...WHITE, soft: -1 } },
    ] as unknown as ImageParams[];
    for (const p of bad) expect(normalizeParams(p, 200, 100), JSON.stringify(p)).toBeNull();
  });

  it("readParams : un champ illisible est lu comme absent, les autres restent", () => {
    expect(readParams({ crop: [0, 0, 0, 5], flipX: "oui", quarterTurns: 1, brightness: 500, transparent: { color: "white" } }, 200, 100)).toEqual({ quarterTurns: 1 });
    expect(readParams({ crop: null, transparent: WHITE }, 200, 100)).toEqual({ transparent: WHITE });
  });

  it("clean, paramsOf, geometryOf, pixelsOf, isPlainGeometry, needsPixels, isNeutral, sameParams", () => {
    const p: ImageParams = { crop: [1, 1, 5, 5], flipX: true, flipY: false, quarterTurns: 0, brightness: 3, contrast: 0, transparent: WHITE };
    expect(clean(p)).toEqual({ crop: [1, 1, 5, 5], flipX: true, brightness: 3, transparent: WHITE });
    expect(paramsOf(img(p))).toEqual(clean(p));
    expect(geometryOf(p)).toEqual({ crop: [1, 1, 5, 5], flipX: true });
    expect(pixelsOf(p)).toEqual({ brightness: 3, transparent: WHITE });
    expect([isPlainGeometry({ brightness: 3 }), isPlainGeometry({ quarterTurns: 2 })]).toEqual([true, false]);
    expect([needsPixels({ crop: [0, 0, 1, 1] }), needsPixels({ contrast: -1 }), needsPixels({ transparent: WHITE })]).toEqual([false, true, true]);
    expect([isNeutral({ flipX: false, quarterTurns: 0 }), isNeutral({ flipY: true })]).toEqual([true, false]);
    expect(sameParams({ flipX: false, brightness: 0 }, {})).toBe(true);
    expect(sameParams({ transparent: WHITE }, { transparent: { ...WHITE } })).toBe(true);
    expect(sameParams({ transparent: WHITE }, { transparent: { ...WHITE, soft: 1 } })).toBe(false);
  });

  it("pixelKey : asset et réglages de pixels seulement", () => {
    const k = pixelKey(img({ brightness: 10 }));
    expect(pixelKey(img({ brightness: 10, quarterTurns: 1, crop: [0, 0, 5, 5] }))).toBe(k);
    expect(pixelKey(img({ brightness: 11 }))).not.toBe(k);
    expect(pixelKey({ ...img({ brightness: 10 }), asset: "cd".repeat(32) })).not.toBe(k);
    expect(pixelKey(img({ transparent: WHITE }))).not.toBe(pixelKey(img({ transparent: { ...WHITE, contiguous: false } })));
  });
});

describe("pixel source sous le point (C6b, B5)", () => {
  it("sans réglage : monde → pixel entier ; bord bas-droit borné à w − 1, h − 1", () => {
    const m: Matrix = [2, 0, 0, 2, 100, 50];
    expect(sourcePixelAt(m, img(), 100 + 2 * 10.7, 50 + 2 * 20.2, false)).toEqual([10, 20]);
    expect(sourcePixelAt(m, img(), 100 + 2 * 200, 50 + 2 * 100, false)).toEqual([199, 99]);
  });
  it("hors de la boîte : null pour la pipette, ramené dans l'image pour le pot (HB16)", () => {
    const m: Matrix = [1, 0, 0, 1, 0, 0];
    expect(sourcePixelAt(m, img(), 203, 50, false)).toBeNull();
    expect(sourcePixelAt(m, img(), 203, 50, true)).toEqual([199, 50]);
    expect(sourcePixelAt(m, img(), -4, -4, true)).toEqual([0, 0]);
  });
  it("rognage, retournements, quarts de tour : inverse de sourceToDisplay, 16 combinaisons", () => {
    for (const p of combos) {
      const i = img({ ...p, crop: [10, 5, 80, 40] });
      const [dx, dy] = sourceToDisplay(i, 30.5, 20.5);
      expect(sourcePixelAt([1, 0, 0, 1, 0, 0], i, dx, dy, false), JSON.stringify(p)).toEqual([30, 20]);
    }
  });
  it("RF5 : bord de la boîte avec quart de tour et retournement : la graine reste un pixel du rognage", () => {
    const i = img({ crop: [10, 5, 80, 40], quarterTurns: 1, flipX: true });
    const [bw, bh] = displaySize(i);
    for (const [x, y] of [[bw, bh], [bw + 3, bh + 3], [0, bh + 3], [-3, 0]] as const) {
      const s = sourcePixelAt([1, 0, 0, 1, 0, 0], i, x, y, true);
      expect(s !== null && s[0] >= 10 && s[0] <= 89 && s[1] >= 5 && s[1] <= 44, `${x},${y} → ${String(s)}`).toBe(true);
    }
  });
  it("matrice non inversible : null", () => {
    expect(sourcePixelAt([0, 0, 0, 0, 0, 0], img(), 1, 1, true)).toBeNull();
  });
});

describe("départ de la baguette (OG23, T10)", () => {
  const white = { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true };
  it("transparent x y : normalizeParams contrôle le départ contre w, h ; pixelKey le porte", () => {
    expect(normalizeParams({ transparent: { ...white, x: 199, y: 99 } }, 200, 100)).toEqual({ transparent: { ...white, x: 199, y: 99 } });
    for (const seed of [{ x: 200, y: 0 }, { x: 0, y: 100 }, { x: -1, y: 0 }, { x: 0.5, y: 0 }, { x: 3 }, { y: 3 }]) {
      expect(normalizeParams({ transparent: { ...white, ...seed } }, 200, 100), JSON.stringify(seed)).toBeNull();
    }
    const img = { asset: "a", w: 200, h: 100 };
    expect(pixelKey({ ...img, transparent: { ...white, x: 1, y: 2 } })).not.toBe(pixelKey({ ...img, transparent: white }));
    expect(pixelKey({ ...img, transparent: { ...white, x: 1, y: 2 } })).not.toBe(pixelKey({ ...img, transparent: { ...white, x: 2, y: 1 } }));
  });
});
