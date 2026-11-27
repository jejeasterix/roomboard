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
import { applyMatrix, composeMatrix, invertMatrix, translateMatrix } from "../../core/shapes";
import type { CellMenu, CellMenuItem } from "../../ui/cell-menu";
import { screenToWorld, worldToScreen } from "../camera";
import { EMPTY_OVERLAY } from "../render/overlay";
import {
  anchorOf,
  cellContent,
  cellGrips,
  cellHeight,
  cellInnerBox,
  cellOf,
  cellRect,
  EDGE_SLOP_PX,
  expandRange,
  GRIP_PX,
  linkedBoxes,
  linkedIn,
  mergeAt,
  rangeCells,
  rangeRect,
  rangeSize,
  requiredSizes,
  SIZE_STEP,
  step,
  tableAt,
  tableEdgeAt,
  TABLE_COL_WIDTH,
  TABLE_ROW_HEIGHT,
  TABLE_SHADE_COLOR,
  type Cell,
  type CellRef,
  type EdgeHit,
  type Range,
} from "../table-geom";
import type { Measure } from "../text-layout";
import type { CellDrop } from "./cell-drop";
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
  /** Appui long (T7) : point écran de départ, minuterie, menu ouvert (le relâché n'ouvre alors aucune saisie). */
  readonly sx: number;
  readonly sy: number;
  hold: ReturnType<typeof setTimeout> | null;
  held: boolean;
}

/** Bordure tirée (D13) : ligne ou colonne `index` du tableau `id`, coordonnée locale de départ, taille de départ. */
interface Resize {
  readonly pointerId: number;
  readonly id: string;
  readonly edge: EdgeHit;
  readonly start: number;
  readonly size0: number;
  size: number;
  /** Poignée ou bord hors tableau : tiré dès l'appui. Bord intérieur : tant que le doigt reste sous `HOLD_SLOP`, l'appui
   *  garde son sens de cellule (activer, ouvrir la saisie au relâché) ; au-delà, c'est une bordure tirée. */
  armed: boolean;
  readonly sx: number;
  readonly sy: number;
}

/** Appui long (G8) : durée et mouvement toléré en px écran. */
const HOLD_MS = 500;
const HOLD_SLOP = 8;

