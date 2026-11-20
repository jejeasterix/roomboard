/** Collage (R19) : fichiers `image/*` du presse-papiers ; ignoré quand la cible est éditable ; texte et HTML ignorés (C3). */
import { droppedFromFile } from "./drop-web";
import type { DroppedFile } from "./files";

export interface PasteEventLike {
  readonly target: EventTarget | null;
  readonly clipboardData: { readonly files: ArrayLike<File> } | null;
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
