// Fausse liaison en TS pur (D36) : même contrat que le vrai module, géométrie grossière, pour les tests du moteur.
// Contrat commun joué sur les deux fabriques : `wasm-core.contract.test.ts` (`describe.each`).
//
// Écart assumé, exclu du contrat commun : la gomme partielle (`Erase`, `mode: "partial"`) ne coupe pas. Elle retire
// en entier chaque trait touché (comme la gomme d'objet) et rend `ids: []`, là où le cœur remplace le trait par ses
// morceaux restants (`ids` = les morceaux, `removed` = le trait coupé). Le test de « touché » d'un trait est lui aussi
// grossier : distance des seuls points du trait au chemin, sans contour ni pression.
// Lot 4 : chaque élément porte sa matrice (`Transform` la compose à gauche, comme le cœur) ; formes et textes suivent
// les polygones de `shapes.ts` (miroir de `shape.rs`) : même collision et mêmes bornes que le cœur.
// C2 : images, fond (`page(id)`), métadonnées et `citedAssets` par le même balayage que le cœur ; `kind` inconnu gardé
// avec ses champs bruts (`raw`) et réécrit tel quel.
// C7 : segments (`spans`) gardés par SetText (différence de `rich-text.ts`), posés par FormatText ; JSON sans `spans` = un segment.
// C7b : SetText et SetTableCell avec spans (état voulu, contrôlé d'abord, normalisé) ; cellules { text, spans, fill }.
// C9 : grille de page (`SetGrid`, `page(id).grid`) au modèle du cœur, lecture tolérante et sauvegarde comprises ; une
// grille lue qui n'est pas un objet est gardée brute et réécrite telle quelle, vue comme absente (G13).
// Écart assumé, exclu du contrat commun (DAG3) : `snapPoint`, `snapDelta`, `gridLines` et
// `gridLinesOf` ne connaissent que le kind
// `squares` ; lines, dots, isometric, music et seyes n'accrochent pas et ne tracent rien ici : ils se testent dans
// `grid.rs` et sur le vrai module (bloc « contrat C9 : vrai module seulement »).
// C10a : tableau (AddTable, SetTableCell, InsertTableLine, RemoveTableLine, SetTableSizes, SetTableFill) au modèle de
// `table.rs` : mêmes refus dans le même ordre, mêmes messages, une étape par commande, aucune étape sans effet ; vue
// = cellules non vides dans l'ordre de lecture ; tableau mal formé lu comme cadre inconnu (sourceKind "table").
// Écart assumé, hors contrat (PC6) : les entrées illisibles d'un JSON de la fausse liaison sont retirées au
// chargement, là où le cœur les garde dans le document. Exception (OE43) : les réglages et le `sourceAsset` d'une image
// présents mais lus absents sont gardés bruts (`imageRaw`), comme le cœur : ils font une étape quand une commande les
// retire (`SetImageParams`, `restore`, `Fill`), et sont réécrits tels quels.
// C3 : chemin group (Group, Ungroup), extract, insertFragment, insertPages, fragments JSON { kind: "fragment", name, … } ;
// mêmes refus et messages que le cœur, dans le même ordre, joués par le bloc « contrat C3 » (aucun écart exclu). Group : un
// id d'un groupe vaut tout son groupe extérieur ; le type du fichier (kind) se lit avant son contenu.
// C10b : fusion (`span` sur l'ancre, zones par `mergesOf`, miroir de `merges_of` du cœur, règle F2), division, ombrage
// (`shade`), plages de RemoveTableLine et SetTableFill, report des zones (F6), hauteur d'une ancre haute (F7),
// ImportTable (F18) : mêmes refus dans le même ordre que `table.rs`, une étape par commande, aucune étape vide.
// C6a : Fill (contour, intérieur, fond) au modèle de `fill.rs` (même ordre de refus, mêmes messages) ; edgeHit, miroir d'`edge_hit` ; fond de page gardé dans le JSON.
// Personnalisation 1a : mode de page (`AddPage.mode`, `SetPageMode`, `blank(mode)`), `MovePage`, `DuplicatePage` au modèle
// de `commands.rs` (mêmes refus, aucune étape sans effet) ; `mode` brut gardé (valeur inconnue lue Page, U3) et `height`
// lue ; accroche et lignes de grille bornées au cadre de `pageFrame` en Page, sans borne en Infini (règle de T7).
// Lot 2 : `Restack` au modèle de `cmd_restack` (mêmes refus dans le même ordre, ids gardés, même ordre : aucune étape).
// OG12 : points intérieurs, liaisons, suivi, rupture, copie liée, `SetLinePoints`, `AddLinked`, `bindTarget` au modèle de
// `linear.rs`, `copy.rs` et `query.rs` (mêmes refus dans le même ordre, une étape par commande) ; écart assumé, exclu du
// contrat commun : la route coudée (une flèche coudée garde ses bouts) ; règles copiées de linear.rs, adaptées
// d'Excalidraw (MIT).
import type {
  ContainerKind,
  AssetInfo,
  AssetRef,
  BackdropView,
  Bounds,
  CellIds,
  CellLink,
  Change,
  Command,
  CoreDocument,
  CoreFactory,
  ElementView,
  GridInput,
  GridLevel,
  GridLines,
  GridView,
  ImageData,
  MediaData,
  Model3dData,
  Model3dFile,
  Model3dFormat,
  LinkedAsset,
  LevelLines,
  Matrix,
  PageView,
  PdfPageSize,
  ShapeData,
  StrokeBuilderApi,
  StrokeStyle,
  TableAxis,
  TableBorder,
  TableCell,
  TableCol,
  TableData,
  TableRow,
  TextData,
  TextSpan,
  FillData,
} from "./api";
import type { BindHit, CellLook, LineBinding, LinkDir, ShapeKind } from "./api";
import {
  BAD_GROUP_MESSAGE,
  BAD_MEDIA_MESSAGE,
  BAD_MODEL3D_MESSAGE,
  DEFAULT_MODEL3D_PITCH,
  DEFAULT_MODEL3D_YAW,
  MAX_LINK_CHARS,
  MAX_MODEL3D_FILES,
  MAX_MODEL3D_PATH,
  MODEL3D_FORMATS,
  MODEL3D_PITCH_LIMIT,
  BAD_IMAGE_PARAMS_MESSAGE,
  DEFAULT_ASSET_MIME,
  DEFAULT_BACKGROUND,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_LINE_WIDTH,
  DEFAULT_TABLE_COLOR,
  DEFAULT_TABLE_SIZE,
  isCellLookShape,
  MAX_GRID_DOTS,
  MAX_GRID_LEVELS,
  MAX_GRID_LINE_WIDTH,
  MIN_GRID_LINE_WIDTH,
  MIXED_SOURCE_MESSAGE,
  wrongKindMessage,
  PAGE_HEIGHT,
  type PageLayout,
  PDF_MAX_PAGES,
  PDF_PAGE_KIND,
  PAGE_WIDTH,
  TABLE_MAX_LINES,
  TABLE_MESSAGE,
  UNKNOWN_BOX,
  unknownKindMessage,
} from "./api";
import { pageFrame, type PageRect } from "../engine/page";
import { isAssetId } from "./asset-store";
import { elbowedOf, newSeed, STROKE_STYLES, toLook, VARIABILITY_CONSTANT, type Look, type LookPatch } from "./look";
import { arrangeUnknown, isArrangeHow, planArrange, planRotate, rotationOf, type ArrangeUnit, type Reach } from "./arrange";
import { ARROWHEADS, END_ARROWHEAD_DEFAULT, FILL_STYLES, START_ARROWHEAD_DEFAULT, TEXT_ALIGNS, validLink as validLookLink } from "./look";
import { cleanPatch, editSpans, formatSpans, normalSpans, plainSpans, sameSpans, utf16Bounds, validColor, validPatch, validSpans } from "./rich-text";
import { applyMatrix, boxPolygon, composeMatrix, isClosedShape, isIdentity, isSegment, normalizeShape, shapePolygon, translateMatrix as translate } from "./shapes";
import { ANCHOR_RATIOS, anchorPoint, BIND_RATIO_MAX, bindGap, invertMatrix, lineGeomOf, linePath, MAX_INNER_POINTS, type BindBox, type Outline } from "./shapes";
import { displaySize, geometryOf, normalizeParams, paramsOf, readParams, sameParams } from "./image-params";

/** C4a : intérieur remplissable (pot, `SetStyle.fill`), miroir de `ShapeFields::fillable` : toute forme sauf un segment,
 *  et la ligne fermée. */
const isFillableShape = (s: ShapeData): boolean => !isSegment(s.shape) || isClosedShape(s);

/** Réglages d'une image (C5), tels que le cœur les range à plat sur l'élément. */
const IMAGE_PARAM_KEYS = ["crop", "flipX", "flipY", "quarterTurns", "brightness", "contrast", "transparent"] as const;
/** Miroir de `BAKED` (`image.rs`) : champs cuits dans le nouvel asset par un remplissage, retirés même bruts. */
const BAKED = ["brightness", "contrast", "transparent"] as const;
/** OE43 : `imageRaw` sans `keys` ; vide : absent. */
function withoutRaw(raw: Readonly<Record<string, unknown>> | undefined, keys: readonly string[]): { imageRaw?: Readonly<Record<string, unknown>> } {
  if (raw === undefined) return {};
  const rest = Object.fromEntries(Object.entries(raw).filter(([k]) => !keys.includes(k)));
  return Object.keys(rest).length > 0 ? { imageRaw: rest } : {};
}

/** Élément d'un kind inconnu (U3, K8) : champs bruts gardés tels quels, réécrits par save. */
interface FakeUnknown {
  readonly sourceKind: string;
  readonly raw: Readonly<Record<string, unknown>>;
  readonly hasTransform: boolean;
  /** `transform` illisible tel que lu : la vue prend l'identité, le document le garde (K8). */
  readonly rawTransform?: unknown;
  /** Boîte dessinée, calculée une fois à la lecture : `raw` ne change pas. */
  readonly box: { readonly w: number; readonly h: number };
}
/** C8 (Q11) : `fill` lisible ; anneaux locaux, extérieur d'abord. */
interface FakeFill extends FillData { readonly contours: readonly (readonly number[])[] }
interface FakeElement {
  readonly id: string;
  /** Identité pour un élément inconnu sans transform lisible (hasTransform = false). */
  readonly transform: Matrix;
  /** Image et inconnu : NO_STYLE, jamais exposé par element(). */
  readonly style: StrokeStyle;
  /** Trait : triplets x, y, pression locaux. */
  readonly local?: Float32Array;
  readonly shape?: ShapeData;
  readonly text?: TextData;
  readonly image?: ImageData;
  /** OE43 : champs d'image présents dans le fichier mais lus absents (illisibles ou neutres), gardés bruts comme le cœur. */
  readonly imageRaw?: Readonly<Record<string, unknown>>;
  /** C14 : média lisible ; un média mal formé est un `unknown` (sourceKind "media"), comme un tableau. */
  readonly media?: MediaData;
  /** C15 : objet 3D lisible ; un objet 3D mal formé est un `unknown` (sourceKind "model3d"), comme un média. */
  readonly model3d?: Model3dData;
  /** C8 : zone remplie au pot ; un `fill` mal formé est un `unknown` (sourceKind "fill"), comme un média. */
  readonly fill?: FakeFill;
  readonly table?: FakeTable;
  readonly unknown?: FakeUnknown;
  /** Élément connu mal formé (K8) : champs bruts gardés, illisible par element(), jamais réécrit en trait. */
  readonly malformed?: Readonly<Record<string, unknown>>;
  /** C3 (Z1) : chemin de groupes, extérieur d'abord ; absent sans groupe (le brut d'un mal formé garde le sien). */
  readonly group?: readonly string[];
  /** OG11 : aspect écrit (assaini, jamais neutre) ; lu sur les traits, formes, textes et images, comme le cœur. */
  readonly look?: Look;
  /** personnalisation-3 (D1) : case qui loge l'objet, valeur gardée telle quelle ; publiée par element() seulement vers
   *  une case existante, jamais sur un tableau (comme la vue du cœur). */
  readonly cell?: CellLink;
}
type RawRecord = Readonly<Record<string, unknown>>;
/** Cellule de la fausse liaison ; absente du Map = vide ; `spans` = segments du texte (C7b) ; `span` = [dernière ligne,
 *  dernière colonne] (ancre, F1). */
interface FakeCell {
  readonly text: string;
  readonly spans: readonly TextSpan[];
  readonly fill: string | null;
  readonly shade: string | null;
  /** personnalisation-3 (T9) : asset de l'image de fond. */
  readonly bg: string | null;
  readonly span: readonly [string, string] | null;
  /** personnalisation-3 (suite OG32, DS1) : valeurs écrites seulement (défauts `left`, `top` absents) ; `open` : case ombrée. */
  readonly ha?: "center" | "right";
  readonly va?: "middle" | "bottom";
  readonly border?: TableBorder;
  readonly open?: true;
}
/** Tableau (C10a) : objets repris tels quels d'une étape à l'autre, sauf ceux qu'une commande change. */
interface FakeTable {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  /** Clé `<rowId>:<colId>`. */
  readonly cells: ReadonlyMap<string, FakeCell>;
  /** personnalisation-3 (T7) : "shrink" seulement ; `header` vrai seulement. */
  readonly fit?: "shrink";
  readonly header?: boolean;
}
/** `grid` : valeur brute lue ou écrite (G13), null sans grille ; vue par `gridView`. `mode` : valeur brute (null absent,
 *  inconnue gardée, U3) ; `height` : hauteur lue (PAGE_HEIGHT si illisible). */
interface FakePage {
  readonly id: string;
  readonly elements: FakeElement[];
  backdrop: RawRecord | null;
  grid: unknown;
  background: string;
  mode: unknown;
  height: number;
}
/** `assets` : valeurs brutes (K3) ; lues avec défauts champ par champ (K4). */
interface State { readonly pages: FakePage[]; readonly assets: Map<string, unknown> }

/** OG33 : plafond du texte d'une forme, en caractères (`MAX_LABEL_CHARS`, label.rs). */
const MAX_SHAPE_LABEL_CHARS = 10_000;

const MESSAGES = {
  badShape: "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)",
  badMatrix: "matrice invalide (six nombres finis, inversible)",
  badText: "texte invalide (taille et boîte finies > 0 attendues)",
  badWidth: "épaisseur de trait invalide (nombre fini > 0 attendu)",
  badAsset: "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)",
  badImage: "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)",
  badFormat: "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)",
  badGrid: "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)",
  badTable: TABLE_MESSAGE,
  badFill: "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle, d'un losange, d'une ellipse ou d'une ligne fermée attendus)",
  badGroup: BAD_GROUP_MESSAGE,
  badImageParams: BAD_IMAGE_PARAMS_MESSAGE,
  badStyle: "style invalide",
} as const;

// OG11 : copie de `style.rs` (`StylePatch::validate`, `writes_for`, `differs`), du pont (`small_int`, `look_of`) et de
// `Look::sanitized` (`element.rs`) ; aucune règle propre à la fausse liaison.
type MutableLook = { -readonly [K in keyof Look]: Look[K] };
const absent = (v: unknown): v is null | undefined => v === undefined || v === null;
const badStyle = (): never => {
  throw new Error(MESSAGES.badStyle);
};
/** `small_int` du pont : entier de 0..=max ; absent : undefined ; sinon « style invalide » (jamais tronqué). */
const smallInt = (v: unknown, max: number): number | undefined =>
  absent(v) ? undefined : typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : badStyle();
/** Opacité finie de 0..=100, arrondie (`f64::round`, identique à Math.round sur un positif). */
const opacityArg = (v: unknown): number | undefined =>
  absent(v) ? undefined : typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) || 0 : badStyle();
/** Graine neuve (`random_seed` du cœur) : entier de 0..=u32::MAX. */

/** Aspect d'une création : bornes du pont (`look_of`), puis `Look::sanitized` ; undefined s'il est neutre. */
function creationLook(l: Look | undefined): Look | undefined {
  if (absent(l)) return undefined;
  const o = opacityArg(l.opacity);
  const r = smallInt(l.roughness, 2);
  const seed = smallInt(l.seed, 0xffffffff);
  return toLook({ ...l, opacity: o, roughness: r, seed });
}

/** `StylePatch::validate` (et `roughness_arg` du pont) : tout le patch avant la moindre lecture ; rend l'opacité arrondie. */
function validStyle(p: LookPatch): number | undefined {
  if (!absent(p.color) && !(typeof p.color === "string" && validColor(p.color))) badStyle();
  if (!absent(p.width)) {
    const w = typeof p.width === "number" ? Math.fround(p.width) : Number.NaN; // le pont reçoit un f32
    if (!(Number.isFinite(w) && w > 0)) badStyle();
  }
  if ("fill" in p && !absent(p.fill) && !(typeof p.fill === "string" && validColor(p.fill))) badStyle();
  if ("strokeStyle" in p && !absent(p.strokeStyle) && !(typeof p.strokeStyle === "string" && STROKE_STYLES.includes(p.strokeStyle))) badStyle();
  smallInt(p.roughness, 2);
  if ("roundness" in p && !absent(p.roundness) && p.roundness !== "round") badStyle();
  // T12 : domaines du lot 2 (`outside`, `valid_link`).
  const outside = (k: "fillStyle" | "startArrowhead" | "endArrowhead" | "textAlign", allowed: readonly string[]): boolean => {
    const v: unknown = p[k];
    return k in p && !absent(v) && !(typeof v === "string" && allowed.includes(v));
  };
  if (outside("fillStyle", FILL_STYLES) || outside("startArrowhead", ARROWHEADS) || outside("endArrowhead", ARROWHEADS) || outside("textAlign", TEXT_ALIGNS)) badStyle();
  if ("link" in p && !absent(p.link) && !(typeof p.link === "string" && validLookLink(p.link))) badStyle();
  // OG23 (`outside(&self.variability, …)`) : seule `constant` s'écrit.
  if ("variability" in p && !absent(p.variability) && p.variability !== VARIABILITY_CONSTANT) badStyle();
  // OG23 (T10) : `dragCopy` booléen seulement (`Option<bool>` du pont).
  const drag: unknown = p.dragCopy;
  if (drag !== undefined && typeof drag !== "boolean") badStyle();
  if ("elbowed" in p && !absent(p.elbowed) && typeof p.elbowed !== "boolean") badStyle();
  return opacityArg(p.opacity);
}

type StyleKind = "stroke" | "shape" | "text" | "image" | "table" | "media" | "model3d";
const styleKind = (e: FakeElement): StyleKind | null =>
  e.malformed || e.unknown ? null : e.table ? "table" : e.media ? "media" : e.model3d ? "model3d" : e.image ? "image" : e.shape ? "shape" : e.text ? "text" : e.local !== undefined ? "stroke" : null;

/** `writes_for` + `differs` : l'élément restylé, ou null si aucune écriture effective (champ inapplicable ou même valeur). */
function restyled(e: FakeElement, p: LookPatch, opacity: number | undefined): FakeElement | null {
  const kind = styleKind(e);
  if (kind === null) return null;
  let changed = false;
  let style = e.style;
  let shape = e.shape;
  const look: MutableLook = { ...e.look };
  const put = <K extends keyof Look>(k: K, v: Look[K] | undefined): void => {
    if (look[k] === v) return;
    if (v === undefined) delete look[k];
    else look[k] = v;
    changed = true;
  };
  if (!absent(p.color) && (kind === "stroke" || kind === "shape" || kind === "text") && style.color !== p.color) {
    style = { ...style, color: p.color };
    changed = true;
  }
  if (!absent(p.width) && (kind === "stroke" || kind === "shape")) {
    const w = Math.fround(p.width);
    if (Math.fround(style.width) !== w) {
      style = { ...style, width: w };
      changed = true;
    }
  }
  // OG12 lot 2a : fond et motif aussi sur un losange et une ligne fermée (`style.rs`).
  const fillable = shape !== undefined && isFillableShape(shape);
  if ("fill" in p && shape && fillable) {
    const f = p.fill ?? null;
    if (shape.fill !== f) {
      shape = { ...shape, fill: f };
      changed = true;
    }
  }
  if ("strokeStyle" in p && kind === "shape") put("strokeStyle", p.strokeStyle ?? undefined);
  const r = p.roughness ?? undefined;
  if (r !== undefined && kind === "shape") {
    if (r === 0) {
      put("roughness", undefined);
      put("seed", undefined);
    } else {
      // Comme `style.rs` : graine neuve seulement si le niveau de tracé change, jamais au même niveau.
      const changes = e.look?.roughness !== r;
      put("roughness", r);
      if (changes) put("seed", newSeed());
    }
  }
  // OG12 (T1) : `roundness` aussi sur une ligne ou une flèche (courbe).
  // OG12 lot 2a (H5) : inapplicable sur une ligne fermée (aucune étape).
  if ("roundness" in p && shape && !isClosedShape(shape) && (shape.shape === "rect" || shape.shape === "line" || shape.shape === "arrow")) put("roundness", p.roundness ?? undefined);
  const aspect = kind === "stroke" || kind === "shape" || kind === "text" || kind === "image"; // `look_view` : jamais tableau, média, objet 3D
  if (opacity !== undefined && aspect) put("opacity", opacity < 100 ? opacity : undefined);
  // T12 (`writes_for`) : une pointe égale à son défaut retire le champ, jamais elle ne s'écrit.
  if ("fillStyle" in p && shape && fillable) put("fillStyle", p.fillStyle ?? undefined);
  if (shape?.shape === "arrow") {
    const head = <D extends string>(v: D | null | undefined, d: string): D | undefined => (absent(v) || v === d ? undefined : v);
    if ("startArrowhead" in p) put("startArrowhead", head(p.startArrowhead, START_ARROWHEAD_DEFAULT));
    if ("endArrowhead" in p) put("endArrowhead", head(p.endArrowhead, END_ARROWHEAD_DEFAULT));
    // OG12 (T1) : `elbowed` sur une flèche seule, `true` seul écrit ; un changement vide les points intérieurs (la route
    // coudée du cœur n'est pas reproduite : la flèche garde ses bouts).
    if ("elbowed" in p) {
      const want = p.elbowed === true;
      if (elbowedOf(e.look) !== want) {
        put("elbowed", want ? true : undefined);
        if (shape.points) {
          const { points: _x, ...r } = shape;
          shape = r;
        }
      }
    }
  }
  if ("textAlign" in p && kind === "text") put("textAlign", p.textAlign ?? undefined);
  if ("link" in p && aspect) put("link", p.link ?? undefined);
  // OG23 (`writes_for`) : la pression ne s'écrit que sur un trait.
  if ("variability" in p && kind === "stroke") put("variability", p.variability ?? undefined);
  // OG23 (T10, `writes_for`) : tout genre dont l'aspect est lu ; seul `true` s'écrit.
  if (p.dragCopy !== undefined) put("dragCopy", p.dragCopy ? true : undefined);
  if (!changed) return null;
  const { look: _old, ...rest } = e;
  return { ...rest, style, ...(shape ? { shape } : {}), ...(Object.keys(look).length > 0 ? { look } : {}) };
}

