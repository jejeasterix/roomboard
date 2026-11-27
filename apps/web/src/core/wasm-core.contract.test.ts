// Contrat du vrai module Wasm (D33) : chargé en Node par `initSync` sur les octets, joué contre `api.ts` (T8).
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer le contrat au lieu de le sauter.
import { describe, expect, it } from "vitest";
import type { AssetRef, CellIds, Change, Command, CoreDocument, CoreFactory, GridInput, GridLevel, ImageElement, ImageParams, Matrix, ShapeKind, TableData, TextAttrs, TextAttrsPatch, TextSpan } from "./api";
import { BAD_GROUP_MESSAGE, BAD_IMAGE_PARAMS_MESSAGE, BAD_MEDIA_MESSAGE, MIXED_SOURCE_MESSAGE, NOT_A_DOCUMENT_MESSAGE, NOT_A_FRAGMENT_MESSAGE, PACK_MESSAGE, unknownKindMessage } from "./api";
import { BAD_MODEL3D_MESSAGE, DEFAULT_MODEL3D_PITCH, DEFAULT_MODEL3D_YAW, MAX_MODEL3D_FILES, MAX_MODEL3D_PATH, MODEL3D_PITCH_LIMIT } from "./api";
import { IDENTITY as CAMERA_IDENTITY } from "../engine/camera";
import { Canvas2DRenderer } from "../engine/render/canvas2d";
import { asCtx, FakeCtx } from "../engine/render/fake-ctx";
import { fakeCore } from "./fake-core";
import { normalizeShape } from "./shapes";
import { createWasmCore, gridArgs, imageParamsArgs, toAssetInfo, toBounds, toChange, toElementView, toGridLines, toPageView, toPair, type WasmModule } from "./wasm-core";

// `apps/web` n'a pas `@types/node` : `node:fs` par import dynamique typé localement, `process` par `globalThis`.
interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm/roomboard_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);
const required = env["ROOMBOARD_WASM_REQUIRED"] === "1";

it("le module wasm est présent quand il est exigé", () => {
  if (required) expect(present).toBe(true);
});

const style = { color: "#1e40af", width: 4 };
const hline = (y: number): Float32Array => {
  const a: number[] = [];
  for (let i = 0; i <= 40; i++) a.push(100 + i * 10, y, 0.5);
  return new Float32Array(a);
};
const first = (d: CoreDocument): string => {
  const p = d.pageIds()[0];
  if (p === undefined) throw new Error("aucune page");
  return p;
};
const commit = (d: CoreDocument, page: string, y: number): string => {
  const id = d.apply({ type: "CommitStroke", page, points: hline(y), style }).ids[0];
  if (id === undefined) throw new Error("aucun id");
  return id;
};
const messageOf = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    return e instanceof Error ? e.message : `non-Error : ${String(e)}`;
  }
  return "aucune erreur";
};
// Aucune étape, aucun changement de version ni de pages (D38) ; partagé par les deux blocs `describe.each`.
const unchanged = (d: CoreDocument, run: () => unknown): void => {
  const v = d.version();
  const pages = d.pageIds();
  const undo = d.canUndo();
  run();
  expect(d.version()).toBe(v);
  expect(d.pageIds()).toEqual(pages);
  expect(d.canUndo()).toBe(undo);
};

// Import par URL calculée (`@vite-ignore`) : un import littéral d'un fichier absent casserait la collecte du test
// même sauté. Le type vient de `typeof import(...)`, effacé à l'exécution.
type WasmJs = typeof import("../wasm/roomboard_wasm");
interface Loaded { readonly core: CoreFactory; readonly capabilities: (platform: string) => unknown }
async function loadWasm(): Promise<Loaded> {
  const href = new URL("../wasm/roomboard_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as WasmJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return { core: createWasmCore(mod), capabilities: (platform: string) => mod.capabilities(platform) };
}
const loaded: Loaded | null = present ? await loadWasm() : null;
const need = (): Loaded => {
  if (loaded === null) throw new Error("module wasm absent");
  return loaded;
};

describe("contrôle de forme des valeurs venues de Wasm", () => {
  const change = { pages: ["p1"], ids: ["e1"], removed: [], full: false, version: 3 };

  it("toChange recopie un Change bien formé et refuse une dérive de forme", () => {
    expect(toChange(change)).toEqual(change);
    expect(() => toChange({ ...change, version: "3" })).toThrow("Change invalide");
    expect(() => toChange({ pages: ["p1"], ids: ["e1"], full: false, version: 3 })).toThrow("Change invalide");
    expect(() => toChange({ ...change, ids: [1] })).toThrow("Change invalide");
    expect(() => toChange(undefined)).toThrow("Change invalide");
  });

  it("toElementView et toBounds : null pour rien, erreur pour une forme fausse", () => {
    const view = { id: "e1", kind: "stroke", transform: [1, 0, 0, 1, 5, 6], style: { color: "#000", width: 2 } };
    expect(toElementView(view)).toEqual(view);
    expect(toElementView(undefined)).toBeNull();
    expect(() => toElementView({ ...view, transform: [1, 0, 0, 1, 5] })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...view, kind: "shape" })).toThrow("ElementView invalide");
    expect(toBounds({ x0: 0, y0: 1, x1: 2, y1: 3 })).toEqual({ x0: 0, y0: 1, x1: 2, y1: 3 });
    expect(toBounds(undefined)).toBeNull();
    expect(() => toBounds({ x0: 0, y0: 1, x1: 2 })).toThrow("Bounds invalide");
  });

  it("toElementView : des segments qui ne redonnent pas le contenu sont une dérive du cœur (C7)", () => {
    const spans = [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { bold: true } }];
    const text = { content: "Le chat", size: 36, boxWidth: 600, boxHeight: 45, spans };
    const view = { id: "t1", kind: "text", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 0 }, text };
    expect(toElementView(view)).toEqual(view);
    expect(toElementView({ ...view, text: { ...text, content: "", spans: [{ text: "", attrs: {} }] } })).toMatchObject({ kind: "text" });
    expect(() => toElementView({ ...view, text: { ...text, content: "Le chat noir" } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...view, text: { ...text, spans: [{ text: "Le ", attrs: {} }, { text: "chien", attrs: {} }] } })).toThrow(
      "ElementView invalide",
    );
  });

  // Discrimine le patron écarté (T54) : un `as Change` sur le retour de `add_shape`, `set_text` ou `transform`
  // laisserait passer ce Change sans `removed` ; l'adaptateur doit le lever par `toChange`. Module factice : seul le
  // test, pas l'adaptateur, force son type.
  it("AddShape, SetText et Transform : retour contrôlé par toChange, arguments dans l'ordre de la liaison", () => {
    const drift = { pages: ["p1"], ids: ["e1"], full: false, version: 1 };
    const calls: unknown[][] = [];
    const record = (name: string) => (...args: unknown[]): unknown => {
      calls.push([name, ...args]);
      return drift;
    };
    const doc = { add_shape: record("add_shape"), set_text: record("set_text"), transform: record("transform") };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    const pen = { color: "#1e40af", width: 4 };
    expect(() => d.apply({ type: "AddShape", page: "p1", shape: "rect", x0: 1, y0: 2, x1: 3, y1: 4, style: pen, fill: "#ff0000" }))
      .toThrow("Change invalide");
    expect(() =>
      d.apply({ type: "SetText", page: "p1", id: "e1", x: 5, y: 6, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }),
    ).toThrow("Change invalide");
    expect(() => d.apply({ type: "Transform", ids: ["e1", "e2"], matrix: [2, 0, 0, 2, 10, 20] })).toThrow("Change invalide");
    expect(calls).toEqual([
      ["add_shape", "p1", "rect", 1, 2, 3, 4, "#1e40af", 4, "#ff0000"],
      ["set_text", "p1", "e1", 5, 6, "Bonjour", "#000000", 36, 600, 45, undefined],
      ["transform", ["e1", "e2"], new Float64Array([2, 0, 0, 2, 10, 20])],
    ]);
  });

  // Discrimine le patron écarté (T8) : lever en fin de `toElementView` sur un kind non reconnu, ou exiger `style`
  // pour tout élément, ferait échouer la lecture d'une image ou d'un élément venu d'une version plus récente (U3).
  it("toElementView : image et kind inconnu sans style, kind non reconnu → unknown", () => {
    const t = [1, 0, 0, 1, 5, 6];
    const hash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(toElementView({ id: "i1", kind: "image", transform: t, image: { asset: hash, w: 2, h: 3 } })).toEqual({
      id: "i1", kind: "image", transform: t, image: { asset: hash, w: 2, h: 3 },
    });
    const u = { id: "u1", kind: "unknown", transform: t, unknown: { sourceKind: "hologram", w: 300, h: 200 } };
    expect(toElementView(u)).toEqual(u);
    expect(toElementView({ id: "u2", kind: "video3d", transform: t })).toEqual({
      id: "u2", kind: "unknown", transform: t, unknown: { sourceKind: "video3d", w: 100, h: 100 },
    });
    expect(toElementView({ id: "u3", kind: "video3d", transform: t, unknown: { w: 40, h: 30 } })).toEqual({
      id: "u3", kind: "unknown", transform: t, unknown: { sourceKind: "video3d", w: 40, h: 30 },
    });
    expect(() => toElementView({ id: "u4", kind: "video3d", transform: [1, 0] })).toThrow("ElementView invalide");
    expect(() => toElementView({ kind: "video3d", transform: t })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "i2", kind: "image", transform: t })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...u, unknown: { sourceKind: "x", w: 0, h: 1 } })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "s1", kind: "stroke", transform: t })).toThrow("ElementView invalide");
  });

  it("toPageView et toAssetInfo : null pour rien, erreur pour une forme fausse", () => {
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff", mode: "page" };
    expect(toPageView(undefined)).toBeNull();
    expect(toPageView({ ...page, backdrop: undefined })).toEqual({ ...page, backdrop: null, grid: null });
    const b = { asset: "a".repeat(64), kind: "pdf-page", w: undefined, h: 5, fit: "contain", rect: undefined };
    expect(toPageView({ ...page, backdrop: b })).toEqual({ ...page, backdrop: { ...b, page: null, w: null, rect: null, original: null }, grid: null });
    expect(() => toPageView({ ...page, width: "1920" })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, backdrop: { ...b, asset: 3 } })).toThrow("PageView invalide");
    const info = { id: "a".repeat(64), name: "n", mime: "image/png", size: 3 };
    expect(toAssetInfo(info)).toEqual(info);
    expect(() => toAssetInfo({ ...info, size: "3" })).toThrow("AssetInfo invalide");
  });

  it("AddImage et SetBackdrop : retour contrôlé par toChange, arguments dans l'ordre de la liaison", () => {
    const drift = { pages: ["p1"], ids: ["e1"], full: false, version: 1 };
    const calls: unknown[][] = [];
    const record = (name: string) => (...args: unknown[]): unknown => {
      calls.push([name, ...args]);
      return drift;
    };
    const doc = { add_image: record("add_image"), set_backdrop: record("set_backdrop"), clear_backdrop: record("clear_backdrop") };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    const a = { id: "a".repeat(64), name: "n.png", mime: "image/png", size: 3 };
    expect(() => d.apply({ type: "AddImage", page: "p1", asset: a, w: 2, h: 3, matrix: [1, 0, 0, 1, 4, 5] })).toThrow("Change invalide");
    expect(() => d.apply({ type: "SetBackdrop", page: "p1", backdrop: { asset: a, w: 10, h: 20, fit: "width" } })).toThrow("Change invalide");
    expect(() => d.apply({ type: "SetBackdrop", page: "p1", backdrop: null })).toThrow("Change invalide");
    expect(calls).toEqual([
      ["add_image", "p1", a.id, "n.png", "image/png", 3, 2, 3, new Float64Array([1, 0, 0, 1, 4, 5])],
      ["set_backdrop", "p1", a.id, "n.png", "image/png", 3, 10, 20, "width"],
      ["clear_backdrop", "p1"],
    ]);
  });
});

// Contrat commun (D36) : la fausse liaison, sur laquelle le lot 3 code, et le vrai module jouent les mêmes scénarios
// et cas limites. Deux exceptions : la gomme partielle (la fausse liaison ne coupe pas) et la zone fermée du pot (C8,
// Q17 : la fausse liaison traite `Fill { kind: "zone" }` comme le fond) ; leurs scénarios restent dans les blocs du
// vrai module (écarts documentés dans `fake-core.ts`).
const factories: { name: string; f: CoreFactory }[] = [
  { name: "fausse liaison", f: fakeCore },
  ...(loaded === null ? [] : [{ name: "vrai module wasm", f: loaded.core }]),
];
const now = "2026-11-16T14:00:00Z";

describe.each(factories)("contrat commun : $name", ({ f }) => {
  it("blank : une page, rien à annuler", () => {
    const d = f.blank();
    expect(d.pageIds()).toHaveLength(1);
    expect(d.canUndo()).toBe(false);
    expect(d.undo().full).toBe(false);
    d.free();
  });

  it("S2 sans la coupe : gomme d'objet, annuler, rétablir, recharger, octets stables au rechargement", () => {
    const d = f.blank();
    const p = first(d);
    commit(d, p, 100);
    commit(d, p, 200);
    commit(d, p, 300);
    const e = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 195, 300, 205]), radius: 5, mode: "object" });
    expect(e.pages).toEqual([p]);
    expect(e.removed).toHaveLength(1);
    expect(d.elementIds(p)).toHaveLength(2);
    expect(d.undo().full).toBe(true);
    expect(d.elementIds(p)).toHaveLength(3);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(2);
    const saved = d.save(now, "0.1.0");
    const back = f.load(saved);
    expect(back.elementIds(p)).toEqual(d.elementIds(p));
    for (const id of d.elementIds(p)) {
      expect(back.element(id)).toEqual(d.element(id));
      expect(Array.from(back.points(id) ?? [])).toEqual(Array.from(d.points(id) ?? []));
    }
    expect(back.canUndo()).toBe(false);
    // Mêmes octets d'un rechargement au suivant (D25). Pas `back.save === saved` : le document vivant garde le
    // contenu des éléments supprimés (rétablir), le rechargement le collecte ; le fichier n'est stable qu'ensuite.
    const again = back.save(now, "0.1.0");
    const third = f.load(again);
    expect(third.save(now, "0.1.0")).toEqual(again);
    third.free();
    back.free();
    d.free();
  });

  it("S3 : suppression de page annulée, dernière page refusée", () => {
    const d = f.blank();
    const p1 = first(d);
    const p2 = d.apply({ type: "AddPage", after: p1 }).pages[0] ?? "";
    const s = commit(d, p2, 500);
    d.apply({ type: "RemovePage", page: p2 });
    expect(d.pageIds()).toEqual([p1]);
    d.undo();
    expect(d.pageIds()).toEqual([p1, p2]);
    expect(d.elementIds(p2)).toEqual([s]);
    d.apply({ type: "RemovePage", page: p2 });
    expect(() => d.apply({ type: "RemovePage", page: p1 })).toThrow(/dernière page/);
    d.free();
  });

  it("un élément inconnu rend null, jamais undefined", () => {
    const d = f.blank();
    expect(d.element("inconnu")).toBeNull();
    expect(d.points("inconnu")).toBeNull();
    expect(d.outline("inconnu")).toBeNull();
    expect(d.hitTest(first(d), 0, 0, 1)).toBeNull();
    d.free();
  });

  it("gomme d'objet et Delete", () => {
    const d = f.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    const b = commit(d, p, 200);
    const c = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 195, 300, 205]), radius: 5, mode: "object" });
    expect(c.removed).toEqual([b]);
    expect(d.apply({ type: "Delete", ids: [a] }).removed).toEqual([a]);
    expect(d.elementIds(p)).toHaveLength(0);
    d.free();
  });

  it("Delete d'ids inconnus : aucun changement, aucune étape (D38)", () => {
    const d = f.blank();
    const v = d.version();
    unchanged(d, () => {
      expect(d.apply({ type: "Delete", ids: ["inconnu"] })).toEqual({ pages: [], ids: [], removed: [], full: false, version: v });
    });
    d.free();
  });

  it("Delete rend les pages des éléments retirés, sans doublon ni id inconnu", () => {
    const d = f.blank();
    const p1 = first(d);
    const p2 = d.apply({ type: "AddPage", after: p1 }).pages[0] ?? "";
    const a = commit(d, p1, 100);
    const b = commit(d, p2, 100);
    commit(d, p2, 300);
    const c = d.apply({ type: "Delete", ids: [b, "inconnu", a, b] });
    expect(c.pages).toEqual([p1, p2].sort());
    expect([...c.removed].sort()).toEqual([a, b].sort());
    expect(c.ids).toEqual([]);
    expect(d.apply({ type: "Delete", ids: [d.elementIds(p2)[0] ?? ""] }).pages).toEqual([p2]);
    d.free();
  });

  it("une erreur de commande ne change rien et n'ajoute aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    commit(d, p, 100);
    const nan = new Float32Array([0, 0, 0.5, Number.NaN, 1, 0.5]);
    const erase = (page: string, path: number[]): unknown =>
      d.apply({ type: "Erase", page, path: new Float32Array(path), radius: 5, mode: "object" });
    unchanged(d, () => {
      expect(() => d.apply({ type: "AddPage", after: "inconnue" })).toThrow(/^page inconnue : inconnue$/);
      expect(() => d.apply({ type: "RemovePage", page: "inconnue" })).toThrow(/^page inconnue : inconnue$/);
      expect(() => d.apply({ type: "CommitStroke", page: p, points: nan, style })).toThrow(/^points invalides/);
      expect(() => erase(p, [1, Number.NaN])).toThrow(/^points invalides/);
      expect(() => erase(p, [1, 2, 3])).toThrow(/^points invalides/);
      expect(() => erase("inconnue", [1, 2])).toThrow(/^page inconnue : inconnue$/);
      for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const path = new Float32Array([300, 50, 300, 150]);
        expect(() => d.apply({ type: "Erase", page: p, path, radius: bad, mode: "partial" })).toThrow(/^rayon de gomme invalide/);
        expect(() => d.apply({ type: "Erase", page: p, path, radius: bad, mode: "object" })).toThrow(/^rayon de gomme invalide/);
        const thin = { color: "#000000", width: bad };
        expect(() => d.apply({ type: "CommitStroke", page: p, points: hline(400), style: thin })).toThrow(/^épaisseur de trait invalide/);
      }
    });
    d.free();
  });

  it("RemovePage d'une page inconnue sur une seule page : page inconnue, pas dernière page", () => {
    const d = f.blank();
    expect(() => d.apply({ type: "RemovePage", page: "inconnue" })).toThrow(/^page inconnue : inconnue$/);
    d.free();
  });

  it("une gomme qui ne touche rien : aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    commit(d, p, 100);
    const v = d.version();
    unchanged(d, () => {
      const c = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 800, 310, 800]), radius: 5, mode: "partial" });
      expect(c).toEqual({ pages: [], ids: [], removed: [], full: false, version: v });
    });
    d.free();
  });
});

// Lot 4 (T54) : les trois commandes jouées par les deux fabriques (CL4-6, CL4-7, CL4-8). Sous `verifier.sh`, le vrai
// module est exigé : ce bloc ne se réduit jamais à la fausse liaison seule.
describe.each(factories)("contrat lot 4 : $name", ({ f }) => {
  const pen = { color: "#1e40af", width: 4 };
  type Corners = [number, number, number, number];
  const shape = (d: CoreDocument, p: string, kind: ShapeKind, c: Corners, fill: string | null = null): string =>
    d.apply({ type: "AddShape", page: p, shape: kind, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: pen, fill }).ids[0] ?? "";
  const text = (d: CoreDocument, p: string, content: string, id: string | null = null) =>
    d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });

  it("AddShape : coins normalisés comme normalizeShape, une étape", () => {
    const d = f.blank();
    const p = first(d);
    const r = shape(d, p, "rect", [300, 200, 100, 50]);
    const g = normalizeShape("rect", 300, 200, 100, 50);
    expect(d.element(r)).toEqual({
      id: r,
      kind: "shape",
      transform: [1, 0, 0, 1, g.tx, g.ty],
      style: pen,
      shape: { shape: "rect", w: g.w, h: g.h, fill: null },
    });
    const a = shape(d, p, "arrow", [300, 200, 100, 50], "#ff0000");
    expect(d.element(a)).toMatchObject({ transform: [1, 0, 0, 1, 300, 200], shape: { shape: "arrow", w: -200, h: -150, fill: "#ff0000" } });
    d.undo();
    expect(d.elementIds(p)).toEqual([r]);
    d.free();
  });

  it("SetText : créer, remplacer, vider ; inchangé et boîte neuve vide = aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Bonjour").ids[0] ?? "";
    expect(d.element(id)).toEqual({
      id,
      kind: "text",
      transform: [1, 0, 0, 1, 100, 200],
      style: { color: "#000000", width: 0 },
      text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45, spans: [{ text: "Bonjour", attrs: {} }] },
    });
    const v = d.version();
    expect(text(d, p, "Bonjour", id).version).toBe(v);
    expect(text(d, p, "").version).toBe(v);
    expect(text(d, p, "Bonsoir", id).ids).toEqual([id]);
    expect(text(d, p, "", id).removed).toEqual([id]);
    d.undo();
    expect(d.element(id)).toMatchObject({ text: { content: "Bonsoir" } });
    d.free();
  });

  // Relevé de T49 : avec un id, `page`, `x` et `y` ne placent rien (la position passe par Transform) ; x et y restent
  // contrôlés (texte invalide s'ils ne sont pas finis).
  it("SetText avec un id : page, x et y ignorés, x et y non finis refusés", () => {
    const d = f.blank();
    const p = first(d);
    const p2 = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    const id = text(d, p, "Bonjour").ids[0] ?? "";
    const c = d.apply({ type: "SetText", page: p2, id, x: 0, y: 0, content: "Bonsoir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    expect(c.pages).toEqual([p]);
    expect(d.elementIds(p)).toEqual([id]);
    expect(d.elementIds(p2)).toEqual([]);
    expect(d.element(id)).toMatchObject({ transform: [1, 0, 0, 1, 100, 200], text: { content: "Bonsoir" } });
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "SetText", page: p, id, x: Number.NaN, y: 0, content: "x", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 })))
        .toBe("texte invalide (taille et boîte finies > 0 attendues)");
    });
    const r = d.apply({ type: "SetText", page: "inconnue", id, x: 5, y: 5, content: "", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    expect(r.pages).toEqual([p]);
    expect(r.removed).toEqual([id]);
    d.free();
  });

  it("Transform : compose à gauche, ids inconnus ignorés, identité sans étape", () => {
    const d = f.blank();
    const p = first(d);
    const a = shape(d, p, "rect", [100, 100, 200, 200]);
    const s = commit(d, p, 400);
    const c = d.apply({ type: "Transform", ids: [s, "absent", a], matrix: [2, 0, 0, 2, 0, 0] });
    expect(c.ids).toEqual([a, s].sort());
    expect(c.pages).toEqual([p]);
    d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 0] });
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 210, 200]);
    unchanged(d, () => d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 0, 0] }));
    unchanged(d, () => d.apply({ type: "Transform", ids: ["absent"], matrix: [1, 0, 0, 1, 5, 5] }));
    d.undo();
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 200, 200]);
    d.free();
  });

  it("formes et textes : hitTest sur la surface, bornes élargies, hitTestPath et Erase les ignorent", () => {
    const d = f.blank();
    const p = first(d);
    const r = shape(d, p, "rect", [600, 600, 800, 700]);
    const t = text(d, p, "Bonjour").ids[0] ?? "";
    expect(d.hitTest(p, 700, 650, 1)).toBe(r);
    expect(d.hitTest(p, 300, 220, 1)).toBe(t);
    expect(d.hitTest(p, 900, 650, 1)).toBeNull();
    expect(d.bounds([r])).toEqual({ x0: 598, y0: 598, x1: 802, y1: 702 });
    expect(d.bounds([t])).toEqual({ x0: 100, y0: 200, x1: 700, y1: 245 });
    expect(d.idsInRect(p, { x0: 590, y0: 590, x1: 810, y1: 710 })).toEqual([r]);
    expect(d.hitTestPath(p, new Float32Array([600, 650, 800, 650]), 10)).toEqual([]);
    unchanged(d, () => d.apply({ type: "Erase", page: p, path: new Float32Array([600, 650, 800, 650]), radius: 10, mode: "object" }));
    d.free();
  });

  // Constat 1 de T60 : la tolérance de hitTest est en unités monde des deux côtés. Discrimine le patron écarté (point
  // ramené en local puis `tol` appliquée en local) : à ×4 il prendrait le clic à 20 du bord (5 en local), à ×0,05 il
  // raterait la ligne à 2,9 (58 en local). Le cas anisotrope sépare la distance mesurée en monde de toute tolérance
  // divisée par un seul facteur d'échelle (plus grande ou plus petite valeur singulière, racine du déterminant).
  it("hitTest : tolérance en unités monde sur un élément mis à l'échelle (×4, ×0,05, anisotrope)", () => {
    const d = f.blank();
    const p = first(d);
    // Rectangle (0, 0)-(100, 50), trait 4 : polygone local (-2, -2)-(102, 52), monde (-8, -8)-(408, 208) à ×4.
    const big = shape(d, p, "rect", [0, 0, 100, 50]);
    d.apply({ type: "Transform", ids: [big], matrix: [4, 0, 0, 4, 0, 0] });
    expect(d.hitTest(p, 412, 100, 6)).toBe(big);
    expect(d.hitTest(p, 428, 100, 6)).toBeNull();
    d.apply({ type: "Delete", ids: [big] });
    // Ligne (0, 0)-(1000, 0), trait 4 : à ×0,05, segment monde (0, 0)-(50, 0), demi-épaisseur 0,1.
    const thin = shape(d, p, "line", [0, 0, 1000, 0]);
    d.apply({ type: "Transform", ids: [thin], matrix: [0.05, 0, 0, 0.05, 0, 0] });
    expect(d.hitTest(p, 25, 3, 6)).toBe(thin);
    expect(d.hitTest(p, 25, 10, 6)).toBeNull();
    d.apply({ type: "Delete", ids: [thin] });
    // Même rectangle à [4, 0, 0, 0,25] : monde (-8, -0,5)-(408, 13).
    const flat = shape(d, p, "rect", [0, 0, 100, 50]);
    d.apply({ type: "Transform", ids: [flat], matrix: [4, 0, 0, 0.25, 0, 0] });
    expect(d.hitTest(p, 200, 18, 6)).toBe(flat);
    expect(d.hitTest(p, 428, 6, 6)).toBeNull();
    d.free();
  });

  // T63 : le rayon de la gomme (`hitTestPath`, `Erase` d'objet et partielle) est en unités monde, et l'épaisseur d'un
  // trait transformé suit sa matrice (la fausse liaison suit le contour transformé du cœur). Trait `hline(0)` : centre
  // (100..500, 0), un point tous les 10, épaisseur 4. Discrimine le patron écarté (chemin ramené en local, rayon
  // appliqué en local) : à ×4 il mordrait à 20 du trait (5 en local), à ×0,05 il raterait le trait à 4 (80 en local) ;
  // et l'ancienne fausse liaison (`radius + width / 2`, épaisseur non mise à l'échelle) raterait le trait à 9 à ×4 et
  // le prendrait à 6 à ×0,05.
  it("gomme et hitTestPath : rayon en unités monde, épaisseur mise à l'échelle sur un trait transformé (×4, ×0,05)", () => {
    // [matrice, x monde au-dessus d'un point du trait, distance touchée, distance non touchée], rayon 5.
    const cases: [Matrix, number, number, number][] = [
      // ×4 : centre (400..2000, 0), demi-épaisseur monde 8 : touché à moins de 5 + 8 = 13.
      [[4, 0, 0, 4, 0, 0], 1200, 9, 20],
      // ×0,05 : centre (5..25, 0), demi-épaisseur monde 0,1 : touché à moins de 5,1.
      [[0.05, 0, 0, 0.05, 0, 0], 15, 4, 6],
    ];
    const fresh = (m: Matrix): { d: CoreDocument; p: string; id: string } => {
      const d = f.blank();
      const p = first(d);
      const id = commit(d, p, 0);
      d.apply({ type: "Transform", ids: [id], matrix: m });
      return { d, p, id };
    };
    for (const [m, x, near, far] of cases) {
      for (const [y, touched] of [[near, true], [far, false]] as const) {
        const probe = new Float32Array([x, y]);
        const label = `×${m[0]} à ${y}`;
        const h = fresh(m);
        expect(h.d.hitTestPath(h.p, probe, 5), `hitTestPath ${label}`).toEqual(touched ? [h.id] : []);
        h.d.free();
        for (const mode of ["object", "partial"] as const) {
          const e = fresh(m);
          const c = e.d.apply({ type: "Erase", page: e.p, path: probe, radius: 5, mode });
          expect(c.removed, `Erase ${mode} ${label}`).toEqual(touched ? [e.id] : []);
          e.d.free();
        }
      }
    }
  });

  // T63 : les bornes d'un trait transformé suivent aussi l'épaisseur mise à l'échelle (le cœur borne le contour porté
  // par la matrice). L'ancienne fausse liaison gardait ±2 (épaisseur 4) à toute échelle.
  it("bounds : épaisseur d'un trait transformé mise à l'échelle (×4, ×0,05)", () => {
    for (const [m, lo, hi] of [
      [[4, 0, 0, 4, 0, 0], 6, 10],
      [[0.05, 0, 0, 0.05, 0, 0], 0.05, 0.5],
    ] as [Matrix, number, number][]) {
      const d = f.blank();
      const id = commit(d, first(d), 0);
      d.apply({ type: "Transform", ids: [id], matrix: m });
      const b = d.bounds([id]);
      expect(b?.y1, `×${m[0]}`).toBeGreaterThan(lo);
      expect(b?.y1, `×${m[0]}`).toBeLessThan(hi);
      expect(b?.y0, `×${m[0]}`).toBeLessThan(-lo);
      expect(b?.y0, `×${m[0]}`).toBeGreaterThan(-hi);
      d.free();
    }
  });

  // T65 : rang 1 à 1e200 partout, déterminant NaN (inf - inf) : refusé par les deux fabriques, avec la même erreur.
  it("Transform : matrice de rang 1 à 1e200 (déterminant NaN) refusée", () => {
    const d = f.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    const before = d.element(a)?.transform;
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "Transform", ids: [a], matrix: [1e200, 1e200, 1e200, 1e200, 1e200, 1e200] }))).toBe(
        "matrice invalide (six nombres finis, inversible)",
      );
    });
    expect(d.element(a)?.transform).toEqual(before);
  });

  // Constats 2 et 3 de T60 : la matrice composée (pas seulement `matrix`) et la géométrie tirée des coins (pas seulement
  // les coins) sont contrôlées ; refus sans étape, la commande entière.
  it("Transform : matrice composée infinie ou presque singulière refusée ; AddShape : w, h, tx, ty non finis en f32 refusés", () => {
    const d = f.blank();
    const p = first(d);
    const badMatrix = "matrice invalide (six nombres finis, inversible)";
    const badShape = "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)";
    const a = commit(d, p, 100);
    const b = commit(d, p, 300);
    const huge: Matrix = [1e200, 0, 0, 1e200, 0, 0];
    d.apply({ type: "Transform", ids: [a], matrix: huge });
    const aHuge = d.element(a)?.transform;
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "Transform", ids: [a], matrix: huge }))).toBe(badMatrix);
    });
    expect(d.element(a)?.transform).toEqual(aHuge);
    const small: Matrix = [0.05, 0, 0, 0.05, 0, 0];
    for (let i = 0; i < 4; i++) d.apply({ type: "Transform", ids: [b], matrix: small });
    const b4 = d.element(b)?.transform;
    const fresh = commit(d, p, 500);
    const fresh0 = d.element(fresh)?.transform;
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "Transform", ids: [fresh, b], matrix: small }))).toBe(badMatrix);
    });
    expect(d.element(b)?.transform).toEqual(b4);
    expect(d.element(fresh)?.transform).toEqual(fresh0);
    const add = (kind: ShapeKind, c: Corners) => (): unknown =>
      d.apply({ type: "AddShape", page: p, shape: kind, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: pen, fill: null });
    unchanged(d, () => {
      expect(messageOf(add("rect", [-1e308, 0, 1e308, 10]))).toBe(badShape);
      expect(messageOf(add("rect", [0, 0, 1e39, 10]))).toBe(badShape);
      expect(messageOf(add("ellipse", [0, -1e39, 10, 0]))).toBe(badShape);
      expect(messageOf(add("rect", [1e39, 0, 1e39, 10]))).toBe(badShape);
      expect(messageOf(add("line", [0, 0, 1e39, 0]))).toBe(badShape);
    });
    d.free();
  });

  // Constats 4 et 5 de T60 : la pointe de flèche entre dans la collision et les bornes ; l'ellipse n'est plus sa boîte.
  it("hitTest et bounds : pointe de flèche prise et bornée, coin de la boîte d'une ellipse hors de l'ellipse", () => {
    const d = f.blank();
    const p = first(d);
    const arrow = shape(d, p, "arrow", [0, 0, 100, 0]);
    expect(d.hitTest(p, 90, 4.5, 0.1)).toBe(arrow);
    expect(d.hitTest(p, 50, 4.5, 0.1)).toBeNull();
    const b = d.bounds([arrow]);
    expect(b?.y1).toBeCloseTo(12 * Math.sin((25 * Math.PI) / 180), 4);
    expect(b?.y0).toBeCloseTo(-12 * Math.sin((25 * Math.PI) / 180), 4);
    d.apply({ type: "Delete", ids: [arrow] });
    const ellipse = shape(d, p, "ellipse", [0, 0, 100, 50]);
    expect(d.hitTest(p, 1, 1, 1)).toBeNull();
    expect(d.hitTest(p, 50, 25, 1)).toBe(ellipse);
    expect(d.bounds([ellipse])).toEqual({ x0: -2, y0: -2, x1: 102, y1: 52 });
    d.free();
  });

  it("save puis load garde formes, textes et matrices", () => {
    const d = f.blank();
    const p = first(d);
    const r = shape(d, p, "ellipse", [100, 100, 300, 200], "#ff0000");
    const t = text(d, p, "Bonjour").ids[0] ?? "";
    d.apply({ type: "Transform", ids: [r], matrix: [1, 0, 0, 1, 50, 0] });
    const e = f.load(d.save(now, "0.1.0"));
    expect(e.elementIds(p)).toEqual([r, t]);
    expect(e.element(r)).toEqual(d.element(r));
    expect(e.element(t)).toEqual(d.element(t));
    e.free();
    d.free();
  });

  it("erreurs des trois commandes : messages du contrat, aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "AddShape", page: p, shape: "line", x0: Number.NaN, y0: 0, x1: 1, y1: 1, style: pen, fill: null })))
        .toBe("forme invalide (rect, ellipse, line ou arrow, coins finis attendus)");
      expect(messageOf(() => d.apply({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 1, y1: 1, style: { color: "#000000", width: 0 }, fill: null })))
        .toBe("épaisseur de trait invalide (nombre fini > 0 attendu)");
      expect(messageOf(() => d.apply({ type: "AddShape", page: "inconnue", shape: "rect", x0: 0, y0: 0, x1: 1, y1: 1, style: pen, fill: null })))
        .toBe("page inconnue : inconnue");
      expect(messageOf(() => d.apply({ type: "Transform", ids: [a], matrix: [1, 2, 2, 4, 0, 0] })))
        .toBe("matrice invalide (six nombres finis, inversible)");
      expect(messageOf(() => d.apply({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "x", color: "#000000", size: 0, boxWidth: 600, boxHeight: 45 })))
        .toBe("texte invalide (taille et boîte finies > 0 attendues)");
      expect(messageOf(() => text(d, "inconnue", "x"))).toBe("page inconnue : inconnue");
      expect(messageOf(() => text(d, p, "x", a))).toBe(`élément inconnu : ${a}`);
      expect(messageOf(() => text(d, p, "x", "absent"))).toBe("élément inconnu : absent");
    });
    d.free();
  });
});

