/** Rendu derrière une interface (DA2, D19) : Canvas 2D au socle ; WebGL2 pourra remplacer l'implémentation (DA9). */
import type { BackdropView, Bounds, Change, CoreDocument, EraseMode, GridView, ImageParams, Matrix } from "../../core/api";
import type { Camera } from "../camera";
import type { EditOverlay } from "./overlay";

export interface PageView {
  readonly id: string;
  readonly elementIds: readonly string[];
  /** Fond de la page (C6a, DA4) ; absent : `PAGE_BACKGROUND`. */
  readonly background?: string;
  /** C12 (PF14) : fond de la page, lu par le moteur dans `doc.page(id)` ; absent ou null : aucun fond. */
  readonly backdrop?: BackdropView | null;
  /** DA4 : champs du cadre (`pageFrame`), ceux de `PageView` du cœur ; absents : 1920 × 1080, mode Page. */
  readonly width?: number;
  readonly height?: number;
  readonly mode?: string;
}

/** C12 (PF15) : état du fond après une scène — "" sans fond, `attente`, `pret`, `echec` (`#stage[data-fond]`). */
export type BackdropState = "" | "attente" | "pret" | "echec";

/** C12 (DAPF2) : peintre du fond `pdf-page` (cache de tuiles `pdf-tiles.ts`), appelé dans la scène, sans attente. */
export interface BackdropPainter {
  paint(
    ctx: CanvasRenderingContext2D,
    backdrop: BackdropView,
    camera: Camera,
    view: { readonly w: number; readonly h: number; readonly dpr: number },
  ): Exclude<BackdropState, "">;
}

/** Trait en cours : contour du StrokeBuilder (polygones x, y monde séparés par NaN, NaN), points prédits compris (OF44). */
export interface LiveStrokeView {
  readonly outline: Float32Array;
  readonly color: string;
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
  /** OG11 : opacité du trait vif (0..100 ; absent = 100), posée en CSS sur le canvas d'interaction. */
  readonly opacity?: number;
}

/** OG11 : opacité CSS du canvas d'interaction — `opacity` < 100 → o / 100 ; absente ou 100 → "" ; écrite si elle change.
 *  Sans `style` (OffscreenCanvas, faux canvas des tests) : rien. */
export function setLiveOpacity(canvas: unknown, opacity: number | undefined): void {
  const style = (canvas as { style?: { opacity: string } } | null)?.style;
  if (!style) return;
  const v = opacity !== undefined && opacity < 100 ? String(Math.max(0, opacity) / 100) : "";
  if (style.opacity !== v) style.opacity = v;
}

export const EMPTY_LIVE: LiveLayer = { strokes: [], erasers: [] };

/** Ce que le rendu lit du document : vue d'un élément, contour local, lignes de la grille et, pour l'aperçu de l'éditeur,
 *  lignes d'une grille non enregistrée (C9). */
export type SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines" | "gridLinesOf" | "fillRings">>;

/** Aperçu de la grille (C9 éditeur, DAE1) : `grid` remplace celle du document sur `page` ; null = aucune grille. */
export interface GridPreview {
  readonly page: string;
  readonly grid: GridView | null;
}

/** Aperçu d'une image (C5, DAI4, I28) : `params` et `matrix` remplacent ceux du document pour l'élément `id` ; `frame` :
 *  cadre de rognage dans la boîte affichée de l'aperçu (pixels source), voile au-dehors, huit poignées. Rien n'est écrit. */
export interface ImagePreview {
  readonly id: string;
  readonly params: ImageParams;
  readonly matrix: Matrix;
  readonly frame?: Bounds;
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
  /** Aperçu d'une image (C5, DAI4) : rien n'est écrit ; `null` rend l'image du document. */
  setImagePreview(p: ImagePreview | null): void;
}
