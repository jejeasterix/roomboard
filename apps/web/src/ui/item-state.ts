import { TABLE_MAX_LINES } from "../core/api";
import type { FormatState } from "../engine/rich-edit";
import type { TableCellState } from "../engine/table-geom";
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
  /** État de la barre de format (C7b, R15) ; absent ou null : aucune séance de saisie (boutons grisés). */
  readonly textFormat?: FormatState | null;
  /** C3 (Z13) : identifiants des objets sélectionnés ; absent : aucune sélection. */
  readonly selection?: readonly string[];
  /** C3 (Z13) : nombre d'unités de sélection (un groupe compte pour une) ; absent : 0. */
  readonly selectionUnits?: number;
  /** C3 (Z13) : la sélection contient au moins un groupe ; absent : non. */
  readonly selectionGrouped?: boolean;
  /** C3 (Z13) : le presse-papiers interne porte quelque chose à coller ; absent : non. */
  readonly canPaste?: boolean;
}
export interface ItemState { readonly pressed: boolean | null; readonly disabled: boolean; readonly label: string }

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
  "table-row-remove": (v) => ({ disabled: !v.tableCell || v.tableCell.rows <= 1 }),
  "table-col-remove": (v) => ({ disabled: !v.tableCell || v.tableCell.cols <= 1 }),
  "table-uniform": (v) => ({ disabled: !v.tableCell }),
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
