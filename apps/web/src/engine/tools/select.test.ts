import { describe, expect, it, vi } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { createSelectTool } from "./select";
import type { SelectionTool, ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });

function setup(zoom = 1) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let shift = false;
  let alt = false;
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
    shift: () => shift,
    alt: () => alt,
  };
  const tool = createSelectTool(ctx);
  const rect = (x0: number, y0: number, x1: number, y1: number): string =>
    doc.apply({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
  return { doc, tool, runs, rect, setShift: (v: boolean) => { shift = v; }, setAlt: (v: boolean) => { alt = v; } };
}

function gesture(tool: SelectionTool, pts: [number, number][], how: CloseReason = "end", id = 1): void {
  const [first, ...rest] = pts;
  if (!first) return;
  tool.begin(id, [at(first[0], first[1])]);
  for (const [x, y] of rest) tool.extend(id, [at(x, y)], []);
  tool.close(id, how);
}

describe("outil Sélection (D15, D38)", () => {
  it("clic sur un élément : il est sélectionné, sans écriture", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([a]);
    expect(runs).toEqual([]);
  });

  it("un clic sans glisser n'écrit rien", () => {
    const { tool, runs, rect } = setup();
    rect(100, 100, 200, 200);
    gesture(tool, [[150, 150], [151, 150]]);
    expect(runs).toEqual([]);
  });

  it("glisser un élément : aperçu sans écriture, puis une Transform de translation au relâché", () => {
    const { doc, tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    tool.begin(1, [at(150, 150)]);
    tool.extend(1, [at(250, 180)], []);
    const live = tool.live();
    expect([...live.hidden]).toEqual([a]);
    expect(live.overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 100, 30] }]);
    expect(live.overlay?.frame).toEqual({ x0: 198, y0: 128, x1: 302, y1: 232 });
    expect(runs).toEqual([]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 100, 30] }]);
    expect(doc.element(a)?.transform).toEqual([1, 0, 0, 1, 200, 130]);
    expect(tool.live().hidden.size).toBe(0);
  });

  it("glisser un élément non sélectionné : le sélectionne et le déplace dans le même geste", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    gesture(tool, [[450, 150], [460, 150]]);
    expect(tool.selection()).toEqual([b]);
    expect(runs).toEqual([{ type: "Transform", ids: [b], matrix: [1, 0, 0, 1, 10, 0] }]);
    expect(tool.selection()).not.toContain(a);
  });

  it("Maj+clic ajoute puis retire", () => {
    const { tool, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[450, 150]]);
    expect(tool.selection()).toEqual([a, b]);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([b]);
  });

  it("rectangle dans le vide : éléments entièrement inclus, rectangle en aperçu", () => {
    const { tool, rect } = setup();
    const a = rect(100, 100, 200, 200);
    rect(400, 100, 500, 200);
    tool.begin(1, [at(50, 50)]);
    tool.extend(1, [at(300, 300)], []);
    expect(tool.live().overlay?.band).toEqual({ x0: 50, y0: 50, x1: 300, y1: 300 });
    tool.close(1, "end");
    expect(tool.selection()).toEqual([a]);
  });

  it("Maj + rectangle ajoute à la sélection ; rectangle sans Maj la remplace", () => {
    const { tool, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[350, 50], [600, 300]]);
    expect(tool.selection()).toEqual([a, b]);
    setShift(false);
    gesture(tool, [[350, 50], [600, 300]]);
    expect(tool.selection()).toEqual([b]);
  });

  it("poignée de coin : Transform d'échelle autour du coin opposé", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200); // bornes 98..202 (demi-épaisseur 2)
    gesture(tool, [[150, 150]]);
    gesture(tool, [[202, 202], [306, 306]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [2, 0, 0, 2, -98, -98] }]);
  });

  it("Maj tenue avant la poignée : proportions", () => {
    const { tool, runs, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200); // bornes 98..202
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[202, 202], [306, 250]]);
    expect(tool.selection()).toEqual([a]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [2, 0, 0, 2, -98, -98] }]);
  });

  it("tiret de 20×4 unités à zoom 1 : appui au centre puis glisser = déplacer, pas redimensionner", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 120, 104);
    tool.setSelection([a]);
    gesture(tool, [[110, 102], [140, 112]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 30, 10] }]);
  });

  it("cadre 34×8 px, appui au centre : déplacement, pas de poignée n/s", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 130, 104); // cadre 98..132 × 98..106
    tool.setSelection([a]);
    gesture(tool, [[115, 102], [125, 112]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 10] }]);
  });

  it("tiret 18×4 (cadre 22×8 px), appui au centre : déplacement, aucun coin pris", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 118, 104);
    tool.setSelection([a]);
    gesture(tool, [[109, 102], [119, 112]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 10] }]);
  });

  it("trait vertical (cadre 4 px de large), appui au bout haut : poignée n, pas nw", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 100, 140); // cadre 98..102 × 98..142
    tool.setSelection([a]);
    gesture(tool, [[100, 98], [100, 78]]);
    expect(runs).toHaveLength(1);
    const m = (runs[0] as unknown as { matrix: number[] }).matrix;
    expect(m[0]).toBe(1); // largeur inchangée : poignée n (pas nw)
    expect(m[3]).toBeGreaterThan(1);
  });

  it("zoom 2 : poignée de coin et déplacement en unités monde", () => {
    const { tool, runs, rect } = setup(2);
    const a = rect(100, 100, 200, 200); // bornes 98..202, soit 196..404 à l'écran
    gesture(tool, [[300, 300]]);
    gesture(tool, [[404, 404], [612, 612]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [2, 0, 0, 2, -98, -98] }]);
  });

  it("zoom 2 : glisser le corps déplace de l'écart en unités monde", () => {
    const { tool, runs, rect } = setup(2);
    const a = rect(100, 100, 200, 200);
    gesture(tool, [[300, 300], [500, 360]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 100, 30] }]);
  });

  it("cancel et abort n'écrivent rien", () => {
    const { tool, runs, rect } = setup();
    rect(100, 100, 200, 200);
    gesture(tool, [[150, 150], [250, 150]], "cancel");
    gesture(tool, [[150, 150], [250, 150]], "abort");
    expect(runs).toEqual([]);
    expect(tool.active()).toBe(false);
  });

  it("prune retire les ids absents ; leave vide la sélection ; cadre et poignées au repos", () => {
    const { doc, tool, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    tool.setSelection([a, b]);
    expect(tool.live().overlay).toMatchObject({ handles: true, frame: { x0: 98, y0: 98, x1: 502, y1: 202 } });
    doc.apply({ type: "Delete", ids: [b] });
    tool.prune();
    expect(tool.selection()).toEqual([a]);
    tool.leave?.("tool");
    expect(tool.selection()).toEqual([]);
    expect(tool.live().overlay).toBeUndefined();
  });
});

