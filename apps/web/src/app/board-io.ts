/**
 * Tableaux interactifs côté page (C13, DA2, D6, D7, D8b, D18) : flux BoardList du module `formats` ↔ commandes du cœur.
 * Lecture : `decodeBoardList` contrôle le flux (même règle que `board::parse` du Rust, flux témoin W1 commun), puis
 * `buildBoardDocument` applique les commandes existantes sur un document jetable et rend une copie sans historique
 * (`saveParts` → `loadParts`, comme l'export PDF). Écriture : `boardListOf` lit l'onglet (vues du cœur, points locaux
 * placés par `transform`) et code le flux que `write_board_xml` écrit. Aucune commande de cœur neuve ; aucun DOM.
 * Table des codes : `docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md`, « Table des codes du flux BoardList ».
 */
import { DEFAULT_BACKGROUND, PAGE_WIDTH, type AssetRef, type Change, type Command, type CoreDocument, type CoreFactory, type ElementView, type Matrix, type ShapeKind, type TextSpan } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { applyMatrix, composeMatrix } from "../core/shapes";
import { BOARD_OBJECTS_MESSAGE, normalBoardPath, type BoardDialect, type BoardPart, type BoardReadOptions, type BoardSourceFormat } from "../platform/board-reader";
import type { ImageKind } from "../platform/image-decode";
import { IMAGE_MIME, type ImageDecoder } from "../platform/image-import";
import type { OlfPart, ZipFile } from "../platform/zip-read";
import { MISSING_LABEL, SKIPPED_LABEL } from "./board-files";
import { typed } from "./container-io";

/** Dialectes que le module `formats` lit et écrit. */
export type BoardFormat = "iwb" | "ubz";
/** C13 (N5) : format lu à l'import (plus large que le format d'export). */
export type { BoardSourceFormat };
/** Même borne que `MAX_GROUP_DEPTH` de `board::parse` (board.rs). */
export const MAX_GROUP_DEPTH = 256;
export const BOARD_OP = { page: 1, background: 2, shape: 3, stroke: 4, text: 5, image: 6, groupBegin: 7, groupEnd: 8 } as const;
export const BOARD_BAD_LIST_PREFIX = "liste de tableau invalide : ";
/** Code de chaque forme dans le flux ; `satisfies` oblige à en donner un à chaque `ShapeKind`. */
const SHAPE_CODE = { rect: 0, ellipse: 1, line: 2, arrow: 3 } satisfies Record<ShapeKind, number>;
const SHAPES = (Object.keys(SHAPE_CODE) as ShapeKind[]).sort((a, b) => SHAPE_CODE[a] - SHAPE_CODE[b]);
export const MAX_POINTS = 1_000_000;
export const MAX_SPANS = 10_000;
const MAX_INDEX = 16_777_216;

export type BoardObject =
  | { readonly kind: "shape"; readonly shape: ShapeKind; readonly m: Matrix; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly color: string; readonly width: number; readonly fill: string | null }
  | { readonly kind: "stroke"; readonly m: Matrix; readonly color: string; readonly width: number; readonly points: readonly number[] }
  | { readonly kind: "text"; readonly m: Matrix; readonly x: number; readonly y: number; readonly boxWidth: number; readonly boxHeight: number; readonly size: number; readonly color: string; readonly spans: readonly TextSpan[] }
  | { readonly kind: "image"; readonly m: Matrix; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly path: string }
  | { readonly kind: "group"; readonly children: readonly BoardObject[] };