/** Miroir de `element.rs` : hauteur Portrait (largeur gardée, 9:16) et seule valeur de `mode` écrite. */
const PORTRAIT_HEIGHT = (1920 * 16) / 9;
const INFINITE_MODE = "infinite";
const PAGE_LAYOUTS: readonly string[] = ["landscape", "portrait", "infinite"];
/** Disposition lue d'une valeur venue de JS (`PageLayout::parse` du pont) ; illisible : Error au message du pont. */
function readLayout(v: unknown): PageLayout {
  if (typeof v === "string" && PAGE_LAYOUTS.includes(v)) return v as PageLayout;
  throw new Error(`mode de page inconnu : ${String(v)}`);
}
/** Page vierge, comme `insert_page` du cœur : Portrait écrit sa hauteur, Infini écrit `mode`. */
const newPage = (layout: PageLayout | undefined): FakePage => ({
  id: newId(),
  elements: [],
  backdrop: null,
  grid: null,
  background: DEFAULT_BACKGROUND,
  mode: layout === "infinite" ? INFINITE_MODE : null,
  height: layout === "portrait" ? PORTRAIT_HEIGHT : PAGE_HEIGHT,
});
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const NO_STYLE: StrokeStyle = { color: "", width: 0 };
/** Kinds lus par la fausse liaison : même liste que `KNOWN_KINDS` du cœur (`element.rs`). */
export const KNOWN_KINDS: ReadonlySet<string> = new Set(["stroke", "shape", "text", "image", "table", "media", "model3d", "fill"]);
const finitePositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** Même règle que le cœur (`BadAsset`) : empreinte conforme, type non vide, taille entière ≥ 0. */
const validAsset = (a: AssetRef): boolean => isAssetId(a.id) && a.mime !== "" && Number.isInteger(a.size) && a.size >= 0;
const clone = (s: State): State => ({
  pages: s.pages.map((p) => ({ ...p, elements: [...p.elements] })),
  assets: new Map(s.assets),
});
/** Chemin lisible : tableau non vide de chaînes ; sinon retiré (PC6). */
const readGroup = (v: unknown): readonly string[] | undefined =>
  Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string") ? (v as string[]) : undefined;
const withGroup = (g: readonly string[] | undefined): { group?: readonly string[] } => (g === undefined ? {} : { group: g });
/** Unité de groupage (Z1) : le groupe extérieur, sinon l'objet seul. */
const unitOf = (e: FakeElement): string => e.group?.[0] ?? e.id;
const unknownBox = (raw: RawRecord): { w: number; h: number } =>
  finitePositive(raw["w"]) && finitePositive(raw["h"]) ? { w: raw["w"], h: raw["h"] } : { w: UNKNOWN_BOX, h: UNKNOWN_BOX };
const cellKey = (row: string, col: string): string => `${row}:${col}`;
const validLines = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= TABLE_MAX_LINES;
const tableWidth = (t: FakeTable): number => t.cols.reduce((s, c) => s + c.width, 0);
const tableHeight = (t: FakeTable): number => t.rows.reduce((s, r) => s + r.height, 0);
/** Clé dans la ligne (ou colonne) `line` : découpe au premier `:`, comme `in_line` du cœur. */
function inLine(key: string, axis: TableAxis, line: string): boolean {
  const i = key.indexOf(":");
  if (i < 0) return false;
  return axis === "row" ? key.slice(0, i) === line : key.slice(i + 1) === line;
}
/** Zone retenue (F2), en rangs, bornes comprises. */
interface FakeMerge { readonly r0: number; readonly c0: number; readonly r1: number; readonly c1: number }
const EMPTY_CELL: FakeCell = { text: "", spans: plainSpans(""), fill: null, shade: null, bg: null, span: null };
const overlaps = (a: FakeMerge, b: FakeMerge): boolean => a.r0 <= b.r1 && b.r0 <= a.r1 && a.c0 <= b.c1 && b.c0 <= a.c1;
const inside = (a: FakeMerge, b: FakeMerge): boolean => b.r0 <= a.r0 && a.r1 <= b.r1 && b.c0 <= a.c0 && a.c1 <= b.c1;
const contains = (m: FakeMerge, r: number, c: number): boolean => r >= m.r0 && r <= m.r1 && c >= m.c0 && c <= m.c1;
const rowId = (t: FakeTable, i: number): string => t.rows[i]?.id ?? "";
const colId = (t: FakeTable, j: number): string => t.cols[j]?.id ?? "";
const keyAt = (t: FakeTable, i: number, j: number): string => cellKey(rowId(t, i), colId(t, j));

/** Règle F2, comme `merges_of` du cœur : ancres dans l'ordre de lecture ; `span` désignant une ligne et une colonne lues,
 *  de rang ≥ l'ancre, au moins deux cellules, sans recouvrement d'une zone déjà retenue. */
function mergesOf(t: FakeTable): FakeMerge[] {
  const out: FakeMerge[] = [];
  t.rows.forEach((r, r0) => {
    t.cols.forEach((c, c0) => {
      const span = t.cells.get(cellKey(r.id, c.id))?.span;
      if (!span) return;
      const r1 = t.rows.findIndex((l) => l.id === span[0]);
      const c1 = t.cols.findIndex((l) => l.id === span[1]);
      if (r1 < r0 || c1 < c0 || (r1 === r0 && c1 === c0)) return;
      const m = { r0, c0, r1, c1 };
      if (!out.some((o) => overlaps(o, m))) out.push(m);
    });
  });
  return out;
}

/** Ancres et cellules simples du rectangle, sans doublon (F9, F15, PC11), comme `targets` du cœur. */
function targets(rect: FakeMerge, merges: readonly FakeMerge[]): [number, number][] {
  const out: [number, number][] = [];
  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      const m = merges.find((x) => contains(x, r, c));
      const a: [number, number] = m ? [m.r0, m.c0] : [r, c];
      if (!out.some(([i, j]) => i === a[0] && j === a[1])) out.push(a);
    }
  }
  return out;
}

/** Rectangle normalisé de deux coins par ids ; null si une ligne ou une colonne manque. */
function rectOf(t: FakeTable, a: CellIds, b: CellIds): FakeMerge | null {
  const ra = t.rows.findIndex((l) => l.id === a.row);
  const ca = t.cols.findIndex((l) => l.id === a.col);
  const rb = t.rows.findIndex((l) => l.id === b.row);
  const cb = t.cols.findIndex((l) => l.id === b.col);
  if (ra < 0 || ca < 0 || rb < 0 || cb < 0) return null;
  return { r0: Math.min(ra, rb), c0: Math.min(ca, cb), r1: Math.max(ra, rb), c1: Math.max(ca, cb) };
}

/** Fusions d'un import (F18), comme `merges_ok` du cœur. */
function validMerges(merges: readonly (readonly [number, number, number, number])[], rows: number, cols: number): boolean {
  const seen: FakeMerge[] = [];
  for (const [r, c, nr, nc] of merges) {
    if (![r, c, nr, nc].every((v) => Number.isInteger(v) && v >= 0) || nr < 1 || nc < 1 || nr * nc < 2 || r + nr > rows || c + nc > cols) return false;
    const m = { r0: r, c0: c, r1: r + nr - 1, c1: c + nc - 1 };
    if (seen.some((o) => overlaps(o, m))) return false;
    seen.push(m);
  }
  return true;
}

const LOOK_HA: readonly string[] = ["left", "center", "right"];
const LOOK_VA: readonly string[] = ["top", "middle", "bottom"];
const LOOK_STYLES: readonly string[] = ["solid", "dashed", "dotted", "none"];
const MAX_BORDER_WIDTH = 32;
const MAX_ACCEPT = 64;
const MAX_LABEL_CHARS = 200;
/** DS1, comme `check` du cœur (`table_look.rs`) : la valeur admise, sinon null (refus avant la recherche du tableau). La
 *  forme (types) est celle de l'adaptateur Wasm (`isCellLookShape`, C1) ; s'y ajoutent les domaines du cœur. */
function checkedLook(l: unknown): CellLook | null {
  if (!isCellLookShape(l)) return null;
  const ok =
    l.key === "ha" ? LOOK_HA.includes(l.value)
    : l.key === "va" ? LOOK_VA.includes(l.value)
    : l.key === "border" ? l.value === null || (validColor(l.value[0]) && finitePositive(l.value[1]) && l.value[1] <= MAX_BORDER_WIDTH && LOOK_STYLES.includes(l.value[2]))
    : l.key === "open" ? true
    : l.value.length <= MAX_ACCEPT && l.value.every((x) => x.trim() !== "" && [...x].length <= MAX_LABEL_CHARS);
  return ok ? l : null;
}
/** Comparaison par valeurs, comme `differs` du cœur (jamais par identité du tableau). */
const sameBorder = (a: TableBorder | undefined, b: TableBorder | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
/** Case après `look` (DS1, `differs` puis `write` du cœur) ; la même référence si rien ne change (case absente : aucune
 *  valeur ; `left` et `top` s'écrivent « absent » ; `open` : case ombrée seulement). */
function lookCell(cell: FakeCell | undefined, look: Exclude<CellLook, { key: "accept" }>): FakeCell | undefined {
  const base = cell ?? EMPTY_CELL;
  if (look.key === "ha") {
    const v = look.value === "left" ? undefined : look.value;
    if (base.ha === v) return cell;
    const { ha: _h, ...rest } = base;
    return v === undefined ? rest : { ...rest, ha: v };
  }
  if (look.key === "va") {
    const v = look.value === "top" ? undefined : look.value;
    if (base.va === v) return cell;
    const { va: _v, ...rest } = base;
    return v === undefined ? rest : { ...rest, va: v };
  }
  if (look.key === "border") {
    const v = look.value ?? undefined;
    if (sameBorder(base.border, v)) return cell;
    const { border: _b, ...rest } = base;
    return v === undefined ? rest : { ...rest, border: [v[0], v[1], v[2]] };
  }
  if (cell === undefined || cell.shade === null || (cell.open === true) === look.value) return cell;
  const { open: _o, ...rest } = cell;
  return look.value ? { ...rest, open: true } : rest;
}
const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
/** Vue (T13, F29) : cellules non vides (texte, remplissage, ombrage, image de fond, alignements `ha` et `va`, bordure)
 *  dans l'ordre de lecture ; zones par `mergesOf`. */
function tableView(t: FakeTable): TableData {
  const cells: TableCell[] = [];
  for (const r of t.rows) {
    for (const c of t.cols) {
      const cell = t.cells.get(cellKey(r.id, c.id));
      if (cell && (cell.text !== "" || cell.fill !== null || cell.shade !== null || cell.bg !== null || cell.ha !== undefined || cell.va !== undefined || cell.border !== undefined)) {
        cells.push({
          row: r.id, col: c.id, text: cell.text, fill: cell.fill, shade: cell.shade, spans: cell.spans,
          ...(cell.bg === null ? {} : { bg: cell.bg }),
          ...(cell.ha === undefined ? {} : { ha: cell.ha }),
          ...(cell.va === undefined ? {} : { va: cell.va }),
          ...(cell.border === undefined ? {} : { border: cell.border }),
          // Comme la vue du cœur (`cell.open && cell.shade.is_some()`).
          ...(cell.open === true && cell.shade !== null ? { open: true as const } : {}),
        });
      }
    }
  }
  const merges = mergesOf(t).map((m) => ({ row: rowId(t, m.r0), col: colId(t, m.c0), rows: m.r1 - m.r0 + 1, cols: m.c1 - m.c0 + 1 }));
  return {
    color: t.color,
    size: t.size,
    cols: t.cols,
    rows: t.rows,
    cells,
    merges,
    ...(t.fit === "shrink" ? { fit: "shrink" as const } : {}),
    ...(t.header === true ? { header: true } : {}),
  };
}
/** Écrite seulement si absente (K3). */
const putMeta = (assets: Map<string, unknown>, a: AssetRef, linked: string | null = null): void => {
  if (!assets.has(a.id)) assets.set(a.id, { name: a.name, mime: a.mime, size: a.size, ...(linked !== null ? { linked } : {}) });
};
/** Chemin lié lisible d'une métadonnée (C14) : texte non vide, sinon null. */
const linkedOf = (m: unknown): string | null => isRecord(m) && typeof m["linked"] === "string" && m["linked"] !== "" ? m["linked"] : null;
const validLink = (p: string): boolean => p !== "" && [...p].length <= MAX_LINK_CHARS;
/** Lecture tolérante d'un média (C14) : obligatoires asset, mediaType, w, h (f32) ; facultatifs neutres s'ils sont illisibles. */
function readMedia(v: unknown): MediaData | null {
  if (!isRecord(v)) return null;
  const { asset, mediaType, w, h } = v;
  if (!isAssetId(asset) || (mediaType !== "video" && mediaType !== "audio")) return null;
  if (!finitePositive(w) || !finitePositive(h) || !Number.isFinite(Math.fround(w)) || !Number.isFinite(Math.fround(h))) return null;
  const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
  const d = num(v["duration"]);
  const duration = d !== null && d >= 0 ? d : 0;
  const poster = isAssetId(v["poster"]) ? v["poster"] : null;
  const ts = num(v["trimStart"]);
  const trimStart = ts !== null && ts >= 0 && (duration === 0 || ts < duration) ? ts : 0;
  const te = num(v["trimEnd"]);
  const trimEnd = te !== null && te > trimStart && (duration === 0 || te < duration) ? te : null;
  const vol = num(v["volume"]);
  return {
    asset, mediaType, w, h, duration, poster, trimStart, trimEnd,
    loop: v["loop"] === true,
    volume: vol !== null && vol >= 0 && vol <= 1 ? vol : 1,
  };
}
const isModel3dFormat = (v: unknown): v is Model3dFormat => typeof v === "string" && (MODEL3D_FORMATS as readonly string[]).includes(v);
/** `valid_box` du cœur : finie > 0, tenant en f32. */
const validBox = (w: unknown, h: unknown): boolean =>
  finitePositive(w) && finitePositive(h) && Number.isFinite(Math.fround(w)) && Number.isFinite(Math.fround(h));
const validYaw = (y: unknown): y is number => typeof y === "number" && Number.isFinite(y) && y > -Math.PI && y <= Math.PI;
const validPitch = (p: unknown): p is number => typeof p === "number" && Number.isFinite(p) && Math.abs(p) <= MODEL3D_PITCH_LIMIT;
/** `valid_path` du cœur (C15, X3) : 1 à 1 024 points de code, ni `\` ni `:`, segments non vides, ni `.` ni `..`. */
const validPath = (p: string): boolean => {
  const n = [...p].length;
  return n >= 1 && n <= MAX_MODEL3D_PATH && !p.includes("\\") && !p.includes(":") && p.split("/").every((x) => x !== "" && x !== "." && x !== "..");
};
/** Lecture tolérante d'un objet 3D (C15, X8) : obligatoires asset, format, w, h (f32) ; facultatifs aux défauts s'ils
 *  sont illisibles ; entrée de `files` illisible, hors domaine ou en double : ignorée ; 256 au plus. */
function readModel3d(v: unknown): Model3dData | null {
  if (!isRecord(v)) return null;
  const { asset, format, w, h } = v;
  if (!isAssetId(asset) || !isModel3dFormat(format) || !validBox(w, 1) || !validBox(1, h)) return null;
  const files: Model3dFile[] = [];
  const raw = v["files"];
  if (Array.isArray(raw)) {
    for (const f of raw) {
      if (!isRecord(f)) continue;
      const { path, asset: a } = f;
      if (typeof path !== "string" || typeof a !== "string") continue;
      if (files.length === MAX_MODEL3D_FILES || !validPath(path) || !isAssetId(a) || files.some((x) => x.path === path)) continue;
      files.push({ path, asset: a });
    }
  }
  return {
    asset, format, w: w as number, h: h as number, files,
    yaw: validYaw(v["yaw"]) ? v["yaw"] : DEFAULT_MODEL3D_YAW,
    pitch: validPitch(v["pitch"]) ? v["pitch"] : DEFAULT_MODEL3D_PITCH,
    snapshot: isAssetId(v["snapshot"]) ? v["snapshot"] : null,
  };
}
/** Forme enregistrée d'un objet 3D : comme le cœur, défauts de la caméra, liés vides et instantané absent non écrits. */
const savedModel3d = (m: Model3dData): Record<string, unknown> => ({
  asset: m.asset, format: m.format, w: m.w, h: m.h,
  ...(m.files.length > 0 ? { files: m.files } : {}),
  ...(m.yaw !== DEFAULT_MODEL3D_YAW ? { yaw: m.yaw } : {}),
  ...(m.pitch !== DEFAULT_MODEL3D_PITCH ? { pitch: m.pitch } : {}),
  ...(m.snapshot !== null ? { snapshot: m.snapshot } : {}),
});
/** Métadonnées des assets cités, recopiées seulement si absentes de la cible (K3). */
function adoptMeta(into: Map<string, unknown>, from: ReadonlyMap<string, unknown>, cited: readonly string[]): void {
  for (const id of cited) {
    const v = from.get(id);
    if (v !== undefined && !into.has(id)) into.set(id, v);
  }
}

/** Métadonnée lue avec les défauts du cœur, champ par champ (K4). */
function assetInfo(assets: ReadonlyMap<string, unknown>, id: string): AssetInfo {
  const m = assets.get(id);
  const r = isRecord(m) ? m : {};
  const { name, mime, size } = r;
  return {
    id,
    name: typeof name === "string" ? name : id,
    mime: typeof mime === "string" && mime !== "" ? mime : DEFAULT_ASSET_MIME,
    size: typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : 0,
  };
}

/** Indice de page lisible (PF5), même règle que `page_index` du cœur : entier ≥ 0 tenant en u32. */
const pageIndexOf = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffffff ? v : null);

/** Fond vu comme par le cœur (K6, K9) : null sans asset conforme ; rect sur la largeur si w et h sont lisibles. */
function backdropView(raw: RawRecord | null, width: number): BackdropView | null {
  if (raw === null) return null;
  const { asset, kind, page, w, h, fit, original } = raw;
  if (!isAssetId(asset)) return null;
  const bw = finitePositive(w) ? w : null;
  const bh = finitePositive(h) ? h : null;
  return {
    asset,
    kind: typeof kind === "string" ? kind : "",
    page: pageIndexOf(page),
    w: bw,
    h: bh,
    fit: typeof fit === "string" ? fit : "",
    rect: bw !== null && bh !== null ? { x0: 0, y0: 0, x1: width, y1: (bh * width) / bw } : null,
    original: isAssetId(original) ? original : null,
  };
}

const BACKDROP_KEYS = ["asset", "kind", "w", "h", "fit"] as const;
const sameBackdrop = (a: RawRecord | null, b: RawRecord | null): boolean =>
  a === null || b === null ? a === b : BACKDROP_KEYS.every((k) => a[k] === b[k]);

/** Balayage des assets cités (K4) : toute chaîne conforme, à toute profondeur ; le texte lui-même n'est pas balayé. */
function scanAssets(v: unknown, acc: Set<string>): void {
  if (typeof v === "string") {
    if (isAssetId(v)) acc.add(v);
    return;
  }
  if (v instanceof Float32Array) return;
  if (Array.isArray(v)) {
    for (const x of v) scanAssets(x, acc);
    return;
  }
  if (isRecord(v)) for (const x of Object.values(v)) scanAssets(x, acc);
}

let counter = 0;
const newId = (): string => `fake-${++counter}`;

/** Recopie (Z4) : id neuf, chemin renuméroté par `groups` (commun à l'insertion), lien de case relié au tableau copié
 *  (`ids` : table ancien → neuf du lot), translation si le transform est lu. */
function copyElement(e: FakeElement, groups: Map<string, string>, dx: number, dy: number, id: string = newId(), ids?: ReadonlyMap<string, string>): FakeElement {
  const group = e.group?.map((g) => {
    let n = groups.get(g);
    if (n === undefined) {
      n = newId();
      groups.set(g, n);
    }
    return n;
  });
  // personnalisation-3 (T5) : `cell[0]` remplacé par l'id neuf du tableau copié ; tableau absent de la copie : lien retiré.
  const { group: _old, cell: _c, ...rest } = e;
  const table = e.cell === undefined ? undefined : ids?.get(e.cell[0]);
  const cell: { cell?: CellLink } = e.cell !== undefined && table !== undefined ? { cell: [table, e.cell[1], e.cell[2]] } : {};
  const moves = (dx !== 0 || dy !== 0) && e.unknown?.hasTransform !== false && e.malformed === undefined;
  const t = e.transform;
  const transform: Matrix = moves ? [t[0], t[1], t[2], t[3], t[4] + dx, t[5] + dy] : t;
  return { ...rest, id, transform, ...withGroup(group), ...cell };
}
/** personnalisation-3 : élément de nature tableau, lisible ou non (`kind` brut du cœur : un tableau mal formé aussi). */
const isTableKind = (e: FakeElement): boolean => e.table !== undefined || e.unknown?.sourceKind === "table";
/** Élément dont le transform est lu (cibles de `Transform`, comme `out_transform` du cœur). */
const movable = (e: FakeElement): boolean => e.unknown?.hasTransform !== false && e.malformed === undefined;
const withoutCell = ({ cell: _c, ...rest }: FakeElement): FakeElement => rest;
/** personnalisation-3 (D5) : décalage de chaque ligne et colonne depuis le coin, comme `offsets` du cœur. */
interface Offsets { readonly cols: ReadonlyMap<string, number>; readonly rows: ReadonlyMap<string, number> }
function offsetsOf(t: FakeTable): Offsets {
  const run = (lines: readonly { readonly id: string; readonly size: number }[]): Map<string, number> => {
    const m = new Map<string, number>();
    let acc = 0;
    for (const l of lines) {
      m.set(l.id, acc);
      acc += l.size;
    }
    return m;
  };
  return { cols: run(t.cols.map((c) => ({ id: c.id, size: c.width }))), rows: run(t.rows.map((r) => ({ id: r.id, size: r.height }))) };
}
/** Suivi (D5), comme `move_linked` : translation du coin de la case (partie linéaire de `m`, matrice du tableau), lien
 *  retiré si sa ligne ou sa colonne a disparu (H22), lien déjà sans case avant laissé tel quel ; ids touchés, ordre de la
 *  pile ; les seuls translatés sont aussi poussés dans `translated`. */
function followCells(p: FakePage, tableId: string, m: Matrix, before: Offsets, after: Offsets, skip: ReadonlySet<string>, translated?: string[]): string[] {
  const out: string[] = [];
  p.elements.forEach((e, i) => {
    const l = e.cell;
    if (l === undefined || l[0] !== tableId || skip.has(e.id) || isTableKind(e)) return;
    const c0 = before.cols.get(l[2]);
    const r0 = before.rows.get(l[1]);
    if (c0 === undefined || r0 === undefined) return;
    const c1 = after.cols.get(l[2]);
    const r1 = after.rows.get(l[1]);
    if (c1 === undefined || r1 === undefined) {
      p.elements[i] = withoutCell(e);
      out.push(e.id);
      return;
    }
    const dx = c1 - c0;
    const dy = r1 - r0;
    if (!movable(e) || (dx === 0 && dy === 0)) return;
    const [a, b, c, d, tx, ty] = e.transform;
    p.elements[i] = { ...e, transform: [a, b, c, d, tx + m[0] * dx + m[2] * dy, ty + m[1] * dx + m[3] * dy] };
    translated?.push(e.id);
    out.push(e.id);
  });
  return out;
}
/** Rectangle local d'une case (sa zone si elle en couvre une), comme `cell_rect`. */
function cellRectOf(t: FakeTable, row: string, col: string): Bounds | null {
  const r = t.rows.findIndex((x) => x.id === row);
  const c = t.cols.findIndex((x) => x.id === col);
  if (r < 0 || c < 0) return null;
  const z = mergesOf(t).find((m) => m.r0 <= r && r <= m.r1 && m.c0 <= c && c <= m.c1) ?? { r0: r, c0: c, r1: r, c1: c };
  const at = (sizes: readonly number[], i: number): number => sum(sizes.slice(0, i));
  const w = t.cols.map((x) => x.width);
  const h = t.rows.map((x) => x.height);
  return { x0: at(w, z.c0), y0: at(h, z.r0), x1: at(w, z.c1 + 1), y1: at(h, z.r1 + 1) };
}
/** Tailles par id, comme `line_sizes_ok` puis `write_line_sizes` du cœur : contrôle sur la dernière taille demandée de
 *  chaque ligne (finie > 0, ligne connue, totaux bornés en f32) ; écriture de chaque taille qui diffère de la taille lue,
 *  la dernière l'emportant. null : refus. */
