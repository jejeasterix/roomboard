import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { viewsOf } from "../groups";
import { createCellDrop } from "./cell-drop";
import { createSelectTool } from "./select";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const measure = (s: string, size: number): number => s.length * size * 0.5;
const ASSET = { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 };

function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let alt = false;
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
    alt: () => alt,
  };
  const drop = createCellDrop(ctx, measure);
  const tool = createSelectTool(ctx, drop);
  const table = doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 3, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
  const image = doc.apply({ type: "AddImage", page, asset: ASSET, w: 400, h: 300, matrix: [1, 0, 0, 1, 1000, 1000] }).ids[0] ?? "";
  const t = () => {
    const v = doc.element(table);
    if (v?.kind !== "table") throw new Error("tableau");
    return v.table;
  };
  const move = (from: [number, number], to: [number, number]): void => {
    tool.begin(1, [at(...from)]);
    tool.extend(1, [at(to[0], to[1])], []);
    tool.close(1, "end");
  };
  return { doc, page, tool, drop, runs, table, image, t, move, setAlt: (v: boolean) => { alt = v; } };
}

describe("glisser vers une case (cell-drop, DA3)", () => {
  it("S1 : image 400 × 300 sur la case (1, 1) : PlaceInCell, colonne 416, ligne 316, image dans la boîte intérieure", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type).toBe("PlaceInCell");
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 416, 240]);
    expect(s.t().rows.map((r) => r.height)).toEqual([64, 316, 64]);
    expect(s.doc.bounds([s.image])).toEqual({ x0: 248, y0: 72, x1: 648, y1: 372 });
    expect(s.doc.element(s.image)?.cell).toEqual([s.table, s.t().rows[1]?.id, s.t().cols[1]?.id]);
    s.doc.undo();
    expect(s.t().cols[1]?.width).toBe(240);
  });

  it("S2 : rétrécir : la case garde 240 × 64, l'image est réduite à 64 × 48, posée en haut à gauche", () => {
    const s = setup();
    s.doc.apply({ type: "SetTableOptions", id: s.table, fit: "shrink" });
    s.move([1200, 1150], [360, 96]);
    expect(s.t().cols[1]?.width).toBe(240);
    expect(s.t().rows[1]?.height).toBe(64);
    expect(s.doc.bounds([s.image])).toEqual({ x0: 248, y0: 72, x1: 312, y1: 120 });
  });

  it("Alt : Transform seul (effet de bord, G8 de C9)", () => {
    const s = setup();
    s.setAlt(true);
    s.move([1200, 1150], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("Transform");
    expect(s.doc.element(s.image)?.cell).toBeUndefined();
  });

  it("hors de tout tableau : Transform d'aujourd'hui", () => {
    const s = setup();
    s.move([1200, 1150], [1300, 1150]);
    expect(s.runs.at(-1)).toEqual({ type: "Transform", ids: [s.image], matrix: [1, 0, 0, 1, 100, 0] });
  });

  it("case ombrée : déplacement libre (D35)", () => {
    const s = setup();
    const r = s.t().rows[1]?.id ?? "";
    const c = s.t().cols[1]?.id ?? "";
    s.doc.apply({ type: "SetTableShade", id: s.table, from: { row: r, col: c }, to: { row: r, col: c }, shade: "#94a3b8" });
    s.move([1200, 1150], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("Transform");
  });

  it("sélection avec tableau : drop rend null", () => {
    const s = setup();
    expect(s.drop.drop([s.table, s.image], [1, 0, 0, 1, 10, 0], 360, 96, false)).toBeNull();
  });

  it("S4 : objet lié lâché hors de tout tableau : PlaceInCell sans cell, à la place du relâché", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.move([448, 222], [1448, 222]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type === "PlaceInCell" && cmd.cell === null).toBe(true);
    expect(s.doc.element(s.image)?.cell).toBeUndefined();
    expect(s.doc.bounds([s.image])?.x0).toBe(1248);
  });

  it("D11 : sortir ramène la colonne à 240 et la ligne à 64 (une seule PlaceInCell)", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.move([448, 222], [1448, 222]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type === "PlaceInCell" && cmd.sizes.length).toBe(2);
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 240, 240]);
    expect(s.t().rows.map((r) => r.height)).toEqual([64, 64, 64]);
  });

  it("D11 : objet logé lâché sur une case refusée (ombrée) : PlaceInCell sans case, la case quittée est réduite", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.doc.apply({ type: "SetTableShade", id: s.table, from: { row: s.t().rows[0]?.id ?? "", col: s.t().cols[0]?.id ?? "" }, to: { row: s.t().rows[0]?.id ?? "", col: s.t().cols[0]?.id ?? "" }, shade: "#cccccc" });
    s.move([448, 222], [120, 32]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type === "PlaceInCell" && cmd.cell === null && cmd.sizes.length).toBe(2);
    expect(s.doc.element(s.image)?.cell).toBeUndefined();
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 240, 240]);
  });

  it("D11 : objet logé en A1 puis A1:B1 fusionnée, glissé dans sa zone : Transform, le lien et les tailles restent", () => {
    const s = setup();
    s.move([1200, 1150], [120, 32]);
    const r = s.t().rows.map((x) => x.id);
    const c = s.t().cols.map((x) => x.id);
    s.doc.apply({ type: "MergeTableCells", id: s.table, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[0] ?? "", col: c[1] ?? "" } });
    const link = s.doc.element(s.image)?.cell;
    const widths = s.t().cols.map((x) => x.width);
    s.move([200, 150], [250, 150]);
    expect(s.runs.at(-1)?.type).toBe("Transform");
    expect(s.doc.element(s.image)?.cell).toEqual(link);
    expect(s.t().cols.map((x) => x.width)).toEqual(widths);
  });

  it("D11 : une colonne élargie à la main ne bouge pas", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    const col = s.t().cols[1]?.id ?? "";
    s.doc.apply({ type: "SetTableLineSizes", id: s.table, cols: [[col, 500]], rows: [] });
    s.move([448, 222], [1600, 222]);
    expect(s.t().cols[1]?.width).toBe(500);
  });

  it("D11 : vers une autre case : la quittée revient, la visée grandit, une étape", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.move([448, 222], [120, 400]);
    expect(s.t().cols.map((c) => c.width)).toEqual([416, 240, 240]);
    expect(s.t().rows.map((r) => r.height)).toEqual([64, 64, 316]);
    expect(s.doc.bounds([s.image])).toEqual({ x0: 8, y0: 136, x1: 408, y1: 436 });
    s.doc.undo();
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 416, 240]);
  });

  it("D11 : aucune taille citée deux fois dans une PlaceInCell", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.move([448, 222], [120, 400]);
    s.move([1200, 1150], [1300, 1150]);
    s.move([1300, 1150], [120, 400]);
    for (const c of s.runs) {
      if (c.type !== "PlaceInCell") continue;
      const keys = c.sizes.map((z) => `${z[1]}:${z[2]}`);
      expect(new Set(keys).size, JSON.stringify(c.sizes)).toBe(keys.length);
    }
  });

  it("Alt+Entrée : place loge la sélection dans la case sous son centre ; Alt+Maj+Entrée la sort", () => {
    const s = setup();
    s.doc.apply({ type: "Transform", ids: [s.image], matrix: [1, 0, 0, 1, -800, -1100] }); // centre en (400, 50) : case (0, 1)
    expect(s.drop.place([s.image], false)?.type).toBe("PlaceInCell");
    s.tool.setSelection([s.image]);
    expect(s.tool.placeInCell?.(false)).toBe(true);
    expect(s.doc.element(s.image)?.cell?.[2]).toBe(s.t().cols[1]?.id);
    expect(s.tool.placeInCell?.(true)).toBe(true);
    expect(s.doc.element(s.image)?.cell).toBeUndefined();
  });

  it("expand (D6) : un tableau sélectionné prend ses objets liés", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    expect(s.drop.expand([s.table], viewsOf(s.doc, s.doc.elementIds(s.page))).sort()).toEqual([s.table, s.image].sort());
  });

  it("D28 : aucun element() pendant le glisser (tableaux et vues lus au begin)", () => {
    const base = fakeCore.blank();
    const page = base.pageIds()[0] ?? "";
    let calls = 0;
    const doc = new Proxy(base, {
      get(target, key) {
        if (key === "element") return (id: string) => { calls++; return target.element(id); };
        const v = Reflect.get(target, key) as unknown;
        return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    });
    const ctx: ToolContext = { doc, page: () => page, camera: () => ({ zoom: 1, tx: 0, ty: 0 }), run: (cmd) => doc.apply(cmd) };
    const tool = createSelectTool(ctx, createCellDrop(ctx, measure));
    doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 3, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    doc.apply({ type: "AddImage", page, asset: ASSET, w: 400, h: 300, matrix: [1, 0, 0, 1, 1000, 1000] });
    tool.begin(1, [at(1200, 1150)]);
    tool.extend(1, [at(1100, 1000)], []);
    tool.live();
    const before = calls;
    for (let i = 0; i < 10; i++) {
      tool.extend(1, [at(1000 - i * 60, 900 - i * 80)], []);
      tool.live();
    }
    expect(calls).toBe(before);
    tool.close(1, "cancel");
  });

  it("target : cadre monde de la case visée pendant le glisser, null hors tableau", () => {
    const s = setup();
    expect(s.drop.target([s.image], 360, 96)).toEqual({ x0: 240, y0: 64, x1: 480, y1: 128 });
    expect(s.drop.target([s.image], 1500, 1500)).toBeNull();
    s.tool.begin(1, [at(1200, 1150)]);
    s.tool.extend(1, [at(360, 96)], []);
    expect(s.tool.live().overlay?.target).toEqual({ x0: 240, y0: 64, x1: 480, y1: 128 });
    s.tool.close(1, "cancel");
  });
});

