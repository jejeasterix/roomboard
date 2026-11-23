// Build de la CLI (cadrage cli, D3) : un seul fichier ES `dist/roomboard.mjs` pour Node 22, tout inclus
// (`ssr.noExternal`) ; `inlineDynamicImports` : `container-io.ts` atteint `host-tauri.ts`, dont les `import()` des
// paquets Tauri feraient des morceaux séparés (inclus, jamais exécutés). Les deux modules Wasm (D2) sont copiés depuis
// `apps/web/src/` (construits par `scripts/verifier.sh`) dans `dist/wasm/` et `dist/wasm-formats/`.
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const WEB_SRC = fileURLToPath(new URL("../web/src/", import.meta.url));
const WASM_DIRS = ["wasm", "wasm-formats"] as const;

function copyWasm(): Plugin {
  return {
    name: "roomboard-cli-wasm",
    apply: "build",
    writeBundle(options) {
      const out = options.dir ?? fileURLToPath(new URL("./dist/", import.meta.url));
      for (const dir of WASM_DIRS) {
        const from = join(WEB_SRC, dir);
        if (!existsSync(from)) throw new Error(`module Wasm absent : ${from} (le construire comme scripts/verifier.sh)`);
        cpSync(from, join(out, dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [copyWasm()],
  ssr: { noExternal: true, target: "node" },
  build: {
    outDir: "dist",
    target: "node22",
    rollupOptions: {
      output: { entryFileNames: "roomboard.mjs", inlineDynamicImports: true, banner: "#!/usr/bin/env node" },
    },
  },
  test: { environment: "node" },
});
