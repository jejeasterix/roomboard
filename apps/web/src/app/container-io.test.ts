// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, CoreFactory } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { CodecUnavailableError, type ContainerCodec } from "../platform/container";
import { CODEC_FALLBACK_MESSAGE, createContainerIO } from "./container-io";

const ID = "ab".repeat(32);
const hasher = async (): Promise<string> => ID;
const u8 = (...b: number[]) => new Uint8Array(b);

/** Doublure de document : enregistre les appels ; `cited` = assets cités. */
function docStub(cited: string[] = []) {
  const calls: string[] = [];
  const d = {
    citedAssets: () => cited.map((id) => ({ id, name: "a.png", mime: "image/png", size: 3 })),
    asset: (id: string) => (cited.includes(id) ? { id, name: "a.png", mime: "image/png", size: 3 } : null),
    save: (n: string, v: string) => (calls.push(`save ${n} ${v}`), u8(1)),
    saveParts: () => (calls.push("saveParts"), [u8(2), u8(3)] as const),
    saveFragment: (n: string, v: string, name: string) => (calls.push(`saveFragment ${name}`), u8(4)),
    saveFragmentParts: (_n: string, _v: string, name: string) => (calls.push(`saveFragmentParts ${name}`), [u8(5), u8(6)] as const),
    free: vi.fn(),
  } as unknown as CoreDocument;
  return { d, calls };
}
function coreStub(doc: CoreDocument) {
  const calls: string[] = [];
  const core = {
    load: (b: Uint8Array) => (calls.push(`load ${b.length}`), doc),
    loadParts: () => (calls.push("loadParts"), doc),
    loadFragment: (b: Uint8Array) => (calls.push(`loadFragment ${b.length}`), doc),
    loadFragmentParts: () => (calls.push("loadFragmentParts"), doc),
  } as unknown as CoreFactory;
  return { core, calls };
}
const codecOk = (assets: [string, Blob][] = []): ContainerCodec => ({
  read: vi.fn(async () => ({ manifest: u8(9), ybin: u8(8), assets, warnings: [] })),
  write: vi.fn(async () => u8(7)),
});
const codecDown: ContainerCodec = {
  read: async () => { throw new CodecUnavailableError(new Error("absent")); },
  write: async () => { throw new CodecUnavailableError(new Error("absent")); },
};
function io(core: CoreFactory, codec: ContainerCodec, said: string[] = []) {
  return createContainerIO({ core, codec, say: async (m) => void said.push(m), makeAssets: () => createAssetStore(hasher) });
}

describe("conteneurs (DAZ3)", () => {
  it("document sans asset : doc.save, codec jamais appelé", async () => {
    const { d, calls } = docStub();
    const codec = codecOk();
    expect(await io(coreStub(d).core, codec).encode(d, createAssetStore(hasher), "n", "v", { kind: "document" })).toEqual(u8(1));
    expect(calls).toEqual(["save n v"]);
    expect(codec.write).not.toHaveBeenCalled();
  });
  it("document avec asset : saveParts puis codec.write avec les octets du magasin", async () => {
    const { d, calls } = docStub([ID]);
    const assets = createAssetStore(hasher);
    assets.adopt(ID, new Blob([u8(1, 2, 3)], { type: "image/png" }));
    const codec = codecOk();
    expect(await io(coreStub(d).core, codec).encode(d, assets, "n", "v", { kind: "document" })).toEqual(u8(7));
    expect(calls).toEqual(["saveParts"]);
    expect(vi.mocked(codec.write).mock.calls[0]![2].map((a) => [a.id, a.mime])).toEqual([[ID, "image/png"]]);
  });
  it("fragment sans asset : saveFragment(name)", async () => {
    const { d, calls } = docStub();
    expect(await io(coreStub(d).core, codecOk()).encode(d, createAssetStore(hasher), "n", "v", { kind: "fragment", name: "Sélection" })).toEqual(u8(4));
    expect(calls).toEqual(["saveFragment Sélection"]);
  });
  it("fragment avec asset : saveFragmentParts(name) puis codec.write", async () => {
    const { d, calls } = docStub([ID]);
    const assets = createAssetStore(hasher);
    assets.adopt(ID, new Blob([u8(1)]));
    expect(await io(coreStub(d).core, codecOk()).encode(d, assets, "n", "v", { kind: "fragment", name: "x" })).toEqual(u8(7));
    expect(calls).toEqual(["saveFragmentParts x"]);
  });
  it("fragment dont une image citée manque dans le magasin : refusé, rien n'est écrit", async () => {
    const { d, calls } = docStub([ID]);
    const codec = codecOk();
    await expect(io(coreStub(d).core, codec).encode(d, createAssetStore(hasher), "n", "v", { kind: "fragment", name: "x" })).rejects.toThrow(/image/);
    expect(calls).toEqual([]);
    expect(codec.write).not.toHaveBeenCalled();
  });
  it("lecture d'un document : codec.read puis loadParts, assets adoptés et typés", async () => {
    const { d } = docStub([ID]);
    const { core, calls } = coreStub(d);
    const r = await io(core, codecOk([[ID, new Blob([u8(1)])]])).read("a.roomboard", u8(1), "document");
    expect(calls).toEqual(["loadParts"]);
    expect(r?.unread).toBe(false);
    expect(r?.assets.get(ID)?.type).toBe("image/png");
  });
  it("lecture d'un fragment : loadFragmentParts", async () => {
    const { d } = docStub();
    const { core, calls } = coreStub(d);
    expect(await io(core, codecOk()).read("x.rbitem", u8(1), "fragment")).not.toBeNull();
    expect(calls).toEqual(["loadFragmentParts"]);
  });
  it("lecture d'un fragment dont l'image n'a pas été lue : unread", async () => {
    const { d } = docStub([ID]);
    const r = await io(coreStub(d).core, codecOk()).read("x.rbitem", u8(1), "fragment");
    expect(r?.unread).toBe(true);
  });
  it("module indisponible : repli load / loadFragment ; images citées : unread et message", async () => {
    const said: string[] = [];
    const { d } = docStub([ID]);
    const { core, calls } = coreStub(d);
    const r = await io(core, codecDown, said).read("a.roomboard", u8(1, 2), "document");
    expect(calls).toEqual(["load 2"]);
    expect(r?.unread).toBe(true);
    expect(said).toEqual([`a.roomboard : ${CODEC_FALLBACK_MESSAGE}`]);
    const f = await io(coreStub(docStub().d).core, codecDown).read("x.rbitem", u8(1, 2, 3), "fragment");
    expect(f?.unread).toBe(false);
  });
  it("fichier refusé par le cœur : message « Ouverture impossible », null", async () => {
    const said: string[] = [];
    const core = { loadParts: () => { throw new Error("refus du cœur"); }, loadFragmentParts: () => { throw new Error("refus du cœur"); } } as unknown as CoreFactory;
    expect(await io(core, codecOk(), said).read("x.rbitem", u8(1), "fragment")).toBeNull();
    expect(said).toEqual(["Ouverture impossible (x.rbitem) : refus du cœur"]);
  });
});
