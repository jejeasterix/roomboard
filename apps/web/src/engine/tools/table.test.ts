import { describe, expect, it, vi } from "vitest";
import type { Command, TableData, TextSpan } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { editSpans, plainSpans } from "../../core/rich-text";
import type { FormatAction, FormatState } from "../rich-edit";
import type { InputSample } from "../input/sampler";
import { cellHeight, TABLE_SHADE_COLOR } from "../table-geom";
import type { Measure } from "../text-layout";
import type { CellMenu, CellMenuItem } from "../../ui/cell-menu";
import { createCellDrop } from "./cell-drop";
import { createTableTool, type TablePicker } from "./table";
import type { TextEditorHost, TextEditSession } from "./text";
import type { TableTool, ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const atT = (x: number, y: number, t: number): InputSample => ({ ...at(x, y), t });
/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;
type AddTable = Extract<Command, { type: "AddTable" }>;

class FakeHost implements TextEditorHost {
  opened: TextEditSession[] = [];
  closed = 0;
  text = "";
  /** Segments imposés par le test ; null : ceux d'une zone qui hérite (`editSpans` sur le texte saisi). */
  rich: TextSpan[] | null = null;
  formats: FormatAction[] = [];
  state: FormatState | null = null;
  open(s: TextEditSession): void {
    this.opened.push(s);
    this.text = s.initial;
    this.rich = null;
  }
  close(): void {
    this.closed++;
  }
  value(): string {
    return this.text;
  }
  spans(): readonly TextSpan[] {
    const s = this.opened[this.opened.length - 1];
    return this.rich ?? editSpans(s?.spans ?? plainSpans(""), this.text);
  }
  format(a: FormatAction): void {
    this.formats.push(a);
  }
  formatState(): FormatState | null {
    return this.state;
  }
  last(): TextEditSession {
    const s = this.opened[this.opened.length - 1];
    if (!s) throw new Error("rien d'ouvert");
    return s;
  }
}

class FakePicker implements TablePicker {
  at: { x: number; y: number } | null = null;
  private pick: ((cols: number, rows: number) => void) | null = null;
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void {
    this.at = { x: at.x, y: at.y };
    this.pick = pick;
  }
  close(): void {
    this.at = null;
    this.pick = null;
  }
  isOpen(): boolean {
    return this.at !== null;
  }
  /** Comme la vraie grille : fermée, puis le choix. */
  choose(cols: number, rows: number): void {
    const p = this.pick;
    this.close();
    p?.(cols, rows);
  }
}

function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  let changes = 0;
  let shift = false;
  const host = new FakeHost();
  const picker = new FakePicker();
  const holder: { tool?: TableTool } = {};
  // Comme `run` du moteur : erreur rendue null, `prune` après chaque commande (I1).
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        const c = doc.apply(cmd);
        holder.tool?.prune();
        return c;
      } catch {
        return null;
      }
    },
    shift: () => shift,
    requestFrame: () => undefined,
    stateChanged: () => {
      changes++;
    },
  };
  const notices: string[] = [];
  const menuOpens: { x: number; y: number; items: readonly CellMenuItem[] }[] = [];
  const menu: CellMenu = { open: (x, y, items) => void menuOpens.push({ x, y, items }), close: () => undefined };
  const tool = createTableTool(ctx, host, picker, () => ({ color: "#000000", size: 36 }), narrow, menu, createCellDrop(ctx, narrow), (text) => void notices.push(text));
  holder.tool = tool;
  const click = (x: number, y: number): void => {
    tool.begin(1, [at(x, y)]);
    tool.close(1, "end");
  };
  const table = (id: string): TableData => {
    const v = doc.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    return v.table;
  };
  /** Tableau cols × rows créé par la grille en (x, y) ; saisie ouverte sur sa première cellule. */
  const create = (x: number, y: number, cols: number, rows: number): string => {
    click(x, y);
    picker.choose(cols, rows);
    const ids = doc.elementIds(page);
    return ids[ids.length - 1] ?? "";
  };
  const last = (): Command | undefined => runs[runs.length - 1];
  return { notices, menuOpens, doc, page, runs, host, picker, tool, click, create, table, last, type: (s: string) => (host.text = s), changes: () => changes, setShift: (v: boolean) => {
    shift = v;
  } };
}

/** 2 × 2 en (100, 200), « xy » saisi dans la dernière cellule (1, 1), saisie ouverte. */
function lastCellXY() {
  const s = setup();
  const id = s.create(100, 200, 2, 2);
  s.tool.navigate("next");
  s.tool.navigate("next");
  s.tool.navigate("next");
  s.type("xy");
  return { ...s, id };
}

