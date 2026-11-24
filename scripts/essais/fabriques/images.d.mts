// Types des fabriques d'images (cadrage cli-lot4, D70), `images.mjs`.
export function gif(w: number, h: number): Uint8Array;
export function webp(chunk: "VP8 " | "VP8L" | "VP8X", w: number, h: number): Uint8Array;
export function bmp(w: number, h: number, opts?: { readonly core?: boolean; readonly topDown?: boolean }): Uint8Array;
export function ico(sizes: ReadonlyArray<readonly [number, number]>): Uint8Array;
export function heif(brand: "avif" | "heic", w: number, h: number, opts?: { readonly pitm?: boolean }): Uint8Array;
export function svg(attrs: string): Uint8Array;
