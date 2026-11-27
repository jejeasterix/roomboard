/**
 * Glisser vers une case (personnalisation-3, DA3, D7, D8, D34, D35) : la Sélection appelle ce module en 4 points et
 * n'en sait pas plus. Au relâché d'un déplacement, pointeur sur une case d'un tableau absent de la sélection, sélection
 * sans tableau, Alt relâchée, case non ombrée et hors zone fusionnée : `PlaceInCell` (mode agrandir : la colonne et la
 * ligne prennent la taille exigée par l'objet, l'objet est posé au coin de la boîte intérieure). Objet lié lâché hors de
 * tout tableau : `PlaceInCell` sans case, à la place du relâché. Sinon `null` : la Sélection écrit sa `Transform`.
 * Tableaux lus une fois par version du document (D28), jamais par image.
 */
import type { Bounds, CellLink, Command, ElementView, LineSize, Matrix, TableElement } from "../../core/api";
import { applyMatrix, invertMatrix } from "../../core/shapes";
import type { GroupedView } from "../groups";
import { cellContent, cellRect, mergeAt, requiredSizes, tableHitIn, TABLE_PADDING, type LinkedBox, type TableHit } from "../table-geom";
import type { Measure } from "../text-layout";
import { transformBounds, translateMatrix } from "./handles";
import type { ToolContext } from "./tool";

export interface CellDrop {
  expand(ids: readonly string[], views: readonly GroupedView[]): string[];
  target(selection: readonly string[], x: number, y: number): Bounds | null;
  drop(selection: readonly string[], matrix: Matrix, x: number, y: number, alt: boolean): Command | null;
  place(selection: readonly string[], out: boolean): Command | null;
}

/** Boîte locale (repère du tableau) d'une boîte monde : rectangle englobant de ses quatre coins. */
function localBox(m: Matrix, b: Bounds): Bounds | null {
  const inv = invertMatrix(m);
  return inv === null ? null : transformBounds(inv, b);
}

/** D28 : tableaux de la page et vues lues une fois par version du document et par page. */
interface Snapshot {
  readonly version: number;
  readonly page: string;
  readonly tables: readonly TableElement[];
  readonly views: Map<string, ElementView | null>;
}

export function createCellDrop(ctx: ToolContext, measure: Measure): CellDrop {
  let snap: Snapshot | null = null;
  const read = (): Snapshot => {
    const version = ctx.doc.version();
    const page = ctx.page();
    if (snap === null || snap.version !== version || snap.page !== page) {
      const tables = ctx.doc.elementIdsOfKind(page, "table").flatMap((id) => {
        const e = ctx.doc.element(id);
        return e?.kind === "table" ? [e] : [];
      });
      snap = { version, page, tables, views: new Map<string, ElementView | null>(tables.map((e) => [e.id, e])) };
    }
    return snap;
  };
  const view = (id: string): ElementView | null => {
    const s = read();
    if (!s.views.has(id)) s.views.set(id, ctx.doc.element(id));
    return s.views.get(id) ?? null;
  };
  const views = (ids: readonly string[]): ElementView[] =>
    ids.flatMap((id) => {
      const v = view(id);
      return v === null ? [] : [v];
    });

  /** Case visée : tableau le plus haut sous le pointeur, hors sélection ; sélection sans tableau ; case ni ombrée ni en zone. */
  const aimed = (selection: readonly string[], x: number, y: number): TableHit | null => {
    if (views(selection).some((v) => v.kind === "table")) return null;
    const hit = tableHitIn(read().tables, x, y);
    if (hit === null || selection.includes(hit.id)) return null;
    if (mergeAt(hit.table, hit.cell) !== null) return null;
    const r = hit.table.rows[hit.cell.row];
    const k = hit.table.cols[hit.cell.col];
    if (r === undefined || k === undefined) return null;
    if (cellContent(hit.table, r.id, k.id).shade !== null) return null;
    return hit;
  };

  /** `PlaceInCell` vers la case `hit` (mode agrandir, D8) ; objet posé au coin de la boîte intérieure. */
  const placeInto = (selection: readonly string[], hit: TableHit): Command | null => {
    const box = ctx.doc.bounds(selection);
    const local = box === null ? null : localBox(hit.transform, box);
    const r = hit.table.rows[hit.cell.row];
    const k = hit.table.cols[hit.cell.col];
    if (box === null || local === null || r === undefined || k === undefined) return null;
    const link: CellLink = [hit.id, r.id, k.id];
    const mine: LinkedBox = { row: r.id, col: k.id, w: local.x1 - local.x0, h: local.y1 - local.y0 };
    const others: LinkedBox[] = ctx.doc.elementIds(ctx.page()).flatMap((id) => {
      if (selection.includes(id)) return [];
      const v = ctx.doc.element(id);
      if (v?.cell === undefined || v.cell[0] !== hit.id) return [];
      const b = ctx.doc.bounds([id]);
      const lb = b === null ? null : localBox(hit.transform, b);
      return lb === null ? [] : [{ row: v.cell[1], col: v.cell[2], w: lb.x1 - lb.x0, h: lb.y1 - lb.y0 }];
    });
    const widths = hit.table.cols.map((c) => c.width);
    const req = requiredSizes(hit.table, [...others, mine], widths, measure);
    const sizes: LineSize[] = [];
    const needW = req.cols[hit.cell.col] ?? 0;
    const needH = req.rows[hit.cell.row] ?? 0;
    if (needW > k.width) sizes.push([hit.id, "col", k.id, needW]);
    if (needH > r.height) sizes.push([hit.id, "row", r.id, needH]);
    const corner = cellRect(hit.table, hit.cell);
    const [tx, ty] = applyMatrix(hit.transform, corner.x0 + TABLE_PADDING, corner.y0 + TABLE_PADDING);
    return { type: "PlaceInCell", ids: [...selection], matrix: translateMatrix(tx - box.x0, ty - box.y0), cell: link, sizes };
  };

  return {
    expand(ids, page) {
      const tables = new Set(ids.filter((id) => view(id)?.kind === "table"));
      if (tables.size === 0) return [...ids];
      const extra = page.filter((v) => v.cell !== undefined && tables.has(v.cell[0]) && !ids.includes(v.id)).map((v) => v.id);
      return [...ids, ...extra];
    },
    target(selection, x, y) {
      const hit = aimed(selection, x, y);
      return hit === null ? null : transformBounds(hit.transform, cellRect(hit.table, hit.cell));
    },
    drop(selection, matrix, x, y, alt) {
      if (alt || selection.length === 0) return null;
      const hit = aimed(selection, x, y);
      if (hit !== null) return placeInto(selection, hit);
      const sel = views(selection);
      if (sel.some((v) => v.kind === "table")) return null;
      const linked = sel.some((v) => v.cell !== undefined);
      return linked && tableHitIn(read().tables, x, y) === null ? { type: "PlaceInCell", ids: [...selection], matrix, cell: null, sizes: [] } : null;
    },
    place() {
      return null; // T6 : Alt+Entrée, Alt+Maj+Entrée
    },
  };
}