export function createTableTool(ctx: ToolContext, editor: TextEditorHost, picker: TablePicker, style: () => TextStyle, measure: Measure, menu?: CellMenu, cellDrop?: Pick<CellDrop, "place">): TableTool {
  let active: CellRef | null = null;
  /** Autre coin de la plage (F14), dans le tableau de `active` ; null : aucune plage. */
  let corner: CellRef | null = null;
  let press: Press | null = null;
  /** Pointeur dont l'appui a seulement validé la saisie ou fermé la grille : ni plage, ni ouverture au relâché. */
  let swallowed: number | null = null;
  let opened: Opened | null = null;
  let resize: Resize | null = null;
  const stopHold = (p: Press | null): void => {
    if (p?.hold != null) clearTimeout(p.hold);
    if (p !== null) p.hold = null;
  };
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

  /** Coordonnée locale (axe de la bordure) du point écran (sx, sy) dans le tableau de matrice `m`. */
  const localAlong = (m: Matrix, axis: "col" | "row", sx: number, sy: number): number | null => {
    const inv = invertMatrix(m);
    if (inv === null) return null;
    const [x, y] = screenToWorld(ctx.camera(), sx, sy);
    const [lx, ly] = applyMatrix(inv, x, y);
    return axis === "col" ? lx : ly;
  };

  /** Taille la plus petite de la ligne ou colonne (D13, D34) : taille exigée par le texte et les objets logés. */
  const minSize = (id: string, transform: Matrix, t: TableData, edge: EdgeHit): number => {
    const need = requiredSizes(t, linkedBoxes(ctx.doc, ctx.page(), { id, transform }), t.cols.map((c) => c.width), measure);
    return (edge.axis === "col" ? need.cols : need.rows)[edge.index] ?? 0;
  };

  /** Écrit la taille (D13) en une SetTableLineSizes ; colonne : les lignes qui exigent plus regrandissent dans la même
   *  commande. Même taille : aucune commande. */
  const resizeTo = (id: string, transform: Matrix, t: TableData, edge: EdgeHit, size: number): void => {
    const v = Math.max(size, minSize(id, transform, t, edge));
    if (edge.axis === "row") {
      const row = t.rows[edge.index];
      if (row === undefined || row.height === v) return;
      ctx.run({ type: "SetTableLineSizes", id, cols: [], rows: [[row.id, v]] });
      return;
    }
    const col = t.cols[edge.index];
    if (col === undefined || col.width === v) return;
    const widths = t.cols.map((c, i) => (i === edge.index ? v : c.width));
    const need = requiredSizes(t, linkedBoxes(ctx.doc, ctx.page(), { id, transform }), widths, measure);
    const rows = t.rows.flatMap((r, i): (readonly [string, number])[] => ((need.rows[i] ?? 0) > r.height ? [[r.id, need.rows[i] ?? 0]] : []));
    ctx.run({ type: "SetTableLineSizes", id, cols: [[col.id, v]], rows });
  };

  /** Bordure sous le point écran : poignée de la case active (44 px, au doigt), sinon un bord à ± 6 px (D13). */
  const grabAt = (sx: number, sy: number, x: number, y: number): { id: string; transform: Matrix; table: TableData; edge: EdgeHit; grip: boolean } | null => {
    const at = locate(active);
    if (at !== null) {
      for (const g of cellGrips(at.table, at.cell)) {
        const [wx, wy] = applyMatrix(at.transform, g.x, g.y);
        const [gx, gy] = worldToScreen(ctx.camera(), wx, wy);
        if (Math.abs(gx - sx) <= GRIP_PX / 2 && Math.abs(gy - sy) <= GRIP_PX / 2) {
          return { id: at.ref.id, transform: at.transform, table: at.table, edge: { axis: g.kind, index: g.index }, grip: true };
        }
      }
    }
    const e = tableEdgeAt(ctx.doc, ctx.page(), x, y, EDGE_SLOP_PX, ctx.camera().zoom);
    return e === null ? null : { ...e, grip: false };
  };

  /** Cadre de la plage, sinon de la cellule active (boîte monde de ses quatre coins), redemandé à chaque changement ;
   *  poignées de taille de la case active ; pendant un glisser de bordure, le cadre montre la taille d'arrivée (G7). */
  const refresh = (): void => {
    const at = locate(active);
    const r = at === null ? null : rangeOf(at);
    if (at === null) {
      live = NO_LIVE;
    } else {
      const grips = cellGrips(at.table, at.cell).map((g) => {
        const [x, y] = applyMatrix(at.transform, g.x, g.y);
        return { x, y, kind: g.kind };
      });
      const rz = resize;
      const el = rz === null ? null : ctx.doc.element(rz.id);
      const frame =
        rz !== null && el?.kind === "table"
          ? transformBounds(el.transform, {
              x0: 0,
              y0: 0,
              x1: el.table.cols.reduce((s, c) => s + c.width, 0) + (rz.edge.axis === "col" ? rz.size - rz.size0 : 0),
              y1: el.table.rows.reduce((s, x) => s + x.height, 0) + (rz.edge.axis === "row" ? rz.size - rz.size0 : 0),
            })
          : transformBounds(at.transform, r === null ? cellRect(at.table, at.cell) : rangeRect(at.table, r));
      live = { ...NO_LIVE, overlay: { ...EMPTY_OVERLAY, frame, grips } };
    }
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

  /** Uniformiser (T11, D34) : colonnes à la largeur moyenne, lignes à la hauteur moyenne, jamais sous la taille exigée
   *  (texte et objets logés, `requiredSizes`). Déjà uniforme à un arrondi près : aucune étape (T14). */
  const uniform = (id: string, transform: Matrix, t: TableData): void => {
    const linked = linkedBoxes(ctx.doc, ctx.page(), { id, transform });
    const mean = t.cols.reduce((s, c) => s + c.width, 0) / t.cols.length;
    const w = Math.max(mean, ...requiredSizes(t, linked, t.cols.map(() => mean), measure).cols);
    const need = Math.max(...requiredSizes(t, linked, t.cols.map(() => w), measure).rows);
    const meanH = t.rows.reduce((s, r) => s + r.height, 0) / t.rows.length;
    const h = Math.max(meanH, need);
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

  /** Objets logés dans la case `ref` (T9), du plus bas au plus haut de la pile. */
  const placedIn = (ref: CellRef): string[] =>
    linkedIn(ctx.doc, ctx.page(), ref.id)
      .filter((v) => v.cell?.[1] === ref.row && v.cell[2] === ref.col)
      .map((v) => v.id);
  const topImage = (ref: CellRef): string | null => {
    const ids = placedIn(ref).filter((e) => ctx.doc.element(e)?.kind === "image");
    return ids[ids.length - 1] ?? null;
  };

  /** Appui long (T7) : la cellule appuyée est active ; le menu propose Rétrécir (ou Agrandir), puis, si des objets y logent (T9), « Mettre en fond » (une image) et « Sortir ». */
  const openMenu = (p: Press): void => {
    p.hold = null;
    if (press !== p || menu === undefined) return;
    const at = locate(active);
    if (at === null) return;
    p.held = true;
    const shrink = at.table.fit === "shrink";
    const items: CellMenuItem[] = [{ id: "fit", label: shrink ? "Agrandir" : "Rétrécir", run: () => api.act("fit-toggle") }];
    if (topImage(at.ref) !== null) items.push({ id: "cell-image", label: "Mettre en fond", run: () => api.act("cell-image") });
    const out = placedIn(at.ref);
    if (out.length > 0) {
      items.push({
        id: "unplace",
        label: "Sortir",
        run: () => {
          // Même commande que Alt+Maj+Entrée (D11) : la case quittée revient à la taille exigée sans l'objet.
          const cmd = cellDrop?.place(out, true) ?? { type: "PlaceInCell", ids: out, matrix: [1, 0, 0, 1, 0, 0], cell: null, sizes: [] };
          if (cmd !== null) ctx.run(cmd);
          ctx.stateChanged?.();
        },
      });
    }
    menu.open(p.sx, p.sy, items);
  };

  const api: TableTool = {
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
      const grab = grabAt(s.x, s.y, x, y);
      if (grab !== null) {
        const start = localAlong(grab.transform, grab.edge.axis, s.x, s.y);
        const line = grab.edge.axis === "col" ? grab.table.cols[grab.edge.index]?.width : grab.table.rows[grab.edge.index]?.height;
        if (start !== null && line !== undefined) {
          const armed = grab.grip || tableAt(ctx.doc, ctx.page(), x, y) === null;
          resize = { pointerId, id: grab.id, edge: grab.edge, start, size0: line, size: line, armed, sx: s.x, sy: s.y };
          if (armed) {
            refresh();
            return;
          }
        }
      }
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
        const p: Press = { pointerId, id: hit.id, start: hit.cell, moved: false, sx: s.x, sy: s.y, hold: null, held: false };
        press = p;
        if (menu !== undefined) p.hold = setTimeout(() => openMenu(p), HOLD_MS);
        return;
      }
      picker.open({ x: s.x, y: s.y }, (cols, rows) => create(x, y, cols, rows));
    },
    extend(pointerId, samples) {
      const rz = resize;
      if (rz !== null && rz.pointerId === pointerId && !rz.armed) {
        const s1 = samples[samples.length - 1];
        if (s1 && Math.hypot(s1.x - rz.sx, s1.y - rz.sy) > HOLD_SLOP) {
          rz.armed = true;
          stopHold(press);
          press = null;
        }
      }
      if (rz !== null && rz.pointerId === pointerId && rz.armed) {
        const s0 = samples[samples.length - 1];
        const el = ctx.doc.element(rz.id);
        if (!s0 || el?.kind !== "table") return;
        const cur = localAlong(el.transform, rz.edge.axis, s0.x, s0.y);
        if (cur === null) return;
        rz.size = Math.max(rz.size0 + cur - rz.start, minSize(rz.id, el.transform, el.table, rz.edge));
        refresh();
        return;
      }
      const p = press;
      const s = samples[samples.length - 1];
      if (p === null || p.pointerId !== pointerId || !s) return;
      if (Math.hypot(s.x - p.sx, s.y - p.sy) > HOLD_SLOP) stopHold(p);
      if (p.held) return;
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
      const rz = resize;
      if (rz !== null && rz.pointerId === pointerId && !rz.armed) resize = null;
      else if (rz !== null && rz.pointerId === pointerId) {
        resize = null;
        const el = ctx.doc.element(rz.id);
        if (how === "end" && rz.size !== rz.size0 && el?.kind === "table") resizeTo(rz.id, el.transform, el.table, rz.edge, rz.size);
        refresh();
        ctx.stateChanged?.();
        return;
      }
      const p = press;
      if (p === null || p.pointerId !== pointerId) return;
      press = null;
      stopHold(p);
      // F14 : sans changement de cellule, le clic ouvre la saisie au relâché (sauf après l'appui long : le menu est ouvert).
      if (how === "end" && !p.moved && !p.held) openActive();
      // Geste interrompu (abort, cancel) après un glisser : la plage posée par `extend` est retirée, sinon le prochain
      // « Ombrer » ou « − Ligne » s'y appliquerait.
      if (how !== "end" && p.moved) setCorner(null);
    },
    live: () => live,
    active: () => false,
    leave() {
      stopHold(press);
      menu?.close();
      gate.request();
      picker.close();
      resize = null;
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
      // personnalisation-3 : objets logés dans ce tableau (cellule active seulement ; lu au changement d'état, jamais par image).
      const linked = linkedIn(ctx.doc, ctx.page(), at.ref.id).length;
      return { id: at.ref.id, row: at.cell.row, col: at.cell.col, rows: t.rows.length, cols: t.cols.length, range, merged: zone !== null, zone, shaded, linked };
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
          uniform(ref.id, at.transform, t);
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
        case "fit-toggle":
          ctx.run({ type: "SetTableOptions", id: ref.id, fit: t.fit === "shrink" ? "grow" : "shrink" });
          break;
        case "col-wider":
        case "col-narrower":
        case "row-taller":
        case "row-shorter": {
          const axis = a === "col-wider" || a === "col-narrower" ? "col" : "row";
          const index = axis === "col" ? span.c1 : span.r1;
          const now = axis === "col" ? t.cols[index]?.width : t.rows[index]?.height;
          const sign = a === "col-wider" || a === "row-taller" ? 1 : -1;
          if (now !== undefined) resizeTo(ref.id, at.transform, t, { axis, index }, now + sign * SIZE_STEP);
          break;
        }
        case "cell-image": {
          const image = topImage(ref);
          if (image !== null) ctx.run({ type: "SetCellImage", id: ref.id, row: ref.row, col: ref.col, from: image });
          break;
        }
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
  return api;
}
