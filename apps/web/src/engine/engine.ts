/**
 * Moteur d'interaction (DA2) : relie le routeur (par `sink` et `view`), les outils, la caméra, le rendu et le cœur.
 * Sans framework ni DOM : la page (main.ts) branche les événements et injecte outils et rendu. Une écriture par geste,
 * au relâché (D38) ; toute erreur du cœur (dernière page, points invalides…) est attrapée et rendue dans l'état.
 */
import type { Change, Command, CoreDocument, EraseMode, StrokeStyle } from "../core/api";
import { createFrameLoop, type FrameLoopDeps } from "../proto/frame-loop";
import { fitPage, IDENTITY, panBy as panCamera, zoomAt as zoomCamera, type Camera } from "./camera";
import type { DrawTool, GestureSink, ViewSink } from "./input/gesture";
import { keyAction, type KeyAction, type KeyLike } from "./input/keys";
import type { Renderer } from "./render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tools/tool";

export interface EngineState {
  readonly tool: DrawTool;
  readonly eraserMode: EraseMode;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly page: string;
  readonly elementCount: number;
  readonly version: number;
  /** Dernier refus du cœur (message lisible), effacé à la commande réussie suivante. */
  readonly error: string | null;
}

/** Molette en px CSS relatifs à la zone de dessin (deltas déjà ramenés en px par la page). */
export interface WheelInput {
  readonly x: number;
  readonly y: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly ctrlKey: boolean;
}

export interface ToolFactories {
  pen(ctx: ToolContext, style: () => StrokeStyle): GestureTool;
  eraser(ctx: ToolContext, mode: () => EraseMode): GestureTool;
}

export interface EngineDeps {
  readonly doc: CoreDocument;
  readonly renderer: Renderer;
  readonly frames: FrameLoopDeps;
  readonly tools: ToolFactories;
  readonly penStyle?: StrokeStyle;
}

export interface Engine {
  readonly sink: GestureSink;
  readonly view: ViewSink;
  tool(): DrawTool;
  setTool(t: DrawTool): void;
  setEraserMode(m: EraseMode): void;
  run(cmd: Command): Change | null;
  undo(): void;
  redo(): void;
  /** Vrai si la touche est un raccourci reconnu et exécuté : la page appelle alors preventDefault. */
  key(e: KeyLike): boolean;
  wheel(e: WheelInput): void;
  resize(width: number, height: number, dpr: number): void;
  camera(): Camera;
  state(): EngineState;
  onState(cb: (s: EngineState) => void): () => void;
  onLiveDrawn(cb: (now: number) => void): () => void;
  frameDurations(): number[];
  dispose(): void;
}

/** Stylo par défaut (H1-8, HL3-3). */
export const DEFAULT_PEN_STYLE: StrokeStyle = { color: "#000000", width: 4 };
/** Ctrl+molette : facteur exp(-deltaY × vitesse) (HL3-6). */
export const WHEEL_ZOOM_SPEED = 0.002;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((x) => b.has(x));

