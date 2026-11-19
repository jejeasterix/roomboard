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
  /** Canvas d'interaction effectif : l'original, ou son clone après un repli (qui l'a remplacé dans la page). */
  readonly interaction: HTMLCanvasElement;
  /** Repli dit à l'utilisateur (barre), ou null. */
  readonly note: string | null;
}

export function chooseRenderer(
  scene: HTMLCanvasElement,
  live: HTMLCanvasElement,
  source: SceneSource,
  wantWebgl: boolean,
): RendererChoice {
  if (!wantWebgl) {
    return { renderer: createCanvas2DRenderer(scene, live, source), webgl: false, interaction: live, note: null };
  }
  const gl = live.getContext("webgl2", WEBGL2_CONTEXT);
  if (!gl) {
    return {
      renderer: createCanvas2DRenderer(scene, live, source),
      webgl: false,
      interaction: live,
      note: "WebGL2 indisponible : repli Canvas 2D",
    };
  }
  const sceneCtx = scene.getContext("2d", { alpha: false });
  if (!sceneCtx) throw new Error("canvas 2D indisponible");
  try {
    return { renderer: new WebGL2LiveRenderer(new Canvas2DRenderer(sceneCtx, null, source), gl), webgl: true, interaction: live, note: null };
  } catch (e) {
    // Le contexte WebGL2 ne se rend pas : on le perd explicitement pour libérer la mémoire graphique du canvas jeté.
    try {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // extension refusée : le canvas jeté sera ramassé avec son contexte.
    }
    const fresh = live.cloneNode(false) as HTMLCanvasElement;
    const detached = !live.parentNode;
    live.replaceWith(fresh);
    const liveCtx = fresh.getContext("2d", { desynchronized: true });
    if (!liveCtx) throw new Error("canvas 2D indisponible");
    const cause = e instanceof Error ? e.message : String(e);
    return {
      renderer: new Canvas2DRenderer(sceneCtx, liveCtx, source),
      webgl: false,
      interaction: fresh,
      note: `WebGL2 refusé (${cause}${detached ? " ; canvas d'interaction sans parent, remplacé hors page" : ""}) : repli Canvas 2D`,
    };
  }
}
