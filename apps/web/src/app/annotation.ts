/**
 * Contrôleur de l'annotation de bureau (C11a, DA1, DA2, P3 à P9, P15 à P17, P21) dans la fenêtre principale : entrée
 * (document de l'onglet d'annotation envoyé une fois, en base64 par l'hôte), sortie (document demandé, délai de 5 s,
 * remplacement s'il a changé, onglet d'origine montré), bascule dessin / souris liée à l'outil, écran suivant, dépôt
 * sur la zone (sortie d'abord, puis l'import ordinaire). Les transitions passent par une file : jamais deux entrées.
 * Générique en `T` (la session d'onglet) : aucune dépendance à l'espace de travail ni au DOM.
 */
import type { DroppedFile, Point } from "../platform/files";
import type { ImportReport } from "../platform/import";
import { messageOf } from "../platform/controller";
import {
  addedToPageMessage,
  EXIT_TIMEOUT_MS,
  INK_LOST_MESSAGE,
  type AnnotationCommand,
  type AnnotationControl,
  type AnnotationState,
  type AnnotationSupport,
  type AnnotationWindows,
  type PointerMode,
  type Returned,
} from "../platform/annotation-port";
import { ANNOTATION_MAIN_ACTIONS, type Dock, type Profile, type StartMode } from "../toolbar";
import type { ToolbarHost } from "./toolbar-host";

export const RELAUNCH_QUESTION = "Annotation du bureau indisponible sous Wayland. Relancer en mode compatibilité ?";
export const annotationFailedMessage = (why: string): string => `Annotation impossible : ${why}`;

export interface AnnotationDeps<T> {
  readonly windows: AnnotationWindows;
  /** Onglet d'annotation existant, ou créé vierge et non montré ; null : 12 onglets (avis déjà dit). */
  annotationTab(): Promise<T | null>;
  encodeTab(tab: T): Promise<Uint8Array>;
  replaceAnnotation(bytes: Uint8Array): Promise<boolean>;
  activeTabId(): string | null;
  showTab(id: string): void;
  importFiles(files: readonly DroppedFile[], at: Point | null): Promise<ImportReport>;
  /** Rang (1 = première) de la page montrée de l'onglet actif. */
  pageNumber(): number;
  say(message: string): Promise<void>;
  /** Côté et épaisseur (px CSS) de la première barre `tools`, mesurés dans la page. */
  bar(): { readonly dock: Dock; readonly thickness: number };
  profile(): Profile;
  readonly screens?: number;
  readonly timeoutMs?: number;
}

/** Réponse ou null après `ms` (minuteur toujours retiré). */
function within(p: Promise<Returned | null>, ms: number): Promise<Returned | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([p.catch(() => null), late]).finally(() => clearTimeout(timer));
}

