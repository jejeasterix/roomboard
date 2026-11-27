/**
 * Contrôleur de l'annotation de bureau (C11a, DA1, DA2, P3 à P9, P15 à P17, P21) dans la fenêtre principale : entrée
 * (document de l'onglet d'annotation envoyé une fois, en base64 par l'hôte), sortie (document demandé, délai de 5 s,
 * remplacement s'il a changé, onglet d'origine montré), bascule dessin / souris liée à l'outil, écran suivant, dépôt
 * sur la zone (sortie d'abord, puis l'import ordinaire). Les transitions passent par une file : jamais deux entrées.
 * C11b (P5 à P18, DA3, DA4) : bureau figé (capture en fond du document d'annotation, fenêtre opaque, jamais de clic à
 * travers), repli figé sans transparence, réentrée figée sur une page à fond, envoi au tableau (capture d'abord, puis
 * sortie, puis page insérée par l'espace de travail). Générique en `T` : aucune dépendance à l'espace de travail ni au DOM.
 */
import type { DroppedFile, Notify, Point } from "../platform/files";
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
  frameField,
  palmEraserField,
  type PointerMode,
  type Returned,
  type SendRequest,
  type SendResult,
  type SendTarget,
} from "../platform/annotation-port";
import { ANNOTATION_MAIN_ACTIONS, type Dock, type Profile, type StartMode } from "../toolbar";
import { IDENTITY_MATRIX } from "../core/shapes";
import type { PageBackdrop } from "./desktop-page";
import type { ToolbarHost } from "./toolbar-host";

