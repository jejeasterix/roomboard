import { describe, expect, it, vi } from "vitest";
import { ACTION_TABLE, type Profile } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { ACTIONS, createLocalToolbarHost, type HostTargets } from "./toolbar-host";

function setup(over: { eraserMode?: "partial" | "object" } = {}, profile: Profile = BUILTIN_PROFILES[0]!) {
  const engine = {
    setTool: vi.fn(), setEraserMode: vi.fn(), setPenStyle: vi.fn(), undo: vi.fn(), redo: vi.fn(),
    addPage: vi.fn(() => true), removePage: vi.fn(() => true), nextPage: vi.fn(() => true), prevPage: vi.fn(() => true),
    fitPage: vi.fn(), state: vi.fn(() => ({ eraserMode: over.eraserMode ?? "partial" })),
  };
  const t = { engine: () => engine, runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn() } as unknown as HostTargets;
  const host = createLocalToolbarHost(t, () => profile);
  return { engine, t, host };
}

describe("ToolbarHost local", () => {
  it('setTool("rect") → engine.setTool("rect")', () => {
    const { host, engine } = setup();
    host.setTool("rect");
    expect(engine.setTool).toHaveBeenCalledWith("rect");
  });
  it('setTool("laser") inconnu → rien', () => {
    const { host, engine } = setup();
    host.setTool("laser");
    expect(engine.setTool).not.toHaveBeenCalled();
  });
  it('setTool("pen", "rouge") → setPenStyle puis setTool', () => {
    const { host, engine } = setup();
    host.setTool("pen", "rouge");
    expect(engine.setPenStyle).toHaveBeenCalledWith({ color: "#dc2626", width: 4 });
    expect(engine.setTool).toHaveBeenCalledWith("pen");
    expect(engine.setPenStyle.mock.invocationCallOrder[0]!).toBeLessThan(engine.setTool.mock.invocationCallOrder[0]!);
  });
  it("préréglage inconnu : l'outil change, le style non", () => {
    const { host, engine } = setup();
    host.setTool("pen", "nexistepas");
    expect(engine.setPenStyle).not.toHaveBeenCalled();
    expect(engine.setTool).toHaveBeenCalledWith("pen");
  });
  it("chaque action d'ACTION_TABLE a son entrée dans ACTIONS", () => {
    for (const id of Object.keys(ACTION_TABLE)) expect(Object.hasOwn(ACTIONS, id), id).toBe(true);
  });
  it("file-save → runFile(save)", () => {
    const { host, t } = setup();
    host.runAction("file-save");
    expect(t.runFile).toHaveBeenCalledWith("save");
  });
  it("file-new, file-open, file-save-as", () => {
    const { host, t } = setup();
    host.runAction("file-new"); host.runAction("file-open"); host.runAction("file-save-as");
    expect(vi.mocked(t.runFile).mock.calls.map((c) => c[0])).toEqual(["new", "open", "saveAs"]);
  });
  it("undo, redo, pages, fit-page → moteur", () => {
    const { host, engine } = setup();
    for (const id of ["undo", "redo", "page-add", "page-remove", "page-next", "page-prev", "fit-page"]) host.runAction(id);
    expect(engine.undo).toHaveBeenCalled(); expect(engine.redo).toHaveBeenCalled();
    expect(engine.addPage).toHaveBeenCalled(); expect(engine.removePage).toHaveBeenCalled();
    expect(engine.nextPage).toHaveBeenCalled(); expect(engine.prevPage).toHaveBeenCalled();
    expect(engine.fitPage).toHaveBeenCalled();
  });
  it("eraser-mode bascule partial → object et inversement", () => {
    const a = setup(); a.host.runAction("eraser-mode");
    expect(a.engine.setEraserMode).toHaveBeenCalledWith("object");
    const b = setup({ eraserMode: "object" }); b.host.runAction("eraser-mode");
    expect(b.engine.setEraserMode).toHaveBeenCalledWith("partial");
  });
  it("settings et profiles → toggle", () => {
    const { host, t } = setup();
    host.runAction("settings"); host.runAction("profiles");
    expect(vi.mocked(t.toggle).mock.calls.map((c) => c[0])).toEqual(["settings", "profiles"]);
  });
  it("action inconnue → rien", () => {
    const { host, t } = setup();
    expect(() => host.runAction("toString")).not.toThrow();
    expect(t.runFile).not.toHaveBeenCalled();
  });
  it("setMode desktop-annotation : aucun effet, message C11a", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { host, engine } = setup();
    host.setMode("desktop-annotation");
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]![0])).toContain("C11a");
    expect(warn).not.toHaveBeenCalled();
    expect(engine.setTool).not.toHaveBeenCalled();
    info.mockRestore();
    warn.mockRestore();
  });
  it('setMode("board") : rien, aucun message', () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { host, engine } = setup();
    host.setMode("board");
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(engine.setTool).not.toHaveBeenCalled();
    info.mockRestore();
    warn.mockRestore();
  });
  it("préréglage ajouté (S4) : setTool(pen, quatrième) → setPenStyle reçoit sa couleur et son épaisseur", () => {
    const d = BUILTIN_PROFILES[0]!;
    const five: Profile = {
      ...d,
      presets: { ...d.presets, pen: [...(d.presets.pen ?? []), { id: "couleur", label: "Couleur 4", color: "#16a34a", width: 6, rest: {} }, { id: "couleur-2", label: "Couleur 5", color: "#9333ea", width: 2, rest: {} }] },
    };
    const { host, engine } = setup({}, five);
    host.setTool("pen", "couleur");
    expect(engine.setPenStyle).toHaveBeenCalledWith({ color: "#16a34a", width: 6 });
    expect(engine.setTool).toHaveBeenCalledWith("pen");
  });
  it("dropFiles → importFiles", () => {
    const { host, t } = setup();
    const files = [{ name: "a.roomboard", size: 1, mime: "", blob: async () => new Blob() }];
    host.dropFiles(files, { x: 1, y: 2 });
    expect(t.importFiles).toHaveBeenCalledWith(files, { x: 1, y: 2 });
  });
});
