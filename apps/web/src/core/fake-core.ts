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
// chargement, là où le cœur les garde dans le document.
// C3 : chemin group (Group, Ungroup), extract, insertFragment, insertPages, fragments JSON { kind: "fragment", name, … } ;
// mêmes refus et messages que le cœur, dans le même ordre, joués par le bloc « contrat C3 » (aucun écart exclu). Group : un
// id d'un groupe vaut tout son groupe extérieur ; le type du fichier (kind) se lit avant son contenu.
// C10b : fusion (`span` sur l'ancre, zones par `mergesOf`, miroir de `merges_of` du cœur, règle F2), division, ombrage
// (`shade`), plages de RemoveTableLine et SetTableFill, report des zones (F6), hauteur d'une ancre haute (F7),
// ImportTable (F18) : mêmes refus dans le même ordre que `table.rs`, une étape par commande, aucune étape vide.
import type {
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
  LevelLines,
  Matrix,
  PageView,
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
} from "./api";
import {
  BAD_GROUP_MESSAGE,
  DEFAULT_ASSET_MIME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_LINE_WIDTH,
  DEFAULT_TABLE_COLOR,
  DEFAULT_TABLE_SIZE,
  MAX_GRID_DOTS,
  MAX_GRID_LEVELS,
  MAX_GRID_LINE_WIDTH,
  MIN_GRID_LINE_WIDTH,
  MIXED_SOURCE_MESSAGE,
  NOT_A_DOCUMENT_MESSAGE,
  NOT_A_FRAGMENT_MESSAGE,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TABLE_MAX_LINES,
  UNKNOWN_BOX,
  unknownKindMessage,
} from "./api";
import { isAssetId } from "./asset-store";
import { cleanPatch, editSpans, formatSpans, normalSpans, plainSpans, sameSpans, utf16Bounds, validColor, validPatch, validSpans } from "./rich-text";
import { applyMatrix, boxPolygon, composeMatrix, isIdentity, normalizeShape, shapePolygon, translateMatrix as translate } from "./shapes";

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
/** `grid` : valeur brute lue ou écrite (G13), null sans grille ; vue par `gridView`. */
interface FakePage { readonly id: string; readonly elements: FakeElement[]; backdrop: RawRecord | null; grid: unknown }
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
  badGroup: BAD_GROUP_MESSAGE,
} as const;

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const NO_STYLE: StrokeStyle = { color: "", width: 0 };
/** Kinds lus par la fausse liaison : même liste que `KNOWN_KINDS` du cœur (`element.rs`). */
export const KNOWN_KINDS: ReadonlySet<string> = new Set(["stroke", "shape", "text", "image", "table"]);
const finitePositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** Même règle que le cœur (`BadAsset`) : empreinte conforme, type non vide, taille entière ≥ 0. */
const validAsset = (a: AssetRef): boolean => isAssetId(a.id) && a.mime !== "" && Number.isInteger(a.size) && a.size >= 0;
const clone = (s: State): State => ({
  pages: s.pages.map((p) => ({ id: p.id, elements: [...p.elements], backdrop: p.backdrop, grid: p.grid })),
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
const putMeta = (assets: Map<string, unknown>, a: AssetRef): void => {
  if (!assets.has(a.id)) assets.set(a.id, { name: a.name, mime: a.mime, size: a.size });
};
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

/** Fond vu comme par le cœur (K6, K9) : null sans asset conforme ; rect sur la largeur si w et h sont lisibles. */
function backdropView(raw: RawRecord | null, width: number): BackdropView | null {
  if (raw === null) return null;
  const { asset, kind, w, h, fit } = raw;
  if (!isAssetId(asset)) return null;
  const bw = finitePositive(w) ? w : null;
  const bh = finitePositive(h) ? h : null;
  return {
    asset,
    kind: typeof kind === "string" ? kind : "",
    w: bw,
    h: bh,
    fit: typeof fit === "string" ? fit : "",
    rect: bw !== null && bh !== null ? { x0: 0, y0: 0, x1: width, y1: (bh * width) / bw } : null,
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
        ? boxPolygon(e.image.w, e.image.h)
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

function polyOutline(points: Float32Array, dx: number, dy: number): Float32Array {
  const out: number[] = [];
  for (let i = 0; i + 2 < points.length; i += 3) out.push((points[i] ?? 0) + dx, (points[i + 1] ?? 0) + dy);
  return new Float32Array(out);
}

interface Found { readonly page: FakePage; readonly index: number; readonly element: FakeElement }

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

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "AddPage": {
        const after = cmd.after;
        if (after !== null) this.pageOf(after);
        return this.step((s) => {
          const id = newId();
          const at = after === null ? s.pages.length : s.pages.findIndex((p) => p.id === after) + 1;
          s.pages.splice(at, 0, { id, elements: [], backdrop: null, grid: null });
          return { pages: [id], ids: [], removed: [] };
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
    }
  }

  element(id: string): ElementView | null {
    const e = this.find(id)?.element;
    if (!e || e.malformed) return null;
    const base = { id, transform: e.transform, ...withGroup(e.group) };
    if (e.unknown) return { ...base, kind: "unknown", unknown: { sourceKind: e.unknown.sourceKind, ...e.unknown.box } };
    if (e.image) return { ...base, kind: "image", image: e.image };
    if (e.table) return { ...base, kind: "table", table: tableView(e.table) };
    const styled = { ...base, style: e.style };
    if (e.shape) return { ...styled, kind: "shape", shape: e.shape };
    if (e.text) return { ...styled, kind: "text", text: e.text };
    return { ...styled, kind: "stroke" };
  }
  page(id: string): PageView | null {
    const p = this.state.pages.find((q) => q.id === id);
    if (!p) return null;
    return { id, width: PAGE_WIDTH, height: PAGE_HEIGHT, background: "#ffffff", backdrop: backdropView(p.backdrop, PAGE_WIDTH), grid: gridView(p.grid) };
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
  hitTest(page: string, x: number, y: number, tol: number): string | null {
    const els = this.pageOf(page).elements;
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      if (!e) continue;
      const poly = worldPolygon(e);
      if (poly ? polygonHit(poly, x, y, tol) : strokeTouches(e, new Float32Array([x, y]), tol)) return e.id;
    }
    return null;
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
      pages: this.state.pages.map((p) => ({ id: p.id, backdrop: p.backdrop, elements: p.elements.map(savedElement), ...(p.grid !== null ? { grid: p.grid } : {}) })),
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
  extract(page: string, ids: readonly string[]): CoreDocument {
    // Ordre du cœur : page inconnue, puis premier id absent de la page.
    const p = this.pageOf(page);
    for (const id of ids) if (!p.elements.some((e) => e.id === id)) throw new Error(`élément inconnu : ${id}`);
    const wanted = new Set(ids);
    const groups = new Map<string, string>();
    const elements = p.elements.filter((e) => wanted.has(e.id)).map((e) => copyElement(e, groups, 0, 0));
    const out = new FakeDocument({ pages: [{ id: newId(), elements, backdrop: null, grid: null }], assets: new Map() });
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
      id: newId(),
      elements: p.elements.map((e) => copyElement(e, groups, 0, 0)),
      backdrop: p.backdrop,
      grid: p.grid,
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
      push: (p: Float32Array) => { pts.push(...p); return polyOutline(new Float32Array(pts), 0, 0); },
      finish: () => polyOutline(new Float32Array(pts), 0, 0),
      free: () => undefined,
    };
  }
  free(): void { /* rien à libérer */ }
  snapPoint(page: string, x: number, y: number): readonly [number, number] | null {
    const g = this.gridOfPage(page);
    return g === null ? null : snapSquares(g, PAGE_WIDTH, x, y);
  }
  snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number] {
    const g = this.gridOfPage(page);
    const b = this.snapBox(ids);
    if (g === null || b === null) return [dx, dy];
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    let best: [number, number] | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [cx, cy]] as const) {
      const c0 = x + dx;
      const c1 = y + dy;
      const q = snapSquares(g, PAGE_WIDTH, c0, c1);
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
    return g === null ? null : squaresLines(g, PAGE_WIDTH, rect, minStep);
  }
  gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number): GridLines | null {
    void minDotStep; // points : vrai module seulement (DAG3)
    if (!this.state.pages.some((q) => q.id === page)) return null;
    return squaresLines(grid, PAGE_WIDTH, rect, minStep);
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
  /** Écrit : `SavedTable` ; lu : valeur brute, contrôlée par `loadTable`. */
  table?: SavedTable | unknown;
  /** Champs bruts d'un élément inconnu, réécrits tels quels. */
  raw?: Record<string, unknown>;
  /** C3 : lu par `readGroup` ; illisible : retiré (PC6). */
  group?: unknown;
}
interface SavedPage { id: string; elements: SavedElement[]; backdrop?: unknown; grid?: unknown }

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
  if (e.image) return { id: e.id, kind: "image", transform: [...e.transform], image: e.image, ...group };
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
  if (e.kind === "image") {
    const im: unknown = e.image;
    const ok = isRecord(im) && isAssetId(im["asset"]) && finitePositive(im["w"]) && finitePositive(im["h"]);
    if (!ok) {
      const { id: _id, ...rest } = e;
      return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, malformed: rest, ...group };
    }
  }
  if (e.kind === "image" && e.image) return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, image: e.image, ...group };
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

