/**
 * Stockage de la bibliothèque (C4, DA1) : une racine, chemins relatifs `/`. Trois réalisations : mémoire (tests, repli
 * sans IndexedDB), IndexedDB (web, base `roomboard-bibliotheque`, magasin `fichiers`, clé `<racine>/<chemin>`) et
 * `plugin-fs` (coque, dossier réel). Tout chemin passe par `safeLibraryPath` avant d'atteindre le stockage (H1-4).
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
  remove(path: string): Promise<void>;
}

export const LIBRARY_DB = "roomboard-bibliotheque";
const STORE = "fichiers";
export const UNSAFE_PATH_MESSAGE = "chemin de bibliothèque refusé";

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

export function createMemoryLibraryFiles(root: LibraryRoot): LibraryFiles {
  const files = new Map<string, Blob>();
  const dirs = new Set<string>();
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
      nonEmpty(path);
      for (const p of parentsOf(path)) dirs.add(p);
      files.set(path, new Blob([data], { type: data.type }));
    },
    async mkdir(path) {
      nonEmpty(path);
      for (const p of [...parentsOf(path), path]) dirs.add(p);
    },
    async remove(path) {
      safeLibraryPath(path);
      for (const k of [...files.keys()]) if (inside(k, path)) files.delete(k);
      for (const k of [...dirs]) if (inside(k, path)) dirs.delete(k);
    },
  };
}

interface Row {
  readonly dir: boolean;
  readonly bytes?: Uint8Array;
  readonly type?: string;
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
  const open = lazyDb(factory, name, 1, (d) => void d.createObjectStore(STORE));
  let asked = false;
  const key = (path: string): string => `${root}/${path}`;
  const all = IDBKeyRange.bound(`${root}/`, `${root}/￿`);
  const tx = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode);
  return {
    root,
    async list() {
      const t = await tx("readonly");
      const store = t.objectStore(STORE);
      const [keys, rows] = await Promise.all([result(store.getAllKeys(all)), result(store.getAll(all))]);
      return sorted(keys.map((k, i) => ({ path: String(k).slice(root.length + 1), dir: (rows[i] as Row).dir })));
    },
    async read(path) {
      const t = await tx("readonly");
      const row = (await result(t.objectStore(STORE).get(key(nonEmpty(path))))) as Row | undefined;
      if (row === undefined || row.dir || row.bytes === undefined) throw new Error(`ressource introuvable : ${path}`);
      return new Blob([row.bytes as BlobPart], { type: row.type ?? "" });
    },
    async write(path, data) {
      nonEmpty(path);
      if (!asked) {
        asked = true;
        void persist();
      }
      const bytes = new Uint8Array(await data.arrayBuffer()); // lu avant la transaction (elle se ferme à la première attente)
      const t = await tx("readwrite");
      const store = t.objectStore(STORE);
      for (const p of parentsOf(path)) store.put({ dir: true } satisfies Row, key(p));
      store.put({ dir: false, bytes, type: data.type } satisfies Row, key(path));
      await finished(t);
    },
    async mkdir(path) {
      nonEmpty(path);
      const t = await tx("readwrite");
      const store = t.objectStore(STORE);
      for (const p of [...parentsOf(path), path]) store.put({ dir: true } satisfies Row, key(p));
      await finished(t);
    },
    async remove(path) {
      safeLibraryPath(path);
      const t = await tx("readwrite");
      const store = t.objectStore(STORE);
      if (path === "") store.delete(all);
      else {
        store.delete(key(path));
        store.delete(IDBKeyRange.bound(`${key(path)}/`, `${key(path)}/￿`));
      }
      await finished(t);
    },
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
      const parents = parentsOf(path);
      if (parents.length > 0) await fs.mkdir(at(parents[parents.length - 1]!), { recursive: true });
      await fs.writeFile(at(path), new Uint8Array(await data.arrayBuffer()));
    },
    async mkdir(path) {
      await ready();
      await fs.mkdir(at(nonEmpty(path)), { recursive: true });
    },
    async remove(path) {
      safeLibraryPath(path);
      await ready();
      if (path !== "") return fs.remove(at(path), { recursive: true });
      for (const e of await fs.readDir(rootPath)) if (!e.name.startsWith(".")) await fs.remove(`${rootPath}/${e.name}`, { recursive: true });
    },
  };
}
