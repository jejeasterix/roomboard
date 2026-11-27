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
import type {
  ContainerKind,
  AssetInfo,
  AssetRef,
  BackdropView,
  Bounds,
  CellIds,
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
  TableCell,
  TableCol,
  TableData,
  TableRow,
  TextData,
  TextSpan,
  FillData,
} from "./api";
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
  UNKNOWN_BOX,
  unknownKindMessage,
} from "./api";
import { pageFrame, type PageRect } from "../engine/page";
import { isAssetId } from "./asset-store";
import { cleanPatch, editSpans, formatSpans, normalSpans, plainSpans, sameSpans, utf16Bounds, validColor, validPatch, validSpans } from "./rich-text";
import { applyMatrix, boxPolygon, composeMatrix, isIdentity, isSegment, normalizeShape, shapePolygon, translateMatrix as translate } from "./shapes";
import { displaySize, geometryOf, normalizeParams, paramsOf, readParams, sameParams } from "./image-params";

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
}
type RawRecord = Readonly<Record<string, unknown>>;
/** Cellule de la fausse liaison ; absente du Map = vide ; `spans` = segments du texte (C7b) ; `span` = [dernière ligne,
 *  dernière colonne] (ancre, F1). */
interface FakeCell {
  readonly text: string;
  readonly spans: readonly TextSpan[];
  readonly fill: string | null;
  readonly shade: string | null;
  readonly span: readonly [string, string] | null;
}
/** Tableau (C10a) : objets repris tels quels d'une étape à l'autre, sauf ceux qu'une commande change. */
interface FakeTable {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  /** Clé `<rowId>:<colId>`. */
  readonly cells: ReadonlyMap<string, FakeCell>;
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

const MESSAGES = {
  badShape: "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)",
  badMatrix: "matrice invalide (six nombres finis, inversible)",
  badText: "texte invalide (taille et boîte finies > 0 attendues)",
  badWidth: "épaisseur de trait invalide (nombre fini > 0 attendu)",
  badAsset: "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)",
  badImage: "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)",
  badFormat: "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)",
  badGrid: "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)",
  badTable: "tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)",
  badFill: "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)",
  badGroup: BAD_GROUP_MESSAGE,
  badImageParams: BAD_IMAGE_PARAMS_MESSAGE,
} as const;

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
const EMPTY_CELL: FakeCell = { text: "", spans: plainSpans(""), fill: null, shade: null, span: null };
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

/** Vue (T13, F29) : cellules non vides (texte, remplissage ou ombrage) dans l'ordre de lecture ; zones par `mergesOf`. */
function tableView(t: FakeTable): TableData {
  const cells: TableCell[] = [];
  for (const r of t.rows) {
    for (const c of t.cols) {
      const cell = t.cells.get(cellKey(r.id, c.id));
      if (cell && (cell.text !== "" || cell.fill !== null || cell.shade !== null)) {
        cells.push({ row: r.id, col: c.id, text: cell.text, fill: cell.fill, shade: cell.shade, spans: cell.spans });
      }
    }
  }
  const merges = mergesOf(t).map((m) => ({ row: rowId(t, m.r0), col: colId(t, m.c0), rows: m.r1 - m.r0 + 1, cols: m.c1 - m.c0 + 1 }));
  return { color: t.color, size: t.size, cols: t.cols, rows: t.rows, cells, merges };
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

/** Recopie (Z4) : id neuf, chemin renuméroté par `groups` (commun à l'insertion), translation si le transform est lu. */
function copyElement(e: FakeElement, groups: Map<string, string>, dx: number, dy: number): FakeElement {
  const group = e.group?.map((g) => {
    let n = groups.get(g);
    if (n === undefined) {
      n = newId();
      groups.set(g, n);
    }
    return n;
  });
  const { group: _old, ...rest } = e;
  const moves = (dx !== 0 || dy !== 0) && e.unknown?.hasTransform !== false && e.malformed === undefined;
  const t = e.transform;
  const transform: Matrix = moves ? [t[0], t[1], t[2], t[3], t[4] + dx, t[5] + dy] : t;
  return { ...rest, id: newId(), transform, ...withGroup(group) };
}
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
    ? shapePolygon(e.shape.shape, e.shape.w, e.shape.h, e.style.width)
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
      return { pages: [pageId], ids: [id], removed: [] };
    });
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
      if (cell[key] === value) continue;
      cells.set(k, { ...cell, [key]: value });
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

  apply(cmd: Command): Change {
    switch (cmd.type) {
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
        const copy: FakePage = { ...src, id: newId(), elements: src.elements.map((e) => copyElement(e, groups, 0, 0)) };
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
      case "CommitStroke": {
        if (cmd.points.length < 3 || cmd.points.length % 3 !== 0 || !cmd.points.every((v) => Number.isFinite(v))) {
          throw new Error("points invalides");
        }
        if (!positive(cmd.style.width)) throw new Error(MESSAGES.badWidth);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          const { x0, y0, local } = toLocal(cmd.points);
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: translate(x0, y0), local, style: cmd.style });
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
        if (![cmd.x0, cmd.y0, cmd.x1, cmd.y1].every((v) => Number.isFinite(v))) throw new Error(MESSAGES.badShape);
        // Comme le cœur (constat 3 de T60) : la géométrie tirée des coins doit rester finie en f32.
        const g = normalizeShape(cmd.shape, cmd.x0, cmd.y0, cmd.x1, cmd.y1);
        if (![g.tx, g.ty, g.w, g.h].every((v) => Number.isFinite(Math.fround(v)))) throw new Error(MESSAGES.badShape);
        if (!positive(cmd.style.width)) throw new Error(MESSAGES.badWidth);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          s.pages.find((p) => p.id === cmd.page)?.elements.push({
            id,
            transform: translate(g.tx, g.ty),
            style: cmd.style,
            shape: { shape: cmd.shape, w: g.w, h: g.h, fill: cmd.fill },
          });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "SetText": {
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
            s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: translate(cmd.x, cmd.y), style, text });
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
        if (ids.length === 0 || isIdentity(m)) return this.unchanged();
        // Comme le cœur (constat 2 de T60) : chaque matrice composée suit la règle de `m`, avant toute étape.
        const composed = new Map(ids.map((id) => [id, composeMatrix(m, this.find(id)?.element.transform ?? m)]));
        if (![...composed.values()].every(validMatrix)) throw new Error(MESSAGES.badMatrix);
        const pages = [...new Set(ids.map((id) => this.find(id)?.page.id ?? ""))].sort();
        return this.step((s) => {
          for (const p of s.pages) {
            p.elements.forEach((e, i) => {
              const t = composed.get(e.id);
              if (t) p.elements[i] = { ...e, transform: t };
            });
          }
          return { pages, ids, removed: [] };
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
        return this.writeTable(found, cmd.id, { ...t, rows, cells });
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
            cells.set(cellKey(rows[Math.floor(i / cmd.cols)]?.id ?? "", cols[i % cmd.cols]?.id ?? ""), { text, spans: plainSpans(text), fill: null, shade: null, span });
          });
          
          return { color: cmd.color, size: cmd.size, cols, rows, cells };
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
        // `field_for` du cœur : contour = `color` d'un trait ou de toute forme ; intérieur = `fill` d'un rectangle ou d'une ellipse.
        const key = !inside && (e.local !== undefined || shape) ? "color" : inside && shape && !isSegment(shape.shape) ? "fill" : null;
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
    const e = this.find(id)?.element;
    if (!e || e.malformed) return null;
    const base = { id, transform: e.transform, ...withGroup(e.group) };
    if (e.unknown) return { ...base, kind: "unknown", unknown: { sourceKind: e.unknown.sourceKind, ...e.unknown.box } };
    if (e.image) return { ...base, kind: "image", image: e.image };
    if (e.media) return { ...base, kind: "media", media: e.media };
    if (e.model3d) return { ...base, kind: "model3d", model3d: e.model3d };
    if (e.fill) return { ...base, kind: "fill", fill: { color: e.fill.color, w: e.fill.w, h: e.fill.h } };
    if (e.table) return { ...base, kind: "table", table: tableView(e.table) };
    const styled = { ...base, style: e.style };
    if (e.shape) return { ...styled, kind: "shape", shape: e.shape };
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
      for (const e of p.elements) scanAssets({ ...e, text: undefined, local: undefined }, acc);
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
    // Miroir d'`edge_hit` (`fill.rs`) : tracé `shapePolygon(kind, w, h, 0)` porté par la matrice, arêtes seules (jamais
    // l'intérieur, à l'inverse de `polygonHit`), bande = tol + demi-épaisseur × (facteur de similitude, sinon racine du
    // déterminant ; pas la plus petite valeur singulière de `strokeHalfWidth`).
    const e = this.find(id)?.element;
    const s = e?.shape;
    if (!e || !s || isSegment(s.shape)) return false;
    const local = shapePolygon(s.shape, s.w, s.h, 0);
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
    const elements = p.elements.filter((e) => wanted.has(e.id)).map((e) => copyElement(e, groups, 0, 0));
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
    const copies = from.map((e) => copyElement(e, groups, dx, dy));
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
      elements: p.elements.map((e) => copyElement(e, groups, 0, 0)),
    }));
    const cited = src.citedAssets().map((a) => a.id);
    return this.step((s) => {
      s.pages.splice(at + 1, 0, ...pages);
      adoptMeta(s.assets, src.state.assets, cited);
      return { pages: pages.map((p) => p.id), ids: pages.flatMap((p) => p.elements.map((e) => e.id)), removed: [] };
    });
  }
  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi {
    const pts: number[] = [];
    void style;
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
}
interface SavedPage { id: string; elements: SavedElement[]; backdrop?: unknown; grid?: unknown; background?: unknown; mode?: unknown; height?: unknown }

