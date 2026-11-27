/**
 * Session d'un onglet (lot 5b, CL5b-1, CL5b-2) : le corps de l'ancien `start()` de main.ts, une fois par onglet. Chaque
 * session a sa scène (`.rb-stage`), ses deux canvas, son moteur, son échantillonneur et sa zone de texte ; le moteur
 * reste lié à un seul document (aucun `setDocument`). Les ids `#stage`, `#scene`, `#interaction`, `#texte-edition`
 * suivent la session active (`activate`/`deactivate`). Les touches (`keydown`/`keyup`/`blur` sur `window`) sont posées
 * une fois par l'amorce et vont à la session active : la session ne pose que ses écouteurs de scène. `dispose` rend le
 * contexte WebGL2 (`choice.release()`) : `engine.dispose()` n'arrête que la boucle.
 */
import { SNAPSHOT_MIME, type CoreDocument, type MediaData, type MediaElement, type Model3dElement } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { displaySize } from "../core/image-params";
import { topBelowIslands, type Camera } from "../engine/camera";
import { GAP } from "../ui/island-place";
import { createEngine, DEFAULT_PEN_STYLE, type Engine, type EngineState } from "../engine/engine";
import { createMiddlePan } from "../engine/input/middle-pan";
import { type PredictionSource, withPrediction } from "../engine/input/predict";
import { createRouter, SECOND_FINGER_MS, type RouterOptions } from "../engine/input/router";
import { createSampler, type Sampler, type SamplerOptions } from "../engine/input/sampler";
import type { Support } from "../engine/input/stats";
import { createImageCache, type BitmapDecoder } from "../engine/render/image-cache";
import { attachInkTrail, type InkLike } from "../engine/render/ink-trail";
import type { PdfEngine, PdfFile } from "../engine/render/pdf-port";
import { createPdfTiles, type PdfTiles } from "../engine/render/pdf-tiles";
import type { BackdropPainter } from "../engine/render/renderer";
import { chooseRenderer, type RendererChoice } from "../engine/render/select";
import { DEFAULT_CAMERA, type ModelCamera } from "../engine/render/model-frames";
import type { ModelOrbit } from "../engine/tools/model-orbit";
import { trailStyleFor } from "../engine/render/trail-style";
import {
  echelonsTag,
  predictionSource,
  resolvePrediction,
  type EffectiveEchelons,
  type ParsedSettings,
  type SettingsStore,
} from "../engine/settings";
import type { Measure } from "../engine/text-layout";
import { decodeImage, kindOfMime } from "../platform/image-import";
import { createPixelRunner, pixelNotice } from "../platform/pixel-runner";
import type { WorkerLike } from "../platform/sheet-reader";
import { createModelSessions, model3dTag, type ModelSessions, type ModelState } from "../platform/model-sessions";
import { createModelViewLoader, drawSize, snapshotSize, type ModelViewLoader } from "../platform/model-view";
import { browserPlayerPorts, createMediaPlayers, mediaTag, type MediaPlaySpec, type MediaPlayState, type MediaPlayers, type PlayerPorts } from "../platform/media-players";
import { createEraserTool } from "../engine/tools/eraser";
import { createFillTool } from "../engine/tools/fill";
import { createPenTool } from "../engine/tools/pen";
import { createSelectTool } from "../engine/tools/select";
import { createShapeTool } from "../engine/tools/shape";
import { createTableTool } from "../engine/tools/table";
import { createTextTool, type TextTool } from "../engine/tools/text";
import type { TableTool } from "../engine/tools/tool";
import type { AppBenchDeps } from "./banc";
import { lookTag } from "./backgrounds-apply";
import { createFillQueue } from "./image-fill";
import { createZoneMarks } from "./zone-marks";
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
  /** C14 (S5) : URL lisible par la page d'un fichier vidéo lié (`convertFileSrc` dans la coque) ; absent : liens illisibles. */
  readonly mediaUrl?: (path: string) => string;
  /** C14 : fabrique de lecteurs (tests) ; défaut : un `<video>` dans le conteneur caché de la scène. */
  readonly createVideo?: PlayerPorts["createVideo"];
  /** C15 (DAX3) : rendu 3D partagé, chargé au premier « Tourner » ; absent : objets 3D dessinés par leur instantané, « echec » au clic. */
  readonly modelView?: ModelViewLoader;
  /** C11a (P14) : fenêtre `annotate` : rendu Canvas 2D transparent, jamais WebGL2 ; absent : rendu ordinaire. */
  readonly transparent?: boolean;
}

