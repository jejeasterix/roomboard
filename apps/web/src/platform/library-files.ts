/**
 * Stockage de la bibliothèque (C4, DA1) : une racine, chemins relatifs `/`. Trois réalisations : mémoire (tests, repli
 * sans IndexedDB), IndexedDB (web, base `roomboard-bibliotheque` : magasin `entrees` pour les chemins, `octets` pour le
 * contenu, même clé `<racine>/<chemin>`) et `plugin-fs` (coque, dossier réel). Tout chemin passe par `safeLibraryPath`
 * avant d'atteindre le stockage (H1-4) ; un fichier et un dossier ne portent jamais le même chemin (C9).
 */
import type { TauriDirFs, TauriFs } from "./host-tauri";
import { finished, lazyDb, result } from "./idb";

export type LibraryRoot = "mine" | "shared";
export interface LibraryPath {
  readonly path: string;
  readonly dir: boolean;
}
export interface LibraryFiles {
  readonly root: LibraryRoot;
  list(): Promise<readonly LibraryPath[]>;
  read(path: string): Promise<Blob>;
  write(path: string, data: Blob): Promise<void>;
  mkdir(path: string): Promise<void>;
  /** Dossier (récursif) ou fichier. `""` : `clear()`, gardé pour « Vider » (`app/library.ts`). */
  remove(path: string): Promise<void>;
  /** Vide la racine ; refusé sur « shared », dossier choisi par l'utilisateur (C6). */
  clear(): Promise<void>;
}

export const LIBRARY_DB = "roomboard-bibliotheque";
export const UNSAFE_PATH_MESSAGE = "chemin de bibliothèque refusé";
export const CLEAR_REFUSED_MESSAGE = "le dossier partagé ne se vide pas depuis RoomBoard";
export const PATH_CONFLICT_MESSAGE = "un fichier et un dossier de la bibliothèque ne peuvent pas porter le même nom";

export function safeLibraryPath(path: string): string {
  if (path === "") return "";
  const bad = path.includes("\\") || path.includes(":") || path.startsWith("/") ||
    path.split("/").some((s) => s === "" || s.startsWith("."));
  if (bad) throw new Error(`${UNSAFE_PATH_MESSAGE} : ${path.slice(0, 120)}`);
  return path;
}

const nonEmpty = (path: string): string => {
  if (safeLibraryPath(path) === "") throw new Error(`${UNSAFE_PATH_MESSAGE} : racine`);
  return path;
};
const parentsOf = (path: string): string[] => {
  const segs = path.split("/");
  return segs.slice(0, -1).map((_, i) => segs.slice(0, i + 1).join("/"));
};
const inside = (path: string, dir: string): boolean => dir === "" || path === dir || path.startsWith(`${dir}/`);
const sorted = (xs: LibraryPath[]): LibraryPath[] => xs.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
const clearable = (root: LibraryRoot): void => {
  if (root === "shared") throw new Error(CLEAR_REFUSED_MESSAGE);
};

/** C9 : `path` (dossier si `dir`) et ses parents ne heurtent aucune entrée de l'autre sorte. `isDir` : vrai dossier, faux
 *  fichier, undefined absent. */
function assertFree(path: string, dir: boolean, isDir: (p: string) => boolean | undefined): void {
  for (const p of parentsOf(path)) if (isDir(p) === false) throw new Error(`${PATH_CONFLICT_MESSAGE} : ${p.slice(0, 120)}`);
  if (isDir(path) === !dir) throw new Error(`${PATH_CONFLICT_MESSAGE} : ${path.slice(0, 120)}`);
}

