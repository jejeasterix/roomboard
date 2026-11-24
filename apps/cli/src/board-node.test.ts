import { describe, expect, it } from "vitest";
import { BOARD_FAILED_MESSAGE } from "../../web/src/platform/board-reader";
import type { FormatsBinding } from "../../web/src/platform/container";
import { zipStored } from "../../web/src/platform/zip-worker";
import { nodeBoardPorts } from "./board-node";
import { borrowedAfterPanic } from "./testing";

const reader = () => ({ ops: () => new Float32Array([1]), texts: () => [], warnings: () => [], free: () => undefined });
const fail = (): never => {
  throw new Error("non appelé");
};
const modWith = (open: () => unknown): FormatsBinding =>
  ({ ContainerReader: { open: fail }, write_container: fail, BoardReader: { open }, write_board_xml: () => [], notebook_order: () => [] }) as unknown as FormatsBinding;
const xml = [new Uint8Array([60])];

describe("nodeBoardPorts (D20, D29)", () => {
  it("lecture : boardJobReply dans ce processus, une part, aucune panique", async () => {
    let panics = 0;
    const parts = await nodeBoardPorts(async () => modWith(reader), () => void panics++).read(xml, "iwb");
    expect(parts.map((p) => Array.from(p.ops))).toEqual([[1]]);
    expect(panics).toBe(0);
  });
  it("D29 — panique Wasm : rejet « lecture du tableau interrompue », onPanic une fois", async () => {
    let panics = 0;
    const ports = nodeBoardPorts(async () => modWith(() => { throw new WebAssembly.RuntimeError("unreachable"); }), () => void panics++);
    await expect(ports.read(xml, "iwb")).rejects.toThrow(BOARD_FAILED_MESSAGE);
    expect(panics).toBe(1);
  });
  it("D29 — panique dans ops() masquée par l'erreur de free() : onPanic quand même", async () => {
    let panics = 0;
    const ports = nodeBoardPorts(async () => modWith(borrowedAfterPanic), () => void panics++);
    await expect(ports.read(xml, "iwb")).rejects.toThrow(BOARD_FAILED_MESSAGE);
    expect(panics).toBe(1);
  });
  it("erreur connue du module : rendue telle quelle, pas une panique", async () => {
    let panics = 0;
    const ports = nodeBoardPorts(async () => modWith(() => { throw new Error("fichier endommagé : xml"); }), () => void panics++);
    await expect(ports.read(xml, "iwb")).rejects.toThrow("fichier endommagé : xml");
    expect(panics).toBe(0);
  });
  it("ZIP en mode board par zipJobReply", async () => {
    const z = zipStored([{ path: "content.xml", bytes: new TextEncoder().encode("<iwb/>") }, { path: "film.mpg", bytes: new Uint8Array([1]) }]);
    const entries = await nodeBoardPorts(async () => modWith(reader), () => undefined).unzip(new Blob([z as BlobPart]));
    expect(entries.map((e) => e.path)).toEqual(["content.xml"]);
  });
});
