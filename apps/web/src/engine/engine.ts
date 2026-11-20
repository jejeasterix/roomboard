/**
 * Moteur d'interaction (DA2) : relie le routeur (par `sink` et `view`), les outils, la caméra, le rendu et le cœur.
 * Sans framework ni DOM : la page (main.ts) branche les événements et injecte outils et rendu. Une écriture par geste,
 * au relâché (D38) ; toute erreur du cœur (dernière page, points invalides…) est attrapée et rendue dans l'état.
 * Lot 3b (D17) : outil main, barre d'espace tenue (lue par le routeur), caméra par page ; historique des images borné.
 */
import type { Bounds, Change, Command, CoreDocument, EraseMode, GridView, ShapeKind, StrokeStyle } from "../core/api";
import { createFrameLoop, type FrameLoopDeps } from "../proto/frame-loop";
import { fitWidth, IDENTITY, panBy as panCamera, zoomAt as zoomCamera, type Camera } from "./camera";
import type { CloseReason, DrawTool, GestureSink, ToolChoice, ViewSink } from "./input/gesture";
import { selectionUnits, viewsOf, type GroupedView } from "./groups";
import { editAction, isPanKey, keyAction, type KeyLike } from "./input/keys";
import { mergeOverlays, overlayKey, EMPTY_OVERLAY } from "./render/overlay";
import type { FormatAction, FormatState } from "./rich-edit";
import type { Renderer } from "./render/renderer";
import { validColor } from "../core/rich-text";
import { PAGE_BACKGROUND } from "./page";
import { DEFAULT_TEXT_SIZE } from "./text-layout";
import type { TextStyle, TextTool } from "./tools/text";
import type { TableAction, TableCellState } from "./table-geom";
import { NO_LIVE, type GestureTool, type LeaveReason, type LivePart, type SelectionTool, type TableTool, type ToolContext } from "./tools/tool";

