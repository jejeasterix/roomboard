import { describe, expect, it } from "vitest";
import { FORMAT_LOTS } from "./formats";
import { main } from "./main";
import { describeWasm, memoryIO } from "./testing";

describe("main : commandes sans module (D9)", () => {
  it("formats rend la table entière, code 0", async () => {
    const io = memoryIO();
    expect(await main(["formats"], io)).toBe(0);
    const [out] = io.json();
    expect(out.formats).toHaveLength(Object.keys(FORMAT_LOTS).length);
    expect(out.formats).toContainEqual({ ext: ".roomboard", read: true, write: true, readLot: 1, writeLot: 1, notes: [] });
    expect(out.formats).toContainEqual(expect.objectContaining({ ext: ".pdf", read: false, write: false, readLot: 3, writeLot: 3 }));
    expect(io.stderr).toEqual([]);
  });
  it("commande inconnue, absente, clé d'Object ou argument en trop : code 2, une erreur JSON sur stderr", async () => {
    for (const argv of [["bidule"], [], ["toString"], ["__proto__"], ["constructor"], ["formats", "en-trop"]]) {
      const io = memoryIO();
      expect(await main(argv, io)).toBe(2);
      expect(io.stdout).toEqual([]);
      expect(io.errors()).toEqual([{ error: expect.objectContaining({ code: "usage" }) }]);
    }
  });
  it("module Wasm absent : code 1, erreur io", async () => {
    const io = memoryIO([], {}, new URL("file:///roomboard-absent/"));
    expect(await main(["version"], io)).toBe(1);
    expect(io.errors()[0].error.code).toBe("io");
  });
});

describeWasm("main : version au vrai module", () => {
  it("version : cli, core, app et schéma", async () => {
    const io = memoryIO();
    expect(await main(["version"], io)).toBe(0);
    expect(io.json()).toEqual([{ cli: "0.1.0", core: expect.any(String), app: "0.1.0", schema: "roomboard-cli/1" }]);
  });
});
