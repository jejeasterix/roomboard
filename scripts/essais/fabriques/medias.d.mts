// Types des fabriques de médias (cadrage cli-lot4, D70), `medias.mjs`.
export function wav(seconds: number, rate?: number): Uint8Array;
export function mp4(o: { readonly duration: number; readonly timescale?: number; readonly width?: number; readonly height?: number; readonly brand?: string; readonly moovLast?: boolean; readonly version1?: boolean; readonly rotate?: boolean }): Uint8Array;
export function mp4Broken(): Uint8Array;
export function webm(o: { readonly duration: number | null; readonly width?: number; readonly height?: number; readonly clusters?: readonly number[]; readonly lastBlock?: number }): Uint8Array;
export function ogg(o: { readonly codec: "vorbis" | "opus" | "theora" | "flac"; readonly granule: number; readonly rate?: number; readonly preSkip?: number; readonly width?: number; readonly height?: number; readonly frn?: number; readonly frd?: number; readonly shift?: number }): Uint8Array;
export function mp3(o: { readonly frames: number; readonly kbps?: number; readonly xing?: boolean; readonly id3?: boolean }): Uint8Array;
