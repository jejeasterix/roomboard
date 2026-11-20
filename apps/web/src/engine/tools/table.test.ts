import { describe, expect, it } from "vitest";
import type { Command, TableData, TextSpan } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { editSpans, plainSpans } from "../../core/rich-text";
import type { FormatAction, FormatState } from "../rich-edit";
import type { InputSample } from "../input/sampler";
import { cellHeight } from "../table-geom";
import type { Measure } from "../text-layout";
import { createTableTool, type TablePicker } from "./table";
import type { TextEditorHost, TextEditSession } from "./text";
import type { TableTool, ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
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
    requestFrame: () => undefined,
    stateChanged: () => {
      changes++;
    },
  };
  const tool = createTableTool(ctx, host, picker, () => ({ color: "#000000", size: 36 }), narrow);
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
  return { doc, page, runs, host, picker, tool, click, create, table, last, type: (s: string) => (host.text = s), changes: () => changes };
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
