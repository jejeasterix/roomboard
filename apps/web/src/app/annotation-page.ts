/**
 * Page de la fenêtre `annotate` (C11a, P2, P4, P9, P21, P24, DA5) : reçoit le `.roomboard` en base64 à chaque entrée, le
 * lit et y dessine localement (l'historique repart du document reçu) ; rejoue les commandes de barre sur un hôte local ;
 * publie sa vue de barre ; rend `{ id, base64, changed }` à la demande ; Échap demande la sortie. En mode souris (outil
 * Sélection), sonde le curseur et coupe le clic à travers sur un objet ou pendant un geste tenu. Aucun point d'encre ne
 * sort de la page.
 */
import { PAGE_WIDTH, type CoreDocument, type Matrix } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { IDENTITY_MATRIX } from "../core/shapes";
import { screenToWorld, type Camera } from "../engine/camera";
import type { EngineState } from "../engine/engine";
import type { ItemStyle } from "../engine/item-style";
import type { KeyLike } from "../engine/input/keys";
import { SELECT_TOL_PX } from "../engine/tools/select";
import {
  ANNOTATION_EVENTS,
  CURSOR_POLL_MS,
  type AnnotationCommand,
  type CollectPayload,
  type DocumentPayload,
  type ReturnedPayload,
} from "../platform/annotation-port";
import { fromBase64, toBase64 } from "../platform/clipboard";
import type { Profile } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { ToolbarView } from "../ui/item-state";
import type { BoardSession } from "./board-session";
import { createLocalToolbarHost, type HostTargets } from "./toolbar-host";

/** P9 : clic à travers seulement hors objet et hors geste tenu. */
export function passThrough(hit: boolean, holding: boolean): boolean {
  return !hit && !holding;
}

/** C11b (P13) : matrice du monde d'`annotate` vers la page envoyée : écran = monde × zoom + (tx, ty) (px CSS), puis
 *  × PAGE_WIDTH / largeur de la vue. Largeur nulle ou non finie : identité. */
export function viewMatrix(cam: Camera, viewWidth: number): Matrix {
  if (!Number.isFinite(viewWidth) || viewWidth <= 0) return IDENTITY_MATRIX;
  const s = PAGE_WIDTH / viewWidth;
  return [s * cam.zoom, 0, 0, s * cam.zoom, s * cam.tx, s * cam.ty];
}

/** design-l4 (L4-12) : cadre violet de la fenêtre `annotate`, élément du DOM (jamais un élément du document : il
 *  n'entre ni dans l'encre ni dans la capture, L4-15) ; rend la fonction qui le montre ou le cache (`html[data-cadre]`). */
export function mountAnnotationFrame(doc: Document): (on: boolean) => void {
  const el = doc.createElement("div");
  el.className = "rb-annot-frame";
  el.setAttribute("aria-hidden", "true");
  doc.body.append(el);
  return (on) => {
    doc.documentElement.dataset["cadre"] = on ? "1" : "0";
  };
}

/** Vue publiée : les champs de `ToolbarView` que l'état du moteur porte (sans la sélection ni le tableau), et le style
 *  courant (OG11), que `ToolbarView` ne porte pas. */
export type AnnotationView = ToolbarView & { readonly itemStyle?: ItemStyle };

/** Vue de barre publiée : les champs de `ToolbarView` que l'état du moteur porte, sans la sélection ni le tableau. */
export function viewOf(s: EngineState): AnnotationView {
  return {
    tool: s.tool,
    eraserMode: s.eraserMode,
    canUndo: s.canUndo,
    canRedo: s.canRedo,
    pageIndex: s.pageIndex,
    pageCount: s.pageCount,
    pageMode: s.pageMode,
    pageLayout: s.pageLayout,
    textFormat: s.textFormat,
    ...(s.fillTolerance === undefined ? {} : { fillTolerance: s.fillTolerance }),
    ...(s.itemStyle === undefined ? {} : { itemStyle: s.itemStyle }),
  };
}

export interface PageChannel {
  /** `emitTo("main", …)`. */
  emit<T>(event: string, payload: T): Promise<void>;
  listen<T>(event: string, cb: (payload: T) => void): Promise<() => void>;
}

