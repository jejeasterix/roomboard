import { describe, expect, it } from "vitest";
import { layoutFor } from "./layout";

describe("layoutFor (CL5b-10)", () => {
  it("defaut : onglets, barre en haut, scène, pages en bas", () => {
    expect(layoutFor([{ id: "outils", dock: "top" }, { id: "pages", dock: "bottom" }])).toEqual({
      areas: '"tabs" "outils" "stage" "pages"',
      columns: "minmax(0, 1fr)",
      rows: "auto auto minmax(0, 1fr) auto",
    });
  });
  it("simple : barre à gauche, pages en bas", () => {
    expect(layoutFor([{ id: "outils", dock: "left" }, { id: "pages", dock: "bottom" }])).toEqual({
      areas: '"tabs tabs" "outils stage" "pages pages"',
      columns: "auto minmax(0, 1fr)",
      rows: "auto minmax(0, 1fr) auto",
    });
  });
  it("floating : hors grille", () => {
    expect(layoutFor([{ id: "f", dock: "floating" }]).areas).toBe('"tabs" "stage"');
  });
  it("barre à droite : colonne après la scène", () => {
    const l = layoutFor([{ id: "r", dock: "right" }]);
    expect(l.areas).toBe('"tabs tabs" "stage r"');
    expect(l.columns).toBe("minmax(0, 1fr) auto");
  });
});