describe("outil Tableau (C10a)", () => {
  it("S1 : clic hors d'un tableau : grille au point ; 4 × 3 choisi : AddTable au point, saisie ouverte sur la première cellule", () => {
    const s = setup();
    s.click(100, 200);
    expect(s.picker.at).toEqual({ x: 100, y: 200 });
    expect(s.runs).toEqual([]);
    s.picker.choose(4, 3);
    expect(s.runs[0]).toEqual({ type: "AddTable", page: s.page, x: 100, y: 200, cols: 4, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    const o = s.host.last();
    expect([o.matrix, o.boxWidth, o.background, o.initial, o.size, o.color]).toEqual([[1, 0, 0, 1, 108, 208], 224, "#ffffff", "", 36, "#000000"]);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, rows: 3, cols: 4 });
    expect(s.changes()).toBeGreaterThan(0);
  });

  it("tableau qui dépasserait la largeur de page : décalé à gauche, x ≥ 0 (T4, GC12)", () => {
    const s = setup();
    s.create(1800, 50, 4, 2);
    expect((s.runs[0] as AddTable).x).toBe(1920 - 4 * 240);
    s.tool.requestCommit();
    s.click(1800, 600);
    s.picker.choose(9, 1);
    expect((s.last() as AddTable).x).toBe(0);
  });

  it("Tab : valide la cellule et ouvre la suivante ; fin de ligne → début de la suivante (T8)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.type("a");
    expect(s.tool.navigate("next")).toBe(true);
    expect(s.last()).toMatchObject({ type: "SetTableCell", id, content: "a" });
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1 });
    s.type("b");
    s.tool.navigate("next");
    expect(s.tool.cellState()).toMatchObject({ row: 1, col: 0 });
    expect(s.host.last().matrix).toEqual([1, 0, 0, 1, 108, 272]);
  });

  it("S2 : Tab dans la dernière cellule ajoute une ligne et ouvre sa première cellule ; deux étapes (T9, HC10-2)", () => {
    const s = lastCellXY();
    const v0 = s.doc.version();
    expect(s.tool.navigate("next")).toBe(true);
    expect(s.runs.slice(-2).map((c) => c.type)).toEqual(["SetTableCell", "InsertTableLine"]);
    expect(s.last()).toEqual({ type: "InsertTableLine", id: s.id, axis: "row", at: 2 });
    expect(s.doc.version()).toBe(v0 + 2);
    expect(s.tool.cellState()).toMatchObject({ row: 2, col: 0, rows: 3 });
    expect(s.host.last().initial).toBe("");
  });

  it("S2 : Maj+Tab revient à la cellule « xy » (rouverte avec son texte)", () => {
    const s = lastCellXY();
    s.tool.navigate("next");
    expect(s.tool.navigate("prev")).toBe(true);
    expect(s.tool.cellState()).toMatchObject({ row: 1, col: 1 });
    expect(s.host.last().initial).toBe("xy");
  });

  it("S2 : flèche → en dernière colonne : cellule suivante dans l'ordre de lecture ; ↑ au bord, ↓ au bord : non pris", () => {
    const s = lastCellXY();
    s.tool.navigate("next");
    s.tool.navigate("prev");
    expect(s.tool.navigate("right")).toBe(true);
    expect(s.tool.cellState()).toMatchObject({ row: 2, col: 0 });
    expect(s.tool.navigate("down")).toBe(false);
    s.tool.navigate("up");
    s.tool.navigate("up");
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0 });
    expect(s.tool.navigate("up")).toBe(false);
  });

  it("Maj+Tab dans la première cellule : pris, rien ne change, saisie ouverte", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    const [opened, closed] = [s.host.opened.length, s.host.closed];
    expect(s.tool.navigate("prev")).toBe(true);
    expect([s.host.opened.length, s.host.closed]).toEqual([opened, closed]);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0 });
  });

  it("S2 : cellule sous un trait : c'est la cellule qui s'ouvre (I2)", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const ink = s.doc.apply({ type: "CommitStroke", page: s.page, points: new Float32Array([300, 260, 0.5, 400, 260, 0.5, 420, 260, 0.5]), style: { color: "#000000", width: 4 } }).ids[0];
    // Prémisse : l'encre est l'élément du dessus au point du clic ; sans elle, hitTest rendrait le tableau et le test ne
    // distinguerait plus tableAt (I2) de hitTest (text.ts:91).
    expect(s.doc.hitTest(s.page, 400, 260, 6)).toBe(ink);
    s.click(400, 260);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1 });
    expect(s.host.last().matrix).toEqual([1, 0, 0, 1, 348, 208]);
    expect(s.picker.isOpen()).toBe(false);
  });

  it("S2 : Échap puis annuler l'ajout de ligne : la cellule active disparaît ; annuler encore : « xy » disparaît (I1)", () => {
    const s = lastCellXY();
    s.tool.navigate("next");
    s.tool.requestCommit();
    expect(s.tool.cellState()).toMatchObject({ row: 2, col: 0 });
    s.doc.undo();
    s.tool.prune();
    expect(s.tool.cellState()).toBeNull();
    expect(s.tool.live().overlay).toBeUndefined();
    s.doc.undo();
    expect(s.table(s.id).cells).toEqual([]);
  });

  it("ligne insérée au-dessus de la cellule active : même cellule (ids), son rang suit (I1)", () => {
    const s = setup();
    const id = s.create(100, 200, 1, 3);
    s.tool.navigate("next");
    s.tool.requestCommit();
    const row = s.table(id).rows[1]?.id;
    s.doc.apply({ type: "InsertTableLine", id, axis: "row", at: 0 });
    s.tool.prune();
    expect(s.tool.cell()?.row).toBe(row);
    expect(s.tool.cellState()).toMatchObject({ row: 2, col: 0, rows: 4 });
    expect(s.tool.live().overlay?.frame).toEqual({ x0: 100, y0: 328, x1: 340, y1: 392 });
  });

  it("tableau supprimé pendant la saisie : saisie fermée sans écrire (I1)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.type("perdu");
    const n = s.runs.length;
    s.doc.apply({ type: "Delete", ids: [id] });
    s.tool.prune();
    expect([s.host.closed, s.tool.cellState()]).toEqual([1, null]);
    s.tool.requestCommit();
    expect(s.runs.length).toBe(n);
  });

  it("S2, HC10-17 : − Ligne sur la ligne active : la ligne du dessous devient active, saisie fermée ; dernière ligne : celle du dessus", () => {
    const s = setup();
    const id = s.create(100, 200, 1, 3);
    s.tool.navigate("next");
    const below = s.table(id).rows[2]?.id;
    const closed = s.host.closed;
    s.tool.act("row-remove");
    expect(s.last()).toMatchObject({ type: "RemoveTableLine", id, axis: "row" });
    expect(s.tool.cell()?.row).toBe(below);
    expect(s.tool.cellState()).toMatchObject({ row: 1, col: 0, rows: 2 });
    expect(s.host.closed).toBe(closed + 1);
    s.tool.act("row-remove");
    expect(s.tool.cellState()).toMatchObject({ row: 0, rows: 1 });
    const n = s.runs.length;
    s.tool.act("row-remove");
    expect([s.runs.length, s.table(id).rows.length]).toEqual([n, 1]);
  });

  it("− Colonne : la colonne de droite devient active, sinon celle de gauche", () => {
    const s = setup();
    const id = s.create(100, 200, 3, 1);
    s.tool.navigate("next");
    const right = s.table(id).cols[2]?.id;
    s.tool.act("col-remove");
    expect(s.tool.cell()?.col).toBe(right);
    expect(s.tool.cellState()).toMatchObject({ col: 1, cols: 2 });
  });

  it("+ Ligne dessous, + Colonne à droite (étude § 3.3) ; la cellule active reste la même", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.act("row-insert");
    expect(s.last()).toEqual({ type: "InsertTableLine", id, axis: "row", at: 1 });
    s.tool.act("col-insert");
    expect(s.last()).toEqual({ type: "InsertTableLine", id, axis: "col", at: 1 });
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, rows: 3, cols: 3 });
  });

  it("S2 : Suppr — clearCell vide la cellule active, une étape ; saisie ouverte ou sans cellule : false (T7)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    expect(s.tool.clearCell()).toBe(false);
    s.type("xy");
    s.tool.requestCommit();
    const v = s.doc.version();
    expect(s.tool.clearCell()).toBe(true);
    expect(s.table(id).cells).toEqual([]);
    expect(s.doc.version()).toBe(v + 1);
    expect(setup().tool.clearCell()).toBe(false);
  });

  it("S3 : texte long : SetTableCell porte la hauteur exigée ; la ligne grandit, les autres non (T5)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    const long = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd";
    s.type(long);
    s.tool.requestCommit();
    const h = cellHeight(plainSpans(long), 36, 240, narrow);
    const t = s.table(id);
    expect(s.last()).toEqual({ type: "SetTableCell", id, row: t.rows[0]?.id, col: t.cols[0]?.id, content: long, rowHeight: h, spans: [{ text: long, attrs: {} }] });
    expect(h).toBeGreaterThan(64);
    expect(t.rows.map((r) => r.height)).toEqual([h, 64]);
  });

  it("S3 : Uniformiser : colonnes égales, largeur gardée, lignes égales et le long texte tient ; une étape ; déjà uniforme : aucune", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    const long = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd";
    s.type(long);
    s.tool.requestCommit();
    const h = cellHeight(plainSpans(long), 36, 240, narrow);
    const v = s.doc.version();
    s.tool.act("uniform");
    const t = s.table(id);
    expect([t.cols.map((c) => c.width), t.rows.map((r) => r.height)]).toEqual([[240, 240], [h, h]]);
    expect(s.doc.version()).toBe(v + 1);
    s.tool.act("uniform");
    expect(s.doc.version()).toBe(v + 1);
  });

  it("Uniformiser sur un tableau uniforme à un arrondi près (7 lignes : six à 64, une à 196) : une étape, puis aucune (T14)", () => {
    const s = setup();
    const id = s.doc.apply({ type: "AddTable", page: s.page, x: 0, y: 0, cols: 1, rows: 7, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const t0 = s.table(id);
    s.doc.apply({ type: "SetTableCell", id, row: t0.rows[6]?.id ?? "", col: t0.cols[0]?.id ?? "", content: "", rowHeight: 196 });
    expect(s.table(id).rows.map((r) => r.height)).toEqual([64, 64, 64, 64, 64, 64, 196]);
    s.click(120, 32);
    const v = s.doc.version();
    s.tool.act("uniform");
    expect(s.doc.version()).toBe(v + 1);
    expect(s.table(id).rows.map((r) => r.height)).toEqual(Array(7).fill(580 / 7));
    s.tool.act("uniform");
    expect(s.doc.version()).toBe(v + 1);
  });

  it("S3 : pastille jaune : SetTableFill sur la cellule active ; sans cellule active : rien", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.fill("#fef08a");
    const t = s.table(id);
    expect(s.last()).toEqual({ type: "SetTableFill", id, row: t.rows[0]?.id, col: t.cols[0]?.id, fill: "#fef08a" });
    expect(t.cells[0]?.fill).toBe("#fef08a");
    const u = setup();
    u.tool.fill("#fef08a");
    expect(u.runs).toEqual([]);
  });

  it("S3 : à 64 lignes, Tab en dernière cellule : sans effet, saisie ouverte (T4, HC10-9)", () => {
    const s = setup();
    s.doc.apply({ type: "AddTable", page: s.page, x: 0, y: 0, cols: 1, rows: 64, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    s.click(120, 63 * 64 + 32);
    expect(s.tool.cellState()).toMatchObject({ row: 63, rows: 64 });
    const [n, closed] = [s.runs.length, s.host.closed];
    expect(s.tool.navigate("next")).toBe(true);
    expect([s.runs.length, s.host.closed]).toEqual([n, closed]);
  });

  it("composition : Tab non pris, validation différée jusqu'à compositionend (CL4-3)", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("日本");
    s.tool.compositionStart();
    expect(s.tool.navigate("next")).toBe(false);
    const n = s.runs.length;
    s.tool.requestCommit();
    s.click(5000, 5000);
    expect(s.runs.length).toBe(n);
    s.tool.compositionEnd();
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "日本" });
    expect(s.picker.isOpen()).toBe(false);
  });

  it("composition : act et fill n'écrivent rien et laissent la saisie ouverte, rien en attente (porte IME, comme navigate, T14)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.type("日本");
    s.tool.compositionStart();
    const [n, closed] = [s.runs.length, s.host.closed];
    s.tool.act("row-insert");
    s.tool.fill("#fef08a");
    expect([s.runs.length, s.host.closed, s.table(id).rows.length]).toEqual([n, closed, 2]);
    s.tool.compositionEnd();
    expect(s.runs.length).toBe(n);
    s.tool.act("row-insert");
    expect(s.runs.slice(n).map((c) => c.type)).toEqual(["SetTableCell", "InsertTableLine"]);
  });

  it("clic pendant la saisie : valide seulement ; grille ouverte : un clic la ferme seulement", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("a");
    const opened = s.host.opened.length;
    s.click(5000, 5000);
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "a" });
    expect([s.host.opened.length, s.picker.isOpen()]).toEqual([opened, false]);
    s.click(5000, 5000);
    expect(s.picker.isOpen()).toBe(true);
    s.click(5000, 5000);
    expect(s.picker.isOpen()).toBe(false);
  });

  it("leave : valide la saisie, retire la cellule active ; ferme la grille", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("a");
    s.tool.leave?.("tool");
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "a" });
    expect(s.tool.cellState()).toBeNull();
    const u = setup();
    u.click(10, 10);
    u.tool.leave?.("page");
    expect(u.picker.isOpen()).toBe(false);
  });

  it("aperçu : cadre de la cellule active en monde (EditOverlay.frame) ; sans cellule : aucun", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    expect(s.tool.live().overlay?.frame).toEqual({ x0: 100, y0: 200, x1: 340, y1: 264 });
    s.tool.leave?.("tool");
    expect(s.tool.live().overlay).toBeUndefined();
  });
});

