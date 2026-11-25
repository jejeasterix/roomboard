import { describe, expect, it } from "vitest";
import { pixelPad } from "./island-place";

/**
 * T9 (netteté) : un texte de largeur fractionnaire (titre d'onglet, compteur `#pages`) décale toutes les icônes qui le
 * suivent hors de la grille de pixels. Arrondir la boîte de l'îlot (`laneOf`, `observeBox`) n'y change rien : c'est le
 * texte qu'on complète jusqu'au pixel entier supérieur, par une marge de fin.
 */
describe("pixelPad : marge qui porte un texte au pixel entier supérieur", () => {
  it("complète les largeurs relevées au navigateur (onglet, compteur des pages)", () => {
    expect(159.4375 + pixelPad(159.4375)).toBe(160);
    expect(54.546875 + pixelPad(54.546875)).toBe(55);
  });

  it("arrondit vers le haut, jamais au plus proche : la marge n'est jamais négative (le texte n'est pas rogné)", () => {
    expect(pixelPad(159.25)).toBe(0.75);
    expect(pixelPad(0.015625)).toBe(0.984375);
  });

  it("ne pousse rien quand la largeur est déjà entière, ni pour le bruit flottant", () => {
    expect(pixelPad(160)).toBe(0);
    expect(pixelPad(0)).toBe(0);
    expect(pixelPad(160 + 1e-9)).toBe(0);
  });

  it("rend 0 pour une largeur absente ou invalide", () => {
    expect(pixelPad(-3)).toBe(0);
    expect(pixelPad(Number.NaN)).toBe(0);
  });
});
