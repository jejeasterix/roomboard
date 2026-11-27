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
// C10b : MergeTableCells, SplitTableCell, SetTableShade, ImportTable ; RemoveTableLine.to, SetTableFill.to (plages) ;
// TableData.merges (zones calculées par le cœur, règle F2 : la page les lit, ne les recalcule pas) ; TableCell.shade (F8).
// C7b : SetText et SetTableCell gagnent spans (état voulu des segments, appliqué dans la même étape) ; TableCell.spans.
// C6a : Fill (contour, intérieur, fond de page ; une étape, D38) ; edgeHit (bord d'une forme, mesuré par le cœur, DA2).
// C3 : Group, Ungroup ; ElementBase.group ; extract, insertFragment, insertPages, saveFragment(Parts), loadFragment(Parts).
// C5 : SetImageParams (état voulu complet des réglages et nouvelle matrice, une étape, D38) ; ImageData porte les réglages
// (neutres absents, I4) ; la boîte locale d'une image est sa boîte affichée (image-params.ts, displaySize).

export type Matrix = readonly [number, number, number, number, number, number];
export interface StrokeStyle { readonly color: string; readonly width: number }
export type EraseMode = "partial" | "object";
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";
export type ElementKind = "stroke" | "shape" | "text" | "image" | "media" | "model3d" | "table" | "fill" | "unknown";
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

/** Cible du pot (C6a, D12) : contour (`color` d'une forme ou d'un trait), intérieur (`fill` d'un rectangle ou d'une
 *  ellipse), fond de la page (`background`) ; C6b (B2) : image, avec le nouvel asset calculé par la page (pixels remplis
 *  ou effacés) ; `color` y est contrôlée, jamais écrite. C8 : zone fermée au point monde (x, y), tolérance de fermeture
 *  `tol` monde (2 px / zoom) ; le cœur la calcule à l'écriture, sinon le fond. */
export type FillTarget =
  | { readonly kind: "edge" | "inside"; readonly id: string }
  | { readonly kind: "background" }
  | { readonly kind: "image"; readonly id: string; readonly asset: AssetRef }
  | { readonly kind: "zone"; readonly x: number; readonly y: number; readonly tol: number };

import type { PageLayout } from "../toolbar";
/** Disposition d'une page (décisions 3, 4, 6) : même littéral que le profil (`toolbar.ts`), aucune copie. */
export type { PageLayout };
/** Mode lu d'une page : `"page"` (Paysage, Portrait, `mode` absent ou inconnu) ou `"infinite"` (U3). */
export type PageMode = "page" | "infinite";

