/**
 * Outil Tableau (C10a, T6 à T12) : clic hors d'un tableau → grille de choix au point ; choix → AddTable, saisie ouverte
 * sur la première cellule. Clic sur un tableau → le plus haut sous le point, même sous l'encre (I2) : sa cellule devient
 * active et s'ouvre dans la zone de saisie du lot 4, fond opaque (HC10-10). Une SetTableCell par validation, hauteur
 * exigée mesurée comme le dessin (T5, B1) ; Tab, Maj+Tab, flèches au bord par `navigate` (DAC3) ; porte IME partagée
 * avec l'outil Texte. Cellule active tenue par ids, retirée par `prune` quand elle disparaît (I1).
 */
import type { Matrix, TableAxis, TableData } from "../../core/api";
import { TABLE_MAX_LINES } from "../../core/api";
import { plainSpans } from "../../core/rich-text";
import { applyMatrix, composeMatrix, translateMatrix } from "../../core/shapes";
import { screenToWorld } from "../camera";
import { EMPTY_OVERLAY } from "../render/overlay";
import {
  cellContent,
  cellHeight,
  cellOf,
  cellRect,
  rowHeightsFor,
  step,
  tableAt,
  TABLE_COL_WIDTH,
  TABLE_PADDING,
  TABLE_ROW_HEIGHT,
  type Cell,
  type CellRef,
} from "../table-geom";
import type { Measure } from "../text-layout";
import { createCommitGate } from "./commit-gate";
import type { TextEditorHost, TextStyle } from "./text";
import { NO_LIVE, type LivePart, type TableTool, type ToolContext } from "./tool";

/** Grille de choix (hôte DOM : `app/table-picker.ts`, même forme que `TablePickerHost`) ; `at` en px CSS de la scène. */
export interface TablePicker {
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void;
  close(): void;
  isOpen(): boolean;
}

/** Fond de la zone de saisie d'une cellule sans remplissage (HC10-10). */
export const CELL_EDITOR_BACKGROUND = "#ffffff";

/** Cellule retrouvée dans le document : son tableau, sa matrice, ses rangs. */
interface Located {
  readonly ref: CellRef;
  readonly transform: Matrix;
  readonly table: TableData;
  readonly cell: Cell;
}
/** Saisie ouverte : la cellule (par ids), son texte à l'ouverture, la largeur et la taille pour la mesure. */
interface Opened {
  readonly ref: CellRef;
  readonly initial: string;
  readonly colWidth: number;
  readonly size: number;
}