export interface BoardListPage {
  readonly background: string | null;
  readonly objects: readonly BoardObject[];
}
export interface BoardListData {
  readonly ops: Float32Array;
  readonly texts: string[];
}
/** Ports de l'espace de travail (amorce : Worker ZIP en mode `board`, Worker jetable du module `formats`). */
export interface BoardPorts {
  unzip(blob: Blob): Promise<readonly { readonly path: string; readonly blob: Blob }[]>;
  /** C13 lot 3 : conteneur Bamboo d'un `.flipchart` lu par le Worker ZIP en mode `bamboo` (bornes de `BAMBOO_LIMITS`). */
  unbamboo(blob: Blob): Promise<readonly { readonly path: string; readonly blob: Blob }[]>;
  zip(files: readonly ZipFile[]): Promise<Uint8Array>;
  /** C13 lot 3 : paperboard lu en entier par `FlipchartReader` (une seule partie, toutes les pages). */
  readFlipchart(entries: readonly { readonly path: string; readonly bytes: Uint8Array }[]): Promise<BoardPart>;
  read(files: readonly Uint8Array[], dialect: BoardDialect, opts?: BoardReadOptions): Promise<readonly BoardPart[]>;
  /** C13 lot 2 : `content.json` d'un `.olf` lu dans le Worker ZIP (jamais de `JSON.parse` sur la page). */
  readOlf(json: Blob): Promise<OlfPart>;
  write(list: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardFormat): Promise<readonly ZipFile[]>;
}

