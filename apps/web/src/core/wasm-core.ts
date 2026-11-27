// Adaptateur du vrai module Wasm (T15) vers le contrat figé `api.ts` (T8). Toute valeur venue de Wasm est contrôlée :
// une dérive de forme entre Rust et TS lève une erreur au lieu de passer sous un `as`, sauf un `kind` d'une version
// plus récente, rendu comme cadre inconnu (voir la branche `default`).
import type {
  AssetInfo,
  LinkedAsset,
  AssetRef,
  BackdropView,
  Bounds,
  Change,
  Command,
  CoreDocument,
  ContainerKind,
  CoreFactory,
  ElementView,
  GridLevel,
  GridLines,
  GridView,
  ImageParams,
  Matrix,
  Model3dFile,
  Model3dFormat,
  PageLayout,
  PageView,
  PdfPageSize,
  StrokeBuilderApi,
  StrokeStyle,
  TableData,
  TextAttrs,
  TextSpan,
} from "./api";
import { MIXED_SOURCE_MESSAGE, MODEL3D_FORMATS, UNKNOWN_BOX } from "./api";
import { toLook, type Look } from "./look";
import { isAssetId } from "./asset-store";
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

/** Segments voulus (C7b, R7) : attributs nettoyés (`cleanPatch`, comme FormatText) ; absents : undefined (Option::None). */
const spansArg = (spans: readonly TextSpan[] | undefined): unknown =>
  spans === undefined ? undefined : spans.map((s) => ({ text: s.text, attrs: cleanPatch(s.attrs) }));

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
      const { row, col, text, fill, shade, spans } = c;
      if (typeof row !== "string" || typeof col !== "string" || typeof text !== "string") throw new Error(ELEMENT);
      return { row, col, text, fill: optString(fill), shade: optString(shade), spans: toSpans(spans, text) };
    }),
    merges: merges.map((m: unknown) => {
      if (!isRecord(m)) throw new Error(ELEMENT);
      const { row, col, rows: n, cols: k } = m;
      if (typeof row !== "string" || typeof col !== "string" || !extent(n) || !extent(k)) throw new Error(ELEMENT);
      return { row, col, rows: n, cols: k };
    }),
  };
}

/** OG11 : nombre passé au pont en `f64`. Absent ou null : `None` ; autre chose qu'un nombre : NaN, refusé par le pont
 *  (wasm-bindgen appliquerait `ToNumber`, « 45 » deviendrait 45, là où la fausse liaison refuse). */
const num = (v: unknown): number | undefined => (v === undefined || v === null ? undefined : typeof v === "number" ? v : Number.NaN);
/** Les onze arguments d'aspect de `look_of`, dans l'ordre du pont : cinq du lot 1, puis `fillStyle`, pointes, `textAlign`,
 *  `link`, puis `variability` (OG23). */
type LookArgs = [string | undefined, number | undefined, number | undefined, string | undefined, number | undefined,
  string | undefined, string | undefined, string | undefined, string | undefined, string | undefined, string | undefined];
const lookArgs = (l: Look | undefined): LookArgs => [l?.strokeStyle, num(l?.roughness), num(l?.seed), l?.roundness, num(l?.opacity),
  l?.fillStyle, l?.startArrowhead, l?.endArrowhead, l?.textAlign, l?.link, l?.variability];

/** Rang en `u32` côté pont (wasm-bindgen tronquerait sans erreur : 0,5 → 0, 2³² + 1 → 1) : non entier ou hors u32
 *  refusé ici, avec le message de `BadIndex`, comme le faux cœur (`MovePage`, `Restack`). */
const checkedRank = (to: number): number => {
  if (!Number.isInteger(to) || to < 0 || to > 0xffffffff) throw new Error("rang de page hors bornes");
  return to;
};

