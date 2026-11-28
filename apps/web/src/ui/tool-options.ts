// OG11 (DA-1) : sections du panneau d'options et valeurs mixtes. `formValue` adapte `getFormValue` d'Excalidraw
// (packages/excalidraw/actions/actionProperties.tsx:230-272), Copyright (c) 2020 Excalidraw, licence MIT.
import type { ElementView } from "../core/api";
import type { StrokeKind } from "../core/look";
import { isClosedShape } from "../core/shapes";
import type { ToolChoice } from "../engine/input/gesture"; // gesture.ts:27
import { presetsOf, TABLE_FILLS, type Profile } from "../toolbar";
import type { RadioOption } from "./RadioChoices";

export type OptionKey =
  | "strokeColor" | "background" | "fillStyle" | "strokeWidth" | "pressure" | "strokeStyle" | "roughness" | "roundness"
  | "font" | "fontSize" | "textAlign" | "arrowType" | "arrowheads" | "opacity" | "image" | "media" | "model3d" | "layers" | "align" | "transform" | "actions"
  | "tableObjects" | "tableAlign" | "tableBorder" | "tableRows" | "tableAccept";
export const OPTION_ORDER: readonly OptionKey[] = [
  "strokeColor", "background", "fillStyle", "strokeWidth", "pressure", "strokeStyle", "roughness", "roundness",
  // OG12 : la place réservée `editPoints` est devenue sa vraie section, « Type de flèche » (`arrowType`), à l'ordre
  // décidé par OG12 (avant les pointes, comme Excalidraw) ; « Modifier les points » est un bouton d'`actions`.
  "font", "fontSize", "textAlign", "arrowType", "arrowheads", "opacity", "image",
  // OG34 : les commandes du média et de l'objet 3D (barres flottantes de C14 et C15) deviennent des sections.
  "media", "model3d",
  "layers", "align", "transform", "actions",
  "tableObjects", "tableAlign", "tableBorder", "tableRows", "tableAccept",
];
/** OG23 : sections ouvertes au premier affichage (`image`, `media`, `model3d` : la section propre d'un objet seul). */
export const OPEN_BY_DEFAULT: ReadonlySet<OptionKey> = new Set<OptionKey>(["strokeColor", "background", "strokeWidth", "image", "media", "model3d", "tableAlign", "tableBorder"]);
/** DS10 : sections de l'outil Tableau, montrées avec une case active. */
export const TABLE_SECTIONS: readonly OptionKey[] = ["tableObjects", "tableAlign", "tableBorder", "tableRows", "tableAccept"];
/** Section ouverte : l'état gardé sur l'appareil s'il est booléen, sinon le défaut. */
export function sectionOpen(key: OptionKey, saved: Readonly<Partial<Record<string, boolean>>>): boolean {
  const v = Object.hasOwn(saved, key) ? saved[key] : undefined;
  return typeof v === "boolean" ? v : OPEN_BY_DEFAULT.has(key);
}
/** Aligner demande 2 unités, Répartir 3. */
export const ALIGN_MIN_UNITS = 2;
export const DISTRIBUTE_MIN_UNITS = 3;
/** Lot 2 : tailles et polices proposées (Excalidraw : S, M, L, XL ; ici les tailles du texte de la barre). */
export const TEXT_SIZES: readonly number[] = [24, 36, 48, 72];
export const FONTS = [
  { value: "default", label: "Normale", font: null },
  { value: "Georgia", label: "Georgia", font: "Georgia" },
  { value: "Courier New", label: "Courier New", font: "Courier New" },
] as const;

