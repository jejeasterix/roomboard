/**
 * Hôte Chromium (D26, DA8) : File System Access. La poignée rendue par la boîte est gardée dans la cible : Ctrl+S
 * réécrit le même fichier sans boîte ; si la permission est refusée, la boîte d'enregistrement s'ouvre.
 */
import {
  ensureExtension,
  hasErrorName,
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  IMPORT_FILTER,
  RBITEM_EXTENSION,
  PDF_EXTENSION,
  PDF_MIME,
  RBITEM_MIME,
  ROOMBOARD_EXTENSION,
  ROOMBOARD_MIME,
  VIDEO_EXTENSIONS,
  type DroppedFile,
  type FileHandleLike,
  type FileHost,
  type OpenedFile,
  type SaveTarget,
} from "./files";
import { droppedFromFile, listenWebDrop, type DropTargetLike } from "./drop-web";

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

/** Filtre de « Importer » (R18) : documents RoomBoard, PDF (PF3) et images d'U33. */
export const IMPORT_TYPES: readonly PickerType[] = [
  {
    description: IMPORT_FILTER.name,
    accept: {
      [ROOMBOARD_MIME]: [ROOMBOARD_EXTENSION],
      [RBITEM_MIME]: [RBITEM_EXTENSION],
      [PDF_MIME]: [PDF_EXTENSION],
      "image/*": IMAGE_EXTENSIONS.map((e) => `.${e}`),
      "video/*": VIDEO_EXTENSIONS.map((e) => `.${e}`),
      "audio/*": AUDIO_EXTENSIONS.map((e) => `.${e}`),
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
      // Aucune lecture ici : l'importeur contrôle `size` d'abord (R15, HR14) ; `getFile()` rend un `File` réel.
      return Promise.all(handles.map(async (h) => droppedFromFile(await h.getFile())));
    },
    async save(encode: (target: SaveTarget) => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null> {
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
      const chosen: SaveTarget = { kind: "fsa", name: handle.name, handle };
      await writeAll(handle, await encode(chosen));
      return chosen;
    },
  };
}
