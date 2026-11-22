/**
 * C13 : paperboards ActivInspire. Lot 2 (palier bas) : signature ` Bamboo ` (8 octets). Lot 3 (N11, N13, N15, N16) :
 * conteneur Bamboo (`readBamboo`), lu dans le Worker ZIP seul (`zip-worker.ts`, mode `bamboo`), d'après ActCraft
 * `formats/src/bamboo.cpp` : entiers petit-boutistes, chaînes UTF-16LE mesurées en octets, entrées compressées en
 * qCompress (u32 gros-boutiste = taille, puis zlib). La page n'importe que `hasBambooMagic` (fflate sans effet de bord :
 * `Unzlib` reste hors de son paquet).
 */
import { Unzlib } from "fflate";
import { safeArchivePath } from "./archive-path";

const BAMBOO_MAGIC = [0x20, 0x42, 0x61, 0x6d, 0x62, 0x6f, 0x6f, 0x20] as const;

export function hasBambooMagic(head: Uint8Array): boolean {
  return head.length >= BAMBOO_MAGIC.length && BAMBOO_MAGIC.every((b, i) => head[i] === b);
}

/** Bornes N13 (U26) : entrées comptées à tous les niveaux, octets décompressés annoncés, `.fpg` compris. */
export const BAMBOO_LIMITS: { readonly entries: number; readonly bytes: number } = Object.freeze({
  entries: 20_000,
  bytes: 256 * 1024 * 1024,
});

export const BAMBOO_NOT_FLIPCHART = "fichier endommagé : ce n'est pas un paperboard ActivInspire";
export const bambooLieMessage = (name: string): string => `fichier endommagé : entrée ${name} de taille mensongère`;
const NESTED_MESSAGE = "fichier endommagé : paperboard imbriqué trop profond";
const TOO_MANY_MESSAGE = "fichier endommagé : trop d'entrées dans le paperboard";
const TOO_BIG_MESSAGE = "fichier endommagé : paperboard trop gros une fois décompressé";
const NAME_MESSAGE = "fichier endommagé : nom d'entrée illisible";
const trunc = (): Error => new Error("fichier endommagé : entrée tronquée");

const UTF16 = new TextDecoder("utf-16le", { fatal: false });

