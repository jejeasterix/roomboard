// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Command, CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { createClipboard } from "../platform/clipboard";
import { fakeCore } from "../core/fake-core";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { APP_VERSION, DISCARD_MESSAGE, UNREAD_ASSETS_MESSAGE } from "../platform/controller";
import type { DropHandler, DroppedFile, FileHost, HostKind, OpenedFile, SaveTarget } from "../platform/files";
import { PASTE_MAX_CHARS, PASTE_TOO_BIG } from "../platform/html-table";
import { LATER_FORMAT_MESSAGE } from "../platform/import";
import type { StartedDocument } from "../platform/mount";
import type { BoardSession } from "./board-session";
import { TOO_MANY_TABS } from "./tabs";
import { CODEC_FALLBACK_MESSAGE, createWorkspace, type TabSession, type Workspace, type WorkspaceDeps } from "./workspace";

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
let host: FileHost & { save: ReturnType<typeof vi.fn<(e: () => Promise<Uint8Array>, t: SaveTarget) => Promise<SaveTarget | null>>> };
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
    read: vi.fn<ContainerCodec["read"]>(async (b) => ({ manifest: new Uint8Array(), ybin: new Uint8Array(await b.arrayBuffer()), assets: [], warnings: [] })),
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
    save: vi.fn(async (encode: () => Promise<Uint8Array>, t: SaveTarget): Promise<SaveTarget | null> => {
      saved.push(await encode());
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
    codec.read.mockResolvedValueOnce({ manifest: new Uint8Array(), ybin: frag.saveFragment(NOW, "0.1.0", "x"), assets: [], warnings: [] });
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

  it("selection(a) : grouper et dégrouper relayés au moteur", async () => {
    const ws = await setupWorkspace();
    ws.selection("group");
    ws.selection("ungroup");
    const e = ws.active().board.engine as unknown as { group: ReturnType<typeof vi.fn>; ungroup: ReturnType<typeof vi.fn> };
    expect([e.group.mock.calls.length, e.ungroup.mock.calls.length]).toEqual([1, 1]);
  });
});
