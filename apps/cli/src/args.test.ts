import { describe, expect, it } from "vitest";
import { flagStr, parseArgs } from "./args";
import { codeOf } from "./testing";

describe("parseArgs (DA2)", () => {
  it("positionnels, option à valeur, option booléenne, « - » positionnel", () => {
    const p = parseArgs(["a.roomboard", "--page", "p1", "--points", "-"], { "--page": "value", "--points": "bool" });
    expect(p.positional).toEqual(["a.roomboard", "-"]);
    expect(flagStr(p, "--page")).toBe("p1");
    expect(p.flags.get("--points")).toBe(true);
  });
  it("une valeur qui commence par un tiret est prise telle quelle", () => {
    expect(flagStr(parseArgs(["--at", "-5,3"], { "--at": "value" }), "--at")).toBe("-5,3");
  });
  it("option inconnue, clé d'Object, valeur absente, option répétée : usage", () => {
    for (const args of [["--bidule"], ["--constructor"], ["--__proto__"], ["--toString"], ["--page"], ["--page", "a", "--page", "b"]]) {
      expect(codeOf(() => parseArgs(args, { "--page": "value" }))).toBe("usage");
    }
  });
});
