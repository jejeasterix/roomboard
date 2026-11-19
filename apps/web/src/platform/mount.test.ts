import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../core/api";
import { fakeCore } from "../core/fake-core";
import type { PendingOpen, PendingStore } from "./files";
import { prepareFiles, startDocument } from "./mount";

function store(value: PendingOpen | null, failTake = false): PendingStore & { taken: number } {
  const s = {
    taken: 0,
    async put(): Promise<void> {},
    async take(): Promise<PendingOpen | null> {
      s.taken += 1;
      if (failTake) throw new Error("IndexedDB bloquée");
      return value;
    },
    async clear() {},
  };
  return s;
}

function savedWithStroke(): Uint8Array {
  const d: CoreDocument = fakeCore.blank();
  const page = d.pageIds()[0] ?? "";
  d.apply({ type: "CommitStroke", page, points: new Float32Array([0, 0, 0.5, 10, 10, 0.5]), style: { color: "#000000", width: 4 } });
  return d.save("2026-11-19T00:00:00.000Z", "0.1.0");
}

describe("amorce des fichiers", () => {
  it("sans fichier en attente : page vide, aucune erreur", async () => {
    const r = await startDocument(fakeCore, store(null));
    expect(r.doc.pageIds()).toHaveLength(1);
    expect(r.doc.elementIds(r.doc.pageIds()[0] ?? "")).toEqual([]);
    expect([r.opened, r.error]).toEqual([null, null]);
  });

  it("fichier en attente : document chargé, nom et cible repris, attente consommée", async () => {
    const pending: PendingOpen = { name: "cours.roomboard", bytes: savedWithStroke(), target: { kind: "download", name: "cours.roomboard" } };
    const s = store(pending);
    const r = await startDocument(fakeCore, s);
    expect(r.doc.elementIds(r.doc.pageIds()[0] ?? "")).toHaveLength(1);
    expect(r.opened).toEqual(pending);
    expect([r.error, s.taken]).toEqual([null, 1]);
  });

  it("fichier en attente illisible : page vide et message qui nomme le fichier", async () => {
    const bad: PendingOpen = { name: "faux.roomboard", bytes: new TextEncoder().encode("pas un document"), target: null };
    const r = await startDocument(fakeCore, store(bad));
    expect(r.doc.elementIds(r.doc.pageIds()[0] ?? "")).toEqual([]);
    expect(r.opened).toBeNull();
    expect(r.error).toBe("Ouverture impossible (faux.roomboard) : ce fichier n'est pas un document RoomBoard");
  });

  it("attente inaccessible (IndexedDB refusée) : page vide, sans message (aucun geste de l'utilisateur)", async () => {
    const r = await startDocument(fakeCore, store(null, true));
    expect(r.doc.pageIds()).toHaveLength(1);
    expect([r.opened, r.error]).toEqual([null, null]);
  });
});

describe("raccourcis de fichier de l'amorce", () => {
  it("touche tenue : preventDefault à chaque répétition, commande lancée une seule fois", async () => {
    const listeners: Record<string, Array<(e: unknown) => void>> = {};
    let pickers = 0;
    const w = {
      indexedDB: undefined,
      location: { search: "", reload: () => undefined },
      document: { title: "" },
      confirm: () => true,
      alert: () => undefined,
      addEventListener: (t: string, cb: (e: unknown) => void) => {
        (listeners[t] ??= []).push(cb);
      },
      removeEventListener: () => undefined,
      showOpenFilePicker: async () => [],
      showSaveFilePicker: async () => {
        pickers += 1;
        throw new DOMException("annulé", "AbortError");
      },
    };
    const prepared = await prepareFiles(fakeCore, w as unknown as Window);
    const engine = { state: () => ({ version: 0 }), onState: () => () => undefined };
    const stage = { dataset: {} as Record<string, string> };
    await prepared.mount(engine, stage as unknown as HTMLElement);
    expect(stage.dataset["fichiers"]).toBe("fsa");
    let prevented = 0;
    const press = (repeat: boolean): void => {
      const e = { key: "s", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, repeat, preventDefault: () => (prevented += 1) };
      for (const cb of listeners["keydown"] ?? []) cb(e);
    };
    press(false);
    press(true);
    press(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(prevented).toBe(3);
    expect(pickers).toBe(1);
  });

  it("T79 : dispose retire l'écouteur keydown (et la garde du contrôleur)", async () => {
    const added: Array<[string, unknown]> = [];
    const removed: Array<[string, unknown]> = [];
    const w = {
      indexedDB: undefined,
      location: { search: "", reload: () => undefined },
      document: { title: "" },
      confirm: () => true,
      alert: () => undefined,
      addEventListener: (t: string, cb: unknown) => {
        added.push([t, cb]);
      },
      removeEventListener: (t: string, cb: unknown) => {
        removed.push([t, cb]);
      },
      showOpenFilePicker: async () => [],
      showSaveFilePicker: async () => [],
    };
    const prepared = await prepareFiles(fakeCore, w as unknown as Window);
    const engine = { state: () => ({ version: 0 }), onState: () => () => undefined };
    const ctl = await prepared.mount(engine, { dataset: {} } as unknown as HTMLElement);
    const keydown = added.find(([t]) => t === "keydown")?.[1];
    expect(keydown).toBeDefined();
    expect(removed.some(([t, cb]) => t === "keydown" && cb === keydown)).toBe(false);
    ctl.dispose();
    expect(removed.some(([t, cb]) => t === "keydown" && cb === keydown)).toBe(true);
  });
});
