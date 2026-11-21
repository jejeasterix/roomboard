// @vitest-environment happy-dom
import { PDFDocument, StandardFonts } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Command, CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import type { PdfEngine, PdfFile, TileBitmap } from "../engine/render/pdf-port";
import { createClipboard } from "../platform/clipboard";
import { fakeCore } from "../core/fake-core";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { APP_VERSION, DISCARD_MESSAGE, UNREAD_ASSETS_MESSAGE } from "../platform/controller";
import type { DropHandler, DroppedFile, FileHost, HostKind, OpenedFile, SaveTarget } from "../platform/files";
import { PASTE_MAX_CHARS, PASTE_TOO_BIG, type TableGrid } from "../platform/html-table";
import { NOT_OFFICE_PAGE_MESSAGE, OFFICE_VALUES_MESSAGE, OfficeConvertError, originalChangedMessage } from "../platform/office-import";
import { createImporter, LATER_FORMAT_MESSAGE } from "../platform/import";
import type { LinkedMedia } from "../platform/media-import";
import { cubeGlb } from "../platform/model3d-fixtures";
import type { ModelView } from "../platform/model-view";
import { PdfEncryptedError } from "../platform/pdf-render";
import type { StartedDocument } from "../platform/mount";
import type { BoardSession } from "./board-session";
import type { OverlayProducer, OverlayRequest } from "./pdf-export";
import { NO_GRID_MESSAGE } from "./fragments";
import { MAX_TABS, TOO_MANY_TABS } from "./tabs";
import { CODEC_FALLBACK_MESSAGE, createWorkspace, type TabSession, type Workspace, type WorkspaceDeps } from "./workspace";

// Passe-plat : l'importeur reste le vrai ; seul l'appel est observé (C14 : `linkMedia` transmis).
vi.mock("../platform/import", async (importOriginal) => {
  const m = await importOriginal<typeof import("../platform/import")>();
  return { ...m, createImporter: vi.fn(m.createImporter) };
});

interface FakeBoard {
  readonly board: BoardSession;
  readonly n: number;
  bump(): void;
  listeners(): number;
}

let log: string[];
let boards: FakeBoard[];
let answer: boolean;
let guard: () => boolean;
let guardStops: number;
let dropHandler: DropHandler | null;
let dropStops: number;
let opening: OpenedFile | null;
let shell: {
  confirm: ReturnType<typeof vi.fn<(m: string) => Promise<boolean>>>;
  notify: ReturnType<typeof vi.fn<(m: string) => Promise<void>>>;
  guardClose: ReturnType<typeof vi.fn<(isDirty: () => boolean, message: string) => () => void>>;
  setTitle: ReturnType<typeof vi.fn<(t: string) => void>>;
};
let host: FileHost & { save: ReturnType<typeof vi.fn<(e: (t: SaveTarget) => Promise<Uint8Array>, t: SaveTarget) => Promise<SaveTarget | null>>> };
let codec: { read: ReturnType<typeof vi.fn<ContainerCodec["read"]>>; write: ReturnType<typeof vi.fn<ContainerCodec["write"]>> };
let saved: Uint8Array[];

beforeEach(() => {
  log = [];
  boards = [];
  answer = true;
  guard = () => false;
  guardStops = 0;
  dropHandler = null;
  dropStops = 0;
  opening = null;
  saved = [];
  codec = {
    read: vi.fn<ContainerCodec["read"]>(async (b) => {
      const ybin = new Uint8Array(await b.arrayBuffer());
      return { manifest: ybin, ybin, assets: [], warnings: [] }; // le faux cœur lit le type dans le manifeste (C4)
    }),
    write: vi.fn<ContainerCodec["write"]>(async () => new Uint8Array([0x50, 0x4b, 1])),
  };
  shell = {
    confirm: vi.fn(async (_m: string) => answer),
    notify: vi.fn(async (_m: string) => undefined),
    guardClose: vi.fn((isDirty: () => boolean, _message: string) => {
      guard = isDirty;
      return () => {
        guardStops += 1;
      };
    }),
    setTitle: vi.fn((_t: string) => undefined),
  };
});

function fakeSession(doc: CoreDocument): FakeBoard {
  let sel: string[] = [];
  const cbs = new Set<(s: { version: number }) => void>();
  const n = boards.length + 1;
  const board = {
    doc,
    measure: (s: string) => s.length * 10,
    engine: {
      textStyle: () => ({ color: "#1d4ed8", size: 36 }),
      state: () => ({ version: doc.version(), page: doc.pageIds()[0] ?? "", selection: [...sel] }),
      select: (ids: string[]) => {
        sel = ids;
      },
      insertFragment: (src: CoreDocument, dx: number, dy: number) => doc.insertFragment(src, doc.pageIds()[0] ?? "", dx, dy),
      insertPages: (src: CoreDocument) => doc.insertPages(src, doc.pageIds()[0] ?? ""),
      deleteElements: vi.fn((ids: string[]) => {
        const c = doc.apply({ type: "Delete", ids });
        for (const cb of cbs) cb({ version: doc.version() });
        return c;
      }),
      group: vi.fn(() => true),
      ungroup: vi.fn(() => true),
      camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
      run: (cmd: Command) => {
        const c = doc.apply(cmd);
        for (const cb of cbs) cb({ version: doc.version() });
        return c;
      },
      onState(cb: (s: { version: number }) => void) {
        cbs.add(cb);
        return () => {
          cbs.delete(cb);
        };
      },
    },
    stage: document.createElement("div"),
    activate: vi.fn(() => {
      log.push(`activate ${n}`);
    }),
    deactivate: vi.fn(() => {
      log.push(`deactivate ${n}`);
    }),
    dispose: vi.fn(() => {
      log.push(`dispose ${n}`);
    }),
  } as unknown as BoardSession;
  const entry: FakeBoard = {
    board,
    n,
    bump() {
      for (const cb of cbs) cb({ version: doc.version() });
    },
    listeners: () => cbs.size,
  };
  boards.push(entry);
  return entry;
}

const fakeOf = (tab: TabSession): FakeBoard => {
  const f = boards.find((b) => b.board === tab.board);
  if (!f) throw new Error("session inconnue");
  return f;
};

function drawOn(tab: TabSession, y = 10): void {
  const doc = tab.board.doc;
  const page = doc.pageIds()[0];
  if (page === undefined) throw new Error("aucune page");
  doc.apply({ type: "CommitStroke", page, points: new Float32Array([0, y, 0.5, 50, y, 0.5]), style: { color: "#000000", width: 4 } });
  fakeOf(tab).bump();
}

function undoOn(tab: TabSession): void {
  tab.board.doc.undo();
  fakeOf(tab).bump();
}

const strokes = (tab: TabSession): number => tab.board.doc.elementIds(tab.board.doc.pageIds()[0] ?? "").length;

function validBytes(): Uint8Array {
  return fakeCore.blank().save("2026-11-20T00:00:00Z", "0.1.0");
}

function roomboardFile(path: string, bytes: Uint8Array = validBytes()): DroppedFile {
  // Nom = chemin complet : le pire cas d'un hôte ; l'espace de travail n'affiche que le nom de base.
  return {
    name: path,
    size: bytes.byteLength,
    mime: "",
    path,
    head: async (n: number) => bytes.slice(0, n),
    blob: async () => ({ arrayBuffer: async () => bytes.slice().buffer }) as unknown as Blob,
  };
}

function plainFile(name: string, bytes: Uint8Array<ArrayBuffer> = new Uint8Array([0x49, 0x49, 0x2a, 0x00]), size = bytes.byteLength): DroppedFile {
  return { name, size, mime: "", head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]) };
}
function pngHead(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}
const NOW = "2026-11-20T00:00:00Z";
const ID = "ab".repeat(32);
function docWithImage(): CoreDocument {
  const d = fakeCore.blank();
  d.apply({ type: "AddImage", page: d.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
  return d;
}
const fakeDecode = vi.fn(async (_b: Blob, _k: string) => ({ bitmap: { close() {} } as unknown as ImageBitmap, w: 10, h: 10 }));

/** 64 caractères hexadécimaux, même contenu → même empreinte (suffit au magasin des tests). */
const fakeHasher = async (b: Blob): Promise<string> => {
  let h = 0;
  for (const x of new Uint8Array(await b.arrayBuffer())) h = (h * 31 + x) >>> 0;
  return h.toString(16).padStart(64, "0");
};

const k = (key: string, m: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; repeat: boolean }> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...m,
});
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

interface SetupOptions {
  readonly kind?: HostKind;
  readonly first?: StartedDocument;
  readonly onDrop?: FileHost["onDrop"];
  readonly dropReady?: WorkspaceDeps["dropReady"];
  readonly launch?: WorkspaceDeps["launch"];
  readonly decode?: WorkspaceDeps["decode"];
  readonly readSheet?: WorkspaceDeps["readSheet"];
  readonly clipboard?: WorkspaceDeps["clipboard"];
  readonly itemFiles?: WorkspaceDeps["itemFiles"];
  readonly pdf?: WorkspaceDeps["pdf"];
  readonly pdfFiles?: WorkspaceDeps["pdfFiles"];
  readonly loadPdfLib?: WorkspaceDeps["loadPdfLib"];
  readonly overlay?: WorkspaceDeps["overlay"];
  readonly rasterPage?: WorkspaceDeps["rasterPage"];
  readonly rasterClose?: WorkspaceDeps["rasterClose"];
  readonly linkMedia?: WorkspaceDeps["linkMedia"];
  readonly relinkMedia?: WorkspaceDeps["relinkMedia"];
  readonly model3d?: WorkspaceDeps["model3d"];
  readonly importPack?: WorkspaceDeps["importPack"];
  readonly thumbnail?: WorkspaceDeps["thumbnail"];
  readonly convertOffice?: WorkspaceDeps["convertOffice"];
  readonly officeConverter?: WorkspaceDeps["officeConverter"];
  readonly openOriginal?: WorkspaceDeps["openOriginal"];
  readonly reimportOriginal?: WorkspaceDeps["reimportOriginal"];
  readonly onOriginalChanged?: WorkspaceDeps["onOriginalChanged"];
}

