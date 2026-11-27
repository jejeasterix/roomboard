import { describe, expect, it } from "vitest";
import type { Command, CoreDocument, GridInput, PageLayout, TextAttrsPatch } from "./api";
import { IS_A_GRID_MESSAGE, NOT_A_DOCUMENT_MESSAGE, NOT_A_FRAGMENT_MESSAGE, PACK_MESSAGE, unknownKindMessage, wrongKindMessage } from "./api";
import { fakeCore, KNOWN_KINDS } from "./fake-core";

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
      text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45, spans: [{ text: "Bonjour", attrs: {} }] },
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

describe("fakeCore — C7 (texte riche)", () => {
  const BAD_FORMAT =
    "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)";
  const setText = (d: CoreDocument, page: string, content: string, id: string | null = null) =>
    d.apply({ type: "SetText", page, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
  const spansOf = (d: CoreDocument, id: string) => {
    const e = d.element(id);
    return e?.kind === "text" ? e.text.spans : null;
  };
  const plain = (text: string) => ({ text, attrs: {} });
  const RB = { color: "#ff0000", bold: true } as const;

  it("C7 S1 : FormatText une étape ; SetText garde les plages ; le texte neuf hérite du caractère précédent ; annuler, rétablir", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = setText(d, p, "Le chat noir").ids[0] ?? "";
    expect(d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { color: "#ff0000", bold: true } })).toMatchObject({ pages: [p], ids: [id], removed: [] });
    setText(d, p, "Le gros chat noir", id);
    expect(spansOf(d, id)).toEqual([plain("Le gros "), { text: "chat", attrs: RB }, plain(" noir")]);
    setText(d, p, "Le gros chats noir", id);
    const full = spansOf(d, id);
    expect(full).toEqual([plain("Le gros "), { text: "chats", attrs: RB }, plain(" noir")]);
    d.undo();
    d.undo();
    d.undo();
    expect(spansOf(d, id)).toEqual([plain("Le chat noir")]);
    d.redo();
    d.redo();
    d.redo();
    expect(spansOf(d, id)).toEqual(full);
  });

  it("C7 : une clé à undefined vaut une clé absente ; { bold: undefined } seul : aucune étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = setText(d, p, "Le chat noir").ids[0] ?? "";
    d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { bold: true } });
    d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { bold: undefined, italic: true } });
    expect(spansOf(d, id)).toEqual([plain("Le "), { text: "chat", attrs: { bold: true, italic: true } }, plain(" noir")]);
    const v = d.version();
    expect(d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { bold: undefined } }).version).toBe(v);
    expect(d.version()).toBe(v);
  });

  it("C7 : contrôles dans l'ordre du cœur (patch, boxHeight, élément, bornes), sans étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const stroke = commit(d, p, 10);
    const id = setText(d, p, "Le 🐱 noir").ids[0] ?? "";
    const v = d.version();
    const fmt = (target: string, start: number, len: number, attrs: TextAttrsPatch, boxHeight?: number) => () =>
      d.apply({ type: "FormatText", id: target, start, len, attrs, ...(boxHeight === undefined ? {} : { boxHeight }) });
    expect(fmt("absent", 0, 1, { href: "x" } as unknown as TextAttrsPatch)).toThrow(BAD_FORMAT);
    expect(fmt("absent", 0, 1, {}, -1)).toThrow(BAD_FORMAT);
    expect(fmt("absent", 0, 1, { bold: true })).toThrow("élément inconnu : absent");
    expect(fmt(stroke, 0, 1, { bold: true })).toThrow(`élément inconnu : ${stroke}`);
    expect(fmt(id, 4, 1, { bold: true })).toThrow(BAD_FORMAT);
    expect(fmt(id, 8, 3, { bold: true })).toThrow(BAD_FORMAT);
    expect(d.version()).toBe(v);
  });

  it("C7 : JSON d'avant C7 sans spans : un seul segment sans attribut ; save écrit les spans", () => {
    const old = { pages: [{ id: "p1", elements: [{ id: "t1", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 0 }, text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45 } }] }] };
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(old)));
    expect(spansOf(d, "t1")).toEqual([plain("Bonjour")]);
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: { text?: { spans?: unknown } }[] }[] };
    expect(saved.pages[0]?.elements[0]?.text?.spans).toEqual([plain("Bonjour")]);
  });

  it("C7 parité : SetText diffère en points de code, préfixe d'abord (règle de rich-text.ts, pas une copie)", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    // En unités UTF-16, la demi-paire haute commune de 🐱 et 🐶 entrerait dans le préfixe et 🐶 hériterait du gras.
    const a = setText(d, p, "a🐱").ids[0] ?? "";
    d.apply({ type: "FormatText", id: a, start: 1, len: 2, attrs: { bold: true } });
    setText(d, p, "a🐶", a);
    expect(spansOf(d, a)).toEqual([plain("a🐶")]);
    // Suffixe d'abord, le « a » neuf irait en tête, sans attribut.
    const b = setText(d, p, "aa").ids[0] ?? "";
    d.apply({ type: "FormatText", id: b, start: 1, len: 1, attrs: { bold: true } });
    setText(d, p, "aaa", b);
    expect(spansOf(d, b)).toEqual([plain("a"), { text: "aa", attrs: { bold: true } }]);
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
    lineWidth: 1,
    snap: true,
    visible: true,
  });

  it("lineWidth (E1, Review Focus 1) : absent ou hors [1, 8] lu à 1, valeur brute gardée au save ; 2,5 gardé", () => {
    const base = { kind: "squares", spacingX: 40, spacingY: 40 };
    const levels = [base, { ...base, lineWidth: 0 }, { ...base, lineWidth: 9 }, { ...base, lineWidth: "2" }, { ...base, lineWidth: 2.5 }];
    const d = withGrid({ levels });
    expect(d.page(firstPage(d))?.grid?.levels.map((l) => l.lineWidth)).toEqual([1, 1, 1, 1, 2.5]);
    expect(saveJson(d).pages[0]?.["grid"]).toEqual({ levels });
  });

  it("gridLinesOf : rectangle de vue non fini → aucune ligne, même recoupé au cadre (T18, comme grid::lines)", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const g = { visible: true, snap: false, above: false, levels: [{ ...squares(40, 0), lineWidth: 3 }] };
    for (const r of [{ x0: 0, y0: 0, x1: Infinity, y1: 100 }, { x0: 0, y0: Number.NaN, x1: 100, y1: 100 }, { x0: -Infinity, y0: 0, x1: 100, y1: 100 }]) {
      expect(d.gridLinesOf(p, g, r, 4, 8)?.levels).toEqual([]);
    }
  });

  it("gridLinesOf (DAE1) : carreaux du brouillon, rien d'écrit ; page inconnue → null", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const g = { visible: true, snap: false, above: false, levels: [{ ...squares(40, 0), lineWidth: 3 }] };
    const v = d.version();
    const r = { x0: 0, y0: 0, x1: 100, y1: 100 };
    expect(d.gridLinesOf(p, g, r, 4, 8)?.levels.map((x) => [x.lineWidth, x.segments.length])).toEqual([[3, (3 + 3) * 4]]);
    expect(d.version()).toBe(v);
    expect(d.page(p)?.grid).toBeNull();
    expect(d.gridLinesOf("nulle-part", g, r, 4, 8)).toBeNull();
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
      { kind: "squares", spacingX: 40, spacingY: 20, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: true, visible: true },
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

  it("grille relue renvoyable telle quelle (G4) : niveau sans kind ou à kind vide écarté ; couleur et trait vides au défaut", () => {
    const d = withGrid({
      snap: true,
      levels: [
        { spacingX: 40, spacingY: 40 },
        { kind: "", spacingX: 40, spacingY: 40 },
        { kind: "squares", spacingX: 40, spacingY: 40, color: "", line: "" },
        { kind: "dots", spacingX: 20, spacingY: 20 },
      ],
    });
    const p = firstPage(d);
    const g = d.page(p)?.grid ?? null;
    expect(g?.levels).toEqual([squares(40, 0), { ...squares(20, 0), kind: "dots" }]);
    expect(() => d.apply({ type: "SetGrid", page: p, grid: g })).not.toThrow();
  });

  it("SetGrid écrit les dix champs d'un niveau, jamais une clé en trop (HG8)", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const level = { ...squares(40, 0), futur: 1 };
    d.apply({ type: "SetGrid", page: p, grid: { visible: true, snap: true, above: false, levels: [level] } });
    expect(saveJson(d).pages[0]?.["grid"]).toEqual({ visible: true, snap: true, above: false, levels: [squares(40, 0)] });
  });
});

