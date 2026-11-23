import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeAnnotationWindows, type FakeAnnotationOptions } from "../platform/annotation-fake";
import { addedToPageMessage, INK_LOST_MESSAGE, type AnnotationCommand } from "../platform/annotation-port";
import type { DroppedFile } from "../platform/files";
import type { ImportReport } from "../platform/import";
import { ANNOTATION_REMOTE_ACTIONS } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { createAnnotationController, createRemoteToolbarHost, offerCompatRelaunch, RELAUNCH_QUESTION, type AnnotationDeps } from "./annotation";
import type { ToolbarHost } from "./toolbar-host";

const report = (o: Partial<ImportReport> = {}): ImportReport => ({ opened: [], inserted: [], refused: [], failed: [], ...o });
const dropped = (name: string, size: number, mime: string): DroppedFile => ({
  name,
  size,
  mime,
  head: async () => new Uint8Array(),
  blob: async () => new Blob([]),
});
const png: DroppedFile = dropped("carre.png", 10, "image/png");

function setup(o: FakeAnnotationOptions & { tab?: string | null; screens?: number; report?: ImportReport } = {}) {
  const windows = createFakeAnnotationWindows(o);
  const log: string[] = [];
  let active = "t1";
  const deps: AnnotationDeps<string> = {
    windows,
    annotationTab: vi.fn(async () => (o.tab === undefined ? "ANN" : o.tab)),
    encodeTab: vi.fn(async () => new Uint8Array([5, 6, 7])),
    replaceAnnotation: vi.fn(async (b: Uint8Array) => {
      log.push(`replace ${b.length}`);
      return true;
    }),
    activeTabId: () => active,
    showTab: vi.fn((id: string) => {
      active = id;
      log.push(`show ${id}`);
    }),
    importFiles: vi.fn(async (f: readonly DroppedFile[]) => {
      log.push(`import ${f.map((x) => x.name).join(",")}`);
      return o.report ?? report();
    }),
    pageNumber: () => 1,
    say: vi.fn(async (m: string) => {
      log.push(`say ${m}`);
    }),
    bar: () => ({ dock: "top", thickness: 48 }),
    profile: () => BUILTIN_PROFILES[0]!,
    screens: o.screens ?? 1,
  };
  const ctl = createAnnotationController(deps);
  return { ctl, windows, deps, log, setActive: (id: string) => { active = id; } };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("contrôleur d'annotation (C11a)", () => {
  it("entrée : onglet encodé, document reçu en base64 par le canal JSON, actif en dessin, Stylo envoyé", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    expect(ctl.state()).toMatchObject({ active: true, pointer: "draw", screen: 0 });
    expect(windows.received()).toEqual(new Uint8Array([5, 6, 7]));
    expect(windows.sent[0]).toEqual({ kind: "setTool", tool: "pen" });
    expect(windows.log).toEqual(expect.arrayContaining(["enter 0", "pointer draw"]));
  });
  it("plafond : annotationTab null → pas d'entrée", async () => {
    const { ctl, windows } = setup({ tab: null });
    await ctl.enter();
    expect(ctl.state().active).toBe(false);
    expect(windows.log.some((l) => l.startsWith("enter"))).toBe(false);
  });
  it("double clic : une seule entrée (RF2, P6)", async () => {
    const { ctl, windows } = setup();
    await Promise.all([ctl.enter(), ctl.enter()]);
    expect(windows.log.filter((l) => l.startsWith("enter"))).toHaveLength(1);
  });
  it("entrée et sortie lancées ensemble : la sortie attend l'entrée (file unique, pas de refus)", async () => {
    const { ctl, windows } = setup();
    await Promise.all([ctl.enter(), ctl.exit()]);
    expect(ctl.state().active).toBe(false);
    expect(windows.log.filter((l) => l.startsWith("enter"))).toHaveLength(1);
    expect(windows.log).toContain("leave");
  });
  it("sortie, document changé : replaceAnnotation(octets rendus), puis onglet d'origine montré", async () => {
    const { ctl, deps, log, setActive } = setup({ draw: async (b) => new Uint8Array([...b, 1]) });
    await ctl.enter();
    setActive("autre");
    await ctl.exit();
    expect(ctl.state().active).toBe(false);
    expect(log).toEqual(["replace 4", "show t1"]);
    expect(deps.replaceAnnotation).toHaveBeenCalledWith(new Uint8Array([5, 6, 7, 1]));
  });
  it("sortie sans changement : replaceAnnotation non appelé", async () => {
    const { ctl, deps } = setup();
    await ctl.enter();
    await ctl.exit();
    expect(deps.replaceAnnotation).not.toHaveBeenCalled();
  });
  it("faux hôte muet : sortie après 5 s, avis, onglet inchangé (P4)", async () => {
    vi.useFakeTimers();
    const { ctl, deps, windows } = setup({ mute: true });
    await ctl.enter();
    const done = ctl.exit();
    await vi.advanceTimersByTimeAsync(4999);
    expect(ctl.state().active).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(ctl.state().active).toBe(false);
    expect(deps.say).toHaveBeenCalledWith(INK_LOST_MESSAGE);
    expect(deps.replaceAnnotation).not.toHaveBeenCalled();
    expect(windows.log).toContain("leave");
  });
  it("bascule : Sélection → souris, autre outil → dessin ; toggle revient au dernier outil de dessin (P8)", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    ctl.command({ kind: "setTool", tool: "rect" });
    ctl.command({ kind: "setTool", tool: "select" });
    await Promise.resolve();
    expect(ctl.state().pointer).toBe("mouse");
    await ctl.toggle();
    expect(ctl.state().pointer).toBe("draw");
    expect(windows.sent.at(-1)).toEqual({ kind: "setTool", tool: "rect" });
    await ctl.toggle();
    expect(windows.sent.at(-1)).toEqual({ kind: "setTool", tool: "select" });
    expect(windows.log).toEqual(expect.arrayContaining(["pointer mouse", "pointer draw"]));
  });
  it("demande de sortie (Échap, CloseRequested simulé) : sortie", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    windows.requestExit();
    await vi.waitFor(() => expect(ctl.state().active).toBe(false));
  });
  it("dépôt sur la zone : sortie d'abord, puis importFiles(files, null) ; objet inséré → « ajouté à la page N » (P17)", async () => {
    const { ctl, deps, log } = setup({ report: report({ inserted: ["carre.png"] }) });
    await ctl.enter();
    await ctl.dropOnZone([png], { x: 3, y: 4 });
    expect(log).toEqual(["show t1", "import carre.png", `say ${addedToPageMessage(1)}`]);
    expect(deps.importFiles).toHaveBeenCalledWith([png], null);
  });
  it("dépôt d'un document : nouvel onglet par importFiles, aucun avis d'ajout", async () => {
    const { ctl, log } = setup({ report: report({ opened: ["x.roomboard"] }) });
    await ctl.enter();
    await ctl.dropOnZone([dropped("x.roomboard", 3, "")], null);
    expect(log.some((l) => l.startsWith("say"))).toBe(false);
  });
  it("dépôt refusé : sortie faite, aucun avis d'ajout (RF4)", async () => {
    const { ctl, log } = setup({ report: report({ refused: ["x.exe"] }) });
    await ctl.enter();
    await ctl.dropOnZone([dropped("x.exe", 3, "")], null);
    expect(ctl.state().active).toBe(false);
    expect(log.some((l) => l.startsWith("say"))).toBe(false);
  });
  it("écran suivant : place sur l'écran suivant ; rien à un écran", async () => {
    const two = setup({ screens: 2 });
    await two.ctl.enter();
    await two.ctl.nextScreen();
    expect(two.ctl.state().screen).toBe(1);
    expect(two.windows.log).toContain("place 1");
    const one = setup({ screens: 1 });
    await one.ctl.enter();
    await one.ctl.nextScreen();
    expect(one.windows.log.some((l) => l.startsWith("place"))).toBe(false);
  });
  it("échec de l'entrée : état rendu inactif, avis « Annotation impossible »", async () => {
    const { ctl, windows, deps } = setup();
    windows.enter = async () => {
      throw new Error("pas d'écran");
    };
    await ctl.enter();
    expect(ctl.state().active).toBe(false);
    expect(deps.say).toHaveBeenCalledWith("Annotation impossible : pas d'écran");
  });
  it("close : sortie si active, puis annotate détruite", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    expect(await ctl.close()).toBe(true);
    expect(windows.log.slice(-2)).toEqual(["leave", "close"]);
  });
  it("encodeTab qui lève : enter ne rejette pas, avis « Annotation impossible », état inactif", async () => {
    const { ctl, deps, log } = setup();
    (deps.encodeTab as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("encodage"));
    await expect(ctl.enter()).resolves.toBeUndefined();
    expect(ctl.state().active).toBe(false);
    expect(log.some((l) => l.startsWith("say Annotation impossible"))).toBe(true);
  });
  it("replaceAnnotation qui lève : exit ne rejette pas, avis, onglet d'origine montré", async () => {
    const { ctl, deps, log } = setup({ draw: async (b) => new Uint8Array([...b, 1]) });
    (deps.replaceAnnotation as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("remplacement"));
    await ctl.enter();
    await expect(ctl.exit()).resolves.toBeUndefined();
    expect(log.some((l) => l.startsWith("say Annotation impossible"))).toBe(true);
    expect(log).toContain("show t1");
  });
  it("demande de sortie alors que la principale n'est plus en annotation : annotate est quand même cachée", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    await ctl.exit();
    const leaves = () => windows.log.filter((l) => l === "leave").length;
    const before = leaves();
    windows.requestExit();
    await new Promise((r) => setTimeout(r, 0));
    expect(leaves()).toBe(before + 1);
  });
  it("onChange : prévenu à l'entrée et à la sortie", async () => {
    const { ctl } = setup();
    const seen: boolean[] = [];
    ctl.onChange(() => seen.push(ctl.state().active));
    await ctl.enter();
    await ctl.exit();
    expect(seen).toContain(true);
    expect(seen.at(-1)).toBe(false);
  });
});

