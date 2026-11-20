import { describe, expect, it, vi } from "vitest";
import type { CoreDocument } from "../core/api";
import { fakeCore } from "../core/fake-core";
import {
  APP_VERSION,
  createFileController,
  fileCommandOf,
  UNREAD_ASSETS_MESSAGE,
  type FileControllerDeps,
  type VersionSource,
} from "./controller";
import type { DroppedFile, FileHost, OpenedFile, SaveTarget, ShellPort } from "./files";

function versionsOf(doc: CoreDocument): VersionSource & { bump(): void; listeners(): number } {
  const cbs = new Set<(s: { version: number }) => void>();
  return {
    state: () => ({ version: doc.version() }),
    onState(cb) {
      cbs.add(cb);
      return () => {
        cbs.delete(cb);
      };
    },
    bump() {
      for (const cb of cbs) cb({ version: doc.version() });
    },
    listeners: () => cbs.size,
  };
}

function stroke(doc: CoreDocument, v: { bump(): void }, y = 10): void {
  const page = doc.pageIds()[0];
  if (page === undefined) throw new Error("aucune page");
  doc.apply({ type: "CommitStroke", page, points: new Float32Array([0, y, 0.5, 50, y, 0.5]), style: { color: "#000000", width: 4 } });
  v.bump();
}

