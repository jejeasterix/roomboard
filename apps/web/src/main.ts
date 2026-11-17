/**
 * Amorce de l'application (lot 3, essai du 19 novembre 2026) : cœur Wasm, moteur d'interaction, barre minimale en DOM
 * simple, remplacée au lot 5 par l'interface SolidJS. `?banc` ajoute le banc du lot 1 rejoué (géométrie du produit).
 */
import { mountBar } from "./app/barre";
import { createWasmCore } from "./core/wasm-core";
import { createEngine, type EngineState } from "./engine/engine";
import type { KeyLike } from "./engine/input/keys";
import { createRouter, DEFAULT_ROUTER_OPTIONS } from "./engine/input/router";
import { createSampler, type SamplerOptions } from "./engine/input/sampler";
import { createCanvas2DRenderer } from "./engine/render/canvas2d";
import { createEraserTool } from "./engine/tools/eraser";
import { createPenTool } from "./engine/tools/pen";
import init, * as wasm from "./wasm/roomboard_wasm";

/** Échelon 1 de DA9 : fusionnés et prédits ; pointerrawupdate coupé (pas de prédits sous Chromium avec lui). */
const SAMPLER: SamplerOptions = { coalesced: true, predicted: true, raw: false };

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
  const renderer = createCanvas2DRenderer(el<HTMLCanvasElement>("scene"), el<HTMLCanvasElement>("interaction"), doc);
  const engine = createEngine({
    doc,
    renderer,
    frames: {
      requestFrame: (cb) => requestAnimationFrame(cb),
      cancelFrame: (id) => cancelAnimationFrame(id),
      now: () => performance.now(),
    },
    tools: { pen: createPenTool, eraser: createEraserTool },
  });
  const sampler = createSampler(stage, SAMPLER);
  const router = createRouter(DEFAULT_ROUTER_OPTIONS, {
    currentTool: () => engine.tool(),
    gestures: engine.sink,
    view: engine.view,
  });
  sampler.onGesture((g) => router.handle(g));

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

  window.addEventListener("keydown", (e) => {
    if (engine.key(keyOf(e))) e.preventDefault();
  });
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
  };
  mark(engine.state());
  engine.onState(mark);
  mountBar(el<HTMLDivElement>("barre"), engine);

  if (new URLSearchParams(window.location.search).has("banc")) {
    const { createAppBench, mountBenchPanel } = await import("./app/banc");
    const { detectSupport } = await import("./engine/input/support");
    mountBenchPanel(
      createAppBench({
        sampler,
        onLiveDrawn: (cb) => engine.onLiveDrawn(cb),
        frameDurations: () => engine.frameDurations(),
        options: { ...SAMPLER, desynchronized: true, inkTrail: false },
        environment: {
          userAgent: navigator.userAgent,
          devicePixelRatio: window.devicePixelRatio || 1,
          support: detectSupport(),
        },
        coreVersion: core.version(),
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
