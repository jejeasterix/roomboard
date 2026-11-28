// OG11 (déc. 24) : aspect facultatif d'un élément, noms d'Excalidraw (MIT) ; absent = neutre.
export type StrokeKind = "solid" | "dashed" | "dotted";
export type Roughness = 0 | 1 | 2;
export type Roundness = "sharp" | "round";
/** Lot 2 (T12) : remplissage ; le plein est le neutre. */
export type FillKind = "solid" | "hachure" | "cross-hatch";
export type Arrowhead = "none" | "arrow" | "triangle" | "triangle_outline" | "bar" | "circle" | "circle_outline" | "diamond" | "diamond_outline";
export type TextAlign = "left" | "center" | "right";
/** Vue du cœur (champs absents = neutres), noms d'Excalidraw. */
export interface Look {
  readonly strokeStyle?: "dashed" | "dotted";
  readonly roughness?: 1 | 2;
  readonly seed?: number;
  readonly roundness?: "round";
  readonly opacity?: number;
  readonly fillStyle?: "hachure" | "cross-hatch";
  /** Absent = `none` (le défaut n'est jamais écrit). */
  readonly startArrowhead?: Arrowhead;
  /** Absent = `arrow` (le défaut n'est jamais écrit). */
  readonly endArrowhead?: Arrowhead;
  readonly textAlign?: "center" | "right";
  /** `http://`, `https://` ou `mailto:` (`validLink`). */
  readonly link?: string;
  /** OG23 : pression constante d'un trait ; absent = variable, le neutre (jamais écrit). */
  readonly variability?: "constant";
  /** OG23 (T10) : glisser pose une copie, l'original reste ; absent = déplacer, le neutre (seul `true` est écrit). */
  readonly dragCopy?: true;
  /** OG12 (n° 2) : flèche coudée ; `true` seul, jamais `false`. */
  readonly elbowed?: true;
}
export interface LookPatch {
  readonly color?: string;
  readonly width?: number;
  readonly fill?: string | null;
  readonly strokeStyle?: "dashed" | "dotted" | null;
  readonly roughness?: Roughness;
  readonly roundness?: "round" | null;
  readonly opacity?: number;
  readonly fillStyle?: "hachure" | "cross-hatch" | null;
  /** Le défaut (`none`) retire le champ. */
  readonly startArrowhead?: Arrowhead | null;
  /** Le défaut (`arrow`) retire le champ. */
  readonly endArrowhead?: Arrowhead | null;
  readonly textAlign?: "center" | "right" | null;
  readonly link?: string | null;
  /** OG23 : écrit sur les traits seuls ; null retire (pression variable). */
  readonly variability?: "constant" | null;
  /** OG23 (T10) : `true` pose « Glisser une copie », `false` le retire ; traits, formes, textes, images. */
  readonly dragCopy?: boolean;
  readonly elbowed?: boolean | null;
}
/** Traits non pleins (le plein est le neutre : absent de `Look`). */
export const STROKE_STYLES: readonly string[] = ["dashed", "dotted"];
/** Copie d'`element.rs` (T12) : remplissages non pleins, pointes, alignements non gauches. */
export const FILL_STYLES: readonly string[] = ["hachure", "cross-hatch"];
export const ARROWHEADS: readonly string[] = ["none", "arrow", "triangle", "triangle_outline", "bar", "circle", "circle_outline", "diamond", "diamond_outline"];
export const START_ARROWHEAD_DEFAULT: Arrowhead = "none";
export const END_ARROWHEAD_DEFAULT: Arrowhead = "arrow";
export const TEXT_ALIGNS: readonly string[] = ["center", "right"];
/** OG23 : pression d'un trait ; seule `constant` est écrite (`VARIABILITY_CONSTANT` du cœur). */
export type Variability = "variable" | "constant";
export const VARIABILITY_CONSTANT = "constant";
export const LINK_MAX_CHARS = 2048;
/** Interdits de `valid_link` : blancs Unicode de Rust (`White_Space`, sans U+FEFF que `\s` de JS ajoute), `"`, `<`, `>`, `\`, catégorie Cc. */
const LINK_FORBIDDEN = /[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000"<>\\\p{Cc}]/u;
/** `valid_link` du cœur : trois schémas, casse exacte, 2 048 caractères au plus (points de code), sans blanc, `"`, `<`,
 *  `>`, `\` ni caractère de contrôle (`char::is_whitespace` et `is_control` de Rust). */
export function validLink(s: string): boolean {
  return ["http://", "https://", "mailto:"].some((p) => s.startsWith(p)) && [...s].length <= LINK_MAX_CHARS && !LINK_FORBIDDEN.test(s);
}
/** Graine neuve d'un geste : entier 32 bits non signé. */
export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}
export const NEUTRAL_LOOK: Look = Object.freeze({});
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined;

