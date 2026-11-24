// Types des fabriques 3D (cadrage cli-lot4, D70), `modeles.mjs`.
export function texturePng(): Uint8Array;
export function cubeObj(): Uint8Array;
export function cubeMtl(texture?: string | null): Uint8Array;
export function stlTriangle(): Uint8Array;
export function plyTriangle(): Uint8Array;
export function gltfPair(o?: { readonly image?: string | null }): { readonly gltf: Uint8Array; readonly bin: Uint8Array };
export function gltfDataUri(o?: { readonly texture?: boolean }): Uint8Array;
export function glbPlain(): Uint8Array;
export function glbTextured(): Uint8Array;
