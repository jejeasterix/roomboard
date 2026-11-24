import { describe, expect, it } from "vitest";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { BAMBOO_NOT_FLIPCHART } from "../platform/bamboo";
import type { BoardCodec } from "../platform/board-reader";
import { inlineWorker } from "../platform/one-shot-worker";
import type { BoardPorts } from "./board-io";
import { BOARD_NO_PAGE_MESSAGE, UBZ_NOT_ZIP_MESSAGE } from "./board-files";
import { createBoardPorts, readBoardFile, writeBoardFile } from "./board-convert";

const ID = "ab".repeat(32);
const NOW = "2026-11-24T00:00:00Z";
const enc = (s: string) => new TextEncoder().encode(s);
function ports(over: Partial<BoardPorts> = {}): BoardPorts {
  return {
    unzip: async () => [],
    unbamboo: async () => [],
    zip: async (files) => new Uint8Array([files.length]),
    read: async () => [],
    readFlipchart: async () => ({ ops: new Float32Array(), texts: [], warnings: [] }),
    readOlf: async () => ({ ops: new Float32Array(), texts: [], warnings: [], total: 0 }),
    write: async () => [{ path: "content.xml", bytes: enc("<iwb/>") }],
    ...over,
  };
}
const deps = (p: BoardPorts) => ({
  core: fakeCore,
  ports: p,
  makeAssets: () => createAssetStore(async () => ID),
  decode: async (): Promise<never> => {
    throw new Error("non appelé");
  },
  now: () => NOW,
  appVersion: "0.1.0",
});

describe("board-convert (cli-lot2, DA8, D21)", () => {
  it("readBoardFile : messages de refus du produit (.ubz non ZIP, .flipchart sans Bamboo, tableau sans page)", async () => {
    await expect(readBoardFile({ name: "x.ubz", blob: new Blob([enc("texte")]), format: "ubz" }, deps(ports()))).rejects.toThrow(UBZ_NOT_ZIP_MESSAGE);
    await expect(readBoardFile({ name: "x.flipchart", blob: new Blob([enc("texte")]), format: "flipchart" }, deps(ports()))).rejects.toThrow(BAMBOO_NOT_FLIPCHART);
    const seen: unknown[] = [];
    const p = ports({ read: async (files, dialect, opts) => (seen.push(files.length, dialect, opts), []) });
    await expect(readBoardFile({ name: "x.iwb", blob: new Blob([enc("<iwb/>")]), format: "iwb" }, deps(p))).rejects.toThrow(BOARD_NO_PAGE_MESSAGE);
    expect(seen).toEqual([1, "iwb", undefined]);
  });
  it("writeBoardFile : XML écrits puis ZIP de [xml…, images…], avertissements de boardListOf", async () => {
    const doc = fakeCore.blank();
    const calls: string[] = [];
    const p = ports({
      write: async (_list, format) => (calls.push(`write:${format}`), [{ path: "content.xml", bytes: enc("<iwb/>") }]),
      zip: async (files) => (calls.push(`zip:${files.map((f) => f.path).join(",")}`), new Uint8Array([7])),
    });
    const r = await writeBoardFile(doc, createAssetStore(async () => ID), "iwb", p);
    expect(calls).toEqual(["write:iwb", "zip:content.xml"]);
    expect(r).toEqual({ bytes: new Uint8Array([7]), warnings: [] });
    doc.free();
  });
  it("createBoardPorts : ZIP en mode board et bamboo par le spawn donné ; XML par le codec", async () => {
    const sent: unknown[] = [];
    const zip = inlineWorker((m) => (sent.push(m), { data: { entries: [] }, transfer: [] }));
    const codec: BoardCodec = { read: async () => [], write: async () => [], readFlipchart: async () => ({ ops: new Float32Array(), texts: [], warnings: [] }) };
    const p = createBoardPorts({ zip }, codec);
    await p.unzip(new Blob([enc("a")]));
    await p.unbamboo(new Blob([enc("b")]));
    expect(sent.map((m) => (m as { mode: string }).mode)).toEqual(["board", "bamboo"]);
    expect(await p.read([], "iwb")).toEqual([]);
  });
});