describe("outil Tableau (C10b)", () => {
  type S = ReturnType<typeof setup>;
  /** Appui en a, glisser jusqu'à b, relâché (caméra identité : px = unités). */
  const drag = (s: S, a: [number, number], b: [number, number]): void => {
    s.tool.begin(1, [at(a[0], a[1])]);
    s.tool.extend(1, [at(b[0], b[1])], []);
    s.tool.close(1, "end");
  };
  /** Tableau cols × rows en (100, 200), saisie fermée ; ids des lignes et colonnes. */
  const made = (cols: number, rows: number) => {
    const s = setup();
    const id = s.create(100, 200, cols, rows);
    s.tool.requestCommit();
    const t = s.table(id);
    return { s, id, r: t.rows.map((x) => x.id), c: t.cols.map((x) => x.id) };
  };
  /** Centre de la cellule (ligne, colonne) d'un tableau de colonnes 240 et lignes 64 en (100, 200). */
  const mid = (row: number, col: number): [number, number] => [100 + 240 * col + 120, 200 + 64 * row + 32];

  it("F14 : clic sans glisser : saisie ouverte au relâché, pas à l'appui (HB-12)", () => {
    const { s } = made(2, 2);
    const n = s.host.opened.length;
    s.tool.begin(1, [at(...mid(0, 1))]);
    expect(s.host.opened).toHaveLength(n);
    s.tool.close(1, "end");
    expect(s.host.opened).toHaveLength(n + 1);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1, range: null });
  });

  it("F14 : appui puis geste annulé (cancel, abort) : aucune saisie, rien d'écrit (le relâché décide, comme select.ts)", () => {
    const { s } = made(2, 2);
    const n = s.host.opened.length;
    const k = s.runs.length;
    s.tool.begin(1, [at(...mid(1, 1))]);
    s.tool.close(1, "cancel");
    s.tool.begin(2, [at(...mid(1, 0))]);
    s.tool.close(2, "abort");
    expect(s.host.opened).toHaveLength(n);
    expect(s.runs).toHaveLength(k);
  });

  it("F14, constat T13 : glisser puis geste interrompu (abort, cancel) : la plage du glisser est retirée", () => {
    const { s } = made(2, 2);
    for (const how of ["abort", "cancel"] as const) {
      s.tool.begin(1, [at(...mid(0, 0))]);
      s.tool.extend(1, [at(...mid(0, 1))], []);
      expect(s.tool.cellState()?.range, how).toEqual({ r0: 0, c0: 0, r1: 0, c1: 1 });
      s.tool.close(1, how);
      expect(s.tool.cellState()?.range, how).toBeNull();
    }
  });

  it("constat T13 : cellState publie la zone de la cellule active (étendue réelle de « − Ligne » / « − Colonne »)", () => {
    const { s } = made(3, 2);
    drag(s, mid(0, 0), mid(1, 0));
    s.tool.act("merge");
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, range: null, merged: true, zone: { r0: 0, c0: 0, r1: 1, c1: 0 } });
    s.tool.act("split");
    expect(s.tool.cellState()?.zone).toBeNull();
  });

  it("F14 : glisser de la première à la deuxième cellule : plage 0,0-0,1, aucune saisie ; Échap (clearRange) la retire", () => {
    const { s } = made(2, 2);
    const n = s.host.opened.length;
    drag(s, mid(0, 0), mid(0, 1));
    expect(s.host.opened).toHaveLength(n);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, range: { r0: 0, c0: 0, r1: 0, c1: 1 } });
    expect(s.tool.live().overlay?.frame).toEqual({ x0: 100, y0: 200, x1: 580, y1: 264 });
    expect(s.tool.clearRange()).toBe(true);
    expect(s.tool.cellState()?.range).toBeNull();
    expect(s.tool.clearRange()).toBe(false);
    expect(s.runs.filter((c) => c.type !== "AddTable")).toEqual([]);
  });

  it("F14 : Maj+clic : plage de la cellule active au point, élargie à une zone touchée", () => {
    const { s, id, r, c } = made(3, 3);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[1] ?? "", col: c[1] ?? "" }, to: { row: r[2] ?? "", col: c[2] ?? "" } });
    s.tool.prune();
    s.click(...mid(0, 0));
    s.tool.requestCommit();
    const n = s.host.opened.length;
    s.setShift(true);
    s.click(...mid(1, 1));
    expect(s.tool.cellState()?.range).toEqual({ r0: 0, c0: 0, r1: 2, c1: 2 });
    expect(s.host.opened).toHaveLength(n);
  });

  it("F14, F16 : Maj+clic sur la zone active elle-même : aucune plage, Diviser reste offert", () => {
    const { s, id, r, c } = made(3, 2);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[0] ?? "", col: c[1] ?? "" } });
    s.tool.prune();
    s.click(...mid(0, 0));
    s.tool.requestCommit();
    s.setShift(true);
    s.click(...mid(0, 1));
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, merged: true, range: null });
    s.tool.act("split");
    expect(s.last()).toEqual({ type: "SplitTableCell", id, row: r[0], col: c[0] });
  });

  it("F14 : appui pendant une saisie ouverte puis glisser : valide seulement, aucune plage", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("a");
    drag(s, mid(0, 0), mid(0, 1));
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "a" });
    expect(s.tool.cellState()?.range).toBeNull();
  });

  it("F3 : Fusionner : MergeTableCells sur la plage, l'ancre active, plage retirée ; une étape", () => {
    const { s, id, r, c } = made(3, 2);
    drag(s, mid(0, 0), mid(0, 1));
    s.tool.act("merge");
    expect(s.last()).toEqual({ type: "MergeTableCells", id, from: { row: r[0], col: c[0] }, to: { row: r[0], col: c[1] } });
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, merged: true, range: null });
    expect(s.table(id).merges).toHaveLength(1);
    s.doc.undo();
    expect(s.table(id).merges).toHaveLength(0);
  });

  it("F4 : Diviser : SplitTableCell sur l'ancre active ; avec une plage : rien", () => {
    const { s, id, r, c } = made(3, 2);
    drag(s, mid(0, 0), mid(0, 1));
    s.tool.act("merge");
    drag(s, mid(0, 0), mid(1, 2));
    const n = s.runs.length;
    s.tool.act("split");
    expect(s.runs).toHaveLength(n);
    s.tool.clearRange();
    s.tool.act("split");
    expect(s.last()).toEqual({ type: "SplitTableCell", id, row: r[0], col: c[0] });
    expect(s.table(id).merges).toEqual([]);
  });

  it("F9, S1 : Ombrer la plage d'une colonne : une SetTableShade, trois cellules ; Désombrer : null ; la plage reste (PC19)", () => {
    const { s, id, r, c } = made(4, 3);
    drag(s, mid(0, 2), mid(2, 2));
    expect(s.tool.cellState()?.range).toEqual({ r0: 0, c0: 2, r1: 2, c1: 2 });
    s.tool.act("shade");
    expect(s.last()).toEqual({ type: "SetTableShade", id, from: { row: r[0], col: c[2] }, to: { row: r[2], col: c[2] }, shade: TABLE_SHADE_COLOR });
    expect(s.table(id).cells.filter((x) => x.shade !== null)).toHaveLength(3);
    expect(s.tool.cellState()).toMatchObject({ shaded: true, range: { r0: 0, c0: 2, r1: 2, c1: 2 } });
    s.tool.act("unshade");
    expect(s.last()).toMatchObject({ type: "SetTableShade", shade: null });
    expect(s.tool.cellState()?.shaded).toBe(false);
  });

  it("F15 : pastille sur une plage : SetTableFill avec to", () => {
    const { s, id, r, c } = made(2, 2);
    drag(s, mid(0, 0), mid(1, 1));
    s.tool.fill("#fef08a");
    expect(s.last()).toEqual({ type: "SetTableFill", id, row: r[0], col: c[0], to: { row: r[1], col: c[1] }, fill: "#fef08a" });
  });

  it("F5 : + Ligne sur une zone de deux lignes : insérée après sa dernière ligne", () => {
    const { s, id, r, c } = made(2, 3);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[1] ?? "", col: c[0] ?? "" } });
    s.click(...mid(1, 0));
    s.tool.requestCommit();
    s.tool.act("row-insert");
    expect(s.last()).toEqual({ type: "InsertTableLine", id, axis: "row", at: 2 });
  });

  it("F6 : − Ligne sur une plage de deux lignes : une RemoveTableLine avec to ; la ligne suivante devient active", () => {
    const { s, id, r } = made(2, 4);
    drag(s, mid(0, 0), mid(1, 0));
    s.tool.act("row-remove");
    expect(s.last()).toEqual({ type: "RemoveTableLine", id, axis: "row", line: r[0], to: r[1] });
    expect(s.tool.cellState()).toMatchObject({ row: 0, rows: 2, range: null });
    expect(s.table(id).rows.map((x) => x.id)).toEqual([r[2], r[3]]);
  });

  it("F16, F7 : clic sur une cellule couverte : l'ancre s'ouvre, à la largeur de la zone", () => {
    const { s, id, r, c } = made(3, 2);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[0] ?? "", col: c[1] ?? "" } });
    s.tool.prune();
    s.click(...mid(0, 1));
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, merged: true });
    expect(s.host.last().boxWidth).toBe(480 - 16);
    s.type("Lundi et un texte long qui passe à la ligne");
    s.tool.requestCommit();
    expect(s.last()).toMatchObject({ type: "SetTableCell", row: r[0], col: c[0], rowHeight: cellHeight(plainSpans("Lundi et un texte long qui passe à la ligne"), 36, 480, narrow) });
  });

  it("F16, S5 : Tab saute les cellules couvertes", () => {
    const { s, id, r, c } = made(3, 2);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[0] ?? "", col: c[1] ?? "" } });
    s.click(...mid(0, 0));
    s.tool.navigate("next");
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 2 });
  });

  it("prune : coin de plage disparu (colonne retirée) : plage retirée, cellule active gardée", () => {
    const { s, id, c } = made(3, 2);
    drag(s, mid(0, 0), mid(0, 2));
    s.doc.apply({ type: "RemoveTableLine", id, axis: "col", line: c[2] ?? "" });
    s.tool.prune();
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, range: null });
  });
});

