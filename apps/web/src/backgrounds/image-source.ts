/** Source « fichier image » d'un fond (Q22) : page blanche, sans grille, l'image sondée. Partagée par « Mes fonds » et la CLI. */
import { MAX_PIXELS } from "../platform/image-import";
import type { BackgroundSource } from "./source";

/** Ce que rend la sonde d'en-tête (`probeImage`) : type et taille source. */
export interface ProbedSize {
  readonly mime: string;
  readonly w: number;
  readonly h: number;
}

/** La source d'un fichier image déjà sondé ; `null` au-delà de `MAX_PIXELS` (chaque appelant garde sa propre erreur). */
export function imageSource(blob: Blob, name: string, probed: ProbedSize): BackgroundSource | null {
  if (probed.w * probed.h > MAX_PIXELS) return null;
  return { color: "#ffffff", grid: null, image: { blob, name, mime: probed.mime, w: probed.w, h: probed.h } };
}
