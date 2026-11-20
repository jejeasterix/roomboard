import { describe, expect, it } from "vitest";
import { expandToGroups, keepWholeGroups, outerGroup, selectionUnits, type GroupedView } from "./groups";

const page: GroupedView[] = [
  { id: "a", group: ["G", "g"] },
  { id: "b", group: ["G", "g"] },
  { id: "c", group: ["G"] },
  { id: "d" },
  { id: "e", group: ["H"] },
  { id: "f", group: ["H"] },
];

describe("groupes de la page (Z2)", () => {
  it("outerGroup : premier id du chemin, null sans groupe", () => {
    expect(outerGroup(page[0]!)).toBe("G");
    expect(outerGroup(page[3]!)).toBeNull();
    expect(outerGroup({ id: "x", group: [] })).toBeNull();
  });
  it("expandToGroups : un membre d'un groupe imbriqué donne tout le groupe extérieur, ordre de la page", () => {
    expect(expandToGroups(["b"], page)).toEqual(["a", "b", "c"]);
  });
  it("expandToGroups : élément libre seul ; plusieurs groupes ; id absent de la page gardé", () => {
    expect(expandToGroups(["d"], page)).toEqual(["d"]);
    expect(expandToGroups(["e", "c"], page)).toEqual(["a", "b", "c", "e", "f"]);
    expect(expandToGroups(["z"], page)).toEqual(["z"]);
  });
  it("keepWholeGroups : un groupe n'est gardé que si tous ses membres sont dans le rectangle", () => {
    expect(keepWholeGroups(["a", "b", "d", "e"], page)).toEqual(["d"]);
    expect(keepWholeGroups(["a", "b", "c", "e", "f"], page)).toEqual(["a", "b", "c", "e", "f"]);
  });
  it("keepWholeGroups : sans groupe, inchangé", () => {
    expect(keepWholeGroups(["d"], page)).toEqual(["d"]);
  });
  it("selectionUnits : groupes extérieurs et éléments libres comptés une fois", () => {
    expect(selectionUnits(["a", "b", "c", "d"], page)).toEqual({ units: 2, grouped: true });
    expect(selectionUnits(["d"], page)).toEqual({ units: 1, grouped: false });
    expect(selectionUnits([], page)).toEqual({ units: 0, grouped: false });
  });
  it("selectionUnits : deux groupes = deux unités", () => {
    expect(selectionUnits(["a", "b", "c", "e", "f"], page)).toEqual({ units: 2, grouped: true });
  });
});
