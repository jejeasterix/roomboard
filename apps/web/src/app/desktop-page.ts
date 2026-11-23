/**
 * Page envoyée au tableau (C11b, P2, P3, P10, P11, P13, DA2) : document temporaire d'une page, construit dans la page,
 * sans octets ni frontière : fond (capture du bureau, `fit: "width"`) ou blanc, puis l'encre de la page montrée du
 * document d'annotation recopiée par `extract` / `insertFragment` et placée par la matrice de vue. Le cœur ne change pas.
 */
import type { AssetRef, CoreDocument, CoreFactory, Matrix } from "../core/api";
import { isIdentity } from "../core/shapes";

/** Fond de la page envoyée : asset déjà dans le magasin de l'onglet cible ; taille de l'image en pixels. */
export interface PageBackdrop {
  readonly ref: AssetRef;
  readonly w: number;
  readonly h: number;
}

export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

/** Document temporaire d'une page : fond (ou blanc), encre de `ink.page` recopiée puis transformée par `matrix` ;
 *  null : ni fond ni élément. Le document rendu appartient à l'appelant (free) ; `ink.doc` n'est pas modifié. */
export function capturePage(
  core: Pick<CoreFactory, "blank">,
  ink: { readonly doc: CoreDocument; readonly page: string } | null,
  backdrop: PageBackdrop | null,
  matrix: Matrix,
): CoreDocument | null {
  const ids = ink === null ? [] : ink.doc.elementIds(ink.page);
  if (backdrop === null && ids.length === 0) return null;
  const doc = core.blank();
  try {
    const page = doc.pageIds()[0];
    if (page === undefined) throw new Error("document vierge sans page");
    if (backdrop !== null) {
      doc.apply({ type: "SetBackdrop", page, backdrop: { asset: backdrop.ref, w: backdrop.w, h: backdrop.h, fit: "width" } });
    }
    if (ink !== null && ids.length > 0) {
      const fragment = ink.doc.extract(ink.page, ids);
      try {
        const change = doc.insertFragment(fragment, page, 0, 0);
        if (change.ids.length > 0 && !isIdentity(matrix)) doc.apply({ type: "Transform", ids: change.ids, matrix });
      } finally {
        fragment.free();
      }
    }
    return doc;
  } catch (e) {
    doc.free();
    throw e;
  }
}
