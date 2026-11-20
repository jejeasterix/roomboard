import { TOOL_TABLE, type ToolItem } from "../toolbar";

export interface ToolbarView {
  readonly tool: string;
  readonly eraserMode: "partial" | "object";
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly pageIndex: number;
  readonly pageCount: number;
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
