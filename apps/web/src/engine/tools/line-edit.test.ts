import { describe, expect, it, vi } from "vitest";
import type { Command, ShapeElement } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { DEFAULT_ITEM_STYLE } from "../item-style";
import { createLineEditor } from "./line-edit";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const BIND = { id: "T", fx: 0.5, fy: 0.5 };
const HIT = { id: "T", fixed: [0.5, 0.5] as const, anchors: [[0, 0], [1, 1], [2, 2], [3, 3]] as const };

function setup(opts: { zoom?: number; touch?: boolean; inner?: number[]; start?: typeof BIND | null } = {}) {
  const zoom = opts.zoom ?? 1;
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const added = doc.apply({ type: "AddShape", page, shape: "line", x0: 0, y0: 0, x1: 200, y1: 0, style: DEFAULT_ITEM_STYLE, fill: null } as Command);
  const id = added.ids[0]!;
  const real = doc.element.bind(doc);
  const view = (): ShapeElement | null => {
    const v = real(id) as ShapeElement | null;
    if (!v || v.kind !== "shape") return v;
    return { ...v, shape: { ...v.shape, points: opts.inner ?? [], start: opts.start ?? null, end: null } } as ShapeElement;
  };
  vi.spyOn(doc, "element").mockImplementation((i: string) => (i === id ? view() : real(i)));
  let shift = false;
  const runs: Command[] = [];
  const exit = vi.fn();
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      return cmd.type === "SetLinePoints" ? ({ ids: [id] } as never) : doc.apply(cmd);
    },
    shift: () => shift,
    pointerType: () => (opts.touch ? "touch" : "mouse"),
  };
  const editor = createLineEditor(ctx, id, exit);
  return { doc, ctx, runs, exit, editor, id, setShift: (v: boolean) => { shift = v; } };
}

describe("Modifier les points (OG12 T9)", () => {
  it("poignées : un point par sommet, un milieu par segment d'au moins 40 px écran", () => {
    const a = setup();
    const kinds = a.editor.live().overlay?.points?.map((p) => p.kind);
    expect(kinds).toEqual(["point", "point", "mid"]);
    const b = setup({ zoom: 0.1 });
    expect(b.editor.live().overlay?.points?.map((p) => p.kind)).toEqual(["point", "point"]);
  });

  it("une SetLinePoints au relâché : milieu tiré de 80 px", () => {
    const { editor, runs, id } = setup();
    editor.begin(1, [at(100, 0)]);
    editor.extend(1, [at(100, 80)], []);
    expect(runs).toEqual([]);
    expect(editor.live().hidden.has(id)).toBe(true);
    editor.close(1, "end");
    expect(runs).toEqual([{ type: "SetLinePoints", id, points: [0, 0, 100, 80, 200, 0], start: null, end: null }]);
  });

  it("point tiré aimanté puis contraint par Maj à 15° depuis son voisin", () => {
    const { editor, runs, setShift } = setup({ inner: [100, 80] });
    setShift(true);
    editor.begin(1, [at(100, 80)]);
    editor.extend(1, [at(110, 25)], []);
    editor.close(1, "end");
    const pts = (runs[0] as Extract<Command, { type: "SetLinePoints" }>).points;
    const deg = (Math.atan2(pts[3]! - 0, pts[2]! - 0) * 180) / Math.PI;
    expect(Math.abs(deg / 15 - Math.round(deg / 15))).toBeLessThan(1e-6);
  });

  it("bout tiré sur un objet : lié ; tiré hors de portée : délié", () => {
    const a = setup();
    vi.spyOn(a.doc, "bindTarget").mockReturnValue(HIT as never);
    a.editor.begin(1, [at(200, 0)]);
    a.editor.extend(1, [at(300, 50)], []);
    a.editor.close(1, "end");
    expect(runs0(a).end).toEqual(BIND);
    const b = setup();
    vi.spyOn(b.doc, "bindTarget").mockReturnValue(null);
    b.editor.begin(1, [at(200, 0)]);
    b.editor.extend(1, [at(300, 50)], []);
    b.editor.close(1, "end");
    expect(runs0(b).end).toBeNull();
  });

  it("Maj+toucher ajoute au choix ; removeSelected retire les points choisis", () => {
    const { editor, runs, id, setShift } = setup({ inner: [100, 80] });
    editor.begin(1, [at(100, 80)]);
    editor.close(1, "end");
    expect(editor.selectedPoints()).toEqual([1]);
    setShift(true);
    editor.begin(2, [at(200, 0)]);
    editor.close(2, "end");
    expect(editor.selectedPoints()).toEqual([1, 2]);
    setShift(false);
    editor.begin(3, [at(0, 0)]);
    editor.close(3, "end");
    editor.begin(4, [at(100, 80)]);
    editor.close(4, "end");
    expect(runs).toEqual([]);
    expect(editor.removeSelected()).toBe(true);
    expect(runs).toEqual([{ type: "SetLinePoints", id, points: [0, 0, 200, 0], start: null, end: null }]);
  });

  it("retirer un bout : sa liaison part", () => {
    const { editor, runs } = setup({ inner: [100, 80], start: BIND });
    editor.begin(1, [at(0, 0)]);
    editor.close(1, "end");
    expect(editor.selectedPoints()).toEqual([0]);
    editor.removeSelected();
    expect(runs0({ runs })).toMatchObject({ points: [100, 80, 200, 0], start: null });
  });

  it("moins de deux points : Delete et sortie", () => {
    const { editor, runs, exit } = setup();
    editor.begin(1, [at(0, 0)]);
    editor.close(1, "end");
    expect(editor.removeSelected()).toBe(true);
    expect(runs.map((r) => r.type)).toEqual(["Delete"]);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("toucher hors de l'objet : sortie ; toucher sur le fût hors poignée : reste", () => {
    const { editor, exit, runs } = setup({ zoom: 0.1 });
    editor.begin(1, [at(10, 0)]); // fût à (100, 0) monde ? écran 10 -> monde 100
    editor.close(1, "end");
    expect(exit).not.toHaveBeenCalled();
    editor.begin(2, [at(50, 50)]);
    editor.close(2, "end");
    expect(exit).toHaveBeenCalledTimes(1);
    expect(runs).toEqual([]);
  });

  it("au doigt : portée 22 px", () => {
    const t = setup({ touch: true });
    t.editor.begin(1, [at(20, 0)]);
    t.editor.close(1, "end");
    expect(t.editor.selectedPoints()).toEqual([0]);
    const m = setup();
    m.editor.begin(1, [at(20, 0)]);
    m.editor.close(1, "end");
    expect(m.editor.selectedPoints()).toEqual([]);
  });
});

function runs0(s: { runs: Command[] }): Extract<Command, { type: "SetLinePoints" }> {
  return s.runs[0] as Extract<Command, { type: "SetLinePoints" }>;
}