/** Kind connu : forme contrôlée ; kind non reconnu : UnknownElement (U3, K8) ; id et transform toujours exigés. */
export function toElementView(v: unknown): ElementView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(ELEMENT);
  const { id, kind } = v;
  if (typeof id !== "string") throw new Error(ELEMENT);
  // C3 (Z1) : chemin de groupes, chaînes non vide ; absent (Option::None → undefined) laissé absent.
  const group = v["group"];
  if (group !== undefined && group !== null && (!isStrings(group) || group.length === 0)) throw new Error(ELEMENT);
  // OG11 : aspect lu défensivement (`toLook`), omis s'il est neutre.
  const look = toLook(v["look"]);
  const base = { id, transform: toMatrix(v["transform"]), ...(isStrings(group) ? { group } : {}), ...(look ? { look } : {}) };
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
      const { asset, w, h, sourceAsset } = i;
      if (typeof asset !== "string" || typeof w !== "number" || typeof h !== "number" || (sourceAsset !== undefined && typeof sourceAsset !== "string")) {
        throw new Error(ELEMENT);
      }
      // C6b (B12) : `sourceAsset` absent quand le cœur ne l'envoie pas (Option::None), recopié sinon.
      return { ...base, kind, image: { asset, w, h, ...(sourceAsset !== undefined ? { sourceAsset } : {}), ...toImageParams(i) } };
    }
    case "media": {
      const m = v["media"];
      if (!isRecord(m)) throw new Error(ELEMENT);
      const { asset, mediaType, w, h, duration, poster, trimStart, trimEnd, loop, volume } = m;
      if (
        typeof asset !== "string" || (mediaType !== "video" && mediaType !== "audio") || !finitePositive(w) || !finitePositive(h) ||
        typeof duration !== "number" || typeof trimStart !== "number" || typeof loop !== "boolean" || typeof volume !== "number"
      ) {
        throw new Error(ELEMENT);
      }
      // Option::None → undefined côté serde-wasm-bindgen ; le contrat dit null.
      if (poster !== undefined && poster !== null && typeof poster !== "string") throw new Error(ELEMENT);
      if (trimEnd !== undefined && trimEnd !== null && typeof trimEnd !== "number") throw new Error(ELEMENT);
      return {
        ...base,
        kind,
        media: { asset, mediaType, w, h, duration, poster: poster ?? null, trimStart, trimEnd: trimEnd ?? null, loop, volume },
      };
    }
    case "model3d": {
      const m = v["model3d"];
      if (!isRecord(m)) throw new Error(ELEMENT);
      const { asset, format, w, h, files, yaw, pitch, snapshot } = m;
      if (
        typeof asset !== "string" || typeof format !== "string" || !(MODEL3D_FORMATS as readonly string[]).includes(format) ||
        !finitePositive(w) || !finitePositive(h) || typeof yaw !== "number" || !Number.isFinite(yaw) ||
        typeof pitch !== "number" || !Number.isFinite(pitch) || !Array.isArray(files)
      ) {
        throw new Error(ELEMENT);
      }
      // Option::None → undefined côté serde-wasm-bindgen ; le contrat dit null.
      if (snapshot !== undefined && snapshot !== null && typeof snapshot !== "string") throw new Error(ELEMENT);
      return {
        ...base,
        kind,
        model3d: {
          asset,
          format: format as Model3dFormat,
          w,
          h,
          files: files.map((x: unknown): Model3dFile => {
            if (!isRecord(x)) throw new Error(ELEMENT);
            const { path, asset: a } = x;
            if (typeof path !== "string" || typeof a !== "string") throw new Error(ELEMENT);
            return { path, asset: a };
          }),
          yaw,
          pitch,
          snapshot: snapshot ?? null,
        },
      };
    }
    case "table":
      return { ...base, kind, table: toTable(v["table"]) };
    case "fill": {
      const fl = v["fill"];
      if (!isRecord(fl)) throw new Error(ELEMENT);
      const { color, w, h } = fl;
      if (typeof color !== "string" || !finitePositive(w) || !finitePositive(h)) throw new Error(ELEMENT);
      return { ...base, kind, fill: { color, w, h } };
    }
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

