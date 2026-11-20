/**
 * Session d'un onglet (lot 5b, CL5b-1, CL5b-2) : le corps de l'ancien `start()` de main.ts, une fois par onglet. Chaque
 * session a sa scène (`.rb-stage`), ses deux canvas, son moteur, son échantillonneur et sa zone de texte ; le moteur
 * reste lié à un seul document (aucun `setDocument`). Les ids `#stage`, `#scene`, `#interaction`, `#texte-edition`
 * suivent la session active (`activate`/`deactivate`). Les touches (`keydown`/`keyup`/`blur` sur `window`) sont posées
 * une fois par l'amorce et vont à la session active : la session ne pose que ses écouteurs de scène. `dispose` rend le
 * contexte WebGL2 (`choice.release()`) : `engine.dispose()` n'arrête que la boucle.
 */
import type { CoreDocument } from "../core/api";
import type { Camera } from "../engine/camera";
import { createEngine, DEFAULT_PEN_STYLE, type Engine, type EngineState } from "../engine/engine";
import { createMiddlePan } from "../engine/input/middle-pan";
import { withLinearPrediction } from "../engine/input/predict";
import { createRouter, SECOND_FINGER_MS, type RouterOptions } from "../engine/input/router";
import { createSampler, type Sampler, type SamplerOptions } from "../engine/input/sampler";
import type { Support } from "../engine/input/stats";
import { attachInkTrail, type InkLike } from "../engine/render/ink-trail";
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
import { createEraserTool } from "../engine/tools/eraser";
import { createPenTool } from "../engine/tools/pen";
import { createSelectTool } from "../engine/tools/select";
import { createShapeTool } from "../engine/tools/shape";
import { createTextTool, type TextTool } from "../engine/tools/text";
import type { AppBenchDeps } from "./banc";
import { stageTags } from "./barre";
import { watchDpr } from "./mesure-outils";
import { createTextEditor, TEXT_EDITOR_ID } from "./text-editor";

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
}

export interface BoardSession {
  readonly doc: CoreDocument;
  readonly engine: Engine;
  readonly stage: HTMLDivElement;
  readonly choice: RendererChoice;
  readonly sampler: Sampler;
  readonly samplerOptions: SamplerOptions;
  /** État de la traînée d'encre (`attachInkTrail`), lu par le banc (`options.inkTrail`). */
  readonly trail: { readonly status: string };
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

export async function createBoardSession(doc: CoreDocument, shared: SessionShared): Promise<BoardSession> {
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
  // Les écouteurs de scène tombent tous ensemble à `dispose`.
  const listening = new AbortController();
  const { signal } = listening;

  // Échelon 4 : WebGL2 pour le canvas d'interaction si demandé, sinon (ou s'il manque) Canvas 2D.
  const choice = chooseRenderer(sceneCanvas, liveCanvas, doc, parsed.settings.webgl === "on");
  // Zone de saisie hors de la scène (CL4-2) ; l'outil Texte est créé par le moteur, après elle. Sans id tant que la
  // session n'est pas active (un seul #texte-edition dans la page, CL5b-2).
  let textTool: TextTool | null = null;
  const editor = createTextEditor(container, () => textTool);
  editor.element.removeAttribute("id");
  const engine = createEngine({
    doc,
    renderer: choice.renderer,
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
    },
  });

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
  sampler.onGesture((g) => router.handle(g));
  const middlePan = createMiddlePan(stage, engine.view);
  // Outil Texte seulement : sans cela, le mousedown qui suit le pointerdown donnerait le focus à la page, et la zone de
  // saisie, tout juste ouverte, le perdrait et validerait aussitôt une boîte vide. Avec les autres outils on laisse le
  // mousedown faire son travail : le dernier bouton cliqué perd le focus (Entrée ne le redéclenche plus).
  stage.addEventListener(
    "mousedown",
    (e) => {
      if (engine.tool() === "text") e.preventDefault();
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
  resizes.observe(stage);
  fit();
  const stopDpr = watchDpr(window, fit);

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

  const mark = (s: EngineState): void => {
    stage.dataset["elements"] = String(s.elementCount);
    stage.dataset["version"] = String(s.version);
    const tags = stageTags(s);
    stage.dataset["page"] = tags.page;
    stage.dataset["selection"] = tags.selection;
    stage.dataset["bounds"] = tags.bounds;
    stage.dataset["tool"] = tags.tool;
    stage.style.cursor = s.tool === "hand" ? "grab" : "";
  };
  mark(engine.state());
  const offState = engine.onState(mark);
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
      fit();
    },
    deactivate() {
      stage.hidden = true;
      for (const el of [stage, sceneCanvas, choice.interaction, editor.element]) el.removeAttribute("id");
      engine.releaseKeys();
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
      choice.release();
      doc.free();
      stage.remove();
      editor.element.remove();
    },
  };
}
