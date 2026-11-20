import { describe, expect, it, vi } from "vitest";
import type { Command } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { plainSpans } from "../core/rich-text";
import { IDENTITY } from "../engine/camera";
import { cellHeight } from "../engine/table-geom";
import type { TableGrid } from "./html-table";
import type { ImageTarget } from "./image-import";
import { CUT_CELLS_MESSAGE, gridRowHeights, insertTableGrid, TABLE_TAB_CLOSED } from "./table-insert";

const narrow = (s: string): number => s.length * 10;
type Import = Extract<Command, { type: "ImportTable" }>;
function fakeTarget(o: { alive?: boolean; refuse?: boolean } = {}) {
  const cmds: Command[] = [];
  const target: ImageTarget = {
    assets: createAssetStore(),
    page: () => "p1",
    camera: () => IDENTITY,
    stageRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    alive: () => o.alive !== false,
    measure: () => narrow,
    textStyle: () => ({ color: "#1d4ed8", size: 36 }),
    run: (cmd) => {
      cmds.push(cmd);
      return o.refuse === true ? null : { pages: ["p1"], ids: ["t"], removed: [], full: false, version: 1 };
    },
  };
  return { target, cmds };
}
const grid = (over: Partial<TableGrid> = {}): TableGrid => ({
  rows: 2, cols: 2, cells: ["Titre", "", "a", "b"], merges: [{ row: 0, col: 0, rows: 1, cols: 2 }], sourceRows: 2, sourceCols: 2, cutCells: false, ...over,
});

describe("poser une grille (F21, F22)", () => {
  it("F21 : colonnes 240, lignes ≥ 64, couleur du stylo, centrée au centre de la vue ; une ImportTable, aucun message", async () => {
    const t = fakeTarget();
    const notify = vi.fn(async (_m: string) => undefined);
    expect(await insertTableGrid(t.target, grid(), null, 0, notify)).toBe("inserted");
    expect(t.cmds).toEqual([{
      type: "ImportTable", page: "p1", matrix: [1, 0, 0, 1, 160, 236], colWidth: 240, rowHeights: [64, 64], cols: 2,
      cells: ["Titre", "", "a", "b"], merges: [[0, 0, 1, 2]], color: "#1d4ed8", size: 36,
    }]);
    expect(notify).not.toHaveBeenCalled();
  });

  it("F21 : texte long : sa ligne prend la hauteur exigée ; texte couvert ignoré pour la mesure", () => {
    const long = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee";
    expect(gridRowHeights(grid({ cells: ["", "", long, ""] }), 36, narrow)).toEqual([64, Math.max(64, cellHeight(plainSpans(long), 36, 240, narrow))]);
    expect(gridRowHeights(grid({ rows: 1, cells: ["court", long], sourceRows: 1 }), 36, narrow)).toEqual([64]);
  });

  it("F22 : 70 × 6 : message de troncature avec le nom du fichier ; collage : sans nom", async () => {
    const big = grid({ rows: 64, cols: 6, cells: new Array<string>(384).fill(""), merges: [], sourceRows: 70, sourceCols: 6 });
    const notify = vi.fn(async (_m: string) => undefined);
    await insertTableGrid(fakeTarget().target, big, null, 0, notify, "valeurs.xlsx");
    await insertTableGrid(fakeTarget().target, big, null, 0, notify);
    expect(notify.mock.calls.map((c) => c[0])).toEqual([
      "valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)",
      "tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)",
    ]);
  });

  it("F22 : textes coupés : un seul message", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    await insertTableGrid(fakeTarget().target, grid({ cutCells: true }), null, 0, notify, "v.xlsx");
    expect(notify.mock.calls).toEqual([[`v.xlsx : ${CUT_CELLS_MESSAGE}`]]);
  });

  it("onglet fermé : rien d'écrit, message ; ImportTable refusée : failed sans message", async () => {
    const closed = fakeTarget({ alive: false });
    const notify = vi.fn(async (_m: string) => undefined);
    expect(await insertTableGrid(closed.target, grid(), null, 0, notify, "v.xlsx")).toBe("failed");
    expect([closed.cmds, notify.mock.calls]).toEqual([[], [[`v.xlsx : ${TABLE_TAB_CLOSED}`]]]);
    const refused = fakeTarget({ refuse: true });
    const quiet = vi.fn(async (_m: string) => undefined);
    expect(await insertTableGrid(refused.target, grid(), null, 0, quiet)).toBe("failed");
    expect(quiet).not.toHaveBeenCalled();
  });

  it("point de dépôt dans la scène : centré sur ce point, décalé de 24 par fichier déjà inséré (R4)", async () => {
    const t = fakeTarget();
    await insertTableGrid(t.target, grid(), { x: 400, y: 300 }, 1, vi.fn(async () => undefined));
    expect((t.cmds[0] as Import).matrix).toEqual([1, 0, 0, 1, 400 - 240 + 24, 300 - 64 + 24]);
  });
});
