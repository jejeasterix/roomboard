/**
 * Moteur d'interaction (DA2) : relie le routeur (par `sink` et `view`), les outils, la caméra, le rendu et le cœur.
 * Sans framework ni DOM : la page (main.ts) branche les événements et injecte outils et rendu. Une écriture par geste,
 * au relâché (D38) ; toute erreur du cœur (dernière page, points invalides…) est attrapée et rendue dans l'état.
 * Lot 3b (D17) : outil main, barre d'espace tenue (lue par le routeur), caméra par page ; historique des images borné.
 */
import { createImageEdit, type ImageEdit, type ImageEditSession } from "./tools/image-edit";
import type { Bounds, Change, Command, CoreDocument, EraseMode, GridView, PageLayout, PageMode, ShapeKind, StrokeStyle } from "../core/api";
import { createFrameLoop, type FrameLoopDeps } from "../proto/frame-loop";
import { fitFor, IDENTITY, panBy as panCamera, screenToWorld, zoomAt as zoomCamera, type Camera } from "./camera";
import type { CloseReason, DrawTool, GestureSink, ToolChoice, ViewSink } from "./input/gesture";
import type { InputSample } from "./input/sampler";
import { selectionUnits, viewsOf, type GroupedView } from "./groups";
import { stepTarget, wholeUnits } from "../app/layer-list";
import { editAction, enterAction, inEditable, isPanKey, keyAction, objectKey, orderKey, pageKey, type KeyLike } from "./input/keys";
import { DEFAULT_ITEM_STYLE, mergeItemStyle, type ItemStyle } from "./item-style";
import type { LookPatch } from "../core/look";
import { mergeOverlays, overlayKey, EMPTY_OVERLAY } from "./render/overlay";
import type { FormatAction, FormatState } from "./rich-edit";
import type { Renderer } from "./render/renderer";
import { validColor } from "../core/rich-text";
import { PAGE_BACKGROUND, pageFrame, pageLayoutOf, type PageRect } from "./page";
import { DEFAULT_TEXT_SIZE } from "./text-layout";
import type { TextStyle, TextTool } from "./tools/text";
import type { TableAction, TableCellState } from "./table-geom";
import { createModelOrbit, type ModelOrbit, type ModelOrbitSession } from "./tools/model-orbit";
import { SELECT_TOL_PX } from "./tools/select";
import type { ModelCamera } from "./render/model-frames";
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
  /** Mode lu de la page montrée (`"page"` ou `"infinite"`) et disposition (paysage, portrait, infini) ; T8. */
  readonly pageMode: PageMode;
  readonly pageLayout: PageLayout;
  /** Éléments sélectionnés (outil Sélection, T55) et leur boîte monde ; vides tant que la sélection n'est pas branchée. */
  readonly selection: readonly string[];
  readonly selectionBounds: Bounds | null;
  /** C3 (Z13) : unités de la sélection (groupes extérieurs et éléments libres) ; 0 sans sélection. */
  readonly selectionUnits: number;
  /** C3 (Z13) : un élément sélectionné au moins porte un groupe. */
  readonly selectionGrouped: boolean;
  /** C5 (I25, I33) : id de l'image sélectionnée seule ; null sinon. Facultatif (comme fillColor) : le moteur le publie toujours. */
  readonly selectionImage?: string | null;
  /** Cellule active de l'outil Tableau (C10a) : rangs et taille du tableau ; null sans cellule active. */
  readonly tableCell: TableCellState | null;
  /** C10b (F29) : zones fusionnées et cellules ombrées de tous les tableaux de la page montrée, quel que soit l'outil. */
  readonly tableMerges: number;
  readonly tableShades: number;
  /** État de la barre de format (C7b, R15) : saisie ouverte de l'outil Texte ou Tableau actif ; null sinon. */
  readonly textFormat: FormatState | null;
  /** Couleur du pot (C6a, D16) ; null = « Aucune ». Facultative (PC5) : le moteur la publie toujours. */
  readonly fillColor?: string | null;
  /** Tolérance du pot sur une image (C6b, B10), entier de 0 à 100 ; facultative comme fillColor (le moteur la publie). */
  readonly fillTolerance?: number;
  /** OG11 (déc. 23) : style courant des créations et du panneau d'options. Facultatif comme fillColor (PC5) : le moteur
   *  le publie toujours. */
  readonly itemStyle?: ItemStyle;
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
  /** OG11 : le style courant (`ItemStyle` étend la couleur et l'épaisseur du stylo). */
  pen(ctx: ToolContext, style: () => ItemStyle): GestureTool;
  eraser(ctx: ToolContext, mode: () => EraseMode): GestureTool;
  /** Outils d'édition (lot 4) ; absents : outils inertes (tests du moteur, amorce partielle). */
  select?(ctx: ToolContext): SelectionTool;
  shape?(ctx: ToolContext, kind: ShapeKind, style: () => ItemStyle): GestureTool;
  text?(ctx: ToolContext, style: () => TextStyle): TextTool;
  /** Outil Tableau (C10a) ; absent : outil inerte. */
  table?(ctx: ToolContext, style: () => TextStyle): TableTool;
  /** Outil Pot (C6a, D15) ; `color` lue au relâché ; absent : outil inerte. */
  fill?(ctx: ToolContext, color: () => string | null, tolerance: () => number): GestureTool;
}

