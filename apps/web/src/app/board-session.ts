/**
 * Session d'un onglet (lot 5b, CL5b-1, CL5b-2) : le corps de l'ancien `start()` de main.ts, une fois par onglet. Chaque
 * session a sa scène (`.rb-stage`), ses deux canvas, son moteur, son échantillonneur et sa zone de texte ; le moteur
 * reste lié à un seul document (aucun `setDocument`). Les ids `#stage`, `#scene`, `#interaction`, `#texte-edition`
 * suivent la session active (`activate`/`deactivate`). Les touches (`keydown`/`keyup`/`blur` sur `window`) sont posées
 * une fois par l'amorce et vont à la session active : la session ne pose que ses écouteurs de scène. `dispose` rend le
 * contexte WebGL2 (`choice.release()`) : `engine.dispose()` n'arrête que la boucle.
 */
import type { CoreDocument } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { displaySize } from "../core/image-params";
import type { Camera } from "../engine/camera";
import { createEngine, DEFAULT_PEN_STYLE, type Engine, type EngineState } from "../engine/engine";
import { createMiddlePan } from "../engine/input/middle-pan";
import { withLinearPrediction } from "../engine/input/predict";
import { createRouter, SECOND_FINGER_MS, type RouterOptions } from "../engine/input/router";
import { createSampler, type Sampler, type SamplerOptions } from "../engine/input/sampler";
import type { Support } from "../engine/input/stats";
import { createImageCache, type BitmapDecoder } from "../engine/render/image-cache";
import { attachInkTrail, type InkLike } from "../engine/render/ink-trail";
import type { PdfEngine, PdfFile } from "../engine/render/pdf-port";
import { createPdfTiles, type PdfTiles } from "../engine/render/pdf-tiles";
import type { BackdropPainter } from "../engine/render/renderer";
import { chooseRenderer, type RendererChoice } from "../engine/render/select";
import { trailStyleFor } from "../engine/render/trail-style";
import {
  echelonsTag,
  resolvePrediction,
  type EffectiveEchelons,
  type ParsedSettings,
  type SettingsStore,
} from "../engine/settings";
import type { Measure } from "../engine/text-layout";
import { decodeImage, kindOfMime } from "../platform/image-import";
import { createPixelRunner, pixelNotice } from "../platform/pixel-runner";
import type { WorkerLike } from "../platform/sheet-reader";
import { createEraserTool } from "../engine/tools/eraser";
import { createFillTool } from "../engine/tools/fill";
import { createPenTool } from "../engine/tools/pen";
import { createSelectTool } from "../engine/tools/select";
import { createShapeTool } from "../engine/tools/shape";
import { createTableTool } from "../engine/tools/table";
import { createTextTool, type TextTool } from "../engine/tools/text";
import type { TableTool } from "../engine/tools/tool";
import type { AppBenchDeps } from "./banc";
import { stageTags } from "./stage-tags";
import { watchDpr } from "./mesure-outils";
import { createTablePicker } from "./table-picker";
import { createTextEditor, TEXT_EDITOR_ID, type TextEditorEvents } from "./text-editor";

export interface SessionShared {
  /** Conteneur des scènes (case centrale de la grille, T95) ; les zones de texte y sont aussi, hors des scènes (CL4-2). */
  readonly container: HTMLElement;
  readonly settings: SettingsStore;
  readonly parsed: ParsedSettings;
  /** Rendu par `detectSupport()`. */
  readonly support: Support;
  readonly measure: Measure;
  /** `core.version()`, pour le banc. */
  readonly coreVersion: string;
  /** Décodeur des bitmaps (tests) ; défaut : `decodeImage` du navigateur. */
  readonly decode?: BitmapDecoder;
  /** C5 (I18, DAI3) : lanceur du Worker de pixels de l'onglet ; absent : aucun calcul, images brutes. */
  readonly pixels?: () => WorkerLike;
  /** C12 (DAPF1) : moteur PDF des fonds `pdf-page` ; absent : fond en « page PDF illisible ». */
  readonly pdf?: PdfEngine;
}

/** Bitmap d'affichage d'un asset (R13, R15) : le type du Blob (posé à l'insertion ou à l'ouverture) choisit le SVG. */
const decodeBitmap: BitmapDecoder = async (blob) => (await decodeImage(blob, kindOfMime(blob.type) ?? "png")).bitmap;

