// Contrat de la liaison du cœur (DA5, D10, D38), figé au lot 2. Le moteur (lot 3) n'appelle que ceci.
// points : triplets x, y, pression (monde à l'entrée de CommitStroke, locaux à la lecture, placés par transform).
// path : paires x, y en coordonnées monde. Contour : polygone x, y local à l'élément.
// StrokeBuilderApi.push : polygones x, y monde séparés par une paire NaN, NaN (blocs figés au-delà de 2 000 points).
// Change.full = true : tout invalider (annuler, rétablir). Lot 4 : AddShape, SetText, Transform ; éléments shape et text.
// Forme : rect / ellipse = boîte locale (0, 0)-(w, h), w, h ≥ 0 ; line / arrow = segment (0, 0)-(w, h) (core/shapes.ts).
// Texte : boîte locale (0, 0)-(boxWidth, boxHeight) ; style.color = couleur du texte, style.width = 0.

export type Matrix = readonly [number, number, number, number, number, number];
export interface StrokeStyle { readonly color: string; readonly width: number }
export type EraseMode = "partial" | "object";
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";
export type ElementKind = "stroke" | "shape" | "text";

export interface Change {
  readonly pages: readonly string[];
  readonly ids: readonly string[];
  readonly removed: readonly string[];
  readonly full: boolean;
  readonly version: number;
}

export type Command =
  | { readonly type: "AddPage"; readonly after: string | null }
  | { readonly type: "RemovePage"; readonly page: string }
  | { readonly type: "CommitStroke"; readonly page: string; readonly points: Float32Array; readonly style: StrokeStyle }
  | { readonly type: "Erase"; readonly page: string; readonly path: Float32Array; readonly radius: number; readonly mode: EraseMode }
  | { readonly type: "Delete"; readonly ids: readonly string[] }
  | {
      readonly type: "AddShape";
      readonly page: string;
      readonly shape: ShapeKind;
      readonly x0: number;
      readonly y0: number;
      readonly x1: number;
      readonly y1: number;
      readonly style: StrokeStyle;
      readonly fill: string | null;
    }
  | {
      readonly type: "SetText";
      readonly page: string;
      /** null : nouvelle boîte en (x, y) ; sinon le texte à remplacer (x, y ignorés). Contenu vide : rien ou retrait. */
      readonly id: string | null;
      readonly x: number;
      readonly y: number;
      readonly content: string;
      readonly color: string;
      readonly size: number;
      readonly boxWidth: number;
      readonly boxHeight: number;
    }
  | { readonly type: "Transform"; readonly ids: readonly string[]; readonly matrix: Matrix };

export interface ShapeData { readonly shape: ShapeKind; readonly w: number; readonly h: number; readonly fill: string | null }
export interface TextData { readonly content: string; readonly size: number; readonly boxWidth: number; readonly boxHeight: number }

interface ElementBase {
  readonly id: string;
  readonly transform: Matrix;
  readonly style: StrokeStyle;
}
export interface StrokeElement extends ElementBase { readonly kind: "stroke" }
export interface ShapeElement extends ElementBase { readonly kind: "shape"; readonly shape: ShapeData }
export interface TextElement extends ElementBase { readonly kind: "text"; readonly text: TextData }
export type ElementView = StrokeElement | ShapeElement | TextElement;

export interface Bounds { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

export interface StrokeBuilderApi {
  push(points: Float32Array): Float32Array;
  finish(): Float32Array;
  free(): void;
}

export interface CoreDocument {
  pageIds(): string[];
  elementIds(page: string): string[];
  /** Lève une Error dont le message dit la cause (page inconnue, dernière page, points invalides). */
  apply(cmd: Command): Change;
  element(id: string): ElementView | null;
  points(id: string): Float32Array | null;
  outline(id: string): Float32Array | null;
  hitTest(page: string, x: number, y: number, tol: number): string | null;
  hitTestPath(page: string, path: Float32Array, radius: number): string[];
  idsInRect(page: string, rect: Bounds): string[];
  bounds(ids: readonly string[]): Bounds | null;
  undo(): Change;
  redo(): Change;
  canUndo(): boolean;
  canRedo(): boolean;
  version(): number;
  save(now: string, appVersion: string): Uint8Array;
  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi;
  free(): void;
}

export interface CoreFactory {
  blank(): CoreDocument;
  /** Lève une Error lisible si le fichier n'est pas un .roomboard, est plus récent, ou est corrompu. */
  load(bytes: Uint8Array): CoreDocument;
  version(): string;
}

export const NO_CHANGE: Change = { pages: [], ids: [], removed: [], full: false, version: 0 };
