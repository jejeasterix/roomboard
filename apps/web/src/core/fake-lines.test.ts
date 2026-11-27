import { describe, expect, it } from "vitest";
import type { Command, CoreDocument, LineBinding } from "./api";
import { fakeCore } from "./fake-core";
import { applyMatrix, linePath } from "./shapes";

const PEN = { color: "#000000", width: 4 };
const rect = (d: CoreDocument, x: number, y: number): string =>
  d.apply({ type: "AddShape", page: d.pageIds()[0]!, shape: "rect", x0: x, y0: y, x1: x + 100, y1: y + 50, style: PEN, fill: null }).ids[0]!;
const add = (d: CoreDocument, shape: "line" | "arrow", c: [number, number, number, number], extra: Partial<Extract<Command, { type: "AddShape" }>> = {}): string =>
  d.apply({ type: "AddShape", page: d.pageIds()[0]!, shape, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: PEN, fill: null, ...extra }).ids[0]!;
const b = (id: string, fx: number, fy: number): LineBinding => ({ id, fx, fy });
function world(d: CoreDocument, id: string): [number, number][] {
  const v = d.element(id);
  if (v?.kind !== "shape") throw new Error("forme attendue");
  return linePath(v.shape.w, v.shape.h, v.shape.points ?? []).map(([x, y]) => applyMatrix(v.transform, x, y));
}
function linked(d: CoreDocument): [string, string, string] {
  const a = rect(d, 0, 0);
  const bb = rect(d, 400, 0);
  return [a, bb, add(d, "arrow", [100, 25, 400, 25], { start: b(a, 1, 0.5), end: b(bb, 0, 0.5) })];
}
/** Liaisons lues d'un élément : [départ, fin] (id ou undefined). */
function ends(d: CoreDocument, id: string): [string | undefined, string | undefined] {
  const v = d.element(id);
  if (v?.kind !== "shape") throw new Error("forme attendue");
  return [v.shape.start?.id, v.shape.end?.id];
}

