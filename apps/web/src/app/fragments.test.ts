// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { createContainerIO } from "./container-io";
import { createFragmentOps, MISSING_ITEMS_MESSAGE, SELECTION_NAME, TAB_GONE_MESSAGE, UNREAD_ITEMS_MESSAGE } from "./fragments";
import type { TabSession } from "./workspace";

const ID = "ab".repeat(32);
const NOW = "2026-11-20T00:00:00Z";

/** Conteneur de test : écrit en mémoire ; tout octet qui n'en vient pas = module absent (repli par le cœur seul). */
function memoryCodec(): ContainerCodec {
  const store = new Map<number, ContainerContents>();
  let n = 0;
  return {
    async write(manifest, ybin, assets) {
      store.set(++n, { manifest, ybin, assets: assets.map((a) => [a.id, a.blob] as const), warnings: [] });
      return new Uint8Array([0xfe, n]);
    },
    async read(file) {
      const b = new Uint8Array(await file.arrayBuffer());
      const c = b[0] === 0xfe ? store.get(b[1] ?? 0) : undefined;
      if (c === undefined) throw new CodecUnavailableError(new Error("pas un conteneur de test"));
      return c;
    },
  };
}

function tabOf(doc: CoreDocument = fakeCore.blank()) {
  const assets = createAssetStore(async () => ID);
  let selection: string[] = [];
  const engine = {
    state: () => ({ selection, page: doc.pageIds()[0]! }),
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    insertFragment: (src: CoreDocument, dx: number, dy: number) => doc.insertFragment(src, doc.pageIds()[0]!, dx, dy),
    insertPages: (src: CoreDocument) => doc.insertPages(src, doc.pageIds()[0]!),
  };
  const stage = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  const tab = { board: { doc, engine, stage }, assets, files: {} } as unknown as TabSession;
  return { tab, doc, assets, select: (ids: string[]) => void (selection = ids) };
}

function opsOf(codec: ContainerCodec = memoryCodec(), alive = (_t: TabSession) => true) {
  const said: string[] = [];
  const say = async (m: string) => void said.push(m);
  const io = createContainerIO({ core: fakeCore, codec, say, makeAssets: () => createAssetStore(async () => ID) });
  return { ops: createFragmentOps({ io, now: () => NOW, appVersion: "0.1.0", say, alive }), said };
}

