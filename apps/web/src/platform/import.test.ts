import { describe, expect, it, vi } from "vitest";
import type { DroppedFile } from "./files";
import type { Command } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { IDENTITY } from "../engine/camera";
import type { TableGrid } from "./html-table";
import { anchorOf, placement, visibleOf, type ImageTarget } from "./image-import";
import { createImporter, hasPdfMagic, isRbitemName, isRoomboardName, LATER_FORMAT_MESSAGE, SHEET_MAX_BYTES, WEB_MAX_BYTES, ZIP_MAGIC } from "./import";
import { EMPTY_SHEET_MESSAGE, SHEET_TOO_BIG_MESSAGE } from "./sheet-reader";
import {
  AUDIO_BOX, CODEC_UNREADABLE, MEDIA_INCLUDE_MAX_BYTES, MEDIA_LINKED_NOTE, MEDIA_NOT_LINKED, MEDIA_PASTE_MAX_BYTES, MEDIA_TOO_BIG,
  POSTER_MIME, unsupportedMediaMessage, type LinkedMedia, type MediaProbe,
} from "./media-import";

const file = (name: string, bytes = new Uint8Array([80, 75, 3, 4]), path?: string): DroppedFile => ({
  name, size: bytes.length, mime: "", path, head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
});

describe("importFiles (T86, usage § 8 point 12, Q1)", () => {
  it("un .roomboard s'ouvre (nouvel onglet), sans cible d'écriture (CL5b-4)", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument, notify }).importFiles([file("Cours.roomboard", new Uint8Array([1, 2]))]);
    expect(openDocument).toHaveBeenCalledWith({ name: "Cours.roomboard", bytes: new Uint8Array([1, 2]), target: null, path: null });
    expect(r).toEqual({ opened: ["Cours.roomboard"], inserted: [], refused: [], failed: [] });
    expect(notify).not.toHaveBeenCalled();
  });

  it("fichier non reconnu : message, document intact (TIFF : prochaine version, R14, R28)", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument, notify })
      .importFiles([file("photo.tif", new Uint8Array([0x49, 0x49, 0x2a, 0x00])), file("cours.flipchart")]);
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.refused).toEqual(["photo.tif", "cours.flipchart"]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0]![0]).toBe(`photo.tif, cours.flipchart : ${LATER_FORMAT_MESSAGE}`);
  });

  it("mélange : chaque .roomboard ouvert dans l'ordre, les autres refusés en un seul message", async () => {
    const opened: string[] = [];
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: async (f) => (opened.push(f.name), true), notify })
      .importFiles([file("a.roomboard"), file("b.txt"), file("C.ROOMBOARD")]);
    expect(opened).toEqual(["a.roomboard", "C.ROOMBOARD"]);
    expect(r.refused).toEqual(["b.txt"]);
  });

  it("ouverture refusée ou lecture qui lève : rangé dans failed, les autres continuent", async () => {
    const bad: DroppedFile = { name: "x.roomboard", size: 1, mime: "", head: async () => new Uint8Array(), blob: async () => { throw new Error("disque"); } };
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: async (f) => f.name !== "y.roomboard", notify })
      .importFiles([bad, file("y.roomboard"), file("z.roomboard")]);
    expect(r).toEqual({ opened: ["z.roomboard"], inserted: [], refused: [], failed: ["x.roomboard", "y.roomboard"] });
    expect(notify).toHaveBeenCalledWith("Ouverture impossible (x.roomboard) : disque");
  });

  it("onglets pleins : la boucle s'arrête au premier refus, une seule boîte", async () => {
    let slots = 1;
    const opened: string[] = [];
    const notify = vi.fn(async (_m: string) => undefined);
    const openDocument = vi.fn(async (f: { name: string }) => {
      if (slots === 0) {
        await notify("12 onglets au plus");
        return false;
      }
      slots -= 1;
      opened.push(f.name);
      return true;
    });
    const r = await createImporter({ openDocument, notify, full: () => slots === 0 })
      .importFiles(["a", "b", "c", "d", "e"].map((n) => file(`${n}.roomboard`)));
    expect(opened).toEqual(["a.roomboard"]);
    expect(openDocument).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(r.failed).toEqual(["b.roomboard", "c.roomboard", "d.roomboard", "e.roomboard"]);
  });

  it("liste vide : rien", async () => {
    const notify = vi.fn(async () => undefined);
    expect(await createImporter({ openDocument: async () => true, notify }).importFiles([])).toEqual({ opened: [], inserted: [], refused: [], failed: [] });
    expect(notify).not.toHaveBeenCalled();
  });

  it("extension seule, insensible à la casse ; « .roomboard.txt » refusé", () => {
    expect(isRoomboardName("a.RoomBoard")).toBe(true);
    expect(isRoomboardName("a.roomboard.txt")).toBe(false);
    expect(isRoomboardName("roomboard")).toBe(false);
  });
});

function pngHead(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}
function fakeTarget(rect = { left: 0, top: 0, width: 800, height: 600 }) {
  const cmds: Command[] = [];
  const assets = createAssetStore();
  const target: ImageTarget = {
    assets,
    page: () => "p1",
    camera: () => IDENTITY,
    stageRect: () => rect,
    measure: () => (s: string) => s.length * 10,
    textStyle: () => ({ color: "#000000", size: 36 }),
    run: (cmd) => {
      cmds.push(cmd);
      return { pages: [], ids: [`e${cmds.length}`], removed: [], full: false, version: cmds.length };
    },
  };
  return { target, cmds, assets };
}
const decoded = (w: number, h: number) =>
  vi.fn(async (_b: Blob, _k: string) => ({ bitmap: { close: vi.fn() } as unknown as ImageBitmap, w, h }));
