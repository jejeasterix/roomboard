/**
 * Hôte Chromium (D26, DA8) : File System Access. La poignée rendue par la boîte est gardée dans la cible : Ctrl+S
 * réécrit le même fichier sans boîte ; si la permission est refusée, la boîte d'enregistrement s'ouvre.
 */
import {
  ensureExtension,
  hasErrorName,
  IMPORT_EXTENSIONS,
  IMPORT_FILTER,
  ROOMBOARD_EXTENSION,
  ROOMBOARD_MIME,
  type DroppedFile,
  type FileHandleLike,
  type FileHost,
  type OpenedFile,
  type SaveTarget,
} from "./files";
import { listenWebDrop, type DropTargetLike } from "./drop-web";

export interface PickerType {
  readonly description: string;
  readonly accept: Readonly<Record<string, readonly string[]>>;
}

export interface FsaWindow {
  showOpenFilePicker(o: { multiple: boolean; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<readonly FileHandleLike[]>;
  showSaveFilePicker(o: { suggestedName: string; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<FileHandleLike>;
}

export const FSA_TYPES: readonly PickerType[] = [
  { description: "Document RoomBoard", accept: { [ROOMBOARD_MIME]: [ROOMBOARD_EXTENSION] } },
];

/** Filtre de « Importer » (R18) : documents RoomBoard et images d'U33. */
export const IMPORT_TYPES: readonly PickerType[] = [
  {
    description: IMPORT_FILTER.name,
    accept: {
      [ROOMBOARD_MIME]: [ROOMBOARD_EXTENSION],
      "image/*": IMPORT_EXTENSIONS.filter((e) => e !== "roomboard").map((e) => `.${e}`),
    },
  },
];

export function isAbort(e: unknown): boolean {
  return hasErrorName(e, "AbortError");
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

export function createFsaHost(w: FsaWindow, dropTarget: DropTargetLike | null = null): FileHost {
  return {
    kind: "fsa",
    onDrop: (h) => listenWebDrop(dropTarget, h),
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
    async pick(): Promise<DroppedFile[]> {
      let handles: readonly FileHandleLike[];
      try {
        handles = await w.showOpenFilePicker({ multiple: true, excludeAcceptAllOption: false, types: IMPORT_TYPES });
      } catch (e) {
        if (isAbort(e)) return [];
        throw e;
      }
      return Promise.all(
        handles.map(async (h) => {
          const bytes = new Uint8Array(await (await h.getFile()).arrayBuffer());
          return { name: h.name, size: bytes.byteLength, mime: "", blob: async () => new Blob([bytes]) };
        }),
      );
    },
    async save(encode: () => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null> {
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
      await writeAll(handle, await encode());
      return { kind: "fsa", name: handle.name, handle };
    },
  };
}