export interface EngineDeps {
  readonly doc: CoreDocument;
  readonly renderer: Renderer;
  readonly frames: FrameLoopDeps;
  readonly tools: ToolFactories;
  readonly penStyle?: StrokeStyle;
  /** OG11 (déc. 23) : style courant gardé sur l'appareil ; absent : `penStyle` fusionné au style par défaut. */
  readonly itemStyle?: ItemStyle;
  /** C5 (I29) : couleur d'origine d'un pixel source, pour la pipette ; absent : la pipette ne rend rien. */
  readonly images?: { colorAt(asset: string, x: number, y: number): string | null; dropPreview?(id: string): void };
  /** OF83 : haut de la page ajustée, en px de scène, lu à chaque ajustement (sous les îlots du haut) ; absent : 16. */
  readonly fitTop?: () => number;
  /** Disposition d'une page neuve (profil actif, `behavior.pageMode`) ; absent : paysage. */
  readonly pageMode?: () => PageLayout;
}

/**
 * Raccourcis de page (DA9) pris avant le moteur : hors champ de saisie et hors IME (`pageKey`). Une touche tenue
 * (`repeat`) ne crée jamais de page ni de copie (H7). Vrai si l'action a eu lieu (la page appelle preventDefault).
 * `sidebar-pages` et `sidebar-layers` ouvrent l'onglet Pages ou Calques de la barre latérale (lot 2 pour le second).
 */
export function pageShortcut(
  e: KeyLike & { readonly repeat?: boolean },
  engine: Pick<Engine, "prevPage" | "nextPage" | "nextOrAdd" | "addPage" | "duplicatePage">,
  toggleSidebar?: (tab: "pages" | "calques") => void,
): boolean {
  if (inEditable(e.target)) return false;
  const k = pageKey(e);
  if (k === null) return false;
  const held = e.repeat === true;
  switch (k) {
    case "prev":
      return engine.prevPage();
    case "next":
      return held ? engine.nextPage() : engine.nextOrAdd();
    case "add":
      return !held && engine.addPage();
    case "duplicate":
      return !held && engine.duplicatePage();
    case "sidebar-pages":
      if (toggleSidebar === undefined) return false;
      toggleSidebar("pages");
      return true;
    case "sidebar-layers":
      if (toggleSidebar === undefined) return false;
      toggleSidebar("calques");
      return true;
  }
}

export interface OrbitOptions {
  readonly view: ModelCamera;
  onView(v: ModelCamera): void;
  onCommit(v: ModelCamera): void;
  closed?(): void;
}

