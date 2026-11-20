/**
 * Chargement réel du second module (R10) : `import()` au premier besoin. Séparé de `container.ts` pour qu'aucun test
 * ne résolve `src/wasm-formats/` (construit par `verifier.sh`, absent d'un worktree neuf). Importé par l'amorce seule.
 */
import type { FormatsBinding } from "./container";

export async function loadFormatsModule(): Promise<FormatsBinding> {
  const m = await import("../wasm-formats/roomboard_formats_wasm");
  await m.default();
  return m;
}
