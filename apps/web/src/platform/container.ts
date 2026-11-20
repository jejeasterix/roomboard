/**
 * Conteneur `.roomboard` avec assets, servi dans la page (R10, DAR1) : second module Wasm (`roomboard-formats-wasm`),
 * chargé au premier besoin par le `load` reçu et gardé jusqu'au rechargement (HR6). Port asynchrone, `Blob` en entrée :
 * un Worker pourra le servir sans changer les appelants. Module qui ne se charge pas : `CodecUnavailableError` (repli R7).
 */
export interface ContainerAsset {
  readonly id: string;
  readonly mime: string;
  readonly blob: Blob;
}

export interface ContainerContents {
  readonly manifest: Uint8Array;
  readonly ybin: Uint8Array;
  /** Triés par empreinte (ordre du conteneur). */
  readonly assets: ReadonlyArray<readonly [string, Blob]>;
  /** Entrées `assets/` ignorées, en français (K11). */
  readonly warnings: readonly string[];
}

export interface ContainerCodec {
  /** Lève `CodecUnavailableError` si le module ne se charge pas ; une Error au message du cœur si le fichier est refusé. */
  read(file: Blob): Promise<ContainerContents>;
  /** Manifeste et `document.ybin` de `saveParts`, puis les assets ; lève si une empreinte ne correspond pas. */
  write(manifest: Uint8Array, ybin: Uint8Array, assets: readonly ContainerAsset[]): Promise<Uint8Array>;
}

export class CodecUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`module des images indisponible : ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "CodecUnavailableError";
  }
}

/** Forme du lecteur généré par wasm-bindgen (`ContainerReader`). */
export interface ReaderBinding {
  manifest(): Uint8Array;
  ybin(): Uint8Array;
  asset_count(): number;
  asset_id(i: number): string | undefined;
  asset_bytes(i: number): Uint8Array | undefined;
  warnings(): string[];
  free(): void;
}

/** Forme du module généré (`apps/web/src/wasm-formats/roomboard_formats_wasm.js`), après son initialisation. */
export interface FormatsBinding {
  readonly ContainerReader: { open(file: Uint8Array): ReaderBinding };
  write_container(
    manifest: Uint8Array,
    ybin: Uint8Array,
    ids: string[],
    mimes: string[],
    sizes: Uint32Array,
    bytes: Uint8Array,
  ): Uint8Array;
}

export function createPageCodec(load: () => Promise<FormatsBinding>): ContainerCodec {
  let loading: Promise<FormatsBinding> | null = null;
  const binding = async (): Promise<FormatsBinding> => {
    loading ??= load();
    try {
      return await loading;
    } catch (e) {
      loading = null; // un nouvel essai au prochain besoin
      throw new CodecUnavailableError(e);
    }
  };
  return {
    async read(file) {
      const mod = await binding();
      const reader = mod.ContainerReader.open(new Uint8Array(await file.arrayBuffer()));
      try {
        const assets: Array<readonly [string, Blob]> = [];
        for (let i = 0; i < reader.asset_count(); i++) {
          const id = reader.asset_id(i);
          const bytes = reader.asset_bytes(i);
          // wasm-bindgen rend un tableau neuf sur un ArrayBuffer à lui : le Blob le prend sans copie.
          if (id !== undefined && bytes !== undefined) assets.push([id, new Blob([bytes as Uint8Array<ArrayBuffer>])] as const);
        }
        return { manifest: reader.manifest(), ybin: reader.ybin(), assets, warnings: reader.warnings() };
      } finally {
        reader.free();
      }
    },
    async write(manifest, ybin, assets) {
      const mod = await binding();
      const chunks = await Promise.all(assets.map(async (a) => new Uint8Array(await a.blob.arrayBuffer())));
      const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
      let at = 0;
      for (const c of chunks) {
        bytes.set(c, at);
        at += c.byteLength;
      }
      return mod.write_container(
        manifest,
        ybin,
        assets.map((a) => a.id),
        assets.map((a) => a.mime),
        Uint32Array.from(chunks, (c) => c.byteLength),
        bytes,
      );
    },
  };
}