export interface Engine {
  readonly sink: GestureSink;
  readonly view: ViewSink;
  tool(): ToolChoice;
  setTool(t: ToolChoice): void;
  setEraserMode(m: EraseMode): void;
  run(cmd: Command): Change | null;
  /** Lot 2 (calques) : outil Sélection, sélection = `ids` de la page montrée (les inconnus sont ignorés) ; [] la vide. */
  select(ids: readonly string[]): void;
  /** Lot 2 : bloc `ids` au rang `to` de la pile (0 = arrière-plan) ; une étape ; faux si refusé ou sans effet. */
  restack(ids: readonly string[], to: number): boolean;
  /** Lot 2 : la sélection (groupes entiers) au premier plan ; faux sans sélection ou déjà en haut. */
  bringToFront(): boolean;
  /** Lot 2 : la sélection (groupes entiers) à l'arrière-plan ; faux sans sélection ou déjà en bas. */
  sendToBack(): boolean;
  /** Lot 2 : la sélection d'un rang vers le premier plan (`up`) ou l'arrière-plan (`down`) ; faux si impossible. */
  reorder(dir: "up" | "down"): boolean;
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
  addPage(after?: string): boolean;
  /** Page suivante ; sur la dernière, ajoute une page au mode du profil (décision 7) ; faux si rien n'est fait. */
  nextOrAdd(): boolean;
  /** Déplace `page` au rang `to` ; la page montrée reste montrée. */
  movePage(page: string, to: number): boolean;
  /** Duplique `page` (défaut : la page montrée) et montre la copie (H20). */
  duplicatePage(page?: string): boolean;
  /** Change la disposition de la page montrée. */
  setPageMode(mode: PageLayout): boolean;
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
  /** C5 (DAI4) : séance de retouche de l'image `id` de la page montrée (une seule à la fois) ; null si ce n'en est pas une. */
  editImage(id: string): ImageEdit | null;
  /** C15 (X23, PC2) : séance d'orbite de l'élément `id` de la page montrée (une seule séance modale : ferme la retouche
   *  d'image et une orbite ouverte) ; null s'il n'est pas sur la page. La session vérifie que c'est un objet 3D. */
  orbitModel(id: string, opts: OrbitOptions): ModelOrbit | null;
  /** C5 (I24) : message dans l'état (`#etat`), sans écriture. */
  report(message: string): void;
  /** Préréglage reçu de la barre : couleur et épaisseur du style courant, fusionnées (le reste est gardé, S2.4) ; la
   *  sélection n'est pas écrite. Invalide : ignoré. */
  setPenStyle(s: StrokeStyle): void;
  /** OG11 : écrit la sélection (un SetStyle, une étape ; champs invalides ignorés) et fusionne le style courant. */
  setItemStyle(patch: Partial<ItemStyle>): void;
  itemStyle(): ItemStyle;
  /** OG11 : adopte tel quel le style courant venu de l'appareil (autre onglet) : ni sélection écrite, ni écho à `onItemStyle`. */
  adoptItemStyle(s: ItemStyle): void;
  /** Chaque changement du style courant (pour le garder sur l'appareil) ; rend le désabonnement. */
  onItemStyle(cb: (s: ItemStyle) => void): () => void;
  /** Supprime la sélection comme Suppr ; faux sans sélection. */
  deleteSelection(): boolean;
  /** OG11 (Ctrl+D) : copie de la sélection décalée de +10/+10, sélectionnée ; une étape ; faux sans sélection. */
  duplicateSelection(): boolean;
  /** Couleur du pot (C6a, D16), propre au pot : ni le stylo ni les formes ne changent ; null = « Aucune » ; une couleur
   *  invalide est ignorée. */
  setFillColor(color: string | null): void;
  /** Tolérance du pot (C6b, B10) : arrondie, bornée à 0-100 ; non finie : ignorée. */
  setFillTolerance(t: number): void;
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
export const DEFAULT_FILL_TOLERANCE = 5;
/** Ctrl+molette : facteur exp(-deltaY × vitesse) (HL3-6). */
export const WHEEL_ZOOM_SPEED = 0.002;
/** Durées d'image retenues (une minute à 60 Hz) : le banc et son export en lisent au plus autant (HL3b-8). */
export const ENGINE_FRAME_HISTORY = 3600;
/** Mineur C15 (C1) : déplacement, en px d'écran, au-delà duquel un appui à côté de l'objet de l'orbite la ferme. */
export const ORBIT_MISS_SLOP_PX = 8;

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
  /** OG11 (déc. 23) : style courant, fusionné à chaque changement (jamais remplacé, S2.4). */
  let item: ItemStyle = deps.itemStyle ?? (deps.penStyle ? mergeItemStyle(DEFAULT_ITEM_STYLE, deps.penStyle) : DEFAULT_ITEM_STYLE);
  const itemListeners = new Set<(s: ItemStyle) => void>();
  let fillColor: string | null = DEFAULT_FILL_COLOR;
  let fillTolerance = DEFAULT_FILL_TOLERANCE;
  let camera: Camera = IDENTITY;
  /** « Ajuster la page » : selon la disposition de la page montrée ; en Infini, contenu ∪ fond. */
  const fit = (w: number, h: number): Camera => {
    const view = doc.page(pageId);
    const top = deps.fitTop?.() ?? 16;
    if (view === null) return fitFor("landscape", w, h, null, null, top);
    // décision 10 : Infini = contenu ∪ fond ; page plus haute que large (portrait choisi) = cadre entier ; sinon largeur.
    // Le cadre d'un fond PDF A4 dépasse la hauteur de page : il ne décide pas de l'ajustement.
    const layout = pageLayoutOf(view) === "infinite" ? "infinite" : view.height > view.width ? "portrait" : "landscape";
    return fitFor(layout, w, h, pageFrame(view), layout === "infinite" ? contentRect(view.backdrop?.rect ?? null) : null, top);
  };
  const contentRect = (backdrop: Bounds | null): PageRect | null => {
    const b = doc.bounds(doc.elementIds(pageId));
    const rects = [b, backdrop].filter((r): r is Bounds => r !== null);
    if (rects.length === 0) return null;
    return {
      x0: Math.min(...rects.map((r) => r.x0)),
      y0: Math.min(...rects.map((r) => r.y0)),
      x1: Math.max(...rects.map((r) => r.x1)),
      y1: Math.max(...rects.map((r) => r.y1)),
    };
  };
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
  let imageEdit: ImageEditSession | null = null;
  let orbit: ModelOrbitSession | null = null;
  const stateListeners = new Set<(s: EngineState) => void>();
  const drawnListeners = new Set<(now: number) => void>();
  const owner = new Map<number, GestureTool>();

