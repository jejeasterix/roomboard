/**
 * Chargement Node des deux modules Wasm (cadrage cli, D2) : la colle wasm-bindgen par `import()` dynamique (seul endroit
 * de la CLI, aucun test ne la résout statiquement), puis `initSync` sur les octets du `.wasm`. `dir` contient `wasm/` et
 * `wasm-formats/` : `apps/cli/dist/` (copiés au build) ou `apps/web/src/` (tests).
 */
import { existsSync, readFileSync } from "node:fs";
import type { CoreFactory } from "../../web/src/core/api";
import { createWasmCore, type WasmModule } from "../../web/src/core/wasm-core";
import { hasSheetReader, type SheetFormatsBinding } from "../../web/src/platform/container";
import { CliError } from "./contract";

interface WasmFiles {
  readonly glue: string;
  readonly bytes: string;
}
export const CORE_FILES: WasmFiles = { glue: "wasm/roomboard_wasm.js", bytes: "wasm/roomboard_wasm_bg.wasm" };
export const FORMATS_FILES: WasmFiles = { glue: "wasm-formats/roomboard_formats_wasm.js", bytes: "wasm-formats/roomboard_formats_wasm_bg.wasm" };

interface Glue {
  initSync(arg: { module: Uint8Array }): unknown;
}

export function wasmPresent(dir: URL): boolean {
  return [CORE_FILES, FORMATS_FILES].every((f) => existsSync(new URL(f.glue, dir)) && existsSync(new URL(f.bytes, dir)));
}

async function glueOf<T>(dir: URL, files: WasmFiles): Promise<T & Glue> {
  const glue = new URL(files.glue, dir);
  const bytes = new URL(files.bytes, dir);
  if (!existsSync(glue) || !existsSync(bytes)) {
    throw new CliError("io", `module Wasm absent : ${bytes.pathname} (le construire comme scripts/verifier.sh)`);
  }
  const mod = (await import(/* @vite-ignore */ glue.href)) as T & Glue;
  mod.initSync({ module: readFileSync(bytes) });
  return mod;
}

export async function loadCore(dir: URL): Promise<CoreFactory> {
  return createWasmCore(await glueOf<WasmModule>(dir, CORE_FILES));
}

/** Chargeur du module formats pour `createPageCodec` et la lecture des classeurs : lu au premier appel, puis gardé. */
export function loadFormats(dir: URL): () => Promise<SheetFormatsBinding> {
  let loaded: Promise<SheetFormatsBinding> | null = null;
  return () =>
    (loaded ??= (async () => {
      const mod = await glueOf<SheetFormatsBinding>(dir, FORMATS_FILES);
      if (!hasSheetReader(mod)) throw new CliError("io", "module des formats sans lecteur de classeur");
      return mod;
    })());
}
