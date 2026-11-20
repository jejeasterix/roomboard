/** Rendu derrière une interface (DA2, D19) : Canvas 2D au socle ; WebGL2 pourra remplacer l'implémentation (DA9). */
import type { Change, CoreDocument, EraseMode, GridView } from "../../core/api";
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

/** Ce que le rendu lit du document : vue d'un élément, contour local, lignes de la grille et, pour l'aperçu de l'éditeur,
 *  lignes d'une grille non enregistrée (C9). */
export type SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines" | "gridLinesOf">>;

/** Aperçu de la grille (C9 éditeur, DAE1) : `grid` remplace celle du document sur `page` ; null = aucune grille. */
export interface GridPreview {
  readonly page: string;
  readonly grid: GridView | null;
}

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
  /** Aperçu de grille (DAE1) : rien n'est écrit ; `null` rend la grille du document. */
  setGridPreview(p: GridPreview | null): void;
}
