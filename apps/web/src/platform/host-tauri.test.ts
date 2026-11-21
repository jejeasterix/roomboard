import { describe, expect, it, vi } from "vitest";
import { IMPORT_FILTER, type SaveTarget } from "./files";
import {
  baseName,
  convertOffice,
  createTauriHost,
  DROPPED_EVENT,
  grantedFile,
  NAME_HEADER,
  officeConverter,
  onOriginalChanged,
  openOriginal,
  ORIGINAL_CHANGED_EVENT,
  reimportOriginal,
  linkMedia,
  relinkMedia,
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
import { OfficeConvertError } from "./office-import";

function fakes(o: { openPath?: string | null; savePath?: string | null; pickPaths?: string[]; answer?: boolean; failWrite?: boolean } = {}) {
  const disk = new Map<string, Uint8Array>();
  const calls = {
    open: 0,
    openMany: [] as unknown[],
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
    async openMany(opt) {
      calls.openMany.push(opt.filters);
      return o.pickPaths ?? [];
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
    const saved = await host.save(async () => bytes, ask);
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
    expect(await host.save(async () => bytes, target)).toEqual(target);
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
    expect(await createTauriHost(f.dialog, f.fs).save(async () => bytes, ask)).toBeNull();
    expect(f.calls.writes).toEqual([]);
  });

  it("erreur d'écriture : l'erreur de plugin-fs remonte", async () => {
    const f = fakes({ failWrite: true });
    await expect(createTauriHost(f.dialog, f.fs).save(async () => bytes, ask)).rejects.toThrow("forbidden path");
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
  it("pick : boîte multiple au filtre d'import, fichiers lus par plugin-fs (R18)", async () => {
    const f = fakes({ pickPaths: ["/home/j/a.png", "/home/j/b.roomboard"] });
    f.disk.set("/home/j/a.png", new Uint8Array([1, 2]));
    f.disk.set("/home/j/b.roomboard", new Uint8Array([3]));
    const files = await createTauriHost(f.dialog, f.fs).pick();
    expect(f.calls.openMany).toEqual([[IMPORT_FILTER]]);
    expect(files.map((x) => [x.name, x.size, x.path])).toEqual([["a.png", 2, "/home/j/a.png"], ["b.roomboard", 1, "/home/j/b.roomboard"]]);
    expect(Array.from(new Uint8Array(await (await files[0]!.blob()).arrayBuffer()))).toEqual([1, 2]);
  });

  it("pick annulé : [], aucune lecture", async () => {
    const f = fakes();
    expect(await createTauriHost(f.dialog, f.fs).pick()).toEqual([]);
    expect(f.calls.reads).toEqual([]);
  });

  it("boîte d'enregistrement annulée : encode jamais appelé (R11)", async () => {
    const f = fakes({ savePath: null });
    const encode = vi.fn(async () => bytes);
    expect(await createTauriHost(f.dialog, f.fs).save(encode, ask)).toBeNull();
    expect(encode).not.toHaveBeenCalled();
  });

  it("enregistrer : la boîte d'abord, puis encode, puis l'écriture", async () => {
    const f = fakes();
    const order: string[] = [];
    const dialog = { ...f.dialog, save: async (o: { defaultPath: string; filters: readonly unknown[] }) => (order.push("boîte"), `/home/j/${o.defaultPath}`) };
    const fs = { ...f.fs, writeFile: async (p: string, d: Uint8Array) => (order.push("écriture"), f.fs.writeFile(p, d)) };
    await createTauriHost(dialog as typeof f.dialog, fs).save(async () => (order.push("encode"), bytes), ask);
    expect(order).toEqual(["boîte", "encode", "écriture"]);
  });
});

describe("hôte Tauri : liens et cible (C14)", () => {
  it("encode reçoit la cible choisie", async () => {
    const f = fakes();
    const encode = vi.fn(async (_t: SaveTarget) => bytes);
    const saved = await createTauriHost(f.dialog, f.fs).save(encode, ask);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode.mock.calls[0]![0]).toEqual({ kind: "tauri", name: "Sans titre.roomboard", path: "/home/j/Sans titre.roomboard" });
    expect(saved).toEqual(encode.mock.calls[0]![0]);
  });

  it("linkMedia et relinkMedia appellent link_media et relink_media", async () => {
    const invoke = vi.fn(async (cmd: string) => (cmd === "link_media" ? "a".repeat(64) : true));
    const ipc = { invoke, listen: async () => () => undefined } as unknown as TauriIpc;
    expect(await linkMedia(ipc, "/v/clip.mp4")).toBe("a".repeat(64));
    expect(await relinkMedia(ipc, "/v/clip.mp4", 12)).toBe(true);
    expect(invoke.mock.calls).toEqual([
      ["link_media", { path: "/v/clip.mp4" }],
      ["relink_media", { path: "/v/clip.mp4", size: 12 }],
    ]);
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

  it("head(4096) : un seul read_granted_file, offset 0, len 4096 (S5, OD56)", async () => {
    const f = ipcFake({ "/tmp/notes.xyz": 50 * 1024 * 1024 });
    const h = await grantedFile(f.ipc, "/tmp/notes.xyz", 50 * 1024 * 1024).head(4096);
    expect(h.byteLength).toBe(4096);
    expect(f.reads).toEqual([{ path: "/tmp/notes.xyz", offset: 0, len: 4096 }]);
  });

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

describe("hôte Tauri : écoute du dépôt prête (T98, écart T87)", () => {
  function manualIpc() {
    let resolveListen!: (un: () => void) => void;
    const calls: string[] = [];
    const ipc: TauriIpc = {
      async invoke<T>(): Promise<T> {
        throw new Error("non attendu");
      },
      listen<T>(event: string, _cb: (e: { readonly payload: T }) => void): Promise<() => void> {
        calls.push(event);
        return new Promise((r) => {
          resolveListen = r;
        });
      },
    };
    return { ipc, calls, resolve: () => resolveListen(() => undefined) };
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it("dropListening se résout après ipc.listen", async () => {
    const m = manualIpc();
    const host = createTauriHost({} as never, {} as never, m.ipc);
    host.onDrop(vi.fn());
    expect(m.calls).toEqual([DROPPED_EVENT]);
    let ready = false;
    void host.dropListening().then(() => {
      ready = true;
    });
    await tick();
    expect(ready).toBe(false);
    m.resolve();
    await tick();
    expect(ready).toBe(true);
  });

  it("ipc null : dropListening résolu", async () => {
    const host = createTauriHost({} as never, {} as never, null);
    host.onDrop(vi.fn());
    await expect(host.dropListening()).resolves.toBeUndefined();
  });

  it("sans onDrop : dropListening résolu (rien à attendre)", async () => {
    const m = manualIpc();
    await expect(createTauriHost({} as never, {} as never, m.ipc).dropListening()).resolves.toBeUndefined();
  });
});

describe("coque : Office (C16)", () => {
  type Call = { readonly cmd: string; readonly args: unknown; readonly options: unknown };
  function officeIpc(o: { convert?: () => Promise<unknown>; size?: number; failRead?: boolean; converter?: () => Promise<boolean> } = {}) {
    const calls: Call[] = [];
    const listeners = new Map<string, (e: { payload: unknown }) => void>();
    const size = o.size ?? 5;
    const ipc: TauriIpc = {
      async invoke<T>(cmd: string, args?: Record<string, unknown> | Uint8Array, options?: { readonly headers: Readonly<Record<string, string>> }): Promise<T> {
        calls.push({ cmd, args, options });
        if (cmd === "convert_office") return (await (o.convert ?? (async () => ({ id: "7-0", pdf: "/cache/conversions/7-0/source.pdf", size })))()) as T;
        if (cmd === "read_granted_file") {
          if (o.failRead === true) throw new Error("disque");
          const { offset, len } = args as { offset: number; len: number };
          return new Uint8Array(Math.max(0, Math.min(len, size - offset))).fill(0x25).buffer as T;
        }
        if (cmd === "office_converter") return (await (o.converter ?? (async () => true))()) as T;
        if (cmd === "open_original") return "3-0" as T;
        if (cmd === "release_conversion" || cmd === "reimport_original") return undefined as T;
        throw new Error(cmd);
      },
      async listen(event, cb) {
        listeners.set(event, cb as (e: { payload: unknown }) => void);
        return () => void listeners.delete(event);
      },
    };
    return { ipc, calls, listeners };
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it("convertOffice : convert_office(path), PDF lu par morceaux, release_conversion(id) à la fin (O35)", async () => {
    const f = officeIpc({ size: READ_CHUNK + 2 });
    const blob = await convertOffice(f.ipc, "/home/u/cours.docx");
    expect(blob.size).toBe(READ_CHUNK + 2);
    expect(f.calls.map((c) => c.cmd)).toEqual(["convert_office", "read_granted_file", "read_granted_file", "release_conversion"]);
    expect(f.calls[0]!.args).toEqual({ path: "/home/u/cours.docx" });
    expect(f.calls[1]!.args).toEqual({ path: "/cache/conversions/7-0/source.pdf", offset: 0, len: READ_CHUNK });
    expect(f.calls.at(-1)!.args).toEqual({ id: "7-0" });
  });

  it("lecture du PDF en échec : release_conversion appelé quand même, l'erreur remonte (Review Focus 3)", async () => {
    const f = officeIpc({ failRead: true });
    await expect(convertOffice(f.ipc, "/home/u/cours.docx")).rejects.toThrow("disque");
    expect(f.calls.map((c) => c.cmd)).toEqual(["convert_office", "read_granted_file", "release_conversion"]);
  });

  it("rejet de la coque (chaîne) : OfficeConvertError au même code, ni lecture ni libération (O14)", async () => {
    const f = officeIpc({ convert: () => Promise.reject("timeout") });
    const e = await convertOffice(f.ipc, "/x/cours.docx").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(OfficeConvertError);
    expect((e as OfficeConvertError).code).toBe("timeout");
    expect(f.calls.map((c) => c.cmd)).toEqual(["convert_office"]);
  });

  it("openOriginal : corps brut (Uint8Array), nom dans l'en-tête encodé en pourcentage, jamais en JSON (O20)", async () => {
    const f = officeIpc();
    await openOriginal(f.ipc, "Leçon 3.pptx", new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]));
    const c = f.calls[0]!;
    expect(c.cmd).toBe("open_original");
    expect(c.args).toBeInstanceOf(Uint8Array);
    expect(Array.from(c.args as Uint8Array)).toEqual([0x50, 0x4b, 3, 4]);
    expect(c.options).toEqual({ headers: { [NAME_HEADER]: "Le%C3%A7on%203.pptx" } });
  });

  it("reimportOriginal : l'id seul ; onOriginalChanged : rappel puis désabonnement ; officeConverter : vrai, faux si l'appel échoue (O22, O24)", async () => {
    const f = officeIpc();
    await reimportOriginal(f.ipc, "3-0");
    expect(f.calls.at(-1)).toEqual({ cmd: "reimport_original", args: { id: "3-0" }, options: undefined });
    const seen: Array<{ id: string; name: string }> = [];
    const stop = onOriginalChanged(f.ipc, (e) => void seen.push({ id: e.id, name: e.name }));
    await tick();
    f.listeners.get(ORIGINAL_CHANGED_EVENT)!({ payload: { id: "3-0", path: "/cache/originaux/3-0/cours.docx", name: "cours.docx" } });
    expect(seen).toEqual([{ id: "3-0", name: "cours.docx" }]);
    stop();
    await tick();
    expect(f.listeners.has(ORIGINAL_CHANGED_EVENT)).toBe(false);
    expect(await officeConverter(f.ipc)).toBe(true);
    expect(await officeConverter(officeIpc({ converter: () => Promise.reject(new Error("absente")) }).ipc)).toBe(false);
  });
});