export interface EngineState {
  readonly tool: ToolChoice;
  readonly eraserMode: EraseMode;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly page: string;
  /** Rang de la page montrée (0 = première) et nombre de pages (D16 : compteur « 3 / 7 »). */
  readonly pageIndex: number;
  readonly pageCount: number;
  /** Éléments sélectionnés (outil Sélection, T55) et leur boîte monde ; vides tant que la sélection n'est pas branchée. */
  readonly selection: readonly string[];
  readonly selectionBounds: Bounds | null;
  /** C3 (Z13) : unités de la sélection (groupes extérieurs et éléments libres) ; 0 sans sélection. */
  readonly selectionUnits: number;
  /** C3 (Z13) : un élément sélectionné au moins porte un groupe. */
  readonly selectionGrouped: boolean;
  /** Cellule active de l'outil Tableau (C10a) : rangs et taille du tableau ; null sans cellule active. */
  readonly tableCell: TableCellState | null;
  /** C10b (F29) : zones fusionnées et cellules ombrées de tous les tableaux de la page montrée, quel que soit l'outil. */
  readonly tableMerges: number;
  readonly tableShades: number;
  /** État de la barre de format (C7b, R15) : saisie ouverte de l'outil Texte ou Tableau actif ; null sinon. */
  readonly textFormat: FormatState | null;
  /** Couleur du pot (C6a, D16) ; null = « Aucune ». Facultative (PC5) : le moteur la publie toujours. */
  readonly fillColor?: string | null;
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
  /** Outils d'édition (lot 4) ; absents : outils inertes (tests du moteur, amorce partielle). */
  select?(ctx: ToolContext): SelectionTool;
  shape?(ctx: ToolContext, kind: ShapeKind, style: () => StrokeStyle): GestureTool;
  text?(ctx: ToolContext, style: () => TextStyle): TextTool;
  /** Outil Tableau (C10a) ; absent : outil inerte. */
  table?(ctx: ToolContext, style: () => TextStyle): TableTool;
  /** Outil Pot (C6a, D15) ; `color` lue au relâché ; absent : outil inerte. */
  fill?(ctx: ToolContext, color: () => string | null): GestureTool;
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
  tool(): ToolChoice;
  setTool(t: ToolChoice): void;
  setEraserMode(m: EraseMode): void;
  run(cmd: Command): Change | null;
  /** C3 (Z1) : groupe la sélection (≥ 2 unités) ; une étape ; sélection gardée ; faux si rien n'est fait. */
  group(): boolean;
  /** C3 (Z1) : retire le groupe extérieur de la sélection ; faux sans groupe. */
  ungroup(): boolean;
  /** Supprime `ids` comme Suppr : une étape, sélection vidée, Annuler resélectionne (Couper). */
  deleteElements(ids: readonly string[]): void;
  /** C3 (Z7) : objets de `src` en haut de la page montrée, translatés ; outil Sélection, sélection = objets insérés. */
  insertFragment(src: CoreDocument, dx: number, dy: number): Change | null;
  /** C3 (Z12) : pages de `src` après la page montrée ; la première insérée est montrée. */
  insertPages(src: CoreDocument): Change | null;
  undo(): void;
  redo(): void;
  /** Vrai si la touche est prise par le moteur (annuler, rétablir, espace tenu) : la page appelle preventDefault. */
  key(e: KeyLike): boolean;
  /** Relâché d'une touche : vrai si c'était l'espace tenu par le moteur. */
  keyUp(e: KeyLike): boolean;
  /** Perte du focus de la fenêtre : l'espace est relâché (son keyup ne viendra pas). */
  releaseKeys(): void;
  /** Barre d'espace tenue (D17) : le routeur la lit au début d'un geste. */
  panHeld(): boolean;
  /** Montre une page (caméra par page, D17) ; false si elle est inconnue. Les gestes en cours sont abandonnés. */
  showPage(id: string): boolean;
  /** Ajoute une page après la page montrée et la montre (D16, CL4-9) ; false si le cœur refuse. */
  addPage(): boolean;
  /** Retire la page montrée, montre la précédente (CL4-9) ; dernière page : refus du cœur dans l'état (D37). */
  removePage(): boolean;
  nextPage(): boolean;
  /** « Ajuster la page » (D5 amendée) : largeur cadrée, haut de page en haut de la vue. */
  fitPage(): void;
  /** Redessine la scène à la prochaine image (bitmap d'une image arrivé, R16). */
  redraw(): void;
  /** Aperçu d'une grille non enregistrée sur la page montrée (C9 éditeur, DAE1) : rien n'est écrit ; null = aucune grille. */
  previewGrid(grid: GridView | null): void;
  /** Fin de l'aperçu : la grille du document revient ; sans aperçu, rien. Changer de page la coupe aussi (E8). */
  endGridPreview(): void;
  /** Préréglage reçu de la barre : couleur et épaisseur du stylo (et des formes, texte : couleur). Invalide : ignoré. */
  setPenStyle(s: StrokeStyle): void;
  /** Couleur du pot (C6a, D16), propre au pot : ni le stylo ni les formes ne changent ; null = « Aucune » ; une couleur
   *  invalide est ignorée. */
  setFillColor(color: string | null): void;
  /** Bouton de structure de la rangée du tableau (C10a, DAC4) : sur la cellule active de l'outil Tableau. */
  tableAction(a: TableAction): void;
  /** Pastille de remplissage (T12) : sur la cellule active ; null retire le remplissage. */
  tableFill(fill: string | null): void;
  /** Style de texte des outils Texte et Tableau, et de la cible d'import (F21). */
  textStyle(): TextStyle;
  /** Bouton de la rangée Format (C7b, DAR4) : relayé à l'outil actif (Texte ou Tableau) ; autre outil : sans effet. */
  textFormat(a: FormatAction): void;
  /** Chaque changement de caméra (pan, zoom, page montrée, ajustement) ; rend le désabonnement. */
  onCamera(cb: (c: Camera) => void): () => void;
  prevPage(): boolean;
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
/** Couleur du pot au démarrage (D16). */
export const DEFAULT_FILL_COLOR = "#dc2626";
/** Ctrl+molette : facteur exp(-deltaY × vitesse) (HL3-6). */
export const WHEEL_ZOOM_SPEED = 0.002;
/** Durées d'image retenues (une minute à 60 Hz) : le banc et son export en lisent au plus autant (HL3b-8). */
export const ENGINE_FRAME_HISTORY = 3600;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((x) => b.has(x));

function inertTool(): GestureTool {
  return { begin() {}, extend() {}, frame() {}, close() {}, live: () => NO_LIVE, active: () => false };
}

function inertSelection(): SelectionTool {
  return { ...inertTool(), selection: () => [], setSelection() {}, prune() {} };
}

function inertTable(): TableTool {
  return {
    ...inertTool(),
    cell: () => null,
    cellState: () => null,
    act() {},
    fill() {},
    clearCell: () => false,
    clearRange: () => false,
    prune() {},
    navigate: () => false,
    compositionStart() {},
    compositionEnd() {},
    requestCommit() {},
    format() {},
    formatState: () => null,
    formatChanged() {},
  };
}

function inertText(): TextTool {
  return {
    ...inertTool(),
    editing: () => null,
    composing: () => false,
    compositionStart() {},
    compositionEnd() {},
    requestCommit() {},
    format() {},
    formatState: () => null,
    formatChanged() {},
  };
}

export function createEngine(deps: EngineDeps): Engine {
  const { doc, renderer } = deps;
  const first = doc.pageIds()[0];
  if (first === undefined) throw new Error("document sans page");
  let pageId: string = first;
  let lastIndex = 0;
  let style = deps.penStyle ?? DEFAULT_PEN_STYLE;
  let fillColor: string | null = DEFAULT_FILL_COLOR;
  let camera: Camera = IDENTITY;
  const cameraListeners = new Set<(c: Camera) => void>();
  const setCamera = (c: Camera): void => {
    camera = c;
    for (const cb of [...cameraListeners]) cb(c);
  };
  /** Éléments de la dernière suppression, resélectionnés si elle est annulée aussitôt (CL5b-12). */
  let lastDeleted: string[] | null = null;
  /** Caméra de chaque page quittée (D17 : par page, dans l'interface, jamais dans le document). */
  const cameras = new Map<string, Camera>();
  /** Pages déjà ajustées à la vue : l'ajustement ne se fait qu'une fois par page (HL3-6, HL3b-7). */
  const fitted = new Set<string>();
  let viewW = 0;
  let viewH = 0;
  let tool: ToolChoice = "pen";
  let spaceHeld = false;
  let shiftHeld = false;
  let altHeld = false;
  let lastOverlay = overlayKey(EMPTY_OVERLAY);
  let eraserMode: EraseMode = "partial";
  let error: string | null = null;
  let sceneDirty = true;
  let lastHidden: ReadonlySet<string> = new Set<string>();
  /** Aperçu de grille posé sur le rendu (DAE1). */
  let previewing = false;
  function stopPreview(): void {
    if (!previewing) return;
    previewing = false;
    renderer.setGridPreview(null);
  }
  const stateListeners = new Set<(s: EngineState) => void>();
  const drawnListeners = new Set<(now: number) => void>();
  const owner = new Map<number, GestureTool>();

  /** Comptes de `#stage[data-table-merges|data-table-shades]` (F29), recalculés quand la version ou la page change (PC12). */
  let counted = { key: "", merges: 0, shades: 0 };
  const tableCounts = (): { readonly merges: number; readonly shades: number } => {
    const key = `${pageId}|${doc.version()}`;
    if (counted.key !== key) {
      let merges = 0;
      let shades = 0;
      for (const id of doc.elementIds(pageId)) {
        const el = doc.element(id);
        if (el?.kind !== "table") continue;
        merges += el.table.merges.length;
        shades += el.table.cells.filter((c) => c.shade !== null).length;
      }
      counted = { key, merges, shades };
    }
    return counted;
  };

  /** Vues des éléments sélectionnés (C3) : unités et groupe, sans parcourir toute la page. */
  const selectedViews = (): GroupedView[] => viewsOf(doc, selectTool.selection());

  function group(): boolean {
    const sel = [...selectTool.selection()];
    if (selectionUnits(sel, selectedViews()).units < 2) return false;
    return run({ type: "Group", ids: sel }) !== null;
  }

  function ungroup(): boolean {
    const sel = [...selectTool.selection()];
    if (!selectionUnits(sel, selectedViews()).grouped) return false;
    return run({ type: "Ungroup", ids: sel }) !== null;
  }

  function state(): EngineState {
    const ids = doc.pageIds();
    const sel = selectTool.selection();
    const units = sel.length === 0 ? { units: 0, grouped: false } : selectionUnits(sel, selectedViews());
    return {
      tool,
      eraserMode,
      canUndo: doc.canUndo(),
      canRedo: doc.canRedo(),
      page: pageId,
      pageIndex: ids.indexOf(pageId),
      pageCount: ids.length,
      selection: [...selectTool.selection()],
      selectionBounds: selectTool.selection().length > 0 ? doc.bounds(selectTool.selection()) : null,
      selectionUnits: units.units,
      selectionGrouped: units.grouped,
      tableCell: tableTool.cellState(),
      tableMerges: tableCounts().merges,
      tableShades: tableCounts().shades,
      textFormat: tool === "text" ? textTool.formatState() : tool === "table" ? tableTool.formatState() : null,
      fillColor,
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

  function closeAll(how: CloseReason): void {
    for (const [id, g] of owner) g.close(id, how);
    owner.clear();
  }

  /** Montre une page : gestes abandonnés, caméra de la page quittée gardée (D17, HL3b-7), ajustée si jamais vue. */
  function switchTo(id: string): void {
    closeAll("abort");
    leaveAll("page");
    stopPreview();
    cameras.set(pageId, camera);
    pageId = id;
    lastIndex = doc.pageIds().indexOf(id);
    const saved = cameras.get(id);
    if (saved) {
      setCamera(saved);
    } else if (viewW > 0 && viewH > 0) {
      setCamera(fitWidth(viewW, viewH));
      fitted.add(id);
    } else {
      setCamera(IDENTITY);
    }
    requestScene();
  }

  /**
   * Après une écriture ou annuler / rétablir (CL4-9) : une page apparue est montrée si `showAppeared` ; la page montrée
   * disparue laisse la précédente (la première si c'était la première).
   */
  function followPages(before: readonly string[], showAppeared: boolean): void {
    const after = doc.pageIds();
    if (showAppeared) {
      const appeared = after.find((id) => !before.includes(id));
      if (appeared !== undefined) {
        switchTo(appeared);
        return;
      }
    }
    if (!after.includes(pageId)) {
      const next = after[Math.min(Math.max(0, lastIndex - 1), after.length - 1)];
      if (next !== undefined) switchTo(next);
      return;
    }
    lastIndex = after.indexOf(pageId);
  }

  /** Écriture commune (commande ou insertion, C3) : refus dans l'état ; pages suivies ; outils élagués ; une émission. */
  function commit(write: () => Change, showAppeared: boolean): Change | null {
    lastDeleted = null;
    const before = doc.pageIds();
    let change: Change;
    try {
      change = write();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      emit();
      return null;
    }
    renderer.invalidate(change);
    error = null;
    followPages(before, showAppeared);
    selectTool.prune();
    tableTool.prune();
    requestScene();
    emit();
    return change;
  }

  function run(cmd: Command): Change | null {
    return commit(() => doc.apply(cmd), false);
  }

  function history(which: "undo" | "redo"): void {
    const before = doc.pageIds();
    const restore = which === "undo" ? lastDeleted : null;
    lastDeleted = null;
    const change = which === "undo" ? doc.undo() : doc.redo();
    renderer.invalidate(change);
    error = null;
    followPages(before, true);
    selectTool.prune();
    tableTool.prune();
    if (restore) {
      const present = new Set(doc.elementIds(pageId));
      if (restore.every((id) => present.has(id))) selectTool.setSelection(restore);
    }
    requestScene();
    emit();
  }

  const ctx: ToolContext = {
    doc,
    page: () => pageId,
    camera: () => camera,
    run,
    shift: () => shiftHeld,
    alt: () => altHeld,
    requestFrame: requestScene,
    stateChanged: () => emit(),
  };
  const selectTool: SelectionTool = deps.tools.select?.(ctx) ?? inertSelection();
  /** Style de texte des outils Texte et Tableau : couleur du stylo, taille par défaut. */
  const textStyle = (): TextStyle => ({ color: style.color, size: DEFAULT_TEXT_SIZE });
  const tableTool: TableTool = deps.tools.table?.(ctx, textStyle) ?? inertTable();
  const textTool: TextTool = deps.tools.text?.(ctx, textStyle) ?? inertText();
  const shapeTool = (k: ShapeKind): GestureTool => deps.tools.shape?.(ctx, k, () => style) ?? inertTool();
  const tools: Record<DrawTool, GestureTool> = {
    pen: deps.tools.pen(ctx, () => style),
    eraser: deps.tools.eraser(ctx, () => eraserMode),
    select: selectTool,
    rect: shapeTool("rect"),
    ellipse: shapeTool("ellipse"),
    line: shapeTool("line"),
    arrow: shapeTool("arrow"),
    table: tableTool,
    text: textTool,
    fill: deps.tools.fill?.(ctx, () => fillColor) ?? inertTool(),
  };
  const toolList: readonly GestureTool[] = Object.values(tools);

  function leaveAll(reason: LeaveReason): void {
    for (const t of toolList) t.leave?.(reason);
  }

  function frame(now: number): void {
    for (const t of toolList) t.frame();
    const parts: LivePart[] = toolList.map((t) => t.live());
    const hidden = new Set<string>();
    for (const p of parts) for (const id of p.hidden) hidden.add(id);
    const overlay = mergeOverlays(parts.map((p) => p.overlay));
    const key = overlayKey(overlay);
    if (sceneDirty || !sameSet(hidden, lastHidden) || key !== lastOverlay) {
      renderer.drawScene(
        { id: pageId, elementIds: doc.elementIds(pageId), background: doc.page(pageId)?.background ?? PAGE_BACKGROUND },
        camera,
        hidden,
        overlay,
      );
      sceneDirty = false;
      lastHidden = hidden;
      lastOverlay = key;
    }
    renderer.drawLive({ strokes: parts.flatMap((p) => p.strokes), erasers: parts.flatMap((p) => p.erasers) }, camera);
    for (const cb of drawnListeners) cb(now);
    if (!toolList.some((t) => t.active())) loop.stop();
  }

  const loop = createFrameLoop(deps.frames, frame, ENGINE_FRAME_HISTORY);

  /** Exécute un geste ; `emit()` si la sélection a changé. */
  const emitIfSelectionChanged = (run: () => void): void => {
    const before = selectTool.selection().join("\n");
    run();
    if (selectTool.selection().join("\n") !== before) emit();
  };

  const sink: GestureSink = {
    begin(pointerId, t, samples) {
      lastDeleted = null;
      const g = tools[t];
      owner.set(pointerId, g);
      emitIfSelectionChanged(() => g.begin(pointerId, samples));
      loop.start();
    },
    extend(pointerId, samples, predicted) {
      owner.get(pointerId)?.extend(pointerId, samples, predicted);
    },
    close(pointerId, how) {
      const g = owner.get(pointerId);
      if (!g) return;
      owner.delete(pointerId);
      emitIfSelectionChanged(() => g.close(pointerId, how));
      loop.start(); // une image de plus : couche vive effacée, aperçu retiré
    },
  };

  const view: ViewSink = {
    panBy(dx, dy) {
      setCamera(panCamera(camera, dx, dy));
      requestScene();
    },
    zoomAt(x, y, factor) {
      setCamera(zoomCamera(camera, x, y, factor));
      requestScene();
    },
  };

  const engine: Engine = {
    sink,
    view,
    tool: () => tool,
    setTool(t) {
      if (t !== tool) {
        leaveAll("tool");
        tool = t;
        requestScene();
      }
      emit();
    },
    setEraserMode(m) {
      eraserMode = m;
      emit();
    },
    run,
    group,
    ungroup,
    deleteElements(ids) {
      const list = [...ids];
      run({ type: "Delete", ids: list });
      lastDeleted = list;
      selectTool.setSelection([]);
      requestScene();
      emit();
    },
    insertFragment(src, dx, dy) {
      // Un texte ouvert est validé avant l'insertion : son étape précède celle de l'insertion (Annuler retire l'insertion).
      if (tool !== "select") leaveAll("tool");
      const change = commit(() => doc.insertFragment(src, pageId, dx, dy), false);
      if (change === null || change.ids.length === 0) return change;
      engine.setTool("select");
      selectTool.setSelection(change.ids);
      requestScene();
      emit();
      return change;
    },
    insertPages(src) {
      return commit(() => doc.insertPages(src, pageId), true);
    },
    undo: () => history("undo"),
    redo: () => history("redo"),
    key(e) {
      if (e.key === "Shift") {
        shiftHeld = true;
        return false;
      }
      if (e.key === "Alt") {
        altHeld = true;
        return false;
      }
      if (isPanKey(e)) {
        spaceHeld = true;
        return true;
      }
      const edit = editAction(e);
      if (edit !== null) {
        // T7 : avec l'outil Tableau, Suppr ou Retour arrière (saisie fermée) vide la cellule active ; sinon la sélection.
        if (edit === "delete" && tool === "table" && tableTool.clearCell()) return true;
        // PC18 : Échap avec l'outil Tableau (saisie fermée) retire d'abord la plage.
        if (edit === "escape" && tool === "table" && tableTool.clearRange()) return true;
        const sel = selectTool.selection();
        if (sel.length === 0) return false;
        if (edit === "delete") engine.deleteElements(sel);
        else {
          selectTool.setSelection([]);
          requestScene();
          emit();
        }
        return true;
      }
      const action = keyAction(e);
      if (action === null) return false;
      // C3 (Z13, HZ1-2) : Ctrl+G et Ctrl+Maj+G sont pris même sans effet.
      if (action === "group") {
        group();
        return true;
      }
      if (action === "ungroup") {
        ungroup();
        return true;
      }
      history(action);
      return true;
    },
    keyUp(e) {
      if (e.key === "Shift") {
        shiftHeld = false;
        return false;
      }
      if (e.key === "Alt") {
        altHeld = false;
        return false;
      }
      if (e.key !== " " || !spaceHeld) return false;
      spaceHeld = false;
      return true;
    },
    releaseKeys() {
      spaceHeld = false;
      shiftHeld = false;
      altHeld = false;
    },
    panHeld: () => spaceHeld,
    showPage(id) {
      if (id === pageId) return true;
      if (!doc.pageIds().includes(id)) return false;
      switchTo(id);
      emit();
      return true;
    },
    addPage() {
      const id = run({ type: "AddPage", after: pageId })?.pages[0];
      if (id === undefined) return false;
      return engine.showPage(id);
    },
    removePage() {
      leaveAll("page"); // texte ouvert validé sur la page encore présente, sélection vidée
      return run({ type: "RemovePage", page: pageId }) !== null;
    },
    nextPage() {
      const ids = doc.pageIds();
      const next = ids[ids.indexOf(pageId) + 1];
      return next !== undefined && engine.showPage(next);
    },
    prevPage() {
      const ids = doc.pageIds();
      const i = ids.indexOf(pageId);
      const prev = i > 0 ? ids[i - 1] : undefined;
      return prev !== undefined && engine.showPage(prev);
    },
    fitPage() {
      if (viewW > 0 && viewH > 0) {
        setCamera(fitWidth(viewW, viewH));
        fitted.add(pageId);
      }
      requestScene();
    },
    redraw() {
      requestScene();
    },
    previewGrid(grid) {
      previewing = true;
      renderer.setGridPreview({ page: pageId, grid });
      requestScene();
    },
    endGridPreview() {
      if (!previewing) return;
      stopPreview();
      requestScene();
    },
    setFillColor(c) {
      if (c !== null && (typeof c !== "string" || !validColor(c))) return;
      fillColor = c;
      emit();
    },
    setPenStyle(s) {
      if (typeof s.color !== "string" || s.color === "" || !Number.isFinite(s.width) || !(s.width > 0)) return;
      style = { color: s.color, width: s.width };
    },
    tableAction(a) {
      tableTool.act(a);
    },
    textStyle,
    tableFill(fill) {
      tableTool.fill(fill);
    },
    textFormat(a) {
      if (tool === "text") textTool.format(a);
      else if (tool === "table") tableTool.format(a);
    },
    onCamera(cb) {
      cameraListeners.add(cb);
      return () => {
        cameraListeners.delete(cb);
      };
    },
    wheel(e) {
      if (e.ctrlKey) view.zoomAt(e.x, e.y, Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED));
      else view.panBy(-e.deltaX, -e.deltaY);
    },
    resize(width, height, dpr) {
      renderer.resize(width, height, dpr);
      viewW = width;
      viewH = height;
      if (!fitted.has(pageId) && width > 0 && height > 0) {
        setCamera(fitWidth(width, height));
        fitted.add(pageId);
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
      closeAll("abort");
      loop.stop();
      stateListeners.clear();
      drawnListeners.clear();
      cameraListeners.clear();
    },
  };
  return engine;
}
