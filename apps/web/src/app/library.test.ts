import { unzipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { unknownKindMessage } from "../core/api";
import { createMemoryLibraryFiles, type LibraryFiles } from "../platform/library-files";
import { zipStored } from "../platform/zip-worker";
import { ZIP_TOO_BIG_MESSAGE } from "../platform/model3d-import";
import { PACK_NOT_ROOMBOARD_MESSAGE, PACK_UNSAFE_PATH_MESSAGE } from "../platform/rbpack";
import {
  createResourceLibrary,
  createSharedFolder,
  exportSkippedMessage,
  fileNameOf,
  folderNameOf,
  importedMessage,
  mineMemoryMessage,
  mineOrMemory,
  normalizeSearch,
  PACK_TOO_BIG_MESSAGE,
  SHARED_FOLDER_KEY,
  type LibraryDeps,
  type NewResource,
} from "./library";

const enc = (s: string) => new TextEncoder().encode(s);
const zip = {
  unzip: async (blob: Blob) => Object.entries(unzipSync(new Uint8Array(await blob.arrayBuffer()))).map(([path, b]) => ({ path, blob: new Blob([b as BlobPart]) })),
  zip: async (files: readonly { path: string; bytes: Uint8Array }[]) => zipStored(files),
};
const libOf = (wrap: (f: LibraryFiles) => LibraryFiles = (f) => f, over: Partial<LibraryDeps> = {}) => {
  const mine = createMemoryLibraryFiles("mine");
  const lib = createResourceLibrary({ files: [wrap(mine)], zip, now: () => "2026-11-21T08:00:00Z", appVersion: "c4", ...over });
  return { lib, mine };
};
const res = (name: string, over: Partial<NewResource> = {}): NewResource => ({
  bytes: enc(`rb:${name}`), kind: "fragment", thumbnail: new Blob([enc("png")], { type: "image/png" }), name, keywords: [], description: "", ...over,
});
const manifestOf = (bytes: Uint8Array) =>
  JSON.parse(new TextDecoder().decode(unzipSync(bytes)["manifest.json"])) as { items: { name: string; kind: string }[] };
const kvOf = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const packOf = (name: string, paths: readonly string[]) =>
  zipStored([
    { path: "manifest.json", bytes: enc(JSON.stringify({ format: "roomboard", formatVersion: 1, kind: "pack", name, items: paths.map((path) => ({ path, name: "x", keywords: [], description: "", kind: "fragment", thumbnail: null })) })) },
    ...paths.map((path) => ({ path, bytes: enc(`rb:${path}`) })),
  ]);

describe("C4 : ResourceLibrary", () => {
  it("C4 : add écrit ressource, compagnon et vignette ; l'index la montre", async () => {
    const { lib, mine } = libOf();
    const e = await lib.add("mine", "", res("Moitié", { keywords: ["fraction"] }));
    expect(e).toMatchObject({ root: "mine", path: "moitie.rbitem", folder: "", name: "Moitié", keywords: ["fraction"], kind: "fragment", thumbnail: "moitie.rbitem.png" });
    expect((await mine.list()).map((p) => p.path)).toEqual(["moitie.rbitem", "moitie.rbitem.json", "moitie.rbitem.png"]);
    expect(lib.folder("mine", "").items.map((i) => i.name)).toEqual(["Moitié"]);
    expect(await lib.read(e)).toEqual(enc("rb:Moitié"));
  });

  it("C4 : recherche sans casse ni accents, sur nom, mots-clés et description", async () => {
    const { lib } = libOf();
    await lib.add("mine", "", res("Moitié", { keywords: ["fraction"] }));
    await lib.add("mine", "", res("Seyès", { kind: "grid", description: "Grille d'écriture" }));
    expect(lib.search("frac").map((e) => e.name)).toEqual(["Moitié"]);
    expect(lib.search("MOITIE").map((e) => e.name)).toEqual(["Moitié"]);
    expect(lib.search("ecriture").map((e) => e.name)).toEqual(["Seyès"]);
    expect(lib.search("  ")).toEqual([]);
    expect(normalizeSearch("Écriture Œuf")).toBe("ecriture œuf");
  });

  it("C4 : deux « Moitié » dans le même dossier ne s'écrasent pas : (2)", async () => {
    const { lib } = libOf();
    const a = await lib.add("mine", "", res("Moitié"));
    const b = await lib.add("mine", "", res("Moitié"));
    expect([a.path, b.path]).toEqual(["moitie.rbitem", "moitie (2).rbitem"]);
    expect(b.name).toBe("Moitié");
    expect(await lib.read(a)).toEqual(enc("rb:Moitié"));
    expect(lib.folder("mine", "").items).toHaveLength(2);
  });

  it("C4 : nom saisi → nom de fichier (patron slug), nom affiché gardé", async () => {
    expect(fileNameOf("Moitié")).toBe("moitie");
    expect(fileNameOf("1/2")).toBe("1-2");
    expect(fileNameOf("Fractions : 6e")).toBe("fractions-6e");
    expect(fileNameOf('?*"<>|')).toBe("ressource");
    expect(fileNameOf("x".repeat(200))).toHaveLength(80);
    expect(folderNameOf("a/b\\c:d")).toBe("a_b_c_d");
    expect(folderNameOf("..secret")).toBe("_.secret");
    expect(folderNameOf("Fractions 6e")).toBe("Fractions 6e");
    expect(folderNameOf("   ")).toBe("Dossier");
    const { lib } = libOf();
    const e = await lib.add("mine", "", res("Fractions : 6e"));
    expect([e.path, e.name]).toEqual(["fractions-6e.rbitem", "Fractions : 6e"]);
  });

  it("C4 : export trop gros : message clair (D27)", async () => {
    const { lib } = libOf();
    for (let i = 0; i < 500; i++) await lib.add("mine", "", res(`R${i}`));
    await expect(lib.exportPack("mine", "")).rejects.toThrow(PACK_TOO_BIG_MESSAGE);
  });

  it("C4 : import d'un chemin non sûr refusé par safeLibraryPath : bibliothèque inchangée (D32)", async () => {
    const { lib, mine } = libOf();
    for (const p of ["items/../x.rbitem", "items/a\\b.rbitem", "items/c:x.rbitem", "items/.cache/x.rbitem"]) {
      const bad = zipStored([
        { path: "manifest.json", bytes: enc(JSON.stringify({ format: "roomboard", formatVersion: 1, kind: "pack", name: "X", items: [{ path: p, name: "x", keywords: [], description: "", kind: "fragment", thumbnail: null }] })) },
        { path: p, bytes: enc("x") },
      ]);
      await expect(lib.importPack(bad, "X.rbpack"), p).rejects.toThrow(PACK_UNSAFE_PATH_MESSAGE);
    }
    expect(await mine.list()).toEqual([]);
  });

  it("C4 : import refusé au deuxième article : rien n'est écrit, ni dossier ni premier article", async () => {
    const { lib, mine } = libOf();
    await lib.add("mine", "", res("Moitié"));
    const before = await mine.list();
    await expect(lib.importPack(packOf("Lot", ["items/a.rbitem", "items/.cache/z.rbitem"]), "Lot.rbpack")).rejects.toThrow(PACK_UNSAFE_PATH_MESSAGE);
    expect(await mine.list()).toEqual(before);
    expect(lib.folder("mine", "").folders).toEqual([]);
    expect(lib.search("x")).toEqual([]);
    expect((await lib.importPack(packOf("Lot", ["items/a.rbitem"]), "Lot.rbpack")).folder).toBe("Lot");
  });

  it("C4 : écriture en échec au milieu de l'import : dossier neuf retiré, bibliothèque inchangée", async () => {
    let writes = 0;
    let armed = false;
    const { lib, mine } = libOf((f) => ({
      ...f,
      async write(p, d) {
        if (armed && ++writes === 3) throw new Error("stockage plein");
        return f.write(p, d);
      },
    }));
    await lib.add("mine", "", res("Moitié"));
    const before = await mine.list();
    armed = true;
    await expect(lib.importPack(packOf("Lot", ["items/a.rbitem", "items/b.rbitem"]), "Lot.rbpack")).rejects.toThrow("stockage plein");
    expect(await mine.list()).toEqual(before);
    expect(lib.folder("mine", "").folders).toEqual([]);
    expect(lib.search("x")).toEqual([]);
  });

  it("C4 : un .rbpack qui n'est pas un ZIP est refusé avec un message clair", async () => {
    const { lib, mine } = libOf();
    await lib.add("mine", "", res("Moitié"));
    const before = await mine.list();
    const err = await lib.importPack(enc("bonjour, je ne suis pas un ZIP"), "faux.rbpack").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe(PACK_NOT_ROOMBOARD_MESSAGE);
    expect(await mine.list()).toEqual(before);
    const big = createResourceLibrary({ files: [createMemoryLibraryFiles("mine")], zip: { ...zip, unzip: () => Promise.reject(new Error(ZIP_TOO_BIG_MESSAGE)) }, now: () => "", appVersion: "c4" });
    await expect(big.importPack(enc("PK"), "gros.rbpack")).rejects.toThrow(ZIP_TOO_BIG_MESSAGE);
  });

  it("C4 : dossiers : mkdir, folder, remove récursif", async () => {
    const { lib } = libOf();
    const f = await lib.mkdir("mine", "", "Fractions");
    expect(f).toBe("Fractions");
    await lib.add("mine", f, res("Moitié"));
    expect(lib.folder("mine", "").folders).toEqual(["Fractions"]);
    expect(lib.folder("mine", "Fractions").items.map((i) => i.path)).toEqual(["Fractions/moitie.rbitem"]);
    await lib.remove("mine", "Fractions");
    expect(lib.folder("mine", "").folders).toEqual([]);
    expect(lib.search("moitie")).toEqual([]);
  });

  it("C4 : refresh relit le stockage ; fichier sans compagnon : nom du fichier, kind null (H2-4)", async () => {
    const { lib, mine } = libOf();
    await mine.write("Posé/Main.rbitem", new Blob([enc("x")]));
    await lib.refresh();
    expect(lib.folder("mine", "Posé").items).toEqual([
      { root: "mine", path: "Posé/Main.rbitem", folder: "Posé", name: "Main", keywords: [], description: "", kind: null, thumbnail: null },
    ]);
  });

  it("C4 : export d'une ressource sans compagnon ni type lisible : sautée avec un avis, jamais un type inventé (K4)", async () => {
    const { lib, mine } = libOf();
    await mine.write("Main.rbitem", new Blob([enc("x")]));
    await lib.add("mine", "", res("Moitié"));
    await lib.refresh();
    const p = await lib.exportPack("mine", "");
    expect(p.skipped).toEqual(["Main.rbitem"]);
    expect(manifestOf(p.bytes).items.map((i) => [i.name, i.kind])).toEqual([["Moitié", "fragment"]]);
  });

  it("C4 : export d'une ressource sans compagnon : type lu sur ses octets par le cœur, pas de refus global (K4)", async () => {
    const kindOf = vi.fn(async (b: Uint8Array) => (new TextDecoder().decode(b) === "grille" ? ("grid" as const) : null));
    const { lib, mine } = libOf(undefined, { kindOf });
    await mine.write("Seyes.rbitem", new Blob([enc("grille")]));
    await mine.write("Autre.rbitem", new Blob([enc("??")]));
    await lib.add("mine", "", res("Moitié"));
    await lib.refresh();
    const p = await lib.exportPack("mine", "");
    expect(p.skipped).toEqual(["Autre.rbitem"]);
    expect(manifestOf(p.bytes).items.map((i) => [i.name, i.kind]).sort()).toEqual([["Moitié", "fragment"], ["Seyes", "grid"]]);
    expect(kindOf).toHaveBeenCalledTimes(2); // seules les ressources sans type connu sont lues
    expect(exportSkippedMessage(["Autre.rbitem"])).toContain("Autre.rbitem");
  });

  it("C4 : onChange : un import fait hors du panneau prévient les abonnés ; désabonné : plus rien (K3)", async () => {
    const { lib } = libOf();
    await lib.add("mine", "", res("Moitié"));
    const p = await lib.exportPack("mine", "");
    const seen = vi.fn();
    const off = lib.onChange(seen);
    await lib.importPack(p.bytes, "x.rbpack");
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    await lib.importPack(p.bytes, "x.rbpack");
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("C4 : dossier partagé : clé déjà remplie au démarrage → déjà choisi, et proposé à la boîte (K1, H1-5)", async () => {
    const opened: string[] = [];
    const host = { pickFolder: vi.fn(async (start: string | null) => start ?? "/choisi"), open: (path: string) => (opened.push(path), createMemoryLibraryFiles("shared")) };
    const { lib } = libOf();
    const known = createSharedFolder({ kv: kvOf({ [SHARED_FOLDER_KEY]: "/partage" }), host, library: lib });
    expect(known.desktop).toBe(true);
    expect(known.chosen()).toBe(true);
    const fresh = createSharedFolder({ kv: kvOf(), host, library: lib });
    expect(fresh.chosen()).toBe(false);
    expect(await fresh.choose()).toBe(true);
    expect(fresh.chosen()).toBe(true);
    expect(opened).toEqual(["/choisi"]);
    expect(lib.roots()).toEqual(["mine", "shared"]);
    await known.choose();
    expect(host.pickFolder).toHaveBeenLastCalledWith("/partage");
    const web = createSharedFolder({ kv: kvOf({ [SHARED_FOLDER_KEY]: "/partage" }), host: null, library: lib });
    expect(web.desktop).toBe(false);
    expect(await web.choose()).toBe(false);
  });

  it("C4 : « Mes ressources » : dossier Documents introuvable → en mémoire, avec un avis (K8)", async () => {
    const r = await mineOrMemory(async () => {
      throw new Error("documentDir indisponible");
    }, () => createMemoryLibraryFiles("mine"));
    expect(r.files.root).toBe("mine");
    expect(r.notice).toBe(mineMemoryMessage("documentDir indisponible"));
    const ok = createMemoryLibraryFiles("mine");
    expect(await mineOrMemory(async () => ok, () => createMemoryLibraryFiles("mine"))).toEqual({ files: ok, notice: null });
  });

  it("C4 : message d'import d'un paquet, partagé par le panneau et le dépôt sur la scène", () => {
    expect(importedMessage("P.rbpack", { folder: "P", count: 1 })).toBe("P.rbpack : 1 ressource importée dans « P »");
    expect(importedMessage("P.rbpack", { folder: "P (2)", count: 3 })).toBe("P.rbpack : 3 ressources importées dans « P (2) »");
  });

  it("C4 : export puis import rend les mêmes ressources", async () => {
    const { lib } = libOf();
    const f = await lib.mkdir("mine", "", "Fractions");
    await lib.add("mine", f, res("Moitié", { keywords: ["fraction"], description: "La moitié" }));
    await lib.add("mine", f, res("Seyès", { kind: "grid", description: "Grille", thumbnail: null }));
    const pack = await lib.exportPack("mine", "Fractions");
    expect(pack.name).toBe("Fractions.rbpack");
    await lib.remove("mine", "");
    expect(lib.folder("mine", "").folders).toEqual([]);
    expect(await lib.importPack(pack.bytes, pack.name)).toEqual({ folder: "Fractions", count: 2 });
    const items = lib.folder("mine", "Fractions").items;
    expect(items.map((i) => [i.name, i.kind, i.keywords, i.description, i.thumbnail !== null])).toEqual([
      ["Moitié", "fragment", ["fraction"], "La moitié", true],
      ["Seyès", "grid", [], "Grille", false],
    ]);
    expect(await lib.read(items[0]!)).toEqual(enc("rb:Moitié"));
    expect(await lib.read(items[1]!)).toEqual(enc("rb:Seyès"));
    const thumb = await lib.thumbnail(items[0]!);
    expect(new Uint8Array(await thumb!.arrayBuffer())).toEqual(enc("png"));
  });

  it("C4 : index vide ou périmé : l'import relit le stockage, « Fractions (2) », l'ancienne ressource intacte", async () => {
    const mine = createMemoryLibraryFiles("mine");
    await mine.write("Fractions/moitie.rbitem", new Blob([enc("ancien")]));
    const lib = createResourceLibrary({ files: [mine], zip, now: () => "", appVersion: "c4" });
    const r = await lib.importPack(packOf("Fractions", ["items/moitie.rbitem"]), "Fractions.rbpack");
    expect(r.folder).toBe("Fractions (2)");
    expect(new TextDecoder().decode(await (await mine.read("Fractions/moitie.rbitem")).arrayBuffer())).toBe("ancien");
    expect((await mine.list()).map((p) => p.path)).toContain("Fractions (2)/x.rbitem");
  });

  it("C4 : écriture en échec avec un index périmé : aucune ressource préexistante supprimée", async () => {
    const mine = createMemoryLibraryFiles("mine");
    await mine.write("Fractions/moitie.rbitem", new Blob([enc("ancien")]));
    await mine.write("Fractions/moitie.rbitem.json", new Blob([enc("{}")]));
    const before = await mine.list();
    let writes = 0;
    const flaky: LibraryFiles = {
      ...mine,
      async write(p, d) {
        if (++writes === 3) throw new Error("stockage plein");
        return mine.write(p, d);
      },
    };
    const lib = createResourceLibrary({ files: [flaky], zip, now: () => "", appVersion: "c4" });
    await expect(lib.importPack(packOf("Fractions", ["items/a.rbitem", "items/b.rbitem"]), "Fractions.rbpack")).rejects.toThrow("stockage plein");
    expect(await mine.list()).toEqual(before);
  });

  it("C4 : remove en échec : l'index est relu et reste cohérent avec le stockage", async () => {
    const mine = createMemoryLibraryFiles("mine");
    const flaky: LibraryFiles = {
      ...mine,
      async remove(p) {
        await mine.remove(p);
        if (p === "Fractions") throw new Error("disque en erreur");
      },
    };
    const lib = createResourceLibrary({ files: [flaky], zip, now: () => "", appVersion: "c4" });
    await lib.add("mine", await lib.mkdir("mine", "", "Fractions"), res("Moitié"));
    await expect(lib.remove("mine", "Fractions")).rejects.toThrow("disque en erreur");
    expect(lib.folder("mine", "").folders).toEqual([]);
    expect(lib.search("moitie")).toEqual([]);
  });

  it("C4 : import deux fois : Fractions (2)", async () => {
    const { lib } = libOf();
    const f = await lib.mkdir("mine", "", "Fractions");
    await lib.add("mine", f, res("Moitié"));
    const pack = await lib.exportPack("mine", f);
    expect((await lib.importPack(pack.bytes, pack.name)).folder).toBe("Fractions (2)");
  });

  it("C4 : import refusé : bibliothèque inchangée", async () => {
    const { lib, mine } = libOf();
    await lib.add("mine", "", res("Moitié"));
    const before = await mine.list();
    const bad = zipStored([{ path: "manifest.json", bytes: enc('{"format":"roomboard","formatVersion":1,"kind":"autre","name":"X","items":[]}') }]);
    await expect(lib.importPack(bad, "X.rbpack")).rejects.toThrow(unknownKindMessage("autre"));
    expect(await mine.list()).toEqual(before);
  });

  it("C4 : export de la racine : paquet « Mes ressources », sous-dossiers gardés", async () => {
    const { lib } = libOf();
    await lib.add("mine", "", res("A"));
    await lib.add("mine", await lib.mkdir("mine", "", "Sous"), res("B"));
    const pack = await lib.exportPack("mine", "");
    expect(pack.name).toBe("Mes ressources.rbpack");
    const names = Object.keys(unzipSync(pack.bytes));
    expect(names).toEqual(["manifest.json", "items/Sous/b.rbitem", "items/Sous/b.rbitem.png", "items/a.rbitem", "items/a.rbitem.png"]);
  });
});
