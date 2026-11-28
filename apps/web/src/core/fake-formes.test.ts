// OG12 (lot 2a) : losange (n° 33) et ligne fermée par `ShapeToPolygon` (n° 34, H5), miroir de
// crates/roomboard-core/tests/formes.rs. Cadrage : docs/plans/personnalisation-2-outils-cadrage.md.
import { describe, expect, it } from "vitest";
import type { CoreDocument, ShapeData, ShapeElement } from "./api";
import { fakeCore } from "./fake-core";
import { applyMatrix, lineGeomOf, linePath, shapePolygon } from "./shapes";

const doc = (): CoreDocument => fakeCore.blank();
const pen = { color: "#000000", width: 4 };
function add(d: CoreDocument, shape: "rect" | "diamond" | "ellipse" | "arrow" | "line", c: [number, number, number, number], extra: Record<string, unknown> = {}): string {
  const page = d.pageIds()[0]!;
  const ch = d.apply({ type: "AddShape", page, shape, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: pen, fill: null, ...extra } as never);
  return ch.ids[0]!;
}
const shapeOf = (d: CoreDocument, id: string): ShapeData => (d.element(id) as ShapeElement).shape;
/** Sommets monde : départ, points intérieurs, (w, h). */
function world(d: CoreDocument, id: string): [number, number][] {
  const v = d.element(id) as ShapeElement;
  return linePath(v.shape.w, v.shape.h, v.shape.points ?? []).map(([x, y]) => applyMatrix(v.transform, x, y));
}
const near = (p: readonly [number, number], q: readonly [number, number]): boolean => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;

