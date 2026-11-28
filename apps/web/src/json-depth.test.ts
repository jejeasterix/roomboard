import { describe, expect, it } from "vitest";
import { MAX_JSON_DEPTH, textTooDeep, valueTooDeep } from "./json-depth";
import { serializeProfile } from "./toolbar";
import { BUILTIN_PROFILES } from "./toolbar-profiles";

const nested = (n: number): string => `${"[".repeat(n)}${"]".repeat(n)}`;
/** Profondeur exacte : le plus petit `max` qui n'est pas dépassé. */
const depthOf = (v: unknown): number => {
  let d = 0;
  while (valueTooDeep(v, d)) d++;
  return d;
};

describe("profondeur JSON (OG45)", () => {
  it("texte : la limite est comprise, un niveau de plus la dépasse", () => {
    expect(textTooDeep(nested(MAX_JSON_DEPTH))).toBe(false);
    expect(textTooDeep(nested(MAX_JSON_DEPTH + 1))).toBe(true);
    expect(textTooDeep(`{"a":{"b":[1,{"c":2}]}}`, 4)).toBe(false);
    expect(textTooDeep(`{"a":{"b":[1,{"c":2}]}}`, 3)).toBe(true);
  });

  it("texte : crochets et accolades des chaînes ignorés, échappements compris", () => {
    expect(textTooDeep(JSON.stringify({ s: "[".repeat(1000) }), 1)).toBe(false);
    expect(textTooDeep(`{"s":"\\"[[[[","t":"\\\\"}`, 1)).toBe(false);
    expect(textTooDeep(`["\\\\",[[]]]`, 2)).toBe(true);
  });

  it("texte : 1 000 000 niveaux mesurés sans débordement de pile", () => {
    expect(textTooDeep(nested(1_000_000))).toBe(true);
  });

  it("valeur : même mesure que le texte ; 1 000 000 niveaux sans débordement ; boucle d'objets arrêtée", () => {
    expect(valueTooDeep(JSON.parse(nested(MAX_JSON_DEPTH)))).toBe(false);
    expect(valueTooDeep(JSON.parse(nested(MAX_JSON_DEPTH + 1)))).toBe(true);
    expect(valueTooDeep(1, 0)).toBe(false);
    expect(valueTooDeep({ a: [1] }, 2)).toBe(false);
    expect(valueTooDeep({ a: [1] }, 1)).toBe(true);
    let deep: unknown = 1;
    for (let i = 0; i < 1_000_000; i++) deep = [deep];
    expect(valueTooDeep(deep)).toBe(true);
    const loop: Record<string, unknown> = {};
    loop["self"] = loop;
    expect(valueTooDeep(loop)).toBe(true);
  });

  it("profils livrés : 8 niveaux au plus, bien sous la limite", () => {
    const depths = BUILTIN_PROFILES.map((p) => depthOf(serializeProfile(p)));
    expect(Math.max(...depths)).toBe(8);
    expect(Math.max(...depths)).toBeLessThan(MAX_JSON_DEPTH);
  });
});