// wasm-bindgen rend `undefined` pour une `Option::None` (backdrop, w, h, rect, original) ; le contrat dit `null`.
function toBackdropView(v: unknown): BackdropView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { asset, kind, fit, original } = v;
  if (typeof asset !== "string" || typeof kind !== "string" || typeof fit !== "string") throw new Error(PAGE);
  if (original !== undefined && original !== null && typeof original !== "string") throw new Error(PAGE);
  return {
    asset,
    kind,
    page: numberOrNull(v["page"], PAGE),
    w: numberOrNull(v["w"], PAGE),
    h: numberOrNull(v["h"], PAGE),
    fit,
    rect: toBounds(v["rect"]),
    original: isAssetId(original) ? original : null,
  };
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
  const { id, width, height, background, mode } = v;
  if (typeof id !== "string" || typeof width !== "number" || typeof height !== "number" || typeof background !== "string") {
    throw new Error(PAGE);
  }
  if (mode !== "page" && mode !== "infinite") throw new Error(PAGE);
  return { id, width, height, background, backdrop: toBackdropView(v["backdrop"]), grid: toGridView(v["grid"]), mode };
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

/** Grille absente d'`ApplyBackground` : tableaux vides, ignorés par le cœur (drapeau `grid` faux). */
const NO_GRID: GridView = { visible: false, snap: false, above: false, levels: [] };

/** Types admis par `normalizeParams` du faux cœur (le domaine reste au cœur) : `crop` quatre nombres, booléens, nombres
 *  (null vaut neutre pour ces trois-là), `transparent` aux quatre champs typés. */
/** Manifeste et `ybin` d'un enregistrement en deux parties du cœur, l'objet Wasm libéré après lecture (C3). */
function takeParts(p: { manifest(): Uint8Array; ybin(): Uint8Array; free(): void }): readonly [Uint8Array, Uint8Array] {
  try {
    return [p.manifest(), p.ybin()] as const;
  } finally {
    p.free();
  }
}

function wellTyped(p: ImageParams): boolean {
  const r = p as Readonly<Record<string, unknown>>;
  const bool = (v: unknown): boolean => v === undefined || typeof v === "boolean";
  const num = (v: unknown): boolean => v === undefined || v === null || typeof v === "number";
  const crop = r["crop"];
  const t = r["transparent"];
  return (
    (crop === undefined || (isNumbers(crop) && crop.length === 4)) &&
    bool(r["flipX"]) &&
    bool(r["flipY"]) &&
    num(r["quarterTurns"]) &&
    num(r["brightness"]) &&
    num(r["contrast"]) &&
    (t === undefined ||
      (isRecord(t) && typeof t["color"] === "string" && typeof t["tolerance"] === "number" && typeof t["soft"] === "number" && typeof t["contiguous"] === "boolean" &&
        num(t["x"]) && num(t["y"])))
  );
}

/** Quarts de tour hors domaine (I5) : un réglage mal typé part ainsi au cœur, qui le refuse par BadImageParams à son rang
 *  (élément, image lisible, réglages, matrice), comme le faux cœur ; lever ici répondrait avant « élément inconnu ». */
const MISTYPED_TURNS = 4;

/** Arguments de `set_image_params` (C5, I6) : rognage vide ou [x, y, w, h], deux booléens, trois nombres, couleur ou
 *  undefined, [tolérance, plume, contigu en 0 ou 1] ou vide ; les valeurs sont contrôlées par le cœur. */
export function imageParamsArgs(p: ImageParams): [Float64Array, boolean, boolean, number, number, number, string | undefined, Float64Array] {
  if (!wellTyped(p)) return [new Float64Array(), false, false, MISTYPED_TURNS, 0, 0, undefined, new Float64Array()];
  const t = p.transparent;
  return [
    new Float64Array(p.crop ?? []),
    p.flipX === true,
    p.flipY === true,
    p.quarterTurns ?? 0,
    p.brightness ?? 0,
    p.contrast ?? 0,
    t?.color,
    // OG23 (T10) : départ en 4e et 5e nombres ; un seul des deux part en NaN, que le cœur refuse (les deux ou aucun).
    new Float64Array(
      t === undefined
        ? []
        : t.x === undefined && t.y === undefined
          ? [t.tolerance, t.soft, t.contiguous ? 1 : 0]
          : [t.tolerance, t.soft, t.contiguous ? 1 : 0, t.x ?? Number.NaN, t.y ?? Number.NaN],
    ),
  ];
}