const bad = (m: string): Error => new Error(`${BOARD_BAD_LIST_PREFIX}${m}`);
const hex2 = (v: number): string => v.toString(16).padStart(2, "0");
export const hexOf = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
/** `#rrggbb` (une couleur du cœur) ; toute autre forme : noir. */
export function rgbOf(color: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color);
  return m === null ? [0, 0, 0] : [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

class Cursor {
  i = 0;
  constructor(
    private readonly v: ArrayLike<number>,
    private readonly texts: readonly string[],
  ) {}
  done(): boolean {
    return this.i >= this.v.length;
  }
  num(): number {
    if (this.i >= this.v.length) throw bad(`flux coupé à ${this.i}`);
    const x = this.v[this.i++]!;
    if (!Number.isFinite(x)) throw bad(`nombre non fini à ${this.i - 1}`);
    return x;
  }
  int(max: number): number {
    const x = this.num();
    if (x < 0 || !Number.isInteger(x) || x > max) throw bad(`entier de 0 à ${max} attendu à ${this.i - 1}`);
    return x;
  }
  mat(): Matrix {
    return [this.num(), this.num(), this.num(), this.num(), this.num(), this.num()];
  }
  rgb(): string {
    return hexOf(this.int(255), this.int(255), this.int(255));
  }
  /** −1, −1, −1 : absente. */
  optRgb(): string | undefined {
    if ((this.v[this.i] ?? 0) < 0) {
      this.absent();
      this.absent();
      this.absent();
      return undefined;
    }
    return this.rgb();
  }
  /** Marque d'absence : exactement −1 (`absent()` de `board::parse`). */
  private absent(): void {
    const x = this.num();
    if (x !== -1) throw bad(`marque d'absence −1 attendue à ${this.i - 1}, lu ${x}`);
  }
  text(): string {
    const k = this.int(MAX_INDEX);
    const t = this.texts[k];
    if (t === undefined) throw bad(`texte ${k} absent`);
    return t;
  }
  /** −1 : absent. */
  optText(): string | undefined {
    if ((this.v[this.i] ?? 0) < 0) {
      this.absent();
      return undefined;
    }
    return this.text();
  }
  shape(): BoardObject {
    const k = this.int(3);
    const m = this.mat();
    const x0 = this.num();
    const y0 = this.num();
    const x1 = this.num();
    const y1 = this.num();
    const color = this.rgb();
    const width = this.num();
    let fill: string | null = null;
    if (this.int(1) === 1) {
      fill = this.rgb();
    } else {
      this.num();
      this.num();
      this.num();
    }
    return { kind: "shape", shape: SHAPES[k]!, m, x0, y0, x1, y1, color, width, fill };
  }
  stroke(): BoardObject {
    const m = this.mat();
    const color = this.rgb();
    const width = this.num();
    const n = this.int(MAX_POINTS);
    const points: number[] = [];
    for (let k = 0; k < 3 * n; k++) points.push(this.num());
    return { kind: "stroke", m, color, width, points };
  }
  textObject(): BoardObject {
    const m = this.mat();
    const x = this.num();
    const y = this.num();
    const boxWidth = this.num();
    const boxHeight = this.num();
    const size = this.num();
    const color = this.rgb();
    const n = this.int(MAX_SPANS);
    const spans: TextSpan[] = [];
    for (let k = 0; k < n; k++) {
      const text = this.text();
      const flags = this.int(7);
      const z = this.num();
      if (z < 0) throw bad(`taille de segment négative à ${this.i - 1}`);
      const c = this.optRgb();
      const font = this.optText();
      spans.push({
        text,
        attrs: {
          ...(flags & 1 ? { bold: true as const } : {}),
          ...(flags & 2 ? { italic: true as const } : {}),
          ...(flags & 4 ? { underline: true as const } : {}),
          ...(c !== undefined ? { color: c } : {}),
          ...(z > 0 ? { size: z } : {}),
          ...(font !== undefined ? { font } : {}),
        },
      });
    }
    return { kind: "text", m, x, y, boxWidth, boxHeight, size, color, spans };
  }
  image(): BoardObject {
    const m = this.mat();
    const x = this.num();
    const y = this.num();
    const w = this.num();
    const h = this.num();
    const path = this.text();
    return { kind: "image", m, x, y, w, h, path };
  }
}

/** Flux contrôlé en entier ; tout défaut lève `liste de tableau invalide : …` (règles de `board::parse`). Plus de `budget`
 *  objets (feuilles) : lève `BOARD_OBJECTS_MESSAGE` dès le premier de trop. */
export function decodeBoardList(ops: ArrayLike<number>, texts: readonly string[], budget: number = Number.POSITIVE_INFINITY): BoardListPage[] {
  let leaves = 0;
  const c = new Cursor(ops, texts);
  const pages: Array<{ background: string | null; objects: BoardObject[] }> = [];
  const stack: BoardObject[][] = [];
  const push = (o: BoardObject): void => {
    // D16 : feuilles seules ; contrôlé à chaque objet, avant que le flux entier ne devienne des objets.
    if (o.kind !== "group" && ++leaves > budget) throw new Error(BOARD_OBJECTS_MESSAGE);
    const top = stack.at(-1);
    if (top !== undefined) {
      top.push(o);
      return;
    }
    const page = pages.at(-1);
    if (page === undefined) throw bad("objet avant la première page");
    page.objects.push(o);
  };
  while (!c.done()) {
    const at = c.i;
    const code = c.int(8);
    switch (code) {
      case BOARD_OP.page:
        if (stack.length > 0) throw bad(`groupe ouvert à la page suivante (${at})`);
        pages.push({ background: null, objects: [] });
        break;
      case BOARD_OP.background: {
        const bg = c.rgb();
        const page = pages.at(-1);
        if (page === undefined) throw bad("fond avant la première page");
        page.background = bg;
        break;
      }
      case BOARD_OP.shape:
        push(c.shape());
        break;
      case BOARD_OP.stroke:
        push(c.stroke());
        break;
      case BOARD_OP.text:
        push(c.textObject());
        break;
      case BOARD_OP.image:
        push(c.image());
        break;
      case BOARD_OP.groupBegin:
        if (pages.length === 0) throw bad("groupe avant la première page");
        if (stack.length >= MAX_GROUP_DEPTH) throw bad(`groupes imbriqués trop profonds (${at})`);
        stack.push([]);
        break;
      case BOARD_OP.groupEnd: {
        const children = stack.pop();
        if (children === undefined) throw bad(`fin de groupe sans début (${at})`);
        push({ kind: "group", children });
        break;
      }
      default:
        throw bad(`code inconnu ${code} à ${at}`);
    }
  }
  if (stack.length > 0) throw bad("groupe non fermé");
  return pages;
}

/** Flux d'un tableau à écrire ; textes internés à leur première apparition (règle de `board::encode`). */
export function encodeBoardList(pages: readonly BoardListPage[]): BoardListData {
  const ops: number[] = [];
  const texts: string[] = [];
  const index = new Map<string, number>();
  const text = (s: string): number => {
    let k = index.get(s);
    if (k === undefined) {
      k = texts.length;
      texts.push(s);
      index.set(s, k);
    }
    return k;
  };
  const rgb = (color: string): void => {
    const [r, g, b] = rgbOf(color);
    ops.push(r, g, b);
  };
  const mat = (m: Matrix): void => {
    ops.push(m[0], m[1], m[2], m[3], m[4], m[5]);
  };
  const obj = (o: BoardObject): void => {
    switch (o.kind) {
      case "shape":
        ops.push(BOARD_OP.shape, SHAPE_CODE[o.shape]);
        mat(o.m);
        ops.push(o.x0, o.y0, o.x1, o.y1);
        rgb(o.color);
        ops.push(o.width);
        if (o.fill === null) {
          ops.push(0, 0, 0, 0);
        } else {
          ops.push(1);
          rgb(o.fill);
        }
        return;
      case "stroke":
        ops.push(BOARD_OP.stroke);
        mat(o.m);
        rgb(o.color);
        ops.push(o.width, o.points.length / 3);
        for (const v of o.points) ops.push(v);
        return;
      case "text":
        ops.push(BOARD_OP.text);
        mat(o.m);
        ops.push(o.x, o.y, o.boxWidth, o.boxHeight, o.size);
        rgb(o.color);
        ops.push(o.spans.length);
        for (const s of o.spans) {
          const t = text(s.text);
          const a = s.attrs;
          ops.push(t, (a.bold ? 1 : 0) + (a.italic ? 2 : 0) + (a.underline ? 4 : 0), a.size ?? 0);
          if (a.color === undefined) ops.push(-1, -1, -1);
          else rgb(a.color);
          ops.push(a.font === undefined ? -1 : text(a.font));
        }
        return;
      case "image": {
        ops.push(BOARD_OP.image);
        mat(o.m);
        const k = text(o.path);
        ops.push(o.x, o.y, o.w, o.h, k);
        return;
      }
      case "group":
        ops.push(BOARD_OP.groupBegin);
        for (const c of o.children) obj(c);
        ops.push(BOARD_OP.groupEnd);
        return;
    }
  };
  for (const p of pages) {
    ops.push(BOARD_OP.page);
    if (p.background !== null) {
      ops.push(BOARD_OP.background);
      rgb(p.background);
    }
    for (const o of p.objects) obj(o);
  }
  return { ops: Float32Array.from(ops), texts };
}

export interface BoardBuildDeps {
  makeAssets(): AssetStore;
  readonly decode: ImageDecoder;
  /** Manifeste de la copie sans historique (`saveParts`). */
  readonly now: string;
  readonly appVersion: string;
}

export const skippedMessage = (page: number, n: number): string => `page ${page} : ${n} ${SKIPPED_LABEL[n > 1 ? 1 : 0]}`;
export const missingImagesMessage = (page: number, n: number): string => `page ${page} : ${n} ${MISSING_LABEL[n > 1 ? 1 : 0]}`;

const IMAGE_KIND_OF_EXT: Readonly<Record<string, ImageKind>> = { png: "png", jpg: "jpeg", jpeg: "jpeg", gif: "gif", webp: "webp", bmp: "bmp", svg: "svg" };
const extOf = (path: string): string => {
  const b = path.slice(path.lastIndexOf("/") + 1);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i + 1).toLowerCase() : "";
};