export interface BoardSession {
  readonly doc: CoreDocument;
  readonly engine: Engine;
  readonly stage: HTMLDivElement;
  readonly choice: RendererChoice;
  readonly sampler: Sampler;
  readonly samplerOptions: SamplerOptions;
  /** État de la traînée d'encre (`attachInkTrail`), lu par le banc (`options.inkTrail`). */
  readonly trail: { readonly status: string };
  /** Mesure du texte partagée (CL4-4), lue par la cible d'import des tableaux (C10b, F21). */
  readonly measure: Measure;
  effective(): EffectiveEchelons;
  /** Dépendances de `createAppBench` pour cette session (celles de l'ancien main.ts, à l'identique). */
  bench(): AppBenchDeps;
  /** Rend les ids #stage, #scene, #interaction, #texte-edition à cette session (CL5b-2), la montre, ajuste sa taille. */
  activate(): void;
  /** Cache, retire les quatre ids, relâche les touches tenues (engine.releaseKeys). */
  deactivate(): void;
  /** Observateurs arrêtés, moteur arrêté, contexte WebGL2 rendu, document libéré, scène et zone de texte retirées du
   *  DOM. Idempotent. */
  dispose(): void;
}

/** `#stage[data-camera]` : zoom à 3 décimales, translation au dixième (lu par S5b). */
function cameraTag(c: Camera): string {
  return `${c.zoom.toFixed(3)},${c.tx.toFixed(1)},${c.ty.toFixed(1)}`;
}

/** Si une étape de la création échoue, tout ce qui est déjà posé (scène, écouteurs, contexte…) est libéré, puis l'erreur
 *  est relancée : aucune scène orpheline dans le conteneur. */
export async function createBoardSession(
  doc: CoreDocument,
  shared: SessionShared,
  assets: AssetStore = createAssetStore(),
): Promise<BoardSession> {
  const undo: Array<() => void> = [];
  try {
    return await buildBoardSession(doc, shared, assets, undo);
  } catch (e) {
    for (const free of undo.reverse()) {
      try {
        free();
      } catch {
        // la libération ne masque pas l'erreur d'origine
      }
    }
    throw e;
  }
}

