import { describe, expect, it } from "vitest";
import { CliError } from "./contract";
import { describeWasm, PRESENT, REQUIRED, WEB_SRC } from "./testing";
import { loadCore, loadFormats } from "./wasm-node";

it("le module wasm est présent quand il est exigé", () => {
  if (REQUIRED) expect(PRESENT).toBe(true);
});

describe("chargement sans module (D2)", () => {
  it("dossier sans .wasm : CliError io qui nomme verifier.sh", async () => {
    const err: unknown = await loadCore(new URL("file:///roomboard-absent/")).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CliError);
    expect(err).toMatchObject({ code: "io" });
    expect((err as CliError).message).toContain("verifier.sh");
  });
});

describeWasm("chargement du vrai module (D2)", () => {
  it("loadCore : document vierge d'une page", async () => {
    const core = await loadCore(WEB_SRC);
    expect(core.blank().pageIds()).toHaveLength(1);
  });
  it("loadFormats : lecteur de classeur et écrivain du conteneur", async () => {
    const mod = await loadFormats(WEB_SRC)();
    expect(typeof mod.SheetReader.open).toBe("function");
    expect(typeof mod.write_container).toBe("function");
  });
  it("loadFormats : module lu une fois puis gardé en mémoire (un classeur de plus ne relit pas les 2,8 Mo)", async () => {
    const load = loadFormats(WEB_SRC);
    const first = load();
    expect(load()).toBe(first);
    expect(await load()).toBe(await first);
  });
});