// C2 (cœur) : image, fond, métadonnées. T8 remplace `c2Factories` par `factories` (vrai module compris).
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const BAD_ASSET = "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)";
const BAD_IMAGE = "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)";
const png = { id: ABC, name: "photo.png", mime: "image/png", size: 3 } as const;
const jpg = { id: EMPTY_HASH, name: "fond.jpg", mime: "image/jpeg", size: 0 } as const;
const I: Matrix = [1, 0, 0, 1, 0, 0];
const c2Factories = factories;

describe.each(c2Factories)("contrat C2 : $name", ({ f }) => {
  const image = (d: CoreDocument, p: string, asset: AssetRef = png, matrix: Matrix = I): string =>
    d.apply({ type: "AddImage", page: p, asset, w: 640, h: 480, matrix }).ids[0] ?? "";

  it("AddImage : une étape, vue image sans style, une seule métadonnée pour deux images (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({ type: "AddImage", page: p, asset: png, w: 640, h: 480, matrix: [1, 0, 0, 1, 10, 20] });
    expect(c.pages).toEqual([p]);
    expect(c.ids).toHaveLength(1);
    const a = c.ids[0] ?? "";
    expect(d.element(a)).toEqual({ id: a, kind: "image", transform: [1, 0, 0, 1, 10, 20], image: { asset: ABC, w: 640, h: 480 } });
    const b = image(d, p, { ...png, name: "autre.png" });
    expect(d.elementIds(p)).toEqual([a, b]);
    expect(d.citedAssets()).toEqual([png]);
    d.undo();
    expect(d.asset(ABC)).toEqual(png);
    d.undo();
    expect(d.citedAssets()).toEqual([]);
    expect(d.asset(ABC)).toEqual({ id: ABC, name: ABC, mime: "application/octet-stream", size: 0 });
    expect(d.asset(ABC.toUpperCase())).toBeNull();
    d.free();
  });

  it("AddImage : erreurs sans étape, messages du contrat", () => {
    const d = f.blank();
    const p = first(d);
    const bad = (asset: typeof png | Record<string, unknown>, w: number, h: number, matrix: Matrix): string =>
      messageOf(() => d.apply({ type: "AddImage", page: p, asset: asset as typeof png, w, h, matrix }));
    unchanged(d, () => {
      expect(bad({ ...png, id: ABC.toUpperCase() }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad({ ...png, mime: "" }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad({ ...png, size: -1 }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad({ ...png, size: 1.5 }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad(png, 0, 1, I)).toBe(BAD_IMAGE);
      expect(bad(png, 1, Number.NaN, I)).toBe(BAD_IMAGE);
      expect(bad(png, 1, 1, [0, 0, 0, 0, 0, 0])).toBe("matrice invalide (six nombres finis, inversible)");
      expect(messageOf(() => d.apply({ type: "AddImage", page: "nulle-part", asset: png, w: 1, h: 1, matrix: I }))).toBe(
        "page inconnue : nulle-part",
      );
    });
    expect(d.citedAssets()).toEqual([]);
    d.free();
  });

  it("AddImage : à deux défauts, l'asset est contrôlé avant la boîte, la boîte avant la page", () => {
    const d = f.blank();
    const p = first(d);
    const msg = (page: string, asset: typeof png, w: number): string =>
      messageOf(() => d.apply({ type: "AddImage", page, asset, w, h: 1, matrix: I }));
    unchanged(d, () => {
      expect(msg(p, { ...png, id: ABC.toUpperCase() } as unknown as typeof png, 0)).toBe(BAD_ASSET);
      expect(msg("nulle-part", png, 0)).toBe(BAD_IMAGE);
    });
    expect(d.citedAssets()).toEqual([]);
    d.free();
  });

  it("image : hitTest dans sa boîte, Transform la déplace, gomme et hitTestPath l'ignorent", () => {
    const d = f.blank();
    const p = first(d);
    const a = image(d, p, png, [1, 0, 0, 1, 100, 100]);
    expect(d.hitTest(p, 400, 300, 0)).toBe(a);
    expect(d.bounds([a])).toEqual({ x0: 100, y0: 100, x1: 740, y1: 580 });
    unchanged(d, () => d.apply({ type: "Erase", page: p, path: new Float32Array([100, 300, 740, 300]), radius: 10, mode: "object" }));
    expect(d.hitTestPath(p, new Float32Array([100, 300, 740, 300]), 10)).toEqual([]);
    d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 0] });
    expect(d.element(a)?.transform).toEqual([1, 0, 0, 1, 110, 100]);
    d.free();
  });

  it("SetBackdrop (S3) : rect sur la largeur, page inchangée, aucun hitTest, même fond sans étape, retirer puis annuler", () => {
    const d = f.blank();
    const p = first(d);
    const before = d.page(p);
    expect(before).toEqual({ id: p, width: 1920, height: 1080, background: "#ffffff", backdrop: null, grid: null, mode: "page" });
    const fond = { asset: png, w: 1000, h: 500, fit: "width" };
    expect(d.apply({ type: "SetBackdrop", page: p, backdrop: fond }).pages).toEqual([p]);
    const rect = { x0: 0, y0: 0, x1: 1920, y1: 960 };
    expect(d.page(p)).toEqual({ ...before, backdrop: { asset: ABC, kind: "image", page: null, w: 1000, h: 500, fit: "width", rect, original: null } });
    expect(d.hitTest(p, 960, 480, 0)).toBeNull();
    expect(d.elementIds(p)).toEqual([]);
    expect(d.citedAssets()).toEqual([png]);
    unchanged(d, () => d.apply({ type: "SetBackdrop", page: p, backdrop: fond }));
    d.apply({ type: "SetBackdrop", page: p, backdrop: null });
    expect(d.page(p)?.backdrop).toBeNull();
    unchanged(d, () => d.apply({ type: "SetBackdrop", page: p, backdrop: null }));
    d.undo();
    expect(d.page(p)?.backdrop?.rect).toEqual(rect);
    expect(d.page("nulle-part")).toBeNull();
    d.free();
  });

  it("SetBackdrop : ajustement autre que width, boîte ou asset invalides refusés sans étape", () => {
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: png, w: 10, h: 10, fit: "contain" } }))).toBe(BAD_IMAGE);
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: png, w: 0, h: 10, fit: "width" } }))).toBe(BAD_IMAGE);
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: { ...png, mime: "" }, w: 10, h: 10, fit: "width" } }))).toBe(BAD_ASSET);
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: "nulle-part", backdrop: null }))).toBe("page inconnue : nulle-part");
    });
    d.free();
  });

  it("saveParts puis loadParts, save puis load : image, fond et métadonnées gardés ; recharger garde les octets", () => {
    const d = f.blank();
    const p = first(d);
    const a = image(d, p);
    d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: jpg, w: 1000, h: 500, fit: "width" } });
    expect(d.citedAssets().map((x) => x.id)).toEqual([ABC, EMPTY_HASH]);
    const [manifest, ybin] = d.saveParts(now, "0.1.0");
    const e = f.loadParts(manifest, ybin);
    expect(e.element(a)).toEqual(d.element(a));
    expect(e.page(p)).toEqual(d.page(p));
    expect(e.citedAssets()).toEqual(d.citedAssets());
    const file = d.save(now, "0.1.0");
    let cur = f.load(file);
    for (let i = 0; i < 5; i++) {
      const again = cur.save(now, "0.1.0");
      expect(again).toEqual(file);
      cur.free();
      cur = f.load(again);
    }
    cur.free();
    e.free();
    d.free();
  });
});

describe.skipIf(loaded === null)("contrat du vrai module wasm", () => {
  const core = {
    version: (): string => need().core.version(),
    blank: (): CoreDocument => need().core.blank(),
    load: (b: Uint8Array): CoreDocument => need().core.load(b),
  };

  const fixtureOf = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));

  it("élément de type inconnu : gardé, sans erreur (fixture binaire du cœur et fixture de la fausse liaison)", () => {
    const real = core.load(fixtureOf("../../../../crates/roomboard-core/tests/fixtures/element-inconnu.roomboard"));
    const fake = fakeCore.load(fixtureOf("./fixtures/element-inconnu.fake.json"));
    expect(real.element("h1")).toEqual({
      id: "h1", kind: "unknown", transform: [1, 0, 0, 1, 100, 50], unknown: { sourceKind: "hologram", w: 300, h: 200 },
    });
    for (const id of ["h1", "h2"]) expect(real.element(id)).toEqual(fake.element(id));
    expect(real.citedAssets()).toEqual(fake.citedAssets());
    expect(real.hitTest("p1", 50, 50, 0)).toBe("h2");
    expect(real.canUndo()).toBe(false);
    real.free();
  });

  it("fichier du socle : ouvert par le vrai module, réenregistré à l'identique (S5)", () => {
    const socle = fixtureOf("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard");
    const d = core.load(socle);
    expect(d.pageIds()).toHaveLength(2);
    expect(new Uint8Array(d.save("2026-11-20T00:00:00Z", "0.1.0"))).toEqual(socle);
    d.free();
  });

  it("S3 (C7) : le texte du socle a un seul segment et se dessine comme au socle", () => {
    const d = core.load(fixtureOf("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard"));
    const page = d.pageIds()[0] ?? "";
    const id = d.elementIds(page)[2] ?? "";
    const view = d.element(id);
    expect(view?.kind === "text" && view.text.spans).toEqual([plainSpan("Bonjour RoomBoard")]);
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: (x) => (x === id ? view : null), outline: () => null });
    r.drawScene({ id: page, elementIds: [id] }, CAMERA_IDENTITY, new Set());
    const tail = scene.log.slice(scene.log.findIndex((l) => l.startsWith("transform ")));
    expect(tail.filter((l) => l.startsWith("fillText"))).toEqual(["fillText Bonjour RoomBoard 0,0"]);
    expect(scene.texts).toEqual([
      { text: "Bonjour RoomBoard", x: 0, y: 0, font: '36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" },
    ]);
    expect(tail.some((l) => l.startsWith("fillRect"))).toBe(false);
    d.free();
  });

  it("version non vide", () => {
    expect(core.version().length).toBeGreaterThan(0);
  });

  it("CommitStroke rend un Change et des points locaux", () => {
    const d = core.blank();
    const p = first(d);
    const c = d.apply({ type: "CommitStroke", page: p, points: hline(100), style });
    expect(c.pages).toEqual([p]);
    expect(c.ids).toHaveLength(1);
    expect(c.version).toBe(1);
    const id = c.ids[0] ?? "";
    expect(d.element(id)?.transform).toEqual([1, 0, 0, 1, 100, 100]);
    expect(Array.from(d.points(id) ?? []).slice(0, 3)).toEqual([0, 0, 0.5]);
    d.free();
  });

  // Gomme partielle : hors du contrat commun, la fausse liaison ne coupe pas (écart documenté dans `fake-core.ts`).
  it("S2 au niveau du cœur par la liaison", () => {
    const d = core.blank();
    const p = first(d);
    commit(d, p, 100);
    commit(d, p, 200);
    commit(d, p, 300);
    const e = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 150, 300, 250]), radius: 10, mode: "partial" });
    expect(e.removed).toHaveLength(1);
    expect(d.elementIds(p)).toHaveLength(4);
    expect(d.undo().full).toBe(true);
    expect(d.elementIds(p)).toHaveLength(3);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(4);
    const back = core.load(d.save(now, "0.1.0"));
    expect(back.elementIds(p)).toEqual(d.elementIds(p));
    for (const id of d.elementIds(p)) {
      expect(back.element(id)).toEqual(d.element(id));
      expect(Array.from(back.points(id) ?? [])).toEqual(Array.from(d.points(id) ?? []));
    }
    expect(back.canUndo()).toBe(false);
    back.free();
    d.free();
  });

  it("le contour est un polygone x, y non vide", () => {
    const d = core.blank();
    const id = commit(d, first(d), 100);
    const o = d.outline(id);
    expect(o).not.toBeNull();
    expect((o?.length ?? 0) % 2).toBe(0);
    expect(o?.length ?? 0).toBeGreaterThan(6);
    d.free();
  });

  it("hitTest et hitTestPath", () => {
    const d = core.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    expect(d.hitTest(p, 300, 100, 2)).toBe(a);
    expect(d.hitTest(p, 300, 900, 2)).toBeNull();
    expect(d.hitTestPath(p, new Float32Array([150, 90, 150, 110]), 3)).toEqual([a]);
    d.free();
  });

  it("idsInRect et bounds", () => {
    const d = core.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    expect(d.idsInRect(p, { x0: 0, y0: 0, x1: 1000, y1: 1000 })).toEqual([a]);
    const b = d.bounds([a]);
    expect(b?.x0 ?? Infinity).toBeLessThanOrEqual(100);
    expect(d.bounds([])).toBeNull();
    d.free();
  });

  it("StrokeBuilder rend un contour pendant et à la fin du geste", () => {
    const d = core.blank();
    const b = d.newStrokeBuilder(style);
    expect(b.push(hline(10)).length).toBeGreaterThan(0);
    expect(b.finish().length).toBeGreaterThan(0);
    b.free();
    d.free();
  });

  it("StrokeBuilder : points prédits prolongent le contour vif sans être gardés (OF44)", () => {
    const d = core.blank();
    const b = d.newStrokeBuilder(style);
    const maxX = (o: Float32Array): number => o.reduce((m, v, i) => (i % 2 === 0 && Number.isFinite(v) ? Math.max(m, v) : m), -Infinity);
    const line = (x0: number, n: number): Float32Array => new Float32Array(Array.from({ length: n }, (_, i) => [x0 + i * 4, 0, 0.5]).flat());
    const plain = b.push(line(0, 30));
    const ahead = b.push(new Float32Array(0), line(120, 4));
    expect(maxX(ahead)).toBeGreaterThan(maxX(plain) + 8);
    expect(Array.from(b.push(new Float32Array(0)))).toEqual(Array.from(plain));
    b.free();
    d.free();
  });

  it("load d'octets quelconques lève une erreur lisible", () => {
    expect(() => core.load(new Uint8Array([1, 2, 3]))).toThrow(/n'est pas un document RoomBoard/);
  });

  // Le lot 3 code contre la fausse liaison (D36) : un message qui diffère changerait ce que l'utilisateur lit.
  it("les messages d'erreur sont ceux de la fausse liaison", () => {
    const messages = (f: CoreFactory): string[] => {
      const d = f.blank();
      const p = first(d);
      const out = [
        messageOf(() => f.load(new Uint8Array([1, 2, 3]))),
        messageOf(() => d.apply({ type: "RemovePage", page: p })),
        messageOf(() => d.apply({ type: "CommitStroke", page: "p9", points: hline(100), style })),
        messageOf(() => d.apply({ type: "CommitStroke", page: p, points: new Float32Array([1, 2]), style })),
      ];
      d.free();
      return out;
    };
    const [loadW, lastW, unknownW, pointsW] = messages(need().core);
    const [loadF, lastF, unknownF, pointsF] = messages(fakeCore);
    expect(loadF).toBe(loadW);
    expect(lastF).toBe(lastW);
    expect(unknownF).toBe(unknownW);
    expect(pointsW).toMatch(/^points invalides/);
    expect(pointsF).toMatch(/^points invalides/);
  });

  it("capabilities expose la table du cœur", () => {
    expect(need().capabilities("windows")).toEqual({ desktopAnnotation: true, multiWindow: true });
    expect(need().capabilities("ipados")).toEqual({ desktopAnnotation: false, multiWindow: false });
  });

  const c4Grid = {
    visible: true, snap: false, above: false,
    levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#7aa7d8", line: "solid", lineWidth: 1, snap: false, visible: true }],
  } as unknown as GridInput;
  const packManifest = new TextEncoder().encode('{"format":"roomboard","formatVersion":1,"schema":1,"appVersion":"x","created":"c","modified":"m","kind":"pack"}');

  it("C4 : grille en ressource écrite puis relue, kind « grid »", () => {
    const f = need().core;
    const d = f.blank();
    const p = d.pageIds()[0]!;
    d.apply({ type: "SetGrid", page: p, grid: c4Grid });
    const bytes = d.saveGrid("2026-11-21T08:00:00Z", "c4", "Seyès");
    expect(f.containerKind(bytes)).toBe("grid");
    const g = f.loadGrid(bytes);
    expect(g.page(g.pageIds()[0]!)?.grid).toEqual(c4Grid);
    const [manifest, ybin] = d.saveGridParts("2026-11-21T08:00:00Z", "c4", "Seyès");
    expect(f.manifestKind(manifest)).toBe("grid");
    const gp = f.loadGridParts(manifest, ybin);
    expect(gp.page(gp.pageIds()[0]!)?.grid).toEqual(c4Grid);
    gp.free();
    g.free();
    d.free();
  });

  it("C4 : une grille lue comme objet ou comme document : message de la grille", () => {
    const f = need().core;
    const d = f.blank();
    d.apply({ type: "SetGrid", page: d.pageIds()[0]!, grid: c4Grid });
    const bytes = d.saveGrid("2026-11-21T08:00:00Z", "c4", "G");
    expect(() => f.loadFragment(bytes)).toThrow("ce fichier est une grille RoomBoard : déposez-la sur une page");
    expect(() => f.load(bytes)).toThrow("ce fichier est une grille RoomBoard : déposez-la sur une page");
    d.free();
  });

  it("C4 : kind « pack » refusé par manifestKind avec le message du paquet (D26)", () => {
    expect(() => need().core.manifestKind(packManifest)).toThrow(PACK_MESSAGE);
  });

  it("C4 : faux cœur et vrai module disent la même chose pour « pack » et un type inconnu", () => {
    const f = need().core;
    expect(() => fakeCore.manifestKind(packManifest)).toThrow(PACK_MESSAGE);
    const autre = new TextEncoder().encode('{"format":"roomboard","formatVersion":1,"schema":1,"appVersion":"x","created":"c","modified":"m","kind":"autre"}');
    expect(() => f.manifestKind(autre)).toThrow(unknownKindMessage("autre"));
    expect(() => fakeCore.manifestKind(autre)).toThrow(unknownKindMessage("autre"));
  });
});

const BAD_FORMAT =
  "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)";
const plainSpan = (text: string): TextSpan => ({ text, attrs: {} });

// Discrimine le patron écarté (T9) : un `as ElementView` ou un `text` recopié sans contrôle de `spans` laisserait passer
// chaque dérive ci-dessous ; un nettoyage du patch vérifié par `toEqual` ignorerait la clé à `undefined`, d'où le
// `toStrictEqual` sur l'argument passé à `format_text`.
describe("contrat C7 : contrôle de forme des valeurs venues de Wasm", () => {
  it("toElementView : spans exigés et contrôlés (T8)", () => {
    const view = {
      id: "t1", kind: "text", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 0 },
      text: { content: "Le chat", size: 36, boxWidth: 600, boxHeight: 45, spans: [plainSpan("Le "), { text: "chat", attrs: { bold: true, italic: true, underline: true, color: "#ff0000", size: 48, font: "Georgia" } }] },
    };
    expect(toElementView(view)).toEqual(view);
    // Contenu « a », celui des segments : chaque dérive ci-dessous lève pour sa seule cause, pas pour un contenu
    // que ses segments ne redonnent pas (T12).
    const withSpans = (spans: unknown) => ({ ...view, text: { ...view.text, content: "a", spans } });
    expect(() => toElementView({ ...view, text: { content: "x", size: 36, boxWidth: 600, boxHeight: 45 } })).toThrow("ElementView invalide");
    const drifts: unknown[] = [[], "Le chat", [{ text: 1, attrs: {} }], [{ text: "a" }], [{ text: "a", attrs: { bold: false } }], [{ text: "a", attrs: { size: 0 } }], [{ text: "a", attrs: { color: 5 } }], [{ text: "a", attrs: { href: "x" } }]];
    for (const spans of drifts) expect(() => toElementView(withSpans(spans))).toThrow("ElementView invalide");
    expect(toElementView(withSpans([{ text: "a", attrs: { bold: undefined } }]))).toStrictEqual({ ...view, text: { ...view.text, content: "a", spans: [plainSpan("a")] } });
  });

  it("FormatText : clés undefined retirées, bornes hors u32 portées à u32::MAX, retour contrôlé par toChange", () => {
    const drift = { pages: ["p1"], ids: ["e1"], full: false, version: 1 };
    const calls: unknown[][] = [];
    const doc = { format_text: (...args: unknown[]): unknown => { calls.push(args); return drift; } };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    expect(() => d.apply({ type: "FormatText", id: "e1", start: 3, len: 4, attrs: { bold: undefined, italic: true } })).toThrow("Change invalide");
    expect(() => d.apply({ type: "FormatText", id: "e1", start: -1, len: 1.5, attrs: {}, boxHeight: 60 })).toThrow("Change invalide");
    expect(calls).toEqual([["e1", 3, 4, { italic: true }, undefined], ["e1", 4294967295, 4294967295, {}, 60]]);
    expect(calls[0]?.[3]).toStrictEqual({ italic: true });
  });
});

