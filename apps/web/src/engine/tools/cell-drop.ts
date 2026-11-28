/**
 * Glisser vers une case (personnalisation-3, DA3, D7, D8, D34, D35) : la Sélection appelle ce module en 4 points et
 * n'en sait pas plus. Au relâché d'un déplacement, pointeur sur une case d'un tableau absent de la sélection, sélection
 * sans tableau, Alt relâchée, case non ombrée et hors zone fusionnée : `PlaceInCell` (mode agrandir : la colonne et la
 * ligne prennent la taille exigée par l'objet, l'objet est posé au coin de la boîte intérieure). Objet lié lâché hors de
 * tout tableau (centre hors de sa case ou zone ; dedans, il garde son lien) : `PlaceInCell` sans case, à la place du relâché. Sinon `null` : la Sélection écrit sa `Transform`.
 * Colonne à liste `accept` (DS5) : seule une étiquette admise y loge ; sinon `"refused"`, et la Sélection n'écrit rien.
 * Tableaux lus une fois par version du document (D28), jamais par image.
 */
import type { Bounds, CellLink, Command, ElementView, LineSize, Matrix, TableElement } from "../../core/api";
import { applyMatrix, invertMatrix } from "../../core/shapes";
import type { GroupedView } from "../groups";
import { acceptsDrop, cellContent, cellInnerBox, cellRect, contentBounds, linkedBoxes, mergeAt, requiredSizes, tableHitIn, TABLE_COL_WIDTH, TABLE_PADDING, TABLE_ROW_HEIGHT, type LinkedBox, type TableHit } from "../table-geom";
import { fittedTextWidth, type Measure } from "../text-layout";
import { transformBounds, translateMatrix } from "./handles";
import type { ToolContext } from "./tool";

/** DS5 : relâché refusé par la règle d'étiquettes ; la Sélection n'écrit rien. */
export const REFUSED = "refused";

export interface CellDrop {
  expand(ids: readonly string[], views: readonly GroupedView[]): string[];
  target(selection: readonly string[], x: number, y: number): Bounds | null;
  drop(selection: readonly string[], matrix: Matrix, x: number, y: number, alt: boolean): Command | null | typeof REFUSED;
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
  /** C4 : boîte monde demandée par la sélection (texte : ses lignes, pas sa boîte), vues du cliché D28. */
  const needed = (selection: readonly string[], boxWidth?: number): Bounds | null =>
    contentBounds({ element: view, bounds: (ids) => ctx.doc.bounds(ids) }, selection, measure, boxWidth);
  /** OG79 : un seul texte, plus large que sa ligne la plus longue : sa largeur de boîte à la pose et sa boîte monde
   *  réduite. La boîte réduite sert à la pose et au test de clic : le texte ne capte plus les touchers des cases voisines. */
  const fitted = (selection: readonly string[]): { readonly width: number; readonly box: Bounds } | null => {
    const v = views(selection);
    const t = v.length === 1 && v[0]?.kind === "text" ? v[0] : null;
    const width = t === null ? null : fittedTextWidth(t.text, measure);
    return t === null || width === null ? null : { width, box: transformBounds(t.transform, { x0: 0, y0: 0, x1: width, y1: t.text.boxHeight }) };
  };

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

  /** Étiquette de la sélection : le contenu d'un seul texte, sinon null (DS5, H11). */
  const labelOf = (selection: readonly string[]): string | null => {
    const v = views(selection);
    return v.length === 1 && v[0]?.kind === "text" ? v[0].text.content : null;
  };
  const admits = (selection: readonly string[], hit: TableHit): boolean => acceptsDrop(hit.table, hit.cell, labelOf(selection));

