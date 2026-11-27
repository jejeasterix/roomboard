import { describe, expect, it } from "vitest";
import { lookFrom, opacityOf, roughnessOf, strokeKindOf, toLook } from "./look";

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