describe("outil Tableau — C7b (segments, barre)", () => {
  const B = { bold: true } as const;
  const I = { italic: true } as const;
  const cellSpans = (s: ReturnType<typeof setup>, id: string): readonly TextSpan[] | undefined => s.table(id).cells[0]?.spans;

  it("S6 : cellule « Total » existante, italique seule : SetTableCell au même contenu avec spans ; annuler la rend droite", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.type("Total");
    s.tool.requestCommit();
    s.click(110, 210);
    expect(s.host.last().spans).toEqual([{ text: "Total", attrs: {} }]);
    s.host.rich = [{ text: "Total", attrs: I }];
    s.tool.requestCommit();
    const t = s.table(id);
    expect(s.last()).toEqual({ type: "SetTableCell", id, row: t.rows[0]?.id, col: t.cols[0]?.id, content: "Total", rowHeight: cellHeight([{ text: "Total", attrs: I }], 36, 240, narrow), spans: [{ text: "Total", attrs: I }] });
    expect(cellSpans(s, id)).toEqual([{ text: "Total", attrs: I }]);
    s.doc.undo();
    expect(cellSpans(s, id)).toEqual([{ text: "Total", attrs: {} }]);
  });

  it("ouverture : la zone reçoit les segments de la cellule (R18)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const t = s.table(id);
    s.doc.apply({ type: "SetTableCell", id, row: t.rows[0]?.id ?? "", col: t.cols[0]?.id ?? "", content: "aaTotal", spans: [{ text: "a", attrs: {} }, { text: "aTotal", attrs: B }] });
    s.click(110, 210);
    expect(s.host.last().spans).toEqual([{ text: "a", attrs: {} }, { text: "aTotal", attrs: B }]);
  });

  it("texte et segments inchangés : aucune SetTableCell (R6)", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("Lundi");
    s.tool.requestCommit();
    const n = s.runs.length;
    s.click(110, 210);
    s.tool.requestCommit();
    expect(s.runs).toHaveLength(n);
  });

  it("format et formatState : relayés pendant la saisie, null sinon ; composition : rien ; formatChanged republie (R5, R15)", () => {
    const s = setup();
    const st: FormatState = { bold: true, italic: false, underline: false, size: 36, color: "default" };
    s.host.state = st;
    expect(s.tool.formatState()).toBeNull();
    s.tool.format({ type: "bold" });
    s.create(100, 200, 2, 2);
    expect(s.tool.formatState()).toEqual(st);
    s.tool.format({ type: "bold" });
    s.tool.compositionStart();
    s.tool.format({ type: "italic" });
    s.tool.compositionEnd();
    expect(s.host.formats).toEqual([{ type: "bold" }]);
    const c = s.changes();
    s.tool.formatChanged();
    expect(s.changes()).toBe(c + 1);
  });
});

