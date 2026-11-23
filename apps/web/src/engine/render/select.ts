/**
 * Choix du rendu (échelon 4 de DA9) : WebGL2 pour le canvas d'interaction si le réglage le demande et que le navigateur
 * le donne, sinon Canvas 2D. Contexte WebGL2 nul : repli direct. Programme refusé : le canvas, déjà lié à WebGL2, est
 * remplacé par un clone neuf (même id) pour ouvrir le Canvas 2D. Ne lève jamais pour une raison WebGL2.
 */
import { Canvas2DRenderer, createCanvas2DRenderer, type Canvas2DOptions } from "./canvas2d";
import type { Renderer, SceneSource } from "./renderer";
import { WEBGL2_CONTEXT, WebGL2LiveRenderer } from "./webgl2";

export interface RendererDiagnostics {
  readonly webgl: "on" | "off" | "repli";
  readonly lost: boolean;
  readonly badColors: readonly string[];
}

export interface RendererChoice {
  readonly renderer: Renderer;
  /** Vrai si le canvas d'interaction est dessiné en WebGL2. */
  readonly webgl: boolean;
  /** Canvas d'interaction effectif : l'original, ou son clone après un repli (qui l'a remplacé dans la page). */
  readonly interaction: HTMLCanvasElement;
  /** Repli dit à l'utilisateur (barre), ou null. */
  readonly note: string | null;
  /** État du rendu WebGL2 pour la barre (réglages). */
  diagnostics(): RendererDiagnostics;
  /** Libère la mémoire graphique : branche WebGL2 → `WEBGL_lose_context` (exception avalée) ; Canvas 2D → rien.
   *  Idempotent. `engine.dispose()` n'arrête que la boucle : c'est ceci qui rend le contexte (12 onglets fermés). */
  release(): void;
}

const REPLI: RendererDiagnostics = { webgl: "repli", lost: false, badColors: [] };

/** Perd le contexte pour rendre sa mémoire graphique ; extension refusée : le canvas sera ramassé avec lui. */
function loseContext(gl: WebGL2RenderingContext): void {
  try {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // extension refusée
  }
}

export function chooseRenderer(
  scene: HTMLCanvasElement,
  live: HTMLCanvasElement,
  source: SceneSource,
  wantWebgl: boolean,
  opts: Canvas2DOptions = {},
): RendererChoice {
  if (!wantWebgl || opts.transparent === true) {
    return { renderer: createCanvas2DRenderer(scene, live, source, opts), webgl: false, interaction: live, note: null, diagnostics: () => ({ webgl: "off", lost: false, badColors: [] }), release() {} };
  }
  const gl = live.getContext("webgl2", WEBGL2_CONTEXT);
  if (!gl) {
    return {
      renderer: createCanvas2DRenderer(scene, live, source, opts),
      webgl: false,
      interaction: live,
      note: "WebGL2 indisponible : repli Canvas 2D",
      diagnostics: () => REPLI,
      release() {},
    };
  }
  const sceneCtx = scene.getContext("2d", { alpha: false });
  if (!sceneCtx) throw new Error("canvas 2D indisponible");
  try {
    const renderer = new WebGL2LiveRenderer(new Canvas2DRenderer(sceneCtx, null, source, opts), gl);
    let released = false;
    return {
      renderer,
      webgl: true,
      interaction: live,
      note: null,
      diagnostics: () => ({ webgl: "on", lost: renderer.lost, badColors: [...renderer.badColors] }),
      release() {
        if (released) return;
        released = true;
        loseContext(gl);
      },
    };
  } catch (e) {
    // Le contexte WebGL2 ne se rend pas : on le perd explicitement pour libérer la mémoire graphique du canvas jeté.
    loseContext(gl);
    const fresh = live.cloneNode(false) as HTMLCanvasElement;
    const detached = !live.parentNode;
    live.replaceWith(fresh);
    const liveCtx = fresh.getContext("2d", { desynchronized: true });
    if (!liveCtx) throw new Error("canvas 2D indisponible");
    const cause = e instanceof Error ? e.message : String(e);
    return {
      renderer: new Canvas2DRenderer(sceneCtx, liveCtx, source, opts),
      webgl: false,
      interaction: fresh,
      diagnostics: () => REPLI,
      // Contexte déjà perdu ci-dessus.
      release() {},
      note: `WebGL2 refusé (${cause}${detached ? " ; canvas d'interaction sans parent, remplacé hors page" : ""}) : repli Canvas 2D`,
    };
  }
}
