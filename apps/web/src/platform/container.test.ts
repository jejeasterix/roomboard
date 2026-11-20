import { describe, expect, it, vi } from "vitest";
import { CodecUnavailableError, createPageCodec, type FormatsBinding, type ReaderBinding } from "./container";

function fakeBinding(o: { assets?: Array<[string, Uint8Array]>; warnings?: string[]; refuse?: string } = {}) {
  const freed: number[] = [];
  const writes: unknown[][] = [];
  let opened = 0;
  const binding: FormatsBinding = {
    ContainerReader: {
      open(file: Uint8Array): ReaderBinding {
        if (o.refuse !== undefined) throw new Error(o.refuse);
        const n = ++opened;
        const assets = o.assets ?? [];
        return {
          manifest: () => new Uint8Array([1]),
          ybin: () => file,
          asset_count: () => assets.length,
          asset_id: (i) => assets[i]?.[0],
          asset_bytes: (i) => assets[i]?.[1],
          warnings: () => o.warnings ?? [],
          free: () => {
            freed.push(n);
          },
        };
      },
    },
    write_container: (...args) => {
      writes.push(args);
      return new Uint8Array([9, 9]);
    },
  };
  return { binding, freed, writes };
}

const blobOf = (...b: number[]): Blob => new Blob([new Uint8Array(b)]);

describe("codec du conteneur dans la page (R10, DAR1)", () => {
  it("module chargé au premier besoin, une seule fois", async () => {
    const f = fakeBinding();
    const load = vi.fn(async () => f.binding);
    const codec = createPageCodec(load);
    expect(load).not.toHaveBeenCalled();
    await codec.read(blobOf(1));
    await codec.read(blobOf(2));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("read : manifeste, ybin, assets en Blob, avertissements ; lecteur libéré", async () => {
    const id = "a".repeat(64);
    const f = fakeBinding({ assets: [[id, new Uint8Array([1, 2, 3])]], warnings: ["asset ignoré : x"] });
    const c = await createPageCodec(async () => f.binding).read(blobOf(7, 8));
    expect([Array.from(c.manifest), Array.from(c.ybin), c.warnings]).toEqual([[1], [7, 8], ["asset ignoré : x"]]);
    expect(c.assets.map(([i]) => i)).toEqual([id]);
    expect(Array.from(new Uint8Array(await c.assets[0]![1].arrayBuffer()))).toEqual([1, 2, 3]);
    expect(f.freed).toEqual([1]);
  });

  it("fichier refusé : l'erreur du cœur passe telle quelle (pas un module indisponible)", async () => {
    const f = fakeBinding({ refuse: "ce fichier n'est pas un document RoomBoard" });
    const r = createPageCodec(async () => f.binding).read(blobOf(1));
    await expect(r).rejects.toThrow("ce fichier n'est pas un document RoomBoard");
    await expect(r).rejects.not.toBeInstanceOf(CodecUnavailableError);
  });

  it("module qui ne se charge pas : CodecUnavailableError, nouvel essai au besoin suivant", async () => {
    const f = fakeBinding();
    const load = vi.fn<() => Promise<FormatsBinding>>().mockRejectedValueOnce(new Error("404")).mockResolvedValue(f.binding);
    const codec = createPageCodec(load);
    const first = codec.read(blobOf(1));
    await expect(first).rejects.toBeInstanceOf(CodecUnavailableError);
    await expect(first).rejects.toThrow("module des images indisponible : 404");
    await expect(codec.read(blobOf(1))).resolves.toMatchObject({ warnings: [] });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("write : assets bout à bout, empreintes, types et tailles dans l'ordre reçu", async () => {
    const f = fakeBinding();
    const m = new Uint8Array([1]);
    const y = new Uint8Array([2]);
    const out = await createPageCodec(async () => f.binding).write(m, y, [
      { id: "a", mime: "image/png", blob: blobOf(1, 2) },
      { id: "b", mime: "image/gif", blob: blobOf(3) },
    ]);
    expect(Array.from(out)).toEqual([9, 9]);
    const [wm, wy, ids, mimes, sizes, bytes] = f.writes[0]!;
    expect([wm, wy, ids, mimes]).toEqual([m, y, ["a", "b"], ["image/png", "image/gif"]]);
    expect([Array.from(sizes as Uint32Array), Array.from(bytes as Uint8Array)]).toEqual([[2, 1], [1, 2, 3]]);
  });
});