/** Réglages d'une image lus du cœur (C5) : un champ absent reste absent, un neutre n'est pas recopié ; un champ présent
 *  mal typé lève (dérive de forme entre Rust et TS). */
export function toImageParams(i: Record<string, unknown>): ImageParams {
  const out: Record<string, unknown> = {};
  const crop = i["crop"];
  if (crop !== undefined && crop !== null) {
    if (!Array.isArray(crop) || crop.length !== 4 || !crop.every((n) => typeof n === "number")) throw new Error(ELEMENT);
    out["crop"] = [crop[0], crop[1], crop[2], crop[3]];
  }
  for (const k of ["flipX", "flipY"] as const) {
    const b = i[k];
    if (b === undefined || b === null) continue;
    if (typeof b !== "boolean") throw new Error(ELEMENT);
    if (b) out[k] = true;
  }
  for (const k of ["quarterTurns", "brightness", "contrast"] as const) {
    const n = i[k];
    if (n === undefined || n === null) continue;
    if (typeof n !== "number") throw new Error(ELEMENT);
    if (n !== 0) out[k] = n;
  }
  const t = i["transparent"];
  if (t !== undefined && t !== null) {
    if (!isRecord(t)) throw new Error(ELEMENT);
    const { color, tolerance, soft, contiguous } = t;
    if (typeof color !== "string" || typeof tolerance !== "number" || typeof soft !== "number" || typeof contiguous !== "boolean") throw new Error(ELEMENT);
    const { x, y } = t;
    if ((x !== undefined && typeof x !== "number") || (y !== undefined && typeof y !== "number")) throw new Error(ELEMENT);
    out["transparent"] = { color, tolerance, soft, contiguous, ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) };
  }
  return out as ImageParams;
}

class WasmCoreDocument implements CoreDocument {
  constructor(private readonly d: Wasm.Document, private readonly mod: WasmModule) {}

