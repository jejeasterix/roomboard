import { deflateSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { ZIP_MALFORMED_MESSAGE, ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";
import type { WorkerLike } from "./one-shot-worker";
import { checkZipBytesReply, checkZipReply, createZipReader, createZipWriter, ZIP_FAILED_MESSAGE, ZIP_WORKER_TIMEOUT_MS, ZIP_WRITE_FAILED_MESSAGE } from "./zip-read";
import { unzipModelEntries } from "./zip-worker";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/** C4 : faux Worker qui répond `reply(message)` au message reçu. */
function fakeWorker(reply: (m: unknown) => unknown): WorkerLike {
  const w: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(m) {
      queueMicrotask(() => w.onmessage?.({ data: reply(m) }));
    },
    terminate() {},
  };
  return w;
}

/** ZIP écrit à la main : une seule entrée locale stockée (méthode 0) de `data`, visée par un enregistrement du répertoire
 *  central par nom de `names` ; chacun déclare `data.length` octets lus et `declared` octets d'origine. */
function storedZip(data: Uint8Array, declared: number, names: readonly string[]): Uint8Array {
  const raw = names.map(enc);
  const body = 30 + raw[0]!.length;
  const cdStart = body + data.length;
  const cdSize = raw.reduce((s, n) => s + 46 + n.length, 0);
  const out = new Uint8Array(cdStart + cdSize + 22);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 20, true);
  v.setUint32(18, data.length, true);
  v.setUint32(22, declared, true);
  v.setUint16(26, raw[0]!.length, true);
  out.set(raw[0]!, 30);
  out.set(data, body);
  let o = cdStart;
  for (const n of raw) {
    v.setUint32(o, 0x02014b50, true);
    v.setUint16(o + 4, 20, true);
    v.setUint16(o + 6, 20, true);
    v.setUint32(o + 20, data.length, true);
    v.setUint32(o + 24, declared, true);
    v.setUint16(o + 28, n.length, true);
    out.set(n, o + 46); // décalage de l'en-tête local (o + 42) : 0, la même entrée pour tous
    o += 46 + n.length;
  }
  v.setUint32(o, 0x06054b50, true);
  v.setUint16(o + 8, names.length, true);
  v.setUint16(o + 10, names.length, true);
  v.setUint32(o + 12, cdSize, true);
  v.setUint32(o + 16, cdStart, true);
  return out;
}