const rectIn = (d: CoreDocument, x0: number, y0: number, x1: number, y1: number): string =>
  d.apply({ type: "AddShape", page: d.pageIds()[0]!, shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!;
const centre = (d: CoreDocument, ids: readonly string[]): [number, number] => {
  const b = d.bounds(ids)!;
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
};

describe("opérations sur la sélection (DAZ3)", () => {
  it("encodeSelection : sélection vide → null", async () => {
    const { ops } = opsOf();
    expect(await ops.encodeSelection(tabOf().tab)).toBeNull();
  });

  it("copier puis coller : objets au centre de la vue, groupe gardé, ids neufs", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    const a = rectIn(src.doc, 0, 0, 100, 100);
    const b = rectIn(src.doc, 200, 0, 300, 100);
    src.doc.apply({ type: "Group", ids: [a, b] });
    src.select([a, b]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "presse-papiers", null)).toBe(true);
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain(a);
    expect(centre(dst.doc, ids)).toEqual([400, 300]);
    expect(dst.doc.element(ids[0]!)?.group).toEqual(dst.doc.element(ids[1]!)?.group);
  });

  it("collages successifs du même contenu : décalés de 24 px ; resetCascade repart au centre", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 100, 100)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    const at = (k: number) => centre(dst.doc, [dst.doc.elementIds(dst.doc.pageIds()[0]!)[k]!]);
    await ops.insert(dst.tab, bytes, "p", null);
    await ops.insert(dst.tab, bytes.slice(), "p", null); // mêmes octets, autre tableau
    expect(at(0)).toEqual([400, 300]);
    expect(at(1)).toEqual([424, 324]);
    ops.resetCascade();
    await ops.insert(dst.tab, bytes, "p", null);
    expect(at(2)).toEqual([400, 300]);
  });

  it("déposé à un point : centre des bornes au point, sans cascade", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 100, 100)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    await ops.insert(dst.tab, bytes, "x.rbitem", { x: 100, y: 50 });
    await ops.insert(dst.tab, bytes, "x.rbitem", { x: 100, y: 50 });
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    expect(centre(dst.doc, [ids[0]!])).toEqual([100, 50]);
    expect(centre(dst.doc, [ids[1]!])).toEqual([100, 50]);
  });

  it("image : octets écrits par le conteneur, adoptés par le magasin de l'onglet cible", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    const i = src.doc.apply({ type: "AddImage", page: src.doc.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    src.assets.adopt(ID, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    src.select([i]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    expect(bytes[0]).toBe(0xfe); // conteneur avec assets
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "x.rbitem", null)).toBe(true);
    expect(dst.assets.has(ID)).toBe(true);
  });

  it("un document donné pour un objet : message du cœur, rien inséré", async () => {
    const { ops, said } = opsOf();
    const dst = tabOf();
    expect(await ops.insert(dst.tab, fakeCore.blank().save(NOW, "0.1.0"), "x.rbitem", null)).toBe(false);
    expect(said).toEqual(["Ouverture impossible (x.rbitem) : ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages"]);
    expect(dst.doc.elementIds(dst.doc.pageIds()[0]!)).toEqual([]);
  });

  it("asset cité non lu (module absent) : refus, rien inséré (PC8)", async () => {
    const { ops, said } = opsOf(memoryCodec());
    const s = fakeCore.blank();
    const i = s.apply({ type: "AddImage", page: s.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    const json = s.extract(s.pageIds()[0]!, [i]).saveFragment(NOW, "0.1.0", "x"); // JSON : le conteneur de test le refuse
    const dst = tabOf();
    expect(await ops.insert(dst.tab, json, "x.rbitem", null)).toBe(false);
    expect(said.at(-1)).toBe(`x.rbitem : ${UNREAD_ITEMS_MESSAGE}`);
    expect(dst.doc.elementIds(dst.doc.pageIds()[0]!)).toEqual([]);
  });

  it("onglet fermé pendant la lecture : rien inséré", async () => {
    const { ops, said } = opsOf(memoryCodec(), () => false);
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 10, 10)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "p", null)).toBe(false);
    expect(said).toEqual([TAB_GONE_MESSAGE]);
  });

  it("insérer des pages : pages après la page montrée, une étape ; source illisible : rien", async () => {
    const { ops, said } = opsOf();
    const s = fakeCore.blank();
    s.apply({ type: "AddPage", after: s.pageIds()[0]! });
    const dst = tabOf();
    expect(await ops.insertPages(dst.tab, { name: "b.roomboard", bytes: s.save(NOW, "0.1.0"), target: { kind: "download", name: "b.roomboard" } })).toBe(true);
    expect(dst.doc.pageIds()).toHaveLength(3);
    expect(await ops.insertPages(dst.tab, { name: "c.roomboard", bytes: new Uint8Array([1]), target: { kind: "download", name: "c.roomboard" } })).toBe(false);
    expect(said.at(-1)).toMatch(/^Ouverture impossible \(c\.roomboard\) : /);
    expect(dst.doc.pageIds()).toHaveLength(3);
    expect(SELECTION_NAME).toBe("Sélection");
  });

  it("encodeSelection : image citée absente du magasin → refus avec avis, pas d'exception", async () => {
    const { ops, said } = opsOf();
    const src = tabOf();
    const i = src.doc.apply({ type: "AddImage", page: src.doc.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    src.select([i]); // l'image n'a jamais été adoptée par le magasin
    expect(await ops.encodeSelection(src.tab)).toBeNull();
    expect(said).toEqual([MISSING_ITEMS_MESSAGE]);
  });

  it("placement : bornes réelles du fragment chargé, pas le champ bounds du manifeste", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 100, 100)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const [manifest, ybin] = fakeCore.loadFragment(bytes).saveFragmentParts(NOW, "0.1.0", "x");
    const m = JSON.parse(JSON.stringify(manifest)) as Record<string, unknown>;
    delete m.bounds;
    const dst = tabOf();
    const stripped = fakeCore.loadFragmentParts(m as never, ybin).saveFragment(NOW, "0.1.0", "x");
    expect(await ops.insert(dst.tab, stripped, "x.rbitem", { x: 100, y: 50 })).toBe(true);
    expect(centre(dst.doc, dst.doc.elementIds(dst.doc.pageIds()[0]!))).toEqual([100, 50]);
  });
});
