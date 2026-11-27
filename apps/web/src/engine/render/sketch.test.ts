import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { OP, RecordingContext2D } from "./record-ctx";
import { RoughGenerator } from "roughjs/bin/generator";
import { cornerRadius, dashOf, newSeed, seedOf, sketchShape, type SketchPlan } from "./sketch";

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
    const sharp = rec();
    sketchShape(ctx(sharp), rect, pen, { roughness: 1 }, 5);
    expect(ops(round).length).toBeGreaterThan(0);
    expect(JSON.stringify(ops(round))).not.toBe(JSON.stringify(ops(sharp)));
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

  it("adjustRoughness : petites formes, rugosité réduite puis plafonnée à 2,5 ; grandes formes inchangées", () => {
    const small = { shape: "rect" as const, w: 10, h: 10, fill: null };
    const at = (s: typeof rect, r: number): string => {
      const c = rec();
      sketchShape(ctx(c), s, pen, { roughness: r as 1 }, 9);
      return JSON.stringify(ops(c));
    };
    // Petite forme : min(r / 2, 2,5) ; 9 et 12 plafonnent au même 2,5, pas sur une grande forme.
    expect(at(small, 9)).toBe(at(small, 12));
    expect(at(rect, 9)).not.toBe(at(rect, 12));
    expect(at(small, 2)).not.toBe(at(small, 4));
  });

  it("cache : le tracé mémorisé est rejoué sans nouvel appel du générateur", () => {
    const memo = new Map<string, SketchPlan>();
    const spy = vi.spyOn(RoughGenerator.prototype, "rectangle");
    try {
      const a = rec();
      const b = rec();
      sketchShape(ctx(a), rect, pen, { roughness: 1 }, 42, { id: "x", cache: memo });
      sketchShape(ctx(b), rect, pen, { roughness: 1 }, 42, { id: "x", cache: memo });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(ops(b))).toBe(JSON.stringify(ops(a)));
      sketchShape(ctx(b), { ...rect, w: 201 }, pen, { roughness: 1 }, 42, { id: "x", cache: memo });
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
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

describe("sketch lot 2 : hachures et pointes", () => {
  const filled = { shape: "rect" as const, w: 100, h: 50, fill: "#fef08a" };
  const run = (shape: Parameters<typeof sketchShape>[1], look: Parameters<typeof sketchShape>[3]): number[] => {
    const r = rec();
    sketchShape(ctx(r), shape, pen, look, 3);
    return ops(r);
  };
  it("hachures déterministes", () => {
    const a = run(filled, { fillStyle: "hachure" });
    expect(a.length).toBeGreaterThan(0);
    expect(run(filled, { fillStyle: "hachure" })).toEqual(a);
  });
  it("hachures et hachures croisées diffèrent du plein et entre elles", () => {
    const solid = run(filled, {});
    const h = run(filled, { fillStyle: "hachure" });
    const c = run(filled, { fillStyle: "cross-hatch" });
    expect(h).not.toEqual(solid);
    expect(c).not.toEqual(h);
    expect(c.length).toBeGreaterThan(h.length);
  });
  it("pointes : aucune, flèche, triangle, triangle vide, deux bouts, toutes distinctes", () => {
    const arrow = { shape: "arrow" as const, w: 100, h: 0, fill: null };
    const none = run(arrow, { endArrowhead: "none" });
    const def = run(arrow, {});
    const tri = run(arrow, { endArrowhead: "triangle" });
    const out = run(arrow, { endArrowhead: "triangle_outline" });
    const both = run(arrow, { startArrowhead: "arrow" });
    const all = [none, def, tri, out, both].map((o) => JSON.stringify(o));
    expect(new Set(all).size).toBe(5);
    expect(none.length).toBeLessThan(def.length);
    expect(both.length).toBeGreaterThan(def.length);
  });

  it("point intérieur déplacé : tracé roughjs changé", () => {
    const memo = { id: "l", cache: new Map<string, SketchPlan>() };
    const line = { shape: "line" as const, w: 200, h: 0, fill: null };
    sketchShape(ctx(rec()), { ...line, points: [100, -50] }, pen, { roughness: 1, seed: 3 }, 3, memo);
    const before = memo.cache.get("l")!;
    sketchShape(ctx(rec()), { ...line, points: [100, -60] }, pen, { roughness: 1, seed: 3 }, 3, memo);
    const after = memo.cache.get("l")!;
    expect(after.key).not.toBe(before.key);
    expect(after).not.toBe(before);
  });

  it("même ligne sans points : même clé qu'avant OG12", () => {
    const memo = { id: "l", cache: new Map<string, SketchPlan>() };
    sketchShape(ctx(rec()), { shape: "line", w: 200, h: 0, fill: null }, pen, { roughness: 1 }, 3, memo);
    const key = memo.cache.get("l")!.key;
    // Chaîne d'avant OG12 ; seuls `points` (absent) et `elbowed` (faux) s'y ajoutent à la fin.
    expect(key).toBe('["line",200,0,null,"#000000",4,"solid",1,false,3,"solid","none","arrow",null,false]');
  });

  it("polyligne et courbe : le tracé passe par les points, les pointes suivent les segments d'extrémité", () => {
    const a = rec();
    sketchShape(ctx(a), { shape: "arrow", w: 100, h: 0, fill: null, points: [50, -80] }, pen, { roughness: 1, startArrowhead: "bar", endArrowhead: "circle" }, 5);
    expect(ops(a).length).toBeGreaterThan(0);
    const b = rec();
    sketchShape(ctx(b), { shape: "arrow", w: 100, h: 0, fill: null, points: [50, -80] }, pen, { roughness: 1, roundness: "round", startArrowhead: "circle_outline", endArrowhead: "bar" }, 5);
    expect(ops(b)).not.toEqual(ops(a));
  });
});