  /** D11 : tailles de la case quittée par `selection` (lien commun) qui reviennent à la taille exigée sans elle, si
   *  elles valent celle que la sélection imposait (± 0,5) ; une taille réglée à la main n'est jamais réduite. */
  const shrinkLeft = (selection: readonly string[]): LineSize[] => {
    const link = views(selection).find((v) => v.cell !== undefined)?.cell;
    const tv = link === undefined ? null : ctx.doc.element(link[0]);
    if (link === undefined || tv?.kind !== "table") return [];
    const t = tv.table;
    const r = t.rows.findIndex((x) => x.id === link[1]);
    const k = t.cols.findIndex((x) => x.id === link[2]);
    const box = needed(selection);
    const local = box === null ? null : localBox(tv.transform, box);
    const row = t.rows[r];
    const col = t.cols[k];
    if (row === undefined || col === undefined || local === null) return [];
    const others = linkedBoxes(ctx.doc, ctx.page(), { id: link[0], transform: tv.transform }, measure, selection);
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
    const fit = fitted(selection);
    const box = fit?.box ?? ctx.doc.bounds(selection);
    const narrow = fit === null ? {} : { boxWidth: fit.width };
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
    const need = needed(selection, fit?.width);
    const asked = need === null ? null : localBox(hit.transform, need);
    if (r === undefined || k === undefined || local === null || asked === null) return null;
    const link: CellLink = [hit.id, r.id, k.id];
    const mine: LinkedBox = { row: r.id, col: k.id, w: asked.x1 - asked.x0, h: asked.y1 - asked.y0 };
    const others = linkedBoxes(ctx.doc, ctx.page(), hit, measure, selection);
    const corner = cellRect(hit.table, hit.cell);
    const [tx, ty] = applyMatrix(hit.transform, corner.x0 + TABLE_PADDING, corner.y0 + TABLE_PADDING);
    // T7 (S2) : mode rétrécir : la case ne change pas ; l'objet est réduit (échelle uniforme, jamais agrandi) à la boîte
    // intérieure de la case et posé à son coin haut-gauche. Tableau tourné : hors périmètre (cadrage § 7).
    if (hit.table.fit === "shrink") {
      const inner = cellInnerBox(hit.table, hit.cell);
      const k = Math.min(1, inner.w / (local.x1 - local.x0), inner.h / (local.y1 - local.y0));
      return { type: "PlaceInCell", ids: [...selection], matrix: [k, 0, 0, k, tx - k * box.x0, ty - k * box.y0], cell: link, sizes: left, ...narrow };
    }
    const widths = hit.table.cols.map((c) => c.width);
    const req = requiredSizes(hit.table, [...others, mine], widths, measure);
    const grow: LineSize[] = [];
    const needW = req.cols[hit.cell.col] ?? 0;
    const needH = req.rows[hit.cell.row] ?? 0;
    if (needW > k.width) grow.push([hit.id, "col", k.id, needW]);
    if (needH > r.height) grow.push([hit.id, "row", r.id, needH]);
    // Une ligne ou colonne n'est citée qu'une fois : la case visée garde le dernier mot.
    const sizes = [...left.filter((z) => !grow.some((g) => g[0] === z[0] && g[1] === z[1] && g[2] === z[2])), ...grow];
    return { type: "PlaceInCell", ids: [...selection], matrix: translateMatrix(tx - box.x0, ty - box.y0), cell: link, sizes, ...narrow };
  };

  /** Le centre de la boîte déplacée reste dans la case (ou la zone fusionnée) où l'objet est logé : le lien est gardé. */
  const stays = (selection: readonly string[], matrix: Matrix): boolean => {
    const link = views(selection).find((v) => v.cell !== undefined)?.cell;
    const tv = link === undefined ? null : ctx.doc.element(link[0]);
    const box = ctx.doc.bounds(selection);
    if (link === undefined || tv?.kind !== "table" || box === null) return false;
    const row = tv.table.rows.findIndex((x) => x.id === link[1]);
    const col = tv.table.cols.findIndex((x) => x.id === link[2]);
    if (row < 0 || col < 0) return false;
    const [cx, cy] = applyMatrix(matrix, (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
    const z = transformBounds(tv.transform, cellRect(tv.table, { row, col }));
    return cx >= z.x0 && cx <= z.x1 && cy >= z.y0 && cy <= z.y1;
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
      return hit === null || !admits(selection, hit) ? null : transformBounds(hit.transform, cellRect(hit.table, hit.cell));
    },
    drop(selection, matrix, x, y, alt) {
      if (selection.length === 0) return null;
      const hit = aimed(selection, x, y);
      // DS5 : la règle d'étiquettes ne se contourne pas par Alt ; une étiquette admise avec Alt se déplace librement.
      if (hit !== null && !admits(selection, hit)) return REFUSED;
      if (alt) return null;
      if (hit !== null) return placeInto(selection, hit);
      const sel = views(selection);
      if (sel.some((v) => v.kind === "table")) return null;
      // Hors de tout tableau, ou sur une case refusée (ombrée, fusionnée) : l'objet logé sort, la case quittée est réduite.
      const linked = sel.some((v) => v.cell !== undefined);
      if (linked && stays(selection, matrix)) return null;
      return linked ? { type: "PlaceInCell", ids: [...selection], matrix, cell: null, sizes: shrinkLeft(selection) } : null;
    },
    place(selection, out) {
      if (selection.length === 0) return null;
      const sel = views(selection);
      if (sel.some((v) => v.kind === "table")) return null;
      if (out) return sel.some((v) => v.cell !== undefined) ? { type: "PlaceInCell", ids: [...selection], matrix: [1, 0, 0, 1, 0, 0], cell: null, sizes: shrinkLeft(selection) } : null;
      const box = ctx.doc.bounds(selection);
      const hit = box === null ? null : aimed(selection, (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
      return hit === null || !admits(selection, hit) ? null : placeInto(selection, hit);
    },
  };
}