describe.each(factories)("contrat C7 : $name", ({ f }) => {
  const text = (d: CoreDocument, p: string, content: string, id: string | null = null) =>
    d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
  const fmt = (d: CoreDocument, id: string, start: number, len: number, attrs: TextAttrsPatch, boxHeight?: number) =>
    d.apply({ type: "FormatText", id, start, len, attrs, ...(boxHeight === undefined ? {} : { boxHeight }) });
  const spans = (d: CoreDocument, id: string): readonly TextSpan[] | null => {
    const e = d.element(id);
    return e?.kind === "text" ? e.text.spans : null;
  };
  const RED = { color: "#ff0000" } as const;
  const chat = (attrs: TextAttrs): TextSpan[] => [plainSpan("Le "), { text: "chat", attrs }, plainSpan(" noir")];

  it("S4 : positions UTF-16, différence en points de code, héritage du caractère précédent", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le 🐱 noir").ids[0] ?? "";
    expect(fmt(d, id, 3, 2, RED)).toMatchObject({ pages: [p], ids: [id], removed: [], full: false });
    expect(spans(d, id)).toEqual([plainSpan("Le "), { text: "🐱", attrs: RED }, plainSpan(" noir")]);
    text(d, p, "Le gros 🐱 noir", id);
    expect(spans(d, id)).toEqual([plainSpan("Le gros "), { text: "🐱", attrs: RED }, plainSpan(" noir")]);
    text(d, p, "Le gros 🐱🐱 noir", id);
    expect(spans(d, id)).toEqual([plainSpan("Le gros "), { text: "🐱🐱", attrs: RED }, plainSpan(" noir")]);
    d.free();
  });

  it("S4 : retrait par false, par null ; une clé undefined vaut une clé absente", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le chat noir").ids[0] ?? "";
    fmt(d, id, 3, 4, { bold: true, color: "#ff0000" });
    fmt(d, id, 3, 4, { bold: false });
    expect(spans(d, id)).toEqual(chat(RED));
    fmt(d, id, 3, 4, { bold: true });
    fmt(d, id, 3, 4, { bold: null });
    expect(spans(d, id)).toEqual(chat(RED));
    fmt(d, id, 3, 4, { color: null });
    expect(spans(d, id)).toEqual([plainSpan("Le chat noir")]);
    fmt(d, id, 3, 4, { bold: undefined, italic: true });
    expect(spans(d, id)).toEqual(chat({ italic: true }));
    unchanged(d, () => fmt(d, id, 3, 4, { bold: undefined }));
    d.free();
  });

  it("S4 : plage vide sans boxHeight, aucune étape ; avec un boxHeight neuf, une étape et la hauteur écrite", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le chat noir").ids[0] ?? "";
    unchanged(d, () => fmt(d, id, 2, 0, { bold: true }));
    unchanged(d, () => fmt(d, id, 0, 0, {}, 45));
    expect(fmt(d, id, 2, 0, { bold: true }, 90).ids).toEqual([id]);
    expect(d.element(id)).toMatchObject({ text: { boxHeight: 90 } });
    expect(spans(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.free();
  });

  it("S4 : ordre des contrôles et valeurs refusées : messages du contrat, aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const stroke = commit(d, p, 100);
    const id = text(d, p, "Le 🐱 noir").ids[0] ?? "";
    const hex64 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    unchanged(d, () => {
      expect(messageOf(() => fmt(d, "absent", 0, 1, { href: "x" } as unknown as TextAttrsPatch))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, "absent", 0, 1, {}, -1))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, "absent", 0, 1, { bold: true }))).toBe("élément inconnu : absent");
      expect(messageOf(() => fmt(d, stroke, 0, 1, { bold: true }))).toBe(`élément inconnu : ${stroke}`);
      for (const [start, len] of [[4, 1], [3, 1], [8, 3], [-1, 1]] as const) {
        expect(messageOf(() => fmt(d, id, start, len, { bold: true }))).toBe(BAD_FORMAT);
      }
      expect(messageOf(() => fmt(d, id, 0, 1, { color: "rgb(0,0,0)" }))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, id, 0, 1, { font: hex64 }))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, id, 0, 1, { bold: "oui" } as unknown as TextAttrsPatch))).toBe(BAD_FORMAT);
    });
    d.free();
  });

  it("S2 : six plages, enregistrer puis recharger : mêmes segments ; réenregistrer : mêmes octets", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "aa bb cc dd ee ff").ids[0] ?? "";
    const patches: TextAttrsPatch[] = [{ bold: true }, { italic: true }, { underline: true }, RED, { size: 72 }, { font: "Georgia" }];
    patches.forEach((attrs, i) => fmt(d, id, i * 3, 2, attrs));
    const expected: TextSpan[] = [
      { text: "aa", attrs: { bold: true } }, plainSpan(" "), { text: "bb", attrs: { italic: true } }, plainSpan(" "),
      { text: "cc", attrs: { underline: true } }, plainSpan(" "), { text: "dd", attrs: RED }, plainSpan(" "),
      { text: "ee", attrs: { size: 72 } }, plainSpan(" "), { text: "ff", attrs: { font: "Georgia" } },
    ];
    expect(spans(d, id)).toEqual(expected);
    const bytes = d.save(now, "0.1.0");
    const e = f.load(bytes);
    expect(spans(e, id)).toEqual(expected);
    expect(e.element(id)).toMatchObject({ text: { content: "aa bb cc dd ee ff" } });
    expect(new Uint8Array(e.save(now, "0.1.0"))).toEqual(new Uint8Array(bytes));
    e.free();
    d.free();
  });

  it("S1 : annuler trois fois rend le texte sans attribut ; rétablir trois fois remet tout", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le chat noir").ids[0] ?? "";
    fmt(d, id, 3, 4, { color: "#ff0000", bold: true });
    text(d, p, "Le gros chat noir", id);
    text(d, p, "Le gros chats noir", id);
    const full = spans(d, id);
    d.undo();
    d.undo();
    d.undo();
    expect(spans(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.redo();
    d.redo();
    d.redo();
    expect(spans(d, id)).toEqual(full);
    d.free();
  });
});

// C9 (grille, U31) : bloc joué sur la fausse liaison (T2), puis sur les deux fabriques quand le module est branché (T6).
const BAD_GRID = "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)";
const gridLevel = (kind: string, s: number, color = "#000000"): GridLevel => ({
  kind,
  spacingX: s,
  spacingY: s,
  originX: 0,
  originY: 0,
  color,
  line: "solid",
  lineWidth: 1,
  snap: true,
  visible: true,
});
const gridOf = (levels: readonly GridLevel[], snap = true, above = false): GridInput => ({ visible: true, snap, above, levels });
const setGrid = (d: CoreDocument, page: string, grid: GridInput | null) => d.apply({ type: "SetGrid", page, grid });
const c9Factories = factories; // T6 : vrai module branché, contrat C9 commun aux deux fabriques

describe("contrôle de forme C9 (grille)", () => {
  it("toPageView : grille contrôlée, undefined → null, forme fausse → erreur", () => {
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff", backdrop: undefined, mode: "page" };
    const g = { visible: true, snap: false, above: true, levels: [gridLevel("hexagon", 40)] };
    expect(toPageView({ ...page, grid: g })?.grid).toEqual(g);
    expect(toPageView({ ...page, grid: undefined })?.grid).toBeNull();
    expect(() => toPageView({ ...page, grid: { ...g, levels: "x" } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, levels: [{ ...gridLevel("squares", 40), snap: 1 }] } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, above: "oui" } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, levels: [{ ...gridLevel("squares", 40), lineWidth: "1" }] } })).toThrow("PageView invalide");
  });

  it("toPageView : grille ou niveau qui n'est pas un objet, tête sans visible → erreur", () => {
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff", backdrop: undefined, mode: "page" };
    const g = { visible: true, snap: false, above: true, levels: [gridLevel("squares", 40)] };
    expect(() => toPageView({ ...page, grid: "x" })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, levels: ["x"] } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { snap: g.snap, above: g.above, levels: g.levels } })).toThrow("PageView invalide");
  });
});

describe.each(c9Factories)("contrat C9 : $name", ({ f }) => {
  it("SetGrid (S1) : une étape, page(p).grid égale à la demande ; annuler la retire, rétablir la remet", () => {
    const d = f.blank();
    const p = first(d);
    expect(d.page(p)?.grid).toBeNull();
    const g = gridOf([gridLevel("seyes", 30.24, "#7b68ee"), gridLevel("dots", 40)], true, true);
    expect(setGrid(d, p, g).pages).toEqual([p]);
    expect(d.canUndo()).toBe(true);
    expect(d.page(p)?.grid).toEqual(g);
    d.undo();
    expect(d.page(p)?.grid).toBeNull();
    d.redo();
    expect(d.page(p)?.grid).toEqual(g);
    d.free();
  });

  it("SetGrid (G5) : même grille ou rien à retirer, sans étape ; null retire", () => {
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => setGrid(d, p, null));
    setGrid(d, p, gridOf([gridLevel("squares", 40)]));
    unchanged(d, () => setGrid(d, p, gridOf([gridLevel("squares", 40)])));
    setGrid(d, p, null);
    expect(d.page(p)?.grid).toBeNull();
    d.free();
  });

  it("SetGrid (S1) : A (deux niveaux) remplacée par B en une étape ; annuler rend A à l'identique, dans l'ordre", () => {
    const d = f.blank();
    const p = first(d);
    const a = gridOf([gridLevel("squares", 40, "#111111"), gridLevel("dots", 20, "#222222")]);
    const b = gridOf([gridLevel("music", 12, "#333333")], false, true);
    setGrid(d, p, a);
    setGrid(d, p, b);
    expect(d.page(p)?.grid).toEqual(b);
    d.undo();
    expect(d.page(p)?.grid).toEqual(a);
    d.free();
  });

  it("SetGrid (G2) : niveau invalide ou 17 niveaux refusés sans étape, message du cœur ; page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    const ok = gridLevel("squares", 40);
    unchanged(d, () => {
      for (const bad of [
        { ...ok, spacingX: 0 },
        { ...ok, spacingY: Number.NaN },
        { ...ok, originX: Number.POSITIVE_INFINITY },
        { ...ok, kind: "" },
        { ...ok, color: "" },
        { ...ok, line: "" },
      ]) {
        expect(messageOf(() => setGrid(d, p, gridOf([bad])))).toBe(BAD_GRID);
      }
      expect(messageOf(() => setGrid(d, p, gridOf(Array.from({ length: 17 }, () => ok))))).toBe(BAD_GRID);
      expect(messageOf(() => setGrid(d, "nulle-part", null))).toBe("page inconnue : nulle-part");
    });
    d.free();
  });

  it("SetGrid (S2) : kind et trait inconnus écrits et gardés ; ni ligne ni accroche pour le kind inconnu", () => {
    const d = f.blank();
    const p = first(d);
    const g = gridOf([{ ...gridLevel("hexagon", 40), line: "wavy" }]);
    setGrid(d, p, g);
    expect(d.page(p)?.grid).toEqual(g);
    expect(d.snapPoint(p, 13, 17)).toBeNull();
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 1920, y1: 1080 }, 4, 8)).toEqual({ above: false, levels: [] });
    d.free();
  });

  it("snapPoint (S4) : croisement le plus proche, bornes de la page ; null sans grille, sans magnétisme ou page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    expect(d.snapPoint(p, 13, 17)).toBeNull();
    setGrid(d, p, gridOf([gridLevel("squares", 40)]));
    expect(d.snapPoint(p, 13, 17)).toEqual([0, 0]);
    expect(d.snapPoint(p, 118, 97)).toEqual([120, 80]);
    expect(d.snapPoint(p, 1950, 10)).toEqual([1920, 0]);
    expect(d.snapPoint(p, -70, -90)).toEqual([0, 0]);
    expect(d.snapPoint("nulle-part", 13, 17)).toBeNull();
    setGrid(d, p, gridOf([gridLevel("squares", 40)], false));
    expect(d.snapPoint(p, 13, 17)).toBeNull();
    d.free();
  });

  it("snapDelta (S3) : coin ou centre de la boîte géométrique le plus proche ; brut sans grille ou sans élément", () => {
    const d = f.blank();
    const p = first(d);
    const rect = (x0: number, y0: number, x1: number, y1: number, width: number): string =>
      d.apply({ type: "AddShape", page: p, shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width }, fill: null }).ids[0] ?? "";
    const a = rect(13, 17, 113, 77, 4);
    const b = rect(0, 0, 100, 60, 10);
    expect(d.snapDelta(p, [a], 52, 31)).toEqual([52, 31]);
    setGrid(d, p, gridOf([gridLevel("squares", 40, "#cccccc")]));
    expect(d.snapDelta(p, [a], 52, 31)).toEqual([57, 33]);
    expect(d.snapDelta(p, [b], 2, 3)).toEqual([0, 0]);
    expect(d.snapDelta(p, [], 52, 31)).toEqual([52, 31]);
    d.free();
  });

  it("gridLines (S5) : carreaux de 40 au loin sur la page, limités à la page ; famille sous le pas minimal sautée ; null invisible", () => {
    const d = f.blank();
    const p = first(d);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 100, y1: 100 }, 4, 8)).toBeNull();
    setGrid(d, p, gridOf([gridLevel("squares", 40, "#cccccc")], false, true));
    // T7 : loin sous le haut, seule une page Infini a des lignes (grille bornée au cadre en Page) ; x0 = 0, sans borne
    // à gauche en Infini, garde les mêmes segments.
    d.apply({ type: "SetPageMode", page: p, mode: "infinite" });
    const r = { x0: 0, y0: 1_000_007, x1: 786.7, y1: 1_000_607 };
    const l = d.gridLines(p, r, 4, 8);
    expect(l?.above).toBe(true);
    expect(l?.levels.length).toBe(1);
    const segs = l?.levels[0]?.segments ?? [];
    expect(segs.length).toBe((20 + 15) * 4);
    expect(segs.slice(0, 4)).toEqual([0, 1_000_007, 0, 1_000_607]);
    expect(segs.slice(19 * 4, 20 * 4)).toEqual([760, 1_000_007, 760, 1_000_607]);
    expect(segs.slice(20 * 4, 21 * 4)).toEqual([0, 1_000_040, 786.7, 1_000_040]);
    expect(d.gridLines(p, r, 41, 8)?.levels).toEqual([]);
    setGrid(d, p, { ...gridOf([gridLevel("squares", 40)]), visible: false });
    expect(d.gridLines(p, r, 4, 8)).toBeNull();
    d.free();
  });

  it("save puis load (S1) : grille gardée, octets stables ; page neuve sans grille (G5)", () => {
    const d = f.blank();
    const p = first(d);
    const g = gridOf([gridLevel("seyes", 30.24, "#7b68ee"), gridLevel("dots", 40)], true, true);
    setGrid(d, p, g);
    const q = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    expect(d.page(q)?.grid).toBeNull();
    const file = d.save(now, "0.1.0");
    const e = f.load(file);
    expect(e.page(p)?.grid).toEqual(g);
    expect(e.save(now, "0.1.0")).toEqual(file);
    e.free();
    d.free();
  });

  it("snapDelta (G7) : élément aligné ramené à sa place, déplacement exactement nul", () => {
    const d = f.blank();
    const p = first(d);
    const style = { color: "#000000", width: 4 };
    const c = d.apply({ type: "AddShape", page: p, shape: "rect", x0: 70, y0: 50, x1: 170, y1: 110, style, fill: null }).ids[0] ?? "";
    setGrid(d, p, gridOf([gridLevel("squares", 40)]));
    expect(d.snapDelta(p, [c], 1.3, 0.7)).toEqual([0, 0]);
    d.free();
  });

  it("snapDelta (G7, relecture finale) : forme de largeur 100,3 aimantée puis petit glisser, déplacement exactement nul", () => {
    const d = f.blank();
    const p = first(d);
    const style = { color: "#000000", width: 4 };
    setGrid(d, p, gridOf([gridLevel("squares", 40)]));
    for (let i = 0; i < 400; i++) {
      const x0 = 3 + (i % 50) * 7.31;
      const y0 = 5 + i * 0.377;
      const c = d.apply({ type: "AddShape", page: p, shape: "rect", x0, y0, x1: x0 + 100.3, y1: y0 + 50.7, style, fill: null }).ids[0] ?? "";
      const [dx, dy] = d.snapDelta(p, [c], 0, 0);
      d.apply({ type: "Transform", ids: [c], matrix: [1, 0, 0, 1, dx, dy] });
      expect(d.snapDelta(p, [c], 0.6, -0.4), `départ (${x0}, ${y0})`).toEqual([0, 0]);
    }
    d.free();
  });

  it("gridLines (G9) : une seule famille sautée sous le pas minimal ; plafond par famille, jamais par niveau", () => {
    const d = f.blank();
    const p = first(d);
    const page = { x0: 0, y0: 0, x1: 1920, y1: 1080 };
    const families = (l: GridLevel, minStep: number): { v: number; h: number } | null => {
      setGrid(d, p, gridOf([l]));
      const lv = d.gridLines(p, page, minStep, 8)?.levels ?? [];
      if (lv.length === 0) return null;
      const s = lv[0]?.segments ?? [];
      let v = 0;
      let h = 0;
      for (let i = 0; i < s.length; i += 4) {
        if (s[i] === s[i + 2]) v++;
        else if (s[i + 1] === s[i + 3]) h++;
      }
      return { v, h };
    };
    // Verticales au pas 40 (≥ 30), horizontales au pas 20 (< 30) sautées.
    expect(families({ ...gridLevel("squares", 40), spacingY: 20 }, 30)).toEqual({ v: 49, h: 0 });
    // Verticales au pas 0,01 : 192 001 > 65 536, sautées seules ; horizontales au pas 40 gardées.
    expect(families({ ...gridLevel("squares", 40), spacingX: 0.01 }, 0)).toEqual({ v: 0, h: 28 });
    expect(families(gridLevel("squares", 0.01), 0)).toBeNull();
    d.free();
  });

  it("snapPoint (HG3) : grille et niveau invisibles accrochent ; niveau sans aimant dans une grille aimantée n'accroche pas", () => {
    const d = f.blank();
    const p = first(d);
    setGrid(d, p, { ...gridOf([{ ...gridLevel("squares", 40), visible: false }]), visible: false });
    expect(d.snapPoint(p, 13, 17)).toEqual([0, 0]);
    setGrid(d, p, gridOf([{ ...gridLevel("squares", 40), snap: false }], true));
    expect(d.snapPoint(p, 13, 17)).toBeNull();
    d.free();
  });

  it("SetGrid (G2) : grille invalide sur une page inconnue → BadGrid d'abord, sans étape", () => {
    const d = f.blank();
    unchanged(d, () => {
      expect(messageOf(() => setGrid(d, "nulle-part", gridOf([{ ...gridLevel("squares", 40), spacingX: 0 }])))).toBe(BAD_GRID);
    });
    d.free();
  });

  it("SetGrid (E1, S3) : lineWidth 2 écrit, relu, gardé par save puis load ; 0, 9 ou NaN refusés sans étape", () => {
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => {
      for (const lineWidth of [0, 9, Number.NaN]) {
        expect(messageOf(() => setGrid(d, p, gridOf([{ ...gridLevel("squares", 40), lineWidth }])))).toBe(BAD_GRID);
      }
    });
    const g = gridOf([{ ...gridLevel("squares", 40, "#94a3b8"), lineWidth: 2 }]);
    setGrid(d, p, g);
    expect(d.page(p)?.grid).toEqual(g);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 100, y1: 100 }, 4, 8)?.levels.map((l) => l.lineWidth)).toEqual([2]);
    const file = d.save(now, "0.1.0");
    const e = f.load(file);
    expect(e.page(p)?.grid).toEqual(g);
    expect(e.save(now, "0.1.0")).toEqual(file);
    e.free();
    d.free();
  });

  it("gridLinesOf (S3, DAE1) : mêmes lignes que gridLines après SetGrid de la même grille, sans étape ; page inconnue ou grille invisible → null", () => {
    const d = f.blank();
    const p = first(d);
    const g = gridOf([{ ...gridLevel("squares", 40, "#94a3b8"), lineWidth: 3 }]);
    // T7 : vue dans le cadre de la page paysage (grille bornée au cadre en Page).
    const r = { x0: -13.3, y0: 7, x1: 786.7, y1: 607 };
    const v = d.version();
    const preview = d.gridLinesOf(p, g, r, 4, 8);
    expect(d.version()).toBe(v);
    expect(d.canUndo()).toBe(false);
    expect(d.page(p)?.grid).toBeNull();
    expect(preview?.levels.map((l) => l.lineWidth)).toEqual([3]);
    expect(d.gridLinesOf("nulle-part", g, r, 4, 8)).toBeNull();
    expect(d.gridLinesOf(p, { ...g, visible: false }, r, 4, 8)).toBeNull();
    setGrid(d, p, g);
    expect(d.gridLines(p, r, 4, 8)).toEqual(preview);
    d.free();
  });

  it("gridLines (CR2) : niveau épais sauté sous min_step·lineWidth (carreaux 40, zoom 0,1 : épaisseur 1 gardée, 4 sautée)", () => {
    const d = f.blank();
    const p = first(d);
    const page = { x0: 0, y0: 0, x1: 1920, y1: 1080 };
    for (const [lineWidth, groups] of [[1, 1], [4, 0]] as const) {
      setGrid(d, p, gridOf([{ ...gridLevel("squares", 40), lineWidth }]));
      expect(d.gridLines(p, page, 4 / 0.1, 8 / 0.1)?.levels.length, `lineWidth ${lineWidth}`).toBe(groups);
      expect(d.gridLinesOf(p, gridOf([{ ...gridLevel("squares", 40), lineWidth }]), page, 4 / 0.1, 8 / 0.1)?.levels.length).toBe(groups);
    }
    d.free();
  });
});

describe("contrôle de forme C9 (lignes de grille)", () => {
  it("toGridLines : null pour rien, erreur pour une forme fausse", () => {
    const ok = { above: true, levels: [{ color: "#000000", line: "solid", alpha: 0.5, lineWidth: 1, segments: [0, 0, 0, 10], dots: [1, 2] }] };
    expect(toGridLines(undefined)).toBeNull();
    expect(toGridLines(null)).toBeNull();
    expect(toGridLines(ok)).toEqual(ok);
    expect(() => toGridLines({ ...ok, above: 1 })).toThrow("GridLines invalide");
    expect(() => toGridLines({ above: true, levels: [{ ...ok.levels[0], segments: ["0"] }] })).toThrow("GridLines invalide");
    expect(() => toGridLines({ above: true, levels: "x" })).toThrow("GridLines invalide");
  });

  it.each([
    ["points non numériques", { dots: ["1"] }],
    ["alpha qui n'est pas un nombre", { alpha: "0.5" }],
    ["couleur qui n'est pas un texte", { color: 0 }],
    ["trait qui n'est pas un texte", { line: null }],
    ["épaisseur qui n'est pas un nombre", { lineWidth: "2" }],
  ])("toGridLines : niveau à %s → erreur", (_, bad) => {
    const level = { color: "#000000", line: "solid", alpha: 1, lineWidth: 1, segments: [0, 0, 0, 10], dots: [1, 2] };
    expect(() => toGridLines({ above: true, levels: [{ ...level, ...bad }] })).toThrow("GridLines invalide");
  });

  it("toGridLines : niveau qui n'est pas un objet → erreur", () => {
    expect(() => toGridLines({ above: true, levels: [1] })).toThrow("GridLines invalide");
  });

  it("toPair : Float64Array de deux nombres → paire ; autre forme → erreur", () => {
    expect(toPair(new Float64Array([1, 2]))).toEqual([1, 2]);
    expect(() => toPair([1])).toThrow("point invalide");
    expect(() => toPair("x")).toThrow("point invalide");
  });

  it("gridArgs (E1) : sept nombres par niveau, sx, sy, ox, oy, snap, visible, lineWidth", () => {
    const g = gridOf([{ ...gridLevel("squares", 40, "#94a3b8"), originX: 5, snap: false, lineWidth: 3 }], true, true);
    const [visible, snap, above, kinds, colors, lines, nums] = gridArgs(g);
    expect([visible, snap, above, kinds, colors, lines]).toEqual([true, true, true, ["squares"], ["#94a3b8"], ["solid"]]);
    expect(Array.from(nums)).toEqual([40, 40, 5, 0, 0, 1, 3]);
  });
});

describe.skipIf(loaded === null)("contrat C9 : vrai module seulement", () => {
  const fixture = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));

  // Seuil 2 (et non 4) : à l'épaisseur 2, le seuil CR2 vaut 4 et garde les fines du Seyès (7,56) ; points 40 ≥ 8·4.
  it("gridLinesOf (S3) : Seyès et points rendent les lignes de gridLines après SetGrid, épaisseur comprise", () => {
    const d = need().core.blank();
    const p = first(d);
    const g = gridOf([{ ...gridLevel("seyes", 30.24, "#94a3b8"), lineWidth: 2 }, { ...gridLevel("dots", 40), lineWidth: 4 }]);
    const r = { x0: 0, y0: 0, x1: 400, y1: 400 };
    const preview = d.gridLinesOf(p, g, r, 2, 8);
    expect(preview?.levels.map((l) => [l.alpha, l.lineWidth])).toEqual([[1, 2], [0.5, 2], [1, 4]]);
    setGrid(d, p, g);
    expect(d.gridLines(p, r, 2, 8)).toEqual(preview);
    d.free();
  });

  it("fichier du socle (S2) : grille nulle sur ses deux pages", () => {
    const d = need().core.load(fixture("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard"));
    expect(d.pageIds().map((p) => d.page(p)?.grid)).toEqual([null, null]);
    d.free();
  });

  it("les cinq autres types (DAG3) : Seyès principal et fin, isométrique, points, portées, lignes", () => {
    const d = need().core.blank();
    const p = first(d);
    const only = (kind: string, s: number): void => {
      setGrid(d, p, gridOf([gridLevel(kind, s)]));
    };
    only("seyes", 30.24);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 400, y1: 400 }, 4, 8)?.levels.map((l) => l.alpha)).toEqual([1, 0.5]);
    only("isometric", 40);
    const q = d.snapPoint(p, 36, 25);
    expect(q?.[0]).toBeCloseTo(20 * Math.sqrt(3));
    expect(q?.[1]).toBeCloseTo(20);
    only("dots", 40);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 100, y1: 100 }, 4, 8)?.levels[0]?.dots).toEqual([0, 0, 40, 0, 80, 0, 0, 40, 40, 40, 80, 40, 0, 80, 40, 80, 80, 80]);
    only("music", 12);
    expect(d.snapPoint(p, 500, 70)).toEqual([500, 48]);
    only("lines", 40);
    expect(d.snapPoint(p, 1950, 10)).toEqual([1950, 0]);
    d.free();
  });
});

// C10a (tableau) : contrat commun ; T6 : vrai module branché, contrat commun aux deux fabriques.
const c10aFactories = factories;
const TABLE_MESSAGE =
  "tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)";
type AddTableCmd = Extract<Command, { type: "AddTable" }>;
const addTable = (d: CoreDocument, page: string, over: Partial<Omit<AddTableCmd, "type" | "page">> = {}): string => {
  const id = d.apply({ type: "AddTable", page, x: 100, y: 200, cols: 4, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36, ...over }).ids[0];
  if (id === undefined) throw new Error("aucun id");
  return id;
};
const tableOf = (d: CoreDocument, id: string): TableData => {
  const v = d.element(id);
  if (v?.kind !== "table") throw new Error(`pas un tableau : ${v?.kind ?? "absent"}`);
  return v.table;
};
const ids2 = (t: TableData): [string, string, string, string] => {
  const [r0, r1] = t.rows;
  const [c0, c1] = t.cols;
  if (!r0 || !r1 || !c0 || !c1) throw new Error("2 × 2 attendu");
  return [r0.id, r1.id, c0.id, c1.id];
};

