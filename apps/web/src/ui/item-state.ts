import { TABLE_MAX_LINES } from "../core/api";
import { rangeSize, type Range, type TableCellState } from "../engine/table-geom";
import { TOOL_TABLE, type ToolItem } from "../toolbar";

export interface ToolbarView {
  readonly tool: string;
  readonly eraserMode: "partial" | "object";
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly pageIndex: number;
  readonly pageCount: number;
  /** Cellule active de l'outil Tableau (C10a) ; absente ou null : aucune (PC9). */
  readonly tableCell?: TableCellState | null;
}
export interface ItemState { readonly pressed: boolean | null; readonly disabled: boolean; readonly label: string }

const cells = (r: Range | null | undefined): number => (r ? rangeSize(r) : 0);
/** Étendue réelle de « − Ligne » / « − Colonne » (F5, F6) : la plage, sinon la zone, sinon la cellule active. */
const extent = (c: TableCellState): Range => c.range ?? c.zone ?? { r0: c.row, c0: c.col, r1: c.row, c1: c.col };
const spanRows = (c: TableCellState): number => extent(c).r1 - extent(c).r0 + 1;
const spanCols = (c: TableCellState): number => extent(c).c1 - extent(c).c0 + 1;

/** Ce que l'état publié change d'une action ; une action absente de la table garde l'état neutre. */
export const ACTION_STATE: Readonly<Record<string, (v: ToolbarView) => Partial<ItemState>>> = {
  "eraser-mode": (v) => ({
    pressed: v.eraserMode === "object",
    label: `Gomme : ${v.eraserMode === "object" ? "objet" : "partielle"}`,
  }),
  undo: (v) => ({ disabled: !v.canUndo }),
  redo: (v) => ({ disabled: !v.canRedo }),
  "page-prev": (v) => ({ disabled: v.pageIndex <= 0 }),
  "page-next": (v) => ({ disabled: v.pageIndex >= v.pageCount - 1 }),
  "page-remove": (v) => ({ disabled: v.pageCount <= 1 }),
  "table-row-insert": (v) => ({ disabled: !v.tableCell || v.tableCell.rows >= TABLE_MAX_LINES }),
  "table-col-insert": (v) => ({ disabled: !v.tableCell || v.tableCell.cols >= TABLE_MAX_LINES }),
  // Toutes les lignes (resp. colonnes) couvertes : `removeLines` ne ferait rien.
  "table-row-remove": (v) => ({ disabled: !v.tableCell || spanRows(v.tableCell) >= v.tableCell.rows }),
  "table-col-remove": (v) => ({ disabled: !v.tableCell || spanCols(v.tableCell) >= v.tableCell.cols }),
  "table-uniform": (v) => ({ disabled: !v.tableCell }),
  "table-merge": (v) => ({ disabled: cells(v.tableCell?.range) < 2 }),
  "table-split": (v) => ({ disabled: v.tableCell?.merged !== true || cells(v.tableCell.range) > 0 }),
  "table-shade": (v) => ({ disabled: !v.tableCell }),
  "table-unshade": (v) => ({ disabled: v.tableCell?.shaded !== true }),
};

type Rule = (item: ToolItem, v: ToolbarView) => Partial<ItemState>;

const BY_KIND: Readonly<Record<ToolItem["kind"], Rule>> = {
  tool: (item, v) => {
    const entry = item.tool !== undefined && Object.hasOwn(TOOL_TABLE, item.tool) ? TOOL_TABLE[item.tool] : undefined;
    return { pressed: entry !== undefined && v.tool === entry.choice };
  },
  action: (item, v) => {
    const rule = item.action !== undefined && Object.hasOwn(ACTION_STATE, item.action) ? ACTION_STATE[item.action] : undefined;
    return rule ? rule(v) : {};
  },
  dropzone: () => ({}),
  separator: () => ({}),
};

export function itemState(item: ToolItem, v: ToolbarView): ItemState {
  return { pressed: null, disabled: false, label: item.label, ...BY_KIND[item.kind](item, v) };
}