export function createMemoryLibraryFiles(root: LibraryRoot): LibraryFiles {
  const files = new Map<string, Blob>();
  const dirs = new Set<string>();
  const isDir = (p: string): boolean | undefined => (dirs.has(p) ? true : files.has(p) ? false : undefined);
  async function clear(): Promise<void> {
    clearable(root);
    files.clear();
    dirs.clear();
  }
  return {
    root,
    async list() {
      return sorted([...[...dirs].map((path) => ({ path, dir: true })), ...[...files.keys()].map((path) => ({ path, dir: false }))]);
    },
    async read(path) {
      const b = files.get(nonEmpty(path));
      if (b === undefined) throw new Error(`ressource introuvable : ${path}`);
      return b;
    },
    async write(path, data) {
      assertFree(nonEmpty(path), false, isDir);
      for (const p of parentsOf(path)) dirs.add(p);
      files.set(path, new Blob([data], { type: data.type }));
    },
    async mkdir(path) {
      assertFree(nonEmpty(path), true, isDir);
      for (const p of [...parentsOf(path), path]) dirs.add(p);
    },
    async remove(path) {
      if (safeLibraryPath(path) === "") return clear();
      for (const k of [...files.keys()]) if (inside(k, path)) files.delete(k);
      for (const k of [...dirs]) if (inside(k, path)) dirs.delete(k);
    },
    clear,
  };
}

/** Magasin des chemins : tout ce que `list()` lit, jamais d'octets (C1). */
const ENTRIES = "entrees";
/** Magasin du contenu, fichiers seulement, lu par `read`. */
const BYTES = "octets";
const STORES = [ENTRIES, BYTES];
interface Entry {
  readonly dir: boolean;
}
interface Bytes {
  readonly bytes: Uint8Array;
  readonly type: string;
}

/** D31 : stockage durable demandé s'il existe ; absent, refusé ou en échec : faux, jamais de rejet (H1-7). */
export async function requestPersistence(nav: { readonly storage?: { persist?(): Promise<boolean> } } | undefined = globalThis.navigator): Promise<boolean> {
  try {
    return (await nav?.storage?.persist?.()) === true;
  } catch {
    return false;
  }
}

export function createIdbLibraryFiles(factory: IDBFactory, root: LibraryRoot, name: string = LIBRARY_DB, persist: () => Promise<boolean> = () => requestPersistence()): LibraryFiles {
  // Version 2 : la base v1 (magasin unique `fichiers`, jamais livrée) est remplacée sans migration (C1).
  const open = lazyDb(factory, name, 2, (d) => {
    for (const s of Array.from(d.objectStoreNames)) if (!STORES.includes(s)) d.deleteObjectStore(s);
    for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
  });
  let asked = false;
  const key = (path: string): string => `${root}/${path}`;
  const below = (path: string): IDBKeyRange => IDBKeyRange.bound(`${key(path)}/`, `${key(path)}/\uffff`);
  const all = IDBKeyRange.bound(`${root}/`, `${root}/\uffff`);
  const tx = async (stores: string[], mode: IDBTransactionMode) => (await open()).transaction(stores, mode);
  /** C9 : sorte des parents et de `path`, lue dans la transaction d'écriture avant toute écriture. */
  const free = async (entries: IDBObjectStore, path: string, dir: boolean): Promise<void> => {
    const paths = [...parentsOf(path), path];
    const rows = await Promise.all(paths.map((p) => result(entries.get(key(p))) as Promise<Entry | undefined>));
    const kinds = new Map(paths.map((p, i) => [p, rows[i]?.dir] as const));
    assertFree(path, dir, (p) => kinds.get(p));
  };
  async function clear(): Promise<void> {
    clearable(root);
    const t = await tx(STORES, "readwrite");
    for (const s of STORES) t.objectStore(s).delete(all);
    await finished(t);
  }
  return {
    root,
    async list() {
      const store = (await tx([ENTRIES], "readonly")).objectStore(ENTRIES);
      const [keys, rows] = await Promise.all([result(store.getAllKeys(all)), result(store.getAll(all))]);
      return sorted(keys.map((k, i) => ({ path: String(k).slice(root.length + 1), dir: (rows[i] as Entry).dir })));
    },
    async read(path) {
      const t = await tx([BYTES], "readonly");
      const row = (await result(t.objectStore(BYTES).get(key(nonEmpty(path))))) as Bytes | undefined;
      if (row === undefined) throw new Error(`ressource introuvable : ${path}`);
      return new Blob([row.bytes as BlobPart], { type: row.type });
    },
    async write(path, data) {
      nonEmpty(path);
      if (!asked) {
        asked = true;
        void persist();
      }
      const bytes = new Uint8Array(await data.arrayBuffer()); // lu avant la transaction (elle se ferme à la première attente)
      const t = await tx(STORES, "readwrite");
      const entries = t.objectStore(ENTRIES);
      await free(entries, path, false);
      for (const p of parentsOf(path)) entries.put({ dir: true } satisfies Entry, key(p));
      entries.put({ dir: false } satisfies Entry, key(path));
      t.objectStore(BYTES).put({ bytes, type: data.type } satisfies Bytes, key(path));
      await finished(t);
    },
    async mkdir(path) {
      nonEmpty(path);
      const t = await tx([ENTRIES], "readwrite");
      const entries = t.objectStore(ENTRIES);
      await free(entries, path, true);
      for (const p of [...parentsOf(path), path]) entries.put({ dir: true } satisfies Entry, key(p));
      await finished(t);
    },
    async remove(path) {
      if (safeLibraryPath(path) === "") return clear();
      const t = await tx(STORES, "readwrite");
      for (const s of STORES) {
        t.objectStore(s).delete(key(path));
        t.objectStore(s).delete(below(path));
      }
      await finished(t);
    },
    clear,
  };
}