function resizedLines(t: FakeTable, list: readonly (readonly [TableAxis, string, number])[]): FakeTable | null {
  const lines = (a: TableAxis): { readonly id: string; readonly size: number }[] =>
    a === "row" ? t.rows.map((r) => ({ id: r.id, size: r.height })) : t.cols.map((c) => ({ id: c.id, size: c.width }));
  // Comme `line_sizes_ok` du cœur, entrée unique des deux commandes : une ligne citée deux fois est refusée (le contrôle
  // lirait la dernière taille, l'écriture la première différente).
  if (new Set(list.map(([a, id]) => `${a}:${id}`)).size !== list.length) return null;
  const known = list.every(([a, id, size]) => positive(size) && lines(a).some((l) => l.id === id));
  const total = (a: TableAxis): number =>
    sum(lines(a).map((l) => [...list].reverse().find(([b, id]) => b === a && id === l.id)?.[2] ?? l.size));
  if (!known || !fitsF32([total("row"), total("col")])) return null;
  const written = (a: TableAxis, id: string, cur: number): number =>
    [...list].reverse().find(([b, i, size]) => b === a && i === id && size !== cur)?.[2] ?? cur;
  const cols = t.cols.map((c) => {
    const w = written("col", c.id, c.width);
    return w === c.width ? c : { ...c, width: w };
  });
  const rows = t.rows.map((r) => {
    const h = written("row", r.id, r.height);
    return h === r.height ? r : { ...r, height: h };
  });
  return { ...t, cols, rows };
}
const sameLines = (a: FakeTable, b: FakeTable): boolean =>
  a.cols.length === b.cols.length && a.rows.length === b.rows.length && a.cols.every((c, i) => c === b.cols[i]) && a.rows.every((r, i) => r === b.rows[i]);

/** OG12 (n° 10) : liaisons renvoyées vers la copie de leur cible (`fresh`), retirées si la cible n'est pas du lot. */
function rebound(e: FakeElement, fresh: ReadonlyMap<string, string>): FakeElement {
  const s = e.shape;
  if (!s || (s.start === undefined && s.end === undefined)) return e;
  const to = (b: LineBinding | undefined): LineBinding | undefined => {
    const n = b === undefined ? undefined : fresh.get(b.id);
    return b === undefined || n === undefined ? undefined : { ...b, id: n };
  };
  const { start, end, ...rest } = s;
  const ns = to(start);
  const ne = to(end);
  return { ...e, shape: { ...rest, ...(ns ? { start: ns } : {}), ...(ne ? { end: ne } : {}) } };
}

/** Recopie d'un lot (`copy_prelims` du cœur) : table ancien → neuf du lot tirée d'abord (première occurrence d'un id
 *  répété ; un objet passé sous son tableau est recopié avant lui), puis chaque recopie, lien de case relié au tableau
 *  copié (personnalisation-3, T5), liaisons renvoyées vers les copies ou retirées. Seul chemin de recopie d'`extract`,
 *  `insertFragment`, `insertPages`, `DuplicatePage` et `AddLinked`. */
function copyElements(list: readonly FakeElement[], groups: Map<string, string>, dx: number, dy: number): FakeElement[] {
  const fresh = new Map<string, string>();
  const own = list.map((e) => {
    const id = newId();
    if (!fresh.has(e.id)) fresh.set(e.id, id);
    return id;
  });
  return list.map((e, i) => rebound(copyElement(e, groups, dx, dy, own[i]!, fresh), fresh));
}

type Pt2 = [number, number];
/** OG12 : boîte d'accroche (miroir de `bind_box`) ; null pour un trait, une ligne, une flèche, un `fill`, un inconnu. */
function bindBoxOf(e: FakeElement): BindBox | null {
  if (e.malformed || e.unknown || e.fill || e.local !== undefined) return null;
  const box = (w: number, h: number, outline: Outline, width: number): BindBox | null =>
    positive(w) && positive(h) ? { id: e.id, m: e.transform, w, h, outline, gap: bindGap(width) } : null;
  // OG12 lot 2a : la ligne fermée reste un segment, non accrochable.
  const outlineOf = (k: ShapeKind): Outline => (k === "ellipse" ? "ellipse" : k === "diamond" ? "diamond" : "box");
  if (e.shape) return isSegment(e.shape.shape) ? null : box(e.shape.w, e.shape.h, outlineOf(e.shape.shape), e.style.width);
  if (e.text) return box(e.text.boxWidth, e.text.boxHeight, "box", 0);
  if (e.image) return box(...displaySize(e.image), "box", 0);
  if (e.table) return box(tableWidth(e.table), tableHeight(e.table), "box", 0);
  if (e.media) return box(e.media.w, e.media.h, "box", 0);
  if (e.model3d) return box(e.model3d.w, e.model3d.h, "box", 0);
  return null;
}
/** Points monde d'une ligne (`world_of`). */
const worldOf = (e: FakeElement): Pt2[] =>
  e.shape ? linePath(e.shape.w, e.shape.h, e.shape.points ?? []).map(([x, y]) => applyMatrix(e.transform, x, y)) : [];
/** Écriture d'une ligne (miroir de `line_writes`) : partie linéaire gardée, départ = premier point, points intérieurs
 *  locaux (absents s'il n'y en a pas), liaisons posées ou retirées ; refus du cœur rendus tels quels. */
function withLine(e: FakeElement, world: readonly Pt2[], start: LineBinding | null, end: LineBinding | null): FakeElement | "badMatrix" | "badPoints" {
  const s = e.shape;
  const p0 = world[0];
  const t = e.transform;
  const inv = invertMatrix([t[0], t[1], t[2], t[3], 0, 0]);
  if (!s || !p0 || !inv) return "badMatrix";
  const local = world.map(([x, y]) => applyMatrix(inv, x - p0[0], y - p0[1]));
  const [w, h] = local[local.length - 1]!;
  const inner = local.slice(1, -1).flat();
  if (!fitsF32([p0[0], p0[1], w, h]) || !fitsF32(inner)) return "badPoints";
  const { points: _p, start: _s, end: _e, ...rest } = s;
  return {
    ...e,
    transform: [t[0], t[1], t[2], t[3], p0[0], p0[1]],
    shape: { ...rest, w, h, ...(inner.length > 0 ? { points: inner } : {}), ...(start ? { start } : {}), ...(end ? { end } : {}) },
  };
}
const sameBinding = (a: LineBinding | undefined, b: LineBinding | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.id === b.id && a.fx === b.fx && a.fy === b.fy);
/** Aucune écriture effective (`differs` du cœur) : même matrice, même boîte, mêmes points, mêmes liaisons. */
function sameLine(a: FakeElement, b: FakeElement): boolean {
  const s = a.shape;
  const t = b.shape;
  if (!s || !t) return false;
  const pa = s.points ?? [];
  const pb = t.points ?? [];
  return a.transform.every((v, i) => v === b.transform[i]) && s.w === t.w && s.h === t.h && pa.length === pb.length &&
    pa.every((v, i) => v === pb[i]) && sameBinding(s.start, t.start) && sameBinding(s.end, t.end);
}
/** Liaison contrôlée (`checked_binding`) : rapport borné et boîte de sa cible. */
interface Checked { readonly bind: LineBinding; readonly box: BindBox }
/** Extrémités liées recalées sur leur ancre (n° 17). */
function anchored(world: readonly Pt2[], start: Checked | null, end: Checked | null): Pt2[] {
  const out = [...world];
  if (start) out[0] = anchorPoint(start.box, start.bind.fx, start.bind.fy);
  if (end) out[out.length - 1] = anchorPoint(end.box, end.bind.fx, end.bind.fy);
  return out;
}
/** Flèche coudée : écart assumé (DA-3), elle garde ses seuls bouts, sans route. */
const elbowArrow = (e: FakeElement): boolean => e.shape?.shape === "arrow" && elbowedOf(e.look);
/** Points intérieurs valides d'`AddShape` (`valid_inner`). */
const validInner = (p: readonly number[]): boolean =>
  p.length % 2 === 0 && p.length <= 2 * MAX_INNER_POINTS && p.every((v) => Number.isFinite(v)) && fitsF32(p);
/** Point du contour le plus proche de (qx, qy) local, sa distance locale, et le point dedans (`nearest_outline`). */
function nearestOutline(b: BindBox, qx: number, qy: number): { readonly p: Pt2; readonly d: number; readonly contains: boolean } {
  if (b.outline === "diamond") {
    // OG12 lot 2a : point le plus proche des quatre arêtes du losange inscrit.
    const cx = b.w / 2;
    const cy = b.h / 2;
    const v: Pt2[] = [[cx, 0], [b.w, cy], [cx, b.h], [0, cy]];
    let best: { p: Pt2; d: number } = { p: v[0]!, d: Number.POSITIVE_INFINITY };
    for (let i = 0; i < 4; i++) {
      const a = v[i]!;
      const c = v[(i + 1) % 4]!;
      const ex = c[0] - a[0];
      const ey = c[1] - a[1];
      const t = Math.min(Math.max(((qx - a[0]) * ex + (qy - a[1]) * ey) / (ex * ex + ey * ey), 0), 1);
      const p: Pt2 = [a[0] + t * ex, a[1] + t * ey];
      const d = Math.hypot(qx - p[0], qy - p[1]);
      if (d < best.d) best = { p, d };
    }
    return { ...best, contains: Math.abs(qx - cx) / cx + Math.abs(qy - cy) / cy <= 1 };
  }
  if (b.outline === "ellipse") {
    const cx = b.w / 2;
    const cy = b.h / 2;
    const r = Math.sqrt(((qx - cx) / cx) ** 2 + ((qy - cy) / cy) ** 2);
    const p: Pt2 = r < 1e-12 ? [cx, 0] : [cx + (qx - cx) / r, cy + (qy - cy) / r];
    return { p, d: Math.hypot(qx - p[0], qy - p[1]), contains: r <= 1 };
  }
  const inside = qx >= 0 && qx <= b.w && qy >= 0 && qy <= b.h;
  let p: Pt2;
  if (inside) {
    const d = [qy, b.w - qx, b.h - qy, qx];
    let k = 0;
    for (let i = 1; i < 4; i++) if (d[i]! < d[k]!) k = i;
    p = k === 0 ? [qx, 0] : k === 1 ? [b.w, qy] : k === 2 ? [qx, b.h] : [0, qy];
  } else {
    p = [Math.min(Math.max(qx, 0), b.w), Math.min(Math.max(qy, 0), b.h)];
  }
  return { p, d: Math.hypot(qx - p[0], qy - p[1]), contains: inside };
}
/** Boîte monde alignée d'une boîte d'accroche (`world_box`). */
function worldBox(b: BindBox): [number, number, number, number] {
  const c = [[0, 0], [b.w, 0], [b.w, b.h], [0, b.h]].map(([x, y]) => applyMatrix(b.m, x!, y!));
  const xs = c.map((q) => q[0]);
  const ys = c.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
/** Écart entre un nœud et son objet relié (`LINK_GAP`). */
const LINK_GAP = 100;
/** `LinkDir::unit` et `LinkDir::ratio` du cœur. */
const LINK_DIRS: Readonly<Record<LinkDir, { readonly u: Pt2; readonly r: Pt2 }>> = {
  up: { u: [0, -1], r: [0.5, 0] },
  down: { u: [0, 1], r: [0.5, 1] },
  left: { u: [-1, 0], r: [0, 0.5] },
  right: { u: [1, 0], r: [1, 0.5] },
};
const finitePath = (path: Float32Array): boolean =>
  path.length >= 2 && path.length % 2 === 0 && path.every((v) => Number.isFinite(v));
const positive = (v: number): boolean => Number.isFinite(v) && v > 0;
/** `fits_f32` du cœur : chaque valeur reste finie une fois arrondie en f32. */
const fitsF32 = (vs: readonly number[]): boolean => vs.every((v) => Number.isFinite(Math.fround(v)));
const sum = (vs: readonly number[]): number => vs.reduce((a, b) => a + b, 0);
/** Matrice de `Transform`, donnée ou composée : six nombres finis, |dét| ≥ 1e-12 (même règle que le cœur). */
const validMatrix = (m: Matrix): boolean => m.every((v) => Number.isFinite(v)) && Math.abs(m[0] * m[3] - m[1] * m[2]) >= 1e-12;

function toLocal(points: Float32Array): { x0: number; y0: number; local: Float32Array } {
  const x0 = points[0] ?? 0;
  const y0 = points[1] ?? 0;
  const local = new Float32Array(points.length);
  for (let i = 0; i + 2 < points.length; i += 3) {
    local[i] = (points[i] ?? 0) - x0;
    local[i + 1] = (points[i + 1] ?? 0) - y0;
    local[i + 2] = points[i + 2] ?? 0;
  }
  return { x0, y0, local };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
}

/** Points monde d'un trait (vide pour une forme ou un texte). */
function worldPoints(e: FakeElement): [number, number][] {
  const out: [number, number][] = [];
  const l = e.local;
  if (!l) return out;
  for (let i = 0; i + 2 < l.length; i += 3) out.push(applyMatrix(e.transform, l[i] ?? 0, l[i + 1] ?? 0));
  return out;
}

/** Plus petite valeur singulière de la partie linéaire de `m` : facteur exact d'une similitude (même règle que le cœur). */
function minSingular(m: Matrix): number {
  const f = m[0] * m[0] + m[1] * m[1] + m[2] * m[2] + m[3] * m[3];
  const det = Math.abs(m[0] * m[3] - m[1] * m[2]);
  const max = Math.sqrt((f + Math.sqrt(Math.max(0, f * f - 4 * det * det))) / 2);
  return max > 0 ? det / max : 0;
}

/** Demi-épaisseur monde d'un trait (T63) : le cœur porte son contour par la matrice ; ici, mesurée sur les points monde,
 *  elle est mise à l'échelle (exacte sous une similitude ; sinon la plus petite, comme la gomme partielle du cœur). */
const strokeHalfWidth = (e: FakeElement): number => (e.style.width / 2) * minSingular(e.transform);

/** Le chemin touche-t-il le trait ? Chemin et `radius` en unités monde, épaisseur à l'échelle du trait (T63). */
function strokeTouches(e: FakeElement, path: Float32Array, radius: number): boolean {
  const reach = radius + strokeHalfWidth(e);
  for (const [x, y] of worldPoints(e)) {
    for (let j = 0; j + 1 < path.length; j += 2) {
      const ax = path[j] ?? 0;
      const ay = path[j + 1] ?? 0;
      const bx = j + 3 < path.length ? (path[j + 2] ?? 0) : ax;
      const by = j + 3 < path.length ? (path[j + 3] ?? 0) : ay;
      if (distToSegment(x, y, ax, ay, bx, by) <= reach) return true;
    }
  }
  return false;
}

/** Polygone monde (x, y alternés) d'une forme, d'un texte, d'une image, d'un tableau ou d'un inconnu ; null pour un trait. */
function worldPolygon(e: FakeElement): number[] | null {
  const local = e.shape
    ? shapePolygon(e.shape.shape, e.shape.w, e.shape.h, e.style.width, lineGeomOf(e.shape, e.look))
    : e.text
      ? boxPolygon(e.text.boxWidth, e.text.boxHeight)
      : e.image
        ? boxPolygon(...displaySize(e.image))
        : e.media
          ? boxPolygon(e.media.w, e.media.h)
        : e.model3d
          ? boxPolygon(e.model3d.w, e.model3d.h)
        : e.fill
          ? [...(e.fill.contours[0] ?? [])]
        : e.table
          ? boxPolygon(tableWidth(e.table), tableHeight(e.table))
          : e.unknown
            ? boxPolygon(e.unknown.box.w, e.unknown.box.h)
            : null;
  if (!local) return null;
  const out: number[] = [];
  for (let i = 0; i + 1 < local.length; i += 2) out.push(...applyMatrix(e.transform, local[i] ?? 0, local[i + 1] ?? 0));
  return out;
}

function polygonHit(poly: number[], x: number, y: number, tol: number): boolean {
  const n = poly.length / 2;
  let inside = false;
  let edge = Number.POSITIVE_INFINITY;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[2 * i] ?? 0;
    const yi = poly[2 * i + 1] ?? 0;
    const xj = poly[2 * j] ?? 0;
    const yj = poly[2 * j + 1] ?? 0;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    edge = Math.min(edge, distToSegment(x, y, xi, yi, xj, yj));
  }
  return inside || edge <= tol;
}

/** C8 (Q13) : `fill` touché dedans (pair-impair sur ses anneaux) et à plus de `tol` de chacun de ses bords (miroir de
 *  `fill_hit`, `query.rs`). */
function fillHit(e: FakeElement, x: number, y: number, tol: number): boolean {
  const f = e.fill;
  if (!f) return false;
  let inside = false;
  let edge = Number.POSITIVE_INFINITY;
  for (const r of f.contours) {
    const n = r.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = applyMatrix(e.transform, r[2 * i] ?? 0, r[2 * i + 1] ?? 0);
      const [xj, yj] = applyMatrix(e.transform, r[2 * j] ?? 0, r[2 * j + 1] ?? 0);
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      edge = Math.min(edge, distToSegment(x, y, xi, yi, xj, yj));
    }
  }
  return inside && edge > tol;
}

