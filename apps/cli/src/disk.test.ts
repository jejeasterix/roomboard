import { chmodSync, linkSync, lstatSync, readdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nowOf, readBytes, writeAtomic } from "./disk";
import { codeOf, stampOf, tmpDir } from "./testing";

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
  it("nowOf : ROOMBOARD_NOW (millisecondes depuis l'époque) en date ISO, sinon l'heure ISO du système", () => {
    expect(nowOf({ ROOMBOARD_NOW: "1795392000000" })).toBe("2026-11-23T00:00:00.000Z");
    expect(nowOf({ ROOMBOARD_NOW: "1700000000000" })).toBe("2023-11-14T22:13:20.000Z");
    expect(nowOf({})).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
  it("nowOf : ROOMBOARD_NOW qui n'est pas un entier positif représentable : usage", () => {
    for (const v of ["", "abc", "0", "-5", "1.5", "1e12", " 12", "2026-11-23T00:00:00.000Z", "99999999999999999"]) {
      expect(codeOf(() => nowOf({ ROOMBOARD_NOW: v }))).toBe("usage");
    }
  });
  it("writeAtomic sur un lien symbolique : écrit la cible réelle, garde le lien et les droits de la cible", async () => {
    const dir = tmpDir();
    const real = join(dir, "vrai.roomboard");
    const link = join(dir, "lien.roomboard");
    writeFileSync(real, new Uint8Array([9]));
    chmodSync(real, 0o640);
    symlinkSync("vrai.roomboard", link);
    await writeAtomic(link, new Uint8Array([1, 2]));
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect([...readFileSync(real)]).toEqual([1, 2]);
    expect(statSync(real).mode & 0o777).toBe(0o640);
    expect(readdirSync(dir).sort()).toEqual(["lien.roomboard", "vrai.roomboard"]);
  });
  it("writeAtomic garde les droits d'un fichier ordinaire existant (0600)", async () => {
    const f = join(tmpDir(), "x.roomboard");
    writeFileSync(f, new Uint8Array([9]));
    chmodSync(f, 0o600);
    await writeAtomic(f, new Uint8Array([1]));
    expect(statSync(f).mode & 0o777).toBe(0o600);
  });
  it("stampOf distingue « non écrit » de « réécrit à l'identique », que la comparaison des octets ne voit pas", async () => {
    const f = join(tmpDir(), "x.roomboard");
    writeFileSync(f, new Uint8Array([1, 2]));
    const before = stampOf(f);
    await writeAtomic(f, new Uint8Array([1, 2]));
    expect(stampOf(f).bytes).toBe(before.bytes);
    expect(stampOf(f)).not.toEqual(before);
  });
});