type AddImage = Extract<Command, { type: "AddImage" }>;

describe("importFiles : images (R1, R3 à R6, R14, R15)", () => {
  it("PNG reconnu par ses octets : AddImage dans l'onglet actif, centre de la vue, 1 px = 1 unité", async () => {
    const t = fakeTarget();
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => t.target, decode: decoded(200, 100) })
      .importFiles([file("a.png", pngHead(200, 100))], null);
    expect(r).toEqual({ opened: [], inserted: ["a.png"], refused: [], failed: [] });
    const cmd = t.cmds[0] as AddImage;
    expect([cmd.type, cmd.page, cmd.w, cmd.h, cmd.matrix]).toEqual(["AddImage", "p1", 200, 100, [1, 0, 0, 1, 300, 250]]);
    expect(cmd.asset).toMatchObject({ name: "a.png", mime: "image/png", size: 33 });
    expect(t.assets.has(cmd.asset.id)).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });

  it("point de dépôt dans le stage : image centrée sur ce point", async () => {
    const t = fakeTarget();
    await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(200, 100) })
      .importFiles([file("a.png", pngHead(200, 100))], { x: 100, y: 50 });
    expect((t.cmds[0] as AddImage).matrix).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("deux images : une étape chacune, la seconde décalée de 24 (cascade)", async () => {
    const t = fakeTarget();
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(200, 100) })
      .importFiles([file("a.png", pngHead(200, 100)), file("b.png", pngHead(200, 100))], null);
    expect(r.inserted).toEqual(["a.png", "b.png"]);
    expect(t.cmds.map((c) => (c as AddImage).matrix)).toEqual([[1, 0, 0, 1, 300, 250], [1, 0, 0, 1, 324, 274]]);
  });

  it("onglet cible lu une seule fois, au début de l'appel (R3)", async () => {
    const t = fakeTarget();
    const target = vi.fn(() => t.target);
    const openDocument = vi.fn(async () => true);
    const r = await createImporter({ openDocument, notify: vi.fn(async () => undefined), target, decode: decoded(10, 10) })
      .importFiles([file("b.roomboard"), file("a.png", pngHead(10, 10))], null);
    expect(target).toHaveBeenCalledTimes(1);
    expect([r.opened, r.inserted]).toEqual([["b.roomboard"], ["a.png"]]);
  });

  it("nom trompeur : un PNG nommé .jpg est inséré comme PNG", async () => {
    const t = fakeTarget();
    await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(10, 10) })
      .importFiles([file("photo.jpg", pngHead(10, 10))], null);
    expect((t.cmds[0] as AddImage).asset.mime).toBe("image/png");
  });

  it("plus de maxBytes : refusé avant lecture, .roomboard compris, un seul message", async () => {
    const blob = vi.fn(async () => new Blob([pngHead(1, 1)]));
    const big = (name: string): DroppedFile => ({ name, size: 120 * 1024 * 1024, mime: "", head: async () => new Uint8Array(), blob });
    const notify = vi.fn(async (_m: string) => undefined);
    const openDocument = vi.fn(async () => true);
    const r = await createImporter({ openDocument, notify, maxBytes: WEB_MAX_BYTES, target: () => fakeTarget().target })
      .importFiles([big("gros.png"), big("gros.roomboard")]);
    expect(blob).not.toHaveBeenCalled();
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.refused).toEqual(["gros.png", "gros.roomboard"]);
    expect(notify.mock.calls.map((c) => c[0])).toEqual(["gros.png, gros.roomboard : fichier trop gros (plus de 100 Mo)"]);
  });

  it("sans limite (coque) : un gros fichier passe", async () => {
    const t = fakeTarget();
    const f: DroppedFile = { name: "gros.png", size: 120 * 1024 * 1024, mime: "", head: async (n: number) => pngHead(10, 10).slice(0, n), blob: async () => new Blob([pngHead(10, 10)]) };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(10, 10) })
      .importFiles([f]);
    expect(r.inserted).toEqual(["gros.png"]);
  });

  it("plus de 100 Mpx lus dans l'en-tête PNG : refus avant décodage", async () => {
    const decode = decoded(1, 1);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, decode })
      .importFiles([file("big.png", pngHead(20000, 6000))]);
    expect(decode).not.toHaveBeenCalled();
    expect(r.failed).toEqual(["big.png"]);
    expect(notify).toHaveBeenCalledWith("big.png : image trop grande (plus de 100 millions de pixels)");
  });

  it("HEIC que la WebView ne lit pas : « HEIC illisible sur ce poste »", async () => {
    const head = new Uint8Array([0, 0, 0, 24, ...[..."ftypheic"].map((c) => c.charCodeAt(0)), 0, 0, 0, 0, ...[..."mif1heic"].map((c) => c.charCodeAt(0))]);
    const decode = vi.fn(async (): Promise<never> => {
      throw new Error("format non pris en charge");
    });
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, decode })
      .importFiles([file("x.heic", head)]);
    expect(r.failed).toEqual(["x.heic"]);
    expect(notify).toHaveBeenCalledWith("x.heic : HEIC illisible sur ce poste");
  });

  it("cœur qui refuse AddImage : rangé dans failed", async () => {
    const t = fakeTarget();
    const target: ImageTarget = { ...t.target, run: () => null };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => target, decode: decoded(10, 10) })
      .importFiles([file("a.png", pngHead(10, 10))]);
    expect(r.failed).toEqual(["a.png"]);
  });
});

