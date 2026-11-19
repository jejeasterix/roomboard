// Adaptateur du vrai module Wasm (T15) vers le contrat figé `api.ts` (T8). Toute valeur venue de Wasm est contrôlée :
// une dérive de forme entre Rust et TS lève une erreur au lieu de passer sous un `as`.
import type { Bounds, Change, Command, CoreDocument, CoreFactory, ElementView, Matrix, StrokeBuilderApi, StrokeStyle } from "./api";
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

export function toElementView(v: unknown): ElementView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error("ElementView invalide");
  const { id, kind, transform, style } = v;
  if (typeof id !== "string" || !isNumbers(transform) || transform.length !== 6 || !isRecord(style)) {
    throw new Error("ElementView invalide");
  }
  const [a, b, c, d, e, f] = transform;
  if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) {
    throw new Error("ElementView invalide");
  }
  const { color, width } = style;
  if (typeof color !== "string" || typeof width !== "number") throw new Error("ElementView invalide");
  const base = { id, transform: [a, b, c, d, e, f] as Matrix, style: { color, width } };
  if (kind === "stroke") return { ...base, kind };
  if (kind === "shape") {
    const s = v["shape"];
    if (!isRecord(s)) throw new Error("ElementView invalide");
    const { shape, w, h, fill } = s;
    if (typeof shape !== "string" || !isShapeKind(shape) || typeof w !== "number" || typeof h !== "number") {
      throw new Error("ElementView invalide");
    }
    if (fill !== undefined && fill !== null && typeof fill !== "string") throw new Error("ElementView invalide");
    return { ...base, kind, shape: { shape, w, h, fill: typeof fill === "string" ? fill : null } };
  }
  if (kind === "text") {
    const t = v["text"];
    if (!isRecord(t)) throw new Error("ElementView invalide");
    const { content, size, boxWidth, boxHeight } = t;
    if (typeof content !== "string" || typeof size !== "number" || typeof boxWidth !== "number" || typeof boxHeight !== "number") {
      throw new Error("ElementView invalide");
    }
    return { ...base, kind, text: { content, size, boxWidth, boxHeight } };
  }
  throw new Error("ElementView invalide");
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
      case "SetText":
      case "Transform":
        throw new Error(`commande non liée avant T54 : ${cmd.type}`);
    }
  }

  // wasm-bindgen rend `undefined` pour une `Option::None` ; le contrat dit `null`.
  element(id: string): ElementView | null { return toElementView(this.d.element(id)); }
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
    version: () => mod.version(),
  };
}
