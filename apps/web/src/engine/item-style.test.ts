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
    expect(DEFAULT_ITEM_STYLE).toEqual({ color: "#000000", width: 4, background: null, strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: 100 });
  });
});