function savedElement(e: FakeElement): SavedElement {
  const group = withGroup(e.group);
  if (e.malformed) {
    const { group: _stale, ...rest } = e.malformed; // le groupe vivant (Group, Ungroup) remplace celui lu
    return { id: e.id, ...rest, ...group } as SavedElement;
  }
  if (e.unknown) {
    return { id: e.id, kind: e.unknown.sourceKind, ...(e.unknown.hasTransform ? { transform: [...e.transform] } : e.unknown.rawTransform !== undefined ? { transform: e.unknown.rawTransform } : {}), raw: { ...e.unknown.raw }, ...group };
  }
  if (e.table) return { id: e.id, kind: "table", transform: [...e.transform], table: { ...e.table, cells: Object.fromEntries(e.table.cells) }, ...group };
  if (e.image) return { id: e.id, kind: "image", transform: [...e.transform], image: { ...e.imageRaw, ...e.image }, ...group };
  if (e.media) return { id: e.id, kind: "media", transform: [...e.transform], media: e.media, ...group };
  if (e.model3d) return { id: e.id, kind: "model3d", transform: [...e.transform], model3d: savedModel3d(e.model3d), ...group };
  if (e.fill) return { id: e.id, kind: "fill", transform: [...e.transform], fill: { color: e.fill.color, w: e.fill.w, h: e.fill.h, contours: e.fill.contours.map((r) => [...r]) }, ...group };
  return {
    id: e.id,
    transform: [...e.transform],
    style: e.style,
    ...(e.local ? { local: Array.from(e.local) } : {}),
    ...(e.shape ? { shape: e.shape } : {}),
    ...(e.text ? { text: e.text } : {}),
    ...group,
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
      const span = c["span"];
      const s = c["spans"];
      // C7b : segments lisibles normalisés ; JSON d'avant C7b ou segments illisibles : un segment (R16).
      const spans = Array.isArray(s) && validSpans(text, s as TextSpan[]) ? normalSpans(s as TextSpan[]) : plainSpans(text);
      cells.set(k, {
        text,
        spans,
        fill: typeof fill === "string" && validColor(fill) ? fill : null,
        shade: typeof shade === "string" && validColor(shade) ? shade : null,
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
  };
}

const toMatrix6 = (t: unknown): Matrix | null =>
  Array.isArray(t) && t.length === 6 && t.every((v) => typeof v === "number" && Number.isFinite(v)) ? (t as unknown as Matrix) : null;

function loadElement(e: SavedElement): FakeElement {
  const group = withGroup(readGroup(e.group));
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
    return { id: e.id, transform: t ?? IDENTITY, style: NO_STYLE, unknown, ...group };
  }
  if (e.kind === "table") {
    // Repli d'un tableau mal formé (T2) : cadre inconnu, jamais invisible ; brut gardé sous `raw.table`, réécrit tel quel.
    const source = e.table ?? e.raw?.["table"];
    const t = loadTable(source);
    const m = toMatrix6(e.transform);
    if (t !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, table: t, ...group };
    const raw = { table: source };
    const unknown: FakeUnknown = {
      sourceKind: "table",
      raw,
      box: unknownBox(raw),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group };
  }
  if (e.kind === "media") {
    // Repli du tableau, pas celui de l'image (C14, M7) : un média mal formé est un cadre inconnu, jamais invisible ;
    // brut gardé sous `raw.media`, réécrit tel quel, boîte lue dans le brut.
    const source = e.media ?? e.raw?.["media"];
    const media = readMedia(source);
    const m = toMatrix6(e.transform);
    if (media !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, media, ...group };
    const unknown: FakeUnknown = {
      sourceKind: "media",
      raw: { media: source },
      box: unknownBox(isRecord(source) ? source : {}),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group };
  }
  if (e.kind === "model3d") {
    // Repli du média, pas celui de l'image (C15, X8) : un objet 3D mal formé est un cadre inconnu, jamais invisible ;
    // brut gardé sous `raw.model3d`, réécrit tel quel, boîte lue dans le brut.
    const source = e.model3d ?? e.raw?.["model3d"];
    const model3d = readModel3d(source);
    const m = toMatrix6(e.transform);
    if (model3d !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, model3d, ...group };
    const unknown: FakeUnknown = {
      sourceKind: "model3d",
      raw: { model3d: source },
      box: unknownBox(isRecord(source) ? source : {}),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group };
  }
  if (e.kind === "fill") {
    // C8 (Q11) : repli du média, pas celui de l'image : un `fill` mal formé est un cadre inconnu de sa boîte, brut gardé
    // sous `raw.fill`, réécrit tel quel.
    const source = e.fill ?? e.raw?.["fill"];
    const fill = readFill(source);
    const m = toMatrix6(e.transform);
    if (fill !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, fill, ...group };
    const unknown: FakeUnknown = {
      sourceKind: "fill",
      raw: { fill: source },
      box: unknownBox(isRecord(source) ? source : {}),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group };
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
    return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, image, ...rawField, ...group };
  }
  return {
    id: e.id,
    transform: toMatrix6(e.transform) ?? IDENTITY,
    style: e.style ?? NO_STYLE,
    ...(e.local ? { local: new Float32Array(e.local) } : {}),
    ...(e.shape ? { shape: e.shape } : {}),
    ...(e.text ? { text: withSpans(e.text) } : {}),
    ...group,
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