describe.each(c10aFactories)("contrat C10a : $name", ({ f }) => {
  it("AddTable (S1) : 4 × 3, une étape, vue exacte, boîte et collision ; annuler le retire", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({ type: "AddTable", page: p, x: 100, y: 200, cols: 4, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    expect(c.pages).toEqual([p]);
    const id = c.ids[0] ?? "";
    expect(d.element(id)?.transform).toEqual([1, 0, 0, 1, 100, 200]);
    const t = tableOf(d, id);
    expect([t.color, t.size, t.cols.length, t.rows.length, t.cells]).toEqual(["#000000", 36, 4, 3, []]);
    expect(t.cols.every((x) => x.width === 240) && t.rows.every((x) => x.height === 64)).toBe(true);
    expect(new Set([...t.cols, ...t.rows].map((x) => x.id)).size).toBe(7);
    expect(d.bounds([id])).toEqual({ x0: 100, y0: 200, x1: 1060, y1: 392 });
    expect(d.hitTest(p, 300, 250, 0)).toBe(id);
    expect(d.canUndo()).toBe(true);
    d.undo();
    expect(d.element(id)).toBeNull();
    d.free();
  });

  it("AddTable refusé (BadTable, D38) : dimensions hors 1..=64 ou non entières, tailles, couleur, position ; page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    for (const over of [{ cols: 0 }, { cols: 65 }, { rows: 0 }, { rows: 2.5 }, { colWidth: Number.NaN }, { rowHeight: 0 }, { size: -1 }, { color: "!!" }, { x: Number.POSITIVE_INFINITY }]) {
      unchanged(d, () => expect(messageOf(() => addTable(d, p, over))).toBe(TABLE_MESSAGE));
    }
    expect(messageOf(() => addTable(d, "zz"))).toBe("page inconnue : zz");
    expect(tableOf(d, addTable(d, p, { cols: 64, rows: 64 })).rows).toHaveLength(64);
    d.free();
  });

  it("SetTableCell : texte, ligne agrandie seulement si plus haute, inchangé sans étape (T5, D38)", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, r1, c0] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "Lundi", rowHeight: 61 });
    expect(tableOf(d, id).cells).toEqual([{ row: r0, col: c0, text: "Lundi", fill: null, shade: null, spans: [plainSpan("Lundi")] }]);
    expect(tableOf(d, id).rows.map((r) => r.height)).toEqual([64, 64]);
    expect(d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "Lundi soir", rowHeight: 150 }).ids).toEqual([id]);
    expect(tableOf(d, id).rows.map((r) => r.height)).toEqual([150, 64]);
    unchanged(d, () => d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "Lundi soir", rowHeight: 100 }));
    unchanged(d, () => d.apply({ type: "SetTableCell", id, row: r1, col: c0, content: "" }));
    d.undo();
    expect(tableOf(d, id).cells[0]?.text).toBe("Lundi");
    expect(tableOf(d, id).rows[0]?.height).toBe(64);
    d.free();
  });

  it("SetTableCell refusé : ligne, colonne inconnue ou hauteur ≤ 0 (BadTable) ; trait ou id absent (élément inconnu)", () => {
    const d = f.blank();
    const p = first(d);
    const id = addTable(d, p, { cols: 2, rows: 2 });
    const [row, , col] = ids2(tableOf(d, id));
    const s = commit(d, p, 900);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row: "absente", col, content: "x" }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row, col: "absente", content: "x" }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row, col, content: "x", rowHeight: 0 }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id: s, row, col, content: "x" }))).toBe(`élément inconnu : ${s}`);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id: "nulle-part", row, col, content: "x" }))).toBe("élément inconnu : nulle-part");
    });
    d.free();
  });

  it("InsertTableLine : taille de la voisine, en tête et à la fin, ids neufs ; hors bornes et à 64 → BadTable", () => {
    const d = f.blank();
    const p = first(d);
    const id = addTable(d, p, { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "haut", rowHeight: 150 });
    expect(d.apply({ type: "InsertTableLine", id, axis: "row", at: 0 }).ids).toEqual([id]);
    expect(tableOf(d, id).rows.map((r) => r.height)).toEqual([150, 150, 64]);
    expect(tableOf(d, id).rows[1]?.id).toBe(r0);
    d.apply({ type: "InsertTableLine", id, axis: "col", at: 2 });
    expect(tableOf(d, id).cols.map((c) => c.width)).toEqual([240, 240, 240]);
    expect(tableOf(d, id).cells).toHaveLength(1);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "InsertTableLine", id, axis: "row", at: 4 }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "InsertTableLine", id, axis: "row", at: -1 }))).toBe(TABLE_MESSAGE);
    });
    const full = addTable(d, p, { cols: 1, rows: 64 });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "InsertTableLine", id: full, axis: "row", at: 64 }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("borne f32 (T15) : AddTable, SetTableCell, SetTableSizes, InsertTableLine refusent un total hors f32 (BadTable, D38)", () => {
    const d = f.blank();
    const p = first(d);
    // 64 × 1e37 = 6,4e38 > f32::MAX : chaque entrée finie ne suffit pas, le total compte (comme x et y).
    for (const over of [{ cols: 64, colWidth: 1e37 }, { rows: 64, rowHeight: 1e37 }, { colWidth: 1e39 }, { x: 1e39 }, { y: -1e39 }]) {
      unchanged(d, () => expect(messageOf(() => addTable(d, p, over))).toBe(TABLE_MESSAGE));
    }
    const wide = addTable(d, p, { cols: 34, rows: 1, colWidth: 1e37 });
    const tall = addTable(d, p, { cols: 2, rows: 2 });
    const [r0, r1, c0] = ids2(tableOf(d, tall));
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableSizes", id: tall, colWidth: 240, rowHeight: 2e38 }))).toBe(TABLE_MESSAGE));
    d.apply({ type: "SetTableCell", id: tall, row: r0, col: c0, content: "haut", rowHeight: 1.7e38 });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableCell", id: tall, row: r1, col: c0, content: "x", rowHeight: 1.8e38 }))).toBe(TABLE_MESSAGE));
    d.apply({ type: "SetTableSizes", id: tall, colWidth: 240, rowHeight: 1.7e38 });
    // Insertion : la taille voisine copiée ferait déborder le total de l'axe (3,4e38 + 1e37, 3,4e38 + 1,7e38).
    const over = [[wide, "col", 34], [wide, "col", 0], [tall, "row", 2], [tall, "row", 1]] as const;
    unchanged(d, () => {
      for (const [id, axis, at] of over) expect(messageOf(() => d.apply({ type: "InsertTableLine", id, axis, at }))).toBe(TABLE_MESSAGE);
    });
    expect(d.apply({ type: "InsertTableLine", id: wide, axis: "row", at: 1 }).ids).toEqual([wide]);
    expect(d.apply({ type: "InsertTableLine", id: tall, axis: "col", at: 2 }).ids).toEqual([tall]);
    d.free();
  });

  it("RemoveTableLine : les cellules de la ligne partent avec elle ; dernière ligne ou ligne absente → BadTable", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, r1, c0, c1] = ids2(tableOf(d, id));
    for (const row of [r0, r1]) for (const col of [c0, c1]) d.apply({ type: "SetTableCell", id, row, col, content: `${row}/${col}` });
    d.apply({ type: "RemoveTableLine", id, axis: "row", line: r0 });
    expect(tableOf(d, id).rows.map((r) => r.id)).toEqual([r1]);
    expect(tableOf(d, id).cells.map((c) => c.text)).toEqual([`${r1}/${c0}`, `${r1}/${c1}`]);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "RemoveTableLine", id, axis: "row", line: r1 }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "RemoveTableLine", id, axis: "col", line: "absente" }))).toBe(TABLE_MESSAGE);
    });
    d.apply({ type: "RemoveTableLine", id, axis: "col", line: c1 });
    expect(tableOf(d, id).cells.map((c) => c.text)).toEqual([`${r1}/${c0}`]);
    d.undo();
    expect(tableOf(d, id).cols).toHaveLength(2);
    d.free();
  });

  it("SetTableSizes (Uniformiser, T11) : toutes à la taille donnée, peut réduire ; déjà uniforme : aucune étape", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "x", rowHeight: 150 });
    d.apply({ type: "SetTableSizes", id, colWidth: 200, rowHeight: 107 });
    const t = tableOf(d, id);
    expect([t.cols.map((c) => c.width), t.rows.map((r) => r.height)]).toEqual([[200, 200, 200], [107, 107]]);
    unchanged(d, () => d.apply({ type: "SetTableSizes", id, colWidth: 200, rowHeight: 107 }));
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableSizes", id, colWidth: 0, rowHeight: 64 }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("SetTableFill (T12) : pose, même valeur sans étape, null retire ; couleur invalide → BadTable", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [, r1, , c1] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: "#fef08a" });
    expect(tableOf(d, id).cells).toEqual([{ row: r1, col: c1, text: "", fill: "#fef08a", shade: null, spans: [plainSpan("")] }]);
    unchanged(d, () => d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: "#fef08a" }));
    d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: null });
    expect(tableOf(d, id).cells).toEqual([]);
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: "pas une couleur !" }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("une commande ne change que ce qu'elle vise (GC9) : texte et remplissage d'une cellule indépendants, ids et autres cellules repris", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, r1, c0, c1] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableFill", id, row: r0, col: c0, fill: "#fef08a" });
    d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "A" });
    d.apply({ type: "SetTableCell", id, row: r1, col: c1, content: "B" });
    expect(tableOf(d, id).cells).toEqual([
      { row: r0, col: c0, text: "A", fill: "#fef08a", shade: null, spans: [plainSpan("A")] },
      { row: r1, col: c1, text: "B", fill: null, shade: null, spans: [plainSpan("B")] },
    ]);
    d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: "#bbf7d0" });
    d.apply({ type: "SetTableFill", id, row: r0, col: c0, fill: null });
    d.apply({ type: "SetTableSizes", id, colWidth: 200, rowHeight: 80 });
    const t = tableOf(d, id);
    expect([...t.rows, ...t.cols].map((l) => l.id)).toEqual([r0, r1, c0, c1]);
    expect(t.cells).toEqual([
      { row: r0, col: c0, text: "A", fill: null, shade: null, spans: [plainSpan("A")] },
      { row: r1, col: c1, text: "B", fill: "#bbf7d0", shade: null, spans: [plainSpan("B")] },
    ]);
    d.free();
  });

  it("S3 : enregistrer, recharger, réenregistrer : mêmes octets, même vue", () => {
    const d = f.blank();
    const id = addTable(d, first(d));
    const t = tableOf(d, id);
    t.rows.forEach((r, i) => t.cols.forEach((c, j) => d.apply({ type: "SetTableCell", id, row: r.id, col: c.id, content: `L${i}C${j}` })));
    d.apply({ type: "SetTableFill", id, row: t.rows[0]?.id ?? "", col: t.cols[0]?.id ?? "", fill: "#fef08a" });
    const once = f.load(d.save(now, "0.1.0"));
    const bytes = once.save(now, "0.1.0");
    const twice = f.load(bytes);
    expect(twice.save(now, "0.1.0")).toEqual(bytes);
    expect(twice.element(id)).toEqual(d.element(id));
    for (const x of [d, once, twice]) x.free();
  });

  it("un geste = une étape (D11) : annuler l'insertion rend la vue d'avant, rétablir la remet", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const before = tableOf(d, id);
    d.apply({ type: "InsertTableLine", id, axis: "row", at: 2 });
    const after = tableOf(d, id);
    d.undo();
    expect(tableOf(d, id)).toEqual(before);
    d.redo();
    expect(tableOf(d, id)).toEqual(after);
    d.free();
  });
});

describe("contrôle de forme C10a (tableau)", () => {
  const base = { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0] };
  const table = {
    color: "#000000",
    size: 36,
    cols: [{ id: "c1", width: 240 }],
    rows: [{ id: "r1", height: 64 }],
    cells: [{ row: "r1", col: "c1", text: "A", fill: undefined, spans: [plainSpan("A")] }],
    merges: [],
  };
  it("toElementView : tableau contrôlé, fill absent → null", () => {
    expect(toElementView({ ...base, table })).toEqual({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: "A", fill: null, shade: null, spans: [plainSpan("A")] }] } });
  });
  it("toElementView : forme fausse → erreur", () => {
    expect(() => toElementView({ ...base })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, cols: "x" } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, rows: [{ id: "r1", height: 0 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: 3 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, size: "36" } })).toThrow("ElementView invalide");
  });
});

describe.skipIf(loaded === null)("contrat C10a : vrai module seulement", () => {
  it("fixture tableau-4x3.roomboard (T2) : un 4 × 3 rempli, première cellule jaune", () => {
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-core/tests/fixtures/tableau-4x3.roomboard", import.meta.url)));
    const d = need().core.load(bytes);
    const p = first(d);
    const id = d.elementIds(p).find((e) => d.element(e)?.kind === "table") ?? "";
    const t = tableOf(d, id);
    expect([t.cols.length, t.rows.length]).toEqual([4, 3]);
    expect(t.cells.map((c) => c.text)).toEqual(["Lundi", "Mardi", "Mercredi", "Jeudi", "Maths", "Français", "Histoire", "Sport", "Anglais", "Musique", "Dessin", "Sciences"]);
    expect(t.cells[0]?.fill).toBe("#fef08a");
    expect(t.cells[1]?.fill).toBeNull();
    d.free();
  });
});

// C10b (fusion, ombrage, import) : contrat commun ; T7 branche le vrai module (c10bFactories = factories).
const c10bFactories = factories;
const SHADE = "#94a3b8";
const c10bIds = (t: TableData): { readonly r: string[]; readonly c: string[] } => ({ r: t.rows.map((x) => x.id), c: t.cols.map((x) => x.id) });
const c10bAt = (g: { readonly r: string[]; readonly c: string[] }, i: number, j: number): CellIds => ({ row: g.r[i] ?? "", col: g.c[j] ?? "" });
const shadedOf = (t: TableData): string[] => t.cells.filter((x) => x.shade !== null).map((x) => `${x.row}:${x.col}`);

describe.each(c10bFactories)("contrat C10b : $name", ({ f }) => {
  // Garde du patron écarté (GC10) : une écriture en bloc de la cellule (`{ text, fill }`) perdrait la zone et l'ombrage.
  it("une commande ne change que ses clés (GC10) : texte, remplissage, ombrage et zone d'une ancre gardés l'un par l'autre", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    const a = c10bAt(g, 0, 0);
    const zone = [{ row: g.r[0], col: g.c[0], rows: 2, cols: 2 }];
    d.apply({ type: "MergeTableCells", id, from: a, to: c10bAt(g, 1, 1) });
    d.apply({ type: "SetTableCell", id, ...a, content: "A" });
    d.apply({ type: "SetTableFill", id, ...a, fill: "#bbf7d0" });
    d.apply({ type: "SetTableShade", id, from: a, to: a, shade: SHADE });
    d.apply({ type: "SetTableCell", id, ...a, content: "B" });
    d.apply({ type: "SetTableFill", id, ...a, fill: "#fef08a" });
    expect(tableOf(d, id).merges).toEqual(zone);
    expect(tableOf(d, id).cells).toEqual([{ ...a, text: "B", fill: "#fef08a", shade: SHADE, spans: [plainSpan("B")] }]);
    d.apply({ type: "SetTableShade", id, from: a, to: a, shade: null });
    expect(tableOf(d, id).merges).toEqual(zone);
    expect(tableOf(d, id).cells).toEqual([{ ...a, text: "B", fill: "#fef08a", shade: null, spans: [plainSpan("B")] }]);
    d.free();
  });

  it("MergeTableCells (F3) : l'ancre garde son texte, les couvertes sont retirées ; une étape", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 0), content: "Lundi" });
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 1), content: "Mardi" });
    const c = d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 1) });
    expect(c.ids).toEqual([id]);
    const t = tableOf(d, id);
    expect(t.merges).toEqual([{ row: g.r[0], col: g.c[0], rows: 2, cols: 2 }]);
    expect(t.cells.map((x) => x.text)).toEqual(["Lundi"]);
    d.undo();
    expect(tableOf(d, id).merges).toEqual([]);
    expect(tableOf(d, id).cells.map((x) => x.text)).toEqual(["Lundi", "Mardi"]);
    d.free();
  });

  it("MergeTableCells refusé (F3) : une cellule, ligne inconnue, recouvrement partiel ; aucune étape", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 3 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 0) });
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 2, 2), to: c10bAt(g, 2, 2) }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id, from: { row: "absente", col: g.c[0] ?? "" }, to: c10bAt(g, 2, 2) }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 1, 0), to: c10bAt(g, 2, 1) }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id: "absent", from: c10bAt(g, 0, 0), to: c10bAt(g, 0, 1) }))).toBe("élément inconnu : absent");
    });
    d.free();
  });

  it("SplitTableCell (F4) : la zone se défait, le texte reste en haut à gauche ; cellule couverte : refus", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 0), content: "Lundi" });
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 0, 1) });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SplitTableCell", id, ...c10bAt(g, 0, 1) }))).toBe(TABLE_MESSAGE));
    d.apply({ type: "SplitTableCell", id, ...c10bAt(g, 0, 0) });
    const t = tableOf(d, id);
    expect(t.merges).toEqual([]);
    expect(t.cells).toEqual([{ ...c10bAt(g, 0, 0), text: "Lundi", fill: null, shade: null, spans: [plainSpan("Lundi")] }]);
    d.free();
  });

  it("SetTableShade (F8, F9, F12) : une colonne, révélation en une étape, sans changement aucune étape, couleur invalide", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 3 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 0, 1) });
    d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 2, 2), shade: SHADE });
    d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 1), to: c10bAt(g, 0, 1), shade: SHADE });
    expect(shadedOf(tableOf(d, id))).toEqual([`${g.r[0]}:${g.c[0]}`, `${g.r[0]}:${g.c[2]}`, `${g.r[1]}:${g.c[2]}`, `${g.r[2]}:${g.c[2]}`]);
    unchanged(d, () => d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 2, 2), shade: SHADE }));
    d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 0, 2), shade: null });
    expect(shadedOf(tableOf(d, id))).toHaveLength(3);
    d.undo();
    expect(shadedOf(tableOf(d, id))).toHaveLength(4);
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 0, 2), shade: "!!" }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("SetTableFill avec to (F15) : la plage, ancres et cellules simples, une étape ; sans to : comme C10a", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 0) });
    d.apply({ type: "SetTableFill", id, ...c10bAt(g, 0, 0), to: c10bAt(g, 1, 1), fill: "#bbf7d0" });
    expect(tableOf(d, id).cells.filter((x) => x.fill !== null).map((x) => `${x.row}:${x.col}`)).toEqual([`${g.r[0]}:${g.c[0]}`, `${g.r[0]}:${g.c[1]}`, `${g.r[1]}:${g.c[1]}`]);
    d.undo();
    expect(tableOf(d, id).cells.every((x) => x.fill === null)).toBe(true);
    d.free();
  });

  it("RemoveTableLine avec to (F6, S5) : plage en une étape ; ligne d'ancrage retirée : la zone glisse ; tout retirer : refus", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 4 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 2, 0) });
    d.apply({ type: "RemoveTableLine", id, axis: "row", line: g.r[0] ?? "" });
    expect(tableOf(d, id).merges).toEqual([{ row: g.r[1], col: g.c[0], rows: 2, cols: 1 }]);
    d.undo();
    const before = tableOf(d, id);
    d.apply({ type: "RemoveTableLine", id, axis: "row", line: g.r[2] ?? "", to: g.r[1] ?? "" });
    expect(tableOf(d, id).rows.map((x) => x.id)).toEqual([g.r[0], g.r[3]]);
    expect(tableOf(d, id).merges).toEqual([]);
    d.undo();
    expect(tableOf(d, id)).toEqual(before);
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "RemoveTableLine", id, axis: "row", line: g.r[0] ?? "", to: g.r[3] ?? "" }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("InsertTableLine dans une zone (F5) : elle grandit ; SetTableCell sur une ancre de deux lignes (F7) : la dernière grandit", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 3 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 0) });
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 0), content: "long", rowHeight: 200 });
    expect(tableOf(d, id).rows.map((x) => x.height)).toEqual([64, 136, 64]);
    d.apply({ type: "InsertTableLine", id, axis: "row", at: 1 });
    expect(tableOf(d, id).merges).toEqual([{ row: g.r[0], col: g.c[0], rows: 3, cols: 1 }]);
    d.free();
  });

  it("ImportTable (F18) : une étape ; textes, fusion, matrice ; texte couvert ignoré", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({
      type: "ImportTable", page: p, matrix: [0.5, 0, 0, 0.5, 300, 100], colWidth: 240, rowHeights: [64, 80], cols: 2,
      cells: ["Titre", "caché", "a", "b"], merges: [[0, 0, 1, 2]], color: "#1d4ed8", size: 36,
    });
    const id = c.ids[0] ?? "";
    expect(d.element(id)?.transform).toEqual([0.5, 0, 0, 0.5, 300, 100]);
    const t = tableOf(d, id);
    expect([t.color, t.cols.map((x) => x.width), t.rows.map((x) => x.height)]).toEqual(["#1d4ed8", [240, 240], [64, 80]]);
    expect(t.merges).toEqual([{ row: t.rows[0]?.id, col: t.cols[0]?.id, rows: 1, cols: 2 }]);
    expect(t.cells.map((x) => x.text)).toEqual(["Titre", "a", "b"]);
    expect(d.bounds([id])).toEqual({ x0: 300, y0: 100, x1: 540, y1: 172 });
    d.undo();
    expect(d.element(id)).toBeNull();
    d.free();
  });

  it("ImportTable refusé (F18, PC1) : dimensions, longueurs, tailles, couleur, matrice, fusions ; page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    type Imp = Extract<Command, { type: "ImportTable" }>;
    const ok: Imp = { type: "ImportTable", page: p, matrix: [1, 0, 0, 1, 0, 0], colWidth: 240, rowHeights: [64, 64], cols: 2, cells: ["", "", "", ""], merges: [], color: "#000000", size: 36 };
    for (const over of [
      { cols: 0, cells: [] }, { cols: 65 }, { rowHeights: [] }, { cells: ["", ""] }, { rowHeights: [64, Number.NaN] },
      { colWidth: 0 }, { color: "!!" }, { matrix: [0, 0, 0, 0, 0, 0] as const }, { merges: [[0, 0, 1, 1]] as const },
      { merges: [[1, 1, 2, 1]] as const }, { merges: [[0, 0, 2, 1], [1, 0, 1, 2]] as const },
    ] as Partial<Imp>[]) {
      unchanged(d, () => expect(messageOf(() => d.apply({ ...ok, ...over }))).toBe(TABLE_MESSAGE));
    }
    expect(messageOf(() => d.apply({ ...ok, page: "zz" }))).toBe("page inconnue : zz");
    d.free();
  });
});

describe("contrôle de forme C10b (tableau)", () => {
  const base = { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0] };
  const table = {
    color: "#000000", size: 36, cols: [{ id: "c1", width: 240 }, { id: "c2", width: 240 }], rows: [{ id: "r1", height: 64 }],
    cells: [{ row: "r1", col: "c1", text: "A", fill: undefined, shade: "#94a3b8", spans: [plainSpan("A")] }], merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }],
  };
  it("toElementView : zones et ombrage contrôlés ; shade absent → null", () => {
    expect(toElementView({ ...base, table })).toEqual({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: "A", fill: null, shade: "#94a3b8", spans: [plainSpan("A")] }] } });
    const plain = { ...table, cells: [{ row: "r1", col: "c1", text: "A", spans: [plainSpan("A")] }] };
    expect(toElementView({ ...base, table: plain })).toEqual({ ...base, table: { ...plain, cells: [{ row: "r1", col: "c1", text: "A", fill: null, shade: null, spans: [plainSpan("A")] }] } });
  });
  it("toElementView : zones ou ombrage de forme fausse → erreur", () => {
    expect(() => toElementView({ ...base, table: { ...table, merges: undefined } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, merges: [{ row: "r1", col: "c1", rows: 0, cols: 2 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, merges: [{ row: 1, col: "c1", rows: 1, cols: 2 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: "A", shade: true, spans: [plainSpan("A")] }] } })).toThrow("ElementView invalide");
  });
});

describe.skipIf(loaded === null)("contrat C10b : vrai module seulement", () => {
  it("fixture tableau-fusion-ombrage.roomboard (F30, S3) : « Lundi » sur deux colonnes, trois cellules ombrées", () => {
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-core/tests/fixtures/tableau-fusion-ombrage.roomboard", import.meta.url)));
    const d = need().core.load(bytes);
    const id = d.elementIds(first(d)).find((e) => d.element(e)?.kind === "table") ?? "";
    const t = tableOf(d, id);
    expect([t.cols.length, t.rows.length, t.merges.length, t.merges[0]?.cols]).toEqual([4, 3, 1, 2]);
    expect(t.cells.filter((c) => c.shade !== null)).toHaveLength(3);
    expect(t.cells[0]?.text).toBe("Lundi");
    d.free();
  });
});

