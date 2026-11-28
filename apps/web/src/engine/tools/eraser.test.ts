import { describe, expect, it } from "vitest";
import type { Change, Command, CoreDocument, StrokeStyle } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { IDENTITY, type Camera } from "../camera";
import type { InputSample } from "../input/sampler";
import { createEraserTool, ERASER_BOUNDS_PER_FRAME, ERASER_PROBES_PER_FRAME, ERASER_RADIUS_PX } from "./eraser";
import type { ToolContext } from "./tool";

const s = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const PEN: StrokeStyle = { color: "#000000", width: 4 };
const ASSET = { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 };
/** `step` : pas des points ; le faux `hitTest` mesure un trait par ses seuls points (portée tol + demi-largeur,
 *  fake-core.ts:918-929) : un trait que la gomme doit voir sous son centre a un pas ≤ 2. */
const hline = (y: number, x0 = 100, x1 = 500, step = 10): Float32Array => {
  const a: number[] = [];
  for (let x = x0; x <= x1; x += step) a.push(x, y, 0.5);
  return new Float32Array(a);
};
const vline = (x: number, y0: number, y1: number): Float32Array => {
  const a: number[] = [];
  for (let y = y0; y <= y1; y += 10) a.push(x, y, 0.5);
  return new Float32Array(a);
};

function setup(cam: Camera = IDENTITY, withRunAll = true) {
  const doc: CoreDocument = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const alls: Command[][] = [];
  const hits = { n: 0 };
  const original = doc.hitTest.bind(doc);
  doc.hitTest = (p: string, x: number, y: number, tol: number): string | null => {
    hits.n++;
    return original(p, x, y, tol);
  };
  const runAll = (cmds: readonly Command[]): Change | null => {
    alls.push([...cmds]);
    let last: Change | null = null;
    for (const c of cmds) last = doc.apply(c);
    return last;
  };
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => cam,
    run: (c) => doc.apply(c),
    ...(withRunAll ? { runAll } : {}),
  };
  const add = (c: Command): string => doc.apply(c).ids[0] ?? "";
  const stroke = (pts: Float32Array): string => add({ type: "CommitStroke", page, points: pts, style: PEN });
  const rect = (x0: number, y0: number, x1: number, y1: number, fill: string | null): string =>
    add({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: PEN, fill });
  const image = (x: number, y: number, w = 100, h = 100): string => add({ type: "AddImage", page, asset: ASSET, w, h, matrix: [1, 0, 0, 1, x, y] });
  return { doc, page, alls, hits, ctx, stroke, rect, image, add, tool: () => createEraserTool(ctx) };
}

/** Un geste de bout en bout : appui, points, `frames` images, relâché « end ». */
function sweep(tool: ReturnType<typeof createEraserTool>, pts: readonly [number, number][], frames = 64, id = 1): void {
  tool.begin(id, [s(pts[0]![0], pts[0]![1])]);
  tool.extend(id, pts.slice(1).map(([x, y]) => s(x, y)), []);
  for (let i = 0; i < frames; i++) tool.frame();
  tool.close(id, "end");
}
const deleted = (alls: Command[][]): string[] => alls.flatMap((cs) => cs.flatMap((c) => (c.type === "Delete" ? [...c.ids] : [])));

