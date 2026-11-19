import { describe, expect, it } from "vitest";
import type { FileHandleLike, PermissionLike, SaveTarget, WritableLike } from "./files";
import { createFsaHost, FSA_TYPES, type FsaWindow } from "./host-fsa";

interface Disk { files: Map<string, Uint8Array>; writes: string[]; aborted: number; requests: number }
const newDisk = (): Disk => ({ files: new Map(), writes: [], aborted: 0, requests: 0 });

function handle(disk: Disk, name: string, o: { permission?: PermissionLike; request?: PermissionLike; failQuery?: boolean; failWrite?: boolean } = {}): FileHandleLike {
  return {
    kind: "file",
    name,
    async getFile() {
      const b = disk.files.get(name) ?? new Uint8Array();
      return { arrayBuffer: async () => b.slice().buffer };
    },
    async createWritable(): Promise<WritableLike> {
      let data = new Uint8Array();
      return {
        async write(d) {
          if (o.failWrite) throw new Error("disque plein");
          data = d.slice();
        },
        async close() {
          disk.files.set(name, data);
          disk.writes.push(name);
        },
        async abort() {
          disk.aborted += 1;
        },
      };
    },
    async queryPermission() {
      if (o.failQuery) throw new Error("poignée périmée");
      return o.permission ?? "granted";
    },
    async requestPermission() {
      disk.requests += 1;
      return o.request ?? o.permission ?? "granted";
    },
  };
}

interface Calls { save: Array<{ suggestedName: string; types: unknown }>; open: number }

function fsaWindow(disk: Disk, o: { saveAs?: string | Error; openName?: string | Error } = {}): FsaWindow & { calls: Calls } {
  const calls: Calls = { save: [], open: 0 };
  return {
    calls,
    async showSaveFilePicker(opts) {
      calls.save.push({ suggestedName: opts.suggestedName, types: opts.types });
      if (o.saveAs instanceof Error) throw o.saveAs;
      return handle(disk, o.saveAs ?? opts.suggestedName);
    },
    async showOpenFilePicker() {
      calls.open += 1;
      if (o.openName instanceof Error) throw o.openName;
      return [handle(disk, o.openName ?? "cours.roomboard")];
    },
  };
}

const abortError = (): Error => Object.assign(new Error("annulé"), { name: "AbortError" });
const ask: SaveTarget = { kind: "ask", name: "Sans titre.roomboard" };
const bytes = new Uint8Array([0x50, 0x4b, 3, 4, 9, 9]);

