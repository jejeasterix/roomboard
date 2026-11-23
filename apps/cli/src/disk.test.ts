import { linkSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nowOf, readBytes, writeAtomic } from "./disk";
import { tmpDir } from "./testing";

describe("disque (D3, H6)", () => {
  it("writeAtomic écrit le fichier sans laisser de temporaire", async () => {
    const dir = tmpDir();
    const f = join(dir, "x.roomboard");
    await writeAtomic(f, new Uint8Array([1, 2, 3]));
    expect([...readFileSync(f)]).toEqual([1, 2, 3]);
    expect(readdirSync(dir)).toEqual(["x.roomboard"]);
  });
  it("writeAtomic remplace la cible par rename, jamais en place : un lien dur vers l'ancienne garde ses octets", async () => {
    // Discrimine D3 : un `writeFile` direct sur la cible réécrirait l'inode partagé, et le lien lirait [1, 2].
    const dir = tmpDir();
    const f = join(dir, "x.roomboard");
    const old = join(dir, "ancien");
    writeFileSync(f, new Uint8Array([9]));
    linkSync(f, old);
    await writeAtomic(f, new Uint8Array([1, 2]));
    expect([...readFileSync(f)]).toEqual([1, 2]);
    expect([...readFileSync(old)]).toEqual([9]);
    expect(readdirSync(dir).sort()).toEqual(["ancien", "x.roomboard"]);
  });
  it("dossier absent : erreur io, aucun fichier ni temporaire", async () => {
    const dir = tmpDir();
    await expect(writeAtomic(join(dir, "absent", "x.roomboard"), new Uint8Array([1]))).rejects.toMatchObject({ code: "io" });
    expect(readdirSync(dir)).toEqual([]);
  });
  it("readBytes d'un fichier absent : erreur io", async () => {
    await expect(readBytes(join(tmpDir(), "absent.roomboard"))).rejects.toMatchObject({ code: "io" });
  });
  it("nowOf : ROOMBOARD_NOW sinon l'heure ISO du système", () => {
    expect(nowOf({ ROOMBOARD_NOW: "2026-11-23T00:00:00.000Z" })).toBe("2026-11-23T00:00:00.000Z");
    expect(nowOf({})).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
