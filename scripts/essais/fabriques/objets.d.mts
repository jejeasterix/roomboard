// Types du jeu d'essai du lot 4 (cadrage cli-lot4, D70), `objets.mjs`.
export * from "./images.mjs";
export * from "./medias.mjs";
export * from "./modeles.mjs";
export const TAILLES: Readonly<Record<string, string>>;
export function jeu(zip?: (files: Record<string, Uint8Array>) => Uint8Array): Record<string, Uint8Array>;
export function ecrireJeu(dir: string, zip?: (files: Record<string, Uint8Array>) => Uint8Array): string[];