describe("en-tête seul avant refus (OD56, T14, DAC5)", () => {
  it("S5 : non reconnu, head(4096) une fois, blob() jamais ; message de refus", async () => {
    const head = vi.fn(async (n: number) => new Uint8Array(Math.min(n, 16)));
    const blob = vi.fn(async (): Promise<Blob> => {
      throw new Error("blob() ne doit pas être lu");
    });
    const f: DroppedFile = { name: "notes.xyz", size: 50 * 1024 * 1024, mime: "", head, blob };
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify }).importFiles([f]);
    expect(r.refused).toEqual(["notes.xyz"]);
    expect(head).toHaveBeenCalledTimes(1);
    expect(head).toHaveBeenCalledWith(4096);
    expect(blob).not.toHaveBeenCalled();
    expect(notify.mock.calls[0]![0]).toBe(`notes.xyz : ${LATER_FORMAT_MESSAGE}`);
  });

  it("reconnu : head puis blob une fois ; .roomboard : blob seul (reconnu par son nom)", async () => {
    const t = fakeTarget();
    const png = pngHead(200, 100);
    const head = vi.fn(async (n: number) => png.slice(0, n));
    const blob = vi.fn(async () => new Blob([png]));
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(200, 100) })
      .importFiles([{ name: "a.png", size: png.length, mime: "", head, blob }], null);
    expect(r.inserted).toEqual(["a.png"]);
    expect([head.mock.calls.length, blob.mock.calls.length]).toEqual([1, 1]);
    const rbHead = vi.fn(async () => new Uint8Array());
    const rbBlob = vi.fn(async () => new Blob([new Uint8Array([1, 2])]));
    await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined) })
      .importFiles([{ name: "Cours.roomboard", size: 2, mime: "", head: rbHead, blob: rbBlob }]);
    expect([rbHead.mock.calls.length, rbBlob.mock.calls.length]).toEqual([0, 1]);
  });

  it("head qui lève : rangé dans failed, message, les autres continuent", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    const bad: DroppedFile = { name: "x.png", size: 1, mime: "", head: async () => { throw new Error("disque"); }, blob: async () => new Blob() };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify }).importFiles([bad, file("b.txt")]);
    expect(r.failed).toEqual(["x.png"]);
    expect(r.refused).toEqual(["b.txt"]);
    expect(notify.mock.calls[0]![0]).toContain("Import impossible (x.png) : disque");
  });
});

