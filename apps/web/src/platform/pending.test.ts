import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { FileHandleLike, PendingOpen } from "./files";
import { createIdbPendingStore, createMemoryPendingStore, createUnavailablePendingStore, isDataClone } from "./pending";

const file = (target: PendingOpen["target"]): PendingOpen => ({
  name: "cours.roomboard",
  bytes: new Uint8Array([0x50, 0x4b, 1, 2]),
  target,
});

const fakeHandle: FileHandleLike = {
  name: "cours.roomboard",
  getFile: async () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
  createWritable: async () => ({ write: async () => undefined, close: async () => undefined }),
};

describe("fichier ouvert en attente (IndexedDB)", () => {
  it("put puis take rend le fichier et sa cible, puis take rend null (consommé)", async () => {
    const store = createIdbPendingStore(new IDBFactory());
    const target = { kind: "tauri", name: "cours.roomboard", path: "/home/j/cours.roomboard" } as const;
    await store.put(file(target));
    const got = await store.take();
    expect(got?.name).toBe("cours.roomboard");
    expect(Array.from(got?.bytes ?? [])).toEqual([0x50, 0x4b, 1, 2]);
    expect(got?.target).toEqual(target);
    expect(await store.take()).toBeNull();
  });

  it("cible non clonable (fausse poignée FSA) : fichier gardé sans cible", async () => {
    const store = createIdbPendingStore(new IDBFactory());
    await store.put(file({ kind: "fsa", name: "cours.roomboard", handle: fakeHandle }));
    const got = await store.take();
    expect(got?.name).toBe("cours.roomboard");
    expect(Array.from(got?.bytes ?? [])).toEqual([0x50, 0x4b, 1, 2]);
    expect(got?.target).toBeNull();
  });

  it("clear vide l'attente", async () => {
    const store = createIdbPendingStore(new IDBFactory());
    await store.put(file({ kind: "download", name: "cours.roomboard" }));
    await store.clear();
    expect(await store.take()).toBeNull();
  });

  it("rechargement : un second magasin sur la même base lit l'attente du premier", async () => {
    const factory = new IDBFactory();
    await createIdbPendingStore(factory).put(file({ kind: "download", name: "cours.roomboard" }));
    const got = await createIdbPendingStore(factory).take();
    expect(got?.target).toEqual({ kind: "download", name: "cours.roomboard" });
  });

  it("base neuve : take rend null", async () => {
    expect(await createIdbPendingStore(new IDBFactory()).take()).toBeNull();
  });

  it("mémoire : même contrat (put, take consommé, clear)", async () => {
    const store = createMemoryPendingStore();
    await store.put(file(null));
    expect((await store.take())?.name).toBe("cours.roomboard");
    expect(await store.take()).toBeNull();
    await store.put(file(null));
    await store.clear();
    expect(await store.take()).toBeNull();
  });

  it("IndexedDB absent : put refusé avec la raison, take rend null (pas d'ouverture perdue au rechargement)", async () => {
    const store = createUnavailablePendingStore("IndexedDB absent");
    await expect(store.put(file(null))).rejects.toThrow("IndexedDB absent");
    expect(await store.take()).toBeNull();
    await store.clear();
  });

  it("isDataClone reconnaît DataCloneError seulement", () => {
    expect(isDataClone(Object.assign(new Error("x"), { name: "DataCloneError" }))).toBe(true);
    expect(isDataClone(new Error("x"))).toBe(false);
    expect(isDataClone("DataCloneError")).toBe(false);
  });
});
