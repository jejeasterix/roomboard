/** Chemin d'une entrée d'archive : barres droites, sans `./` en tête (ZIP écrits sous Windows). */
export const normalArchivePath = (name: string): string => name.replace(/\\/g, "/").replace(/^(\.\/)+/, "");

/** C13 (N16) : chemin d'entrée d'archive normalisé (barres droites, sans `./` en tête), ou null : vide, dossier,
 *  absolu, lettre de lecteur, segment `..`, segment `__MACOSX`. Seule règle des ZIP (3D, tableaux) et du Bamboo. */
export function safeArchivePath(name: string): string | null {
  const p = normalArchivePath(name);
  if (p === "" || p.endsWith("/") || p.startsWith("/") || /^[A-Za-z]:/.test(p)) return null;
  const segs = p.split("/");
  if (segs.some((s) => s === ".." || s === "__MACOSX")) return null;
  return p;
}

/** Fichier à écrire dans une archive (C4) : chemin et octets. `zip-read.ts` (et `rbpack.ts` par lui) le réexporte (OF13, D7). */
export interface ZipFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}