describe("glisser vers une case — S14 tableau de tri (DS5)", () => {
  /** Colonne 1 acceptant « chat, chien » ; `text` pose une étiquette de 200 × 45 en (x, y). */
  const sorting = () => {
    const s = setup();
    const t = s.t();
    const c1 = { row: t.rows[0]?.id ?? "", col: t.cols[1]?.id ?? "" };
    s.doc.apply({ type: "SetTableLook", id: s.table, from: c1, to: c1, look: { key: "accept", value: ["chat", "chien"] } });
    const text = (content: string, x: number, y: number): string =>
      s.doc.apply({ type: "SetText", page: s.page, id: null, x, y, content, color: "#000000", size: 36, boxWidth: 200, boxHeight: 45 }).ids[0] ?? "";
    return { ...s, text };
  };
  it("S14 : « chat » lâché sur (1, 1) : PlaceInCell, logé ; « Chat » (casse) sur (2, 1) aussi", () => {
    const s = sorting();
    const a = s.text("chat", 1500, 200);
    s.move([1520, 220], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("PlaceInCell");
    expect(s.doc.element(a)?.cell?.[2]).toBe(s.t().cols[1]?.id);
    s.text("Chat", 1500, 400);
    s.move([1520, 420], [360, 160]);
    expect(s.runs.at(-1)?.type).toBe("PlaceInCell");
  });
  it("C4 : étiquette d'un clic (boîte 600) logée : la colonne prend la largeur du texte mis en lignes + marges, pas la boîte", () => {
    const s = setup();
    const a = s.doc.apply({ type: "SetText", page: s.page, id: null, x: 1500, y: 200, content: "chat", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    s.move([1520, 220], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("PlaceInCell");
    expect(s.doc.element(a)?.cell?.[2]).toBe(s.t().cols[1]?.id);
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 240, 240]);
    // 16 caractères × 18 = 288 ; colonne 288 + 2 × 8.
    s.doc.apply({ type: "SetText", page: s.page, id: null, x: 1500, y: 400, content: "rhinocéros blanc", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    s.move([1520, 420], [360, 160]);
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 304, 240]);
  });
  it("OG79 : étiquette d'un clic (boîte 600) logée en (0, 1) : un toucher sur le cache voisin (0, 2) l'ouvre", () => {
    const s = setup();
    const t0 = s.t();
    const c2 = { row: t0.rows[0]?.id ?? "", col: t0.cols[2]?.id ?? "" };
    s.doc.apply({ type: "SetTableShade", id: s.table, from: c2, to: c2, shade: "#94a3b8" });
    const a = s.doc.apply({ type: "SetText", page: s.page, id: null, x: 1500, y: 200, content: "chat", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    s.move([1520, 220], [360, 32]);
    expect(s.doc.element(a)?.cell?.[2]).toBe(t0.cols[1]?.id);
    s.tool.setSelection([]);
    s.move([600, 30], [600, 30]);
    expect(s.runs.at(-1)).toEqual({ type: "SetTableLook", id: s.table, from: c2, to: c2, look: { key: "open", value: true } });
    expect(s.tool.selection()).toEqual([]);
  });
  it("OG79 : la pose réduit la boîte du texte à sa largeur mise en lignes, dans la même PlaceInCell ; un undo rend 600", () => {
    const s = setup();
    const a = s.doc.apply({ type: "SetText", page: s.page, id: null, x: 1500, y: 200, content: "chat", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    const width = (): number | undefined => {
      const v = s.doc.element(a);
      return v?.kind === "text" ? v.text.boxWidth : undefined;
    };
    s.move([1520, 220], [360, 96]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type).toBe("PlaceInCell");
    // « chat » : 4 × 18 = 72 ; la boîte ne garde que la ligne (arrondie au-dessus).
    expect(cmd?.type === "PlaceInCell" ? cmd.boxWidth : null).toBe(72);
    expect(width()).toBe(72);
    expect(s.doc.bounds([a])).toEqual({ x0: 248, y0: 72, x1: 248 + 72, y1: 72 + 45 });
    s.doc.undo();
    expect(width()).toBe(600);
    expect(s.doc.element(a)?.cell).toBeUndefined();
  });
  it("OG79 : texte déjà plus étroit que sa ligne, ou image : aucune boîte écrite", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type === "PlaceInCell" ? cmd.boxWidth : "autre").toBeUndefined();
  });
  it("C4 : l'étiquette large sortie de sa case : la colonne revient à 240 (D11 mesure aussi le texte)", () => {
    const s = setup();
    const a = s.doc.apply({ type: "SetText", page: s.page, id: null, x: 1500, y: 200, content: "rhinocéros blanc", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    s.move([1520, 220], [360, 96]);
    expect(s.t().cols[1]?.width).toBe(304);
    s.move([400, 95], [1500, 1600]);
    expect(s.doc.element(a)?.cell).toBeUndefined();
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 240, 240]);
  });
  it("S14 : truite refusée : aucune commande, aucune étape, l'objet reste à sa place ; aucun cadre de case visée", () => {
    const s = sorting();
    const a = s.text("truite", 1500, 200);
    const before = s.doc.bounds([a]);
    const v = s.doc.version();
    const n = s.runs.length;
    s.tool.begin(1, [at(1520, 220)]);
    s.tool.extend(1, [at(360, 96)], []);
    expect(s.tool.live().overlay?.target ?? null).toBeNull();
    s.tool.close(1, "end");
    expect(s.runs.length).toBe(n);
    expect(s.doc.version()).toBe(v);
    expect(s.doc.bounds([a])).toEqual(before);
  });
  it("S14 : une image (pas un texte) lâchée sur la colonne à liste : refusée, aucune commande", () => {
    const s = sorting();
    const n = s.runs.length;
    s.move([1200, 1150], [360, 96]);
    expect(s.runs.length).toBe(n);
  });
  it("S14 : colonne sans liste : l'image loge comme avant", () => {
    const s = sorting();
    s.move([1200, 1150], [600, 96]);
    expect(s.runs.at(-1)?.type).toBe("PlaceInCell");
  });
  it("S14 : Alt tenue : « truite » refusée quand même (aucune commande) ; « chat » se déplace librement (Transform)", () => {
    const s = sorting();
    s.text("truite", 1500, 200);
    s.setAlt(true);
    const n = s.runs.length;
    s.move([1520, 220], [360, 96]);
    expect(s.runs.length).toBe(n);
    s.text("chat", 1500, 400);
    s.move([1520, 420], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("Transform");
  });
  it("S14 : Alt+Entrée (place) : « truite » au-dessus de (1, 1) : null ; « chat » : PlaceInCell", () => {
    const s = sorting();
    const bad = s.text("truite", 260, 74);
    expect(s.drop.place([bad], false)).toBeNull();
    const good = s.text("chat", 260, 74);
    expect(s.drop.place([good], false)?.type).toBe("PlaceInCell");
  });
});

