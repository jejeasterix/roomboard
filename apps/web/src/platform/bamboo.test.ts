import { Unzlib, unzlibSync, zipSync, zlibSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bambooContainer, makeFlipchart } from "../../../../scripts/essais/fabriques/flipchart.mjs";
import {
  BAMBOO_LIMITS,
  BAMBOO_NOT_FLIPCHART,
  bambooLieMessage,
  hasBambooMagic,
  readBamboo,
} from "./bamboo";
import { bambooEntries, keepBambooPath } from "./zip-worker";

describe("bamboo (C13 lot 2)", () => {
  it("C13 N4 : hasBambooMagic", () => {
    expect(hasBambooMagic(new Uint8Array([0x20, 0x42, 0x61, 0x6d, 0x62, 0x6f, 0x6f, 0x20, 1, 2]))).toBe(true);
    expect(hasBambooMagic(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 0, 0]))).toBe(false);
    expect(hasBambooMagic(new Uint8Array([0x20, 0x42, 0x61, 0x6d, 0x62, 0x6f, 0x6f]))).toBe(false);
  });
});

// Données « empoisonnées » : leur compression rend un flux zlib invalide (bloc de type 3), les décompresser lève.
const poison = new Set<Uint8Array>();
function poisoned(size = 16): Uint8Array {
  const d = new Uint8Array(size).fill(9);
  poison.add(d);
  return d;
}
const deflate = (b: Uint8Array): Uint8Array =>
  poison.has(b) ? Uint8Array.of(0x78, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff) : zlibSync(b);

/** Flux zlib de `total` zéros écrit à la main (Huffman fixe : un littéral 0, puis des copies longueur 258 distance 1,
 *  13 bits chacune) : 300 Mio tiennent en ~2 Mo, fabriqués sans jamais allouer la sortie. */
