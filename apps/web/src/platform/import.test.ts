import { describe, expect, it, vi } from "vitest";
import type { DroppedFile } from "./files";
import type { Command } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { IDENTITY } from "../engine/camera";
import type { TableGrid } from "./html-table";
import type { ImageTarget } from "./image-import";
import { createImporter, isRbitemName, isRoomboardName, LATER_FORMAT_MESSAGE, SHEET_MAX_BYTES, WEB_MAX_BYTES, ZIP_MAGIC } from "./import";
import { EMPTY_SHEET_MESSAGE, SHEET_TOO_BIG_MESSAGE } from "./sheet-reader";

const file = (name: string, bytes = new Uint8Array([80, 75, 3, 4]), path?: string): DroppedFile => ({
  name, size: bytes.length, mime: "", path, head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
});

describe("importFiles (T86, usage § 8 point 12, Q1)", () => {
  it("un .roomboard s'ouvre (nouvel onglet), sans cible d'écriture (CL5b-4)", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument, notify }).importFiles([file("Cours.roomboard", new Uint8Array([1, 2]))]);
    expect(openDocument).toHaveBeenCalledWith({ name: "Cours.roomboard", bytes: new Uint8Array([1, 2]), target: null });
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
