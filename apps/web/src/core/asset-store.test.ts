import { describe, expect, it } from "vitest";
import { createAssetStore, isAssetId, webCryptoHasher, type AssetHasher } from "./asset-store";

const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("AssetStore (K13)", () => {
  it("webCryptoHasher : vecteurs communs avec container::sha256_hex", async () => {
    expect(await webCryptoHasher(new Blob(["abc"]))).toBe(ABC);
    expect(await webCryptoHasher(new Blob([]))).toBe(EMPTY_HASH);
  });

  it("même Blob deux fois : même empreinte, un seul Blob gardé (S2)", async () => {
    const store = createAssetStore();
    const first = new Blob(["abc"], { type: "image/png" });
    const second = new Blob(["abc"], { type: "image/png" });
    expect(await store.put(first)).toBe(ABC);
    expect(await store.put(second)).toBe(ABC);
    expect(store.get(ABC)).toBe(first);
    expect(store.has(ABC)).toBe(true);
  });

  it("pick rend les présents dans l'ordre reçu et les absents à part, sans trier", async () => {
    const store = createAssetStore();
    const empty = new Blob([]);
    await store.put(new Blob(["abc"]));
    await store.put(empty);
    const missing = "0".repeat(64);
    const r = store.pick([EMPTY_HASH, missing, ABC]);
    expect(r.present.map(([id]) => id)).toEqual([EMPTY_HASH, ABC]);
    expect(r.present[0]?.[1]).toBe(empty);
    expect(r.missing).toEqual([missing]);
  });

  it("adopt garde des octets déjà vérifiés par le conteneur, refuse une empreinte non conforme", () => {
    const store = createAssetStore();
    const b = new Blob(["abc"]);
    store.adopt(ABC, b);
    expect(store.get(ABC)).toBe(b);
    store.adopt(ABC, new Blob(["autre"]));
    expect(store.get(ABC)).toBe(b);
    expect(() => store.adopt(ABC.toUpperCase(), b)).toThrow("empreinte d'asset invalide");
    expect(store.has(ABC.toUpperCase())).toBe(false);
  });

  it("put contrôle l'empreinte rendue par le hasher : majuscules refusées, rien n'est rangé", async () => {
    const store = createAssetStore(async () => "A".repeat(64));
    await expect(store.put(new Blob(["x"]))).rejects.toThrow("empreinte d'asset invalide");
    expect(store.has("A".repeat(64))).toBe(false);
    expect(store.pick(["A".repeat(64)])).toEqual({ present: [], missing: ["A".repeat(64)] });
  });

  it("l'empreinte est injectée : le hasher donné est seul appelé", async () => {
    let calls = 0;
    const hash: AssetHasher = async () => {
      calls++;
      return "f".repeat(64);
    };
    const store = createAssetStore(hash);
    expect(await store.put(new Blob(["x"]))).toBe("f".repeat(64));
    expect(calls).toBe(1);
  });

  it("une instance par document : deux stores ne partagent rien", async () => {
    const a = createAssetStore();
    const b = createAssetStore();
    await a.put(new Blob(["abc"]));
    expect(b.has(ABC)).toBe(false);
    expect(b.get(ABC)).toBeUndefined();
  });

  it("isAssetId : 64 caractères hexadécimaux minuscules seulement", () => {
    expect(isAssetId(ABC)).toBe(true);
    expect(isAssetId(ABC.toUpperCase())).toBe(false);
    expect(isAssetId(ABC.slice(1))).toBe(false);
    expect(isAssetId("")).toBe(false);
  });
});
