// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoreDocument } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { DISCARD_MESSAGE } from "../platform/controller";
import type { DropHandler, DroppedFile, FileHost, HostKind, OpenedFile, SaveTarget } from "../platform/files";
import { LATER_FORMAT_MESSAGE } from "../platform/import";
import type { StartedDocument } from "../platform/mount";
import type { BoardSession } from "./board-session";
import { TOO_MANY_TABS } from "./tabs";
import { createWorkspace, type TabSession, type Workspace, type WorkspaceDeps } from "./workspace";

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

beforeEach(() => {
  log = [];
  boards = [];
  answer = true;
  guard = () => false;
  guardStops = 0;
  dropHandler = null;
  dropStops = 0;
  opening = null;
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
  const cbs = new Set<(s: { version: number }) => void>();
  const n = boards.length + 1;
  const board = {
    doc,
    engine: {
      state: () => ({ version: doc.version() }),
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
    blob: async () => ({ arrayBuffer: async () => bytes.slice().buffer }) as unknown as Blob,
  };
}

function plainFile(name: string): DroppedFile {
  return { name, size: 3, mime: "image/png", blob: async () => ({ arrayBuffer: async () => new ArrayBuffer(3) }) as unknown as Blob };
}

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
    save: vi.fn(async (_e: () => Promise<Uint8Array>, t: SaveTarget): Promise<SaveTarget | null> => (t.kind === "ask" ? { kind: "download", name: t.name } : t)),
  };
  let n = 0;
  return createWorkspace({
    core: fakeCore,
    host,
    kind: host.kind,
    shell,
    first: o.first ?? { doc: fakeCore.blank(), opened: null, error: null },
    makeSession: async (doc) => fakeSession(doc).board,
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

  it("dépôt d'un .png : message, document intact, aucun onglet", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    drawOn(first);
    const version = first.board.engine.state().version;
    const report = await ws.importFiles([plainFile("image.png")], null);
    expect(report.refused).toEqual(["image.png"]);
    expect(shell.notify).toHaveBeenCalledWith(`image.png : ${LATER_FORMAT_MESSAGE}`);
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
    await expect(ws.importFiles([plainFile("a.png")])).resolves.toMatchObject({ refused: ["a.png"] });
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
