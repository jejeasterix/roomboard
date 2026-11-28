import { describe, expect, it, vi } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { createSelectTool } from "./select";
import { moveHandlePoint, rotateHandlePoint } from "./handles";
import type { SelectionTool, ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });

function setup(zoom = 1, flagged: ReadonlySet<string> = new Set<string>()) {
  const base = fakeCore.blank();
  // `flagged` : ids dont la vue porte `dragCopy` (injecté ici sans passer par SetStyle).
  const doc = new Proxy(base, {
    get(t, k) {
      if (k === "element") return (id: string) => { const e = t.element(id); return e !== null && flagged.has(id) ? { ...e, look: { ...e.look, dragCopy: true } } : e; };
      const v = Reflect.get(t, k) as unknown;
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
  });
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
    duplicate: (ids, dx, dy, strip) => {
      const fragment = doc.extract(page, ids);
      try {
        if (strip) fragment.apply({ type: "SetStyle", ids: fragment.elementIds(fragment.pageIds()[0] ?? ""), patch: { dragCopy: false } });
        const change = doc.insertFragment(fragment, page, dx, dy);
        runs.push({ type: "SetStyle", ids: change.ids, patch: {} });
        return change.ids.length > 0;
      } finally {
        fragment.free();
      }
    },
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

  it("sans cellDrop : un objet lâché sur un tableau est posé par-dessus (Transform)", () => {
    const { doc, tool, runs, rect } = setup();
    const page = doc.pageIds()[0] ?? "";
    doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 3, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    rect(1000, 1000, 1100, 1100);
    gesture(tool, [[1050, 1050], [360, 96]]);
    expect(runs.at(-1)?.type).toBe("Transform");
  });
});

describe("outil Sélection : Glisser une copie (OG23, T11)", () => {
  const copyRect = () => {
    const t = setup();
    const a = t.rect(100, 100, 200, 200);
    t.doc.apply({ type: "SetStyle", ids: [a], patch: { dragCopy: true } });
    return { ...t, a };
  };

  it("dragCopy : l'original reste, une copie", () => {
    const { doc, tool, a } = copyRect();
    const page = doc.pageIds()[0] ?? "";
    tool.begin(1, [at(150, 150)]);
    tool.extend(1, [at(350, 150)], []);
    expect(tool.live().hidden.size).toBe(0);
    expect(tool.live().overlay?.ghosts.length).toBe(1);
    tool.close(1, "end");
    expect(doc.elementIds(page)).toHaveLength(2);
    expect(doc.element(a)?.transform?.[4]).toBe(100);
    const copy = doc.elementIds(page).find((id) => id !== a) ?? "";
    expect(doc.element(copy)?.transform?.[4]).toBe(300);
    expect(doc.element(copy)?.look?.dragCopy).toBeUndefined();
  });

  it("dragCopy : un clic ne copie rien", () => {
    const { doc, tool, runs } = copyRect();
    gesture(tool, [[150, 150], [151, 150]]);
    expect(runs).toEqual([]);
    expect(doc.elementIds(doc.pageIds()[0] ?? "")).toHaveLength(1);
  });

  it("poignée Déplacer : l'original bouge", () => {
    const { doc, tool, runs, a } = copyRect();
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([a]);
    const frame = doc.bounds([a]);
    expect(frame).not.toBeNull();
    const [hx, hy] = moveHandlePoint(frame!, 1);
    runs.length = 0;
    gesture(tool, [[hx, hy], [hx + 100, hy]]);
    expect(runs.map((r) => r.type)).toEqual(["Transform"]);
    expect(doc.elementIds(doc.pageIds()[0] ?? "")).toHaveLength(1);
    expect(doc.element(a)?.transform?.[4]).toBe(200);
    expect(doc.element(a)?.look?.dragCopy).toBe(true);
  });

  it("poignée haute de taille prioritaire sur la poignée Déplacer au doigt (T18)", () => {
    const { doc, tool, runs, a } = copyRect();
    gesture(tool, [[200, 200]]);
    const frame = doc.bounds([a])!;
    const cx = (frame.x0 + frame.x1) / 2;
    runs.length = 0;
    // 8 px au-dessus du bord haut : dans la portée de la poignée n (12) et dans la zone Déplacer (6 à 50)
    gesture(tool, [[cx, frame.y0 - 8], [cx, frame.y0 - 28]]);
    const t = runs.find((r) => r.type === "Transform") as { matrix: number[] } | undefined;
    expect(t).toBeDefined();
    expect(t!.matrix[0]).toBe(1);
    expect(t!.matrix[3]).not.toBe(1);
  });

  it("poignée Déplacer : saisie hors de la portée de la poignée n (au-dessus de 12 px)", () => {
    const { doc, tool, runs, a } = copyRect();
    gesture(tool, [[200, 200]]);
    const frame = doc.bounds([a])!;
    const cx = (frame.x0 + frame.x1) / 2;
    runs.length = 0;
    gesture(tool, [[cx, frame.y0 - 30], [cx + 40, frame.y0 - 30]]);
    const t = runs.find((r) => r.type === "Transform") as { matrix: number[] } | undefined;
    expect(t?.matrix).toEqual([1, 0, 0, 1, 40, 0]);
  });
});

