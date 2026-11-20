// Contrat de la liaison du cœur (DA5, D10, D38), figé au lot 2. Le moteur (lot 3) n'appelle que ceci.
// points : triplets x, y, pression (monde à l'entrée de CommitStroke, locaux à la lecture, placés par transform).
// path : paires x, y en coordonnées monde. Contour : polygone x, y local à l'élément.
// StrokeBuilderApi.push : polygones x, y monde séparés par une paire NaN, NaN (blocs figés au-delà de 2 000 points).
// Change.full = true : tout invalider (annuler, rétablir). Lot 4 : AddShape, SetText, Transform ; éléments shape et text.
// Forme : rect / ellipse = boîte locale (0, 0)-(w, h), w, h ≥ 0 ; line / arrow = segment (0, 0)-(w, h) (core/shapes.ts).
// Texte : boîte locale (0, 0)-(boxWidth, boxHeight) ; style.color = couleur du texte, style.width = 0.
// C2 : AddImage, SetBackdrop ; éléments image et unknown (style absent) ; page(id), citedAssets, asset, saveParts, loadParts.
// C7 : FormatText (patch d'attributs sur une plage UTF-16, une étape) ; TextData.spans = segments du texte (U27, DAU9).
// C9 : SetGrid ; PageView.grid ; snapPoint, snapDelta, gridLines (géométrie dans le cœur, DAG1 ; fausse liaison : carreaux seuls, DAG3).
// C9 éditeur : GridLevel.lineWidth et LevelLines.lineWidth (px CSS d'écran, 1 à 8) ; gridLinesOf (grille non enregistrée, aperçu, DAE1).
// C10a : AddTable, SetTableCell, InsertTableLine, RemoveTableLine, SetTableSizes, SetTableFill (une étape chacune, D38) ;
// élément table (TableData, cellules non vides dans l'ordre de lecture) ; tableau mal formé : élément unknown, sourceKind "table".
// C7b : SetText et SetTableCell gagnent spans (état voulu des segments, appliqué dans la même étape) ; TableCell.spans.
// C3 : Group, Ungroup ; ElementBase.group ; extract, insertFragment, insertPages, saveFragment(Parts), loadFragment(Parts).

export type Matrix = readonly [number, number, number, number, number, number];
export interface StrokeStyle { readonly color: string; readonly width: number }
export type EraseMode = "partial" | "object";
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";
export type ElementKind = "stroke" | "shape" | "text" | "image" | "table" | "unknown";
export interface AssetRef { readonly id: string; readonly name: string; readonly mime: string; readonly size: number }
/** Métadonnée d'un asset cité (K3) : même forme que la référence ; défauts du cœur pour une entrée absente (K4). */
export type AssetInfo = AssetRef;
/** Fond demandé par SetBackdrop ; seul fit = "width" est accepté à l'écriture (K6). */
export interface BackdropInput { readonly asset: AssetRef; readonly w: number; readonly h: number; readonly fit: string }

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
      /** C7b (R7) : état voulu des segments (concaténation = content) ; absent : différence seule (C7). */
      readonly spans?: readonly TextSpan[];
    }
  | { readonly type: "Transform"; readonly ids: readonly string[]; readonly matrix: Matrix }
  | { readonly type: "AddImage"; readonly page: string; readonly asset: AssetRef; readonly w: number; readonly h: number; readonly matrix: Matrix }
  /** backdrop null : retire le fond ; même valeur : aucune étape (D38). */
  | { readonly type: "SetBackdrop"; readonly page: string; readonly backdrop: BackdropInput | null }
  /** C7 : start, len en unités UTF-16 du contenu ; attrs = patch (absent ou undefined : inchangé ; false, null : retiré). */
  | {
      readonly type: "FormatText";
      readonly id: string;
      readonly start: number;
      readonly len: number;
      readonly attrs: TextAttrsPatch;
      /** Hauteur de boîte mesurée par la page, écrite si elle change. */
      readonly boxHeight?: number;
    }
  /** grid null : retire la grille ; même grille : aucune étape (D38) ; remplacée en bloc, une étape (G5). */
  | { readonly type: "SetGrid"; readonly page: string; readonly grid: GridInput | null }
  /** C10a : 1 à 64 colonnes et lignes ; coin en (x, y). */
  | {
      readonly type: "AddTable";
      readonly page: string;
      readonly x: number;
      readonly y: number;
      readonly cols: number;
      readonly rows: number;
      readonly colWidth: number;
      readonly rowHeight: number;
      readonly color: string;
      readonly size: number;
    }
  /** row, col = ids ; rowHeight : hauteur exigée mesurée par la page, écrite si plus grande (T5). */
  | { readonly type: "SetTableCell"; readonly id: string; readonly row: string; readonly col: string; readonly content: string; readonly rowHeight?: number; readonly spans?: readonly TextSpan[] }
  /** at ∈ 0..=n ; taille de la voisine at - 1, sinon de la première. */
  | { readonly type: "InsertTableLine"; readonly id: string; readonly axis: TableAxis; readonly at: number }
  /** Retire aussi ses cellules ; refusée s'il n'en reste qu'une. */
  | { readonly type: "RemoveTableLine"; readonly id: string; readonly axis: TableAxis; readonly line: string }
  /** Uniformiser : toutes les colonnes, toutes les lignes (peut réduire, T11). */
  | { readonly type: "SetTableSizes"; readonly id: string; readonly colWidth: number; readonly rowHeight: number }
  /** null retire. */
  | { readonly type: "SetTableFill"; readonly id: string; readonly row: string; readonly col: string; readonly fill: string | null }
  /** C3 (Z1) : deux unités au moins (objet seul ou groupe extérieur entier) d'une même page ; un id d'un groupe vaut tout
   *  son groupe extérieur ; ids = éléments écrits, triés. */
  | { readonly type: "Group"; readonly ids: readonly string[] }
  /** C3 (Z1) : retire le niveau extérieur des ids groupés ; aucun : aucune étape. */
  | { readonly type: "Ungroup"; readonly ids: readonly string[] };