export type Command =
  | { readonly type: "AddPage"; readonly after: string | null; readonly mode?: PageLayout }
  | { readonly type: "RemovePage"; readonly page: string }
  | { readonly type: "SetPageMode"; readonly page: string; readonly mode: PageLayout }
  | { readonly type: "MovePage"; readonly page: string; readonly to: number }
  | { readonly type: "DuplicatePage"; readonly page: string }
  /** Ordre des objets (décision 16) : bloc des `ids` (une même page), bas au rang `to` (0 = arrière-plan), ids gardés. */
  | { readonly type: "Restack"; readonly ids: readonly string[]; readonly to: number }
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
  /** C14 : élément média (vidéo ou son), une étape ; refus sans écriture dans l'ordre BadAsset (asset, poster), BadMedia
   *  (lien vide ou > 4 096 points de code, w ou h non finis > 0 ou hors f32, durée non finie ou < 0), BadMatrix, page inconnue.
   *  `linked` : chemin local du fichier lié (M30), écrit dans la métadonnée du média seulement si elle est absente. */
  | {
      readonly type: "AddMedia";
      readonly page: string;
      readonly asset: AssetRef;
      readonly linked: string | null;
      readonly mediaType: MediaType;
      readonly w: number;
      readonly h: number;
      readonly duration: number;
      readonly poster: AssetRef | null;
      readonly matrix: Matrix;
    }
  /** C14 (M6) : état voulu des réglages ; neutres : début 0, fin null, loop false, volume 1 ; même état : aucune étape. */
  | { readonly type: "SetMedia"; readonly id: string; readonly trimStart: number; readonly trimEnd: number | null; readonly loop: boolean; readonly volume: number }
  /** C15 (X7) : objet 3D, une étape ; refus sans écriture dans l'ordre BadAsset (principal, liés, instantané), BadModel3d
   *  (format, boîte finie > 0 en f32, yaw dans ]−π, π], |pitch| ≤ 85°, 256 liés au plus, chemins valides et uniques),
   *  BadMatrix, page inconnue. Métadonnées du principal, des liés et de l'instantané écrites si absentes. */
  | {
      readonly type: "AddModel3d";
      readonly page: string;
      readonly asset: AssetRef;
      readonly format: Model3dFormat;
      readonly files: readonly { readonly path: string; readonly asset: AssetRef }[];
      readonly w: number;
      readonly h: number;
      readonly yaw: number;
      readonly pitch: number;
      readonly snapshot: AssetRef | null;
      readonly matrix: Matrix;
    }
  /** C15 (X7) : état voulu complet de la vue (caméra et instantané, null le retire) ; même état : aucune étape. */
  | { readonly type: "SetModel3dView"; readonly id: string; readonly yaw: number; readonly pitch: number; readonly snapshot: AssetRef | null }
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
  /** personnalisation-1b (Q2, Q4, Q35, DA1) : aspect complet de N pages en une étape ; seules les pages qui changent
   *  sont écrites et rendues ; une page à fond `pdf-page` ne reçoit que couleur et grille. Refus sans écriture, dans
   *  l'ordre : BadFill (couleur), BadAsset, BadImage, BadGrid, page inconnue (liste vide, doublon, page absente). */
  | {
      readonly type: "ApplyBackground";
      readonly pages: readonly string[];
      readonly color: string;
      readonly backdrop: BackdropInput | null;
      readonly grid: GridInput | null;
    }
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
  /** Retire aussi ses cellules ; to : dernière ligne de la plage, comprise (C10b, F6) ; refusée s'il n'en resterait aucune. */
  | { readonly type: "RemoveTableLine"; readonly id: string; readonly axis: TableAxis; readonly line: string; readonly to?: string }
  /** Uniformiser : toutes les colonnes, toutes les lignes (peut réduire, T11). */
  | { readonly type: "SetTableSizes"; readonly id: string; readonly colWidth: number; readonly rowHeight: number }
  /** null retire ; to : autre coin de la plage (C10b, F15) ; une cellule couverte vaut pour son ancre. */
  | { readonly type: "SetTableFill"; readonly id: string; readonly row: string; readonly col: string; readonly to?: CellIds; readonly fill: string | null }
  /** C10b (F3) : rectangle from–to ; l'ancre garde son contenu, les couvertes sont retirées. */
  | { readonly type: "MergeTableCells"; readonly id: string; readonly from: CellIds; readonly to: CellIds }
  /** C10b (F4) : row, col = ancre d'une zone. */
  | { readonly type: "SplitTableCell"; readonly id: string; readonly row: string; readonly col: string }
  /** C10b (F9) : shade = couleur, null retire (révéler, retirer l'ombrage). */
  | { readonly type: "SetTableShade"; readonly id: string; readonly from: CellIds; readonly to: CellIds; readonly shade: string | null }
  /** C10b (F18) : tableau rempli ; cells = rows × cols textes en rangées ; merges = [ligne, colonne, lignes, colonnes]. */
  | {
      readonly type: "ImportTable";
      readonly page: string;
      readonly matrix: Matrix;
      readonly colWidth: number;
      readonly rowHeights: readonly number[];
      readonly cols: number;
      readonly cells: readonly string[];
      readonly merges: readonly (readonly [number, number, number, number])[];
      readonly color: string;
      readonly size: number;
    }
  /** C6a (D12) : color null = « Aucune » (intérieur retiré, fond #ffffff, contour inchangé) ; même valeur : aucune étape. */
  | { readonly type: "Fill"; readonly page: string; readonly target: FillTarget; readonly color: string | null }
  /** C5 (I6) : état voulu complet des réglages (neutres retirés par le cœur) et nouvelle matrice (placeAfter, I9) ;
   *  même état et même matrice : aucune étape ; hors domaine : BAD_IMAGE_PARAMS_MESSAGE. C6b (B11) : `restore` : avec un
   *  `sourceAsset`, l'asset d'origine revient dans la même étape. */
  | { readonly type: "SetImageParams"; readonly id: string; readonly params: ImageParams; readonly matrix: Matrix; readonly restore?: boolean }
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