describe("outil Sélection — magnétisme (C9, S3)", () => {
  const squares40 = (snap: boolean) => ({
    visible: true,
    snap,
    above: false,
    levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", lineWidth: 1, snap: true, visible: true }],
  });

  it("glisser aimanté : fantôme aimanté, puis une seule Transform égale à l'aperçu ; la boîte géométrique a son centre sur un croisement", () => {
    const { doc, tool, runs, rect } = setup();
    const page = doc.pageIds()[0] ?? "";
    const a = rect(13, 17, 113, 77);
    doc.apply({ type: "SetGrid", page, grid: squares40(true) });
    tool.begin(1, [at(60, 50)]);
    tool.extend(1, [at(112, 81)], []);
    expect(tool.live().overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 57, 33] }]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 57, 33] }]);
    expect(doc.element(a)?.transform).toEqual([1, 0, 0, 1, 70, 50]);
  });

  it("Alt tenue : déplacement brut ; magnétisme coupé : brut", () => {
    for (const [alt, snap] of [[true, true], [false, false]] as const) {
      const { doc, tool, runs, rect, setAlt } = setup();
      const page = doc.pageIds()[0] ?? "";
      const a = rect(13, 17, 113, 77);
      doc.apply({ type: "SetGrid", page, grid: squares40(snap) });
      setAlt(alt);
      tool.begin(1, [at(60, 50)]);
      tool.extend(1, [at(112, 81)], []);
      expect(tool.live().overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 52, 31] }]);
      tool.close(1, "end");
      expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 52, 31] }]);
    }
  });

  it("sans grille : déplacement brut, comme avant C9", () => {
    const { tool, runs, rect } = setup();
    const a = rect(13, 17, 113, 77);
    tool.begin(1, [at(60, 50)]);
    tool.extend(1, [at(112, 81)], []);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 52, 31] }]);
  });

  it("élément aligné, petit glisser au-delà de 2 px que l'aimant ramène en place : ni Transform ni fantôme (G7)", () => {
    const { doc, tool, runs, rect } = setup();
    const page = doc.pageIds()[0] ?? "";
    // Centre (160, 160) sur un croisement, appui (100, 100) dans une binade plus basse : `dx + (q - (c + dx))`
    // y laisserait ±1,4e-14, une translation non nulle.
    const a = rect(70, 70, 250, 250);
    doc.apply({ type: "SetGrid", page, grid: squares40(true) });
    tool.begin(1, [at(100, 100)]);
    tool.extend(1, [at(102.3, 101.7)], []);
    const live = tool.live();
    expect(live.overlay?.ghosts).toEqual([]);
    expect(live.hidden.size).toBe(0);
    tool.close(1, "end");
    expect(runs).toEqual([]);
    expect(doc.element(a)?.transform).toEqual([1, 0, 0, 1, 70, 70]);
  });

  it("Alt pressée en cours de geste : l'aimant se coupe à l'image suivante, Transform brute (G8)", () => {
    const { doc, tool, runs, rect, setAlt } = setup();
    const page = doc.pageIds()[0] ?? "";
    const a = rect(13, 17, 113, 77);
    doc.apply({ type: "SetGrid", page, grid: squares40(true) });
    tool.begin(1, [at(60, 50)]);
    tool.extend(1, [at(112, 81)], []);
    expect(tool.live().overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 57, 33] }]);
    setAlt(true);
    expect(tool.live().overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 52, 31] }]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 52, 31] }]);
  });
});

