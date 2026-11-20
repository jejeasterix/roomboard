import { describe, expect, it, vi } from "vitest";
import { PROFILE_EXTENSION, PROFILE_MIME } from "../profile-file";
import { createTauriProfileFiles, createWebProfileFiles, PROFILE_ACCEPT, PROFILE_FILTER } from "./profile-files";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("ProfileFiles (C1, P25)", () => {
  it("web : pick passe l'accept .rbprofile et décode l'UTF-8", async () => {
    const pickFile = vi.fn(async (_accept: string) => ({ name: "cm1.rbprofile", bytes: enc('{"label":"Été"}') }));
    const files = createWebProfileFiles({ pickFile, download: vi.fn() });
    expect(await files.pick()).toEqual({ name: "cm1.rbprofile", text: '{"label":"Été"}' });
    expect(pickFile).toHaveBeenCalledWith(PROFILE_ACCEPT);
    expect(PROFILE_ACCEPT.split(",")).toEqual([PROFILE_EXTENSION, PROFILE_MIME, "application/json"]);
  });

  it("web : boîte annulée → null", async () => {
    const files = createWebProfileFiles({ pickFile: vi.fn(async () => null), download: vi.fn() });
    expect(await files.pick()).toBeNull();
  });

  it("web : save télécharge le texte en UTF-8 avec le type du profil, rend vrai", async () => {
    const download = vi.fn();
    const files = createWebProfileFiles({ pickFile: vi.fn(), download });
    expect(await files.save("cm1.rbprofile", "Été")).toBe(true);
    const [name, bytes, mime] = download.mock.calls[0]!;
    expect(name).toBe("cm1.rbprofile");
    expect(new TextDecoder().decode(bytes as Uint8Array)).toBe("Été");
    expect(mime).toBe(PROFILE_MIME);
  });

  it("coque : open avec le filtre rbprofile, lecture du chemin choisi, nom = dernier segment", async () => {
    const dialog = { open: vi.fn(async () => "C:\\Users\\a\\cm1.rbprofile"), save: vi.fn(async () => null) };
    const fs = { readFile: vi.fn(async () => enc("texte")), writeFile: vi.fn(async () => undefined) };
    const files = createTauriProfileFiles(dialog, fs);
    expect(await files.pick()).toEqual({ name: "cm1.rbprofile", text: "texte" });
    expect(dialog.open).toHaveBeenCalledWith({ multiple: false, directory: false, filters: [PROFILE_FILTER] });
    expect(fs.readFile).toHaveBeenCalledWith("C:\\Users\\a\\cm1.rbprofile");
    expect(PROFILE_FILTER).toEqual({ name: "Profil RoomBoard", extensions: ["rbprofile"] });
  });

  it("coque : boîte annulée → null, rien lu ; save annulé → faux, rien écrit", async () => {
    const dialog = { open: vi.fn(async (): Promise<string | null> => null), save: vi.fn(async (): Promise<string | null> => null) };
    const fs = { readFile: vi.fn(async () => enc("")), writeFile: vi.fn(async () => undefined) };
    const files = createTauriProfileFiles(dialog, fs);
    expect(await files.pick()).toBeNull();
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(await files.save("cm1.rbprofile", "x")).toBe(false);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("coque : save écrit le texte au chemin choisi, nom proposé = defaultPath", async () => {
    const dialog = { open: vi.fn(async () => null), save: vi.fn(async () => "/home/u/cm1.rbprofile") };
    const fs = { readFile: vi.fn(async () => enc("")), writeFile: vi.fn(async (_p: string, _d: Uint8Array) => undefined) };
    const files = createTauriProfileFiles(dialog, fs);
    expect(await files.save("cm1.rbprofile", "Été")).toBe(true);
    expect(dialog.save).toHaveBeenCalledWith({ defaultPath: "cm1.rbprofile", filters: [PROFILE_FILTER] });
    const [path, data] = fs.writeFile.mock.calls[0]!;
    expect(path).toBe("/home/u/cm1.rbprofile");
    expect(new TextDecoder().decode(data)).toBe("Été");
  });
});
