import { describe, expect, it, vi } from "vitest";
import { createTauriTypedFiles, createWebTypedFiles, type FileType } from "./typed-files";

const T: FileType = { extension: ".rbitem", mime: "application/x-roomboard-item", filter: { name: "Objet RoomBoard", extensions: ["rbitem"] }, accept: ".rbitem,application/x-roomboard-item" };
const b = (...x: number[]) => new Uint8Array(x);

describe("fichiers typés (DAZ4)", () => {
  it("web : pick passe l'accept du type et rend les octets", async () => {
    const pickFile = vi.fn(async (_a: string) => ({ name: "x.rbitem", bytes: b(1) }));
    expect(await createWebTypedFiles({ pickFile, download: vi.fn() }, T).pick()).toEqual({ name: "x.rbitem", bytes: b(1) });
    expect(pickFile).toHaveBeenCalledWith(T.accept);
  });
  it("web : save télécharge les octets avec le type MIME, rend vrai", async () => {
    const download = vi.fn();
    expect(await createWebTypedFiles({ pickFile: vi.fn(), download }, T).save("Sélection.rbitem", b(2))).toBe(true);
    expect(download).toHaveBeenCalledWith("Sélection.rbitem", b(2), T.mime);
  });
  it("coque : open filtré, nom = dernier segment", async () => {
    const dialog = { open: vi.fn(async () => "/home/u/x.rbitem"), save: vi.fn(async () => null) };
    const fs = { readFile: vi.fn(async () => b(3)), writeFile: vi.fn(async () => undefined) };
    expect(await createTauriTypedFiles(dialog, fs, T).pick()).toEqual({ name: "x.rbitem", bytes: b(3) });
    expect(dialog.open).toHaveBeenCalledWith({ multiple: false, directory: false, filters: [T.filter] });
  });
  it("coque : save au chemin choisi, defaultPath = nom proposé", async () => {
    const dialog = { open: vi.fn(async () => null), save: vi.fn(async () => "/home/u/Sélection.rbitem") };
    const fs = { readFile: vi.fn(async () => b()), writeFile: vi.fn(async (_p: string, _d: Uint8Array) => undefined) };
    expect(await createTauriTypedFiles(dialog, fs, T).save("Sélection.rbitem", b(4))).toBe(true);
    expect(dialog.save).toHaveBeenCalledWith({ defaultPath: "Sélection.rbitem", filters: [T.filter] });
    expect(fs.writeFile).toHaveBeenCalledWith("/home/u/Sélection.rbitem", b(4));
  });
  it("coque : boîtes annulées → null et faux, rien lu ni écrit", async () => {
    const dialog = { open: vi.fn(async (): Promise<string | null> => null), save: vi.fn(async (): Promise<string | null> => null) };
    const fs = { readFile: vi.fn(async () => b()), writeFile: vi.fn(async () => undefined) };
    const files = createTauriTypedFiles(dialog, fs, T);
    expect(await files.pick()).toBeNull();
    expect(await files.save("a", b())).toBe(false);
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
