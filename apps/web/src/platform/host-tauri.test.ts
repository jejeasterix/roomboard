import { describe, expect, it, vi } from "vitest";
import type { SaveTarget } from "./files";
import {
  baseName,
  createTauriHost,
  DROPPED_EVENT,
  grantedFile,
  launchFiles,
  onQuitRequested,
  QUIT_EVENT,
  quitApp,
  READ_CHUNK,
  type TauriIpc,
  createTauriShell,
  type CloseEventLike,
  type TauriDialog,
  type TauriFs,
  type TauriWindow,
} from "./host-tauri";

function fakes(o: { openPath?: string | null; savePath?: string | null; answer?: boolean; failWrite?: boolean } = {}) {
  const disk = new Map<string, Uint8Array>();
  const calls = {
    open: 0,
    save: [] as string[],
    ask: [] as Array<[string, string]>,
    message: [] as Array<[string, string]>,
    reads: [] as string[],
    writes: [] as string[],
    titles: [] as string[],
  };
  const dialog: TauriDialog = {
    async open(opt) {
      calls.open += 1;
      expect(opt.filters).toEqual([{ name: "Document RoomBoard", extensions: ["roomboard"] }]);
      return o.openPath === undefined ? "/home/j/cours.roomboard" : o.openPath;
    },
    async save(opt) {
      calls.save.push(opt.defaultPath);
      return o.savePath === undefined ? `/home/j/${opt.defaultPath}` : o.savePath;
    },
    async ask(m, opt) {
      calls.ask.push([m, opt.kind]);
      return o.answer ?? true;
    },
    async message(m, opt) {
      calls.message.push([m, opt.kind]);
    },
  };
  const fs: TauriFs = {
    async readFile(p) {
      calls.reads.push(p);
      const b = disk.get(p);
      if (!b) throw new Error(`absent : ${p}`);
      return b.slice();
    },
    async writeFile(p, d) {
      if (o.failWrite) throw new Error("forbidden path: /home/j/x.roomboard");
      calls.writes.push(p);
      disk.set(p, d.slice());
    },
  };
  let handler: ((e: CloseEventLike) => Promise<void>) | null = null;
  let unlistened = 0;
  const win: TauriWindow = {
    async onCloseRequested(h) {
      handler = h;
      return () => {
        unlistened += 1;
        handler = null;
      };
    },
    async setTitle(t) {
      calls.titles.push(t);
    },
  };
  const close = async (): Promise<boolean> => {
    let prevented = false;
    await handler?.({ preventDefault: () => { prevented = true; } });
    return prevented;
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  return { disk, calls, dialog, fs, win, close, tick, unlistened: () => unlistened };
}

const ask: SaveTarget = { kind: "ask", name: "Sans titre.roomboard" };
const bytes = new Uint8Array([0x50, 0x4b, 3, 4]);

describe("hôte Tauri (plugin-dialog, plugin-fs)", () => {
  it("aller-retour : enregistrer sous puis ouvrir rend les mêmes octets, cible tauri", async () => {
    const f = fakes({ openPath: "/home/j/Sans titre.roomboard" });
    const host = createTauriHost(f.dialog, f.fs);
    expect(host.kind).toBe("tauri");
    const saved = await host.save(bytes, ask);
    expect(saved).toEqual({ kind: "tauri", name: "Sans titre.roomboard", path: "/home/j/Sans titre.roomboard" });
    expect(f.calls.save).toEqual(["Sans titre.roomboard"]);
    const opened = await host.open();
    expect(Array.from(opened?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(opened?.target).toEqual(saved);
  });

  it("enregistrer sur une cible tauri réécrit le chemin sans boîte", async () => {
    const f = fakes();
    const host = createTauriHost(f.dialog, f.fs);
    const target: SaveTarget = { kind: "tauri", name: "cours.roomboard", path: "/home/j/cours.roomboard" };
    expect(await host.save(bytes, target)).toEqual(target);
    expect(f.calls.save).toEqual([]);
    expect(f.calls.writes).toEqual(["/home/j/cours.roomboard"]);
  });

  it("annulation de la boîte d'ouverture : null, aucune lecture", async () => {
    const f = fakes({ openPath: null });
    expect(await createTauriHost(f.dialog, f.fs).open()).toBeNull();
    expect(f.calls.reads).toEqual([]);
  });

  it("annulation de la boîte d'enregistrement : null, rien d'écrit", async () => {
    const f = fakes({ savePath: null });
    expect(await createTauriHost(f.dialog, f.fs).save(bytes, ask)).toBeNull();
    expect(f.calls.writes).toEqual([]);
  });

  it("erreur d'écriture : l'erreur de plugin-fs remonte", async () => {
    const f = fakes({ failWrite: true });
    await expect(createTauriHost(f.dialog, f.fs).save(bytes, ask)).rejects.toThrow("forbidden path");
  });

  it("fermeture, document modifié, réponse Non : la fenêtre reste ouverte", async () => {
    const f = fakes({ answer: false });
    createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(true);
    expect(f.calls.ask).toEqual([["Abandonner ?", "warning"]]);
  });

  it("fermeture, document modifié, réponse Oui : la fenêtre se ferme", async () => {
    const f = fakes({ answer: true });
    createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(false);
  });

  it("fermeture, document non modifié : aucune question", async () => {
    const f = fakes();
    createTauriShell(f.dialog, f.win).guardClose(() => false, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(false);
    expect(f.calls.ask).toEqual([]);
  });

  it("garde retirée avant la fin de l'abonnement : désabonnée dès qu'il arrive", async () => {
    const f = fakes();
    const stop = createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?");
    stop();
    await f.tick();
    expect(f.unlistened()).toBe(1);
  });

  it("question, message et titre passent par les boîtes et la fenêtre natives", async () => {
    const f = fakes({ answer: false });
    const shell = createTauriShell(f.dialog, f.win);
    expect(await shell.confirm("Abandonner ?")).toBe(false);
    await shell.notify("Ouverture impossible");
    shell.setTitle("• cours.roomboard — RoomBoard");
    await f.tick();
    expect(f.calls.ask).toEqual([["Abandonner ?", "warning"]]);
    expect(f.calls.message).toEqual([["Ouverture impossible", "error"]]);
    expect(f.calls.titles).toEqual(["• cours.roomboard — RoomBoard"]);
  });

  it("baseName : chemins Windows et Unix", () => {
    expect(baseName("C:\\Users\\j\\cours.roomboard")).toBe("cours.roomboard");
    expect(baseName("/home/j/a.roomboard")).toBe("a.roomboard");
    expect(baseName("seul.roomboard")).toBe("seul.roomboard");
  });

  it("T79 (révisé T81) : fermeture, ask en erreur : le repli sur la page décide, sans passer par message", async () => {
    const f = fakes();
    f.dialog.ask = async () => {
      throw new Error("boîte indisponible");
    };
    createTauriShell(f.dialog, f.win, () => false).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(true);
    expect(f.calls.message).toHaveLength(0);
  });

  it("T81 : ask et message rejettent tous deux : repli sur confirm de la page, vrai → la fenêtre se ferme", async () => {
    const f = fakes();
    f.dialog.ask = async () => { throw new Error("boîte indisponible"); };
    f.dialog.message = async () => { throw new Error("boîte indisponible"); };
    const asked: string[] = [];
    createTauriShell(f.dialog, f.win, (m) => { asked.push(m); return true; }).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(false);
    expect(asked).toEqual(["Abandonner ?"]);
  });

  it("T81 : ask et message rejettent, confirm de la page répond faux : la fenêtre reste ouverte", async () => {
    const f = fakes();
    f.dialog.ask = async () => { throw new Error("boîte indisponible"); };
    f.dialog.message = async () => { throw new Error("boîte indisponible"); };
    createTauriShell(f.dialog, f.win, () => false).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(true);
  });

  it("T81 : ask, message et confirm rejettent : la fenêtre reste ouverte, sans rejet non géré", async () => {
    const f = fakes();
    f.dialog.ask = async () => { throw new Error("boîte indisponible"); };
    f.dialog.message = async () => { throw new Error("boîte indisponible"); };
    createTauriShell(f.dialog, f.win, () => { throw new Error("confirm bloqué"); }).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(true);
  });
});

describe("coque : dépôt, lancement, sortie (T86)", () => {
  type Cb = (e: { payload: unknown }) => void;
  function ipcFake(sizes: Record<string, number>) {
    const listeners = new Map<string, Cb>();
    const reads: Array<{ path: string; offset: number; len: number }> = [];
    const ipc: TauriIpc = {
      async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
        if (cmd === "granted_file_size") return sizes[args!["path"] as string] as T;
        if (cmd === "read_granted_file") {
          const { path, offset, len } = args as { path: string; offset: number; len: number };
          reads.push({ path, offset, len });
          const n = Math.max(0, Math.min(len, sizes[path]! - offset));
          return new Uint8Array(n).buffer as T;
        }
        if (cmd === "launch_files") return ["/tmp/l1.roomboard", "/tmp/l2.roomboard"] as T;
        if (cmd === "quit_app") return undefined as T;
        throw new Error(cmd);
      },
      async listen(event, cb) {
        listeners.set(event, cb as Cb);
        return () => void listeners.delete(event);
      },
    };
    return { ipc, listeners, reads };
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const host = (ipc: TauriIpc | null, dpr = 1) => createTauriHost({} as never, {} as never, ipc, () => dpr);

  it("dépôt dans la coque : lecture par morceaux", async () => {
    const f = ipcFake({ "/tmp/a.roomboard": READ_CHUNK + 3 });
    const handler = vi.fn();
    const off = host(f.ipc, 2).onDrop(handler);
    await tick();
    f.listeners.get(DROPPED_EVENT)!({ payload: { paths: ["/tmp/a.roomboard"], position: { x: 200, y: 100 } } });
    await tick();
    const [files, at] = handler.mock.calls[0]!;
    expect(files[0].name).toBe("a.roomboard");
    expect(files[0].path).toBe("/tmp/a.roomboard");
    expect(files[0].size).toBe(READ_CHUNK + 3);
    expect(at).toEqual({ x: 100, y: 50 });
    const blob: Blob = await files[0].blob();
    expect(blob.size).toBe(READ_CHUNK + 3);
    expect(f.reads).toEqual([
      { path: "/tmp/a.roomboard", offset: 0, len: READ_CHUNK },
      { path: "/tmp/a.roomboard", offset: READ_CHUNK, len: READ_CHUNK },
    ]);
    off();
    await tick();
    expect(f.listeners.has(DROPPED_EVENT)).toBe(false);
  });

  it("fichier de exactement READ_CHUNK octets : troisième appel à 0 octet", async () => {
    const f = ipcFake({ "/tmp/b": READ_CHUNK });
    const blob = await grantedFile(f.ipc, "/tmp/b", READ_CHUNK).blob();
    expect(blob.size).toBe(READ_CHUNK);
    expect(f.reads.map((r) => r.offset)).toEqual([0, READ_CHUNK]);
  });

  it("position null : at null", async () => {
    const f = ipcFake({ "/tmp/a.roomboard": 1 });
    const handler = vi.fn();
    host(f.ipc).onDrop(handler);
    await tick();
    f.listeners.get(DROPPED_EVENT)!({ payload: { paths: ["/tmp/a.roomboard"], position: null } });
    await tick();
    expect(handler.mock.calls[0]![1]).toBeNull();
  });

  it("sans ipc : onDrop no-op", () => {
    expect(() => host(null).onDrop(vi.fn())()).not.toThrow();
  });

  it("launchFiles : un DroppedFile par chemin", async () => {
    const f = ipcFake({ "/tmp/l1.roomboard": 5, "/tmp/l2.roomboard": 6 });
    const files = await launchFiles(f.ipc);
    expect(files.map((x) => [x.name, x.size])).toEqual([["l1.roomboard", 5], ["l2.roomboard", 6]]);
  });

  it("onQuitRequested écoute QUIT_EVENT ; quitApp invoque quit_app", async () => {
    const f = ipcFake({});
    const cb = vi.fn();
    await onQuitRequested(f.ipc, cb);
    f.listeners.get(QUIT_EVENT)!({ payload: null });
    expect(cb).toHaveBeenCalledTimes(1);
    await expect(quitApp(f.ipc)).resolves.toBeUndefined();
  });
});