describe("import d'un objet .rbitem (Z10)", () => {
  const zip = new Uint8Array([0x50, 0x4b, 3, 4, 9, 9]);
  const deps = (t: ImageTarget | null, extra: Partial<Parameters<typeof createImporter>[0]> = {}) => ({
    openDocument: vi.fn(async () => true), notify: vi.fn(async (_m: string) => undefined), target: () => t, ...extra,
  });
  const names: string[] = [];
  const targetWith = (calls: Array<[Uint8Array, unknown, number]>, ok = true): ImageTarget => ({
    ...fakeTarget().target,
    insertFragment: async (b, at, i, name) => (calls.push([b, at, i]), names.push(name), ok),
  });

  it("reconnu par le nom ET l'en-tête ZIP : isRbitemName, ZIP_MAGIC", () => {
    expect(isRbitemName("a.rbitem")).toBe(true);
    expect(isRbitemName("A.RBITEM")).toBe(true);
    expect(isRbitemName(".rbitem")).toBe(false);
    expect(isRbitemName("a.png")).toBe(false);
    expect(Array.from(ZIP_MAGIC)).toEqual([0x50, 0x4b, 3, 4]);
  });

  it("un .rbitem est remis à la cible avec le point de dépôt, sans ouvrir d'onglet", async () => {
    const calls: Array<[Uint8Array, unknown, number]> = [];
    const d = deps(targetWith(calls));
    const r = await createImporter(d).importFiles([file("o.rbitem", zip)], { x: 5, y: 6 });
    expect(r).toEqual({ opened: [], inserted: ["o.rbitem"], refused: [], failed: [] });
    expect(calls).toEqual([[zip, { x: 5, y: 6 }, 0]]);
    expect(d.openDocument).not.toHaveBeenCalled();
  });

  it("nom en .rbitem sans en-tête ZIP : refusé, jamais lu en entier", async () => {
    const calls: Array<[Uint8Array, unknown, number]> = [];
    const blob = vi.fn(async () => new Blob([new Uint8Array([1])]));
    const f: DroppedFile = { name: "x.rbitem", size: 4, mime: "", head: async () => new Uint8Array([1, 2, 3, 4]), blob };
    const r = await createImporter(deps(targetWith(calls))).importFiles([f]);
    expect(r.refused).toEqual(["x.rbitem"]);
    expect(blob).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("en-tête ZIP sans l'extension : refusé (un .zip n'est pas un objet)", async () => {
    const r = await createImporter(deps(targetWith([]))).importFiles([file("o.zip", zip)]);
    expect(r.refused).toEqual(["o.zip"]);
  });

  it("R3 : a.roomboard puis b.rbitem, b va dans l'onglet d'origine lu au début", async () => {
    const calls: Array<[Uint8Array, unknown, number]> = [];
    const origin = targetWith(calls);
    let active: ImageTarget = origin;
    const target = vi.fn(() => active);
    const d = { ...deps(origin), target, openDocument: vi.fn(async () => ((active = fakeTarget().target), true)) };
    const r = await createImporter(d).importFiles([file("a.roomboard", new Uint8Array([1])), file("b.rbitem", zip)]);
    expect(r).toEqual({ opened: ["a.roomboard"], inserted: ["b.rbitem"], refused: [], failed: [] });
    expect(target).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  it("plusieurs .rbitem : l'indice de cascade croît comme pour les images", async () => {
    const calls: Array<[Uint8Array, unknown, number]> = [];
    await createImporter(deps(targetWith(calls))).importFiles([file("a.rbitem", zip), file("b.rbitem", zip), file("c.rbitem", zip)]);
    expect(calls.map((c) => c[2])).toEqual([0, 1, 2]);
  });

  it("le nom du fichier est transmis à la cible", async () => {
    names.length = 0;
    await createImporter(deps(targetWith([]))).importFiles([file("a.rbitem", zip), file("b.rbitem", zip)]);
    expect(names).toEqual(["a.rbitem", "b.rbitem"]);
  });

  it("sans onglet ou sans insertFragment : échec signalé, rien n'est inséré", async () => {
    for (const t of [null, fakeTarget().target]) {
      const d = deps(t);
      const r = await createImporter(d).importFiles([file("o.rbitem", zip)]);
      expect(r.failed).toEqual(["o.rbitem"]);
      expect(d.notify).toHaveBeenCalledTimes(1);
    }
  });

  it("insertion refusée par la cible : failed", async () => {
    const r = await createImporter(deps(targetWith([], false))).importFiles([file("o.rbitem", zip)]);
    expect(r).toEqual({ opened: [], inserted: [], refused: [], failed: ["o.rbitem"] });
  });
});

describe("registre : .rbitem et .xlsx, deux ZIP départagés par le nom (fusion C3 + C10b)", () => {
  const PK = new Uint8Array([0x50, 0x4b, 3, 4, 9]);
  const G: TableGrid = { rows: 1, cols: 1, cells: ["a"], merges: [], sourceRows: 1, sourceCols: 1, cutCells: false };

  it("un .xlsx va au classeur, un .rbitem à l'objet, dans le même appel", async () => {
    const t = fakeTarget();
    const fragments: Uint8Array[] = [];
    const target: ImageTarget = { ...t.target, insertFragment: async (b) => (fragments.push(b), true) };
    const readSheet = vi.fn(async (_b: Blob) => G);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => target, readSheet })
      .importFiles([file("v.xlsx", PK), file("o.rbitem", PK)], null);
    expect(r).toEqual({ opened: [], inserted: ["v.xlsx", "o.rbitem"], refused: [], failed: [] });
    expect(readSheet).toHaveBeenCalledTimes(1);
    expect(fragments).toEqual([PK]);
    expect(t.cmds).toHaveLength(1);
    expect(t.cmds[0]).toMatchObject({ type: "ImportTable" });
  });
});

describe("importFiles : classeur (F28)", () => {
  const G: TableGrid = { rows: 2, cols: 2, cells: ["a", "b", "c", "d"], merges: [], sourceRows: 2, sourceCols: 2, cutCells: false };
  const PK = new Uint8Array([0x50, 0x4b, 3, 4, 9]);

  it("S4 : .xlsx reconnu par son nom et PK : readSheet puis une ImportTable dans l'onglet actif", async () => {
    const t = fakeTarget();
    const readSheet = vi.fn(async (_b: Blob) => G);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => t.target, readSheet }).importFiles([file("v.xlsx", PK)], null);
    expect(r).toEqual({ opened: [], inserted: ["v.xlsx"], refused: [], failed: [] });
    expect(readSheet).toHaveBeenCalledTimes(1);
    expect(t.cmds).toHaveLength(1);
    expect(t.cmds[0]).toMatchObject({ type: "ImportTable", cols: 2, cells: ["a", "b", "c", "d"], colWidth: 240 });
    expect(notify).not.toHaveBeenCalled();
  });

  it("S4 : casse.xlsx sans en-tête PK : refusé par le registre (prochaine version) ; .xlsm avec PK : reconnu", async () => {
    const t = fakeTarget();
    const readSheet = vi.fn(async (_b: Blob) => G);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => t.target, readSheet })
      .importFiles([file("casse.xlsx", new Uint8Array([1, 2, 3, 4])), file("m.xlsm", PK)], null);
    expect([r.refused, r.inserted]).toEqual([["casse.xlsx"], ["m.xlsm"]]);
    expect(notify).toHaveBeenCalledWith(`casse.xlsx : ${LATER_FORMAT_MESSAGE}`);
  });

  it("S4 : lecture en échec : « Import impossible (casse.xlsx) : … » ; feuille vide : « <nom> : la première feuille est vide »", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    const fails = (m: string) => createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, readSheet: async () => { throw new Error(m); } });
    expect((await fails("classeur illisible : zip").importFiles([file("casse.xlsx", PK)])).failed).toEqual(["casse.xlsx"]);
    await fails(EMPTY_SHEET_MESSAGE).importFiles([file("vide.xlsx", PK)]);
    expect(notify.mock.calls.map((c) => c[0])).toEqual(["Import impossible (casse.xlsx) : classeur illisible : zip", `vide.xlsx : ${EMPTY_SHEET_MESSAGE}`]);
  });

  it("F22 : plus de 100 Mo dans la coque (maxBytes nul) : refusé par le gestionnaire, rien lu", async () => {
    const readSheet = vi.fn(async (_b: Blob) => G);
    const notify = vi.fn(async (_m: string) => undefined);
    const big = { ...file("big.xlsx", PK), size: SHEET_MAX_BYTES + 1 };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, readSheet }).importFiles([big]);
    expect(r.failed).toEqual(["big.xlsx"]);
    expect(readSheet).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith("big.xlsx : classeur trop gros pour un import en valeurs");
  });

  it("F22, constat T13 : plafond du gestionnaire vérifié avant f.blob() (coque : un .xlsx de 2 Go n'est jamais lu)", async () => {
    const readSheet = vi.fn(async (_b: Blob) => G);
    const notify = vi.fn(async (_m: string) => undefined);
    const blob = vi.fn(async () => new Blob([PK]));
    const big: DroppedFile = { ...file("big.xlsx", PK), size: 2 * 1024 * 1024 * 1024, blob };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, readSheet }).importFiles([big]);
    expect(blob).not.toHaveBeenCalled();
    expect(readSheet).not.toHaveBeenCalled();
    expect(r).toEqual({ opened: [], inserted: [], refused: [], failed: ["big.xlsx"] });
    expect(notify.mock.calls).toEqual([[`big.xlsx : ${SHEET_TOO_BIG_MESSAGE}`]]);
  });

  it("sans readSheet (amorce partielle, tests anciens) : .xlsx refusé comme avant", async () => {
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => fakeTarget().target }).importFiles([file("v.xlsx", PK)]);
    expect(r.refused).toEqual(["v.xlsx"]);
  });
});

