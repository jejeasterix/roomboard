// Octets des assets d'un document (U4, K13, DAK3) : empreinte SHA-256 → Blob. Les métadonnées (nom, type, taille)
// restent dans le cœur (racine `assets`, K3) ; aucun octet ne passe au module Wasm de l'encre. Une instance par
// document, donc par onglet (D27 amendée). `pick` ne trie pas : le conteneur trie à l'écriture (K12).
export type AssetId = string;
export type AssetHasher = (blob: Blob) => Promise<AssetId>;

const ASSET_ID = /^[0-9a-f]{64}$/;
export const isAssetId = (s: unknown): s is string => typeof s === "string" && ASSET_ID.test(s);

const hex = (buf: ArrayBuffer): string => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

/** Web Crypto : contexte sûr exigé (coque, https, localhost) ; le Worker de la partie « reste » pourra le remplacer (HK6). */
export const webCryptoHasher: AssetHasher = async (blob) => hex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));

export interface AssetStore {
  /** Calcule l'empreinte ; un contenu déjà présent garde son premier Blob ; le Blob gardé est une copie en mémoire. */
  put(blob: Blob): Promise<AssetId>;
  /** Octets déjà vérifiés (lecture du conteneur) ; lève si l'empreinte n'est pas conforme. */
  adopt(id: AssetId, blob: Blob): void;
  get(id: AssetId): Blob | undefined;
  has(id: AssetId): boolean;
  /** Présents dans l'ordre reçu, absents à part. */
  pick(ids: readonly AssetId[]): { present: Array<readonly [AssetId, Blob]>; missing: AssetId[] };
}

export function createAssetStore(hash: AssetHasher = webCryptoHasher): AssetStore {
  const blobs = new Map<AssetId, Blob>();
  const keep = (id: AssetId, blob: Blob): void => {
    if (!blobs.has(id)) blobs.set(id, blob);
  };
  return {
    async put(blob) {
      // Octets lus une seule fois : l'empreinte et le Blob gardé viennent du même tampon, en mémoire. Un Blob adossé à
      // un fichier disque (dépôt, sélecteur) échouerait ou changerait si le fichier source bougeait avant Ctrl+S.
      const copy = new Blob([await blob.arrayBuffer()], { type: blob.type });
      const id = await hash(copy);
      if (!isAssetId(id)) throw new Error(`empreinte d'asset invalide : ${id}`);
      keep(id, copy);
      return id;
    },
    adopt(id, blob) {
      if (!isAssetId(id)) throw new Error(`empreinte d'asset invalide : ${id}`);
      keep(id, blob);
    },
    get: (id) => blobs.get(id),
    has: (id) => blobs.has(id),
    pick(ids) {
      const present: Array<readonly [AssetId, Blob]> = [];
      const missing: AssetId[] = [];
      for (const id of ids) {
        const b = blobs.get(id);
        if (b) present.push([id, b] as const);
        else missing.push(id);
      }
      return { present, missing };
    },
  };
}
