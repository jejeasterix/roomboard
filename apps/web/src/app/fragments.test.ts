// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { NOT_A_FRAGMENT_MESSAGE, type Command, type CoreDocument, type GridInput } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { createContainerIO, LINKED_COPY_MESSAGE, type ContainerIO } from "./container-io";
import { CASCADE_STEP } from "../platform/image-import";
import {
  createFragmentOps,
  EMPTY_GRID_MESSAGE,
  EMPTY_ITEMS_MESSAGE,
  MISSING_EXPORT_MESSAGE,
  MISSING_ITEMS_MESSAGE,
  NO_GRID_MESSAGE,
  SELECTION_NAME,
  TAB_GONE_MESSAGE,
  UNREAD_ITEMS_MESSAGE,
} from "./fragments";
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
    run: (cmd: Command) => doc.apply(cmd),
  };
  const stage = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  const tab = { board: { doc, engine, stage }, assets, files: {} } as unknown as TabSession;
  return { tab, doc, assets, select: (ids: string[]) => void (selection = ids) };
}

function opsOf(codec: ContainerCodec = memoryCodec(), alive = (_t: TabSession) => true) {
  const said: string[] = [];
  const say = async (m: string) => void said.push(m);
  const io = createContainerIO({ core: fakeCore, codec, say, makeAssets: () => createAssetStore(async () => ID) });
  return { ops: createFragmentOps({ io, core: fakeCore, now: () => NOW, appVersion: "0.1.0", say, alive }), said };
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

  it("encodeSelection : une autre erreur que « image absente » remonte telle quelle, sans avis de copie", async () => {
    const said: string[] = [];
    const io: ContainerIO = {
      encode: async () => { throw new CodecUnavailableError(new Error("module absent")); },
      read: async () => null,
    };
    const ops = createFragmentOps({ io, core: fakeCore, now: () => NOW, appVersion: "0.1.0", say: async (m) => void said.push(m), alive: () => true });
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 10, 10)]);
    await expect(ops.encodeSelection(src.tab)).rejects.toBeInstanceOf(CodecUnavailableError);
    expect(said).toEqual([]);
  });

  it("encodeSelection à l'export : image absente dite « exportée », pas « copiée »", async () => {
    const { ops, said } = opsOf();
    const src = tabOf();
    const i = src.doc.apply({ type: "AddImage", page: src.doc.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    src.select([i]);
    expect(await ops.encodeSelection(src.tab, "export")).toBeNull();
    expect(said).toEqual([MISSING_EXPORT_MESSAGE]);
    expect(MISSING_EXPORT_MESSAGE).toContain("exporté");
  });

  it("index de cascade : deux objets insérés avec 0 puis 1 se décalent de 24 px, sans toucher à la cascade du collage", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 100, 100)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "a.rbitem", null, 0)).toBe(true);
    expect(await ops.insert(dst.tab, bytes, "b.rbitem", null, 1)).toBe(true);
    expect(await ops.insert(dst.tab, bytes, "presse-papiers", null)).toBe(true); // collage : premier du contenu, rang 0
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    const c = ids.map((id) => centre(dst.doc, [id]));
    expect([c[1]![0]! - c[0]![0]!, c[1]![1]! - c[0]![1]!]).toEqual([24, 24]);
    expect(c[2]).toEqual(c[0]);
  });

  it("fragment sans élément : avis, issue « empty », rien inséré", async () => {
    const { ops, said } = opsOf();
    const empty = fakeCore.blank();
    const bytes = empty.extract(empty.pageIds()[0]!, []).saveFragment(NOW, "0.1.0", "x");
    const dst = tabOf();
    expect(await ops.insertOutcome(dst.tab, bytes, "x.rbitem", null)).toBe("empty");
    expect(said).toEqual([`x.rbitem : ${EMPTY_ITEMS_MESSAGE}`]);
    expect(await ops.insert(dst.tab, bytes, "x.rbitem", null)).toBe(false);
  });

  it("insérer des pages d'un .roomboard avec image : l'image entre dans le magasin de l'onglet", async () => {
    const codec = memoryCodec();
    const say = async () => undefined;
    const io = createContainerIO({ core: fakeCore, codec, say, makeAssets: () => createAssetStore(async () => ID) });
    const ops = createFragmentOps({ io, core: fakeCore, now: () => NOW, appVersion: "0.1.0", say, alive: () => true });
    const src = tabOf();
    src.doc.apply({ type: "AddImage", page: src.doc.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    src.assets.adopt(ID, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    const bytes = await io.encode(src.doc, src.assets, NOW, "0.1.0", { kind: "document" });
    expect(bytes[0]).toBe(0xfe);
    const dst = tabOf();
    expect(await ops.insertPages(dst.tab, { name: "b.roomboard", bytes, target: { kind: "download", name: "b.roomboard" } })).toBe(true);
    expect(dst.assets.has(ID)).toBe(true);
  });

  it("assets adoptés seulement après les contrôles : fragment vide, rien n'entre dans le magasin", async () => {
    const readAssets = createAssetStore(async () => ID);
    await readAssets.put(new Blob(["x"]));
    const doc = fakeCore.blank();
    (doc as unknown as { citedAssets: () => { id: string; mime: string }[] }).citedAssets = () => [{ id: ID, mime: "image/png" }];
    const io: ContainerIO = { encode: async () => new Uint8Array(), read: async () => ({ doc, assets: readAssets, unread: false, kind: "fragment" }) };
    const ops = createFragmentOps({ io, core: fakeCore, now: () => NOW, appVersion: "0.1.0", say: async () => undefined, alive: () => true });
    const dst = tabOf();
    expect(await ops.insert(dst.tab, new Uint8Array([1]), "x.rbitem", null)).toBe(false);
    expect(dst.assets.has(ID)).toBe(false);
  });

  it("fragment non lu en repli (module absent) : un seul avis", async () => {
    const { ops, said } = opsOf(memoryCodec());
    const s = fakeCore.blank();
    const i = s.apply({ type: "AddImage", page: s.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    const json = s.extract(s.pageIds()[0]!, [i]).saveFragment(NOW, "0.1.0", "x");
    expect(await ops.insert(tabOf().tab, json, "x.rbitem", null)).toBe(false);
    expect(said).toHaveLength(1);
  });
});

describe("opérations sur la sélection : médias liés (C14)", () => {
  it("R2 : insérer les pages d'un fichier à vidéo liée : la vidéo refusée avec avis, le reste inséré", async () => {
    const VID = "cd".repeat(32);
    const codec = memoryCodec();
    const { ops, said } = opsOf(codec);
    const s = fakeCore.blank();
    rectIn(s, 0, 0, 100, 100);
    s.apply({
      type: "AddMedia",
      page: s.pageIds()[0]!,
      asset: { id: VID, name: "clip.webm", mime: "video/webm", size: 300_000_000 },
      poster: null,
      linked: "/cours/videos/clip.webm",
      mediaType: "video",
      w: 640,
      h: 360,
      duration: 12,
      matrix: [1, 0, 0, 1, 0, 0],
    });
    const io = createContainerIO({ core: fakeCore, codec, say: async () => undefined, makeAssets: () => createAssetStore(async () => ID) });
    const bytes = await io.encode(s, createAssetStore(async () => ID), NOW, "0.1.0", { kind: "document" });
    const dst = tabOf();
    expect(await ops.insertPages(dst.tab, { name: "b.roomboard", bytes, target: { kind: "download", name: "b.roomboard" } })).toBe(true);
    const added = dst.doc.pageIds().slice(1);
    expect(added).toHaveLength(1);
    expect(added.flatMap((p) => dst.doc.elementIds(p)).map((id) => dst.doc.element(id)?.kind)).toEqual(["shape"]);
    expect(dst.doc.citedAssets().map((a) => a.id)).not.toContain(VID);
    expect(dst.assets.linked(VID)).toBeUndefined();
    expect(said).toContain(`b.roomboard : ${LINKED_COPY_MESSAGE}`);
  });
});

describe("C4 : insertResource et encodeGrid", () => {
  const grid: GridInput = {
    visible: true,
    snap: false,
    above: false,
    levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }],
  };

  it("C4 : insertResource d'une grille pose un SetGrid, une étape", async () => {
    const { ops, said } = opsOf();
    const src = tabOf();
    src.doc.apply({ type: "SetGrid", page: src.doc.pageIds()[0]!, grid });
    const bytes = (await ops.encodeGrid(src.tab, "Seyès"))!;
    const dst = tabOf();
    const runs = vi.spyOn(dst.tab.board.engine, "run");
    expect(await ops.insertResource(dst.tab, bytes, "Seyès", { x: 10, y: 10 })).toBe("inserted");
    expect(runs).toHaveBeenCalledTimes(1);
    expect(dst.doc.page(dst.doc.pageIds()[0]!)?.grid).toEqual(grid);
    expect(said).toEqual([]);
  });

  it("C4 : même grille : aucune étape", async () => {
    const { ops } = opsOf();
    const t = tabOf();
    t.doc.apply({ type: "SetGrid", page: t.doc.pageIds()[0]!, grid });
    const bytes = (await ops.encodeGrid(t.tab))!;
    const runs = vi.spyOn(t.tab.board.engine, "run");
    expect(await ops.insertResource(t.tab, bytes, "G", null)).toBe("inserted");
    expect(runs).not.toHaveBeenCalled();
  });

  it("C4 : ressource de grille sans grille : avis, rien n'est appliqué", async () => {
    const { ops, said } = opsOf();
    const dst = tabOf();
    const runs = vi.spyOn(dst.tab.board.engine, "run");
    expect(await ops.insertResource(dst.tab, fakeCore.blank().saveGrid(NOW, "0.1.0", "G"), "G.rbitem", null)).toBe("empty");
    expect(runs).not.toHaveBeenCalled();
    expect(said).toEqual([`G.rbitem : ${EMPTY_GRID_MESSAGE}`]);
  });

  it("C4 : insertResource d'objets suit l'insertion existante", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 10, 10)]);
    const bytes = (await ops.encodeSelection(src.tab, "export"))!;
    const dst = tabOf();
    expect(await ops.insertResource(dst.tab, bytes, "Moitié", { x: 100, y: 100 })).toBe("inserted");
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    expect(ids).toHaveLength(1);
    expect(centre(dst.doc, ids)).toEqual([100, 100]);
  });

  it("C4 : objets en ressource puis collés : une seule cascade, celle de l'insertion existante (Z7)", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 100, 100)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "p", null)).toBe(true);
    expect(await ops.insertResource(dst.tab, bytes.slice(), "p", null)).toBe("inserted");
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    expect(centre(dst.doc, [ids[0]!])).toEqual([400, 300]);
    expect(centre(dst.doc, [ids[1]!])).toEqual([424, 324]);
  });

  it("C4 : trois objets déposés ensemble (index 0, 1, 2) ne tombent pas au même point (R4, D24)", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 10, 10)]);
    const bytes = (await ops.encodeSelection(src.tab, "export"))!;
    const dst = tabOf();
    for (const i of [0, 1, 2]) expect(await ops.insertResource(dst.tab, bytes, "x.rbitem", { x: 100, y: 100 }, i)).toBe("inserted");
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    const x0s = ids.map((id) => dst.doc.bounds([id])!.x0);
    expect(new Set(x0s).size).toBe(3);
    expect(x0s[1]! - x0s[0]!).toBeCloseTo(CASCADE_STEP);
  });

  it("C4 : un document donné en ressource : un seul avis, rien inséré", async () => {
    const { ops, said } = opsOf();
    const dst = tabOf();
    const runs = vi.spyOn(dst.tab.board.engine, "run");
    expect(await ops.insertResource(dst.tab, fakeCore.blank().save(NOW, "0.1.0"), "d.rbitem", null)).toBe("refused");
    expect(said).toEqual([`Ouverture impossible (d.rbitem) : ${NOT_A_FRAGMENT_MESSAGE}`]);
    expect(runs).not.toHaveBeenCalled();
    expect(dst.doc.elementIds(dst.doc.pageIds()[0]!)).toEqual([]);
  });

  it("C4 : encodeGrid d'une page sans grille : null, avis dit", async () => {
    const { ops, said } = opsOf();
    expect(await ops.encodeGrid(tabOf().tab)).toBeNull();
    expect(said).toEqual([NO_GRID_MESSAGE]);
  });
});
