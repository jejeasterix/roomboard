import { describe, expect, it } from "vitest";
import type { Command, CoreDocument } from "./api";
import { fakeCore } from "./fake-core";

const style = { color: "#000000", width: 4 };
const line = (y: number): Float32Array => new Float32Array([0, y, 0.5, 50, y, 0.5, 100, y, 0.5]);
const commit = (d: CoreDocument, page: string, y: number): string => {
  const c = d.apply({ type: "CommitStroke", page, points: line(y), style });
  const id = c.ids[0];
  if (id === undefined) throw new Error("aucun id");
  return id;
};
const firstPage = (d: CoreDocument): string => {
  const p = d.pageIds()[0];
  if (p === undefined) throw new Error("aucune page");
  return p;
};

describe("fakeCore", () => {
  it("blank a une page", () => {
    expect(fakeCore.blank().pageIds()).toHaveLength(1);
  });

  it("une page vide ne s'annule pas", () => {
    const d = fakeCore.blank();
    expect(d.canUndo()).toBe(false);
    d.undo();
    expect(d.pageIds()).toHaveLength(1);
  });

  it("CommitStroke ajoute un élément et rend son id", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = commit(d, p, 10);
    expect(d.elementIds(p)).toEqual([id]);
    expect(d.element(id)?.transform).toEqual([1, 0, 0, 1, 0, 10]);
  });

  it("les points lus sont locaux", () => {
    const d = fakeCore.blank();
    const id = commit(d, firstPage(d), 10);
    expect(Array.from(d.points(id) ?? [])).toEqual([0, 0, 0.5, 50, 0, 0.5, 100, 0, 0.5]);
  });

  it("annuler puis rétablir un trait", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    commit(d, p, 10);
    expect(d.undo().full).toBe(true);
    expect(d.elementIds(p)).toHaveLength(0);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(1);
  });

  it("la gomme d'objet retire le trait touché, une seule étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    commit(d, p, 10);
    commit(d, p, 200);
    const cmd: Command = { type: "Erase", page: p, path: new Float32Array([50, 0, 50, 20]), radius: 5, mode: "object" };
    expect(d.apply(cmd).removed).toHaveLength(1);
    expect(d.elementIds(p)).toHaveLength(1);
    d.undo();
    expect(d.elementIds(p)).toHaveLength(2);
  });

  it("supprimer la dernière page est refusé", () => {
    const d = fakeCore.blank();
    expect(() => d.apply({ type: "RemovePage", page: firstPage(d) })).toThrow(/dernière page/);
  });

  it("save puis load rend les mêmes éléments", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = commit(d, p, 10);
    const e = fakeCore.load(d.save("2026-11-16T12:00:00Z", "0.1.0"));
    expect(e.elementIds(p)).toEqual([id]);
    expect(e.canUndo()).toBe(false);
  });

  it("load d'octets quelconques lève le message du cœur", () => {
    expect(() => fakeCore.load(new Uint8Array([1, 2, 3]))).toThrow("ce fichier n'est pas un document RoomBoard");
    expect(() => fakeCore.load(new TextEncoder().encode("{}"))).toThrow("ce fichier n'est pas un document RoomBoard");
  });

  it("le StrokeBuilder rend un contour non vide", () => {
    const d = fakeCore.blank();
    const b = d.newStrokeBuilder(style);
    expect(b.push(new Float32Array([0, 0, 0.5, 10, 0, 0.5])).length).toBeGreaterThan(0);
    expect(b.finish().length).toBeGreaterThan(0);
    b.free();
  });
});
