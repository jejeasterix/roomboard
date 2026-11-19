// Contrat du vrai module Wasm (D33) : chargé en Node par `initSync` sur les octets, joué contre `api.ts` (T8).
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer le contrat au lieu de le sauter.
import { describe, expect, it } from "vitest";
import type { CoreDocument, CoreFactory, Matrix, ShapeKind } from "./api";
import { fakeCore } from "./fake-core";
import { normalizeShape } from "./shapes";
import { createWasmCore, toBounds, toChange, toElementView, type WasmModule } from "./wasm-core";

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

describe.skipIf(loaded === null)("contrat du vrai module wasm", () => {
  const core = {
    version: (): string => need().core.version(),
    blank: (): CoreDocument => need().core.blank(),
    load: (b: Uint8Array): CoreDocument => need().core.load(b),
  };

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