const FORM: readonly OptionKey[] = ["strokeColor", "strokeWidth", "strokeStyle", "roughness", "opacity"];
const BY_TOOL: Readonly<Partial<Record<string, readonly OptionKey[]>>> = {
  pen: ["strokeColor", "strokeWidth", "pressure", "opacity"],
  rect: ["strokeColor", "background", "fillStyle", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"],
  ellipse: ["strokeColor", "background", "fillStyle", "strokeWidth", "strokeStyle", "roughness", "opacity"],
  diamond: ["strokeColor", "background", "fillStyle", "strokeWidth", "strokeStyle", "roughness", "opacity"],
  line: [...FORM.slice(0, 4), "roundness", "opacity"],
  arrow: [...FORM.slice(0, 4), "arrowType", "arrowheads", "opacity"],
  text: ["strokeColor", "font", "fontSize", "textAlign", "opacity"],
};
/** OG12 lot 2a : ligne fermée (`polygon: true`), options d'une forme sans Angles. */
const POLYGON: readonly OptionKey[] = BY_TOOL["diamond"]!;
const BY_KIND: Readonly<Record<string, (e: ElementView) => readonly OptionKey[]>> = {
  stroke: () => BY_TOOL["pen"]!,
  shape: (e) => (e.kind === "shape" ? (isClosedShape(e.shape) ? POLYGON : BY_TOOL[e.shape.shape] ?? []) : []),
  text: () => BY_TOOL["text"]!,
  image: () => ["opacity"],
};
function byElement(e: ElementView): readonly OptionKey[] {
  return Object.hasOwn(BY_KIND, e.kind) ? BY_KIND[e.kind]!(e) : [];
}
/** Vrai si l'option `key` s'applique à l'élément `e` (même table que les sections) : sert à ignorer, dans le calcul
 *  d'une valeur mixte, les éléments qui n'ont pas la propriété (un trait de stylo n'a ni tirets ni fond). */
export function appliesTo(key: OptionKey, e: ElementView): boolean {
  return byElement(e).includes(key);
}
/** `background` : fond du style courant, lu quand aucune cible n'est choisie (le remplissage n'a de sens qu'avec un fond). */
export function sectionsFor(tool: ToolChoice, targets: readonly ElementView[], _editing: boolean, background: string | null = null, units = 0, tableCell = false): readonly OptionKey[] {
  const on = new Set<OptionKey>(BY_TOOL[tool] ?? []);
  for (const t of targets) for (const k of byElement(t)) on.add(k);
  if (tool === "table" && tableCell) for (const k of TABLE_SECTIONS) on.add(k);
  if (targets.length > 0) { on.add("layers"); on.add("transform"); on.add("actions"); }
  const only = targets.length === 1 ? targets[0]!.kind : null;
  if (only === "image" || only === "media" || only === "model3d") on.add(only);
  if (units >= ALIGN_MIN_UNITS) on.add("align");
  const filled = targets.length > 0 ? targets.some((t) => t.kind === "shape" && t.shape.fill != null) : background !== null;
  if (!filled) on.delete("fillStyle");
  return OPTION_ORDER.filter((k) => on.has(k));
}
/** En saisie de texte, la rangée Format gouverne la police, la taille et la couleur : le panneau les grise. */
export function disabledIn(key: OptionKey, editing: boolean): boolean {
  return editing && (key === "font" || key === "fontSize" || key === "strokeColor");
}
export function formValue<T>(targets: readonly ElementView[], read: (e: ElementView) => T | undefined, current: T): T | null {
  let seen = false;
  let common: T | undefined;
  for (const t of targets) {
    const v = read(t);
    if (v === undefined) continue;
    if (!seen) { seen = true; common = v; continue; }
    if (v !== common) return null;
  }
  return seen ? (common as T) : current;
}
export const WIDTHS = [
  { value: "2", label: "Fin" },
  { value: "4", label: "Moyen" },
  { value: "8", label: "Épais" },
] as const;
/** Segments d'épaisseur (icônes fine, moyenne, épaisse) : section Épaisseur (`OptionsPanel`) et bordure du tableau
 *  (`TableOptions`). */
export const WIDTH_OPTIONS: readonly RadioOption<"2" | "4" | "8">[] = WIDTHS.map((w) => ({
  value: w.value, label: w.label, icon: w.value === "2" ? "width-thin" : w.value === "4" ? "width-medium" : "width-thick",
}));
/** Segments de style de trait : section Style (`OptionsPanel`) ; la bordure du tableau y ajoute « Aucune bordure ». */
export const STROKES: readonly RadioOption<StrokeKind>[] = [
  { value: "solid", label: "Plein", icon: "stroke-solid" },
  { value: "dashed", label: "Tirets", icon: "stroke-dashed" },
  { value: "dotted", label: "Pointillés", icon: "stroke-dotted" },
];
/** Pastille de couleur : valeur (`null` = transparent) et nom lisible (infobulle, `aria-label`). */
export interface Pick {
  readonly color: string | null;
  readonly label: string;
}
const COLOR_NAMES: Readonly<Record<string, string>> = {
  "#000000": "Noir", "#dc2626": "Rouge", "#1d4ed8": "Bleu", "#15803d": "Vert", "#facc15": "Jaune",
};
export const colorName = (c: string): string => (Object.hasOwn(COLOR_NAMES, c.toLowerCase()) ? COLOR_NAMES[c.toLowerCase()]! : c);
export const FALLBACK_STROKES: readonly string[] = ["#000000", "#dc2626", "#1d4ed8", "#15803d", "#facc15"];
const PICKS = 4; // OG23 : 4 pastilles rapides, le reste dans la palette
export function strokePicks(presets: Profile["presets"], tool: ToolChoice): readonly Pick[] {
  const out: string[] = [];
  const add = (c: string | undefined): void => { if (c && !out.includes(c) && out.length < PICKS) out.push(c); };
  for (const p of presetsOf(presets, tool as never)) add(p.color);
  for (const p of presetsOf(presets, "pen" as never)) add(p.color);
  for (const c of FALLBACK_STROKES) add(c);
  return out.map((color) => ({ color, label: colorName(color) }));
}
export function backgroundPicks(): readonly Pick[] {
  return [
    { color: null, label: "Transparent" },
    ...["jaune", "vert", "bleu"].map((id): Pick => {
      const f = TABLE_FILLS.find((x) => x.id === id);
      return { color: f?.color ?? null, label: f?.label ?? id };
    }),
  ];
}
const DRAW = new Set(["pen", "rect", "ellipse", "diamond", "line", "arrow", "text", "table"]);
export function showsPanel(tool: ToolChoice, selection: number, annotating: boolean): boolean {
  if (annotating) return false;
  return DRAW.has(tool) || selection > 0;
}
/** OG23 : « Glisser une copie » pour chaque objet (décision 29) : tous les genres, sauf un genre inconnu du cœur et la
 *  zone du pot (`fill`), où le cœur n'écrit jamais `dragCopy` (`style.rs` `writes_for`). */
export function admitsDragCopy(e: ElementView): boolean {
  return e.kind !== "unknown" && e.kind !== "fill";
}