export function createTauriLibraryFiles(fs: TauriFs & TauriDirFs, rootPath: string, root: LibraryRoot): LibraryFiles {
  const at = (path: string): string => (path === "" ? rootPath : `${rootPath}/${path}`);
  let made: Promise<void> | null = null;
  const ready = (): Promise<void> => (made ??= fs.mkdir(rootPath, { recursive: true }).catch((e: unknown) => {
    made = null;
    throw e;
  }));
  async function walk(dir: string, out: LibraryPath[]): Promise<void> {
    for (const e of await fs.readDir(at(dir))) {
      if (e.name.startsWith(".")) continue; // fichiers cachés du système (.DS_Store) : jamais des ressources
      const path = dir === "" ? e.name : `${dir}/${e.name}`;
      out.push({ path, dir: e.isDirectory });
      if (e.isDirectory) await walk(path, out);
    }
  }
  /** C9 : un échec de `fs` est relu, et dit comme les autres réalisations quand c'est un conflit fichier/dossier. */
  async function orConflict(path: string, dir: boolean, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (e) {
      const kinds = new Map<string, boolean>();
      for (const p of [...parentsOf(path), path]) {
        const cut = p.lastIndexOf("/");
        const entries = await fs.readDir(at(cut < 0 ? "" : p.slice(0, cut))).catch(() => null);
        const hit = entries?.find((x) => x.name === p.slice(cut + 1));
        if (hit === undefined) break;
        kinds.set(p, hit.isDirectory);
      }
      assertFree(path, dir, (p) => kinds.get(p));
      throw e;
    }
  }
  async function clear(): Promise<void> {
    clearable(root);
    await ready();
    for (const e of await fs.readDir(rootPath)) if (!e.name.startsWith(".")) await fs.remove(`${rootPath}/${e.name}`, { recursive: true });
  }
  return {
    root,
    async list() {
      await ready();
      const out: LibraryPath[] = [];
      await walk("", out);
      return sorted(out);
    },
    async read(path) {
      return new Blob([(await fs.readFile(at(nonEmpty(path)))) as BlobPart]);
    },
    async write(path, data) {
      nonEmpty(path);
      await ready();
      const bytes = new Uint8Array(await data.arrayBuffer());
      const parents = parentsOf(path);
      await orConflict(path, false, async () => {
        if (parents.length > 0) await fs.mkdir(at(parents[parents.length - 1]!), { recursive: true });
        await fs.writeFile(at(path), bytes);
      });
    },
    async mkdir(path) {
      nonEmpty(path);
      await ready();
      await orConflict(path, true, () => fs.mkdir(at(path), { recursive: true }));
    },
    async remove(path) {
      if (safeLibraryPath(path) === "") return clear();
      await ready();
      await fs.remove(at(path), { recursive: true });
    },
    clear,
  };
}