async function buildBoardSession(
  doc: CoreDocument,
  shared: SessionShared,
  assets: AssetStore,
  undo: Array<() => void>,
): Promise<BoardSession> {
  const { container, settings, parsed, support, measure } = shared;
  const stage = document.createElement("div");
  stage.className = "rb-stage";
  stage.dataset["tab"] = "";
  stage.hidden = true;
  const sceneCanvas = document.createElement("canvas");
  const liveCanvas = document.createElement("canvas");
  stage.append(sceneCanvas, liveCanvas);
  // Dans la page avant le choix du rendu : un repli WebGL2 remplace le canvas d'interaction à sa place.
  container.append(stage);
  undo.push(() => stage.remove());
  // Les écouteurs de scène tombent tous ensemble à `dispose`.
  const listening = new AbortController();
  const { signal } = listening;
  undo.push(() => listening.abort());

  // Bitmaps des images (R16) : le cache appelle `redraw` quand un bitmap arrive ; le moteur est créé plus bas.
  let redraw = (): void => undefined;
  // C5 (I18, I24, I33) : un lanceur de pixels par onglet ; premier échec dit une fois dans #etat ; état dans data-pixels.
  let report = (_message: string): void => undefined;
  let remark = (): void => undefined;
  const runner = shared.pixels === undefined ? undefined : createPixelRunner(shared.pixels);
  if (runner !== undefined) undo.push(() => runner.dispose());
  const images = createImageCache(assets, shared.decode ?? decodeBitmap, () => redraw(), runner, {
    onFailure: (m) => report(pixelNotice(m)),
    onState: () => remark(),
  });
  undo.push(() => images.dispose());
  // Échelon 4 : WebGL2 pour le canvas d'interaction si demandé, sinon (ou s'il manque) Canvas 2D.
  // Fond `pdf-page` (C12, DAPF2) : tuiles par palier, `redraw` à chaque arrivée (patron R16). Libérées à la
  // désactivation (PF32 : 12 onglets) et recréées au premier dessin suivant.
  const pdf = shared.pdf;
  const openPdf = (asset: string): Promise<PdfFile> | null => {
    const blob = assets.get(asset);
    return blob === undefined || pdf === undefined ? null : pdf.open(blob);
  };
  let tiles: PdfTiles | null = null;
  /** Onglet montré : un dessin déjà demandé peut passer après `deactivate` (rAF avant ResizeObserver), sans rouvrir le PDF. */
  let active = false;
  const backdrop: BackdropPainter = {
    paint: (ctx, b, camera, view) => (active ? (tiles ??= createPdfTiles(openPdf, () => redraw())).paint(ctx, b, camera, view) : "pret"),
  };
  const freeTiles = (): void => {
    tiles?.dispose();
    tiles = null;
  };
  undo.push(freeTiles);
  stage.dataset["fond"] = "";
  const choice = chooseRenderer(sceneCanvas, liveCanvas, doc, parsed.settings.webgl === "on", {
    images,
    ...(pdf === undefined ? {} : { backdrop }),
    onBackdrop: (s) => {
      stage.dataset["fond"] = s;
    },
  });
  // Zone de saisie hors de la scène (CL4-2) ; les outils Texte et Tableau sont créés par le moteur, après elle. Ses
  // événements vont à l'outil actif (C10a, DAC3). Sans id tant que la session n'est pas active (un seul #texte-edition
  // dans la page, CL5b-2).
  let textTool: TextTool | null = null;
  let tableTool: TableTool | null = null;
  let activeTool = (): string => "";
  const editor = createTextEditor(container, (): TextEditorEvents | null => (activeTool() === "table" ? tableTool : textTool));
  const picker = createTablePicker(container);
  undo.push(() => picker.element.remove());
  editor.element.removeAttribute("id");
  undo.push(() => editor.element.remove());
  undo.push(() => choice.release());
  const engine = createEngine({
    doc,
    renderer: choice.renderer,
    images,
    frames: {
      requestFrame: (cb) => requestAnimationFrame(cb),
      cancelFrame: (id) => cancelAnimationFrame(id),
      now: () => performance.now(),
    },
    tools: {
      pen: createPenTool,
      eraser: createEraserTool,
      select: createSelectTool,
      shape: createShapeTool,
      text: (ctx, style) => {
        textTool = createTextTool(ctx, editor, style, measure);
        return textTool;
      },
      table: (ctx, style) => {
        tableTool = createTableTool(ctx, editor, picker, style, measure);
        return tableTool;
      },
      fill: (ctx, color) => createFillTool(ctx, color, measure),
    },
  });

  activeTool = () => engine.tool();
  undo.push(() => engine.dispose());
  redraw = () => engine.redraw();
  report = (m) => engine.report(m);

  // Échelon 1 de DA9 : fusionnés et prédits ; pointerrawupdate coupé (pas de prédits sous Chromium avec lui).
  // Paume (D18, réglage) : lue à chaque pose du stylet.
  const samplerOptions: SamplerOptions = {
    coalesced: true,
    predicted: true,
    raw: false,
    get cancelTouchesOnPen() {
      return settings.get().palm === "strict";
    },
  };
  const sampler = createSampler(stage, samplerOptions);
  // Doigt (D18, réglage) : lu à chaque geste.
  const routerOptions: RouterOptions = {
    get fingerPansAfterPen() {
      return settings.get().finger === "pan";
    },
    secondFingerMs: SECOND_FINGER_MS,
  };
  // Échelon 2 : prédiction TS, lue à chaque image (auto : seulement sans prédits natifs).
  const prediction = (): boolean => resolvePrediction(settings.get().prediction, support.predicted);
  const router = createRouter(routerOptions, {
    currentTool: () => engine.tool(),
    panHeld: () => engine.panHeld(),
    gestures: withLinearPrediction(engine.sink, prediction),
    view: engine.view,
  });
  undo.push(() => sampler.dispose());
  sampler.onGesture((g) => router.handle(g));
  const middlePan = createMiddlePan(stage, engine.view);
  undo.push(() => middlePan.dispose());
  // Outils Texte et Tableau seulement : sans cela, le mousedown qui suit le pointerdown donnerait le focus à la page, et la zone de
  // saisie, tout juste ouverte, le perdrait et validerait aussitôt une boîte vide. Avec les autres outils on laisse le
  // mousedown faire son travail : le dernier bouton cliqué perd le focus (Entrée ne le redéclenche plus).
  stage.addEventListener(
    "mousedown",
    (e) => {
      if (engine.tool() === "text" || engine.tool() === "table") e.preventDefault();
    },
    { signal },
  );

  // Échelon 3 : traînée déléguée, seulement pour un geste qui trace au stylo.
  const trail = await attachInkTrail({
    enabled: parsed.settings.inkTrail === "on",
    ink: (navigator as Navigator & { ink?: InkLike }).ink,
    area: choice.interaction,
    surface: stage,
    // Le routeur est l'unique décideur : la traînée ne suit que les gestes qu'il a classés « ink » (aucune règle recopiée).
    styleFor: trailStyleFor(router.roleOf, DEFAULT_PEN_STYLE, () => engine.camera().zoom),
  });
  undo.push(() => trail.dispose());
  const effective = (): EffectiveEchelons => ({
    prediction: prediction(),
    inkTrail: trail.status,
    webgl: parsed.settings.webgl === "off" ? "off" : choice.webgl ? "on" : "repli",
  });

  // Taille CSS de la case (le rendu Canvas 2D la retient, page infinie) et devicePixelRatio suivis : l'encre reste sous
  // la pointe. Jamais la taille de la fenêtre.
  const fit = (): void => {
    engine.resize(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1);
  };
  const resizes = new ResizeObserver(() => fit());
  undo.push(() => resizes.disconnect());
  resizes.observe(stage);
  fit();
  const stopDpr = watchDpr(window, fit);
  undo.push(stopDpr);

  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? r.height : 1;
      engine.wheel({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        deltaX: e.deltaX * unit,
        deltaY: e.deltaY * unit,
        ctrlKey: e.ctrlKey || e.metaKey,
      });
    },
    { passive: false, signal },
  );

  /** Boîte affichée de l'image sélectionnée seule (I33), pixels source. */
  const imageSize = (id: string | null | undefined): readonly [number, number] | null => {
    const el = id ? doc.element(id) : null;
    return el?.kind === "image" ? displaySize(el.image) : null;
  };
  const mark = (s: EngineState): void => {
    stage.dataset["elements"] = String(s.elementCount);
    stage.dataset["version"] = String(s.version);
    const tags = stageTags(s, { pixels: images.pixelState(), image: imageSize(s.selectionImage) });
    stage.dataset["page"] = tags.page;
    stage.dataset["selection"] = tags.selection;
    stage.dataset["bounds"] = tags.bounds;
    stage.dataset["tool"] = tags.tool;
    stage.dataset["table"] = tags.table;
    stage.dataset["tableMerges"] = tags.tableMerges;
    stage.dataset["tableShades"] = tags.tableShades;
    stage.dataset["units"] = tags.units;
    stage.dataset["grouped"] = tags.grouped;
    stage.dataset["pixels"] = tags.pixels;
    stage.dataset["image"] = tags.image;
    stage.style.cursor = s.tool === "hand" ? "grab" : "";
  };
  mark(engine.state());
  const offState = engine.onState(mark);
  remark = () => mark(engine.state());
  const markEchelons = (): void => {
    stage.dataset["echelons"] = echelonsTag(effective());
  };
  markEchelons();
  const offSettings = settings.onChange(markEchelons);
  // La zone de texte suit le zoom (T90) ; la caméra est publiée pour les essais (S5b).
  const onCamera = (c: Camera): void => {
    editor.follow(c);
    stage.dataset["camera"] = cameraTag(c);
  };
  stage.dataset["camera"] = cameraTag(engine.camera());
  const offCamera = engine.onCamera(onCamera);
  // Seul producteur de #stage[data-webgl-perdu] (inventaire de l'ancienne barre).
  choice.interaction.addEventListener(
    "webglcontextlost",
    () => {
      stage.dataset["webglPerdu"] = "1";
    },
    { signal },
  );

  let disposed = false;
  return {
    doc,
    engine,
    stage,
    choice,
    sampler,
    samplerOptions,
    trail,
    measure,
    effective,
    bench: () => ({
      sampler,
      onLiveDrawn: (cb) => engine.onLiveDrawn(cb),
      frameDurations: () => engine.frameDurations(),
      options: {
        coalesced: samplerOptions.coalesced,
        predicted: samplerOptions.predicted,
        raw: samplerOptions.raw,
        desynchronized: true,
        inkTrail: trail.status === "on",
      },
      environment: {
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio || 1,
        support,
      },
      coreVersion: shared.coreVersion,
      echelons: () => echelonsTag(effective()),
      now: () => new Date().toISOString(),
    }),
    activate() {
      if (disposed) return;
      stage.id = "stage";
      sceneCanvas.id = "scene";
      choice.interaction.id = "interaction";
      editor.element.id = TEXT_EDITOR_ID;
      stage.hidden = false;
      active = true;
      fit();
    },
    deactivate() {
      active = false;
      stage.hidden = true;
      picker.close();
      for (const el of [stage, sceneCanvas, choice.interaction, editor.element]) el.removeAttribute("id");
      engine.releaseKeys();
      freeTiles();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      resizes.disconnect();
      stopDpr();
      offSettings();
      offState();
      offCamera();
      listening.abort();
      trail.dispose();
      middlePan.dispose();
      sampler.dispose();
      engine.dispose();
      runner?.dispose();
      images.dispose();
      freeTiles();
      choice.release();
      doc.free();
      stage.remove();
      picker.element.remove();
      editor.element.remove();
    },
  };
}
