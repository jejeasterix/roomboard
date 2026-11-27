/**
 * Flux BoardList (C13, DA2 ; OF13, cadrage platform-feuilles D6) : codage et décodage du flux plat que le module `formats`
 * lit et écrit, et ses bornes. Feuille : n'importe que des types de `core/api`, aucun DOM. Lue par la page
 * (`app/board-io.ts`, qui réexporte tout), le Worker ZIP (`zip-worker.ts`) et le lecteur `.olf` (`olf-read.ts`).
 * Table des codes : `docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md`, « Table des codes du flux BoardList ».
 */
import type { Matrix, ShapeKind, TextSpan } from "../core/api";

/** `BoardError::TooBig` (`board.rs`). */
export const BOARD_OBJECTS_MESSAGE = "fichier de tableau trop gros (plus de 100 000 objets)";
/** D16 : borne par fichier (`.ubz` : toutes pages ensemble). */
export const BOARD_MAX_OBJECTS = 100_000;
/** Libellés (singulier, pluriel) des objets illisibles, que la page et le lecteur Rust écrivent à l'identique. */
export const SKIPPED_LABEL = ["objet illisible ignoré", "objets illisibles ignorés"] as const;
/** Même borne que `MAX_GROUP_DEPTH` de `board::parse` (board.rs). */
export const MAX_GROUP_DEPTH = 256;
export const BOARD_OP = { page: 1, background: 2, shape: 3, stroke: 4, text: 5, image: 6, groupBegin: 7, groupEnd: 8 } as const;
export const BOARD_BAD_LIST_PREFIX = "liste de tableau invalide : ";
/** Formes du flux : le losange (OG12 lot 2a) n'y entre pas, il s'exporte en polyligne fermée (`roomboard-formats` a son
 *  propre `ShapeKind`, board.rs). */
export type BoardShape = Exclude<ShapeKind, "diamond">;
/** Code de chaque forme dans le flux ; `satisfies` oblige à en donner un à chaque `BoardShape`. */
const SHAPE_CODE = { rect: 0, ellipse: 1, line: 2, arrow: 3 } satisfies Record<BoardShape, number>;
const SHAPES = (Object.keys(SHAPE_CODE) as BoardShape[]).sort((a, b) => SHAPE_CODE[a] - SHAPE_CODE[b]);
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
        // OG12 lot 2a : un losange arrive ici déjà converti en polyligne fermée (L3), jamais avec un code inventé.
        if (o.shape === "diamond") throw new Error("losange hors du flux : polyligne fermée attendue (OG12 lot 2a)");
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
