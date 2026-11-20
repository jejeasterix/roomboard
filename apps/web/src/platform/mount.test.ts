import { describe, expect, it, vi } from "vitest";
import type { CoreDocument } from "../core/api";
import { fakeCore } from "../core/fake-core";
import type { PendingOpen, PendingStore } from "./files";
import { prepareHost, startDocument } from "./mount";

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

describe("prepareHost (T98)", () => {
  function webWindow(search: string, fsa: boolean) {
    const doc = { title: "", addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const w: Record<string, unknown> = {
      indexedDB: undefined,
      location: { search, reload: () => undefined },
      document: doc,
      confirm: () => true,
      alert: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    if (fsa) {
      w["showOpenFilePicker"] = async () => [];
      w["showSaveFilePicker"] = async () => [];
    }
    return { w: w as unknown as Window, doc };
  }

  it("hôte FSA : rend { kind, host, shell, dropReady }, dépôt posé sur w.document, dropReady résolu", async () => {
    const { w, doc } = webWindow("", true);
    const p = await prepareHost(w);
    expect(p.kind).toBe("fsa");
    expect(p.host.kind).toBe("fsa");
    expect(typeof p.shell.setTitle).toBe("function");
    const off = p.host.onDrop(vi.fn());
    expect(doc.addEventListener.mock.calls.map((c) => c[0])).toEqual(["dragover", "drop"]);
    off();
    expect(doc.removeEventListener.mock.calls.map((c) => c[0])).toEqual(["dragover", "drop"]);
    await expect(p.dropReady()).resolves.toBeUndefined();
  });

  it("repli (?fichiers=repli) : dépôt posé sur w.document, dropReady résolu", async () => {
    const { w, doc } = webWindow("?fichiers=repli", true);
    const p = await prepareHost(w);
    expect([p.kind, p.host.kind]).toEqual(["repli", "repli"]);
    p.host.onDrop(vi.fn());
    expect(doc.addEventListener.mock.calls.map((c) => c[0])).toEqual(["dragover", "drop"]);
    await expect(p.dropReady()).resolves.toBeUndefined();
  });
});