describe("importFiles : PDF (C12, PF2, PF3)", () => {
  const PDF_HEAD = new TextEncoder().encode("%PDF-1.7\n%âã\n");
  const notify = () => vi.fn(async (_m: string) => undefined);
  const opener = (ok = true) => vi.fn(async (_f: { readonly name: string; readonly blob: Blob }) => ok);

  it("un .pdf reconnu par %PDF- ouvre un onglet : openPdf(nom, blob), aucun objet inséré (S1, Q1, effet de bord C12)", async () => {
    const openPdf = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf }).importFiles([file("Cours.pdf", PDF_HEAD)]);
    expect(r).toEqual({ opened: ["Cours.pdf"], inserted: [], refused: [], failed: [] });
    expect(openPdf.mock.calls[0]![0].name).toBe("Cours.pdf");
    expect(new Uint8Array(await openPdf.mock.calls[0]![0].blob.arrayBuffer())).toEqual(PDF_HEAD);
    expect(n).not.toHaveBeenCalled();
  });

  it("octets magiques seuls : un PDF nommé .txt est ouvert ; un .pdf sans %PDF- est refusé (PF3)", async () => {
    const openPdf = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf }).importFiles([file("note.txt", PDF_HEAD), file("faux.pdf", new Uint8Array([1, 2, 3]))]);
    expect([r.opened, r.refused]).toEqual([["note.txt"], ["faux.pdf"]]);
    expect(n).toHaveBeenCalledWith(`faux.pdf : ${LATER_FORMAT_MESSAGE}`);
  });

  it("%PDF- à l'octet 1019 : reconnu ; à l'octet 1020 : refusé (premier Kio, PF3)", () => {
    const at = (k: number): Uint8Array => {
      const b = new Uint8Array(k + PDF_HEAD.length);
      b.set(PDF_HEAD, k);
      return b;
    };
    expect([hasPdfMagic(at(0)), hasPdfMagic(at(1019)), hasPdfMagic(at(1020)), hasPdfMagic(new Uint8Array(3))]).toEqual([true, true, false, false]);
  });

  it("ouverture refusée (chiffré, illisible) : failed ; le message est celui d'openPdf, l'importeur n'en ajoute pas (S2)", async () => {
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf: opener(false) }).importFiles([file("secret.pdf", PDF_HEAD)]);
    expect(r).toEqual({ opened: [], inserted: [], refused: [], failed: ["secret.pdf"] });
    expect(n).not.toHaveBeenCalled();
  });

  it("onglets pleins : le premier PDF refusé arrête les documents suivants, .pdf et .roomboard (PF10, PC18)", async () => {
    const openPdf = opener(false);
    const openDocument = vi.fn(async () => true);
    const r = await createImporter({ openDocument, notify: notify(), openPdf, full: () => true })
      .importFiles([file("a.pdf", PDF_HEAD), file("b.pdf", PDF_HEAD), file("c.roomboard", new Uint8Array([1]))]);
    expect(openPdf).toHaveBeenCalledTimes(1);
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.failed).toEqual(["a.pdf", "b.pdf", "c.roomboard"]);
  });

  it("onglets pleins : un PDF qui suit un .roomboard refusé n'est pas lu en entier (correction de contre-relecture)", async () => {
    const openPdf = opener();
    const blob = vi.fn(async () => new Blob([PDF_HEAD]));
    const pdf: DroppedFile = { name: "b.pdf", size: PDF_HEAD.length, mime: "", head: async () => PDF_HEAD, blob };
    const r = await createImporter({ openDocument: async () => false, notify: notify(), openPdf, full: () => true })
      .importFiles([file("a.roomboard", new Uint8Array([1])), pdf]);
    expect(r.failed).toEqual(["a.roomboard", "b.pdf"]);
    expect([blob.mock.calls.length, openPdf.mock.calls.length]).toEqual([0, 0]);
  });

  it("web : un PDF de 120 Mo est refusé avant lecture (S2, PF9)", async () => {
    const head = vi.fn(async () => PDF_HEAD);
    const blob = vi.fn(async () => new Blob([PDF_HEAD]));
    const big: DroppedFile = { name: "gros.pdf", size: 120 * 1024 * 1024, mime: "", head, blob };
    const openPdf = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf, maxBytes: WEB_MAX_BYTES }).importFiles([big]);
    expect(r.refused).toEqual(["gros.pdf"]);
    expect([head.mock.calls.length, blob.mock.calls.length, openPdf.mock.calls.length]).toEqual([0, 0, 0]);
    expect(n).toHaveBeenCalledWith("gros.pdf : fichier trop gros (plus de 100 Mo)");
  });

  it("sans openPdf (amorce partielle, tests anciens) : .pdf refusé comme avant", async () => {
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n }).importFiles([file("Cours.pdf", PDF_HEAD)]);
    expect(r.refused).toEqual(["Cours.pdf"]);
    expect(n).toHaveBeenCalledWith(`Cours.pdf : ${LATER_FORMAT_MESSAGE}`);
  });
});