describe("outil Tableau — fond de page (C6a)", () => {
  it("éditeur d'une cellule sans remplissage : fond de la page (D20)", () => {
    const s = setup();
    const page = s.doc.page.bind(s.doc);
    s.doc.page = (id) => {
      const p = page(id);
      return p === null ? null : { ...p, background: "#bfdbfe" };
    };
    s.create(100, 200, 2, 2);
    expect(s.host.last().background).toBe("#bfdbfe");
  });

  it("cellule remplie : son remplissage passe avant le fond de la page", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    const t = s.table(id);
    s.doc.apply({ type: "SetTableFill", id, row: t.rows[0]?.id ?? "", col: t.cols[1]?.id ?? "", fill: "#fef08a" });
    s.tool.navigate("next");
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1 });
    expect(s.host.last().background).toBe("#fef08a");
  });
});

describe("outil Tableau (personnalisation-3)", () => {
  it("linked : cellState compte les objets logés dans le tableau actif", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    expect(s.tool.cellState()?.linked).toBe(0);
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 1000, y0: 1000, x1: 1100, y1: 1050, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[0]?.id ?? "", t.cols[0]?.id ?? ""], sizes: [] });
    expect(s.tool.cellState()?.linked).toBe(1);
  });
});

describe("appui long sur une case (menu de case, personnalisation-3 T7)", () => {
  it("appui long (500 ms, < 8 px) sur une case : menu ouvert avec l'entrée fit ; < 500 ms : saisie ouverte comme aujourd'hui", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const id = s.create(100, 200, 3, 3);
      s.tool.requestCommit();
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      expect(s.menuOpens).toHaveLength(1);
      expect(s.menuOpens[0]?.items.map((i) => i.id)).toEqual(["fit", "header"]);
      const opened = s.host.opened.length;
      s.tool.close(1, "end");
      expect(s.host.opened.length).toBe(opened);
      s.menuOpens[0]?.items[0]?.run();
      expect(s.last()).toEqual({ type: "SetTableOptions", id, fit: "shrink" });
      s.tool.begin(2, [at(120, 220)]);
      vi.advanceTimersByTime(300);
      s.tool.close(2, "end");
      expect(s.menuOpens).toHaveLength(1);
      expect(s.host.opened.length).toBe(opened + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("appui long : bouger de plus de 8 px avant 500 ms annule le menu", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      s.create(100, 200, 3, 3);
      s.tool.requestCommit();
      s.tool.begin(1, [at(120, 220)]);
      s.tool.extend(1, [at(135, 220)], []);
      vi.advanceTimersByTime(600);
      expect(s.menuOpens).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("image de fond de case (personnalisation-3 T9, S5)", () => {
  const ASSET = { id: "ab".repeat(32), name: "p.png", mime: "image/png", size: 3 };
  /** Tableau 2 × 2, cellule (0, 0) active, une image logée dedans. */
  function withImage() {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const t = s.table(id);
    const link: [string, string, string] = [id, t.rows[0]?.id ?? "", t.cols[0]?.id ?? ""];
    const image = s.doc.apply({ type: "AddImage", page: s.page, asset: ASSET, w: 100, h: 100, matrix: [1, 0, 0, 1, 0, 0] }).ids[0] ?? "";
    s.doc.apply({ type: "PlaceInCell", ids: [image], matrix: [1, 0, 0, 1, 0, 0], cell: link, sizes: [] });
    return { ...s, id, image, link };
  }

  it("S5 : Alt+I (act cell-image) met l'image logée la plus haute de la case active en fond, une étape ; undo : image revenue", () => {
    const s = withImage();
    s.tool.begin(1, [at(120, 220)]);
    s.tool.close(1, "end");
    s.tool.requestCommit();
    const before = s.doc.element(s.image)?.transform;
    s.tool.act("cell-image");
    expect(s.last()).toEqual({ type: "SetCellImage", id: s.id, row: s.link[1], col: s.link[2], from: s.image });
    expect(s.doc.element(s.image)).toBeNull();
    expect(s.table(s.id).cells.find((c) => c.row === s.link[1] && c.col === s.link[2])?.bg).toBe(ASSET.id);
    s.doc.undo();
    expect(s.doc.element(s.image)?.transform).toEqual(before);
    expect(s.doc.element(s.image)?.cell).toEqual(s.link);
    expect(s.table(s.id).cells.find((c) => c.bg !== undefined)).toBeUndefined();
  });

  it("S5 : sans image logée, cell-image ne fait rien", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const n = s.runs.length;
    s.tool.act("cell-image");
    expect(s.runs.length).toBe(n);
  });

  it("S5 : appui long (500 ms, < 8 px) sur une case : menu avec « Mettre en fond » et « Sortir » si une image y loge", () => {
    vi.useFakeTimers();
    try {
      const s = withImage();
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      expect(s.menuOpens).toHaveLength(1);
      const items = s.menuOpens[0]?.items ?? [];
      expect(items.map((i) => i.id)).toEqual(["fit", "cell-image", "unplace", "header"]);
      expect(items.map((i) => i.label)).toEqual(["Rétrécir", "Mettre en fond", "Sortir", "En-tête"]);
      s.tool.close(1, "end");
      items[2]?.run();
      expect(s.last()).toEqual({ type: "PlaceInCell", ids: [s.image], matrix: [1, 0, 0, 1, 0, 0], cell: null, sizes: [] });
      expect(s.doc.element(s.image)?.cell).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("D11 : « Sortir » du menu réduit la case comme Alt+Maj+Entrée (colonne 240, ligne 64, une seule PlaceInCell)", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const id = s.create(100, 200, 2, 2);
      s.tool.requestCommit();
      const t = s.table(id);
      const col = t.cols[0]?.id ?? "";
      const row = t.rows[0]?.id ?? "";
      const image = s.doc.apply({ type: "AddImage", page: s.page, asset: ASSET, w: 400, h: 300, matrix: [1, 0, 0, 1, 0, 0] }).ids[0] ?? "";
      s.doc.apply({ type: "PlaceInCell", ids: [image], matrix: [1, 0, 0, 1, 108, 208], cell: [id, row, col], sizes: [[id, "col", col, 416], [id, "row", row, 316]] });
      expect(s.table(id).cols[0]?.width).toBe(416);
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      const items = s.menuOpens[0]?.items ?? [];
      s.tool.close(1, "end");
      items.find((i) => i.id === "unplace")?.run();
      const cmd = s.last();
      expect(cmd?.type === "PlaceInCell" && cmd.cell === null && cmd.sizes.length).toBe(2);
      expect(s.table(id).cols[0]?.width).toBe(240);
      expect(s.table(id).rows[0]?.height).toBe(64);
    } finally {
      vi.useRealTimers();
    }
  });

  it("menu ouvert (appui tenu) : le glisser n'étend plus la plage", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      s.create(100, 200, 2, 2);
      s.tool.requestCommit();
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      expect(s.menuOpens).toHaveLength(1);
      s.tool.extend(1, [at(400, 290)], []);
      expect(s.tool.cellState()?.range).toBeNull();
      s.tool.close(1, "end");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("outil Tableau — TB1 tirer une bordure (D13, S6)", () => {
  const sizes = (s: ReturnType<typeof setup>, id: string) => ({ w: s.table(id).cols.map((c) => c.width), h: s.table(id).rows.map((r) => r.height) });
  /** 3 × 3 en (100, 200), case (1, 1) active, saisie fermée. */
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.tool.requestCommit();
    s.click(100 + 240 + 120, 200 + 64 + 32);
    s.tool.requestCommit();
    return { s, id };
  };
  it("S6 : poignée droite tirée de 100 : une SetTableLineSizes au relâché, colonne 1 = 340, une étape", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [at(580, 296)]);
    s.tool.extend(3, [at(630, 296)], []);
    s.tool.extend(3, [at(680, 296)], []);
    expect(s.runs.length).toBe(n);
    s.tool.close(3, "end");
    expect(s.runs.length).toBe(n + 1);
    const col = s.table(id).cols[1]?.id ?? "";
    expect(s.last()).toEqual({ type: "SetTableLineSizes", id, cols: [[col, 340]], rows: [] });
    expect(sizes(s, id).w).toEqual([240, 340, 240]);
    s.doc.undo();
    expect(sizes(s, id).w).toEqual([240, 240, 240]);
  });
  it("TB1 : bord intérieur pris à 5 px (souris ou doigt), ligne 0 tirée de 30 vers le bas", () => {
    const { s, id } = ready();
    s.tool.begin(3, [at(150, 200 + 64 + 5)]);
    s.tool.extend(3, [at(150, 200 + 64 + 35)], []);
    s.tool.close(3, "end");
    expect(sizes(s, id).h).toEqual([94, 64, 64]);
  });
  it("TB1 : jamais sous l'objet logé ; jamais sous 2 × marge + 24", () => {
    const { s, id } = ready();
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 100 + 240 + 8, y0: 200 + 64 + 8, x1: 100 + 240 + 208, y1: 200 + 64 + 48, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[1]?.id ?? "", t.cols[1]?.id ?? ""], sizes: [] });
    s.tool.begin(3, [at(580, 296)]);
    s.tool.extend(3, [at(300, 296)], []);
    s.tool.close(3, "end");
    expect(sizes(s, id).w[1]).toBe((s.doc.bounds([o])?.x1 ?? 0) - (s.doc.bounds([o])?.x0 ?? 0) + 16);
    s.tool.begin(4, [at(100 + 240, 230)]);
    s.tool.extend(4, [at(0, 230)], []);
    s.tool.close(4, "end");
    expect(sizes(s, id).w[0]).toBe(40);
  });
  it("TB1 : colonne rétrécie : les lignes dont le texte se replie regrandissent dans la même commande", () => {
    const { s, id } = ready();
    s.click(100 + 120, 200 + 32);
    s.type("abcde fghij klmno pqrs");
    s.tool.requestCommit();
    s.tool.begin(3, [at(100 + 240, 230)]);
    s.tool.extend(3, [at(100 + 140, 230)], []);
    s.tool.close(3, "end");
    const last = s.last();
    expect(last?.type).toBe("SetTableLineSizes");
    expect(last?.type === "SetTableLineSizes" ? last.rows.map((r) => r[0]) : []).toEqual([s.table(id).rows[0]?.id]);
    expect(sizes(s, id).h[0]).toBeGreaterThan(64);
  });
  it("TB1 : geste annulé (cancel) : aucune commande ; aucun mouvement : aucune commande, aucune saisie ouverte", () => {
    const { s } = ready();
    const n = s.runs.length;
    const opened = s.host.opened.length;
    s.tool.begin(3, [at(580, 296)]);
    s.tool.extend(3, [at(680, 296)], []);
    s.tool.close(3, "cancel");
    s.tool.begin(4, [at(580, 296)]);
    s.tool.close(4, "end");
    expect(s.runs.length).toBe(n);
    expect(s.host.opened.length).toBe(opened);
  });
  it("TB1 clavier : col-wider + 8, row-shorter jamais sous 64 ; uniform garde les objets", () => {
    const { s, id } = ready();
    s.tool.act("col-wider");
    expect(sizes(s, id).w).toEqual([240, 248, 240]);
    s.tool.act("row-shorter");
    expect(sizes(s, id).h).toEqual([64, 64, 64]);
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 0, y0: 0, x1: 400, y1: 300, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[0]?.id ?? "", t.cols[0]?.id ?? ""], sizes: [] });
    s.tool.act("uniform");
    const b = s.doc.bounds([o]);
    expect(Math.min(...sizes(s, id).w)).toBeGreaterThanOrEqual((b?.x1 ?? 0) - (b?.x0 ?? 0) + 16);
    expect(Math.min(...sizes(s, id).h)).toBeGreaterThanOrEqual((b?.y1 ?? 0) - (b?.y0 ?? 0) + 16);
  });
  it("TB1 live : la case active publie ses deux poignées dans l'aperçu", () => {
    const { s } = ready();
    // Les poignées de déplacement (D18) s'ajoutent à celles de taille : ce test lit les deux de taille.
    expect(s.tool.live().overlay?.grips?.filter((g) => g.kind === "col" || g.kind === "row")).toEqual([{ x: 580, y: 296, kind: "col" }, { x: 460, y: 328, kind: "row" }]);
  });
  it("TB1 : le minimum est lu une fois à l'armement, aucun parcours du document par mouvement", () => {
    const { s } = ready();
    for (let i = 0; i < 15; i++) s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 900 + i, y0: 900, x1: 920 + i, y1: 920, style: { color: "#000000", width: 4 }, fill: null });
    const spy = vi.spyOn(s.doc, "element");
    s.tool.begin(3, [at(580, 296)]);
    const n0 = spy.mock.calls.length;
    for (let i = 1; i <= 3; i++) s.tool.extend(3, [at(580 + 10 * i, 296)], []);
    expect(spy.mock.calls.length - n0).toBeLessThanOrEqual(12);
    s.tool.close(3, "cancel");
    spy.mockRestore();
  });
  it("TB1 : appui immobile sur un bord intérieur : la saisie de la cellule s'ouvre, aucune taille écrite", () => {
    const { s } = ready();
    const opened = s.host.opened.length;
    const n = s.runs.length;
    s.tool.begin(3, [at(100 + 240 + 3, 232)]);
    s.tool.close(3, "end");
    expect(s.host.opened.length).toBe(opened + 1);
    expect(s.runs.length).toBe(n);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1 });
  });
  it("TB1 : un bord de case de moins de 24 px n'a pas de poignée", () => {
    const s = setup();
    const id = s.doc.apply({ type: "AddTable", page: s.page, x: 100, y: 200, cols: 3, rows: 3, colWidth: 240, rowHeight: 20, color: "#000000", size: 36 }).ids[0] ?? "";
    expect(s.table(id).rows[0]?.height).toBe(20);
    s.click(150, 210);
    s.tool.requestCommit();
    expect(s.tool.live().overlay?.grips?.map((g) => g.kind).filter((k) => k === "col" || k === "row")).toEqual(["row"]);
  });
  const narrowCols = () => {
    const s = setup();
    const id = s.doc.apply({ type: "AddTable", page: s.page, x: 100, y: 200, cols: 3, rows: 3, colWidth: 40, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    s.click(110, 210);
    s.tool.requestCommit();
    return { s, id };
  };
  it("TB1 : la cible de la poignée est bornée au quart de la colonne : à 8 px, elle se prend", () => {
    const { s, id } = narrowCols();
    s.tool.begin(4, [at(148, 232)]);
    s.tool.extend(4, [at(178, 232)], []);
    s.tool.close(4, "end");
    expect(s.last()?.type).toBe("SetTableLineSizes");
    expect(s.table(id).cols[0]?.width).toBe(70);
  });
  it("TB1 : la cible de la poignée est bornée au quart de la colonne : à 15 px, elle ne se prend pas", () => {
    const { s } = narrowCols();
    const n = s.runs.length;
    s.tool.begin(3, [at(155, 232)]);
    s.tool.extend(3, [at(185, 232)], []);
    s.tool.close(3, "end");
    expect(s.runs.slice(n).some((c) => c.type === "SetTableLineSizes")).toBe(false);
  });
  it("TB1 (C10b) : tableau réduit à 0,15 (cases 36 × 9,6 px) : un clic au centre de la case voisine de la case active l'active, il n'arme ni poignée ni bordure", () => {
    const s = setup();
    const id = s.doc.apply({ type: "AddTable", page: s.page, x: 0, y: 0, cols: 6, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    s.doc.apply({ type: "Transform", ids: [id], matrix: [0.15, 0, 0, 0.15, 0, 0] });
    const centre = (row: number, col: number): [number, number] => [36 * col + 18, 9.6 * row + 4.8];
    s.click(...centre(0, 2));
    s.tool.requestCommit();
    const n = s.runs.length;
    s.click(...centre(0, 3));
    s.tool.requestCommit();
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 3 });
    expect(s.runs.length).toBe(n);
  });


});

