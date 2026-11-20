/** Rendu derrière une interface (DA2, D19) : Canvas 2D au socle ; WebGL2 pourra remplacer l'implémentation (DA9). */
import type { Change, CoreDocument, EraseMode } from "../../core/api";
import type { Camera } from "../camera";
import type { EditOverlay } from "./overlay";

export interface PageView {
  readonly id: string;
  readonly elementIds: readonly string[];
}

/** Trait en cours : contour du StrokeBuilder (polygones x, y monde séparés par NaN, NaN) et queue prédite. */
export interface LiveStrokeView {
  readonly outline: Float32Array;
  /** x, y monde : dernier point reçu puis points prédits ; vide si aucun. Jamais enregistrés (D20). */
  readonly predicted: Float32Array;
  readonly color: string;
  /** Épaisseur en unités monde. */
  readonly width: number;
}

/** Passage de gomme en cours (D38) : chemin x, y monde, rayon en unités monde. */
export interface EraserPreview {
  readonly path: Float32Array;
  readonly radius: number;
  readonly mode: EraseMode;
}

export interface LiveLayer {
  readonly strokes: readonly LiveStrokeView[];
  readonly erasers: readonly EraserPreview[];
}

export const EMPTY_LIVE: LiveLayer = { strokes: [], erasers: [] };

/** Ce que le rendu lit du document : vue d'un élément, contour local et, s'il y en a, lignes de la grille (C9). */
export type SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines">>;

export interface Renderer {
  /**
   * Scène fixe (G11) : pourtour, fond de page, grille si `above` est faux, éléments sauf `hidden` (masqués pendant un
   * aperçu, D38), contenu du calque d'édition (fantômes, formes en cours), grille si `above` est vrai, puis habillage
   * d'édition (rectangle de sélection, cadre, poignées : CL4-1). `overlay` absent : rien.
   */
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void;
  /** Canvas d'interaction : effacé puis redessiné à chaque image. */
  drawLive(live: LiveLayer, camera: Camera): void;
  /** Taille de la zone en px CSS et devicePixelRatio. */
  resize(width: number, height: number, dpr: number): void;
  /** Oublie les chemins en cache des éléments touchés (`full` : tous). */
  invalidate(change: Change): void;
}