async function setupWorkspace(o: SetupOptions = {}): Promise<Workspace> {
  host = {
    kind: o.kind ?? "repli",
    onDrop:
      o.onDrop ??
      ((h: DropHandler) => {
        dropHandler = h;
        return () => {
          dropStops += 1;
        };
      }),
    open: async () => opening,
    pick: async () => [],
    save: vi.fn(async (encode: (t: SaveTarget) => Promise<Uint8Array>, t: SaveTarget): Promise<SaveTarget | null> => {
      saved.push(await encode(t));
      return t.kind === "ask" ? { kind: "download", name: t.name } : t;
    }),
  };
  let n = 0;
  return createWorkspace({
    core: fakeCore,
    host,
    kind: host.kind,
    shell,
    codec,
    first: o.first ?? { doc: fakeCore.blank(), opened: null, error: null },
    makeSession: async (doc, _assets) => fakeSession(doc).board,
    makeAssets: () => createAssetStore(fakeHasher),
    ...(o.decode ? { decode: o.decode } : {}),
    ...(o.readSheet ? { readSheet: o.readSheet } : {}),
    ...(o.clipboard ? { clipboard: o.clipboard } : {}),
    ...(o.itemFiles ? { itemFiles: o.itemFiles } : {}),
    ...(o.pdf ? { pdf: o.pdf } : {}),
    ...(o.pdfFiles ? { pdfFiles: o.pdfFiles } : {}),
    ...(o.loadPdfLib ? { loadPdfLib: o.loadPdfLib } : {}),
    ...(o.overlay ? { overlay: o.overlay } : {}),
    ...(o.rasterPage ? { rasterPage: o.rasterPage } : {}),
    ...(o.rasterClose ? { rasterClose: o.rasterClose } : {}),
    ...(o.linkMedia ? { linkMedia: o.linkMedia } : {}),
    ...(o.relinkMedia ? { relinkMedia: o.relinkMedia } : {}),
    ...(o.model3d ? { model3d: o.model3d } : {}),
    ...(o.importPack ? { importPack: o.importPack } : {}),
    ...(o.thumbnail ? { thumbnail: o.thumbnail } : {}),
    ...(o.convertOffice ? { convertOffice: o.convertOffice } : {}),
    ...(o.officeConverter === undefined ? {} : { officeConverter: o.officeConverter }),
    ...(o.openOriginal ? { openOriginal: o.openOriginal } : {}),
    ...(o.reimportOriginal ? { reimportOriginal: o.reimportOriginal } : {}),
    ...(o.onOriginalChanged ? { onOriginalChanged: o.onOriginalChanged } : {}),
    dropReady: o.dropReady ?? (() => Promise.resolve()),
    ...(o.launch ? { launch: o.launch } : {}),
    now: () => "2026-11-20T00:00:00Z",
    newId: () => `w${++n}`,
  });
}

describe("espace de travail : ouvrir et nouveau (CL5b-3, Q1)", () => {
  it("ouvrir : nouvel onglet, l'onglet d'origine intact", async () => {
    const ws = await setupWorkspace(); // un onglet vierge
    const first = ws.active();
    drawOn(first); // version + 1 : modifié
    const bytes = fakeCore.blank().save("2026-11-20T00:00:00Z", "0.1.0");
    expect(await ws.openDocument({ name: "Cours.roomboard", bytes, target: null })).toBe(true);
    expect(ws.tabs.list()).toHaveLength(2);
    expect(ws.active()).not.toBe(first);
    expect(first.files.isDirty()).toBe(true); // rien d'abandonné, aucune question
    expect(strokes(first)).toBe(1);
    expect(shell.confirm).not.toHaveBeenCalled();
    expect(ws.active().files.name()).toBe("Cours.roomboard");
    expect(ws.active().board.doc).not.toBe(first.board.doc);
  });

  it("Ctrl+O : la boîte puis un nouvel onglet, sans question ; la cible de la boîte est reprise par Ctrl+S", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    drawOn(first);
    opening = { name: "a.roomboard", bytes: validBytes(), target: { kind: "tauri", name: "a.roomboard", path: "/cours/a.roomboard" } };
    expect(await first.files.run("open")).toBe(true);
    expect(ws.tabs.list()).toHaveLength(2);
    expect(shell.confirm).not.toHaveBeenCalled();
    expect([first.files.isDirty(), strokes(first)]).toEqual([true, 1]);
    const opened = ws.active();
    expect(opened.files.name()).toBe("a.roomboard");
    drawOn(opened);
    expect(await opened.files.run("save")).toBe(true);
    expect(host.save.mock.calls.map((c) => c[1])).toEqual([{ kind: "tauri", name: "a.roomboard", path: "/cours/a.roomboard" }]);
  });

  it("Ctrl+N : un onglet vierge, l'onglet modifié reste tel quel", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    drawOn(first);
    expect(ws.key(k("n", { ctrlKey: true }))).toBe(true);
    await flush();
    expect(ws.tabs.list()).toHaveLength(2);
    expect(ws.active()).not.toBe(first);
    expect(strokes(ws.active())).toBe(0);
    expect([first.files.isDirty(), strokes(first), shell.confirm.mock.calls.length]).toEqual([true, 1, 0]);
  });

  it("fichier illisible : message, aucun onglet ajouté", async () => {
    const ws = await setupWorkspace();
    expect(await ws.openDocument({ name: "x.roomboard", bytes: new Uint8Array([1, 2, 3]), target: null })).toBe(false);
    expect(shell.notify).toHaveBeenCalledTimes(1);
    expect(shell.notify.mock.calls[0]![0]).toMatch(/^Ouverture impossible \(x\.roomboard\) : /);
    expect([ws.tabs.list().length, boards.length]).toEqual([1, 1]);
  });

  it("13e onglet : message « 12 onglets au plus », aucune session créée", async () => {
    const ws = await setupWorkspace();
    for (let i = 1; i < 12; i++) await ws.newBlank();
    expect(ws.tabs.list()).toHaveLength(12);
    expect(await ws.openDocument({ name: "b.roomboard", bytes: validBytes(), target: null })).toBe(false);
    expect(shell.notify).toHaveBeenLastCalledWith(TOO_MANY_TABS);
    expect([ws.tabs.list().length, boards.length]).toEqual([12, 12]);
  });

  it("historiques indépendants : Ctrl+Z dans l'onglet 2 ne touche pas l'onglet 1", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    drawOn(first);
    await ws.newBlank();
    const second = ws.active();
    drawOn(second, 20);
    drawOn(second, 30);
    undoOn(second);
    undoOn(second);
    expect([strokes(first), first.board.doc.canUndo()]).toEqual([1, true]);
    expect([strokes(second), second.board.doc.canUndo()]).toEqual([0, false]);
  });
});

describe("espace de travail : marquage #stage par onglet (CL5b-2)", () => {
  it("marquage #stage par onglet", async () => {
    const ws = await setupWorkspace({ kind: "repli" });
    const first = ws.active();
    drawOn(first);
    await ws.newBlank();
    const second = ws.active();
    expect(first.board.stage.dataset["modifie"]).toBe("1");
    expect(second.board.stage.dataset["modifie"]).toBe("0");
    expect(second.board.stage.dataset["fichiers"]).toBe("repli");
    expect(second.board.stage.dataset["fichier"]).toBe(second.files.name());
    expect(second.board.stage.dataset["tab"]).toBe(ws.tabs.active()!.id);
    expect(first.board.stage.dataset["tab"]).toBe(ws.tabs.list()[0]!.id);
    expect(first.board.stage.dataset["tab"]).not.toBe(second.board.stage.dataset["tab"]);
    drawOn(second);
    expect(second.board.stage.dataset["modifie"]).toBe("1");
    expect(await second.files.run("save")).toBe(true);
    expect([first.board.stage.dataset["modifie"], second.board.stage.dataset["modifie"]]).toEqual(["1", "0"]);
  });

  it("erreur du premier document : data-fichier-erreur sur le premier onglet et message", async () => {
    const error = "Ouverture impossible (faux.roomboard) : ce fichier n'est pas un document RoomBoard";
    const ws = await setupWorkspace({ first: { doc: fakeCore.blank(), opened: null, error } });
    const first = ws.active();
    expect(first.board.stage.dataset["fichierErreur"]).toBe(error);
    expect(shell.notify).toHaveBeenCalledWith(error);
    await ws.newBlank();
    expect(ws.active().board.stage.dataset["fichierErreur"]).toBeUndefined();
  });

  it("premier document ouvert depuis l'attente : nom repris sur le stage et le titre", async () => {
    const doc = fakeCore.load(validBytes());
    const ws = await setupWorkspace({
      first: { doc, opened: { name: "cours.roomboard", bytes: validBytes(), target: { kind: "download", name: "cours.roomboard" } }, error: null },
    });
    expect(ws.active().board.stage.dataset["fichier"]).toBe("cours.roomboard");
    expect(shell.setTitle).toHaveBeenLastCalledWith("cours.roomboard — RoomBoard");
  });
});

describe("espace de travail : dépôt et lancement (T86, T87)", () => {
  it("lancement : écoute du dépôt posée avant launch_files", async () => {
    const order: string[] = [];
    let listening!: () => void;
    const ws = await setupWorkspace({
      onDrop: () => {
        order.push("onDrop");
        return () => undefined;
      },
      dropReady: () =>
        new Promise<void>((r) => {
          listening = () => {
            order.push("listening");
            r();
          };
          setTimeout(listening, 0);
        }),
      launch: async () => {
        order.push("launch");
        return [roomboardFile("C:\\Cours\\a.roomboard")];
      },
    });
    expect(order).toEqual(["onDrop", "listening", "launch"]);
    expect(ws.tabs.list()).toHaveLength(2);
  });

  it("chemin Windows \\\\?\\C:\\… : l'onglet et le titre portent le nom de base seulement", async () => {
    const ws = await setupWorkspace({ launch: async () => [roomboardFile("\\\\?\\C:\\Cours\\a.roomboard")] });
    expect(ws.active().files.name()).toBe("a.roomboard");
    expect(ws.active().board.stage.dataset["fichier"]).toBe("a.roomboard");
    expect(shell.setTitle).toHaveBeenLastCalledWith(expect.not.stringContaining("C:"));
  });

  it("dépôt d'un .roomboard sur la fenêtre : nouvel onglet, l'actif d'avant intact", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    drawOn(first);
    dropHandler!([roomboardFile("/tmp/d.roomboard")], { x: 10, y: 10 });
    await flush();
    await flush();
    expect(ws.tabs.list()).toHaveLength(2);
    expect(ws.active().files.name()).toBe("d.roomboard");
    expect([first.files.isDirty(), strokes(first)]).toEqual([true, 1]);
  });

  it("dépôt d'un .tif : message, document intact, aucun onglet", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    drawOn(first);
    const version = first.board.engine.state().version;
    const report = await ws.importFiles([plainFile("image.tif")], null);
    expect(report.refused).toEqual(["image.tif"]);
    expect(shell.notify).toHaveBeenCalledWith(`image.tif : ${LATER_FORMAT_MESSAGE}`);
    expect([ws.tabs.list().length, first.board.engine.state().version]).toEqual([1, version]);
  });
});

