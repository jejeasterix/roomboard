// Adaptateur du vrai module Wasm (T15) vers le contrat figé `api.ts` (T8). Toute valeur venue de Wasm est contrôlée :
// une dérive de forme entre Rust et TS lève une erreur au lieu de passer sous un `as`, sauf un `kind` d'une version
// plus récente, rendu comme cadre inconnu (voir la branche `default`).
import type {
  AssetInfo,
  BackdropView,
  Bounds,
  Change,
  Command,
  CoreDocument,
  CoreFactory,
  ElementView,
  GridLevel,
  GridLines,
  GridView,
  Matrix,
  PageView,
  StrokeBuilderApi,
  StrokeStyle,
  TableData,
  TextAttrs,
  TextSpan,
} from "./api";
import { UNKNOWN_BOX } from "./api";
import { cleanPatch } from "./rich-text";
import type * as Wasm from "../wasm/roomboard_wasm";
import { isShapeKind } from "./shapes";

export type WasmModule = Pick<typeof Wasm, "Document" | "StrokeBuilder" | "version">;

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");
const isNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === "number");
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function toChange(v: unknown): Change {
  if (!isRecord(v)) throw new Error("Change invalide");
  const { pages, ids, removed, full, version } = v;
  if (!isStrings(pages) || !isStrings(ids) || !isStrings(removed) || typeof full !== "boolean" || typeof version !== "number") {
    throw new Error("Change invalide");
  }
  return { pages, ids, removed, full, version };
}

const ELEMENT = "ElementView invalide";
const finitePositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function toMatrix(t: unknown): Matrix {
  if (!isNumbers(t) || t.length !== 6) throw new Error(ELEMENT);
  const [a, b, c, d, e, f] = t;
  if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) {
    throw new Error(ELEMENT);
  }
  return [a, b, c, d, e, f];
}

function toStyle(s: unknown): StrokeStyle {
  if (!isRecord(s)) throw new Error(ELEMENT);
  const { color, width } = s;
  if (typeof color !== "string" || typeof width !== "number") throw new Error(ELEMENT);
  return { color, width };
}

/** Attributs d'un segment (C7, T8) : clés connues seules, valeurs déjà normalisées par le cœur ; `undefined` = absent. */
function toAttrs(a: unknown): TextAttrs {
  if (!isRecord(a)) throw new Error(ELEMENT);
  const out: { -readonly [K in keyof TextAttrs]: TextAttrs[K] } = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined) continue;
    switch (k) {
      case "bold":
      case "italic":
      case "underline":
        if (v !== true) throw new Error(ELEMENT);
        out[k] = true;
        break;
      case "color":
      case "font":
        if (typeof v !== "string") throw new Error(ELEMENT);
        out[k] = v;
        break;
      case "size":
        if (!finitePositive(v)) throw new Error(ELEMENT);
        out.size = v;
        break;
      default:
        throw new Error(ELEMENT);
    }
  }
  return out;
}

/**
 * Segments d'un texte : au moins un (le cœur rend un segment vide pour un texte vide), et leurs textes mis bout à bout
 * redonnent `content` ; sinon le cœur a dérivé.
 */
function toSpans(v: unknown, content: string): TextSpan[] {
  if (!Array.isArray(v) || v.length === 0) throw new Error(ELEMENT);
  const spans = v.map((s: unknown) => {
    const text = isRecord(s) ? s["text"] : undefined;
    if (!isRecord(s) || typeof text !== "string") throw new Error(ELEMENT);
    return { text, attrs: toAttrs(s["attrs"]) };
  });
  if (spans.map((s) => s.text).join("") !== content) throw new Error(ELEMENT);
  return spans;
}

/** Bornes de FormatText et rangs ou dimensions du tableau (C10a) : hors des u32, u32::MAX, que le cœur refuse. */
const toU32 = (v: number): number => (Number.isInteger(v) && v >= 0 && v <= 0xffffffff ? v : 0xffffffff);

/** Vue d'un tableau venue de Wasm (T13, F29) : forme contrôlée ; `fill`, `shade` absents (Option::None) → null ; zones
 *  `{ row, col, rows, cols }` exigées (étendues entières ≥ 1). */
