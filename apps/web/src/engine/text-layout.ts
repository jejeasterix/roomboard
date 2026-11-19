/**
 * Mise en lignes du texte (D14, CL4-4, CL4-5) : une seule implémentation pour la hauteur de boîte envoyée au cœur
 * (outil Texte) et pour le rendu (Canvas 2D). Coupure gloutonne aux espaces, mot trop long coupé par points de code.
 */
export const TEXT_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif';
export const TEXT_SIZES: readonly number[] = [24, 36, 48, 72];
export const DEFAULT_TEXT_SIZE = 36;
export const TEXT_LINE_HEIGHT = 1.25;
export const DEFAULT_TEXT_BOX_WIDTH = 600;

export const textFont = (size: number): string => `${size}px ${TEXT_FONT_FAMILY}`;

/** Largeur d'un texte à une taille, en unités monde (= px CSS de la police à cette taille). */
export type Measure = (text: string, size: number) => number;

/** Mesure par un contexte 2D : la même police que le rendu, puis `measureText`. */
export const measureWith =
  (ctx: CanvasRenderingContext2D): Measure =>
  (text, size) => {
    ctx.font = textFont(size);
    return ctx.measureText(text).width;
  };

export function layoutText(content: string, size: number, boxWidth: number, measure: Measure): string[] {
  const out: string[] = [];
  for (const para of content.split("\n")) {
    let line = "";
    for (const token of para.split(/(\s+)/)) {
      if (token === "") continue;
      const candidate = line + token;
      if (line === "" || measure(candidate.trimEnd(), size) <= boxWidth) {
        line = candidate;
      } else {
        out.push(line.trimEnd());
        line = /^\s+$/.test(token) ? "" : token;
      }
      while (line.trimEnd().length > 1 && measure(line.trimEnd(), size) > boxWidth) {
        // par point de code (jamais au milieu d'un emoji) ; recherche dichotomique : la largeur croît avec le préfixe
        const points = Array.from(line);
        let lo = 1;
        let hi = points.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (measure(points.slice(0, mid).join(""), size) > boxWidth) hi = mid - 1;
          else lo = mid;
        }
        out.push(points.slice(0, lo).join(""));
        line = points.slice(lo).join("");
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

export const textBoxHeight = (lines: number, size: number): number => Math.max(1, lines) * size * TEXT_LINE_HEIGHT;