function loadFake(bytes: Uint8Array, expected: "document" | "fragment" = "document"): CoreDocument {
  // Même message que le cœur (`FormatError::NotRoomboard`) : le lot 3 l'affiche tel quel.
  const notRoomboard = "ce fichier n'est pas un document RoomBoard";
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(notRoomboard);
  }
  if (!isRecord(raw)) throw new Error(notRoomboard);
  // C3 : le type se lit à l'ouverture, avant le contenu (un fichier d'un type à venir n'a pas à porter `pages`) ;
  // kind absent : document d'avant C3. Le mauvais type est refusé une fois le contenu reconnu.
  const kind = raw["kind"] ?? "document";
  if (kind !== "document" && kind !== "fragment") throw new Error(unknownKindMessage(String(kind)));
  if (!Array.isArray(raw["pages"])) throw new Error(notRoomboard);
  if (kind !== expected) throw new Error(expected === "document" ? NOT_A_DOCUMENT_MESSAGE : NOT_A_FRAGMENT_MESSAGE);
  const pages = (raw["pages"] as SavedPage[]).map((p) => ({
    id: p.id,
    elements: p.elements.map(loadElement),
    backdrop: isRecord(p.backdrop) ? p.backdrop : null,
    // Brute, quelle qu'elle soit (G13) : réécrite telle quelle ; `gridView` décide de la vue.
    grid: p.grid ?? null,
  }));
  const assets = new Map(isRecord(raw["assets"]) ? Object.entries(raw["assets"]) : []);
  return new FakeDocument({ pages, assets });
}