/** C5 (U29, I5) : couleur rendue transparente ; `color` en `#rrggbb` minuscules ; `tolerance`, `soft` entiers de 0 à 100. */
export interface TransparentColor { readonly color: string; readonly tolerance: number; readonly soft: number; readonly contiguous: boolean }
/** C5 (U29, I2, I4) : réglages non destructifs, champ absent = neutre. `crop` = [x, y, w, h] en pixels source ;
 *  `quarterTurns` 0 à 3, sens horaire ; `brightness`, `contrast` entiers de −100 à 100. */
export interface ImageParams {
  readonly crop?: readonly [number, number, number, number];
  readonly flipX?: boolean;
  readonly flipY?: boolean;
  readonly quarterTurns?: number;
  readonly brightness?: number;
  readonly contrast?: number;
  readonly transparent?: TransparentColor;
}
/** Image (U5) : `w`, `h` = taille source en pixels ; réglages de C5 à plat (I8 : boîte affichée, `displaySize`) ; C6b
 *  (B12) : `sourceAsset` = asset d'avant le premier remplissage au pot, absent sinon. */
export type ImageData = { readonly asset: string; readonly w: number; readonly h: number; readonly sourceAsset?: string } & ImageParams;
/** C14 : types de média acceptés. */
export type MediaType = "video" | "audio";
/** Média (C14) : boîte locale (0, 0)-(w, h) ; `duration` 0 = inconnue ; `trimEnd` null = jusqu'à la fin. */
export interface MediaData {
  readonly asset: string;
  readonly mediaType: MediaType;
  readonly w: number;
  readonly h: number;
  readonly duration: number;
  readonly poster: string | null;
  readonly trimStart: number;
  readonly trimEnd: number | null;
  readonly loop: boolean;
  readonly volume: number;
}
/** C15 : formats d'objet 3D acceptés. */
export type Model3dFormat = "glb" | "gltf" | "obj" | "stl" | "ply";
/** C15 (X3) : fichier lié d'un objet 3D, chemin normalisé tel qu'écrit dans le modèle et empreinte de son asset. */
export interface Model3dFile { readonly path: string; readonly asset: string }
/** Objet 3D (C15, X2) : boîte locale (0, 0)-(w, h) ; caméra (yaw, pitch en radians) et instantané aux défauts s'ils manquent. */
export interface Model3dData {
  readonly asset: string;
  readonly format: Model3dFormat;
  readonly w: number;
  readonly h: number;
  readonly files: readonly Model3dFile[];
  readonly yaw: number;
  readonly pitch: number;
  readonly snapshot: string | null;
}
/** C14 : asset lié à un fichier local (chemin) ; `relinkAssets` lit les mêmes paires. */
export interface LinkedAsset { readonly id: string; readonly path: string }
export interface UnknownData { readonly sourceKind: string; readonly w: number; readonly h: number }

export type TableAxis = "row" | "col";
export interface TableCol { readonly id: string; readonly width: number }
export interface TableRow { readonly id: string; readonly height: number }
/** Cellule par ids (C10b). */
export interface CellIds { readonly row: string; readonly col: string }
/** Cellule non vide (texte, remplissage ou ombrage) ; `fill` = remplissage (U32), `shade` = ombrage révélable (F8), null sans ;
 *  `spans` = segments du texte (C7b, R16), un segment sans attribut pour une cellule d'avant C7b. */
