// Contrat du vrai module Wasm (D33) : chargé en Node par `initSync` sur les octets, joué contre `api.ts` (T8).
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer le contrat au lieu de le sauter.
import { describe, expect, it } from "vitest";
import type { AssetRef, CoreDocument, CoreFactory, GridInput, GridLevel, Matrix, ShapeKind } from "./api";
import { fakeCore } from "./fake-core";
import { normalizeShape } from "./shapes";
import { createWasmCore, toAssetInfo, toBounds, toChange, toElementView, toGridLines, toPageView, type WasmModule } from "./wasm-core";

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
      ["set_text", "p1", "e1", 5, 6, "Bonjour", "#000000", 36, 600, 45],
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
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff" };
    expect(toPageView(undefined)).toBeNull();
    expect(toPageView({ ...page, backdrop: undefined })).toEqual({ ...page, backdrop: null, grid: null });
    const b = { asset: "a".repeat(64), kind: "pdf-page", w: undefined, h: 5, fit: "contain", rect: undefined };
    expect(toPageView({ ...page, backdrop: b })).toEqual({ ...page, backdrop: { ...b, w: null, rect: null }, grid: null });
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
// et cas limites. Seule exception, la gomme partielle : la fausse liaison ne coupe pas (écart documenté dans
// `fake-core.ts`), son scénario reste dans le bloc du vrai module.
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
      text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45 },
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
    expect(before).toEqual({ id: p, width: 1920, height: 1080, background: "#ffffff", backdrop: null, grid: null });
    const fond = { asset: png, w: 1000, h: 500, fit: "width" };
    expect(d.apply({ type: "SetBackdrop", page: p, backdrop: fond }).pages).toEqual([p]);
    const rect = { x0: 0, y0: 0, x1: 1920, y1: 960 };
    expect(d.page(p)).toEqual({ ...before, backdrop: { asset: ABC, kind: "image", w: 1000, h: 500, fit: "width", rect } });
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
  snap: true,
  visible: true,
});
const gridOf = (levels: readonly GridLevel[], snap = true, above = false): GridInput => ({ visible: true, snap, above, levels });
const setGrid = (d: CoreDocument, page: string, grid: GridInput | null) => d.apply({ type: "SetGrid", page, grid });
const c9Factories = factories; // T6 : vrai module branché, contrat C9 commun aux deux fabriques

describe("contrôle de forme C9 (grille)", () => {
  it("toPageView : grille contrôlée, undefined → null, forme fausse → erreur", () => {
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff", backdrop: undefined };
    const g = { visible: true, snap: false, above: true, levels: [gridLevel("hexagon", 40)] };
    expect(toPageView({ ...page, grid: g })?.grid).toEqual(g);
    expect(toPageView({ ...page, grid: undefined })?.grid).toBeNull();
    expect(() => toPageView({ ...page, grid: { ...g, levels: "x" } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, levels: [{ ...gridLevel("squares", 40), snap: 1 }] } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, above: "oui" } })).toThrow("PageView invalide");
  });

  it("toPageView : grille ou niveau qui n'est pas un objet, tête sans visible → erreur", () => {
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff", backdrop: undefined };
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
    const r = { x0: -13.3, y0: 1_000_007, x1: 786.7, y1: 1_000_607 };
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
});

describe("contrôle de forme C9 (lignes de grille)", () => {
  it("toGridLines : null pour rien, erreur pour une forme fausse", () => {
    const ok = { above: true, levels: [{ color: "#000000", line: "solid", alpha: 0.5, segments: [0, 0, 0, 10], dots: [1, 2] }] };
    expect(toGridLines(undefined)).toBeNull();
    expect(toGridLines(null)).toBeNull();
    expect(toGridLines(ok)).toEqual(ok);
    expect(() => toGridLines({ ...ok, above: 1 })).toThrow("GridLines invalide");
    expect(() => toGridLines({ above: true, levels: [{ ...ok.levels[0], segments: ["0"] }] })).toThrow("GridLines invalide");
    expect(() => toGridLines({ above: true, levels: "x" })).toThrow("GridLines invalide");
  });
});

describe.skipIf(loaded === null)("contrat C9 : vrai module seulement", () => {
  const fixture = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));

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
