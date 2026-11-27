import { describe, expect, it } from "vitest";
import { DEFAULT_ITEM_STYLE, mergeItemStyle, parseItemStyle } from "./item-style";

describe("item-style", () => {
  it("parseItemStyle : aller-retour", () => {
    const s = { ...DEFAULT_ITEM_STYLE, color: "#1d4ed8", strokeStyle: "dashed" as const, opacity: 50 };
    expect(parseItemStyle(JSON.stringify(s))).toEqual(s);
  });
  it("parseItemStyle illisible : null", () => {
    expect(parseItemStyle(null)).toBeNull();
    expect(parseItemStyle("{")).toBeNull();
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, width: -1 }))).toBeNull();
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, color: "" }))).toBeNull();
  });
  it("mergeItemStyle ignore une valeur invalide", () => {
    expect(mergeItemStyle(DEFAULT_ITEM_STYLE, { opacity: 150 }).opacity).toBe(100);
    expect(mergeItemStyle(DEFAULT_ITEM_STYLE, { opacity: 40 }).opacity).toBe(40);
  });
  it("défaut : Architecte, Droits, plein, opaque", () => {
    expect(DEFAULT_ITEM_STYLE).toEqual({ color: "#000000", width: 4, background: null, strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: 100, fillStyle: "solid", startArrowhead: "none", endArrowhead: "arrow", textAlign: "left", font: "default", fontSize: 36 });
  });
  it("parseItemStyle : couleur invalide refusée (color, background)", () => {
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, color: "red" }))?.color).toBe("red"); // nom CSS valide
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, color: "rouge!" }))).toBeNull();
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, background: "#12" }))).toBeNull();
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, background: "#facc15" }))?.background).toBe("#facc15");
  });
  it("parseItemStyle : un champ absent prend son défaut, un champ invalide rend null", () => {
    expect(parseItemStyle(JSON.stringify({ color: "#1d4ed8", opacity: 40 }))).toEqual({ ...DEFAULT_ITEM_STYLE, color: "#1d4ed8", opacity: 40 });
    expect(parseItemStyle("{}")).toEqual(DEFAULT_ITEM_STYLE);
    expect(parseItemStyle(JSON.stringify({ color: "#1d4ed8", opacity: 150 }))).toBeNull();
  });
  it("parseItemStyle : seul un objet simple est lu (tableau, null, scalaire : null)", () => {
    for (const raw of ["[]", "[1]", "null", "3", "\"x\"", "true"]) expect(parseItemStyle(raw)).toBeNull();
  });
});

describe("style courant : police et taille du prochain texte (T31)", () => {
  it("relus ; champ invalide : illisible ; fusion ignore l'invalide", () => {
    const s = { ...DEFAULT_ITEM_STYLE, font: "Georgia", fontSize: 48 };
    expect(parseItemStyle(JSON.stringify(s))).toEqual(s);
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, fontSize: 0 }))).toBeNull();
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, font: "" }))).toBeNull();
    expect(mergeItemStyle(DEFAULT_ITEM_STYLE, { fontSize: -3 }).fontSize).toBe(36);
    expect(mergeItemStyle(DEFAULT_ITEM_STYLE, { font: "Courier New" }).font).toBe("Courier New");
  });
});
