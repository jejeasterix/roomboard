import { describe, expect, it } from "vitest";
import type { Command, CoreDocument } from "./api";
import { fakeCore } from "./fake-core";

const style = { color: "#000000", width: 4 };
const line = (y: number): Float32Array => new Float32Array([0, y, 0.5, 50, y, 0.5, 100, y, 0.5]);
const commit = (d: CoreDocument, page: string, y: number): string => {
  const c = d.apply({ type: "CommitStroke", page, points: line(y), style });
  const id = c.ids[0];
  if (id === undefined) throw new Error("aucun id");
  return id;
};
const firstPage = (d: CoreDocument): string => {
  const p = d.pageIds()[0];
  if (p === undefined) throw new Error("aucune page");
  return p;
};

describe("fakeCore", () => {
  it("blank a une page", () => {
    expect(fakeCore.blank().pageIds()).toHaveLength(1);
  });

  it("une page vide ne s'annule pas", () => {
    const d = fakeCore.blank();
    expect(d.canUndo()).toBe(false);
    d.undo();
    expect(d.pageIds()).toHaveLength(1);
  });

  it("CommitStroke ajoute un élément et rend son id", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = commit(d, p, 10);
    expect(d.elementIds(p)).toEqual([id]);
    expect(d.element(id)?.transform).toEqual([1, 0, 0, 1, 0, 10]);
  });

  it("les points lus sont locaux", () => {
    const d = fakeCore.blank();
    const id = commit(d, firstPage(d), 10);
    expect(Array.from(d.points(id) ?? [])).toEqual([0, 0, 0.5, 50, 0, 0.5, 100, 0, 0.5]);
  });

  it("annuler puis rétablir un trait", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    commit(d, p, 10);
    expect(d.undo().full).toBe(true);
    expect(d.elementIds(p)).toHaveLength(0);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(1);
  });

  it("la gomme d'objet retire le trait touché, une seule étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    commit(d, p, 10);
    commit(d, p, 200);
    const cmd: Command = { type: "Erase", page: p, path: new Float32Array([50, 0, 50, 20]), radius: 5, mode: "object" };
    expect(d.apply(cmd).removed).toHaveLength(1);
    expect(d.elementIds(p)).toHaveLength(1);
    d.undo();
    expect(d.elementIds(p)).toHaveLength(2);
  });

  it("supprimer la dernière page est refusé", () => {
    const d = fakeCore.blank();
    expect(() => d.apply({ type: "RemovePage", page: firstPage(d) })).toThrow(/dernière page/);
  });

  it("save puis load rend les mêmes éléments", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = commit(d, p, 10);
    const e = fakeCore.load(d.save("2026-11-16T12:00:00Z", "0.1.0"));
    expect(e.elementIds(p)).toEqual([id]);
    expect(e.canUndo()).toBe(false);
  });

  it("load d'octets quelconques lève le message du cœur", () => {
    expect(() => fakeCore.load(new Uint8Array([1, 2, 3]))).toThrow("ce fichier n'est pas un document RoomBoard");
    expect(() => fakeCore.load(new TextEncoder().encode("{}"))).toThrow("ce fichier n'est pas un document RoomBoard");
  });

  it("le StrokeBuilder rend un contour non vide", () => {
    const d = fakeCore.blank();
    const b = d.newStrokeBuilder(style);
    expect(b.push(new Float32Array([0, 0, 0.5, 10, 0, 0.5])).length).toBeGreaterThan(0);
    expect(b.finish().length).toBeGreaterThan(0);
    b.free();
  });
});