export interface TableCell {
  readonly row: string;
  readonly col: string;
  readonly text: string;
  readonly fill: string | null;
  readonly shade: string | null;
  readonly spans: readonly TextSpan[];
}
/** Zone fusionnée (F29) : ancre par ids, étendue en rangs, après la règle F2 du cœur. */
export interface TableMerge { readonly row: string; readonly col: string; readonly rows: number; readonly cols: number }
/** Tableau (T13) : boîte locale (0, 0)-(somme des largeurs, somme des hauteurs) ; cellules non vides dans l'ordre de lecture ;
 *  zones dans l'ordre de lecture de leurs ancres. */
export interface TableData {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  readonly cells: readonly TableCell[];
  readonly merges: readonly TableMerge[];
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
/** Média (C14) : boîte locale (0, 0)-(w, h) ; mal formé : élément unknown, sourceKind "media". */
export interface MediaElement extends ElementBase { readonly kind: "media"; readonly media: MediaData }
/** Objet 3D (C15) : boîte locale (0, 0)-(w, h) ; mal formé : élément unknown, sourceKind "model3d". */
export interface Model3dElement extends ElementBase { readonly kind: "model3d"; readonly model3d: Model3dData }
/** Élément d'un kind inconnu (U3) : gardé, dessiné comme un cadre, boîte (0, 0)-(w, h). */
export interface UnknownElement extends ElementBase { readonly kind: "unknown"; readonly unknown: UnknownData }
/** Tableau (C10a) : coin en (0, 0) local, placé par transform. */
export interface TableElement extends ElementBase { readonly kind: "table"; readonly table: TableData }
/** Zone remplie au pot (C8, Q11, Q12) : couleur et boîte locale (0, 0)-(w, h) ; anneaux par `fillRings(id)` ; mal formé :
 *  élément unknown, sourceKind "fill". */
export interface FillData { readonly color: string; readonly w: number; readonly h: number }
export interface FillElement extends ElementBase { readonly kind: "fill"; readonly fill: FillData }
export type ElementView = StrokeElement | ShapeElement | TextElement | ImageElement | MediaElement | Model3dElement | TableElement | FillElement | UnknownElement;

/** Fond de page (U6, K6) : rect calculé par le cœur, calé sur la largeur de la page ; null si w ou h illisibles. */
export interface BackdropView {
  readonly asset: string;
  readonly kind: string;
  /** C12 (PF5) : indice de page à partir de 0 d'un fond `pdf-page` ; null absent ou illisible (entier ≥ 0 attendu). */
  readonly page: number | null;
  readonly w: number | null;
  readonly h: number | null;
  readonly fit: string;
  readonly rect: Bounds | null;
  /** C16 (O17) : empreinte de l'original Office d'un PDF converti ; null si absente ou non conforme (PDF seul, image). */
  readonly original: string | null;
}
export interface PageView {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly backdrop: BackdropView | null;
  readonly grid: GridView | null;
  readonly mode: PageMode;
}

export interface Bounds { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

export interface StrokeBuilderApi {
  /** `ahead` : triplets provisoires (points prédits) qui prolongent le contour rendu, jamais gardés (OF44). */
  push(points: Float32Array, ahead?: Float32Array): Float32Array;
  finish(): Float32Array;
  free(): void;
}

export interface CoreDocument {
  pageIds(): string[];
  elementIds(page: string): string[];
  /** OE23 (Q7) : ids de `page` dont le champ `kind` brut vaut `kind`, dans l'ordre de la page, sans lire de vue ; page
   *  inconnue : []. Un élément de kind inconnu y figure sous son kind brut ; un élément mal formé y figure aussi, mais `element(id)` peut
   *  rendre `null` pour lui (image, trait, forme, texte) : confirmer chaque candidat par `element(id)`. */
  elementIdsOfKind(page: string, kind: string): readonly string[];
  /** Lève une Error dont le message dit la cause (page inconnue, dernière page, points invalides). */
  apply(cmd: Command): Change;
  element(id: string): ElementView | null;
  page(id: string): PageView | null;
  citedAssets(): AssetInfo[];
  asset(id: string): AssetInfo | null;
  /** C14 : assets cités dont la métadonnée porte un chemin lié non vide, triés par id. */
  linkedAssets(): LinkedAsset[];
  /** C14 (M30) : réécrit le chemin des assets déjà liés à un chemin différent (1 à 4 096 points de code), hors historique,
   *  version inchangée ; rend le nombre réécrit. */
  relinkAssets(links: readonly LinkedAsset[]): number;
  points(id: string): Float32Array | null;
  outline(id: string): Float32Array | null;
  /** C8 (Q12) : anneaux locaux d'un `fill`, `[n, x0, y0, …]` par anneau, extérieur d'abord ; null pour tout autre élément. */
  fillRings(id: string): Float32Array | null;
  /** C8 (Q18) : cellules du masque d'un clic du pot sur `page` à `tol` monde ; 0 sans mur (marque `data-zone-cells`). */
  zoneCells(page: string, tol: number): number;
  hitTest(page: string, x: number, y: number, tol: number): string | null;
  /** Bord d'un rectangle ou d'une ellipse sous (x, y) monde (C6a, DA2) : tol + demi-épaisseur à l'échelle de la forme ;
   *  faux pour tout autre élément ou un id inconnu. Rien n'est écrit. */
  edgeHit(id: string, x: number, y: number, tol: number): boolean;
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
  /** C4 (D2) : `.rbitem` de grille (une page, sans élément) sans asset. */
  saveGrid(now: string, appVersion: string, name: string): Uint8Array;
  saveGridParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array];
}

export interface CoreFactory {
  blank(mode?: PageLayout): CoreDocument;
  /** C12 (PF6) : une page par taille, fond `pdf-page` d'indice i, asset cité ; aucune étape (D37). Lève le message
   *  BadAsset, puis BadImage (0 ou plus de PDF_MAX_PAGES pages, taille non finie ou ≤ 0). C16 (O17) : `original`
   *  (fichier Office converti) cité par chaque fond (`backdrop.original`), contrôlé comme l'asset. */
  fromPdfPages(asset: AssetRef, sizes: readonly PdfPageSize[], original?: AssetRef): CoreDocument;
  /** Lève une Error lisible si le fichier n'est pas un .roomboard, est plus récent, ou est corrompu. */
  load(bytes: Uint8Array): CoreDocument;
  loadParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
  version(): string;
  /** C3 : lit un `.rbitem` sans asset ; un document est refusé (message du cœur). */
  loadFragment(bytes: Uint8Array): CoreDocument;
  loadFragmentParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
  /** C4 : grille en ressource ; un autre type : `wrongKindMessage`. */
  loadGrid(bytes: Uint8Array): CoreDocument;
  loadGridParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
  /** C4 : type d'un manifeste ; format, version ou `kind` inconnus : erreur du cœur. */
  manifestKind(manifest: Uint8Array): ContainerKind;
  /** C4 : type d'un conteneur entier (repli sans le module des formats). */
  containerKind(bytes: Uint8Array): ContainerKind;
}

/** Message de BadMedia du cœur (C14), repris à l'identique par la fausse liaison. */
export const BAD_MEDIA_MESSAGE =
  "média invalide (vidéo ou son, boîte finie > 0, durée finie ≥ 0, début ≥ 0 avant la fin, fin dans la durée, volume de 0 à 1, chemin lié de 1 à 4 096 caractères attendus)";
/** Longueur maximale d'un chemin lié, en points de code (`MAX_LINK_CHARS` du cœur). */
export const MAX_LINK_CHARS = 4096;
/** Genre de l'élément média (`MEDIA_KIND` du cœur, C14). */
export const MEDIA_KIND = "media";
/** Genre de l'élément objet 3D (`MODEL3D_KIND` du cœur, C15). */
export const MODEL3D_KIND = "model3d";
export const MODEL3D_FORMATS: readonly Model3dFormat[] = ["glb", "gltf", "obj", "stl", "ply"];
/** Caméra par défaut d'un objet 3D (`DEFAULT_YAW`, `DEFAULT_PITCH` du cœur) : 30° et 20°, en radians. */
export const DEFAULT_MODEL3D_YAW = Math.PI / 6;
export const DEFAULT_MODEL3D_PITCH = Math.PI / 9;
/** |pitch| ≤ 85° (`PITCH_LIMIT` du cœur). */
export const MODEL3D_PITCH_LIMIT = (85 * Math.PI) / 180;
/** Fichiers liés d'un objet 3D au plus (`MAX_FILES` du cœur). */
export const MAX_MODEL3D_FILES = 256;
/** Longueur maximale du chemin d'un fichier lié, en points de code (`MAX_PATH_CHARS` du cœur). */
export const MAX_MODEL3D_PATH = 1024;
/** Type de l'instantané d'un objet 3D. */
export const SNAPSHOT_MIME = "image/png";
/** Message de BadModel3d du cœur (C15), repris à l'identique par la fausse liaison. */
export const BAD_MODEL3D_MESSAGE =
  "objet 3D invalide (format glb, gltf, obj, stl ou ply, boîte finie > 0, pitch de −85° à 85°, yaw dans ]−180°, 180°], 256 fichiers liés au plus, chemins de 1 à 1 024 caractères normalisés et uniques attendus)";
export const NO_CHANGE: Change = { pages: [], ids: [], removed: [], full: false, version: 0 };
export const DEFAULT_ASSET_MIME = "application/octet-stream";
export const UNKNOWN_BOX = 100;
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
/** C12 (PF5) : genre du fond d'une page venue d'un PDF (`PDF_PAGE_KIND` du cœur). */
export const PDF_PAGE_KIND = "pdf-page";
/** C12 (PF7, U26) : pages importées d'un PDF au plus (`PDF_MAX_PAGES` du cœur). */
export const PDF_MAX_PAGES = 500;
/** C12 (PF6) : taille d'une page PDF en points, après /Rotate et CropBox (viewport de pdf.js à l'échelle 1). */
export interface PdfPageSize {
  readonly w: number;
  readonly h: number;
}
/** Fond d'une page neuve, et « Aucune » du pot sur le fond (`DEFAULT_BACKGROUND` de `element.rs`). */
export const DEFAULT_BACKGROUND = "#ffffff";
/** Plafond des lignes et des colonnes d'un tableau (BadTable). */
export const TABLE_MAX_LINES = 64;
/** Défauts d'un tableau lu sans couleur ou sans taille lisible (T2). */
export const DEFAULT_TABLE_COLOR = "#000000";
export const DEFAULT_TABLE_SIZE = 36;
/** Messages C3 du cœur (G10), repris à l'identique par la fausse liaison. */
export const BAD_GROUP_MESSAGE = "groupe invalide (au moins deux objets ou groupes d'une même page, ids connus attendus)";

/** C5 (I5) : message de `BadImageParams` du cœur, repris par la fausse liaison. */
export const BAD_IMAGE_PARAMS_MESSAGE =
  "réglages d'image invalides (image lisible, rognage entier dans l'image, quarts de tour 0 à 3, luminosité et contraste entiers de -100 à 100, couleur #rrggbb, tolérance et plume entières de 0 à 100 attendus)";
export const NOT_A_DOCUMENT_MESSAGE = "ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page";
export const NOT_A_FRAGMENT_MESSAGE = "ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages";
/** C4 (D3) : type d'un conteneur RoomBoard ; `kind` absent = document (U8). */
export type ContainerKind = "document" | "fragment" | "grid";
export const IS_A_GRID_MESSAGE = "ce fichier est une grille RoomBoard : déposez-la sur une page";
/** Message du mauvais type, choisi sur ce que le fichier est (même règle que `FormatError::WrongKind`). */
export const wrongKindMessage = (found: ContainerKind): string =>
  found === "grid" ? IS_A_GRID_MESSAGE : found === "fragment" ? NOT_A_DOCUMENT_MESSAGE : NOT_A_FRAGMENT_MESSAGE;
/** D26 : un `.rbpack` ouvert comme document ou objet (même texte que le cœur, `FormatError::UnknownKind` de « pack »). */
export const PACK_MESSAGE = "ce fichier est un paquet RoomBoard (.rbpack) : importez-le dans la bibliothèque";
export const unknownKindMessage = (kind: string): string =>
  kind === "pack" ? PACK_MESSAGE : `type de fichier RoomBoard inconnu (« ${kind} ») : pris en charge dans une prochaine version`;
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
