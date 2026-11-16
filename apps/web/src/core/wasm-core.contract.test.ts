// Contrat du vrai module Wasm (D33) : chargé en Node par `initSync` sur les octets, joué contre `api.ts` (T8).
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer le contrat au lieu de le sauter.
import { describe, expect, it } from "vitest";
import type { CoreDocument, CoreFactory } from "./api";
import { fakeCore } from "./fake-core";
import { createWasmCore, toBounds, toChange, toElementView } from "./wasm-core";

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
  const unchanged = (d: CoreDocument, run: () => unknown): void => {
    const v = d.version();
    const pages = d.pageIds();
    const undo = d.canUndo();
    run();
    expect(d.version()).toBe(v);
    expect(d.pageIds()).toEqual(pages);
    expect(d.canUndo()).toBe(undo);
  };

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
