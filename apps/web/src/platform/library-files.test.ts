// @vitest-environment node
import "fake-indexeddb/auto";
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { TauriDirFs, TauriFs } from "./host-tauri";
import { createIdbLibraryFiles, createMemoryLibraryFiles, createTauriLibraryFiles, requestPersistence, safeLibraryPath, UNSAFE_PATH_MESSAGE, type LibraryFiles } from "./library-files";

const temps: string[] = [];
afterAll(async () => {
  for (const t of temps) await rm(t, { recursive: true, force: true });
});

/** Faux plugin-fs sur un dossier temporaire de Node. */
function nodeFs(): TauriFs & TauriDirFs {
  return {
    readFile: async (p) => new Uint8Array(await readFile(p)),
    writeFile: async (p, d) => writeFile(p, d),
    readDir: async (p) => (await readdir(p, { withFileTypes: true })).map((e) => ({ name: e.name, isDirectory: e.isDirectory() })),
    mkdir: async (p, o) => void (await mkdir(p, o)),
    remove: async (p, o) => rm(p, { recursive: o.recursive, force: false }),
    exists: async (p) => stat(p).then(() => true, () => false),
  };
}

let n = 0;
const makers: [string, () => Promise<LibraryFiles>][] = [
  ["mémoire", async () => createMemoryLibraryFiles("mine")],
  ["IndexedDB", async () => createIdbLibraryFiles(indexedDB, "mine", `c4-test-${++n}`)],
  ["plugin-fs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rb-c4-"));
    temps.push(dir);
    return createTauriLibraryFiles(nodeFs(), join(dir, "Ressources"), "mine");
  }],
];

const text = async (b: Blob) => new TextDecoder().decode(new Uint8Array(await b.arrayBuffer()));

describe.each(makers)("C4 : LibraryFiles (%s)", (_label, make) => {
  it("C4 : racine neuve vide", async () => {
    expect(await (await make()).list()).toEqual([]);
  });

  it("C4 : write crée les dossiers parents, read rend les octets", async () => {
    const f = await make();
    await f.write("Fractions/Moitié.rbitem", new Blob(["abc"]));
    expect(await f.list()).toEqual([
      { path: "Fractions", dir: true },
      { path: "Fractions/Moitié.rbitem", dir: false },
    ]);
    expect(await text(await f.read("Fractions/Moitié.rbitem"))).toBe("abc");
  });

  it("C4 : write remplace un fichier existant", async () => {
    const f = await make();
    await f.write("a.rbitem", new Blob(["1"]));
    await f.write("a.rbitem", new Blob(["2"]));
    expect(await text(await f.read("a.rbitem"))).toBe("2");
  });

  it("C4 : mkdir puis dossier vide listé", async () => {
    const f = await make();
    await f.mkdir("Vide");
    expect(await f.list()).toEqual([{ path: "Vide", dir: true }]);
  });

  it("C4 : remove d'un dossier est récursif, les voisins restent", async () => {
    const f = await make();
    await f.write("A/x.rbitem", new Blob(["x"]));
    await f.write("A/B/y.rbitem", new Blob(["y"]));
    await f.write("AB/z.rbitem", new Blob(["z"]));
    await f.remove("A");
    expect(await f.list()).toEqual([
      { path: "AB", dir: true },
      { path: "AB/z.rbitem", dir: false },
    ]);
  });

  it("C4 : remove(\"\") vide la racine", async () => {
    const f = await make();
    await f.write("A/x.rbitem", new Blob(["x"]));
    await f.write("y.rbitem", new Blob(["y"]));
    await f.remove("");
    expect(await f.list()).toEqual([]);
  });

  it("C4 : chemins non sûrs refusés partout", async () => {
    const f = await make();
    for (const p of ["../x.rbitem", "a/../../x", "a\\b", "c:x", "/abs", ".cache/x", "a//b"]) {
      await expect(f.write(p, new Blob(["x"])), p).rejects.toThrow(UNSAFE_PATH_MESSAGE);
    }
  });
});

describe("C4 : persistance du stockage web (D31)", () => {
  it("C4 : requestPersistence appelle navigator.storage.persist s'il existe, sans échec sinon", async () => {
    const persist = vi.fn(async () => true);
    expect(await requestPersistence({ storage: { persist } })).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await requestPersistence({})).toBe(false);
    expect(await requestPersistence({ storage: { persist: async () => Promise.reject(new Error("refus")) } })).toBe(false);
  });

  it("C4 : createIdbLibraryFiles demande la persistance une fois, au premier write", async () => {
    const persist = vi.fn(async () => true);
    const f = createIdbLibraryFiles(indexedDB, "mine", `c4-persist-${++n}`, persist);
    await f.list();
    expect(persist).not.toHaveBeenCalled();
    await f.write("a.rbitem", new Blob(["x"]));
    await f.write("b.rbitem", new Blob(["y"]));
    expect(persist).toHaveBeenCalledTimes(1);
  });
});

describe("C4 : safeLibraryPath", () => {
  it("C4 : safeLibraryPath refuse les chemins qui sortent de la racine, garde les autres", () => {
    expect(safeLibraryPath("")).toBe("");
    expect(safeLibraryPath("Fractions/Moitié (2).rbitem")).toBe("Fractions/Moitié (2).rbitem");
    for (const p of ["..", "a/..", "a\\b", "c:", "/a", ".x", "a/.x", "a//b", "a/"]) expect(() => safeLibraryPath(p), p).toThrow(UNSAFE_PATH_MESSAGE);
  });
});