describe("fakeCore — lot 4 (formes, texte, Transform)", () => {
  const pen = { color: "#000000", width: 4 };
  const setup = () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const rect = (x0: number, y0: number, x1: number, y1: number): string =>
      d.apply({ type: "AddShape", page: p, shape: "rect", x0, y0, x1, y1, style: pen, fill: null }).ids[0] ?? "";
    const text = (content: string, id: string | null = null) =>
      d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    const errorOf = (f: () => unknown): string => {
      try {
        f();
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
      return "aucune erreur";
    };
    return { d, p, rect, text, errorOf };
  };

  it("AddShape normalise les coins et s'annule en une étape", () => {
    const { d, p, rect } = setup();
    const id = rect(300, 200, 100, 50);
    expect(d.element(id)).toEqual({
      id,
      kind: "shape",
      transform: [1, 0, 0, 1, 100, 50],
      style: pen,
      shape: { shape: "rect", w: 200, h: 150, fill: null },
    });
    d.undo();
    expect(d.elementIds(p)).toEqual([]);
  });

  it("AddShape refuse des coins non finis et une épaisseur nulle, sans étape", () => {
    const { d, p, errorOf } = setup();
    expect(errorOf(() => d.apply({ type: "AddShape", page: p, shape: "line", x0: Number.NaN, y0: 0, x1: 1, y1: 1, style: pen, fill: null })))
      .toBe("forme invalide (rect, ellipse, line ou arrow, coins finis attendus)");
    expect(errorOf(() => d.apply({ type: "AddShape", page: p, shape: "line", x0: 0, y0: 0, x1: 1, y1: 1, style: { color: "#000000", width: 0 }, fill: null })))
      .toBe("épaisseur de trait invalide (nombre fini > 0 attendu)");
    expect(d.canUndo()).toBe(false);
  });

  it("SetText crée, remplace, retire ; inchangé = aucune étape", () => {
    const { d, p, text } = setup();
    expect(text("").ids).toEqual([]);
    const id = text("Bonjour").ids[0] ?? "";
    expect(d.element(id)).toEqual({
      id,
      kind: "text",
      transform: [1, 0, 0, 1, 100, 200],
      style: { color: "#000000", width: 0 },
      text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45 },
    });
    const v = d.version();
    expect(text("Bonjour", id).version).toBe(v);
    expect(text("Bonsoir", id).ids).toEqual([id]);
    expect(d.element(id)?.kind === "text" && d.element(id)).toMatchObject({ text: { content: "Bonsoir" } });
    expect(text("", id).removed).toEqual([id]);
    expect(d.elementIds(p)).toEqual([]);
    d.undo();
    d.undo();
    expect(d.element(id)).toMatchObject({ text: { content: "Bonjour" } });
  });

  it("SetText : élément inconnu, texte invalide", () => {
    const { d, text, errorOf } = setup();
    expect(errorOf(() => text("x", "absent"))).toBe("élément inconnu : absent");
    const p = d.pageIds()[0] ?? "";
    expect(errorOf(() => d.apply({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "x", color: "#000000", size: 0, boxWidth: 600, boxHeight: 45 })))
      .toBe("texte invalide (taille et boîte finies > 0 attendues)");
  });

  it("Transform compose à gauche et ignore les ids inconnus", () => {
    const { d, p, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    const c = d.apply({ type: "Transform", ids: [b, "absent", a, a], matrix: [2, 0, 0, 2, 0, 0] });
    expect(c.ids).toEqual([a, b].sort());
    expect(c.pages).toEqual([p]);
    d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 0] });
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 210, 200]);
    const v = d.version();
    expect(d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 0, 0] }).version).toBe(v);
    expect(d.apply({ type: "Transform", ids: ["absent"], matrix: [1, 0, 0, 1, 5, 5] }).ids).toEqual([]);
    d.undo();
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 200, 200]);
  });

  it("Transform refuse une matrice non inversible ou non finie", () => {
    const { d, rect, errorOf } = setup();
    const a = rect(100, 100, 200, 200);
    for (const matrix of [[0, 0, 0, 0, 0, 0], [1, 2, 2, 4, 0, 0], [Number.NaN, 0, 0, 1, 0, 0]] as const) {
      expect(errorOf(() => d.apply({ type: "Transform", ids: [a], matrix }))).toBe("matrice invalide (six nombres finis, inversible)");
    }
  });

  it("formes et textes : hitTest sur la surface, idsInRect et bounds ; hitTestPath et Erase les ignorent", () => {
    const { d, p, rect, text } = setup();
    const r = rect(600, 600, 800, 700);
    const t = text("Bonjour").ids[0] ?? "";
    expect(d.hitTest(p, 700, 650, 1)).toBe(r);
    expect(d.hitTest(p, 300, 220, 1)).toBe(t);
    expect(d.hitTest(p, 900, 650, 1)).toBeNull();
    expect(d.bounds([r])).toEqual({ x0: 598, y0: 598, x1: 802, y1: 702 });
    expect(d.bounds([t])).toEqual({ x0: 100, y0: 200, x1: 700, y1: 245 });
    expect(d.idsInRect(p, { x0: 590, y0: 590, x1: 810, y1: 710 })).toEqual([r]);
    expect(d.hitTestPath(p, new Float32Array([600, 650, 800, 650]), 10)).toEqual([]);
    expect(d.apply({ type: "Erase", page: p, path: new Float32Array([600, 650, 800, 650]), radius: 10, mode: "object" }).removed).toEqual([]);
  });

  it("save puis load garde formes, textes et matrices", () => {
    const { d, p, rect, text } = setup();
    const r = rect(100, 100, 200, 200);
    const t = text("Bonjour").ids[0] ?? "";
    d.apply({ type: "Transform", ids: [r], matrix: [1, 0, 0, 1, 50, 0] });
    const e = fakeCore.load(d.save("2026-11-19T21:00:00Z", "0.1.0"));
    expect(e.elementIds(p)).toEqual([r, t]);
    expect(e.element(r)).toEqual(d.element(r));
    expect(e.element(t)).toEqual(d.element(t));
  });

  // Test qui discrimine le patron écarté (x0, y0 à côté de la matrice) : sous une échelle, une lecture qui n'ajoute
  // que des décalages place le trait et la forme à leur ancienne place, ou à mi-chemin si seule la translation suit.
  // Toute lecture passe par la matrice, comme `query.rs` du cœur (point monde ramené en local, bornes monde du contour).
  it("Transform à l'échelle : hitTest, hitTestPath, Erase, idsInRect et bounds lisent la matrice", () => {
    const { d, p, rect } = setup();
    const s = d.apply({ type: "CommitStroke", page: p, points: new Float32Array([100, 100, 0.5, 200, 100, 0.5]), style: pen }).ids[0] ?? "";
    const r = rect(100, 300, 200, 400);
    d.apply({ type: "Transform", ids: [s, r], matrix: [2, 0, 0, 2, 0, 0] });
    expect(d.element(s)?.transform).toEqual([2, 0, 0, 2, 200, 200]);
    // Trait : monde (200, 200)-(400, 200) ; sa place d'avant, (100, 100)-(200, 100), est vide.
    expect(d.hitTest(p, 400, 200, 1)).toBe(s);
    expect(d.hitTest(p, 200, 100, 1)).toBeNull();
    expect(d.hitTestPath(p, new Float32Array([400, 190, 400, 210]), 3)).toEqual([s]);
    expect(d.hitTestPath(p, new Float32Array([200, 90, 200, 110]), 3)).toEqual([]);
    const bs = d.bounds([s]);
    expect(bs?.x0).toBeGreaterThan(190);
    expect(bs?.x0).toBeLessThan(200);
    expect(bs?.x1).toBeGreaterThan(400);
    expect(bs?.x1).toBeLessThan(410);
    expect(bs?.y0).toBeGreaterThan(190);
    expect(bs?.y1).toBeLessThan(210);
    // Forme : boîte locale (-2, -2)-(102, 102) mise à l'échelle 2 puis placée en (200, 600).
    expect(d.hitTest(p, 390, 790, 1)).toBe(r);
    expect(d.hitTest(p, 150, 350, 1)).toBeNull();
    expect(d.bounds([r])).toEqual({ x0: 196, y0: 596, x1: 404, y1: 804 });
    expect(d.idsInRect(p, { x0: 0, y0: 0, x1: 250, y1: 450 })).toEqual([]);
    expect(d.idsInRect(p, { x0: 190, y0: 190, x1: 410, y1: 810 })).toEqual([s, r]);
    // La gomme d'objet suit aussi la matrice ; annuler rend le trait à sa place d'avant.
    expect(d.apply({ type: "Erase", page: p, path: new Float32Array([400, 190, 400, 210]), radius: 3, mode: "object" }).removed).toEqual([s]);
    d.undo();
    d.undo();
    expect(d.hitTest(p, 200, 100, 1)).toBe(s);
    expect(d.bounds([r])).toEqual({ x0: 98, y0: 298, x1: 202, y1: 402 });
  });
});

