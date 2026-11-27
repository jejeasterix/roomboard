/**
 * Lignes de l'onglet Calques (personnalisation-1a, décisions 16 et 17) : l'ordre de `elementIds` EST l'empilement
 * (le dernier est au premier plan). Une ligne par objet libre ou par groupe extérieur, premier plan d'abord ; deux
 * lignes fixes : « Grille » (à sa place selon `above`) et « Fond de la page » (toujours en bas). Fonctions pures sur le
 * document : aucun état, aucune écriture. `dropTarget` et `stepTarget` rendent le rang `to` de `Restack`.
 */
import type { CoreDocument, ElementView } from "../core/api";
import { outerGroup } from "../engine/groups";
import { TOOL_ICONS } from "../ui/icons";

export interface LayerRow {
  /** Clé stable : id de l'objet, `group:<id du groupe>`, `grid` ou `backdrop`. */
  readonly key: string;
  /** Ids portés par la ligne, du bas vers le haut de la pile ; vide pour une ligne fixe. */
  readonly ids: readonly string[];
  readonly label: string;
  /** Sorte de l'objet (`shape`, `text`…), ou `group`, `grid`, `backdrop`. */
  readonly kind: string;
  readonly fixed: boolean;
  /** Clé d'`ICONS` : l'icône de l'outil qui pose l'objet (`TOOL_ICONS`), `layers` pour un groupe. */
  readonly icon: string;
}

type Reader = Pick<CoreDocument, "elementIds" | "element" | "page">;

export const GRID_LABEL = "Grille";
export const BACKDROP_LABEL = "Fond de la page";
const TEXT_EXCERPT = 24;

const SHAPE_LABELS: Readonly<Record<string, string>> = { rect: "Rectangle", ellipse: "Ellipse", line: "Ligne", arrow: "Flèche" };
const KIND_LABELS: Readonly<Record<string, string>> = {
  stroke: "Trait",
  image: "Image",
  media: "Média",
  model3d: "Objet 3D",
  table: "Tableau",
  fill: "Zone remplie",
};

/** Nom d'un objet libre : sa sorte, et pour un texte le début de son contenu. */
function labelOf(el: ElementView): string {
  if (el.kind === "shape") return SHAPE_LABELS[el.shape.shape] ?? "Forme";
  if (el.kind === "text") {
    const first = el.text.content.trim().split("\n")[0] ?? "";
    return first === "" ? "Texte" : `Texte : ${first.length > TEXT_EXCERPT ? `${first.slice(0, TEXT_EXCERPT - 1)}…` : first}`;
  }
  return KIND_LABELS[el.kind] ?? "Objet";
}

/** Icône d'une sorte : celle de son outil (forme : rect, ellipse, ligne ou flèche), sinon `rect`. */
function iconOf(el: ElementView): string {
  if (el.kind === "shape") return TOOL_ICONS[el.shape.shape] ?? "rect";
  if (el.kind === "stroke") return TOOL_ICONS["pen"]!;
  if (el.kind === "text" || el.kind === "table" || el.kind === "fill") return TOOL_ICONS[el.kind]!;
  return el.kind === "image" ? "library" : "rect";
}

interface Unit {
  readonly key: string;
  readonly ids: string[];
  /** Rangs dans la pile (du bas, à partir de 0), croissants. */
  readonly at: number[];
  readonly kind: string;
  readonly icon: string;
  label: string;
}

