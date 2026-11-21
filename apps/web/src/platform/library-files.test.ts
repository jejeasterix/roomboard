// @vitest-environment node
import "fake-indexeddb/auto";
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { TauriDirFs, TauriFs } from "./host-tauri";
import {
  CLEAR_REFUSED_MESSAGE, createIdbLibraryFiles, createMemoryLibraryFiles, createTauriLibraryFiles, PATH_CONFLICT_MESSAGE, requestPersistence, safeLibraryPath,
  UNSAFE_PATH_MESSAGE, type LibraryFiles, type LibraryRoot,
} from "./library-files";

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
const makers: [string, (root?: LibraryRoot) => Promise<LibraryFiles>][] = [
  ["mémoire", async (root = "mine") => createMemoryLibraryFiles(root)],
  ["IndexedDB", async (root = "mine") => createIdbLibraryFiles(indexedDB, root, `c4-test-${++n}`)],
  ["plugin-fs", async (root = "mine") => {
    const dir = await mkdtemp(join(tmpdir(), "rb-c4-"));
    temps.push(dir);
    return createTauriLibraryFiles(nodeFs(), join(dir, "Ressources"), root);
  }],
];
const UNSAFE = ["../x.rbitem", "a/../../x", "a\\b", "c:x", "/abs", ".cache/x", "a//b"];

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

  it("C7 : chemins non sûrs refusés aussi par read, mkdir et remove ; rien n'est touché", async () => {
    const f = await make();
    await f.write("a.rbitem", new Blob(["a"]));
    for (const p of UNSAFE) {
      await expect(f.read(p), `read ${p}`).rejects.toThrow(UNSAFE_PATH_MESSAGE);
      await expect(f.mkdir(p), `mkdir ${p}`).rejects.toThrow(UNSAFE_PATH_MESSAGE);
      await expect(f.remove(p), `remove ${p}`).rejects.toThrow(UNSAFE_PATH_MESSAGE);
    }
    await expect(f.read(""), "read racine").rejects.toThrow(UNSAFE_PATH_MESSAGE);
    await expect(f.mkdir(""), "mkdir racine").rejects.toThrow(UNSAFE_PATH_MESSAGE);
    expect(await f.list()).toEqual([{ path: "a.rbitem", dir: false }]);
  });

  it("C6 : clear() vide « Mes ressources »", async () => {
    const f = await make("mine");
    await f.write("A/x.rbitem", new Blob(["x"]));
    await f.write("y.rbitem", new Blob(["y"]));
    await f.clear();
    expect(await f.list()).toEqual([]);
  });

  it("C6 : dossier partagé : remove(\"\") et clear() refusés, rien n'est effacé", async () => {
    const f = await make("shared");
    await f.write("A/x.rbitem", new Blob(["x"]));
    await expect(f.remove(""), "remove racine").rejects.toThrow(CLEAR_REFUSED_MESSAGE);
    await expect(f.clear(), "clear").rejects.toThrow(CLEAR_REFUSED_MESSAGE);
    expect(await f.list()).toEqual([
      { path: "A", dir: true },
      { path: "A/x.rbitem", dir: false },
    ]);
  });

  it("C9 : un fichier et un dossier ne portent jamais le même chemin, refus identique partout", async () => {
    const f = await make();
    await f.write("a", new Blob(["fichier"]));
    await f.mkdir("d");
    await expect(f.write("a/b.rbitem", new Blob(["x"])), "write sous un fichier").rejects.toThrow(PATH_CONFLICT_MESSAGE);
    await expect(f.mkdir("a/c"), "mkdir sous un fichier").rejects.toThrow(PATH_CONFLICT_MESSAGE);
    await expect(f.mkdir("a"), "mkdir sur un fichier").rejects.toThrow(PATH_CONFLICT_MESSAGE);
    await expect(f.write("d", new Blob(["x"])), "write sur un dossier").rejects.toThrow(PATH_CONFLICT_MESSAGE);
    expect(await f.list()).toEqual([
      { path: "a", dir: false },
      { path: "d", dir: true },
    ]);
    expect(await text(await f.read("a"))).toBe("fichier");
  });
});

/** Octets portés par une valeur lue dans IndexedDB (Blob, ArrayBuffer, vue typée), à toute profondeur. */
const carriesBytes = (v: unknown): boolean =>
  v instanceof Blob || v instanceof ArrayBuffer || ArrayBuffer.isView(v) ||
  (Array.isArray(v) ? v.some(carriesBytes) : typeof v === "object" && v !== null && Object.values(v).some(carriesBytes));

describe("C1 : list() IndexedDB sans les octets", () => {
  it("C1 : list() ne lit aucun octet de la bibliothèque (read, lui, en lit)", async () => {
    const f = createIdbLibraryFiles(indexedDB, "mine", `c1-${++n}`, async () => true);
    await f.write("A/x.rbitem", new Blob([new Uint8Array(4096)]));
    await f.write("y.rbitem", new Blob(["y"]));
    const seen: string[] = [];
    const protos = [IDBObjectStore.prototype, IDBIndex.prototype] as unknown as Record<string, (...a: unknown[]) => IDBRequest>[];
    const spies = protos.flatMap((proto) =>
      ["get", "getAll", "openCursor"].map((m) => {
        const orig = proto[m]!;
        return vi.spyOn(proto, m).mockImplementation(function (this: unknown, ...a: unknown[]) {
          const req = orig.apply(this, a);
          req.addEventListener("success", () => {
            const r: unknown = req.result;
            if (carriesBytes(r instanceof IDBCursorWithValue ? r.value : r)) seen.push(m);
          });
          return req;
        });
      }),
    );
    try {
      await f.read("y.rbitem");
      expect(seen.length, "le détecteur voit les octets d'un read").toBeGreaterThan(0);
      seen.length = 0;
      expect(await f.list()).toEqual([
        { path: "A", dir: true },
        { path: "A/x.rbitem", dir: false },
        { path: "y.rbitem", dir: false },
      ]);
    } finally {
      for (const s of spies) s.mockRestore();
    }
    expect(seen, "lectures d'octets pendant list()").toEqual([]);
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
