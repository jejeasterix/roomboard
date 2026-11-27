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
import { cellContent, cellRect, mergeAt, requiredSizes, tableHitIn, TABLE_COL_WIDTH, TABLE_PADDING, TABLE_ROW_HEIGHT, type LinkedBox, type TableHit } from "../table-geom";
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

  /** D11 : tailles de la case quittée par `selection` (lien commun) qui reviennent à la taille exigée sans elle, si
   *  elles valent celle que la sélection imposait (± 0,5) ; une taille réglée à la main n'est jamais réduite. */
  const shrinkLeft = (selection: readonly string[]): LineSize[] => {
    const link = views(selection).find((v) => v.cell !== undefined)?.cell;
    const tv = link === undefined ? null : ctx.doc.element(link[0]);
    if (link === undefined || tv?.kind !== "table") return [];
    const t = tv.table;
    const r = t.rows.findIndex((x) => x.id === link[1]);
    const k = t.cols.findIndex((x) => x.id === link[2]);
    const box = ctx.doc.bounds(selection);
    const local = box === null ? null : localBox(tv.transform, box);
    const row = t.rows[r];
    const col = t.cols[k];
    if (row === undefined || col === undefined || local === null) return [];
    const others: LinkedBox[] = ctx.doc.elementIds(ctx.page()).flatMap((id) => {
      const v = selection.includes(id) ? null : ctx.doc.element(id);
      const b = v?.cell?.[0] === link[0] ? ctx.doc.bounds([id]) : null;
      const lb = b === null ? null : localBox(tv.transform, b);
      return v?.cell === undefined || lb === null ? [] : [{ row: v.cell[1], col: v.cell[2], w: lb.x1 - lb.x0, h: lb.y1 - lb.y0 }];
    });
    const widths = t.cols.map((c) => c.width);
    const mine = { row: row.id, col: col.id, w: local.x1 - local.x0, h: local.y1 - local.y0 };
    const withMe = requiredSizes(t, [...others, mine], widths, measure);
    const out: LineSize[] = [];
    const colWithout = Math.max(requiredSizes(t, others, widths, measure).cols[k] ?? 0, TABLE_COL_WIDTH);
    if (Math.abs(col.width - (withMe.cols[k] ?? 0)) <= 0.5 && colWithout < col.width) out.push([link[0], "col", col.id, colWithout]);
    const narrowed = widths.map((w, i) => (i === k && out.length > 0 ? colWithout : w));
    const without = requiredSizes(t, others, narrowed, measure);
    const rowWithout = Math.max(without.rows[r] ?? 0, TABLE_ROW_HEIGHT);
    if (Math.abs(row.height - (withMe.rows[r] ?? 0)) <= 0.5 && rowWithout < row.height) out.push([link[0], "row", row.id, rowWithout]);
    // Colonne réduite : ses textes se replient, les lignes touchées reprennent leur hauteur exigée (D11, D13).
    if (out.length > 0 && out[0]?.[1] === "col") {
      t.rows.forEach((x, i) => {
        const need = without.rows[i] ?? x.height;
        if (i !== r && need > x.height) out.push([link[0], "row", x.id, need]);
      });
    }
    return out;
  };

  /** `PlaceInCell` vers la case `hit` (mode agrandir, D8) ; objet posé au coin de la boîte intérieure. */
  const placeInto = (selection: readonly string[], hit0: TableHit): Command | null => {
    const box = ctx.doc.bounds(selection);
    const local0 = box === null ? null : localBox(hit0.transform, box);
    const r0 = hit0.table.rows[hit0.cell.row];
    const k0 = hit0.table.cols[hit0.cell.col];
    if (box === null || local0 === null || r0 === undefined || k0 === undefined) return null;
    // D11 : la case quittée (autre que la visée) revient à sa taille exigée, dans la même PlaceInCell.
    const cur = views(selection).find((v) => v.cell !== undefined)?.cell;
    const same = cur?.[0] === hit0.id && cur[1] === r0.id && cur[2] === k0.id;
    const left = cur === undefined || same ? [] : shrinkLeft(selection);
    const mine0 = left.filter((z) => z[0] === hit0.id);
    const hit: TableHit = mine0.length === 0 ? hit0 : {
      ...hit0,
      table: {
        ...hit0.table,
        cols: hit0.table.cols.map((c) => ({ ...c, width: mine0.find((z) => z[1] === "col" && z[2] === c.id)?.[3] ?? c.width })),
        rows: hit0.table.rows.map((x) => ({ ...x, height: mine0.find((z) => z[1] === "row" && z[2] === x.id)?.[3] ?? x.height })),
      },
    };
    const r = hit.table.rows[hit.cell.row];
    const k = hit.table.cols[hit.cell.col];
    const local = localBox(hit.transform, box);
    if (r === undefined || k === undefined || local === null) return null;
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
    const grow: LineSize[] = [];
    const needW = req.cols[hit.cell.col] ?? 0;
    const needH = req.rows[hit.cell.row] ?? 0;
    if (needW > k.width) grow.push([hit.id, "col", k.id, needW]);
    if (needH > r.height) grow.push([hit.id, "row", r.id, needH]);
    // Une ligne ou colonne n'est citée qu'une fois : la case visée garde le dernier mot.
    const sizes = [...left.filter((z) => !grow.some((g) => g[0] === z[0] && g[1] === z[1] && g[2] === z[2])), ...grow];
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
      return linked && tableHitIn(read().tables, x, y) === null ? { type: "PlaceInCell", ids: [...selection], matrix, cell: null, sizes: shrinkLeft(selection) } : null;
    },
    place(selection, out) {
      if (selection.length === 0) return null;
      const sel = views(selection);
      if (sel.some((v) => v.kind === "table")) return null;
      if (out) return sel.some((v) => v.cell !== undefined) ? { type: "PlaceInCell", ids: [...selection], matrix: [1, 0, 0, 1, 0, 0], cell: null, sizes: shrinkLeft(selection) } : null;
      const box = ctx.doc.bounds(selection);
      const hit = box === null ? null : aimed(selection, (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
      return hit === null ? null : placeInto(selection, hit);
    },
  };
}
