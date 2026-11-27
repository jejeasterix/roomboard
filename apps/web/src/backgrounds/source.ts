/**
 * Source d'un fond (personnalisation-1b, Q1, Q31) : l'aspect complet d'une page, prêt à appliquer : couleur de page,
 * grille ou aucune, image ou aucune (octets, type, taille source). Rendue par le pack (`resolvePack`) et par « Mes
 * fonds » (`MyBackgrounds.read`), consommée par `backgroundCommand` (interface et CLI).
 */
import type { GridInput } from "../core/api";

export interface BackgroundImage {
  readonly blob: Blob;
  /** Nom de l'asset dans le document (`AssetRef.name`). */
  readonly name: string;
  readonly mime: string;
  /** Taille source en pixels ; l'image est calée sur la largeur de la page (`fit: "width"`). */
  readonly w: number;
  readonly h: number;
}
export interface BackgroundSource {
  readonly color: string;
  readonly grid: GridInput | null;
  readonly image: BackgroundImage | null;
}