export interface ShapeData { readonly shape: ShapeKind; readonly w: number; readonly h: number; readonly fill: string | null }
export interface TextData {
  readonly content: string;
  readonly size: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
  /** C7 : segments ; un texte sans attribut = un seul segment { text: content, attrs: {} }. */
  readonly spans: readonly TextSpan[];
}

export interface ImageData { readonly asset: string; readonly w: number; readonly h: number }
export interface UnknownData { readonly sourceKind: string; readonly w: number; readonly h: number }

export type TableAxis = "row" | "col";
export interface TableCol { readonly id: string; readonly width: number }
export interface TableRow { readonly id: string; readonly height: number }
/** Cellule non vide (texte ou remplissage) ; `fill` = remplissage (U32), null sans remplissage ; `spans` = segments du
 *  texte (C7b, R16), un segment sans attribut pour une cellule d'avant C7b. */
export interface TableCell { readonly row: string; readonly col: string; readonly text: string; readonly fill: string | null; readonly spans: readonly TextSpan[] }
/** Tableau (T13) : boîte locale (0, 0)-(somme des largeurs, somme des hauteurs) ; cellules non vides dans l'ordre de lecture. */
export interface TableData {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  readonly cells: readonly TableCell[];
}

interface ElementBase {
  readonly id: string;
  readonly transform: Matrix;
  /** C3 (Z1) : chemin de groupes, extérieur d'abord ; absent sans groupe. */
  readonly group?: readonly string[];
}
export interface StrokeElement extends ElementBase { readonly kind: "stroke"; readonly style: StrokeStyle }
export interface ShapeElement extends ElementBase { readonly kind: "shape"; readonly style: StrokeStyle; readonly shape: ShapeData }
export interface TextElement extends ElementBase { readonly kind: "text"; readonly style: StrokeStyle; readonly text: TextData }
/** Image (U5) : boîte locale (0, 0)-(w, h), taille source en pixels. */
export interface ImageElement extends ElementBase { readonly kind: "image"; readonly image: ImageData }
/** Élément d'un kind inconnu (U3) : gardé, dessiné comme un cadre, boîte (0, 0)-(w, h). */
export interface UnknownElement extends ElementBase { readonly kind: "unknown"; readonly unknown: UnknownData }
/** Tableau (C10a) : coin en (0, 0) local, placé par transform. */
export interface TableElement extends ElementBase { readonly kind: "table"; readonly table: TableData }
export type ElementView = StrokeElement | ShapeElement | TextElement | ImageElement | TableElement | UnknownElement;

/** Fond de page (U6, K6) : rect calculé par le cœur, calé sur la largeur de la page ; null si w ou h illisibles. */
export interface BackdropView {
  readonly asset: string;
  readonly kind: string;
  readonly w: number | null;
  readonly h: number | null;
  readonly fit: string;
  readonly rect: Bounds | null;
}
export interface PageView {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly backdrop: BackdropView | null;
  readonly grid: GridView | null;
}

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
  page(id: string): PageView | null;
  citedAssets(): AssetInfo[];
  asset(id: string): AssetInfo | null;
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
  saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array];
  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi;
  free(): void;
  /** Point aimanté de la page (G6) ; null sans grille, magnétisme coupé, aucun niveau qui accroche ou page inconnue. */
  snapPoint(page: string, x: number, y: number): readonly [number, number] | null;
  /** Déplacement aimanté depuis le déplacement brut (G7) ; brut sans grille, sans magnétisme ou sans élément. */
  snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number];
  /** Lignes visibles de la grille dans `rect` (monde), familles sous `minStep` et points sous `minDotStep` sautés (G9). */
  gridLines(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null;
  /** Lignes d'une grille non enregistrée sur la page (C9 éditeur, DAE1) : même calcul que gridLines ; null si la page est
   *  inconnue ou la grille invisible. Rien n'est écrit. */
  gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number): GridLines | null;
  /** C3 (Z5) : document neuf d'une page qui porte une recopie des éléments `ids` de `page` (ids neufs, aucune étape). */
  extract(page: string, ids: readonly string[]): CoreDocument;
  /** C3 : éléments de la première page de `src` en haut de `page`, translatés ; une étape ; source vide : aucune. */
  insertFragment(src: CoreDocument, page: string, dx: number, dy: number): Change;
  /** C3 : pages de `src` recopiées à la suite de `after` ; une étape. */
  insertPages(src: CoreDocument, after: string): Change;
  /** C3 (Z6) : `.rbitem` sans asset (ZIP du cœur). */
  saveFragment(now: string, appVersion: string, name: string): Uint8Array;
  /** C3 (Z6) : manifeste et `document.ybin` d'un fragment, pour le conteneur avec assets. */
  saveFragmentParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array];
}