describe("outil Sélection : Glisser une copie pour tout genre d'objet (OG23, T18)", () => {
  const A1 = { id: "a".repeat(64), mime: "image/png", size: 1 };
  const kinds: [string, (d: ReturnType<typeof setup>["doc"]) => string][] = [
    ["tableau", (d) => d.apply({ type: "AddTable", page: d.pageIds()[0] ?? "", x: 100, y: 100, cols: 2, rows: 2, colWidth: 100, rowHeight: 50, color: "#000000", size: 16 }).ids[0] ?? ""],
    ["média", (d) => d.apply({ type: "AddMedia", page: d.pageIds()[0] ?? "", asset: A1 as never, linked: null, mediaType: "video", w: 200, h: 100, duration: 1, poster: null, matrix: [1, 0, 0, 1, 100, 100] }).ids[0] ?? ""],
    ["objet 3D", (d) => d.apply({ type: "AddModel3d", page: d.pageIds()[0] ?? "", asset: A1 as never, format: "glb", files: [], w: 200, h: 100, yaw: 0, pitch: 0, snapshot: null, matrix: [1, 0, 0, 1, 100, 100] } as never).ids[0] ?? ""],
  ];
  for (const [name, add] of kinds) {
    it(`${name} : glisser fait une copie, l'original reste`, () => {
      const flagged = new Set<string>();
      const t = setup(1, flagged);
      const id = add(t.doc);
      expect(id).not.toBe("");
      flagged.add(id);
      const b = t.doc.bounds([id])!;
      const [px, py] = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
      const before = t.doc.element(id)?.transform?.[4];
      gesture(t.tool, [[px, py], [px + 150, py]]);
      expect(t.doc.elementIds(t.doc.pageIds()[0] ?? "")).toHaveLength(2);
      expect(t.doc.element(id)?.transform?.[4]).toBe(before);
    });
  }
});

const HIT_A = { id: "A", fixed: [1, 0.3] as const, onOutline: true, anchors: [[50, 0], [100, 25], [50, 50], [0, 25]] as const };
const HIT_B = { id: "B", fixed: [0, 0.5] as const, onOutline: true, anchors: [[450, 0], [500, 25], [450, 50], [400, 25]] as const };
const atT = (x: number, y: number, t: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t });