describe("hôte de barre distant (P21)", () => {
  const local = (): ToolbarHost & { calls: string[] } => {
    const calls: string[] = [];
    const rec = (n: string) => (...a: unknown[]) => void calls.push(`${n} ${JSON.stringify(a)}`);
    return { calls, setTool: rec("setTool"), runAction: rec("runAction"), dropFiles: rec("dropFiles"), setMode: rec("setMode"), tableFill: rec("tableFill"), fillColor: rec("fillColor"), fillTolerance: rec("fillTolerance"), textFormat: rec("textFormat"), selection: rec("selection"), imagePanel: rec("imagePanel") };
  };
  it("outils, préréglages, pot, format et actions transmises → send ; actions de la principale → local ; autres ignorées", () => {
    const sent: AnnotationCommand[] = [];
    const l = local();
    const h = createRemoteToolbarHost((m) => sent.push(m), l, ANNOTATION_REMOTE_ACTIONS);
    h.setTool("pen", "rouge");
    h.setTool("select");
    h.fillColor(null);
    h.fillTolerance(12);
    h.textFormat({ type: "bold" });
    h.runAction("undo");
    h.runAction("desktop-annotation");
    h.runAction("file-save");
    h.dropFiles([png], null);
    h.selection("copy");
    expect(sent).toEqual([
      { kind: "setTool", tool: "pen", preset: "rouge" },
      { kind: "setTool", tool: "select" },
      { kind: "fillColor", color: null },
      { kind: "fillTolerance", value: 12 },
      { kind: "textFormat", action: { type: "bold" } },
      { kind: "runAction", id: "undo" },
    ]);
    expect(l.calls).toEqual([`runAction ["desktop-annotation"]`, `dropFiles [[${JSON.stringify(png)}],null]`]);
  });
});

describe("relance en mode compatibilité (P16)", () => {
  it("Wayland et profil « Annotation au démarrage » : question ; oui → relaunch", async () => {
    const ask = vi.fn(async () => true);
    const relaunch = vi.fn(async () => undefined);
    expect(await offerCompatRelaunch({ supported: false, reason: "wayland", screens: 1 }, "desktop-annotation", ask, relaunch)).toBe(true);
    expect(ask).toHaveBeenCalledWith(RELAUNCH_QUESTION);
    expect(relaunch).toHaveBeenCalledTimes(1);
  });
  it("non → pas de relance ; tableau ou capacité présente → aucune question", async () => {
    const relaunch = vi.fn(async () => undefined);
    expect(await offerCompatRelaunch({ supported: false, reason: "wayland", screens: 1 }, "desktop-annotation", async () => false, relaunch)).toBe(false);
    const ask = vi.fn(async () => true);
    await offerCompatRelaunch({ supported: false, reason: "wayland", screens: 1 }, "board", ask, relaunch);
    await offerCompatRelaunch({ supported: true, reason: null, screens: 1 }, "desktop-annotation", ask, relaunch);
    expect(ask).not.toHaveBeenCalled();
    expect(relaunch).not.toHaveBeenCalled();
  });
});