describe("fakeCore — C10a (tableau)", () => {
  const saveJson = (d: CoreDocument): { pages: { elements: Record<string, unknown>[] }[] } =>
    JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: Record<string, unknown>[] }[] };

  it("chaque kind connu a une vue de son kind et une boîte (pendant de every_known_kind_has_view_and_geom, I3)", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const pen = { color: "#000000", width: 4 };
    const make: Readonly<Record<string, () => Command>> = {
      stroke: () => ({ type: "CommitStroke", page: p, points: new Float32Array([10, 10, 0.5, 60, 60, 0.5]), style: pen }),
      shape: () => ({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 50, y1: 40, style: pen, fill: null }),
      text: () => ({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "a", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }),
      image: () => ({ type: "AddImage", page: p, asset: { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 }, w: 64, h: 48, matrix: [1, 0, 0, 1, 0, 0] }),
      table: () => ({ type: "AddTable", page: p, x: 0, y: 0, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }),
      media: () => ({ type: "AddMedia", page: p, asset: { id: "cd".repeat(32), name: "a.webm", mime: "video/webm", size: 3 }, linked: null, mediaType: "video", w: 320, h: 180, duration: 2.5, poster: null, matrix: [1, 0, 0, 1, 0, 0] }),
      model3d: () => ({ type: "AddModel3d", page: p, asset: { id: "ef".repeat(32), name: "a.glb", mime: "model/gltf-binary", size: 3 }, format: "glb", files: [], w: 640, h: 480, yaw: Math.PI / 6, pitch: Math.PI / 9, snapshot: null, matrix: [1, 0, 0, 1, 0, 0] }),
    };
    for (const kind of KNOWN_KINDS) {
      // C8 (Q17) : la fausse liaison ne crée pas de `fill` (une zone y est le fond) ; il est couvert par « C8 : fill chargé ».
      if (kind === "fill") continue;
      const build = make[kind];
      if (build === undefined) throw new Error(`kind sans fabrique : ${kind}`);
      const id = d.apply(build()).ids[0] ?? "";
      expect(d.element(id)?.kind, kind).toBe(kind);
      expect(d.bounds([id]), kind).not.toBeNull();
    }
  });

  it("JSON : un tableau enregistré se relit à l'identique, cellules comprises", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const id = d.apply({ type: "AddTable", page: p, x: 10, y: 20, cols: 2, rows: 1, colWidth: 240, rowHeight: 64, color: "#1d4ed8", size: 36 }).ids[0] ?? "";
    const v = d.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    d.apply({ type: "SetTableCell", id, row: v.table.rows[0]?.id ?? "", col: v.table.cols[1]?.id ?? "", content: "B" });
    const r = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0"));
    expect(r.element(id)).toEqual(d.element(id));
    expect(saveJson(r).pages[0]?.elements[0]?.["kind"]).toBe("table");
  });

  it("JSON : un id de ligne contenant « : » est illisible comme dans le cœur (clé de cellule ambiguë) ; aucune lisible : inconnu", () => {
    const table = (cols: unknown[]) => ({
      cols,
      rows: [{ id: "r1", height: 64 }],
      cells: { "r1:c:1": { text: "A", fill: null }, "r1:c2": { text: "B", fill: null } },
    });
    const load = (cols: unknown[]) =>
      fakeCore.load(new TextEncoder().encode(JSON.stringify({ pages: [{ id: "p1", elements: [{ id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0], table: table(cols) }] }] })));
    const v = load([{ id: "c:1", width: 240 }, { id: "c2", width: 100 }]).element("t1");
    if (v?.kind !== "table") throw new Error(`tableau attendu : ${v?.kind ?? "absent"}`);
    expect(v.table.cols).toEqual([{ id: "c2", width: 100 }]);
    expect(v.table.cells).toEqual([{ row: "r1", col: "c2", text: "B", fill: null, shade: null, spans: [{ text: "B", attrs: {} }] }]);
    expect(load([{ id: "c:1", width: 240 }]).element("t1")?.kind).toBe("unknown");
  });

  it("JSON : tableau mal formé (aucune ligne) : cadre inconnu 100 × 100, réécrit tel quel", () => {
    const json = { pages: [{ id: "p1", elements: [{ id: "t1", kind: "table", transform: [1, 0, 0, 1, 10, 20], table: { cols: [{ id: "c1", width: 240 }], rows: [], cells: {} } }] }] };
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(json)));
    expect(d.element("t1")).toEqual({ id: "t1", kind: "unknown", transform: [1, 0, 0, 1, 10, 20], unknown: { sourceKind: "table", w: 100, h: 100 } });
    // Brut gardé (jamais perdu ni rendu invisible) : réécrit sous `raw.table`.
    expect(saveJson(d).pages[0]?.elements[0]?.["raw"]).toEqual({ table: json.pages[0]?.elements[0]?.table });
    const again = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0"));
    expect(again.element("t1")).toEqual(d.element("t1"));
    expect(saveJson(again)).toEqual(saveJson(d));
  });
});