describe("outil Tableau — TB2 en-tête et D35", () => {
  it("PR 74 : une étape par geste : header-toggle, un seul undo rend la ligne normale", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const n = s.runs.length;
    s.tool.act("header-toggle");
    expect(s.runs.length).toBe(n + 1);
    expect(s.table(id).header).toBe(true);
    s.doc.undo();
    expect(s.table(id).header).toBeUndefined();
  });
  it("PR 74 : tableau à en-tête : le menu de case propose « Retirer l'en-tête »", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const id = s.create(100, 200, 3, 3);
      s.tool.requestCommit();
      s.doc.apply({ type: "SetTableOptions", id, header: true });
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      expect(s.menuOpens[0]?.items.find((i) => i.id === "header")?.label).toBe("Retirer l'en-tête");
      s.tool.close(1, "end");
    } finally {
      vi.useRealTimers();
    }
  });
  it("PR 74 : D35 sur une plage : un objet dans une case non active de la plage refuse Ombrer", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 1000, y0: 1000, x1: 1100, y1: 1050, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[0]?.id ?? "", t.cols[1]?.id ?? ""], sizes: [] });
    s.click(120, 220);
    s.tool.requestCommit();
    s.setShift(true);
    s.click(100 + 240 + 120, 220);
    s.setShift(false);
    expect(s.tool.cellState()?.range).toEqual({ r0: 0, c0: 0, r1: 0, c1: 1 });
    const n = s.runs.length;
    s.tool.act("shade");
    expect(s.runs.length).toBe(n);
    expect(s.notices).toEqual(["Retirez d'abord les objets de la case."]);
  });
  it("TB2 : header-toggle écrit header vrai puis faux, une étape chacun ; cellState.header suit", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    s.tool.act("header-toggle");
    expect(s.last()).toEqual({ type: "SetTableOptions", id, header: true });
    expect(s.tool.cellState()?.header).toBe(true);
    s.tool.act("header-toggle");
    expect(s.last()).toEqual({ type: "SetTableOptions", id, header: false });
    expect(s.tool.cellState()?.header).toBe(false);
  });
  it("TB2 : le menu de case propose « En-tête »", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const id = s.create(100, 200, 3, 3);
      s.tool.requestCommit();
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      const item = s.menuOpens[0]?.items.find((i) => i.id === "header");
      expect(item?.label).toBe("En-tête");
      s.tool.close(1, "end");
      item?.run();
      expect(s.last()).toEqual({ type: "SetTableOptions", id, header: true });
    } finally {
      vi.useRealTimers();
    }
  });
  it("D35 : Ombrer refusé sur une case à objet : aucune commande, message ; case sans objet : ombrée", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 1000, y0: 1000, x1: 1100, y1: 1050, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[0]?.id ?? "", t.cols[0]?.id ?? ""], sizes: [] });
    s.click(120, 220);
    s.tool.requestCommit();
    const n = s.runs.length;
    s.tool.act("shade");
    expect(s.runs.length).toBe(n);
    expect(s.notices).toEqual(["Retirez d'abord les objets de la case."]);
    s.click(100 + 240 + 120, 220);
    s.tool.requestCommit();
    s.tool.act("shade");
    expect(s.last()?.type).toBe("SetTableShade");
  });
});

