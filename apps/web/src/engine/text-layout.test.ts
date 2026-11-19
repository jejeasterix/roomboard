import { describe, expect, it } from "vitest";
import { layoutText, textBoxHeight, textFont, type Measure } from "./text-layout";

/** Chaque caractère vaut 100 unités, quelle que soit la taille. */
const wide: Measure = (s) => s.length * 100;

describe("mise en lignes du texte (CL4-4)", () => {
  it("une ligne si elle tient", () => {
    expect(layoutText("Bonjour", 36, 1000, wide)).toEqual(["Bonjour"]);
  });

  it("coupe aux espaces dans la largeur de boîte", () => {
    expect(layoutText("aaaa bbbb cc", 36, 700, wide)).toEqual(["aaaa", "bbbb cc"]);
  });

  it("Entrée = nouvelle ligne, lignes vides gardées", () => {
    expect(layoutText("a\n\nb", 36, 600, wide)).toEqual(["a", "", "b"]);
  });

  it("un mot plus long que la boîte est coupé par caractères", () => {
    expect(layoutText("abcdefgh", 36, 300, wide)).toEqual(["abc", "def", "gh"]);
  });

  it("un mot trop long est coupé par point de code : un emoji n'est jamais scindé", () => {
    const lines = layoutText("😀😀😀😀😀", 36, 300, wide); // « wide » mesure en unités UTF-16 : un emoji vaut 200
    expect(lines).toEqual(["😀", "😀", "😀", "😀", "😀"]);
    expect(lines.join("")).toBe("😀😀😀😀😀");
  });

  it("texte vide : une ligne vide", () => {
    expect(layoutText("", 36, 600, wide)).toEqual([""]);
  });

  it("hauteur : lignes × taille × 1,25, au moins une ligne ; police à la taille", () => {
    expect(textBoxHeight(2, 36)).toBe(90);
    expect(textBoxHeight(0, 36)).toBe(45);
    expect(textFont(48)).toBe('48px "Atkinson Hyperlegible", system-ui, sans-serif');
  });
});