describe("faux cœur OG12 : lignes et liaisons", () => {
  it("AddShape : extrémités recalées à 5 + épaisseur / 2, points intérieurs gardés", () => {
    const d = fakeCore.blank();
    const a = rect(d, 0, 0);
    const z = rect(d, 400, 0);
    const f = add(d, "arrow", [110, 25, 390, 25], { points: [250, -60], start: b(a, 1, 0.5), end: b(z, 0, 0.5) });
    expect(world(d, f)).toEqual([[107, 25], [250, -60], [393, 25]]);
  });
  it("suivi en une étape : B déplacé, la fin suit ; annuler rend tout", () => {
    const d = fakeCore.blank();
    const [, z, f] = linked(d);
    const before = d.element(f);
    const ch = d.apply({ type: "Transform", ids: [z], matrix: [1, 0, 0, 1, 0, 200] });
    expect(world(d, f)[1]).toEqual([393, 225]);
    expect(world(d, f)[0]).toEqual([107, 25]);
    expect(ch.ids).toEqual([z, f]);
    d.undo();
    expect(d.element(f)).toEqual(before);
    // Une seule étape : le même `undo` rend aussi B (un suivi en seconde étape laisserait B déplacé).
    expect(d.element(z)?.transform[5]).toBe(0);
    expect(d.canUndo()).toBe(true);
  });
  it("rupture bout par bout", () => {
    const d = fakeCore.blank();
    const [a, z, f] = linked(d);
    d.apply({ type: "Transform", ids: [f, a], matrix: [1, 0, 0, 1, 0, 50] });
    const v = d.element(f);
    expect(v?.kind === "shape" && v.shape.start?.id === a && v.shape.end === undefined).toBe(true);
    d.undo();
    d.apply({ type: "Transform", ids: [f, a, z], matrix: [1, 0, 0, 1, 30, 0] });
    expect(ends(d, f)).toEqual([a, z]);
    d.undo();
    d.apply({ type: "Transform", ids: [f], matrix: [1, 0, 0, 1, 0, 80] });
    expect(ends(d, f)).toEqual([undefined, undefined]);
  });
  it("cible supprimée lue libre ; annuler : liée", () => {
    const d = fakeCore.blank();
    const [, z, f] = linked(d);
    const w0 = world(d, f);
    d.apply({ type: "Delete", ids: [z] });
    const v = d.element(f);
    expect(v?.kind === "shape" && v.shape.end).toBeFalsy();
    expect(world(d, f)).toEqual(w0);
    d.undo();
    const w = d.element(f);
    expect(w?.kind === "shape" && w.shape.end?.id).toBe(z);
  });
  // Distingue `copyElements` (table ancien → neuf du lot tirée d'abord) de `copyElement` appelé élément par élément :
  // ce dernier laisserait `start` / `end` sur les originaux (a, z), et la copie seule resterait liée à eux.
  it("copie : liée aux copies avec ses cibles, libre seule", () => {
    const d = fakeCore.blank();
    const [a, z, f] = linked(d);
    const p = d.pageIds()[0]!;
    const all = d.insertFragment(d.extract(p, [a, z, f]), p, 10, 10).ids;
    const v = d.element(all[2]!);
    expect(v?.kind === "shape" && [v.shape.start?.id, v.shape.end?.id]).toEqual([all[0], all[1]]);
    const alone = d.insertFragment(d.extract(p, [f]), p, 10, 10).ids;
    const w = d.element(alone[0]!);
    expect(w?.kind === "shape" && (w.shape.start ?? w.shape.end)).toBeFalsy();
  });
  // La table ancien → neuf est tirée avant toute recopie : une flèche placée avant ses cibles dans le lot est renvoyée
  // vers leurs copies (une table remplie au fil de la recopie la laisserait libre).
  it("copie : flèche avant ses cibles dans le lot, liée aux copies", () => {
    const d = fakeCore.blank();
    const [a, z, f] = linked(d);
    const p = d.pageIds()[0]!;
    d.apply({ type: "Restack", ids: [f], to: 0 });
    expect(d.elementIds(p)).toEqual([f, a, z]);
    const all = d.insertFragment(d.extract(p, [a, z, f]), p, 10, 10).ids;
    expect(ends(d, all[0]!)).toEqual([all[1], all[2]]);
  });
  it("sauvegarde puis relecture : points, liaisons et coudée gardés", () => {
    const d = fakeCore.blank();
    const [a, z, f] = linked(d);
    d.apply({ type: "SetLinePoints", id: f, points: [107, 25, 250, -60, 393, 25], start: b(a, 1, 0.5), end: b(z, 0, 0.5) });
    const [, g] = d.apply({ type: "AddLinked", id: a, dir: "down" }).ids;
    const back = fakeCore.load(d.save("2026-11-27T00:00:00Z", "test"));
    expect(back.element(f)).toEqual(d.element(f));
    expect(back.element(g!)).toEqual(d.element(g!));
    const v = back.element(g!);
    expect(v?.kind === "shape" && v.look?.elbowed && v.shape.start?.id === a).toBe(true);
  });
  it("duplication de page : liaisons renvoyées vers les copies de la page", () => {
    const d = fakeCore.blank();
    linked(d);
    const p = d.pageIds()[0]!;
    d.apply({ type: "DuplicatePage", page: p });
    const q = d.pageIds()[1]!;
    const ids = d.elementIds(q);
    expect(ends(d, ids[2]!)).toEqual([ids[0], ids[1]]);
  });
  it("insertPages : liaisons renvoyées vers les copies des pages insérées", () => {
    const src = fakeCore.blank();
    linked(src);
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    d.insertPages(src, p);
    const ids = d.elementIds(d.pageIds()[1]!);
    expect(ends(d, ids[2]!)).toEqual([ids[0], ids[1]]);
  });
  it("SetLinePoints : une étape ; refus dans l'ordre du cœur", () => {
    const d = fakeCore.blank();
    const r = rect(d, 0, 0);
    const l = add(d, "line", [0, 100, 200, 100]);
    const v0 = d.version();
    d.apply({ type: "SetLinePoints", id: l, points: [0, 100, 100, 180, 200, 100], start: null, end: null });
    expect(d.version()).toBe(v0 + 1);
    expect(world(d, l)[1]).toEqual([100, 180]);
    const set = (id: string, points: number[], end: LineBinding | null = null): Command => ({ type: "SetLinePoints", id, points, start: null, end });
    expect(() => d.apply(set(l, [1, 2]))).toThrow("points invalides");
    expect(() => d.apply(set("absent", [0, 0, 1, 1]))).toThrow("élément inconnu : absent");
    expect(() => d.apply(set(r, [0, 0, 1, 1]))).toThrow("forme invalide");
    expect(() => d.apply(set(l, [0, 0, 1, 1], b(l, 0, 0.5)))).toThrow("forme invalide");
    d.apply({ type: "SetLinePoints", id: l, points: [0, 100, 100, 180, 200, 100], start: null, end: null });
    expect(d.version()).toBe(v0 + 1);
  });
  it("AddLinked : copie à droite à +200, flèche coudée liée, une étape ; place prise : glisse dessous", () => {
    const d = fakeCore.blank();
    const a = rect(d, 0, 0);
    const [c, f] = d.apply({ type: "AddLinked", id: a, dir: "right" }).ids;
    expect(d.element(c!)?.transform[4]).toBe(200);
    const v = d.element(f!);
    expect(v?.kind === "shape" && v.look?.elbowed && v.shape.start?.id === a && v.shape.end?.id === c).toBe(true);
    expect(world(d, f!)).toEqual([[107, 25], [193, 25]]);
    const [c2] = d.apply({ type: "AddLinked", id: a, dir: "right" }).ids;
    expect(d.element(c2!)?.transform[5]).toBeGreaterThanOrEqual(150);
    d.undo();
    expect(d.elementIds(d.pageIds()[0]!)).toHaveLength(3);
    const l = add(d, "line", [0, 500, 10, 500]);
    expect(() => d.apply({ type: "AddLinked", id: l, dir: "up" })).toThrow("forme invalide");
    expect(() => d.apply({ type: "AddLinked", id: "absent", dir: "up" })).toThrow("élément inconnu : absent");
  });
  it("bindTarget : plus petit contenant, contour projeté, ancres, ligne exclue", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const big = d.apply({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 400, y1: 400, style: PEN, fill: null }).ids[0]!;
    const small = rect(d, 100, 100);
    expect(d.bindTarget(p, 150, 120, 15)).toMatchObject({ id: small, onOutline: false });
    expect(d.bindTarget(p, 395, 300, 15)).toMatchObject({ id: big, onOutline: true, fixed: [1, 0.75] });
    expect(d.bindTarget(p, 395, 300, 15)?.anchors[1]).toEqual([400, 200]);
    expect(d.bindTarget(p, 900, 900, 15)).toBeNull();
    const l = add(d, "line", [600, 600, 700, 600]);
    expect(d.bindTarget(p, 650, 600, 15)?.id).not.toBe(l);
  });
  it("SetStyle : roundness sur la ligne, elbowed sur la flèche seule, pointes neuves", () => {
    const d = fakeCore.blank();
    const l = add(d, "line", [0, 0, 100, 0]);
    const f = add(d, "arrow", [0, 100, 100, 100], { points: [50, 140] });
    d.apply({ type: "SetStyle", ids: [l], patch: { roundness: "round" } });
    expect(d.element(l)?.look?.roundness).toBe("round");
    const v0 = d.version();
    d.apply({ type: "SetStyle", ids: [l], patch: { elbowed: true } });
    expect(d.version()).toBe(v0);
    d.apply({ type: "SetStyle", ids: [f], patch: { elbowed: true, endArrowhead: "circle" } });
    const v = d.element(f);
    expect(v?.kind === "shape" && v.look?.elbowed && v.look.endArrowhead === "circle" && v.shape.points === undefined).toBe(true);
  });
  it("SetText élargi : l'extrémité liée suit", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const t = d.apply({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "nœud", color: "#000000", size: 36, boxWidth: 100, boxHeight: 50 }).ids[0]!;
    const l = add(d, "line", [300, 25, 100, 25], { end: b(t, 1, 0.5) });
    expect(world(d, l)[1]).toEqual([105, 25]);
    d.apply({ type: "SetText", page: p, id: t, x: 0, y: 0, content: "nœud", color: "#000000", size: 36, boxWidth: 200, boxHeight: 50 });
    expect(world(d, l)[1]).toEqual([205, 25]);
  });
  it("hitTest suit la polyligne", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const l = add(d, "line", [0, 0, 200, 0], { points: [100, -80] });
    expect(d.hitTest(p, 100, -79, 2)).toBe(l);
    expect(d.hitTest(p, 100, 0, 2)).toBeNull();
  });
});
