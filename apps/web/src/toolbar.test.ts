import { describe, expect, it } from "vitest";
import { toolbar, validateToolbar, type ToolDef } from "./toolbar";

describe("toolbar", () => {
  it("la barre par défaut est valide", () => {
    expect(validateToolbar(toolbar)).toEqual([]);
  });

  it("détecte doublons et libellés vides", () => {
    const bad: ToolDef[] = [
      { id: "pen", label: "A" },
      { id: "pen", label: " " },
    ];
    expect(validateToolbar(bad)).toEqual(["doublon : pen", "libellé vide : pen"]);
  });
});