describe("espace de travail : fermeture et garde (CL5b-5, CL5b-6)", () => {
  it("fermeture gardée si un onglet est modifié", async () => {
    const ws = await setupWorkspace();
    expect(guard()).toBe(false); // la seule garde posée sur le shell réel
    const first = ws.active();
    await ws.newBlank();
    drawOn(ws.active());
    expect(guard()).toBe(true);
    expect(shell.guardClose).toHaveBeenCalledTimes(1);
    expect(shell.guardClose).toHaveBeenCalledWith(expect.any(Function), DISCARD_MESSAGE);
    expect(await ws.active().files.run("save")).toBe(true);
    expect(guard()).toBe(false);
    drawOn(first); // onglet caché modifié : la fenêtre reste gardée
    expect(guard()).toBe(true);
    expect(ws.anyDirty()).toBe(true);
    expect(shell.guardClose).toHaveBeenCalledTimes(1);
  });

  it("fermer un onglet modifié : question ; Non → gardé ; Oui → retiré, précédent montré", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    await ws.newBlank();
    const second = ws.active();
    const id = ws.tabs.active()!.id;
    drawOn(second);
    answer = false;
    expect(await ws.close(id)).toBe(false);
    expect(shell.confirm).toHaveBeenCalledWith(DISCARD_MESSAGE);
    expect([ws.tabs.list().length, ws.active()]).toEqual([2, second]);
    answer = true;
    log = [];
    expect(await ws.close(id)).toBe(true);
    expect(ws.tabs.list()).toHaveLength(1);
    expect(ws.active()).toBe(first);
    expect(log).toEqual(["deactivate 2", "activate 1", "dispose 2"]);
    expect(fakeOf(second).listeners()).toBe(0); // contrôleur de l'onglet libéré
  });

  it("fermer un onglet propre : sans question", async () => {
    const ws = await setupWorkspace();
    await ws.newBlank();
    expect(await ws.close(ws.tabs.active()!.id)).toBe(true);
    expect([shell.confirm.mock.calls.length, ws.tabs.list().length]).toEqual([0, 1]);
  });

  it("fermer le dernier onglet : un vierge le remplace (CL5b-5)", async () => {
    const ws = await setupWorkspace();
    const id = ws.tabs.active()!.id;
    const old = ws.active();
    expect(await ws.close(id)).toBe(true);
    expect(ws.tabs.list()).toHaveLength(1);
    expect(ws.tabs.active()!.id).not.toBe(id);
    expect(ws.active()).not.toBe(old);
    expect(old.board.dispose).toHaveBeenCalledTimes(1);
    expect(ws.active().board.stage.dataset["tab"]).toBe(ws.tabs.active()!.id);
  });

  it("double clic sur le × du dernier onglet : un seul onglet vierge (réentrance)", async () => {
    const ws = await setupWorkspace();
    const id = ws.tabs.active()!.id;
    const results = await Promise.all([ws.close(id), ws.close(id)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("dépôt avec une boîte qui échoue : importFiles ne rejette pas", async () => {
    const ws = await setupWorkspace();
    shell.notify.mockRejectedValue(new Error("boîte morte"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(ws.importFiles([plainFile("a.tif")])).resolves.toMatchObject({ refused: ["a.tif"] });
    warn.mockRestore();
  });

  it("onglets pleins : déposer 5 .roomboard avec 11 onglets ouverts → une seule boîte « 12 onglets au plus »", async () => {
    const ws = await setupWorkspace();
    for (let i = 1; i < 11; i++) await ws.newBlank();
    expect(ws.tabs.list()).toHaveLength(11);
    const r = await ws.importFiles(["a", "b", "c", "d", "e"].map((n) => roomboardFile(`${n}.roomboard`)));
    expect(ws.tabs.list()).toHaveLength(12);
    expect(r.opened).toHaveLength(1);
    expect(shell.notify.mock.calls.filter((c) => c[0] === TOO_MANY_TABS)).toHaveLength(1);
  });

  it("Cmd+Q : document propre → quit ; modifié → question, Non → rien", async () => {
    const ws = await setupWorkspace();
    const quit = vi.fn(async () => undefined);
    await ws.quitRequested(quit);
    expect([quit.mock.calls.length, shell.confirm.mock.calls.length]).toEqual([1, 0]);
    drawOn(ws.active());
    answer = false;
    await ws.quitRequested(quit);
    expect([quit.mock.calls.length, shell.confirm.mock.calls.length]).toEqual([1, 1]);
    answer = true;
    await ws.quitRequested(quit);
    expect(quit).toHaveBeenCalledTimes(2);
  });
});

describe("espace de travail : onglet actif, titre, raccourcis, dispose", () => {
  it("activer un onglet : deactivate de l'ancien puis activate du nouveau", async () => {
    const ws = await setupWorkspace();
    expect(log).toEqual(["activate 1"]);
    await ws.newBlank();
    expect(log).toEqual(["activate 1", "deactivate 1", "activate 2"]);
    log = [];
    expect(ws.tabs.activate(ws.tabs.list()[0]!.id)).toBe(true);
    expect(log).toEqual(["deactivate 2", "activate 1"]);
  });

  it("titre de la fenêtre : celui de l'onglet actif seulement", async () => {
    const doc = fakeCore.load(validBytes());
    const ws = await setupWorkspace({
      first: { doc, opened: { name: "cours.roomboard", bytes: validBytes(), target: null }, error: null },
    });
    const first = ws.active();
    expect(shell.setTitle).toHaveBeenLastCalledWith("cours.roomboard — RoomBoard");
    await ws.newBlank();
    expect(shell.setTitle).toHaveBeenLastCalledWith("Sans titre.roomboard — RoomBoard");
    drawOn(first); // onglet caché : le titre de la fenêtre ne bouge pas
    expect(shell.setTitle).not.toHaveBeenCalledWith("• cours.roomboard — RoomBoard");
    expect(shell.setTitle).toHaveBeenLastCalledWith("Sans titre.roomboard — RoomBoard");
    ws.tabs.activate(ws.tabs.list()[0]!.id);
    expect(shell.setTitle).toHaveBeenLastCalledWith("• cours.roomboard — RoomBoard");
  });

  it("raccourcis : Ctrl+S va au contrôleur de l'onglet actif", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    drawOn(first);
    await ws.newBlank();
    const second = ws.active();
    drawOn(second);
    expect(ws.key(k("s", { ctrlKey: true }))).toBe(true);
    await flush();
    expect(host.save).toHaveBeenCalledTimes(1);
    expect([first.files.isDirty(), second.files.isDirty()]).toEqual([true, false]);
    expect(ws.key(k("z", { ctrlKey: true }))).toBe(false);
  });

  // Réécrit depuis mount.test.ts (« touche tenue : preventDefault à chaque répétition ») : les raccourcis passent au workspace.
  it("raccourcis : touche tenue prise à chaque répétition, commande lancée une seule fois", async () => {
    const ws = await setupWorkspace();
    expect(ws.key(k("s", { ctrlKey: true }))).toBe(true);
    expect(ws.key(k("s", { ctrlKey: true, repeat: true }))).toBe(true);
    expect(ws.key(k("s", { ctrlKey: true, repeat: true }))).toBe(true);
    await flush();
    expect(host.save).toHaveBeenCalledTimes(1);
  });

  // Réécrit depuis mount.test.ts (« T79 : dispose retire l'écouteur keydown et la garde ») : ce que le workspace pose, il le retire.
  it("dispose : sessions libérées (board.dispose), garde retirée, onDrop désabonné", async () => {
    const ws = await setupWorkspace();
    await ws.newBlank();
    const [a, b] = ws.tabs.list().map((t) => t.session);
    ws.dispose();
    expect([a!.board.dispose, b!.board.dispose].map((f) => (f as ReturnType<typeof vi.fn>).mock.calls.length)).toEqual([1, 1]);
    expect([guardStops, dropStops]).toEqual([1, 1]);
    expect(boards.map((x) => x.listeners())).toEqual([0, 0]);
  });
});

describe("espace de travail : conteneur, repli et images (R7, R12, R30, S3, S4)", () => {
  it("ouvrir avec le conteneur : assets adoptés dans le magasin de l'onglet, avertissements dits en une boîte", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    codec.read.mockResolvedValueOnce({
      manifest: new Uint8Array([1]),
      ybin: docWithImage().save(NOW, "0.1.0"),
      assets: [[ID, new Blob([new Uint8Array([1, 2, 3])])]],
      warnings: ["asset ignoré : assets/x.png (nom d'asset invalide)", "asset ignoré : assets/y.png (contenu différent de son empreinte)"],
    } satisfies ContainerContents);
    expect(await ws.openDocument({ name: "img.roomboard", bytes: new Uint8Array([9]), target: null })).toBe(true);
    const tab = ws.active();
    expect(tab).not.toBe(first);
    expect(tab.assets.get(ID)?.type).toBe("image/png");
    expect(shell.notify).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith(
      "img.roomboard : asset ignoré : assets/x.png (nom d'asset invalide) ; asset ignoré : assets/y.png (contenu différent de son empreinte)",
    );
    expect(await tab.files.run("save")).toBe(true); // avertissement du conteneur sur un asset non cité : pas de refus (HR13)
    expect(strokes(first)).toBe(0);
  });

  it("asset cité à empreinte fausse (ignoré par le conteneur) : enregistrement refusé (HR13 amendée)", async () => {
    const ws = await setupWorkspace();
    codec.read.mockResolvedValueOnce({
      manifest: new Uint8Array([1]),
      ybin: docWithImage().save(NOW, "0.1.0"),
      assets: [],
      warnings: ["asset ignoré : assets/x.png (contenu différent de son empreinte)"],
    } satisfies ContainerContents);
    expect(await ws.openDocument({ name: "img.roomboard", bytes: new Uint8Array([9]), target: null })).toBe(true);
    expect(await ws.active().files.run("save")).toBe(false);
    expect(shell.notify).toHaveBeenLastCalledWith(UNREAD_ASSETS_MESSAGE);
    expect(codec.write).not.toHaveBeenCalled();
  });

  it("onglet fermé pendant le décodage : insertion abandonnée avec un message clair", async () => {
    let ws!: Workspace;
    const decode = vi.fn(async (_b: Blob, _k: string) => {
      await ws.newBlank();
      await ws.close(ws.tabs.list()[0]!.id);
      return { bitmap: { close() {} } as unknown as ImageBitmap, w: 10, h: 10 };
    });
    ws = await setupWorkspace({ decode });
    const r = await ws.importFiles([plainFile("a.png", pngHead(10, 10))], { x: 0, y: 0 });
    expect(r.inserted).toEqual([]);
    expect(shell.notify).toHaveBeenCalledWith("a.png : onglet fermé pendant l'import, image non insérée");
  });

  it("enregistrer sans image : octets de doc.save, conteneur jamais appelé", async () => {
    const ws = await setupWorkspace();
    drawOn(ws.active());
    expect(await ws.active().files.run("save")).toBe(true);
    expect(saved[0]).toEqual(ws.active().board.doc.save(NOW, APP_VERSION));
    expect(codec.write).not.toHaveBeenCalled();
  });

  it("enregistrer avec image : saveParts puis codec.write avec l'empreinte, le type et les octets du magasin", async () => {
    const ws = await setupWorkspace();
    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    codec.read.mockResolvedValueOnce({ manifest: new Uint8Array([1]), ybin: docWithImage().save(NOW, "0.1.0"), assets: [[ID, blob]], warnings: [] });
    await ws.openDocument({ name: "img.roomboard", bytes: new Uint8Array([9]), target: null });
    expect(await ws.active().files.run("save")).toBe(true);
    const [manifest, ybin, assets] = codec.write.mock.calls[0]!;
    expect([manifest, ybin]).toEqual(ws.active().board.doc.saveParts(NOW, APP_VERSION));
    expect(assets.map((a) => [a.id, a.mime])).toEqual([[ID, "image/png"]]);
    expect(Array.from(new Uint8Array(await assets[0]!.blob.arrayBuffer()))).toEqual([1, 2, 3]);
    expect(Array.from(saved[0]!)).toEqual([0x50, 0x4b, 1]);
  });

  it("repli : module indisponible → core.load, message, Enregistrer refusé ; les autres onglets non touchés", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    codec.read.mockRejectedValueOnce(new CodecUnavailableError(new Error("404")));
    expect(await ws.openDocument({ name: "img.roomboard", bytes: docWithImage().save(NOW, "0.1.0"), target: null })).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith(`img.roomboard : ${CODEC_FALLBACK_MESSAGE}`);
    expect(strokes(ws.active())).toBe(1);
    expect(await ws.active().files.run("save")).toBe(false);
    expect(await ws.active().files.run("saveAs")).toBe(false);
    expect(shell.notify).toHaveBeenLastCalledWith(UNREAD_ASSETS_MESSAGE);
    expect(host.save).not.toHaveBeenCalled();
    expect(await first.files.run("save")).toBe(true);
  });

  it("repli sans image : aucun message, Enregistrer permis", async () => {
    const ws = await setupWorkspace();
    codec.read.mockRejectedValueOnce(new CodecUnavailableError(new Error("404")));
    expect(await ws.openDocument({ name: "vide.roomboard", bytes: validBytes(), target: null })).toBe(true);
    expect(shell.notify).not.toHaveBeenCalled();
    expect(await ws.active().files.run("save")).toBe(true);
  });

  it("fichier refusé par le conteneur : « Ouverture impossible (nom) : message du cœur », aucun onglet, pas de repli sur core.load", async () => {
    const ws = await setupWorkspace();
    codec.read.mockRejectedValueOnce(new Error("ce fichier n'est pas un document RoomBoard"));
    // octets que core.load accepterait : seul le refus du conteneur peut expliquer l'échec
    expect(await ws.openDocument({ name: "x.roomboard", bytes: validBytes(), target: null })).toBe(false);
    expect(shell.notify).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (x.roomboard) : ce fichier n'est pas un document RoomBoard");
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("asset ignoré à l'ouverture (trop gros) : avertissement dit, onglet marqué, Enregistrer refusé sans écrire (R30)", async () => {
    const ws = await setupWorkspace();
    codec.read.mockResolvedValueOnce({
      manifest: new Uint8Array([1]),
      ybin: docWithImage().save(NOW, "0.1.0"),
      assets: [],
      warnings: ["asset ignoré : assets/x.png (trop gros)"],
    } satisfies ContainerContents);
    expect(await ws.openDocument({ name: "img.roomboard", bytes: new Uint8Array([9]), target: null })).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith("img.roomboard : asset ignoré : assets/x.png (trop gros)");
    expect(await ws.active().files.run("save")).toBe(false);
    expect(shell.notify).toHaveBeenLastCalledWith(UNREAD_ASSETS_MESSAGE);
    expect(codec.write).not.toHaveBeenCalled();
    expect(host.save).not.toHaveBeenCalled();
  });

  it("premier document (attente IndexedDB, core.load) qui cite des images : Enregistrer refusé (R30, HR20)", async () => {
    const ws = await setupWorkspace({ first: { doc: docWithImage(), opened: null, error: null } });
    expect(await ws.active().files.run("save")).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith(UNREAD_ASSETS_MESSAGE);
  });

  it("dépôt d'une image : insérée dans l'onglet actif, une étape, octets dans son magasin (S1)", async () => {
    const ws = await setupWorkspace({ decode: fakeDecode });
    const tab = ws.active();
    const r = await ws.importFiles([plainFile("a.png", pngHead(10, 10))], { x: 0, y: 0 });
    expect(r.inserted).toEqual(["a.png"]);
    expect(strokes(tab)).toBe(1);
    expect(tab.board.doc.citedAssets()).toHaveLength(1);
    expect(tab.assets.has(tab.board.doc.citedAssets()[0]!.id)).toBe(true);
  });

  it("même image déposée deux fois : deux éléments, un seul asset écrit", async () => {
    const ws = await setupWorkspace({ decode: fakeDecode });
    await ws.importFiles([plainFile("a.png", pngHead(10, 10)), plainFile("b.png", pngHead(10, 10))], null);
    expect(strokes(ws.active())).toBe(2);
    expect(await ws.active().files.run("save")).toBe(true);
    expect(codec.write.mock.calls[0]![2]).toHaveLength(1);
  });

  it("limite de taille : 100 Mo sur les hôtes web, aucune dans la coque (R15)", async () => {
    const big = (): DroppedFile => plainFile("gros.png", pngHead(10, 10), 120 * 1024 * 1024);
    const web = await setupWorkspace({ decode: fakeDecode });
    expect((await web.importFiles([big()])).refused).toEqual(["gros.png"]);
    const coque = await setupWorkspace({ kind: "tauri", decode: fakeDecode });
    expect((await coque.importFiles([big()])).inserted).toEqual(["gros.png"]);
  });
});

describe("espace de travail : tableau collé et classeur (C10b)", () => {
  const tables = (ws: Workspace) => {
    const d = ws.active().board.doc;
    return d.elementIds(d.pageIds()[0] ?? "").map((id) => d.element(id)).filter((e) => e?.kind === "table");
  };

  it("pasteTable : tableau HTML collé dans l'onglet actif ; une ImportTable ; couleur du stylo (S2, F21)", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteTable('<table><tr><td colspan="2">Titre</td></tr><tr><td>a</td><td>b</td></tr></table>')).toBe(true);
    const t = tables(ws);
    expect(t).toHaveLength(1);
    const v = t[0];
    if (v?.kind !== "table") throw new Error("tableau");
    expect([v.table.color, v.table.merges.length, v.table.cells.map((c) => c.text)]).toEqual(["#1d4ed8", 1, ["Titre", "a", "b"]]);
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("pasteTable : HTML de plus de 8 Mio refusé avec « tableau trop gros pour être collé » ; rien d'inséré", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteTable(`<table><tr><td>${"x".repeat(PASTE_MAX_CHARS)}</td></tr></table>`)).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith(PASTE_TOO_BIG);
    expect(tables(ws)).toHaveLength(0);
  });

  it("pasteTable : HTML sans tableau lisible : false (main.ts colle alors les images, PC9)", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteTable("<table></table><p>rien</p>")).toBe(false);
    expect(tables(ws)).toHaveLength(0);
  });

  it("S4 : .xlsx importé par le lecteur de classeur : un tableau dans l'onglet actif, message de troncature", async () => {
    const grid = { rows: 64, cols: 6, cells: new Array<string>(384).fill("v"), merges: [{ row: 1, col: 0, rows: 1, cols: 2 }], sourceRows: 70, sourceCols: 6, cutCells: false };
    const ws = await setupWorkspace({ readSheet: async () => grid });
    const bytes = new Uint8Array([0x50, 0x4b, 3, 4, 9]);
    const r = await ws.importFiles([{ name: "valeurs.xlsx", size: bytes.length, mime: "", head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]) }], null);
    expect(r.inserted).toEqual(["valeurs.xlsx"]);
    expect(tables(ws)).toHaveLength(1);
    expect(shell.notify).toHaveBeenCalledWith("valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)");
  });
});

