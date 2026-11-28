/**
 * Brouillon de l'éditeur de grille (C9 éditeur, E4 à E6) : fonctions pures `GridDraft → GridDraft`, sans DOM ni moteur,
 * comme `profile-edit.ts` pour l'éditeur de profil. Le panneau (`ui/GridPanel.tsx`) ne fait qu'appeler ces fonctions ;
 * `toGrid` rend la grille que l'aperçu montre et que « Appliquer » écrit en un seul `SetGrid`. Seul le premier niveau est
 * réglé (type, pas, couleur, épaisseur) avec le magnétisme de tête ; le reste (niveaux suivants, `visible`, `above`,
 * origine, trait, `snap` et `visible` du niveau) est recopié tel quel. Une fonction qui ne change rien rend son entrée.
 */
import {
  DEFAULT_GRID_LINE_WIDTH,
  GRID_KINDS,
  MAX_GRID_LINE_WIDTH,
  MIN_GRID_LINE_WIDTH,
  type GridKind,
  type GridLevel,
  type GridView,
} from "./core/api";

export type GridChoice = GridKind | "none" | "other";

export interface GridDraft {
  /** Grille du document à l'ouverture ; null : page sans grille. */
  readonly base: GridView | null;
  readonly kind: GridChoice;
  /** Pas en unités de page, écrit dans spacingX et spacingY (E5). */
  readonly spacing: number;
  readonly color: string;
  /** Épaisseur en pixels CSS d'écran (E1). */
  readonly lineWidth: number;
  /** Magnétisme de tête (`grid.snap`). */
  readonly snap: boolean;
  /** Le pas a été saisi ou posé par un type : il s'écrit dans spacingX et spacingY (E5). */
  readonly spacingSet: boolean;
  /** Le type a été choisi : « Aucune » choisi retire la grille ; « Aucune » d'office (sans niveau lisible) la garde (E2, G5). */
  readonly kindSet: boolean;
  /** OG69 (G5) : page ouverte sans grille et magnétisme jamais touché : il suit le type choisi (`SNAP_BY_DEFAULT`). */
  readonly snapAuto?: boolean;
}

/** Pas posé par le choix d'un type (E5) : Seyès 8 mm à 3,78 unités par mm, portée 20. */
export const GRID_DEFAULT_SPACING: Readonly<Record<GridKind, number>> = Object.freeze({
  squares: 40,
  lines: 40,
  dots: 40,
  isometric: 40,
  music: 20,
  seyes: 30.24,
});
export const GRID_KIND_LABELS: Readonly<Record<GridKind | "none", string>> = Object.freeze({
  none: "Aucune",
  squares: "Carreaux",
  lines: "Lignes",
  dots: "Points",
  isometric: "Isométrique",
  music: "Portée",
  seyes: "Seyès",
});
/** Ordre du choix « Type » : Aucune, puis les six types du cœur. */
export const GRID_CHOICES: readonly (GridKind | "none")[] = Object.freeze(["none", ...GRID_KINDS]);
export const OTHER_KIND_LABEL = "Autre (non pris en charge)";
/** Couleur d'une grille neuve (E6) : gris ardoise des séparateurs (`rb.css`). */
export const NEW_GRID_COLOR = "#94a3b8";
export const GRID_LINE_WIDTHS: readonly number[] = Object.freeze([1, 2, 3, 4]);
export const MIN_GRID_SPACING = 4;
export const MAX_GRID_SPACING = 400;
/** OG69 (G5) : aimant allumé d'office à la création d'une grille, sauf Seyès et portée (lignes d'écriture, pas de nœuds utiles). */
export const SNAP_BY_DEFAULT = (k: GridKind): boolean => k !== "seyes" && k !== "music";

const isKind = (k: string): k is GridKind => (GRID_KINDS as readonly string[]).includes(k);

export function draftOf(g: GridView | null): GridDraft {
  const head = g?.levels[0];
  const snap = g?.snap ?? false;
  if (head === undefined) {
    return { base: g, kind: "none", spacing: GRID_DEFAULT_SPACING.squares, color: NEW_GRID_COLOR, lineWidth: DEFAULT_GRID_LINE_WIDTH, snap, spacingSet: false, kindSet: false, snapAuto: true };
  }
  return { base: g, kind: isKind(head.kind) ? head.kind : "other", spacing: head.spacingX, color: head.color, lineWidth: head.lineWidth, snap, spacingSet: false, kindSet: false };
}