describe("OG12 lot 2a : losange et ligne fermée (faux cœur)", () => {
  it("losange : coin de la boîte hors de la forme", () => {
    const d = doc();
    const id = add(d, "diamond", [0, 0, 100, 100]);
    expect(shapeOf(d, id).shape).toBe("diamond");
    expect(d.hitTest(d.pageIds()[0]!, 50, 50, 0)).toBe(id);
    expect(d.hitTest(d.pageIds()[0]!, 8, 8, 0)).toBeNull();
  });
  it("flèche liée au sommet haut du losange, écart 5 + 4/2", () => {
    const d = doc();
    const id = add(d, "diamond", [0, 0, 100, 100]);
    const a = add(d, "arrow", [50, -200, 50, -3], { end: { id, fx: 0.5, fy: 0 } });
    const s = shapeOf(d, a);
    const e = d.element(a)!;
    expect(e.transform[5] + s.h).toBeCloseTo(-7, 6);
  });
  it("AddLinked copie un losange (H10 levée)", () => {
    const d = doc();
    const id = add(d, "diamond", [0, 0, 100, 60]);
    const ch = d.apply({ type: "AddLinked", id, dir: "right" });
    expect(shapeOf(d, ch.ids[0]!).shape).toBe("diamond");
  });
  it("ShapeToPolygon en une étape : rectangle rempli converti en place", () => {
    const d = doc();
    const id = add(d, "rect", [10, 20, 110, 70], { fill: "#ff0000" });
    const before = JSON.stringify(d.element(id));
    d.apply({ type: "ShapeToPolygon", id } as never);
    const s = shapeOf(d, id);
    expect(s.shape).toBe("line");
    expect(s.polygon).toBe(true);
    expect(s.fill).toBe("#ff0000");
    // DA-1 : départ = translation, dernier sommet = (w, h) ≠ départ, fermeture implicite (jamais le départ répété).
    expect(s.points).toEqual([100, 0, 100, 50]);
    expect([s.w, s.h]).toEqual([0, 50]);
    expect(d.element(id)!.transform.slice(4)).toEqual([10, 20]);
    expect(d.undo().full).toBe(true);
    expect(JSON.stringify(d.element(id))).toBe(before);
  });
  it("losange converti : quatre sommets haut, droite, bas, gauche", () => {
    const d = doc();
    const id = add(d, "diamond", [0, 0, 100, 60]);
    d.apply({ type: "ShapeToPolygon", id } as never);
    const w = world(d, id);
    expect(w).toHaveLength(4);
    [[50, 0], [100, 30], [50, 60], [0, 30]].forEach((q, i) => expect(near(w[i]!, q as [number, number]), JSON.stringify(w)).toBe(true));
  });
  it("ellipse convertie : 16 sommets, départ en haut", () => {
    const d = doc();
    const id = add(d, "ellipse", [0, 0, 100, 60]);
    d.apply({ type: "ShapeToPolygon", id } as never);
    const s = shapeOf(d, id);
    expect((s.points?.length ?? 0) / 2 + 2).toBe(16);
    expect(d.element(id)!.transform.slice(4)).toEqual([50, 0]);
  });
  it("ligne fermée : liaisons refusées, moins de 3 sommets refusés, ligne non convertible", () => {
    const d = doc();
    const id = add(d, "rect", [0, 0, 100, 50]);
    const other = add(d, "rect", [300, 0, 400, 50]);
    d.apply({ type: "ShapeToPolygon", id } as never);
    expect(() => d.apply({ type: "SetLinePoints", id, points: [0, 0, 100, 0], start: null, end: null })).toThrow(/BadPoints|points/);
    expect(() => d.apply({ type: "SetLinePoints", id, points: [0, 0, 100, 0, 100, 50], start: { id: other, fx: 0, fy: 0.5 }, end: null })).toThrow(/BadShape|forme/);
    const line = add(d, "line", [0, 0, 50, 50]);
    expect(() => d.apply({ type: "ShapeToPolygon", id: line } as never)).toThrow(/BadShape|forme/);
    expect(() => d.apply({ type: "ShapeToPolygon", id: "absent" } as never)).toThrow(/inconnu/);
  });
  it("flèche liée lue libre après ShapeToPolygon, liée après annulation", () => {
    const d = doc();
    const r = add(d, "rect", [0, 0, 100, 50]);
    const a = add(d, "arrow", [-200, 25, -7, 25], { end: { id: r, fx: 0, fy: 0.5 } });
    d.apply({ type: "ShapeToPolygon", id: r } as never);
    expect(shapeOf(d, a).end).toBeUndefined();
    d.undo();
    expect(shapeOf(d, a).end?.id).toBe(r);
  });
  it("ligne fermée touchée dedans ; roundness retiré (H5)", () => {
    const d = doc();
    const id = add(d, "rect", [0, 0, 100, 50]);
    d.apply({ type: "SetStyle", ids: [id], patch: { roundness: "round" } } as never);
    d.apply({ type: "ShapeToPolygon", id } as never);
    expect(d.hitTest(d.pageIds()[0]!, 50, 25, 0)).toBe(id);
    expect(d.element(id)!.look?.roundness).toBeUndefined();
  });
  it("ligne fermée : collision par shapePolygon, bord élargi de la demi-épaisseur", () => {
    // Discrimine une boucle de collision propre au faux cœur (sommets bruts) : le bord touché est celui de
    // `shapePolygon` (fermé, élargi de 4 / 2), lu par `lineGeomOf`.
    const d = doc();
    const id = add(d, "rect", [0, 0, 100, 50]);
    d.apply({ type: "ShapeToPolygon", id } as never);
    const s = shapeOf(d, id);
    expect(lineGeomOf(s)).toEqual({ inner: [100, 0, 100, 50], curve: false, closed: true });
    const xs = shapePolygon(s.shape, s.w, s.h, 4, lineGeomOf(s)).filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeCloseTo(-2, 9);
    const page = d.pageIds()[0]!;
    expect(d.hitTest(page, -1.5, 25, 0)).toBe(id);
    expect(d.hitTest(page, -2.5, 25, 0)).toBeNull();
    expect(d.hitTest(page, 50, 52.5, 0)).toBeNull();
  });
});
