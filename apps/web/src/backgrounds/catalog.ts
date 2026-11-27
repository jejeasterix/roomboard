/**
 * Pack de fonds (personnalisation-1b, Q7 à Q10, Q14, DA2, DA3) : sections, thèmes et forme d'un fond du pack. Inspiré
 * des familles de MyViewBoard (couleurs, fonds préinstallés, images de l'utilisateur, modèles par matière), en mots
 * seulement. Le catalogue (dessinés et photos) se charge par import dynamique à la première ouverture de la fenêtre
 * (`loadPack`) ; aucune provenance ici (Q13, Q33).
 */
import type { GridInput } from "../core/api";

export type SectionId = "mine" | "colors" | "lines" | "lessons" | "images";
export type PackSectionId = Exclude<SectionId, "mine">;
export type PackKind = "color" | "grid" | "svg" | "photo";
export interface Theme {
  readonly id: string;
  readonly label: string;
}
export interface Section {
  readonly id: SectionId;
  readonly label: string;
  /** Nom d'icône de `ui/icons.ts`. */
  readonly icon: string;
  readonly themes: readonly Theme[];
}
export interface PackPhoto {
  /** Chemins relatifs au dossier servi `backgrounds/`. */
  readonly file: string;
  readonly thumb: string;
  readonly w: number;
  readonly h: number;
}
export interface PackBackground {
  readonly id: string;
  readonly section: PackSectionId;
  readonly theme: string;
  readonly label: string;
  /** Mots-clés français (synonymes et fautes : `search.ts`). */
  readonly keywords: readonly string[];
  readonly kind: PackKind;
  /** Couleur de la page : toute la page (couleur, grille) ou ce que l'image ne couvre pas (Q30). */
  readonly color: string;
  readonly grid: GridInput | null;
  readonly photo: PackPhoto | null;
}

const t = (id: string, label: string): Theme => ({ id, label });

export const SECTIONS: readonly Section[] = Object.freeze([
  { id: "mine", label: "Mes fonds", icon: "library", themes: [] },
  { id: "colors", label: "Couleurs", icon: "fill", themes: [t("claires", "Claires"), t("sombres", "Sombres"), t("degrades", "Dégradés")] },
  {
    id: "lines",
    label: "Lignes et grilles",
    icon: "grid",
    themes: [t("lignages", "Lignages"), t("quadrillages", "Quadrillages"), t("seyes", "Seyès"), t("points", "Points"), t("isometrique", "Isométrique"), t("portees", "Portées")],
  },
  {
    id: "lessons",
    label: "Modèles de cours",
    icon: "table",
    themes: [t("organisation", "Organisation"), t("reflexion", "Réflexion"), t("mathematiques", "Mathématiques"), t("ecriture", "Écriture"), t("sport", "Sport")],
  },
  {
    id: "images",
    label: "Images",
    icon: "wallpaper",
    themes: [t("nature", "Nature"), t("mer-ciel", "Mer et ciel"), t("matieres", "Matières"), t("saisons", "Saisons"), t("abstrait", "Abstrait")],
  },
] satisfies Section[]);

export const DEFAULT_SECTION: SectionId = "colors";
export const ALL_THEMES = "all";
export const ALL_THEMES_LABEL = "Tous";
/** Plancher et plafond du pack complet (dessinés + photos), testés sur le total (Q10, Q11). */
export const PACK_MIN = 150;
export const PACK_MAX = 200;

/** Catalogue complet, chargé à la première ouverture de la fenêtre (Q14) ; les photos pleines ne se lisent qu'à l'application. */
export async function loadPack(): Promise<readonly PackBackground[]> {
  const [{ DRAWN }, { PHOTOS }] = await Promise.all([import("./drawn"), import("./photos")]);
  return [...DRAWN, ...PHOTOS];
}