const asciiBytes = (...parts: Array<string | number[]>): Uint8Array<ArrayBuffer> =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? Array.from(p, (c) => c.charCodeAt(0)) : p)));
const WEBM = asciiBytes([0x1a, 0x45, 0xdf, 0xa3, 0x93, 0x42, 0x82, 0x84], "webm", [0x42, 0x87, 0x81, 0x02, 0, 0, 0, 0]);
const MKV = asciiBytes([0x1a, 0x45, 0xdf, 0xa3, 0x93, 0x42, 0x82, 0x88], "matroska", [0x42, 0x87, 0x81, 0x02, 0, 0, 0, 0]);
const WAV = asciiBytes("RIFF", [0x24, 0, 0, 0], "WAVEfmt ", [16, 0, 0, 0]);
const AVI = asciiBytes("RIFF", [0x24, 0, 0, 0], "AVI LIST", [16, 0, 0, 0]);
const HEIC = asciiBytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic");
const AVIF = asciiBytes([0, 0, 0, 0x18], "ftypavif", [0, 0, 0, 0], "avifmif1");
/** R5 : marque majeure neutre, marque d'image dans les compatibles. */
const MIAF_HEIC = asciiBytes([0, 0, 0, 0x18], "ftypmiaf", [0, 0, 0, 0], "miafheic");
const MB = 1024 * 1024;
const LINK_ID = "b".repeat(64);
type AddMedia = Extract<Command, { type: "AddMedia" }>;

/** Fichier de la coque : taille annoncée, `blob()` espionné (jamais lu pour un fichier lié). */
function sized(name: string, bytes: Uint8Array<ArrayBuffer>, size: number, path?: string, blobType = "") {
  const blob = vi.fn(async () => new Blob([bytes], { type: blobType }));
  const f: DroppedFile = { name, size, mime: "", path, head: async (n: number) => bytes.slice(0, n), blob };
  return { f, blob };
}
function mediaDeps(over: { probe?: (url: string) => Promise<MediaProbe>; linkMedia?: ((path: string) => Promise<LinkedMedia>) | null } = {}) {
  const created: Blob[] = [];
  const revoked: string[] = [];
  const mediaUrls = {
    create: vi.fn((b: Blob) => (created.push(b), `blob:fake/${created.length}`)),
    revoke: vi.fn((u: string) => void revoked.push(u)),
  };
  const poster = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: POSTER_MIME });
  const probe = vi.fn(over.probe ?? (async (_url: string): Promise<MediaProbe> => ({ duration: 12.5, width: 320, height: 180, poster })));
  const linkMedia =
    over.linkMedia === null ? undefined : vi.fn(over.linkMedia ?? (async (path: string): Promise<LinkedMedia> => ({ id: LINK_ID, url: `asset://localhost${path}` })));
  const notify = vi.fn(async (_m: string) => undefined);
  return { created, revoked, mediaUrls, probe, linkMedia, notify, poster };
}