describe("fakeCore — C10b (tableau)", () => {
  const loadJson = (table: unknown) =>
    fakeCore.load(new TextEncoder().encode(JSON.stringify({ pages: [{ id: "p1", elements: [{ id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0], table }] }] })));
  const lines = (ids: string[], key: "width" | "height") => ids.map((id) => ({ id, [key]: 100 }));

  it("JSON : span recoupant ou sans ligne : ignoré, gardé à l'enregistrement (F2, S5)", () => {
    const span = (r: string, c: string) => ({ text: "", fill: null, span: [r, c] });
    const d = loadJson({
      cols: lines(["c1", "c2", "c3"], "width"), rows: lines(["r1", "r2", "r3"], "height"),
      cells: { "r1:c1": { text: "A", fill: null, span: ["r2", "c2"] }, "r1:c2": span("r3", "c3"), "r2:c3": span("r9", "c3"), "r3:c2": span("r2", "c1"), "r3:c3": span("r3", "c3") },
    });
    const v = d.element("t1");
    if (v?.kind !== "table") throw new Error("tableau");
    expect(v.table.merges).toEqual([{ row: "r1", col: "c1", rows: 2, cols: 2 }]);
    const back = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0")).element("t1");
    expect(back).toEqual(v);
    // Constat T13 : les span ignorés restent tels quels dans le JSON ré-enregistré.
    type Saved = { pages: { elements: { table?: { cells?: Record<string, { span?: unknown }> } }[] }[] };
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as Saved;
    const cells = saved.pages[0]?.elements[0]?.table?.cells;
    expect(cells?.["r1:c2"]?.span).toEqual(["r3", "c3"]);
    expect(cells?.["r2:c3"]?.span).toEqual(["r9", "c3"]);
  });

  it("JSON : shade lu, invalide retiré (PC13) ; une cellule seulement ombrée est listée", () => {
    const d = loadJson({
      cols: lines(["c1", "c2"], "width"), rows: lines(["r1"], "height"),
      cells: { "r1:c1": { text: "", fill: null, shade: "#94a3b8" }, "r1:c2": { text: "B", fill: null, shade: true } },
    });
    const v = d.element("t1");
    if (v?.kind !== "table") throw new Error("tableau");
    expect(v.table.cells).toEqual([
      { row: "r1", col: "c1", text: "", fill: null, shade: "#94a3b8", spans: [{ text: "", attrs: {} }] },
      { row: "r1", col: "c2", text: "B", fill: null, shade: null, spans: [{ text: "B", attrs: {} }] },
    ]);
  });
});

describe("fakeCore — ImportTable (constat T13, mêmes cas que table.rs)", () => {
  type Imp = Extract<Command, { type: "ImportTable" }>;
  const imp = (d: CoreDocument, over: Partial<Imp> = {}): Imp => ({
    type: "ImportTable", page: firstPage(d), matrix: [1, 0, 0, 1, 0, 0], colWidth: 240, rowHeights: [64, 64], cols: 2,
    cells: ["", "", "", ""], merges: [], color: "#000000", size: 36, ...over,
  });
  const refusal = (f: () => unknown): string => {
    try {
      f();
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
    return "aucun refus";
  };

  it("F18 : ancre de zone vide : la fusion est dans la vue", () => {
    const d = fakeCore.blank();
    const id = d.apply(imp(d, { cells: ["", "caché", "a", "b"], merges: [[0, 0, 1, 2]] })).ids[0] ?? "";
    const v = d.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    expect(v.table.merges).toEqual([{ row: v.table.rows[0]?.id, col: v.table.cols[0]?.id, rows: 1, cols: 2 }]);
  });

  it("F18 : taille non positive, translation NaN, matrice hors f32 (1e39), boîte hors f32 : refus BadTable, rien d'écrit", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const badTable = refusal(() => d.apply(imp(d, { cells: ["", ""] })));
    expect(badTable).not.toBe("aucun refus");
    const cases: [string, Partial<Imp>][] = [
      ["taille nulle", { size: 0 }],
      ["taille négative", { size: -1 }],
      ["translation NaN", { matrix: [1, 0, 0, 1, Number.NaN, 0] }],
      ["matrice hors f32", { matrix: [1e39, 0, 0, 1, 0, 0] }],
      ["largeur hors f32", { colWidth: 2e38 }],
      ["hauteur hors f32", { rowHeights: [2e38, 2e38] }],
    ];
    for (const [what, over] of cases) expect(refusal(() => d.apply(imp(d, over))), what).toBe(badTable);
    expect(d.elementIds(p)).toEqual([]);
    expect(d.apply(imp(d)).ids).toHaveLength(1);
  });
});