function zeroBomb(total: number): Uint8Array {
  const pairs = Math.floor((total - 1) / 258);
  const tail = total - 1 - pairs * 258;
  const bits = 16 + 3 + 8 + pairs * 13 + tail * 8 + 7;
  const out = new Uint8Array(Math.ceil(bits / 8) + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let bit = 16;
  const put = (value: number, n: number): void => {
    for (let i = 0; i < n; i++, bit++) if ((value >>> i) & 1) out[bit >>> 3] = out[bit >>> 3]! | (1 << (bit & 7));
  };
  put(1, 1); // BFINAL
  put(1, 2); // BTYPE = 01, Huffman fixe
  put(0x0c, 8); // littéral 0 (code 00110000, bits dans l'ordre du flux)
  for (let k = 0; k < pairs; k++) put(0xa3, 13); // longueur 258 (code 11000101) puis distance 1 (00000)
  for (let k = 0; k < tail; k++) put(0x0c, 8);
  put(0, 7); // fin de bloc
  const end = Math.ceil(bit / 8);
  new DataView(out.buffer).setUint32(end, (((total % 65521) << 16) | 1) >>> 0, false); // Adler-32 de zéros
  return out.subarray(0, end + 4);
}

/** Octets compressés poussés dans `Unzlib` depuis le début de l'espion. */
const pushedBytes = (spy: { mock: { calls: unknown[][] } }): number =>
  spy.mock.calls.reduce((n, [chunk]) => n + (chunk as Uint8Array).length, 0);

const paths = (data: Uint8Array, keep: (n: string) => boolean = keepBambooPath): string[] =>
  readBamboo(data, keep, BAMBOO_LIMITS).map((e) => e.path);

describe("bamboo : conteneur borné (C13 lot 3, N11, N13, N15, N16)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("C13 N13 : bombe qCompress arrêtée", () => {
    // Témoin : la bombe est un vrai flux zlib.
    expect(unzlibSync(zeroBomb(5000))).toEqual(new Uint8Array(5000));
    const shown = new Uint8Array(1024); // 1 024 o annoncés (u64 et en-tête qCompress)
    const stream = zeroBomb(300 * 1024 * 1024);
    const data = bambooContainer([{ name: "100.io", data: shown, compressed: true }], (b) => (b === shown ? stream : zlibSync(b)));
    const push = vi.spyOn(Unzlib.prototype, "push");
    const t0 = performance.now();
    expect(() => readBamboo(data, keepBambooPath, BAMBOO_LIMITS)).toThrow(bambooLieMessage("100.io"));
    expect(performance.now() - t0).toBeLessThan(2000);
    // Décompression en flux, arrêtée au premier pas qui dépasse l'annonce : seul le début du flux est poussé
    // (unzlibSync du tout : 0 poussé et 300 Mio alloués ; un seul push du tout : ~2 Mo poussés).
    const pushed = pushedBytes(push);
    expect(pushed).toBeGreaterThan(0);
    expect(pushed).toBeLessThanOrEqual(128 * 1024);
    expect(pushed * 8).toBeLessThan(stream.length);
  });

  it("C13 N13 : taille annoncée plus grande que la réalité", () => {
    const data = makeFlipchart([{}], zlibSync, { lie: { entry: "100.io", announced: 1_000_000 } });
    expect(() => paths(data)).toThrow(bambooLieMessage("100.io"));
    // Témoin : honnête, le même paperboard se lit.
    expect(paths(makeFlipchart([{}], zlibSync))).toContain("100.io");
  });

  it("C13 N13 : entrée stockée d'une autre taille que l'annonce", () => {
    const stored = (announced: number): Uint8Array =>
      bambooContainer([{ name: "1.io", data: new Uint8Array(10), compressed: false, announced }], deflate);
    expect(() => paths(stored(5))).toThrow(bambooLieMessage("1.io"));
    expect(() => paths(stored(20))).toThrow(bambooLieMessage("1.io"));
    const [entry] = readBamboo(stored(10), keepBambooPath, BAMBOO_LIMITS);
    expect(entry).toEqual({ path: "1.io", bytes: new Uint8Array(10) });
  });

  it("C13 N13 : taille annoncée au-delà du budget, rien décompressé", () => {
    const data = bambooContainer([{ name: "100.io", data: poisoned(2000), compressed: true }], deflate);
    const push = vi.spyOn(Unzlib.prototype, "push");
    expect(() => readBamboo(data, keepBambooPath, { entries: 10, bytes: 1000 })).toThrow(
      "fichier endommagé : paperboard trop gros une fois décompressé",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("C13 N13 : somme des tailles décompressées bornée", () => {
    const data = bambooContainer(
      [
        { name: "1.io", data: new Uint8Array(600).fill(1), compressed: true },
        { name: "2.io", data: new Uint8Array(600).fill(2), compressed: true },
      ],
      deflate,
    );
    expect(() => readBamboo(data, keepBambooPath, { entries: 10, bytes: 1000 })).toThrow(
      "fichier endommagé : paperboard trop gros une fois décompressé",
    );
    expect(readBamboo(data, keepBambooPath, { entries: 10, bytes: 1200 }).map((e) => e.bytes.length)).toEqual([600, 600]);
  });

  it("C13 N13 : en-tête qCompress différent de l'annonce", () => {
    // En-tête 49, taille u64 50, flux de 50 octets : seul l'en-tête ment.
    const shown = new Uint8Array(49);
    const real = new Uint8Array(50).fill(7);
    const data = bambooContainer([{ name: "100.io", data: shown, compressed: true, announced: 50 }], (b) =>
      zlibSync(b === shown ? real : b),
    );
    expect(() => paths(data)).toThrow(bambooLieMessage("100.io"));
  });

  it("C13 N13 : .fpg dans un .fpg refusé", () => {
    expect(() => paths(makeFlipchart([{}], zlibSync, { nestFpg: true }))).toThrow(
      "fichier endommagé : paperboard imbriqué trop profond",
    );
  });

  it("C13 N13 : 20 001 entrées refusées", () => {
    // Racine d'un paperboard sans page : 101.in, 100.io, puis 19 999 entrées vides (fabriqué une fois, test léger).
    const data = makeFlipchart([], zlibSync, { extraEntries: 19_999 });
    expect(() => paths(data)).toThrow("fichier endommagé : trop d'entrées dans le paperboard");
    // Témoin : une entrée de plus permise, le même conteneur se lit.
    expect(readBamboo(data, keepBambooPath, { ...BAMBOO_LIMITS, entries: 20_001 }).map((e) => e.path)).toEqual(["101.in", "100.io"]);
  });

  it("C13 N13 : chaîne UTF-16 de longueur impaire", () => {
    expect(() => paths(makeFlipchart([{}], zlibSync, { oddUtf16: true }))).toThrow("fichier endommagé : nom d'entrée illisible");
  });

  it("C13 N13 : entrée tronquée", () => {
    const data = makeFlipchart([{}], zlibSync);
    expect(() => paths(data.subarray(0, data.length - 5))).toThrow("fichier endommagé : entrée tronquée");
  });

  it("C13 N13 : ce qui n'est pas un conteneur Bamboo est refusé, à la racine comme dans un .fpg", () => {
    expect(() => paths(zipSync({ "a.txt": new Uint8Array([1]) }))).toThrow(BAMBOO_NOT_FLIPCHART);
    const nested = bambooContainer([{ name: "1003.fpg", data: new Uint8Array(32).fill(3), compressed: true }], deflate);
    expect(() => paths(nested)).toThrow(BAMBOO_NOT_FLIPCHART);
    expect(BAMBOO_NOT_FLIPCHART).toBe("fichier endommagé : ce n'est pas un paperboard ActivInspire");
  });

  it("C13 N11 : deux pages lues avec leurs chemins <page>.fpg/<nom>", () => {
    const data = makeFlipchart([{ strokes: [{ points: [[0, 0], [5, 5]] }] }, {}], zlibSync);
    const out = readBamboo(data, keepBambooPath, BAMBOO_LIMITS);
    expect(out.map((e) => e.path)).toEqual([
      "101.in",
      "100.io",
      "1003.fpg/1003.in",
      "1003.fpg/1002.io",
      "1003.fpg/1011.io",
      "2003.fpg/2003.in",
      "2003.fpg/2002.io",
      "1500.ir",
    ]);
    expect(new TextDecoder().decode(out[0]!.bytes.subarray(0, 8))).toBe("# culm #");
    expect(hasBambooMagic(out[1]!.bytes)).toBe(true);
    expect(new TextDecoder().decode(out[5]!.bytes.subarray(0, 8))).toBe("# culm #");
  });

  it("C13 N15 : .tif, .thm, .wav, .swf jamais décompressés", () => {
    const data = bambooContainer(
      [
        { name: "100.io", data: new Uint8Array(8).fill(1), compressed: true },
        { name: "scan.tif", data: poisoned(), compressed: true },
        { name: "1003.thm", data: poisoned(), compressed: true },
        { name: "son.wav", data: poisoned(), compressed: true },
        { name: "anim.swf", data: poisoned(), compressed: true },
      ],
      deflate,
    );
    expect(paths(data)).toEqual(["100.io"]);
    // Témoin : le même poison sous un nom gardé lève.
    expect(() => paths(bambooContainer([{ name: "1.io", data: poisoned(), compressed: true }], deflate))).toThrow();
  });

  it("C13 N16 : ../x.io et __MACOSX ignorés", () => {
    const data = bambooContainer(
      [
        { name: "../x.io", data: poisoned(), compressed: true },
        { name: "__MACOSX/1.io", data: poisoned(), compressed: true },
        { name: "1.io", data: new Uint8Array(4).fill(1), compressed: true },
      ],
      deflate,
    );
    expect(paths(data)).toEqual(["1.io"]);
    // Le nom qui sort est écarté par readBamboo même si `keep` garde tout.
    const out = bambooContainer([{ name: "../x.io", data: poisoned(), compressed: true }], deflate);
    expect(paths(out, () => true)).toEqual([]);
  });

  it("C13 N15 : keepBambooPath", () => {
    for (const name of ["101.in", "1002.io", "1500.ir", "1003.fpg", "version", "photo.png", "a.JPG", "dessin.svg"]) {
      expect(keepBambooPath(name), name).toBe(true);
    }
    for (const name of ["scan.tif", "1003.thm", "son.wav", "anim.swf", "../x.io", "__MACOSX/1.io", "notes.txt"]) {
      expect(keepBambooPath(name), name).toBe(false);
    }
  });

  it("C13 lot 3 : image d'extension inconnue gardée sur sa signature (ActCraft `extensionOf`), le reste écarté", () => {
    const BMP = Uint8Array.of(0x42, 0x4d, ...new Array(30).fill(0));
    const PNG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13);
    const data = bambooContainer(
      [
        { name: "100.io", data: new Uint8Array(8).fill(1), compressed: true },
        { name: "1500.ek1056", data: BMP, compressed: true },
        { name: "4.ird", data: PNG, compressed: true },
        { name: "1501.cz2880", data: new Uint8Array(32).fill(7), compressed: true },
        { name: "notes.txt", data: poisoned(), compressed: true },
      ],
      deflate,
    );
    expect(bambooEntries(data).map((e) => e.path)).toEqual(["100.io", "1500.ek1056", "4.ird"]);
    for (const name of ["4.ird", "1500.ek1056", "1501.CZ2880"]) expect(keepBambooPath(name), name).toBe(true);
    for (const name of ["notes.txt", "1500.ek", "1500.e1056", "1500.abc", "1500.ek105", "1500.ek10560"]) expect(keepBambooPath(name), name).toBe(false);
  });

  it("C13 N13 : bornes du conteneur", () => {
    expect(BAMBOO_LIMITS).toEqual({ entries: 20_000, bytes: 256 * 1024 * 1024 });
  });
});