describe("importFiles : médias (C14)", () => {
  it("WebM déposé : sonde, poster et média au magasin, AddMedia en une étape, centré (S1)", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls, linkMedia: d.linkMedia })
      .importFiles([file("clip.webm", WEBM)], null);
    expect(r).toEqual({ opened: [], inserted: ["clip.webm"], refused: [], failed: [] });
    expect(d.probe).toHaveBeenCalledWith("blob:fake/1");
    expect(d.revoked).toEqual(["blob:fake/1"]);
    expect(t.cmds).toHaveLength(1);
    const cmd = t.cmds[0] as AddMedia;
    expect([cmd.type, cmd.page, cmd.mediaType, cmd.w, cmd.h, cmd.duration, cmd.linked]).toEqual(["AddMedia", "p1", "video", 320, 180, 12.5, null]);
    expect(cmd.matrix).toEqual([1, 0, 0, 1, 240, 210]);
    expect(cmd.asset).toMatchObject({ name: "clip.webm", mime: "video/webm", size: WEBM.length });
    expect(t.assets.has(cmd.asset.id)).toBe(true);
    expect(cmd.poster).toMatchObject({ name: "clip.webm.jpg", mime: POSTER_MIME, size: d.poster.size });
    expect(t.assets.has(cmd.poster!.id)).toBe(true);
    expect(d.linkMedia).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });

  it("son WAV : 480 × 120, aucun poster, audio (S3)", async () => {
    const t = fakeTarget();
    const d = mediaDeps({ probe: async () => ({ duration: 3, width: 0, height: 0, poster: null }) });
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([file("voix.wav", WAV)], null);
    expect(r.inserted).toEqual(["voix.wav"]);
    const cmd = t.cmds[0] as AddMedia;
    const rect = t.target.stageRect();
    expect([cmd.mediaType, cmd.w, cmd.h, cmd.duration, cmd.poster]).toEqual(["audio", AUDIO_BOX.w, AUDIO_BOX.h, 3, null]);
    expect(cmd.asset.mime).toBe("audio/wav");
    expect(cmd.matrix).toEqual(placement(AUDIO_BOX.w, AUDIO_BOX.h, anchorOf(rect, IDENTITY, null), visibleOf(rect, IDENTITY), 0));
  });

  it("sonde en échec : « codec non lu sur ce poste », rien d'inséré, URL révoquée (M15)", async () => {
    const t = fakeTarget();
    const d = mediaDeps({ probe: async () => { throw new Error(CODEC_UNREADABLE); } });
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([file("clip.webm", WEBM)]);
    expect(r.failed).toEqual(["clip.webm"]);
    expect(t.cmds).toEqual([]);
    expect(d.revoked).toEqual(["blob:fake/1"]);
    expect(d.notify.mock.calls).toEqual([[`clip.webm : ${CODEC_UNREADABLE}`]]);
  });

  it("MKV et AVI : un message chacun, blob jamais lu (S4, M12)", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const mkv = sized("film.mkv", MKV, MKV.length);
    const avi = sized("film.avi", AVI, AVI.length);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([mkv.f, avi.f]);
    expect(r).toEqual({ opened: [], inserted: [], refused: [], failed: ["film.mkv", "film.avi"] });
    expect(mkv.blob).not.toHaveBeenCalled();
    expect(avi.blob).not.toHaveBeenCalled();
    expect(d.probe).not.toHaveBeenCalled();
    expect(d.notify.mock.calls).toEqual([[`film.mkv : ${unsupportedMediaMessage("mkv")}`], [`film.avi : ${unsupportedMediaMessage("avi")}`]]);
  });

  it("un HEIC et un AVIF restent des images après l'ajout du média", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, decode: decoded(40, 30), probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([file("a.heic", HEIC), file("b.avif", AVIF)]);
    expect(r.inserted).toEqual(["a.heic", "b.avif"]);
    expect(d.probe).not.toHaveBeenCalled();
    expect(t.cmds.map((c) => c.type)).toEqual(["AddImage", "AddImage"]);
    expect(t.cmds.map((c) => (c as AddImage).asset.mime)).toEqual(["image/heic", "image/avif"]);
  });

  it("R5 : marque majeure miaf, heic dans les compatibles : reste une image, sonde jamais appelée", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, decode: decoded(40, 30), probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([file("c.heic", MIAF_HEIC)]);
    expect(r.inserted).toEqual(["c.heic"]);
    expect(d.probe).not.toHaveBeenCalled();
    expect(t.cmds.map((c) => c.type)).toEqual(["AddImage"]);
  });

  it("coque, chemin et plus de 50 Mo : lié, blob jamais lu, lien au magasin, avertissement (S5, M14)", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    // 60 Mo, et 2 Go : au-delà du plafond de 100 Mo, un fichier lié n'est ni lu ni refusé par `limit`.
    const a = sized("cours.webm", WEBM, 60 * MB, "/v/cours.webm");
    const b = sized("long.webm", WEBM, 2 * 1024 * MB, "/v/long.webm");
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls, linkMedia: d.linkMedia })
      .importFiles([a.f, b.f]);
    expect(r).toEqual({ opened: [], inserted: ["cours.webm", "long.webm"], refused: [], failed: [] });
    expect(a.blob).not.toHaveBeenCalled();
    expect(b.blob).not.toHaveBeenCalled();
    expect(d.mediaUrls.create).not.toHaveBeenCalled();
    expect(d.linkMedia!.mock.calls).toEqual([["/v/cours.webm"], ["/v/long.webm"]]);
    expect(d.probe.mock.calls).toEqual([["asset://localhost/v/cours.webm"], ["asset://localhost/v/long.webm"]]);
    expect(t.assets.linked(LINK_ID)).toBe("/v/long.webm");
    const cmds = t.cmds as AddMedia[];
    expect(cmds.map((c) => [c.type, c.linked, c.asset.id, c.asset.size, c.asset.mime])).toEqual([
      ["AddMedia", "/v/cours.webm", LINK_ID, 60 * MB, "video/webm"],
      ["AddMedia", "/v/long.webm", LINK_ID, 2 * 1024 * MB, "video/webm"],
    ]);
    expect(cmds[1]!.matrix[4] - cmds[0]!.matrix[4]).toBe(24); // cascade comme les images
    expect(d.notify.mock.calls).toEqual([[`cours.webm : ${MEDIA_LINKED_NOTE}`], [`long.webm : ${MEDIA_LINKED_NOTE}`]]);
  });

  it("coque, chemin et au plus 50 Mo : inclus", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const a = sized("court.webm", WEBM, MEDIA_INCLUDE_MAX_BYTES, "/v/court.webm");
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls, linkMedia: d.linkMedia })
      .importFiles([a.f]);
    expect(r.inserted).toEqual(["court.webm"]);
    expect(d.linkMedia).not.toHaveBeenCalled();
    expect(a.blob).toHaveBeenCalledTimes(1);
    const cmd = t.cmds[0] as AddMedia;
    expect(cmd.linked).toBeNull();
    expect(t.assets.has(cmd.asset.id)).toBe(true);
    expect(d.notify).not.toHaveBeenCalled();
  });

  it("sans chemin, plus de 100 Mo : « trop lourd pour être inclus » (M13)", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const a = sized("colle.webm", WEBM, MEDIA_PASTE_MAX_BYTES + 1);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls, linkMedia: d.linkMedia })
      .importFiles([a.f]);
    expect(r.failed).toEqual(["colle.webm"]);
    expect(a.blob).not.toHaveBeenCalled();
    expect(d.linkMedia).not.toHaveBeenCalled();
    expect(d.notify.mock.calls).toEqual([[`colle.webm : ${MEDIA_TOO_BIG}`]]);
  });

  it("web, plus de 100 Mo : « plus de 100 Mo » (S4)", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const a = sized("gros.webm", WEBM, WEB_MAX_BYTES + 1);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, maxBytes: WEB_MAX_BYTES, probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([a.f]);
    expect(r.refused).toEqual(["gros.webm"]);
    expect(a.blob).not.toHaveBeenCalled();
    expect(d.probe).not.toHaveBeenCalled();
    expect(d.notify.mock.calls).toEqual([["gros.webm : fichier trop gros (plus de 100 Mo)"]]);
  });

  it("onglet fermé pendant la sonde : rien d'inséré", async () => {
    let open = true;
    const t = fakeTarget();
    const target: ImageTarget = { ...t.target, alive: () => open };
    const d = mediaDeps({ probe: async () => ((open = false), { duration: 1, width: 320, height: 180, poster: null }) });
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => target, probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([file("clip.webm", WEBM)]);
    expect(r.failed).toEqual(["clip.webm"]);
    expect(t.cmds).toEqual([]);
    expect(d.notify).toHaveBeenCalledTimes(1);
    expect(d.notify.mock.calls[0]![0]).toMatch(/^clip\.webm : onglet fermé/);
  });

  it("sans linkMedia : un chemin de 60 Mo est inclus", async () => {
    const t = fakeTarget();
    const d = mediaDeps({ linkMedia: null });
    const a = sized("cours.webm", WEBM, 60 * MB, "/v/cours.webm");
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([a.f]);
    expect(r.inserted).toEqual(["cours.webm"]);
    expect(a.blob).toHaveBeenCalledTimes(1);
    expect((t.cmds[0] as AddMedia).linked).toBeNull();
  });

  it("R3 : un Blob sans type est retypé par sniff.mime (sonde, magasin, AddMedia)", async () => {
    const t = fakeTarget();
    const d = mediaDeps();
    const a = sized("sans-type.bin", WEBM, WEBM.length);
    const f: DroppedFile = { ...a.f, mime: "application/octet-stream" };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls })
      .importFiles([f]);
    expect(r.inserted).toEqual(["sans-type.bin"]);
    expect(d.created.map((b) => b.type)).toEqual(["video/webm"]);
    const cmd = t.cmds[0] as AddMedia;
    expect([cmd.mediaType, cmd.asset.mime]).toEqual(["video", "video/webm"]);
    expect(t.assets.get(cmd.asset.id)!.type).toBe("video/webm");
  });

  it("R4 : linkMedia rejette : message, rien inséré, fichier suivant traité", async () => {
    const t = fakeTarget();
    const d = mediaDeps({ linkMedia: async () => { throw new Error("NotGranted"); } });
    const a = sized("cours.webm", WEBM, 60 * MB, "/v/cours.webm");
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => t.target, probe: d.probe, mediaUrls: d.mediaUrls, linkMedia: d.linkMedia })
      .importFiles([a.f, file("voix.wav", WAV)]);
    expect(r).toEqual({ opened: [], inserted: ["voix.wav"], refused: [], failed: ["cours.webm"] });
    expect(a.blob).not.toHaveBeenCalled();
    expect(t.cmds.map((c) => (c as AddMedia).asset.name)).toEqual(["voix.wav"]);
    expect(t.assets.linked(LINK_ID)).toBeUndefined();
    expect(d.notify.mock.calls).toEqual([[`cours.webm : ${MEDIA_NOT_LINKED} : NotGranted`]]);
    expect(MEDIA_NOT_LINKED).toBe("vidéo non liée");
  });

  it("lié vers un onglet dont le magasin n'a pas link : « trop lourd pour être inclus », rien lu", async () => {
    const t = fakeTarget();
    const target: ImageTarget = { ...t.target, assets: { put: (b: Blob) => t.assets.put(b) } };
    const d = mediaDeps();
    const a = sized("cours.webm", WEBM, 60 * MB, "/v/cours.webm");
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: d.notify, target: () => target, probe: d.probe, mediaUrls: d.mediaUrls, linkMedia: d.linkMedia })
      .importFiles([a.f]);
    expect(r.failed).toEqual(["cours.webm"]);
    expect(a.blob).not.toHaveBeenCalled();
    expect(d.linkMedia).not.toHaveBeenCalled();
    expect(t.cmds).toEqual([]);
    expect(d.notify.mock.calls).toEqual([[`cours.webm : ${MEDIA_TOO_BIG}`]]);
  });

  it("R1 : un .roomboard déposé avec f.path transmet path", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async () => undefined);
    await createImporter({ openDocument, notify }).importFiles([file("Cours.roomboard", new Uint8Array([1, 2]), "/docs/Cours.roomboard")]);
    expect(openDocument).toHaveBeenCalledWith({ name: "Cours.roomboard", bytes: new Uint8Array([1, 2]), target: null, path: "/docs/Cours.roomboard" });
  });
});
