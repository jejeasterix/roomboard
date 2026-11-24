/**
 * Avertissements de chargement de pdf.js hors de stderr (cadrage cli-lot3, D34) : en Node, pdf.js écrit à son
 * évaluation trois lignes `console.warn` (`@napi-rs/canvas` absent, `DOMMatrix` et `Path2D` sans polyfill), sans effet ici
 * (aucun rendu, D33). Dans le fichier construit, pdf.js est évalué au démarrage (`inlineDynamicImports`) : ce module
 * est importé en premier par `bin.ts`. Seuls ces trois préfixes, lus au début du premier argument, sont retirés ;
 * tout autre avertissement passe. stderr reste réservé à la ligne `{"error":…}` (DA2). Garde : contrôle « stderr vide »
 * de `scripts/essais/cli-essai.mjs` sur le fichier construit (H28).
 * cli-lot4 (D77) : `console.error` filtré de même pour le seul message de texture absente de GLTFLoader, déjà dit par
 * `missing` (avis du produit) ; tout autre message passe.
 */
export const PDFJS_WARNINGS: readonly string[] = ['Warning: Cannot load "@napi-rs/canvas"', "Warning: Cannot polyfill `DOMMatrix`", "Warning: Cannot polyfill `Path2D`"];

export function quietWarn(warn: (...a: unknown[]) => void): (...a: unknown[]) => void {
  return (...a) => {
    const first = a[0];
    if (typeof first === "string" && PDFJS_WARNINGS.some((p) => first.startsWith(p))) return;
    warn(...a);
  };
}

/** cli-lot4 (D77) : préfixe du message de three retiré de `console.error`. */
export const THREE_ERRORS: readonly string[] = ["THREE.GLTFLoader: Couldn't load texture"];

export function quietError(error: (...a: unknown[]) => void): (...a: unknown[]) => void {
  return (...a) => {
    const first = a[0];
    if (typeof first === "string" && THREE_ERRORS.some((p) => first.startsWith(p))) return;
    error(...a);
  };
}

console.warn = quietWarn(console.warn.bind(console));
console.error = quietError(console.error.bind(console));