interface Deferred<T> { promise: Promise<T>; resolve(v: T): void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

type SaveBehaviour = "write" | null | Error | Deferred<SaveTarget | null>;

function memoryHost() {
  const files = new Map<string, Uint8Array>();
  const calls = { save: [] as SaveTarget[], open: 0, pick: 0 };
  let picked: DroppedFile[] = [];
  let save: SaveBehaviour = "write";
  let open: OpenedFile | null | Error = null;
  const host: FileHost = {
    kind: "repli",
    onDrop: () => () => undefined,
    async open() {
      calls.open += 1;
      if (open instanceof Error) throw open;
      return open;
    },
    async pick() {
      calls.pick += 1;
      return picked;
    },
    async save(encode, target) {
      calls.save.push(target);
      if (save instanceof Error) throw save;
      if (save === null) return null;
      if (save !== "write") return save.promise;
      files.set(target.name, (await encode()).slice());
      return { kind: "download", name: target.name };
    },
  };
  return {
    host,
    files,
    calls,
    onSave(b: SaveBehaviour) {
      save = b;
    },
    onPick(f: DroppedFile[]) {
      picked = f;
    },
    onOpen(o: OpenedFile | null | Error) {
      open = o;
    },
  };
}

function fakeShell(answer: boolean) {
  const log = { confirms: [] as string[], notes: [] as string[], titles: [] as string[], guardMessage: "", stopped: 0 };
  let guard: () => boolean = () => false;
  const shell: ShellPort = {
    async confirm(m) {
      log.confirms.push(m);
      return answer;
    },
    async notify(m) {
      log.notes.push(m);
    },
    guardClose(isDirty, message) {
      guard = isDirty;
      log.guardMessage = message;
      return () => {
        log.stopped += 1;
      };
    },
    setTitle(t) {
      log.titles.push(t);
    },
  };
  return { shell, log, guard: () => guard() };
}

interface SetupOptions {
  readonly opened?: FileControllerDeps["opened"];
  readonly answer?: boolean;
  readonly encode?: FileControllerDeps["encode"];
  readonly saveBlocked?: FileControllerDeps["saveBlocked"];
  readonly importFiles?: FileControllerDeps["importFiles"];
  readonly openInTab?: FileControllerDeps["openInTab"];
  readonly newTab?: FileControllerDeps["newTab"];
}

function setup(o: SetupOptions = {}) {
  const doc = fakeCore.blank();
  const versions = versionsOf(doc);
  const h = memoryHost();
  const s = fakeShell(o.answer ?? true);
  const tabs = { opened: [] as OpenedFile[], news: 0 };
  const ctl = createFileController({
    encode: o.encode ?? (async (now, v) => doc.save(now, v)),
    importFiles: o.importFiles ?? (async () => undefined),
    ...(o.saveBlocked ? { saveBlocked: o.saveBlocked } : {}),
    versions,
    host: h.host,
    shell: s.shell,
    opened: o.opened ?? null,
    openInTab:
      o.openInTab ??
      (async (f) => {
        tabs.opened.push(f);
        return true;
      }),
    newTab:
      o.newTab ??
      (async () => {
        tabs.news += 1;
      }),
    now: () => "2026-11-19T00:00:00.000Z",
    appVersion: APP_VERSION,
  });
  return { doc, versions, h, s, tabs, ctl };
}

const pageOf = (d: CoreDocument): string => d.pageIds()[0] ?? "";
const pointsOf = (d: CoreDocument): number[][] => d.elementIds(pageOf(d)).map((id) => Array.from(d.points(id) ?? []));
const k = (key: string, m: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; repeat: boolean }> = {}) => ({
  key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...m,
});
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("contrôleur des fichiers (D26)", () => {
  it("aller-retour : enregistrer puis ouvrir donne à openInTab les mêmes octets", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    stroke(t.doc, t.versions, 30);
    expect(await t.ctl.run("save")).toBe(true);
    const bytes = t.h.files.get("Sans titre.roomboard");
    if (!bytes) throw new Error("rien d'enregistré");
    t.h.onOpen({ name: "Sans titre.roomboard", bytes, target: { kind: "download", name: "Sans titre.roomboard" } });
    expect(await t.ctl.run("open")).toBe(true);
    expect(t.tabs.opened).toHaveLength(1);
    const p = t.tabs.opened[0];
    if (!p) throw new Error("rien d'ouvert");
    expect(p.target).toEqual({ kind: "download", name: "Sans titre.roomboard" });
    expect(Array.from(p.bytes)).toEqual(Array.from(bytes));
    const reopened = fakeCore.load(p.bytes);
    expect(reopened.elementIds(pageOf(reopened))).toEqual(t.doc.elementIds(pageOf(t.doc)));
    expect(pointsOf(reopened)).toEqual(pointsOf(t.doc));
  });

  it("modifié : faux au départ, vrai après un trait, faux après l'enregistrement ; titre marqué « • »", async () => {
    const t = setup();
    expect(t.ctl.isDirty()).toBe(false);
    expect(t.s.log.titles.at(-1)).toBe("Sans titre.roomboard — RoomBoard");
    stroke(t.doc, t.versions);
    expect(t.ctl.isDirty()).toBe(true);
    expect(t.s.log.titles.at(-1)).toBe("• Sans titre.roomboard — RoomBoard");
    await t.ctl.run("save");
    expect(t.ctl.isDirty()).toBe(false);
    expect(t.s.log.titles.at(-1)).toBe("Sans titre.roomboard — RoomBoard");
  });

  it("trait tracé pendant l'enregistrement : le document reste modifié", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    const d = deferred<SaveTarget | null>();
    t.h.onSave(d);
    const saving = t.ctl.run("save");
    stroke(t.doc, t.versions, 60);
    d.resolve({ kind: "download", name: "Sans titre.roomboard" });
    expect(await saving).toBe(true);
    expect(t.ctl.isDirty()).toBe(true);
  });

  it("Ctrl+S sans cible : demande ; second Ctrl+S : réécrit la cible rendue, sans demander", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    await t.ctl.run("save");
    stroke(t.doc, t.versions, 30);
    await t.ctl.run("save");
    expect(t.h.calls.save).toEqual([
      { kind: "ask", name: "Sans titre.roomboard" },
      { kind: "download", name: "Sans titre.roomboard" },
    ]);
  });

  it("Enregistrer sous : demande toujours, même avec une cible", async () => {
    const t = setup();
    await t.ctl.run("save");
    await t.ctl.run("saveAs");
    expect(t.h.calls.save[1]).toEqual({ kind: "ask", name: "Sans titre.roomboard" });
  });

  it("annulation de l'enregistrement : reste modifié, cible inchangée, aucun message", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    t.h.onSave(null);
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.ctl.isDirty()).toBe(true);
    expect(t.s.log.notes).toEqual([]);
    t.h.onSave("write");
    await t.ctl.run("save");
    expect(t.h.calls.save[1]?.kind).toBe("ask");
  });

  it("erreur d'écriture : message « Enregistrement impossible : … », reste modifié", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    t.h.onSave(new Error("disque plein"));
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.s.log.notes).toEqual(["Enregistrement impossible : disque plein"]);
    expect(t.ctl.isDirty()).toBe(true);
  });

  it("ouvrir un document modifié : aucune question, openInTab appelé, document courant modifié intact", async () => {
    const t = setup({ answer: false });
    stroke(t.doc, t.versions);
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(true);
    expect(t.s.log.confirms).toEqual([]);
    expect([t.h.calls.open, t.tabs.opened.map((f) => f.name)]).toEqual([1, ["a.roomboard"]]);
    expect([t.ctl.isDirty(), t.ctl.name(), t.doc.elementIds(pageOf(t.doc)).length]).toEqual([true, "Sans titre.roomboard", 1]);
  });

  it("openInTab qui rend false : rien d'autre, aucun message en double", async () => {
    // L'onglet a déjà dit pourquoi (fichier illisible) : le contrôleur ne répète rien.
    const t = setup({ openInTab: async () => false });
    stroke(t.doc, t.versions);
    t.h.onOpen({
      name: "faux.roomboard",
      bytes: new TextEncoder().encode("pas un document"),
      target: { kind: "download", name: "faux.roomboard" },
    });
    expect(await t.ctl.run("open")).toBe(false);
    expect([t.s.log.notes, t.s.log.confirms.length, t.ctl.isDirty(), t.ctl.name()]).toEqual([[], 0, true, "Sans titre.roomboard"]);
  });

  it("annulation de l'ouverture : rien, aucune question même modifié ; refus de la boîte : message", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    t.h.onOpen(null);
    expect(await t.ctl.run("open")).toBe(false);
    expect([t.tabs.opened.length, t.s.log.notes.length, t.s.log.confirms.length]).toEqual([0, 0, 0]);
    t.h.onOpen(Object.assign(new Error("Must be handling a user gesture"), { name: "SecurityError" }));
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.notes).toEqual(["Ouverture impossible : Must be handling a user gesture"]);
  });

  it("garde de fermeture : jamais posée par le contrôleur d'onglet", async () => {
    // La garde passe au workspace (une pour la fenêtre, CL5b-6) : N onglets ne posent pas N gardes.
    const t = setup();
    stroke(t.doc, t.versions);
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(true);
    expect(await t.ctl.run("new")).toBe(true);
    t.ctl.dispose();
    expect([t.s.log.guardMessage, t.s.log.stopped]).toEqual(["", 0]);
  });

  it("raccourcis : Ctrl+S, Ctrl+Maj+S, Ctrl+O, Ctrl+N, Cmd+S, touche tenue comprise ; Alt ou sans Ctrl : rien", () => {
    expect(fileCommandOf(k("s", { ctrlKey: true }))).toBe("save");
    expect(fileCommandOf(k("S", { ctrlKey: true, shiftKey: true }))).toBe("saveAs");
    expect(fileCommandOf(k("o", { ctrlKey: true }))).toBe("open");
    expect(fileCommandOf(k("n", { ctrlKey: true }))).toBe("new");
    expect(fileCommandOf(k("s", { metaKey: true }))).toBe("save");
    expect(fileCommandOf(k("s"))).toBeNull();
    expect(fileCommandOf(k("s", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(fileCommandOf(k("z", { ctrlKey: true }))).toBeNull();
    expect(fileCommandOf(k("O", { ctrlKey: true, shiftKey: true }))).toBeNull();
    // Reconnue même tenue : la page doit pouvoir appeler preventDefault (sinon le navigateur ouvre « Enregistrer sous »).
    expect(fileCommandOf(k("s", { ctrlKey: true, repeat: true }))).toBe("save");
    expect(fileCommandOf(k("o", { metaKey: true, repeat: true }))).toBe("open");
  });

  it("touche tenue : prise par le contrôleur (preventDefault), aucune commande relancée ; autre touche : laissée", async () => {
    const t = setup();
    expect(t.ctl.key(k("s", { ctrlKey: true, repeat: true }))).toBe(true);
    expect(t.ctl.key(k("o", { metaKey: true, repeat: true }))).toBe(true);
    expect([t.h.calls.save.length, t.h.calls.open]).toEqual([0, 0]);
    expect(t.ctl.key(k("z", { ctrlKey: true }))).toBe(false);
    expect(t.ctl.key(k("s"))).toBe(false);
    expect(t.ctl.key(k("s", { ctrlKey: true }))).toBe(true);
    expect(t.h.calls.save).toEqual([{ kind: "ask", name: "Sans titre.roomboard" }]);
    await flush();
    expect(t.ctl.key(k("s", { ctrlKey: true, repeat: true }))).toBe(true);
    expect(t.h.calls.save.length).toBe(1);
  });

  it("nouveau avec un document modifié : newTab, sans question, document courant intact", async () => {
    const t = setup({ answer: false });
    stroke(t.doc, t.versions);
    expect(await t.ctl.run("new")).toBe(true);
    expect([t.s.log.confirms, t.tabs.news, t.ctl.isDirty(), t.doc.elementIds(pageOf(t.doc)).length]).toEqual([[], 1, true, 1]);
  });

  it("encodage impossible : message, rien d'écrit, reste modifié (R11 : la cible avant l'encodage)", async () => {
    const t = setup({
      encode: async () => {
        throw new Error("mémoire épuisée");
      },
    });
    stroke(t.doc, t.versions);
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.s.log.notes).toEqual(["Enregistrement impossible : mémoire épuisée"]);
    expect([t.h.files.size, t.ctl.isDirty()]).toEqual([0, true]);
  });

  it("openInTab qui lève : message « Ouverture impossible », la commande rend false", async () => {
    const t = setup({
      openInTab: async () => {
        throw new Error("quota dépassé");
      },
    });
    stroke(t.doc, t.versions);
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.notes).toEqual(["Ouverture impossible (a.roomboard) : quota dépassé"]);
    expect(t.ctl.isDirty()).toBe(true);
    t.h.onOpen(null);
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.h.calls.open).toBe(2);
  });

  it("newTab qui lève : la commande rend false, aucun rejet non géré, la suivante passe", async () => {
    let fail = true;
    const t = setup({
      newTab: async () => {
        if (fail) throw new Error("contexte WebGL2 refusé");
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(await t.ctl.run("new")).toBe(false);
    } finally {
      warn.mockRestore();
    }
    fail = false;
    expect(await t.ctl.run("new")).toBe(true);
  });

  it("enregistrer puis annuler : le document reste modifié (version monotone, pas canUndo)", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    await t.ctl.run("save");
    expect(t.ctl.isDirty()).toBe(false);
    t.doc.undo();
    t.versions.bump();
    expect(t.doc.canUndo()).toBe(false);
    expect(t.ctl.isDirty()).toBe(true);
    expect(t.s.log.titles.at(-1)).toBe("• Sans titre.roomboard — RoomBoard");
  });

  it("nouveau : newTab, sans question, document courant intact", async () => {
    const t = setup();
    expect(await t.ctl.run("new")).toBe(true);
    expect([t.s.log.confirms, t.tabs.news]).toEqual([[], 1]);
    const u = setup();
    stroke(u.doc, u.versions);
    expect(await u.ctl.key(k("n", { ctrlKey: true }))).toBe(true);
    await flush();
    expect([u.s.log.confirms, u.tabs.news, u.ctl.isDirty()]).toEqual([[], 1, true]);
  });

  it("document ouvert depuis l'attente : nom et cible repris, Ctrl+S réécrit sans demander", async () => {
    const t = setup({ opened: { name: "cours.roomboard", target: { kind: "download", name: "cours.roomboard" } } });
    expect(t.ctl.name()).toBe("cours.roomboard");
    expect(t.s.log.titles.at(-1)).toBe("cours.roomboard — RoomBoard");
    stroke(t.doc, t.versions);
    await t.ctl.run("save");
    expect(t.h.calls.save).toEqual([{ kind: "download", name: "cours.roomboard" }]);
  });

  it("commande pendant une autre : ignorée, une seule boîte", async () => {
    const t = setup();
    const d = deferred<SaveTarget | null>();
    t.h.onSave(d);
    const first = t.ctl.run("save");
    expect(await t.ctl.run("save")).toBe(false);
    expect(await t.ctl.run("open")).toBe(false);
    expect([t.h.calls.save.length, t.h.calls.open]).toEqual([1, 0]);
    d.resolve({ kind: "download", name: "Sans titre.roomboard" });
    expect(await first).toBe(true);
  });

  it("dispose : désabonné de l'état ; aucune garde de fermeture à retirer (posée par le workspace)", () => {
    const t = setup();
    expect(t.versions.listeners()).toBe(1);
    t.ctl.dispose();
    expect([t.versions.listeners(), t.s.log.stopped]).toEqual([0, 0]);
  });

  it("T79 : notify qui rejette pendant Ctrl+S : aucun rejet non géré, la commande rend false", async () => {
    const t = setup();
    t.h.onSave(new Error("disque plein"));
    t.s.shell.notify = async () => {
      throw new Error("boîte indisponible");
    };
    stroke(t.doc, t.versions);
    expect(t.ctl.key(k("s", { ctrlKey: true }))).toBe(true);
    await flush();
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.ctl.isDirty()).toBe(true);
  });

  it("T79 : confirm qui rejette pendant une commande : aucun rejet non géré (Ctrl+O, notify qui rejette)", async () => {
    // Ctrl+N ne pose plus de question : la boîte qui rejette se joue sur Ouvrir, quand openInTab lève et que notify rejette.
    const t = setup({
      openInTab: async () => {
        throw new Error("illisible");
      },
    });
    stroke(t.doc, t.versions);
    t.s.shell.confirm = async () => {
      throw new Error("boîte indisponible");
    };
    t.s.shell.notify = async () => {
      throw new Error("boîte indisponible");
    };
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(t.ctl.key(k("o", { ctrlKey: true }))).toBe(true);
      await flush();
      expect(await t.ctl.run("open")).toBe(false);
      expect(t.ctl.isDirty()).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it("T79 : Ctrl+N ne pose ni ne retire aucune garde de fermeture, dispose compris", async () => {
    // Plus de rechargement voulu : la garde de la fenêtre appartient au workspace, le contrôleur n'y touche jamais.
    const t = setup();
    stroke(t.doc, t.versions);
    expect(await t.ctl.run("new")).toBe(true);
    expect(t.tabs.news).toBe(1);
    t.ctl.dispose();
    expect([t.s.log.guardMessage, t.s.log.stopped]).toEqual(["", 0]);
  });

  it("T81 : notify qui rejette : l'erreur d'enregistrement d'origine et l'erreur de la boîte sont toutes deux journalisées", async () => {
    const t = setup();
    t.h.onSave(new Error("disque plein"));
    t.s.shell.notify = async () => {
      throw new Error("boîte indisponible");
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      stroke(t.doc, t.versions);
      expect(await t.ctl.run("save")).toBe(false);
      const logged = warn.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(logged).toContain("disque plein");
      expect(logged).toContain("boîte indisponible");
    } finally {
      warn.mockRestore();
    }
  });
});

