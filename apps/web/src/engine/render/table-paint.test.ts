import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TableData } from "../../core/api";
import { TABLE_LINE_WIDTH, TABLE_PADDING } from "../table-geom";
import { asCtx, FakeCtx } from "./fake-ctx";
import { cellTextBoxes, paintTableGrid } from "./table-paint";

const T: TableData = {
  color: "#1d4ed8",
  size: 36,
  cols: [{ id: "c1", width: 240 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 80 }],
  cells: [
    { row: "r1", col: "c2", text: "", fill: "#fef08a" },
    { row: "r2", col: "c1", text: "Lundi", fill: null },
    { row: "r9", col: "c1", text: "fantôme", fill: "#bbf7d0" },
  ],
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
      { row: "r2", col: "c1", text: "Lundi", x: TABLE_PADDING, y: 64 + TABLE_PADDING, w: 240 - 2 * TABLE_PADDING, h: 80 - 2 * TABLE_PADDING },
    ]);
  });
});
