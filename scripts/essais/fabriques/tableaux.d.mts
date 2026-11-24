import type { FabPage } from "./flipchart.mjs";
export type Zip = (files: Record<string, Uint8Array>) => Uint8Array;
export const IWB_HEAD: string;
export const NB_MANIFEST: string;
export const TIFF: Uint8Array;
export function nbSvg(body: string, head?: string): string;
export function iwbZip(zip: Zip): Uint8Array;      // 1 page, 8 objets lus, 1 vidéo non lue
export function iwbRaw3(): string;                 // XML brut, 3 pages
export function ubzZip(zip: Zip): Uint8Array;      // 1 page, 4 objets
export function notebookZip(zip: Zip): Uint8Array; // 2 pages, manifeste : page1.svg (4 objets) puis page0.svg (1)
export function olfZip(zip: Zip): Uint8Array;      // 1 page, 3 objets, fond #FFEECC
export function flipPages(): FabPage[];            // 2 pages, 5 objets en page 1 (TIFF et action non lus)