/** C8 (Q11) : `fill` lisible depuis le brut ; sinon null (cadre inconnu). */
function readFill(v: unknown): FakeFill | null {
  if (!isRecord(v)) return null;
  const { color, w, h, contours } = v;
  if (typeof color !== "string" || !validColor(color) || !finitePositive(w) || !finitePositive(h)) return null;
  if (!Array.isArray(contours) || contours.length === 0) return null;
  const rings: number[][] = [];
  for (const r of contours) {
    if (!Array.isArray(r) || r.length < 6 || r.length % 2 !== 0 || !r.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    rings.push([...(r as number[])]);
  }
  return { color, w, h, contours: rings };
}

function polyOutline(points: Float32Array, dx: number, dy: number): Float32Array {
  const out: number[] = [];
  for (let i = 0; i + 2 < points.length; i += 3) out.push((points[i] ?? 0) + dx, (points[i + 1] ?? 0) + dy);
  return new Float32Array(out);
}

interface Found { readonly page: FakePage; readonly index: number; readonly element: FakeElement }

/** Champ `kind` brut d'un élément (OE23, H4) : celui du fichier, même quand la vue est `unknown` ou absente (`malformed`) ;
 *  ordre des champs d'`element()`. */
function rawKind(e: FakeElement): string {
  if (e.unknown) return e.unknown.sourceKind;
  if (e.malformed) return typeof e.malformed["kind"] === "string" ? e.malformed["kind"] : "";
  if (e.image) return "image";
  if (e.media) return "media";
  if (e.model3d) return "model3d";
  if (e.fill) return "fill";
  if (e.table) return "table";
  if (e.shape) return "shape";
  if (e.text) return "text";
  return "stroke";
}

class FakeDocument implements CoreDocument {
  private state: State;
  private undoStack: State[] = [];
  private redoStack: State[] = [];
  private ver = 0;

  constructor(state: State) {
    this.state = state;
  }

  private pageOf(id: string): FakePage {
    const p = this.state.pages.find((q) => q.id === id);
    if (!p) throw new Error(`page inconnue : ${id}`);
    return p;
  }

  private find(id: string): Found | undefined {
    for (const page of this.state.pages) {
      const index = page.elements.findIndex((e) => e.id === id);
      const element = page.elements[index];
      if (element) return { page, index, element };
    }
    return undefined;
  }

  private unchanged(): Change {
    return { pages: [], ids: [], removed: [], full: false, version: this.ver };
  }

  /** Tableau `id` ; absent ou pas un tableau : élément inconnu (ordre du cœur : après les contrôles d'arguments). */
  private tableOf(id: string): { readonly found: Found; readonly t: FakeTable } {
    const found = this.find(id);
    const t = found?.element.table;
    if (!found || !t) throw new Error(`élément inconnu : ${id}`);
    return { found, t };
  }

  /** Une étape : le tableau `id` remplacé par `next` (les autres éléments repris tels quels). */
  private writeTable(found: Found, id: string, next: FakeTable): Change {
    const pageId = found.page.id;
    return this.step((s) => {
      const p = s.pages.find((q) => q.id === pageId);
      const i = p ? p.elements.findIndex((e) => e.id === id) : -1;
      const old = p?.elements[i];
      if (p && old) p.elements[i] = { ...old, table: next };
      // personnalisation-3 (D5) puis OG12 (C1, C3), comme `follow_in` puis `table_done_with` du cœur : le suivi vit ici,
      // seul passage de toutes les écritures de tableau ; le tableau d'abord, puis les objets suivis.
      const moved = p && old ? this.followTable(s, p, id, old.transform, old.table, next, new Set()).filter((x) => x !== id) : [];
      return { pages: [pageId], ids: [id, ...moved], removed: [] };
    });
  }

  /** personnalisation-3 (D1) : la case visée existe (tableau lisible, ligne et colonne présentes). */
  private cellTargetOk(l: CellLink): boolean {
    const t = this.find(l[0])?.element.table;
    return t !== undefined && t.rows.some((r) => r.id === l[1]) && t.cols.some((c) => c.id === l[2]);
  }

  /** personnalisation-3 (D6), comme `leaving_cells` : l'objet lié, déplacé par `m` sans son tableau, sort de sa case si
   *  le centre de sa boîte en sort (bord compris dedans) ; tableau absent ou illisible : lien gardé ; case disparue : retiré. */
  private leavesCell(id: string, moving: ReadonlySet<string>, m: Matrix): boolean {
    const l = this.find(id)?.element.cell;
    if (l === undefined || moving.has(l[0])) return false;
    const b = this.bounds([id]);
    const tf = this.find(l[0]);
    const t = tf?.element.table;
    const inv = tf ? invertMatrix(tf.element.transform) : null;
    if (b === null || t === undefined || inv === null) return false;
    const [nx, ny] = applyMatrix(m, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
    const [lx, ly] = applyMatrix(inv, nx, ny);
    const r = cellRectOf(t, l[1], l[2]);
    return r === null || lx < r.x0 || lx > r.x1 || ly < r.y0 || ly > r.y1;
  }

  /** Une étape : un nouveau tableau (id tiré avant ses lignes et colonnes) posé en dernier sur la page. */
  private writeNewTable(page: string, transform: Matrix, make: () => FakeTable): Change {
    return this.step((s) => {
      const id = newId();
      const table = make();
      s.pages.find((p) => p.id === page)?.elements.push({ id, transform, style: NO_STYLE, table });
      return { pages: [page], ids: [id], removed: [] };
    });
  }

  /** `fill` ou `shade` posé ou retiré sur les ancres et cellules simples du rectangle ; rien à changer : aucune étape. */
  private setOnTargets(found: Found, id: string, t: FakeTable, rect: FakeMerge, key: "fill" | "shade", value: string | null): Change {
    const cells = new Map(t.cells);
    let changed = false;
    for (const [r, c] of targets(rect, mergesOf(t))) {
      const k = keyAt(t, r, c);
      const cell = t.cells.get(k) ?? EMPTY_CELL;
      // personnalisation-3 (DS3) : Ombrer referme une case ouverte même à la même couleur ; Ombrer et Désombrer retirent `open`.
      const reopen = key === "shade" && cell.open === true;
      if (cell[key] === value && !reopen) continue;
      const { open: _o, ...rest } = cell;
      cells.set(k, key === "shade" ? { ...rest, shade: value } : { ...cell, [key]: value });
      changed = true;
    }
    return changed ? this.writeTable(found, id, { ...t, cells }) : this.unchanged();
  }

  private step(mutate: (s: State) => Omit<Change, "version" | "full">): Change {
    const next = clone(this.state);
    const partial = mutate(next);
    if (partial.ids.length === 0 && partial.removed.length === 0 && partial.pages.length === 0) {
      return { ...partial, full: false, version: this.ver };
    }
    this.undoStack.push(this.state);
    this.redoStack = [];
    this.state = next;
    return { ...partial, full: false, version: ++this.ver };
  }

  pageIds(): string[] { return this.state.pages.map((p) => p.id); }
  elementIds(page: string): string[] { return this.pageOf(page).elements.map((e) => e.id); }
  /** Page inconnue : [] (comme le cœur, `page_elements` → `None`), sans lever ; un élément chargé sans `id` lisible (JSON
   *  sans le champ, K8) n'y figure pas. */
  elementIdsOfKind(page: string, kind: string): readonly string[] {
    const p = this.state.pages.find((q) => q.id === page);
    return p === undefined ? [] : p.elements.filter((e) => typeof e.id === "string" && rawKind(e) === kind).map((e) => e.id);
  }

  /** OG12 : liaison demandée (`checked_binding`) : rapport fini, cible connue sur la page `page` de la ligne (C1 :
   *  `bound_target`) et accrochable, rapport borné à ±10 ; sinon forme invalide. */
  private checkedBinding(page: string, b: LineBinding): Checked {
    if (!Number.isFinite(b.fx) || !Number.isFinite(b.fy)) throw new Error(MESSAGES.badShape);
    const target = this.state.pages.find((q) => q.id === page)?.elements.find((x) => x.id === b.id);
    const box = target ? bindBoxOf(target) : null;
    if (!box) throw new Error(MESSAGES.badShape);
    const clamp = (v: number): number => Math.min(BIND_RATIO_MAX, Math.max(-BIND_RATIO_MAX, v));
    return { bind: { id: b.id, fx: clamp(b.fx), fy: clamp(b.fy) }, box };
  }

  /** OG12 : suivi et rupture (`linear::follow`, n° 7, 8), sur l'état `s` de l'étape de la commande qui a bougé `moved` ;
   *  `m` : matrice du `Transform` (null : boîte d'un texte changée). Rend les ids réécrits. */
  /** Comme `follow_in` du cœur, dans l'étape ouverte : objets logés au tableau `tableId` translatés d'abord (D5), puis les
   *  lignes liées (OG12) au tableau si sa boîte a changé et aux objets translatés, relus à leur place neuve ; jamais un
   *  objet seulement délié. Rend les ids touchés par le suivi des objets, ordre de la pile. */
  private followTable(s: State, p: FakePage, tableId: string, m: Matrix, before: FakeTable | undefined, next: FakeTable, skip: ReadonlySet<string>): string[] {
    if (before === undefined) return [];
    const translated: string[] = [];
    const touched = followCells(p, tableId, m, offsetsOf(before), offsetsOf(next), skip, translated);
    const resized = tableWidth(before) !== tableWidth(next) || tableHeight(before) !== tableHeight(next);
    const lines = resized ? [tableId, ...translated] : translated;
    if (lines.length > 0) this.follow(s, new Set(lines), null);
    return touched;
  }

  /** `arrange_with` du cœur (arrange.rs), corps d'`Arrange` et de `Rotate` : ids dédoublonnés, premier inconnu refusé ;
   *  aucun id : aucune étape ; pages mêlées refusées ; groupe extérieur touché = tous ses membres de la page ; `fill`,
   *  inconnu, mal formé jamais bougés ; composée invalide : matrice invalide, rien d'écrit ; `Change.ids` = ids bougés,
   *  triés, puis (OG33) les lignes suivies quand `plan` rend une matrice pleine (suivi dans la même étape). */
  private arrangeWith(asked: readonly string[], plan: (units: ArrangeUnit[]) => readonly [Array<readonly [string, Matrix]>, Matrix | null]): Change {
    const found: Found[] = [];
    const seen = new Set<string>();
    for (const id of asked) {
      if (seen.has(id)) continue;
      seen.add(id);
      const f = this.find(id);
      if (!f) throw new Error(`élément inconnu : ${id}`);
      found.push(f);
    }
    const page = found[0]?.page;
    if (!page) return this.unchanged();
    if (found.some((f) => f.page !== page)) throw new Error("objets de pages différentes");
    const outers = new Set(found.map((f) => f.element.group?.[0]).filter((g): g is string => g !== undefined));
    const reachOf = (e: FakeElement): Reach | null =>
      e.malformed || e.unknown || e.fill ? null
      : e.local !== undefined || e.shape || e.image ? "matrix"
      : e.text || e.table || e.media || e.model3d ? "place"
      : null;
    const units = new Map<string, { members: { id: string; reach: Reach; bounds: Bounds }[] }>();
    const transforms = new Map<string, Matrix>();
    for (const e of page.elements) {
      const outer = e.group?.[0];
      if (!seen.has(e.id) && !(outer !== undefined && outers.has(outer))) continue;
      const reach = reachOf(e);
      if (reach === null) continue;
      const bounds = this.snapBox([e.id]);
      if (bounds === null) continue;
      transforms.set(e.id, e.transform);
      const key = outer ?? e.id;
      const u = units.get(key) ?? { members: [] };
      u.members.push({ id: e.id, reach, bounds });
      units.set(key, u);
    }
    const [moves, full] = plan([...units.values()] satisfies ArrangeUnit[]);
    if (moves.length === 0) return this.unchanged();
    const composed = new Map<string, Matrix>();
    for (const [id, m] of moves) {
      const t = transforms.get(id);
      if (t === undefined) continue;
      const c = composeMatrix(m, t);
      if (!validMatrix(c)) throw new Error(MESSAGES.badMatrix);
      composed.set(id, c);
    }
    const ids = [...composed.keys()].sort();
    return this.step((s) => {
      const p = s.pages.find((q) => q.id === page.id);
      if (p) p.elements.forEach((e, i) => {
        const t = composed.get(e.id);
        if (t) p.elements[i] = { ...e, transform: t };
      });
      // OG33 : suivi et rupture dans la même étape, jamais après (n° 7, S1) ; `Arrange` n'en fait pas (le cœur non plus).
      const followed = full === null ? [] : this.follow(s, new Set(ids), full);
      return { pages: [page.id], ids: [...ids, ...followed.filter((x) => !ids.includes(x))], removed: [] };
    });
  }

  private follow(s: State, moved: ReadonlySet<string>, m: Matrix | null): string[] {
    // C1 (`bound_target`) : cible cherchée sur la page de la ligne seulement ; d'une autre page, bout libre.
    const boxIn = (p: FakePage, b: LineBinding | null): BindBox | null => {
      if (b === null) return null;
      const t = p.elements.find((x) => x.id === b.id);
      return t ? bindBoxOf(t) : null;
    };
    const out: string[] = [];
    for (const p of s.pages) {
      p.elements.forEach((e, i) => {
        const sh = e.shape;
        if (!sh || !isSegment(sh.shape) || (sh.start === undefined && sh.end === undefined)) return;
        const sm = sh.start !== undefined && moved.has(sh.start.id);
        const em = sh.end !== undefined && moved.has(sh.end.id);
        const self = moved.has(e.id);
        let start: LineBinding | null;
        let end: LineBinding | null;
        if (self) {
          start = sm ? (sh.start ?? null) : null;
          end = em ? (sh.end ?? null) : null;
        } else if (sm || em) {
          start = sh.start ?? null;
          end = sh.end ?? null;
        } else {
          return;
        }
        let world = worldOf(e);
        const last = world.length - 1;
        if (!self && sm && em && m) world = world.map((q, k) => (k === 0 || k === last ? q : applyMatrix(m, q[0], q[1])));
        // `settle` : bout lié recalé sur l'ancre de sa cible présente, laissé tel quel sinon ; coudée : ses bouts seuls.
        const bs = boxIn(p, start);
        const be = boxIn(p, end);
        if (bs && start) world[0] = anchorPoint(bs, start.fx, start.fy);
        if (be && end) world[last] = anchorPoint(be, end.fx, end.fy);
        if (elbowArrow(e)) world = [world[0]!, world[last]!];
        const next = withLine(e, world, start, end);
        if (typeof next === "string" || sameLine(e, next)) return;
        p.elements[i] = next;
        out.push(e.id);
      });
    }
    return out;
  }

  /** OG12 (n° 17, 18) : `bind_target` du cœur ; le plus petit qui contient le point passe devant le plus proche du
   *  contour, s'il est plus petit que lui ou s'il est le même. */
  bindTarget(page: string, x: number, y: number, tol: number): BindHit | null {
    const p = this.state.pages.find((q) => q.id === page);
    if (!p) return null;
    interface Cand { readonly area: number; readonly dist: number; readonly contains: boolean; readonly near: boolean; readonly hit: BindHit }
    const reach = Math.fround(tol); // le pont reçoit un f32
    const cands: Cand[] = [];
    for (const e of p.elements) {
      const b = bindBoxOf(e);
      const inv = b ? invertMatrix(b.m) : null;
      if (!b || !inv) continue;
      const [qx, qy] = applyMatrix(inv, x, y);
      const scale = Math.max(Math.sqrt(Math.abs(b.m[0] * b.m[3] - b.m[1] * b.m[2])), 1e-12);
      const { p: o, d, contains } = nearestOutline(b, qx, qy);
      const near = d * scale <= reach;
      if (!near && !contains) continue;
      const fixed: readonly [number, number] = near ? [o[0] / b.w, o[1] / b.h] : [qx / b.w, qy / b.h];
      const anchors = ANCHOR_RATIOS.map(([rx, ry]) => applyMatrix(b.m, rx * b.w, ry * b.h));
      cands.push({ area: b.w * b.h * scale * scale, dist: d * scale, contains, near, hit: { id: b.id, fixed, onOutline: near, anchors } });
    }
    // `min_by` : le premier des égaux.
    const least = (list: Cand[], key: (c: Cand) => number): Cand | undefined =>
      list.reduce<Cand | undefined>((acc, c) => (acc === undefined || key(c) < key(acc) ? c : acc), undefined);
    const inside = least(cands.filter((c) => c.contains), (c) => c.area);
    const nearest = least(cands.filter((c) => c.near), (c) => c.dist);
    const pick = inside && nearest ? (inside.area < nearest.area || inside.hit.id === nearest.hit.id ? inside : nearest) : (inside ?? nearest);
    return pick?.hit ?? null;
  }

  /** OG12 (DA-2) : liaison vers un objet absent de la page de la ligne (C1) lue libre, sans écriture ; lot 2a (Review
   *  Focus 1, n° 9) : de même vers un objet présent devenu non accrochable (forme convertie en ligne fermée). */
  private shapeView(s: ShapeData, page: FakePage): ShapeData {
    const gone = (b: LineBinding | undefined): boolean => {
      if (b === undefined) return false;
      const t = page.elements.find((x) => x.id === b.id);
      return t === undefined || bindBoxOf(t) === null;
    };
    if (!gone(s.start) && !gone(s.end)) return s;
    const { start, end, ...rest } = s;
    return { ...rest, ...(start && !gone(start) ? { start } : {}), ...(end && !gone(end) ? { end } : {}) };
  }

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "SetLinePoints": {
        // OG12 : ordre de `cmd_set_line_points` : points, élément, ligne ou flèche, liaisons ; même résultat : aucune étape.
        const pts = cmd.points;
        const n = pts.length / 2;
        if (pts.length % 2 !== 0 || n < 2 || n > MAX_INNER_POINTS + 2 || !pts.every((v) => Number.isFinite(v)) || !fitsF32(pts)) {
          throw new Error("points invalides");
        }
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const e = found.element;
        if (!e.shape || !isSegment(e.shape.shape)) throw new Error(MESSAGES.badShape);
        // OG12 lot 2a (n° 12 b) : ligne fermée, ni liaison ni moins de 3 sommets.
        if (isClosedShape(e.shape)) {
          if (cmd.start || cmd.end) throw new Error(MESSAGES.badShape);
          if (n < 3) throw new Error("points invalides");
        }
        const sb = cmd.start ? this.checkedBinding(found.page.id, cmd.start) : null;
        const eb = cmd.end ? this.checkedBinding(found.page.id, cmd.end) : null;
        const given: Pt2[] = [];
        for (let i = 0; i + 1 < pts.length; i += 2) given.push([pts[i]!, pts[i + 1]!]);
        let world = anchored(given, sb, eb);
        if (elbowArrow(e)) world = [world[0]!, world[world.length - 1]!];
        const next = withLine(e, world, sb?.bind ?? null, eb?.bind ?? null);
        if (next === "badMatrix") throw new Error(MESSAGES.badMatrix);
        if (next === "badPoints") throw new Error("points invalides");
        if (sameLine(e, next)) return this.unchanged();
        const pageId = found.page.id;
        return this.step((st) => {
          const p = st.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          if (p && i >= 0) p.elements[i] = next;
          return { pages: [pageId], ids: [cmd.id], removed: [] };
        });
      }
      case "ShapeToPolygon": {
        // OG12 lot 2a (n° 34, H5) : `cmd_shape_to_polygon` ; sommets locaux de la forme mis en monde, écrits par `withLine`
        // (miroir de `line_writes` : départ = translation, points intérieurs, dernier = (w, h), fermeture implicite, le
        // départ jamais répété : DA-1) ; `shape` = "line", `polygon` = true, `roundness` retiré ; une étape (D38).
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const e = found.element;
        const s = e.shape;
        if (!s || isSegment(s.shape) || !positive(s.w) || !positive(s.h)) throw new Error(MESSAGES.badShape);
        const { w, h } = s;
        const local: Pt2[] = s.shape === "rect"
          ? [[0, 0], [w, 0], [w, h], [0, h]]
          : s.shape === "diamond"
            ? [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]
            : Array.from({ length: 16 }, (_, k): Pt2 => {
              const a = -Math.PI / 2 + (2 * Math.PI * k) / 16;
              return [w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)];
            });
        const world = local.map(([x, y]) => applyMatrix(e.transform, x, y));
        // H5 : le texte de la forme part avec elle, l'annulation le rend.
        const { label: _t, ...s0 } = s;
        const next = withLine({ ...e, shape: { ...s0, shape: "line", polygon: true } }, world, null, null);
        if (next === "badMatrix") throw new Error(MESSAGES.badMatrix);
        if (next === "badPoints") throw new Error("points invalides");
        const { look: before, ...bare } = next;
        const { roundness: _r, ...kept } = before ?? {};
        const placed: FakeElement = { ...bare, ...(Object.keys(kept).length > 0 ? { look: kept } : {}) };
        const pageId = found.page.id;
        return this.step((st) => {
          const p = st.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          if (p && i >= 0) p.elements[i] = placed;
          return { pages: [pageId], ids: [cmd.id], removed: [] };
        });
      }
      case "SetShapeLabel": {
        // OG33 (lot 2b, choix 8) : `cmd_set_shape_label` (label.rs), même ordre de refus ; vide : clé retirée (GC8).
        if ([...cmd.label].length > MAX_SHAPE_LABEL_CHARS) throw new Error(MESSAGES.badText);
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const e = found.element;
        const s = e.shape;
        if (!s || isSegment(s.shape)) throw new Error(MESSAGES.badShape);
        if ((s.label ?? "") === cmd.label) return this.unchanged();
        const { label: _t, ...rest } = s;
        const next: FakeElement = { ...e, shape: cmd.label === "" ? rest : { ...rest, label: cmd.label } };
        const pageId = found.page.id;
        return this.step((st) => {
          const p = st.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          if (p && i >= 0) p.elements[i] = next;
          return { pages: [pageId], ids: [cmd.id], removed: [] };
        });
      }
      case "AddLinked": {
        // OG12 (n° 27, DA-4) : `cmd_add_linked` ; copie par `copyElements`, flèche coudée liée aux deux, une étape.
        const dir = LINK_DIRS[cmd.dir];
        if (dir === undefined) throw new Error(`direction inconnue : ${String(cmd.dir)}`);
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const e = found.element;
        const src = e.shape && (e.shape.shape === "rect" || e.shape.shape === "ellipse" || e.shape.shape === "diamond") ? bindBoxOf(e) : null;
        if (!src) throw new Error(MESSAGES.badShape);
        const others = found.page.elements.map(bindBoxOf).filter((x): x is BindBox => x !== null && x.id !== cmd.id).map(worldBox);
        const [x0, y0, x1, y1] = worldBox(src);
        const sw = x1 - x0;
        const sh = y1 - y0;
        const [ux, uy] = dir.u;
        let dx = ux * (sw + LINK_GAP);
        let dy = uy * (sh + LINK_GAP);
        const hits = (): boolean => others.some((o) => x0 + dx < o[2] && x1 + dx > o[0] && y0 + dy < o[3] && y1 + dy > o[1]);
        for (let k = 0; k < 64 && hits(); k++) {
          if (ux !== 0) dy += sh + LINK_GAP;
          else dx += sw + LINK_GAP;
        }
        const { group: _g, look: copied, ...linked } = copyElements([e], new Map(), dx, dy)[0]!;
        // OG33 (choix 8) : la copie reliée part sans texte.
        const { label: _t, ...unlabeled } = linked.shape!;
        const bareCopy = { ...linked, shape: unlabeled };
        // C1 : ni le lien ni la graine de la source (graine neuve, comme un groupe neuf).
        const { link: _l, ...kept } = copied ?? {};
        const look: Look | undefined = kept.seed === undefined ? kept : { ...kept, seed: newSeed() };
        const copy: FakeElement = { ...bareCopy, ...(look && Object.keys(look).length > 0 ? { look } : {}) };
        const dst: BindBox = { ...src, id: copy.id, m: [src.m[0], src.m[1], src.m[2], src.m[3], src.m[4] + dx, src.m[5] + dy] };
        const [fx, fy] = dir.r;
        const start: LineBinding = { id: cmd.id, fx, fy };
        const end: LineBinding = { id: copy.id, fx: 1 - fx, fy: 1 - fy };
        const bare: FakeElement = { id: newId(), transform: IDENTITY, style: { color: e.style.color, width: e.style.width }, shape: { shape: "arrow", w: 0, h: 0, fill: null }, look: { elbowed: true } };
        // Écart assumé (DA-3) : la flèche coudée garde ses seuls bouts, sans route.
        const arrow = withLine(bare, [anchorPoint(src, fx, fy), anchorPoint(dst, end.fx, end.fy)], start, end);
        if (typeof arrow === "string") throw new Error("points invalides");
        const pageId = found.page.id;
        return this.step((st) => {
          st.pages.find((q) => q.id === pageId)?.elements.push(copy, arrow);
          return { pages: [pageId], ids: [copy.id, arrow.id], removed: [] };
        });
      }
      case "AddPage": {
        const after = cmd.after;
        // Le pont lit `mode` avant de lancer la commande : son refus passe avant celui de la page.
        const layout = cmd.mode === undefined ? undefined : readLayout(cmd.mode);
        if (after !== null) this.pageOf(after);
        return this.step((s) => {
          const page = newPage(layout);
          const at = after === null ? s.pages.length : s.pages.findIndex((p) => p.id === after) + 1;
          s.pages.splice(at, 0, page);
          return { pages: [page.id], ids: [], removed: [] };
        });
      }
      case "RemovePage": {
        const removed = this.elementIds(cmd.page);
        if (this.state.pages.length <= 1) throw new Error("la dernière page ne se supprime pas");
        return this.step((s) => {
          s.pages.splice(s.pages.findIndex((p) => p.id === cmd.page), 1);
          return { pages: [cmd.page], ids: [], removed };
        });
      }
      case "SetPageMode": {
        // `cmd_set_page_mode` : Paysage et Portrait retirent `mode` s'il vaut "infinite" (inconnu gardé) et écrivent la
        // hauteur ; Infini écrit `mode` et garde la hauteur. Même disposition : aucune étape (D38).
        const layout = readLayout(cmd.mode);
        const cur = this.pageOf(cmd.page);
        const infinite = cur.mode === INFINITE_MODE;
        const targetH = layout === "portrait" ? PORTRAIT_HEIGHT : PAGE_HEIGHT;
        if (layout === "infinite" ? infinite : !infinite && cur.height === targetH) return this.unchanged();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p && layout === "infinite") p.mode = INFINITE_MODE;
          else if (p) {
            if (infinite) p.mode = null;
            p.height = targetH;
          }
          return { pages: [cmd.page], ids: [], removed: [] };
        });
      }
      case "MovePage": {
        // `cmd_move_page` : page inconnue, puis rang final hors bornes ; même rang : aucune étape ; ids gardés (DA2).
        const from = this.state.pages.indexOf(this.pageOf(cmd.page));
        const to = cmd.to;
        if (!Number.isInteger(to) || to < 0 || to >= this.state.pages.length) throw new Error("rang de page hors bornes");
        if (to === from) return this.unchanged();
        return this.step((s) => {
          const [moved] = s.pages.splice(from, 1);
          if (moved) s.pages.splice(to, 0, moved);
          return { pages: [cmd.page], ids: [], removed: [] };
        });
      }
      case "DuplicatePage": {
        // `cmd_duplicate_page` = `extract_page` + `insert_pages` : copie juste après, ids neufs, champs gardés.
        const src = this.pageOf(cmd.page);
        const groups = new Map<string, string>();
        const copy: FakePage = { ...src, id: newId(), elements: copyElements(src.elements, groups, 0, 0) };
        return this.step((s) => {
          s.pages.splice(s.pages.findIndex((p) => p.id === cmd.page) + 1, 0, copy);
          return { pages: [copy.id], ids: copy.elements.map((e) => e.id), removed: [] };
        });
      }
      case "Restack": {
        // `cmd_restack` : ids dédoublonnés ; premier inconnu (ordre donné), pages mêlées, bloc vide ou hors de la pile ;
        // même ordre : aucune étape ; éléments déplacés tels quels (DA2) ; `Change.ids` = bloc, du bas vers le haut.
        const found: Found[] = [];
        for (const id of new Set(cmd.ids)) {
          const f = this.find(id);
          if (!f) throw new Error(`élément inconnu : ${id}`);
          found.push(f);
        }
        const page = found[0]?.page;
        if (!page) throw new Error("rang de page hors bornes");
        if (found.some((f) => f.page !== page)) throw new Error("objets de pages différentes");
        found.sort((x, y) => x.index - y.index);
        const to = cmd.to;
        if (!Number.isInteger(to) || to < 0 || to + found.length > page.elements.length) throw new Error("rang de page hors bornes");
        if (found.every((f, k) => f.index === to + k)) return this.unchanged();
        const ids = found.map((f) => f.element.id);
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === page.id);
          if (p) {
            const set = new Set(ids);
            const moved = p.elements.filter((e) => set.has(e.id));
            const rest = p.elements.filter((e) => !set.has(e.id));
            p.elements.splice(0, p.elements.length, ...rest.slice(0, to), ...moved, ...rest.slice(to));
          }
          return { pages: [page.id], ids, removed: [] };
        });
      }
      case "Arrange": {
        // `cmd_arrange` (arrange.rs). Pas le patron de `Transform` (qui ignore les inconnus) : celui de `Restack`. `how`
        // lu d'abord (le pont, `arrange_how`) ; le reste dans `arrangeWith`, sans suivi (comme le cœur).
        if (!isArrangeHow(cmd.how)) throw new Error(arrangeUnknown(String(cmd.how)));
        const how = cmd.how;
        return this.arrangeWith(cmd.ids, (u) => [planArrange(u, how), null]);
      }
      case "Rotate": {
        // OG33 (lot 2b) : `cmd_rotate` (arrange.rs) : angle non fini refusé d'abord ; règles d'`Arrange`, plus le suivi des
        // flèches liées dans la même étape, matrice pleine de la rotation (comme `Transform`).
        if (!Number.isFinite(cmd.angle)) throw new Error(MESSAGES.badMatrix);
        const angle = cmd.angle;
        return this.arrangeWith(cmd.ids, (u) => [planRotate(u, angle), rotationOf(u, angle)]);
      }
      case "CommitStroke": {
        const look = creationLook(cmd.look); // OG11 : contrôlé d'abord, comme le pont
        if (cmd.points.length < 3 || cmd.points.length % 3 !== 0 || !cmd.points.every((v) => Number.isFinite(v))) {
          throw new Error("points invalides");
        }
        if (!positive(cmd.style.width)) throw new Error(MESSAGES.badWidth);
        this.pageOf(cmd.page);
        // T8 (D10), comme `check_cell_target` du cœur : contrôles de la case avant toute écriture.
        const target = cmd.cell;
        if (target !== undefined) {
          const { found, t } = this.tableOf(target[0]);
          if (found.page.id !== cmd.page) throw new Error(MESSAGES.badTable);
          if (!t.rows.some((r) => r.id === target[1]) || !t.cols.some((c) => c.id === target[2])) throw new Error(MESSAGES.badTable);
          if ((t.cells.get(cellKey(target[1], target[2]))?.shade ?? null) !== null) throw new Error(MESSAGES.badTable);
        }
        return this.step((s) => {
          const id = newId();
          const { x0, y0, local } = toLocal(cmd.points);
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: translate(x0, y0), local, style: cmd.style, ...(look ? { look } : {}), ...(target ? { cell: target } : {}) });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "Erase": {
        if (!finitePath(cmd.path)) throw new Error("points invalides");
        if (!positive(cmd.radius)) throw new Error("rayon de gomme invalide (nombre fini > 0 attendu)");
        const hit = this.pageOf(cmd.page).elements
          .filter((e) => e.local !== undefined && strokeTouches(e, cmd.path, cmd.radius))
          .map((e) => e.id);
        if (hit.length === 0) return this.unchanged();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !hit.includes(e.id)));
          return { pages: [cmd.page], ids: [], removed: hit };
        });
      }
      case "Delete": {
        // Comme le cœur : ids inconnus ignorés, doublons fusionnés, `pages` = pages touchées triées ; rien de trouvé =
        // aucune étape (D38).
        const removed = [...new Set(cmd.ids)].filter((id) => this.find(id) !== undefined);
        const pages = this.state.pages.filter((p) => p.elements.some((e) => removed.includes(e.id))).map((p) => p.id).sort();
        return this.step((s) => {
          for (const p of s.pages) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !removed.includes(e.id)));
          return { pages, ids: [], removed };
        });
      }
      case "AddShape": {
        const look = creationLook(cmd.look); // OG11 : contrôlé d'abord, comme le pont
        if (![cmd.x0, cmd.y0, cmd.x1, cmd.y1].every((v) => Number.isFinite(v))) throw new Error(MESSAGES.badShape);
        // Comme le cœur (constat 3 de T60) : la géométrie tirée des coins doit rester finie en f32.
        const g = normalizeShape(cmd.shape, cmd.x0, cmd.y0, cmd.x1, cmd.y1);
        if (![g.tx, g.ty, g.w, g.h].every((v) => Number.isFinite(Math.fround(v)))) throw new Error(MESSAGES.badShape);
        if (!positive(cmd.style.width)) throw new Error(MESSAGES.badWidth);
        // OG12 (n° 12 a) : ordre de `cmd_add_shape` : ligne sur rectangle ou ellipse, points, page, liaisons.
        const inner = cmd.points ?? [];
        const hasLine = inner.length > 0 || !absent(cmd.start) || !absent(cmd.end);
        if (hasLine && !isSegment(cmd.shape)) throw new Error(MESSAGES.badShape);
        if (!validInner(inner)) throw new Error("points invalides");
        this.pageOf(cmd.page);
        const sb = absent(cmd.start) ? null : this.checkedBinding(cmd.page, cmd.start);
        const eb = absent(cmd.end) ? null : this.checkedBinding(cmd.page, cmd.end);
        const shape: ShapeData = { shape: cmd.shape, w: g.w, h: g.h, fill: cmd.fill };
        let placed: FakeElement | null = null;
        if (hasLine) {
          const given: Pt2[] = [[cmd.x0, cmd.y0]];
          for (let i = 0; i + 1 < inner.length; i += 2) given.push([inner[i]!, inner[i + 1]!]);
          given.push([cmd.x1, cmd.y1]);
          const world = anchored(given, sb, eb);
          const [p0, pn] = [world[0]!, world[world.length - 1]!];
          if (!fitsF32([p0[0], p0[1], pn[0] - p0[0], pn[1] - p0[1]])) throw new Error(MESSAGES.badShape);
          const next = withLine({ id: "", transform: IDENTITY, style: cmd.style, shape }, world, sb?.bind ?? null, eb?.bind ?? null);
          if (typeof next === "string") throw new Error("points invalides");
          placed = next;
        }
        // `elbowed` gardé sur une flèche seule.
        const kept = look?.elbowed && cmd.shape !== "arrow" ? (({ elbowed: _x, ...r }) => r)(look) : look;
        const written = kept && Object.keys(kept).length > 0 ? kept : undefined;
        return this.step((s) => {
          const id = newId();
          s.pages.find((p) => p.id === cmd.page)?.elements.push({
            id,
            transform: placed ? placed.transform : translate(g.tx, g.ty),
            style: cmd.style,
            shape: placed?.shape ?? shape,
            ...(written ? { look: written } : {}),
          });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "SetText": {
        // OG11 : `look` contrôlé d'abord (le pont), écrit sur une boîte neuve seulement.
        const look = creationLook(cmd.look);
        // C7b (R7, PC2) : segments contrôlés en premier, comme le cœur ; état voulu normalisé (forme de read_spans).
        if (cmd.spans !== undefined && !validSpans(cmd.content, cmd.spans)) throw new Error(MESSAGES.badFormat);
        const want = cmd.spans === undefined ? null : normalSpans(cmd.spans);
        // Même ordre que le cœur : texte invalide, puis page ou élément inconnu, puis contenu vide, puis inchangé.
        if (!positive(cmd.size) || !positive(cmd.boxWidth) || !positive(cmd.boxHeight) || !Number.isFinite(cmd.x) || !Number.isFinite(cmd.y)) {
          throw new Error(MESSAGES.badText);
        }
        const text: TextData = { content: cmd.content, size: cmd.size, boxWidth: cmd.boxWidth, boxHeight: cmd.boxHeight, spans: want ?? plainSpans(cmd.content) };
        const style: StrokeStyle = { color: cmd.color, width: 0 };
        if (cmd.id === null) {
          this.pageOf(cmd.page);
          if (cmd.content === "") return this.unchanged();
          return this.step((s) => {
            const id = newId();
            s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: translate(cmd.x, cmd.y), style, text, ...(look ? { look } : {}) });
            return { pages: [cmd.page], ids: [id], removed: [] };
          });
        }
        const id = cmd.id;
        const found = this.find(id);
        if (!found || !found.element.text) throw new Error(`élément inconnu : ${id}`);
        const pageId = found.page.id;
        if (cmd.content === "") {
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === pageId);
            if (p) p.elements.splice(p.elements.findIndex((e) => e.id === id), 1);
            return { pages: [pageId], ids: [], removed: [id] };
          });
        }
        const t = found.element.text;
        if (t.content === text.content && t.size === text.size && t.boxWidth === text.boxWidth && t.boxHeight === text.boxHeight && found.element.style.color === cmd.color && (want === null || sameSpans(want, t.spans))) {
          return this.unchanged();
        }
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((e) => e.id === id) : -1;
          const old = p?.elements[i];
          if (p && old) p.elements[i] = { ...old, style, text: { ...text, spans: want ?? editSpans(t.spans, cmd.content) } };
          this.follow(s, new Set([id]), null); // OG12 (n° 7) : boîte changée, extrémités liées recalées
          return { pages: [pageId], ids: [id], removed: [] };
        });
      }
      case "Transform": {
        const m = cmd.matrix;
        if (!validMatrix(m)) throw new Error(MESSAGES.badMatrix);
        // Un inconnu sans transform lisible est ignoré, comme tout élément sans transform lisible (`cmd_transform`, `crates/roomboard-core/src/commands.rs`).
        const ids = [...new Set(cmd.ids)]
          .filter((id) => {
            const found = this.find(id);
            return found !== undefined && found.element.unknown?.hasTransform !== false && found.element.malformed === undefined;
          })
          .sort();
        // personnalisation-3 (D6), comme `with_linked` et `leaving_cells` du cœur : un tableau emporte ses objets liés ;
        // un objet lié déplacé sans son tableau quitte sa case si son centre en sort, dans la même étape.
        const asked = new Set(ids);
        for (const id of ids) {
          const f = this.find(id);
          if (f === undefined || !isTableKind(f.element)) continue;
          for (const e of f.page.elements) if (e.cell?.[0] === id && !isTableKind(e) && movable(e)) asked.add(e.id);
        }
        const all = [...asked].sort();
        const unlink = new Set(all.filter((id) => this.leavesCell(id, asked, m)));
        if (all.length === 0 || isIdentity(m)) return this.unchanged();
        // Comme le cœur (constat 2 de T60) : chaque matrice composée suit la règle de `m`, avant toute étape.
        const composed = new Map(all.map((id) => [id, composeMatrix(m, this.find(id)?.element.transform ?? m)]));
        if (![...composed.values()].every(validMatrix)) throw new Error(MESSAGES.badMatrix);
        const pages = [...new Set(all.map((id) => this.find(id)?.page.id ?? ""))].sort();
        return this.step((s) => {
          for (const p of s.pages) {
            p.elements.forEach((e, i) => {
              const t = composed.get(e.id);
              if (t) p.elements[i] = unlink.has(e.id) ? withoutCell({ ...e, transform: t }) : { ...e, transform: t };
            });
          }
          // OG12 (n° 7, 8) : suivi et rupture dans la même étape, cibles élargies comprises.
          const followed = this.follow(s, new Set(all), m);
          return { pages, ids: [...all, ...followed.filter((x) => !all.includes(x))], removed: [] };
        });
      }
      case "SetTableLineSizes": {
        // personnalisation-3 (D4), comme `cmd_set_table_line_sizes` : tableau, tailles, mêmes tailles (aucune étape).
        const { found, t } = this.tableOf(cmd.id);
        // Défaut T2a : une ligne ou une colonne citée deux fois est refusée, par `resizedLines`.
        const next = resizedLines(t, [
          ...cmd.cols.map(([l, size]): readonly [TableAxis, string, number] => ["col", l, size]),
          ...cmd.rows.map(([l, size]): readonly [TableAxis, string, number] => ["row", l, size]),
        ]);
        if (next === null) throw new Error(MESSAGES.badTable);
        if (sameLines(t, next)) return this.unchanged();
        return this.writeTable(found, cmd.id, next);
      }
      case "SetTableOptions": {
        // personnalisation-3 (T7), comme `cmd_set_table_options` : `fit` contrôlé, seulement ce qui change, sinon aucune étape.
        const { found, t } = this.tableOf(cmd.id);
        if (cmd.fit !== undefined && cmd.fit !== "grow" && cmd.fit !== "shrink") throw new Error(MESSAGES.badTable);
        const fit = cmd.fit === undefined ? t.fit : cmd.fit === "shrink" ? ("shrink" as const) : undefined;
        const header = cmd.header === undefined ? t.header : cmd.header ? true : undefined;
        if (fit === t.fit && header === t.header) return this.unchanged();
        const { fit: _f, header: _h, ...rest } = t;
        return this.writeTable(found, cmd.id, { ...rest, ...(fit ? { fit } : {}), ...(header ? { header } : {}) });
      }
      case "SetCellImage": {
        // personnalisation-3 (T9), comme `cmd_set_cell_image` : case connue ; `null` retire le fond (aucune étape sans fond) ;
        // sinon l'image doit être logée dans cette case (BadTable), son asset passe en `bg`, l'image quitte la page.
        const { found, t } = this.tableOf(cmd.id);
        if (!t.rows.some((r) => r.id === cmd.row) || !t.cols.some((c) => c.id === cmd.col)) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cell = t.cells.get(key);
        if (cmd.from === null) {
          if (!cell || cell.bg === null) return this.unchanged();
          const cells = new Map(t.cells);
          cells.set(key, { ...cell, bg: null });
          return this.writeTable(found, cmd.id, { ...t, cells });
        }
        const img = this.find(cmd.from);
        if (!img) throw new Error(`élément inconnu : ${cmd.from}`);
        const link = img.element.cell;
        const asset = img.element.image?.asset;
        if (!asset || img.page.id !== found.page.id || link?.[0] !== cmd.id || link[1] !== cmd.row || link[2] !== cmd.col || !isAssetId(asset)) {
          throw new Error(MESSAGES.badTable);
        }
        const cells = new Map(t.cells);
        cells.set(key, { ...(cell ?? EMPTY_CELL), bg: asset });
        const pageId = found.page.id;
        const image = cmd.from;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          if (p) {
            const i = p.elements.findIndex((e) => e.id === cmd.id);
            const old = p.elements[i];
            if (old) p.elements[i] = { ...old, table: { ...t, cells } };
            p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => e.id !== image));
          }
          return { pages: [pageId], ids: [cmd.id], removed: [image] };
        });
      }
      case "SetTableLook": {
        // suite OG32 (DS1), comme `cmd_set_table_look` : valeur d'abord, puis tableau, coins, seulement ce qui change.
        const look = checkedLook(cmd.look);
        if (look === null) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const rect = rectOf(t, cmd.from, cmd.to);
        if (rect === null) throw new Error(MESSAGES.badTable);
        if (look.key === "accept") {
          // `set_accept` : les colonnes de la plage, jamais les cases ; liste vide : clé retirée.
          const cols = t.cols.map((c, i): TableCol => {
            if (i < rect.c0 || i > rect.c1 || sameList(c.accept ?? [], look.value)) return c;
            const { accept: _a, ...rest } = c;
            return look.value.length === 0 ? rest : { ...rest, accept: [...look.value] };
          });
          return cols.every((c, i) => c === t.cols[i]) ? this.unchanged() : this.writeTable(found, cmd.id, { ...t, cols });
        }
        const cells = new Map(t.cells);
        let changed = false;
        for (const [r, c] of targets(rect, mergesOf(t))) {
          const k = keyAt(t, r, c);
          const cur = t.cells.get(k);
          const next = lookCell(cur, look);
          if (next === cur || next === undefined) continue;
          cells.set(k, next);
          changed = true;
        }
        return changed ? this.writeTable(found, cmd.id, { ...t, cells }) : this.unchanged();
      }
      case "ReorderTableLines": {
        // personnalisation-3 (D18), comme `cmd_reorder_table_lines` : valeur seule d'abord (vide, doublon), puis tableau,
        // permutation, zones ni coupées ni retournées, puis écriture : les entrées recopiées telles quelles (clés
        // inconnues comprises), cellules par ids inchangées, suivi des objets liés par writeTable.
        const order = [...cmd.order];
        // Doublon : tri d'une copie puis voisins comparés (`order` non borné : O(n log n)), comme le cœur.
        const sorted = [...order].sort();
        if (order.length === 0 || sorted.some((x, i) => i > 0 && x === sorted[i - 1])) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const lines: readonly (TableRow | TableCol)[] = cmd.axis === "row" ? t.rows : t.cols;
        const ids = lines.map((l) => l.id);
        if (order.length !== ids.length || ids.some((x) => !order.includes(x))) throw new Error(MESSAGES.badTable);
        if (ids.every((x, i) => x === order[i])) return this.unchanged();
        for (const m of mergesOf(t)) {
          const [a, b] = cmd.axis === "row" ? [m.r0, m.r1] : [m.c0, m.c1];
          const start = order.indexOf(ids[a] ?? "");
          for (let k = a; k <= b; k++) if (order.indexOf(ids[k] ?? "") !== start + (k - a)) throw new Error(MESSAGES.badTable);
        }
        const pick = <L extends TableRow | TableCol>(from: readonly L[]): L[] =>
          order.map((x) => from.find((l) => l.id === x)).filter((l): l is L => l !== undefined);
        return this.writeTable(found, cmd.id, cmd.axis === "row" ? { ...t, rows: pick(t.rows) } : { ...t, cols: pick(t.cols) });
      }
      case "PlaceInCell": {
        // personnalisation-3 (D3), refus dans l'ordre de `cmd_place_in_cell` (section T1a) : 1 matrice, 2 tableau parmi les
        // ids (D36), 3 aucun id (aucune étape), 4 plusieurs pages, 5 case visée (D35), 6 tableaux des tailles puis
        // tailles, 7 matrice composée, 8 rien ne change (aucune étape).
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        const all = [...new Set(cmd.ids)]
          .map((id) => this.find(id))
          .filter((x): x is Found => x !== undefined && x.element.malformed === undefined);
        if (all.some((x) => isTableKind(x.element))) throw new Error(MESSAGES.badTable);
        // Comme `Transform` : un élément sans transform lisible est écarté, ni matrice ni lien écrits.
        const hits = all.filter((x) => movable(x.element));
        const pageId = hits[0]?.page.id;
        if (pageId === undefined) return this.unchanged();
        if (hits.some((x) => x.page.id !== pageId)) throw new Error(MESSAGES.badTable);
        const target = cmd.cell;
        if (target !== null) {
          const { found, t } = this.tableOf(target[0]);
          if (found.page.id !== pageId) throw new Error(MESSAGES.badTable);
          if (!t.rows.some((r) => r.id === target[1]) || !t.cols.some((c) => c.id === target[2])) throw new Error(MESSAGES.badTable);
          if ((t.cells.get(cellKey(target[1], target[2]))?.shade ?? null) !== null) throw new Error(MESSAGES.badTable);
        }
        const tables: { readonly id: string; readonly t: FakeTable; readonly list: (readonly [TableAxis, string, number])[] }[] = [];
        for (const [tid, a, l, size] of cmd.sizes) {
          let entry = tables.find((x) => x.id === tid);
          if (entry === undefined) {
            const { found, t } = this.tableOf(tid);
            if (found.page.id !== pageId) throw new Error(MESSAGES.badTable);
            entry = { id: tid, t, list: [] };
            tables.push(entry);
          }
          entry.list.push([a, l, size]);
        }
        const next = new Map<string, FakeTable>();
        for (const x of tables) {
          const n = resizedLines(x.t, x.list);
          if (n === null) throw new Error(MESSAGES.badTable);
          next.set(x.id, n);
        }
        const composed = new Map(hits.map((x) => [x.element.id, composeMatrix(cmd.matrix, x.element.transform)]));
        if (![...composed.values()].every(validMatrix)) throw new Error(MESSAGES.badMatrix);
        const sameLink = (l: CellLink | undefined): boolean => (target === null ? l === undefined : l !== undefined && l.every((v, i) => v === target[i]));
        const sameSizes = tables.every((x) => {
          const n = next.get(x.id);
          return n !== undefined && sameLines(x.t, n);
        });
        if (isIdentity(cmd.matrix) && sameSizes && hits.every((x) => sameLink(x.element.cell))) return this.unchanged();
        const skip = new Set(hits.map((x) => x.element.id));
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const touched = new Set<string>(skip);
          if (p) {
            for (const x of tables) {
              const i = p.elements.findIndex((e) => e.id === x.id);
              const old = p.elements[i];
              const t = next.get(x.id);
              if (!old?.table || !t) continue;
              p.elements[i] = { ...old, table: t };
              touched.add(x.id);
              for (const id of this.followTable(s, p, x.id, old.transform, old.table, t, skip)) touched.add(id);
            }
            p.elements.forEach((e, i) => {
              if (!skip.has(e.id)) return;
              const transform = isIdentity(cmd.matrix) ? e.transform : (composed.get(e.id) ?? e.transform);
              const free = withoutCell(e);
              p.elements[i] = target === null ? { ...free, transform } : { ...free, transform, cell: target };
            });
            // T5, comme `lift_above` du cœur : les placés situés sous le tableau visé montent juste au-dessus, ordre gardé.
            if (target !== null) {
              const ti = p.elements.findIndex((e) => e.id === target[0]);
              const below = (e: FakeElement, i: number): boolean => i < ti && skip.has(e.id);
              const lifted = p.elements.filter(below);
              if (lifted.length > 0) {
                const rest = p.elements.filter((e, i) => !below(e, i));
                rest.splice(rest.findIndex((e) => e.id === target[0]) + 1, 0, ...lifted);
                p.elements.splice(0, p.elements.length, ...rest);
              }
            }
            // OG12 (n° 7, 8), comme `cmd_place_in_cell` : placés déplacés par `m`, leurs lignes liées suivent après eux.
            if (!isIdentity(cmd.matrix)) for (const id of this.follow(s, skip, cmd.matrix)) touched.add(id);
          }
          return { pages: [pageId], ids: [...touched].sort(), removed: [] };
        });
      }
      case "AddImage": {
        // Même ordre que le cœur : asset, boîte, matrice, puis page.
        if (!validAsset(cmd.asset)) throw new Error(MESSAGES.badAsset);
        if (!positive(cmd.w) || !positive(cmd.h)) throw new Error(MESSAGES.badImage);
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          s.pages.find((p) => p.id === cmd.page)?.elements.push({
            id,
            transform: cmd.matrix,
            style: NO_STYLE,
            image: { asset: cmd.asset.id, w: cmd.w, h: cmd.h },
          });
          putMeta(s.assets, cmd.asset);
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "AddMedia": {
        // Même ordre que le cœur : assets, média (lien, boîte, durée), matrice, puis page.
        if (!validAsset(cmd.asset) || (cmd.poster !== null && !validAsset(cmd.poster))) throw new Error(MESSAGES.badAsset);
        if (
          (cmd.linked !== null && !validLink(cmd.linked)) || !positive(cmd.w) || !positive(cmd.h) || !fitsF32([cmd.w, cmd.h]) ||
          !Number.isFinite(cmd.duration) || cmd.duration < 0 || (cmd.mediaType !== "video" && cmd.mediaType !== "audio")
        ) {
          throw new Error(BAD_MEDIA_MESSAGE);
        }
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          const media: MediaData = {
            asset: cmd.asset.id, mediaType: cmd.mediaType, w: cmd.w, h: cmd.h, duration: cmd.duration,
            poster: cmd.poster?.id ?? null, trimStart: 0, trimEnd: null, loop: false, volume: 1,
          };
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: cmd.matrix, style: NO_STYLE, media });
          putMeta(s.assets, cmd.asset, cmd.linked);
          if (cmd.poster !== null) putMeta(s.assets, cmd.poster);
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "SetMedia": {
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const m = found.element.media;
        if (!m) throw new Error(BAD_MEDIA_MESSAGE);
        const known = m.duration > 0;
        const startOk = Number.isFinite(cmd.trimStart) && cmd.trimStart >= 0 && (!known || cmd.trimStart < m.duration);
        const endOk = cmd.trimEnd === null || (Number.isFinite(cmd.trimEnd) && cmd.trimEnd > cmd.trimStart && (!known || cmd.trimEnd <= m.duration));
        const volOk = Number.isFinite(cmd.volume) && cmd.volume >= 0 && cmd.volume <= 1;
        if (!startOk || !endOk || !volOk) throw new Error(BAD_MEDIA_MESSAGE);
        const trimEnd = known && cmd.trimEnd === m.duration ? null : cmd.trimEnd;
        if (m.trimStart === cmd.trimStart && m.trimEnd === trimEnd && m.loop === cmd.loop && m.volume === cmd.volume) return this.unchanged();
        const next: MediaData = { ...m, trimStart: cmd.trimStart, trimEnd, loop: cmd.loop, volume: cmd.volume };
        const pageId = found.page.id;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          const old = p?.elements[i];
          if (p && old) p.elements[i] = { ...old, media: next };
          return { pages: [pageId], ids: [cmd.id], removed: [] };
        });
      }
      case "AddModel3d": {
        // Même ordre que le cœur : assets (principal, liés, instantané), objet (boîte, caméra, liés), matrice, puis page.
        if (!validAsset(cmd.asset) || cmd.files.some((x) => !validAsset(x.asset)) || (cmd.snapshot !== null && !validAsset(cmd.snapshot))) {
          throw new Error(MESSAGES.badAsset);
        }
        const unique = cmd.files.every((x, i) => cmd.files.slice(0, i).every((y) => y.path !== x.path));
        if (
          !validBox(cmd.w, cmd.h) || !validYaw(cmd.yaw) || !validPitch(cmd.pitch) || cmd.files.length > MAX_MODEL3D_FILES || !unique ||
          cmd.files.some((x) => !validPath(x.path)) || !isModel3dFormat(cmd.format)
        ) {
          throw new Error(BAD_MODEL3D_MESSAGE);
        }
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          const model3d: Model3dData = {
            asset: cmd.asset.id, format: cmd.format, w: cmd.w, h: cmd.h,
            files: cmd.files.map((x) => ({ path: x.path, asset: x.asset.id })),
            yaw: cmd.yaw, pitch: cmd.pitch, snapshot: cmd.snapshot?.id ?? null,
          };
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: cmd.matrix, style: NO_STYLE, model3d });
          putMeta(s.assets, cmd.asset);
          for (const x of cmd.files) putMeta(s.assets, x.asset);
          if (cmd.snapshot !== null) putMeta(s.assets, cmd.snapshot);
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "SetModel3dView": {
        // Ordre du cœur : élément inconnu, pas un objet 3D lisible, instantané (BadAsset), vue hors domaine.
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const m = found.element.model3d;
        if (!m) throw new Error(BAD_MODEL3D_MESSAGE);
        if (cmd.snapshot !== null && !validAsset(cmd.snapshot)) throw new Error(MESSAGES.badAsset);
        if (!validYaw(cmd.yaw) || !validPitch(cmd.pitch)) throw new Error(BAD_MODEL3D_MESSAGE);
        const snapshot = cmd.snapshot?.id ?? null;
        if (m.yaw === cmd.yaw && m.pitch === cmd.pitch && m.snapshot === snapshot) return this.unchanged();
        const next: Model3dData = { ...m, yaw: cmd.yaw, pitch: cmd.pitch, snapshot };
        const pageId = found.page.id;
        const snap = cmd.snapshot;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          const old = p?.elements[i];
          if (p && old) p.elements[i] = { ...old, model3d: next };
          if (snap !== null) putMeta(s.assets, snap);
          return { pages: [pageId], ids: [cmd.id], removed: [] };
        });
      }
      case "SetBackdrop": {
        const b = cmd.backdrop;
        if (b !== null) {
          if (!validAsset(b.asset)) throw new Error(MESSAGES.badAsset);
          if (!positive(b.w) || !positive(b.h) || b.fit !== "width") throw new Error(MESSAGES.badImage);
        }
        const current = this.pageOf(cmd.page).backdrop;
        const next: RawRecord | null = b === null ? null : { asset: b.asset.id, kind: "image", w: b.w, h: b.h, fit: "width" };
        if (sameBackdrop(current, next)) return this.unchanged();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.backdrop = next;
          if (b !== null) putMeta(s.assets, b.asset);
          return { pages: [cmd.page], ids: [], removed: [] };
        });
      }
      case "FormatText": {
        // Ordre du cœur (T7) : patch nettoyé, boxHeight, élément, bornes ; rien ne change : aucune étape (D38).
        const patch = cleanPatch(cmd.attrs);
        if (!validPatch(patch)) throw new Error(MESSAGES.badFormat);
        if (cmd.boxHeight !== undefined && !positive(cmd.boxHeight)) throw new Error(MESSAGES.badFormat);
        const id = cmd.id;
        const found = this.find(id);
        const t = found?.element.text;
        if (!found || !t) throw new Error(`élément inconnu : ${id}`);
        if (!utf16Bounds(t.content, cmd.start, cmd.len)) throw new Error(MESSAGES.badFormat);
        const spans = formatSpans(t.spans, cmd.start, cmd.len, patch);
        const boxHeight = cmd.boxHeight ?? t.boxHeight;
        if (sameSpans(spans, t.spans) && boxHeight === t.boxHeight) return this.unchanged();
        const pageId = found.page.id;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((e) => e.id === id) : -1;
          const old = p?.elements[i];
          if (p && old?.text) p.elements[i] = { ...old, text: { ...old.text, spans, boxHeight } };
          if (cmd.boxHeight !== undefined) this.follow(s, new Set([id]), null); // OG12 (n° 7)
          return { pages: [pageId], ids: [id], removed: [] };
        });
      }
      case "SetGrid": {
        // Même ordre que le cœur : grille, puis page ; même grille (sur la vue) ou rien à retirer : aucune étape.
        const g = cmd.grid;
        if (g !== null && !validGrid(g)) throw new Error(MESSAGES.badGrid);
        if (sameGrid(gridView(this.pageOf(cmd.page).grid), g)) return this.unchanged();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.grid = g === null ? null : gridRecord(g);
          return { pages: [cmd.page], ids: [], removed: [] };
        });
      }
      case "ApplyBackground": {
        // Ordre du cœur (page_look.rs) : couleur, fond, grille, pages ; seules les pages qui changent ; page PDF : fond gardé.
        if (!validColor(cmd.color)) throw new Error(MESSAGES.badFill);
        const b = cmd.backdrop ?? null;
        if (b !== null) {
          if (!validAsset(b.asset)) throw new Error(MESSAGES.badAsset);
          if (!positive(b.w) || !positive(b.h) || b.fit !== "width") throw new Error(MESSAGES.badImage);
        }
        const g = cmd.grid ?? null;
        if (g !== null && !validGrid(g)) throw new Error(MESSAGES.badGrid);
        if (cmd.pages.length === 0) throw new Error("page inconnue : ");
        const seen = new Set<string>();
        for (const id of cmd.pages) {
          if (seen.has(id)) throw new Error(`page inconnue : ${id}`);
          seen.add(id);
          this.pageOf(id);
        }
        const next: RawRecord | null = b === null ? null : { asset: b.asset.id, kind: "image", w: b.w, h: b.h, fit: "width" };
        const isPdf = (p: FakePage): boolean => p.backdrop?.["kind"] === "pdf-page";
        const changed = cmd.pages.filter((id) => {
          const p = this.pageOf(id);
          return p.background !== cmd.color || !sameGrid(gridView(p.grid), g) || (!isPdf(p) && !sameBackdrop(p.backdrop, next));
        });
        if (changed.length === 0) return this.unchanged();
        const writesImage = b !== null && changed.some((id) => !isPdf(this.pageOf(id)));
        return this.step((s) => {
          for (const id of changed) {
            const p = s.pages.find((q) => q.id === id);
            if (p === undefined) continue;
            p.background = cmd.color;
            p.grid = g === null ? null : gridRecord(g);
            if (!isPdf(p)) p.backdrop = next;
          }
          if (writesImage && b !== null) putMeta(s.assets, b.asset);
          return { pages: changed, ids: [], removed: [] };
        });
      }
      case "AddTable": {
        // Ordre du cœur : arguments (BadTable), puis page ; x, y et les totaux bornés en f32 (`fits_f32`).
        const ok =
          validLines(cmd.cols) && validLines(cmd.rows) && positive(cmd.colWidth) && positive(cmd.rowHeight) && positive(cmd.size) &&
          fitsF32([cmd.x, cmd.y, cmd.cols * cmd.colWidth, cmd.rows * cmd.rowHeight]) && validColor(cmd.color);
        if (!ok) throw new Error(MESSAGES.badTable);
        this.pageOf(cmd.page);
        return this.writeNewTable(cmd.page, translate(cmd.x, cmd.y), () => ({
          color: cmd.color,
          size: cmd.size,
          cols: Array.from({ length: cmd.cols }, () => ({ id: newId(), width: cmd.colWidth })),
          rows: Array.from({ length: cmd.rows }, () => ({ id: newId(), height: cmd.rowHeight })),
          cells: new Map(),
        }));
      }
      case "SetTableCell": {
        // C7b (R7, PC2) : segments contrôlés en premier, comme `cmd_set_table_cell`.
        if (cmd.spans !== undefined && !validSpans(cmd.content, cmd.spans)) throw new Error(MESSAGES.badFormat);
        const want = cmd.spans === undefined ? null : normalSpans(cmd.spans);
        if (cmd.rowHeight !== undefined && !positive(cmd.rowHeight)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const r = t.rows.findIndex((l) => l.id === cmd.row);
        const c = t.cols.findIndex((l) => l.id === cmd.col);
        if (r < 0 || c < 0) throw new Error(MESSAGES.badTable);
        // F7 : sur une ancre de plusieurs lignes, la hauteur exigée vaut pour la zone ; sa dernière ligne grandit.
        const zone = mergesOf(t).find((m) => m.r0 === r && m.c0 === c);
        const z0 = zone?.r0 ?? r;
        const z1 = zone?.r1 ?? r;
        const zoneH = sum(t.rows.slice(z0, z1 + 1).map((l) => l.height));
        const lastH = t.rows[z1]?.height ?? 0;
        const h = cmd.rowHeight;
        const grow = h !== undefined && h > zoneH ? (z0 === z1 ? h : lastH + (h - zoneH)) : null;
        if (grow !== null && !fitsF32([sum(t.rows.map((l) => l.height)) - lastH + grow])) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cell = t.cells.get(key);
        const current = cell?.text ?? "";
        const spans = cell?.spans ?? plainSpans(current);
        const restyle = want !== null && current !== "" && !sameSpans(want, spans);
        if (current === cmd.content && grow === null && !restyle) return this.unchanged();
        const cells = new Map(t.cells);
        if (current !== cmd.content || restyle) {
          cells.set(key, { ...(cell ?? EMPTY_CELL), text: cmd.content, spans: want ?? editSpans(spans, cmd.content) });
        }
        const rows = grow === null ? t.rows : t.rows.map((l, i) => (i === z1 ? { ...l, height: grow } : l));
        return this.writeTable(found, cmd.id, { ...t, rows, cells }); // C3 : ligne agrandie, liaisons suivies (`followTable`)
      }
      case "InsertTableLine": {
        const { found, t } = this.tableOf(cmd.id);
        const n = cmd.axis === "row" ? t.rows.length : t.cols.length;
        const at = cmd.at;
        if (!Number.isInteger(at) || at < 0 || at > n || n >= TABLE_MAX_LINES) throw new Error(MESSAGES.badTable);
        const near = Math.max(0, at - 1);
        const sizes = cmd.axis === "row" ? t.rows.map((l) => l.height) : t.cols.map((l) => l.width);
        if (!fitsF32([sum(sizes) + (sizes[near] ?? 0)])) throw new Error(MESSAGES.badTable);
        if (cmd.axis === "row") {
          const height = t.rows[near]?.height ?? 0;
          return this.writeTable(found, cmd.id, { ...t, rows: [...t.rows.slice(0, at), { id: newId(), height }, ...t.rows.slice(at)] });
        }
        const width = t.cols[near]?.width ?? 0;
        return this.writeTable(found, cmd.id, { ...t, cols: [...t.cols.slice(0, at), { id: newId(), width }, ...t.cols.slice(at)] });
      }
      case "RemoveTableLine": {
        const { found, t } = this.tableOf(cmd.id);
        const lines: readonly { readonly id: string }[] = cmd.axis === "row" ? t.rows : t.cols;
        const ia = lines.findIndex((l) => l.id === cmd.line);
        const ib = cmd.to === undefined ? ia : lines.findIndex((l) => l.id === cmd.to);
        if (ia < 0 || ib < 0) throw new Error(MESSAGES.badTable);
        const a = Math.min(ia, ib);
        const b = Math.max(ia, ib);
        if (b - a + 1 >= lines.length) throw new Error(MESSAGES.badTable);
        const gone = new Set(lines.slice(a, b + 1).map((l) => l.id));
        const cells = new Map([...t.cells].filter(([k]) => ![...gone].some((l) => inLine(k, cmd.axis, l))));
        // F6 : report des zones touchées, comme `span_moves` du cœur.
        const dropped = (i: number): boolean => i >= a && i <= b;
        for (const m of mergesOf(t)) {
          const [s, e, across]: [number, number, number] = cmd.axis === "row" ? [m.r0, m.r1, m.c1 - m.c0 + 1] : [m.c0, m.c1, m.r1 - m.r0 + 1];
          if (e < a || s > b) continue;
          const left: number[] = [];
          for (let i = s; i <= e; i++) if (!dropped(i)) left.push(i);
          const firstLeft = left[0];
          const lastLeft = left[left.length - 1];
          if (firstLeft === undefined || lastLeft === undefined) continue;
          const size = left.length * across;
          const [ar, ac]: [number, number] = cmd.axis === "row" ? [firstLeft, m.c0] : [m.r0, firstLeft];
          const [lr, lc]: [number, number] = cmd.axis === "row" ? [lastLeft, m.c1] : [m.r1, lastLeft];
          const span: [string, string] = [rowId(t, lr), colId(t, lc)];
          const setSpan = (k: string): void => {
            cells.set(k, { ...(cells.get(k) ?? EMPTY_CELL), span });
          };
          if (dropped(s)) {
            if (size >= 2) setSpan(keyAt(t, ar, ac));
          } else if (size < 2) {
            const k = keyAt(t, m.r0, m.c0);
            const cur = cells.get(k);
            if (cur) cells.set(k, { ...cur, span: null });
          } else if (dropped(e)) {
            setSpan(keyAt(t, m.r0, m.c0));
          }
        }
        return this.writeTable(
          found,
          cmd.id,
          // C3 : tableau réduit, liaisons suivies (`followTable`).
          cmd.axis === "row" ? { ...t, rows: t.rows.filter((l) => !gone.has(l.id)), cells } : { ...t, cols: t.cols.filter((l) => !gone.has(l.id)), cells },
        );
      }
      case "SetTableSizes": {
        if (!positive(cmd.colWidth) || !positive(cmd.rowHeight)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        if (!fitsF32([t.cols.length * cmd.colWidth, t.rows.length * cmd.rowHeight])) throw new Error(MESSAGES.badTable);
        if (t.cols.every((c) => c.width === cmd.colWidth) && t.rows.every((r) => r.height === cmd.rowHeight)) return this.unchanged();
        return this.writeTable(found, cmd.id, {
          ...t,
          cols: t.cols.map((c) => (c.width === cmd.colWidth ? c : { ...c, width: cmd.colWidth })),
          rows: t.rows.map((r) => (r.height === cmd.rowHeight ? r : { ...r, height: cmd.rowHeight })),
        });
      }
      case "SetTableFill": {
        if (cmd.fill !== null && !validColor(cmd.fill)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const from = { row: cmd.row, col: cmd.col };
        const rect = rectOf(t, from, cmd.to ?? from);
        if (rect === null) throw new Error(MESSAGES.badTable);
        return this.setOnTargets(found, cmd.id, t, rect, "fill", cmd.fill);
      }
      case "SetTableShade": {
        if (cmd.shade !== null && !validColor(cmd.shade)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const rect = rectOf(t, cmd.from, cmd.to);
        if (rect === null) throw new Error(MESSAGES.badTable);
        return this.setOnTargets(found, cmd.id, t, rect, "shade", cmd.shade);
      }
      case "MergeTableCells": {
        const { found, t } = this.tableOf(cmd.id);
        const rect = rectOf(t, cmd.from, cmd.to);
        if (rect === null || (rect.r1 - rect.r0 + 1) * (rect.c1 - rect.c0 + 1) < 2) throw new Error(MESSAGES.badTable);
        const merges = mergesOf(t);
        if (merges.some((m) => overlaps(m, rect) && !inside(m, rect))) throw new Error(MESSAGES.badTable);
        const covered: string[] = [];
        for (let r = rect.r0; r <= rect.r1; r++) {
          for (let c = rect.c0; c <= rect.c1; c++) {
            const k = keyAt(t, r, c);
            if ((r !== rect.r0 || c !== rect.c0) && t.cells.has(k)) covered.push(k);
          }
        }
        const inner = merges.filter((m) => inside(m, rect));
        const same = inner.length === 1 && inner[0]?.r0 === rect.r0 && inner[0]?.c0 === rect.c0 && inner[0]?.r1 === rect.r1 && inner[0]?.c1 === rect.c1;
        if (same && covered.length === 0) return this.unchanged();
        const cells = new Map(t.cells);
        for (const k of covered) cells.delete(k);
        const anchor = keyAt(t, rect.r0, rect.c0);
        cells.set(anchor, { ...(cells.get(anchor) ?? EMPTY_CELL), span: [rowId(t, rect.r1), colId(t, rect.c1)] });
        return this.writeTable(found, cmd.id, { ...t, cells });
      }
      case "Group": {
        // Ordre du cœur : ids vides ou inconnus, puis pages différentes, puis moins de deux unités (BAD_GROUP_MESSAGE).
        const asked = [...new Set(cmd.ids)];
        const found = asked.map((id) => this.find(id));
        if (asked.length === 0 || found.some((x) => x === undefined)) throw new Error(MESSAGES.badGroup);
        const hits = found as Found[];
        const page = hits[0]!.page;
        if (hits.some((x) => x.page.id !== page.id)) throw new Error(MESSAGES.badGroup);
        // Un id pris dans un groupe vaut tout son groupe extérieur (membres de la même page).
        const outer = new Set(hits.flatMap((x) => (x.element.group === undefined ? [] : [unitOf(x.element)])));
        const members = page.elements.filter((e) => asked.includes(e.id) || (e.group !== undefined && outer.has(unitOf(e))));
        if (new Set(members.map(unitOf)).size < 2) throw new Error(MESSAGES.badGroup);
        const ids = members.map((e) => e.id).sort();
        const gid = newId();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === page.id);
          p?.elements.forEach((e, i) => {
            if (ids.includes(e.id)) p.elements[i] = { ...e, group: [gid, ...(e.group ?? [])] };
          });
          return { pages: [page.id], ids, removed: [] };
        });
      }
      case "Ungroup": {
        // Ids inconnus ou sans groupe ignorés, doublons fusionnés ; rien à retirer : aucune étape (D38).
        const hits = [...new Set(cmd.ids)]
          .map((id) => this.find(id))
          .filter((x): x is Found => x !== undefined && (x.element.group?.length ?? 0) > 0);
        if (hits.length === 0) return this.unchanged();
        const ids = hits.map((x) => x.element.id).sort();
        const pages = [...new Set(hits.map((x) => x.page.id))].sort();
        return this.step((s) => {
          for (const p of s.pages) {
            p.elements.forEach((e, i) => {
              if (!ids.includes(e.id) || e.group === undefined) return;
              const { group: _g, ...rest } = e;
              const tail = e.group.slice(1);
              p.elements[i] = tail.length > 0 ? { ...rest, group: tail } : rest;
            });
          }
          return { pages, ids, removed: [] };
        });
      }
      case "SplitTableCell": {
        const { found, t } = this.tableOf(cmd.id);
        const r = t.rows.findIndex((l) => l.id === cmd.row);
        const c = t.cols.findIndex((l) => l.id === cmd.col);
        if (r < 0 || c < 0 || !mergesOf(t).some((m) => m.r0 === r && m.c0 === c)) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cells = new Map(t.cells);
        cells.set(key, { ...(t.cells.get(key) ?? EMPTY_CELL), span: null });
        return this.writeTable(found, cmd.id, { ...t, cells });
      }
      case "ImportTable": {
        // Ordre du cœur (F18) : arguments (BadTable), puis page.
        const n = cmd.rowHeights.length;
        const ok =
          validLines(cmd.cols) && validLines(n) && cmd.cells.length === cmd.cols * n && positive(cmd.colWidth) &&
          cmd.rowHeights.every(positive) && positive(cmd.size) && validColor(cmd.color) && validMatrix(cmd.matrix) &&
          fitsF32([...cmd.matrix, cmd.cols * cmd.colWidth, sum(cmd.rowHeights)]) && validMerges(cmd.merges, n, cmd.cols);
        if (!ok) throw new Error(MESSAGES.badTable);
        this.pageOf(cmd.page);
        return this.writeNewTable(cmd.page, cmd.matrix, () => {
          const cols = Array.from({ length: cmd.cols }, () => ({ id: newId(), width: cmd.colWidth }));
          const rows = cmd.rowHeights.map((height) => ({ id: newId(), height }));
          const covered = new Set<number>();
          const spans = new Map<number, [string, string]>();
          for (const [r, c, nr, nc] of cmd.merges) {
            spans.set(r * cmd.cols + c, [rows[r + nr - 1]?.id ?? "", cols[c + nc - 1]?.id ?? ""]);
            for (let i = r; i < r + nr; i++) for (let j = c; j < c + nc; j++) if (i !== r || j !== c) covered.add(i * cmd.cols + j);
          }
          const cells = new Map<string, FakeCell>();
          cmd.cells.forEach((text, i) => {
            const span = spans.get(i) ?? null;
            if (covered.has(i) || (text === "" && span === null)) return;
            cells.set(cellKey(rows[Math.floor(i / cmd.cols)]?.id ?? "", cols[i % cmd.cols]?.id ?? ""), { text, spans: plainSpans(text), fill: null, shade: null, bg: null, span });
          });
          
          return { color: cmd.color, size: cmd.size, cols, rows, cells };
        });
      }
      case "SetStyle": {
        // OG11 : `cmd_set_style` (`style.rs`) : patch validé, puis plan des écritures effectives ; plan vide : aucune
        // étape (D38). Pas le chemin de Fill : une étape n'est poussée que si un champ change vraiment.
        const opacity = validStyle(cmd.patch);
        const plan = new Map<string, FakeElement>();
        const pages: string[] = [];
        for (const id of cmd.ids) {
          const found = this.find(id);
          if (!found) throw new Error(`élément inconnu : ${id}`);
          const next = restyled(found.element, cmd.patch, opacity);
          if (next === null) continue;
          plan.set(id, next);
          if (!pages.includes(found.page.id)) pages.push(found.page.id);
        }
        if (plan.size === 0) return this.unchanged();
        // C1 (`cmd_set_style`) : cibles touchées (ni ligne ni flèche, qui rompraient leurs liaisons) : leurs lignes liées
        // suivent l'épaisseur neuve dans la même étape.
        const targets = new Set([...plan].filter(([, e]) => !(e.shape && isSegment(e.shape.shape))).map(([id]) => id));
        return this.step((s) => {
          for (const p of s.pages) p.elements.splice(0, p.elements.length, ...p.elements.map((e) => plan.get(e.id) ?? e));
          if (targets.size > 0) this.follow(s, targets, null);
          return { pages, ids: [...plan.keys()], removed: [] };
        });
      }
      case "Fill": {
        // Ordre du cœur (`fill.rs`, PC2) : couleur, page, élément de cette page (PC3), cible ; même valeur : aucune étape.
        if (cmd.color !== null && !validColor(cmd.color)) throw new Error(MESSAGES.badFill);
        const page = this.pageOf(cmd.page);
        const t = cmd.target;
        const color = cmd.color;
        if (t.kind === "zone" && (![t.x, t.y, t.tol].every(Number.isFinite) || t.tol <= 0)) throw new Error(MESSAGES.badFill);
        // C8 (Q17) : second écart au contrat commun (D36) : aucune géométrie booléenne ici, une zone est le fond.
        if (t.kind === "background" || t.kind === "zone") {
          const next = color ?? DEFAULT_BACKGROUND;
          if (page.background === next) return this.unchanged();
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            if (p) p.background = next;
            return { pages: [cmd.page], ids: [], removed: [] };
          });
        }
        if (t.kind === "image") {
          // Ordre du cœur (`image.rs`, `cmd_fill_image`, B2) : élément de cette page, image lisible, asset ; même asset :
          // aucune étape. Pixels de C5 retirés (cuits par la page), géométrie gardée, `sourceAsset` posé au premier
          // remplissage seulement, métadonnée du nouvel asset (K3).
          const e = page.elements.find((x) => x.id === t.id);
          if (!e) throw new Error(`élément inconnu : ${t.id}`);
          const im = e.image;
          if (!im || e.malformed) throw new Error(MESSAGES.badFill);
          if (!validAsset(t.asset)) throw new Error(MESSAGES.badAsset);
          if (im.asset === t.asset.id) return this.unchanged();
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            const i = p ? p.elements.findIndex((x) => x.id === t.id) : -1;
            const old = p?.elements[i];
            if (p && old?.image) {
              // Comme `cmd_fill_image` : champs cuits retirés même bruts (`BAKED`), géométrie gardée (brute comprise),
              // `sourceAsset` brut remplacé par l'asset courant au premier remplissage.
              const { imageRaw: _raw, ...rest } = old;
              const o = old.image;
              const image = { asset: t.asset.id, w: o.w, h: o.h, sourceAsset: o.sourceAsset ?? o.asset, ...geometryOf(paramsOf(o)) };
              p.elements[i] = { ...rest, image, ...withoutRaw(old.imageRaw, [...BAKED, "sourceAsset"]) };
            }
            putMeta(s.assets, t.asset);
            return { pages: [cmd.page], ids: [t.id], removed: [] };
          });
        }
        const e = page.elements.find((x) => x.id === t.id);
        if (!e) throw new Error(`élément inconnu : ${t.id}`);
        if (e.fill) {
          // C8 (Q14) : `field_for` rend `color` pour un `fill` ; « Aucune » : aucune étape (la page passe par Delete).
          if (color === null || e.fill.color === color) return this.unchanged();
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            const i = p ? p.elements.findIndex((x) => x.id === t.id) : -1;
            const old = p?.elements[i];
            if (p && old?.fill) p.elements[i] = { ...old, fill: { ...old.fill, color } };
            return { pages: [cmd.page], ids: [t.id], removed: [] };
          });
        }
        const shape = e.shape;
        const inside = t.kind === "inside";
        // `field_for` du cœur : contour = `color` d'un trait ou de toute forme ; intérieur = `fill` d'une forme remplissable (C4a).
        const key = !inside && (e.local !== undefined || shape) ? "color" : inside && shape && isFillableShape(shape) ? "fill" : null;
        if (key === null) throw new Error(MESSAGES.badFill);
        const write = (next: (old: FakeElement) => FakeElement): Change =>
          this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            const i = p ? p.elements.findIndex((x) => x.id === t.id) : -1;
            const old = p?.elements[i];
            if (p && old) p.elements[i] = next(old);
            return { pages: [cmd.page], ids: [t.id], removed: [] };
          });
        if (key === "color") {
          if (color === null || e.style.color === color) return this.unchanged();
          return write((old) => ({ ...old, style: { ...old.style, color } }));
        }
        if (shape === undefined || shape.fill === color) return this.unchanged();
        return write((old) => (old.shape ? { ...old, shape: { ...old.shape, fill: color } } : old));
      }
      case "SetImageParams": {
        // Ordre du cœur (`image.rs`) : élément, image lisible, réglages (I5), matrice ; même état et même matrice : aucune étape.
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const im = found.element.image;
        if (!im || found.element.malformed) throw new Error(MESSAGES.badImageParams);
        const next = normalizeParams(cmd.params, im.w, im.h);
        if (next === null) throw new Error(MESSAGES.badImageParams);
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        const sameMatrix = cmd.matrix.every((v, k) => v === found.element.transform[k]);
        // C6b (B11) : `restore` avec un `sourceAsset` : l'asset d'origine revient, `sourceAsset` retiré (une étape).
        const restoring = cmd.restore === true && im.sourceAsset !== undefined;
        // OE43, `plan` du cœur : un réglage brut est retiré ou remplacé ; `restore` retire un `sourceAsset` brut.
        const raw = found.element.imageRaw ?? {};
        const rawOps = IMAGE_PARAM_KEYS.some((k) => k in raw) || (cmd.restore === true && "sourceAsset" in raw);
        if (sameParams(paramsOf(im), next) && sameMatrix && !restoring && !rawOps) return this.unchanged();
        const page = found.page.id;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === page);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          const old = p?.elements[i];
          if (p && old?.image) {
            const o = old.image;
            const asset = restoring ? (o.sourceAsset ?? o.asset) : o.asset;
            const source = !restoring && o.sourceAsset !== undefined ? { sourceAsset: o.sourceAsset } : {};
            const { imageRaw: _raw, ...rest } = old;
            const gone = cmd.restore === true ? [...IMAGE_PARAM_KEYS, "sourceAsset"] : [...IMAGE_PARAM_KEYS];
            p.elements[i] = { ...rest, transform: cmd.matrix, image: { asset, w: o.w, h: o.h, ...source, ...next }, ...withoutRaw(old.imageRaw, gone) };
          }
          return { pages: [page], ids: [cmd.id], removed: [] };
        });
      }
    }
  }

  element(id: string): ElementView | null {
    const found = this.find(id);
    const e = found?.element;
    if (!found || !e || e.malformed) return null;
    // personnalisation-3 (D1, D36) : lien publié seulement vers une case existante, jamais sur un tableau.
    const linked = e.cell !== undefined && !isTableKind(e) && this.cellTargetOk(e.cell) ? { cell: e.cell } : {};
    const base = { id, transform: e.transform, ...withGroup(e.group), ...linked };
    const looked = e.look ? { look: e.look } : {};
    if (e.unknown) return { ...base, kind: "unknown", unknown: { sourceKind: e.unknown.sourceKind, ...e.unknown.box } };
    if (e.image) return { ...base, ...looked, kind: "image", image: e.image };
    // OG23 (T22, `drag_copy_view`) : tableau, média et objet 3D ne servent que `dragCopy` de leur aspect.
    const dragged = e.look?.dragCopy ? { look: { dragCopy: true as const } } : {};
    if (e.media) return { ...base, ...dragged, kind: "media", media: e.media };
    if (e.model3d) return { ...base, ...dragged, kind: "model3d", model3d: e.model3d };
    if (e.fill) return { ...base, kind: "fill", fill: { color: e.fill.color, w: e.fill.w, h: e.fill.h } };
    if (e.table) return { ...base, ...dragged, kind: "table", table: tableView(e.table) };
    const styled = { ...base, ...looked, style: e.style };
    if (e.shape) return { ...styled, kind: "shape", shape: this.shapeView(e.shape, found.page) };
    if (e.text) return { ...styled, kind: "text", text: e.text };
    return { ...styled, kind: "stroke" };
  }
  page(id: string): PageView | null {
    const p = this.state.pages.find((q) => q.id === id);
    if (!p) return null;
    return {
      id,
      width: PAGE_WIDTH,
      height: p.height,
      background: p.background,
      backdrop: backdropView(p.backdrop, PAGE_WIDTH),
      grid: gridView(p.grid),
      mode: p.mode === INFINITE_MODE ? "infinite" : "page",
    };
  }
  citedAssets(): AssetInfo[] {
    const acc = new Set<string>();
    for (const p of this.state.pages) {
      scanAssets(p.id, acc);
      scanAssets(p.backdrop, acc);
      scanAssets(p.grid, acc);
      for (const e of p.elements) {
        scanAssets({ ...e, text: undefined, local: undefined }, acc);
        if (e.table) for (const c of e.table.cells.values()) if (c.bg !== null) acc.add(c.bg);
      }
    }
    return [...acc].sort().map((id) => assetInfo(this.state.assets, id));
  }
  linkedAssets(): LinkedAsset[] {
    const out: LinkedAsset[] = [];
    for (const { id } of this.citedAssets()) {
      const path = linkedOf(this.state.assets.get(id));
      if (path !== null) out.push({ id, path });
    }
    return out;
  }
  relinkAssets(links: readonly LinkedAsset[]): number {
    let n = 0;
    for (const { id, path } of links) {
      const current = linkedOf(this.state.assets.get(id));
      if (!validLink(path) || current === null || current === path) continue;
      // Hors historique (M30) : le nouveau chemin vaut aussi pour les états que annuler et rétablir rendront.
      for (const st of [this.state, ...this.undoStack, ...this.redoStack]) {
        const m = st.assets.get(id);
        if (linkedOf(m) !== null) st.assets.set(id, { ...(m as Record<string, unknown>), linked: path });
      }
      n++;
    }
    return n;
  }
  asset(id: string): AssetInfo | null {
    return isAssetId(id) ? assetInfo(this.state.assets, id) : null;
  }
  saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array] {
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "roomboard-fake", appVersion, modified: now }));
    return [manifest, this.save(now, appVersion)] as const;
  }
  points(id: string): Float32Array | null { return this.find(id)?.element.local ?? null; }
  outline(id: string): Float32Array | null {
    const l = this.find(id)?.element.local;
    return l ? polyOutline(l, 0, 0) : null;
  }
  fillRings(id: string): Float32Array | null {
    const f = this.find(id)?.element.fill;
    return f ? new Float32Array(f.contours.flatMap((r) => [r.length / 2, ...r])) : null;
  }
  /** C8 (Q17) : aucune rastérisation dans la fausse liaison. */
  zoneCells(_page: string, _tol: number): number { return 0; }
  hitTest(page: string, x: number, y: number, tol: number): string | null {
    const els = this.pageOf(page).elements;
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      if (!e) continue;
      if (e.fill) {
        if (fillHit(e, x, y, tol)) return e.id;
        continue;
      }
      const poly = worldPolygon(e);
      if (poly ? polygonHit(poly, x, y, tol) : strokeTouches(e, new Float32Array([x, y]), tol)) return e.id;
    }
    return null;
  }
  edgeHit(id: string, x: number, y: number, tol: number): boolean {
    // Miroir d'`edge_hit` (`fill.rs`) : tracé `shapePolygon(kind, w, h, 0, géométrie)` porté par la matrice, arêtes seules (jamais
    // l'intérieur, à l'inverse de `polygonHit`), bande = tol + demi-épaisseur × (facteur de similitude, sinon racine du
    // déterminant ; pas la plus petite valeur singulière de `strokeHalfWidth`).
    const e = this.find(id)?.element;
    const s = e?.shape;
    if (!e || !s || !isFillableShape(s)) return false;
    const local = shapePolygon(s.shape, s.w, s.h, 0, lineGeomOf(s));
    const world: number[] = [];
    for (let i = 0; i + 1 < local.length; i += 2) world.push(...applyMatrix(e.transform, local[i] ?? 0, local[i + 1] ?? 0));
    const n = world.length / 2;
    let edge = Number.POSITIVE_INFINITY;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      edge = Math.min(edge, distToSegment(x, y, world[2 * i] ?? 0, world[2 * i + 1] ?? 0, world[2 * j] ?? 0, world[2 * j + 1] ?? 0));
    }
    const m = e.transform;
    const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    return edge <= tol + (e.style.width / 2) * scale;
  }
  hitTestPath(page: string, path: Float32Array, radius: number): string[] {
    return this.pageOf(page).elements.filter((e) => e.local !== undefined && strokeTouches(e, path, radius)).map((e) => e.id);
  }
  idsInRect(page: string, r: Bounds): string[] {
    return this.pageOf(page).elements.filter((e) => {
      const b = this.bounds([e.id]);
      return b !== null && b.x0 >= r.x0 && b.y0 >= r.y0 && b.x1 <= r.x1 && b.y1 <= r.y1;
    }).map((e) => e.id);
  }
  bounds(ids: readonly string[]): Bounds | null {
    let b: Bounds | null = null;
    const add = (x0: number, y0: number, x1: number, y1: number): void => {
      b = b === null
        ? { x0, y0, x1, y1 }
        : { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) };
    };
    for (const id of ids) {
      const e = this.find(id)?.element;
      if (!e) continue;
      const poly = worldPolygon(e);
      if (poly) {
        for (let i = 0; i + 1 < poly.length; i += 2) add(poly[i] ?? 0, poly[i + 1] ?? 0, poly[i] ?? 0, poly[i + 1] ?? 0);
        continue;
      }
      const h = strokeHalfWidth(e);
      for (const [x, y] of worldPoints(e)) add(x - h, y - h, x + h, y + h);
    }
    return b;
  }
  undo(): Change {
    const prev = this.undoStack.pop();
    if (!prev) return this.unchanged();
    this.redoStack.push(this.state);
    this.state = prev;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  redo(): Change {
    const next = this.redoStack.pop();
    if (!next) return this.unchanged();
    this.undoStack.push(this.state);
    this.state = next;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  version(): number { return this.ver; }
  /** Corps JSON commun au document et au fragment (même ordre de clés). */
  private json(now: string, appVersion: string): Record<string, unknown> {
    return {
      now,
      appVersion,
      assets: Object.fromEntries(this.state.assets),
      pages: this.state.pages.map((p) => ({
        id: p.id,
        background: p.background,
        backdrop: p.backdrop,
        elements: p.elements.map(savedElement),
        ...(p.grid !== null ? { grid: p.grid } : {}),
        ...(p.mode !== null ? { mode: p.mode } : {}),
        ...(p.height !== PAGE_HEIGHT ? { height: p.height } : {}),
      })),
    };
  }
  save(now: string, appVersion: string): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(this.json(now, appVersion)));
  }
  saveFragment(now: string, appVersion: string, name: string): Uint8Array {
    const n = this.state.pages.length;
    if (n !== 1) throw new Error(`document RoomBoard endommagé : fragment de ${n} pages : une seule attendue`);
    return new TextEncoder().encode(JSON.stringify({ kind: "fragment", name, ...this.json(now, appVersion) }));
  }
  saveFragmentParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "roomboard-fake", kind: "fragment", name, appVersion, modified: now }));
    return [manifest, this.saveFragment(now, appVersion, name)] as const;
  }
  saveGrid(now: string, appVersion: string, name: string): Uint8Array {
    const n = this.state.pages.length;
    if (n !== 1) throw new Error(`document RoomBoard endommagé : grille de ${n} pages : une seule attendue`);
    return new TextEncoder().encode(JSON.stringify({ kind: "grid", name, ...this.json(now, appVersion) }));
  }
  saveGridParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "roomboard-fake", kind: "grid", name, appVersion, modified: now }));
    return [manifest, this.saveGrid(now, appVersion, name)] as const;
  }
  extract(page: string, ids: readonly string[]): CoreDocument {
    // Ordre du cœur : page inconnue, puis premier id absent de la page.
    const p = this.pageOf(page);
    for (const id of ids) if (!p.elements.some((e) => e.id === id)) throw new Error(`élément inconnu : ${id}`);
    const wanted = new Set(ids);
    const groups = new Map<string, string>();
    const elements = copyElements(p.elements.filter((e) => wanted.has(e.id)), groups, 0, 0);
    const out = new FakeDocument({ pages: [{ ...newPage(undefined), elements }], assets: new Map() });
    adoptMeta(out.state.assets, this.state.assets, out.citedAssets().map((a) => a.id));
    return out;
  }
  insertFragment(src: CoreDocument, page: string, dx: number, dy: number): Change {
    // Ordre du cœur : source d'une autre liaison, déplacement non fini, page inconnue ; source vide : aucune étape.
    if (!(src instanceof FakeDocument)) throw new Error(MIXED_SOURCE_MESSAGE);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error(MESSAGES.badMatrix);
    this.pageOf(page);
    const from = src.state.pages[0]?.elements ?? [];
    if (from.length === 0) return this.unchanged();
    const groups = new Map<string, string>();
    const copies = copyElements(from, groups, dx, dy);
    const cited = src.citedAssets().map((a) => a.id);
    return this.step((s) => {
      s.pages.find((q) => q.id === page)?.elements.push(...copies);
      adoptMeta(s.assets, src.state.assets, cited);
      return { pages: [page], ids: copies.map((c) => c.id), removed: [] };
    });
  }
  insertPages(src: CoreDocument, after: string): Change {
    if (!(src instanceof FakeDocument)) throw new Error(MIXED_SOURCE_MESSAGE);
    const at = this.state.pages.findIndex((p) => p.id === after);
    if (at < 0) throw new Error(`page inconnue : ${after}`);
    if (src.state.pages.length === 0) return this.unchanged();
    const groups = new Map<string, string>();
    const pages: FakePage[] = src.state.pages.map((p) => ({
      ...p,
      id: newId(),
      elements: copyElements(p.elements, groups, 0, 0),
    }));
    const cited = src.citedAssets().map((a) => a.id);
    return this.step((s) => {
      s.pages.splice(at + 1, 0, ...pages);
      adoptMeta(s.assets, src.state.assets, cited);
      return { pages: pages.map((p) => p.id), ids: pages.flatMap((p) => p.elements.map((e) => e.id)), removed: [] };
    });
  }
  newStrokeBuilder(style: StrokeStyle, constant = false): StrokeBuilderApi {
    const pts: number[] = [];
    void style;
    void constant; // la fausse liaison n'a pas d'épaisseur variable : contour polygonal dans les deux cas
    return {
      push: (p: Float32Array, ahead?: Float32Array) => {
        pts.push(...p);
        return polyOutline(new Float32Array(ahead && ahead.length > 0 ? [...pts, ...ahead] : pts), 0, 0);
      },
      finish: () => polyOutline(new Float32Array(pts), 0, 0),
      free: () => undefined,
    };
  }
  free(): void { /* rien à libérer */ }
  snapPoint(page: string, x: number, y: number): readonly [number, number] | null {
    const g = this.gridOfPage(page);
    return g === null ? null : snapSquares(g, this.clipOf(page), x, y);
  }
  snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number] {
    const g = this.gridOfPage(page);
    const b = this.snapBox(ids);
    if (g === null || b === null) return [dx, dy];
    const clip = this.clipOf(page);
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    let best: [number, number] | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [cx, cy]] as const) {
      const c0 = x + dx;
      const c1 = y + dy;
      const q = snapSquares(g, clip, c0, c1);
      if (q === null) continue;
      const d = dist2(q[0], q[1], c0, c1);
      if (best === null || d < bestD) {
        // `q − candidat d'origine` (comme `grid::snap_delta`) : exactement nul quand l'élément revient à sa place.
        best = [settleDelta(q[0] - x), settleDelta(q[1] - y)];
        bestD = d;
      }
    }
    return best ?? [dx, dy];
  }
  gridLines(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null {
    void minDotStep; // points : vrai module seulement (DAG3)
    const g = this.gridOfPage(page);
    return g === null ? null : squaresLines(g, this.clipOf(page), rect, minStep);
  }
  gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number): GridLines | null {
    void minDotStep; // points : vrai module seulement (DAG3)
    if (!this.state.pages.some((q) => q.id === page)) return null;
    return squaresLines(grid, this.clipOf(page), rect, minStep);
  }
  /** Borne de la grille (`page_clip` du cœur, T7) : cadre de `pageFrame` en Page, null (sans borne) en Infini. */
  private clipOf(page: string): PageRect | null {
    const v = this.page(page);
    return v === null ? null : pageFrame(v);
  }
  private gridOfPage(page: string): GridView | null {
    const p = this.state.pages.find((q) => q.id === page);
    return p ? gridView(p.grid) : null;
  }
  /** Boîte d'accroche (G7) : forme = boîte (0, 0)-(w, h) sans l'épaisseur du trait ; autre élément : `bounds`. */
  private snapBox(ids: readonly string[]): Bounds | null {
    let acc: Bounds | null = null;
    for (const id of ids) {
      const e = this.find(id)?.element;
      if (!e) continue;
      let box: Bounds | null = null;
      if (e.shape) {
        const poly = boxPolygon(e.shape.w, e.shape.h);
        for (let i = 0; i + 1 < poly.length; i += 2) {
          const [x, y] = applyMatrix(e.transform, poly[i] ?? 0, poly[i + 1] ?? 0);
          box = union(box, { x0: x, y0: y, x1: x, y1: y });
        }
      } else {
        box = this.bounds([id]);
      }
      if (box !== null) acc = union(acc, box);
    }
    return acc;
  }
}

