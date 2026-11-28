/** OG33 (lot 2b, choix 8) : texte d'une forme, au modèle du texte lié d'Excalidraw (MIT) : `BOUND_TEXT_PADDING` 5, centré ;
 *  taille 24 (la plus petite de `TEXT_SIZES`) ; losange et ellipse ramenés au rectangle inscrit (`getBoundTextMaxWidth`). */
import type { ShapeData } from "./api";

export const LABEL_SIZE = 24;
export const LABEL_PAD = 5;

export function labelBox(s: Pick<ShapeData, "shape" | "w" | "h">): { readonly x: number; readonly w: number; readonly cy: number } | null {
  const w = Math.abs(s.w);
  const k = s.shape === "rect" ? 1 : s.shape === "diamond" ? 0.5 : s.shape === "ellipse" ? Math.SQRT1_2 : 0;
  const inner = w * k - 2 * LABEL_PAD;
  if (k === 0 || inner < LABEL_SIZE) return null;
  return { x: (w - inner) / 2, w: inner, cy: Math.abs(s.h) / 2 };
}

/** Haut (repère local) d'une boîte de hauteur `height` centrée verticalement. */
export const labelTop = (box: { readonly cy: number }, height: number): number => box.cy - height / 2;
