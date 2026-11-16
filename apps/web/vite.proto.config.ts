// Build du banc du stylet (cadrage D29) : un seul fichier HTML autonome, ouvrable en file://.
// Séparé de la configuration (implicite) de l'application : `vite build` sans --config n'est pas touché.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist-proto",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./proto-stylet.html", import.meta.url)),
    },
  },
});
