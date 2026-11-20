// Adaptateur du vrai module Wasm (T15) vers le contrat figé `api.ts` (T8). Toute valeur venue de Wasm est contrôlée :
// une dérive de forme entre Rust et TS lève une erreur au lieu de passer sous un `as`.
import type {
  AssetInfo,
  BackdropView,
  Bounds,
  Change,
  Command,
  CoreDocument,
  CoreFactory,
  ElementView,
  Matrix,
  PageView,
  StrokeBuilderApi,
  StrokeStyle,
} from "./api";
import { UNKNOWN_BOX } from "./api";
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
      return { ...base, kind, style, text: { content, size, boxWidth, boxHeight } };
    }
    case "image": {
      const i = v["image"];
      if (!isRecord(i)) throw new Error(ELEMENT);
      const { asset, w, h } = i;
      if (typeof asset !== "string" || typeof w !== "number" || typeof h !== "number") throw new Error(ELEMENT);
      return { ...base, kind, image: { asset, w, h } };
    }
    case "unknown": {
      const u = v["unknown"];
      if (!isRecord(u)) throw new Error(ELEMENT);
      const { sourceKind, w, h } = u;
      if (typeof sourceKind !== "string" || !finitePositive(w) || !finitePositive(h)) throw new Error(ELEMENT);
      return { ...base, kind, unknown: { sourceKind, w, h } };
    }
    default: {
      // Kind d'une version plus récente : gardé comme cadre, boîte lue si elle est lisible, sinon UNKNOWN_BOX.
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

export function toPageView(v: unknown): PageView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { id, width, height, background } = v;
  if (typeof id !== "string" || typeof width !== "number" || typeof height !== "number" || typeof background !== "string") {
    throw new Error(PAGE);
  }
  return { id, width, height, background, backdrop: toBackdropView(v["backdrop"]) };
}

export function toAssetInfo(v: unknown): AssetInfo {
  if (!isRecord(v)) throw new Error("AssetInfo invalide");
  const { id, name, mime, size } = v;
  if (typeof id !== "string" || typeof name !== "string" || typeof mime !== "string" || typeof size !== "number") {
    throw new Error("AssetInfo invalide");
  }
  return { id, name, mime, size };
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
}

export function createWasmCore(mod: WasmModule): CoreFactory {
  return {
    blank: () => new WasmCoreDocument(mod.Document.blank(), mod),
    load: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load(bytes), mod),
    loadParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_parts(manifest, ybin), mod),
    version: () => mod.version(),
  };
}
