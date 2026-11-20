import { describe, expect, it } from "vitest";
import type { SaveTarget } from "./files";
import { browserFallbackDeps, createFallbackHost, FALLBACK_ACCEPT, IMPORT_ACCEPT, type FallbackDeps, type PickedFile } from "./host-repli";

function memoryDeps(o: { pick?: PickedFile | null | "saved"; picks?: File[]; failDownload?: boolean } = {}) {
  const downloads: Array<{ name: string; bytes: Uint8Array; mime: string }> = [];
  const accepts: string[] = [];
  const deps: FallbackDeps = {
    async pickFile(accept) {
      accepts.push(accept);
      if (o.pick === "saved") {
        const last = downloads[downloads.length - 1];
        return last ? { name: last.name, bytes: last.bytes } : null;
      }
      return o.pick ?? null;
    },
    async pickFiles(accept) {
      accepts.push(accept);
      return o.picks ?? [];
    },
    download(name, bytes, mime) {
      if (o.failDownload) throw new Error("téléchargement bloqué");
      downloads.push({ name, bytes: bytes.slice(), mime });
    },
  };
  return { deps, downloads, accepts };
}

interface FakeEl {
  tag: string;
  type: string;
  accept: string;
  multiple: boolean;
  href: string;
  download: string;
  style: { display: string };
  files: Array<{ name: string; arrayBuffer(): Promise<ArrayBuffer> }> | null;
  listeners: Map<string, () => void>;
  clicked: number;
  removed: boolean;
  addEventListener(t: string, cb: () => void): void;
  click(): void;
  remove(): void;
}

function fakeDocument(o: { clickThrows?: boolean } = {}) {
  const appended: FakeEl[] = [];
  const win = { listeners: new Map<string, () => void>() };
  const doc = {
    createElement(tag: string): FakeEl {
      const el: FakeEl = {
        tag, type: "", accept: "", multiple: false, href: "", download: "", style: { display: "" }, files: null,
        listeners: new Map(), clicked: 0, removed: false,
        addEventListener(t, cb) { el.listeners.set(t, cb); },
        click() { el.clicked += 1; if (o.clickThrows && tag === "input") throw new Error("click refusé"); },
        remove() { el.removed = true; },
      };
      return el;
    },
    body: { append(el: FakeEl) { appended.push(el); } },
    defaultView: {
      addEventListener(t: string, cb: () => void) { win.listeners.set(t, cb); },
      removeEventListener(t: string, cb: () => void) { if (win.listeners.get(t) === cb) win.listeners.delete(t); },
    },
  };
  return { doc: doc as unknown as Document, appended, win };
}

const ask: SaveTarget = { kind: "ask", name: "Sans titre.roomboard" };
const bytes = new Uint8Array([0x50, 0x4b, 3, 4]);
const urls = { createObjectURL: () => "blob:1", revokeObjectURL: () => undefined };

