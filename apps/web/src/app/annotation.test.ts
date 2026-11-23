import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeAnnotationWindows, type FakeAnnotationOptions } from "../platform/annotation-fake";
import { addedToPageMessage, INK_LOST_MESSAGE, type AnnotationCommand, type CapturedImage, type CaptureOutcome, type SendRequest, type SendResult } from "../platform/annotation-port";
import type { DroppedFile } from "../platform/files";
import type { ImportReport } from "../platform/import";
import { ANNOTATION_REMOTE_ACTIONS, type StartMode } from "../toolbar";
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

function setup(
  o: FakeAnnotationOptions & {
    tab?: string | null;
    screens?: number;
    report?: ImportReport;
    backdrop?: boolean;
    startMode?: StartMode;
    originKind?: "board" | "annotation" | null;
    sent?: SendResult | null;
  } = {},
) {
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
    annotationBackdrop: vi.fn(() =>
      o.backdrop === true ? { ref: { id: "ab".repeat(32), name: "capture-du-bureau.png", mime: "image/png", size: 8 }, w: 320, h: 180 } : null,
    ),
    setAnnotationBackdrop: vi.fn(async (img: CapturedImage | null, page?: number) => {
      log.push(`backdrop ${img === null ? "null" : `${img.width}x${img.height}`} ${page ?? "-"}`);
      return true;
    }),
    sendCapture: vi.fn(async (r: SendRequest) => {
      log.push(`send ${r.to} ${r.origin} ${r.image === null ? "blanc" : "image"}`);
      return o.sent === undefined ? { to: r.to, page: 2 } : o.sent;
    }),
    startMode: () => o.startMode ?? "board",
    originKind: (id: string | null) => (o.originKind === undefined ? (id === null ? null : "board") : o.originKind),
    ...(o.transparent === undefined ? {} : { transparent: o.transparent }),
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

describe("contrôleur d'annotation (C11b : figer, envoyer)", () => {
  const shot: CaptureOutcome = { ok: true, image: { blob: new Blob([new Uint8Array([1])], { type: "image/png" }), width: 640, height: 360 } };
  const flush = () => new Promise((r) => setTimeout(r, 0));
  it("entrée vivante, document sans fond : document reçu comme en C11a, opaque faux, aucune capture", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    expect(windows.opaque()).toBe(false);
    expect(windows.captures()).toBe(0);
    expect(windows.received()).toEqual(new Uint8Array([5, 6, 7]));
    expect(ctl.state()).toMatchObject({ active: true, frozen: false, live: true, sendTarget: "origin" });
  });
  it("Envoyer au tableau (vivant) : capture avant la collecte, sortie, sendCapture vers l'origine, avis « envoyé au tableau : page 2 » (P7, P12)", async () => {
    const view = { page: 0, matrix: [2, 0, 0, 2, 0, 0] as const };
    const { ctl, windows, deps, log } = setup({ capture: shot, view });
    await ctl.enter();
    await ctl.send("origin");
    expect(windows.log.indexOf("capture")).toBeGreaterThan(-1);
    expect(windows.log.indexOf("capture")).toBeLessThan(windows.log.indexOf("collect"));
    expect(deps.sendCapture).toHaveBeenCalledTimes(1);
    expect(deps.sendCapture).toHaveBeenCalledWith({ to: "origin", origin: "t1", image: shot.ok ? shot.image : null, view });
    expect(ctl.state().active).toBe(false);
    expect(log.indexOf("show t1")).toBeLessThan(log.indexOf("send origin t1 image"));
    expect(log.at(-1)).toBe("say envoyé au tableau : page 2");
  });
  it("Envoyer dans un nouvel onglet : cible « new » (P5)", async () => {
    const { ctl, deps } = setup({ capture: shot });
    await ctl.enter();
    await ctl.send("new");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "new" }));
  });
  it("profil « Annotation au démarrage » : « Envoyer au tableau » va dans un nouvel onglet ; sendTarget « new » (P6, Q2)", async () => {
    const { ctl, deps } = setup({ capture: shot, startMode: "desktop-annotation" });
    await ctl.enter();
    expect(ctl.state().sendTarget).toBe("new");
    await ctl.send("origin");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "new" }));
  });
  it("origine = onglet d'annotation : nouvel onglet (P6)", async () => {
    const { ctl, deps } = setup({ capture: shot, originKind: "annotation" });
    await ctl.enter();
    expect(ctl.state().sendTarget).toBe("new");
    await ctl.send("origin");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "new" }));
  });
  it("capture refusée : page blanche (image null), avis de refus puis avis d'envoi (P10)", async () => {
    const { ctl, deps, log } = setup({ capture: { ok: false, reason: "denied" } });
    await ctl.enter();
    await ctl.send("origin");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ image: null }));
    const says = log.filter((l) => l.startsWith("say "));
    expect(says).toEqual([
      "say capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc",
      "say envoyé au tableau : page 2",
    ]);
  });
  it("rien à envoyer : sendCapture rend null → ni avis de capture ni avis d'envoi (P11)", async () => {
    const { ctl, log } = setup({ capture: { ok: false, reason: "wayland" }, sent: null });
    await ctl.enter();
    await ctl.send("origin");
    expect(log.some((l) => l.startsWith("say capture") || l.startsWith("say envoyé"))).toBe(false);
    expect(ctl.state().active).toBe(false);
  });
  it("Envoyer, collecte sans réponse (vivant) : aucune page envoyée, l'avis d'encre perdue reste seul (relecture du plan)", async () => {
    vi.useFakeTimers();
    const { ctl, deps, log } = setup({ capture: shot, mute: true });
    await ctl.enter();
    const done = ctl.send("origin");
    await vi.advanceTimersByTimeAsync(5000);
    await done;
    expect(ctl.state().active).toBe(false);
    expect(deps.sendCapture).not.toHaveBeenCalled();
    expect(log.filter((l) => l.startsWith("say "))).toEqual([`say ${INK_LOST_MESSAGE}`]);
    expect(log).toContain("show t1");
  });
  it("Envoyer, réponse illisible (figé) : aucune page envoyée, l'avis d'encre perdue reste seul (relecture du plan)", async () => {
    const { ctl, windows, deps, log } = setup({ capture: shot });
    await ctl.enter();
    await ctl.freeze();
    windows.collect = async () => null;
    await ctl.send("origin");
    expect(ctl.state().active).toBe(false);
    expect(deps.sendCapture).not.toHaveBeenCalled();
    expect(log.filter((l) => l.startsWith("say "))).toEqual([`say ${INK_LOST_MESSAGE}`]);
  });
  it("Envoyer, document rendu sans vue : la page part quand même, vue null (P13)", async () => {
    const { ctl, deps, log } = setup({ capture: shot });
    await ctl.enter();
    await ctl.send("origin");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "origin", view: null }));
    expect(log.at(-1)).toBe("say envoyé au tableau : page 2");
  });
  it("Figer le bureau : capture, collecte, fond posé sur la page rendue, document rechargé opaque ; état figé (P14, P16)", async () => {
    const { ctl, windows, log } = setup({ capture: shot, view: { page: 1, matrix: [1, 0, 0, 1, 0, 0] } });
    await ctl.enter();
    await ctl.freeze();
    const w = windows.log;
    expect(w.indexOf("capture")).toBeLessThan(w.indexOf("collect"));
    expect(w.indexOf("collect")).toBeLessThan(w.indexOf("load opaque"));
    expect(log).toContain("backdrop 640x360 1");
    expect(ctl.state()).toMatchObject({ active: true, frozen: true });
    expect(windows.opaque()).toBe(true);
  });
  it("figé : Sélection ne coupe jamais le clic, aucun pointer mouse (P15)", async () => {
    const { ctl, windows } = setup({ capture: shot });
    await ctl.enter();
    await ctl.freeze();
    ctl.command({ kind: "setTool", tool: "select" });
    await flush();
    expect(ctl.state().pointer).toBe("mouse");
    expect(windows.log.filter((l) => l === "pointer mouse")).toHaveLength(0);
  });
  it("Bureau vivant : fond retiré, document rechargé transparent, pointeur rendu ; aucune nouvelle capture (P16)", async () => {
    const { ctl, windows, log } = setup({ capture: shot });
    await ctl.enter();
    await ctl.freeze();
    ctl.command({ kind: "setTool", tool: "select" });
    await flush();
    await ctl.freeze();
    expect(windows.captures()).toBe(1);
    expect(log.some((l) => l.startsWith("backdrop null"))).toBe(true);
    expect(windows.log).toContain("load transparent");
    expect(windows.log.at(-1)).toBe("pointer mouse");
    expect(ctl.state().frozen).toBe(false);
  });
  it("Figer en échec (vivant) : avis, reste vivant, aucune collecte (P16)", async () => {
    const { ctl, windows, log } = setup({ capture: { ok: false, reason: "failed" } });
    await ctl.enter();
    await ctl.freeze();
    expect(windows.log).not.toContain("collect");
    expect(ctl.state().frozen).toBe(false);
    expect(log).toContain("say capture du bureau impossible (échec de la capture) : page à fond blanc");
  });
  it("figé, Envoyer : aucune nouvelle capture, vue identité sur la page rendue, fond de l'annotation (P13)", async () => {
    const { ctl, windows, deps } = setup({ capture: shot, view: { page: 1, matrix: [2, 0, 0, 2, 5, 5] } });
    await ctl.enter();
    await ctl.freeze();
    await ctl.send("origin");
    expect(windows.captures()).toBe(1);
    expect(deps.sendCapture).toHaveBeenCalledWith({ to: "origin", origin: "t1", image: null, view: { page: 1, matrix: [1, 0, 0, 1, 0, 0] } });
  });
  it("réentrée figée quand la page d'annotation a un fond (P17)", async () => {
    const { ctl, windows } = setup({ backdrop: true });
    await ctl.enter();
    expect(windows.opaque()).toBe(true);
    expect(windows.captures()).toBe(0);
    expect(ctl.state().frozen).toBe(true);
  });
  it("repli sans transparence : l'entrée capture, pose le fond, entre opaque ; live faux ; « Recapturer » recapture (P18)", async () => {
    const { ctl, windows, log } = setup({ capture: shot, transparent: false });
    await ctl.enter();
    expect(windows.captures()).toBe(1);
    expect(log).toContain("backdrop 640x360 -");
    expect(windows.opaque()).toBe(true);
    expect(ctl.state()).toMatchObject({ live: false, frozen: true });
    await ctl.freeze();
    expect(windows.captures()).toBe(2);
    expect(windows.log.at(-2)).toBe("load opaque");
    expect(ctl.state().frozen).toBe(true);
  });
  it("repli, capture en échec : entrée figée blanche, avis, aucun fond posé (P18)", async () => {
    const { ctl, windows, log } = setup({ capture: { ok: false, reason: "failed" }, transparent: false });
    await ctl.enter();
    expect(windows.opaque()).toBe(true);
    expect(log.some((l) => l.startsWith("backdrop"))).toBe(false);
    expect(log).toContain("say capture du bureau impossible (échec de la capture) : page à fond blanc");
  });
  it("Review : double clic sur « Envoyer au tableau » : une seule capture, une seule page, aucun rejet (RF1, P3, P7)", async () => {
    const { ctl, windows, deps } = setup({ capture: shot });
    await ctl.enter();
    await expect(Promise.all([ctl.send("origin"), ctl.send("origin")])).resolves.toBeDefined();
    expect(windows.captures()).toBe(1);
    expect(deps.sendCapture).toHaveBeenCalledTimes(1);
  });
  const changed = async (b: Uint8Array) => new Uint8Array([...b, 1]);
  it.each([
    ["exception", (f: ReturnType<typeof vi.fn>) => f.mockRejectedValueOnce(new Error("remplacement")), ["say Annotation impossible : remplacement"]],
    ["false", (f: ReturnType<typeof vi.fn>) => f.mockResolvedValueOnce(false), []],
  ] as const)("Envoyer, remplacement en échec (%s) : sendCapture non appelé, seul l'avis d'échec reste (revue)", async (_, fail, says) => {
    const { ctl, deps, log } = setup({ capture: shot, draw: changed });
    fail(deps.replaceAnnotation as ReturnType<typeof vi.fn>);
    await ctl.enter();
    await expect(ctl.send("origin")).resolves.toBeUndefined();
    expect(deps.replaceAnnotation).toHaveBeenCalledTimes(1);
    expect(deps.sendCapture).not.toHaveBeenCalled();
    expect(log.filter((l) => l.startsWith("say "))).toEqual(says);
    expect(ctl.state().active).toBe(false);
    expect(log).toContain("show t1");
  });
  it("repli, capture en échec sur une page à fond : fond retiré avant l'envoi du document, figé blanc et opaque, avis (P18, revue)", async () => {
    const { ctl, windows, deps, log } = setup({ capture: { ok: false, reason: "failed" }, transparent: false, backdrop: true });
    await ctl.enter();
    expect(log).toContain("backdrop null -");
    const removed = (deps.setAnnotationBackdrop as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!;
    expect(removed).toBeLessThan((deps.encodeTab as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!);
    expect(windows.opaque()).toBe(true);
    expect(ctl.state()).toMatchObject({ active: true, frozen: true });
    expect(log).toContain("say capture du bureau impossible (échec de la capture) : page à fond blanc");
  });
  it("Figer, remplacement refusé (false) : ni fond posé ni rechargement, reste vivant, les traits restent dans annotate (revue)", async () => {
    const { ctl, windows, deps, log } = setup({ capture: shot, draw: changed });
    (deps.replaceAnnotation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    await ctl.enter();
    await ctl.freeze();
    expect(deps.replaceAnnotation).toHaveBeenCalledTimes(1);
    expect(log.some((l) => l.startsWith("backdrop"))).toBe(false);
    expect(windows.log.some((l) => l.startsWith("load"))).toBe(false);
    expect(ctl.state()).toMatchObject({ active: true, frozen: false });
    expect(windows.opaque()).toBe(false);
  });
  it("double clic sur « Figer le bureau » : un seul figé, aucun dé-figé ; le clic suivant rend le bureau vivant (revue)", async () => {
    const { ctl, windows } = setup({ capture: shot });
    await ctl.enter();
    await expect(Promise.all([ctl.freeze(), ctl.freeze()])).resolves.toBeDefined();
    expect(windows.captures()).toBe(1);
    expect(windows.log.filter((l) => l.startsWith("load"))).toEqual(["load opaque"]);
    expect(ctl.state().frozen).toBe(true);
    expect(windows.opaque()).toBe(true);
    await ctl.freeze();
    expect(ctl.state().frozen).toBe(false);
    expect(windows.log.filter((l) => l.startsWith("load"))).toEqual(["load opaque", "load transparent"]);
  });
});