describe("outil Tableau — S7 ajuster au contenu (D14, DS7)", () => {
  /** 3 × 3 en (100, 200), « Photosynthèse » en (0, 0), case (0, 0) active, saisie fermée. */
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.type("Photosynthèse");
    s.tool.requestCommit();
    s.click(100 + 120, 200 + 32);
    s.tool.requestCommit();
    return { s, id };
  };
  it("S7 : double appui sur la poignée droite : colonne 0 = 13 × 10 + 16, une commande", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [atT(340, 232, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(342, 232, 1200)]);
    s.tool.close(4, "end");
    expect(s.runs.length).toBe(n + 1);
    expect(s.last()?.type).toBe("SetTableLineSizes");
    expect(s.table(id).cols.map((c) => c.width)).toEqual([146, 240, 240]);
  });
  it("S7 : deux appuis à 400 ms, puis à 20 px : aucun ajustement", () => {
    const { s, id } = ready();
    s.tool.begin(3, [atT(340, 232, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(340, 232, 1400)]);
    s.tool.close(4, "end");
    s.tool.begin(5, [atT(340, 252, 1500)]);
    s.tool.close(5, "end");
    expect(s.table(id).cols.map((c) => c.width)).toEqual([240, 240, 240]);
  });
  it("S7 : double appui sur la bordure intérieure de la ligne 0 (saisie ouverte au premier) : validée sans écrire, ligne ajustée", () => {
    const { s, id } = ready();
    s.doc.apply({ type: "SetTableLineSizes", id, cols: [], rows: [[s.table(id).rows[0]?.id ?? "", 150]] });
    const n = s.runs.length;
    s.tool.begin(3, [atT(450, 350, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(451, 350, 1150)]);
    s.tool.close(4, "end");
    expect(s.runs.slice(n).map((c) => c.type)).toEqual(["SetTableLineSizes"]);
    expect(s.table(id).rows[0]?.height).toBe(64);
  });
  it("S7 : Alt+A (fit-content) : colonne et ligne de la case active en une SetTableLineSizes", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    s.tool.act("fit-content");
    expect(s.runs.length).toBe(n + 1);
    expect(s.last()?.type).toBe("SetTableLineSizes");
    expect(s.table(id).cols[0]?.width).toBe(146);
    expect(s.table(id).rows[0]?.height).toBe(64);
  });
});