/** Curseur borné : toute lecture hors des données lève, jamais d'octet lu au-delà. */
class Cur {
  pos: number;
  private readonly view: DataView;
  constructor(
    private readonly d: Uint8Array,
    pos: number,
  ) {
    this.pos = pos;
    this.view = new DataView(d.buffer, d.byteOffset, d.byteLength);
  }
  has(n: number): boolean {
    return n >= 0 && this.pos + n <= this.d.length;
  }
  u8(): number {
    if (!this.has(1)) throw trunc();
    return this.d[this.pos++]!;
  }
  u16(): number {
    if (!this.has(2)) throw trunc();
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32(): number {
    if (!this.has(4)) throw trunc();
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  /** u64 petit-boutiste : au-delà de 2^53, +Infinity (refusé par le budget ou par `bytes`). */
  u64(): number {
    const lo = this.u32();
    const hi = this.u32();
    return hi >= 0x200000 ? Number.POSITIVE_INFINITY : hi * 2 ** 32 + lo;
  }
  bytes(n: number): Uint8Array {
    if (!Number.isFinite(n) || !this.has(n)) throw trunc();
    const b = this.d.subarray(this.pos, this.pos + n);
    this.pos += n;
    return b;
  }
  /** QString : u32 = longueur en octets (0xFFFFFFFF : chaîne nulle), puis UTF-16LE. */
  qstring(): string {
    const n = this.u32();
    if (n === 0xffffffff) return "";
    if (n % 2 !== 0 || !this.has(n)) throw new Error(NAME_MESSAGE);
    return UTF16.decode(this.bytes(n));
  }
}

/** Pas de la décompression, réglé sur ce qui reste à décompresser : zlib rend au plus 1 032 octets par octet poussé,
 *  donc un pas de `ceil(reste / 1 032) + 1 024` octets produit au plus le reste plus ≈ 1 Mio ; 1 Kio au moins, 64 Kio
 *  au plus (≈ 66 Mio d'un pas, seulement quand l'annonce les permet). Un pas fixe de 64 Kio laisserait une bombe
 *  produire ≈ 64 Mio dès le premier pas, quelle que soit l'annonce. */
const ZLIB_MAX_RATIO = 1032;
const STEP_MIN = 1024;
const STEP_MAX = 64 * 1024;
const stepFor = (left: number): number => Math.min(STEP_MAX, Math.max(STEP_MIN, Math.ceil(left / ZLIB_MAX_RATIO) + STEP_MIN));

/**
 * qCompress borné. `announced` (taille de l'entrée, déjà comptée au budget) doit égaler l'en-tête ; décompression en
 * flux (`Unzlib`, pas `stepFor`), arrêtée au premier pas qui dépasse l'annonce ; la sortie doit l'atteindre exactement. Jamais
 * `unzlibSync` puis comparaison : la bombe entière serait décompressée avant (ActCraft `bamboo.cpp:157-171`, tampon de
 * la taille annoncée, jamais plus). Les morceaux sont gardés à mesure : rien n'est alloué sur la seule foi de l'annonce.
 */
function inflateBounded(raw: Uint8Array, announced: number, name: string): Uint8Array {
  const lie = (): Error => new Error(bambooLieMessage(name));
  if (raw.length < 4) throw lie();
  const head = raw[0]! * 0x1000000 + (raw[1]! << 16) + (raw[2]! << 8) + raw[3]!;
  if (head !== announced) throw lie();
  if (announced === 0) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let at = 0;
  const z = new Unzlib((chunk) => {
    if (at + chunk.length > announced) throw lie(); // bombe : arrêt au premier pas de trop
    if (chunk.length > 0) chunks.push(chunk);
    at += chunk.length;
  });
  try {
    for (let i = 4; i < raw.length; ) {
      const end = Math.min(raw.length, i + stepFor(announced - at));
      z.push(raw.subarray(i, end), end >= raw.length);
      i = end;
    }
  } catch {
    throw lie(); // dépassement ci-dessus, ou flux zlib illisible
  }
  if (at !== announced) throw lie();
  if (chunks.length === 1) return chunks[0]!;
  const out = new Uint8Array(at);
  let k = 0;
  for (const c of chunks) {
    out.set(c, k);
    k += c.length;
  }
  return out;
}

/**
 * Entrées gardées par `keep` d'un conteneur Bamboo, sous `limits` ; les `.fpg` (une page) sont lus comme conteneurs
 * imbriqués, un niveau au plus, leurs entrées rendues sous `<page>.fpg/<nom>`. Nom sorti selon `safeArchivePath` ou
 * refusé par `keep` : jamais décompressé. Budget d'octets pris sur la taille annoncée, avant toute décompression.
 */
export function readBamboo(
  data: Uint8Array,
  keep: (name: string) => boolean,
  limits: { readonly entries: number; readonly bytes: number },
): { path: string; bytes: Uint8Array }[] {
  const budget = { entries: limits.entries, bytes: limits.bytes };
  const out: { path: string; bytes: Uint8Array }[] = [];
  const walk = (d: Uint8Array, prefix: string, depth: number): void => {
    if (!hasBambooMagic(d)) throw new Error(BAMBOO_NOT_FLIPCHART);
    const c = new Cur(d, BAMBOO_MAGIC.length);
    c.u16(); // version
    c.qstring(); // format
    c.bytes(8); // réservé
    while (c.pos < d.length) {
      if (--budget.entries < 0) throw new Error(TOO_MANY_MESSAGE);
      const name = c.qstring();
      c.qstring(); // création
      c.qstring(); // modification
      c.qstring(); // accès
      const size = c.u64();
      const compressed = c.u8() !== 0;
      const raw = c.bytes(c.u64());
      const safe = safeArchivePath(name);
      if (safe === null || !keep(safe)) continue;
      const isFpg = safe.toLowerCase().endsWith(".fpg");
      if (isFpg && depth >= 1) throw new Error(NESTED_MESSAGE);
      if (size > budget.bytes) throw new Error(TOO_BIG_MESSAGE);
      budget.bytes -= size;
      let bytes: Uint8Array;
      if (compressed) bytes = inflateBounded(raw, size, safe);
      else if (raw.length === size) bytes = raw.slice();
      else throw new Error(bambooLieMessage(safe));
      if (isFpg) walk(bytes, `${prefix}${safe}/`, depth + 1);
      else out.push({ path: `${prefix}${safe}`, bytes });
    }
  };
  walk(data, "", 0);
  return out;
}