export function toTable(v: unknown): TableData {
  if (!isRecord(v)) throw new Error(ELEMENT);
  const { color, size, cols, rows, cells, merges } = v;
  if (
    typeof color !== "string" || typeof size !== "number" || !Array.isArray(cols) || !Array.isArray(rows) || !Array.isArray(cells) ||
    !Array.isArray(merges)
  ) {
    throw new Error(ELEMENT);
  }
  const optString = (x: unknown): string | null => {
    if (x !== undefined && x !== null && typeof x !== "string") throw new Error(ELEMENT);
    return typeof x === "string" ? x : null;
  };
  const extent = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 1;
  return {
    color,
    size,
    cols: cols.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { id, width } = c;
      if (typeof id !== "string" || !finitePositive(width)) throw new Error(ELEMENT);
      return { id, width };
    }),
    rows: rows.map((r: unknown) => {
      if (!isRecord(r)) throw new Error(ELEMENT);
      const { id, height } = r;
      if (typeof id !== "string" || !finitePositive(height)) throw new Error(ELEMENT);
      return { id, height };
    }),
    cells: cells.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { row, col, text, fill, shade } = c;
      if (typeof row !== "string" || typeof col !== "string" || typeof text !== "string") throw new Error(ELEMENT);
      return { row, col, text, fill: optString(fill), shade: optString(shade) };
    }),
    merges: merges.map((m: unknown) => {
      if (!isRecord(m)) throw new Error(ELEMENT);
      const { row, col, rows: n, cols: k } = m;
      if (typeof row !== "string" || typeof col !== "string" || !extent(n) || !extent(k)) throw new Error(ELEMENT);
      return { row, col, rows: n, cols: k };
    }),
  };
}

/** Kind connu : forme contrôlée ; kind non reconnu : UnknownElement (U3, K8) ; id et transform toujours exigés. */
export function toElementView(v: unknown): ElementView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(ELEMENT);
  const { id, kind } = v;
  if (typeof id !== "string") throw new Error(ELEMENT);
  const base = { id, transform: toMatrix(v["transform"]) };
  switch (kind) {
    case "stroke":
      return { ...base, kind, style: toStyle(v["style"]) };
    case "shape": {
      const style = toStyle(v["style"]);
      const s = v["shape"];
      if (!isRecord(s)) throw new Error(ELEMENT);
      const { shape, w, h, fill } = s;
      if (typeof shape !== "string" || !isShapeKind(shape) || typeof w !== "number" || typeof h !== "number") {
        throw new Error(ELEMENT);
      }
      if (fill !== undefined && fill !== null && typeof fill !== "string") throw new Error(ELEMENT);
      return { ...base, kind, style, shape: { shape, w, h, fill: typeof fill === "string" ? fill : null } };
    }
    case "text": {
      const style = toStyle(v["style"]);
      const t = v["text"];
      if (!isRecord(t)) throw new Error(ELEMENT);
      const { content, size, boxWidth, boxHeight } = t;
      if (typeof content !== "string" || typeof size !== "number" || typeof boxWidth !== "number" || typeof boxHeight !== "number") {
        throw new Error(ELEMENT);
      }
      return { ...base, kind, style, text: { content, size, boxWidth, boxHeight, spans: toSpans(t["spans"], content) } };
    }
    case "image": {
      const i = v["image"];
      if (!isRecord(i)) throw new Error(ELEMENT);
      const { asset, w, h } = i;
      if (typeof asset !== "string" || typeof w !== "number" || typeof h !== "number") throw new Error(ELEMENT);
      return { ...base, kind, image: { asset, w, h } };
    }
    case "table":
      return { ...base, kind, table: toTable(v["table"]) };
    case "unknown": {
      const u = v["unknown"];
      if (!isRecord(u)) throw new Error(ELEMENT);
      const { sourceKind, w, h } = u;
      if (typeof sourceKind !== "string" || !finitePositive(w) || !finitePositive(h)) throw new Error(ELEMENT);
      return { ...base, kind, unknown: { sourceKind, w, h } };
    }
    default: {
      // Une dérive de `kind` ne lève pas : elle devient un cadre inconnu (le cœur rend déjà `kind: "unknown"` pour un
      // kind d'une version plus récente). Gardé comme cadre, boîte lue si elle est lisible, sinon UNKNOWN_BOX.
      const raw = v["unknown"];
      const u: Record<string, unknown> = isRecord(raw) ? raw : {};
      const w = u["w"];
      const h = u["h"];
      const box = finitePositive(w) && finitePositive(h) ? { w, h } : { w: UNKNOWN_BOX, h: UNKNOWN_BOX };
      return { ...base, kind: "unknown", unknown: { sourceKind: typeof kind === "string" ? kind : "", ...box } };
    }
  }
}