/** Entrée du ZIP citée par `path` : à l'identique, sinon sans tenir compte de la casse (ZIP écrits sous Windows). */
export function mediaOf(media: ReadonlyMap<string, Blob>, path: string): Blob | undefined {
  const p = normalBoardPath(path);
  const exact = media.get(p);
  if (exact !== undefined) return exact;
  const lower = p.toLowerCase();
  for (const [k, v] of media) if (normalBoardPath(k).toLowerCase() === lower) return v;
  return undefined;
}

const finite = (...v: number[]): boolean => v.every((x) => Number.isFinite(x));
const positive = (x: number): boolean => Number.isFinite(x) && x > 0;
const det = (m: Matrix): number => m[0] * m[3] - m[1] * m[2];
/** Matrice que le cœur accepte (`valid_matrix` : six nombres finis, |dét| ≥ 1e-12). */
const validMatrix = (m: Matrix): boolean => finite(...m) && Math.abs(det(m)) >= 1e-12;
const isIdentity = (m: Matrix): boolean => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;
/** Échelle uniforme positive sans rotation : repliée dans la géométrie (taille de texte, épaisseur lisibles à l'édition). */
const uniform = (m: Matrix): number | null => (m[1] === 0 && m[2] === 0 && m[0] > 0 && Math.abs(m[0] - m[3]) <= 1e-6 * m[0] ? m[0] : null);

