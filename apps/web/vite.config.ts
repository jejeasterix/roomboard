import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
// vite-plugin-solid impose jsdom aux essais : on garde « node » par défaut, les essais de composants
// demandent happy-dom par leur première ligne `// @vitest-environment happy-dom`.
export default defineConfig({ base: "./", plugins: [solid()], test: { environment: "node" } });
