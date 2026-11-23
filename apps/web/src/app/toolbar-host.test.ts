import { describe, expect, it, vi } from "vitest";
import { ACTION_TABLE, type Profile } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { ACTIONS, createLocalToolbarHost, type HostTargets } from "./toolbar-host";

function setup(over: { eraserMode?: "partial" | "object" } = {}, profile: Profile = BUILTIN_PROFILES[0]!) {
  const engine = {
    setTool: vi.fn(), setEraserMode: vi.fn(), setPenStyle: vi.fn(), setFillColor: vi.fn(), setFillTolerance: vi.fn(), undo: vi.fn(), redo: vi.fn(),
    addPage: vi.fn(() => true), removePage: vi.fn(() => true), nextPage: vi.fn(() => true), prevPage: vi.fn(() => true),
    fitPage: vi.fn(), tableAction: vi.fn(), tableFill: vi.fn(), textFormat: vi.fn(), state: vi.fn(() => ({ eraserMode: over.eraserMode ?? "partial" })),
  };
  const t = { engine: () => engine, runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), exportPdf: vi.fn(), selection: vi.fn() } as unknown as HostTargets;
  const host = createLocalToolbarHost(t, () => profile);
  return { engine, t, host };
}

function setupWithAnnotation(active: boolean) {
  const s = setup();
  const annotation = {
    state: () => ({ active, pointer: "draw" as const, screen: null, screens: 1 }),
    enter: vi.fn(async () => undefined),
    exit: vi.fn(async () => undefined),
    toggle: vi.fn(async () => undefined),
    nextScreen: vi.fn(async () => undefined),
  };
  const t = { ...s.t, annotation } as HostTargets;
  return { ...s, t, host: createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!) };
}

describe("ToolbarHost local", () => {
  it('imagePanel → toggle("image") (C5, I25)', () => {
    const { host, t } = setup();
    host.imagePanel();
    expect(t.toggle).toHaveBeenCalledWith("image");
  });
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
  it("C4 : library bascule le panneau « library »", () => {
    const { host, t } = setup();
    host.runAction("library");
    expect(vi.mocked(t.toggle).mock.calls.map((c) => c[0])).toEqual(["library"]);
  });
  it('grid → toggle("grid") (E7)', () => {
    const { host, t } = setup();
    host.runAction("grid");
    expect(vi.mocked(t.toggle).mock.calls.map((c) => c[0])).toEqual(["grid"]);
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
  it("C11a : setMode desktop-annotation → annotation.enter, aucun message", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { host, t, engine } = setupWithAnnotation(false);
    host.setMode("desktop-annotation");
    expect(t.annotation!.enter).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    expect(engine.setTool).not.toHaveBeenCalled();
    info.mockRestore();
  });
  it("C11a : setMode desktop-annotation sans contrôleur (web) : rien, aucun message", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { host } = setup();
    host.setMode("desktop-annotation");
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
  it("C11a : desktop-annotation entre ou sort selon l'état ; pointer → toggle ; screen → nextScreen", () => {
    const off = setupWithAnnotation(false);
    off.host.runAction("desktop-annotation");
    expect(off.t.annotation!.enter).toHaveBeenCalledTimes(1);
    const on = setupWithAnnotation(true);
    on.host.runAction("desktop-annotation");
    on.host.runAction("annotation-pointer");
    on.host.runAction("annotation-screen");
    expect(on.t.annotation!.exit).toHaveBeenCalledTimes(1);
    expect(on.t.annotation!.toggle).toHaveBeenCalledTimes(1);
    expect(on.t.annotation!.nextScreen).toHaveBeenCalledTimes(1);
  });
  it("C11a : un enter ou exit rejeté est rattrapé (avertissement, aucun rejet non géré)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const off = setupWithAnnotation(false);
    (off.t.annotation!.enter as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("refusée"));
    off.host.runAction("desktop-annotation");
    off.host.setMode("desktop-annotation");
    const on = setupWithAnnotation(true);
    (on.t.annotation!.exit as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("refusée"));
    on.host.runAction("desktop-annotation");
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).toHaveBeenCalledTimes(3);
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
    const files = [{ name: "a.roomboard", size: 1, mime: "", head: async () => new Uint8Array(), blob: async () => new Blob() }];
    host.dropFiles(files, { x: 1, y: 2 });
    expect(t.importFiles).toHaveBeenCalledWith(files, { x: 1, y: 2 });
  });

  it('runAction("file-import") → runFile("import") (R18)', () => {
    const { host, t } = setup();
    host.runAction("file-import");
    expect(t.runFile).toHaveBeenCalledWith("import");
  });
});

describe("actions du tableau (C10b)", () => {
  it("actions du tableau (C10b) : Fusionner, Diviser, Ombrer, Désombrer → engine.tableAction", () => {
    const { host, engine } = setup();
    for (const id of ["table-merge", "table-split", "table-shade", "table-unshade"]) host.runAction(id);
    expect(engine.tableAction.mock.calls.map((c) => c[0])).toEqual(["merge", "split", "shade", "unshade"]);
  });
});