interface PageNotes {
  skipped: number;
  missing: number;
}
interface Ctx {
  readonly draft: CoreDocument;
  readonly page: string;
  readonly media: ReadonlyMap<string, Blob>;
  readonly assets: AssetStore;
  /** Magasin jetable : calcule l'empreinte et garde le Blob jusqu'à l'acceptation de la commande. */
  readonly scratch: AssetStore;
  readonly decode: ImageDecoder;
  readonly notes: PageNotes;
}

/** D8b : une commande refusée malgré les contrôles compte comme objet illisible, jamais comme un échec du fichier. */
function run(ctx: Ctx, cmd: Command): Change | null {
  try {
    return ctx.draft.apply(cmd);
  } catch {
    ctx.notes.skipped++;
    return null;
  }
}

/** Pose `cmd`, puis compose `m` (Transform : m ∘ placement de la commande) ; matrice refusée : objet retiré, compté. */
function placed(ctx: Ctx, cmd: Command, m: Matrix | null): string[] {
  const ch = run(ctx, cmd);
  if (ch === null) return [];
  const ids = [...ch.ids];
  if (m === null || isIdentity(m) || ids.length === 0) return ids;
  if (run(ctx, { type: "Transform", ids, matrix: m }) !== null) return ids;
  try {
    ctx.draft.apply({ type: "Delete", ids });
  } catch {
    // déjà absent
  }
  return [];
}

async function placeImage(ctx: Ctx, o: Extract<BoardObject, { kind: "image" }>): Promise<string[]> {
  const kind = IMAGE_KIND_OF_EXT[extOf(o.path)];
  const blob = mediaOf(ctx.media, o.path);
  if (kind === undefined || blob === undefined) {
    ctx.notes.missing++;
    return [];
  }
  if (!validMatrix(o.m) || !finite(o.x, o.y) || !positive(o.w) || !positive(o.h)) {
    ctx.notes.skipped++;
    return [];
  }
  const mime = IMAGE_MIME[kind];
  const file = typed(blob, mime);
  let w: number;
  let h: number;
  try {
    const d = await ctx.decode(file, kind);
    w = d.w;
    h = d.h;
    d.bitmap.close();
  } catch {
    ctx.notes.skipped++;
    return [];
  }
  if (!positive(w) || !positive(h)) {
    ctx.notes.skipped++;
    return [];
  }
  const id = await ctx.scratch.put(file); // empreinte seule : l'asset n'entre dans le magasin que si AddImage est accepté
  const asset: AssetRef = { id, name: o.path.slice(o.path.lastIndexOf("/") + 1), mime, size: file.size };
  const ids = placed(ctx, { type: "AddImage", page: ctx.page, asset, w, h, matrix: composeMatrix(o.m, [o.w / w, 0, 0, o.h / h, o.x, o.y]) }, null);
  if (ids.length > 0) ctx.assets.adopt(id, ctx.scratch.get(id)!);
  return ids;
}