/** Texte enregistré ; `spans` absent dans un JSON d'avant C7. */
type SavedText = Omit<TextData, "spans"> & { readonly spans?: readonly TextSpan[] };
/** JSON d'avant C7 : sans `spans`, le texte est un seul segment sans attribut (T8, T12). */
const withSpans = (t: SavedText): TextData => ({ ...t, spans: Array.isArray(t.spans) ? t.spans : plainSpans(t.content) });
/** Tableau enregistré par la fausse liaison : cellules en objet `<rowId>:<colId>` → cellule. */
interface SavedTable {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  readonly cells: Readonly<Record<string, FakeCell>>;
}

interface SavedElement {
  /** OG11 : aspect écrit ; relu par `toLook`. */
  look?: unknown;
  id: string;
  /** Absent : élément du socle (trait, forme ou texte selon ses champs). */
  kind?: string;
  /** Lu par `toMatrix6` ; celui d'un inconnu peut être illisible, il est alors réécrit tel quel. */
  transform?: unknown;
  style?: StrokeStyle;
  local?: number[];
  shape?: ShapeData;
  text?: SavedText;
  image?: ImageData;
  /** C14 : écrit `MediaData` ; lu : valeur brute, contrôlée par `readMedia`. */
  media?: MediaData | unknown;
  /** C15 : écrit par `savedModel3d` ; lu : valeur brute, contrôlée par `readModel3d`. */
  model3d?: unknown;
  /** C8 : écrit `FakeFill` ; lu : valeur brute, contrôlée par `readFill`. */
  fill?: unknown;
  /** Écrit : `SavedTable` ; lu : valeur brute, contrôlée par `loadTable`. */
  table?: SavedTable | unknown;
  /** Champs bruts d'un élément inconnu, réécrits tels quels. */
  raw?: Record<string, unknown>;
  /** C3 : lu par `readGroup` ; illisible : retiré (PC6). */
  group?: unknown;
  /** personnalisation-3 : écrit par `cellField` ; lu par `readCell` (illisible : aucun lien). */
  cell?: unknown;
}
interface SavedPage { id: string; elements: SavedElement[]; backdrop?: unknown; grid?: unknown; background?: unknown; mode?: unknown; height?: unknown }