// C7b (R7, R16) : `spans` facultatif de SetText et SetTableCell. T12 branche le vrai module (`c7bFactories = factories`).
const c7bFactories = factories; // T12 : vrai module branché, contrat C7b commun aux deux fabriques
const C7B_BOLD: TextAttrs = { bold: true };
const C7B_ITALIC: TextAttrs = { italic: true };
const C7B_RED_BOLD: TextAttrs = { bold: true, color: "#dc2626" };
describe.each(c7bFactories)("contrat C7b : $name", ({ f }) => {
  const setText = (d: CoreDocument, p: string, id: string | null, content: string, spans?: readonly TextSpan[]) =>
    d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45, ...(spans === undefined ? {} : { spans }) });
  const spansOf = (d: CoreDocument, id: string): readonly TextSpan[] => {
    const e = d.element(id);
    if (e?.kind !== "text") throw new Error(`texte attendu : ${e?.kind ?? "absent"}`);
    return e.text.spans;
  };
  const setCell = (d: CoreDocument, id: string, row: string, col: string, content: string, spans?: readonly TextSpan[]) =>
    d.apply({ type: "SetTableCell", id, row, col, content, ...(spans === undefined ? {} : { spans }) });
  const cellSpans = (d: CoreDocument, id: string, row: string, col: string): readonly TextSpan[] =>
    tableOf(d, id).cells.find((c) => c.row === row && c.col === col)?.spans ?? [];

  it("SetText avec segments : texte et format en une étape ; annuler rend l'état d'avant (R6, R7)", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat noir").ids[0] ?? "";
    setText(d, p, id, "Le gros chat noir", [plainSpan("Le gros "), { text: "chat", attrs: C7B_RED_BOLD }, plainSpan(" noir")]);
    expect(spansOf(d, id)).toEqual([plainSpan("Le gros "), { text: "chat", attrs: C7B_RED_BOLD }, plainSpan(" noir")]);
    d.undo();
    expect(spansOf(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.free();
  });

  it("S6 : même texte, segments changés : écrit (jamais inchangé), une étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat noir").ids[0] ?? "";
    const v = d.version();
    setText(d, p, id, "Le chat noir", [plainSpan("Le chat "), { text: "noir", attrs: C7B_ITALIC }]);
    expect(d.version()).toBeGreaterThan(v);
    expect(spansOf(d, id)[1]).toEqual({ text: "noir", attrs: C7B_ITALIC });
    d.undo();
    expect(spansOf(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.free();
  });

  it("mêmes segments une fois normalisés (voisins égaux, false, null) : aucune étape (D38)", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat").ids[0] ?? "";
    setText(d, p, id, "Le chat", [plainSpan("Le "), { text: "chat", attrs: C7B_BOLD }]);
    const same = [plainSpan("Le"), { text: " ", attrs: { italic: false, color: null } } as unknown as TextSpan, { text: "chat", attrs: C7B_BOLD }];
    unchanged(d, () => setText(d, p, id, "Le chat", same));
    d.free();
  });

  it("segments sans attribut sur un texte sans attribut : même vue qu'un SetText sans spans (S5)", () => {
    const a = f.blank();
    const b = f.blank();
    const ia = setText(a, first(a), null, "Le chat").ids[0] ?? "";
    const ib = setText(b, first(b), null, "Le chat").ids[0] ?? "";
    setText(a, first(a), ia, "Le gros chat");
    setText(b, first(b), ib, "Le gros chat", [plainSpan("Le gros chat")]);
    expect(spansOf(b, ib)).toEqual(spansOf(a, ia));
    expect(b.version()).toBe(a.version());
    a.free();
    b.free();
  });

  it("segments invalides : BadFormat d'abord (concaténation, valeur, clé inconnue), avant texte invalide et id inconnu (PC2)", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat").ids[0] ?? "";
    const bads: TextSpan[][] = [
      [plainSpan("Le cha")],
      [{ text: "Le chat", attrs: { size: 0 } }],
      [{ text: "Le chat", attrs: { color: "pas une couleur !" } }],
      [{ text: "Le chat", attrs: { href: "x" } } as unknown as TextSpan],
    ];
    for (const spans of bads) {
      unchanged(d, () => expect(messageOf(() => setText(d, p, id, "Le chat", spans))).toBe(BAD_FORMAT));
      unchanged(d, () => expect(messageOf(() => setText(d, p, "absent", "Le chat", spans))).toBe(BAD_FORMAT));
      unchanged(d, () =>
        expect(messageOf(() => d.apply({ type: "SetText", page: p, id, x: 0, y: 0, content: "Le chat", color: "#000000", size: 0, boxWidth: 600, boxHeight: 45, spans }))).toBe(BAD_FORMAT),
      );
    }
    d.free();
  });

  it("boîte neuve avec segments : créée mise en forme ; annuler la retire", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat", [plainSpan("Le "), { text: "chat", attrs: C7B_RED_BOLD }]).ids[0] ?? "";
    expect(spansOf(d, id)).toEqual([plainSpan("Le "), { text: "chat", attrs: C7B_RED_BOLD }]);
    d.undo();
    expect(d.element(id)).toBeNull();
    d.free();
  });

  it("SetTableCell avec segments : cellule absente créée en gras, une étape ; vue spans (R16)", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "aaTotal", [plainSpan("a"), { text: "a", attrs: C7B_BOLD }, { text: "Total", attrs: C7B_BOLD }]);
    expect(cellSpans(d, id, r0, c0)).toEqual([plainSpan("a"), { text: "aTotal", attrs: C7B_BOLD }]);
    d.undo();
    expect(tableOf(d, id).cells).toEqual([]);
    d.free();
  });

  it("S6 : cellule « Total » existante, italique seule : écrite, une étape ; mêmes segments : aucune", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "Total");
    const v = d.version();
    setCell(d, id, r0, c0, "Total", [{ text: "Total", attrs: C7B_ITALIC }]);
    expect(d.version()).toBeGreaterThan(v);
    expect(cellSpans(d, id, r0, c0)).toEqual([{ text: "Total", attrs: C7B_ITALIC }]);
    unchanged(d, () => setCell(d, id, r0, c0, "Total", [{ text: "To", attrs: C7B_ITALIC }, { text: "tal", attrs: C7B_ITALIC }]));
    d.undo();
    expect(cellSpans(d, id, r0, c0)).toEqual([plainSpan("Total")]);
    d.free();
  });

  it("SetTableCell sans segments : la frappe hérite du caractère précédent (C7 T5) ; segments invalides : BadFormat avant BadTable", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "Total", [{ text: "Total", attrs: C7B_BOLD }]);
    setCell(d, id, r0, c0, "Totals");
    expect(cellSpans(d, id, r0, c0)).toEqual([{ text: "Totals", attrs: C7B_BOLD }]);
    unchanged(d, () =>
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "x", rowHeight: -1, spans: [plainSpan("y")] }))).toBe(BAD_FORMAT),
    );
    d.free();
  });

  it("enregistrer puis rouvrir : segments du texte et de la cellule gardés (S1)", () => {
    const d = f.blank();
    const p = first(d);
    const tx = setText(d, p, null, "Le chat", [plainSpan("Le "), { text: "chat", attrs: C7B_RED_BOLD }]).ids[0] ?? "";
    const id = addTable(d, p, { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "Total", [{ text: "Total", attrs: C7B_BOLD }]);
    const r = f.load(d.save(now, "0.1.0"));
    expect(spansOf(r, tx)).toEqual(spansOf(d, tx));
    expect(cellSpans(r, id, r0, c0)).toEqual([{ text: "Total", attrs: C7B_BOLD }]);
    r.free();
    d.free();
  });

// Croisement C7b × C10b : les commandes de tableau ne touchent pas aux segments d'une cellule riche.
describe.each(c7bFactories)("contrat C7b × C10b : $name", ({ f }) => {
  it("segments d'une cellule riche intacts après SetTableShade, SetTableFill (plage), MergeTableCells (ancre), SplitTableCell", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    const a = c10bAt(g, 0, 0);
    const rich = [plainSpan("Le "), { text: "chat", attrs: C7B_RED_BOLD }, { text: " noir", attrs: C7B_ITALIC }];
    d.apply({ type: "SetTableCell", id, ...a, content: "Le chat noir", spans: rich });
    const spansNow = (): readonly TextSpan[] => tableOf(d, id).cells.find((c) => c.row === a.row && c.col === a.col)?.spans ?? [];
    expect(spansNow()).toEqual(rich);
    d.apply({ type: "SetTableShade", id, from: a, to: a, shade: SHADE });
    expect(spansNow()).toEqual(rich);
    d.apply({ type: "SetTableShade", id, from: a, to: a, shade: null });
    expect(spansNow()).toEqual(rich);
    d.apply({ type: "SetTableFill", id, ...a, to: c10bAt(g, 1, 2), fill: "#fef08a" });
    expect(spansNow()).toEqual(rich);
    d.apply({ type: "MergeTableCells", id, from: a, to: c10bAt(g, 1, 1) });
    expect(spansNow()).toEqual(rich);
    d.apply({ type: "SplitTableCell", id, ...a });
    expect(spansNow()).toEqual(rich);
    expect(tableOf(d, id).cells.find((c) => c.row === a.row && c.col === a.col)?.text).toBe("Le chat noir");
    d.free();
  });
});
});

describe("contrôle de forme C7b (cellules, appels de la liaison)", () => {
  const base = { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0] };
  const table = (cell: Record<string, unknown>) => ({
    color: "#000000", size: 36, cols: [{ id: "c1", width: 240 }], rows: [{ id: "r1", height: 64 }],
    cells: [{ row: "r1", col: "c1", text: "ab", fill: null, ...cell }],
    merges: [],
  });

  it("toElementView : segments de cellule exigés et contrôlés (R16)", () => {
    expect(toElementView({ ...base, table: table({ spans: [{ text: "ab", attrs: { bold: true } }] }) })).toMatchObject({ table: { cells: [{ spans: [{ text: "ab", attrs: { bold: true } }] }] } });
    for (const cell of [{}, { spans: [] }, { spans: [{ text: "a", attrs: {} }] }, { spans: [{ text: "ab", attrs: { href: "x" } }] }]) {
      expect(() => toElementView({ ...base, table: table(cell) }), JSON.stringify(cell)).toThrow("ElementView invalide");
    }
  });

  it("SetText et SetTableCell : spans passés nettoyés (clés undefined retirées) ; absents : undefined (R7)", () => {
    const ok = { pages: ["p1"], ids: ["e1"], removed: [], full: false, version: 1 };
    const calls: unknown[][] = [];
    const doc = {
      set_text: (...args: unknown[]): unknown => (calls.push(args), ok),
      set_table_cell: (...args: unknown[]): unknown => (calls.push(args), ok),
    };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    const spans = [{ text: "a", attrs: { bold: true, color: undefined } as unknown as TextAttrs }];
    d.apply({ type: "SetText", page: "p1", id: null, x: 0, y: 0, content: "a", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45, spans });
    d.apply({ type: "SetText", page: "p1", id: null, x: 0, y: 0, content: "a", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    d.apply({ type: "SetTableCell", id: "t1", row: "r1", col: "c1", content: "a", spans });
    expect(calls.map((a) => a.at(-1))).toEqual([[{ text: "a", attrs: { bold: true } }], undefined, [{ text: "a", attrs: { bold: true } }]]);
    expect((calls[0]?.at(-1) as { attrs: unknown }[])[0]?.attrs).toStrictEqual({ bold: true });
  });
});

// C6a (pot de peinture) : Fill (contour, intérieur, fond de page) et edgeHit ; T5 joue ce bloc sur le vrai module.
const c6aFactories = factories;
const BAD_FILL = "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)";
const shapeAt = (d: CoreDocument, page: string, shape: ShapeKind = "rect", c: readonly [number, number, number, number] = [100, 100, 300, 200]): string => {
  const id = d.apply({ type: "AddShape", page, shape, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: { color: "#000000", width: 4 }, fill: null }).ids[0];
  if (id === undefined) throw new Error("aucune forme");
  return id;
};
const shapeFill = (d: CoreDocument, id: string): string | null => {
  const e = d.element(id);
  return e?.kind === "shape" ? e.shape.fill : null;
};
const strokeColor = (d: CoreDocument, id: string): string => {
  const e = d.element(id);
  return e?.kind === "shape" || e?.kind === "stroke" ? e.style.color : "";
};
const bg = (d: CoreDocument, page: string): string => d.page(page)?.background ?? "";

describe.each(c6aFactories)("contrat C6a : $name", ({ f }) => {
  it("Fill intérieur : une étape, annulée puis rétablie (S1)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const c = d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    expect([c.pages, c.ids]).toEqual([[p], [r]]);
    expect(shapeFill(d, r)).toBe("#facc15");
    d.undo();
    expect(shapeFill(d, r)).toBeNull();
    d.redo();
    expect(shapeFill(d, r)).toBe("#facc15");
    d.free();
  });

  it("Fill contour : couleur d'une forme (intérieur gardé) et d'un trait (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const s = commit(d, p, 500);
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: "#dc2626" });
    d.apply({ type: "Fill", page: p, target: { kind: "edge", id: s }, color: "#dc2626" });
    expect([strokeColor(d, r), shapeFill(d, r), strokeColor(d, s)]).toEqual(["#dc2626", "#facc15", "#dc2626"]);
    d.free();
  });

  it("« Aucune » : intérieur retiré ; sur un contour ou un trait, aucune étape (D11, D38)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p, "ellipse");
    const s = commit(d, p, 500);
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: null });
    expect(shapeFill(d, r)).toBeNull();
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: null }));
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: null }));
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "edge", id: s }, color: null }));
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: "#000000" }));
    d.free();
  });

  it("Fill fond de page : écrit, « Aucune » = #ffffff, même valeur sans étape, annulé (S4, D10)", () => {
    const d = f.blank();
    const p = first(d);
    expect(bg(d, p)).toBe("#ffffff");
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: null }));
    const c = d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" });
    expect([c.pages, c.ids]).toEqual([[p], []]);
    expect(bg(d, p)).toBe("#1d4ed8");
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" }));
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: null });
    expect(bg(d, p)).toBe("#ffffff");
    d.undo();
    expect(bg(d, p)).toBe("#1d4ed8");
    const p2 = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    expect(bg(d, p2)).toBe("#ffffff");
    d.free();
  });

  it("refus dans l'ordre du cœur, sans étape : couleur, page, élément de la page, cible (D12, PC2, PC3)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const l = shapeAt(d, p, "line", [100, 300, 300, 300]);
    const s = commit(d, p, 500);
    const t = d.apply({ type: "SetText", page: p, id: null, x: 400, y: 600, content: "abc", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    const p2 = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    const cases: [Command, string][] = [
      [{ type: "Fill", page: "nope", target: { kind: "inside", id: r }, color: "#12" }, BAD_FILL],
      [{ type: "Fill", page: "nope", target: { kind: "inside", id: r }, color: "#facc15" }, "page inconnue : nope"],
      [{ type: "Fill", page: p, target: { kind: "inside", id: "nope" }, color: "#facc15" }, "élément inconnu : nope"],
      [{ type: "Fill", page: p2, target: { kind: "inside", id: r }, color: "#facc15" }, `élément inconnu : ${r}`],
      [{ type: "Fill", page: p, target: { kind: "inside", id: l }, color: "#facc15" }, BAD_FILL],
      [{ type: "Fill", page: p, target: { kind: "inside", id: s }, color: "#facc15" }, BAD_FILL],
      [{ type: "Fill", page: p, target: { kind: "edge", id: t }, color: "#facc15" }, BAD_FILL],
      [{ type: "Fill", page: p, target: { kind: "inside", id: t }, color: null }, BAD_FILL],
    ];
    for (const [cmd, msg] of cases) unchanged(d, () => expect(messageOf(() => d.apply(cmd)), JSON.stringify(cmd)).toBe(msg));
    d.free();
  });

  it("edgeHit : bande = tolérance + demi-épaisseur, à l'échelle de la forme (D5, DA2)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const l = shapeAt(d, p, "line", [100, 300, 300, 300]);
    expect([d.edgeHit(r, 103, 150, 6), d.edgeHit(r, 110, 150, 6), d.edgeHit(r, 200, 150, 6)]).toEqual([true, false, false]);
    expect([d.edgeHit(l, 200, 300, 6), d.edgeHit("nope", 103, 150, 6)]).toEqual([false, false]);
    d.apply({ type: "Transform", ids: [r], matrix: [2, 0, 0, 2, 0, 0] });
    expect([d.edgeHit(r, 190, 300, 6), d.edgeHit(r, 186, 300, 6)]).toEqual([true, false]);
    d.free();
  });

  it("edgeHit : échelle non uniforme, racine du déterminant, ni la plus petite ni la plus grande valeur singulière (DA2)", () => {
    // [1, 0, 0, 4] : valeurs singulières 1 et 4, racine du déterminant 2 ; bord gauche monde vers x = 99, à mi-hauteur
    // y = 600. Bande du cœur 6 + 2 × 2 = 10 : la distance 9 touche, 11 non. Plus petite valeur singulière (bande 8) :
    // la distance 9 raterait ; plus grande (bande 14) : la distance 11 toucherait.
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    d.apply({ type: "Transform", ids: [r], matrix: [1, 0, 0, 4, 0, 0] });
    expect([d.edgeHit(r, 90, 600, 6), d.edgeHit(r, 88, 600, 6)]).toEqual([true, false]);
    d.free();
  });

  it("groupe de groupe, membre du milieu : Fill ne touche que lui, contour comme intérieur (D4, D25)", () => {
    const d = f.blank();
    const p = first(d);
    const a = shapeAt(d, p, "rect", [100, 100, 300, 200]);
    const b = shapeAt(d, p, "rect", [100, 800, 300, 900]);
    const c = shapeAt(d, p, "rect", [400, 800, 600, 900]);
    d.apply({ type: "Group", ids: [a, b] });
    d.apply({ type: "Group", ids: [a, c] });
    expect(d.element(b)?.group).toHaveLength(2);
    const inside = d.apply({ type: "Fill", page: p, target: { kind: "inside", id: b }, color: "#facc15" });
    expect(inside.ids).toEqual([b]);
    expect([a, b, c].map((id) => shapeFill(d, id))).toEqual([null, "#facc15", null]);
    const edge = d.apply({ type: "Fill", page: p, target: { kind: "edge", id: b }, color: "#dc2626" });
    expect(edge.ids).toEqual([b]);
    expect([a, b, c].map((id) => strokeColor(d, id))).toEqual(["#000000", "#dc2626", "#000000"]);
    d.free();
  });

  it("edgeHit d'une ellipse : le bord suit la courbe, pas la boîte (D5)", () => {
    const d = f.blank();
    const p = first(d);
    const e = shapeAt(d, p, "ellipse");
    // boîte (100, 100)-(300, 200), centre (200, 150) : sommets du grand et du petit axe sur le bord, coin de la boîte loin de la courbe.
    expect([d.edgeHit(e, 100, 150, 6), d.edgeHit(e, 200, 100, 6), d.edgeHit(e, 200, 150, 6), d.edgeHit(e, 103, 103, 6)]).toEqual([true, true, false, false]);
    d.free();
  });

  it("aller-retour : remplissage, contour et fond gardés (S5)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: "#dc2626" });
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" });
    const back = f.load(d.save(now, "0.1.0"));
    expect([shapeFill(back, r), strokeColor(back, r), bg(back, p)]).toEqual(["#facc15", "#dc2626", "#1d4ed8"]);
    back.free();
    d.free();
  });
});

describe("contrôle de forme C6a", () => {
  const ok = { pages: ["p1"], ids: ["e1"], removed: [], full: false, version: 1 };
  const setup = () => {
    const calls: unknown[][] = [];
    const doc = {
      fill: (...args: unknown[]): unknown => (calls.push(["fill", ...args]), ok),
      edge_hit: (...args: unknown[]): boolean => (calls.push(["edge_hit", ...args]), true),
    };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    return { calls, d: createWasmCore(stub as unknown as WasmModule).blank() };
  };

  it("Fill : cible, id et couleur passés ; fond sans id ; null → undefined (Option::None)", () => {
    const { calls, d } = setup();
    d.apply({ type: "Fill", page: "p1", target: { kind: "inside", id: "e1" }, color: "#facc15" });
    d.apply({ type: "Fill", page: "p1", target: { kind: "edge", id: "e1" }, color: null });
    d.apply({ type: "Fill", page: "p1", target: { kind: "background" }, color: null });
    expect(calls).toEqual([
      ["fill", "p1", "inside", "e1", "#facc15"],
      ["fill", "p1", "edge", "e1", undefined],
      ["fill", "p1", "background", undefined, undefined],
    ]);
  });

  it("edgeHit : arguments passés tels quels, booléen rendu", () => {
    const { calls, d } = setup();
    expect(d.edgeHit("e1", 103, 150, 6)).toBe(true);
    expect(calls).toEqual([["edge_hit", "e1", 103, 150, 6]]);
  });
});

describe.skipIf(loaded === null)("contrat C6a : vrai module seulement", () => {
  it("fixture socle-v1.roomboard (d'avant C6a, S5, D21) : fond blanc, le pot y colore le fond, relu après enregistrement", () => {
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard", import.meta.url)));
    const d = need().core.load(bytes);
    const p = first(d);
    expect(bg(d, p)).toBe("#ffffff");
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" });
    const back = need().core.load(d.save(now, "0.1.0"));
    expect(bg(back, p)).toBe("#1d4ed8");
    back.free();
    d.free();
  });
});

// C3 (Z1, Z5, Z6) : groupes, extraction, insertion, fragments. T11 branche le vrai module (`c3Factories = factories`).
// Aucun écart de la fausse liaison n'est exclu de ce bloc : mêmes refus dans le même ordre, mêmes messages, mêmes Change.
const c3Factories = factories; // T11 : vrai module branché, contrat C3 commun aux deux fabriques
const C3_ASSET = { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 };
const C3_GRID: GridInput = {
  visible: true, snap: true, above: false,
  levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", lineWidth: 1, snap: true, visible: true }],
};
describe.each(c3Factories)("contrat C3 : $name", ({ f }) => {
  const rect = (d: CoreDocument, p: string, x: number): string => {
    const id = d.apply({ type: "AddShape", page: p, shape: "rect", x0: x, y0: 100, x1: x + 50, y1: 150, style, fill: null }).ids[0];
    if (id === undefined) throw new Error("aucun id");
    return id;
  };
  const groupOf = (d: CoreDocument, id: string): readonly string[] | undefined => d.element(id)?.group;

  it("un élément sans groupe n'a pas de champ group", () => {
    const d = f.blank();
    const a = rect(d, first(d), 0);
    expect(d.element(a)).not.toHaveProperty("group");
  });

  it("Group : un groupe neuf en tête du chemin, ids triés, une étape", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const c = d.apply({ type: "Group", ids: [b, a] });
    expect(c.ids).toEqual([a, b].sort());
    expect(c.pages).toEqual([p]);
    const g = groupOf(d, a);
    expect(g).toHaveLength(1);
    expect(groupOf(d, b)).toEqual(g);
    d.undo();
    expect([groupOf(d, a), groupOf(d, b)]).toEqual([undefined, undefined]);
  });

  it("Group refusé : vide, id inconnu, autre page, une seule unité ; rien d'écrit", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const q = d.apply({ type: "AddPage", after: p }).pages[0]!;
    const c = rect(d, q, 0);
    for (const ids of [[], [a, "absent"], [a, c], [a], [a, a]]) {
      unchanged(d, () => expect(messageOf(() => d.apply({ type: "Group", ids }))).toBe(BAD_GROUP_MESSAGE));
    }
    d.apply({ type: "Group", ids: [a, b] });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "Group", ids: [a, b] }))).toBe(BAD_GROUP_MESSAGE));
  });

  // Discrimine (décision de contre-relecture) : un id pris dans un groupe vaut tout son groupe extérieur. Une liaison qui
  // ne grouperait que les ids donnés laisserait `b` seul dans l'ancien groupe et rendrait `ids` = [a, c].
  it("Group partiel : étendu au groupe extérieur entier de chaque id ; ids = tous les éléments écrits, triés", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const c = rect(d, p, 200);
    d.apply({ type: "Group", ids: [a, b] });
    const inner = groupOf(d, a)!;
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "Group", ids: [b] }))).toBe(BAD_GROUP_MESSAGE));
    const ch = d.apply({ type: "Group", ids: [c, a] });
    expect(ch.ids).toEqual([a, b, c].sort());
    expect(ch.pages).toEqual([p]);
    const outer = groupOf(d, c)!;
    expect(outer).toHaveLength(1);
    expect([groupOf(d, a), groupOf(d, b)]).toEqual([[outer[0], inner[0]], [outer[0], inner[0]]]);
  });

  it("groupe de groupe : chemins imbriqués ; Ungroup retire le niveau extérieur", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const c = rect(d, p, 200);
    d.apply({ type: "Group", ids: [a, b] });
    const inner = groupOf(d, a)!;
    d.apply({ type: "Group", ids: [a, b, c] });
    const outer = groupOf(d, a)!;
    expect(outer).toHaveLength(2);
    expect(outer[1]).toBe(inner[0]);
    expect(groupOf(d, c)).toEqual([outer[0]]);
    const u = d.apply({ type: "Ungroup", ids: [a, b, c] });
    expect(u.ids).toEqual([a, b, c].sort());
    expect([groupOf(d, a), groupOf(d, b), groupOf(d, c)]).toEqual([inner, inner, undefined]);
  });

  it("Ungroup partiel : seuls les ids nommés perdent leur niveau, le reste du groupe est gardé", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const c = rect(d, p, 200);
    d.apply({ type: "Group", ids: [a, b, c] });
    const g = groupOf(d, b)!;
    const u = d.apply({ type: "Ungroup", ids: [a] });
    expect(u.ids).toEqual([a]);
    expect([groupOf(d, a), groupOf(d, b), groupOf(d, c)]).toEqual([undefined, g, g]);
  });

  it("Ungroup sans élément groupé : aucune étape", () => {
    const d = f.blank();
    const a = rect(d, first(d), 0);
    unchanged(d, () => expect(d.apply({ type: "Ungroup", ids: [a, "absent"] }).ids).toEqual([]));
  });

  it("extract : une page, ids neufs, ordre d'empilement, aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    rect(d, p, 300);
    const c = rect(d, p, 500);
    const x = d.extract(p, [c, a]);
    expect(x.pageIds()).toHaveLength(1);
    const ids = x.elementIds(first(x));
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain(a);
    expect(x.element(ids[0]!)?.kind).toBe("stroke");
    expect(x.element(ids[1]!)?.transform).toEqual(d.element(c)?.transform);
    expect(x.canUndo()).toBe(false);
  });

  it("extract refusé : page ou élément inconnus", () => {
    const d = f.blank();
    const a = rect(d, first(d), 0);
    expect(messageOf(() => d.extract("absente", [a]))).toBe("page inconnue : absente");
    expect(messageOf(() => d.extract(first(d), [a, "x"]))).toBe("élément inconnu : x");
  });

  it("extract recopie texte riche, tableau et métadonnée des seuls assets cités", () => {
    const d = f.blank();
    const p = first(d);
    const t = d.apply({ type: "SetText", page: p, id: null, x: 10, y: 10, content: "Bonjour", color: "#000000", size: 36, boxWidth: 400, boxHeight: 45 }).ids[0]!;
    d.apply({ type: "FormatText", id: t, start: 0, len: 3, attrs: { bold: true } });
    const tb = d.apply({ type: "AddTable", page: p, x: 0, y: 300, cols: 2, rows: 2, colWidth: 100, rowHeight: 40, color: "#000000", size: 24 }).ids[0]!;
    const i = d.apply({ type: "AddImage", page: p, asset: C3_ASSET, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    d.apply({ type: "AddImage", page: p, asset: { ...C3_ASSET, id: "cd".repeat(32), name: "b.png" }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    const x = d.extract(p, [t, tb, i]);
    const ids = x.elementIds(first(x));
    expect(x.element(ids[0]!)).toMatchObject({ kind: "text", text: (d.element(t) as { text: unknown }).text });
    expect(x.element(ids[1]!)).toMatchObject({ table: (d.element(tb) as { table: unknown }).table });
    expect(x.citedAssets()).toEqual([C3_ASSET]);
  });

  it("insertFragment : en haut de la pile, translaté, une étape", () => {
    const s = f.blank();
    const a = rect(s, first(s), 0);
    const frag = s.extract(first(s), [a]);
    const d = f.blank();
    const p = first(d);
    const old = commit(d, p, 500);
    const c = d.insertFragment(frag, p, 10, 20);
    const ids = d.elementIds(p);
    expect(ids[0]).toBe(old);
    expect(c.ids).toEqual([ids[1]]);
    expect(c.pages).toEqual([p]);
    const t0 = s.element(a)!.transform;
    const t1 = d.element(ids[1]!)!.transform;
    expect([t1[4], t1[5]]).toEqual([t0[4] + 10, t0[5] + 20]);
    d.undo();
    expect(d.elementIds(p)).toEqual([old]);
  });

  it("deux insertions : ids et groupes indépendants", () => {
    const s = f.blank();
    const sp = first(s);
    const a = rect(s, sp, 0);
    const b = rect(s, sp, 100);
    s.apply({ type: "Group", ids: [a, b] });
    const frag = s.extract(sp, [a, b]);
    const d = f.blank();
    const p = first(d);
    const c1 = d.insertFragment(frag, p, 0, 0);
    const c2 = d.insertFragment(frag, p, 24, 24);
    expect(c1.ids.some((id) => c2.ids.includes(id))).toBe(false);
    const g1 = groupOf(d, c1.ids[0]!);
    const g2 = groupOf(d, c2.ids[0]!);
    expect(g1).toHaveLength(1);
    expect(g1).not.toEqual(g2);
    expect(groupOf(d, c1.ids[1]!)).toEqual(g1);
    expect(groupOf(d, c2.ids[1]!)).toEqual(g2);
    expect(g1).not.toEqual(groupOf(s, a));
  });

  it("insertFragment refusé : déplacement non fini, page inconnue ; source vide : aucune étape", () => {
    const s = f.blank();
    const a = rect(s, first(s), 0);
    const frag = s.extract(first(s), [a]);
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => expect(messageOf(() => d.insertFragment(frag, p, Number.NaN, 0))).toBe("matrice invalide (six nombres finis, inversible)"));
    unchanged(d, () => expect(messageOf(() => d.insertFragment(frag, "absente", 0, 0))).toBe("page inconnue : absente"));
    unchanged(d, () => expect(d.insertFragment(s.extract(first(s), []), p, 0, 0).ids).toEqual([]));
  });

  it("insertPages : pages recopiées après la page, grille et image, une étape", () => {
    const s = f.blank();
    const s0 = first(s);
    const s1 = s.apply({ type: "AddPage", after: s0 }).pages[0]!;
    s.apply({ type: "AddImage", page: s0, asset: C3_ASSET, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    rect(s, s1, 0);
    s.apply({ type: "SetGrid", page: s1, grid: C3_GRID });
    s.apply({ type: "Fill", page: s0, target: { kind: "background" }, color: "#bfdbfe" });
    const d = f.blank();
    const t0 = first(d);
    const t1 = d.apply({ type: "AddPage", after: t0 }).pages[0]!;
    const c = d.insertPages(s, t0);
    const pages = d.pageIds();
    expect([bg(d, pages[1]!), bg(d, pages[2]!)]).toEqual(["#bfdbfe", "#ffffff"]);
    expect(pages).toHaveLength(4);
    expect([pages[0], pages[3]]).toEqual([t0, t1]);
    expect(c.pages).toEqual([pages[1], pages[2]]);
    expect(pages).not.toContain(s0);
    expect(d.page(pages[2]!)?.grid).toEqual(C3_GRID);
    expect(c.ids).toHaveLength(2);
    expect(d.asset(C3_ASSET.id)).toEqual(C3_ASSET);
    d.undo();
    expect(d.pageIds()).toEqual([t0, t1]);
    expect(d.asset(C3_ASSET.id)?.name).toBe(C3_ASSET.id);
  });

  it("insertPages : page inconnue refusée", () => {
    const d = f.blank();
    unchanged(d, () => expect(messageOf(() => d.insertPages(f.blank(), "absente"))).toBe("page inconnue : absente"));
  });

  it("fragment : saveFragment puis loadFragment ; groupes gardés ; parts", () => {
    const s = f.blank();
    const sp = first(s);
    const a = rect(s, sp, 0);
    const b = rect(s, sp, 100);
    s.apply({ type: "Group", ids: [a, b] });
    const frag = s.extract(sp, [a, b]);
    const back = f.loadFragment(frag.saveFragment(now, "0.1.0", "Sélection"));
    const ids = back.elementIds(first(back));
    expect(ids).toHaveLength(2);
    expect(groupOf(back, ids[0]!)).toHaveLength(1);
    expect(groupOf(back, ids[0]!)).toEqual(groupOf(back, ids[1]!));
    const [m, y] = frag.saveFragmentParts(now, "0.1.0", "Sélection");
    expect(f.loadFragmentParts(m, y).elementIds(first(frag))).toHaveLength(2);
  });

  // Décision de contre-relecture : un fragment se place sur les bornes réelles de ses éléments (pas sur `bounds` du
  // manifeste) ; le fragment relu doit donc les donner, égales à celles de la sélection d'origine.
  it("fragment relu : bornes réelles de ses éléments, égales à celles de la sélection", () => {
    const s = f.blank();
    const sp = first(s);
    const a = rect(s, sp, 0);
    const b = rect(s, sp, 300);
    const back = f.loadFragment(s.extract(sp, [a, b]).saveFragment(now, "0.1.0", "Sélection"));
    expect(back.bounds(back.elementIds(first(back)))).toEqual(s.bounds([a, b]));
  });

  it("un fragment n'est pas un document, un document n'est pas un fragment", () => {
    const s = f.blank();
    const frag = s.extract(first(s), [rect(s, first(s), 0)]);
    expect(messageOf(() => f.load(frag.saveFragment(now, "0.1.0", "x")))).toBe(NOT_A_DOCUMENT_MESSAGE);
    expect(messageOf(() => f.loadFragment(f.blank().save(now, "0.1.0")))).toBe(NOT_A_FRAGMENT_MESSAGE);
  });

  // Décision de contre-relecture : le mauvais type est refusé au chargement, par les parts aussi (conteneur avec assets).
  it("parts : un fragment n'est pas un document, un document n'est pas un fragment", () => {
    const s = f.blank();
    const frag = s.extract(first(s), [rect(s, first(s), 0)]);
    const [fm, fy] = frag.saveFragmentParts(now, "0.1.0", "x");
    expect(messageOf(() => f.loadParts(fm, fy))).toBe(NOT_A_DOCUMENT_MESSAGE);
    const [dm, dy] = f.blank().saveParts(now, "0.1.0");
    expect(messageOf(() => f.loadFragmentParts(dm, dy))).toBe(NOT_A_FRAGMENT_MESSAGE);
  });

  it("enregistrer puis relire garde les groupes", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    d.apply({ type: "Group", ids: [a, b] });
    const back = f.load(d.save(now, "0.1.0"));
    expect(back.element(a)?.group).toEqual(d.element(a)?.group);
  });
});

describe.skipIf(loaded === null)("contrat C3 : vrai module seulement", () => {
  it("gomme partielle : les morceaux gardent le groupe du trait coupé", () => {
    const d = need().core.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    const b = commit(d, p, 200);
    d.apply({ type: "Group", ids: [a, b] });
    const g = d.element(a)?.group;
    const c = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 50, 300, 150]), radius: 10, mode: "partial" });
    expect(c.removed).toEqual([a]);
    expect(c.ids.length).toBeGreaterThan(0);
    for (const id of c.ids) expect(d.element(id)?.group).toEqual(g);
  });
  it("kind inconnu dans le manifeste : refusé « prochaine version »", () => {
    const d = need().core.blank();
    const [m, y] = d.extract(first(d), []).saveFragmentParts(now, "0.1.0", "x");
    const json = JSON.parse(new TextDecoder().decode(m)) as Record<string, unknown>;
    // C4 : « grid » est désormais un type connu ; l'exemple de type inconnu devient « hologram » (même intention).
    json["kind"] = "hologram";
    const unknown = new TextEncoder().encode(JSON.stringify(json));
    expect(messageOf(() => need().core.loadFragmentParts(unknown, y))).toBe(unknownKindMessage("hologram"));
    expect(messageOf(() => need().core.loadParts(unknown, y))).toBe(unknownKindMessage("hologram"));
  });
  it("source d'une autre liaison : erreur, rien d'écrit", () => {
    const d = need().core.blank();
    const s = fakeCore.blank();
    unchanged(d, () => expect(messageOf(() => d.insertFragment(s, first(d), 0, 0))).toBe(MIXED_SOURCE_MESSAGE));
    unchanged(d, () => expect(messageOf(() => d.insertPages(s, first(d)))).toBe(MIXED_SOURCE_MESSAGE));
  });
});

