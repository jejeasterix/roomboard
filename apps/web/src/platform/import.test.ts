import { describe, expect, it, vi } from "vitest";
import type { DroppedFile } from "./files";
import { createImporter, isRoomboardName, LATER_FORMAT_MESSAGE } from "./import";

const file = (name: string, bytes = new Uint8Array([80, 75, 3, 4]), path?: string): DroppedFile => ({
  name, size: bytes.length, mime: "", path, blob: async () => new Blob([bytes]),
});

describe("importFiles (T86, usage § 8 point 12, Q1)", () => {
  it("un .roomboard s'ouvre (nouvel onglet), sans cible d'écriture (CL5b-4)", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument, notify }).importFiles([file("Cours.roomboard", new Uint8Array([1, 2]))]);
    expect(openDocument).toHaveBeenCalledWith({ name: "Cours.roomboard", bytes: new Uint8Array([1, 2]), target: null });
    expect(r).toEqual({ opened: ["Cours.roomboard"], refused: [], failed: [] });
    expect(notify).not.toHaveBeenCalled();
  });

  it("fichier non .roomboard : message, document intact", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument, notify }).importFiles([file("photo.png"), file("cours.flipchart")]);
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.refused).toEqual(["photo.png", "cours.flipchart"]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0]![0]).toBe(`photo.png, cours.flipchart : ${LATER_FORMAT_MESSAGE}`);
  });

  it("mélange : chaque .roomboard ouvert dans l'ordre, les autres refusés en un seul message", async () => {
    const opened: string[] = [];
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: async (f) => (opened.push(f.name), true), notify })
      .importFiles([file("a.roomboard"), file("b.txt"), file("C.ROOMBOARD")]);
    expect(opened).toEqual(["a.roomboard", "C.ROOMBOARD"]);
    expect(r.refused).toEqual(["b.txt"]);
  });

  it("ouverture refusée ou lecture qui lève : rangé dans failed, les autres continuent", async () => {
    const bad: DroppedFile = { name: "x.roomboard", size: 1, mime: "", blob: async () => { throw new Error("disque"); } };
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: async (f) => f.name !== "y.roomboard", notify })
      .importFiles([bad, file("y.roomboard"), file("z.roomboard")]);
    expect(r).toEqual({ opened: ["z.roomboard"], refused: [], failed: ["x.roomboard", "y.roomboard"] });
    expect(notify).toHaveBeenCalledWith("Ouverture impossible (x.roomboard) : disque");
  });

  it("liste vide : rien", async () => {
    const notify = vi.fn(async () => undefined);
    expect(await createImporter({ openDocument: async () => true, notify }).importFiles([])).toEqual({ opened: [], refused: [], failed: [] });
    expect(notify).not.toHaveBeenCalled();
  });

  it("extension seule, insensible à la casse ; « .roomboard.txt » refusé", () => {
    expect(isRoomboardName("a.RoomBoard")).toBe(true);
    expect(isRoomboardName("a.roomboard.txt")).toBe(false);
    expect(isRoomboardName("roomboard")).toBe(false);
  });
});
