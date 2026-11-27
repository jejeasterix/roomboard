import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { OP, RecordingContext2D } from "./record-ctx";
import { cornerRadius, dashOf, newSeed, seedOf, sketchShape } from "./sketch";

/** Contexte réel minimal du contexte enregistreur (couleurs `#rrggbb`, mesure à 10 par caractère). */
class Real {
  private v = "#000000";
  font = "";
  get fillStyle(): string { return this.v; }
  set fillStyle(c: string) { if (/^#[0-9a-f]{6}$/i.test(c)) this.v = c; }
  measureText(t: string): TextMetrics { return { width: t.length * 10 } as TextMetrics; }
}
const rec = (): RecordingContext2D => new RecordingContext2D(new Real());
const ops = (r: RecordingContext2D): number[] => Array.from(r.encode().ops);
const ctx = (r: RecordingContext2D): CanvasRenderingContext2D => r as unknown as CanvasRenderingContext2D;

const rect = { shape: "rect" as const, w: 200, h: 100, fill: null };
const pen = { color: "#000000", width: 4 };

describe("sketch (OG11, DA-3)", () => {
  it("roughjs déterministe : même graine, mêmes opérations ; autre graine, autres opérations", () => {
    const a = rec();
    const b = rec();
    sketchShape(ctx(a), rect, pen, { roughness: 1 }, 42);
    sketchShape(ctx(b), rect, pen, { roughness: 1 }, 42);
    expect(ops(a).length).toBeGreaterThan(0);
    expect(ops(a)[0]).toBe(OP.stroke); // dessiné sur le contexte reçu (enregistreur), pas sur un canvas du DOM
    expect(JSON.stringify(ops(b))).toBe(JSON.stringify(ops(a)));
    const c = rec();
    sketchShape(ctx(c), rect, pen, { roughness: 1 }, 43);
    expect(JSON.stringify(ops(c))).not.toBe(JSON.stringify(ops(a)));
  });

  it("roughjs : formes remplie, arrondie, ellipse, flèche ; tirets passés au contexte", () => {
    const filled = rec();
    const fill = vi.spyOn(filled, "fill");
    sketchShape(ctx(filled), { ...rect, fill: "#ff0000" }, pen, { roughness: 2 }, 5);
    expect(fill).toHaveBeenCalled();
    const round = rec();
    sketchShape(ctx(round), rect, pen, { roughness: 1, roundness: "round" }, 5);
    expect(JSON.stringify(ops(round))).not.toBe(JSON.stringify(ops(rec())));
    const ell = rec();
    const ellStroke = vi.spyOn(ell, "stroke");
    sketchShape(ctx(ell), { shape: "ellipse", w: 80, h: 40, fill: null }, pen, { roughness: 1 }, 5);
    expect(ellStroke).toHaveBeenCalledTimes(1);
    const arrow = rec();
    const arrowStroke = vi.spyOn(arrow, "stroke");
    sketchShape(ctx(arrow), { shape: "arrow", w: 100, h: 0, fill: null }, pen, { roughness: 1 }, 5);
    expect(arrowStroke).toHaveBeenCalledTimes(3); // ligne puis deux ailes
    const dashed = rec();
    const dash = vi.spyOn(dashed, "setLineDash");
    sketchShape(ctx(dashed), rect, pen, { roughness: 1, strokeStyle: "dashed" }, 5);
    expect(dash).toHaveBeenCalledWith([8, 12]);
  });

  it("seedOf : FNV-1a 32 bits stable ; newSeed : entier 32 bits non signé", () => {
    expect(seedOf("abc")).toBe(0x1a47e90b);
    expect(seedOf("abc")).toBe(seedOf("abc"));
    expect(seedOf("")).toBe(0x811c9dc5);
    const s = newSeed();
    expect(Number.isInteger(s) && s >= 0 && s <= 0xffffffff).toBe(true);
  });

  it("dashOf", () => {
    expect(dashOf("solid", 4)).toEqual([]);
    expect(dashOf("dashed", 4)).toEqual([8, 12]);
    expect(dashOf("dashed", 8)).toEqual([16, 16]);
    expect(dashOf("dotted", 4)).toEqual([0, 10]);
  });

  it("cornerRadius adaptatif", () => {
    expect(cornerRadius(200, 100)).toBe(25);
    expect(cornerRadius(1000, 1000)).toBe(32);
    expect(cornerRadius(-200, 100)).toBe(25);
  });

  it("sans DOM : rough.generator() seulement, jamais rough.canvas ni document (patron interdit)", () => {
    const src = readFileSync(join(__dirname, "sketch.ts"), "utf8");
    expect(src).not.toMatch(/rough\.canvas|rough\.svg|document\.|roundRect/);
    expect(src).toMatch(/rough\.generator\(\)/);
  });
});
