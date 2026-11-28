/** OG33 (lot 2b, choix 8) : texte d'une forme, au modèle du texte lié d'Excalidraw (MIT) : `BOUND_TEXT_PADDING` 5, centré ;
 *  taille 24 (la plus petite de `TEXT_SIZES`) ; losange et ellipse ramenés au rectangle inscrit (`getBoundTextMaxWidth`). */
import type { Matrix, ShapeData } from "./api";

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

export type LabelBox = NonNullable<ReturnType<typeof labelBox>>;

/** C5 (OG33) : le texte ne prend pas l'échelle de la forme (le redimensionnement compose sa matrice sans changer `w`,
 *  commands.rs) : boîte prise sur la taille en monde (`w`, `h` × normes des colonnes de la matrice) ; repère du texte :
 *  rotation, retournement et translation de la forme seuls, centré sur le centre de la forme. Écran, zone d'édition
 *  et export passent tous par ici (`labelMatrix`). null : pas de texte possible. */
export function labelPlacement(s: Pick<ShapeData, "shape" | "w" | "h">, m: Matrix): { readonly box: LabelBox; readonly frame: Matrix } | null {
  const [a, b, c, d, e, f] = m;
  const [sx, sy] = [Math.hypot(a, b), Math.hypot(c, d)];
  if (!(sx > 0 && sy > 0)) return null;
  const [W, H] = [Math.abs(s.w) * sx, Math.abs(s.h) * sy];
  const box = labelBox({ shape: s.shape, w: W, h: H });
  if (box === null) return null;
  const [ux, uy] = [a / sx + 0, b / sx + 0];
  const flip = a * d - b * c < 0 ? -1 : 1;
  // `0 -` : pas de zéro négatif dans la matrice rendue.
  const [vx, vy] = [0 - flip * uy, flip * ux + 0];
  const [mx, my] = [a * (s.w / 2) + c * (s.h / 2) + e, b * (s.w / 2) + d * (s.h / 2) + f];
  return { box, frame: [ux, uy, vx, vy, mx - (W / 2) * ux - (H / 2) * vx + 0, my - (W / 2) * uy - (H / 2) * vy + 0] };
}

/** Matrice (monde) d'une boîte de texte de hauteur `height` centrée dans la boîte du placement. */
export function labelMatrix(p: { readonly box: LabelBox; readonly frame: Matrix }, height: number): Matrix {
  const [a, b, c, d, e, f] = p.frame;
  const [tx, ty] = [p.box.x, labelTop(p.box, height)];
  return [a, b, c, d, a * tx + c * ty + e, b * tx + d * ty + f];
}
