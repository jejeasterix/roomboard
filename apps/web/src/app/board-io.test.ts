import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, Matrix, TextSpan } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { applyMatrix } from "../core/shapes";
import { boardListOf, buildBoardDocument, decodeBoardList, encodeBoardList, mediaOf, type BoardListPage, type BoardObject } from "./board-io";

const ID: Matrix = [1, 0, 0, 1, 0, 0];
/** Flux témoin W1, recopié de `crates/roomboard-formats/src/board.rs` (fixtures) : parité du codage (D6). */
const W1_OPS = [
  1,
  2, 0, 0, 0,
  3, 0, 1, 0, 0, 1, 0, 0, 10, 20, 110, 70, 255, 0, 0, 4, 1, 0, 0, 255,
  4, 1, 0, 0, 1, 0, 0, 0, 128, 0, 3, 2, 0, 0, 1, 10, 10, 0.5,
  5, 1, 0, 0, 1, 100, 200, 0, 0, 300, 50, 24, 0, 0, 0, 2, 0, 1, 0, -1, -1, -1, -1, 1, 0, 32, 255, 0, 0, 2,
  6, 1, 0, 0, 1, 0, 0, 5, 5, 64, 32, 3,
  7,
  3, 2, 1, 0, 0, 1, 0, 0, 0, 0, 50, 0, 0, 0, 0, 2, 0, 0, 0, 0,
  3, 3, 1, 0, 0, 1, 0, 0, 0, 10, 50, 10, 0, 0, 0, 2, 0, 0, 0, 0,
  8,
  1,
];
const W1_TEXTS = ["Bonjour ", "monde", "Liberation Sans", "images/a.png"];
const W1_SPANS: readonly TextSpan[] = [{ text: "Bonjour ", attrs: { bold: true } }, { text: "monde", attrs: { size: 32, color: "#ff0000", font: "Liberation Sans" } }];
const W1_PAGES: BoardListPage[] = [
  {
    background: "#000000",
    objects: [
      { kind: "shape", shape: "rect", m: ID, x0: 10, y0: 20, x1: 110, y1: 70, color: "#ff0000", width: 4, fill: "#0000ff" },
      { kind: "stroke", m: ID, color: "#008000", width: 3, points: [0, 0, 1, 10, 10, 0.5] },
      { kind: "text", m: [1, 0, 0, 1, 100, 200], x: 0, y: 0, boxWidth: 300, boxHeight: 50, size: 24, color: "#000000", spans: W1_SPANS },
      { kind: "image", m: ID, x: 5, y: 5, w: 64, h: 32, path: "images/a.png" },
      {
        kind: "group",
        children: [
          { kind: "shape", shape: "line", m: ID, x0: 0, y0: 0, x1: 50, y1: 0, color: "#000000", width: 2, fill: null },
          { kind: "shape", shape: "arrow", m: ID, x0: 0, y0: 10, x1: 50, y1: 10, color: "#000000", width: 2, fill: null },
        ],
      },
    ],
  },
  { background: null, objects: [] },
];

const fakeHasher = async (b: Blob): Promise<string> => {
  let h = 0;
  for (const x of new Uint8Array(await b.arrayBuffer())) h = (h * 31 + x) >>> 0;
  return h.toString(16).padStart(64, "0");
};
const decode = vi.fn(async (_b: Blob, _k: string) => ({ bitmap: { close() {} } as unknown as ImageBitmap, w: 64, h: 32 }));
const deps = () => ({ makeAssets: () => createAssetStore(fakeHasher), decode, now: "2026-11-21T00:00:00Z", appVersion: "0.1.0" });
const PNG = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])]);
const onePage = (objects: BoardObject[], background: string | null = null): BoardListPage[] => [{ background, objects }];
const viewsOf = (doc: CoreDocument) => doc.elementIds(doc.pageIds()[0]!).map((id) => doc.element(id)!);
type Shape = Extract<BoardObject, { kind: "shape" }>;
type Text = Extract<BoardObject, { kind: "text" }>;

describe("board-io : flux BoardList (C13, D6)", () => {
  it("C13 : flux témoin W1 : decodeBoardList rend les pages attendues (parité avec board.rs)", () => {
    expect(decodeBoardList(W1_OPS, W1_TEXTS)).toEqual(W1_PAGES);
  });

  it("C13 : flux témoin W1 : encodeBoardList(W1) rend les mêmes nombres et les mêmes textes", () => {
    const l = encodeBoardList(W1_PAGES);
    expect(Array.from(l.ops)).toEqual(W1_OPS);
    expect(l.texts).toEqual(W1_TEXTS);
  });

  it("C13 : flux invalides : « liste de tableau invalide : … » (mêmes cas que board.rs)", () => {
    for (const ops of [[9], [3, 0], [1, 7], [1, 8], [1, 2, 256, 0, 0], [1, 6, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 9], [1, 4, 1, 0, 0, 1, 0, Number.NaN], [1, 3, 7]]) {
      expect(() => decodeBoardList(ops, W1_TEXTS), JSON.stringify(ops)).toThrow(/^liste de tableau invalide : /);
    }
  });
});