interface NodeFs { readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const unknownFixture = (): Uint8Array => fs.readFileSync(new URL("./fixtures/element-inconnu.fake.json", import.meta.url));
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("fixture élément inconnu (S4, fausse liaison)", () => {
  it("vue unknown avec sa boîte ; sans transform : identité et 100 × 100", () => {
    const d = fakeCore.load(unknownFixture());
    expect(d.element("h1")).toEqual({ id: "h1", kind: "unknown", transform: [1, 0, 0, 1, 100, 50], unknown: { sourceKind: "hologram", w: 300, h: 200 } });
    expect(d.element("h2")).toEqual({ id: "h2", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "hologram", w: 100, h: 100 } });
    expect(d.citedAssets()).toEqual([{ id: ABC, name: ABC, mime: "application/octet-stream", size: 0 }]);
    expect(d.canUndo()).toBe(false);
  });

  it("Transform ne change que la matrice et ignore l'élément sans transform ; save réécrit les champs bruts", () => {
    const d = fakeCore.load(unknownFixture());
    const v = d.version();
    expect(d.apply({ type: "Transform", ids: ["h2"], matrix: [1, 0, 0, 1, 10, 0] }).version).toBe(v);
    d.apply({ type: "Transform", ids: ["h1"], matrix: [1, 0, 0, 1, 10, 0] });
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: unknown[] }[] };
    const original = JSON.parse(new TextDecoder().decode(unknownFixture())) as { pages: { elements: Record<string, unknown>[] }[] };
    const [h1, h2] = original.pages[0]?.elements ?? [];
    expect(saved.pages[0]?.elements).toEqual([{ ...h1, transform: [1, 0, 0, 1, 110, 50] }, h2]);
  });

  it("hitTest le sélectionne, Delete le retire, la gomme l'ignore", () => {
    const d = fakeCore.load(unknownFixture());
    expect(d.hitTest("p1", 50, 50, 0)).toBe("h2");
    expect(d.hitTest("p1", 150, 100, 0)).toBe("h1");
    expect(d.apply({ type: "Erase", page: "p1", path: new Float32Array([0, 50, 400, 50]), radius: 10, mode: "object" }).removed).toEqual([]);
    expect(d.apply({ type: "Delete", ids: ["h2"] }).removed).toEqual(["h2"]);
    expect(d.elementIds("p1")).toEqual(["h1"]);
  });

  it("métadonnée mal formée au chargement : défauts champ par champ (K4)", () => {
    const raw = {
      pages: [{ id: "p1", elements: [{ id: "i1", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: ABC, w: 2, h: 2 } }] }],
      assets: { [ABC]: { name: 3, mime: "", size: -1 } },
    };
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(raw)));
    expect(d.citedAssets()).toEqual([{ id: ABC, name: ABC, mime: "application/octet-stream", size: 0 }]);
    expect(d.page("p1")?.backdrop).toBeNull();
  });
  it("image connue mal formée : illisible par element(), champs gardés tels quels au save (K8)", () => {
    const bad = [
      { id: "i1", kind: "image", transform: [1, 0, 0, 1, 0, 0] },
      { id: "i2", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: ABC.toUpperCase(), w: 2, h: 2 } },
      { id: "i3", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: ABC, w: 0, h: 2 } },
    ];
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify({ pages: [{ id: "p1", elements: bad }] })));
    for (const e of bad) expect(d.element(e.id)).toBeNull();
    expect(d.elementIds("p1")).toEqual(["i1", "i2", "i3"]);
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: unknown[] }[] };
    expect(saved.pages[0]?.elements).toEqual(bad);
  });

  it("balayage (K4) : le contenu d'un texte n'est pas cité, une empreinte en majuscules non plus", () => {
    const d = fakeCore.load(unknownFixture());
    const empty = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    d.apply({ type: "SetText", page: "p1", id: null, x: 0, y: 0, content: empty, color: "#000000", size: 16, boxWidth: 100, boxHeight: 20 });
    d.apply({ type: "CommitStroke", page: "p1", points: line(500), style: { color: ABC.toUpperCase(), width: 4 } });
    expect(d.citedAssets().map((a) => a.id)).toEqual([ABC]);
  });

  it("inconnu à transform illisible : identité dans la vue, champ gardé tel quel au save (K8)", () => {
    const raw = { pages: [{ id: "p1", elements: [{ id: "h3", kind: "hologram", transform: "abc", raw: { w: 5 } }] }] };
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(raw)));
    expect(d.element("h3")).toEqual({ id: "h3", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "hologram", w: 100, h: 100 } });
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: unknown[] }[] };
    expect(saved.pages[0]?.elements).toEqual(raw.pages[0]?.elements);
  });
});

