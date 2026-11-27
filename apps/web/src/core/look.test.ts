import { describe, expect, it } from "vitest";
import { newSeed, STROKE_STYLES, lookFrom, opacityOf, roughnessOf, strokeKindOf, toLook, opacityLook } from "./look";
import { ARROWHEADS, endArrowheadOf, FILL_STYLES, fillStyleOf, LINK_MAX_CHARS, startArrowheadOf, TEXT_ALIGNS, textAlignOf, validLink } from "./look";

describe("look", () => {
  it("toLook : absent ou vide → undefined", () => {
    expect(toLook(undefined)).toBeUndefined();
    expect(toLook({})).toBeUndefined();
  });
  it("toLook : valeurs lisibles gardées, illisibles neutres", () => {
    expect(toLook({ strokeStyle: "dashed", roughness: 1, seed: 7, roundness: "round", opacity: 50 })).toEqual({ strokeStyle: "dashed", roughness: 1, seed: 7, roundness: "round", opacity: 50 });
    expect(toLook({ strokeStyle: "wavy", opacity: 150 })).toBeUndefined();
    expect(toLook({ opacity: 95 })).toEqual({ opacity: 95 });
    expect(toLook({ opacity: 100 })).toBeUndefined();
  });
  it("lecteurs : défauts", () => {
    expect(strokeKindOf(undefined)).toBe("solid");
    expect(roughnessOf(undefined)).toBe(0);
    expect(opacityOf(undefined)).toBe(100);
  });
  it("lookFrom : neutre → undefined ; graine seulement avec roughness", () => {
    expect(lookFrom({ strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: 100 }, 9)).toBeUndefined();
    expect(lookFrom({ strokeStyle: "solid", roughness: 1, roundness: "sharp", opacity: 100 }, 9)).toEqual({ roughness: 1, seed: 9 });
  });
});

describe("opacityLook", () => {
  it("opacityLook : 100 neutre, sinon l'opacité seule", () => {
    expect(opacityLook(100)).toBeUndefined();
    expect(opacityLook(40)).toEqual({ opacity: 40 });
  });
});

describe("STROKE_STYLES, newSeed", () => {
  it("STROKE_STYLES : les traits non pleins", () => {
    expect([...STROKE_STYLES]).toEqual(["dashed", "dotted"]);
  });
  it("newSeed : entier 32 bits non signé", () => {
    const s = newSeed();
    expect(Number.isInteger(s) && s >= 0 && s <= 0xffffffff).toBe(true);
  });
});

describe("look — lot 2 (T12)", () => {
  it("toLook : champs du lot 2 lisibles gardés, défauts de pointe et hors domaine neutres", () => {
    expect(toLook({ fillStyle: "hachure", startArrowhead: "triangle", endArrowhead: "none", textAlign: "right", link: "https://example.org" })).toEqual({
      fillStyle: "hachure", startArrowhead: "triangle", endArrowhead: "none", textAlign: "right", link: "https://example.org",
    });
    expect(toLook({ fillStyle: "solid", startArrowhead: "none", endArrowhead: "arrow", textAlign: "left", link: "javascript:alert(1)" })).toBeUndefined();
    expect(toLook({ fillStyle: 3, startArrowhead: "circle", endArrowhead: null, textAlign: "justify", link: 42 })).toBeUndefined();
  });
  it("validLink : trois schémas, casse exacte, 2 048 caractères au plus (points de code)", () => {
    for (const ok of ["http://x", "https://example.org", "mailto:a@example.org", `https://${"é".repeat(LINK_MAX_CHARS - 8)}`]) expect(validLink(ok), ok).toBe(true);
    for (const ko of ["javascript:alert(1)", "JavaScript:alert(1)", "HTTPS://x", " https://x", "ftp://x", "data:text/html,x", "https:x", "", `https://${"h".repeat(LINK_MAX_CHARS - 7)}`]) {
      expect(validLink(ko), ko.slice(0, 30)).toBe(false);
    }
  });
  it("lecteurs du lot 2 : défauts", () => {
    expect([fillStyleOf(undefined), startArrowheadOf(undefined), endArrowheadOf(undefined), textAlignOf(undefined)]).toEqual(["solid", "none", "arrow", "left"]);
    expect([fillStyleOf({ fillStyle: "cross-hatch" }), startArrowheadOf({ startArrowhead: "arrow" }), endArrowheadOf({ endArrowhead: "none" }), textAlignOf({ textAlign: "center" })]).toEqual(["cross-hatch", "arrow", "none", "center"]);
  });
  it("domaines du lot 2", () => {
    expect(FILL_STYLES).toEqual(["hachure", "cross-hatch"]);
    expect(ARROWHEADS).toEqual(["none", "arrow", "triangle", "triangle_outline"]);
    expect(TEXT_ALIGNS).toEqual(["center", "right"]);
  });
});
