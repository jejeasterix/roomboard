import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
// vite-plugin-solid impose jsdom aux essais : on garde « node » par défaut, les essais de composants
// demandent happy-dom par leur première ligne `// @vitest-environment happy-dom`.
// C10b (DAB4) : le Worker des classeurs importe le module Wasm `formats` ; format ES exigé (même fichier `.wasm` émis).
export default defineConfig({ base: "./", plugins: [solid()], worker: { format: "es" }, test: { environment: "node" } });