export function createEngine(deps: EngineDeps): Engine {
  const { doc, renderer } = deps;
  const first = doc.pageIds()[0];
  if (first === undefined) throw new Error("document sans page");
  const pageId: string = first;
  const style = deps.penStyle ?? DEFAULT_PEN_STYLE;
  let camera: Camera = IDENTITY;
  let fitted = false;
  let tool: DrawTool = "pen";
  let eraserMode: EraseMode = "partial";
  let error: string | null = null;
  let sceneDirty = true;
  let lastHidden: ReadonlySet<string> = new Set<string>();
  const stateListeners = new Set<(s: EngineState) => void>();
  const drawnListeners = new Set<(now: number) => void>();
  const owner = new Map<number, GestureTool>();

  function state(): EngineState {
    return {
      tool,
      eraserMode,
      canUndo: doc.canUndo(),
      canRedo: doc.canRedo(),
      page: pageId,
      elementCount: doc.elementIds(pageId).length,
      version: doc.version(),
      error,
    };
  }

  function emit(): void {
    const s = state();
    for (const cb of stateListeners) cb(s);
  }

  function requestScene(): void {
    sceneDirty = true;
    loop.start();
  }

  function run(cmd: Command): Change | null {
    let change: Change;
    try {
      change = doc.apply(cmd);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      emit();
      return null;
    }
    renderer.invalidate(change);
    error = null;
    requestScene();
    emit();
    return change;
  }

  function history(which: KeyAction): void {
    const change = which === "undo" ? doc.undo() : doc.redo();
    renderer.invalidate(change);
    error = null;
    requestScene();
    emit();
  }

  const ctx: ToolContext = { doc, page: () => pageId, camera: () => camera, run };
  const tools: Record<DrawTool, GestureTool> = {
    pen: deps.tools.pen(ctx, () => style),
    eraser: deps.tools.eraser(ctx, () => eraserMode),
  };
  const toolList: readonly GestureTool[] = [tools.pen, tools.eraser];

  function frame(now: number): void {
    for (const t of toolList) t.frame();
    const parts: LivePart[] = toolList.map((t) => t.live());
    const hidden = new Set<string>();
    for (const p of parts) for (const id of p.hidden) hidden.add(id);
    if (sceneDirty || !sameSet(hidden, lastHidden)) {
      renderer.drawScene({ id: pageId, elementIds: doc.elementIds(pageId) }, camera, hidden);
      sceneDirty = false;
      lastHidden = hidden;
    }
    renderer.drawLive({ strokes: parts.flatMap((p) => p.strokes), erasers: parts.flatMap((p) => p.erasers) }, camera);
    for (const cb of drawnListeners) cb(now);
    if (!toolList.some((t) => t.active())) loop.stop();
  }

  const loop = createFrameLoop(deps.frames, frame);

  const sink: GestureSink = {
    begin(pointerId, t, samples) {
      const g = tools[t];
      owner.set(pointerId, g);
      g.begin(pointerId, samples);
      loop.start();
    },
    extend(pointerId, samples, predicted) {
      owner.get(pointerId)?.extend(pointerId, samples, predicted);
    },
    close(pointerId, how) {
      const g = owner.get(pointerId);
      if (!g) return;
      owner.delete(pointerId);
      g.close(pointerId, how);
      loop.start(); // une image de plus : couche vive effacée, aperçu retiré
    },
  };

  const view: ViewSink = {
    panBy(dx, dy) {
      camera = panCamera(camera, dx, dy);
      requestScene();
    },
    zoomAt(x, y, factor) {
      camera = zoomCamera(camera, x, y, factor);
      requestScene();
    },
  };

  return {
    sink,
    view,
    tool: () => tool,
    setTool(t) {
      tool = t;
      emit();
    },
    setEraserMode(m) {
      eraserMode = m;
      emit();
    },
    run,
    undo: () => history("undo"),
    redo: () => history("redo"),
    key(e) {
      const action = keyAction(e);
      if (action === null) return false;
      history(action);
      return true;
    },
    wheel(e) {
      if (e.ctrlKey) view.zoomAt(e.x, e.y, Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED));
      else view.panBy(-e.deltaX, -e.deltaY);
    },
    resize(width, height, dpr) {
      renderer.resize(width, height, dpr);
      if (!fitted && width > 0 && height > 0) {
        camera = fitPage(width, height);
        fitted = true;
      }
      requestScene();
    },
    camera: () => camera,
    state,
    onState(cb) {
      stateListeners.add(cb);
      return () => {
        stateListeners.delete(cb);
      };
    },
    onLiveDrawn(cb) {
      drawnListeners.add(cb);
      return () => {
        drawnListeners.delete(cb);
      };
    },
    frameDurations: () => loop.durations(),
    dispose() {
      for (const [id, g] of owner) g.close(id, "abort");
      owner.clear();
      loop.stop();
      stateListeners.clear();
      drawnListeners.clear();
    },
  };
}