/** personnalisation-3 : `cell` écrit tel quel (trois chaînes) ; absent sans lien. */
const cellField = (e: FakeElement): { cell?: readonly string[] } => (e.cell === undefined ? {} : { cell: [...e.cell] });
/** Lecture tolérante (U3), comme `read_cell_link` : trois chaînes non vides, sinon aucun lien. */
const readCell = (v: unknown): { cell?: CellLink } =>
  Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "string" && x !== "") ? { cell: [v[0], v[1], v[2]] as CellLink } : {};

function savedElement(e: FakeElement): SavedElement {
  const group = withGroup(e.group);
  if (e.malformed) {
    const { group: _stale, ...rest } = e.malformed; // le groupe vivant (Group, Ungroup) remplace celui lu
    return { id: e.id, ...rest, ...group } as SavedElement;
  }
  if (e.unknown) {
    return { id: e.id, kind: e.unknown.sourceKind, ...(e.unknown.hasTransform ? { transform: [...e.transform] } : e.unknown.rawTransform !== undefined ? { transform: e.unknown.rawTransform } : {}), raw: { ...e.unknown.raw }, ...group, ...cellField(e) };
  }
  if (e.table) return { id: e.id, kind: "table", transform: [...e.transform], table: { ...e.table, cells: Object.fromEntries(e.table.cells) }, ...(e.look ? { look: e.look } : {}), ...group, ...cellField(e) };
  if (e.image) return { id: e.id, kind: "image", transform: [...e.transform], image: { ...e.imageRaw, ...e.image }, ...(e.look ? { look: e.look } : {}), ...group, ...cellField(e) };
  if (e.media) return { id: e.id, kind: "media", transform: [...e.transform], media: e.media, ...(e.look ? { look: e.look } : {}), ...group, ...cellField(e) };
  if (e.model3d) return { id: e.id, kind: "model3d", transform: [...e.transform], model3d: savedModel3d(e.model3d), ...(e.look ? { look: e.look } : {}), ...group, ...cellField(e) };
  if (e.fill) return { id: e.id, kind: "fill", transform: [...e.transform], fill: { color: e.fill.color, w: e.fill.w, h: e.fill.h, contours: e.fill.contours.map((r) => [...r]) }, ...group, ...cellField(e) };
  return {
    id: e.id,
    transform: [...e.transform],
    style: e.style,
    ...(e.local ? { local: Array.from(e.local) } : {}),
    ...(e.shape ? { shape: e.shape } : {}),
    ...(e.text ? { text: e.text } : {}),
    ...(e.look ? { look: e.look } : {}),
    ...group,
    ...cellField(e),
  };
}

