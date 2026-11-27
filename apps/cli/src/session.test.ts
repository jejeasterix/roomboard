import { beforeAll, expect, it } from "vitest";
import { CliError } from "./contract";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, warmModules, type Json } from "./testing";

const rect = (page: string) => ({ type: "AddShape", page, shape: "rect", x0: 10, y0: 20, x1: 110, y1: 220, style: { color: "#1e40af", width: 4 }, fill: null });
const fresh = async () => {
  const s = await nodeSession(memoryIO());
  s.newTab();
  return s;
};

describeWasm("session (D5, D6, D7, DA4)", () => {
  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test
  it("D11 (cli-partage) — warmModules : cœur et module des formats chargés, rend undefined", async () => {
    await expect(warmModules()).resolves.toBeUndefined();
  });

  it("undo sans rien à annuler : change nul ; après une forme, annule puis l'état le dit", async () => {
    const s = await fresh();
    expect(await s.exec('{"op":"undo"}')).toEqual({ op: 1, ok: true, change: null });
    await s.exec(JSON.stringify(rect("$page:0")));
    const undone: Json = await s.exec('{"op":"undo"}');
    expect(undone.change).not.toBeNull();
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state).toMatchObject({ schema: "roomboard-cli/1", file: null, canUndo: false, canRedo: true });
    expect(st.state.pages[0].elements).toEqual([]);
  });
  it("AddPage : $n vise la page créée", async () => {
    const s = await fresh();
    const added: Json = await s.exec('{"type":"AddPage","after":"$page:0"}');
    const shape: Json = await s.exec(JSON.stringify(rect("$1")));
    expect(shape.change.pages).toEqual(added.change.pages);
  });
  it("SetPageMode, MovePage, DuplicatePage (T7, D15) : une étape par commande ; refus code 1 ; $n après DuplicatePage = éléments, $page:i = copie", async () => {
    const s = await fresh();
    // Vue de page du cœur de chaque entrée de state (`{ index, page, elements }`, DA4), avec ses éléments.
    const pagesOf = async (): Promise<Json[]> =>
      ((await s.exec('{"op":"state"}')) as Json).state.pages.map((p: Json) => ({ ...p.page, elements: p.elements }));
    await s.exec(JSON.stringify(rect("$page:0")));
    await s.exec(JSON.stringify(rect("$page:0")));
    const [p0] = await pagesOf();
    await s.exec('{"type":"SetPageMode","page":"$page:0","mode":"portrait"}');
    const [portrait] = await pagesOf();
    expect(portrait.mode).toBe("page");
    expect(portrait.height).toBeCloseTo(3413.33, 2);
    await s.exec('{"op":"undo"}');
    expect((await pagesOf())[0].height).toBe(p0.height);
    const dup: Json = await s.exec('{"type":"DuplicatePage","page":"$page:0"}');
    const [orig, copy] = await pagesOf();
    expect([orig.id, copy?.elements.length]).toEqual([p0.id, 2]);
    // $n : les éléments copiés (page non vide), jamais la page ; la copie se lit par $page:1 (rang d'origine + 1).
    await s.exec(JSON.stringify({ type: "Delete", ids: [`$${dup.op}.1`] }));
    await s.exec('{"type":"SetPageMode","page":"$page:1","mode":"infinite"}');
    const [o2, c2] = await pagesOf();
    expect([o2.elements.length, c2.elements.length, o2.mode, c2.mode]).toEqual([2, 1, "page", "infinite"]);
    await s.exec('{"type":"MovePage","page":"$page:1","to":0}');
    expect((await pagesOf()).map((p) => p.id)).toEqual([c2.id, o2.id]);
    await s.exec('{"op":"undo"}');
    expect((await pagesOf()).map((p) => p.id)).toEqual([o2.id, c2.id]);
    for (const bad of ['{"type":"MovePage","page":"$page:0","to":99}', '{"type":"SetPageMode","page":"$page:0","mode":"a4"}']) {
      const err: unknown = await s.exec(bad).catch((e: unknown) => e);
      expect(err, bad).toBeInstanceOf(CliError);
      expect((err as CliError).exit, bad).toBe(1);
    }
  });
  it("refus du cœur : CliError command avec le message du cœur", async () => {
    const s = await fresh();
    await expect(s.exec('{"type":"RemovePage","page":"$page:0"}')).rejects.toMatchObject({ code: "command", message: "la dernière page ne se supprime pas" });
  });
  it("commande mal formée (style absent) : CliError, jamais une exception brute", async () => {
    const s = await fresh();
    const err: unknown = await s.exec('{"type":"AddShape","page":"$page:0","shape":"rect","x0":0,"y0":0,"x1":1,"y1":1}').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CliError);
    expect((err as CliError).exit).toBe(1);
  });
  it("onglets t1…t12 déterministes, 13e refusé, tab.select, tab.close, onglet inconnu", async () => {
    const s = await fresh();
    for (let i = 2; i <= 12; i++) await s.exec('{"op":"tab.new"}');
    await expect(s.exec('{"op":"tab.new"}')).rejects.toMatchObject({ code: "command", message: "12 onglets au plus ; fermez-en un" });
    const sel: Json = await s.exec('{"op":"tab.select","tab":"t3"}');
    expect(sel.tabs.find((t: Json) => t.active).id).toBe("t3");
    const closed: Json = await s.exec('{"op":"tab.close","tab":"$tab:2"}');
    expect(closed.tabs.map((t: Json) => t.id)).not.toContain("t3");
    expect(closed.tabs.find((t: Json) => t.active).id).toBe("t2");
    await expect(s.exec('{"op":"tab.select","tab":"t99"}')).rejects.toMatchObject({ code: "command" });
  });
  it("state : --points sur les traits seulement, --page filtre, page inconnue refusée", async () => {
    const s = await fresh();
    await s.exec(JSON.stringify(rect("$page:0")));
    await s.exec(JSON.stringify({ type: "CommitStroke", page: "$page:0", points: [0, 0, 0.5, 50, 50, 0.5], style: { color: "#dc2626", width: 4 } }));
    await s.exec('{"type":"AddPage","after":"$page:0"}');
    const st: Json = await s.exec('{"op":"state","page":"$page:0","points":true}');
    expect(st.state.pages).toHaveLength(1);
    const [shape, stroke] = st.state.pages[0].elements;
    expect(shape.points).toBeUndefined();
    expect(stroke.points).toHaveLength(6);
    await expect(s.exec('{"op":"state","page":"inconnue"}')).rejects.toMatchObject({ code: "command" });
  });
  it("state rend les vues du cœur telles quelles (DA4) : element, page, citedAssets ; seul points s'ajoute aux traits", async () => {
    // Discrimine le patron écarté : une vue recomposée champ par champ (renommée, filtrée, arrondie) diffère ici de
    // doc.element / doc.page (transformation fractionnaire, remplissage, texte et ses spans, fond et grille de page).
    const s = await fresh();
    await s.exec(JSON.stringify({ ...rect("$page:0"), fill: "#fde68a" }));
    await s.exec(JSON.stringify({ type: "SetText", page: "$page:0", id: null, x: 300, y: 300, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }));
    await s.exec(JSON.stringify({ type: "CommitStroke", page: "$page:0", points: [0.25, 0.5, 0.5, 50.75, 50.125, 0.5], style: { color: "#dc2626", width: 4 } }));
    await s.exec(JSON.stringify({ type: "Transform", ids: ["$1"], matrix: [1, 0, 0, 1, 0.375, -0.125] }));
    const st: Json = await s.exec('{"op":"state","points":true}');
    const doc = s.active().doc;
    const ids = doc.pageIds();
    expect(ids).toHaveLength(1);
    const pid = ids[0] as string;
    const expected = doc.elementIds(pid).map((id) => {
      const view = doc.element(id);
      return view?.kind === "stroke" ? { ...view, points: Array.from(doc.points(id) ?? []) } : view;
    });
    expect(st.state.pages).toStrictEqual([{ index: 0, page: doc.page(pid), elements: expected }]);
    expect(st.state.assets).toStrictEqual(doc.citedAssets());
    expect(st.state.pages[0].elements.map((e: Json) => e.kind)).toEqual(["shape", "text", "stroke"]);
    expect(st.state.pages[0].elements[0].transform).toEqual([1, 0, 0, 1, 10.375, 19.875]);
  });
});

describeWasm("session : commande du cœur incomplète", () => {
  it("le message nomme l'opération et dit « champ manquant ou mal formé », jamais le message JS brut seul ; code 1", async () => {
    const s = await fresh();
    const err: unknown = await s.exec('{"type":"AddShape","page":"$page:0","shape":"rect","x0":0,"y0":0,"x1":1,"y1":1}').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CliError);
    expect(err).toMatchObject({ code: "command" });
    expect((err as CliError).message).toMatch(/^AddShape : champ manquant ou mal formé/);
  });
});