export interface CoreFactory {
  blank(): CoreDocument;
  /** Lève une Error lisible si le fichier n'est pas un .roomboard, est plus récent, ou est corrompu. */
  load(bytes: Uint8Array): CoreDocument;
  loadParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
  version(): string;
  /** C3 : lit un `.rbitem` sans asset ; un document est refusé (message du cœur). */
  loadFragment(bytes: Uint8Array): CoreDocument;
  loadFragmentParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
}

export const NO_CHANGE: Change = { pages: [], ids: [], removed: [], full: false, version: 0 };
export const DEFAULT_ASSET_MIME = "application/octet-stream";
export const UNKNOWN_BOX = 100;
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
/** Plafond des lignes et des colonnes d'un tableau (BadTable). */
export const TABLE_MAX_LINES = 64;
/** Défauts d'un tableau lu sans couleur ou sans taille lisible (T2). */
export const DEFAULT_TABLE_COLOR = "#000000";
export const DEFAULT_TABLE_SIZE = 36;
/** Messages C3 du cœur (G10), repris à l'identique par la fausse liaison. */
export const BAD_GROUP_MESSAGE = "groupe invalide (au moins deux objets ou groupes d'une même page, ids connus attendus)";
export const NOT_A_DOCUMENT_MESSAGE = "ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page";
export const NOT_A_FRAGMENT_MESSAGE = "ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages";
export const unknownKindMessage = (kind: string): string =>
  `type de fichier RoomBoard inconnu (« ${kind} ») : pris en charge dans une prochaine version`;
/** Source d'une insertion venue de l'autre liaison (fausse ↔ Wasm) : jamais mêlées (DAZ2). */
export const MIXED_SOURCE_MESSAGE = "source d'une autre liaison : insertion impossible";

/** Attributs d'un segment (C7, T2-T3) ; absent = défaut : couleur et taille de l'élément, police du socle, faux. */
export interface TextAttrs {
  readonly bold?: true;
  readonly italic?: true;
  readonly underline?: true;
  readonly color?: string;
  readonly size?: number;
  readonly font?: string;
}
/** Patch de FormatText (T7) : clé absente = inchangée ; false ou null = retiré. */
export interface TextAttrsPatch {
  readonly bold?: boolean | null;
  readonly italic?: boolean | null;
  readonly underline?: boolean | null;
  readonly color?: string | null;
  readonly size?: number | null;
  readonly font?: string | null;
}
export interface TextSpan { readonly text: string; readonly attrs: TextAttrs }

/** Types de grille dessinés et aimantés (U31) ; tout autre kind est gardé tel quel, ignoré (C4). */
export const GRID_KINDS = ["squares", "lines", "dots", "isometric", "music", "seyes"] as const;
export type GridKind = (typeof GRID_KINDS)[number];
export const MAX_GRID_LEVELS = 16;
/** Plafond des points d'un niveau et des lignes d'une famille (G9). */
export const MAX_GRID_DOTS = 65_536;
export const DEFAULT_GRID_COLOR = "#000000";
/** Épaisseur d'un niveau (E1), en pixels CSS d'écran : défaut, puis bornes de l'écriture. */
export const DEFAULT_GRID_LINE_WIDTH = 1;
export const MIN_GRID_LINE_WIDTH = 1;
export const MAX_GRID_LINE_WIDTH = 8;
/** Niveau de grille (U31) ; kind et line inconnus gardés tels quels (line inconnu dessiné plein). */
export interface GridLevel {
  readonly kind: string;
  readonly spacingX: number;
  readonly spacingY: number;
  readonly originX: number;
  readonly originY: number;
  readonly color: string;
  readonly line: string;
  /** Épaisseur en pixels CSS d'écran, 1 à 8 (E1) ; absente ou hors bornes à la lecture : 1. */
  readonly lineWidth: number;
  readonly snap: boolean;
  readonly visible: boolean;
}
export interface GridView {
  readonly visible: boolean;
  readonly snap: boolean;
  readonly above: boolean;
  readonly levels: readonly GridLevel[];
}
/** Grille demandée par SetGrid : même forme que la vue. */
export type GridInput = GridView;
/** Groupe de lignes en unités de page : segments x0, y0, x1, y1 et points x, y à la suite. */
export interface LevelLines {
  readonly color: string;
  readonly line: string;
  readonly alpha: number;
  /** Épaisseur du niveau, en pixels CSS d'écran (E1). */
  readonly lineWidth: number;
  readonly segments: readonly number[];
  readonly dots: readonly number[];
}
export interface GridLines {
  readonly above: boolean;
  readonly levels: readonly LevelLines[];
}