/** Réglages de lecture d'un média du document. */
export function specOf(m: MediaData): MediaPlaySpec {
  return { asset: m.asset, mediaType: m.mediaType, duration: m.duration, trimStart: m.trimStart, trimEnd: m.trimEnd, loop: m.loop, volume: m.volume };
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
  /** Lecteurs de média de l'onglet (C14) : un par élément lu, créé au premier geste. */
  readonly media: MediaPlayers;
  /** Le seul élément sélectionné, s'il est un média hors groupe ; sinon null. */
  selectedMedia(): MediaElement | null;
  /** État du lecteur de l'élément ; sans lecteur, `echec` si sa source est déjà connue illisible (R8, M31), sinon null. */
  mediaState(id: string): MediaPlayState | null;
  /** Séance 3D de l'onglet (C15, DAX3) : au plus un objet chargé, rien avant « Tourner » ou « Vue initiale » (X20). */
  readonly models: ModelSessions;
  /** Le seul élément sélectionné, s'il est un objet 3D hors groupe ; sinon null. */
  selectedModel3d(): Model3dElement | null;
  modelState(id: string): ModelState;
  /** « Tourner » : ouvre l'orbite de l'objet sélectionné (chargement du rendu au premier clic), ou la ferme. */
  toggleOrbit(): Promise<void>;
  /** « Vue initiale » : vue par défaut et son instantané, une étape ; aucune étape si l'objet y est déjà avec son image. */
  resetModelView(): Promise<void>;
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
  // C6b (DAB2, B13) : une file du pot par onglet ; mêmes magasin, cache et lanceur que les retouches ; état dans data-pot.
  const fillQueue = createFillQueue({
    doc,
    assets,
    images,
    ...(runner === undefined ? {} : { runner }),
    report: (m) => report(m),
    onState: () => remark(),
  });
  undo.push(() => fillQueue.dispose());
  // C8 (Q18) : durée du pot de zone (`performance.measure("pot-zone")`), cellules, nombre de `fill` (data-zones…).
  const zoneMarks = createZoneMarks(doc, undefined, undefined, () => remark());
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
  // Lecteurs de média (C14) : conteneur caché dans la scène, URL du magasin (blob:) ou du lien (M19, S5).
  const mediaHost = document.createElement("div");
  mediaHost.className = "rb-media-host";
  stage.append(mediaHost);
  const owned = new Set<string>();
  const sourceUrl = (asset: string): string | null => {
    const blob = assets.get(asset);
    if (blob !== undefined && typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(blob);
      owned.add(url);
      return url;
    }
    const path = assets.linked(asset);
    return path !== undefined && shared.mediaUrl !== undefined ? shared.mediaUrl(path) : null;
  };
  const releaseUrl = (url: string): void => {
    if (owned.delete(url)) URL.revokeObjectURL(url);
  };
  const basePorts = browserPlayerPorts(mediaHost, async (a) => sourceUrl(a), releaseUrl);
  const makeVideo = shared.createVideo ?? basePorts.createVideo;
  const playerPorts: PlayerPorts = {
    // Image prête (seek en pause, premier chargement) : redessin, sans quoi la scène garde l'ancienne image (note de T5).
    createVideo() {
      const el = makeVideo();
      const target = el.video as unknown as { addEventListener(type: string, cb: () => void): void };
      for (const type of ["seeked", "loadeddata"]) target.addEventListener(type, () => redraw());
      return el;
    },
    source: async (a) => sourceUrl(a),
    release: releaseUrl,
  };
  const players = createMediaPlayers(playerPorts);
  undo.push(() => players.dispose());
  // C15 (DAX3) : une séance 3D, pas un lecteur par élément ; rien n'est chargé avant « Tourner » ou « Vue initiale » (X20).
  const views = shared.modelView ?? createModelViewLoader(async () => {
    throw new Error("rendu 3D absent");
  });
  /** Boîte de l'objet à l'écran, hors zoom (`w·sx`, `h·sy`) : le rendu vivant et l'instantané ont le même aspect. */
  const modelBox = (e: Model3dElement): readonly [number, number] => {
    const [a, b, c, d] = e.transform;
    return [e.model3d.w * Math.hypot(a, b), e.model3d.h * Math.hypot(c, d)];
  };
  const models = createModelSessions({
    views,
    source(id) {
      const e = doc.element(id);
      if (e === null || e.kind !== "model3d") return null;
      const main = assets.get(e.model3d.asset);
      if (main === undefined) return null;
      const files = new Map<string, Blob>();
      for (const f of e.model3d.files) {
        const blob = assets.get(f.asset);
        if (blob !== undefined) files.set(f.path, blob);
      }
      return { format: e.model3d.format, name: doc.asset(e.model3d.asset)?.name ?? "objet 3D", main, files };
    },
    px(id) {
      const e = doc.element(id);
      if (e === null || e.kind !== "model3d") return { w: 1, h: 1 };
      const [w, h] = modelBox(e);
      const zoom = engine.camera().zoom;
      return drawSize(w * zoom, h * zoom, globalThis.devicePixelRatio ?? 1);
    },
    redraw: () => redraw(),
  });
  undo.push(() => models.dispose());
  const choice = chooseRenderer(sceneCanvas, liveCanvas, doc, parsed.settings.webgl === "on", {
    images,
    media: players,
    models: models.frames,
    assetName: (id) => doc.asset(id)?.name ?? null,
    ...(pdf === undefined ? {} : { backdrop }),
    ...(shared.transparent === true ? { transparent: true } : {}),
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
    // OF83 : la page ajustée commence sous les îlots du haut (menu, onglets, barre, profil) et leur rangée contextuelle réservée.
    fitTop: () =>
      topBelowIslands(
        stage.getBoundingClientRect(),
        [...stage.ownerDocument.querySelectorAll(".rb-island")].map((e) => e.getBoundingClientRect()),
        GAP,
      ),
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
      fill: (ctx, color, tolerance) => createFillTool(ctx, color, measure, { tolerance, submit: (r, run) => fillQueue.submit(r, zoneMarks.timed(run)) }),
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
  // Échelon 2 : `prediction` dit si la prédiction TS est effective (tag et libellé ; auto : seulement sans prédits
  // natifs). OF73 : `source` (TS, natifs bornés, aucun) est lue à chaque image ; `off` coupe les natifs, la souris n'en a jamais.
  const prediction = (): boolean => resolvePrediction(settings.get().prediction, support.predicted);
  const source = (): PredictionSource => predictionSource(settings.get().prediction, support.predicted);
  const router = createRouter(routerOptions, {
    currentTool: () => engine.tool(),
    panHeld: () => engine.panHeld(),
    gestures: withPrediction(engine.sink, source),
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
  const selectedMedia = (): MediaElement | null => {
    const sel = engine.state().selection;
    const e = sel.length === 1 ? doc.element(sel[0]!) : null;
    return e !== null && e.kind === "media" && (e.group === undefined || e.group.length === 0) ? e : null;
  };
  // R8 (M31) : un média lié sans lecteur est sondé dès sa sélection ; l'erreur du sondage le grise avant tout clic.
  // L'échec vaut pour un lien donné et un asset sans octets : octets reçus ou lien changé, l'asset est sondé de nouveau.
  const failed = new Map<string, string | undefined>();
  const hasFailed = (asset: string): boolean => failed.has(asset) && assets.get(asset) === undefined && failed.get(asset) === assets.linked(asset);
  let probe: { readonly asset: string; readonly el: ReturnType<PlayerPorts["createVideo"]> } | null = null;
  const dropProbe = (): void => {
    if (probe === null) return;
    const { el } = probe;
    probe = null;
    el.video.pause();
    el.video.removeAttribute("src");
    el.video.load();
    el.remove();
  };
  undo.push(dropProbe);
  const mediaState = (id: string): MediaPlayState | null => {
    const st = players.state(id);
    if (st !== null) return st;
    const e = doc.element(id);
    return e !== null && e.kind === "media" && hasFailed(e.media.asset) ? { status: "echec", time: 0 } : null;
  };
  const markMedia = (): void => {
    const m = selectedMedia();
    stage.dataset["media"] = mediaTag(m === null ? null : specOf(m.media), m === null ? null : mediaState(m.id));
  };
  const probeSelected = (): void => {
    const m = selectedMedia();
    if (probe !== null && (m === null || probe.asset !== m.media.asset)) dropProbe();
    if (m === null || probe !== null || players.state(m.id) !== null || hasFailed(m.media.asset) || assets.get(m.media.asset) !== undefined) return;
    const path = assets.linked(m.media.asset);
    if (path === undefined || shared.mediaUrl === undefined) {
      failed.set(m.media.asset, path);
      return;
    }
    const asset = m.media.asset;
    const el = playerPorts.createVideo();
    probe = { asset, el };
    el.video.preload = "metadata";
    el.video.crossOrigin = "anonymous";
    el.video.addEventListener("error", () => {
      if (probe?.el !== el) return;
      failed.set(asset, path);
      dropProbe();
      markMedia();
    });
    el.video.src = shared.mediaUrl(path);
  };
  undo.push(players.onChange(() => {
    redraw();
    markMedia();
  }));
  // C15 (X23) : orbite de l'objet 3D sélectionné ; fermée par Échap, sélection, page, onglet, annulation, suppression.
  let orbit: ModelOrbit | null = null;
  /** Dernière vue écrite par `commitView` pour l'orbite ouverte : sa propre écriture ne la ferme pas (second glissé). */
  let written: ModelCamera | null = null;
  const selectedModel3d = (): Model3dElement | null => {
    const sel = engine.state().selection;
    const e = sel.length === 1 ? doc.element(sel[0]!) : null;
    return e !== null && e.kind === "model3d" && (e.group === undefined || e.group.length === 0) ? e : null;
  };
  const markModel3d = (): void => {
    const m = selectedModel3d();
    const camera = m === null ? null : orbit?.id === m.id ? orbit.view() : { yaw: m.model3d.yaw, pitch: m.model3d.pitch };
    stage.dataset["model3d"] = model3dTag(m?.model3d ?? null, m === null ? null : models.state(m.id), camera);
  };
  const closeOrbit = (): void => {
    orbit?.close(); // `closed` libère la séance et remet l'oracle à jour
  };
  // C2 : les écritures de vue passent une à une, dans l'ordre des relâchés. `lastWritten` garde, par objet, l'état
  // laissé par sa dernière écriture et son numéro (`writes`) ; `ownVersions` relie la version du document d'avant chaque
  // écriture à celle d'après. Seul l'objet compte (un autre élément changé pendant l'instantané n'abandonne pas
  // l'écriture, mineur C15), sauf si l'écriture viderait un rétablissement apparu depuis le relâché (Ctrl+Z, même d'un
  // autre élément).
  let commits: Promise<void> = Promise.resolve();
  let pending = 0;
  let writes = 0;
  const lastWritten = new Map<string, { readonly state: string; readonly n: number }>();
  const ownVersions = new Map<number, number>();
  const stateOf = (id: string): string => JSON.stringify(doc.element(id));
  /** `base` mène-t-il à `now` par les écritures de `ownVersions` (versions croissantes) ? */
  const reached = (base: number, now: number): boolean => {
    let v: number | undefined = base;
    for (let i = 0; v !== undefined && i <= ownVersions.size; i++, v = ownVersions.get(v)) if (v === now) return true;
    return false;
  };
  type Base = { readonly state: string; readonly version: number; readonly writes: number };
  /** L'objet est dans l'état de son relâché, ou dans celui de sa dernière écriture faite depuis ; rien d'autre. */
  const untouched = (id: string, base: Base): boolean => {
    const last = lastWritten.get(id);
    const expected = last !== undefined && last.n > base.writes ? last.state : base.state;
    return stateOf(id) === expected && (!engine.state().canRedo || reached(base.version, doc.version()));
  };
  /** Écrit la vue `v` relâchée sur l'objet dans l'état `base` ; abandonnée si l'objet a changé d'ailleurs (annulation…). */
  const writeView = async (id: string, v: ModelCamera, base: Base, shot: Promise<Blob | null>): Promise<void> => {
    const png = await shot;
    const now = doc.element(id);
    if (png === null || now === null || now.kind !== "model3d") {
      if (now === null && orbit?.id === id) closeOrbit();
      return;
    }
    if (!untouched(id, base)) return;
    const snapshot = { id: await assets.put(png), name: `${doc.asset(now.model3d.asset)?.name ?? "objet 3D"}.png`, mime: SNAPSHOT_MIME, size: png.size };
    const last = doc.element(id);
    if (last === null || last.kind !== "model3d") {
      if (orbit?.id === id) closeOrbit();
      return;
    }
    if (!untouched(id, base)) return;
    if (orbit?.id === id) written = v;
    const beforeVersion = doc.version();
    engine.run({ type: "SetModel3dView", id, yaw: v.yaw, pitch: v.pitch, snapshot });
    lastWritten.set(id, { state: stateOf(id), n: ++writes });
    if (doc.version() !== beforeVersion) ownVersions.set(beforeVersion, doc.version());
  };
  /**
   * Instantané puis `SetModel3dView` (une étape) ; rien si l'élément a disparu, si l'image manque (contexte perdu) ou si
   * l'objet a changé autrement que par ces écritures depuis le relâché. L'image est prise au relâché (l'orbite peut
   * se fermer juste après, clic à côté) ; l'écriture attend la précédente.
   */
  const commitView = (id: string, v: ModelCamera): Promise<void> => {
    const e = doc.element(id);
    if (e === null || e.kind !== "model3d") return Promise.resolve();
    const base: Base = { state: stateOf(id), version: doc.version(), writes };
    const [w, h] = modelBox(e);
    const shot = models.snapshot(id, v, snapshotSize(w, h)).catch(() => null);
    pending++;
    const turn = commits.then(() => writeView(id, v, base, shot)).finally(() => {
      if (--pending === 0) {
        lastWritten.clear();
        ownVersions.clear();
      }
    });
    commits = turn.catch(() => {});
    return turn;
  };
  const toggleOrbit = async (): Promise<void> => {
    const m = selectedModel3d();
    if (m === null) return;
    if (orbit !== null && orbit.id === m.id) {
      closeOrbit();
      return;
    }
    closeOrbit(); // une orbite ouverte sur un autre objet : fermée avant d'en charger un autre
    const ready = await models.open(m.id, { yaw: m.model3d.yaw, pitch: m.model3d.pitch });
    const now = selectedModel3d();
    if (!ready || now === null || now.id !== m.id || orbit !== null) {
      if (ready && orbit?.id !== m.id && models.current() === m.id) models.close();
      markModel3d();
      return;
    }
    const start: ModelCamera = { yaw: now.model3d.yaw, pitch: now.model3d.pitch };
    models.look(m.id, start);
    written = null;
    orbit = engine.orbitModel(m.id, {
      view: start,
      onView: (v) => {
        models.look(m.id, v);
        markModel3d();
      },
      onCommit: (v) => void commitView(m.id, v),
      closed: () => {
        orbit = null;
        written = null;
        if (models.current() === m.id) models.close(); // jamais le modèle d'une séance plus récente
        markModel3d();
      },
    });
    if (orbit === null && models.current() === m.id) models.close();
    markModel3d();
  };
  const resetModelView = async (): Promise<void> => {
    const m = selectedModel3d();
    if (m === null) return;
    if (orbit !== null && orbit.id === m.id) {
      orbit.reset();
      return;
    }
    const d = m.model3d;
    if (d.yaw === DEFAULT_CAMERA.yaw && d.pitch === DEFAULT_CAMERA.pitch && d.snapshot !== null) return;
    if (!(await models.open(m.id, DEFAULT_CAMERA))) {
      markModel3d();
      return;
    }
    await commitView(m.id, DEFAULT_CAMERA);
    if (orbit?.id !== m.id && models.current() === m.id) models.close();
  };
  // Contexte perdu pendant l'orbite (X26) : la séance tombe, l'orbite aussi (sinon elle capterait les gestes).
  const offModels = models.onChange(() => {
    if (orbit !== null && models.current() !== orbit.id) closeOrbit();
    markModel3d();
  });
  undo.push(offModels);
  let markedPage = engine.state().page;
  let markedVersion = engine.state().version;
  const mark = (s: EngineState): void => {
    if (s.page !== markedPage) {
      markedPage = s.page;
      markedVersion = s.version;
      players.clear();
    } else if (s.version !== markedVersion) {
      markedVersion = s.version;
      players.sync((id) => {
        const e = doc.element(id);
        return e !== null && e.kind === "media" ? specOf(e.media) : null;
      });
      // Élément disparu ou vue changée d'ailleurs (annulation, rétablissement) : orbite fermée ; sa propre écriture non.
      if (orbit !== null) {
        const e = doc.element(orbit.id);
        const at = (c: ModelCamera | null): boolean =>
          c !== null && e !== null && e.kind === "model3d" && e.model3d.yaw === c.yaw && e.model3d.pitch === c.pitch;
        if (!at(orbit.view()) && !at(written)) closeOrbit();
      }
    }
    if (orbit !== null && selectedModel3d()?.id !== orbit.id) closeOrbit();
    markModel3d();
    probeSelected();
    markMedia();
    stage.dataset["elements"] = String(s.elementCount);
    stage.dataset["version"] = String(s.version);
    const zone = zoneMarks.tags(s.page, s.version);
    const tags = stageTags(s, { pixels: images.pixelState(), image: imageSize(s.selectionImage), pot: fillQueue.state(), zones: zone.zones, zoneMs: zone.zoneMs, zoneCells: zone.zoneCells });
    stage.dataset["page"] = tags.page;
    // personnalisation-1b : aspect de la page montrée (couleur|grille|fond), lu par l'essai des fonds.
    stage.dataset["look"] = lookTag(doc.page(s.page));
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
    stage.dataset["pot"] = tags.pot;
    stage.dataset["zones"] = tags.zones;
    stage.dataset["zoneMs"] = tags.zoneMs;
    stage.dataset["zoneCells"] = tags.zoneCells;
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
    media: players,
    selectedMedia,
    mediaState,
    models,
    selectedModel3d,
    modelState: (id) => models.state(id),
    toggleOrbit,
    resetModelView,
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
      closeOrbit();
      players.pauseAll();
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
      closeOrbit();
      offModels();
      listening.abort();
      trail.dispose();
      middlePan.dispose();
      sampler.dispose();
      engine.dispose();
      // Avant le lanceur : un calcul arrêté rend null, la file fermée n'écrit plus ni ne relit le document (RF4).
      fillQueue.dispose();
      runner?.dispose();
      players.dispose();
      models.dispose();
      dropProbe();
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
