import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
// vite-plugin-solid impose jsdom aux essais : on garde « node » par défaut, les essais de composants
// demandent happy-dom par leur première ligne `// @vitest-environment happy-dom`.
// C10b (DAB4) : le Worker des classeurs importe le module Wasm `formats` ; format ES exigé (même fichier `.wasm` émis).
// C12 (PF11) : ressources de pdf.js servies en local sous `./pdfjs/` (copiées au build, lues dans node_modules en
// développement) ; morceaux nommés `pdfjs-*.js` et `pdf-lib-*.js` (PC5), chargés seulement par import dynamique.
const PDFJS_DIR = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
const PDFJS_ASSETS: readonly string[] = ["cmaps", "standard_fonts", "wasm"];
// quickjs-eval (script des formulaires PDF) n'est pas copié : CSP sans eval, aucun besoin de C12.
const SKIPPED = /^quickjs|^LICENSE_(PDFJS_)?QUICKJS$/;

function pdfjsAssets(): Plugin {
  return {
    name: "roomboard-pdfjs-assets",
    configureServer(server) {
      server.middlewares.use("/pdfjs", (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? "").split("?")[0] ?? "").replace(/^\/+/, "");
        const [dir, file, ...rest] = rel.split("/");
        if (dir === undefined || file === undefined || rest.length > 0 || SKIPPED.test(file) || !PDFJS_ASSETS.includes(dir) || file.includes("..")) {
          next();
          return;
        }
        try {
          res.end(readFileSync(join(PDFJS_DIR, dir, file)));
        } catch {
          next();
        }
      });
    },
    generateBundle() {
      for (const dir of PDFJS_ASSETS) {
        for (const file of readdirSync(join(PDFJS_DIR, dir))) {
          if (SKIPPED.test(file)) continue;
          this.emitFile({ type: "asset", fileName: `pdfjs/${dir}/${file}`, source: readFileSync(join(PDFJS_DIR, dir, file)) });
        }
      }
    },
  };
}

const chunkOf = (id: string): string | undefined =>
  id.includes("/node_modules/pdfjs-dist/") ? "pdfjs" : /\/node_modules\/(?:pdf-lib|@pdf-lib\/[^/]+|pako)\//.test(id) ? "pdf-lib" : undefined;

export default defineConfig({
  base: "./",
  plugins: [solid(), pdfjsAssets()],
  worker: { format: "es" },
  build: { rollupOptions: { output: { manualChunks: chunkOf } } },
  test: { environment: "node" },
});
