/**
 * Lot 4 : outils d'édition, zone de saisie du texte, ligne `#edition` ; attributs du scénario S3/S4 sur `#stage`.
 * Amorce de l'application (lot 3, étendue au lot 3b) : cœur Wasm, moteur d'interaction, barre minimale en DOM simple
 * (remplacée au lot 5 par l'interface SolidJS). Réglages du moteur lus dans l'adresse (`?echelons=`, `?paume=`,
 * `?doigt=`, engine/settings.ts) puis changés par la barre ; état effectif publié dans `#stage[data-echelons]` (S2).
 * `?banc` ajoute le banc du lot 1 rejoué (géométrie du produit).
 */
import { mountBar, mountEdition, mountSettings, stageTags } from "./app/barre";
import { createTextEditor } from "./app/text-editor";
import { createWasmCore } from "./core/wasm-core";
import { createEngine, DEFAULT_PEN_STYLE, type EngineState } from "./engine/engine";
import type { KeyLike } from "./engine/input/keys";
import { createMiddlePan } from "./engine/input/middle-pan";
import { withLinearPrediction } from "./engine/input/predict";
import { createRouter, SECOND_FINGER_MS, type RouterOptions } from "./engine/input/router";
import { createSampler, type SamplerOptions } from "./engine/input/sampler";
import { detectSupport } from "./engine/input/support";
import { attachInkTrail, type InkLike } from "./engine/render/ink-trail";
import { trailStyleFor } from "./engine/render/trail-style";
import { chooseRenderer } from "./engine/render/select";
import {
  createSettingsStore,
  echelonsTag,
  parseSettings,
  resolvePrediction,
  type EffectiveEchelons,
} from "./engine/settings";
import { measureWith, type Measure } from "./engine/text-layout";
import { createEraserTool } from "./engine/tools/eraser";
import { createPenTool } from "./engine/tools/pen";
import { createSelectTool } from "./engine/tools/select";
import { createShapeTool } from "./engine/tools/shape";
import { createTextTool, type TextTool } from "./engine/tools/text";
import init, * as wasm from "./wasm/roomboard_wasm";

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`élément absent : #${id}`);
  return found as T;
}

function keyOf(e: KeyboardEvent): KeyLike {
  return {
    key: e.key,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    isComposing: e.isComposing,
    target: e.target instanceof HTMLElement ? e.target : null,
  };
}

async function start(): Promise<void> {
  await init();
  const core = createWasmCore(wasm);
  const doc = core.blank();
  const stage = el<HTMLDivElement>("stage");
  const parsed = parseSettings(window.location.search);
  const settings = createSettingsStore(parsed.settings);
  const support = detectSupport();
  // Échelon 4 : WebGL2 pour le canvas d'interaction si demandé, sinon (ou s'il manque) Canvas 2D.
  const choice = chooseRenderer(
    el<HTMLCanvasElement>("scene"),
    el<HTMLCanvasElement>("interaction"),
    doc,
    parsed.settings.webgl === "on",
  );
  // Mesure du texte (CL4-4) : la même police que le rendu, par un Canvas 2D hors page.
  const measureCtx = document.createElement("canvas").getContext("2d");
  const measure: Measure = measureCtx ? measureWith(measureCtx) : (s, size) => s.length * size * 0.6;
  // Zone de saisie hors de #stage (CL4-2) ; l'outil Texte est créé par le moteur, après elle.
  let textTool: TextTool | null = null;
  const editor = createTextEditor(document.body, () => textTool);
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
  createMiddlePan(stage, engine.view);
  // Outil Texte seulement : sans cela, le mousedown qui suit le pointerdown donnerait le focus à la page, et la zone de
  // saisie, tout juste ouverte, le perdrait et validerait aussitôt une boîte vide. Avec les autres outils on laisse le
  // mousedown faire son travail : le dernier bouton cliqué perd le focus (Entrée ne le redéclenche plus).
  stage.addEventListener("mousedown", (e) => {
    if (engine.tool() === "text") e.preventDefault();
  });

  // Échelon 3 : traînée déléguée, seulement pour un geste qui trace au stylo.
  const trail = await attachInkTrail({
    enabled: parsed.settings.inkTrail === "on",
    ink: (navigator as Navigator & { ink?: InkLike }).ink,
    area: el<HTMLCanvasElement>("interaction"),
    surface: stage,
    // Le routeur est l'unique décideur : la traînée ne suit que les gestes qu'il a classés « ink » (aucune règle recopiée).
    styleFor: trailStyleFor(router.roleOf, DEFAULT_PEN_STYLE, () => engine.camera().zoom),
  });
  const effective = (): EffectiveEchelons => ({
    prediction: prediction(),
    inkTrail: trail.status,
    webgl: parsed.settings.webgl === "off" ? "off" : choice.webgl ? "on" : "repli",
  });

  // Taille de la zone et devicePixelRatio suivis (fenêtre, panneau, changement d'écran) : l'encre reste sous la pointe.
  const fit = (): void => {
    const r = stage.getBoundingClientRect();
    engine.resize(r.width, r.height, window.devicePixelRatio || 1);
  };
  const watchDpr = (): void => {
    window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener(
      "change",
      () => {
        fit();
        watchDpr();
      },
      { once: true },
    );
  };
  new ResizeObserver(() => fit()).observe(stage);
  fit();
  watchDpr();

  // Choix assumé (fiche ENI) : l'espace est pris même quand un bouton de la barre a le focus, donc il n'active plus les
  // boutons ; sans cela, « espace + glisser » casserait après un clic dans la barre.
  window.addEventListener("keydown", (e) => {
    if (engine.key(keyOf(e))) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    if (engine.keyUp(keyOf(e))) e.preventDefault();
  });
  window.addEventListener("blur", () => engine.releaseKeys());
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
    { passive: false },
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
  engine.onState(mark);
  const markEchelons = (): void => {
    stage.dataset["echelons"] = echelonsTag(effective());
  };
  markEchelons();
  settings.onChange(markEchelons);
  mountBar(el<HTMLDivElement>("barre"), engine);
  mountEdition(el<HTMLDivElement>("edition"), engine);
  mountSettings(el<HTMLDivElement>("reglages"), {
    store: settings,
    effective,
    notes: choice.note === null ? parsed.errors : [...parsed.errors, choice.note],
    search: () => window.location.search,
    navigate: (search) => {
      window.location.search = search;
    },
  });

  if (new URLSearchParams(window.location.search).has("banc")) {
    const { createAppBench, mountBenchPanel } = await import("./app/banc");
    mountBenchPanel(
      createAppBench({
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
        coreVersion: core.version(),
        echelons: () => echelonsTag(effective()),
        now: () => new Date().toISOString(),
      }),
    );
  }
  stage.dataset["ready"] = "1";
}

start().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  document.body.dataset["erreur"] = message;
  const etat = document.getElementById("etat");
  if (etat) etat.textContent = `RoomBoard n'a pas pu démarrer : ${message}`;
  console.error(e);
});