export const RELAUNCH_QUESTION = "Annotation du bureau indisponible sous Wayland. Relancer en mode compatibilité ?";
export const annotationFailedMessage = (why: string): string => `Annotation impossible : ${why}`;
/** Rang de la page où `annotate` s'ouvre à chaque chargement (`createEngine` part de la première page). */
const ENTRY_PAGE = 0;

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
  say: Notify;
  /** Côté et épaisseur (px CSS) de la barre montrée en annotation (`annotationBarOf`), mesurés dans la page. */
  bar(): { readonly dock: Dock; readonly thickness: number };
  profile(): Profile;
  readonly screens?: number;
  readonly timeoutMs?: number;
  /** C11b (P17) : fond de la première page du document d'annotation, celle où `annotate` s'ouvre (`createEngine`) ;
   *  null : aucun (entrée vivante). */
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
  /** design-l4 (L4-13) : cadre violet de l'appareil, lu à chaque entrée et à chaque rechargement ; absent : la charge
   *  ne porte pas le champ (`annotate` affiche le cadre). */
  frame?(): boolean;
  /** OG25 (déc. 30) : gomme automatique à la paume de l'appareil, lue à chaque entrée et à chaque rechargement ; absent :
   *  la charge ne porte pas le champ (`annotate` la garde active). */
  palmEraser?(): boolean;
  /** design-l4 (L4-16) : envoi réussi, page `page` (1 = première) ; absent : l'avis reste `say(sentToBoardMessage)`. */
  sent?(page: number): void;
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
  /** Réglages d'`annotate` portés par les commandes (toolbar-host.ts) : style du stylo (préréglage d'un outil autre que
   *  le pot), couleur du pot (préréglage du pot ou `fillColor`), tolérance du pot. Chaque champ ne dépend que de sa
   *  dernière commande. */
  const settings = new Map<"style" | "fill" | "tolerance", AnnotationCommand>();
  const remember = (m: AnnotationCommand): void => {
    if (m.kind === "setTool" && m.preset !== undefined) settings.set(m.tool === "fill" ? "fill" : "style", m);
    else if (m.kind === "fillColor") settings.set("fill", m);
    else if (m.kind === "fillTolerance") settings.set("tolerance", m);
  };
  /** Session neuve d'`annotate` (entrée, rechargement de « Figer ») : son moteur repart des défauts. Les réglages lui
   *  sont rejoués, puis l'outil affiché, sans préréglage (il réécrirait un réglage plus récent). */
  const sendSession = (tool: string): void => {
    for (const m of settings.values()) d.windows.send(m);
    d.windows.send({ kind: "setTool", tool });
  };
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
  /** L4-13 : champ `frame` de la charge, seulement si l'appareil le donne. */
  const frameOf = (): { readonly frame?: boolean } => frameField({ frame: d.frame?.() });
  /** OG25 : champ `palmEraser` de la charge, seulement si l'appareil le donne. */
  const palmOf = (): { readonly palmEraser?: boolean } => palmEraserField({ palmEraser: d.palmEraser?.() });
  /** L4-9 : la souris passe par Sélection, le dessin revient au dernier outil de dessin (P8) ; sans effet si `mode` est
   *  déjà le mode présent (double clic sur un segment). Appelée dans la file. */
  const pointTo = (mode: PointerMode): void => {
    if (!st.active || st.pointer === mode) return;
    ctl.command({ kind: "setTool", tool: mode === "mouse" ? "select" : lastDraw });
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
      // P17 : réentrée figée si la page où `annotate` s'ouvre (la première, pas la page montrée de l'onglet) a un fond.
      let frozen = (d.annotationBackdrop?.() ?? null) !== null;
      if (st.live === false) {
        // P18 : sans transparence, l'entrée capture d'abord et entre figée (blanche si la capture échoue).
        const shot = await d.windows.capture(place);
        if (shot.ok) {
          if ((await d.setAnnotationBackdrop?.(shot.image, ENTRY_PAGE)) === false) {
            // Fond refusé par le cœur : figé blanc, avec l'avis ; le fond d'une séance précédente ne reste pas sous l'encre.
            if (frozen) await d.setAnnotationBackdrop?.(null, ENTRY_PAGE);
            await d.say(captureFailedMessage("failed"));
          }
        } else {
          // P18 : figé blanc ; le fond d'une séance précédente ne reste pas sous l'encre.
          if (frozen) await d.setAnnotationBackdrop?.(null, ENTRY_PAGE);
          await d.say(captureFailedMessage(shot.reason));
        }
        frozen = true;
      }
      const document = await d.encodeTab(tab);
      const screen = await d.windows.enter({ ...place, document, profile: d.profile(), opaque: frozen, ...frameOf(), ...palmOf() });
      set({ screen, frozen });
      sendSession(lastDraw);
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
    toggle: () => serial(async () => pointTo(st.pointer === "draw" ? "mouse" : "draw")),
    pointer: (mode) => serial(async () => pointTo(mode)),
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
        const wasFrozen = st.frozen === true;
        const toLive = wasFrozen && st.live !== false;
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
        /** Page dont le fond vient d'être posé (retiré si le rechargement échoue). */
        let posed: number | null = null;
        try {
          // Remplacement refusé : poser le fond puis recharger l'ancien document effacerait les traits de la séance.
          if (got.changed && (await d.replaceAnnotation(got.bytes)) !== true) return;
          const page = got.view?.page ?? 0; // P13 : vue absente : page 0
          const kept = await d.setAnnotationBackdrop?.(image, page);
          if (image !== null) {
            if (kept === false) {
              // Fond refusé par le cœur : figé blanc, avec l'avis ; l'ancien fond de la page ne reste pas sous l'encre.
              await d.setAnnotationBackdrop?.(null, page);
              await d.say(captureFailedMessage("failed"));
            } else posed = page;
          }
          const tab = await d.annotationTab();
          if (tab === null) return;
          await d.windows.load({ document: await d.encodeTab(tab), opaque: !toLive, ...frameOf(), ...palmOf() });
          set({ frozen: !toLive });
          sendSession(st.pointer === "mouse" ? "select" : lastDraw);
          await d.windows.pointer(toLive ? st.pointer : "draw");
        } catch (e) {
          // Le fond posé n'est retiré que si l'état était vivant : en « Recapturer » (figé → figé), `annotate` reste figé
          // et l'onglet garde un fond (le nouveau ; l'ancien n'est plus disponible sous forme d'image).
          if (posed !== null && !wasFrozen) await d.setAnnotationBackdrop?.(null, posed).catch(() => false);
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
          // P14 : le fond de la page ne part qu'en figé ; vivant sans capture : fond blanc, comme l'avis le dit.
          frozen,
        };
        const r = d.sendCapture === undefined ? null : await d.sendCapture(request);
        if (r === null) return; // rien inséré : l'avis est déjà dit (rien à envoyer, 12 onglets)
        if (failure !== null) await d.say(captureFailedMessage(failure));
        // design-l4 (L4-16) : bandeau non modal si l'application le donne ; sinon la boîte d'information (C11b P12).
        if (d.sent !== undefined) d.sent(r.page);
        else await d.say(sentToBoardMessage(r.page), "info");
      }),
    onTool(tool) {
      if (tool !== "select") lastDraw = tool;
      void setPointer(tool === "select" ? "mouse" : "draw").catch((e: unknown) => {
        console.warn(`RoomBoard : bascule non appliquée (${messageOf(e)})`);
      });
    },
    command(m: AnnotationCommand) {
      remember(m);
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
        if (r.inserted.length > 0) await d.say(addedToPageMessage(d.pageNumber()), "info");
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
 * `annotate` ; les actions de la fenêtre principale (`ANNOTATION_MAIN_ACTIONS`), le dépôt, le mode et la commande
 * Dessin / Souris restent locaux ;
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
    pointer: (mode) => local.pointer?.(mode),
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
