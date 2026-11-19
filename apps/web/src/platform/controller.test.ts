import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../core/api";
import { fakeCore } from "../core/fake-core";
import {
  APP_VERSION,
  createFileController,
  DISCARD_MESSAGE,
  fileCommandOf,
  type FileControllerDeps,
  type VersionSource,
} from "./controller";
import type { FileHost, OpenedFile, PendingOpen, PendingStore, SaveTarget, ShellPort } from "./files";

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
  const calls = { save: [] as SaveTarget[], open: 0 };
  let save: SaveBehaviour = "write";
  let open: OpenedFile | null | Error = null;
  const host: FileHost = {
    kind: "repli",
    async open() {
      calls.open += 1;
      if (open instanceof Error) throw open;
      return open;
    },
    async save(bytes, target) {
      calls.save.push(target);
      if (save instanceof Error) throw save;
      if (save === null) return null;
      if (save !== "write") return save.promise;
      files.set(target.name, bytes.slice());
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

function memoryPending(): PendingStore & { value: PendingOpen | null; cleared: number } {
  const p = {
    value: null as PendingOpen | null,
    cleared: 0,
    async put(v: PendingOpen): Promise<void> {
      p.value = v;
    },
    async take(): Promise<PendingOpen | null> {
      const v = p.value;
      p.value = null;
      return v;
    },
    async clear(): Promise<void> {
      p.cleared += 1;
      p.value = null;
    },
  };
  return p;
}

function setup(o: { opened?: FileControllerDeps["opened"]; answer?: boolean; docSave?: CoreDocument["save"] } = {}) {
  const doc = fakeCore.blank();
  const versions = versionsOf(doc);
  const h = memoryHost();
  const s = fakeShell(o.answer ?? true);
  const pending = memoryPending();
  let reloads = 0;
  const ctl = createFileController({
    core: fakeCore,
    doc: o.docSave ? { save: o.docSave } : doc,
    versions,
    host: h.host,
    shell: s.shell,
    pending,
    opened: o.opened ?? null,
    reload: () => {
      reloads += 1;
    },
    now: () => "2026-11-19T00:00:00.000Z",
    appVersion: APP_VERSION,
  });
  return { doc, versions, h, s, pending, ctl, reloads: () => reloads };
}

const pageOf = (d: CoreDocument): string => d.pageIds()[0] ?? "";
const pointsOf = (d: CoreDocument): number[][] => d.elementIds(pageOf(d)).map((id) => Array.from(d.points(id) ?? []));
const k = (key: string, m: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; repeat: boolean }> = {}) => ({
  key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...m,
});
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("contrôleur des fichiers (D26)", () => {
  it("aller-retour : enregistrer puis ouvrir met en attente les mêmes octets ; le document rechargé a les mêmes traits", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    stroke(t.doc, t.versions, 30);
    expect(await t.ctl.run("save")).toBe(true);
    const bytes = t.h.files.get("Sans titre.roomboard");
    if (!bytes) throw new Error("rien d'enregistré");
    t.h.onOpen({ name: "Sans titre.roomboard", bytes, target: { kind: "download", name: "Sans titre.roomboard" } });
    expect(await t.ctl.run("open")).toBe(true);
    expect(t.reloads()).toBe(1);
    const p = t.pending.value;
    if (!p) throw new Error("aucune attente");
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

  it("ouvrir avec un document modifié : le sélecteur d'abord, puis la question ; Non → rien n'est ouvert", async () => {
    const t = setup({ answer: false });
    stroke(t.doc, t.versions);
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.confirms).toEqual([DISCARD_MESSAGE]);
    expect([t.h.calls.open, t.reloads(), t.pending.value]).toEqual([1, 0, null]);
  });

  it("fichier illisible : message, aucune attente, aucun rechargement", async () => {
    const t = setup();
    stroke(t.doc, t.versions); // modifié : un fichier illisible ne pose pas la question
    t.h.onOpen({
      name: "faux.roomboard",
      bytes: new TextEncoder().encode("pas un document"),
      target: { kind: "download", name: "faux.roomboard" },
    });
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.notes).toEqual(["Ouverture impossible (faux.roomboard) : ce fichier n'est pas un document RoomBoard"]);
    expect([t.reloads(), t.pending.value, t.s.log.confirms.length]).toEqual([0, null, 0]);
  });

  it("annulation de l'ouverture : rien, aucune question même modifié ; refus de la boîte : message", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    t.h.onOpen(null);
    expect(await t.ctl.run("open")).toBe(false);
    expect([t.reloads(), t.s.log.notes.length, t.s.log.confirms.length]).toEqual([0, 0, 0]);
    t.h.onOpen(Object.assign(new Error("Must be handling a user gesture"), { name: "SecurityError" }));
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.notes).toEqual(["Ouverture impossible : Must be handling a user gesture"]);
  });

  it("fermeture : gardée seulement si modifié, levée pendant le rechargement voulu", async () => {
    const t = setup();
    expect(t.s.log.guardMessage).toBe(DISCARD_MESSAGE);
    expect(t.s.guard()).toBe(false);
    stroke(t.doc, t.versions);
    expect(t.s.guard()).toBe(true);
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(true);
    expect(t.ctl.isDirty()).toBe(true);
    expect(t.s.guard()).toBe(false);
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

  it("nouveau refusé : rien n'est vidé ni rechargé, le document reste modifié", async () => {
    const t = setup({ answer: false });
    stroke(t.doc, t.versions);
    expect(await t.ctl.run("new")).toBe(false);
    expect([t.s.log.confirms, t.pending.cleared, t.reloads(), t.ctl.isDirty(), t.s.guard()]).toEqual([
      [DISCARD_MESSAGE],
      0,
      0,
      true,
      true,
    ]);
  });

  it("sérialisation impossible : message, l'hôte n'est pas appelé, reste modifié", async () => {
    const t = setup({
      docSave: () => {
        throw new Error("mémoire épuisée");
      },
    });
    stroke(t.doc, t.versions);
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.s.log.notes).toEqual(["Enregistrement impossible : mémoire épuisée"]);
    expect([t.h.calls.save.length, t.ctl.isDirty()]).toEqual([0, true]);
  });

  it("mise en attente impossible : message, aucun rechargement, la fermeture reste gardée", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    t.pending.put = async () => {
      throw new Error("quota dépassé");
    };
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.notes).toEqual(["Ouverture impossible (a.roomboard) : quota dépassé"]);
    expect([t.reloads(), t.s.guard()]).toEqual([0, true]);
    t.h.onOpen(null);
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.h.calls.open).toBe(2);
  });

  it("nouveau : l'attente qu'on ne peut vider n'empêche pas le rechargement", async () => {
    const t = setup();
    t.pending.clear = async () => {
      throw new Error("base fermée");
    };
    expect(await t.ctl.run("new")).toBe(true);
    expect([t.reloads(), t.s.log.notes]).toEqual([1, []]);
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

  it("nouveau : demande si modifié, vide l'attente, recharge ; document propre : sans question", async () => {
    const t = setup();
    expect(await t.ctl.run("new")).toBe(true);
    expect(t.s.log.confirms).toEqual([]);
    const u = setup();
    stroke(u.doc, u.versions);
    expect(await u.ctl.run("new")).toBe(true);
    expect([u.s.log.confirms, u.pending.cleared, u.reloads()]).toEqual([[DISCARD_MESSAGE], 1, 1]);
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

  it("dispose : désabonné de l'état et de la fermeture", () => {
    const t = setup();
    expect(t.versions.listeners()).toBe(1);
    t.ctl.dispose();
    expect([t.versions.listeners(), t.s.log.stopped]).toEqual([0, 1]);
  });
});