describe("lecteur ZIP (C15, X16)", () => {
  it("ZIP : chemins .. et absolus ignorés, 1 000 entrées, 256 Mio", () => {
    const data = zipSync({
      "../x.obj": enc("v 0 0 0"),
      "/etc/y.obj": enc("v 0 0 0"),
      "a/../../z.obj": enc("v 0 0 0"),
      "ok/c.obj": enc("v 1 2 3"),
      "doc.txt": enc("x"),
    });
    const kept = unzipModelEntries(data);
    expect(kept.map((e) => e.path)).toEqual(["ok/c.obj"]);
    expect(new TextDecoder().decode(kept[0]!.bytes)).toBe("v 1 2 3");
    // Bornes réduites : comptées sur le répertoire central, avant décompression.
    const four = zipSync({ "a.obj": enc("v"), "b.obj": enc("v"), "c.obj": enc("v"), "d.obj": enc("v") });
    expect(() => unzipModelEntries(four, { entries: 3, bytes: 1e9 })).toThrow(ZIP_TOO_BIG_MESSAGE);
    expect(unzipModelEntries(four, { entries: 4, bytes: 1e9 })).toHaveLength(4);
    const eleven = zipSync({ "a.obj": enc("v 0 0 0 0 0") }); // 11 octets décompressés
    expect(() => unzipModelEntries(eleven, { entries: 1000, bytes: 10 })).toThrow(ZIP_TOO_BIG_MESSAGE);
    expect(unzipModelEntries(eleven, { entries: 1000, bytes: 11 })).toHaveLength(1);
    // Défauts : 1 000 entrées (non gardées comprises) et 256 Mio.
    expect(ZIP_MAX_ENTRIES).toBe(1000);
    expect(ZIP_MAX_BYTES).toBe(268435456);
    const many = (n: number) => zipSync(Object.fromEntries(Array.from({ length: n }, (_, i) => [`f${i}.txt`, enc("x")])));
    expect(unzipModelEntries(many(1000))).toEqual([]);
    expect(() => unzipModelEntries(many(1001))).toThrow(ZIP_TOO_BIG_MESSAGE);
  });

  it("ZIP hostile écrit à la main : entrée stockée déclarée plus petite, répertoire central répété (Q1)", () => {
    const body = new Uint8Array(100).fill(0x76); // 100 octets réels
    // Témoin : honnête, le ZIP fabriqué se lit (fflate copie `size` octets d'une entrée stockée).
    expect(unzipModelEntries(storedZip(body, 100, ["a.obj"])).map((e) => e.bytes.length)).toEqual([100]);
    // Déclarée 0 : sous le compte de la taille d'origine, 0 octet compté pour 100 copiés.
    expect(() => unzipModelEntries(storedZip(body, 0, ["a.obj"]))).toThrow(ZIP_MALFORMED_MESSAGE);
    // La bombe en petit : cinq enregistrements sur la même entrée, 500 octets copiés pour 0 déclaré, borne 250.
    const bomb = storedZip(body, 0, ["a.obj", "b.obj", "c.obj", "d.obj", "e.obj"]);
    expect(() => unzipModelEntries(bomb, { entries: 1000, bytes: 250 })).toThrow(ZIP_MALFORMED_MESSAGE);
    // Honnête mais répété : chaque enregistrement compte ses octets.
    const repeated = storedZip(body, 100, ["a.obj", "b.obj", "c.obj"]);
    expect(() => unzipModelEntries(repeated, { entries: 1000, bytes: 299 })).toThrow(ZIP_TOO_BIG_MESSAGE);
    expect(unzipModelEntries(repeated, { entries: 1000, bytes: 300 })).toHaveLength(3);
    // Déflatée : comptée au plus grand de ses deux tailles (« v » : 1 octet d'origine, plus une fois compressé).
    const sc = deflateSync(enc("v")).length;
    expect(sc).toBeGreaterThan(1);
    const v = zipSync({ "a.obj": enc("v") });
    expect(() => unzipModelEntries(v, { entries: 1000, bytes: sc - 1 })).toThrow(ZIP_TOO_BIG_MESSAGE);
    expect(unzipModelEntries(v, { entries: 1000, bytes: sc })).toHaveLength(1);
  });

  it("checkZipReply : forme contrôlée ; erreur rendue telle quelle", async () => {
    expect(() => checkZipReply({ error: ZIP_TOO_BIG_MESSAGE })).toThrow(ZIP_TOO_BIG_MESSAGE);
    expect(() => checkZipReply({})).toThrow(ZIP_FAILED_MESSAGE);
    expect(() => checkZipReply(null)).toThrow(ZIP_FAILED_MESSAGE);
    expect(() => checkZipReply({ entries: [{ path: 1 }] })).toThrow(ZIP_FAILED_MESSAGE);
    expect(() => checkZipReply({ entries: [{ path: "a.glb", bytes: [1, 2] }] })).toThrow(ZIP_FAILED_MESSAGE);
    const r = checkZipReply({ entries: [{ path: "a.glb", bytes: new Uint8Array([1, 2]) }] });
    expect(r.map((e) => e.path)).toEqual(["a.glb"]);
    expect(Array.from(new Uint8Array(await r[0]!.blob.arrayBuffer()))).toEqual([1, 2]);
  });

  it("createZipReader : un Worker par lecture, transféré, arrêté après la réponse", async () => {
    expect(ZIP_WORKER_TIMEOUT_MS).toBe(60_000);
    const spawned: Array<{ posted: unknown[]; transfer: Transferable[][]; terminated: number }> = [];
    const spawn = (answer = true) => (): WorkerLike => {
      const rec = { posted: [] as unknown[], transfer: [] as Transferable[][], terminated: 0 };
      spawned.push(rec);
      const w: WorkerLike = {
        onmessage: null,
        onerror: null,
        postMessage(m, t) {
          rec.posted.push(m);
          rec.transfer.push(t);
          if (answer) queueMicrotask(() => w.onmessage?.({ data: { entries: [{ path: "a.glb", bytes: new Uint8Array([7]) }] } }));
        },
        terminate() {
          rec.terminated++;
        },
      };
      return w;
    };
    const read = createZipReader(spawn());
    const a = await read(new Blob([new Uint8Array([1, 2, 3])]));
    const b = await read(new Blob([new Uint8Array([4])]));
    expect([a.map((e) => e.path), b.map((e) => e.path)]).toEqual([["a.glb"], ["a.glb"]]);
    expect(spawned).toHaveLength(2);
    expect(spawned.map((s) => s.terminated)).toEqual([1, 1]);
    const msg = spawned[0]!.posted[0] as { bytes: Uint8Array };
    expect(Array.from(msg.bytes)).toEqual([1, 2, 3]);
    expect(spawned[0]!.transfer[0]).toHaveLength(1);
    expect(spawned[0]!.transfer[0]![0]).toBe(msg.bytes.buffer);
    // Sans réponse : rejet au bout du délai, Worker arrêté quand même.
    await expect(createZipReader(spawn(false), 5)(new Blob([new Uint8Array([1])]))).rejects.toThrow(ZIP_FAILED_MESSAGE);
    expect(spawned).toHaveLength(3);
    expect(spawned[2]!.terminated).toBe(1);
  });
});