/** Ids écrits pour `o` (tous les objets d'un groupe) ; un groupe de deux unités au moins devient `Group` (D13). */
async function place(ctx: Ctx, o: BoardObject): Promise<string[]> {
  switch (o.kind) {
    case "group": {
      const ids: string[] = [];
      let units = 0;
      for (const c of o.children) {
        const got = await place(ctx, c);
        if (got.length > 0) {
          ids.push(...got);
          units++;
        }
      }
      if (units >= 2) {
        try {
          ctx.draft.apply({ type: "Group", ids });
        } catch {
          // groupe refusé : les objets restent, seuls
        }
      }
      return ids;
    }
    case "shape": {
      if (!validMatrix(o.m) || !finite(o.x0, o.y0, o.x1, o.y1) || !positive(o.width)) {
        ctx.notes.skipped++;
        return [];
      }
      const s = uniform(o.m);
      const at = (x: number, y: number): [number, number] => (s === null ? [x, y] : applyMatrix(o.m, x, y));
      const [x0, y0] = at(o.x0, o.y0);
      const [x1, y1] = at(o.x1, o.y1);
      const style = { color: o.color, width: s === null ? o.width : o.width * s };
      return placed(ctx, { type: "AddShape", page: ctx.page, shape: o.shape, x0, y0, x1, y1, style, fill: o.fill }, s === null ? o.m : null);
    }
    case "stroke": {
      const p = o.points;
      if (!validMatrix(o.m) || p.length === 0 || p.length % 3 !== 0 || !p.every((v) => Number.isFinite(v)) || !positive(o.width)) {
        ctx.notes.skipped++;
        return [];
      }
      const world = new Float32Array(p.length);
      for (let i = 0; i < p.length; i += 3) {
        const [x, y] = applyMatrix(o.m, p[i]!, p[i + 1]!);
        world[i] = x;
        world[i + 1] = y;
        world[i + 2] = p[i + 2]!;
      }
      const style = { color: o.color, width: o.width * Math.sqrt(Math.abs(det(o.m))) };
      return placed(ctx, { type: "CommitStroke", page: ctx.page, points: world, style }, null);
    }
    case "text": {
      const content = o.spans.map((sp) => sp.text).join("");
      if (content === "") return [];
      if (!validMatrix(o.m) || !finite(o.x, o.y) || !positive(o.size) || !positive(o.boxWidth) || !positive(o.boxHeight)) {
        ctx.notes.skipped++;
        return [];
      }
      const s = uniform(o.m);
      const k = s ?? 1;
      const [x, y] = s === null ? [o.x, o.y] : applyMatrix(o.m, o.x, o.y);
      const spans: TextSpan[] = o.spans.map((sp) => (s === null || sp.attrs.size === undefined ? sp : { text: sp.text, attrs: { ...sp.attrs, size: sp.attrs.size * k } }));
      const cmd: Command = { type: "SetText", page: ctx.page, id: null, x, y, content, color: o.color, size: o.size * k, boxWidth: o.boxWidth * k, boxHeight: o.boxHeight * k, spans };
      return placed(ctx, cmd, s === null ? o.m : null);
    }
    case "image":
      return placeImage(ctx, o);
  }
}