describe("createEraserTool (OG41 : une seule gomme, D2-D8)", () => {
  it("trait touché : coupé, jamais entier (D2, effet de bord 1)", () => {
    const t = setup();
    t.stroke(hline(100));
    const tool = t.tool();
    sweep(tool, [[300, 80], [300, 100], [300, 120]]);
    expect(t.alls).toHaveLength(1);
    expect(t.alls[0]).toEqual([{ type: "Erase", page: t.page, path: new Float32Array([300, 80, 300, 100, 300, 120]), radius: ERASER_RADIUS_PX, mode: "partial" }]);
    // La coupe en morceaux est celle du vrai cœur (le faux retire le trait entier, fake-core.ts:4-7) : prouvée par
    // s2-navigateur.mjs et gomme-objets-navigateur.mjs (VM) ; ici, la commande écrite (Erase partiel, chemin, aucun Delete).
  });

  it("objets entiers : forme, image, texte, flèche effacés, trait coupé, une seule écriture (S2, D5)", () => {
    const t = setup();
    const r = t.rect(100, 100, 200, 200, "#facc15");
    const img = t.image(300, 100);
    const txt = t.add({ type: "SetText", page: t.page, id: null, x: 500, y: 100, content: "Bonjour", color: "#000000", size: 36, boxWidth: 200, boxHeight: 45 });
    const arrow = t.add({ type: "AddShape", page: t.page, shape: "arrow", x0: 800, y0: 120, x1: 900, y1: 120, style: PEN, fill: null });
    t.stroke(vline(980, 50, 200));
    const tool = t.tool();
    tool.begin(1, [s(50, 120)]);
    tool.extend(1, [s(1000, 120)], []);
    for (let i = 0; i < 64; i++) tool.frame();
    expect([...tool.live().hidden].sort()).toEqual([r, img, txt, arrow].sort());
    expect(t.alls).toEqual([]);
    tool.close(1, "end");
    expect(t.alls).toHaveLength(1);
    expect(t.alls[0]![0]?.type).toBe("Erase");
    expect(t.alls[0]![0]).toMatchObject({ type: "Erase", mode: "partial", path: new Float32Array([50, 120, 1000, 120]) });
    expect(t.alls[0]![1]).toEqual({ type: "Delete", ids: expect.arrayContaining([r, img, txt, arrow]) });
    expect(deleted(t.alls)).toHaveLength(4);
  });

  it("contre-épreuve : un trait posé sur une image, gommé le long du trait : l'image reste (D3)", () => {
    const t = setup();
    const img = t.image(100, 100, 200, 100);
    t.stroke(hline(150, 120, 280, 2));
    sweep(t.tool(), [[150, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.doc.element(img)?.kind).toBe("image");
  });

  it("tolérance 0 d'abord : un trait posé à 8 px du chemin ne cache pas l'image balayée (D3)", () => {
    const t = setup();
    const img = t.image(100, 100);
    // Au-dessus de l'image, à 8 px de chaque échantillon : sous un seul hitTest au rayon (12), c'est lui le premier plan.
    t.stroke(hline(158, 0, 300, 2));
    sweep(t.tool(), [[50, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([img]);
  });

  it("un objet posé dans un cadre vide est atteint comme ailleurs : repli au rayon depuis l'intérieur (D3, D31)", () => {
    const t = setup();
    const frame = t.rect(0, 0, 400, 400, null);
    const img = t.image(150, 150);
    // À 8 px au-dessus de l'image, dans l'intérieur du cadre, loin de son trait.
    sweep(t.tool(), [[160, 142], [240, 142]]);
    expect(deleted(t.alls)).toEqual([img]);
    expect(t.doc.element(frame)).not.toBeNull();
  });

  it("un plan par geste : deux images superposées, seule celle du dessus part ; un second passage efface l'autre (D32)", () => {
    const t = setup();
    const below = t.image(100, 100);
    const above = t.image(100, 100);
    const tool = t.tool();
    sweep(tool, [[50, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([above]);
    sweep(tool, [[50, 150], [250, 150]], 64, 2);
    expect(deleted(t.alls)).toEqual([above, below]);
  });

  it("forme vide : trait seulement ; son intérieur ne compte pas, son bord oui (D31)", () => {
    const t = setup();
    const r = t.rect(100, 100, 300, 300, null);
    const tool = t.tool();
    sweep(tool, [[150, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([]);
    sweep(tool, [[80, 200], [120, 200]], 64, 2);
    expect(deleted(t.alls)).toEqual([r]);
  });

  it("pot gardé : un remplissage n'est jamais candidat, ni ce qu'il couvre (D30, effet de bord 8 bis)", () => {
    const t = setup();
    t.stroke(hline(200, 100, 300));
    const under = t.image(120, 180, 160, 40);
    const zone = t.rect(100, 150, 300, 250, "#facc15");
    const raw = t.doc.elementIdsOfKind.bind(t.doc);
    t.doc.elementIdsOfKind = (p: string, k: string): readonly string[] => (k === "fill" ? [zone] : raw(p, k));
    sweep(t.tool(), [[150, 200], [250, 200]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.alls[0]![0]?.type).toBe("Erase");
    expect(t.doc.element(zone)).not.toBeNull();
    expect(t.doc.element(under)?.kind).toBe("image");
  });

  it("tableau : jamais effacé ; l'image posée dessus l'est (D4, S3)", () => {
    const t = setup();
    const table = t.add({ type: "AddTable", page: t.page, x: 100, y: 200, cols: 3, rows: 3, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 });
    const img = t.image(210, 270, 60, 40);
    sweep(t.tool(), [[90, 230], [410, 390]]);
    expect(deleted(t.alls)).toEqual([img]);
    expect(t.doc.element(table)?.kind).toBe("table");
  });

  it("page d'encre seule : aucun hitTest, une seule Erase (D8, Review Focus 1)", () => {
    const t = setup();
    t.stroke(hline(100));
    t.stroke(hline(140));
    sweep(t.tool(), [[300, 60], [300, 180]]);
    expect(t.hits.n).toBe(0);
    expect(t.alls).toHaveLength(1);
    expect(t.alls[0]).toHaveLength(1);
  });

  it("au plus 8 hitTest par image, tout le reste sondé au relâché (D8, Review Focus 3)", () => {
    const t = setup();
    // Chemin dans la marge du rayon, hors de la boîte d'une flèche en diagonale : chaque échantillon est proche, aucun
    // n'est sous la flèche, ni à tolérance 0 ni au rayon : deux appels par échantillon. Image en fin de chemin.
    t.add({ type: "AddShape", page: t.page, shape: "arrow", x0: 0, y0: 0, x1: 1700, y1: 400, style: PEN, fill: null });
    const img = t.image(1800, 0, 200, 400);
    const tool = t.tool();
    tool.begin(1, [s(100, -8)]);
    tool.extend(1, [s(1990, -8)], []);
    let before = t.hits.n;
    tool.frame();
    expect(t.hits.n - before).toBe(ERASER_PROBES_PER_FRAME);
    for (let i = 0; i < 8; i++) {
      before = t.hits.n;
      tool.frame();
      expect(t.hits.n - before).toBeLessThanOrEqual(ERASER_PROBES_PER_FRAME);
    }
    expect(tool.live().hidden.has(img)).toBe(false);
    tool.close(1, "end");
    expect(deleted(t.alls)).toEqual([img]);
  });

  it("aucune boîte mesurée au premier contact ; mesure par paquets, un candidat pas encore mesuré compte comme proche (D8)", () => {
    const t = setup();
    // Posée la première : sous les autres, mesurée la dernière (la mesure part du premier plan).
    const img = t.image(100, 100);
    const far = 3 * ERASER_BOUNDS_PER_FRAME;
    for (let i = 0; i < far; i++) t.image(5000 + 150 * i, 5000);
    const raw = t.doc.bounds.bind(t.doc);
    const b = { n: 0 };
    t.doc.bounds = (ids: readonly string[]) => {
      b.n++;
      return raw(ids);
    };
    const tool = t.tool();
    tool.begin(1, [s(150, 150)]);
    expect(b.n).toBe(0);
    tool.extend(1, [s(250, 150)], []);
    tool.frame();
    expect(b.n).toBeGreaterThan(0);
    expect(b.n).toBeLessThanOrEqual(ERASER_BOUNDS_PER_FRAME);
    expect(tool.live().hidden.has(img)).toBe(true);
    for (let i = 0; i < 8; i++) tool.frame();
    expect(b.n).toBe(far + 1);
    tool.close(1, "end");
    expect(b.n).toBe(far + 1);
    expect(deleted(t.alls)).toEqual([img]);
  });

  it("deux passes sur le même objet : la seconde n'écrit aucun id disparu (Review Focus 2)", () => {
    const t = setup();
    const img = t.image(100, 100);
    const tool = t.tool();
    tool.begin(1, [s(50, 150)]);
    tool.begin(2, [s(150, 50)]);
    tool.extend(1, [s(250, 150)], []);
    tool.extend(2, [s(150, 250)], []);
    for (let i = 0; i < 64; i++) tool.frame();
    tool.close(1, "end");
    expect(() => tool.close(2, "end")).not.toThrow();
    expect(deleted(t.alls)).toEqual([img]);
    expect(t.alls[1]).toHaveLength(1);
  });

  it("groupe : élément par élément, le membre touché seul est effacé (D16)", () => {
    const t = setup();
    const a = t.image(100, 100);
    const b = t.image(400, 100);
    t.doc.apply({ type: "Group", ids: [a, b] });
    sweep(t.tool(), [[50, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([a]);
    expect(t.doc.element(b)).not.toBeNull();
  });

  it("rayon constant à l'écran : 12 px divisés par le zoom ; un appui seul gomme aussi", () => {
    const t = setup({ zoom: 2, tx: 0, ty: 0 });
    const tool = t.tool();
    tool.begin(1, [s(600, 200)]);
    tool.close(1, "end");
    const c = t.alls[0]![0];
    if (c?.type !== "Erase") throw new Error("Erase attendue");
    expect(c.radius).toBe(6);
    expect(Array.from(c.path)).toEqual([300, 100]);
  });

  it("cancel ou abort : rien d'écrit (D39), aperçu retiré", () => {
    const t = setup();
    t.image(100, 100);
    const tool = t.tool();
    for (const how of ["cancel", "abort"] as const) {
      tool.begin(1, [s(50, 150)]);
      tool.extend(1, [s(250, 150)], []);
      for (let i = 0; i < 16; i++) tool.frame();
      tool.close(1, how);
    }
    expect(t.alls).toEqual([]);
    expect(tool.live().hidden.size).toBe(0);
    expect(tool.live().erasers).toHaveLength(0);
    expect(tool.active()).toBe(false);
  });

  it("aperçu : traînée partielle, objets masqués, rien d'écrit avant le relâché (D6)", () => {
    const t = setup();
    const img = t.image(100, 100);
    const v = t.doc.version();
    const tool = t.tool();
    tool.begin(1, [s(50, 150)]);
    tool.extend(1, [s(250, 150)], []);
    for (let i = 0; i < 16; i++) tool.frame();
    expect(t.doc.version()).toBe(v);
    expect(tool.live().erasers[0]?.mode).toBe("partial");
    expect(tool.live().hidden.has(img)).toBe(true);
  });

  it("OG25 resize : le rayon ne fait que grandir ; une seule écriture au rayon final", () => {
    const t = setup({ zoom: 2, tx: 0, ty: 0 });
    const tool = t.tool();
    tool.begin(1, [s(300, 80)]);
    tool.resize?.(1, 70);
    tool.resize?.(1, 40);
    tool.resize?.(1, Number.NaN);
    tool.resize?.(9, 100);
    tool.extend(1, [s(300, 120)], []);
    expect(tool.live().erasers[0]?.radius).toBe(35);
    tool.close(1, "end");
    expect(t.alls).toHaveLength(1);
    const c = t.alls[0]![0];
    expect(c?.type === "Erase" ? c.radius : null).toBe(35);
  });

  it("OG25 resize (paume, D7) : la sonde des objets repart du début quand le rayon grandit", () => {
    const t = setup();
    const img = t.image(100, 130);
    const tool = t.tool();
    tool.begin(1, [s(100, 100)]);
    tool.extend(1, [s(200, 100)], []);
    for (let i = 0; i < 32; i++) tool.frame();
    expect(tool.live().hidden.has(img)).toBe(false);
    tool.resize?.(1, 80);
    for (let i = 0; i < 32; i++) tool.frame();
    expect(tool.live().hidden.has(img)).toBe(true);
  });

  it("D5 : sans ToolContext.runAll, la gomme refuse de se créer (aucun repli en deux étapes)", () => {
    const t = setup(IDENTITY, false);
    expect(() => t.tool()).toThrow(/runAll/);
  });
  it("losange sans fond : intérieur gardé, bord effacé (D31, isFillable)", () => {
    const t = setup();
    const d = t.add({ type: "AddShape", page: t.page, shape: "diamond", x0: 100, y0: 100, x1: 300, y1: 300, style: PEN, fill: null });
    const tool = t.tool();
    sweep(tool, [[190, 200], [210, 200]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.doc.element(d)).not.toBeNull();
    // Sommet gauche du losange (100, 200) : sur le trait.
    sweep(tool, [[90, 200], [110, 200]], 64, 2);
    expect(deleted(t.alls)).toEqual([d]);
  });

  it("ligne fermée sans fond (Modifier les points) : intérieur gardé, bord effacé (D31, isFillable)", () => {
    const t = setup();
    const r = t.rect(100, 100, 300, 300, null);
    t.doc.apply({ type: "ShapeToPolygon", id: r });
    const ids = t.doc.elementIds(t.page);
    const poly = ids[ids.length - 1]!;
    const tool = t.tool();
    sweep(tool, [[170, 200], [230, 200]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.doc.element(poly)).not.toBeNull();
    sweep(tool, [[80, 200], [120, 200]], 64, 2);
    expect(deleted(t.alls)).toEqual([poly]);
  });

  it("limite connue (H18) : image sous un cadre vide : gardée", () => {
    const t = setup();
    const img = t.image(150, 150);
    const frame = t.rect(100, 100, 300, 300, null);
    // hitTest rend le cadre à toute tolérance : l'image dessous n'est jamais le premier plan.
    sweep(t.tool(), [[160, 200], [240, 200]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.doc.element(img)).not.toBeNull();
    expect(t.doc.element(frame)).not.toBeNull();
  });

  it("D4 : un objet logé renvoyé sous son tableau (Arrière-plan) a le tableau pour premier plan : gardé", () => {
    const t = setup();
    const table = t.add({ type: "AddTable", page: t.page, x: 100, y: 200, cols: 3, rows: 3, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 });
    const img = t.image(210, 270, 60, 40);
    t.doc.apply({ type: "Restack", ids: [img], to: 0 });
    sweep(t.tool(), [[90, 230], [410, 390]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.doc.element(img)).not.toBeNull();
    expect(t.doc.element(table)?.kind).toBe("table");
  });

});