describe("contrôle de forme C3", () => {
  const base = { id: "e", kind: "stroke", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 4 } };
  it("group lisible recopié, absent laissé absent", () => {
    expect(toElementView({ ...base, group: ["g1", "g2"] })).toMatchObject({ group: ["g1", "g2"] });
    expect(toElementView(base)).not.toHaveProperty("group");
  });
  it("group mal formé : erreur de forme", () => {
    for (const group of [3, [], [1], "g"]) expect(() => toElementView({ ...base, group })).toThrow("ElementView invalide");
  });
});

// C12 (PF5, PF6, PF17, PF18) : document d'un PDF, contrat commun aux deux fabriques ; mêmes refus dans le même ordre.
// Le premier cas garde D37 : le cœur construit le document hors historique (version 0, rien à annuler) ; une fausse
// liaison calquée sur SetBackdrop (une étape par page, puis historique vidé) y échouerait sur la version et le genre.
const C12_PDF = { id: "cd".repeat(32), name: "cours.pdf", mime: "application/pdf", size: 1234 };
const C12_SIZES = [{ w: 612, h: 792 }, { w: 792, h: 612 }, { w: 595, h: 842 }];
const C12_BAD_ASSET = "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)";
const C12_BAD_IMAGE = "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)";
describe.each(factories)("contrat C12 : $name", ({ f }) => {
  it("fromPdfPages : une page par taille, fond pdf-page d'indice i calé sur 1920, hauteur 1080, rien à annuler (S1)", () => {
    const d = f.fromPdfPages(C12_PDF, C12_SIZES);
    const ids = d.pageIds();
    expect(ids).toHaveLength(3);
    ids.forEach((id, i) => {
      const s = C12_SIZES[i]!;
      const p = d.page(id);
      expect([p?.width, p?.height]).toEqual([1920, 1080]);
      expect(p?.backdrop).toEqual({ asset: C12_PDF.id, kind: "pdf-page", page: i, w: s.w, h: s.h, fit: "width", rect: { x0: 0, y0: 0, x1: 1920, y1: (s.h * 1920) / s.w }, original: null });
    });
    expect(d.citedAssets()).toEqual([C12_PDF]);
    expect([d.version(), d.canUndo()]).toEqual([0, false]);
    d.undo();
    expect(d.pageIds()).toEqual(ids);
  });

  it("fromPdfPages : BadAsset d'abord, puis BadImage (0 page, 501, taille nulle, négative ou non finie) ; 500 passent (S2, PF7)", () => {
    expect(messageOf(() => f.fromPdfPages({ ...C12_PDF, id: C12_PDF.id.toUpperCase() }, []))).toBe(C12_BAD_ASSET);
    const many = (n: number) => Array.from({ length: n }, () => ({ w: 612, h: 792 }));
    for (const sizes of [[], many(501), [{ w: 612, h: 0 }], [{ w: -1, h: 792 }], [{ w: Number.NaN, h: 792 }], [{ w: 612, h: Number.POSITIVE_INFINITY }]]) {
      expect(messageOf(() => f.fromPdfPages(C12_PDF, sizes)), `${sizes.length} tailles`).toBe(C12_BAD_IMAGE);
    }
    expect(f.fromPdfPages(C12_PDF, many(500)).pageIds()).toHaveLength(500);
  });

  it("enregistré en deux moitiés puis relu : fonds, indices et asset gardés (PF17, PF18)", () => {
    const d = f.fromPdfPages(C12_PDF, C12_SIZES);
    const [manifest, ybin] = d.saveParts(now, "0.1.0");
    const back = f.loadParts(manifest, ybin);
    expect(back.pageIds().map((id) => back.page(id)?.backdrop?.page)).toEqual([0, 1, 2]);
    expect(back.citedAssets()).toEqual([C12_PDF]);
  });

  it("Insérer des pages d'un document PDF : fonds recopiés, un seul asset (Z5, S4)", () => {
    const src = f.fromPdfPages(C12_PDF, C12_SIZES);
    const d = f.blank();
    d.insertPages(src, first(d));
    expect(d.pageIds().slice(1).map((id) => [d.page(id)?.backdrop?.kind, d.page(id)?.backdrop?.page])).toEqual([
      ["pdf-page", 0],
      ["pdf-page", 1],
      ["pdf-page", 2],
    ]);
    expect(d.citedAssets().map((a) => a.id)).toEqual([C12_PDF.id]);
  });

  it("fond image (SetBackdrop) : page null (PF18)", () => {
    const d = f.blank();
    const p = first(d);
    d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: { ...C12_PDF, mime: "image/png" }, w: 1000, h: 500, fit: "width" } });
    expect(d.page(p)?.backdrop?.page).toBeNull();
  });
});

describe("contrôle de forme C12 (fond pdf-page)", () => {
  it("toPageView : page absente → null, entier gardé, chaîne → erreur", () => {
    const page = { id: "p", width: 1920, height: 1080, background: "#ffffff", grid: undefined, mode: "page" };
    const b = { asset: "a".repeat(64), kind: "pdf-page", w: 612, h: 792, fit: "width", rect: undefined };
    expect(toPageView({ ...page, backdrop: b })?.backdrop?.page).toBeNull();
    expect(toPageView({ ...page, backdrop: { ...b, page: 2 } })?.backdrop?.page).toBe(2);
    expect(() => toPageView({ ...page, backdrop: { ...b, page: "2" } })).toThrow();
  });
});

// C16 (O16 à O18) : PDF d'un fichier Office converti, contrat commun aux deux fabriques ; l'original est cité par chaque
// fond, construit d'emblée comme C12 (aucune étape), refusé comme l'asset.
const C16_DOCX = { id: "ef".repeat(32), name: "cours.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 4321 };
describe.each(factories)("contrat C16 : $name", ({ f }) => {
  const originals = (d: CoreDocument) => d.pageIds().map((id) => d.page(id)?.backdrop?.original);
  it("fromPdfPages avec original : chaque fond porte original, deux assets cités, rien à annuler (S5, O17)", () => {
    const d = f.fromPdfPages(C12_PDF, C12_SIZES, C16_DOCX);
    expect(originals(d)).toEqual([C16_DOCX.id, C16_DOCX.id, C16_DOCX.id]);
    expect(d.citedAssets()).toEqual([C12_PDF, C16_DOCX]);
    expect([d.version(), d.canUndo()]).toEqual([0, false]);
  });
  it("PDF seul : original null sur chaque fond (O18)", () => {
    expect(originals(f.fromPdfPages(C12_PDF, C12_SIZES))).toEqual([null, null, null]);
  });
  it("original non conforme : BadAsset, avant les tailles (O17)", () => {
    expect(messageOf(() => f.fromPdfPages(C12_PDF, [], { ...C16_DOCX, mime: "" }))).toBe(C12_BAD_ASSET);
  });
  it("enregistré en deux moitiés puis relu : original gardé et cité (S5)", () => {
    const [manifest, ybin] = f.fromPdfPages(C12_PDF, C12_SIZES, C16_DOCX).saveParts(now, "0.1.0");
    const back = f.loadParts(manifest, ybin);
    expect(originals(back)).toEqual([C16_DOCX.id, C16_DOCX.id, C16_DOCX.id]);
    expect(back.citedAssets()).toEqual([C12_PDF, C16_DOCX]);
  });
  it("Insérer des pages d'un document converti emporte l'original (HO2-10, Review Focus 4)", () => {
    const src = f.fromPdfPages(C12_PDF, C12_SIZES.slice(0, 1), C16_DOCX);
    const host = f.blank();
    host.insertPages(src, host.pageIds()[0]!);
    // Page hôte sans fond : `backdrop` null (le chaînage optionnel rendrait undefined, d'où la vérification à part).
    expect(host.page(host.pageIds()[0]!)?.backdrop).toBeNull();
    expect(originals(host).slice(1)).toEqual([C16_DOCX.id]);
    expect(host.citedAssets().map((a) => a.id)).toEqual([C12_PDF.id, C16_DOCX.id]);
    // La métadonnée de l'original (nom, mime, taille) suit aussi, pas seulement son empreinte.
    expect(host.citedAssets()).toEqual([C12_PDF, C16_DOCX]);
  });
});

describe("contrôle de forme C16 (original du fond)", () => {
  it("toPageView : original absent → null, chaîne gardée, nombre → erreur", () => {
    const page = { id: "p", width: 1920, height: 1080, background: "#ffffff", grid: undefined, mode: "page" };
    const b = { asset: "a".repeat(64), kind: "pdf-page", page: 0, w: 612, h: 792, fit: "width", rect: undefined };
    expect(toPageView({ ...page, backdrop: b })?.backdrop?.original).toBeNull();
    expect(toPageView({ ...page, backdrop: { ...b, original: "b".repeat(64) } })?.backdrop?.original).toBe("b".repeat(64));
    expect(() => toPageView({ ...page, backdrop: { ...b, original: 3 } })).toThrow("PageView invalide");
  });
  it("toPageView : original non conforme (chemin, majuscules) → null, le fond reste lisible (parité avec le cœur)", () => {
    const page = { id: "p", width: 1920, height: 1080, background: "#ffffff", grid: undefined, mode: "page" };
    const b = { asset: "a".repeat(64), kind: "pdf-page", page: 0, w: 612, h: 792, fit: "width", rect: undefined };
    for (const bad of ["../x", "B".repeat(64), ""]) {
      expect(toPageView({ ...page, backdrop: { ...b, original: bad } })?.backdrop?.original, bad).toBeNull();
    }
  });
  it("fausse liaison, fond chargé : original « ../x » ou 3 → null, l'asset du fond reste", () => {
    for (const bad of ["../x", 3]) {
      const backdrop = { asset: ABC, kind: "pdf-page", page: 0, w: 612, h: 792, fit: "width", original: bad };
      const bytes = new TextEncoder().encode(JSON.stringify({ now, appVersion: "1.0.0", assets: {}, pages: [{ id: "p1", background: "#ffffff", backdrop, elements: [] }] }));
      const b = fakeCore.load(bytes).page("p1")?.backdrop;
      expect(b?.original, String(bad)).toBeNull();
      expect(b?.asset).toBe(ABC);
    }
  });
});

// C14 (élément média) : contrat commun aux deux fabriques ; le média mal formé (cadre inconnu) n'est fabricable que par
// la fausse liaison (octets JSON), le vrai module le couvre côté Rust (`media.rs`, `tests/media.rs`).
const c14Factories = factories;
const WEBM = { id: ABC, name: "cours.webm", mime: "video/webm", size: 1000 } as const;
const POSTER = jpg;
const C14_MATRIX: Matrix = [1, 0, 0, 1, 100, 50];
const BAD_MATRIX_C14 = "matrice invalide (six nombres finis, inversible)";
type AddMediaCmd = Extract<Command, { type: "AddMedia" }>;
type SetMediaCmd = Extract<Command, { type: "SetMedia" }>;
const c14Add = (d: CoreDocument, page: string, over: Partial<Omit<AddMediaCmd, "type">> = {}): string => {
  const cmd: AddMediaCmd = {
    type: "AddMedia", page, asset: WEBM, linked: null, mediaType: "video", w: 320, h: 180, duration: 2.5, poster: POSTER, matrix: C14_MATRIX, ...over,
  };
  return d.apply(cmd).ids[0] ?? "";
};
const c14Media = (d: CoreDocument, id: string) => {
  const v = d.element(id);
  if (v === null || v.kind !== "media") throw new Error(`pas un média : ${JSON.stringify(v)}`);
  return v.media;
};
const NEUTRAL = { trimStart: 0, trimEnd: null, loop: false, volume: 1 } as const;

describe.each(c14Factories)("contrat C14 : $name", ({ f }) => {
  const set = (d: CoreDocument, id: string, over: Partial<Omit<SetMediaCmd, "type" | "id">> = {}) =>
    d.apply({ type: "SetMedia", id, ...NEUTRAL, ...over });

  it("AddMedia : une étape, vue aux réglages neutres, média et poster cités ; annuler retire tout (S1, M5)", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({ type: "AddMedia", page: p, asset: WEBM, linked: null, mediaType: "video", w: 320, h: 180, duration: 2.5, poster: POSTER, matrix: C14_MATRIX });
    expect(c.pages).toEqual([p]);
    expect(c.ids).toHaveLength(1);
    const a = c.ids[0] ?? "";
    expect(d.element(a)).toEqual({
      id: a,
      kind: "media",
      transform: [1, 0, 0, 1, 100, 50],
      media: { asset: ABC, mediaType: "video", w: 320, h: 180, duration: 2.5, poster: EMPTY_HASH, ...NEUTRAL },
    });
    expect(d.bounds([a])).toEqual({ x0: 100, y0: 50, x1: 420, y1: 230 });
    expect(d.citedAssets()).toEqual([WEBM, POSTER]);
    expect(d.linkedAssets()).toEqual([]);
    expect(d.canUndo()).toBe(true);
    d.undo();
    expect(d.elementIds(p)).toEqual([]);
    expect(d.citedAssets()).toEqual([]);
    expect(d.canUndo()).toBe(false);
  });

  it("AddMedia : refus sans étape (10 cas, messages exacts)", () => {
    const d = f.blank();
    const p = first(d);
    const cases: [string, Partial<Omit<AddMediaCmd, "type">>, string][] = [
      ["asset invalide", { asset: { ...WEBM, id: "ABC" } }, BAD_ASSET],
      ["poster invalide", { poster: { ...POSTER, mime: "" } }, BAD_ASSET],
      ["lien vide", { linked: "" }, BAD_MEDIA_MESSAGE],
      ["lien de 4 097 caractères", { linked: "a".repeat(4097) }, BAD_MEDIA_MESSAGE],
      ["largeur nulle", { w: 0 }, BAD_MEDIA_MESSAGE],
      ["hauteur hors f32", { h: 1e39 }, BAD_MEDIA_MESSAGE],
      ["durée NaN", { duration: Number.NaN }, BAD_MEDIA_MESSAGE],
      ["durée négative", { duration: -1 }, BAD_MEDIA_MESSAGE],
      ["matrice nulle", { matrix: [0, 0, 0, 0, 0, 0] }, BAD_MATRIX_C14],
      ["page inconnue", { page: "nope" }, "page inconnue : nope"],
    ];
    for (const [name, over, message] of cases) {
      unchanged(d, () => expect(messageOf(() => c14Add(d, p, over)), name).toBe(message));
    }
    expect(d.citedAssets()).toEqual([]);
    // 4 096 points de code (hors BMP compris) : accepté.
    expect(() => c14Add(d, p, { linked: "\u{1F600}".repeat(4096) })).not.toThrow();
  });

  it("SetMedia : une étape par réglage, neutres retirés, même état sans étape ; annuler un par un (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c14Add(d, p);
    unchanged(d, () => set(d, a));
    const steps: Partial<Omit<SetMediaCmd, "type" | "id">>[] = [
      { trimStart: 0.5 },
      { trimStart: 0.5, trimEnd: 2 },
      { trimStart: 0.5, trimEnd: 2, loop: true },
      { trimStart: 0.5, trimEnd: 2, loop: true, volume: 0.25 },
      {},
    ];
    const seen = [];
    for (const s of steps) {
      const c = set(d, a, s);
      expect(c.pages).toEqual([p]);
      expect(c.ids).toEqual([a]);
      seen.push(c14Media(d, a));
      unchanged(d, () => set(d, a, s));
    }
    expect(seen[3]).toMatchObject({ trimStart: 0.5, trimEnd: 2, loop: true, volume: 0.25 });
    expect(seen[4]).toMatchObject(NEUTRAL);
    for (let i = 3; i >= 0; i--) {
      d.undo();
      expect(c14Media(d, a)).toEqual(seen[i]);
    }
    d.undo();
    expect(c14Media(d, a)).toMatchObject(NEUTRAL);
    expect(d.canUndo()).toBe(true);
  });

  it("SetMedia : domaines contre la durée ; fin égale à la durée ; id inconnu ; image (M6)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c14Add(d, p); // 2,5 s
    const bad: [string, Partial<Omit<SetMediaCmd, "type" | "id">>][] = [
      ["début négatif", { trimStart: -1 }],
      ["début = durée", { trimStart: 2.5 }],
      ["début NaN", { trimStart: Number.NaN }],
      ["fin = début", { trimEnd: 0 }],
      ["fin au-delà de la durée", { trimEnd: 3 }],
      ["fin NaN", { trimEnd: Number.NaN }],
      ["fin = début non nul", { trimStart: 1, trimEnd: 1 }],
      ["volume > 1", { volume: 1.5 }],
      ["volume < 0", { volume: -0.1 }],
    ];
    for (const [name, s] of bad) unchanged(d, () => expect(messageOf(() => set(d, a, s)), name).toBe(BAD_MEDIA_MESSAGE));
    unchanged(d, () => set(d, a, { trimEnd: 2.5 })); // fin = durée : neutre
    expect(c14Media(d, a).trimEnd).toBeNull();
    unchanged(d, () => expect(messageOf(() => set(d, "nope"))).toBe("élément inconnu : nope"));
    const i = d.apply({ type: "AddImage", page: p, asset: png, w: 10, h: 10, matrix: I }).ids[0] ?? "";
    unchanged(d, () => expect(messageOf(() => set(d, i))).toBe(BAD_MEDIA_MESSAGE));
    const s0 = c14Add(d, p, { mediaType: "audio", duration: 0, poster: null }); // durée inconnue
    set(d, s0, { trimStart: 3, trimEnd: 9 });
    expect(c14Media(d, s0)).toMatchObject({ mediaType: "audio", duration: 0, poster: null, trimStart: 3, trimEnd: 9 });
  });

  it("enregistré puis relu : réglages, poster et lien gardés (S3)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c14Add(d, p, { linked: "/media/cours.webm" });
    set(d, a, { trimStart: 0.5, trimEnd: 2, loop: true, volume: 0.25 });
    const before = c14Media(d, a);
    const r = f.load(d.save(now, "1.0.0"));
    const q = first(r);
    expect(r.elementIds(q)).toEqual([a]);
    expect(c14Media(r, a)).toEqual(before);
    expect(r.element(a)).toEqual(d.element(a));
    expect(r.citedAssets()).toEqual([WEBM, POSTER]);
    expect(r.linkedAssets()).toEqual([{ id: ABC, path: "/media/cours.webm" }]);
  });

  it("relinkAssets : hors historique, version inchangée (M30)", () => {
    const d = f.blank();
    const p = first(d);
    c14Add(d, p, { linked: "/media/cours.webm" });
    expect(d.linkedAssets()).toEqual([{ id: ABC, path: "/media/cours.webm" }]);
    const v = d.version();
    const pages = d.pageIds();
    expect(d.relinkAssets([{ id: ABC, path: "/autre/cours.webm" }, { id: EMPTY_HASH, path: "/poster.jpg" }])).toBe(1);
    expect(d.linkedAssets()).toEqual([{ id: ABC, path: "/autre/cours.webm" }]);
    expect(d.version()).toBe(v);
    expect(d.pageIds()).toEqual(pages);
    expect(d.canUndo()).toBe(true);
    expect(d.relinkAssets([{ id: ABC, path: "/autre/cours.webm" }])).toBe(0);
    expect(d.relinkAssets([{ id: ABC, path: "" }])).toBe(0);
    expect(d.relinkAssets([{ id: "0".repeat(64), path: "/x" }])).toBe(0);
    expect(d.linkedAssets()).toEqual([{ id: ABC, path: "/autre/cours.webm" }]);
    d.undo();
    expect(d.linkedAssets()).toEqual([]);
  });

  it("copie (extract) : média inclus garde ses assets, média lié garde son lien (M32)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c14Add(d, p, { linked: "/media/cours.webm" });
    const other = c14Add(d, p, { asset: { ...WEBM, id: "1".repeat(64) }, poster: null });
    const copy = d.extract(p, [a]);
    const ids = copy.elementIds(first(copy));
    expect(ids).toHaveLength(1);
    expect(c14Media(copy, ids[0] ?? "")).toEqual(c14Media(d, a));
    expect(copy.citedAssets()).toEqual([WEBM, POSTER]);
    expect(copy.linkedAssets()).toEqual([{ id: ABC, path: "/media/cours.webm" }]);
    expect(copy.citedAssets().map((x) => x.id)).not.toContain(c14Media(d, other).asset);
  });
});

// Un média mal formé suit le repli du tableau (cadre inconnu, jamais invisible), pas celui de l'image (`malformed`,
// `element()` null). Seule la fausse liaison peut en fabriquer un à partir d'octets (JSON) ; sous le patron de l'image,
// `element()` rendrait null et `bounds` null : ce test serait rouge.
describe("contrat C14 : média mal formé = cadre inconnu (fausse liaison)", () => {
  const doc = (elements: unknown[]): Uint8Array =>
    new TextEncoder().encode(
      JSON.stringify({ now, appVersion: "1.0.0", assets: {}, pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements }] }),
    );
  it("mediaType inconnu et asset absent : vue unknown, bornes présentes, réenregistré à l'identique", () => {
    const m1 = { id: "m1", kind: "media", transform: [1, 0, 0, 1, 100, 50], media: { asset: ABC, mediaType: "hologram", w: 320, h: 180 } };
    const m2 = { id: "m2", kind: "media", transform: [1, 0, 0, 1, 0, 0], media: { mediaType: "video", w: 320, h: 180 } };
    const d = fakeCore.load(doc([m1, m2]));
    for (const id of ["m1", "m2"]) {
      expect(d.element(id)).toMatchObject({ id, kind: "unknown", unknown: { sourceKind: "media", w: 320, h: 180 } });
      expect(d.bounds([id])).not.toBeNull();
    }
    expect(d.bounds(["m1"])).toEqual({ x0: 100, y0: 50, x1: 420, y1: 230 });
    const once = d.save(now, "1.0.0");
    const twice = fakeCore.load(once).save(now, "1.0.0");
    expect(new TextDecoder().decode(twice)).toBe(new TextDecoder().decode(once));
    expect(fakeCore.load(once).element("m2")).toMatchObject({ kind: "unknown", unknown: { sourceKind: "media" } });
  });
});

describe("contrôle de forme C14 (média)", () => {
  const t = [1, 0, 0, 1, 5, 6];
  const media = { asset: ABC, mediaType: "video", w: 320, h: 180, duration: 2.5, poster: undefined, trimStart: 0, trimEnd: undefined, loop: false, volume: 1 };
  const view = (m: Record<string, unknown>) => toElementView({ id: "m1", kind: "media", transform: t, media: m });
  it("poster et trimEnd undefined (Option::None) → null ; valeurs gardées", () => {
    expect(view(media)).toEqual({ id: "m1", kind: "media", transform: t, media: { ...media, poster: null, trimEnd: null } });
    expect(view({ ...media, poster: EMPTY_HASH, trimEnd: 2 })).toMatchObject({ media: { poster: EMPTY_HASH, trimEnd: 2 } });
  });
  it("mediaType hors video/audio, loop non booléen, w ou h non finis > 0 : ElementView invalide", () => {
    for (const bad of [
      { mediaType: "hologram" }, { loop: 1 }, { w: 0 }, { w: Number.NaN }, { h: Number.POSITIVE_INFINITY }, { h: -3 },
      { asset: 3 }, { volume: "1" }, { poster: 3 }, { trimEnd: "x" }, { duration: "x" },
    ]) {
      expect(() => view({ ...media, ...bad }), JSON.stringify(bad)).toThrow("ElementView invalide");
    }
    expect(() => toElementView({ id: "m1", kind: "media", transform: t })).toThrow("ElementView invalide");
  });
});

// C5 (I4-I6, I8, S4) : réglages d'image, joués contre les deux cœurs.
const FULL: ImageParams = {
  crop: [10, 20, 300, 200],
  flipX: true,
  quarterTurns: 1,
  brightness: 30,
  contrast: -20,
  transparent: { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true },
};
const imageOf = (d: CoreDocument, id: string): ImageElement["image"] | null => {
  const el = d.element(id);
  return el?.kind === "image" ? el.image : null;
};

