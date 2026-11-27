// OG11 (déc. 24) : aspect facultatif d'un élément, noms d'Excalidraw (MIT) ; absent = neutre.
export type StrokeKind = "solid" | "dashed" | "dotted";
export type Roughness = 0 | 1 | 2;
export type Roundness = "sharp" | "round";
/** Vue du cœur (champs absents = neutres), noms d'Excalidraw. */
export interface Look {
  readonly strokeStyle?: "dashed" | "dotted";
  readonly roughness?: 1 | 2;
  readonly seed?: number;
  readonly roundness?: "round";
  readonly opacity?: number;
}
export interface LookPatch {
  readonly color?: string;
  readonly width?: number;
  readonly fill?: string | null;
  readonly strokeStyle?: "dashed" | "dotted" | null;
  readonly roughness?: Roughness;
  readonly roundness?: "round" | null;
  readonly opacity?: number;
}
export const NEUTRAL_LOOK: Look = Object.freeze({});
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined;

/** Lecture défensive d'un objet venu du cœur. */
export function toLook(v: unknown): Look | undefined {
  if (!isRec(v)) return undefined;
  const out: { -readonly [K in keyof Look]: Look[K] } = {};
  if (v["strokeStyle"] === "dashed" || v["strokeStyle"] === "dotted") out.strokeStyle = v["strokeStyle"];
  const r = int(v["roughness"], 2);
  if (r === 1 || r === 2) {
    out.roughness = r;
    const s = int(v["seed"], 0xffffffff);
    if (s !== undefined) out.seed = s;
  }
  if (v["roundness"] === "round") out.roundness = "round";
  const o = int(v["opacity"], 100);
  if (o !== undefined && o < 100) out.opacity = o; // 0..100, 100 = neutre (arbitrage)
  return Object.keys(out).length === 0 ? undefined : out;
}
export const strokeKindOf = (l: Look | undefined): StrokeKind => l?.strokeStyle ?? "solid";
export const roughnessOf = (l: Look | undefined): Roughness => l?.roughness ?? 0;
export const roundnessOf = (l: Look | undefined): Roundness => l?.roundness ?? "sharp";
/** 0..100, 100 si absent. */
export const opacityOf = (l: Look | undefined): number => l?.opacity ?? 100;

/** undefined si neutre. */
export function lookFrom(s: { strokeStyle: StrokeKind; roughness: Roughness; roundness: Roundness; opacity: number }, seed: number | null): Look | undefined {
  const out: { -readonly [K in keyof Look]: Look[K] } = {};
  if (s.strokeStyle !== "solid") out.strokeStyle = s.strokeStyle;
  if (s.roughness !== 0) {
    out.roughness = s.roughness;
    if (seed !== null) out.seed = seed >>> 0;
  }
  if (s.roundness === "round") out.roundness = "round";
  if (s.opacity < 100) out.opacity = Math.max(0, Math.round(s.opacity));
  return Object.keys(out).length === 0 ? undefined : out;
}

/** Aspect réduit à l'opacité (stylo, texte neuf) ; undefined si 100. */
export const opacityLook = (opacity: number): Look | undefined =>
  lookFrom({ strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity }, null);
