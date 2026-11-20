/**
 * Outil Tableau (C10a, T6 à T12) : clic hors d'un tableau → grille de choix au point ; choix → AddTable, saisie ouverte
 * sur la première cellule. Clic sur un tableau → le plus haut sous le point, même sous l'encre (I2) : sa cellule devient
 * active et s'ouvre dans la zone de saisie du lot 4, fond opaque (HC10-10). Une SetTableCell par validation, hauteur
 * exigée mesurée comme le dessin (T5, B1) ; Tab, Maj+Tab, flèches au bord par `navigate` (DAC3) ; porte IME partagée
 * avec l'outil Texte. Cellule active tenue par ids, retirée par `prune` quand elle disparaît (I1).
 */
import type { Matrix, TableAxis, TableData, TextSpan } from "../../core/api";
import { TABLE_MAX_LINES } from "../../core/api";
import { sameSpans } from "../../core/rich-text";
import type { FormatAction, FormatState } from "../rich-edit";
import { composeMatrix, translateMatrix } from "../../core/shapes";
import { screenToWorld } from "../camera";
import { EMPTY_OVERLAY } from "../render/overlay";
import {
  cellContent,
  cellHeight,
  cellInnerBox,
  cellOf,
  cellRect,
  rowHeightsFor,
  step,
  tableAt,
  TABLE_COL_WIDTH,
  TABLE_ROW_HEIGHT,
  type Cell,
  type CellRef,
} from "../table-geom";
import type { Measure } from "../text-layout";
import { createCommitGate } from "./commit-gate";
import { transformBounds } from "./handles";
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

/** Écart sous lequel deux tailles sont égales (Uniformiser, T14) : la moyenne de n tailles égales diffère d'un arrondi. */
const SIZE_EPSILON = 1e-6;
const sameSize = (a: number, b: number): boolean => Math.abs(a - b) <= SIZE_EPSILON;

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
  /** Segments à l'ouverture (C7b, R6). */
  readonly initialSpans: readonly TextSpan[];
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
    live = at === null ? NO_LIVE : { ...NO_LIVE, overlay: { ...EMPTY_OVERLAY, frame: transformBounds(at.transform, cellRect(at.table, at.cell)) } };
    ctx.requestFrame?.();
  };

  const setActive = (ref: CellRef | null): void => {
    active = ref;
    refresh();
    ctx.stateChanged?.();
  };

  /** Écrit la cellule ouverte (une SetTableCell au plus, T9, portant les segments de la zone, C7b R6) ; la saisie est
   *  fermée avant `editor.close()`. */
  function commit(): void {
    const o = opened;
    if (o === null) return;
    const content = editor.value();
    const spans = editor.spans();
    opened = null;
    gate.reset();
    editor.close();
    // R6 : texte et segments inchangés : aucune commande ; mise en forme seule (S6) : la commande part.
    if (content !== o.initial || !sameSpans(spans, o.initialSpans)) {
      ctx.run({
        type: "SetTableCell",
        id: o.ref.id,
        row: o.ref.row,
        col: o.ref.col,
        content,
        rowHeight: cellHeight(spans, o.size, o.colWidth, measure),
        spans,
      });
    }
    refresh();
    ctx.stateChanged?.();
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
    const inner = cellInnerBox(at.table, at.cell);
    const { text, spans, fill } = cellContent(at.table, at.ref.row, at.ref.col);
    opened = { ref: at.ref, initial: text, initialSpans: spans, colWidth, size: at.table.size };
    gate.reset();
    editor.open(
      {
        page: ctx.page(),
        id: at.ref.id,
        matrix: composeMatrix(at.transform, translateMatrix(inner.x, inner.y)),
        boxWidth: inner.w,
        color: at.table.color,
        size: at.table.size,
        initial: text,
        spans,
        background: fill ?? CELL_EDITOR_BACKGROUND,
      },
      ctx.camera(),
    );
    ctx.stateChanged?.();
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

  /** Uniformiser (T11) : colonnes à la largeur moyenne ; lignes à max(hauteur moyenne, plus grande hauteur exigée).
   *  Déjà uniforme à un arrondi près : aucune étape (T14). */
  const uniform = (id: string, t: TableData): void => {
    const w = t.cols.reduce((s, c) => s + c.width, 0) / t.cols.length;
    const need = Math.max(...rowHeightsFor(t, t.cols.map(() => w), measure));
    const mean = t.rows.reduce((s, r) => s + r.height, 0) / t.rows.length;
    const h = Math.max(mean, need);
    if (t.cols.every((c) => sameSize(c.width, w)) && t.rows.every((r) => sameSize(r.height, h))) return;
    ctx.run({ type: "SetTableSizes", id, colWidth: w, rowHeight: h });
  };

  /** Avant une action de la rangée : valide la saisie ouverte ; pendant une composition, rien (la touche appartient à
   *  l'IME, comme `navigate`), et l'action n'a pas lieu. */
  const settle = (): boolean => {
    if (gate.composing()) return false;
    gate.request();
    return true;
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
      if (!settle()) return;
      const at = locate(active);
      if (at === null) return;
      const { ref, table: t, cell: c } = at;
      switch (a) {
        case "row-insert":
          ctx.run({ type: "InsertTableLine", id: ref.id, axis: "row", at: c.row + 1 });
          break;
        case "col-insert":
          ctx.run({ type: "InsertTableLine", id: ref.id, axis: "col", at: c.col + 1 });
          break;
        case "row-remove":
          removeLine(ref, "row", t.rows.map((r) => r.id), c.row);
          break;
        case "col-remove":
          removeLine(ref, "col", t.cols.map((x) => x.id), c.col);
          break;
        case "uniform":
          uniform(ref.id, t);
          break;
        default:
          // Contrôle d'exhaustivité : une action ajoutée à `TableAction` sans cas ici ne compile pas.
          return a satisfies never;
      }
      refresh();
      ctx.stateChanged?.();
    },
    fill(color) {
      if (!settle()) return;
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
    format(a) {
      if (opened !== null && !gate.composing()) editor.format(a);
    },
    formatState: () => (opened === null ? null : editor.formatState()),
    formatChanged() {
      ctx.stateChanged?.();
    },
  };
}
