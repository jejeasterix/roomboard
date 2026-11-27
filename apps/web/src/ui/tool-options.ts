// OG11 (DA-1) : sections du panneau d'options et valeurs mixtes. `formValue` adapte `getFormValue` d'Excalidraw
// (packages/excalidraw/actions/actionProperties.tsx:230-272), Copyright (c) 2020 Excalidraw, licence MIT.
import type { ElementView } from "../core/api";
import type { ToolChoice } from "../engine/input/gesture"; // gesture.ts:27
import { presetsOf, TABLE_FILLS, type Profile } from "../toolbar";

export type OptionKey = "strokeColor" | "background" | "strokeWidth" | "strokeStyle" | "roughness" | "roundness" | "opacity" | "actions";
export const OPTION_ORDER: readonly OptionKey[] = ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity", "actions"];

const FORM: readonly OptionKey[] = ["strokeColor", "strokeWidth", "strokeStyle", "roughness", "opacity"];
const BY_TOOL: Readonly<Partial<Record<string, readonly OptionKey[]>>> = {
  pen: ["strokeColor", "strokeWidth", "opacity"],
  rect: ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"],
  ellipse: ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "opacity"],
  line: FORM,
  arrow: FORM,
  text: ["strokeColor", "opacity"],
};
const BY_KIND: Readonly<Record<string, (e: ElementView) => readonly OptionKey[]>> = {
  stroke: () => BY_TOOL["pen"]!,
  shape: (e) => (e.kind === "shape" ? BY_TOOL[e.shape.shape] ?? [] : []),
  text: () => BY_TOOL["text"]!,
  image: () => ["opacity"],
};
function byElement(e: ElementView): readonly OptionKey[] {
  return Object.hasOwn(BY_KIND, e.kind) ? BY_KIND[e.kind]!(e) : [];
}
export function sectionsFor(tool: ToolChoice, targets: readonly ElementView[], _editing: boolean): readonly OptionKey[] {
  const on = new Set<OptionKey>(BY_TOOL[tool] ?? []);
  for (const t of targets) for (const k of byElement(t)) on.add(k);
  if (targets.length > 0) on.add("actions");
  return OPTION_ORDER.filter((k) => on.has(k));
}
export function disabledIn(_key: OptionKey, _editing: boolean): boolean {
  return false;
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
export const FALLBACK_STROKES: readonly string[] = ["#000000", "#dc2626", "#1d4ed8", "#15803d", "#facc15"];
const PICKS = 5; // COLOR_TOP_PICKS_SLOTS (Excalidraw colors.ts:236)
export function strokePicks(presets: Profile["presets"], tool: ToolChoice): readonly string[] {
  const out: string[] = [];
  const add = (c: string | undefined): void => { if (c && !out.includes(c) && out.length < PICKS) out.push(c); };
  for (const p of presetsOf(presets, tool as never)) add(p.color);
  for (const p of presetsOf(presets, "pen" as never)) add(p.color);
  for (const c of FALLBACK_STROKES) add(c);
  return out;
}
export function backgroundPicks(): readonly (string | null)[] {
  return [null, ...["jaune", "vert", "bleu", "rose"].map((id) => TABLE_FILLS.find((f) => f.id === id)?.color ?? null)];
}
const DRAW = new Set(["pen", "rect", "ellipse", "line", "arrow", "text"]);
export function showsPanel(tool: ToolChoice, selection: number, annotating: boolean): boolean {
  if (annotating) return false;
  return DRAW.has(tool) || selection > 0;
}
