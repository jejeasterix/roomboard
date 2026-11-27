import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TableData } from "../../core/api";
import { plainSpans } from "../../core/rich-text";
import { TABLE_HEADER_FILL, TABLE_LINE_WIDTH, TABLE_PADDING, TABLE_SHADE_HATCH, TABLE_SHADE_HATCH_WIDTH } from "../table-geom";
import { asCtx, FakeCtx } from "./fake-ctx";
import type { ImageSource } from "./image-cache";
import { cellTextBoxes, paintTableGrid } from "./table-paint";

const T: TableData = {
  color: "#1d4ed8",
  size: 36,
  cols: [{ id: "c1", width: 240 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 80 }],
  cells: [
    { row: "r1", col: "c2", text: "", fill: "#fef08a", shade: null, spans: plainSpans("") },
    { row: "r2", col: "c1", text: "Lundi", fill: null, shade: null, spans: plainSpans("Lundi") },
    { row: "r9", col: "c1", text: "fantôme", fill: "#bbf7d0", shade: null, spans: plainSpans("fantôme") },
  ],
  merges: [],
};

describe("fonds et traits du tableau (C10a, T13, B1)", () => {
  it("fond de la cellule remplie à son rectangle ; ligne ou colonne inconnue : rien", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), T);
    expect(ctx.rects).toEqual([[240, 0, 100, 64]]);
    expect(ctx.log).toContain("fillRect #fef08a");
  });

  it("traits : une verticale par bord de colonne, une horizontale par bord de ligne, couleur et épaisseur du tableau", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), T);
    expect(ctx.log.filter((l) => l === "moveTo")).toHaveLength(3 + 3);
    expect(ctx.path.filter(([k]) => k === "M")).toEqual([["M", 0, 0], ["M", 240, 0], ["M", 340, 0], ["M", 0, 0], ["M", 0, 64], ["M", 0, 144]]);
    expect(ctx.log).toContain(`stroke #1d4ed8 ${TABLE_LINE_WIDTH}`);
  });

  it("aucun texte dessiné ici : un seul chemin du texte (B1)", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), T);
    expect(ctx.texts).toEqual([]);
    const source = readFileSync(new URL("./table-paint.ts", import.meta.url), "utf8");
    expect(source.includes("fillText")).toBe(false);
  });

  it("cellTextBoxes : rectangle intérieur des cellules au texte non vide, lignes et colonnes connues seulement", () => {
    expect(cellTextBoxes(T)).toEqual([
      { row: "r2", col: "c1", text: "Lundi", x: TABLE_PADDING, y: 64 + TABLE_PADDING, w: 240 - 2 * TABLE_PADDING, h: 80 - 2 * TABLE_PADDING, spans: plainSpans("Lundi") },
    ]);
  });
});

/** 2 × 2 (100 × 64) : zone r1 × c1..c2 (« Lundi », jaune ; la couverte garde un texte d'une autre version), r2:c2 ombrée. */
const Z: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }],
  cells: [
    { row: "r1", col: "c1", text: "Lundi", fill: "#fef08a", shade: null, spans: plainSpans("Lundi") },
    { row: "r1", col: "c2", text: "caché", fill: "#bbf7d0", shade: null, spans: plainSpans("caché") },
    { row: "r2", col: "c2", text: "réponse", fill: null, shade: "#94a3b8", spans: plainSpans("réponse") },
  ],
  merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }],
};

/** Segments tracés : les `M` suivis de leur `L`. */
const segments = (ctx: FakeCtx): [number, number][][] => {
  const out: [number, number][][] = [];
  let from: [number, number] | null = null;
  for (const [k, x, y] of ctx.path) {
    if (k === "M") from = [x, y];
    else if (from !== null) out.push([from, [x, y]]);
  }
  return out;
};

describe("zones et ombrage (C10b, F13)", () => {
  it("zone fusionnée : un fond au rectangle réuni ; couverte : aucun fond ; trait intérieur de la zone omis", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), Z);
    expect(ctx.rects[0]).toEqual([0, 0, 200, 64]);
    expect(ctx.log).not.toContain("fillRect #bbf7d0");
    const segs = segments(ctx);
    expect(segs).not.toContainEqual([[100, 0], [100, 64]]);
    expect(segs).toContainEqual([[100, 64], [100, 128]]);
  });

  it("F13 : ombrage : fond opaque à la couleur de la cellule, hachures #cbd5e1 découpées, traits du tableau par-dessus", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), Z);
    expect(ctx.rects).toContainEqual([100, 64, 100, 64]);
    const fill = ctx.log.indexOf("fillRect #94a3b8");
    const hatch = ctx.log.indexOf(`stroke ${TABLE_SHADE_HATCH} ${TABLE_SHADE_HATCH_WIDTH}`);
    const lines = ctx.log.lastIndexOf(`stroke #000000 ${TABLE_LINE_WIDTH}`);
    expect(fill).toBeGreaterThanOrEqual(0);
    expect(hatch).toBeGreaterThan(fill);
    expect(lines).toBeGreaterThan(hatch);
    expect(ctx.log.slice(fill, hatch)).toContain("clip");
  });

  it("cellTextBoxes (F11) : zone = rectangle réuni ; cellule couverte et cellule ombrée : aucun texte", () => {
    expect(cellTextBoxes(Z)).toEqual([
      { row: "r1", col: "c1", text: "Lundi", x: TABLE_PADDING, y: TABLE_PADDING, w: 200 - 2 * TABLE_PADDING, h: 64 - 2 * TABLE_PADDING, spans: plainSpans("Lundi") },
    ]);
  });
});