export const fakeCore: CoreFactory = {
  blank: () => new FakeDocument({ pages: [{ id: newId(), elements: [], backdrop: null, grid: null }], assets: new Map() }),
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

/** `snap_axis` du cœur : ligne la plus proche, bornée à la première `≥ 0` et, si `hi` est donné, à la dernière `≤ hi`. */
function snapAxis(v: number, o: number, step: number, hi: number | null): number | null {
  const first = Math.ceil(-o / step - GRID_EPS);
  const last = hi === null ? Number.POSITIVE_INFINITY : Math.floor((hi - o) / step + GRID_EPS);
  if (Number.isNaN(first) || Number.isNaN(last) || first > last) return null;
  return o + Math.min(Math.max(roundHalfAway((v - o) / step), first), last) * step;
}

/** Accroche des seuls carreaux (DAG3), même règle que `grid::snap_point`. */
function snapSquares(g: GridView, width: number, x: number, y: number): readonly [number, number] | null {
  if (!g.snap) return null;
  let best: readonly [number, number] | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const l of g.levels) {
    if (!l.snap || l.kind !== "squares") continue;
    const qx = snapAxis(x, l.originX, l.spacingX, width);
    const qy = snapAxis(y, l.originY, l.spacingY, null);
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

/** Lignes des seuls carreaux (DAG3), mêmes segments que `grid::lines`. */
function squaresLines(g: GridView, width: number, r: Bounds, minStep: number): GridLines | null {
  if (!g.visible) return null;
  const levels: LevelLines[] = [];
  const finite = [r.x0, r.y0, r.x1, r.y1, width].every((v) => Number.isFinite(v));
  const c = { x0: Math.max(r.x0, 0), y0: Math.max(r.y0, 0), x1: Math.min(r.x1, width), y1: r.y1 };
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
