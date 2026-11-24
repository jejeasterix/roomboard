/**
 * Bibliothèque de ressources sur disque (cadrage cli-lot2, DA9, D26, H13, H18) : `createResourceLibrary` et
 * `createTauriLibraryFiles` du produit sur un port `node:fs` (disposition de la coque : `<nom>.rbitem`, `.rbitem.json`,
 * `.rbitem.png`) ; racine « mine » seule ; ZIP des paquets par `zipJobReply` dans ce processus (D20).
 */
import { mkdir, readdir, rm } from "node:fs/promises";
import { basename } from "node:path";
import type { ContainerCodec } from "../../web/src/platform/container";
import type { CoreFactory } from "../../web/src/core/api";
import { createResourceLibrary, importedMessage, resourceKindReader, type LibraryZip, type ResourceLibrary } from "../../web/src/app/library";
import { APP_VERSION } from "../../web/src/platform/controller";
import type { TauriDirFs, TauriFs } from "../../web/src/platform/host-tauri";
import { createTauriLibraryFiles } from "../../web/src/platform/library-files";
import { inlineWorker } from "../../web/src/platform/one-shot-worker";
import { createZipReader, createZipWriter } from "../../web/src/platform/zip-read";
import { zipJobReply, type ZipJob } from "../../web/src/platform/zip-worker";
import { asCliError, CliError } from "./contract";
import { readBytes, writeAtomic } from "./disk";
import { extOf } from "./formats";

export const nodeDirFs: TauriFs & TauriDirFs = {
  readFile: readBytes,
  writeFile: writeAtomic,
  readDir: async (path) => (await readdir(path, { withFileTypes: true })).map((d) => ({ name: d.name, isDirectory: d.isDirectory() })),
  mkdir: async (path, o) => {
    await mkdir(path, o);
  },
  remove: async (path, o) => {
    await rm(path, { ...o, force: true });
  },
};

export function nodeZip(): LibraryZip {
  const spawn = inlineWorker((m) => zipJobReply(m as ZipJob));
  return { unzip: createZipReader(spawn, undefined, "pack"), zip: createZipWriter(spawn) };
}

export interface CliLibraryDeps {
  readonly core: CoreFactory;
  readonly codec: Pick<ContainerCodec, "read">;
  now(): string;
}

export function openLibrary(dir: string, deps: CliLibraryDeps): ResourceLibrary {
  return createResourceLibrary({
    files: [createTauriLibraryFiles(nodeDirFs, dir, "mine")],
    zip: nodeZip(),
    now: () => deps.now(),
    appVersion: APP_VERSION,
    kindOf: resourceKindReader(deps.core, deps.codec),
  });
}

export interface LibraryItem {
  readonly path: string;
  readonly name: string;
  readonly kind: string | null;
  readonly keywords: readonly string[];
  readonly description: string;
}

const needPack = (path: string, what: string): void => {
  if (extOf(path) !== ".rbpack") throw new CliError("usage", `library ${what} : ${basename(path)} : un paquet .rbpack est attendu`);
};

export async function libraryList(lib: ResourceLibrary, folder: string): Promise<{ folder: string; folders: readonly string[]; items: LibraryItem[] }> {
  try {
    await lib.refresh();
    const f = lib.folder("mine", folder);
    return { folder, folders: f.folders, items: f.items.map((i) => ({ path: i.path, name: i.name, kind: i.kind, keywords: i.keywords, description: i.description })) };
  } catch (e) {
    throw asCliError(e, "command");
  }
}

export async function libraryImport(lib: ResourceLibrary, pack: string): Promise<{ folder: string; count: number; notices: string[] }> {
  needPack(pack, "import");
  const bytes = await readBytes(pack);
  const name = basename(pack);
  try {
    const r = await lib.importPack(bytes, name);
    return { folder: r.folder, count: r.count, notices: [importedMessage(name, r)] };
  } catch (e) {
    throw asCliError(e, "command");
  }
}

export async function libraryExport(lib: ResourceLibrary, out: string, folder: string): Promise<{ file: string; name: string; skipped: readonly string[] }> {
  needPack(out, "export");
  let r: { readonly name: string; readonly bytes: Uint8Array; readonly skipped: readonly string[] };
  try {
    await lib.refresh();
    r = await lib.exportPack("mine", folder);
  } catch (e) {
    throw asCliError(e, "command");
  }
  await writeAtomic(out, r.bytes);
  return { file: out, name: r.name, skipped: r.skipped };
}