describe("hôte Chromium (File System Access)", () => {
  it("aller-retour : enregistrer puis ouvrir rend les mêmes octets, cible fsa", async () => {
    const disk = newDisk();
    const host = createFsaHost(fsaWindow(disk, { saveAs: "cours.roomboard", openName: "cours.roomboard" }));
    expect(host.kind).toBe("fsa");
    const saved = await host.save(bytes, ask);
    expect(saved?.kind).toBe("fsa");
    expect(saved?.name).toBe("cours.roomboard");
    const opened = await host.open();
    expect(opened?.name).toBe("cours.roomboard");
    expect(Array.from(opened?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(opened?.target.kind).toBe("fsa");
  });

  it("Ctrl+S sur une cible fsa réécrit la même poignée sans boîte", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk);
    const host = createFsaHost(w);
    const first = await host.save(bytes, ask);
    if (first === null) throw new Error("premier enregistrement annulé");
    const again = await host.save(new Uint8Array([1, 2]), first);
    expect(w.calls.save).toHaveLength(1);
    expect(disk.writes).toEqual(["Sans titre.roomboard", "Sans titre.roomboard"]);
    expect(Array.from(disk.files.get("Sans titre.roomboard") ?? [])).toEqual([1, 2]);
    expect(again).toEqual(first);
  });

  it("annulation de la boîte d'enregistrement (AbortError) : null, rien d'écrit", async () => {
    const disk = newDisk();
    const host = createFsaHost(fsaWindow(disk, { saveAs: abortError() }));
    expect(await host.save(bytes, ask)).toBeNull();
    expect(disk.writes).toEqual([]);
  });

  it("annulation de la boîte d'ouverture : null", async () => {
    const host = createFsaHost(fsaWindow(newDisk(), { openName: abortError() }));
    expect(await host.open()).toBeNull();
  });

  it("erreur d'écriture : abort puis l'erreur remonte, rien d'écrit", async () => {
    const disk = newDisk();
    const failing = handle(disk, "plein.roomboard", { failWrite: true });
    const host = createFsaHost(fsaWindow(disk));
    await expect(host.save(bytes, { kind: "fsa", name: "plein.roomboard", handle: failing })).rejects.toThrow("disque plein");
    expect(disk.aborted).toBe(1);
    expect(disk.writes).toEqual([]);
  });

  it("permission refusée sur la poignée gardée : la boîte d'enregistrement s'ouvre", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk, { saveAs: "nouveau.roomboard" });
    const host = createFsaHost(w);
    const kept = handle(disk, "ancien.roomboard", { permission: "denied" });
    const r = await host.save(bytes, { kind: "fsa", name: "ancien.roomboard", handle: kept });
    expect(w.calls.save).toHaveLength(1);
    expect(r?.name).toBe("nouveau.roomboard");
    expect(disk.files.has("ancien.roomboard")).toBe(false);
  });

  it("autre erreur de la boîte (SecurityError) : remonte", async () => {
    const err = Object.assign(new Error("geste requis"), { name: "SecurityError" });
    const host = createFsaHost(fsaWindow(newDisk(), { saveAs: err, openName: err }));
    await expect(host.save(bytes, ask)).rejects.toThrow("geste requis");
    await expect(host.open()).rejects.toThrow("geste requis");
  });

  it("nom proposé : extension .roomboard ajoutée, types application/x-roomboard ; cible d'un autre hôte → boîte", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk);
    const host = createFsaHost(w);
    await host.save(bytes, { kind: "ask", name: "cours" });
    await host.save(bytes, { kind: "download", name: "cours.roomboard" });
    expect(w.calls.save.map((c) => c.suggestedName)).toEqual(["cours.roomboard", "cours.roomboard"]);
    expect(w.calls.save[0]?.types).toEqual(FSA_TYPES);
    expect(FSA_TYPES).toEqual([{ description: "Document RoomBoard", accept: { "application/x-roomboard": [".roomboard"] } }]);
  });

  it("T79 : permission « prompt » puis « granted » : requestPermission est appelée, la poignée est réécrite sans boîte", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk);
    const h = handle(disk, "cours.roomboard", { permission: "prompt", request: "granted" });
    const saved = await createFsaHost(w).save(bytes, { kind: "fsa", name: "cours.roomboard", handle: h });
    expect(saved?.kind === "fsa" && saved.handle === h).toBe(true);
    expect([disk.requests, w.calls.save.length, disk.writes]).toEqual([1, 0, ["cours.roomboard"]]);
  });

  it("T79 : permission « prompt » puis « denied » : la boîte d'enregistrement s'ouvre, la poignée n'est pas écrite", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk, { saveAs: "autre.roomboard" });
    const h = handle(disk, "cours.roomboard", { permission: "prompt", request: "denied" });
    const saved = await createFsaHost(w).save(bytes, { kind: "fsa", name: "cours.roomboard", handle: h });
    expect([disk.requests, w.calls.save.length, saved?.name]).toEqual([1, 1, "autre.roomboard"]);
    expect(disk.writes).toEqual(["autre.roomboard"]);
  });

  it("T79 : queryPermission qui lève (poignée périmée) : la boîte d'enregistrement s'ouvre", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk, { saveAs: "autre.roomboard" });
    const h = handle(disk, "cours.roomboard", { failQuery: true });
    const saved = await createFsaHost(w).save(bytes, { kind: "fsa", name: "cours.roomboard", handle: h });
    expect([disk.requests, w.calls.save.length, saved?.name]).toEqual([0, 1, "autre.roomboard"]);
  });
});