export interface AnnotationPageDeps {
  readonly channel: PageChannel;
  read(bytes: Uint8Array): Promise<{ readonly doc: CoreDocument; readonly assets: AssetStore } | null>;
  encode(doc: CoreDocument, assets: AssetStore): Promise<Uint8Array>;
  /** C11b (P15) : `opaque` vrai : session non transparente (bureau figé). */
  makeSession(doc: CoreDocument, assets: AssetStore, opaque: boolean): Promise<BoardSession>;
  /** C11b (P13) : largeur de la vue en px CSS ; absente : `window.innerWidth`. */
  readonly viewWidth?: () => number;
  /** `annotation_cursor` : px CSS relatifs à la fenêtre, ou null hors d'elle. */
  cursor(): Promise<readonly [number, number] | null>;
  /** `annotation_ignore`. */
  ignore(on: boolean): Promise<void>;
  /** design-l4 (L4-12, L4-13) : cadre violet montré (vrai) ou caché, appliqué à chaque document reçu ; absent : rien. */
  frame?(on: boolean): void;
  readonly every?: (ms: number, cb: () => void) => () => void;
}

export interface AnnotationPage {
  start(): Promise<void>;
  key(e: KeyLike): boolean;
  pointerDown(): void;
  pointerUp(): void;
  board(): BoardSession | null;
  dispose(): void;
}

/** Cible d'édition (comme `keys.ts`) : Échap lui appartient. */
const isEditable = (t: KeyLike["target"]): boolean =>
  t !== null && (t.isContentEditable === true || (t.tagName !== undefined && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName.toUpperCase())));

const defaultEvery = (ms: number, cb: () => void): (() => void) => {
  const h = setInterval(cb, ms);
  return () => clearInterval(h);
};

