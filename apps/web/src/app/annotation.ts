/**
 * Contrôleur de l'annotation de bureau (C11a, DA1, DA2, P3 à P9, P15 à P17, P21) dans la fenêtre principale : entrée
 * (document de l'onglet d'annotation envoyé une fois, en base64 par l'hôte), sortie (document demandé, délai de 5 s,
 * remplacement s'il a changé, onglet d'origine montré), bascule dessin / souris liée à l'outil, écran suivant, dépôt
 * sur la zone (sortie d'abord, puis l'import ordinaire). Les transitions passent par une file : jamais deux entrées.
 * C11b (P5 à P18, DA3, DA4) : bureau figé (capture en fond du document d'annotation, fenêtre opaque, jamais de clic à
 * travers), repli figé sans transparence, réentrée figée sur une page à fond, envoi au tableau (capture d'abord, puis
 * sortie, puis page insérée par l'espace de travail). Générique en `T` : aucune dépendance à l'espace de travail ni au DOM.
 */
import type { DroppedFile, Point } from "../platform/files";
import type { ImportReport } from "../platform/import";
import { messageOf } from "../platform/controller";
import {
  addedToPageMessage,
  captureFailedMessage,
  EXIT_TIMEOUT_MS,
  INK_LOST_MESSAGE,
  sendTarget,
  sentToBoardMessage,
  type AnnotationCommand,
  type AnnotationControl,
  type AnnotationPlace,
  type AnnotationState,
  type AnnotationSupport,
  type AnnotationViewport,
  type AnnotationWindows,
  type CapturedImage,
  type CaptureFailure,
  type PointerMode,
  type Returned,
  type SendRequest,
  type SendResult,
  type SendTarget,
} from "../platform/annotation-port";
import { ANNOTATION_MAIN_ACTIONS, type Dock, type Profile, type StartMode } from "../toolbar";
import { IDENTITY_MATRIX, type PageBackdrop } from "./desktop-page";
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
  /** C11b (P17) : fond de la page montrée du document d'annotation ; null : aucun (entrée vivante). */
  annotationBackdrop?(): PageBackdrop | null;
  /** C11b (P14) : pose (image) ou retire (null) le fond de la page `page` (rang ; absent : page montrée) du document
   *  d'annotation. */
  setAnnotationBackdrop?(image: CapturedImage | null, page?: number): Promise<boolean>;
  /** C11b (P3, P6 à P12) : page envoyée ; null : rien inséré (avis déjà dit). Absent (tests C11a) : aucun envoi. */
  sendCapture?(o: SendRequest): Promise<SendResult | null>;
  /** C11b (P6) : mode rendu par `resolveStartMode` pour le profil actif ; absent : "board". */
  startMode?(): StartMode;
  /** C11b (P6) : sorte de l'onglet `id` ; absent : "board" (null pour un id null). */
  originKind?(id: string | null): "board" | "annotation" | null;
  /** C11b (P18) : `annotation_support.transparent` ; absent : vrai. */
  readonly transparent?: boolean;
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
  let st: AnnotationState = {
    active: false,
    pointer: "draw",
    screen: null,
    screens: Math.max(1, d.screens ?? 1),
    frozen: false,
    live: d.transparent ?? true,
    sendTarget: "origin",
  };
  let origin: string | null = null;
  let lastDraw = "pen";
  let queue: Promise<void> = Promise.resolve();
  /** « Figer » en file ou en cours (double clic). */
  let freezing: Promise<void> | null = null;
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
  const startMode = (): StartMode => d.startMode?.() ?? "board";
  const originKind = (id: string | null): "board" | "annotation" | null =>
    d.originKind ? d.originKind(id) : id === null ? null : "board";
  /** P6 : cible de l'envoi pour l'origine de la séance. */
  const targetOf = (wanted: SendTarget): SendTarget => sendTarget(wanted, startMode(), originKind(origin));
  /** Côté et épaisseur de la barre mesurés maintenant, écran retenu. */
  const placeNow = (): AnnotationPlace => {
    const bar = d.bar();
    return { screen: st.screen, dock: bar.dock, thickness: bar.thickness };
  };
  const setPointer = async (mode: PointerMode): Promise<void> => {
    if (st.pointer === mode) return;
    set({ pointer: mode });
    // C11b (P15) : en figé, la fenêtre opaque ne laisse jamais passer le clic ; Sélection y sélectionne des objets.
    if (st.active && !(st.frozen === true && mode === "mouse")) await d.windows.pointer(mode);
  };

  async function doEnter(): Promise<void> {
    if (st.active) return;
    let tab: T | null;
    try {
      tab = await d.annotationTab();
    } catch (e) {
      await d.say(annotationFailedMessage(messageOf(e)));
      return;
    }
    if (tab === null) return;
    origin = d.activeTabId();
    set({ active: true, pointer: "draw", sendTarget: targetOf("origin") });
    try {
      const place = placeNow(); // mesurée après le passage en barre seule
      // P17 : réentrée figée si la page montrée du document d'annotation a déjà un fond.
      let frozen = (d.annotationBackdrop?.() ?? null) !== null;
      if (st.live === false) {
        // P18 : sans transparence, l'entrée capture d'abord et entre figée (blanche si la capture échoue).
        const shot = await d.windows.capture(place);
        if (shot.ok) await d.setAnnotationBackdrop?.(shot.image);
        else {
          // P18 : figé blanc ; le fond d'une séance précédente ne reste pas sous l'encre.
          if (frozen) await d.setAnnotationBackdrop?.(null);
          await d.say(captureFailedMessage(shot.reason));
        }
        frozen = true;
      }
      const document = await d.encodeTab(tab);
      const screen = await d.windows.enter({ ...place, document, profile: d.profile(), opaque: frozen });
      set({ screen, frozen });
      d.windows.send({ kind: "setTool", tool: lastDraw });
      await d.windows.pointer("draw");
    } catch (e) {
      set({ active: false, frozen: false });
      try {
        await d.windows.leave();
      } catch {
        // la fenêtre n'a peut-être jamais été montrée
      }
      await d.say(annotationFailedMessage(messageOf(e)));
    }
  }

  /** Sortie C11a. Rend ce qui a été collecté (C11b, P13 : vue d'`annotate`, null si absente ; `kept` : document
   *  d'annotation à jour, faux si son remplacement a levé ou a été refusé), ou null si rien ne l'a été (inactive,
   *  réponse illisible, délai dépassé : l'avis d'encre perdue est alors dit). */
  async function doExit(): Promise<{ readonly view: AnnotationViewport | null; readonly kept: boolean } | null> {
    if (!st.active) return null;
    const got = await within(d.windows.collect(), timeout);
    try {
      await d.windows.leave();
    } catch (e) {
      console.warn(`RoomBoard : fenêtre d'annotation non cachée (${messageOf(e)})`);
    }
    set({ active: false, pointer: "draw", frozen: false });
    let kept = true;
    if (got === null) await d.say(INK_LOST_MESSAGE);
    else if (got.changed) {
      try {
        kept = (await d.replaceAnnotation(got.bytes)) === true;
      } catch (e) {
        kept = false;
        await d.say(annotationFailedMessage(messageOf(e)));
      }
    }
    if (origin !== null) d.showTab(origin);
    origin = null;
    return got === null ? null : { view: got.view ?? null, kept };
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
    freeze: () => {
      // Double clic : un second « Figer » pendant qu'un premier attend ou court dans la file est ignoré (sinon : figé
      // puis aussitôt vivant).
      if (freezing !== null) return freezing;
      const run = serial(async () => {
        if (!st.active) return;
        // P16 : figé → vivant si la transparence est offerte ; sinon capture : vivant → figé, ou « Recapturer » (P18).
        const toLive = st.frozen === true && st.live !== false;
        let image: CapturedImage | null = null;
        if (!toLive) {
          const shot = await d.windows.capture(placeNow());
          if (!shot.ok) {
            await d.say(captureFailedMessage(shot.reason));
            return; // vivant reste vivant ; un figé garde son fond
          }
          image = shot.image;
        }
        // P14 : le fond va dans le document d'annotation, renvoyé par l'aller-retour existant.
        const got = await within(d.windows.collect(), timeout);
        if (got === null) {
          await d.say(INK_LOST_MESSAGE);
          return;
        }
        try {
          // Remplacement refusé : poser le fond puis recharger l'ancien document effacerait les traits de la séance.
          if (got.changed && (await d.replaceAnnotation(got.bytes)) !== true) return;
          await d.setAnnotationBackdrop?.(image, got.view?.page);
          const tab = await d.annotationTab();
          if (tab === null) return;
          await d.windows.load({ document: await d.encodeTab(tab), opaque: !toLive });
          set({ frozen: !toLive });
          await d.windows.pointer(toLive ? st.pointer : "draw");
        } catch (e) {
          await d.say(annotationFailedMessage(messageOf(e)));
        }
      }).finally(() => {
        freezing = null;
      });
      freezing = run;
      return run;
    },
    send: (wanted) =>
      serial(async () => {
        if (!st.active) return;
        const to = targetOf(wanted);
        const frozen = st.frozen === true;
        let image: CapturedImage | null = null;
        let failure: CaptureFailure | null = null;
        if (!frozen) {
          // P7 : la capture vient avant la sortie (l'encre est sur le bureau ; la coque cache nos fenêtres).
          const shot = await d.windows.capture(placeNow());
          if (shot.ok) image = shot.image;
          else failure = shot.reason;
        }
        const from = origin;
        const exited = await doExit();
        // Collecte perdue, ou remplacement en échec (levé ou refusé) : le document d'annotation garde l'encre de la
        // séance précédente ; rien n'est envoyé, l'avis d'échec reste seul.
        if (exited === null || !exited.kept) return;
        const view = exited.view;
        const request: SendRequest = {
          to,
          origin: from,
          image,
          // P13 : en figé, l'encre et le fond sont déjà dans le même repère.
          view: frozen ? { page: view?.page ?? 0, matrix: IDENTITY_MATRIX } : view,
        };
        const r = d.sendCapture === undefined ? null : await d.sendCapture(request);
        if (r === null) return; // rien inséré : l'avis est déjà dit (rien à envoyer, 12 onglets)
        if (failure !== null) await d.say(captureFailedMessage(failure));
        await d.say(sentToBoardMessage(r.page));
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