describe("contrôleur : encode, import, refus R30 (R11, R18, R30)", () => {
  it("boîte annulée : encode jamais appelé, toujours modifié", async () => {
    const encode = vi.fn(async () => new Uint8Array([1]));
    const t = setup({ encode });
    stroke(t.doc, t.versions);
    t.h.onSave(null);
    expect(await t.ctl.run("save")).toBe(false);
    expect(encode).not.toHaveBeenCalled();
    expect(t.ctl.isDirty()).toBe(true);
  });

  it("encode reçoit l'heure et la version de l'application", async () => {
    const encode = vi.fn(async (_n: string, _v: string) => new Uint8Array([1]));
    const t = setup({ encode });
    await t.ctl.run("save");
    expect(encode).toHaveBeenCalledWith("2026-11-19T00:00:00.000Z", APP_VERSION);
  });

  it("saveBlocked : Enregistrer et Enregistrer sous refusés avec le message, hôte jamais appelé", async () => {
    const t = setup({ saveBlocked: () => UNREAD_ASSETS_MESSAGE });
    expect(await t.ctl.run("save")).toBe(false);
    expect(await t.ctl.run("saveAs")).toBe(false);
    expect(t.s.log.notes).toEqual([UNREAD_ASSETS_MESSAGE, UNREAD_ASSETS_MESSAGE]);
    expect(t.h.calls.save).toEqual([]);
  });

  it("import : la boîte multiple puis importFiles avec les fichiers choisis", async () => {
    const importFiles = vi.fn(async () => undefined);
    const t = setup({ importFiles });
    const f: DroppedFile = { name: "a.png", size: 1, mime: "", head: async () => new Uint8Array([1]), blob: async () => new Blob([new Uint8Array([1])]) };
    t.h.onPick([f]);
    expect(await t.ctl.run("import")).toBe(true);
    expect(importFiles).toHaveBeenCalledWith([f]);
  });

  it("Ctrl+S pendant un import : refusé avec un message court", async () => {
    let release: () => void = () => undefined;
    const importFiles = vi.fn(() => new Promise<void>((r) => (release = r)));
    const t = setup({ importFiles });
    t.h.onPick([{ name: "a.png", size: 1, mime: "", head: async () => new Uint8Array([1]), blob: async () => new Blob([new Uint8Array([1])]) }]);
    const importing = t.ctl.run("import");
    await new Promise((r) => setTimeout(r, 0));
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.s.log.notes).toEqual(["Import en cours : réessayez dans un instant"]);
    release();
    await importing;
  });

  it("import annulé ([]) : false, rien importé", async () => {
    const importFiles = vi.fn(async () => undefined);
    const t = setup({ importFiles });
    expect(await t.ctl.run("import")).toBe(false);
    expect([t.h.calls.pick, importFiles.mock.calls.length]).toEqual([1, 0]);
  });
});