describe("C4 : paquet par le Worker ZIP", () => {
  it("C4 : createZipWriter envoie { op: \"zip\", files } et rend les octets", async () => {
    const posted: unknown[] = [];
    const spawn = () => fakeWorker((m) => { posted.push(m); return { bytes: new Uint8Array([1, 2]) }; });
    const write = createZipWriter(spawn);
    expect(await write([{ path: "manifest.json", bytes: new Uint8Array([7]) }])).toEqual(new Uint8Array([1, 2]));
    expect((posted[0] as { op: string }).op).toBe("zip");
  });

  it("C4 : createZipReader en mode pack envoie { op: \"unzip\", mode: \"pack\" }", async () => {
    const posted: unknown[] = [];
    const read = createZipReader(() => fakeWorker((m) => { posted.push(m); return { entries: [] }; }), 1000, "pack");
    expect(await read(new Blob([new Uint8Array([1])]))).toEqual([]);
    expect(posted[0]).toMatchObject({ op: "unzip", mode: "pack" });
  });

  it("C13 : createZipReader en mode board envoie { op: \"unzip\", mode: \"board\" }", async () => {
    const posted: unknown[] = [];
    const read = createZipReader(() => fakeWorker((m) => { posted.push(m); return { entries: [{ path: "content.xml", bytes: new Uint8Array([60]) }] }; }), 1000, "board");
    const got = await read(new Blob([new Uint8Array([1])]));
    expect(posted[0]).toMatchObject({ op: "unzip", mode: "board" });
    expect(got.map((e) => e.path)).toEqual(["content.xml"]);
    expect(got[0]!.blob).toBeInstanceOf(Blob);
  });

  it("C4 : createZipReader sans mode garde le message 3D { bytes } seul", async () => {
    const posted: unknown[] = [];
    const read = createZipReader(() => fakeWorker((m) => { posted.push(m); return { entries: [] }; }));
    await read(new Blob([new Uint8Array([1])]));
    expect(Object.keys(posted[0] as object)).toEqual(["bytes"]);
  });

  it("C4 : checkZipBytesReply : forme contrôlée ; erreur rendue telle quelle", () => {
    expect(() => checkZipBytesReply({ error: "x" })).toThrow("x");
    expect(() => checkZipBytesReply({})).toThrow(ZIP_WRITE_FAILED_MESSAGE);
    expect(() => checkZipBytesReply(null)).toThrow(ZIP_WRITE_FAILED_MESSAGE);
    expect(() => checkZipBytesReply({ bytes: [1] })).toThrow(ZIP_WRITE_FAILED_MESSAGE);
    expect(checkZipBytesReply({ bytes: new Uint8Array([3]) })).toEqual(new Uint8Array([3]));
  });

  it("C4 : un échec d'écriture du ZIP (délai, Worker en erreur) dit « écriture », pas « lecture »", async () => {
    const mute: WorkerLike = { onmessage: null, onerror: null, postMessage() {}, terminate() {} };
    await expect(createZipWriter(() => mute, 5)([])).rejects.toThrow("écriture du ZIP interrompue");
    expect(ZIP_WRITE_FAILED_MESSAGE).not.toBe(ZIP_FAILED_MESSAGE);
  });
});