describe("bamboo : allocation et pas de décompression (T23)", () => {
  const pushed = (spy: { mock: { calls: unknown[][] } }): number => spy.mock.calls.reduce((n, c) => n + (c[0] as Uint8Array).length, 0);

  it("C13 N13 : aucune allocation de la taille annoncée (≈ 200 Mio annoncés, flux de ≈ 10 octets)", () => {
    // Fausse donnée de longueur 200 Mio (u64 et en-tête qCompress) dont la « compression » rend un flux de 9 octets.
    const announced = 200 * 1024 * 1024;
    const shown = { length: announced } as unknown as Uint8Array;
    const stream = zlibSync(Uint8Array.of(7));
    const data = bambooContainer([{ name: "1.io", data: shown, compressed: true }], (b) => (b === shown ? stream : zlibSync(b)));
    const push = vi.spyOn(Unzlib.prototype, "push");
    const sizes: number[] = [];
    const Real = Uint8Array;
    vi.stubGlobal(
      "Uint8Array",
      new Proxy(Real, {
        construct(t, args: unknown[], nt) {
          const a = args[0];
          sizes.push(typeof a === "number" ? a : a instanceof ArrayBuffer ? a.byteLength : 0);
          return Reflect.construct(t, args, nt) as object;
        },
      }),
    );
    try {
      expect(() => readBamboo(data, keepBambooPath, BAMBOO_LIMITS)).toThrow(bambooLieMessage("1.io"));
    } finally {
      vi.unstubAllGlobals();
    }
    expect(push).toHaveBeenCalled(); // l'en-tête égale l'annonce : la décompression a bien commencé
    push.mockRestore();
    expect(Math.max(0, ...sizes)).toBeLessThan(1024 * 1024);
  });

  it("C13 N13 : le pas suit le reste à décompresser (taux de zlib ≤ 1 032), jamais un pas fixe", () => {
    // 8 Mio de zéros : ≈ 8 Kio compressés ; annonce de 1 000 octets. Pas fixe de 64 Kio ou de 4 Kio : tout le flux
    // poussé d'un coup (fflate produit alors 8 Mio) ; pas réglé : ceil(1000 / 1032) + 1024 = 1 025 octets poussés.
    const shown = new Uint8Array(1000);
    const stream = zlibSync(new Uint8Array(8 * 1024 * 1024));
    expect(stream.length).toBeGreaterThan(4 * 1024);
    const data = bambooContainer([{ name: "1.io", data: shown, compressed: true }], (b) => (b === shown ? stream : zlibSync(b)));
    const push = vi.spyOn(Unzlib.prototype, "push");
    expect(() => readBamboo(data, keepBambooPath, BAMBOO_LIMITS)).toThrow(bambooLieMessage("1.io"));
    const n = pushed(push);
    push.mockRestore();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(1025);
  });
});