export function toBounds(v: unknown): Bounds | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error("Bounds invalide");
  const { x0, y0, x1, y1 } = v;
  if (typeof x0 !== "number" || typeof y0 !== "number" || typeof x1 !== "number" || typeof y1 !== "number") {
    throw new Error("Bounds invalide");
  }
  return { x0, y0, x1, y1 };
}

const PAGE = "PageView invalide";
const numberOrNull = (v: unknown, err: string): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number") throw new Error(err);
  return v;
};

// wasm-bindgen rend `undefined` pour une `Option::None` (backdrop, w, h, rect) ; le contrat dit `null`.
function toBackdropView(v: unknown): BackdropView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { asset, kind, fit } = v;
  if (typeof asset !== "string" || typeof kind !== "string" || typeof fit !== "string") throw new Error(PAGE);
  return { asset, kind, w: numberOrNull(v["w"], PAGE), h: numberOrNull(v["h"], PAGE), fit, rect: toBounds(v["rect"]) };
}

function toGridLevel(v: unknown): GridLevel {
  if (!isRecord(v)) throw new Error(PAGE);
  const { kind, spacingX, spacingY, originX, originY, color, line, lineWidth, snap, visible } = v;
  if (
    typeof kind !== "string" ||
    typeof spacingX !== "number" ||
    typeof spacingY !== "number" ||
    typeof originX !== "number" ||
    typeof originY !== "number" ||
    typeof color !== "string" ||
    typeof line !== "string" ||
    typeof lineWidth !== "number" ||
    typeof snap !== "boolean" ||
    typeof visible !== "boolean"
  ) {
    throw new Error(PAGE);
  }
  return { kind, spacingX, spacingY, originX, originY, color, line, lineWidth, snap, visible };
}

// Grille (C9, G12) : `undefined` (Option::None) → null, comme le fond ; forme fausse → erreur.
function toGridView(v: unknown): GridView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { visible, snap, above, levels } = v;
  if (typeof visible !== "boolean" || typeof snap !== "boolean" || typeof above !== "boolean" || !Array.isArray(levels)) {
    throw new Error(PAGE);
  }
  return { visible, snap, above, levels: levels.map(toGridLevel) };
}

export function toPageView(v: unknown): PageView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { id, width, height, background } = v;
  if (typeof id !== "string" || typeof width !== "number" || typeof height !== "number" || typeof background !== "string") {
    throw new Error(PAGE);
  }
  return { id, width, height, background, backdrop: toBackdropView(v["backdrop"]), grid: toGridView(v["grid"]) };
}

export function toAssetInfo(v: unknown): AssetInfo {
  if (!isRecord(v)) throw new Error("AssetInfo invalide");
  const { id, name, mime, size } = v;
  if (typeof id !== "string" || typeof name !== "string" || typeof mime !== "string" || typeof size !== "number") {
    throw new Error("AssetInfo invalide");
  }
  return { id, name, mime, size };
}

const LINES = "GridLines invalide";
// Lignes de grille (C9, G12) : `null` (Option::None) ou `undefined` → null ; forme fausse → erreur.
export function toGridLines(v: unknown): GridLines | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(LINES);
  const { above, levels } = v;
  if (typeof above !== "boolean" || !Array.isArray(levels)) throw new Error(LINES);
  return {
    above,
    levels: levels.map((l: unknown) => {
      if (!isRecord(l)) throw new Error(LINES);
      const { color, line, alpha, lineWidth, segments, dots } = l;
      if (
        typeof color !== "string" ||
        typeof line !== "string" ||
        typeof alpha !== "number" ||
        typeof lineWidth !== "number" ||
        !isNumbers(segments) ||
        !isNumbers(dots)
      ) {
        throw new Error(LINES);
      }
      return { color, line, alpha, lineWidth, segments, dots };
    }),
  };
}

/** Paire `[x, y]` venue de Wasm (Float64Array ou tableau) ; autre forme → erreur. Exportée pour son test de forme. */
export function toPair(v: unknown): readonly [number, number] {
  const a: unknown = v instanceof Float64Array ? Array.from(v) : v;
  if (!isNumbers(a) || a.length !== 2) throw new Error("point invalide");
  return [a[0] ?? 0, a[1] ?? 0];
}

