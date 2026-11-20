import { describe, expect, it, vi } from "vitest";
import type { DroppedFile } from "./files";
import type { Command } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { IDENTITY } from "../engine/camera";
import type { ImageTarget } from "./image-import";
import { createImporter, isRoomboardName, LATER_FORMAT_MESSAGE, WEB_MAX_BYTES } from "./import";

const file = (name: string, bytes = new Uint8Array([80, 75, 3, 4]), path?: string): DroppedFile => ({
  name, size: bytes.length, mime: "", path, blob: async () => new Blob([bytes]),
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
    const bad: DroppedFile = { name: "x.roomboard", size: 1, mime: "", blob: async () => { throw new Error("disque"); } };
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
    const big = (name: string): DroppedFile => ({ name, size: 120 * 1024 * 1024, mime: "", blob });
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
    const f: DroppedFile = { name: "gros.png", size: 120 * 1024 * 1024, mime: "", blob: async () => new Blob([pngHead(10, 10)]) };
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