describe("révélation d'un ombrage (F10)", () => {
  type S = ReturnType<typeof setup>;
  /** Tableau 2 × 2 (240 × 64) en (100, 100), cellule (0, 0) ombrée. */
  const shadedTable = (s: S) => {
    const p = s.doc.pageIds()[0] ?? "";
    const id = s.doc.apply({ type: "AddTable", page: p, x: 100, y: 100, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const v = s.doc.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    const cell = { row: v.table.rows[0]?.id ?? "", col: v.table.cols[0]?.id ?? "" };
    s.doc.apply({ type: "SetTableShade", id, from: cell, to: cell, shade: "#94a3b8" });
    return { id, cell };
  };
  const shades = (s: S, id: string): number => {
    const v = s.doc.element(id);
    return v?.kind === "table" ? v.table.cells.filter((c) => c.shade !== null).length : -1;
  };

  it("F10, S1 : toucher une cellule ombrée : SetTableShade null sur elle, une étape, sélection inchangée", () => {
    const s = setup();
    const { id, cell } = shadedTable(s);
    gesture(s.tool, [[150, 130]]);
    expect(s.runs).toEqual([{ type: "SetTableShade", id, from: cell, to: cell, shade: null }]);
    expect([shades(s, id), s.tool.selection()]).toEqual([0, []]);
    s.doc.undo();
    expect(shades(s, id)).toBe(1);
  });

  it("F10, HB-24 : glisser de 5 px (< 8) : révélé quand même (seuil propre)", () => {
    const s = setup();
    const { id } = shadedTable(s);
    gesture(s.tool, [[150, 130], [155, 130]]);
    expect(s.runs.map((c) => c.type)).toEqual(["SetTableShade"]);
    expect(shades(s, id)).toBe(0);
  });

  it("F10 : glisser de 9 px : déplacement depuis le point d'appui, rien de révélé", () => {
    const s = setup();
    const { id } = shadedTable(s);
    gesture(s.tool, [[150, 130], [159, 130]]);
    expect(s.runs).toEqual([{ type: "Transform", ids: [id], matrix: [1, 0, 0, 1, 9, 0] }]);
    expect([shades(s, id), s.tool.selection()]).toEqual([1, [id]]);
  });

  it("F10 : Maj tenue, ou cellule non ombrée : sélection comme avant, rien d'écrit", () => {
    const s = setup();
    const { id } = shadedTable(s);
    s.setShift(true);
    gesture(s.tool, [[150, 130]]);
    expect([s.runs, s.tool.selection()]).toEqual([[], [id]]);
    s.setShift(false);
    s.tool.setSelection([]);
    gesture(s.tool, [[400, 130]]);
    expect([s.runs, s.tool.selection()]).toEqual([[], [id]]);
  });

  it("F10 : tableau déjà sélectionné : toucher une cellule ombrée (hors poignée) la révèle, la sélection reste", () => {
    const s = setup();
    const { id } = shadedTable(s);
    gesture(s.tool, [[400, 130]]);
    gesture(s.tool, [[150, 130]]);
    expect(s.runs.map((c) => c.type)).toEqual(["SetTableShade"]);
    expect(s.tool.selection()).toEqual([id]);
  });

  it("C3 : glisser depuis une cellule ombrée d'un tableau groupé déplace le groupe entier", () => {
    const s = setup();
    const { id } = shadedTable(s);
    const r = s.rect(700, 100, 760, 160);
    s.doc.apply({ type: "Group", ids: [id, r] });
    gesture(s.tool, [[150, 130], [190, 130]]);
    expect([...s.tool.selection()].sort()).toEqual([id, r].sort());
    const t = s.runs.at(-1);
    expect(t?.type).toBe("Transform");
    expect(t?.type === "Transform" ? [...t.ids].sort() : []).toEqual([id, r].sort());
  });

  it("F10 : une forme au-dessus de la cellule ombrée : la forme est sélectionnée, rien de révélé", () => {
    const s = setup();
    const { id } = shadedTable(s);
    const r = s.rect(140, 120, 160, 140);
    gesture(s.tool, [[150, 130]]);
    expect([s.tool.selection(), shades(s, id)]).toEqual([[r], 1]);
  });
});

describe("outil Sélection : groupes (Z2)", () => {
  function grouped() {
    const s = setup();
    const a = s.rect(100, 100, 200, 200);
    const b = s.rect(300, 100, 400, 200);
    const c = s.rect(500, 100, 600, 200);
    s.doc.apply({ type: "Group", ids: [a, b] });
    return { ...s, a, b, c };
  }
  it("clic sur un membre : groupe extérieur (sans écriture)", () => {
    const { tool, runs, a, b } = grouped();
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([a, b]);
    expect(runs).toEqual([]);
  });
  it("groupe imbriqué : un clic prend le groupe le plus extérieur", () => {
    const { tool, doc, a, b, c } = grouped();
    doc.apply({ type: "Group", ids: [a, b, c] });
    gesture(tool, [[550, 150]]);
    expect(tool.selection()).toEqual([a, b, c]);
  });
  it("Maj+clic : groupe entier (ajouté puis retiré)", () => {
    const { tool, setShift, a, b, c } = grouped();
    gesture(tool, [[550, 150]]);
    setShift(true);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([c, a, b]);
    gesture(tool, [[350, 150]]);
    expect(tool.selection()).toEqual([c]);
  });
  it("glisser un membre : une Transform sur tous les membres", () => {
    const { tool, runs, a, b } = grouped();
    gesture(tool, [[150, 150], [250, 150]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a, b], matrix: [1, 0, 0, 1, 100, 0] }]);
  });
  it("rectangle : groupe pris seulement entier", () => {
    const { tool, a, b, c } = grouped();
    gesture(tool, [[90, 90], [250, 210]]);
    expect(tool.selection()).toEqual([]);
    gesture(tool, [[90, 90], [610, 210]]);
    expect(tool.selection()).toEqual([a, b, c]);
  });
});