/** Arguments de grille de `set_grid` et `grid_lines_of` (G12, E1) : têtes, kinds, couleurs, traits, puis sept nombres par
 *  niveau `sx, sy, ox, oy, snap, visible, lineWidth` (booléens en 0 ou 1) ; les valeurs sont contrôlées par le cœur. */
export function gridArgs(g: GridView): [boolean, boolean, boolean, string[], string[], string[], Float64Array] {
  const nums = new Float64Array(
    g.levels.flatMap((l) => [l.spacingX, l.spacingY, l.originX, l.originY, l.snap ? 1 : 0, l.visible ? 1 : 0, l.lineWidth]),
  );
  return [g.visible, g.snap, g.above, g.levels.map((l) => l.kind), g.levels.map((l) => l.color), g.levels.map((l) => l.line), nums];
}

class WasmCoreDocument implements CoreDocument {
  constructor(private readonly d: Wasm.Document, private readonly mod: WasmModule) {}

  pageIds(): string[] { return this.d.page_ids(); }
  elementIds(page: string): string[] { return this.d.element_ids(page); }

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "AddPage": return toChange(this.d.add_page_after(cmd.after));
      case "RemovePage": return toChange(this.d.remove_page(cmd.page));
      case "CommitStroke": return toChange(this.d.commit_stroke(cmd.page, cmd.points, cmd.style.color, cmd.style.width));
      case "Erase": return toChange(this.d.erase(cmd.page, cmd.path, cmd.radius, cmd.mode === "object"));
      case "Delete": return toChange(this.d.delete([...cmd.ids]));
      case "AddShape":
        return toChange(
          this.d.add_shape(cmd.page, cmd.shape, cmd.x0, cmd.y0, cmd.x1, cmd.y1, cmd.style.color, cmd.style.width, cmd.fill ?? undefined),
        );
      case "SetText":
        // Avec un id, `page`, `x` et `y` ne placent rien (la position passe par Transform), comme la fausse liaison.
        return toChange(
          this.d.set_text(cmd.page, cmd.id ?? undefined, cmd.x, cmd.y, cmd.content, cmd.color, cmd.size, cmd.boxWidth, cmd.boxHeight),
        );
      case "Transform":
        return toChange(this.d.transform([...cmd.ids], new Float64Array(cmd.matrix)));
      case "AddImage": {
        // Seule la référence de l'asset traverse la liaison, jamais ses octets (U4).
        const a = cmd.asset;
        return toChange(this.d.add_image(cmd.page, a.id, a.name, a.mime, a.size, cmd.w, cmd.h, new Float64Array(cmd.matrix)));
      }
      case "SetBackdrop": {
        const b = cmd.backdrop;
        if (b === null) return toChange(this.d.clear_backdrop(cmd.page));
        return toChange(this.d.set_backdrop(cmd.page, b.asset.id, b.asset.name, b.asset.mime, b.asset.size, b.w, b.h, b.fit));
      }
      case "FormatText":
        // Clés à `undefined` retirées (T7) : serde-wasm-bindgen les lirait comme null, donc comme un retrait.
        return toChange(this.d.format_text(cmd.id, toU32(cmd.start), toU32(cmd.len), cleanPatch(cmd.attrs), cmd.boxHeight));
      case "SetGrid": {
        const g = cmd.grid;
        if (g === null) return toChange(this.d.clear_grid(cmd.page));
        return toChange(this.d.set_grid(cmd.page, ...gridArgs(g)));
      }
      case "AddTable":
        return toChange(
          this.d.add_table(cmd.page, cmd.x, cmd.y, toU32(cmd.cols), toU32(cmd.rows), cmd.colWidth, cmd.rowHeight, cmd.color, cmd.size),
        );
      case "SetTableCell":
        return toChange(this.d.set_table_cell(cmd.id, cmd.row, cmd.col, cmd.content, cmd.rowHeight));
      case "InsertTableLine":
        return toChange(this.d.insert_table_line(cmd.id, cmd.axis === "row", toU32(cmd.at)));
      case "RemoveTableLine":
        return toChange(this.d.remove_table_line(cmd.id, cmd.axis === "row", cmd.line, cmd.to));
      case "SetTableSizes":
        return toChange(this.d.set_table_sizes(cmd.id, cmd.colWidth, cmd.rowHeight));
      case "SetTableFill":
        // null → undefined : Option::None côté Rust.
        return toChange(this.d.set_table_fill(cmd.id, cmd.row, cmd.col, cmd.fill ?? undefined, cmd.to?.row, cmd.to?.col));
      case "MergeTableCells":
        return toChange(this.d.merge_table_cells(cmd.id, cmd.from.row, cmd.from.col, cmd.to.row, cmd.to.col));
      case "SplitTableCell":
        return toChange(this.d.split_table_cell(cmd.id, cmd.row, cmd.col));
      case "SetTableShade":
        return toChange(this.d.set_table_shade(cmd.id, cmd.from.row, cmd.from.col, cmd.to.row, cmd.to.col, cmd.shade ?? undefined));
      case "ImportTable":
        return toChange(
          this.d.import_table(
            cmd.page,
            new Float64Array(cmd.matrix),
            cmd.colWidth,
            new Float64Array(cmd.rowHeights),
            toU32(cmd.cols),
            [...cmd.cells],
            Uint32Array.from(cmd.merges.flat(), toU32),
            cmd.color,
            cmd.size,
          ),
        );
    }
  }

  // wasm-bindgen rend `undefined` pour une `Option::None` ; le contrat dit `null`.
  element(id: string): ElementView | null { return toElementView(this.d.element(id)); }
  page(id: string): PageView | null { return toPageView(this.d.page(id)); }
  citedAssets(): AssetInfo[] {
    const v: unknown = this.d.cited_assets();
    if (!Array.isArray(v)) throw new Error("AssetInfo invalide");
    return v.map(toAssetInfo);
  }
  asset(id: string): AssetInfo | null {
    const v: unknown = this.d.asset(id);
    return v === null || v === undefined ? null : toAssetInfo(v);
  }
  points(id: string): Float32Array | null { return this.d.points(id) ?? null; }
  outline(id: string): Float32Array | null { return this.d.outline(id) ?? null; }
  hitTest(page: string, x: number, y: number, tol: number): string | null { return this.d.hit_test(page, x, y, tol) ?? null; }
  hitTestPath(page: string, path: Float32Array, radius: number): string[] { return this.d.hit_test_path(page, path, radius); }
  idsInRect(page: string, r: Bounds): string[] { return this.d.ids_in_rect(page, r.x0, r.y0, r.x1, r.y1); }
  bounds(ids: readonly string[]): Bounds | null { return toBounds(this.d.bounds([...ids])); }
  undo(): Change { return toChange(this.d.undo()); }
  redo(): Change { return toChange(this.d.redo()); }
  canUndo(): boolean { return this.d.can_undo(); }
  canRedo(): boolean { return this.d.can_redo(); }
  version(): number { return this.d.version(); }
  save(now: string, appVersion: string): Uint8Array { return this.d.save(now, appVersion); }
  saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array] {
    const p = this.d.save_parts(now, appVersion);
    try {
      return [p.manifest(), p.ybin()] as const;
    } finally {
      p.free();
    }
  }

  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi {
    const b = new this.mod.StrokeBuilder(style.width);
    return { push: (p: Float32Array) => b.push(p), finish: () => b.finish(), free: () => b.free() };
  }

  free(): void { this.d.free(); }

  snapPoint(page: string, x: number, y: number): readonly [number, number] | null {
    const v: unknown = this.d.snap_point(page, x, y);
    return v === null || v === undefined ? null : toPair(v);
  }
  snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number] {
    return toPair(this.d.snap_delta(page, [...ids], dx, dy));
  }
  gridLines(page: string, r: Bounds, minStep: number, minDotStep: number): GridLines | null {
    return toGridLines(this.d.grid_lines(page, r.x0, r.y0, r.x1, r.y1, minStep, minDotStep));
  }
  gridLinesOf(page: string, grid: GridView, r: Bounds, minStep: number, minDotStep: number): GridLines | null {
    const view = new Float64Array([r.x0, r.y0, r.x1, r.y1, minStep, minDotStep]);
    return toGridLines(this.d.grid_lines_of(page, ...gridArgs(grid), view));
  }
}

export function createWasmCore(mod: WasmModule): CoreFactory {
  return {
    blank: () => new WasmCoreDocument(mod.Document.blank(), mod),
    load: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load(bytes), mod),
    loadParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_parts(manifest, ybin), mod),
    version: () => mod.version(),
  };
}