describe("espace de travail — C3", () => {
  const selectAll = (tab: TabSession): string[] => {
    const ids = tab.board.doc.elementIds(tab.board.doc.pageIds()[0]!);
    (tab.board.engine as unknown as { select(ids: string[]): void }).select(ids);
    return ids;
  };
  const rect = (tab: TabSession, x: number): string =>
    tab.board.doc.apply({ type: "AddShape", page: tab.board.doc.pageIds()[0]!, shape: "rect", x0: x, y0: 0, x1: x + 50, y1: 50, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!;

  it("copier sans presse-papiers système : interne retenu, avis, Coller possible", async () => {
    const ws = await setupWorkspace();
    rect(ws.active(), 0);
    selectAll(ws.active());
    const seen = vi.fn();
    ws.onClipboard(seen);
    expect(ws.canPaste()).toBe(false);
    await ws.copySelection(false);
    expect(ws.canPaste()).toBe(true);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith("copié dans RoomBoard seulement");
  });

  it("copier avec presse-papiers système : enveloppe écrite, aucun avis", async () => {
    const written: string[] = [];
    const ws = await setupWorkspace({ clipboard: createClipboard({ write: async (t) => void written.push(await t) }) });
    rect(ws.active(), 0);
    selectAll(ws.active());
    await ws.copySelection(false);
    expect(written[0]).toMatch(/^\{"format":"roomboard-items\/1","rbitem":"/);
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("couper : copie puis Delete, une étape", async () => {
    const ws = await setupWorkspace();
    const tab = ws.active();
    rect(tab, 0);
    selectAll(tab);
    const v = tab.board.doc.version();
    await ws.copySelection(true);
    expect(strokes(tab)).toBe(0);
    expect(tab.board.doc.version()).toBe(v + 1);
    expect(ws.canPaste()).toBe(true);
  });

  it("Coller (bouton) dans un autre onglet : ids neufs ; second collage décalé", async () => {
    const ws = await setupWorkspace();
    const a = rect(ws.active(), 0);
    selectAll(ws.active());
    await ws.copySelection(false);
    await ws.newBlank();
    const dst = ws.active();
    expect(await ws.pasteInternal()).toBe(true);
    expect(await ws.pasteInternal()).toBe(true);
    const ids = dst.board.doc.elementIds(dst.board.doc.pageIds()[0]!);
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain(a);
    const b0 = dst.board.doc.bounds([ids[0]!])!;
    const b1 = dst.board.doc.bounds([ids[1]!])!;
    expect([b1.x0 - b0.x0, b1.y0 - b0.y0]).toEqual([24, 24]);
  });

  it("pasteItems : enveloppe plus récente → avis, rien inséré, pris", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteItems("newer")).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith("objets copiés par une version plus récente de RoomBoard : mettez RoomBoard à jour");
    expect(strokes(ws.active())).toBe(0);
  });

  it("exporter : Sélection.rbitem écrit par itemFiles ; sans sélection : rien", async () => {
    const save = vi.fn(async (_n: string, _b: Uint8Array) => true);
    const ws = await setupWorkspace({ itemFiles: { pick: async () => null, save } });
    expect(await ws.exportSelection()).toBe(false);
    rect(ws.active(), 0);
    selectAll(ws.active());
    expect(await ws.exportSelection()).toBe(true);
    expect(save.mock.calls[0]![0]).toBe("Sélection.rbitem");
  });

  it("insérer des pages : boîte FileHost.open, pages après la page montrée", async () => {
    const ws = await setupWorkspace();
    const src = fakeCore.blank();
    src.apply({ type: "AddPage", after: src.pageIds()[0]! });
    opening = { name: "/cours/b.roomboard", bytes: src.save(NOW, "0.1.0"), target: { kind: "download", name: "b.roomboard" } };
    expect(await ws.insertPages()).toBe(true);
    expect(ws.active().board.doc.pageIds()).toHaveLength(3);
    opening = null;
    expect(await ws.insertPages()).toBe(false);
  });

  it("un .rbitem déposé s'insère dans l'onglet actif ; un .roomboard déposé ouvre un onglet (Q1)", async () => {
    const ws = await setupWorkspace();
    const s = fakeCore.blank();
    const frag = s.extract(s.pageIds()[0]!, [s.apply({ type: "AddShape", page: s.pageIds()[0]!, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!]);
    const fragBytes = frag.saveFragment(NOW, "0.1.0", "x");
    codec.read.mockResolvedValueOnce({ manifest: fragBytes, ybin: fragBytes, assets: [], warnings: [] });
    const r = await ws.importFiles([plainFile("objet.rbitem", new Uint8Array([0x50, 0x4b, 3, 4, 0]))], { x: 10, y: 10 });
    expect(r.inserted).toEqual(["objet.rbitem"]);
    expect(strokes(ws.active())).toBe(1);
    expect(ws.tabs.list()).toHaveLength(1);
    await ws.importFiles([roomboardFile("/cours/c.roomboard")], { x: 10, y: 10 });
    expect(ws.tabs.list()).toHaveLength(2);
  });

  it("un fragment ouvert comme document : message, aucun onglet", async () => {
    const ws = await setupWorkspace();
    const s = fakeCore.blank();
    const bytes = s.extract(s.pageIds()[0]!, []).saveFragment(NOW, "0.1.0", "x");
    expect(await ws.openDocument({ name: "x.roomboard", bytes, target: null })).toBe(false);
    expect(ws.tabs.list()).toHaveLength(1);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (x.roomboard) : ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page");
  });

  it("couper passe par le moteur (même chemin que Suppr, Ctrl+Z resélectionne)", async () => {
    const ws = await setupWorkspace();
    const tab = ws.active();
    const a = rect(tab, 0);
    selectAll(tab);
    await ws.copySelection(true);
    const e = tab.board.engine as unknown as { deleteElements: ReturnType<typeof vi.fn> };
    expect(e.deleteElements).toHaveBeenCalledWith([a]);
  });

  it("insérer des pages : l'onglet cible est celui d'avant la boîte d'ouverture (R3)", async () => {
    const ws = await setupWorkspace();
    const origin = ws.active();
    const src = fakeCore.blank();
    src.apply({ type: "AddPage", after: src.pageIds()[0]! });
    host.open = async () => {
      await ws.newBlank(); // l'utilisateur change d'onglet pendant la boîte
      return { name: "b.roomboard", bytes: src.save(NOW, "0.1.0"), target: { kind: "download", name: "b.roomboard" } };
    };
    expect(await ws.insertPages()).toBe(true);
    expect(origin.board.doc.pageIds()).toHaveLength(3);
    expect(ws.active().board.doc.pageIds()).toHaveLength(1);
  });

  it("deux .rbitem importés sans point : décalés de 24 px (cascade), nom du fichier dans les avis", async () => {
    const ws = await setupWorkspace();
    const s = fakeCore.blank();
    const sp = s.pageIds()[0]!;
    const x = s.apply({ type: "AddShape", page: sp, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!;
    const ybin = s.extract(sp, [x]).saveFragment(NOW, "0.1.0", "x");
    codec.read.mockResolvedValue({ manifest: ybin, ybin, assets: [], warnings: [] });
    const zip = new Uint8Array([0x50, 0x4b, 3, 4, 0]);
    const r = await ws.importFiles([plainFile("a.rbitem", zip), plainFile("b.rbitem", zip)]);
    expect(r.inserted).toEqual(["a.rbitem", "b.rbitem"]);
    const tab = ws.active();
    const ids = tab.board.doc.elementIds(tab.board.doc.pageIds()[0]!);
    const b0 = tab.board.doc.bounds([ids[0]!])!;
    const b1 = tab.board.doc.bounds([ids[1]!])!;
    expect([b1.x0 - b0.x0, b1.y0 - b0.y0]).toEqual([24, 24]);
    // un import n'entame pas la cascade du presse-papiers : le premier collage du même contenu reste au centre
    const emptyFrag = (() => { const e = fakeCore.blank(); return e.extract(e.pageIds()[0]!, []).saveFragment(NOW, "0.1.0", "x"); })();
    codec.read.mockResolvedValue({ manifest: emptyFrag, ybin: emptyFrag, assets: [], warnings: [] });
    await ws.importFiles([plainFile("vide.rbitem", zip)]);
    expect(shell.notify.mock.calls.some((c) => String(c[0]).startsWith("vide.rbitem : "))).toBe(true);
  });

  it("pasteItems : fragment sans élément → avis et « non pris »", async () => {
    const ws = await setupWorkspace();
    const e = fakeCore.blank();
    const bytes = e.extract(e.pageIds()[0]!, []).saveFragment(NOW, "0.1.0", "x");
    expect(await ws.pasteItems(bytes)).toBe(false);
    expect(shell.notify).toHaveBeenCalledTimes(1);
  });

  it("selection(a) : grouper et dégrouper relayés au moteur", async () => {
    const ws = await setupWorkspace();
    ws.selection("group");
    ws.selection("ungroup");
    const e = ws.active().board.engine as unknown as { group: ReturnType<typeof vi.fn>; ungroup: ReturnType<typeof vi.fn> };
    expect([e.group.mock.calls.length, e.ungroup.mock.calls.length]).toEqual([1, 1]);
  });
});

describe("espace de travail : PDF (C12)", () => {
  const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
  const PNG_1PX = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  function fakePdf(o: { pages?: number; encrypted?: boolean; fail?: string; size?: (i: number) => { w: number; h: number } } = {}) {
    const destroy = vi.fn();
    const pageSize = vi.fn(async (i: number) => (o.size ?? (() => ({ w: 612, h: 792 })))(i));
    const open = vi.fn(async (_b: Blob): Promise<PdfFile> => {
      if (o.encrypted === true) throw new PdfEncryptedError();
      if (o.fail !== undefined) throw new Error(o.fail);
      return { pageCount: o.pages ?? 3, pageSize, renderTile: async () => ({}) as TileBitmap, destroy };
    });
    return { engine: { open } satisfies PdfEngine, open, destroy, pageSize };
  }
  const drop = (name: string, bytes: Uint8Array<ArrayBuffer> = PDF_HEAD, size = bytes.byteLength): DroppedFile => ({
    name, size, mime: "", head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
  });
  async function realPdf(pages = 3): Promise<Uint8Array<ArrayBuffer>> {
    const d = await PDFDocument.create();
    const font = await d.embedFont(StandardFonts.Helvetica);
    for (let i = 1; i <= pages; i++) d.addPage([612, 792]).drawText(`RoomBoard page ${i}`, { x: 72, y: 700, size: 24, font });
    return new Uint8Array(await d.save());
  }
  const files = () => ({ pick: vi.fn(async () => null), save: vi.fn(async (_n: string, _b: Uint8Array) => true) });
  const producer = (seen: OverlayRequest[] = []): OverlayProducer => ({
    pages: async (reqs) => {
      seen.push(...reqs);
      return reqs.map(() => ({ kind: "png" as const, bytes: PNG_1PX }));
    },
  });
  const loadPdfLib = () => import("pdf-lib");

  it("S1 : PDF déposé : nouvel onglet « Cours.roomboard », une page par page, fonds pdf-page, asset dans le magasin, non modifié, rien à annuler ; PdfFile détruit", async () => {
    const pdf = fakePdf({ size: (i) => (i === 1 ? { w: 792, h: 612 } : { w: 612, h: 792 }) });
    const ws = await setupWorkspace({ pdf: pdf.engine });
    const r = await ws.importFiles([drop("/home/u/Cours.pdf")], null);
    expect(r.opened).toEqual(["/home/u/Cours.pdf"]);
    expect(ws.tabs.list()).toHaveLength(2);
    const tab = ws.active();
    const doc = tab.board.doc;
    const views = doc.pageIds().map((id) => doc.page(id)?.backdrop);
    expect(views.map((b) => [b?.kind, b?.page, b?.w, b?.h])).toEqual([
      ["pdf-page", 0, 612, 792],
      ["pdf-page", 1, 792, 612],
      ["pdf-page", 2, 612, 792],
    ]);
    const asset = doc.citedAssets()[0];
    expect([asset?.name, asset?.mime, asset?.size]).toEqual(["Cours.pdf", "application/pdf", PDF_HEAD.byteLength]);
    expect(tab.assets.get(asset?.id ?? "")?.type).toBe("application/pdf");
    expect([tab.files.name(), tab.files.isDirty(), doc.canUndo()]).toEqual(["Cours.roomboard", false, false]);
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("Enregistrer demande où (cible nulle), jamais sur le PDF (U1, PF10)", async () => {
    const ws = await setupWorkspace({ pdf: fakePdf().engine });
    await ws.openPdf({ name: "Cours.pdf", blob: new Blob([PDF_HEAD]) });
    expect(await ws.active().files.run("save")).toBe(true);
    expect(host.save.mock.calls[0]?.[1]).toEqual({ kind: "ask", name: "Cours.roomboard" });
  });

  it("PDF chiffré : avis « secret.pdf : PDF chiffré, non pris en charge », aucun onglet (S2, Review Focus 2)", async () => {
    const ws = await setupWorkspace({ pdf: fakePdf({ encrypted: true }).engine });
    expect(await ws.openPdf({ name: "secret.pdf", blob: new Blob([PDF_HEAD]) })).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("secret.pdf : PDF chiffré, non pris en charge");
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("501 pages : 500 pages importées, avis « gros.pdf : 500 premières pages importées sur 501 » (S2, PF7)", async () => {
    const pdf = fakePdf({ pages: 501 });
    const ws = await setupWorkspace({ pdf: pdf.engine });
    expect(await ws.openPdf({ name: "gros.pdf", blob: new Blob([PDF_HEAD]) })).toBe(true);
    expect(ws.active().board.doc.pageIds()).toHaveLength(500);
    expect(pdf.pageSize).toHaveBeenCalledTimes(500);
    expect(shell.notify).toHaveBeenCalledWith("gros.pdf : 500 premières pages importées sur 501");
  });

  it("PDF illisible : « Ouverture impossible (x.pdf) : … » ; 0 page : « … : PDF sans page », PdfFile détruit", async () => {
    const bad = await setupWorkspace({ pdf: fakePdf({ fail: "Invalid PDF structure." }).engine });
    expect(await bad.openPdf({ name: "x.pdf", blob: new Blob([PDF_HEAD]) })).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (x.pdf) : Invalid PDF structure.");
    const empty = fakePdf({ pages: 0 });
    const ws = await setupWorkspace({ pdf: empty.engine });
    expect(await ws.openPdf({ name: "vide.pdf", blob: new Blob([PDF_HEAD]) })).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (vide.pdf) : PDF sans page");
    expect(empty.destroy).toHaveBeenCalledTimes(1);
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("onglets pleins : TOO_MANY_TABS, PDF jamais ouvert (PF10)", async () => {
    const pdf = fakePdf();
    const ws = await setupWorkspace({ pdf: pdf.engine });
    for (let i = 1; i < MAX_TABS; i++) await ws.newBlank();
    await ws.importFiles([drop("a.pdf")], null);
    expect(shell.notify).toHaveBeenCalledWith(TOO_MANY_TABS);
    expect(pdf.open).not.toHaveBeenCalled();
  });

  it("web : PDF de 120 Mo refusé avant lecture (S2, PF9)", async () => {
    const pdf = fakePdf();
    const ws = await setupWorkspace({ pdf: pdf.engine });
    const r = await ws.importFiles([drop("gros.pdf", PDF_HEAD, 120 * 1024 * 1024)], null);
    expect(r.refused).toEqual(["gros.pdf"]);
    expect(pdf.open).not.toHaveBeenCalled();
  });

  it("export S1 : un trait en page 2 du PDF : « Cours annoté.pdf » écrit (3 pages), superposition demandée pour la page 2 seule, avis « PDF exporté (3 pages) »", async () => {
    const bytes = await realPdf();
    const seen: OverlayRequest[] = [];
    const pdfFiles = files();
    const ws = await setupWorkspace({ pdf: fakePdf().engine, pdfFiles, loadPdfLib, overlay: () => producer(seen) });
    await ws.openPdf({ name: "Cours.pdf", blob: new Blob([bytes]) });
    const doc = ws.active().board.doc;
    const p2 = doc.pageIds()[1] ?? "";
    doc.apply({ type: "CommitStroke", page: p2, points: new Float32Array([100, 100, 0.5, 400, 100, 0.5]), style: { color: "#000000", width: 4 } });
    expect(await ws.exportPdf()).toBe(true);
    expect(seen.map((r) => r.pageId)).toEqual([p2]);
    const [name, out] = pdfFiles.save.mock.calls[0] ?? ["", new Uint8Array()];
    expect(name).toBe("Cours annoté.pdf");
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3);
    expect(shell.notify).toHaveBeenCalledWith("PDF exporté (3 pages)");
  });

  it("export d'un document sans PDF : « Sans titre.pdf », 1 page, avis au singulier (PF19, PC10)", async () => {
    const pdfFiles = files();
    const ws = await setupWorkspace({ pdfFiles, loadPdfLib, overlay: () => producer() });
    drawOn(ws.active());
    expect(await ws.exportPdf()).toBe(true);
    expect(pdfFiles.save.mock.calls[0]?.[0]).toBe("Sans titre.pdf");
    expect(shell.notify).toHaveBeenCalledWith("PDF exporté (1 page)");
  });

  it("export : asset absent du magasin : UNREAD_ASSETS_MESSAGE, rien écrit (PF20)", async () => {
    const pdfFiles = files();
    const ws = await setupWorkspace({ first: { doc: docWithImage(), opened: null, error: null }, pdfFiles, loadPdfLib, overlay: () => producer() });
    expect(await ws.exportPdf()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith(UNREAD_ASSETS_MESSAGE);
    expect(pdfFiles.save).not.toHaveBeenCalled();
  });

  it("export : un seul à la fois ; le second appel dit « Opération en cours » (PF19)", async () => {
    let reached = false;
    let release: () => void = () => undefined;
    const slow: OverlayProducer = {
      pages: (reqs) =>
        new Promise((ok) => {
          reached = true;
          release = () => ok(reqs.map(() => ({ kind: "png" as const, bytes: PNG_1PX })));
        }),
    };
    const ws = await setupWorkspace({ pdfFiles: files(), loadPdfLib, overlay: () => slow });
    drawOn(ws.active());
    const first = ws.exportPdf(); // `exporting` passe à vrai avant le premier `await`
    expect(await ws.exportPdf()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Opération en cours");
    await vi.waitFor(() => expect(reached).toBe(true));
    release();
    expect(await first).toBe(true);
  });

  it("export : saveParts qui lève ne laisse pas le verrou pris ; le second export n'est pas bloqué", async () => {
    const ws = await setupWorkspace({ pdfFiles: files(), loadPdfLib, overlay: () => producer() });
    drawOn(ws.active());
    const doc = ws.active().board.doc;
    const save = vi.spyOn(doc, "saveParts").mockImplementationOnce(() => {
      throw new Error("refus du cœur");
    });
    expect(await ws.exportPdf()).toBe(false);
    save.mockRestore();
    shell.notify.mockClear?.();
    expect(await ws.exportPdf()).toBe(true);
    expect(shell.notify).not.toHaveBeenCalledWith("Opération en cours");
  });

  it("export : contenu sous la page PDF : avis « du contenu hors des pages PDF n'est pas exporté » (Review Focus 4)", async () => {
    const ws = await setupWorkspace({ pdf: fakePdf({ pages: 1 }).engine, pdfFiles: files(), loadPdfLib, overlay: () => producer() });
    await ws.openPdf({ name: "Cours.pdf", blob: new Blob([await realPdf(1)]) });
    const doc = ws.active().board.doc;
    doc.apply({ type: "AddShape", page: doc.pageIds()[0] ?? "", shape: "rect", x0: 100, y0: 5000, x1: 200, y1: 5100, style: { color: "#000000", width: 4 }, fill: null });
    expect(await ws.exportPdf()).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith("du contenu hors des pages PDF n'est pas exporté");
  });

  it("onglet fermé pendant l'export : l'export rend faux sur sa copie, rien écrit, aucun avis d'erreur (DAPF3, T7)", async () => {
    let reached = false;
    let release: () => void = () => undefined;
    const docs: CoreDocument[] = [];
    const pdfFiles = files();
    const ws = await setupWorkspace({
      pdfFiles,
      loadPdfLib,
      overlay: (_tab, doc) => {
        docs.push(doc);
        return { pages: (reqs) => new Promise((ok) => ((reached = true), (release = () => ok(reqs.map(() => ({ kind: "png" as const, bytes: PNG_1PX })))))) };
      },
    });
    await ws.newBlank();
    const tab = ws.active();
    drawOn(tab);
    const done = ws.exportPdf();
    await vi.waitFor(() => expect(reached).toBe(true));
    const id = ws.tabs.list().find((t) => t.session === tab)?.id ?? "";
    answer = true;
    expect(await ws.close(id)).toBe(true);
    release();
    expect(await done).toBe(false);
    expect(docs[0]).not.toBe(tab.board.doc);
    expect(pdfFiles.save).not.toHaveBeenCalled();
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("PDF que pdf-lib refuse : avis « PDF d'origine non recopié : pages en image » (PF20)", async () => {
    const raster = vi.fn(async () => ({ png: PNG_1PX, w: 612, h: 792 }));
    const ws = await setupWorkspace({ pdf: fakePdf({ pages: 1 }).engine, pdfFiles: files(), loadPdfLib, overlay: () => producer(), rasterPage: raster });
    await ws.openPdf({ name: "abime.pdf", blob: new Blob([new TextEncoder().encode("pas un PDF")]) });
    expect(await ws.exportPdf()).toBe(true);
    expect(raster).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith("PDF d'origine non recopié : pages en image");
  });

  it("export : rasterClose appelé une fois en fin d'export, même quand l'export échoue", async () => {
    const rasterClose = vi.fn();
    const ws = await setupWorkspace({ pdf: fakePdf({ pages: 1 }).engine, pdfFiles: files(), loadPdfLib, overlay: () => producer(), rasterClose });
    await ws.openPdf({ name: "ok.pdf", blob: new Blob([await realPdf(1)]) });
    expect(await ws.exportPdf()).toBe(true);
    expect(rasterClose).toHaveBeenCalledTimes(1);
    vi.spyOn(ws.active().board.doc, "saveParts").mockImplementationOnce(() => {
      throw new Error("refus du cœur");
    });
    expect(await ws.exportPdf()).toBe(false);
    expect(rasterClose).toHaveBeenCalledTimes(2);
  });

  it("export : rasterClose appelé avant la feuille d'enregistrement (save), une seule fois (relecture T17)", async () => {
    const order: string[] = [];
    const rasterClose = vi.fn(() => void order.push("rasterClose"));
    const pdfFiles = files();
    pdfFiles.save.mockImplementation(async () => (order.push("save"), true));
    const ws = await setupWorkspace({ pdf: fakePdf({ pages: 1 }).engine, pdfFiles, loadPdfLib, overlay: () => producer(), rasterClose });
    await ws.openPdf({ name: "ok.pdf", blob: new Blob([await realPdf(1)]) });
    expect(await ws.exportPdf()).toBe(true);
    expect(order).toEqual(["rasterClose", "save"]);
  });

  it("sans pdfFiles, loadPdfLib ou overlay : exportPdf rend faux, sans avis", async () => {
    const ws = await setupWorkspace({ loadPdfLib, overlay: () => producer() });
    expect(await ws.exportPdf()).toBe(false);
    expect(shell.notify).not.toHaveBeenCalled();
  });
});

describe("espace de travail : médias (C14)", () => {
  const VID = "cd".repeat(32);
  const VIDEO_SIZE = 300_000_000;
  const DOC_TARGET: SaveTarget = { kind: "tauri", name: "a.roomboard", path: "/cours/a.roomboard" };
  function docWithLinkedVideo(linked: string): CoreDocument {
    const d = fakeCore.blank();
    d.apply({
      type: "AddMedia",
      page: d.pageIds()[0]!,
      asset: { id: VID, name: "clip.webm", mime: "video/webm", size: VIDEO_SIZE },
      poster: null,
      linked,
      mediaType: "video",
      w: 640,
      h: 360,
      duration: 12,
      matrix: [1, 0, 0, 1, 0, 0],
    });
    return d;
  }
  const readsLinked = (linked: string, assets: ContainerContents["assets"] = []): void => {
    codec.read.mockResolvedValueOnce({ manifest: new Uint8Array([1]), ybin: docWithLinkedVideo(linked).save(NOW, "0.1.0"), assets, warnings: [] });
  };

  it("enregistrer un document à média lié le laisse non modifié", async () => {
    const ws = await setupWorkspace({ kind: "tauri", relinkMedia: async () => true });
    // R9 : même si le conteneur rendait des octets pour la vidéo, ils ne sont jamais réécrits.
    readsLinked("/cours/videos/clip.webm", [[VID, new Blob([new Uint8Array([7, 7, 7, 7])])]]);
    expect(await ws.openDocument({ name: "a.roomboard", bytes: new Uint8Array([9]), target: DOC_TARGET })).toBe(true);
    const tab = ws.active();
    const version = tab.board.doc.version();
    expect(await tab.files.run("save")).toBe(true); // Enregistrer permis : le lié n'est pas un asset absent (R30)
    expect(host.save.mock.calls.map((c) => c[1])).toEqual([DOC_TARGET]);
    const [manifest, ybin, assets] = codec.write.mock.calls[0]!;
    expect(fakeCore.loadParts(manifest, ybin).linkedAssets()).toEqual([{ id: VID, path: "videos/clip.webm" }]);
    expect(assets.map((a) => a.id)).not.toContain(VID);
    expect(tab.files.isDirty()).toBe(false);
    expect(tab.board.doc.version()).toBe(version);
  });

  it("ouvrir en coque : relinkMedia avec le chemin résolu et la taille", async () => {
    const relinkMedia = vi.fn(async (_p: string, _s: number) => true);
    const ws = await setupWorkspace({ kind: "tauri", relinkMedia });
    readsLinked("videos/clip.webm");
    expect(await ws.openDocument({ name: "a.roomboard", bytes: new Uint8Array([9]), target: DOC_TARGET })).toBe(true);
    expect(relinkMedia).toHaveBeenCalledWith("/cours/videos/clip.webm", VIDEO_SIZE);
    expect(ws.active().assets.linked(VID)).toBe("/cours/videos/clip.webm");
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("M31 : un lien introuvable est gardé et réécrit relatif au nouveau dossier à « Enregistrer sous »", async () => {
    const ws = await setupWorkspace({ kind: "tauri", relinkMedia: async () => false });
    readsLinked("videos/v.mp4");
    expect(await ws.openDocument({ name: "a.roomboard", bytes: new Uint8Array([9]), target: DOC_TARGET })).toBe(true);
    const tab = ws.active();
    const version = tab.board.doc.version();
    host.save.mockImplementationOnce(async (encode: (t: SaveTarget) => Promise<Uint8Array>) => {
      const t: SaveTarget = { kind: "tauri", name: "a.roomboard", path: "/b/a.roomboard" };
      saved.push(await encode(t));
      return t;
    });
    expect(await tab.files.run("save")).toBe(true);
    const [manifest, ybin] = codec.write.mock.calls[0]!;
    expect(fakeCore.loadParts(manifest, ybin).linkedAssets()).toEqual([{ id: VID, path: "../cours/videos/v.mp4" }]);
    expect(tab.board.doc.version()).toBe(version);
  });

  it("R1 : un document ouvert par dépôt avec path résout sa vidéo liée relative", async () => {
    const relinkMedia = vi.fn(async (_p: string, _s: number) => true);
    const ws = await setupWorkspace({ kind: "tauri", relinkMedia });
    readsLinked("videos/clip.webm");
    expect(await ws.openDocument({ name: "/cours/a.roomboard", bytes: new Uint8Array([9]), target: null, path: "/cours/a.roomboard" })).toBe(true);
    expect(relinkMedia).toHaveBeenCalledWith("/cours/videos/clip.webm", VIDEO_SIZE);
    expect(ws.active().assets.linked(VID)).toBe("/cours/videos/clip.webm");
  });

  it("linkMedia transmis à l'importeur (vidéo de 300 Mo déposée avec un chemin : liée par le gestionnaire média, T8)", async () => {
    const linkMedia = vi.fn(async (_p: string) => ({}) as unknown as LinkedMedia);
    await setupWorkspace({ kind: "tauri", linkMedia });
    const given = vi.mocked(createImporter).mock.calls.at(-1)![0];
    expect(given.linkMedia).toBeDefined();
    await given.linkMedia!("/cours/videos/clip.webm");
    expect(linkMedia).toHaveBeenCalledWith("/cours/videos/clip.webm");
    await setupWorkspace({ kind: "tauri" });
    expect(vi.mocked(createImporter).mock.calls.at(-1)![0].linkMedia).toBeUndefined();
  });

  it("copier un média lié : « Copie impossible : vidéo liée… »", async () => {
    const ws = await setupWorkspace({ kind: "tauri", relinkMedia: async () => true });
    readsLinked("/cours/videos/clip.webm");
    await ws.openDocument({ name: "a.roomboard", bytes: new Uint8Array([9]), target: DOC_TARGET });
    const tab = ws.active();
    const ids = tab.board.doc.elementIds(tab.board.doc.pageIds()[0]!);
    (tab.board.engine as unknown as { select(ids: string[]): void }).select(ids);
    await ws.copySelection(false);
    expect(shell.notify).toHaveBeenCalledWith("Copie impossible : vidéo liée : copie non prise en charge, déposez le fichier à nouveau");
    expect(ws.canPaste()).toBe(false);
  });
});

describe("espace de travail : objets 3D (C15)", () => {
  const glbFile = (): DroppedFile => plainFile("cube.glb", cubeGlb() as Uint8Array<ArrayBuffer>);
  const view = (): ModelView => ({
    available: () => true,
    load: vi.fn(async () => ({ missing: [] })),
    draw: () => null,
    snapshot: vi.fn(async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" })),
    release: vi.fn(),
    onLost: () => () => undefined,
  });

  it("un .glb déposé atteint model3d.view de l'importeur", async () => {
    const v = view();
    const model3d = { view: vi.fn(async () => v), readZip: vi.fn(async () => []) };
    const ws = await setupWorkspace({ model3d });
    const tab = ws.active();
    const applied: string[] = [];
    const orig = tab.board.doc.apply.bind(tab.board.doc);
    tab.board.doc.apply = ((c: Command) => {
      applied.push(c.type);
      return orig(c);
    }) as typeof tab.board.doc.apply;
    const r = await ws.importFiles([glbFile()], { x: 10, y: 10 });
    expect(model3d.view).toHaveBeenCalled();
    expect(r.inserted).toEqual(["cube.glb"]);
    expect(applied).toContain("AddModel3d");
  });

  it("sans model3d : .glb refusé comme avant", async () => {
    const ws = await setupWorkspace();
    const r = await ws.importFiles([glbFile()], { x: 10, y: 10 });
    expect(r.refused).toEqual(["cube.glb"]);
    expect(r.inserted).toEqual([]);
  });
});

describe("espace de travail : C4", () => {
  const grid = {
    visible: true,
    snap: false,
    above: false,
    levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }],
  } as const;
  const pageOf = (tab: TabSession): string => tab.board.doc.pageIds()[0]!;
  const setGrid = (tab: TabSession, g: unknown): void => void tab.board.engine.run({ type: "SetGrid", page: pageOf(tab), grid: g } as Command);
  const gridOf = (tab: TabSession) => tab.board.doc.page(pageOf(tab))?.grid ?? null;
  const rectOf = (tab: TabSession): string =>
    tab.board.doc.apply({ type: "AddShape", page: pageOf(tab), shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!;
  const zipHead = new Uint8Array([0x50, 0x4b, 3, 4, 0]);
  /** Fichier déposé : en-tête ZIP pour la détection, contenu = les octets de la ressource. */
  const droppedOf = (name: string, bytes: Uint8Array): DroppedFile => ({
    name,
    size: bytes.byteLength,
    mime: "",
    head: async (n: number) => zipHead.slice(0, n),
    blob: async () => new Blob([bytes as BlobPart]),
  });

  it("C4 : captureResource(« grid ») sans grille : null, avis dit", async () => {
    const ws = await setupWorkspace();
    expect(await ws.captureResource("grid")).toBeNull();
    expect(shell.notify).toHaveBeenCalledWith(NO_GRID_MESSAGE);
  });

  it("C4 : captureResource(« selection ») sans sélection : null, avis dit", async () => {
    const ws = await setupWorkspace();
    expect(await ws.captureResource("selection")).toBeNull();
    expect(shell.notify).toHaveBeenCalledWith("aucune sélection, rien n'est ajouté");
  });

  it("C4 : captureResource(« grid ») puis insertResource sur une page sans grille : la grille est posée", async () => {
    const ws = await setupWorkspace();
    const tab = ws.active();
    setGrid(tab, grid);
    const captured = (await ws.captureResource("grid"))!;
    expect(captured.kind).toBe("grid");
    expect(captured.thumbnail).toBeNull(); // aucun `thumbnail` dans les dépendances
    setGrid(tab, null);
    expect(await ws.insertResource(captured.bytes, "Seyès", null)).toBe("inserted");
    expect(gridOf(tab)?.levels[0]?.kind).toBe("squares");
  });

  it("C4 : captureResource : relecture de la vignette en échec → console, jamais une boîte (12)", async () => {
    const ws = await setupWorkspace({ thumbnail: {} as never });
    setGrid(ws.active(), grid);
    codec.read.mockRejectedValueOnce(new Error("illisible"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const captured = await ws.captureResource("grid");
      expect(captured?.kind).toBe("grid");
      expect(captured?.thumbnail).toBeNull();
      expect(shell.notify).not.toHaveBeenCalledWith(expect.stringContaining("vignette"));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("vignette non rendue"));
    } finally {
      warn.mockRestore();
    }
  });

  it("C4 : un .rbitem de grille déposé remplace la grille (cible insertFragment routée)", async () => {
    const ws = await setupWorkspace();
    const tab = ws.active();
    setGrid(tab, grid);
    const { bytes } = (await ws.captureResource("grid"))!;
    setGrid(tab, null);
    const r = await ws.importFiles([droppedOf("Seyès.rbitem", bytes)], null);
    expect(r.inserted).toEqual(["Seyès.rbitem"]);
    expect(gridOf(tab)).not.toBeNull();
  });

  it("C4 : trois .rbitem déposés ensemble : cascade R4, pas au même point (D24)", async () => {
    const ws = await setupWorkspace();
    const tab = ws.active();
    const id = rectOf(tab);
    (tab.board.engine as unknown as { select(ids: string[]): void }).select([id]);
    const { bytes } = (await ws.captureResource("selection"))!;
    const files = ["a", "b", "c"].map((n) => droppedOf(`${n}.rbitem`, bytes));
    await ws.importFiles(files, { x: 200, y: 200 });
    const ids = tab.board.doc.elementIds(pageOf(tab)).slice(-3);
    expect(new Set(ids.map((i) => tab.board.doc.bounds([i])!.x0)).size).toBe(3);
  });

  it("C4 : insertResource d'objets est une seule étape d'annulation", async () => {
    const ws = await setupWorkspace();
    const tab = ws.active();
    const id = rectOf(tab);
    (tab.board.engine as unknown as { select(ids: string[]): void }).select([id]);
    const { bytes } = (await ws.captureResource("selection"))!;
    expect(await ws.insertResource(bytes, "Objets", null)).toBe("inserted");
    expect(strokes(tab)).toBe(2);
    undoOn(tab);
    expect(strokes(tab)).toBe(1);
  });

  it("C4 : un .rbpack déposé est remis à importPack", async () => {
    const importPack = vi.fn(async (_n: string, _b: Uint8Array) => true);
    const ws = await setupWorkspace({ importPack });
    const zip = new Uint8Array([0x50, 0x4b, 3, 4, 0]);
    await ws.importFiles([plainFile("Fractions.rbpack", zip)], null);
    expect(importPack).toHaveBeenCalledTimes(1);
    expect(importPack.mock.calls[0]![0]).toBe("Fractions.rbpack");
    expect(Array.from(importPack.mock.calls[0]![1])).toEqual(Array.from(zip));
  });
});

describe("espace de travail : Office (C16)", () => {
  const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
  const DOCX = new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]);
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const G: TableGrid = { rows: 1, cols: 1, cells: ["a"], merges: [], sourceRows: 1, sourceCols: 1, cutCells: false };
  const engine = (pages = 2): PdfEngine => ({
    open: async (_b: Blob): Promise<PdfFile> => ({ pageCount: pages, pageSize: async () => ({ w: 612, h: 792 }), renderTile: async () => ({}) as TileBitmap, destroy: () => undefined }),
  });
  const office = (name: string, bytes: Uint8Array<ArrayBuffer> = DOCX, path: string | null = `/home/u/${name}`): DroppedFile => ({
    name, size: bytes.byteLength, mime: "", ...(path === null ? {} : { path }), head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
  });
  const converting = () => vi.fn(async (_p: string) => new Blob([PDF_HEAD]));
  const originals = (doc: CoreDocument) => doc.pageIds().map((id) => doc.page(id)?.backdrop?.original ?? null);

  it("S5 : cours.docx déposé avec un chemin : convertOffice(path), onglet « cours.roomboard », chaque fond porte original, PDF « cours.pdf » et original « cours.docx » au magasin", async () => {
    const convertOffice = converting();
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice });
    const r = await ws.importFiles([office("cours.docx")], null);
    expect(r.opened).toEqual(["cours.docx"]);
    expect(convertOffice.mock.calls).toEqual([["/home/u/cours.docx"]]);
    const tab = ws.active();
    const doc = tab.board.doc;
    expect([tab.files.name(), tab.files.isDirty(), doc.canUndo()]).toEqual(["cours.roomboard", false, false]);
    const orig = doc.citedAssets().find((a) => a.name === "cours.docx");
    const pdf = doc.citedAssets().find((a) => a.name === "cours.pdf");
    expect([orig?.mime, orig?.size, pdf?.mime]).toEqual([DOCX_MIME, DOCX.byteLength, "application/pdf"]);
    expect(originals(doc)).toEqual([orig!.id, orig!.id]);
    expect(Array.from(new Uint8Array(await tab.assets.get(orig!.id)!.arrayBuffer()))).toEqual(Array.from(DOCX));
    expect(tab.assets.get(orig!.id)!.type).toBe(DOCX_MIME);
  });

  it("S5 : enregistrer puis rouvrir : l'original est écrit dans les assets, même empreinte, chaque fond garde original", async () => {
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice: converting() });
    await ws.importFiles([office("cours.docx")], null);
    const doc = ws.active().board.doc;
    const orig = doc.citedAssets().find((a) => a.name === "cours.docx")!;
    expect(await ws.active().files.run("save")).toBe(true);
    const [manifest, ybin, assets] = codec.write.mock.calls[0]!;
    expect(assets.map((a) => a.id).sort()).toEqual(doc.citedAssets().map((a) => a.id).sort());
    expect(assets.find((a) => a.id === orig.id)?.mime).toBe(DOCX_MIME);
    codec.read.mockResolvedValueOnce({ manifest, ybin, assets: assets.map((a) => [a.id, a.blob] as const), warnings: [] });
    expect(await ws.openDocument({ name: "cours.roomboard", bytes: new Uint8Array([1]), target: null })).toBe(true);
    expect(originals(ws.active().board.doc)).toEqual([orig.id, orig.id]);
    expect(ws.active().assets.has(orig.id)).toBe(true);
  });

  it("S5 : « Modifier dans l'application d'origine » envoie le nom et les octets de l'original de la page montrée", async () => {
    const openOriginal = vi.fn(async (_f: { readonly name: string; readonly blob: Blob }) => undefined);
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice: converting(), openOriginal });
    await ws.importFiles([office("cours.docx")], null);
    expect(await ws.editOriginal()).toBe(true);
    const arg = openOriginal.mock.calls[0]![0];
    expect(arg.name).toBe("cours.docx");
    expect(Array.from(new Uint8Array(await arg.blob.arrayBuffer()))).toEqual(Array.from(DOCX));
  });

  it("page sans original : avis « cette page ne vient pas d'un fichier Word, Excel ou PowerPoint », rien envoyé (O19)", async () => {
    const openOriginal = vi.fn(async () => undefined);
    const ws = await setupWorkspace({ openOriginal });
    expect(await ws.editOriginal()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith(NOT_OFFICE_PAGE_MESSAGE);
    expect(openOriginal).not.toHaveBeenCalled();
  });

  it("S5, Review Focus 5 : original modifié : question ; oui : reimportOriginal(id) seul, le dépôt émis par la coque ouvre un second onglet, l'onglet d'origine intact ; non : rien ; dispose désabonne", async () => {
    const hook: { fire: ((e: { readonly id: string; readonly name: string }) => void) | null } = { fire: null };
    const onOriginalChanged = vi.fn((cb: (e: { readonly id: string; readonly name: string }) => void) => {
      hook.fire = cb;
      return () => {
        hook.fire = null;
      };
    });
    const reimportOriginal = vi.fn(async (_id: string) => {
      dropHandler?.([office("cours.docx", DOCX, "/cache/originaux/1-0/cours.docx")], null);
    });
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice: converting(), onOriginalChanged, reimportOriginal });
    await ws.importFiles([office("cours.docx")], null);
    const origin = ws.active();
    const pages = origin.board.doc.pageIds();
    answer = true;
    hook.fire!({ id: "1-0", name: "cours.docx" });
    await vi.waitFor(() => expect(ws.tabs.list()).toHaveLength(3));
    expect(shell.confirm).toHaveBeenCalledWith(originalChangedMessage("cours.docx"));
    expect(reimportOriginal.mock.calls).toEqual([["1-0"]]);
    expect(origin.board.doc.pageIds()).toEqual(pages);
    answer = false;
    hook.fire!({ id: "1-0", name: "cours.docx" });
    await flush();
    expect(reimportOriginal).toHaveBeenCalledTimes(1);
    ws.dispose();
    expect(hook.fire).toBeNull();
  });

  it("original modifié : deux événements pour le même id avant la réponse : une seule question", async () => {
    const hook: { fire: ((e: { readonly id: string; readonly name: string }) => void) | null } = { fire: null };
    const onOriginalChanged = vi.fn((cb: (e: { readonly id: string; readonly name: string }) => void) => {
      hook.fire = cb;
      return () => undefined;
    });
    const reimportOriginal = vi.fn(async (_id: string) => undefined);
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice: converting(), onOriginalChanged, reimportOriginal });
    answer = true;
    shell.confirm.mockClear();
    hook.fire!({ id: "1-0", name: "cours.docx" });
    hook.fire!({ id: "1-0", name: "cours.docx" });
    await flush();
    await flush();
    expect(shell.confirm).toHaveBeenCalledTimes(1);
    expect(reimportOriginal.mock.calls).toEqual([["1-0"]]);
    hook.fire!({ id: "1-0", name: "cours.docx" });
    await flush();
    expect(shell.confirm).toHaveBeenCalledTimes(2);
    ws.dispose();
  });

  it("S5, O18 : un .roomboard d'avant C16 (PDF de C12, sans original) s'ouvre comme avant : original null partout", async () => {
    const ws = await setupWorkspace();
    const c12 = fakeCore.fromPdfPages({ id: "cd".repeat(32), name: "cours.pdf", mime: "application/pdf", size: 9 }, [{ w: 612, h: 792 }, { w: 792, h: 612 }]);
    const [manifest, ybin] = c12.saveParts(NOW, "0.1.0");
    codec.read.mockResolvedValueOnce({ manifest, ybin, assets: [], warnings: [] });
    expect(await ws.openDocument({ name: "cours.roomboard", bytes: new Uint8Array([1]), target: null })).toBe(true);
    const doc = ws.active().board.doc;
    expect(doc.pageIds().map((id) => doc.page(id)?.backdrop?.kind)).toEqual(["pdf-page", "pdf-page"]);
    expect(originals(doc)).toEqual([null, null]);
  });

  it("S5, O4 : sans convertisseur (no-program), notes.xlsx donne un tableau et l'avis « importé en valeurs… » ; cours.docx : « installez… »", async () => {
    const convertOffice = vi.fn(async (_p: string): Promise<Blob> => {
      throw new OfficeConvertError("no-program");
    });
    const readSheet = vi.fn(async (_b: Blob) => G);
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice, readSheet });
    const r = await ws.importFiles([office("notes.xlsx"), office("cours.docx")], null);
    expect([r.inserted, r.failed]).toEqual([["notes.xlsx"], ["cours.docx"]]);
    expect(readSheet).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith(`notes.xlsx : ${OFFICE_VALUES_MESSAGE}`);
    expect(shell.notify).toHaveBeenCalledWith("cours.docx : installez LibreOffice ou Microsoft Office");
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("S5, O4 : coque sans convertisseur (officeConverter: false) : notes.xlsx donne un tableau ET l'avis « importé en valeurs… »", async () => {
    const convertOffice = vi.fn(async (_p: string): Promise<Blob> => new Blob());
    const readSheet = vi.fn(async (_b: Blob) => G);
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice, readSheet, officeConverter: false });
    const r = await ws.importFiles([office("notes.xlsx")], null);
    expect(r.inserted).toEqual(["notes.xlsx"]);
    expect(convertOffice).not.toHaveBeenCalled();
    expect(shell.notify).toHaveBeenCalledWith(`notes.xlsx : ${OFFICE_VALUES_MESSAGE}`);
  });
});
