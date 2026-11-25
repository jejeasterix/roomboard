import { describe, expect, it } from "vitest";
import { layoutFor } from "./layout";

describe("layoutFor (CL5b-10 ; design-l2 L2-14 : bandes seules, onglets en îlot)", () => {
  it("bandes en haut et en bas : barre, scène, pages ; aucune rangée d'onglets", () => {
    expect(layoutFor([{ id: "outils", dock: "top" }, { id: "pages", dock: "bottom" }])).toEqual({
      areas: '"outils" "stage" "pages"',
      columns: "minmax(0, 1fr)",
      rows: "auto minmax(0, 1fr) auto",
    });
  });
  it("simple : barre à gauche, pages flottantes", () => {
    expect(layoutFor([{ id: "outils", dock: "left" }, { id: "pages", dock: "floating" }])).toEqual({
      areas: '"outils stage"',
      columns: "auto minmax(0, 1fr)",
      rows: "minmax(0, 1fr)",
    });
  });
  it("design-l2 L2-14 : que des îlots : la scène seule", () => {
    expect(layoutFor([{ id: "f", dock: "floating" }])).toEqual({ areas: '"stage"', columns: "minmax(0, 1fr)", rows: "minmax(0, 1fr)" });
    expect(layoutFor([])).toEqual({ areas: '"stage"', columns: "minmax(0, 1fr)", rows: "minmax(0, 1fr)" });
  });
  it("barre à droite : colonne après la scène", () => {
    const l = layoutFor([{ id: "r", dock: "right" }]);
    expect(l.areas).toBe('"stage r"');
    expect(l.columns).toBe("minmax(0, 1fr) auto");
  });
});