/** D7 : document jetable, commandes existantes, puis copie sans historique ; avertissements D8b et images absentes. */
export async function buildBoardDocument(
  core: CoreFactory,
  pages: readonly BoardListPage[],
  media: ReadonlyMap<string, Blob>,
  deps: BoardBuildDeps,
): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }> {
  const assets = deps.makeAssets();
  const scratch = deps.makeAssets();
  const draft = core.blank();
  const warnings: string[] = [];
  try {
    let page = draft.pageIds()[0];
    if (page === undefined) throw new Error("document vierge sans page");
    for (const [i, p] of pages.entries()) {
      if (i > 0) {
        const prev: string = page;
        draft.apply({ type: "AddPage", after: prev });
        const ids = draft.pageIds();
        page = ids[ids.indexOf(prev) + 1] ?? prev;
      }
      const notes: PageNotes = { skipped: 0, missing: 0 };
      const ctx: Ctx = { draft, page, media, assets, scratch, decode: deps.decode, notes };
      if (p.background !== null) run(ctx, { type: "Fill", page, target: { kind: "background" }, color: p.background });
      for (const o of p.objects) await place(ctx, o);
      if (notes.skipped > 0) warnings.push(skippedMessage(i + 1, notes.skipped));
      if (notes.missing > 0) warnings.push(missingImagesMessage(i + 1, notes.missing));
    }
    const [manifest, ybin] = draft.saveParts(deps.now, deps.appVersion);
    return { doc: core.loadParts(manifest, ybin), assets, warnings };
  } finally {
    draft.free();
  }
}

/** D18 : ce que la copie n'écrit pas, compté par sorte ; ordre des avertissements = ordre de cette table. */
const EXPORT_LABELS: ReadonlyArray<readonly [string, string, string]> = [
  ["table", "tableau non exporté", "tableaux non exportés"],
  ["media", "vidéo ou son non exporté", "vidéos ou sons non exportés"],
  ["model3d", "objet 3D non exporté", "objets 3D non exportés"],
  ["fill", "zone remplie au pot non exportée", "zones remplies au pot non exportées"],
  ["unknown", "objet inconnu non exporté", "objets inconnus non exportés"],
  ["backdrop", "fond PDF non exporté", "fonds PDF non exportés"],
  ["params", "réglage d'image non exporté (image d'origine écrite)", "réglages d'image non exportés (images d'origine écrites)"],
  ["arrow", "flèche écrite en ligne (.ubz)", "flèches écrites en lignes (.ubz)"],
  ["outside", "objet hors du cadre (coordonnées négatives ou au-delà de 1 920)", "objets hors du cadre (coordonnées négatives ou au-delà de 1 920)"],
];
const EXT_OF_MIME: Readonly<Record<string, string>> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/bmp": "bmp", "image/svg+xml": "svg" };
const PARAM_KEYS = ["crop", "flipX", "flipY", "quarterTurns", "brightness", "contrast", "transparent"] as const;

function objectOf(
  doc: CoreDocument,
  el: ElementView,
  assets: Pick<AssetStore, "get">,
  files: Map<string, Blob>,
  add: (key: string) => void,
  format: BoardFormat,
): BoardObject | null {
  const m = el.transform;
  switch (el.kind) {
    case "stroke": {
      const pts = doc.points(el.id);
      if (pts === null) {
        add("unknown");
        return null;
      }
      return { kind: "stroke", m, color: el.style.color, width: el.style.width, points: Array.from(pts) };
    }
    case "shape":
      if (format === "ubz" && el.shape.shape === "arrow") add("arrow");
      return { kind: "shape", shape: el.shape.shape, m, x0: 0, y0: 0, x1: el.shape.w, y1: el.shape.h, color: el.style.color, width: el.style.width, fill: el.shape.fill };
    case "text":
      return { kind: "text", m, x: 0, y: 0, boxWidth: el.text.boxWidth, boxHeight: el.text.boxHeight, size: el.text.size, color: el.style.color, spans: el.text.spans };
    case "image": {
      const blob = assets.get(el.image.asset);
      if (blob === undefined) {
        add("unknown");
        return null;
      }
      const mime = blob.type !== "" ? blob.type : (doc.asset(el.image.asset)?.mime ?? "");
      const path = `images/${el.image.asset}.${EXT_OF_MIME[mime] ?? "bin"}`;
      files.set(path, blob);
      if (PARAM_KEYS.some((k) => el.image[k] !== undefined)) add("params");
      return { kind: "image", m, x: 0, y: 0, w: el.image.w, h: el.image.h, path };
    }
    case "table":
    case "media":
    case "model3d":
    case "fill":
    case "unknown":
      add(el.kind);
      return null;
  }
}

