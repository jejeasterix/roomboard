import { describe, expect, it } from "vitest";
import { BOARD_FAILED_MESSAGE, BOARD_OBJECTS_MESSAGE, BOARD_WRITE_FAILED_MESSAGE, boardErrorMessage, checkBoardFiles, checkBoardParts, createBoardCodec } from "./board-reader";
import type { WorkerLike } from "./one-shot-worker";

function fakeWorker(reply: (m: unknown) => unknown, sent: unknown[] = [], transfers: Transferable[][] = []): WorkerLike {
  const w: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(m, t) {
      sent.push(m);
      transfers.push(t);
      queueMicrotask(() => w.onmessage?.({ data: reply(m) }));
    },
    terminate() {},
  };
  return w;
}

describe("Worker des tableaux (C13, D1, D6)", () => {
  it("C13 : read envoie { op: \"read\", dialect, files } transférés et rend les parties contrôlées", async () => {
    const sent: unknown[] = [];
    const transfers: Transferable[][] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ parts: [{ ops: new Float32Array([1]), texts: [], warnings: ["page 1 : 1 vidéo non lue"] }] }), sent, transfers));
    const parts = await codec.read([new Uint8Array([60, 105])], "iwb");
    expect(sent[0]).toMatchObject({ op: "read", dialect: "iwb" });
    expect(transfers[0]).toHaveLength(1);
    expect(parts[0]!.warnings).toEqual(["page 1 : 1 vidéo non lue"]);
    expect(Array.from(parts[0]!.ops)).toEqual([1]);
  });

  it("C13 : write envoie { op: \"write\", format, ops, texts } et rend les fichiers en octets UTF-8", async () => {
    const sent: unknown[] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ files: ["content.xml", "<iwb>é</iwb>"] }), sent));
    const files = await codec.write({ ops: new Float32Array([1]), texts: ["a"] }, "iwb");
    expect(sent[0]).toMatchObject({ op: "write", format: "iwb", texts: ["a"] });
    expect(files.map((f) => [f.path, new TextDecoder().decode(f.bytes)])).toEqual([["content.xml", "<iwb>é</iwb>"]]);
  });

  it("C13 : { error } du Worker rendu tel quel ; réponse mal formée : « lecture du tableau interrompue »", async () => {
    const broken = createBoardCodec(() => fakeWorker(() => ({ error: "fichier endommagé : XML mal formé" })));
    await expect(broken.read([new Uint8Array([1])], "iwb")).rejects.toThrow("fichier endommagé : XML mal formé");
    const odd = createBoardCodec(() => fakeWorker(() => ({ parts: [{ ops: [1], texts: [], warnings: [] }] })));
    await expect(odd.read([new Uint8Array([1])], "ubz")).rejects.toThrow(BOARD_FAILED_MESSAGE);
  });

  it("C13 : délai sans réponse : rejet, puis arrêt du Worker", async () => {
    let stopped = 0;
    const silent: WorkerLike = { onmessage: null, onerror: null, postMessage() {}, terminate() { stopped++; } };
    await expect(createBoardCodec(() => silent, 10).write({ ops: new Float32Array(), texts: [] }, "ubz")).rejects.toThrow(BOARD_WRITE_FAILED_MESSAGE);
    expect(stopped).toBe(1);
  });

  it("C13 : boardErrorMessage garde les messages du module, remplace une panique Wasm", () => {
    expect(boardErrorMessage(new Error("fichier endommagé : cadre de page invalide"), BOARD_FAILED_MESSAGE)).toBe("fichier endommagé : cadre de page invalide");
    expect(boardErrorMessage(new Error(BOARD_OBJECTS_MESSAGE), BOARD_FAILED_MESSAGE)).toBe(BOARD_OBJECTS_MESSAGE);
    expect(boardErrorMessage(new Error("liste de tableau invalide : code inconnu 9 à 0"), BOARD_WRITE_FAILED_MESSAGE)).toBe("liste de tableau invalide : code inconnu 9 à 0");
    expect(boardErrorMessage(new Error("unreachable"), BOARD_FAILED_MESSAGE)).toBe(BOARD_FAILED_MESSAGE);
    expect(boardErrorMessage(42, BOARD_WRITE_FAILED_MESSAGE)).toBe(BOARD_WRITE_FAILED_MESSAGE);
  });

  it("C13 : checkBoardParts et checkBoardFiles refusent les formes inattendues", () => {
    expect(() => checkBoardParts({ parts: "x" })).toThrow(BOARD_FAILED_MESSAGE);
    expect(() => checkBoardParts({ parts: [{ ops: new Float32Array(), texts: [1], warnings: [] }] })).toThrow(BOARD_FAILED_MESSAGE);
    expect(() => checkBoardFiles({ files: ["content.xml"] })).toThrow(BOARD_WRITE_FAILED_MESSAGE);
    expect(() => checkBoardFiles({ files: [1, 2] })).toThrow(BOARD_WRITE_FAILED_MESSAGE);
  });
});
