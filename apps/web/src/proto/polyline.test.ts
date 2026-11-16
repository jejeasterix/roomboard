import { describe, expect, it } from "vitest";
import { drawPredicted, drawSegments, widthFor, type StrokeCtx } from "./polyline";

class FakeCtx implements StrokeCtx {
  lineWidth = 1;
  lineCap: CanvasLineCap = "butt";
  lineJoin: CanvasLineJoin = "miter";
  strokeStyle: string | CanvasGradient | CanvasPattern = "#000";
  globalAlpha = 1;
  readonly calls: string[] = [];
  readonly widths: number[] = [];
  readonly alphas: number[] = [];
  beginPath(): void {
    this.calls.push("begin");
  }
  moveTo(x: number, y: number): void {
    this.calls.push(`M${x},${y}`);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(`L${x},${y}`);
  }
  stroke(): void {
    this.calls.push("stroke");
    this.widths.push(this.lineWidth);
    this.alphas.push(this.globalAlpha);
  }
}

const p = (x: number, pressure: number) => ({ x, y: 0, pressure });

describe("widthFor", () => {
  it("suit la pression, bornée entre 0 et 1", () => {
    expect(widthFor(0, 4)).toBeCloseTo(0.8);
    expect(widthFor(0.5, 4)).toBeCloseTo(4);
    expect(widthFor(1, 4)).toBeCloseTo(7.2);
    expect(widthFor(2, 4)).toBeCloseTo(7.2);
    expect(widthFor(-1, 4)).toBeCloseTo(0.8);
  });
});

describe("drawSegments", () => {
  it("premier passage : un segment par paire, largeur = pression moyenne", () => {
    const ctx = new FakeCtx();
    const drawn = drawSegments(ctx, [p(0, 0), p(10, 1), p(20, 0.5)], 0, 4, "#111");
    expect(drawn).toBe(3);
    expect(ctx.calls).toEqual(["begin", "M0,0", "L10,0", "stroke", "begin", "M10,0", "L20,0", "stroke"]);
    expect(ctx.widths[0]).toBeCloseTo(4);
    expect(ctx.widths[1]).toBeCloseTo(widthFor(0.75, 4));
    expect(ctx.strokeStyle).toBe("#111");
    expect(ctx.lineCap).toBe("round");
  });

  it("passage suivant : seulement les nouveaux segments, raccordés au dernier point dessiné", () => {
    const ctx = new FakeCtx();
    const drawn = drawSegments(ctx, [p(0, 0.5), p(10, 0.5), p(20, 0.5), p(30, 0.5), p(40, 0.5)], 3, 4, "#111");
    expect(drawn).toBe(5);
    expect(ctx.calls).toEqual(["begin", "M20,0", "L30,0", "stroke", "begin", "M30,0", "L40,0", "stroke"]);
  });

  it("un seul point : un point rond", () => {
    const ctx = new FakeCtx();
    expect(drawSegments(ctx, [p(5, 0.5)], 0, 4, "#111")).toBe(1);
    expect(ctx.calls).toEqual(["begin", "M5,0", "L5,0", "stroke"]);
  });

  it("rien de neuf : aucun appel", () => {
    const ctx = new FakeCtx();
    expect(drawSegments(ctx, [p(0, 0.5), p(10, 0.5)], 2, 4, "#111")).toBe(2);
    expect(ctx.calls).toEqual([]);
  });
});

describe("drawPredicted", () => {
  it("queue provisoire semi-transparente depuis le dernier point", () => {
    const ctx = new FakeCtx();
    drawPredicted(ctx, p(10, 0.5), [p(12, 0.5), p(14, 0.5)], 4, "#111");
    expect(ctx.calls).toEqual(["begin", "M10,0", "L12,0", "L14,0", "stroke"]);
    expect(ctx.alphas).toEqual([0.5]);
    expect(ctx.globalAlpha).toBe(1);
  });

  it("aucun point prédit : aucun appel", () => {
    const ctx = new FakeCtx();
    drawPredicted(ctx, p(10, 0.5), [], 4, "#111");
    expect(ctx.calls).toEqual([]);
  });
});
