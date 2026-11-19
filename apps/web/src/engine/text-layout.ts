/**
 * Mise en lignes du texte (D14, CL4-4, CL4-5) : une seule implémentation pour la hauteur de boîte envoyée au cœur
 * (outil Texte) et pour le rendu (Canvas 2D). Coupure gloutonne aux espaces, mot trop long coupé par caractères.
 */
export const TEXT_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif';
export const TEXT_SIZES: readonly number[] = [24, 36, 48, 72];
export const DEFAULT_TEXT_SIZE = 36;
export const TEXT_LINE_HEIGHT = 1.25;
export const DEFAULT_TEXT_BOX_WIDTH = 600;

export const textFont = (size: number): string => `${size}px ${TEXT_FONT_FAMILY}`;

/** Largeur d'un texte à une taille, en unités monde (= px CSS de la police à cette taille). */
export type Measure = (text: string, size: number) => number;

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
        let cut = line.length - 1;
        while (cut > 1 && measure(line.slice(0, cut), size) > boxWidth) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

export const textBoxHeight = (lines: number, size: number): number => Math.max(1, lines) * size * TEXT_LINE_HEIGHT;