export function createAnnotationController<T>(d: AnnotationDeps<T>): AnnotationControl {
  const timeout = d.timeoutMs ?? EXIT_TIMEOUT_MS;
  let st: AnnotationState = { active: false, pointer: "draw", screen: null, screens: Math.max(1, d.screens ?? 1) };
  let origin: string | null = null;
  let lastDraw = "pen";
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const set = (next: Partial<AnnotationState>): void => {
    st = { ...st, ...next };
    for (const cb of [...listeners]) cb();
  };
  /** File unique des transitions : une erreur n'arrête pas la file. */
  const serial = (f: () => Promise<void>): Promise<void> => {
    const run = queue.then(f);
    queue = run.catch(() => undefined);
    return run;
  };
  const setPointer = async (mode: PointerMode): Promise<void> => {
    if (st.pointer === mode) return;
    set({ pointer: mode });
    if (st.active) await d.windows.pointer(mode);
  };

  async function doEnter(): Promise<void> {
    if (st.active) return;
    let document: Uint8Array;
    try {
      const tab = await d.annotationTab();
      if (tab === null) return;
      document = await d.encodeTab(tab);
    } catch (e) {
      await d.say(annotationFailedMessage(messageOf(e)));
      return;
    }
    origin = d.activeTabId();
    set({ active: true, pointer: "draw" });
    try {
      const bar = d.bar(); // mesurée après le passage en barre seule
      const screen = await d.windows.enter({ screen: st.screen, dock: bar.dock, thickness: bar.thickness, document, profile: d.profile() });
      set({ screen });
      d.windows.send({ kind: "setTool", tool: lastDraw });
      await d.windows.pointer("draw");
    } catch (e) {
      set({ active: false });
      try {
        await d.windows.leave();
      } catch {
        // la fenêtre n'a peut-être jamais été montrée
      }
      await d.say(annotationFailedMessage(messageOf(e)));
    }
  }

  async function doExit(): Promise<void> {
    if (!st.active) return;
    const got = await within(d.windows.collect(), timeout);
    try {
      await d.windows.leave();
    } catch (e) {
      console.warn(`RoomBoard : fenêtre d'annotation non cachée (${messageOf(e)})`);
    }
    set({ active: false, pointer: "draw" });
    if (got === null) await d.say(INK_LOST_MESSAGE);
    else if (got.changed) {
      try {
        await d.replaceAnnotation(got.bytes);
      } catch (e) {
        await d.say(annotationFailedMessage(messageOf(e)));
      }
    }
    if (origin !== null) d.showTab(origin);
    origin = null;
  }

  const ctl: AnnotationControl = {
    state: () => st,
    enter: () => serial(doEnter),
    exit: () =>
      serial(async () => {
        if (!st.active) {
          // Sortie demandée par `annotate` alors que la principale n'est plus en annotation : la cacher quand même.
          try {
            await d.windows.leave();
          } catch {
            // fenêtre jamais montrée
          }
          return;
        }
        await doExit();
      }),
    close: async () => {
      await serial(async () => {
        await doExit();
        await d.windows.close();
      });
      return true;
    },
    toggle: () =>
      serial(async () => {
        if (!st.active) return;
        ctl.command({ kind: "setTool", tool: st.pointer === "draw" ? "select" : lastDraw });
      }),
    nextScreen: () =>
      serial(async () => {
        if (!st.active || st.screens <= 1) return;
        const bar = d.bar();
        const screen = await d.windows.place({ screen: ((st.screen ?? 0) + 1) % st.screens, dock: bar.dock, thickness: bar.thickness });
        set({ screen });
      }),
    onTool(tool) {
      if (tool !== "select") lastDraw = tool;
      void setPointer(tool === "select" ? "mouse" : "draw").catch((e: unknown) => {
        console.warn(`RoomBoard : bascule non appliquée (${messageOf(e)})`);
      });
    },
    command(m: AnnotationCommand) {
      d.windows.send(m);
      if (m.kind === "setTool") ctl.onTool(m.tool);
    },
    sendProfile(p) {
      if (st.active) d.windows.sendProfile(p);
    },
    dropOnZone: (files, at) =>
      serial(async () => {
        if (!st.active) {
          await d.importFiles(files, at);
          return;
        }
        await doExit();
        const r = await d.importFiles(files, null);
        if (r.inserted.length > 0) await d.say(addedToPageMessage(d.pageNumber()));
      }),
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
  d.windows.onExitRequest(() => {
    void ctl.exit().catch((e: unknown) => console.warn(`RoomBoard : sortie de l'annotation abandonnée (${messageOf(e)})`));
  });
  return ctl;
}

/**
 * Hôte de barre en annotation (P21) : outils, préréglages, pot, format et actions de `remoteActions` partent vers
 * `annotate` ; les actions de la fenêtre principale (`ANNOTATION_MAIN_ACTIONS`), le dépôt et le mode restent locaux ;
 * le reste (grisé dans la barre) est ignoré.
 */
export function createRemoteToolbarHost(send: (m: AnnotationCommand) => void, local: ToolbarHost, remoteActions: ReadonlySet<string>): ToolbarHost {
  return {
    setTool: (tool, preset) => send(preset === undefined ? { kind: "setTool", tool } : { kind: "setTool", tool, preset }),
    runAction(id) {
      if (remoteActions.has(id)) send({ kind: "runAction", id });
      else if (ANNOTATION_MAIN_ACTIONS.has(id)) local.runAction(id);
    },
    fillColor: (color) => send({ kind: "fillColor", color }),
    fillTolerance: (value) => send({ kind: "fillTolerance", value }),
    textFormat: (action) => send({ kind: "textFormat", action }),
    dropFiles: (files, at) => local.dropFiles(files, at),
    setMode: (mode) => local.setMode(mode),
    tableFill: () => undefined,
    selection: () => undefined,
    imagePanel: () => undefined,
  };
}

/** P16 : sous Wayland natif, si le profil demandait l'annotation, propose la relance en XWayland ; vrai si relancé. */
export async function offerCompatRelaunch(
  support: AnnotationSupport,
  startMode: StartMode,
  ask: (m: string) => Promise<boolean>,
  relaunch: () => Promise<void>,
): Promise<boolean> {
  if (support.supported || support.reason !== "wayland" || startMode !== "desktop-annotation") return false;
  if (!(await ask(RELAUNCH_QUESTION))) return false;
  await relaunch();
  return true;
}
