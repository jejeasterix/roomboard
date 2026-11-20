/** Collage (R19, C10b) : fichiers `image/*` du presse-papiers ; HTML qui porte un `<table>` (F19), que `main.ts` fait
 *  passer avant les images jointes (Excel joint aussi une image, HB-9) ; ignoré quand la cible est éditable ; texte seul
 *  ignoré (C3). */
import { droppedFromFile } from "./drop-web";
import type { DroppedFile } from "./files";

export interface PasteEventLike {
  readonly target: EventTarget | null;
  /** `getData` facultatif : les tests d'images n'en ont pas, un `ClipboardEvent` l'a toujours (PC8). */
  readonly clipboardData: { readonly files: ArrayLike<File>; getData?(type: string): string } | null;
}

const NOT_TEXT = new Set(["button", "checkbox", "radio", "file", "submit", "reset", "range", "color", "image", "hidden"]);
const TABLE_TAG = /<table[\s>]/i;

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

/** Ce que le collage atteint : le workspace (`main.ts`), un faux dans les tests. */
export interface PasteSink {
  pasteTable(html: string): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at: null): Promise<unknown>;
}

/** Corps de l'écouteur `paste` (R19, C10b) : un `<table>` HTML passe avant les images jointes (F19, HB-9) ; un HTML
 *  illisible (`pasteTable` rend false) se replie sur elles (PC9) ; sinon les images seules. Null : collage non pris
 *  (rien à coller, cible éditable), le collage normal suit ; sinon l'appelant fait `preventDefault`. */
export function handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> | null {
  const html = pastedTableHtml(e);
  const files = pastedFiles(e);
  if (html !== null) {
    return sink.pasteTable(html).then(async (done) => {
      if (!done && files.length > 0) await sink.importFiles(files, null);
    });
  }
  if (files.length === 0) return null;
  return sink.importFiles(files, null).then(() => undefined);
}

/** HTML collé qui contient un `<table>` (F19), tel quel ; null sur une cible éditable, sans HTML ou sans tableau. */
export function pastedTableHtml(e: PasteEventLike): string | null {
  if (isEditable(e.target)) return null;
  const html = e.clipboardData?.getData?.("text/html") ?? "";
  return TABLE_TAG.test(html) ? html : null;
}
