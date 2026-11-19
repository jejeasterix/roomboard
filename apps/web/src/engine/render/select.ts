/**
 * Choix du rendu (échelon 4 de DA9) : WebGL2 pour le canvas d'interaction si le réglage le demande et que le navigateur
 * le donne, sinon Canvas 2D. Contexte WebGL2 nul : repli direct. Programme refusé : le canvas, déjà lié à WebGL2, est
 * remplacé par un clone neuf (même id) pour ouvrir le Canvas 2D. Ne lève jamais pour une raison WebGL2.
 */
import { Canvas2DRenderer, createCanvas2DRenderer } from "./canvas2d";
import type { Renderer, SceneSource } from "./renderer";
import { WEBGL2_CONTEXT, WebGL2LiveRenderer } from "./webgl2";

export interface RendererChoice {
  readonly renderer: Renderer;
  /** Vrai si le canvas d'interaction est dessiné en WebGL2. */
  readonly webgl: boolean;
  /** Repli dit à l'utilisateur (barre), ou null. */
  readonly note: string | null;
}

export function chooseRenderer(
  scene: HTMLCanvasElement,
  live: HTMLCanvasElement,
  source: SceneSource,
  wantWebgl: boolean,
): RendererChoice {
  if (!wantWebgl) return { renderer: createCanvas2DRenderer(scene, live, source), webgl: false, note: null };
  const gl = live.getContext("webgl2", WEBGL2_CONTEXT);
  if (!gl) {
    return {
      renderer: createCanvas2DRenderer(scene, live, source),
      webgl: false,
      note: "WebGL2 indisponible : repli Canvas 2D",
    };
  }
  const sceneCtx = scene.getContext("2d", { alpha: false });
  if (!sceneCtx) throw new Error("canvas 2D indisponible");
  try {
    return { renderer: new WebGL2LiveRenderer(new Canvas2DRenderer(sceneCtx, null, source), gl), webgl: true, note: null };
  } catch (e) {
    const fresh = live.cloneNode(false) as HTMLCanvasElement;
    live.replaceWith(fresh);
    const liveCtx = fresh.getContext("2d", { desynchronized: true });
    if (!liveCtx) throw new Error("canvas 2D indisponible");
    const cause = e instanceof Error ? e.message : String(e);
    return {
      renderer: new Canvas2DRenderer(sceneCtx, liveCtx, source),
      webgl: false,
      note: `WebGL2 refusé (${cause}) : repli Canvas 2D`,
    };
  }
}