  /** Comptes de `#stage[data-table-merges|data-table-shades]` (F29), recalculés quand la version ou la page change (PC12).
   *  OE23 (Q7) : seuls les candidats `table` (kind brut) sont lus, chacun confirmé par sa vue (un mal formé est `unknown`). */
  let counted = { key: "", merges: 0, shades: 0 };
  const tableCounts = (): { readonly merges: number; readonly shades: number } => {
    const key = `${pageId}|${doc.version()}`;
    if (counted.key !== key) {
      let merges = 0;
      let shades = 0;
      for (const id of doc.elementIdsOfKind(pageId, "table")) {
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

  /** Lot 2 : `Restack` ; vrai seulement si l'ordre a changé (même ordre : aucune étape, version inchangée). */
  function restack(ids: readonly string[], to: number): boolean {
    const version = doc.version();
    const change = run({ type: "Restack", ids: [...ids], to });
    return change !== null && doc.version() !== version;
  }
  /** Sélection étendue aux groupes entiers, dans l'ordre de la pile. */
  const selectedBlock = (): string[] => wholeUnits(doc, pageId, selectTool.selection());
  function reorder(dir: "up" | "down"): boolean {
    const sel = selectTool.selection();
    const to = sel.length === 0 ? null : stepTarget(doc, pageId, sel, dir);
    return to !== null && restack(selectedBlock(), to);
  }
  function bringToFront(): boolean {
    const ids = selectedBlock();
    return ids.length > 0 && restack(ids, doc.elementIds(pageId).length - ids.length);
  }
  function sendToBack(): boolean {
    const ids = selectedBlock();
    return ids.length > 0 && restack(ids, 0);
  }

  function state(): EngineState {
    const ids = doc.pageIds();
    const sel = selectTool.selection();
    const pageView = doc.page(pageId);
    const units = sel.length === 0 ? { units: 0, grouped: false } : selectionUnits(sel, selectedViews());
    return {
      tool,
      eraserMode,
      canUndo: doc.canUndo(),
      canRedo: doc.canRedo(),
      page: pageId,
      pageIndex: ids.indexOf(pageId),
      pageCount: ids.length,
      pageMode: pageView?.mode ?? "page",
      pageLayout: pageView === null ? "landscape" : pageLayoutOf(pageView),
      selection: [...selectTool.selection()],
      selectionBounds: selectTool.selection().length > 0 ? doc.bounds(selectTool.selection()) : null,
      selectionUnits: units.units,
      selectionGrouped: units.grouped,
      selectionImage: sel.length === 1 && doc.element(sel[0] ?? "")?.kind === "image" ? (sel[0] ?? null) : null,
      tableCell: tableTool.cellState(),
      tableMerges: tableCounts().merges,
      tableShades: tableCounts().shades,
      textFormat: tool === "text" ? textTool.formatState() : tool === "table" ? tableTool.formatState() : null,
      fillColor,
      fillTolerance,
      itemStyle: item,
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
    imageEdit?.close();
    orbit?.close();
    cameras.set(pageId, camera);
    pageId = id;
    lastIndex = doc.pageIds().indexOf(id);
    const saved = cameras.get(id);
    if (saved) {
      setCamera(saved);
    } else if (viewW > 0 && viewH > 0) {
      setCamera(fit(viewW, viewH));
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
    imageEdit?.changed(doc.version());
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
    const version = doc.version();
    const change = which === "undo" ? doc.undo() : doc.redo();
    renderer.invalidate(change);
    // Rien à annuler ou à rétablir : aucune écriture, le brouillon de la retouche reste (I31).
    if (doc.version() !== version) imageEdit?.changed(doc.version());
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
  const textStyle = (): TextStyle => ({ color: item.color, size: DEFAULT_TEXT_SIZE, ...(item.opacity < 100 ? { opacity: item.opacity } : {}), ...(item.textAlign !== "left" ? { textAlign: item.textAlign } : {}) });
  const tableTool: TableTool = deps.tools.table?.(ctx, textStyle) ?? inertTable();
  const textTool: TextTool = deps.tools.text?.(ctx, textStyle) ?? inertText();
  const shapeTool = (k: ShapeKind): GestureTool => deps.tools.shape?.(ctx, k, () => item) ?? inertTool();
  const tools: Record<DrawTool, GestureTool> = {
    pen: deps.tools.pen(ctx, () => item),
    eraser: deps.tools.eraser(ctx, () => eraserMode),
    select: selectTool,
    rect: shapeTool("rect"),
    ellipse: shapeTool("ellipse"),
    line: shapeTool("line"),
    arrow: shapeTool("arrow"),
    table: tableTool,
    text: textTool,
    fill: deps.tools.fill?.(ctx, () => fillColor, () => fillTolerance) ?? inertTool(),
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
    const merged = mergeOverlays(parts.map((p) => p.overlay));
    // C5 (I28) : pendant le rognage, le cadre de la sélection cède la place au cadre de rognage.
    const overlay = imageEdit?.mode() === "crop" ? { ...merged, frame: null, handles: false } : merged;
    const key = overlayKey(overlay);
    if (sceneDirty || !sameSet(hidden, lastHidden) || key !== lastOverlay) {
      // Un seul `doc.page` par scène (PF29) : fond de couleur (C6a) et fond de page (C12).
      const view = doc.page(pageId);
      renderer.drawScene(
        {
          id: pageId,
          elementIds: doc.elementIds(pageId),
          background: view?.background ?? PAGE_BACKGROUND,
          backdrop: view?.backdrop ?? null,
          ...(view === null ? {} : { width: view.width, height: view.height, mode: view.mode }),
        },
        camera,
        hidden,
        overlay,
      );
      sceneDirty = false;
      lastHidden = hidden;
      lastOverlay = key;
    }
    const opacity = parts.find((p) => p.opacity !== undefined && p.strokes.length > 0)?.opacity;
    renderer.drawLive(
      { strokes: parts.flatMap((p) => p.strokes), erasers: parts.flatMap((p) => p.erasers), ...(opacity !== undefined ? { opacity } : {}) },
      camera,
    );
    for (const cb of drawnListeners) cb(now);
    if (!toolList.some((t) => t.active()) && imageEdit?.gesture.active() !== true && orbit?.gesture.active() !== true) loop.stop();
  }

  const loop = createFrameLoop(deps.frames, frame, ENGINE_FRAME_HISTORY);

  /** Exécute un geste ; `emit()` si la sélection a changé. */
  const emitIfSelectionChanged = (run: () => void): void => {
    const before = selectTool.selection().join("\n");
    run();
    if (selectTool.selection().join("\n") !== before) emit();
  };

  /** Le point d'appui touche-t-il l'élément `id` (le plus haut sous le point, tolérance de la sélection) ? */
  const touches = (id: string, s: InputSample | undefined): boolean => {
    if (s === undefined) return false;
    const [x, y] = screenToWorld(camera, s.x, s.y);
    return doc.hitTest(pageId, x, y, SELECT_TOL_PX / camera.zoom) === id;
  };

  /**
   * Mineur C15 (C1) : appui à côté de l'objet de l'orbite. Rien n'est décidé tant que le doigt reste sous le seuil :
   * au relâché ou au-delà du seuil, l'orbite se ferme et l'outil `g` reçoit tous les points ; un abandon (le routeur
   * passe au pincement) ou une fin anormale laisse l'orbite ouverte et l'outil sans rien.
   */
  const missedOrbit = (g: GestureTool, pointerId: number, first: readonly InputSample[]): GestureTool => {
    const held: InputSample[] = [];
    const origin = first[0];
    let started = false;
    /** Premier point à `begin` (un outil ne lit que lui), les points retenus ensuite à `extend`. */
    const start = (predicted: readonly InputSample[]): void => {
      started = true;
      orbit?.close();
      emitIfSelectionChanged(() => {
        g.begin(pointerId, first);
        if (held.length > 0) g.extend(pointerId, held, predicted);
      });
      loop.start();
    };
    const far = (s: InputSample): boolean => origin !== undefined && Math.hypot(s.x - origin.x, s.y - origin.y) > ORBIT_MISS_SLOP_PX;
    return {
      begin() {},
      extend(id, samples, predicted) {
        if (started) return g.extend(id, samples, predicted);
        held.push(...samples);
        if (samples.some(far)) start(predicted);
      },
      frame() {},
      close(id, how) {
        if (!started && how !== "end") return;
        if (!started) start([]);
        g.close(id, how);
      },
      live: () => NO_LIVE,
      active: () => started && g.active(),
    };
  };

  const sink: GestureSink = {
    begin(pointerId, t, samples) {
      lastDeleted = null;
      // C15 (S2) : un appui qui ne touche pas l'objet de l'orbite (zone vide ou autre élément, hit-test de la sélection)
      // ferme l'orbite et va à l'outil courant (`missedOrbit`) ; pendant un glissé de l'orbite, un second appui lui
      // reste (ignoré).
      if (orbit !== null && !orbit.gesture.active() && !touches(orbit.id, samples[0])) {
        owner.set(pointerId, missedOrbit(tools[t], pointerId, samples));
        return;
      }
      const g = imageEdit !== null && imageEdit.mode() !== "idle" ? imageEdit.gesture : orbit !== null ? orbit.gesture : tools[t];
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

  /** Champs du style courant en commande SetStyle (noms du cœur ; neutre = champ retiré). */
  function patchOf(p: Partial<ItemStyle>): LookPatch {
    return {
      ...(p.color !== undefined ? { color: p.color } : {}),
      ...(p.width !== undefined ? { width: p.width } : {}),
      ...("background" in p ? { fill: p.background ?? null } : {}),
      ...(p.strokeStyle !== undefined ? { strokeStyle: p.strokeStyle === "solid" ? null : p.strokeStyle } : {}),
      ...(p.roughness !== undefined ? { roughness: p.roughness } : {}),
      ...(p.roundness !== undefined ? { roundness: p.roundness === "round" ? "round" : null } : {}),
      ...(p.opacity !== undefined ? { opacity: p.opacity } : {}),
      ...(p.fillStyle !== undefined ? { fillStyle: p.fillStyle === "solid" ? null : p.fillStyle } : {}),
      ...(p.startArrowhead !== undefined ? { startArrowhead: p.startArrowhead } : {}),
      ...(p.endArrowhead !== undefined ? { endArrowhead: p.endArrowhead } : {}),
      ...(p.textAlign !== undefined ? { textAlign: p.textAlign === "left" ? null : p.textAlign } : {}),
    };
  }

  /** Fusion du style courant (`mergeItemStyle`, jamais un remplacement) ; `writeSelection` : un SetStyle sur la
   *  sélection, des seuls champs acceptés, une étape. */
  function setItem(p: Partial<ItemStyle>, writeSelection: boolean): void {
    const next = mergeItemStyle(item, p);
    const keys = Object.keys(next) as (keyof ItemStyle)[];
    const changed = keys.some((k) => next[k] !== item[k]);
    item = next;
    if (changed) for (const cb of [...itemListeners]) cb(item);
    const sel = selectTool.selection();
    if (writeSelection && sel.length > 0) {
      const accepted = Object.fromEntries(keys.filter((k) => k in p && p[k] === next[k]).map((k) => [k, p[k]])) as Partial<ItemStyle>;
      if (Object.keys(accepted).length > 0) {
        run({ type: "SetStyle", ids: [...sel], patch: patchOf(accepted) });
        return;
      }
    }
    if (changed) emit();
  }

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
    deleteSelection() {
      const sel = selectTool.selection();
      if (sel.length === 0) return false;
      engine.deleteElements(sel);
      return true;
    },
    duplicateSelection() {
      const sel = selectTool.selection();
      if (sel.length === 0) return false;
      // Ni commande du cœur ni presse-papiers : l'extrait de la sélection réinséré à +10/+10 (une étape, copies sélectionnées).
      const fragment = doc.extract(pageId, sel);
      try {
        const change = engine.insertFragment(fragment, 10, 10);
        return change !== null && change.ids.length > 0;
      } finally {
        fragment.free();
      }
    },
    restack,
    bringToFront,
    sendToBack,
    reorder,
    select(ids) {
      engine.setTool("select");
      const present = new Set(doc.elementIds(pageId));
      selectTool.setSelection(ids.filter((id) => present.has(id)));
      requestScene();
      emit();
    },
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
      const order = orderKey(e);
      if (order !== null) {
        // Lot 2 : Ctrl+↑ ↓ un rang, Ctrl+Maj+↑ ↓ extrémités ; pris seulement avec une sélection (sinon la touche passe).
        if (selectTool.selection().length === 0) return false;
        if (order === "front") bringToFront();
        else if (order === "back") sendToBack();
        else reorder(order);
        return true;
      }
      const edit = editAction(e);
      const action = keyAction(e);
      if (imageEdit !== null && imageEdit.mode() !== "idle") {
        // C5 (I28) : pendant le rognage ou la pipette, Échap sort du mode, Suppr est pris sans effet, Entrée valide le
        // rognage, Ctrl+Z / Ctrl+Y sortent du mode sans écrire puis annulent ou rétablissent.
        if (edit === "escape") {
          imageEdit.cancelMode();
          return true;
        }
        if (edit === "delete" || objectKey(e) === "duplicate") return true;
        if (enterAction(e)) {
          if (imageEdit.mode() === "crop") imageEdit.finishCrop(true);
          return true;
        }
        if (action === "undo" || action === "redo") {
          imageEdit.cancelMode();
          history(action);
          return true;
        }
      }
      if (orbit !== null && edit === "escape") {
        orbit.close();
        return true;
      }
      // OG11 (DA-6, déc. 39) : Ctrl+D duplique ; toujours pris (preventDefault), comme Excalidraw : pas de favori du navigateur.
      if (objectKey(e) === "duplicate") {
        engine.duplicateSelection();
        return true;
      }
      if (edit !== null) {
        // T7 : avec l'outil Tableau, Suppr ou Retour arrière (saisie fermée) vide la cellule active ; sinon la sélection.
        if (edit === "delete" && tool === "table" && tableTool.clearCell()) return true;
        // PC18 : Échap avec l'outil Tableau (saisie fermée) retire d'abord la plage.
        if (edit === "escape" && tool === "table" && tableTool.clearRange()) return true;
        if (edit === "delete") return engine.deleteSelection();
        if (selectTool.selection().length === 0) return false;
        selectTool.setSelection([]);
        requestScene();
        emit();
        return true;
      }
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
    addPage(after = pageId) {
      const id = run({ type: "AddPage", after, mode: deps.pageMode?.() ?? "landscape" })?.pages[0];
      if (id === undefined) return false;
      return engine.showPage(id);
    },
    nextOrAdd() {
      return engine.nextPage() || (doc.pageIds().at(-1) === pageId && engine.addPage());
    },
    movePage(page, to) {
      return run({ type: "MovePage", page, to }) !== null;
    },
    duplicatePage(page = pageId) {
      const id = run({ type: "DuplicatePage", page })?.pages[0];
      if (id === undefined) return false;
      return engine.showPage(id);
    },
    setPageMode(mode) {
      const before = doc.page(pageId);
      if (run({ type: "SetPageMode", page: pageId, mode }) === null) return false;
      const after = doc.page(pageId);
      // comme PowerPoint : le changement de mode recadre la page ; mode inchangé, la vue reste où elle est
      if (before === null || after === null || before.mode !== after.mode || before.height !== after.height) engine.fitPage();
      return true;
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
        setCamera(fit(viewW, viewH));
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
    editImage(id) {
      if (doc.element(id)?.kind !== "image" || !doc.elementIds(pageId).includes(id)) return null;
      orbit?.close();
      imageEdit?.close();
      const session = createImageEdit({
        ctx,
        id,
        setPreview: (p) => renderer.setImagePreview(p),
        colorAt: (asset, x, y) => deps.images?.colorAt(asset, x, y) ?? null,
        closed: () => {
          deps.images?.dropPreview?.(id); // m4 : l'emplacement d'aperçu de l'image est jeté avec la séance
          if (imageEdit === session) imageEdit = null;
        },
      });
      imageEdit = session;
      return session;
    },
    orbitModel(id, opts) {
      if (!doc.elementIds(pageId).includes(id)) return null;
      imageEdit?.close();
      orbit?.close();
      const session = createModelOrbit({
        id,
        view: opts.view,
        onView: (v) => {
          opts.onView(v);
          requestScene();
        },
        onCommit: (v) => opts.onCommit(v),
        closed: () => {
          if (orbit === session) orbit = null;
          opts.closed?.();
          requestScene();
        },
      });
      orbit = session;
      return session;
    },
    report(message) {
      error = message;
      emit();
    },
    setFillColor(c) {
      if (c !== null && (typeof c !== "string" || !validColor(c))) return;
      fillColor = c;
      emit();
    },
    setFillTolerance(t) {
      if (typeof t !== "number" || !Number.isFinite(t)) return;
      fillTolerance = Math.min(100, Math.max(0, Math.round(t)));
      emit();
    },
    setPenStyle(s) {
      if (typeof s.color !== "string" || s.color === "" || !Number.isFinite(s.width) || !(s.width > 0)) return;
      setItem({ color: s.color, width: s.width }, false);
    },
    setItemStyle(p) {
      setItem(p, true);
    },
    itemStyle: () => item,
    adoptItemStyle(s) {
      const changed = (Object.keys(s) as (keyof ItemStyle)[]).some((k) => s[k] !== item[k]);
      item = s;
      if (changed) emit();
    },
    onItemStyle(cb) {
      itemListeners.add(cb);
      return () => {
        itemListeners.delete(cb);
      };
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
        setCamera(fit(width, height));
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
      imageEdit?.close();
      orbit?.close();
      closeAll("abort");
      loop.stop();
      stateListeners.clear();
      drawnListeners.clear();
      cameraListeners.clear();
      itemListeners.clear();
    },
  };
  return engine;
}