export function createTableTool(ctx: ToolContext, editor: TextEditorHost, picker: TablePicker, style: () => TextStyle, measure: Measure): TableTool {
  let active: CellRef | null = null;
  let opened: Opened | null = null;
  let live: LivePart = NO_LIVE;
  const gate = createCommitGate(() => commit(), () => opened !== null);

  const locate = (ref: CellRef | null): Located | null => {
    if (ref === null) return null;
    const el = ctx.doc.element(ref.id);
    if (el?.kind !== "table") return null;
    const cell = cellOf(el.table, ref);
    return cell === null ? null : { ref, transform: el.transform, table: el.table, cell };
  };

  const refAt = (id: string, t: TableData, row: number, col: number): CellRef | null => {
    const r = t.rows[row];
    const c = t.cols[col];
    return r && c ? { id, row: r.id, col: c.id } : null;
  };

  /** Cadre de la cellule active (boîte monde de ses quatre coins), redemandé à chaque changement. */
  const refresh = (): void => {
    const at = locate(active);
    if (at === null) {
      live = NO_LIVE;
    } else {
      const r = cellRect(at.table, at.cell);
      const pts = [
        applyMatrix(at.transform, r.x0, r.y0),
        applyMatrix(at.transform, r.x1, r.y0),
        applyMatrix(at.transform, r.x1, r.y1),
        applyMatrix(at.transform, r.x0, r.y1),
      ];
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      live = { ...NO_LIVE, overlay: { ...EMPTY_OVERLAY, frame: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } } };
    }
    ctx.requestFrame?.();
  };

  const setActive = (ref: CellRef | null): void => {
    active = ref;
    refresh();
    ctx.stateChanged?.();
  };

  /** Écrit la cellule ouverte (une SetTableCell au plus, T9) ; la saisie est fermée avant `editor.close()`. */
  function commit(): void {
    const o = opened;
    if (o === null) return;
    const content = editor.value();
    opened = null;
    gate.reset();
    editor.close();
    if (content !== o.initial) {
      ctx.run({
        type: "SetTableCell",
        id: o.ref.id,
        row: o.ref.row,
        col: o.ref.col,
        content,
        rowHeight: cellHeight(content, o.size, o.colWidth, measure),
      });
    }
    refresh();
  }

  /** Ouvre la saisie sur la cellule active : coin intérieur, largeur de colonne moins les marges, fond de la cellule. */
  const openActive = (): void => {
    const at = locate(active);
    if (at === null) {
      setActive(null);
      return;
    }
    const r = cellRect(at.table, at.cell);
    const colWidth = r.x1 - r.x0;
    const { text, fill } = cellContent(at.table, at.ref.row, at.ref.col);
    opened = { ref: at.ref, initial: text, colWidth, size: at.table.size };
    gate.reset();
    editor.open(
      {
        page: ctx.page(),
        id: at.ref.id,
        matrix: composeMatrix(at.transform, translateMatrix(r.x0 + TABLE_PADDING, r.y0 + TABLE_PADDING)),
        boxWidth: Math.max(1, colWidth - 2 * TABLE_PADDING),
        color: at.table.color,
        size: at.table.size,
        initial: text,
        spans: plainSpans(text),
        background: fill ?? CELL_EDITOR_BACKGROUND,
      },
      ctx.camera(),
    );
  };

  /** Grille choisie (T6) : coin au point, décalé à gauche si le tableau dépasse la largeur de la page (T4, x ≥ 0). */
  const create = (x: number, y: number, cols: number, rows: number): void => {
    const page = ctx.page();
    const width = ctx.doc.page(page)?.width;
    if (width === undefined) return;
    const st = style();
    const x0 = Math.max(0, Math.min(x, width - cols * TABLE_COL_WIDTH));
    const id = ctx.run({ type: "AddTable", page, x: x0, y, cols, rows, colWidth: TABLE_COL_WIDTH, rowHeight: TABLE_ROW_HEIGHT, color: st.color, size: st.size })?.ids[0];
    const el = id === undefined ? null : ctx.doc.element(id);
    if (id === undefined || el?.kind !== "table") return;
    setActive(refAt(id, el.table, 0, 0));
    openActive();
  };

  /** − Ligne / − Colonne (T7, HC10-17) : la voisine (suivante, sinon précédente) devient active avant la commande, pour
   *  que `prune` la garde ; refus du cœur : la cellule d'avant revient. */
  const removeLine = (ref: CellRef, axis: TableAxis, ids: readonly string[], i: number): void => {
    const line = ids[i];
    const near = ids[i + 1] ?? ids[i - 1];
    if (ids.length <= 1 || line === undefined || near === undefined) return;
    active = axis === "row" ? { ...ref, row: near } : { ...ref, col: near };
    if (ctx.run({ type: "RemoveTableLine", id: ref.id, axis, line }) === null) active = ref;
  };

  /** Uniformiser (T11) : colonnes à la largeur moyenne ; lignes à max(hauteur moyenne, plus grande hauteur exigée). */
  const uniform = (id: string, t: TableData): void => {
    const w = t.cols.reduce((s, c) => s + c.width, 0) / t.cols.length;
    const need = Math.max(...rowHeightsFor(t, t.cols.map(() => w), measure));
    const mean = t.rows.reduce((s, r) => s + r.height, 0) / t.rows.length;
    ctx.run({ type: "SetTableSizes", id, colWidth: w, rowHeight: Math.max(mean, need) });
  };

  return {
    begin(_pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      // Clic pendant la saisie : valide seulement (comme l'outil Texte) ; grille ouverte : la ferme seulement.
      if (opened !== null) {
        gate.request();
        return;
      }
      if (picker.isOpen()) {
        picker.close();
        return;
      }
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      const hit = tableAt(ctx.doc, ctx.page(), x, y);
      if (hit !== null) {
        setActive(refAt(hit.id, hit.table, hit.cell.row, hit.cell.col));
        openActive();
        return;
      }
      picker.open({ x: s.x, y: s.y }, (cols, rows) => create(x, y, cols, rows));
    },
    extend() {
      // la saisie passe par la zone
    },
    frame() {
      // rien à pousser
    },
    close() {
      // le clic a tout fait au begin
    },
    live: () => live,
    active: () => false,
    leave() {
      gate.request();
      picker.close();
      if (active !== null) setActive(null);
    },
    cell: () => active,
    cellState() {
      const at = locate(active);
      return at === null ? null : { id: at.ref.id, row: at.cell.row, col: at.cell.col, rows: at.table.rows.length, cols: at.table.cols.length };
    },
    act(a) {
      if (opened !== null) commit();
      const at = locate(active);
      if (at === null) return;
      const { ref, table: t, cell: c } = at;
      if (a === "row-insert") ctx.run({ type: "InsertTableLine", id: ref.id, axis: "row", at: c.row + 1 });
      else if (a === "col-insert") ctx.run({ type: "InsertTableLine", id: ref.id, axis: "col", at: c.col + 1 });
      else if (a === "row-remove") removeLine(ref, "row", t.rows.map((r) => r.id), c.row);
      else if (a === "col-remove") removeLine(ref, "col", t.cols.map((x) => x.id), c.col);
      else uniform(ref.id, t);
      refresh();
      ctx.stateChanged?.();
    },
    fill(color) {
      if (opened !== null) commit();
      const at = locate(active);
      if (at === null) return;
      ctx.run({ type: "SetTableFill", id: at.ref.id, row: at.ref.row, col: at.ref.col, fill: color });
      refresh();
    },
    clearCell() {
      if (opened !== null) return false;
      const at = locate(active);
      if (at === null) return false;
      ctx.run({ type: "SetTableCell", id: at.ref.id, row: at.ref.row, col: at.ref.col, content: "" });
      refresh();
      return true;
    },
    prune() {
      if (active === null) return;
      if (locate(active) !== null) {
        refresh();
        return;
      }
      // I1 : tableau, ligne ou colonne disparus : cellule retirée, saisie fermée sans rien écrire.
      active = null;
      if (opened !== null) {
        opened = null;
        gate.reset();
        editor.close();
      }
      refresh();
      ctx.stateChanged?.();
    },
    navigate(move) {
      const o = opened;
      if (o === null || gate.composing()) return false;
      const at = locate(o.ref);
      if (at === null) return false;
      const next = step(at.table, at.cell, move);
      const tab = move === "next" || move === "prev";
      // Au bord : Tab est pris (la saisie reste ouverte), une flèche est rendue à la zone.
      if (next === null) return tab;
      // 64 lignes : Tab en dernière cellule est inerte, la saisie reste ouverte (T4).
      if (next === "add-row" && at.table.rows.length >= TABLE_MAX_LINES) return true;
      commit();
      if (next === "add-row") {
        if (ctx.run({ type: "InsertTableLine", id: o.ref.id, axis: "row", at: at.table.rows.length }) === null) return true;
        const el = ctx.doc.element(o.ref.id);
        setActive(el?.kind === "table" ? refAt(o.ref.id, el.table, el.table.rows.length - 1, 0) : null);
      } else {
        setActive(refAt(o.ref.id, at.table, next.row, next.col));
      }
      openActive();
      return true;
    },
    compositionStart() {
      gate.compositionStart();
    },
    compositionEnd() {
      gate.compositionEnd();
    },
    requestCommit() {
      gate.request();
    },
  };
}
