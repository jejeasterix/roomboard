import { describe, expect, it, vi } from "vitest";

const fs = {
  readFile: vi.fn(async () => new Uint8Array()),
  writeFile: vi.fn(async () => undefined),
  readDir: vi.fn(async () => [{ name: "a.rbitem", isDirectory: false, isFile: true, isSymlink: false }]),
  mkdir: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  exists: vi.fn(async () => true),
};
const dialog = { open: vi.fn(async () => "/x/Partage"), save: vi.fn(), ask: vi.fn(), message: vi.fn() };
vi.mock("@tauri-apps/plugin-fs", () => fs);
vi.mock("@tauri-apps/plugin-dialog", () => dialog);
vi.mock("@tauri-apps/api/path", () => ({ documentDir: vi.fn(async () => "/home/u/Documents") }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => ({ onCloseRequested: vi.fn(async () => () => undefined), setTitle: vi.fn(async () => undefined) }) }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), convertFileSrc: (p: string) => p, Channel: class {} }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => undefined) }));

describe("C4 : ports de dossiers de la coque", () => {
  it("C4 : dirFs relaie readDir, mkdir, remove, exists au plugin-fs", async () => {
    const { loadTauriPorts } = await import("./host-tauri");
    const p = await loadTauriPorts();
    expect(await p.dirFs.readDir("/r")).toEqual([{ name: "a.rbitem", isDirectory: false }]);
    await p.dirFs.mkdir("/r/A", { recursive: true });
    await p.dirFs.remove("/r/A", { recursive: true });
    expect(await p.dirFs.exists("/r")).toBe(true);
    expect(fs.mkdir).toHaveBeenCalledWith("/r/A", { recursive: true });
    expect(fs.remove).toHaveBeenCalledWith("/r/A", { recursive: true });
  });

  it("C4 : documentDir et boîte de dossier (directory: true, recursive: true)", async () => {
    const { loadTauriPorts } = await import("./host-tauri");
    const p = await loadTauriPorts();
    expect(await p.documentDir()).toBe("/home/u/Documents");
    expect(await p.pickFolder("/x/Ancien")).toBe("/x/Partage");
    expect(dialog.open).toHaveBeenLastCalledWith(expect.objectContaining({ directory: true, recursive: true, multiple: false, defaultPath: "/x/Ancien" }));
  });
});
