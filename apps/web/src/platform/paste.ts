/** Collage (R19, C3, C10b) : objets RoomBoard (enveloppe en `text/plain`, Z9) d'abord ; puis HTML qui porte un `<table>`
 *  (F19), qui passe avant les images jointes (Excel joint aussi une image, HB-9) ; puis texte à tabulations (point 15),
 *  qui donne une grille ; puis fichiers `image/*` ; ignoré quand la cible est éditable ; texte ordinaire ignoré. */
import { fromEnvelope, type ItemsRefusal } from "./clipboard";
import { droppedFromFile } from "./drop-web";
import type { DroppedFile } from "./files";
import { isEditable } from "./editable";

export interface PasteEventLike {
  readonly target: EventTarget | null;
  /** `getData` facultatif : les tests d'images n'en ont pas, un `ClipboardEvent` l'a toujours (PC8). */
  readonly clipboardData: { readonly files: ArrayLike<File>; getData?(type: string): string } | null;
}

const TABLE_TAG = /<table[\s>]/i;

/** Cible éditable : `editable.ts` (OF13, D4), réexportée ici pour ses importeurs. */
export { isEditable };

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
  /** C10b (F19) : tableau HTML collé ; faux si illisible (repli sur les images jointes, PC9). */
  pasteTable(html: string): Promise<boolean>;
  /** Point 15 : texte à tabulations collé (sans HTML) ; faux si illisible.  */
  pasteText(text: string): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at: null): Promise<unknown>;
}

/** Corps de l'écouteur `paste` (R19, C3, Z9, C10b) : objets RoomBoard d'abord ; puis un `<table>` HTML, qui passe avant
 *  les images jointes (F19, HB-9) ; puis un texte à tabulations (point 15) ; un HTML ou un texte illisible (`pasteTable`
 *  ou `pasteText` rend false) se replie sur les images jointes (PC9) ; sinon les images seules. Null : collage non pris (cible éditable, rien à coller), le collage normal suit ; sinon l'appelant
 *  fait `preventDefault`. */
export function handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> | null {
  const items = pastedItems(e);
  if (items !== null) return sink.pasteItems(items).then(() => undefined);
  const html = pastedTableHtml(e);
  const files = pastedFiles(e);
  const fallback = async (done: boolean): Promise<void> => {
    if (!done && files.length > 0) await sink.importFiles(files, null);
  };
  if (html !== null) return sink.pasteTable(html).then(fallback);
  const tsv = pastedTabText(e);
  if (tsv !== null) return sink.pasteText(tsv).then(fallback);
  if (files.length === 0) return null;
  return sink.importFiles(files, null).then(() => undefined);
}

/** HTML collé qui contient un `<table>` (F19), tel quel ; null sur une cible éditable, sans HTML ou sans tableau. */
export function pastedTableHtml(e: PasteEventLike): string | null {
  if (isEditable(e.target)) return null;
  const html = e.clipboardData?.getData?.("text/html") ?? "";
  return TABLE_TAG.test(html) ? html : null;
}

/** Texte à tabulations collé (point 15) ; test bon marché, la grille est analysée une fois par `pasteText` après le contrôle de taille ; null sur une cible éditable ou sans tabulation. */
export function pastedTabText(e: PasteEventLike): string | null {
  if (isEditable(e.target)) return null;
  const text = e.clipboardData?.getData?.("text/plain") ?? "";
  return text.includes("\t") ? text : null;
}