describe.each(factories)("contrat C5 : $name", ({ f }) => {
  const image = (d: CoreDocument, p: string): string =>
    d.apply({ type: "AddImage", page: p, asset: png, w: 640, h: 480, matrix: I }).ids[0] ?? "";

  it("C5 SetImageParams : une étape, champs relus, boîte affichée, Annuler revient à l'image brute", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    const c = d.apply({ type: "SetImageParams", id, params: FULL, matrix: [1, 0, 0, 1, 5, 6] });
    expect([c.pages, c.ids]).toEqual([[p], [id]]);
    expect(d.element(id)).toEqual({ id, kind: "image", transform: [1, 0, 0, 1, 5, 6], image: { asset: ABC, w: 640, h: 480, ...FULL } });
    expect(d.bounds([id])).toEqual({ x0: 5, y0: 6, x1: 205, y1: 306 });
    d.undo();
    expect(d.element(id)).toEqual({ id, kind: "image", transform: I, image: { asset: ABC, w: 640, h: 480 } });
    d.free();
  });

  it("C5 SetImageParams : état neutre complet = champs retirés ; même état et même matrice : aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    unchanged(d, () => d.apply({ type: "SetImageParams", id, params: { crop: [0, 0, 640, 480], flipX: false, quarterTurns: 0, brightness: 0 }, matrix: I }));
    d.apply({ type: "SetImageParams", id, params: { brightness: 10 }, matrix: I });
    unchanged(d, () => d.apply({ type: "SetImageParams", id, params: { brightness: 10 }, matrix: I }));
    // Patron écarté (objets reçus comparés tels quels) : même état, clés dans un autre ordre, aucune étape.
    const { color, tolerance, soft, contiguous } = FULL.transparent!;
    d.apply({ type: "SetImageParams", id, params: { brightness: 10, transparent: { color, tolerance, soft, contiguous } }, matrix: I });
    unchanged(d, () => d.apply({ type: "SetImageParams", id, params: { transparent: { contiguous, soft, tolerance, color }, brightness: 10 }, matrix: I }));
    expect(d.apply({ type: "SetImageParams", id, params: {}, matrix: I }).ids).toEqual([id]);
    expect(Object.keys(imageOf(d, id) ?? {}).sort()).toEqual(["asset", "h", "w"]);
    d.free();
  });

  it("C5 SetImageParams : refus sans étape, messages du contrat, réglages contrôlés avant la matrice", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    const stroke = commit(d, p, 100);
    const white = FULL.transparent!;
    const bad = [
      { crop: [600, 0, 100, 10] },
      { crop: [0, 0, 0, 10] },
      { crop: [0.5, 0, 10, 10] },
      { quarterTurns: 4 },
      { quarterTurns: 1.5 },
      { brightness: 101 },
      { contrast: -101 },
      { transparent: { ...white, color: "#FFFFFF" } },
      { transparent: { ...white, color: "white" } },
      { transparent: { ...white, tolerance: 101 } },
      { transparent: { ...white, soft: -1 } },
    ] as ImageParams[];
    const run = (target: string, params: ImageParams, matrix: Matrix = I): string =>
      messageOf(() => d.apply({ type: "SetImageParams", id: target, params, matrix }));
    unchanged(d, () => {
      for (const params of bad) expect(run(id, params), JSON.stringify(params)).toBe(BAD_IMAGE_PARAMS_MESSAGE);
      expect(run(id, { brightness: 101 }, [0, 0, 0, 0, 0, 0])).toBe(BAD_IMAGE_PARAMS_MESSAGE);
      expect(run(id, {}, [0, 0, 0, 0, 0, 0])).toBe("matrice invalide (six nombres finis, inversible)");
      expect(run("nulle-part", {})).toBe("élément inconnu : nulle-part");
      expect(run(stroke, {})).toBe(BAD_IMAGE_PARAMS_MESSAGE);
    });
    d.free();
  });

  it("C5 SetImageParams : réglage mal typé (flipX: 1) refusé comme hors domaine, dans l'ordre du cœur", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    const stroke = commit(d, p, 100);
    const white = FULL.transparent!;
    // Refusés par `normalizeParams` ; sans contrôle de type, l'adaptateur les convertirait (booléen, Float64Array, f64).
    const typos = [
      { flipX: 1 },
      { flipY: null },
      { quarterTurns: "1" },
      { brightness: "10" },
      { crop: [] },
      { crop: null },
      { crop: ["0", 0, 10, 10] },
      { transparent: { ...white, contiguous: 1 } },
      { transparent: { ...white, tolerance: "10" } },
    ] as unknown as ImageParams[];
    const run = (target: string, params: ImageParams, matrix: Matrix = I): string =>
      messageOf(() => d.apply({ type: "SetImageParams", id: target, params, matrix }));
    unchanged(d, () => {
      for (const typo of typos) expect(run(id, typo), JSON.stringify(typo)).toBe(BAD_IMAGE_PARAMS_MESSAGE);
      const typo = typos[0] ?? {};
      expect(run(id, typo, [0, 0, 0, 0, 0, 0])).toBe(BAD_IMAGE_PARAMS_MESSAGE);
      expect(run("nulle-part", typo)).toBe("élément inconnu : nulle-part");
      expect(run(stroke, typo)).toBe(BAD_IMAGE_PARAMS_MESSAGE);
    });
    d.free();
  });

  it("C5 enregistrer, rouvrir : réglages gardés (S4)", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    d.apply({ type: "SetImageParams", id, params: FULL, matrix: [2, 0, 0, 1, 5, 6] });
    const r = f.load(d.save(now, "0.1.0"));
    expect(r.element(id)).toEqual(d.element(id));
    r.free();
    d.free();
  });

  it("C5 extract et .rbitem : une image retouchée garde ses réglages (copier, coller, exporter)", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    d.apply({ type: "SetImageParams", id, params: FULL, matrix: I });
    const x = d.extract(p, [id]);
    expect(imageOf(x, x.elementIds(first(x))[0] ?? "")).toEqual(imageOf(d, id));
    const r = f.loadFragment(x.saveFragment(now, "0.1.0", "image"));
    expect(imageOf(r, r.elementIds(first(r))[0] ?? "")).toEqual(imageOf(d, id));
    for (const doc of [r, x, d]) doc.free();
  });

  it("C5 hitTest et bounds suivent la boîte affichée (I8, effet de bord 1)", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    d.apply({ type: "SetImageParams", id, params: { crop: [0, 0, 100, 50] }, matrix: I });
    expect(d.hitTest(p, 50, 25, 0)).toBe(id);
    expect(d.hitTest(p, 150, 25, 0)).toBeNull();
    expect(d.bounds([id])).toEqual({ x0: 0, y0: 0, x1: 100, y1: 50 });
    d.free();
  });
});

describe("toElementView — image (C5)", () => {
  const base = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0] };
  it("C5 réglages lus ; un champ mal typé lève ; imageParamsArgs : forme des arguments de set_image_params", () => {
    expect(toElementView({ ...base, image: { asset: ABC, w: 4, h: 2, crop: [0, 0, 2, 1], flipY: true, contrast: 5 } })).toEqual({
      id: "i",
      kind: "image",
      transform: [1, 0, 0, 1, 0, 0],
      image: { asset: ABC, w: 4, h: 2, crop: [0, 0, 2, 1], flipY: true, contrast: 5 },
    });
    for (const bad of [{ crop: [1, 2] }, { flipX: 1 }, { quarterTurns: "1" }, { transparent: { color: "#ffffff" } }]) {
      expect(() => toElementView({ ...base, image: { asset: ABC, w: 4, h: 2, ...bad } })).toThrow("ElementView invalide");
    }
    const [crop, fx, fy, q, b, c, color, t] = imageParamsArgs(FULL);
    expect([Array.from(crop), fx, fy, q, b, c, color, Array.from(t)]).toEqual([[10, 20, 300, 200], true, false, 1, 30, -20, "#ffffff", [10, 0, 1]]);
    const [crop0, , , , , , color0, t0] = imageParamsArgs({});
    expect([crop0.length, color0, t0.length]).toEqual([0, undefined, 0]);
  });
});

// C15 (élément model3d) : contrat commun aux deux fabriques ; l'objet 3D mal formé (cadre inconnu) n'est fabricable que
// par la fausse liaison (octets JSON), le vrai module le couvre côté Rust (`model3d.rs`, `tests/model3d.rs`).
const GLB = { id: ABC, name: "chaise.glb", mime: "model/gltf-binary", size: 3000 } as const;
const SNAP = { id: EMPTY_HASH, name: "vue.png", mime: "image/png", size: 0 } as const;
const SNAP2 = { id: "e".repeat(64), name: "vue-2.png", mime: "image/png", size: 210 } as const;
const TEX = { id: "c".repeat(64), name: "bois.png", mime: "image/png", size: 50 } as const;
const BIN = { id: "d".repeat(64), name: "chaise.bin", mime: "application/octet-stream", size: 80 } as const;
const C15_FILES = [
  { path: "tex/bois.png", asset: TEX },
  { path: "chaise.bin", asset: BIN },
] as const;
const C15_MATRIX: Matrix = [1, 0, 0, 1, 100, 50];
const C15_BOX = { x0: 100, y0: 50, x1: 740, y1: 530 };
type AddModel3dCmd = Extract<Command, { type: "AddModel3d" }>;
const c15Add = (d: CoreDocument, page: string, over: Partial<Omit<AddModel3dCmd, "type">> = {}): string => {
  const cmd: AddModel3dCmd = {
    type: "AddModel3d", page, asset: GLB, format: "glb", files: C15_FILES, w: 640, h: 480,
    yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH, snapshot: SNAP, matrix: C15_MATRIX, ...over,
  };
  return d.apply(cmd).ids[0] ?? "";
};
const c15View = (d: CoreDocument, id: string, yaw: number, pitch: number, snapshot: AssetRef | null) =>
  d.apply({ type: "SetModel3dView", id, yaw, pitch, snapshot });
const c15Model = (d: CoreDocument, id: string) => {
  const v = d.element(id);
  if (v === null || v.kind !== "model3d") throw new Error(`pas un objet 3D : ${JSON.stringify(v)}`);
  return v.model3d;
};
const c15Camera = (d: CoreDocument, id: string) => {
  const m = c15Model(d, id);
  return [m.yaw, m.pitch, m.snapshot];
};

describe.each(factories)("contrat C15 : $name", ({ f }) => {
  it("AddModel3d : une étape, vue aux défauts, principal, liés et instantané cités ; annuler retire tout (S1, X7)", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({
      type: "AddModel3d", page: p, asset: GLB, format: "glb", files: C15_FILES, w: 640, h: 480,
      yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH, snapshot: SNAP, matrix: C15_MATRIX,
    });
    expect(c.pages).toEqual([p]);
    expect(c.ids).toHaveLength(1);
    const a = c.ids[0] ?? "";
    expect(d.element(a)).toEqual({
      id: a,
      kind: "model3d",
      transform: [1, 0, 0, 1, 100, 50],
      model3d: {
        asset: ABC, format: "glb", w: 640, h: 480,
        files: [{ path: "tex/bois.png", asset: TEX.id }, { path: "chaise.bin", asset: BIN.id }],
        yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH, snapshot: EMPTY_HASH,
      },
    });
    expect(d.bounds([a])).toEqual(C15_BOX);
    expect(d.hitTest(p, 420, 290, 0)).toBe(a);
    expect(d.hitTest(p, 800, 600, 0)).toBeNull();
    expect(d.citedAssets()).toEqual([GLB, TEX, BIN, SNAP]);
    expect(d.canUndo()).toBe(true);
    d.undo();
    expect(d.elementIds(p)).toEqual([]);
    expect(d.citedAssets()).toEqual([]);
    expect(d.canUndo()).toBe(false);
    // Sans liés ni instantané : `files` vide, `snapshot` null.
    const b = c15Add(d, p, { files: [], snapshot: null, format: "stl" });
    expect(c15Model(d, b)).toMatchObject({ format: "stl", files: [], snapshot: null });
    expect(d.citedAssets()).toEqual([GLB]);
  });

  it("AddModel3d : refus sans étape (X8)", () => {
    const d = f.blank();
    const p = first(d);
    const path = (s: string) => ({ files: [{ path: s, asset: TEX }, { path: "chaise.bin", asset: BIN }] });
    const many = Array.from({ length: MAX_MODEL3D_FILES + 1 }, (_, i) => ({ path: `f${i}.bin`, asset: BIN }));
    const cases: [string, Partial<Omit<AddModel3dCmd, "type">>, string][] = [
      ["asset invalide", { asset: { ...GLB, id: "ABC" } }, BAD_ASSET],
      ["lié invalide", { files: [{ path: "tex/bois.png", asset: TEX }, { path: "chaise.bin", asset: { ...BIN, mime: "" } }] }, BAD_ASSET],
      ["instantané invalide", { snapshot: { ...SNAP, mime: "" } }, BAD_ASSET],
      ["largeur nulle", { w: 0 }, BAD_MODEL3D_MESSAGE],
      ["hauteur hors f32", { h: 1e39 }, BAD_MODEL3D_MESSAGE],
      ["yaw NaN", { yaw: Number.NaN }, BAD_MODEL3D_MESSAGE],
      ["yaw = −π", { yaw: -Math.PI }, BAD_MODEL3D_MESSAGE],
      ["pitch 1,5", { pitch: 1.5 }, BAD_MODEL3D_MESSAGE],
      ["chemin vide", path(""), BAD_MODEL3D_MESSAGE],
      ["chemin ../", path("../a.png"), BAD_MODEL3D_MESSAGE],
      ["chemin à barre inverse", path("a\\b.png"), BAD_MODEL3D_MESSAGE],
      ["chemin à lecteur", path("c:/a.png"), BAD_MODEL3D_MESSAGE],
      ["chemin en double", path("chaise.bin"), BAD_MODEL3D_MESSAGE],
      ["257 fichiers liés", { files: many }, BAD_MODEL3D_MESSAGE],
      ["matrice nulle", { matrix: [0, 0, 0, 0, 0, 0] }, BAD_MATRIX_C14],
      ["page inconnue", { page: "nope" }, "page inconnue : nope"],
      ["chemin de 1 025 caractères", path("a".repeat(MAX_MODEL3D_PATH + 1)), BAD_MODEL3D_MESSAGE],
      ["segment vide", path("tex//a.png"), BAD_MODEL3D_MESSAGE],
      ["chemin absolu", path("/a.png"), BAD_MODEL3D_MESSAGE],
      ["segment .", path("./a.png"), BAD_MODEL3D_MESSAGE],
      // Ordre des refus : l'asset avant l'objet, l'objet avant la matrice, la matrice avant la page.
      ["ordre asset", { asset: { ...GLB, id: "ABC" }, w: 0, matrix: [0, 0, 0, 0, 0, 0], page: "nope" }, BAD_ASSET],
      ["ordre objet", { w: 0, matrix: [0, 0, 0, 0, 0, 0], page: "nope" }, BAD_MODEL3D_MESSAGE],
      ["ordre matrice", { matrix: [0, 0, 0, 0, 0, 0], page: "nope" }, BAD_MATRIX_C14],
    ];
    for (const [name, over, message] of cases) {
      unchanged(d, () => expect(messageOf(() => c15Add(d, p, over)), name).toBe(message));
    }
    expect(d.citedAssets()).toEqual([]);
    // Bornes acceptées : 1 024 points de code (hors BMP compris), 256 fichiers, yaw = π, pitch = ±85°.
    expect(() => c15Add(d, p, path("\u{1F600}".repeat(MAX_MODEL3D_PATH)))).not.toThrow();
    expect(() => c15Add(d, p, { files: many.slice(0, MAX_MODEL3D_FILES) })).not.toThrow();
    expect(() => c15Add(d, p, { yaw: Math.PI, pitch: -MODEL3D_PITCH_LIMIT })).not.toThrow();
  });

  it("SetModel3dView : une étape par vue validée, défauts retirés, même état sans étape ; annuler rend vue et instantané (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c15Add(d, p, { snapshot: null });
    const initial = d.element(a);
    expect(c15Camera(d, a)).toEqual([DEFAULT_MODEL3D_YAW, DEFAULT_MODEL3D_PITCH, null]);
    unchanged(d, () => c15View(d, a, DEFAULT_MODEL3D_YAW, DEFAULT_MODEL3D_PITCH, null));
    const steps: [number, number, AssetRef | null][] = [
      [1, 0.5, SNAP],
      [-1, 0.2, SNAP2],
      [DEFAULT_MODEL3D_YAW, DEFAULT_MODEL3D_PITCH, null],
    ];
    const seen = [];
    for (const [yaw, pitch, snap] of steps) {
      const c = c15View(d, a, yaw, pitch, snap);
      expect(c.pages).toEqual([p]);
      expect(c.ids).toEqual([a]);
      expect(c15Camera(d, a)).toEqual([yaw, pitch, snap?.id ?? null]);
      seen.push(d.element(a));
      unchanged(d, () => c15View(d, a, yaw, pitch, snap));
    }
    expect(d.citedAssets().map((x) => x.id)).not.toContain(SNAP.id);
    expect(d.element(a)).toEqual(initial);
    d.undo();
    expect(d.element(a)).toEqual(seen[1]);
    expect(d.citedAssets()).toContainEqual(SNAP2);
    d.undo();
    expect(d.element(a)).toEqual(seen[0]);
    expect(d.citedAssets()).toContainEqual(SNAP);
    d.undo();
    expect(d.element(a)).toEqual(initial);
    expect(d.canUndo()).toBe(true);
  });

  it("SetModel3dView : id inconnu, image, vue hors domaine (X8)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c15Add(d, p, { snapshot: null });
    const i = d.apply({ type: "AddImage", page: p, asset: png, w: 10, h: 10, matrix: I }).ids[0] ?? "";
    const bad = { ...SNAP, id: "ABC" };
    unchanged(d, () => {
      expect(messageOf(() => c15View(d, "nope", 1, 0.5, null))).toBe("élément inconnu : nope");
      expect(messageOf(() => c15View(d, i, 1, 0.5, bad)), "une image avant l'asset").toBe(BAD_MODEL3D_MESSAGE);
      expect(messageOf(() => c15View(d, a, 1, 2, bad)), "l'asset avant la vue").toBe(BAD_ASSET);
      for (const [yaw, pitch] of [[1, 2], [-Math.PI, 0], [Number.NaN, 0], [0, Number.POSITIVE_INFINITY], [4, 0]] as const) {
        expect(messageOf(() => c15View(d, a, yaw, pitch, null)), `${yaw} ${pitch}`).toBe(BAD_MODEL3D_MESSAGE);
      }
    });
    c15View(d, a, Math.PI, MODEL3D_PITCH_LIMIT, null);
    expect(c15Camera(d, a)).toEqual([Math.PI, MODEL3D_PITCH_LIMIT, null]);
  });

  it("enregistré puis relu : vue, fichiers liés et instantané gardés (S4)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c15Add(d, p, { snapshot: null, format: "gltf" });
    c15View(d, a, 1, -0.5, SNAP);
    const r = f.load(d.save(now, "1.0.0"));
    expect(r.elementIds(first(r))).toEqual([a]);
    expect(r.element(a)).toEqual(d.element(a));
    expect(c15Model(r, a)).toMatchObject({ format: "gltf", yaw: 1, pitch: -0.5, snapshot: EMPTY_HASH });
    expect(c15Model(r, a).files.map((x) => x.path)).toEqual(["tex/bois.png", "chaise.bin"]);
    expect(r.citedAssets()).toEqual([GLB, TEX, BIN, SNAP]);
    expect(r.citedAssets()).toEqual(d.citedAssets());
  });

  it("copie (extract) : objet 3D à fichiers liés garde ses assets (X31)", () => {
    const d = f.blank();
    const p = first(d);
    const a = c15Add(d, p);
    const other = c15Add(d, p, { asset: { ...GLB, id: "1".repeat(64) }, files: [], snapshot: null });
    const copy = d.extract(p, [a]);
    const ids = copy.elementIds(first(copy));
    expect(ids).toHaveLength(1);
    expect(c15Model(copy, ids[0] ?? "")).toEqual(c15Model(d, a));
    expect(copy.citedAssets()).toEqual([GLB, TEX, BIN, SNAP]);
    expect(copy.citedAssets().map((x) => x.id)).not.toContain(c15Model(d, other).asset);
  });
});

// Un objet 3D mal formé suit le repli du média (cadre inconnu, brut gardé), pas celui de l'image (`malformed`,
// `element()` null). Seule la fausse liaison peut en fabriquer un à partir d'octets (JSON) ; sous le patron de l'image,
// `element()` rendrait null, `bounds` et `hitTest` null : ce test serait rouge.
describe("contrat C15 : model3d mal formé = cadre inconnu (fausse liaison)", () => {
  const doc = (elements: unknown[]): Uint8Array =>
    new TextEncoder().encode(
      JSON.stringify({ now, appVersion: "1.0.0", assets: {}, pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements }] }),
    );
  it("model3d mal formé : cadre inconnu, brut gardé (X33)", () => {
    const files = [{ path: "tex/bois.png", asset: TEX.id }];
    const m1 = { id: "m1", kind: "model3d", transform: [1, 0, 0, 1, 100, 50], model3d: { asset: ABC, format: "fbx", w: 640, h: 480, files, yaw: 0.5 } };
    const m2 = { id: "m2", kind: "model3d", transform: [1, 0, 0, 1, 1000, 50], model3d: { format: "glb", w: 640, h: 480, snapshot: EMPTY_HASH } };
    const d = fakeCore.load(doc([m1, m2]));
    for (const id of ["m1", "m2"]) {
      expect(d.element(id)).toMatchObject({ id, kind: "unknown", unknown: { sourceKind: "model3d", w: 640, h: 480 } });
      expect(d.bounds([id])).not.toBeNull();
    }
    expect(d.bounds(["m1"])).toEqual(C15_BOX);
    expect(d.hitTest("p1", 420, 290, 0)).toBe("m1");
    expect(d.hitTest("p1", 1320, 290, 0)).toBe("m2");
    expect(d.citedAssets().map((x) => x.id)).toEqual([ABC, TEX.id, EMPTY_HASH]);
    const once = d.save(now, "1.0.0");
    const text = new TextDecoder().decode(once);
    expect(text).toContain('"format":"fbx"');
    expect(text).toContain('"path":"tex/bois.png"');
    const twice = fakeCore.load(once).save(now, "1.0.0");
    expect(new TextDecoder().decode(twice)).toBe(text);
    expect(fakeCore.load(once).element("m2")).toMatchObject({ kind: "unknown", unknown: { sourceKind: "model3d" } });
  });
  it("model3d lisible relu de JSON : facultatifs illisibles = défauts, entrées de files illisibles ignorées (X8)", () => {
    const files = [{ path: "tex/bois.png", asset: TEX.id }, { path: "b.bin" }, { path: "tex/bois.png", asset: BIN.id }, 3, { path: "../x", asset: BIN.id }];
    const m = { id: "m", kind: "model3d", transform: [1, 0, 0, 1, 0, 0], model3d: { asset: ABC, format: "ply", w: 64, h: 48, files, yaw: "x", pitch: 9, snapshot: "x" } };
    const d = fakeCore.load(doc([m]));
    expect(d.element("m")).toEqual({
      id: "m", kind: "model3d", transform: [1, 0, 0, 1, 0, 0],
      model3d: { asset: ABC, format: "ply", w: 64, h: 48, files: [{ path: "tex/bois.png", asset: TEX.id }], yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH, snapshot: null },
    });
  });
});

describe("contrôle de forme C15 (objet 3D)", () => {
  const t = [1, 0, 0, 1, 5, 6];
  const model3d = { asset: ABC, format: "obj", w: 640, h: 480, files: [{ path: "a.mtl", asset: TEX.id }], yaw: 0.5, pitch: 0.25, snapshot: undefined };
  const view = (m: Record<string, unknown>) => toElementView({ id: "o1", kind: "model3d", transform: t, model3d: m });
  it("snapshot undefined (Option::None) → null ; valeurs gardées", () => {
    expect(view(model3d)).toEqual({ id: "o1", kind: "model3d", transform: t, model3d: { ...model3d, snapshot: null } });
    expect(view({ ...model3d, snapshot: EMPTY_HASH })).toMatchObject({ model3d: { snapshot: EMPTY_HASH } });
  });
  it("format hors liste, w ou h non finis > 0, yaw ou pitch non finis, files mal formé : ElementView invalide", () => {
    for (const bad of [
      { format: "fbx" }, { w: 0 }, { h: Number.POSITIVE_INFINITY }, { yaw: Number.NaN }, { pitch: "1" },
      { files: 3 }, { files: [{ path: "a" }] }, { files: [{ path: 1, asset: TEX.id }] }, { asset: 3 }, { snapshot: 3 },
    ]) {
      expect(() => view({ ...model3d, ...bad }), JSON.stringify(bad)).toThrow("ElementView invalide");
    }
    expect(() => toElementView({ id: "o1", kind: "model3d", transform: t })).toThrow("ElementView invalide");
  });
});

// C6b (B2-B4, B11, B12, S2) : pot sur image et « Rétablir l'original », joués contre les deux cœurs.
const NEXT = { id: "cd".repeat(32), name: "photo.png", mime: "image/png", size: 9 } as const;
const LAST = { id: "ef".repeat(32), name: "photo.png", mime: "image/png", size: 7 } as const;
/** Géométrie de `FULL` (rognage, retournement, quart de tour) : ce qu'un remplissage garde (B4). */
const GEOMETRY: ImageParams = { crop: [10, 20, 300, 200], flipX: true, quarterTurns: 1 };

describe.each(factories)("contrat C6b : $name", ({ f }) => {
  const retouched = (d: CoreDocument, p: string): string => {
    const id = d.apply({ type: "AddImage", page: p, asset: png, w: 640, h: 480, matrix: I }).ids[0] ?? "";
    d.apply({ type: "SetImageParams", id, params: FULL, matrix: I });
    return id;
  };
  const fill = (p: string, id: string, asset: AssetRef, color: string | null = "#facc15"): Command => ({ type: "Fill", page: p, target: { kind: "image", id, asset }, color });

  it("Fill image : une étape ; nouvel asset, sourceAsset, géométrie gardée, pixels retirés ; Annuler rend tout", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    const c = d.apply(fill(p, id, NEXT));
    expect([c.pages, c.ids]).toEqual([[p], [id]]);
    expect(imageOf(d, id)).toEqual({ asset: NEXT.id, w: 640, h: 480, sourceAsset: ABC, ...GEOMETRY });
    expect(d.asset(NEXT.id)).toEqual(NEXT);
    d.undo();
    expect(imageOf(d, id)).toEqual({ asset: ABC, w: 640, h: 480, ...FULL });
    d.free();
  });

  it("second remplissage : sourceAsset gardé ; rognage ensuite : sourceAsset gardé ; restore : l'original sans aucun champ, une étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    d.apply(fill(p, id, NEXT));
    d.apply(fill(p, id, LAST, null));
    expect(imageOf(d, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC });
    d.apply({ type: "SetImageParams", id, params: { ...GEOMETRY, flipY: true }, matrix: I });
    expect(imageOf(d, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC, flipY: true });
    const c = d.apply({ type: "SetImageParams", id, params: {}, matrix: I, restore: true });
    expect(c.ids).toEqual([id]);
    expect(imageOf(d, id)).toEqual({ asset: ABC, w: 640, h: 480 });
    d.undo();
    expect(imageOf(d, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC });
    d.free();
  });

  it("restore sans sourceAsset : comportement de C5 ; image brute : aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    d.apply({ type: "SetImageParams", id, params: {}, matrix: I, restore: true });
    expect(imageOf(d, id)).toEqual({ asset: ABC, w: 640, h: 480 });
    unchanged(d, () => d.apply({ type: "SetImageParams", id, params: {}, matrix: I, restore: true }));
    d.free();
  });

  it("même asset : aucune étape ; refus dans l'ordre du cœur, sans étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    const stroke = commit(d, p, 100);
    d.apply({ type: "AddPage", after: p });
    const p2 = d.pageIds().find((x) => x !== p) ?? "";
    unchanged(d, () => d.apply(fill(p, id, png)));
    const bad = { ...NEXT, id: "x" };
    const run = (cmd: Command): string => messageOf(() => d.apply(cmd));
    unchanged(d, () => {
      expect(run(fill("nope", id, NEXT, "#12"))).toBe(BAD_FILL);
      expect(run(fill("nope", id, NEXT, null))).toBe("page inconnue : nope");
      expect(run(fill(p, "nope", NEXT, null))).toBe("élément inconnu : nope");
      expect(run(fill(p2, id, NEXT, null))).toBe(`élément inconnu : ${id}`);
      expect(run(fill(p, stroke, bad, null))).toBe(BAD_FILL);
      expect(run(fill(p, id, bad, null))).toBe(BAD_ASSET);
    });
    d.free();
  });

  it("enregistré puis relu : sourceAsset gardé ; cités : original et version courante ; métadonnée intermédiaire gardée", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    d.apply(fill(p, id, NEXT));
    d.apply(fill(p, id, LAST, null));
    expect(d.citedAssets().map((a) => a.id)).toEqual([ABC, LAST.id].sort());
    const r = f.load(d.save("2026-11-21T00:00:00Z", "0.1.0"));
    expect(imageOf(r, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC });
    expect(r.citedAssets().map((a) => a.id)).toEqual([ABC, LAST.id].sort());
    expect(r.asset(NEXT.id)).toEqual(NEXT);
    r.free();
    d.free();
  });
});