  pageIds(): string[] { return this.d.page_ids(); }
  elementIds(page: string): string[] { return this.d.element_ids(page); }
  elementIdsOfKind(page: string, kind: string): readonly string[] { return this.d.element_ids_of_kind(page, kind); }

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "AddPage": return toChange(this.d.add_page_after(cmd.after, cmd.mode));
      case "RemovePage": return toChange(this.d.remove_page(cmd.page));
      case "SetPageMode": return toChange(this.d.set_page_mode(cmd.page, cmd.mode));
      case "MovePage": return toChange(this.d.move_page(cmd.page, checkedRank(cmd.to)));
      case "DuplicatePage": return toChange(this.d.duplicate_page(cmd.page));
      case "Restack":
        return toChange(this.d.restack([...cmd.ids], checkedRank(cmd.to)));
      // OG23 : `how` inconnu refusé par le pont (« disposition inconnue : <how> »), avant la commande.
      case "Arrange": return toChange(this.d.arrange([...cmd.ids], cmd.how));
      case "CommitStroke": {
        const l = cmd.look;
        return toChange(this.d.commit_stroke(cmd.page, cmd.points, cmd.style.color, cmd.style.width, ...lookArgs(l)));
      }
      case "Erase": return toChange(this.d.erase(cmd.page, cmd.path, cmd.radius, cmd.mode === "object"));
      case "Delete": return toChange(this.d.delete([...cmd.ids]));
      case "Group": return toChange(this.d.group([...cmd.ids]));
      case "Ungroup": return toChange(this.d.ungroup([...cmd.ids]));
      case "AddShape": {
        const l = cmd.look;
        return toChange(
          this.d.add_shape(cmd.page, cmd.shape, cmd.x0, cmd.y0, cmd.x1, cmd.y1, cmd.style.color, cmd.style.width, cmd.fill ?? undefined,
            ...lookArgs(l)),
        );
      }
      case "SetText": {
        // Avec un id, `page`, `x` et `y` ne placent rien (la position passe par Transform), comme la fausse liaison ;
        // `look` est contrôlé, puis ignoré par le cœur sur un texte existant.
        const l = cmd.look;
        return toChange(
          this.d.set_text(cmd.page, cmd.id ?? undefined, cmd.x, cmd.y, cmd.content, cmd.color, cmd.size, cmd.boxWidth, cmd.boxHeight, spansArg(cmd.spans),
            ...lookArgs(l)),
        );
      }
      case "SetStyle": {
        // OG11 : `"x" in p` dit si le champ est touché ; null ou absent dans un champ touché le retire (Option::None).
        const p = cmd.patch;
        // OG23 (T10) : `dragCopy` non booléen part en tracé 3, que le pont refuse par « style invalide » avant toute
        // lecture, comme `validStyle` du faux cœur.
        const drag: unknown = p.dragCopy;
        const badDrag = drag !== undefined && typeof drag !== "boolean";
        return toChange(this.d.set_style(
          [...cmd.ids], p.color ?? undefined, num(p.width), "fill" in p, p.fill ?? undefined, "strokeStyle" in p, p.strokeStyle ?? undefined,
          badDrag ? 3 : num(p.roughness), "roundness" in p, p.roundness ?? undefined, num(p.opacity),
          // T12 : paires `*_set`, valeur du lot 2.
          "fillStyle" in p, p.fillStyle ?? undefined, "startArrowhead" in p, p.startArrowhead ?? undefined,
          "endArrowhead" in p, p.endArrowhead ?? undefined, "textAlign" in p, p.textAlign ?? undefined, "link" in p, p.link ?? undefined,
          // OG23 : paire `variability_set`, valeur.
          "variability" in p, p.variability ?? undefined,
          // OG23 (T10) : `true` pose, `false` retire, absent laisse.
          typeof drag === "boolean" ? drag : undefined,
        ));
      }
      case "Transform":
        return toChange(this.d.transform([...cmd.ids], new Float64Array(cmd.matrix)));
      case "AddImage": {
        // Seule la référence de l'asset traverse la liaison, jamais ses octets (U4).
        const a = cmd.asset;
        return toChange(this.d.add_image(cmd.page, a.id, a.name, a.mime, a.size, cmd.w, cmd.h, new Float64Array(cmd.matrix)));
      }
      case "AddMedia": {
        // Seule la référence des assets traverse la liaison ; poster absent : nom et type vides, taille 0, ignorés.
        const a = cmd.asset;
        const q = cmd.poster;
        return toChange(
          this.d.add_media(
            cmd.page, a.id, a.name, a.mime, a.size, cmd.linked ?? undefined, cmd.mediaType, cmd.w, cmd.h, cmd.duration,
            q?.id ?? undefined, q?.name ?? "", q?.mime ?? "", q?.size ?? 0, new Float64Array(cmd.matrix),
          ),
        );
      }
      case "SetMedia":
        return toChange(this.d.set_media(cmd.id, cmd.trimStart, cmd.trimEnd ?? undefined, cmd.loop, cmd.volume));
      case "AddModel3d": {
        // Seules les références des assets traversent la liaison ; liés en listes parallèles ; instantané absent : nom et
        // type vides, taille 0, ignorés.
        const a = cmd.asset;
        const q = cmd.snapshot;
        const files = cmd.files;
        return toChange(
          this.d.add_model3d(
            cmd.page, a.id, a.name, a.mime, a.size, cmd.format,
            files.map((x) => x.path), files.map((x) => x.asset.id), files.map((x) => x.asset.name), files.map((x) => x.asset.mime),
            new Float64Array(files.map((x) => x.asset.size)),
            cmd.w, cmd.h, cmd.yaw, cmd.pitch, q?.id ?? undefined, q?.name ?? "", q?.mime ?? "", q?.size ?? 0, new Float64Array(cmd.matrix),
          ),
        );
      }
      case "SetModel3dView": {
        const q = cmd.snapshot;
        return toChange(this.d.set_model3d_view(cmd.id, cmd.yaw, cmd.pitch, q?.id ?? undefined, q?.name ?? "", q?.mime ?? "", q?.size ?? 0));
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
      case "ApplyBackground": {
        // Clé absente (ligne brute) lue comme null, comme dans le faux cœur : « pas de fond », « pas de grille ».
        const b = cmd.backdrop ?? null;
        const g = cmd.grid ?? null;
        const [visible, snap, above, kinds, colors, lines, nums] = gridArgs(g ?? NO_GRID);
        return toChange(
          this.d.apply_background(
            [...cmd.pages], cmd.color, b?.asset.id ?? undefined, b?.asset.name ?? "", b?.asset.mime ?? "", b?.asset.size ?? 0,
            b?.w ?? 0, b?.h ?? 0, b?.fit ?? "width", g !== null, visible, snap, above, kinds, colors, lines, nums,
          ),
        );
      }
      case "AddTable":
        return toChange(
          this.d.add_table(cmd.page, cmd.x, cmd.y, toU32(cmd.cols), toU32(cmd.rows), cmd.colWidth, cmd.rowHeight, cmd.color, cmd.size),
        );
      case "SetTableCell":
        return toChange(this.d.set_table_cell(cmd.id, cmd.row, cmd.col, cmd.content, cmd.rowHeight, spansArg(cmd.spans)));
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
      case "Fill": {
        const t = cmd.target;
        // C6b (B2) : une image reçoit le nouvel asset à plat ; null → undefined : Option::None (« Aucune ») ; le fond n'a pas d'id.
        if (t.kind === "image") {
          const a = t.asset;
          return toChange(this.d.fill_image(cmd.page, t.id, a.id, a.name, a.mime, a.size, cmd.color ?? undefined));
        }
        // C8 (Q10) : zone fermée calculée par le cœur à l'écriture ; null → undefined : « Aucune ».
        if (t.kind === "zone") return toChange(this.d.fill_zone(cmd.page, t.x, t.y, t.tol, cmd.color ?? undefined));
        return toChange(this.d.fill(cmd.page, t.kind, t.kind === "background" ? undefined : t.id, cmd.color ?? undefined));
      }
      case "SetImageParams":
        // C5 (I6) : réglages à plat ; seule la référence de l'asset vit dans l'élément ; C6b (B11) : `restore`.
        return toChange(this.d.set_image_params(cmd.id, ...imageParamsArgs(cmd.params), new Float64Array(cmd.matrix), cmd.restore === true));
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
  linkedAssets(): LinkedAsset[] {
    const v: unknown = this.d.linked_assets();
    if (!Array.isArray(v)) throw new Error("LinkedAsset invalide");
    return v.map((x: unknown) => {
      if (!isRecord(x) || typeof x["id"] !== "string" || typeof x["path"] !== "string") throw new Error("LinkedAsset invalide");
      return { id: x["id"], path: x["path"] };
    });
  }
  relinkAssets(links: readonly LinkedAsset[]): number { return this.d.relink_assets(links.map((l) => l.id), links.map((l) => l.path)); }
  points(id: string): Float32Array | null { return this.d.points(id) ?? null; }
  outline(id: string): Float32Array | null { return this.d.outline(id) ?? null; }
  fillRings(id: string): Float32Array | null { return this.d.fill_rings(id) ?? null; }
  zoneCells(page: string, tol: number): number { return this.d.zone_cells(page, tol); }
  hitTest(page: string, x: number, y: number, tol: number): string | null { return this.d.hit_test(page, x, y, tol) ?? null; }
  edgeHit(id: string, x: number, y: number, tol: number): boolean { return this.d.edge_hit(id, x, y, tol); }
  hitTestPath(page: string, path: Float32Array, radius: number): string[] { return this.d.hit_test_path(page, path, radius); }
  idsInRect(page: string, r: Bounds): string[] { return this.d.ids_in_rect(page, r.x0, r.y0, r.x1, r.y1); }
  bounds(ids: readonly string[]): Bounds | null { return toBounds(this.d.bounds([...ids])); }
  undo(): Change { return toChange(this.d.undo()); }
  redo(): Change { return toChange(this.d.redo()); }
  canUndo(): boolean { return this.d.can_undo(); }
  canRedo(): boolean { return this.d.can_redo(); }
  version(): number { return this.d.version(); }
  save(now: string, appVersion: string): Uint8Array { return this.d.save(now, appVersion); }
  saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array] { return takeParts(this.d.save_parts(now, appVersion)); }