const HIT_A = { id: "A", fixed: [1, 0.3] as const, onOutline: true, anchors: [[50, 0], [100, 25], [50, 50], [0, 25]] as const };
const HIT_B = { id: "B", fixed: [0, 0.5] as const, onOutline: true, anchors: [[450, 0], [500, 25], [450, 50], [400, 25]] as const };
const atT = (x: number, y: number, t: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t });

function setupLines() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  const edits: string[] = [];
  vi.spyOn(doc, "bindTarget").mockImplementation((_p, x) => (x < 150 ? HIT_A : x > 350 ? HIT_B : null));
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      if (cmd.type === "AddLinked") return { pages: [], ids: ["copie", "fleche"], removed: [], full: false, version: 1 };
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
    ctrl: () => false,
    bindingEnabled: () => true,
    pointerType: () => "touch",
    editPoints: (id) => { edits.push(id); },
  };
  const tool = createSelectTool(ctx);
  const add = (shape: "line" | "arrow" | "rect", x0: number, y0: number, x1: number, y1: number): string =>
    doc.apply({ type: "AddShape", page, shape, x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
  return { doc, tool, runs, edits, add };
}

describe("OG12 : poignées d'extrémité, « + » et double toucher (T8)", () => {
  it("ligne seule sélectionnée : sans cadre à 8 poignées, deux bouts et un milieu", () => {
    const { tool, add } = setupLines();
    tool.setSelection([add("line", 0, 0, 200, 0)]);
    const o = tool.live().overlay;
    expect(o?.frame).toBeNull();
    expect(o?.handles).toBe(false);
    expect(o?.points?.filter((p) => p.kind === "point")).toHaveLength(2);
    expect(o?.points?.filter((p) => p.kind === "mid")).toHaveLength(1);
  });

  it("tirer un bout : une SetLinePoints au relâché, liée sous le doigt", () => {
    const { tool, runs, add } = setupLines();
    tool.setSelection([add("line", 0, 0, 200, 0)]);
    tool.begin(1, [atT(200, 0, 0)]);
    tool.extend(1, [atT(402, 25, 10)], []);
    expect(runs.filter((r) => r.type === "SetLinePoints")).toEqual([]);
    expect(tool.live().overlay?.bind?.id).toBe("B");
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "SetLinePoints", id: expect.any(String), points: [0, 0, 402, 25], start: null, end: { id: "B", fx: 0, fy: 0.5 } }]);
  });

  it("tirer le milieu : insère un point", () => {
    const { tool, runs, add } = setupLines();
    tool.setSelection([add("line", 0, 0, 200, 0)]);
    tool.begin(1, [atT(100, 0, 0)]);
    tool.extend(1, [atT(100, 80, 10)], []);
    tool.close(1, "end");
    expect(runs).toMatchObject([{ type: "SetLinePoints", points: [0, 0, 100, 80, 200, 0] }]);
  });

  it("flèche liée : un toucher de moins de 10 px ne la déplace pas", () => {
    const { doc, tool, runs, add } = setupLines();
    const id = add("arrow", 0, 0, 200, 0);
    const real = doc.element.bind(doc);
    vi.spyOn(doc, "element").mockImplementation((i) => {
      const v = real(i);
      return v?.kind === "shape" ? { ...v, shape: { ...v.shape, start: { id: "A", fx: 1, fy: 0.5 } } } : v;
    });
    tool.setSelection([id]);
    tool.begin(1, [atT(60, 0, 0)]);
    tool.extend(1, [atT(68, 0, 10)], []);
    tool.close(1, "end");
    expect(runs).toEqual([]);
    tool.begin(2, [atT(60, 0, 1000)]);
    tool.extend(2, [atT(72, 0, 1010)], []);
    tool.close(2, "end");
    expect(runs).toMatchObject([{ type: "Transform", ids: [id] }]);
  });

  it("poignée « + » : AddLinked, la copie devient la sélection", () => {
    const { tool, runs, add } = setupLines();
    const a = add("rect", 0, 0, 100, 50);
    tool.setSelection([a]);
    expect(tool.live().overlay?.links).toHaveLength(4);
    tool.begin(1, [atT(140, 25, 0)]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "AddLinked", id: a, dir: "right" }]);
    expect(tool.selection()).toEqual(["copie"]);
  });

  it("deux objets sélectionnés : pas de « + »", () => {
    const { tool, add } = setupLines();
    tool.setSelection([add("rect", 0, 0, 100, 50), add("rect", 300, 0, 400, 50)]);
    expect(tool.live().overlay?.links ?? []).toEqual([]);
  });

  it("double toucher sur une ligne : editPoints ; coudée : jamais", () => {
    const { doc, tool, edits, add } = setupLines();
    const id = add("line", 0, 0, 200, 0);
    tool.setSelection([id]);
    tool.begin(1, [atT(60, 0, 0)]);
    tool.close(1, "end");
    tool.begin(2, [atT(70, 0, 200)]);
    tool.close(2, "end");
    expect(edits).toEqual([id]);
    const real = doc.element.bind(doc);
    vi.spyOn(doc, "element").mockImplementation((i) => {
      const v = real(i);
      return v ? { ...v, look: { elbowed: true } } : v;
    });
    tool.begin(3, [atT(60, 0, 2000)]);
    tool.close(3, "end");
    tool.begin(4, [atT(70, 0, 2200)]);
    tool.close(4, "end");
    expect(edits).toEqual([id]);
  });
});