// Parité C6b (OE43, reste d'OD91) : champs bruts illisibles d'un fichier chargé. Le cœur garde chaque champ brut
// (`image.rs`) : un remplissage retire les seuls champs cuits (`BAKED`) et garde la géométrie brute ; « Rétablir
// l'original » retire un `sourceAsset` illisible en une étape. Mêmes commandes sur `image-c6b-brut.roomboard` (vrai
// module) et `image-c6b-brut.fake.json` (fausse liaison) ; vues, étapes et versions comparées à chaque temps.
describe.skipIf(loaded === null)("parité C6b : champs bruts d'un fichier chargé", () => {
  const fixtureOf = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));
  const both = (): { real: CoreDocument; fake: CoreDocument } => ({
    real: need().core.load(fixtureOf("../../../../crates/roomboard-core/tests/fixtures/image-c6b-brut.roomboard")),
    fake: fakeCore.load(fixtureOf("./fixtures/image-c6b-brut.fake.json")),
  });
  const reload = (f: CoreFactory, d: CoreDocument): CoreDocument => {
    const r = f.load(d.save(now, "0.1.0"));
    d.free();
    return r;
  };
  /** Ce qu'un écran voit et ce que l'annulation garde : vues des trois images, pouvoir annuler, version avancée ou non. */
  const state = (d: CoreDocument, run: () => Change | undefined): unknown => {
    const v = d.version();
    const c = run();
    const change = c === undefined ? null : { pages: c.pages, ids: c.ids, removed: c.removed, full: c.full };
    return { views: ["i1", "i2", "i3", "i4"].map((id) => d.element(id)), undo: d.canUndo(), step: d.version() !== v, change };
  };
  const same = (id: string, restore = false): Command => ({ type: "SetImageParams", id, params: { quarterTurns: 1 }, matrix: I, restore });
  const fill = (id: string): Command => ({ type: "Fill", page: "p1", target: { kind: "image", id, asset: NEXT }, color: null });

  /** Une suite de temps (commande, annuler, rétablir, relire) jouée sur les deux cœurs, comparée temps par temps. */
  const play = (steps: readonly (Command | "undo" | "redo" | "reload")[]): void => {
    let { real, fake } = both();
    expect(state(fake, () => undefined)).toEqual(state(real, () => undefined));
    for (const [k, s] of steps.entries()) {
      if (s === "reload") {
        real = reload(need().core, real);
        fake = reload(fakeCore, fake);
        expect(state(fake, () => undefined), `temps ${k} : ${s}`).toEqual(state(real, () => undefined));
        continue;
      }
      const run = (d: CoreDocument) => (): Change => (s === "undo" ? d.undo() : s === "redo" ? d.redo() : d.apply(s));
      expect(state(fake, run(fake)), `temps ${k} : ${JSON.stringify(s)}`).toEqual(state(real, run(real)));
    }
    real.free();
    fake.free();
  };

  it("chargé : les champs illisibles ou neutres sont lus absents, les mêmes vues des deux côtés", () => {
    const { real, fake } = both();
    expect(real.element("i1")).toEqual({ id: "i1", kind: "image", transform: I, image: { asset: ABC, w: 640, h: 480, quarterTurns: 1 } });
    for (const id of ["i1", "i2", "i3", "i4"]) expect(fake.element(id)).toEqual(real.element(id));
    real.free();
    fake.free();
  });

  it("réglages inchangés sur un fichier chargé : une étape qui retire les champs bruts, puis aucune", () => {
    play([same("i1"), same("i1"), same("i2"), "undo", "reload", same("i2"), same("i2")]);
  });

  it("remplissage : pixels bruts retirés (aucune étape ensuite), géométrie brute gardée (une étape ensuite), annulé, relu", () => {
    play([fill("i1"), same("i1"), fill("i2"), "undo", same("i2"), "undo", "redo", "reload", same("i2"), same("i2"), "undo", "reload", same("i2")]);
    play([fill("i4"), same("i4"), "undo", "undo", same("i4"), same("i4"), "reload", same("i4", true)]);
  });

  it("Rétablir l'original : sourceAsset illisible retiré en une étape, gardé par un fichier relu, remplacé au premier remplissage", () => {
    play([same("i3", true), same("i3", true), "undo", "reload", same("i3", true), "undo", fill("i3"), "reload", same("i3", true)]);
  });
});

describe("contrôle de forme C6b (sourceAsset)", () => {
  const t = [1, 0, 0, 1, 0, 0];
  it("sourceAsset chaîne gardé ; absent : absent ; autre type : ElementView invalide", () => {
    expect(toElementView({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1, sourceAsset: EMPTY_HASH } })).toEqual({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1, sourceAsset: EMPTY_HASH } });
    expect(toElementView({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1 } })).toEqual({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1 } });
    expect(() => toElementView({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1, sourceAsset: 3 } })).toThrow("ElementView invalide");
  });
});

describe("contrôle de forme C8 (fill)", () => {
  const t = [1, 0, 0, 1, 100, 100];
  it("fill : couleur et boîte gardées ; couleur absente ou boîte ≤ 0 : ElementView invalide", () => {
    expect(toElementView({ id: "f", kind: "fill", transform: t, fill: { color: "#facc15", w: 4, h: 3 } })).toEqual({ id: "f", kind: "fill", transform: t, fill: { color: "#facc15", w: 4, h: 3 } });
    expect(() => toElementView({ id: "f", kind: "fill", transform: t })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "f", kind: "fill", transform: t, fill: { color: 3, w: 4, h: 3 } })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "f", kind: "fill", transform: t, fill: { color: "#facc15", w: 0, h: 3 } })).toThrow("ElementView invalide");
  });

  it("Fill zone : fill_zone(page, x, y, tol, couleur ou undefined) ; fillRings, zoneCells relayés", () => {
    const calls: unknown[][] = [];
    const ok = { pages: ["p1"], ids: [], removed: [], full: false, version: 1 };
    const doc = {
      fill_zone: (...a: unknown[]) => (calls.push(["fill_zone", ...a]), ok),
      fill_rings: (id: string) => (calls.push(["fill_rings", id]), undefined),
      zone_cells: (...a: unknown[]) => (calls.push(["zone_cells", ...a]), 7),
    };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    d.apply({ type: "Fill", page: "p1", target: { kind: "zone", x: 1, y: 2, tol: 3 }, color: null });
    d.apply({ type: "Fill", page: "p1", target: { kind: "zone", x: 1, y: 2, tol: 3 }, color: "#facc15" });
    expect(d.fillRings("f")).toBeNull();
    expect(d.zoneCells("p1", 2)).toBe(7);
    expect(calls).toEqual([
      ["fill_zone", "p1", 1, 2, 3, undefined],
      ["fill_zone", "p1", 1, 2, 3, "#facc15"],
      ["fill_rings", "f"],
      ["zone_cells", "p1", 2],
    ]);
  });
});

const c8Factories = factories;
describe.each(c8Factories)("contrat C8 : $name", ({ f }) => {
  it("C8 : page vide : Fill zone = fond, une étape ; même couleur : aucune étape ; tol ≤ 0 : refus (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 300, y: 300, tol: 2 }, color: "#1d4ed8" });
    expect([c.pages, c.ids]).toEqual([[p], []]);
    expect(bg(d, p)).toBe("#1d4ed8");
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 300, y: 300, tol: 2 }, color: "#1d4ed8" }));
    expect(messageOf(() => d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 300, y: 300, tol: 0 }, color: "#1d4ed8" }))).toBe(BAD_FILL);
    expect(d.zoneCells(p, 2)).toBe(0);
    d.free();
  });
});

// C8 (S1, S2, S3, S5) : zone fermée, jouée par le vrai module seulement (second écart D36 : la fausse liaison traite
// `Fill { kind: "zone" }` comme le fond).
const square = (d: CoreDocument, p: string): void => {
  const side = (x0: number, y0: number, x1: number, y1: number): void => {
    const pts: number[] = [];
    for (let i = 0; i <= 40; i++) pts.push(x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * i) / 40, 0.5);
    d.apply({ type: "CommitStroke", page: p, points: new Float32Array(pts), style: { color: "#000000", width: 4 } });
  };
  side(100, 100, 500, 100);
  side(500, 100, 500, 500);
  side(500, 500, 100, 500);
  side(100, 500, 100, 100);
};
const zoneAt = (p: string, x: number, y: number, color: string | null): Command => ({ type: "Fill", page: p, target: { kind: "zone", x, y, tol: 2 }, color });

describe.skipIf(loaded === null)("contrat C8 : vrai module seulement", () => {
  it("zone fermée par quatre traits : un fill en haut de la page, une étape, anneaux relus à l'identique (S1, S3)", () => {
    const d = need().core.blank();
    const p = first(d);
    square(d, p);
    expect(d.zoneCells(p, 2)).toBeGreaterThan(160_000);
    const c = d.apply(zoneAt(p, 300, 300, "#facc15"));
    const id = c.ids[0] ?? "";
    expect(c.ids).toHaveLength(1);
    expect(d.elementIds(p).slice(-1)).toEqual([id]);
    expect(d.element(id)).toMatchObject({ kind: "fill", fill: { color: "#facc15" } });
    const rings = d.fillRings(id);
    expect(rings?.[0]).toBeGreaterThanOrEqual(4);
    d.undo();
    expect(d.elementIds(p)).toHaveLength(4);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(5);
    const r = need().core.load(d.save(now, "0.1.0"));
    expect(r.element(id)).toEqual(d.element(id));
    expect(r.fillRings(id)).toEqual(rings);
    r.free();
    d.free();
  });

  it("pot sur le fill : recoloré en une étape, « Aucune » sans étape ; près du bord : le trait (S5)", () => {
    const d = need().core.blank();
    const p = first(d);
    square(d, p);
    const id = d.apply(zoneAt(p, 300, 300, "#facc15")).ids[0] ?? "";
    expect(d.hitTest(p, 300, 300, 6)).toBe(id);
    const edge = d.hitTest(p, 300, 103, 6);
    expect(edge).not.toBe(id);
    expect(d.element(edge ?? "")?.kind).toBe("stroke");
    const c = d.apply({ type: "Fill", page: p, target: { kind: "inside", id }, color: "#dc2626" });
    expect(c.ids).toEqual([id]);
    expect(d.element(id)).toMatchObject({ fill: { color: "#dc2626" } });
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "inside", id }, color: null }));
    d.free();
  });

  it("zone ouverte ou page vide : le fond change, aucun fill, une étape (S2)", () => {
    const d = need().core.blank();
    const p = first(d);
    square(d, p);
    d.apply(zoneAt(p, 900, 900, "#16a34a"));
    expect(bg(d, p)).toBe("#16a34a");
    expect(d.elementIds(p)).toHaveLength(4);
    expect(messageOf(() => d.apply(zoneAt(p, 300, 300, "#12")))).toBe(BAD_FILL);
    d.free();
  });
});

// OE23 (Q7) : ids d'une page filtrés par le champ `kind` brut, dans l'ordre de la page, sans vue ; page inconnue : [].
describe.each(factories)("contrat elementIdsOfKind : $name", ({ f }) => {
  it("OE23 : ids d'un kind dans l'ordre de la page ; kind absent et page inconnue : [] ; rien d'écrit", () => {
    const d = f.blank();
    const p = first(d);
    const s1 = commit(d, p, 100);
    const t1 = d.apply({ type: "AddTable", page: p, x: 100, y: 200, cols: 2, rows: 1, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const s2 = commit(d, p, 400);
    unchanged(d, () => {
      expect(d.elementIdsOfKind(p, "stroke")).toEqual([s1, s2]);
      expect(d.elementIdsOfKind(p, "table")).toEqual([t1]);
      expect(d.elementIdsOfKind(p, "fill")).toEqual([]);
      expect(d.elementIdsOfKind("page-inconnue", "stroke")).toEqual([]);
    });
    d.free();
  });

  it("OE23 : même liste qu'elementIds filtrée par la vue, pour chaque kind connu de la page", () => {
    const d = f.blank();
    const p = first(d);
    commit(d, p, 100);
    d.apply({ type: "AddTable", page: p, x: 100, y: 200, cols: 2, rows: 1, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 });
    commit(d, p, 400);
    for (const kind of ["stroke", "table"]) {
      expect(d.elementIdsOfKind(p, kind)).toEqual(d.elementIds(p).filter((id) => d.element(id)?.kind === kind));
    }
    d.free();
  });
});

describe.skipIf(loaded === null)("contrat elementIdsOfKind : kind brut, vrai module et fausse liaison", () => {
  const bytesOf = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));
  it("OE23 (H4, K8) : un élément de kind inconnu est listé sous son kind brut, jamais sous « unknown »", () => {
    const real = need().core.load(bytesOf("../../../../crates/roomboard-core/tests/fixtures/element-inconnu.roomboard"));
    const fake = fakeCore.load(bytesOf("./fixtures/element-inconnu.fake.json"));
    for (const d of [real, fake]) {
      expect(d.elementIdsOfKind("p1", "hologram")).toEqual(["h1", "h2"]);
      expect(d.elementIdsOfKind("p1", "unknown")).toEqual([]);
      expect(d.element("h1")?.kind).toBe("unknown");
    }
    real.free();
    fake.free();
  });
});

// Un tableau ou un `fill` mal formé ne se fabrique, côté page, que par la fausse liaison (JSON) ; côté cœur, le test Rust
// `element_ids_of_kind_reads_raw_kind_in_page_order` couvre le tableau mal formé et l'élément sans id. L'élément sans id
// (K8) est aussi exercé ici, sur la fausse liaison : il ne figure pas, même quand son kind brut correspond.
describe("contrat elementIdsOfKind : tableau et fill mal formés, élément sans id (fausse liaison)", () => {
  const doc = (elements: unknown[]): Uint8Array =>
    new TextEncoder().encode(
      JSON.stringify({ now, appVersion: "1.0.0", assets: {}, pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements }] }),
    );
  it("OE23 (H4, K8) : un tableau ou un fill mal formé figure sous son kind brut, sa vue est unknown ; un élément sans id n'y figure pas", () => {
    const d = fakeCore.load(
      doc([
        { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0], table: { cols: "x" } },
        { kind: "table", transform: [1, 0, 0, 1, 0, 0], table: { cols: "x" } },
        { id: "f1", kind: "fill", transform: [1, 0, 0, 1, 0, 0], fill: { color: 3 } },
        { kind: "stroke", transform: [1, 0, 0, 1, 0, 0] },
      ]),
    );
    expect(d.elementIdsOfKind("p1", "table")).toEqual(["t1"]);
    expect(d.elementIdsOfKind("p1", "fill")).toEqual(["f1"]);
    expect(d.elementIdsOfKind("p1", "stroke")).toEqual([]);
    expect(d.element("t1")?.kind).toBe("unknown");
    expect(d.element("f1")?.kind).toBe("unknown");
    d.free();
  });

  it("OE23 : un élément valide de chaque kind de vue, même liste qu'elementIds filtrée par la vue (toutes les branches de rawKind)", () => {
    const d = fakeCore.load(
      doc([{ id: "f1", kind: "fill", transform: [1, 0, 0, 1, 0, 0], fill: { color: "#ff0000", w: 10, h: 10, contours: [[0, 0, 10, 0, 10, 10, 0, 10]] } }]),
    );
    const p = "p1";
    const pen = { color: "#000000", width: 4 };
    commit(d, p, 100);
    d.apply({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 50, y1: 50, style: pen, fill: null });
    d.apply({ type: "SetText", page: p, id: null, x: 10, y: 20, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    d.apply({ type: "AddImage", page: p, asset: png, w: 640, h: 480, matrix: I });
    c14Add(d, p);
    c15Add(d, p);
    d.apply({ type: "AddTable", page: p, x: 100, y: 200, cols: 2, rows: 1, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 });
    for (const kind of ["stroke", "shape", "text", "image", "media", "model3d", "table", "fill"]) {
      const ids = d.elementIdsOfKind(p, kind);
      expect(ids, kind).toHaveLength(1);
      expect(ids, kind).toEqual(d.elementIds(p).filter((id) => d.element(id)?.kind === kind));
    }
    d.free();
  });
});

// personnalisation-1b (Q2, Q4, Q5, Q35) : ApplyBackground à parité, fausse liaison et vrai module (D36).
const P1B_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const P1B_PNG = { id: P1B_ABC, name: "fond.png", mime: "image/png", size: 3 } as const;
const P1B_PDF = { id: "cd".repeat(32), name: "cours.pdf", mime: "application/pdf", size: 1234 };
const P1B_GRID: GridInput = {
  visible: true,
  snap: false,
  above: false,
  levels: [{ kind: "seyes", spacingX: 30.24, spacingY: 30.24, originX: 0, originY: 0, color: "#8f9ad6", line: "solid", lineWidth: 1, snap: true, visible: true }],
};
const P1B_BAD_FILL = "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)";
const P1B_BAD_ASSET = "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)";
const P1B_BAD_IMAGE = "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)";
const P1B_BAD_GRID = "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)";
const p1bLook = (d: CoreDocument, p: string) => {
  const v = d.page(p);
  return { background: v?.background, grid: v?.grid ?? null, kind: v?.backdrop?.kind ?? null, asset: v?.backdrop?.asset ?? null };
};

describe("contrôle de forme personnalisation-1b (ApplyBackground)", () => {
  it("ApplyBackground : arguments dans l'ordre de la liaison ; sans grille, tableaux vides et drapeau faux", () => {
    const drift = { pages: ["p1"], ids: [], full: false, version: 1 };
    const calls: unknown[][] = [];
    const doc = { apply_background: (...args: unknown[]): unknown => { calls.push(args); return drift; } };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    expect(() => d.apply({ type: "ApplyBackground", pages: ["p1", "p2"], color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID })).toThrow("Change invalide");
    expect(() => d.apply({ type: "ApplyBackground", pages: ["p1"], color: "#2f3e46", backdrop: null, grid: null })).toThrow("Change invalide");
    expect(calls).toEqual([
      [["p1", "p2"], "#fbf7ec", P1B_ABC, "fond.png", "image/png", 3, 3840, 2160, "width", true, true, false, false, ["seyes"], ["#8f9ad6"], ["solid"], new Float64Array([30.24, 30.24, 0, 0, 1, 1, 1])],
      [["p1"], "#2f3e46", undefined, "", "", 0, 0, 0, "width", false, false, false, false, [], [], [], new Float64Array([])],
    ]);
  });
});

describe.each(factories)("contrat personnalisation-1b : $name", ({ f }) => {
  it("ligne brute sans grille ni fond : traitée comme null, page blanche inchangée, rien d'écrit", () => {
    const d = f.blank();
    const p = first(d);
    const raw = JSON.parse(`{"type":"ApplyBackground","pages":["${p}"],"color":"#ffffff"}`) as Command;
    const v = d.version();
    const c = d.apply(raw);
    expect(c.pages).toEqual([]);
    expect(c.version).toBe(v);
    expect(d.page(p)?.grid ?? null).toBeNull();
    expect(d.canUndo()).toBe(false);
  });

  it("trois pages, une étape, un seul asset ; annuler rend les trois pages blanches", () => {
    const d = f.blank();
    const p = first(d);
    d.apply({ type: "AddPage", after: p });
    d.apply({ type: "AddPage", after: p });
    const pages = d.pageIds();
    const c = d.apply({ type: "ApplyBackground", pages, color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID });
    expect(c.pages).toEqual(pages);
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#fbf7ec", grid: P1B_GRID, kind: "image", asset: P1B_ABC });
    expect(d.citedAssets().map((a) => a.id)).toEqual([P1B_ABC]);
    d.undo();
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#ffffff", grid: null, kind: null, asset: null });
    expect(d.pageIds()).toEqual(pages);
    d.free();
  });

  it("même aspect : aucune étape ; seules les pages qui changent sont rendues", () => {
    const d = f.blank();
    d.apply({ type: "AddPage", after: first(d) });
    const [a, b] = d.pageIds() as [string, string];
    const cmd = (pages: string[]): Command => ({ type: "ApplyBackground", pages, color: "#2f3e46", backdrop: null, grid: null });
    expect(d.apply(cmd([a])).pages).toEqual([a]);
    unchanged(d, () => d.apply(cmd([a])));
    expect(d.apply(cmd([a, b])).pages).toEqual([b]);
    d.free();
  });

  it("Q35 : pages PDF : fond gardé, couleur et grille écrites, une étape", () => {
    const d = f.fromPdfPages(P1B_PDF, [{ w: 612, h: 792 }, { w: 792, h: 612 }]);
    const pages = d.pageIds();
    expect(d.apply({ type: "ApplyBackground", pages, color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID }).pages).toEqual(pages);
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#fbf7ec", grid: P1B_GRID, kind: "pdf-page", asset: P1B_PDF.id });
    d.undo();
    expect(d.canUndo()).toBe(false);
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#ffffff", grid: null, kind: "pdf-page", asset: P1B_PDF.id });
    d.free();
  });

  it("Q1 : blanc sans grille ni image retire grille et image en une étape", () => {
    const d = f.blank();
    const p = first(d);
    d.apply({ type: "ApplyBackground", pages: [p], color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID });
    expect(d.apply({ type: "ApplyBackground", pages: [p], color: "#ffffff", backdrop: null, grid: null }).pages).toEqual([p]);
    expect(p1bLook(d, p)).toEqual({ background: "#ffffff", grid: null, kind: null, asset: null });
    d.free();
  });

  it("refus sans étape, dans l'ordre couleur, fond, grille, pages", () => {
    const d = f.blank();
    const p = first(d);
    const ok: Command = { type: "ApplyBackground", pages: [p], color: "#ffffff", backdrop: null, grid: null };
    const level = P1B_GRID.levels[0]!;
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ ...ok, color: "" } as Command))).toBe(P1B_BAD_FILL);
      expect(messageOf(() => d.apply({ ...ok, color: "", backdrop: { asset: { ...P1B_PNG, mime: "" }, w: 1, h: 1, fit: "width" } } as Command))).toBe(P1B_BAD_FILL);
      expect(messageOf(() => d.apply({ ...ok, backdrop: { asset: { ...P1B_PNG, mime: "" }, w: 1, h: 1, fit: "width" } } as Command))).toBe(P1B_BAD_ASSET);
      expect(messageOf(() => d.apply({ ...ok, backdrop: { asset: P1B_PNG, w: 1, h: 1, fit: "contain" } } as Command))).toBe(P1B_BAD_IMAGE);
      expect(messageOf(() => d.apply({ ...ok, grid: { ...P1B_GRID, levels: [{ ...level, spacingX: 0 }] } } as Command))).toBe(P1B_BAD_GRID);
      expect(messageOf(() => d.apply({ ...ok, pages: [] } as Command))).toBe("page inconnue : ");
      expect(messageOf(() => d.apply({ ...ok, pages: [p, p] } as Command))).toBe(`page inconnue : ${p}`);
      expect(messageOf(() => d.apply({ ...ok, pages: ["nulle-part"] } as Command))).toBe("page inconnue : nulle-part");
    });
    d.free();
  });
});

describe.each(factories)("contrat T18 : SetPageMode, MovePage, DuplicatePage, Restack : $name", ({ f }) => {
  const twoPages = () => {
    const d = f.blank();
    const p1 = first(d);
    const p2 = d.apply({ type: "AddPage", after: p1 }).pages[0] ?? "";
    return { d, p1, p2 };
  };
  const oneStep = (d: CoreDocument, run: () => unknown): void => {
    const v = d.version();
    run();
    expect(d.canUndo()).toBe(true);
    expect(d.version()).toBeGreaterThan(v);
    d.undo();
    expect(d.version()).toBeGreaterThanOrEqual(v);
  };
  it("SetPageMode : une étape d'annulation qui rend le mode ; même mode : aucune étape", () => {
    const { d, p1 } = twoPages();
    const before = d.page(p1)?.height;
    oneStep(d, () => d.apply({ type: "SetPageMode", page: p1, mode: "portrait" }));
    expect(d.page(p1)?.height).toBe(before);
    unchanged(d, () => d.apply({ type: "SetPageMode", page: p1, mode: "landscape" }));
  });
  it("SetPageMode : page inconnue refusée, rien n'est écrit", () => {
    const { d } = twoPages();
    unchanged(d, () => expect(() => d.apply({ type: "SetPageMode", page: "nulle", mode: "portrait" })).toThrow(/page inconnue : nulle/));
  });
  it("MovePage : une étape ; rang inchangé : aucune étape ; rang hors bornes et page inconnue refusés ; ids gardés", () => {
    const { d, p1, p2 } = twoPages();
    oneStep(d, () => d.apply({ type: "MovePage", page: p1, to: 1 }));
    expect(d.pageIds()).toEqual([p1, p2]);
    d.apply({ type: "MovePage", page: p1, to: 1 });
    expect(d.pageIds()).toEqual([p2, p1]);
    unchanged(d, () => d.apply({ type: "MovePage", page: p1, to: 1 }));
    unchanged(d, () => expect(() => d.apply({ type: "MovePage", page: p1, to: 2 })).toThrow());
    unchanged(d, () => expect(() => d.apply({ type: "MovePage", page: "nulle", to: 0 })).toThrow(/page inconnue : nulle/));
  });
  it("DuplicatePage : une étape, copie juste après, annulable ; page inconnue refusée", () => {
    const { d, p1, p2 } = twoPages();
    const v = d.version();
    const copy = d.apply({ type: "DuplicatePage", page: p1 }).pages[0] ?? "";
    expect(d.pageIds()).toEqual([p1, copy, p2]);
    expect(copy).not.toBe(p1);
    expect(d.canUndo()).toBe(true);
    d.undo();
    expect(d.pageIds()).toEqual([p1, p2]);
    expect(d.version()).toBeGreaterThanOrEqual(v);
    unchanged(d, () => expect(() => d.apply({ type: "DuplicatePage", page: "nulle" })).toThrow(/page inconnue : nulle/));
  });
  it("Restack : une étape, ids gardés ; rang inchangé : aucune étape ; rang hors bornes, id inconnu, pages mêlées refusés", () => {
    const { d, p1, p2 } = twoPages();
    const a = commit(d, p1, 10);
    const b = commit(d, p1, 20);
    const c = commit(d, p2, 30);
    const order = () => d.elementIds(p1);
    expect(order()).toEqual([a, b]);
    oneStep(d, () => d.apply({ type: "Restack", ids: [a], to: 1 }));
    expect(order()).toEqual([a, b]);
    d.apply({ type: "Restack", ids: [a], to: 1 });
    expect(order()).toEqual([b, a]);
    unchanged(d, () => d.apply({ type: "Restack", ids: [a], to: 1 }));
    unchanged(d, () => expect(() => d.apply({ type: "Restack", ids: [a], to: 9 })).toThrow());
    unchanged(d, () => expect(() => d.apply({ type: "Restack", ids: ["nulle"], to: 0 })).toThrow());
    unchanged(d, () => expect(() => d.apply({ type: "Restack", ids: [a, c], to: 0 })).toThrow());
    expect(order()).toEqual([b, a]);
  });
  it("messages de refus identiques entre les deux cœurs", () => {
    const { d, p1 } = twoPages();
    const a = commit(d, p1, 10);
    const c = commit(d, d.pageIds()[1] ?? "", 30);
    expect([
      messageOf(() => d.apply({ type: "MovePage", page: p1, to: 2 })),
      messageOf(() => d.apply({ type: "Restack", ids: [a], to: 9 })),
      messageOf(() => d.apply({ type: "Restack", ids: ["nulle"], to: 0 })),
      messageOf(() => d.apply({ type: "Restack", ids: [a, c], to: 0 })),
      messageOf(() => d.apply({ type: "SetPageMode", page: p1, mode: "a4" as never })),
    ]).toEqual(["rang de page hors bornes", "rang de page hors bornes", "élément inconnu : nulle", "objets de pages différentes", "mode de page inconnu : a4"]);
  });
});
