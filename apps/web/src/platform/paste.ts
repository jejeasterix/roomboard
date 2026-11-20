/** Collage (R19, C3) : objets RoomBoard (enveloppe en `text/plain`, Z9) d'abord, puis fichiers `image/*` ; ignoré quand
 *  la cible est éditable ; texte ordinaire ignoré. */
import { fromEnvelope, type ItemsRefusal } from "./clipboard";
import { droppedFromFile } from "./drop-web";
import type { DroppedFile } from "./files";

export interface PasteEventLike {
  readonly target: EventTarget | null;
  /** `getData` facultatif : les tests d'images n'en ont pas, un `ClipboardEvent` l'a toujours (PC8). */
  readonly clipboardData: { readonly files: ArrayLike<File>; getData?(type: string): string } | null;
}

const NOT_TEXT = new Set(["button", "checkbox", "radio", "file", "submit", "reset", "range", "color", "image", "hidden"]);

export function isEditable(t: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(t instanceof HTMLElement)) return false;
  const ce = t.getAttribute("contenteditable");
  if (t.isContentEditable || ce === "" || ce === "true") return true;
  if (t instanceof HTMLTextAreaElement) return true;
  return t instanceof HTMLInputElement && !NOT_TEXT.has(t.type);
}

export function pastedFiles(e: PasteEventLike): DroppedFile[] {
  if (isEditable(e.target)) return [];
  return Array.from(e.clipboardData?.files ?? [])
    .filter((f) => f.type.startsWith("image/"))
    .map(droppedFromFile);
}

/** Enveloppe d'objets RoomBoard dans `text/plain` (Z9) ; null sur une cible éditable ou sans enveloppe. */
export function pastedItems(e: PasteEventLike): Uint8Array | ItemsRefusal | null {
  if (isEditable(e.target)) return null;
  const text = e.clipboardData?.getData?.("text/plain") ?? "";
  return text === "" ? null : fromEnvelope(text);
}

/** Ce que le collage atteint : le workspace (`main.ts`), un faux dans les tests. */
export interface PasteSink {
  /** C3 (PC1) : objets dans l'onglet actif, ou refus à dire (version plus récente, trop gros) ; vrai si pris. */
  pasteItems(items: Uint8Array | ItemsRefusal): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at: null): Promise<unknown>;
}

/** Corps de l'écouteur `paste` (R19, C3, Z9) : objets RoomBoard, puis images. Null : collage non pris (cible éditable,
 *  rien à coller), le collage normal suit ; sinon l'appelant fait `preventDefault`. */
export function handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> | null {
  const items = pastedItems(e);
  if (items !== null) return sink.pasteItems(items).then(() => undefined);
  const files = pastedFiles(e);
  if (files.length === 0) return null;
  return sink.importFiles(files, null).then(() => undefined);
}