/** Choisir un type pose son pas par défaut (E5) ; couleur et épaisseur gardées ; magnétisme gardé, sauf sur une page
 *  ouverte sans grille où il suit le type tant qu'il n'est pas touché (G5, OG69). */
export function withKind(d: GridDraft, k: GridKind | "none"): GridDraft {
  if (k === d.kind) return d;
  if (k === "none") return { ...d, kind: "none", kindSet: true };
  const snap = d.snapAuto === true ? SNAP_BY_DEFAULT(k) : d.snap;
  return { ...d, kind: k, spacing: GRID_DEFAULT_SPACING[k], spacingSet: true, kindSet: true, snap };
}

/** Pas borné à [4, 400] ; non fini : inchangé (HE9). */
export function withSpacing(d: GridDraft, v: number): GridDraft {
  if (!Number.isFinite(v)) return d;
  const spacing = Math.min(MAX_GRID_SPACING, Math.max(MIN_GRID_SPACING, v));
  return spacing === d.spacing ? d : { ...d, spacing, spacingSet: true };
}

/** Texte du champ « Pas » → nombre ; vide : NaN (valeur précédente gardée, HE9). */
export const spacingOf = (raw: string): number => (raw.trim() === "" ? Number.NaN : Number(raw));

/** OG69 (G3) : texte que le champ « Pas » prend dès la saisie, ou null s'il reste tel quel. Hors bornes : la borne ; sauf
 *  un seul chiffre 1 à 3, début possible d'un pas de 10 à 39, ramené seulement au relâcher du champ (`change`). */
export function spacingFieldText(raw: string): string | null {
  const v = spacingOf(raw);
  if (!Number.isFinite(v) || /^[1-3]$/.test(raw.trim())) return null;
  if (v < MIN_GRID_SPACING) return String(MIN_GRID_SPACING);
  if (v > MAX_GRID_SPACING) return String(MAX_GRID_SPACING);
  return null;
}

export function withColor(d: GridDraft, c: string): GridDraft {
  return c === "" || c === d.color ? d : { ...d, color: c };
}

/** Épaisseur dans [1, 8] (E1), sinon inchangé. */
export function withLineWidth(d: GridDraft, w: number): GridDraft {
  if (!Number.isFinite(w) || w < MIN_GRID_LINE_WIDTH || w > MAX_GRID_LINE_WIDTH || w === d.lineWidth) return d;
  return { ...d, lineWidth: w };
}

/** Magnétisme touché à la main : il ne suit plus le type (G5, OG69). */
export function withSnap(d: GridDraft, on: boolean): GridDraft {
  return on === d.snap && d.snapAuto !== true ? d : { ...d, snap: on, snapAuto: false };
}

/** Choix « Épaisseur » : 1 à 4 px, plus la valeur du document si elle est ailleurs dans [1, 8]. */
export const lineWidthOptions = (current: number): readonly number[] =>
  GRID_LINE_WIDTHS.includes(current) ? GRID_LINE_WIDTHS : [...GRID_LINE_WIDTHS, current].sort((a, b) => a - b);

/** Valeur d'un `input type="color"` : `#rrggbb` en minuscules ; toute autre couleur du document montre du noir. */
export const colorInputValue = (c: string): string => (/^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : "#000000");

/** Niveau d'une grille neuve (E6) : origine 0, trait plein, aimanté et visible. */
const NEW_LEVEL = { originX: 0, originY: 0, line: "solid", snap: true, visible: true } as const;
const NEW_GRID: GridView = { visible: true, snap: false, above: false, levels: [] };

/** Grille du brouillon : null pour « Aucune » ; « Autre » garde la grille (seul le magnétisme de tête change). */
export function toGrid(d: GridDraft): GridView | null {
  if (d.kind === "none") return d.kindSet ? null : d.base;
  const base = d.base ?? NEW_GRID;
  if (d.kind === "other") return { ...base, snap: d.snap };
  const head = base.levels[0];
  const keep = head !== undefined && head.kind === d.kind && !d.spacingSet;
  const level: GridLevel = {
    ...NEW_LEVEL,
    ...head,
    kind: d.kind,
    spacingX: keep ? head.spacingX : d.spacing,
    spacingY: keep ? head.spacingY : d.spacing,
    color: d.color,
    lineWidth: d.lineWidth,
  };
  return { ...base, snap: d.snap, levels: [level, ...base.levels.slice(1)] };
}
