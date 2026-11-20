/**
 * Outil Tableau (C10a, T6 à T12 ; C10b, F3 à F9, F14 à F16) : clic hors d'un tableau → grille de choix au point ; choix
 * → AddTable, saisie ouverte sur la première cellule. Appui sur un tableau → le plus haut sous le point, même sous
 * l'encre (I2) : sa cellule (l'ancre d'une zone) devient active ; au relâché, sans changement de cellule, la saisie
 * s'ouvre (F14, HB-12) ; un glisser vers une autre cellule du même tableau, ou Maj+clic, fait une plage, élargie aux
 * zones qu'elle touche. Un appui pendant une saisie ouverte valide seulement. Une SetTableCell par validation, hauteur
 * exigée mesurée comme le dessin, à la largeur de la zone (T5, F7, B1) ; Tab, Maj+Tab, flèches au bord par `navigate`
 * (DAC3, F16) ; porte IME partagée avec l'outil Texte. Fusionner, Diviser, Ombrer, Désombrer, pastilles,
 * insertions et suppressions agissent sur la plage, sinon sur la zone de la cellule active. Cellule active et plage
 * tenues par ids, retirées par `prune` quand elles disparaissent (I1).
 */
import type { CellIds, Command, Matrix, TableAxis, TableData, TextSpan } from "../../core/api";
import { TABLE_MAX_LINES } from "../../core/api";
import { sameSpans } from "../../core/rich-text";
import type { FormatAction, FormatState } from "../rich-edit";
import { composeMatrix, translateMatrix } from "../../core/shapes";
import { screenToWorld } from "../camera";
import { EMPTY_OVERLAY } from "../render/overlay";
import {
  anchorOf,
  cellContent,
  cellHeight,
  cellInnerBox,
  cellOf,
  cellRect,
  expandRange,
  mergeAt,
  rangeCells,
  rangeRect,
  rangeSize,
  rowHeightsFor,
  step,
  tableAt,
  TABLE_COL_WIDTH,
  TABLE_ROW_HEIGHT,
  TABLE_SHADE_COLOR,
  type Cell,
  type CellRef,
  type Range,
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

/** Fond de la zone de saisie d'une cellule sans remplissage, quand la page n'a pas de fond lisible (HC10-10). */
export const CELL_EDITOR_BACKGROUND = "#ffffff";

/** Écart sous lequel deux tailles sont égales (Uniformiser, T14) : la moyenne de n tailles égales diffère d'un arrondi. */
const SIZE_EPSILON = 1e-6;
const sameSize = (a: number, b: number): boolean => Math.abs(a - b) <= SIZE_EPSILON;

/** Cellule retrouvée dans le document : son tableau, sa matrice, les rangs de son ancre. */
interface Located {
  readonly ref: CellRef;
  readonly transform: Matrix;
  readonly table: TableData;
  readonly cell: Cell;
}
/** Saisie ouverte : la cellule (par ids), son texte à l'ouverture, la largeur (de la zone) et la taille pour la mesure. */
interface Opened {
  readonly ref: CellRef;
  readonly initial: string;
  /** Segments à l'ouverture (C7b, R6). */
  readonly initialSpans: readonly TextSpan[];
  readonly colWidth: number;
  readonly size: number;
}
/** Appui sur une cellule (F14) : le relâché décide (ouvrir, ou rien après une plage). */
interface Press {
  readonly pointerId: number;
  readonly id: string;
  readonly start: Cell;
  moved: boolean;
}

export function createTableTool(ctx: ToolContext, editor: TextEditorHost, picker: TablePicker, style: () => TextStyle, measure: Measure): TableTool {
  let active: CellRef | null = null;
  /** Autre coin de la plage (F14), dans le tableau de `active` ; null : aucune plage. */
  let corner: CellRef | null = null;
  let press: Press | null = null;
  /** Pointeur dont l'appui a seulement validé la saisie ou fermé la grille : ni plage, ni ouverture au relâché. */
  let swallowed: number | null = null;
  let opened: Opened | null = null;
  let live: LivePart = NO_LIVE;
  const gate = createCommitGate(() => commit(), () => opened !== null);

  const idsAt = (t: TableData, row: number, col: number): CellIds | null => {
    const r = t.rows[row];
    const c = t.cols[col];
    return r && c ? { row: r.id, col: c.id } : null;
  };
  const refAt = (id: string, t: TableData, row: number, col: number): CellRef | null => {
    const ids = idsAt(t, row, col);
    return ids === null ? null : { id, ...ids };
  };
  /** Ids des deux coins d'une plage ; null si l'un n'est plus lu. */
  const cornersOf = (t: TableData, r: Range): { from: CellIds; to: CellIds } | null => {
    const from = idsAt(t, r.r0, r.c0);
    const to = idsAt(t, r.r1, r.c1);
    return from !== null && to !== null ? { from, to } : null;
  };

  /** Cellule active retrouvée, ramenée à l'ancre de sa zone (F16). */
  const locate = (ref: CellRef | null): Located | null => {
    if (ref === null) return null;
    const el = ctx.doc.element(ref.id);
    if (el?.kind !== "table") return null;
    const raw = cellOf(el.table, ref);
    if (raw === null) return null;
    const cell = anchorOf(el.table, raw);
    const anchor = refAt(ref.id, el.table, cell.row, cell.col);
    return anchor === null ? null : { ref: anchor, transform: el.transform, table: el.table, cell };
  };

  /** Plage en rangs, élargie aux zones (F14) ; null sans coin, coin d'un autre tableau ou disparu. */
  const rangeOf = (at: Located): Range | null => {
    if (corner === null || corner.id !== at.ref.id) return null;
    const b = cellOf(at.table, corner);
    return b === null ? null : expandRange(at.table, at.cell, b);
  };
  /** Zone de la cellule active (une cellule simple : elle-même). */
  const zoneOf = (at: Located): Range => mergeAt(at.table, at.cell) ?? { r0: at.cell.row, c0: at.cell.col, r1: at.cell.row, c1: at.cell.col };

  /** Cadre de la plage, sinon de la cellule active (boîte monde de ses quatre coins), redemandé à chaque changement. */
  const refresh = (): void => {
    const at = locate(active);
    const r = at === null ? null : rangeOf(at);
    live =
      at === null
        ? NO_LIVE
        : { ...NO_LIVE, overlay: { ...EMPTY_OVERLAY, frame: transformBounds(at.transform, r === null ? cellRect(at.table, at.cell) : rangeRect(at.table, r)) } };
    ctx.requestFrame?.();
  };

  const setActive = (ref: CellRef | null): void => {
    active = ref;
    corner = null;
    refresh();
    ctx.stateChanged?.();
  };

  const setCorner = (ref: CellRef | null): void => {
    corner = ref;
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

  /** Ouvre la saisie sur la cellule active : coin intérieur de la zone, largeur de la zone moins les marges, fond. */
  const openActive = (): void => {
    const at = locate(active);
    if (at === null) {
      setActive(null);
      return;
    }
    active = at.ref;
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
        background: fill ?? ctx.doc.page(ctx.page())?.background ?? CELL_EDITOR_BACKGROUND,
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

  /** − Ligne / − Colonne (T7, HC10-17, F6) : les lignes `i0..=i1` en une commande ; la voisine (après, sinon avant)
   *  devient active avant la commande, pour que `prune` la garde ; refus du cœur : la cellule d'avant revient. */
  const removeLines = (ref: CellRef, axis: TableAxis, ids: readonly string[], i0: number, i1: number): void => {
    const line = ids[i0];
    const last = ids[i1];
    const near = ids[i1 + 1] ?? ids[i0 - 1];
    if (ids.length - (i1 - i0 + 1) < 1 || line === undefined || last === undefined || near === undefined) return;
    active = axis === "row" ? { ...ref, row: near } : { ...ref, col: near };
    corner = null;
    const cmd: Command = i1 > i0 ? { type: "RemoveTableLine", id: ref.id, axis, line, to: last } : { type: "RemoveTableLine", id: ref.id, axis, line };
    if (ctx.run(cmd) === null) active = ref;
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

  /** Fusionner (F3, PC19) : la plage (au moins deux cellules) ; l'ancre devient active, la plage est retirée. */
  const merge = (at: Located, r: Range | null): void => {
    if (r === null || rangeSize(r) < 2) return;
    const corners = cornersOf(at.table, r);
    if (corners === null) return;
    const { from, to } = corners;
    if (ctx.run({ type: "MergeTableCells", id: at.ref.id, from, to }) === null) return;
    active = { id: at.ref.id, ...from };
    corner = null;
  };

  /** Ombrer ou retirer l'ombrage (F9) sur la plage, sinon la zone active. */
  const shadeOver = (at: Located, span: Range, shade: string | null): void => {
    const corners = cornersOf(at.table, span);
    if (corners !== null) ctx.run({ type: "SetTableShade", id: at.ref.id, ...corners, shade });
  };

  /** Avant une action de la rangée : valide la saisie ouverte ; pendant une composition, rien (la touche appartient à
   *  l'IME, comme `navigate`), et l'action n'a pas lieu. */
  const settle = (): boolean => {
    if (gate.composing()) return false;
    gate.request();
    return true;
  };

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      press = null;
      // Appui pendant la saisie : valide seulement (T7 de C10a, F14), même s'il glisse ; grille ouverte : la ferme.
      if (opened !== null) {
        swallowed = pointerId;
        gate.request();
        return;
      }
      if (picker.isOpen()) {
        swallowed = pointerId;
        picker.close();
        return;
      }
      swallowed = null;
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      const hit = tableAt(ctx.doc, ctx.page(), x, y);
      if (hit !== null) {
        const ref = refAt(hit.id, hit.table, hit.cell.row, hit.cell.col);
        if (ref === null) return;
        const at = locate(active);
        // Maj+clic : plage de la cellule active au point (F14) ; sur la zone active elle-même (`hit.cell` et `at.cell`
        // sont des ancres, F16) : aucune plage, une zone seule n'en fait pas une.
        if (ctx.shift?.() === true && at !== null && at.ref.id === hit.id) {
          setCorner(hit.cell.row === at.cell.row && hit.cell.col === at.cell.col ? null : ref);
          return;
        }
        setActive(ref);
        press = { pointerId, id: hit.id, start: hit.cell, moved: false };
        return;
      }
      picker.open({ x: s.x, y: s.y }, (cols, rows) => create(x, y, cols, rows));
    },
    extend(pointerId, samples) {
      const p = press;
      const s = samples[samples.length - 1];
      if (p === null || p.pointerId !== pointerId || !s) return;
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      const hit = tableAt(ctx.doc, ctx.page(), x, y);
      if (hit === null || hit.id !== p.id) return;
      const same = hit.cell.row === p.start.row && hit.cell.col === p.start.col;
      if (same && !p.moved) return;
      p.moved = true;
      const ref = same ? null : refAt(hit.id, hit.table, hit.cell.row, hit.cell.col);
      if (ref?.row !== corner?.row || ref?.col !== corner?.col) setCorner(ref);
    },
    frame() {
      // rien à pousser
    },
    close(pointerId, how) {
      if (swallowed === pointerId) {
        swallowed = null;
        return;
      }
      const p = press;
      if (p === null || p.pointerId !== pointerId) return;
      press = null;
      // F14 : sans changement de cellule, le clic ouvre la saisie au relâché.
      if (how === "end" && !p.moved) openActive();
      // Geste interrompu (abort, cancel) après un glisser : la plage posée par `extend` est retirée, sinon le prochain
      // « Ombrer » ou « − Ligne » s'y appliquerait.
      if (how !== "end" && p.moved) setCorner(null);
    },
    live: () => live,
    active: () => false,
    leave() {
      gate.request();
      picker.close();
      press = null;
      swallowed = null;
      if (active !== null) setActive(null);
    },
    cell: () => active,
    cellState() {
      const at = locate(active);
      if (at === null) return null;
      const range = rangeOf(at);
      const t = at.table;
      const shaded = (range === null ? [at.cell] : rangeCells(t, range)).some((c) => {
        const r = t.rows[c.row];
        const k = t.cols[c.col];
        return r !== undefined && k !== undefined && cellContent(t, r.id, k.id).shade !== null;
      });
      const zone = mergeAt(t, at.cell);
      return { id: at.ref.id, row: at.cell.row, col: at.cell.col, rows: t.rows.length, cols: t.cols.length, range, merged: zone !== null, zone, shaded };
    },
    act(a) {
      if (!settle()) return;
      const at = locate(active);
      if (at === null) return;
      const { ref, table: t } = at;
      const r = rangeOf(at);
      // Plage, sinon zone de la cellule active (F5, F6).
      const span = r ?? zoneOf(at);
      switch (a) {
        case "row-insert":
          ctx.run({ type: "InsertTableLine", id: ref.id, axis: "row", at: span.r1 + 1 });
          break;
        case "col-insert":
          ctx.run({ type: "InsertTableLine", id: ref.id, axis: "col", at: span.c1 + 1 });
          break;
        case "row-remove":
          removeLines(ref, "row", t.rows.map((x) => x.id), span.r0, span.r1);
          break;
        case "col-remove":
          removeLines(ref, "col", t.cols.map((x) => x.id), span.c0, span.c1);
          break;
        case "uniform":
          uniform(ref.id, t);
          break;
        case "merge":
          merge(at, r);
          break;
        case "split":
          if (r === null && mergeAt(t, at.cell) !== null) ctx.run({ type: "SplitTableCell", id: ref.id, row: ref.row, col: ref.col });
          break;
        case "shade":
          shadeOver(at, span, TABLE_SHADE_COLOR);
          break;
        case "unshade":
          shadeOver(at, span, null);
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
      const r = rangeOf(at);
      const corners = r === null ? null : cornersOf(at.table, r);
      ctx.run(
        corners !== null
          ? { type: "SetTableFill", id: at.ref.id, row: corners.from.row, col: corners.from.col, to: corners.to, fill: color }
          : { type: "SetTableFill", id: at.ref.id, row: at.ref.row, col: at.ref.col, fill: color },
      );
      refresh();
      ctx.stateChanged?.();
    },
    clearCell() {
      if (opened !== null) return false;
      const at = locate(active);
      if (at === null) return false;
      ctx.run({ type: "SetTableCell", id: at.ref.id, row: at.ref.row, col: at.ref.col, content: "" });
      refresh();
      return true;
    },
    clearRange() {
      if (opened !== null || corner === null) return false;
      setCorner(null);
      return true;
    },
    prune() {
      if (active === null) return;
      const at = locate(active);
      if (at !== null) {
        if (corner !== null && cellOf(at.table, corner) === null) corner = null;
        refresh();
        ctx.stateChanged?.();
        return;
      }
      // I1 : tableau, ligne ou colonne disparus : cellule retirée, saisie fermée sans rien écrire.
      active = null;
      corner = null;
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
