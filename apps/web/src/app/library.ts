/**
 * Bibliothèque de ressources (C4, DA2) : index en mémoire au-dessus de `LibraryFiles` (une par racine), dossiers,
 * recherche (nom, mots-clés, description ; sans casse ni accents, D11), ajout (`<nom>.rbitem`, compagnon
 * `<nom>.rbitem.json`, vignette `<nom>.rbitem.png`, D5), export et import de paquets `.rbpack` (D17 à D19). Le paquet
 * est lu et contrôlé en entier avant la première écriture (`readPack`, puis `safeLibraryPath` sur chaque chemin), dans
 * un dossier neuf de « Mes ressources » (nom jugé sur le stockage relu), défait si une écriture échoue en route
 * (seuls les chemins écrits par l'import sont retirés) : jamais de bibliothèque à moitié
 * importée (même patron que `zip3dHandler`, `platform/model3d-handlers.ts`).
 */
import { safeLibraryPath, type LibraryFiles, type LibraryRoot } from "../platform/library-files";
import { ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "../platform/model3d-import";
import { buildPack, PACK_NOT_ROOMBOARD_MESSAGE, PACK_UNSAFE_PATH_MESSAGE, readPack, type PackItem, type PackItemKind, type ZipFile } from "../platform/rbpack";
import type { ZipEntry } from "../platform/zip-read";

export type ResourceKind = PackItemKind;
export interface ResourceEntry {
  readonly root: LibraryRoot;
  readonly path: string;
  readonly folder: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly kind: ResourceKind | null;
  readonly thumbnail: string | null;
}
export interface LibraryFolder {
  readonly root: LibraryRoot;
  readonly path: string;
  readonly folders: readonly string[];
  readonly items: readonly ResourceEntry[];
}
export interface CapturedResource {
  readonly bytes: Uint8Array;
  readonly kind: ResourceKind;
  readonly thumbnail: Blob | null;
}
export interface NewResource extends CapturedResource {
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
}
export interface LibraryZip {
  unzip(blob: Blob): Promise<readonly ZipEntry[]>;
  zip(files: readonly ZipFile[]): Promise<Uint8Array>;
}
export interface LibraryDeps {
  readonly files: readonly LibraryFiles[];
  readonly zip: LibraryZip;
  now(): string;
  readonly appVersion: string;
}
export interface ResourceLibrary {
  roots(): readonly LibraryRoot[];
  setRoot(files: LibraryFiles): void;
  refresh(): Promise<void>;
  folder(root: LibraryRoot, path: string): LibraryFolder;
  search(q: string): readonly ResourceEntry[];
  add(root: LibraryRoot, folder: string, r: NewResource): Promise<ResourceEntry>;
  read(entry: ResourceEntry): Promise<Uint8Array>;
  thumbnail(entry: ResourceEntry): Promise<Blob | null>;
  mkdir(root: LibraryRoot, parent: string, name: string): Promise<string>;
  remove(root: LibraryRoot, path: string): Promise<void>;
  exportPack(root: LibraryRoot, folder: string): Promise<{ readonly name: string; readonly bytes: Uint8Array }>;
  importPack(bytes: Uint8Array, fileName: string): Promise<{ readonly folder: string; readonly count: number }>;
}

export const ROOT_LABELS: Readonly<Record<LibraryRoot, string>> = Object.freeze({ mine: "Mes ressources", shared: "Ressources partagées" });
const EXT = ".rbitem";
const NAME_MAX = 80;
/** Diacritiques combinants, la classe de `slug` (`profile-file.ts:20`). */
const MARKS = /[̀-ͯ]/g;

export const normalizeSearch = (s: string): string => s.normalize("NFD").replace(MARKS, "").toLowerCase();

/** D25 : nom de fichier d'une ressource, au patron `slug` de `profile-file.ts:17` (sans accents, minuscules,
 *  `[a-z0-9-]`), 80 caractères au plus, vide → `ressource` ; le nom affiché reste dans le compagnon `.json`. */
export function fileNameOf(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, NAME_MAX)
    .replace(/-+$/, "");
  return s === "" ? "ressource" : s;
}