/** Unités mobiles, premier plan d'abord ; une unité se place à son membre le plus haut. */
function units(doc: Reader, page: string): { readonly list: Unit[]; readonly stack: readonly string[] } {
  const stack = doc.elementIds(page);
  const byKey = new Map<string, Unit>();
  stack.forEach((id, rank) => {
    const el = doc.element(id);
    if (el === null) return;
    const g = outerGroup(el);
    const key = g === null ? id : `group:${g}`;
    let u = byKey.get(key);
    if (u === undefined) {
      u = { key, ids: [], at: [], kind: g === null ? el.kind : "group", icon: g === null ? iconOf(el) : "layers", label: g === null ? labelOf(el) : "" };
      byKey.set(key, u);
    }
    u.ids.push(id);
    u.at.push(rank);
  });
  const list = [...byKey.values()];
  for (const u of list) if (u.kind === "group") u.label = `Groupe (${u.ids.length})`;
  list.sort((a, b) => b.at[b.at.length - 1]! - a.at[a.at.length - 1]!);
  return { list, stack };
}

export function layerRows(doc: Reader, page: string): readonly LayerRow[] {
  const mobile: LayerRow[] = units(doc, page).list.map((u) => ({ key: u.key, ids: u.ids, label: u.label, kind: u.kind, fixed: false, icon: u.icon }));
  const grid = doc.page(page)?.grid ?? null;
  const gridRow: LayerRow[] = grid !== null && grid.visible ? [{ key: "grid", ids: [], label: GRID_LABEL, kind: "grid", fixed: true, icon: "grid" }] : [];
  const backdrop: LayerRow = { key: "backdrop", ids: [], label: BACKDROP_LABEL, kind: "backdrop", fixed: true, icon: "rectangle-horizontal" };
  const above = grid?.above === true;
  return above ? [...gridRow, ...mobile, backdrop] : [...mobile, ...gridRow, backdrop];
}

/** Rang de chaque id de `stack` une fois `block` retiré. */
function restIndex(stack: readonly string[], block: ReadonlySet<string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of stack) if (!block.has(id)) out.set(id, out.size);
  return out;
}

/**
 * Glisser d'une ligne : `slot` = rang de lâcher dans la liste des lignes mobiles sans la ligne tirée (premier plan = 0,
 * même convention que `startSortDrag`). Rend `Restack` pour le bloc de la ligne ; null si la ligne ne bouge pas.
 */
export function dropTarget(doc: Reader, page: string, key: string, slot: number): { readonly ids: string[]; readonly to: number } | null {
  const { list, stack } = units(doc, page);
  const from = list.findIndex((u) => u.key === key);
  if (from < 0 || slot === from) return null;
  const moved = list[from]!;
  const order = list.filter((_, i) => i !== from);
  const at = Math.max(0, Math.min(order.length, slot));
  const below = order[at]; // la ligne qui, après le lâcher, est juste sous le bloc
  const rest = restIndex(stack, new Set(moved.ids));
  const to = below === undefined ? 0 : rest.get(below.ids[below.ids.length - 1]!)! + 1;
  return { ids: moved.ids, to };
}

/** Un rang vers le premier plan (`up`) ou l'arrière-plan (`down`) pour les unités touchées par `ids` ; null si impossible. */
export function stepTarget(doc: Reader, page: string, ids: readonly string[], dir: "up" | "down"): number | null {
  const { list, stack } = units(doc, page);
  const want = new Set(ids);
  const picked = list.flatMap((u, i) => (u.ids.some((id) => want.has(id)) ? [i] : []));
  if (picked.length === 0) return null;
  const block = new Set(picked.flatMap((i) => list[i]!.ids));
  const rest = restIndex(stack, block);
  if (dir === "up") {
    const over = list[Math.min(...picked) - 1];
    return over === undefined ? null : rest.get(over.ids[over.ids.length - 1]!)! + 1;
  }
  const under = list[Math.max(...picked) + 1];
  return under === undefined ? null : rest.get(under.ids[0]!)!;
}

/** Ids des unités touchées par `ids` (un groupe entier), dans l'ordre de la pile. */
export function wholeUnits(doc: Reader, page: string, ids: readonly string[]): string[] {
  const want = new Set(ids);
  const { list, stack } = units(doc, page);
  const keep = new Set(list.filter((u) => u.ids.some((id) => want.has(id))).flatMap((u) => u.ids));
  return stack.filter((id) => keep.has(id));
}
