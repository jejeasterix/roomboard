import { defineConfig } from "vite";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
export default defineConfig({ base: "./" });