function setupLines(pointer: "touch" | "mouse" = "touch") {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  const edits: string[] = [];
  const texts: string[] = [];
  let copie = "";
  vi.spyOn(doc, "bindTarget").mockImplementation((_p, x) => (x < 150 ? HIT_A : x > 350 ? HIT_B : null));
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      if (cmd.type === "AddLinked") {
        // Un segment d'abord, puis la copie : l'aide lit le document, pas l'ordre des ids.
        const fleche = doc.apply({ type: "AddShape", page, shape: "arrow", x0: 0, y0: 0, x1: 10, y1: 0, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
        copie = doc.apply({ type: "AddShape", page, shape: "rect", x0: 200, y0: 0, x1: 300, y1: 50, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
        return { pages: [], ids: [fleche, copie], removed: [], full: false, version: 1 };
      }
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
    ctrl: () => false,
    bindingEnabled: () => true,
    pointerType: () => pointer,
    editPoints: (id) => { edits.push(id); },
    editText: (id) => { texts.push(id); },
  };
  const tool = createSelectTool(ctx);
  const add = (shape: "line" | "arrow" | "rect" | "diamond" | "ellipse", x0: number, y0: number, x1: number, y1: number): string =>
    doc.apply({ type: "AddShape", page, shape, x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
  return { doc, tool, runs, edits, texts, add, copie: () => copie };
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
    const { tool, runs, add, copie: getCopie } = setupLines();
    const a = add("rect", 0, 0, 100, 50);
    tool.setSelection([a]);
    expect(tool.live().overlay?.links).toHaveLength(4);
    tool.begin(1, [atT(140, 25, 0)]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "AddLinked", id: a, dir: "right" }]);
    expect(tool.selection()).toEqual([getCopie()]);
  });

  it("fusion OG12 × OG23 : objet « Glisser une copie » : pas de « + » du haut (poignée Déplacer), les trois autres restent", () => {
    const { doc, tool, add } = setupLines();
    const a = add("rect", 0, 0, 100, 50);
    doc.apply({ type: "SetStyle", ids: [a], patch: { dragCopy: true } });
    tool.setSelection([a]);
    const o = tool.live().overlay;
    expect(o?.move).toBe(true);
    expect(o?.links?.map((l) => l.dir)).toEqual(["right", "down", "left"]);
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

describe("OG12 lot 2a : double toucher sur une forme", () => {
  it("double toucher sur un rectangle, un losange, une ellipse : aucune conversion (C4b)", () => {
    for (const shape of ["rect", "diamond", "ellipse"] as const) {
      const { tool, edits, runs, add } = setupLines();
      const id = add(shape, 0, 0, 200, 100);
      tool.setSelection([id]);
      tool.begin(1, [atT(100, 50, 0)]);
      tool.close(1, "end");
      tool.begin(2, [atT(105, 50, 200)]);
      tool.close(2, "end");
      expect(edits, shape).toEqual([]);
      expect(runs.some((r) => r.type === "ShapeToPolygon"), shape).toBe(false);
    }
  });
  it("double toucher sur une forme : son texte (OG33, choix 9)", () => {
    for (const shape of ["rect", "diamond", "ellipse"] as const) {
      const { tool, texts, edits, runs, add } = setupLines();
      const id = add(shape, 0, 0, 200, 100);
      tool.setSelection([id]);
      tool.begin(1, [atT(100, 50, 0)]);
      tool.close(1, "end");
      tool.begin(2, [atT(105, 50, 200)]);
      tool.close(2, "end");
      expect(texts, shape).toEqual([id]);
      expect(edits, shape).toEqual([]);
      expect(runs.some((r) => r.type === "ShapeToPolygon"), shape).toBe(false);
    }
  });
  it("double toucher : un appui après Échap n'ouvre pas le texte", () => {
    const { tool, texts, add } = setupLines();
    const id = add("rect", 0, 0, 200, 100);
    tool.setSelection([id]);
    tool.begin(1, [atT(100, 50, 0)]);
    tool.close(1, "end");
    tool.setSelection([]); // Échap
    tool.begin(2, [atT(105, 50, 200)]);
    tool.close(2, "end");
    expect(texts).toEqual([]);
    expect(tool.selection()).toEqual([id]);
  });
  it("double toucher sur une ligne fermée déjà convertie : editPoints (C4b)", () => {
    const { doc, tool, edits, add } = setupLines();
    const id = add("rect", 0, 0, 200, 100);
    doc.apply({ type: "ShapeToPolygon", id });
    tool.setSelection([id]);
    tool.begin(1, [atT(50, 0, 0)]);
    tool.close(1, "end");
    tool.begin(2, [atT(52, 0, 200)]);
    tool.close(2, "end");
    expect(edits).toEqual([id]);
  });
  it("ligne fermée sélectionnée seule : cadre ordinaire, aucune poignée de sommet, déplacement (C4b)", () => {
    const { doc, tool, runs, add } = setupLines();
    const id = add("rect", 0, 0, 200, 100);
    doc.apply({ type: "ShapeToPolygon", id });
    tool.setSelection([id]);
    expect(tool.live().overlay).toMatchObject({ handles: true });
    // Appui sur le premier sommet : déplacement de la forme entière (pas une poignée de sommet).
    tool.begin(1, [atT(0, 0, 0)]);
    tool.extend(1, [atT(30, 20, 50)], []);
    tool.close(1, "end");
    expect(runs.map((r) => r.type)).toEqual(["Transform"]);
  });
});

describe("OG12 C2 : double toucher sur une poignée de la ligne sélectionnée", () => {
  for (const pointer of ["touch", "mouse"] as const) {
    for (const [nom, x] of [["milieu", 100], ["près d'un bout", 196]] as const) {
      it(`${pointer} : double appui sur la poignée du ${nom} : editPoints`, () => {
        const { tool, edits, runs, add } = setupLines(pointer);
        const id = add("line", 0, 0, 200, 0);
        tool.setSelection([id]);
        tool.begin(1, [atT(x, 0, 0)]);
        tool.close(1, "end");
        tool.begin(2, [atT(x, 0, 100)]);
        tool.close(2, "end");
        expect(edits).toEqual([id]);
        expect(runs).toEqual([]);
      });
    }
  }
});

describe("OG33 lot 2b : poignée de rotation", () => {
  const turned = (cx: number, cy: number, [x, y]: [number, number], deg: number): [number, number] => {
    const r = (deg * Math.PI) / 180;
    return [cx + (x - cx) * Math.cos(r) - (y - cy) * Math.sin(r), cy + (x - cx) * Math.sin(r) + (y - cy) * Math.cos(r)];
  };
  const centre = (f: { x0: number; y0: number; x1: number; y1: number }): [number, number] => [(f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2];
  it("poignée de rotation : glisser d'un quart de tour écrit une Rotate de 90°", () => {
    const { tool, runs, rect, doc } = setup();
    const a = rect(100, 100, 200, 200);
    tool.setSelection([a]);
    expect(tool.live().overlay).toMatchObject({ rotate: true });
    const f = doc.bounds([a])!;
    const h = rotateHandlePoint(f, 1);
    const c = centre(f);
    gesture(tool, [h, turned(c[0], c[1], h, 45), turned(c[0], c[1], h, 90)]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "Rotate", ids: [a] });
    expect((runs[0] as { angle: number }).angle).toBeCloseTo(90, 6);
  });
  it("poignée de rotation : Maj tenue, 37° demandés, 30° écrits", () => {
    const { tool, runs, rect, doc, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    tool.setSelection([a]);
    const f = doc.bounds([a])!;
    const h = rotateHandlePoint(f, 1);
    const c = centre(f);
    setShift(true);
    gesture(tool, [h, turned(c[0], c[1], h, 37)]);
    expect((runs[0] as { angle: number }).angle).toBeCloseTo(30, 6);
  });
  it("poignée de rotation : objet tourné de 30° : aucune poignée de taille", () => {
    const { tool, rect, doc } = setup();
    const a = rect(100, 100, 200, 200);
    doc.apply({ type: "Rotate", ids: [a], angle: 30 });
    tool.setSelection([a]);
    expect(tool.live().overlay).toMatchObject({ handles: true, noResize: true, rotate: true });
  });
  it("poignée de rotation : texte seul : aucune poignée ; appui sans glisser : rien d'écrit", () => {
    const { tool, runs, rect, doc } = setup();
    const page = doc.pageIds()[0]!;
    const t = doc.apply({ type: "SetText", page, id: null, x: 0, y: 0, content: "a", color: "#000000", size: 20, boxWidth: 100, boxHeight: 30 }).ids[0]!;
    tool.setSelection([t]);
    expect(tool.live().overlay?.rotate).toBeUndefined();
    const a = rect(100, 100, 200, 200);
    tool.setSelection([a]);
    gesture(tool, [rotateHandlePoint(doc.bounds([a])!, 1)]);
    expect(runs).toEqual([]);
  });
  // Discriminant (patron interdit : une matrice unique posée sur tous les fantômes) : l'aperçu suit `planRotate`, un
  // fantôme par membre ; le texte glisse sans tourner, et chaque fantôme vaut la transformation écrite au relâché.
  it("poignée de rotation : texte et forme : le texte glisse sans tourner, l'aperçu est l'écrit", () => {
    const { tool, runs, rect, doc } = setup();
    const page = doc.pageIds()[0]!;
    const t = doc.apply({ type: "SetText", page, id: null, x: 0, y: 0, content: "a", color: "#000000", size: 20, boxWidth: 100, boxHeight: 30 }).ids[0]!;
    const a = rect(100, 100, 200, 200);
    tool.setSelection([t, a]);
    const before = new Map([t, a].map((id) => [id, doc.element(id)!.transform] as const));
    const f = doc.bounds([t, a])!;
    const h = rotateHandlePoint(f, 1);
    const c = centre(f);
    tool.begin(1, [at(h[0], h[1])]);
    const end = turned(c[0], c[1], h, 90);
    tool.extend(1, [at(end[0], end[1])], []);
    const ghosts = tool.live().overlay?.ghosts ?? [];
    const of = (id: string) => ghosts.find((g) => g.id === id)?.matrix;
    const mt = of(t)!;
    const ma = of(a)!;
    expect(mt).toBeDefined();
    expect(ma).toBeDefined();
    // Texte : partie linéaire identité, centre déplacé (translation non nulle).
    expect([mt[0], mt[1], mt[2], mt[3]]).toEqual([1, 0, 0, 1]);
    expect(Math.hypot(mt[4], mt[5])).toBeGreaterThan(1);
    // Forme : environ un quart de tour horaire (doigt tourné autour du centre du cadre, pivot du cœur sans le trait).
    expect(ma[1]).toBeGreaterThan(0.99);
    tool.close(1, "end");
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "Rotate", ids: [t, a] });
    // Écrit = fantôme ∘ transformation d'avant (le fantôme se pose sur l'élément peint).
    for (const [id, g] of [[t, mt], [a, ma]] as const) {
      const o = before.get(id)!;
      const want = [
        g[0] * o[0] + g[2] * o[1], g[1] * o[0] + g[3] * o[1],
        g[0] * o[2] + g[2] * o[3], g[1] * o[2] + g[3] * o[3],
        g[0] * o[4] + g[2] * o[5] + g[4], g[1] * o[4] + g[3] * o[5] + g[5],
      ];
      const w = doc.element(id)!.transform;
      for (let i = 0; i < 6; i += 1) expect(w[i]).toBeCloseTo(want[i]!, 6);
    }
  });
  // Second patron interdit (D28) : aucune lecture `element()` par image pendant le glisser ; membres lus au `begin`.
  it("poignée de rotation : pendant le glisser, aucun element() par image", () => {
    const { tool, rect, doc } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(300, 100, 400, 200);
    tool.setSelection([a, b]);
    tool.live();
    const f = doc.bounds([a, b])!;
    const h = rotateHandlePoint(f, 1);
    const c = centre(f);
    tool.begin(1, [at(h[0], h[1])]);
    const step = (deg: number): void => {
      const p = turned(c[0], c[1], h, deg);
      tool.extend(1, [at(p[0], p[1])], []);
    };
    step(10);
    tool.live();
    const spy = vi.spyOn(doc, "element");
    for (const deg of [20, 30, 40]) {
      step(deg);
      expect(tool.live().overlay?.ghosts).toHaveLength(2);
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    tool.close(1, "cancel");
  });
});