describe("hôte de repli (téléchargement et <input type=file>)", () => {
  it("aller-retour : le téléchargement puis le sélecteur rendent les mêmes octets", async () => {
    const m = memoryDeps({ pick: "saved" });
    const host = createFallbackHost(m.deps);
    expect(host.kind).toBe("repli");
    expect(await host.save(async () => bytes, ask)).toEqual({ kind: "download", name: "Sans titre.roomboard" });
    const opened = await host.open();
    expect(Array.from(opened?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(opened?.target).toEqual({ kind: "download", name: "Sans titre.roomboard" });
    expect(m.accepts).toEqual([FALLBACK_ACCEPT]);
    expect(FALLBACK_ACCEPT).toBe(".roomboard,application/x-roomboard");
  });

  it("annulation du sélecteur : null", async () => {
    expect(await createFallbackHost(memoryDeps({ pick: null }).deps).open()).toBeNull();
  });

  it("erreur d'écriture : l'échec du téléchargement remonte", async () => {
    await expect(createFallbackHost(memoryDeps({ failDownload: true }).deps).save(async () => bytes, ask)).rejects.toThrow("téléchargement bloqué");
  });

  it("nom : extension ajoutée, type application/x-roomboard ; Ctrl+S sur une cible download retélécharge le même nom", async () => {
    const m = memoryDeps();
    const host = createFallbackHost(m.deps);
    const first = await host.save(async () => bytes, { kind: "ask", name: "cours" });
    if (first === null) throw new Error("annulé");
    await host.save(async () => bytes, first);
    expect(m.downloads.map((d) => [d.name, d.mime])).toEqual([
      ["cours.roomboard", "application/x-roomboard"],
      ["cours.roomboard", "application/x-roomboard"],
    ]);
  });

  it("navigateur : input file caché, accept posé, retiré après le choix ; octets lus", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFile(FALLBACK_ACCEPT);
    const input = appended[0];
    if (!input) throw new Error("aucun input ajouté");
    expect([input.tag, input.type, input.accept, input.style.display, input.clicked]).toEqual(["input", "file", FALLBACK_ACCEPT, "none", 1]);
    input.files = [{ name: "cours.roomboard", arrayBuffer: async () => new Uint8Array([7, 8]).buffer }];
    input.listeners.get("change")?.();
    const r = await picked;
    expect(r?.name).toBe("cours.roomboard");
    expect(Array.from(r?.bytes ?? [])).toEqual([7, 8]);
    expect(input.removed).toBe(true);
  });

  it("navigateur : événement cancel → null, input retiré", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFile(FALLBACK_ACCEPT);
    appended[0]?.listeners.get("cancel")?.();
    expect(await picked).toBeNull();
    expect(appended[0]?.removed).toBe(true);
  });

  it("navigateur : lien de téléchargement cliqué puis retiré, URL révoquée ensuite", () => {
    const { doc, appended } = fakeDocument();
    const blobs: Blob[] = [];
    const revoked: string[] = [];
    const later: Array<() => void> = [];
    const deps = browserFallbackDeps(
      doc,
      { createObjectURL: (b) => { blobs.push(b); return "blob:x"; }, revokeObjectURL: (u) => { revoked.push(u); } },
      (cb) => { later.push(cb); },
    );
    deps.download("cours.roomboard", new Uint8Array([1, 2, 3]), "application/x-roomboard");
    const a = appended[0];
    expect([a?.tag, a?.href, a?.download, a?.clicked, a?.removed]).toEqual(["a", "blob:x", "cours.roomboard", 1, true]);
    expect(revoked).toEqual([]);
    for (const cb of later) cb();
    expect(revoked).toEqual(["blob:x"]);
    expect([blobs[0]?.type, blobs[0]?.size]).toEqual(["application/x-roomboard", 3]);
  });

  function fakeSchedule() {
    const jobs: Array<{ cb: () => void; ms: number; cancelled: boolean }> = [];
    const schedule = (cb: () => void, ms: number): (() => void) => {
      const j = { cb, ms, cancelled: false };
      jobs.push(j);
      return () => { j.cancelled = true; };
    };
    const run = (): void => { for (const j of jobs) if (!j.cancelled) j.cb(); };
    return { schedule, jobs, run };
  }
  const later = (): void => undefined;

  it("T79 : navigateur sans cancel : retour du focus sans change → annulation après le délai, input retiré, écouteurs retirés", async () => {
    const { doc, appended, win } = fakeDocument();
    const t = fakeSchedule();
    const picked = browserFallbackDeps(doc, urls, later, t.schedule).pickFile(FALLBACK_ACCEPT);
    expect(appended[0]?.removed).toBe(false);
    win.listeners.get("focus")?.();
    expect(t.jobs).toHaveLength(1);
    expect(t.jobs[0]?.ms).toBeGreaterThan(0);
    t.run();
    expect(await picked).toBeNull();
    expect(appended[0]?.removed).toBe(true);
    expect(win.listeners.size).toBe(0);
  });

  it("T79 : focus puis change dans le délai : le fichier est rendu, le minuteur annulé", async () => {
    const { doc, appended, win } = fakeDocument();
    const t = fakeSchedule();
    const picked = browserFallbackDeps(doc, urls, later, t.schedule).pickFile(FALLBACK_ACCEPT);
    win.listeners.get("focus")?.();
    const input = appended[0];
    if (!input) throw new Error("aucun input");
    input.files = [{ name: "cours.roomboard", arrayBuffer: async () => new Uint8Array([7]).buffer }];
    input.listeners.get("change")?.();
    t.run();
    expect((await picked)?.name).toBe("cours.roomboard");
    expect(win.listeners.size).toBe(0);
    expect(t.jobs.every((j) => j.cancelled)).toBe(true);
  });

  it("T79 : click() refusé : le sélecteur rejette, l'input est retiré, aucun écouteur ne reste", async () => {
    const { doc, appended, win } = fakeDocument({ clickThrows: true });
    const t = fakeSchedule();
    await expect(browserFallbackDeps(doc, urls, later, t.schedule).pickFile(FALLBACK_ACCEPT)).rejects.toThrow("click refusé");
    expect(appended[0]?.removed).toBe(true);
    expect(win.listeners.size).toBe(0);
  });

  it("T79 : cancel après un focus : réglé une seule fois, le minuteur annulé", async () => {
    const { doc, appended, win } = fakeDocument();
    const t = fakeSchedule();
    const picked = browserFallbackDeps(doc, urls, later, t.schedule).pickFile(FALLBACK_ACCEPT);
    win.listeners.get("focus")?.();
    appended[0]?.listeners.get("cancel")?.();
    expect(await picked).toBeNull();
    expect(t.jobs.every((j) => j.cancelled)).toBe(true);
    expect(win.listeners.size).toBe(0);
  });

  it("T81 : pointerdown sans change : annulation après le délai, input retiré, écouteurs retirés", async () => {
    const { doc, appended, win } = fakeDocument();
    const t = fakeSchedule();
    const picked = browserFallbackDeps(doc, urls, later, t.schedule).pickFile(FALLBACK_ACCEPT);
    win.listeners.get("pointerdown")?.();
    expect(t.jobs).toHaveLength(1);
    t.run();
    expect(await picked).toBeNull();
    expect(appended[0]?.removed).toBe(true);
    expect(win.listeners.size).toBe(0);
  });
});