describe("fakeCore — C7b (cellules riches, JSON)", () => {
  const load = (cells: unknown) =>
    fakeCore.load(new TextEncoder().encode(JSON.stringify({ pages: [{ id: "p1", elements: [{ id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0], table: { cols: [{ id: "c1", width: 240 }], rows: [{ id: "r1", height: 64 }], cells } }] }] })));
  const cellOf = (d: CoreDocument) => {
    const v = d.element("t1");
    if (v?.kind !== "table") throw new Error(`tableau attendu : ${v?.kind ?? "absent"}`);
    return v.table.cells[0];
  };

  it("JSON d'avant C7b : cellule sans spans → un segment sans attribut", () => {
    expect(cellOf(load({ "r1:c1": { text: "Lundi", fill: null } }))?.spans).toEqual([{ text: "Lundi", attrs: {} }]);
  });

  it("spans lisibles : normalisés ; illisibles (concaténation fausse, valeur hors domaine) : un segment", () => {
    expect(cellOf(load({ "r1:c1": { text: "ab", fill: null, spans: [{ text: "a", attrs: { bold: true } }, { text: "b", attrs: { bold: true } }] } }))?.spans).toEqual([{ text: "ab", attrs: { bold: true } }]);
    expect(cellOf(load({ "r1:c1": { text: "ab", fill: null, spans: [{ text: "a", attrs: {} }] } }))?.spans).toEqual([{ text: "ab", attrs: {} }]);
    expect(cellOf(load({ "r1:c1": { text: "ab", fill: null, spans: [{ text: "ab", attrs: { size: 0 } }] } }))?.spans).toEqual([{ text: "ab", attrs: {} }]);
  });
});

describe("fakeCore — C6a (fond de page)", () => {
  const json = (pages: unknown[]): Uint8Array => new TextEncoder().encode(JSON.stringify({ pages }));

  it("le fond est écrit dans le JSON et relu", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#bfdbfe" });
    const back = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0"));
    expect(back.page(p)?.background).toBe("#bfdbfe");
  });

  it("JSON sans fond ou au fond illisible : #ffffff (PC13)", () => {
    const d = fakeCore.load(json([{ id: "a", elements: [] }, { id: "b", elements: [], background: 42 }, { id: "c", elements: [], background: "#12" }]));
    expect(["a", "b", "c"].map((id) => d.page(id)?.background)).toEqual(["#ffffff", "#ffffff", "#ffffff"]);
  });
});

describe("fakeCore — C3", () => {
  const json = (v: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(v));
  it("JSON d'un kind inconnu : refusé comme le cœur ; d'un fragment ouvert comme document : refusé", () => {
    const hologram = json({ kind: "hologram", pages: [] });
    expect(() => fakeCore.load(hologram)).toThrow("type de fichier RoomBoard inconnu (« hologram ») : pris en charge dans une prochaine version");
    expect(() => fakeCore.loadFragment(hologram)).toThrow("(« hologram »)");
  });
  // Discrimine (décision de contre-relecture) : le kind se lit à l'ouverture, avant le contenu ; un fichier d'un type à
  // venir n'a pas à porter `pages`. Contrôler `pages` d'abord rendrait « ce fichier n'est pas un document RoomBoard ».
  it("kind inconnu refusé à l'ouverture, avant le contenu (fichier sans pages)", () => {
    const hologram = json({ kind: "hologram", levels: [] });
    expect(() => fakeCore.load(hologram)).toThrow("type de fichier RoomBoard inconnu (« hologram »)");
    expect(() => fakeCore.loadFragment(hologram)).toThrow("type de fichier RoomBoard inconnu (« hologram »)");
    expect(() => fakeCore.loadParts(json({ format: "roomboard-fake" }), hologram)).toThrow("(« hologram »)");
    expect(() => fakeCore.load(json({ foo: 1 }))).toThrow("ce fichier n'est pas un document RoomBoard");
  });
  it("group illisible dans le JSON : retiré (PC6), l'élément reste", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    d.apply({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 4 }, fill: null });
    const saved = JSON.parse(new TextDecoder().decode(d.save("n", "v"))) as { pages: { elements: Record<string, unknown>[] }[] };
    saved.pages[0]!.elements[0]!["group"] = [1];
    const back = fakeCore.load(json(saved));
    const id = back.elementIds(back.pageIds()[0]!)[0]!;
    expect(back.element(id)).not.toHaveProperty("group");
  });
  it("image mal formée : son group est chargé (membre du groupe), gardé à l'enregistrement et mis à jour par Group", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const style = { color: "#000000", width: 4 };
    d.apply({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style, fill: null });
    d.apply({ type: "AddShape", page: p, shape: "rect", x0: 50, y0: 0, x1: 60, y1: 10, style, fill: null });
    d.apply({ type: "AddShape", page: p, shape: "rect", x0: 100, y0: 0, x1: 110, y1: 10, style, fill: null });
    const saved = JSON.parse(new TextDecoder().decode(d.save("n", "v"))) as { pages: { elements: Record<string, unknown>[] }[] };
    const els = saved.pages[0]!.elements;
    els[0]!["group"] = ["g1"];
    els.push({ id: "bad", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: "pas-un-asset" }, group: ["g1"] });
    const back = fakeCore.load(json(saved));
    const [a, b] = back.elementIds(back.pageIds()[0]!);
    back.apply({ type: "Group", ids: [a!, b!] }); // a (g1) vaut tout g1 : le membre mal formé suit
    const again = JSON.parse(new TextDecoder().decode(back.save("n", "v"))) as { pages: { elements: Record<string, unknown>[] }[] };
    const bad = again.pages[0]!.elements.find((e) => e["id"] === "bad");
    expect((bad?.["group"] as string[]).length).toBe(2);
  });
  it("source d'une autre liaison : erreur", () => {
    const d = fakeCore.blank();
    const other = { ...fakeCore.blank() } as unknown as CoreDocument;
    expect(() => d.insertFragment(other, d.pageIds()[0]!, 0, 0)).toThrow("source d'une autre liaison : insertion impossible");
    expect(() => d.insertPages(other, d.pageIds()[0]!)).toThrow("source d'une autre liaison : insertion impossible");
  });
});