/** D18, « hors du cadre » : un point qui fixe l'objet écrit, placé par `m`, a x < 0, y < 0 ou x > `PAGE_WIDTH`. Ce sont
 *  les coordonnées du fichier qui comptent, pas le contour : `bounds` ajoute la demi-épaisseur du trait, et un trait
 *  posé en x = 0 en sortirait. */
function outsideFrame(o: BoardObject): boolean {
  const box = (m: Matrix, x0: number, y0: number, x1: number, y1: number): Array<readonly [number, number]> => [
    applyMatrix(m, x0, y0),
    applyMatrix(m, x1, y0),
    applyMatrix(m, x0, y1),
    applyMatrix(m, x1, y1),
  ];
  let pts: Array<readonly [number, number]>;
  switch (o.kind) {
    case "group":
      return o.children.some(outsideFrame);
    case "shape":
      pts = o.shape === "line" || o.shape === "arrow" ? [applyMatrix(o.m, o.x0, o.y0), applyMatrix(o.m, o.x1, o.y1)] : box(o.m, o.x0, o.y0, o.x1, o.y1);
      break;
    case "stroke":
      pts = [];
      for (let i = 0; i + 1 < o.points.length; i += 3) pts.push(applyMatrix(o.m, o.points[i]!, o.points[i + 1]!));
      break;
    case "text":
      pts = box(o.m, o.x, o.y, o.x + o.boxWidth, o.y + o.boxHeight);
      break;
    case "image":
      pts = box(o.m, o.x, o.y, o.x + o.w, o.y + o.h);
      break;
  }
  return pts.some(([x, y]) => x < 0 || y < 0 || x > PAGE_WIDTH);
}

/** D18 : onglet → flux BoardList, images `images/<empreinte>.<ext>` (triées) et avertissements ; groupes rebâtis depuis
 *  `element.group` (extérieur d'abord). */
export async function boardListOf(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat): Promise<{ list: BoardListData; files: ZipFile[]; warnings: string[] }> {
  const counts = new Map<string, number>();
  const add = (key: string): void => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  const files = new Map<string, Blob>();
  const pages: BoardListPage[] = [];
  for (const pid of doc.pageIds()) {
    const view = doc.page(pid);
    if (view?.backdrop) add("backdrop");
    const root: BoardObject[] = [];
    const levels: BoardObject[][] = [root];
    const open: string[] = [];
    const close = (): void => {
      const children = levels.pop()!;
      open.pop();
      levels.at(-1)!.push({ kind: "group", children });
    };
    for (const id of doc.elementIds(pid)) {
      const el = doc.element(id);
      if (el === null) {
        add("unknown");
        continue;
      }
      const o = objectOf(doc, el, assets, files, add, format);
      if (o === null) continue;
      const path = el.group ?? [];
      let k = 0;
      while (k < open.length && k < path.length && open[k] === path[k]) k++;
      while (open.length > k) close();
      for (const g of path.slice(k)) {
        open.push(g);
        levels.push([]);
      }
      levels.at(-1)!.push(o);
      if (outsideFrame(o)) add("outside");
    }
    while (open.length > 0) close();
    const bg = view?.background ?? DEFAULT_BACKGROUND;
    pages.push({ background: bg.toLowerCase() === DEFAULT_BACKGROUND ? null : bg, objects: root });
  }
  const zipFiles: ZipFile[] = [];
  for (const path of [...files.keys()].sort()) zipFiles.push({ path, bytes: new Uint8Array(await files.get(path)!.arrayBuffer()) });
  const warnings = EXPORT_LABELS.filter(([key]) => counts.has(key)).map(([key, one, many]) => {
    const n = counts.get(key)!;
    return `${n} ${n > 1 ? many : one}`;
  });
  return { list: encodeBoardList(pages), files: zipFiles, warnings };
}