describe("hôte de repli : onDrop (T86)", () => {
  it("branché sur la cible passée ; désabonnement rendu", () => {
    const added: string[] = [];
    const removed: string[] = [];
    const target = {
      addEventListener: (t: string) => void added.push(t),
      removeEventListener: (t: string) => void removed.push(t),
    };
    const off = createFallbackHost(memoryDeps().deps, target).onDrop(() => undefined);
    expect(added.sort()).toEqual(["dragover", "drop"]);
    off();
    expect(removed.sort()).toEqual(["dragover", "drop"]);
  });
  it("sans cible : no-op", () => {
    expect(() => createFallbackHost(memoryDeps().deps).onDrop(() => undefined)()).not.toThrow();
  });
  it("pick : fichiers choisis rendus en DroppedFile, accept d'import (R18)", async () => {
    const m = memoryDeps({ picks: [new File([new Uint8Array([1])], "a.png", { type: "image/png" })] });
    const files = await createFallbackHost(m.deps).pick();
    expect(m.accepts).toEqual([IMPORT_ACCEPT]);
    expect(files.map((f) => [f.name, f.size, f.mime])).toEqual([["a.png", 1, "image/png"]]);
  });

  it("navigateur : pickFiles pose input multiple et rend tous les fichiers", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFiles(IMPORT_ACCEPT);
    const input = appended[0];
    if (!input) throw new Error("aucun input ajouté");
    expect([input.type, input.accept, input.multiple]).toEqual(["file", IMPORT_ACCEPT, true]);
    input.files = [{ name: "a.png", arrayBuffer: async () => new ArrayBuffer(1) }, { name: "b.png", arrayBuffer: async () => new ArrayBuffer(1) }];
    input.listeners.get("change")?.();
    expect((await picked).map((f) => f.name)).toEqual(["a.png", "b.png"]);
    expect(input.removed).toBe(true);
  });

  it("navigateur : pickFiles annulé → []", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFiles(IMPORT_ACCEPT);
    appended[0]?.listeners.get("cancel")?.();
    expect(await picked).toEqual([]);
  });
});

describe("hôte de repli : save passe la cible choisie (C14)", () => {
  it("encode reçoit la cible choisie", async () => {
    const host = createFallbackHost(memoryDeps().deps);
    const encode = vi.fn(async (_t: SaveTarget) => bytes);
    const saved = await host.save(encode, { kind: "ask", name: "cours" });
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode.mock.calls[0]![0]).toEqual({ kind: "download", name: "cours.roomboard" });
    expect(saved).toEqual({ kind: "download", name: "cours.roomboard" });
  });

  it("IMPORT_ACCEPT suit IMPORT_EXTENSIONS : vidéos et sons compris", () => {
    expect(IMPORT_ACCEPT).toContain(".webm");
    expect(IMPORT_ACCEPT).toContain(".mp3");
  });
});