describe("fakeCore — C12 (PDF)", () => {
  it("JSON : page illisible (1.5, -1, chaîne) → null, valeur gardée à l'enregistrement (K9, Review Focus 5)", () => {
    const a = "ef".repeat(32);
    for (const bad of [1.5, -1, "2"]) {
      const json = { kind: "document", pages: [{ id: "p", elements: [], backdrop: { asset: a, kind: "pdf-page", page: bad, w: 612, h: 792, fit: "width" } }], assets: {} };
      const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(json)));
      expect(d.page("p")?.backdrop?.page, String(bad)).toBeNull();
      const again = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { backdrop: { page: unknown } }[] };
      expect(again.pages[0]?.backdrop.page).toEqual(bad);
    }
  });
});

// C8 (Q11, Q13, Q14, Q17) : élément `fill` lu, dessiné, touché, recoloré et sauvegardé ; `Fill zone` = fond.
const fillFile = (fill: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify({
    now: "2026-11-21T00:00:00Z",
    appVersion: "0.1.0",
    assets: {},
    pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements: [{ id: "f1", kind: "fill", transform: [1, 0, 0, 1, 100, 100], fill }] }],
  }));
const SQUARE = { color: "#facc15", w: 400, h: 400, contours: [[0, 0, 400, 0, 400, 400, 0, 400], [150, 150, 150, 170, 170, 170, 170, 150]] };

describe("fakeCore — C8 (zone fermée)", () => {
  it("C8 : Fill zone = fond (second écart D36) ; tol non fini ou ≤ 0 refusé", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const c = d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 1, y: 2, tol: 2 }, color: "#1d4ed8" });
    expect(c.ids).toEqual([]);
    expect(d.page(p)?.background).toBe("#1d4ed8");
    for (const tol of [0, -1, Number.NaN]) {
      expect(() => d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 1, y: 2, tol }, color: "#1d4ed8" })).toThrow("remplissage invalide");
    }
    expect(d.zoneCells(p, 2)).toBe(0);
  });

  it("C8 : fill chargé : vue, anneaux, touché loin des bords, recoloré, sauvé à l'identique", () => {
    const d = fakeCore.load(fillFile(SQUARE));
    expect(KNOWN_KINDS.has("fill")).toBe(true);
    expect(d.element("f1")).toEqual({ id: "f1", kind: "fill", transform: [1, 0, 0, 1, 100, 100], fill: { color: "#facc15", w: 400, h: 400 } });
    expect(Array.from(d.fillRings("f1") ?? [])).toEqual([4, 0, 0, 400, 0, 400, 400, 0, 400, 4, 150, 150, 150, 170, 170, 170, 170, 150]);
    expect(d.hitTest("p1", 300, 300, 6)).toBe("f1");
    expect(d.hitTest("p1", 103, 300, 6)).toBeNull();
    expect(d.hitTest("p1", 260, 260, 6)).toBeNull();
    expect(d.bounds(["f1"])).toEqual({ x0: 100, y0: 100, x1: 500, y1: 500 });
    const c = d.apply({ type: "Fill", page: "p1", target: { kind: "inside", id: "f1" }, color: "#dc2626" });
    expect(c.ids).toEqual(["f1"]);
    const v = d.version();
    d.apply({ type: "Fill", page: "p1", target: { kind: "inside", id: "f1" }, color: null });
    expect(d.version()).toBe(v);
    const r = fakeCore.load(d.save("2026-11-21T00:00:00Z", "0.1.0"));
    expect(r.element("f1")).toEqual(d.element("f1"));
    expect(r.fillRings("f1")).toEqual(d.fillRings("f1"));
  });

  it("C8 : fill mal formé : cadre inconnu de sa boîte, réécrit tel quel", () => {
    const bad = { color: "#facc15", w: 300, h: 200, contours: [[0, 0, 1]] };
    const d = fakeCore.load(fillFile(bad));
    expect(d.element("f1")).toEqual({ id: "f1", kind: "unknown", transform: [1, 0, 0, 1, 100, 100], unknown: { sourceKind: "fill", w: 300, h: 200 } });
    expect(d.fillRings("f1")).toBeNull();
    const again = fakeCore.load(d.save("2026-11-21T00:00:00Z", "0.1.0"));
    expect(again.element("f1")).toEqual(d.element("f1"));
  });
});

