// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, CoreFactory, LinkedAsset } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { CodecUnavailableError, type ContainerCodec } from "../platform/container";
import {
  CODEC_FALLBACK_MESSAGE,
  createContainerIO,
  LINKED_COPY_MESSAGE,
  LINKED_WEB_MESSAGE,
  LinkedMediaError,
  linkedMissingMessage,
  missingOf,
  type ContainerIODeps,
} from "./container-io";

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

describe("conteneurs : médias (C14)", () => {
  const VID = "cd".repeat(32);
  const IMG = "ef".repeat(32);
  const SIZE = 300_000_000;
  const NOW = "2026-11-20T00:00:00Z";
  function mediaDoc(linked: string | null, withImage = false): CoreDocument {
    const d = fakeCore.blank();
    const page = d.pageIds()[0]!;
    d.apply({
      type: "AddMedia",
      page,
      asset: { id: VID, name: "clip.webm", mime: "video/webm", size: SIZE },
      poster: null,
      linked,
      mediaType: "video",
      w: 640,
      h: 360,
      duration: 12,
      matrix: [1, 0, 0, 1, 0, 0],
    });
    if (withImage) d.apply({ type: "AddImage", page, asset: { id: IMG, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    return d;
  }
  const store = () => createAssetStore(hasher);
  const readCodec = (d: CoreDocument, assets: [string, Blob][] = []): ContainerCodec => ({
    read: vi.fn(async () => ({ manifest: u8(9), ybin: d.save(NOW, "0.1.0"), assets, warnings: [] })),
    write: vi.fn(async () => u8(7)),
  });
  function ioWith(codec: ContainerCodec, said: string[], relink?: ContainerIODeps["relink"]) {
    return createContainerIO({ core: fakeCore, codec, say: async (m) => void said.push(m), makeAssets: store, ...(relink ? { relink } : {}) });
  }

  it("asset lié : Enregistrer permis ; image absente : refusé (effet de bord R30)", () => {
    expect(missingOf(mediaDoc("/v/clip.webm"), store())).toEqual([]);
    expect(missingOf(mediaDoc("/v/clip.webm", true), store())).toEqual([IMG]);
  });

  it("fragment d'un média lié : LinkedMediaError, codec jamais appelé (M32)", async () => {
    const codec = codecOk();
    // image absente aussi : le refus du lié passe avant MissingAssetError
    const p = ioWith(codec, []).encode(mediaDoc("/v/clip.webm", true), store(), "n", "v", { kind: "fragment", name: "Sélection" });
    await expect(p).rejects.toBeInstanceOf(LinkedMediaError);
    await expect(p).rejects.toThrow(LINKED_COPY_MESSAGE);
    expect(LINKED_COPY_MESSAGE).toBe("vidéo liée : copie non prise en charge, déposez le fichier à nouveau");
    expect(codec.write).not.toHaveBeenCalled();
  });

  it("fragment d'un média inclus : écrit", async () => {
    const assets = store();
    assets.adopt(VID, new Blob([u8(1, 2)], { type: "video/webm" }));
    const codec = codecOk();
    expect(await ioWith(codec, []).encode(mediaDoc(null), assets, "n", "v", { kind: "fragment", name: "Sélection" })).toEqual(u8(7));
    expect(vi.mocked(codec.write).mock.calls[0]![2].map((a) => [a.id, a.mime])).toEqual([[VID, "video/webm"]]);
  });

  it("R9 : le conteneur écrit d'un document à vidéo liée ne contient pas les octets de la vidéo", async () => {
    const assets = store();
    assets.adopt(VID, new Blob([u8(7, 7, 7, 7)], { type: "video/webm" }));
    assets.link(VID, "/v/clip.webm");
    assets.adopt(IMG, new Blob([u8(1, 2, 3)], { type: "image/png" }));
    const codec = codecOk();
    await ioWith(codec, []).encode(mediaDoc("/v/clip.webm", true), assets, "n", "v", { kind: "document" });
    expect(vi.mocked(codec.write).mock.calls[0]![2].map((a) => a.id)).toEqual([IMG]);
  });

  it("ouvrir en coque : lien résolu, accordé, au magasin (S5, M31)", async () => {
    const said: string[] = [];
    const relink = vi.fn(async (_doc: string | null, l: LinkedAsset, _size: number) => `/cours/${l.path}`);
    const r = await ioWith(readCodec(mediaDoc("videos/clip.webm")), said, relink).read("a.roomboard", u8(1), "document", "/cours/a.roomboard");
    expect(relink).toHaveBeenCalledWith("/cours/a.roomboard", { id: VID, path: "videos/clip.webm" }, SIZE);
    expect(r?.assets.linked(VID)).toBe("/cours/videos/clip.webm");
    expect(r?.unread).toBe(false);
    expect(said).toEqual([]);
  });

  it("vidéo absente : avis « vidéo liée introuvable », document ouvert, unread faux (S5)", async () => {
    const said: string[] = [];
    const r = await ioWith(readCodec(mediaDoc("videos/clip.webm")), said, async () => null).read("a.roomboard", u8(1), "document", "/cours/a.roomboard");
    expect(r).not.toBeNull();
    expect(r?.unread).toBe(false);
    expect(r?.assets.linked(VID)).toBeUndefined();
    expect(said).toEqual(["clip.webm : vidéo liée introuvable (videos/clip.webm)"]);
    expect(linkedMissingMessage("videos/clip.webm")).toBe(said[0]);
  });

  it("web : un avis « vidéo non incluse »", async () => {
    const said: string[] = [];
    const r = await ioWith(readCodec(mediaDoc("videos/clip.webm")), said).read("a.roomboard", u8(1), "document");
    expect(r?.unread).toBe(false);
    expect(said).toEqual(["a.roomboard : vidéo non incluse (liée, lisible dans l'application de bureau)"]);
    expect(said[0]).toBe(`a.roomboard : ${LINKED_WEB_MESSAGE}`);
  });

  it("un média relu garde son type (typed)", async () => {
    const r = await ioWith(readCodec(mediaDoc(null), [[VID, new Blob([u8(1, 2)])]]), []).read("a.roomboard", u8(1), "document");
    expect(r?.assets.get(VID)?.type).toBe("video/webm");
    expect(r?.unread).toBe(false);
  });

  it("repli (module absent) : un document à vidéo liée seule n'est pas « non lu », son lien est résolu", async () => {
    const said: string[] = [];
    const bytes = mediaDoc("/v/clip.webm").save(NOW, "0.1.0");
    const r = await ioWith(codecDown, said, async (_d, l) => l.path).read("a.roomboard", bytes, "document");
    expect(r?.unread).toBe(false);
    expect(r?.assets.linked(VID)).toBe("/v/clip.webm");
    expect(said).toEqual([]);
  });
});