describe("outil Tableau — D15 alignement (S8)", () => {
  it("D15 : look ha sur une plage : une SetTableLook ; ha-next tourne gauche → centre → droite → gauche", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    s.setShift(true);
    s.click(100 + 240 + 120, 232);
    s.setShift(false);
    const before = s.runs.length;
    s.tool.look({ key: "ha", value: "center" });
    const t = s.table(id);
    expect(s.runs.length).toBe(before + 1);
    expect(s.last()).toEqual({ type: "SetTableLook", id, from: { row: t.rows[0]?.id, col: t.cols[0]?.id }, to: { row: t.rows[0]?.id, col: t.cols[1]?.id }, look: { key: "ha", value: "center" } });
    s.tool.act("ha-next");
    expect(s.tool.cellState()?.ha).toBe("right");
    s.tool.act("ha-next");
    expect(s.tool.cellState()?.ha).toBe("left");
    s.tool.act("va-next");
    expect(s.tool.cellState()?.va).toBe("middle");
  });
  it("D15 : saisie ouverte au cadre aligné : case milieu-centre → boîte descendue, align center", () => {
    const s = setup();
    const id = s.create(100, 200, 1, 1);
    s.type("ab");
    s.tool.requestCommit();
    const t = s.table(id);
    s.doc.apply({ type: "SetTableLineSizes", id, cols: [], rows: [[t.rows[0]?.id ?? "", 164]] });
    const c = { row: t.rows[0]?.id ?? "", col: t.cols[0]?.id ?? "" };
    s.doc.apply({ type: "SetTableLook", id, from: c, to: c, look: { key: "ha", value: "center" } });
    s.doc.apply({ type: "SetTableLook", id, from: c, to: c, look: { key: "va", value: "middle" } });
    s.click(220, 280);
    const o = s.host.last();
    expect(o.align).toBe("center");
    expect(o.matrix).toEqual([1, 0, 0, 1, 108, 208 + 51.5]);
    expect(o.boxWidth).toBe(224);
  });
});

describe("outil Tableau — S9 bordures (DS4)", () => {
  it("S9 : Alt+B pose [couleur du style, 4, solid] sur la plage ; Alt+Maj+B pose none ; cellState.border suit", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    s.tool.act("border-set");
    expect(s.last()).toMatchObject({ type: "SetTableLook", id, look: { key: "border", value: ["#000000", 4, "solid"] } });
    expect(s.tool.cellState()?.border).toEqual(["#000000", 4, "solid"]);
    s.tool.act("border-none");
    expect(s.tool.cellState()?.border).toEqual(["#000000", 4, "none"]);
  });
});

describe("outil Tableau — S11 déplacer une ligne (D18, DS8)", () => {
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.type("a");
    s.tool.navigate("down");
    s.type("b");
    s.tool.navigate("down");
    s.type("c");
    s.tool.requestCommit();
    return { s, id };
  };
  it("S11 : poignée de la ligne 2 (22 px à gauche du tableau) tirée sur la ligne 0 : une ReorderTableLines au relâché, c, a, b", () => {
    const { s } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 100)], []);
    s.tool.extend(3, [at(100 - 22, 200 + 32)], []);
    expect(s.runs.length).toBe(n);
    s.tool.close(3, "end");
    expect(s.runs.length).toBe(n + 1);
    expect(s.last()?.type).toBe("ReorderTableLines");
    expect(s.tool.cellState()?.column).toEqual(["c", "a", "b"]);
    s.doc.undo();
    expect(s.tool.cellState()?.column).toEqual(["a", "b", "c"]);
  });
  it("S11 : pendant le glisser, la ligne d'arrivée est cadrée (target)", () => {
    const { s } = ready();
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 32)], []);
    expect(s.tool.live().overlay?.target).toEqual({ x0: 100, y0: 200, x1: 820, y1: 264 });
    s.tool.close(3, "cancel");
  });
  it("S11 : geste annulé, ou relâché sur sa propre ligne : aucune commande", () => {
    const { s } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 32)], []);
    s.tool.close(3, "cancel");
    s.tool.begin(4, [at(100 - 22, 200 + 160)]);
    s.tool.close(4, "end");
    expect(s.runs.length).toBe(n);
  });
  it("S11 : zone coupée : message, aucune commande", () => {
    const { s, id } = ready();
    const t = s.table(id);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: t.rows[0]?.id ?? "", col: t.cols[1]?.id ?? "" }, to: { row: t.rows[1]?.id ?? "", col: t.cols[1]?.id ?? "" } });
    const n = s.runs.length;
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 96)], []);
    s.tool.close(3, "end");
    expect(s.runs.length).toBe(n);
    expect(s.notices).toContain("Une cellule fusionnée empêche ce déplacement.");
  });
  it("S11 : Ctrl+Maj+↑ (row-up) : la ligne 2 monte d'un rang : a, c, b ; col-right : la colonne 0 passe en 1", () => {
    const { s, id } = ready();
    s.tool.act("row-up");
    expect(s.tool.cellState()?.column).toEqual(["a", "c", "b"]);
    const c0 = s.table(id).cols[0]?.id;
    s.tool.act("col-right");
    expect(s.table(id).cols[1]?.id).toBe(c0);
  });
  it("S11 : poignées de déplacement dessinées avec celles de taille (row-move, col-move)", () => {
    const { s } = ready();
    expect((s.tool.live().overlay?.grips ?? []).map((g) => g.kind).sort()).toEqual(["col", "col-move", "row", "row-move"]);
  });
});