describe("C4 : grille en ressource (faux cœur)", () => {
  const grid = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#7aa7d8", line: "solid", lineWidth: 1, snap: false, visible: true }] };
  const gridDoc = () => {
    const d = fakeCore.blank();
    d.apply({ type: "SetGrid", page: d.pageIds()[0]!, grid });
    return d;
  };

  it("C4 : saveGrid puis loadGrid rend la grille", () => {
    const bytes = gridDoc().saveGrid("2026-11-21T08:00:00Z", "c4", "Seyès");
    const g = fakeCore.loadGrid(bytes);
    expect(g.page(g.pageIds()[0]!)?.grid).toEqual(grid);
  });

  it("C11 : saveGrid d'un document de deux pages : refus « grille de 2 pages »", () => {
    const saved = JSON.parse(new TextDecoder().decode(fakeCore.blank().save("n", "a"))) as { pages: { id: string }[] };
    saved.pages = [saved.pages[0]!, { ...saved.pages[0]!, id: "p-deux" }];
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(saved)));
    expect(d.pageIds()).toHaveLength(2);
    expect(() => d.saveGrid("n", "a", "G")).toThrow("grille de 2 pages : une seule attendue");
  });

  it("C4 : containerKind et manifestKind", () => {
    const d = gridDoc();
    expect(fakeCore.containerKind(d.saveGrid("n", "a", "G"))).toBe("grid");
    expect(fakeCore.containerKind(fakeCore.blank().save("n", "a"))).toBe("document");
    expect(fakeCore.containerKind(fakeCore.blank().saveFragment("n", "a", "x"))).toBe("fragment");
    expect(fakeCore.manifestKind(d.saveGridParts("n", "a", "G")[0])).toBe("grid");
    expect(() => fakeCore.manifestKind(new TextEncoder().encode('{"kind":"pack"}'))).toThrow(PACK_MESSAGE);
    expect(() => fakeCore.manifestKind(new TextEncoder().encode('{"kind":"hologram"}'))).toThrow(unknownKindMessage("hologram"));
  });

  it("C4 : une grille lue comme objet ou document : message de la grille", () => {
    const bytes = gridDoc().saveGrid("n", "a", "G");
    expect(() => fakeCore.loadFragment(bytes)).toThrow(IS_A_GRID_MESSAGE);
    expect(() => fakeCore.load(bytes)).toThrow(IS_A_GRID_MESSAGE);
  });

  it("C4 : messages d'avant C4 inchangés", () => {
    expect(() => fakeCore.load(fakeCore.blank().saveFragment("n", "a", "x"))).toThrow(NOT_A_DOCUMENT_MESSAGE);
    expect(() => fakeCore.loadFragment(fakeCore.blank().save("n", "a"))).toThrow(NOT_A_FRAGMENT_MESSAGE);
    expect(() => fakeCore.loadGrid(fakeCore.blank().save("n", "a"))).toThrow(NOT_A_FRAGMENT_MESSAGE);
    expect(wrongKindMessage("fragment")).toBe(NOT_A_DOCUMENT_MESSAGE);
    expect(wrongKindMessage("document")).toBe(NOT_A_FRAGMENT_MESSAGE);
    expect(wrongKindMessage("grid")).toBe(IS_A_GRID_MESSAGE);
  });
});

// OG11 (T4) : la fausse liaison suit `style.rs` (plan vide : aucune étape), pas le chemin propre de Fill.
describe("fausse liaison : SetStyle (OG11)", () => {
  const rectOf = (d: CoreDocument, page: string): string =>
    d.apply({ type: "AddShape", page, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style, fill: null }).ids[0] ?? "";

  it("SetStyle sans changement : aucune étape, l'annulation retire la création", () => {
    const d = fakeCore.blank();
    const page = d.pageIds()[0] ?? "";
    const id = rectOf(d, page);
    const v = d.version();
    expect(d.apply({ type: "SetStyle", ids: [id], patch: { opacity: 100, strokeStyle: null, roughness: 0 } }).ids).toEqual([]);
    expect(d.apply({ type: "SetStyle", ids: [id], patch: { color: "#000000", width: 4, fill: null } }).ids).toEqual([]);
    expect(d.version()).toBe(v);
    d.undo();
    expect(d.element(id)).toBeNull();
    expect(d.canUndo()).toBe(false);
  });

  it("look gardé par extract et insertFragment (Dupliquer)", () => {
    const d = fakeCore.blank();
    const page = d.pageIds()[0] ?? "";
    const id = rectOf(d, page);
    d.apply({ type: "SetStyle", ids: [id], patch: { strokeStyle: "dotted", opacity: 30 } });
    const c = d.insertFragment(d.extract(page, [id]), page, 10, 10);
    const copy = c.ids[0] ?? "";
    expect(copy).not.toBe(id);
    expect(d.element(copy)?.look).toEqual({ strokeStyle: "dotted", opacity: 30 });
  });

  it("créations : look assaini comme `Look::sanitized` (champ hors domaine lu neutre, graine sans tracé retirée)", () => {
    const d = fakeCore.blank();
    const page = d.pageIds()[0] ?? "";
    const look = { strokeStyle: "wavy", roundness: "sharp", seed: 7, opacity: 100 } as unknown as import("./api").Look;
    const id = d.apply({ type: "AddShape", page, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style, fill: null, look }).ids[0] ?? "";
    expect(d.element(id)?.look).toBeUndefined();
  });
});

