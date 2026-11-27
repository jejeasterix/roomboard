// OG11 (déc. 23) : style courant commun à tous les outils (currentItem* d'Excalidraw), gardé sur l'appareil.
import { STROKE_STYLES, type Roughness, type Roundness, type StrokeKind } from "../core/look";
import { validColor } from "../core/rich-text";

export interface ItemStyle {
  readonly color: string;
  readonly width: number;
  readonly background: string | null;
  readonly strokeStyle: StrokeKind;
  readonly roughness: Roughness;
  readonly roundness: Roundness;
  readonly opacity: number;
}
export const DEFAULT_ITEM_STYLE: ItemStyle = Object.freeze({
  color: "#000000", width: 4, background: null, strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: 100,
});
const KINDS: readonly string[] = ["solid", ...STROKE_STYLES];
const ok: { readonly [K in keyof ItemStyle]: (v: unknown) => boolean } = {
  color: (v) => typeof v === "string" && validColor(v),
  width: (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
  background: (v) => v === null || (typeof v === "string" && validColor(v)),
  strokeStyle: (v) => typeof v === "string" && KINDS.includes(v),
  roughness: (v) => v === 0 || v === 1 || v === 2,
  roundness: (v) => v === "sharp" || v === "round",
  opacity: (v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100,
};
const KEYS = Object.keys(ok) as (keyof ItemStyle)[];

export function parseItemStyle(raw: string | null): ItemStyle | null {
  if (raw === null) return null;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return null; }
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  // Champ absent : son défaut (le lot 2 ajoute des champs sans perdre le style gardé) ; champ invalide : illisible (déc. 23).
  if (!KEYS.every((k) => !(k in r) || ok[k](r[k]))) return null;
  return Object.freeze(Object.fromEntries(KEYS.map((k) => [k, k in r ? r[k] : DEFAULT_ITEM_STYLE[k]]))) as unknown as ItemStyle;
}
/** Champs invalides ignorés. */
export function mergeItemStyle(s: ItemStyle, patch: Partial<ItemStyle>): ItemStyle {
  const next: Record<string, unknown> = { ...s };
  for (const k of KEYS) if (k in patch && ok[k](patch[k])) next[k] = patch[k];
  return Object.freeze(next) as unknown as ItemStyle;
}