/** Entrées lisibles (T2) : objet avec un `id` texte non vide, sans « : » (clé de cellule ambiguë, comme le cœur), pas encore
 * vu et `key` fini > 0 ; les autres retirées (PC6). */
function readLines(v: unknown, key: "width" | "height"): { readonly id: string; readonly size: number }[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: { id: string; size: number }[] = [];
  for (const x of v) {
    if (!isRecord(x)) continue;
    const id = x["id"];
    const size = x[key];
    if (typeof id !== "string" || id === "" || id.includes(":") || seen.has(id) || !finitePositive(size)) continue;
    seen.add(id);
    out.push({ id, size });
  }
  return out;
}

/** Tableau lu comme le cœur (T2) ; null sans ligne ou sans colonne lisible. */
function loadTable(v: unknown): FakeTable | null {
  if (!isRecord(v)) return null;
  const cols = readLines(v["cols"], "width").map((l) => ({ id: l.id, width: l.size }));
  const rows = readLines(v["rows"], "height").map((l) => ({ id: l.id, height: l.size }));
  if (cols.length === 0 || rows.length === 0) return null;
  const cells = new Map<string, FakeCell>();
  const raw = v["cells"];
  if (isRecord(raw)) {
    for (const [k, c] of Object.entries(raw)) {
      if (!isRecord(c)) continue;
      const text = typeof c["text"] === "string" ? c["text"] : "";
      const fill = c["fill"];
      const shade = c["shade"];
      const bg = c["bg"];
      const span = c["span"];
      const s = c["spans"];
      // C7b : segments lisibles normalisés ; JSON d'avant C7b ou segments illisibles : un segment (R16).
      const spans = Array.isArray(s) && validSpans(text, s as TextSpan[]) ? normalSpans(s as TextSpan[]) : plainSpans(text);
      cells.set(k, {
        text,
        spans,
        fill: typeof fill === "string" && validColor(fill) ? fill : null,
        shade: typeof shade === "string" && validColor(shade) ? shade : null,
        bg: typeof bg === "string" && isAssetId(bg) ? bg : null,
        span: Array.isArray(span) && span.length === 2 && typeof span[0] === "string" && typeof span[1] === "string" ? [span[0], span[1]] : null,
      });
    }
  }
  const color = v["color"];
  const size = v["size"];
  return {
    color: typeof color === "string" && validColor(color) ? color : DEFAULT_TABLE_COLOR,
    size: finitePositive(size) ? size : DEFAULT_TABLE_SIZE,
    cols,
    rows,
    cells,
    ...(v["fit"] === "shrink" ? { fit: "shrink" as const } : {}),
    ...(v["header"] === true ? { header: true } : {}),
  };
}

