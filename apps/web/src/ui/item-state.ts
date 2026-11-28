import { TABLE_MAX_LINES } from "../core/api";
import type { FormatState } from "../engine/rich-edit";
import { rangeSize, type Range, type TableCellState } from "../engine/table-geom";
import { ANNOTATION_MAIN_ACTIONS, ANNOTATION_REMOTE_ACTIONS, TOOL_TABLE, type ToolItem } from "../toolbar";

/** C11a : état de l'annotation vu par la barre de la fenêtre principale. */
export interface AnnotationView {
  readonly active: boolean;
  readonly pointer: "draw" | "mouse";
  readonly screens: number;
  /** C11b (P16) : bureau figé ; absent : faux. */
  readonly frozen?: boolean;
  /** C11b (P18) : bureau vivant offert ; faux : « Recapturer le bureau » ; absent : vrai. */
  readonly live?: boolean;
  /** C11b (P6) : cible de « Envoyer au tableau » ; "new" grise « Envoyer dans un nouvel onglet ». */
  readonly sendTarget?: "origin" | "new";
}

export interface ToolbarView {
  readonly tool: string;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly pageIndex: number;
  readonly pageCount: number;
  /** Objets de la page montrée ; absent : inconnu (« Effacer la page » reste actif). */
  readonly elementCount?: number;
  /** T8 : mode lu et disposition de la page montrée ; absents : page paysage. */
  readonly pageMode?: "page" | "infinite";
  readonly pageLayout?: "landscape" | "portrait" | "infinite";
  /** personnalisation-1a (décision 25) : barre latérale des pages ouverte ; absent : fermée. */
  readonly sidebarOpen?: boolean;
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
  /** C5 (I25) : id de l'image sélectionnée seule ; absent ou null : aucune (bouton « Image » grisé). */
  readonly selectionImage?: string | null;
  /** C6b (B10) : tolérance du pot sur une image, 0 à 100 ; absente : 5 (défaut du moteur). */
  readonly fillTolerance?: number;
  /** C11a (P6, P8, P15) : absent (tests, coque sans annotation) : tableau. */
  readonly annotation?: AnnotationView;
}
/** Compteur « 2 / 5 » de la barre d'outils (action `page-number`). */
export const pagesLabel = (v: { readonly pageIndex: number; readonly pageCount: number }): string => `${v.pageIndex + 1} / ${v.pageCount}`;

export interface ItemState { readonly pressed: boolean | null; readonly disabled: boolean; readonly label: string; readonly icon?: string }

const cells = (r: Range | null | undefined): number => (r ? rangeSize(r) : 0);
/** Étendue réelle de « − Ligne » / « − Colonne » (F5, F6) : la plage, sinon la zone, sinon la cellule active. */
const extent = (c: TableCellState): Range => c.range ?? c.zone ?? { r0: c.row, c0: c.col, r1: c.row, c1: c.col };
const spanRows = (c: TableCellState): number => extent(c).r1 - extent(c).r0 + 1;
const spanCols = (c: TableCellState): number => extent(c).c1 - extent(c).c0 + 1;

/** Ce que l'état publié change d'une action ; une action absente de la table garde l'état neutre. */
export const ACTION_STATE: Readonly<Record<string, (v: ToolbarView) => Partial<ItemState>>> = {
  "desktop-annotation": (v) => {
    const on = v.annotation?.active === true;
    return { pressed: on, label: on ? "Quitter l'annotation" : "Annotation du bureau" };
  },
  "annotation-pointer": (v) => {
    const mouse = v.annotation?.pointer === "mouse";
    // design-l1 (L1-3, H5) : l'icône suit le libellé ; `pen-line` reste distinct de l'outil Stylo `pen`.
    return { pressed: null, label: mouse ? "Dessin" : "Souris", icon: mouse ? "pen-line" : "pointer", disabled: v.annotation?.active !== true };
  },
  "annotation-screen": (v) => ({ disabled: v.annotation?.active !== true || v.annotation.screens <= 1 }),
  "annotation-freeze": (v) => {
    const a = v.annotation;
    const disabled = a?.active !== true;
    if (a?.live === false) return { pressed: null, label: "Recapturer le bureau", icon: "reset", disabled };
    const frozen = a?.frozen === true;
    return { pressed: frozen, label: frozen ? "Bureau vivant" : "Figer le bureau", disabled };
  },
  "annotation-send": (v) => ({ disabled: v.annotation?.active !== true }),
  "annotation-send-new": (v) => ({ disabled: v.annotation?.active !== true || v.annotation.sendTarget === "new" }),
  undo: (v) => ({ disabled: !v.canUndo }),
  redo: (v) => ({ disabled: !v.canRedo }),
  "page-prev": (v) => ({ disabled: v.pageIndex <= 0 }),
  // Décision 27 : Suivante n'est jamais grisée ; sur la dernière page, elle ajoute une page.
  "page-next": (v) => ({ disabled: false, ...(v.pageIndex >= v.pageCount - 1 ? { label: "Nouvelle page" } : {}) }),
  "page-duplicate": () => ({ disabled: false }),
  "page-number": (v) => ({ pressed: v.sidebarOpen === true }),
  "page-remove": (v) => ({ disabled: v.pageCount <= 1 }),
  "page-clear": (v) => ({ disabled: v.elementCount === 0 }),
  "table-row-insert": (v) => ({ disabled: !v.tableCell || v.tableCell.rows >= TABLE_MAX_LINES }),
  "table-col-insert": (v) => ({ disabled: !v.tableCell || v.tableCell.cols >= TABLE_MAX_LINES }),
  // Toutes les lignes (resp. colonnes) couvertes : `removeLines` ne ferait rien.
  "table-row-remove": (v) => ({ disabled: !v.tableCell || spanRows(v.tableCell) >= v.tableCell.rows }),
  "table-col-remove": (v) => ({ disabled: !v.tableCell || spanCols(v.tableCell) >= v.tableCell.cols }),
  "table-uniform": (v) => ({ disabled: !v.tableCell }),
  "table-merge": (v) => ({ disabled: cells(v.tableCell?.range) < 2 }),
  "table-split": (v) => ({ disabled: v.tableCell?.merged !== true || cells(v.tableCell.range) > 0 }),
  "table-shade": (v) => ({ disabled: !v.tableCell }),
  "table-header": (v) => ({ disabled: !v.tableCell, pressed: v.tableCell?.header === true }),
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

/** C11a (P20) : en annotation, une action ni transmise à `annotate` ni propre à la fenêtre principale est grisée. */
const offInAnnotation = (item: ToolItem, v: ToolbarView): boolean =>
  v.annotation?.active === true &&
  item.kind === "action" &&
  !ANNOTATION_REMOTE_ACTIONS.has(item.action ?? "") &&
  !ANNOTATION_MAIN_ACTIONS.has(item.action ?? "");

export function itemState(item: ToolItem, v: ToolbarView): ItemState {
  const st: ItemState = { pressed: null, disabled: false, label: item.label, ...BY_KIND[item.kind](item, v) };
  return offInAnnotation(item, v) ? { ...st, disabled: true } : st;
}
