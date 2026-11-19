/**
 * Hôte Chromium (D26, DA8) : File System Access. La poignée rendue par la boîte est gardée dans la cible : Ctrl+S
 * réécrit le même fichier sans boîte ; si la permission est refusée, la boîte d'enregistrement s'ouvre.
 */
import {
  ensureExtension,
  ROOMBOARD_EXTENSION,
  ROOMBOARD_MIME,
  type FileHandleLike,
  type FileHost,
  type OpenedFile,
  type SaveTarget,
} from "./files";

export interface PickerType {
  readonly description: string;
  readonly accept: Readonly<Record<string, readonly string[]>>;
}

export interface FsaWindow {
  showOpenFilePicker(o: { multiple: false; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<readonly FileHandleLike[]>;
  showSaveFilePicker(o: { suggestedName: string; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<FileHandleLike>;
}

export const FSA_TYPES: readonly PickerType[] = [
  { description: "Document RoomBoard", accept: { [ROOMBOARD_MIME]: [ROOMBOARD_EXTENSION] } },
];

export function isAbort(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "AbortError";
}

async function writable(handle: FileHandleLike): Promise<boolean> {
  try {
    if (!handle.queryPermission) return true;
    if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
    if (!handle.requestPermission) return false;
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

async function writeAll(handle: FileHandleLike, bytes: Uint8Array): Promise<void> {
  const w = await handle.createWritable();
  try {
    await w.write(bytes);
  } catch (e) {
    if (w.abort) await w.abort(e).catch(() => undefined);
    throw e;
  }
  await w.close();
}

export function createFsaHost(w: FsaWindow): FileHost {
  return {
    kind: "fsa",
    async open(): Promise<OpenedFile | null> {
      let handles: readonly FileHandleLike[];
      try {
        handles = await w.showOpenFilePicker({ multiple: false, excludeAcceptAllOption: false, types: FSA_TYPES });
      } catch (e) {
        if (isAbort(e)) return null;
        throw e;
      }
      const handle = handles[0];
      if (handle === undefined) return null;
      const file = await handle.getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      return { name: handle.name, bytes, target: { kind: "fsa", name: handle.name, handle } };
    },
    async save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null> {
      let handle: FileHandleLike | null = target.kind === "fsa" && (await writable(target.handle)) ? target.handle : null;
      if (handle === null) {
        try {
          handle = await w.showSaveFilePicker({
            suggestedName: ensureExtension(target.name),
            excludeAcceptAllOption: false,
            types: FSA_TYPES,
          });
        } catch (e) {
          if (isAbort(e)) return null;
          throw e;
        }
      }
      await writeAll(handle, bytes);
      return { kind: "fsa", name: handle.name, handle };
    },
  };
}