const toMatrix6 = (t: unknown): Matrix | null =>
  Array.isArray(t) && t.length === 6 && t.every((v) => typeof v === "number" && Number.isFinite(v)) ? (t as unknown as Matrix) : null;

/** OG11 : aspect relu défensivement (`toLook`), omis s'il est neutre. */
const lookField = (e: SavedElement): { look?: Look } => {
  const look = toLook(e.look);
  return look ? { look } : {};
};

function loadElement(e: SavedElement): FakeElement {
  const group = withGroup(readGroup(e.group));
  // personnalisation-3 : lien de case relu (U3, lecture tolérante) ; un mal formé garde le sien dans son brut.
  const cell = readCell(e.cell);
  if (e.kind !== undefined && !KNOWN_KINDS.has(e.kind)) {
    const t = toMatrix6(e.transform);
    const raw = e.raw ?? {};
    const unknown: FakeUnknown = {
      sourceKind: e.kind,
      raw,
      box: unknownBox(raw),
      hasTransform: t !== null,
      ...(t === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: t ?? IDENTITY, style: NO_STYLE, unknown, ...group, ...cell };
  }
  if (e.kind === "table") {
    // Repli d'un tableau mal formé (T2) : cadre inconnu, jamais invisible ; brut gardé sous `raw.table`, réécrit tel quel.
    const source = e.table ?? e.raw?.["table"];
    const t = loadTable(source);
    const m = toMatrix6(e.transform);
    if (t !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, table: t, ...lookField(e), ...group, ...cell };
    const raw = { table: source };
    const unknown: FakeUnknown = {
      sourceKind: "table",
      raw,
      box: unknownBox(raw),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group, ...cell };
  }
  if (e.kind === "media") {
    // Repli du tableau, pas celui de l'image (C14, M7) : un média mal formé est un cadre inconnu, jamais invisible ;
    // brut gardé sous `raw.media`, réécrit tel quel, boîte lue dans le brut.
    const source = e.media ?? e.raw?.["media"];
    const media = readMedia(source);
    const m = toMatrix6(e.transform);
    if (media !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, media, ...lookField(e), ...group, ...cell };
    const unknown: FakeUnknown = {
      sourceKind: "media",
      raw: { media: source },
      box: unknownBox(isRecord(source) ? source : {}),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group, ...cell };
  }
  if (e.kind === "model3d") {
    // Repli du média, pas celui de l'image (C15, X8) : un objet 3D mal formé est un cadre inconnu, jamais invisible ;
    // brut gardé sous `raw.model3d`, réécrit tel quel, boîte lue dans le brut.
    const source = e.model3d ?? e.raw?.["model3d"];
    const model3d = readModel3d(source);
    const m = toMatrix6(e.transform);
    if (model3d !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, model3d, ...lookField(e), ...group, ...cell };
    const unknown: FakeUnknown = {
      sourceKind: "model3d",
      raw: { model3d: source },
      box: unknownBox(isRecord(source) ? source : {}),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group, ...cell };
  }
  if (e.kind === "fill") {
    // C8 (Q11) : repli du média, pas celui de l'image : un `fill` mal formé est un cadre inconnu de sa boîte, brut gardé
    // sous `raw.fill`, réécrit tel quel.
    const source = e.fill ?? e.raw?.["fill"];
    const fill = readFill(source);
    const m = toMatrix6(e.transform);
    if (fill !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, fill, ...group, ...cell };
    const unknown: FakeUnknown = {
      sourceKind: "fill",
      raw: { fill: source },
      box: unknownBox(isRecord(source) ? source : {}),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group, ...cell };
  }
  if (e.kind === "image") {
    const im: unknown = e.image;
    const ok = isRecord(im) && isAssetId(im["asset"]) && finitePositive(im["w"]) && finitePositive(im["h"]);
    if (!ok) {
      const { id: _id, ...rest } = e;
      return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, malformed: rest, ...group };
    }
  }
  if (e.kind === "image" && e.image) {
    // C5 : réglages relus champ par champ (un champ illisible est lu comme absent, U3).
    const im = e.image;
    const all = im as unknown as Readonly<Record<string, unknown>>;
    const src = all["sourceAsset"];
    const image: ImageData = {
      asset: im.asset,
      w: im.w,
      h: im.h,
      // C6b (B12) : lu tolérant, comme le cœur (non conforme = absent, U3).
      ...(isAssetId(src) ? { sourceAsset: src } : {}),
      ...readParams(all, im.w, im.h),
    };
    // OE43 : présents mais lus absents (illisibles ou neutres) : gardés bruts, comme le cœur.
    const kept = image as unknown as Readonly<Record<string, unknown>>;
    const imageRaw = Object.fromEntries([...IMAGE_PARAM_KEYS, "sourceAsset"].filter((k) => all[k] !== undefined && kept[k] === undefined).map((k) => [k, all[k]]));
    const rawField = Object.keys(imageRaw).length > 0 ? { imageRaw } : {};
    return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, image, ...rawField, ...lookField(e), ...group, ...cell };
  }
  return {
    id: e.id,
    transform: toMatrix6(e.transform) ?? IDENTITY,
    style: e.style ?? NO_STYLE,
    ...(e.local ? { local: new Float32Array(e.local) } : {}),
    ...(e.shape ? { shape: e.shape } : {}),
    ...(e.text ? { text: withSpans(e.text) } : {}),
    ...lookField(e),
    ...group,
    ...cell,
  };
}

function fakeKind(raw: Record<string, unknown>): ContainerKind {
  const kind = raw["kind"] ?? "document";
  // D26 : « pack » a son message (`unknownKindMessage`), comme dans le cœur.
  if (kind !== "document" && kind !== "fragment" && kind !== "grid") throw new Error(unknownKindMessage(String(kind)));
  return kind;
}

/** Même message que le cœur (`FormatError::NotRoomboard`) : le lot 3 l'affiche tel quel. */
const NOT_ROOMBOARD = "ce fichier n'est pas un document RoomBoard";

function parseFake(bytes: Uint8Array): Record<string, unknown> {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(NOT_ROOMBOARD);
  }
  if (!isRecord(raw)) throw new Error(NOT_ROOMBOARD);
  return raw;
}

function loadFake(bytes: Uint8Array, expected: ContainerKind = "document"): CoreDocument {
  const raw = parseFake(bytes);
  // C3 : le type se lit à l'ouverture, avant le contenu ; kind absent : document d'avant C3.
  const kind = fakeKind(raw);
  if (!Array.isArray(raw["pages"])) throw new Error(NOT_ROOMBOARD);
  if (kind !== expected) throw new Error(wrongKindMessage(kind));
  const pages = (raw["pages"] as SavedPage[]).map((p) => ({
    id: p.id,
    elements: p.elements.map(loadElement),
    backdrop: isRecord(p.backdrop) ? p.backdrop : null,
    // Brute, quelle qu'elle soit (G13) : réécrite telle quelle ; `gridView` décide de la vue.
    grid: p.grid ?? null,
    background: typeof p.background === "string" && validColor(p.background) ? p.background : DEFAULT_BACKGROUND,
    // Brut (U3) : une valeur inconnue est lue Page et réécrite telle quelle.
    mode: p.mode ?? null,
    height: finitePositive(p.height) ? p.height : PAGE_HEIGHT,
  }));
  const assets = new Map(isRecord(raw["assets"]) ? Object.entries(raw["assets"]) : []);
  return new FakeDocument({ pages, assets });
}

export const fakeCore: CoreFactory = {
  blank: (mode?: PageLayout) => new FakeDocument({ pages: [newPage(mode === undefined ? undefined : readLayout(mode))], assets: new Map() }),
  // C12 (D37) : état construit d'emblée, comme `blank` ; jamais par SetBackdrop (une étape par page), que le cœur n'emploie pas.
  // C16 (O17) : `original` cité par chaque fond, contrôlé comme l'asset, métadonnée écrite.
  fromPdfPages: (asset: AssetRef, sizes: readonly PdfPageSize[], original?: AssetRef) => {
    if (!validAsset(asset) || (original !== undefined && !validAsset(original))) throw new Error(MESSAGES.badAsset);
    if (sizes.length === 0 || sizes.length > PDF_MAX_PAGES || sizes.some((s) => !positive(s.w) || !positive(s.h))) {
      throw new Error(MESSAGES.badImage);
    }
    const assets = new Map<string, unknown>();
    putMeta(assets, asset);
    if (original !== undefined) putMeta(assets, original);
    const pages = sizes.map((s, i) => ({
      id: newId(),
      elements: [],
      backdrop: { asset: asset.id, kind: PDF_PAGE_KIND, page: i, w: s.w, h: s.h, fit: "width", ...(original === undefined ? {} : { original: original.id }) },
      grid: null,
      background: DEFAULT_BACKGROUND,
      mode: null,
      height: PAGE_HEIGHT,
    }));
    return new FakeDocument({ pages, assets });
  },
  load: (bytes: Uint8Array) => loadFake(bytes),
  loadParts: (manifest: Uint8Array, ybin: Uint8Array) => {
    void manifest;
    return loadFake(ybin);
  },
  version: () => "fake",
  loadFragment: (bytes: Uint8Array) => loadFake(bytes, "fragment"),
  loadFragmentParts: (manifest: Uint8Array, ybin: Uint8Array) => {
    void manifest;
    return loadFake(ybin, "fragment");
  },
  loadGrid: (bytes: Uint8Array) => loadFake(bytes, "grid"),
  loadGridParts: (manifest: Uint8Array, ybin: Uint8Array) => {
    void manifest;
    return loadFake(ybin, "grid");
  },
  manifestKind: (manifest: Uint8Array) => fakeKind(parseFake(manifest)),
  containerKind: (bytes: Uint8Array) => fakeKind(parseFake(bytes)),
};

// --- Grille (C9) : mêmes règles que `crates/roomboard-core/src/grid.rs` pour le modèle ; carreaux seuls pour le reste.
/** Tolérance d'indice, en pas (celle de `grid.rs`). */
const GRID_EPS = 1e-9;
/** Résidu d'arrondi d'un déplacement aimanté, en unités de page (`DELTA_EPS` de `grid.rs`) : sous ce seuil, 0 exact. */
const SNAP_DELTA_EPS = 1e-9;
const settleDelta = (v: number): number => (Math.abs(v) < SNAP_DELTA_EPS ? 0 : v);
/** Plus petite boîte qui contient `acc` (s'il y en a une) et `b`. */
const union = (acc: Bounds | null, b: Bounds): Bounds =>
  acc === null
    ? b
    : { x0: Math.min(acc.x0, b.x0), y0: Math.min(acc.y0, b.y0), x1: Math.max(acc.x1, b.x1), y1: Math.max(acc.y1, b.y1) };
const boolOr = (v: unknown, d: boolean): boolean => (typeof v === "boolean" ? v : d);
const finiteOr = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
/** `f64::round` du cœur : moitié loin de zéro (Math.round arrondit -1,5 vers -1, le cœur vers -2). */
const roundHalfAway = (v: number): number => Math.sign(v) * Math.round(Math.abs(v));
const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v !== "";
/** Épaisseur acceptable (E1) : nombre fini dans [1, 8], comme `grid::line_width_ok`. */
const lineWidthOk = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= MIN_GRID_LINE_WIDTH && v <= MAX_GRID_LINE_WIDTH;

/** Niveau vu comme par le cœur (G4) : sans pas finis > 0 ou sans kind non vide, absent ; défauts champ par champ,
 *  couleur et trait vides compris. Toute vue lue passe donc `validGrid` telle quelle. */
function gridLevelView(raw: unknown): GridLevel | null {
  if (!isRecord(raw)) return null;
  const { kind, spacingX, spacingY, originX, originY, color, line, lineWidth, snap, visible } = raw;
  if (!finitePositive(spacingX) || !finitePositive(spacingY) || !nonEmpty(kind)) return null;
  return {
    kind,
    spacingX,
    spacingY,
    originX: finiteOr(originX, 0),
    originY: finiteOr(originY, 0),
    color: nonEmpty(color) ? color : DEFAULT_GRID_COLOR,
    line: nonEmpty(line) ? line : "solid",
    lineWidth: lineWidthOk(lineWidth) ? lineWidth : DEFAULT_GRID_LINE_WIDTH,
    snap: boolOr(snap, true),
    visible: boolOr(visible, true),
  };
}

/** Grille vue comme par le cœur (G4, G13) : pas un objet → null ; levels absent ou non tableau → [] ; têtes absentes →
 *  visible, sans aimant, dessous. */
function gridView(raw: unknown): GridView | null {
  if (!isRecord(raw)) return null;
  const levels = raw["levels"];
  return {
    visible: boolOr(raw["visible"], true),
    snap: boolOr(raw["snap"], false),
    above: boolOr(raw["above"], false),
    levels: Array.isArray(levels) ? levels.map(gridLevelView).filter((l): l is GridLevel => l !== null) : [],
  };
}

const LEVEL_KEYS = ["kind", "spacingX", "spacingY", "originX", "originY", "color", "line", "lineWidth", "snap", "visible"] as const satisfies readonly (keyof GridLevel)[];
/** Garde d'exhaustivité : un champ ajouté à `GridLevel` sans entrer dans `LEVEL_KEYS` casse la compilation. */
type MissingLevelKey = Exclude<keyof GridLevel, (typeof LEVEL_KEYS)[number]>;
const LEVEL_KEYS_COMPLETE: [MissingLevelKey] extends [never] ? true : never = true;
void LEVEL_KEYS_COMPLETE;
/** Même grille, champ par champ sur la vue (G5), comme le cœur. */
function sameGrid(a: GridView | null, b: GridInput | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.visible === b.visible &&
    a.snap === b.snap &&
    a.above === b.above &&
    a.levels.length === b.levels.length &&
    a.levels.every((l, i) => {
      const m = b.levels[i];
      return m !== undefined && LEVEL_KEYS.every((k) => l[k] === m[k]);
    })
  );
}

/** `BadGrid` (G2) : pas finis > 0, origine finie, kind, color, line non vides, au plus 16 niveaux. */
const validGrid = (g: GridInput): boolean =>
  g.levels.length <= MAX_GRID_LEVELS &&
  g.levels.every(
    (l) =>
      finitePositive(l.spacingX) &&
      finitePositive(l.spacingY) &&
      Number.isFinite(l.originX) &&
      Number.isFinite(l.originY) &&
      l.kind !== "" &&
      l.color !== "" &&
      l.line !== "" &&
      lineWidthOk(l.lineWidth),
  );

/** Champs écrits par SetGrid : les dix champs de chaque niveau, recopiés un à un ; toute autre clé perdue, comme le
 *  cœur (`grid::level_fields`, HG8). */
const gridRecord = (g: GridInput): RawRecord => ({
  visible: g.visible,
  snap: g.snap,
  above: g.above,
  levels: g.levels.map((l): GridLevel => ({
    kind: l.kind,
    spacingX: l.spacingX,
    spacingY: l.spacingY,
    originX: l.originX,
    originY: l.originY,
    color: l.color,
    line: l.line,
    lineWidth: l.lineWidth,
    snap: l.snap,
    visible: l.visible,
  })),
});

/** `snap_axis` du cœur : ligne la plus proche, bornée à la première `≥ lo` et à la dernière `≤ hi` quand ils sont
 *  donnés (cadre de la page) ; sans borne en Infini. */
function snapAxis(v: number, o: number, step: number, lo: number | null, hi: number | null): number | null {
  const first = lo === null ? Number.NEGATIVE_INFINITY : Math.ceil((lo - o) / step - GRID_EPS);
  const last = hi === null ? Number.POSITIVE_INFINITY : Math.floor((hi - o) / step + GRID_EPS);
  if (Number.isNaN(first) || Number.isNaN(last) || first > last) return null;
  return o + Math.min(Math.max(roundHalfAway((v - o) / step), first), last) * step;
}

/** Accroche des seuls carreaux (DAG3), même règle que `grid::snap_point`. */
function snapSquares(g: GridView, clip: PageRect | null, x: number, y: number): readonly [number, number] | null {
  if (!g.snap) return null;
  let best: readonly [number, number] | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const l of g.levels) {
    if (!l.snap || l.kind !== "squares") continue;
    const qx = snapAxis(x, l.originX, l.spacingX, clip?.x0 ?? null, clip?.x1 ?? null);
    const qy = snapAxis(y, l.originY, l.spacingY, clip?.y0 ?? null, clip?.y1 ?? null);
    if (qx === null || qy === null) continue;
    const d = dist2(qx, qy, x, y);
    if (best === null || d < bestD) {
      best = [qx, qy];
      bestD = d;
    }
  }
  return best;
}

/** `indices` du cœur : premier et dernier k ; [0, -1] si aucun ; null au-delà du plafond. */
function gridIndices(o: number, step: number, lo: number, hi: number): readonly [number, number] | null {
  const first = Math.ceil((lo - o) / step - GRID_EPS);
  const last = Math.floor((hi - o) / step + GRID_EPS);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  if (last < first) return [0, -1];
  if (last - first + 1 > MAX_GRID_DOTS) return null;
  return [first, last];
}

/** Lignes des seuls carreaux (DAG3), mêmes segments que `grid::lines` : `r` recoupé au cadre `clip` s'il existe,
 *  tel quel sinon (Infini). */
function squaresLines(g: GridView, clip: PageRect | null, r: Bounds, minStep: number): GridLines | null {
  if (!g.visible) return null;
  const levels: LevelLines[] = [];
  if (![r.x0, r.y0, r.x1, r.y1].every((v) => Number.isFinite(v))) return { above: g.above, levels }; // vue non finie : rien, avant la recoupe
  const c = clip === null ? r : { x0: Math.max(r.x0, clip.x0), y0: Math.max(r.y0, clip.y0), x1: Math.min(r.x1, clip.x1), y1: Math.min(r.y1, clip.y1) };
  const finite = [c.x0, c.y0, c.x1, c.y1].every((v) => Number.isFinite(v));
  if (finite && c.x0 <= c.x1 && c.y0 <= c.y1) {
    for (const l of g.levels) {
      if (!l.visible || l.kind !== "squares") continue;
      const segments: number[] = [];
      const ix = l.spacingX >= minStep * l.lineWidth ? gridIndices(l.originX, l.spacingX, c.x0, c.x1) : null;
      if (ix) {
        for (let k = ix[0]; k <= ix[1]; k++) {
          const x = l.originX + k * l.spacingX;
          segments.push(x, c.y0, x, c.y1);
        }
      }
      const iy = l.spacingY >= minStep * l.lineWidth ? gridIndices(l.originY, l.spacingY, c.y0, c.y1) : null;
      if (iy) {
        for (let k = iy[0]; k <= iy[1]; k++) {
          const y = l.originY + k * l.spacingY;
          segments.push(c.x0, y, c.x1, y);
        }
      }
      if (segments.length > 0) levels.push({ color: l.color, line: l.line, alpha: 1, lineWidth: l.lineWidth, segments, dots: [] });
    }
  }
  return { above: g.above, levels };
}