describe("table-paint — cellules par segments (C7b, R17)", () => {
  it("cellTextBoxes porte les segments de la cellule", () => {
    const rich: TableData = { ...T, cells: [{ row: "r2", col: "c1", text: "Le chat", fill: null, shade: null, spans: [plainSpans("Le ")[0]!, { text: "chat", attrs: { bold: true } }] }] };
    expect(cellTextBoxes(rich)[0]?.spans).toEqual([{ text: "Le ", attrs: {} }, { text: "chat", attrs: { bold: true } }]);
  });
});

describe("S5 : image de fond de case (personnalisation-3, T9)", () => {
  const ASSET = "a".repeat(64);
  const one = (bg: string | undefined, width = 240, height = 64): TableData => ({
    color: "#000000", size: 36, cols: [{ id: "c0", width }], rows: [{ id: "r0", height }],
    cells: [{ row: "r0", col: "c0", text: "", fill: null, shade: null, spans: [], ...(bg === undefined ? {} : { bg }) }], merges: [],
  });
  const source = (w: number, h: number): ImageSource => {
    const bmp = { width: w, height: h } as unknown as CanvasImageSource;
    return { bitmap: (id: string) => (id === ASSET ? bmp : null) } as unknown as ImageSource;
  };

  it("S5 PDF : le peintre d'export dessine le fond de case (drawImage découpé à la case)", () => {
    const fake = new FakeCtx();
    paintTableGrid(asCtx(fake), one(ASSET, 240, 64), source(10, 10));
    expect(fake.images).toHaveLength(1);
    expect(fake.log).toContain("clip");
  });

  it("S5 : « couvrir », centré : image carrée 10 x 10 dans 240 x 64 -> 240 x 240 décalée de -88, sous la grille", () => {
    const fake = new FakeCtx();
    paintTableGrid(asCtx(fake), one(ASSET, 240, 64), source(10, 10));
    expect(fake.images[0]).toMatchObject({ x: 0, y: -88, w: 240, h: 240 });
    expect(fake.log.indexOf("drawImage 0,-88,240,240")).toBeLessThan(fake.log.findIndex((l) => l.startsWith("stroke ")));
  });

  it("S5 : image pas encore chargée, ou aucune source : rien dessiné", () => {
    const a = new FakeCtx();
    paintTableGrid(asCtx(a), one(ASSET), { bitmap: () => null } as unknown as ImageSource);
    const b = new FakeCtx();
    paintTableGrid(asCtx(b), one(ASSET));
    expect(a.images).toEqual([]);
    expect(b.images).toEqual([]);
  });

  it("S5 : une case sans fond ne dessine aucune image", () => {
    const fake = new FakeCtx();
    paintTableGrid(asCtx(fake), one(undefined), source(10, 10));
    expect(fake.images).toEqual([]);
  });
});

const HEAD = (header: boolean): TableData => ({
  color: "#000000",
  size: 36,
  cols: [{ id: "a", width: 240 }, { id: "b", width: 240 }],
  rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
  cells: [
    { row: "r0", col: "a", text: "Nom", fill: null, shade: null, spans: plainSpans("Nom") },
    { row: "r1", col: "a", text: "Léa", fill: null, shade: null, spans: plainSpans("Léa") },
  ],
  merges: [],
  ...(header ? { header: true } : {}),
});

describe("S10 en-tête (D17)", () => {
  it("S10 : ligne 0 peinte au fond d'en-tête avant les traits ; sans en-tête : aucun fond", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), HEAD(true));
    expect(ctx.rects[0]).toEqual([0, 0, 480, 64]);
    expect(ctx.log).toContain(`fillRect ${TABLE_HEADER_FILL}`);
    const none = new FakeCtx();
    paintTableGrid(asCtx(none), HEAD(false));
    expect(none.log).not.toContain(`fillRect ${TABLE_HEADER_FILL}`);
  });
  it("S10 : texte de la ligne 0 en gras quand header ; ligne 1 inchangée", () => {
    const b = cellTextBoxes(HEAD(true));
    expect(b.find((x) => x.row === "r0")?.spans).toEqual([{ text: "Nom", attrs: { bold: true } }]);
    expect(b.find((x) => x.row === "r1")?.spans).toEqual(plainSpans("Léa"));
    expect(cellTextBoxes(HEAD(false)).find((x) => x.row === "r0")?.spans).toEqual(plainSpans("Nom"));
  });
});
