import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";
import type { WorkerLike } from "./one-shot-worker";
import { checkZipReply, createZipReader, ZIP_FAILED_MESSAGE, ZIP_WORKER_TIMEOUT_MS } from "./zip-read";
import { unzipModelEntries } from "./zip-worker";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

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
