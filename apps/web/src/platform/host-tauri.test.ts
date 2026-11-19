import { describe, expect, it } from "vitest";
import type { SaveTarget } from "./files";
import {
  baseName,
  createTauriHost,
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