export function createAnnotationPage(d: AnnotationPageDeps): AnnotationPage {
  const every = d.every ?? defaultEvery;
  const viewWidth = d.viewWidth ?? (() => window.innerWidth);
  let board: BoardSession | null = null;
  let assets: AssetStore | null = null;
  let loaded = 0;
  let profile: Profile = BUILTIN_PROFILES[0]!;
  let stopState: (() => void) | null = null;
  let stopPoll: (() => void) | null = null;
  let holding = false;
  let through: boolean | null = null;
  /** Après `collect` (sortie) : plus de sondage tant qu'aucun document n'est reçu. */
  let stopped = false;
  /** Génération des chargements : un chargement révolu libère sa session au lieu de la poser. */
  let loadGen = 0;
  let busy = false;
  /** C11b (P15) : fenêtre opaque : jamais de clic à travers. */
  let opaque = false;
  /** Commandes reçues pendant un chargement, rejouées sur la nouvelle session. */
  let pending: AnnotationCommand[] = [];
  /** Génération du sondage : un sondage en vol d'une génération révolue ne touche plus à la fenêtre. */
  let pollGen = 0;
  const offs: Array<() => void> = [];

  const targets: HostTargets = {
    engine: () => {
      if (board === null) throw new Error("aucun document d'annotation");
      return board.engine;
    },
    runFile: () => undefined,
    importFiles: () => undefined,
    toggle: () => undefined,
    insertPages: () => undefined,
    pageElementIds: () => [],
    confirm: async () => false,
    selection: () => undefined,
  };
  const host = createLocalToolbarHost(targets, () => profile);

  const setThrough = async (v: boolean): Promise<void> => {
    if (through === v) return;
    through = v;
    await d.ignore(v);
  };
  const poll = async (): Promise<void> => {
    const b = board;
    if (b === null) return;
    const gen = pollGen;
    const at = await d.cursor();
    if (gen !== pollGen) return;
    let hit = false;
    if (at !== null) {
      const cam = b.engine.camera();
      const [x, y] = screenToWorld(cam, at[0], at[1]);
      hit = b.doc.hitTest(b.engine.state().page, x, y, SELECT_TOL_PX / cam.zoom) !== null;
    }
    await setThrough(passThrough(hit, holding));
  };
  /** Sélection = souris (P8) : sondage tant que l'outil est Sélection ; ailleurs, la fenêtre capte tout. */
  const follow = (tool: string): void => {
    // C11b (P15) : fenêtre opaque (bureau figé) : jamais de sondage, jamais de clic à travers.
    const mouse = tool === "select" && !stopped && !opaque;
    if (mouse && stopPoll === null) {
      through = null;
      pollGen += 1;
      stopPoll = every(CURSOR_POLL_MS, () => {
        void poll().catch(() => undefined);
      });
    } else if (!mouse && stopPoll !== null) {
      stopPoll();
      stopPoll = null;
      pollGen += 1;
      through = null;
      void setThrough(false).catch(() => undefined);
    }
  };
  const publish = (s: EngineState): void => {
    void d.channel.emit(ANNOTATION_EVENTS.view, viewOf(s));
  };
  const release = (): void => {
    stopState?.();
    stopState = null;
    if (stopPoll !== null) {
      stopPoll();
      stopPoll = null;
    }
    pollGen += 1;
    board?.dispose();
    board = null;
    assets = null;
  };

  async function load(p: DocumentPayload): Promise<void> {
    const bytes = typeof p?.base64 === "string" ? fromBase64(p.base64) : null;
    if (bytes === null) {
      console.warn("RoomBoard : document d'annotation illisible (base64)");
      return;
    }
    d.frame?.(p?.frame !== false);
    const gen = ++loadGen;
    busy = true;
    try {
      const read = await d.read(bytes);
      if (read === null || gen !== loadGen) return;
      release();
      const wantOpaque = p?.opaque === true;
      const b = await d.makeSession(read.doc, read.assets, wantOpaque);
      if (gen !== loadGen) {
        b.dispose();
        return;
      }
      install(b, read.assets, wantOpaque);
      busy = false;
      const queued = pending;
      pending = [];
      for (const m of queued) replay(m);
    } finally {
      if (gen === loadGen) {
        busy = false;
        pending = [];
      }
    }
  }

  function install(b: BoardSession, a: AssetStore, wantOpaque: boolean): void {
    stopped = false;
    opaque = wantOpaque;
    board = b;
    assets = a;
    b.activate();
    loaded = b.engine.state().version;
    stopState = b.engine.onState((s) => {
      follow(s.tool);
      publish(s);
    });
    follow(b.engine.state().tool);
    if (opaque) {
      through = null;
      void setThrough(false).catch(() => undefined);
    }
    publish(b.engine.state());
  }

  async function collect(r: CollectPayload): Promise<void> {
    stopPoll?.();
    stopPoll = null;
    pollGen += 1;
    through = null;
    stopped = true;
    const b = board;
    const a = assets;
    const payload: ReturnedPayload =
      b === null || a === null
        ? { id: r.id, base64: "", changed: false }
        : {
            id: r.id,
            base64: toBase64(await d.encode(b.doc, a)),
            changed: b.engine.state().version !== loaded,
            view: { page: b.engine.state().pageIndex, matrix: viewMatrix(b.engine.camera(), viewWidth()) },
          };
    await d.channel.emit(ANNOTATION_EVENTS.returned, payload);
  }

  function replay(m: AnnotationCommand): void {
    if (busy) {
      pending.push(m);
      return;
    }
    if (board === null) return;
    if (m.kind === "setTool") host.setTool(m.tool, m.preset);
    else if (m.kind === "runAction") host.runAction(m.id);
    else if (m.kind === "fillColor") host.fillColor(m.color);
    else if (m.kind === "fillTolerance") host.fillTolerance(m.value);
    else host.textFormat(m.action);
  }

  return {
    async start() {
      offs.push(
        await d.channel.listen<AnnotationCommand>(ANNOTATION_EVENTS.command, replay),
        await d.channel.listen<Profile>(ANNOTATION_EVENTS.profile, (p) => {
          profile = p;
        }),
        await d.channel.listen<DocumentPayload>(ANNOTATION_EVENTS.document, (p) => {
          void load(p).catch((e: unknown) => console.warn(`RoomBoard : document d'annotation non chargé (${String(e)})`));
        }),
        await d.channel.listen<CollectPayload>(ANNOTATION_EVENTS.collect, (r) => {
          void collect(r).catch((e: unknown) => console.warn(`RoomBoard : document d'annotation non rendu (${String(e)})`));
        }),
      );
      await d.channel.emit(ANNOTATION_EVENTS.ready, {});
    },
    key(e) {
      if (e.key === "Escape" && !e.isComposing && !isEditable(e.target)) {
        void d.channel.emit(ANNOTATION_EVENTS.exitRequest, {});
        return true;
      }
      return board?.engine.key(e) ?? false;
    },
    pointerDown() {
      holding = true;
    },
    pointerUp() {
      holding = false;
    },
    board: () => board,
    dispose() {
      for (const off of offs.splice(0)) off();
      release();
    },
  };
}