describe("ToolbarHost — tableau (C10a, DAC4)", () => {
  it("les cinq actions vont à engine.tableAction", () => {
    const { host, engine } = setup();
    for (const id of ["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform"]) host.runAction(id);
    expect(engine.tableAction.mock.calls.map((c) => c[0])).toEqual(["row-insert", "col-insert", "row-remove", "col-remove", "uniform"]);
  });
  it("tableFill → engine.tableFill (null retire)", () => {
    const { host, engine } = setup();
    host.tableFill("#fef08a");
    host.tableFill(null);
    expect(engine.tableFill.mock.calls).toEqual([["#fef08a"], [null]]);
  });
  it("outil Tableau : setTool(table) → engine.setTool(table)", () => {
    const { host, engine } = setup();
    host.setTool("table");
    expect(engine.setTool).toHaveBeenCalledWith("table");
  });
  it("textFormat → engine.textFormat (C7b, DAR4)", () => {
    const { host, engine } = setup();
    host.textFormat({ type: "bold" });
    host.textFormat({ type: "color", color: null });
    expect(engine.textFormat.mock.calls).toEqual([[{ type: "bold" }], [{ type: "color", color: null }]]);
  });
});

describe("ToolbarHost — pot (C6a, D16)", () => {
  it('setTool("fill", "bleu") sans clé presets.fill : couleur de FILL_COLORS → setFillColor puis setTool, jamais setPenStyle', () => {
    const { host, engine } = setup();
    host.setTool("fill", "bleu");
    expect(engine.setFillColor).toHaveBeenCalledWith("#1d4ed8");
    expect(engine.setPenStyle).not.toHaveBeenCalled();
    expect(engine.setTool).toHaveBeenCalledWith("fill");
    expect(engine.setFillColor.mock.invocationCallOrder[0]!).toBeLessThan(engine.setTool.mock.invocationCallOrder[0]!);
  });
  it("profil avec presets.fill : le préréglage du profil ; id inconnu : l'outil change, la couleur non", () => {
    const profile = { ...BUILTIN_PROFILES[0]!, presets: { fill: [{ id: "ambre", label: "Ambre", color: "#f59e0b", rest: {} }] } } as Profile;
    const { host, engine } = setup({}, profile);
    host.setTool("fill", "ambre");
    expect(engine.setFillColor).toHaveBeenCalledWith("#f59e0b");
    engine.setFillColor.mockClear();
    host.setTool("fill", "rouge");
    expect(engine.setFillColor).not.toHaveBeenCalled();
    expect(engine.setTool).toHaveBeenLastCalledWith("fill");
  });
  it("fillColor(null) : « Aucune » → setFillColor(null), sans changer d'outil ni le stylo", () => {
    const { host, engine } = setup();
    host.fillColor(null);
    expect(engine.setFillColor).toHaveBeenCalledWith(null);
    expect(engine.setTool).not.toHaveBeenCalled();
    expect(engine.setPenStyle).not.toHaveBeenCalled();
  });
  it("C6b fillTolerance(t) → setFillTolerance(t), sans changer d'outil (B10)", () => {
    const { host, engine } = setup();
    host.fillTolerance(12);
    expect(engine.setFillTolerance).toHaveBeenCalledWith(12);
    expect(engine.setTool).not.toHaveBeenCalled();
  });
});

describe("hôte de la barre : C3", () => {
  it("page-insert-file → insertPages()", () => {
    const { t, host } = setup();
    host.runAction("page-insert-file");
    expect(vi.mocked((t as unknown as { insertPages: () => void }).insertPages)).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(ACTIONS, "page-insert-file")).toBe(true);
    expect(ACTION_TABLE["page-insert-file"]?.label).toBe("Insérer des pages…");
  });
  it("selection(a) relayée telle quelle", () => {
    const { t, host } = setup();
    host.selection("ungroup");
    host.selection("export");
    expect(vi.mocked((t as unknown as { selection: (a: string) => void }).selection).mock.calls).toEqual([["ungroup"], ["export"]]);
  });
});

describe("barre : Exporter en PDF (C12, PF19)", () => {
  it("export-pdf → exportPdf()", () => {
    const { t, host } = setup();
    host.runAction("export-pdf");
    expect(vi.mocked((t as unknown as { exportPdf: () => void }).exportPdf)).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(ACTIONS, "export-pdf")).toBe(true);
  });
  it("sans exportPdf (hôte partiel) : rien, aucune erreur (PC9)", () => {
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn() } as unknown as HostTargets;
    expect(() => createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!).runAction("export-pdf")).not.toThrow();
  });
});

describe("barre : copies au format (C13, D17)", () => {
  it("C13 : export-iwb → exportBoard(\"iwb\") ; export-ubz → exportBoard(\"ubz\")", () => {
    const exportBoard = vi.fn();
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn(), exportBoard } as unknown as HostTargets;
    const host = createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!);
    host.runAction("export-iwb");
    host.runAction("export-ubz");
    expect(exportBoard.mock.calls).toEqual([["iwb"], ["ubz"]]);
  });
  it("C13 : sans exportBoard (hôte partiel) : rien, aucune erreur", () => {
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn() } as unknown as HostTargets;
    expect(() => createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!).runAction("export-iwb")).not.toThrow();
  });
});

describe("barre : Modifier dans l'application d'origine (C16, O19)", () => {
  it("edit-original → editOriginal() ; libellé dans ACTION_TABLE", () => {
    const { t, host } = setup();
    (t as unknown as { editOriginal: () => void }).editOriginal = vi.fn();
    host.runAction("edit-original");
    expect(vi.mocked((t as unknown as { editOriginal: () => void }).editOriginal)).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(ACTIONS, "edit-original")).toBe(true);
    expect(ACTION_TABLE["edit-original"]?.label).toBe("Modifier dans l'application d'origine");
  });
  it("sans editOriginal (hôte partiel) : rien, aucune erreur", () => {
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn() } as unknown as HostTargets;
    expect(() => createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!).runAction("edit-original")).not.toThrow();
  });
});