/** D25 : nom de dossier : casse et accents gardés ; `/ \ : * ? " < > |` et un point initial → `_` ; vide → `Dossier`. */
export function folderNameOf(name: string): string {
  const s = name.trim().replace(/[/\\:*?"<>|\u0000-\u001f]/g, "_").replace(/^\./, "_").slice(0, NAME_MAX);
  return s === "" ? "Dossier" : s;
}

/** D27 : mêmes limites qu'à l'import (`ZIP_MAX_ENTRIES`, `ZIP_MAX_BYTES`). */
export const PACK_TOO_BIG_MESSAGE = "paquet trop gros (plus de 1 000 entrées ou de 256 Mio) : exportez un dossier plus petit";

const join = (folder: string, name: string): string => (folder === "" ? name : name === "" ? folder : `${folder}/${name}`);
const parentOf = (path: string): string => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
const baseOf = (path: string): string => path.slice(path.lastIndexOf("/") + 1);
const within = (p: string, dir: string): boolean => dir === "" || p === dir || p.startsWith(`${dir}/`);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const byName = (a: ResourceEntry, b: ResourceEntry): number => a.name.localeCompare(b.name, "fr") || (a.path < b.path ? -1 : 1);
const bytesOf = async (b: Blob): Promise<Uint8Array> => new Uint8Array(await b.arrayBuffer());

interface RootIndex {
  readonly files: LibraryFiles;
  dirs: Set<string>;
  entries: ResourceEntry[];
}

export function createResourceLibrary(deps: LibraryDeps): ResourceLibrary {
  const index = new Map<LibraryRoot, RootIndex>();
  for (const f of deps.files) index.set(f.root, { files: f, dirs: new Set(), entries: [] });
  const of = (root: LibraryRoot): RootIndex => {
    const r = index.get(root);
    if (r === undefined) throw new Error(`racine absente : ${root}`);
    return r;
  };

  async function load(r: RootIndex): Promise<void> {
    const listed = await r.files.list();
    const present = new Set(listed.filter((p) => !p.dir).map((p) => p.path));
    const entries: ResourceEntry[] = [];
    for (const p of listed) {
      if (p.dir || !p.path.endsWith(EXT)) continue;
      let meta: Record<string, unknown> = {};
      if (present.has(`${p.path}.json`)) {
        try {
          const raw: unknown = JSON.parse(new TextDecoder().decode(await bytesOf(await r.files.read(`${p.path}.json`))));
          if (isRecord(raw)) meta = raw;
        } catch {
          // compagnon illisible : ressource gardée, sans mots-clés (H2-4)
        }
      }
      const kind = meta["kind"] === "grid" || meta["kind"] === "fragment" ? meta["kind"] : null;
      entries.push({
        root: r.files.root,
        path: p.path,
        folder: parentOf(p.path),
        name: typeof meta["name"] === "string" && meta["name"] !== "" ? meta["name"] : baseOf(p.path).slice(0, -EXT.length),
        keywords: Array.isArray(meta["keywords"]) ? meta["keywords"].filter((k): k is string => typeof k === "string") : [],
        description: typeof meta["description"] === "string" ? meta["description"] : "",
        kind,
        thumbnail: present.has(`${p.path}.png`) ? `${p.path}.png` : null,
      });
    }
    r.dirs = new Set(listed.filter((p) => p.dir).map((p) => p.path));
    r.entries = entries;
  }

  const taken = (r: RootIndex, path: string): boolean => r.dirs.has(path) || r.entries.some((e) => e.path === path);
  function unique(r: RootIndex, folder: string, base: string, suffix: string): string {
    for (let n = 1; ; n++) {
      const candidate = join(folder, n === 1 ? `${base}${suffix}` : `${base} (${n})${suffix}`);
      if (!taken(r, candidate)) return candidate;
    }
  }
  const addDirs = (r: RootIndex, path: string): void => {
    for (let p = path; p !== ""; p = parentOf(p)) r.dirs.add(p);
  };
  /** Retire de l'index tout ce qui est sous `path` (le stockage est traité par l'appelant). */
  const forget = (r: RootIndex, path: string): void => {
    r.dirs = new Set([...r.dirs].filter((d) => !within(d, path)));
    r.entries = r.entries.filter((e) => !within(e.path, path));
  };

  async function write(r: RootIndex, folder: string, x: NewResource, written?: string[]): Promise<ResourceEntry> {
    const path = unique(r, folder, fileNameOf(x.name), EXT);
    written?.push(path, `${path}.json`, `${path}.png`);
    await r.files.write(path, new Blob([x.bytes as BlobPart], { type: "application/x-roomboard-item" }));
    const companion = { name: x.name, keywords: [...x.keywords], description: x.description, kind: x.kind };
    await r.files.write(`${path}.json`, new Blob([JSON.stringify(companion, null, 2)], { type: "application/json" }));
    if (x.thumbnail !== null) await r.files.write(`${path}.png`, x.thumbnail);
    const entry: ResourceEntry = {
      root: r.files.root,
      path,
      folder,
      name: x.name,
      keywords: [...x.keywords],
      description: x.description,
      kind: x.kind,
      thumbnail: x.thumbnail === null ? null : `${path}.png`,
    };
    addDirs(r, folder);
    r.entries = [...r.entries, entry];
    return entry;
  }

  return {
    roots: () => [...index.keys()],
    setRoot(files) {
      index.set(files.root, { files, dirs: new Set(), entries: [] });
    },
    async refresh() {
      await Promise.all([...index.values()].map(load));
    },
    folder(root, path) {
      const r = of(root);
      return {
        root,
        path,
        folders: [...r.dirs].filter((d) => parentOf(d) === path && d !== path).sort((a, b) => a.localeCompare(b, "fr")),
        items: r.entries.filter((e) => e.folder === path).sort(byName),
      };
    },
    search(q) {
      const n = normalizeSearch(q).trim();
      if (n === "") return [];
      const all = [...index.values()].flatMap((r) => r.entries);
      return all.filter((e) => normalizeSearch(`${e.name} ${e.keywords.join(" ")} ${e.description}`).includes(n)).sort(byName);
    },
    add: (root, folder, r) => write(of(root), folder, r),
    async read(entry) {
      return bytesOf(await of(entry.root).files.read(entry.path));
    },
    async thumbnail(entry) {
      if (entry.thumbnail === null) return null;
      const b = await of(entry.root).files.read(entry.thumbnail);
      return b.type === "image/png" ? b : new Blob([b], { type: "image/png" });
    },
    async mkdir(root, parent, name) {
      const r = of(root);
      const path = unique(r, parent, folderNameOf(name), "");
      await r.files.mkdir(path);
      addDirs(r, path);
      return path;
    },
    async remove(root, path) {
      const r = of(root);
      try {
        await r.files.remove(path);
        // une ressource seule : ses fichiers compagnons partent avec elle
        if (path.endsWith(EXT)) {
          for (const extra of [`${path}.json`, `${path}.png`]) await r.files.remove(extra).catch(() => undefined);
        }
      } catch (e) {
        // échec en route : l'index est relu pour rester cohérent avec ce que le stockage contient vraiment
        await load(r).catch(() => undefined);
        throw e;
      }
      forget(r, path);
    },
    async exportPack(root, folder) {
      const r = of(root);
      const prefix = folder === "" ? "" : `${folder}/`;
      const chosen = r.entries.filter((e) => folder === "" || e.path.startsWith(prefix));
      // D27 : le compte d'entrées est connu par l'index, avant toute lecture ; les octets après.
      const count = 1 + chosen.length + chosen.filter((e) => e.thumbnail !== null).length;
      if (count > ZIP_MAX_ENTRIES) throw new Error(PACK_TOO_BIG_MESSAGE);
      const items: PackItem[] = [];
      for (const e of chosen) {
        items.push({
          path: e.path.slice(prefix.length, -EXT.length),
          name: e.name,
          keywords: e.keywords,
          description: e.description,
          kind: e.kind ?? "fragment",
          bytes: await bytesOf(await r.files.read(e.path)),
          thumbnail: e.thumbnail === null ? null : await bytesOf(await r.files.read(e.thumbnail)),
        });
      }
      const name = folder === "" ? ROOT_LABELS[root] : baseOf(folder);
      const files = buildPack(name, items, { appVersion: deps.appVersion, now: deps.now() });
      const total = files.reduce((n, f) => n + f.bytes.length, 0);
      if (files.length > ZIP_MAX_ENTRIES || total > ZIP_MAX_BYTES) throw new Error(PACK_TOO_BIG_MESSAGE);
      return { name: `${folderNameOf(name)}.rbpack`, bytes: await deps.zip.zip(files) };
    },
    async importPack(bytes, fileName) {
      // 1. Tout le paquet est lu et contrôlé : aucune écriture tant qu'un refus reste possible (D18, D32).
      let entries: readonly ZipEntry[];
      try {
        entries = await deps.zip.unzip(new Blob([bytes as BlobPart]));
      } catch (e) {
        // ZIP illisible (fflate : « invalid zip data ») : message du paquet ; les limites gardent le leur (D27).
        if (e instanceof Error && e.message === ZIP_TOO_BIG_MESSAGE) throw e;
        throw new Error(PACK_NOT_ROOMBOARD_MESSAGE);
      }
      const files: ZipFile[] = [];
      for (const e of entries) files.push({ path: e.path, bytes: await bytesOf(e.blob) });
      const pack = readPack(files);
      for (const i of pack.items) {
        try {
          safeLibraryPath(i.path); // D32 : le seul contrôle des chemins, aucun second normaliseur
        } catch {
          throw new Error(PACK_UNSAFE_PATH_MESSAGE);
        }
      }
      // 2. Dossier neuf de « Mes ressources », retiré en entier si une écriture échoue en route.
      const r = of("mine");
      await load(r); // l'index en mémoire peut être vide ou périmé : le nom libre se juge sur le stockage
      const folder = unique(r, "", folderNameOf(pack.name || fileName.replace(/\.rbpack$/i, "")), "");
      const written: string[] = [];
      try {
        await r.files.mkdir(folder);
        addDirs(r, folder);
        for (const i of pack.items) {
          await write(r, join(folder, parentOf(i.path)), {
            bytes: i.bytes,
            kind: i.kind,
            thumbnail: i.thumbnail === null ? null : new Blob([i.thumbnail as BlobPart], { type: "image/png" }),
            name: i.name,
            keywords: i.keywords,
            description: i.description,
          }, written);
        }
      } catch (e) {
        // seulement ce que cet import a écrit ; le dossier (neuf) part s'il ne contient plus aucun fichier
        for (const p of written) await r.files.remove(p).catch(() => undefined);
        const left = await r.files.list().catch(() => null);
        if (left === null || !left.some((p) => !p.dir && within(p.path, folder))) await r.files.remove(folder).catch(() => undefined);
        await load(r).catch(() => forget(r, folder));
        throw e;
      }
      return { folder, count: pack.items.length };
    },
  };
}