describe("grille de la fausse liaison (C9, G4)", () => {
  const saveJson = (d: CoreDocument): { pages: Record<string, unknown>[] } =>
    JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: Record<string, unknown>[] };
  const withGrid = (grid: unknown): CoreDocument => {
    const raw = saveJson(fakeCore.blank());
    raw.pages[0] = { ...(raw.pages[0] ?? {}), grid };
    return fakeCore.load(new TextEncoder().encode(JSON.stringify(raw)));
  };
  const squares = (s: number, o: number) => ({
    kind: "squares",
    spacingX: s,
    spacingY: s,
    originX: o,
    originY: o,
    color: "#000000",
    line: "solid",
    snap: true,
    visible: true,
  });

  it("grille qui n'est pas un objet : null, page lisible ; sans levels ou levels non tableau : levels [] (S2)", () => {
    const bad = withGrid("pas une grille");
    expect(bad.page(firstPage(bad))?.grid).toBeNull();
    const empty = withGrid({});
    expect(empty.page(firstPage(empty))?.grid).toEqual({ visible: true, snap: false, above: false, levels: [] });
    const flat = withGrid({ levels: "x", visible: false });
    expect(flat.page(firstPage(flat))?.grid).toEqual({ visible: false, snap: false, above: false, levels: [] });
  });

  it("niveau sans pas finis > 0 ou qui n'est pas un objet : absent de la vue, gardé au save ; défauts champ par champ", () => {
    const levels = ["x", { kind: "squares", spacingX: 0, spacingY: 40 }, { kind: "squares", spacingX: 40, spacingY: 20, originX: "n", futur: 1 }];
    const d = withGrid({ snap: true, levels });
    const p = firstPage(d);
    expect(d.page(p)?.grid?.levels).toEqual([
      { kind: "squares", spacingX: 40, spacingY: 20, originX: 0, originY: 0, color: "#000000", line: "solid", snap: true, visible: true },
    ]);
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { grid?: unknown }[] };
    expect(saved.pages[0]?.grid).toEqual({ snap: true, levels });
  });

  it("grille lue qui n'est pas un objet : vue sans grille, valeur brute réécrite telle quelle au save (G13)", () => {
    for (const raw of ["pas une grille", 42, [1, 2], true]) {
      const d = withGrid(raw);
      expect(d.page(firstPage(d))?.grid).toBeNull();
      expect(saveJson(d).pages[0]?.["grid"]).toEqual(raw);
    }
  });

  it("page sans grille : aucune clé grid au save, même après SetGrid puis retrait (sauvegardes existantes identiques)", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    expect(Object.keys(saveJson(d).pages[0] ?? {})).not.toContain("grid");
    d.apply({ type: "SetGrid", page: p, grid: { visible: true, snap: true, above: false, levels: [squares(40, 0)] } });
    expect(Object.keys(saveJson(d).pages[0] ?? {})).toContain("grid");
    d.apply({ type: "SetGrid", page: p, grid: null });
    expect(Object.keys(saveJson(d).pages[0] ?? {})).not.toContain("grid");
  });

  it("snapPoint : à mi-pas, l'indice s'arrondit loin de zéro comme f64::round du cœur (pas Math.round)", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    // Origine 100, pas 40 : (40 - 100) / 40 = -1,5 → indice -2 → 20 (Math.round donnerait -1 → 60).
    d.apply({ type: "SetGrid", page: p, grid: { visible: true, snap: true, above: false, levels: [squares(40, 100)] } });
    expect(d.snapPoint(p, 40, 40)).toEqual([20, 20]);
    // Côté positif : (160 - 100) / 40 = 1,5 → indice 2 → 180.
    expect(d.snapPoint(p, 160, 160)).toEqual([180, 180]);
  });
});