describe("fakeCore — personnalisation-1a (mode de page, MovePage, DuplicatePage, grille au cadre)", () => {
  const PORTRAIT = (1920 * 16) / 9;
  const squaresGrid = (step: number): GridInput => ({
    visible: true,
    snap: true,
    above: false,
    levels: [{ kind: "squares", spacingX: step, spacingY: step, originX: 0, originY: 0, color: "#cccccc", line: "solid", lineWidth: 1, snap: true, visible: true }],
  });
  const setMode = (d: CoreDocument, page: string, mode: PageLayout) => d.apply({ type: "SetPageMode", page, mode });
  /** Pages `n` d'un document neuf, dans l'ordre. */
  const pages = (n: number): { d: CoreDocument; ids: string[] } => {
    const d = fakeCore.blank();
    for (let i = 1; i < n; i++) d.apply({ type: "AddPage", after: d.pageIds()[i - 1] ?? null });
    return { d, ids: d.pageIds() };
  };
  const reload = (d: CoreDocument, edit: (page: Record<string, unknown>) => void): CoreDocument => {
    const raw = JSON.parse(new TextDecoder().decode(d.save("2026-11-27T00:00:00Z", "test"))) as { pages: Record<string, unknown>[] };
    const first = raw.pages[0];
    if (first === undefined) throw new Error("aucune page");
    edit(first);
    return fakeCore.load(new TextEncoder().encode(JSON.stringify(raw)));
  };

  it("SetPageMode portrait puis undo : une étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    expect(d.page(p)).toMatchObject({ mode: "page", width: 1920, height: 1080 });
    const c = setMode(d, p, "portrait");
    expect(c.pages).toEqual([p]);
    expect(c.version).toBe(1);
    expect(d.page(p)).toMatchObject({ mode: "page", height: PORTRAIT });
    d.undo();
    expect(d.page(p)).toMatchObject({ mode: "page", height: 1080 });
    expect(d.canUndo()).toBe(false);
  });

  it("SetPageMode même valeur : aucune étape (D38)", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const c = setMode(d, p, "landscape");
    expect(c).toEqual({ pages: [], ids: [], removed: [], full: false, version: 0 });
    setMode(d, p, "infinite");
    expect(setMode(d, p, "infinite").version).toBe(1);
    expect(d.canUndo()).toBe(true);
  });

  it("SetPageMode infini garde height ; retour en Page : hauteur écrite", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    setMode(d, p, "portrait");
    setMode(d, p, "infinite");
    expect(d.page(p)).toMatchObject({ mode: "infinite", height: PORTRAIT });
    setMode(d, p, "landscape");
    expect(d.page(p)).toMatchObject({ mode: "page", height: 1080 });
  });

  it("SetPageMode : valeur inconnue lue Page et gardée (U3) ; disposition illisible refusée", () => {
    const d = reload(fakeCore.blank(), (page) => { page["mode"] = "frame"; });
    const p = firstPage(d);
    expect(d.page(p)?.mode).toBe("page");
    setMode(d, p, "portrait");
    expect(d.page(p)).toMatchObject({ mode: "page", height: PORTRAIT });
    const raw = JSON.parse(new TextDecoder().decode(d.save("2026-11-27T00:00:00Z", "test"))) as { pages: Record<string, unknown>[] };
    expect(raw.pages[0]?.["mode"]).toBe("frame");
    expect(() => setMode(d, p, "a4" as PageLayout)).toThrow("mode de page inconnu : a4");
    expect(() => d.apply({ type: "AddPage", after: null, mode: "a4" as PageLayout })).toThrow("mode de page inconnu : a4");
    expect(() => setMode(d, "nulle-part", "portrait")).toThrow("page inconnue : nulle-part");
  });

  it("MovePage garde les ids ; hors bornes refusé ; même rang : aucune étape", () => {
    const { d, ids } = pages(3);
    const [a, b, c] = ids as [string, string, string];
    const s = commit(d, a, 10);
    const ch = d.apply({ type: "MovePage", page: a, to: 2 });
    expect(ch.pages).toEqual([a]);
    expect(d.pageIds()).toEqual([b, c, a]);
    expect(d.elementIds(a)).toEqual([s]);
    d.undo();
    expect(d.pageIds()).toEqual([a, b, c]);
    const v = d.version();
    expect(() => d.apply({ type: "MovePage", page: a, to: 3 })).toThrow("rang de page hors bornes");
    expect(() => d.apply({ type: "MovePage", page: "nulle-part", to: 0 })).toThrow("page inconnue : nulle-part");
    expect(d.apply({ type: "MovePage", page: b, to: 1 }).version).toBe(v);
    expect(d.version()).toBe(v);
  });

  it("DuplicatePage : ids neufs, copie juste après, Change.ids = éléments copiés", () => {
    const { d, ids } = pages(2);
    const [p, q] = ids as [string, string];
    const s1 = commit(d, p, 10);
    const s2 = commit(d, p, 40);
    setMode(d, p, "infinite");
    const before = d.version();
    const ch = d.apply({ type: "DuplicatePage", page: p });
    const [copy] = ch.pages;
    if (copy === undefined) throw new Error("aucune copie");
    expect(ch.pages).toHaveLength(1);
    expect(d.pageIds()).toEqual([p, copy, q]);
    expect(copy).not.toBe(p);
    const copied = d.elementIds(copy);
    expect(copied).toHaveLength(2);
    expect(copied.some((id) => id === s1 || id === s2)).toBe(false);
    expect(ch.ids).toEqual(copied);
    expect(d.page(copy)).toMatchObject({ mode: "infinite", height: 1080 });
    expect(ch.version).toBe(before + 1);
    d.undo();
    expect(d.pageIds()).toEqual([p, q]);
    expect(() => d.apply({ type: "DuplicatePage", page: "nulle-part" })).toThrow("page inconnue : nulle-part");
  });

  /** Quatre traits sur la première page d'un document neuf, du bas vers le haut de la pile. */
  const four = (): { d: CoreDocument; p: string; ids: [string, string, string, string] } => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    return { d, p, ids: [100, 200, 300, 400].map((y) => commit(d, p, y)) as [string, string, string, string] };
  };

  // Discrimine le patron écarté (recopie à ids neufs, groupe renuméroté, posée en haut) : ids, groupe et ordre relatif
  // gardés, `to` = rang du bas du bloc.
  it("Restack : bloc au premier plan, ids et groupe gardés, une étape", () => {
    const { d, p, ids } = four();
    const [a, b, c, e] = ids;
    d.apply({ type: "Group", ids: [a, c] });
    const views = [a, c].map((id) => d.element(id));
    const ch = d.apply({ type: "Restack", ids: [c, a], to: 2 });
    expect(d.elementIds(p)).toEqual([b, e, a, c]);
    expect([a, c].map((id) => d.element(id))).toEqual(views);
    expect(ch.pages).toEqual([p]);
    expect(ch.ids).toEqual([a, c]);
    expect(ch.removed).toEqual([]);
    d.undo();
    expect(d.elementIds(p)).toEqual([a, b, c, e]);
    d.redo();
    expect(d.elementIds(p)).toEqual([b, e, a, c]);
  });

  it("Restack : arrière-plan, bloc à trou ; même ordre : aucune étape", () => {
    const { d, p, ids } = four();
    const [a, b, c, e] = ids;
    d.apply({ type: "Restack", ids: [e, b], to: 0 });
    expect(d.elementIds(p)).toEqual([b, e, a, c]);
    d.apply({ type: "Restack", ids: [a], to: 1 });
    expect(d.elementIds(p)).toEqual([b, a, e, c]);
    const v = d.version();
    expect(d.apply({ type: "Restack", ids: [a, e, e], to: 1 }).version).toBe(v);
    expect(d.version()).toBe(v);
    d.apply({ type: "Restack", ids: [b, e], to: 0 });
    expect(d.elementIds(p)).toEqual([b, e, a, c]);
  });

  it("Restack : pages mêlées, hors bornes, vide ou inconnu refusés sans étape", () => {
    const { d, p, ids } = four();
    const [a, b] = ids;
    const q = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    const x = commit(d, q, 100);
    const v = d.version();
    expect(() => d.apply({ type: "Restack", ids: [a, x], to: 0 })).toThrow("objets de pages différentes");
    expect(() => d.apply({ type: "Restack", ids: [a, b], to: 3 })).toThrow("rang de page hors bornes");
    expect(() => d.apply({ type: "Restack", ids: [a], to: -1 })).toThrow("rang de page hors bornes");
    expect(() => d.apply({ type: "Restack", ids: [], to: 0 })).toThrow("rang de page hors bornes");
    expect(() => d.apply({ type: "Restack", ids: [a, "absent"], to: 0 })).toThrow("élément inconnu : absent");
    expect(d.version()).toBe(v);
    expect(d.elementIds(p)).toEqual(ids);
  });

  it("AddPage mode infinite (et portrait) ; sans mode : Paysage", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const inf = d.apply({ type: "AddPage", after: p, mode: "infinite" }).pages[0] ?? "";
    expect(d.page(inf)).toMatchObject({ mode: "infinite", height: 1080 });
    const por = d.apply({ type: "AddPage", after: inf, mode: "portrait" }).pages[0] ?? "";
    expect(d.page(por)).toMatchObject({ mode: "page", height: PORTRAIT });
    const plain = d.apply({ type: "AddPage", after: null }).pages[0] ?? "";
    expect(d.page(plain)).toMatchObject({ mode: "page", height: 1080 });
    expect(d.pageIds()).toEqual([p, inf, por, plain]);
  });

  it("blank(mode) : première page à la disposition demandée", () => {
    const d = fakeCore.blank("portrait");
    expect(d.page(firstPage(d))).toMatchObject({ mode: "page", height: PORTRAIT });
    const e = fakeCore.blank("infinite");
    expect(d.canUndo() || e.canUndo()).toBe(false);
    expect(e.page(firstPage(e))).toMatchObject({ mode: "infinite", height: 1080 });
  });

  it("page() rend mode et height lus, et la sauvegarde les réécrit", () => {
    const d = reload(fakeCore.blank(), (page) => { page["mode"] = "infinite"; page["height"] = 2000; });
    const p = firstPage(d);
    expect(d.page(p)).toMatchObject({ mode: "infinite", height: 2000, width: 1920 });
    const again = reload(d, () => undefined);
    expect(again.page(firstPage(again))).toMatchObject({ mode: "infinite", height: 2000 });
  });

  it("grille : page bornée au cadre, infini sans borne (lignes à x < 0) ; accroche à (-500, -500) en infini", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    d.apply({ type: "SetGrid", page: p, grid: squaresGrid(100) });
    const wide = { x0: -1000, y0: -1000, x1: 5000, y1: 5000 };
    /** Segments [x0, y0, x1, y1] du seul niveau. */
    const segs = (): number[][] => {
      const s = d.gridLines(p, wide, 4, 8)?.levels[0]?.segments ?? [];
      const out: number[][] = [];
      for (let i = 0; i < s.length; i += 4) out.push(s.slice(i, i + 4));
      return out;
    };
    const ys = (): number[] => segs().flatMap((g) => [g[1] ?? 0, g[3] ?? 0]);
    const xs = (): number[] => segs().flatMap((g) => [g[0] ?? 0, g[2] ?? 0]);
    // Paysage : cadre (0, 0) → (1920, 1080), rien au-dessous.
    expect(Math.max(...ys())).toBe(1080);
    expect(Math.min(...ys())).toBe(0);
    expect(Math.min(...xs())).toBe(0);
    expect(Math.max(...xs())).toBe(1920);
    expect(d.snapPoint(p, 500, 1250)).toEqual([500, 1000]);
    // Portrait : le bas du cadre suit la hauteur lue, pas PAGE_HEIGHT.
    setMode(d, p, "portrait");
    expect(Math.max(...ys())).toBeCloseTo(PORTRAIT, 6);
    expect(d.snapPoint(p, 500, 3600)).toEqual([500, 3400]);
    // Infini : aucune borne, lignes à x < 0 et au-delà de la largeur.
    setMode(d, p, "infinite");
    expect(Math.min(...xs())).toBe(-1000);
    expect(Math.max(...xs())).toBe(5000);
    expect(Math.min(...ys())).toBe(-1000);
    expect(d.snapPoint(p, -480, -520)).toEqual([-500, -500]);
    expect(d.snapPoint(p, 2510, 4020)).toEqual([2500, 4000]);
    expect(d.gridLinesOf(p, squaresGrid(100), wide, 4, 8)?.levels[0]?.segments.some((v, i) => i % 2 === 0 && v < 0)).toBe(true);
  });
});