describe("board-io : document importé (C13, D7, D8b)", () => {
  it("C13 : W1 construit : 2 pages, fond noir, 6 objets, ligne et flèche groupées, aucune étape d'annulation", async () => {
    const r = await buildBoardDocument(fakeCore, W1_PAGES, new Map([["images/a.png", PNG]]), deps());
    const doc = r.doc;
    expect(doc.pageIds()).toHaveLength(2);
    expect(doc.page(doc.pageIds()[0]!)?.background).toBe("#000000");
    const views = viewsOf(doc);
    expect(views.map((v) => v.kind)).toEqual(["shape", "stroke", "text", "image", "shape", "shape"]);
    expect(views[4]!.group).toBeDefined();
    expect(views[4]!.group).toEqual(views[5]!.group);
    expect(views[0]!.group).toBeUndefined();
    expect(doc.canUndo()).toBe(false);
    expect(r.warnings).toEqual([]);
    expect(doc.citedAssets()).toHaveLength(1);
    expect(r.assets.get(doc.citedAssets()[0]!.id)?.type).toBe("image/png");
  });

  it("C13 : texte : segments gardés, échelle uniforme repliée (taille 48, translation seule)", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "text", m: [2, 0, 0, 2, 10, 10], x: 0, y: 0, boxWidth: 100, boxHeight: 30, size: 24, color: "#000000", spans: W1_SPANS }]), new Map(), deps());
    const t = viewsOf(r.doc)[0]!;
    if (t.kind !== "text") throw new Error(t.kind);
    expect([t.text.size, t.text.boxWidth, t.text.boxHeight, t.transform]).toEqual([48, 200, 60, [1, 0, 0, 1, 10, 10]]);
    expect(t.text.spans).toEqual([{ text: "Bonjour ", attrs: { bold: true } }, { text: "monde", attrs: { size: 64, color: "#ff0000", font: "Liberation Sans" } }]);
  });

  it("C13 : trait : points placés par la matrice, épaisseur à l'échelle", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "stroke", m: [2, 0, 0, 2, 100, 0], color: "#000000", width: 3, points: [0, 0, 1, 10, 5, 0.5] }]), new Map(), deps());
    const s = viewsOf(r.doc)[0]!;
    if (s.kind !== "stroke") throw new Error(s.kind);
    const local = Array.from(r.doc.points(s.id)!);
    expect([...applyMatrix(s.transform, local[0]!, local[1]!), ...applyMatrix(s.transform, local[3]!, local[4]!), local[5], s.style.width]).toEqual([100, 0, 120, 10, 0.5, 6]);
  });

  it("C13 : D8b : épaisseur 0, coin non fini, taille 0 : sautés et comptés, le reste construit", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([
      { kind: "stroke", m: ID, color: "#000000", width: 0, points: [0, 0, 1] },
      { kind: "shape", shape: "rect", m: ID, x0: Number.NaN, y0: 0, x1: 1, y1: 1, color: "#000000", width: 1, fill: null },
      { kind: "text", m: ID, x: 0, y: 0, boxWidth: 10, boxHeight: 10, size: 0, color: "#000000", spans: [{ text: "a", attrs: {} }] },
      { kind: "shape", shape: "ellipse", m: ID, x0: 0, y0: 0, x1: 10, y1: 10, color: "#000000", width: 1, fill: null },
    ]), new Map(), deps());
    expect(viewsOf(r.doc).map((v) => v.kind)).toEqual(["shape"]);
    expect(r.warnings).toEqual(["page 1 : 3 objets illisibles ignorés"]);
  });

  it("C13 : image absente de l'archive : sautée, « page 1 : 1 image absente de l'archive »", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "image", m: ID, x: 0, y: 0, w: 10, h: 10, path: "images/absente.png" }]), new Map(), deps());
    expect(viewsOf(r.doc)).toEqual([]);
    expect(r.warnings).toEqual(["page 1 : 1 image absente de l'archive"]);
  });

  it("C13 : image trouvée sans tenir compte de la casse ni des barres inverses (Review Focus 5)", async () => {
    const media = new Map([["images/A.PNG", PNG]]);
    expect(mediaOf(media, "images\\a.png")).toBe(PNG);
    expect(mediaOf(media, "./images/a.png")).toBe(PNG);
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "image", m: ID, x: 10, y: 20, w: 128, h: 64, path: "images/a.png" }]), media, deps());
    const v = viewsOf(r.doc)[0]!;
    if (v.kind !== "image") throw new Error(v.kind);
    expect([v.image.w, v.image.h, v.transform]).toEqual([64, 32, [2, 0, 0, 2, 10, 20]]);
  });

  it("C13 : groupe d'un seul objet lisible : aucun groupe (D13)", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "group", children: [
      { kind: "shape", shape: "rect", m: ID, x0: 0, y0: 0, x1: 10, y1: 10, color: "#000000", width: 1, fill: null },
      { kind: "shape", shape: "rect", m: ID, x0: 0, y0: 0, x1: 10, y1: 10, color: "#000000", width: 0, fill: null },
    ] }]), new Map(), deps());
    expect(viewsOf(r.doc).map((v) => v.group)).toEqual([undefined]);
  });
});