  /** Source d'une insertion : même liaison exigée (DAZ2). */
  private other(src: CoreDocument): Wasm.Document {
    if (!(src instanceof WasmCoreDocument)) throw new Error(MIXED_SOURCE_MESSAGE);
    return src.d;
  }
  extract(page: string, ids: readonly string[]): CoreDocument { return new WasmCoreDocument(this.d.extract(page, [...ids]), this.mod); }
  insertFragment(src: CoreDocument, page: string, dx: number, dy: number): Change { return toChange(this.d.insert_fragment(this.other(src), page, dx, dy)); }
  insertPages(src: CoreDocument, after: string): Change { return toChange(this.d.insert_pages(this.other(src), after)); }
  saveFragment(now: string, appVersion: string, name: string): Uint8Array { return this.d.save_fragment(now, appVersion, name); }
  saveFragmentParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    return takeParts(this.d.save_fragment_parts(now, appVersion, name));
  }
  saveGrid(now: string, appVersion: string, name: string): Uint8Array { return this.d.save_grid(now, appVersion, name); }
  saveGridParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    return takeParts(this.d.save_grid_parts(now, appVersion, name));
  }

  newStrokeBuilder(style: StrokeStyle, constant = false): StrokeBuilderApi {
    const b = new this.mod.StrokeBuilder(style.width, constant);
    return {
      push: (p: Float32Array, ahead?: Float32Array) => (ahead && ahead.length > 0 ? b.push_ahead(p, ahead) : b.push(p)),
      finish: () => b.finish(),
      free: () => b.free(),
    };
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

/** Le cœur ne rend que ces trois valeurs ; toute autre est une erreur de liaison. */
const asContainerKind = (k: string): ContainerKind => {
  if (k === "document" || k === "fragment" || k === "grid") return k;
  throw new Error(`type de conteneur inattendu : ${k}`);
};

export function createWasmCore(mod: WasmModule): CoreFactory {
  return {
    blank: (mode?: PageLayout) => new WasmCoreDocument(mod.Document.blank(mode), mod),
    fromPdfPages: (asset: AssetRef, sizes: readonly PdfPageSize[], original?: AssetRef) => {
      const flat = new Float64Array(sizes.flatMap((s) => [s.w, s.h]));
      return new WasmCoreDocument(
        original === undefined
          ? mod.Document.from_pdf_pages(asset.id, asset.name, asset.mime, asset.size, flat)
          : mod.Document.from_office_pages(asset.id, asset.name, asset.mime, asset.size, flat, original.id, original.name, original.mime, original.size),
        mod,
      );
    },
    load: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load(bytes), mod),
    loadParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_parts(manifest, ybin), mod),
    loadFragment: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load_fragment(bytes), mod),
    loadFragmentParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_fragment_parts(manifest, ybin), mod),
    loadGrid: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load_grid(bytes), mod),
    loadGridParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_grid_parts(manifest, ybin), mod),
    manifestKind: (manifest: Uint8Array) => asContainerKind(mod.Document.manifest_kind(manifest)),
    containerKind: (bytes: Uint8Array) => asContainerKind(mod.Document.container_kind(bytes)),
    version: () => mod.version(),
  };
}