/** Lecture défensive d'un objet venu du cœur. */
export function toLook(v: unknown): Look | undefined {
  if (!isRec(v)) return undefined;
  const out: { -readonly [K in keyof Look]: Look[K] } = {};
  if (typeof v["strokeStyle"] === "string" && STROKE_STYLES.includes(v["strokeStyle"])) out.strokeStyle = v["strokeStyle"] as "dashed" | "dotted";
  const r = int(v["roughness"], 2);
  if (r === 1 || r === 2) {
    out.roughness = r;
    const s = int(v["seed"], 0xffffffff);
    if (s !== undefined) out.seed = s;
  }
  if (v["roundness"] === "round") out.roundness = "round";
  const o = int(v["opacity"], 100);
  if (o !== undefined && o < 100) out.opacity = o; // 0..100, 100 = neutre (arbitrage)
  const str = (k: string, allowed: readonly string[]): string | undefined => {
    const x = v[k];
    return typeof x === "string" && allowed.includes(x) ? x : undefined;
  };
  const fill = str("fillStyle", FILL_STYLES);
  if (fill !== undefined) out.fillStyle = fill as "hachure" | "cross-hatch";
  const start = str("startArrowhead", ARROWHEADS);
  if (start !== undefined && start !== START_ARROWHEAD_DEFAULT) out.startArrowhead = start as Arrowhead;
  const end = str("endArrowhead", ARROWHEADS);
  if (end !== undefined && end !== END_ARROWHEAD_DEFAULT) out.endArrowhead = end as Arrowhead;
  const align = str("textAlign", TEXT_ALIGNS);
  if (align !== undefined) out.textAlign = align as "center" | "right";
  const link = v["link"];
  if (typeof link === "string" && validLink(link)) out.link = link;
  if (v["variability"] === VARIABILITY_CONSTANT) out.variability = VARIABILITY_CONSTANT;
  if (v["dragCopy"] === true) out.dragCopy = true;
  if (v["elbowed"] === true) out.elbowed = true;
  return Object.keys(out).length === 0 ? undefined : out;
}
export const strokeKindOf = (l: Look | undefined): StrokeKind => l?.strokeStyle ?? "solid";
export const roughnessOf = (l: Look | undefined): Roughness => l?.roughness ?? 0;
export const roundnessOf = (l: Look | undefined): Roundness => l?.roundness ?? "sharp";
/** 0..100, 100 si absent. */
export const opacityOf = (l: Look | undefined): number => l?.opacity ?? 100;
export const fillStyleOf = (l: Look | undefined): FillKind => l?.fillStyle ?? "solid";
export const startArrowheadOf = (l: Look | undefined): Arrowhead => l?.startArrowhead ?? START_ARROWHEAD_DEFAULT;
export const endArrowheadOf = (l: Look | undefined): Arrowhead => l?.endArrowhead ?? END_ARROWHEAD_DEFAULT;
/** OG12 : flèche coudée ? */
export const elbowedOf = (l: Look | undefined): boolean => l?.elbowed === true;
export const textAlignOf = (l: Look | undefined): TextAlign => l?.textAlign ?? "left";
export const variabilityOf = (l: Look | undefined): Variability => l?.variability ?? "variable";
/** OG23 (T10) : glisser l'objet pose une copie. */
export const dragCopyOf = (l: Look | undefined): boolean => l?.dragCopy === true;

/** undefined si neutre. */
export function lookFrom(
  s: { strokeStyle: StrokeKind; roughness: Roughness; roundness: Roundness; opacity: number; fillStyle?: FillKind; startArrowhead?: Arrowhead; endArrowhead?: Arrowhead; textAlign?: TextAlign; variability?: Variability; elbowed?: boolean },
  seed: number | null,
): Look | undefined {
  const out: { -readonly [K in keyof Look]: Look[K] } = {};
  if (s.strokeStyle !== "solid") out.strokeStyle = s.strokeStyle;
  if (s.roughness !== 0) {
    out.roughness = s.roughness;
    if (seed !== null) out.seed = seed >>> 0;
  }
  if (s.roundness === "round") out.roundness = "round";
  if (s.opacity < 100) out.opacity = Math.max(0, Math.round(s.opacity));
  // Lot 2 : valeur neutre (plein, pointes par défaut, gauche) = rien écrit.
  if (s.fillStyle !== undefined && s.fillStyle !== "solid") out.fillStyle = s.fillStyle;
  if (s.startArrowhead !== undefined && s.startArrowhead !== START_ARROWHEAD_DEFAULT) out.startArrowhead = s.startArrowhead;
  if (s.endArrowhead !== undefined && s.endArrowhead !== END_ARROWHEAD_DEFAULT) out.endArrowhead = s.endArrowhead;
  if (s.textAlign !== undefined && s.textAlign !== "left") out.textAlign = s.textAlign;
  if (s.variability === VARIABILITY_CONSTANT) out.variability = VARIABILITY_CONSTANT;
  if (s.elbowed === true) out.elbowed = true;
  return Object.keys(out).length === 0 ? undefined : out;
}

/** Aspect réduit à l'opacité (stylo, texte neuf) ; undefined si 100. */
export const opacityLook = (opacity: number): Look | undefined =>
  lookFrom({ strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity }, null);