describe("board-io : copie au format (C13, D18)", () => {
  it("C13 : boardListOf : copie de W1 : mêmes sortes, couleurs, segments, image images/<empreinte>.png, groupe", async () => {
    const built = await buildBoardDocument(fakeCore, W1_PAGES, new Map([["images/a.png", PNG]]), deps());
    const r = await boardListOf(built.doc, built.assets, "iwb");
    const back = decodeBoardList(r.list.ops, r.list.texts);
    expect(back).toHaveLength(2);
    expect(back[0]!.background).toBe("#000000");
    const objs = back[0]!.objects;
    expect(objs.map((o) => o.kind)).toEqual(["shape", "stroke", "text", "image", "group"]);
    const rect = objs[0] as Shape;
    expect([rect.shape, rect.color, rect.width, rect.fill, ...applyMatrix(rect.m, rect.x0, rect.y0), ...applyMatrix(rect.m, rect.x1, rect.y1)]).toEqual(["rect", "#ff0000", 4, "#0000ff", 10, 20, 110, 70]);
    const text = objs[2] as Text;
    expect([text.spans, applyMatrix(text.m, text.x, text.y), text.size]).toEqual([W1_SPANS, [100, 200], 24]);
    const img = objs[3] as Extract<BoardObject, { kind: "image" }>;
    expect(img.path).toMatch(/^images\/[0-9a-f]{64}\.png$/);
    expect(r.files.map((f) => f.path)).toEqual([img.path]);
    expect(r.files[0]!.bytes).toEqual(new Uint8Array(await PNG.arrayBuffer()));
    const group = objs[4] as Extract<BoardObject, { kind: "group" }>;
    expect(group.children.map((c) => (c as Shape).shape)).toEqual(["line", "arrow"]);
    expect(r.warnings).toEqual([]);
  });

  it("C13 : boardListOf : tableau non exporté, flèche écrite en ligne pour .ubz, objet hors du cadre", async () => {
    const draft = fakeCore.blank();
    const pid = draft.pageIds()[0]!;
    draft.apply({ type: "AddTable", page: pid, x: 0, y: 0, cols: 2, rows: 2, colWidth: 100, rowHeight: 40, color: "#000000", size: 24 });
    draft.apply({ type: "AddShape", page: pid, shape: "arrow", x0: 100, y0: 100, x1: 200, y1: 100, style: { color: "#000000", width: 2 }, fill: null });
    draft.apply({ type: "AddShape", page: pid, shape: "rect", x0: -10, y0: 10, x1: 20, y1: 40, style: { color: "#000000", width: 2 }, fill: null });
    const assets = createAssetStore(fakeHasher);
    const outside = "1 objet hors du cadre (coordonnées négatives ou au-delà de 1 920)";
    expect((await boardListOf(draft, assets, "ubz")).warnings).toEqual(["1 tableau non exporté", "1 flèche écrite en ligne (.ubz)", outside]);
    expect((await boardListOf(draft, assets, "iwb")).warnings).toEqual(["1 tableau non exporté", outside]);
  });

  it("C13 : boardListOf : trait écrit en points locaux avec m = transform, jamais recalculés en monde", async () => {
    const built = await buildBoardDocument(fakeCore, onePage([{ kind: "stroke", m: [2, 0, 0, 2, 100, 0], color: "#000000", width: 3, points: [0, 0, 1, 10, 5, 0.5] }]), new Map(), deps());
    const el = viewsOf(built.doc)[0]!;
    if (el.kind !== "stroke") throw new Error(el.kind);
    // Le cœur place le trait par `transform` (translation vers son origine) : sans cela, le test ne distinguerait rien.
    expect(el.transform).not.toEqual(ID);
    const r = await boardListOf(built.doc, built.assets, "iwb");
    const s = decodeBoardList(r.list.ops, r.list.texts)[0]!.objects[0] as Extract<BoardObject, { kind: "stroke" }>;
    expect(s.m).toEqual(el.transform);
    expect(s.points).toEqual(Array.from(built.doc.points(el.id)!));
    // Placés par `m`, les points retombent à leur place monde ; des points déjà en monde seraient décalés deux fois.
    expect([...applyMatrix(s.m, s.points[0]!, s.points[1]!), ...applyMatrix(s.m, s.points[3]!, s.points[4]!)]).toEqual([100, 0, 120, 10]);
  });
});
