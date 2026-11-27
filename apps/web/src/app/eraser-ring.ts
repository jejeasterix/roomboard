/**
 * OG25 (déc. 24, A4) : anneau de la gomme automatique, élément du DOM posé dans la scène (`pointer-events: none`), hors des
 * rendus Canvas 2D et WebGL2 : visible aussi en annotation transparente, où l'aperçu de la gomme partielle n'est pas
 * peint. Une écriture de style par image (le dernier cercle demandé) ; positions et diamètre en px CSS entiers (§ 10).
 */
export interface EraserRingCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface EraserRing {
  /** Cercle en px CSS de la scène ; null : anneau caché. */
  show(c: EraserRingCircle | null): void;
  dispose(): void;
}

const nextFrame =
  (stage: HTMLElement) =>
  (cb: () => void): void => {
    const w = stage.ownerDocument.defaultView;
    if (w !== null && typeof w.requestAnimationFrame === "function") w.requestAnimationFrame(() => cb());
    else cb();
  };

export function createEraserRing(stage: HTMLElement, frame: (cb: () => void) => void = nextFrame(stage)): EraserRing {
  const el = stage.ownerDocument.createElement("div");
  el.className = "rb-eraser-ring";
  el.hidden = true;
  el.setAttribute("aria-hidden", "true");
  stage.append(el);
  let want: EraserRingCircle | null = null;
  let queued = false;
  let disposed = false;
  const paint = (): void => {
    queued = false;
    if (disposed) return;
    if (want === null) {
      el.hidden = true;
      delete el.dataset["rayon"];
      return;
    }
    const d = Math.max(2, Math.round(want.radius * 2));
    const left = Math.round(want.x - d / 2);
    const top = Math.round(want.y - d / 2);
    el.style.cssText = `width: ${d}px; height: ${d}px; transform: translate(${left}px, ${top}px);`;
    el.dataset["rayon"] = String(d / 2);
    el.hidden = false;
  };
  return {
    show(c) {
      if (disposed) return;
      want = c === null ? null : { x: c.x, y: c.y, radius: c.radius };
      if (queued) return;
      queued = true;
      frame(paint);
    },
    dispose() {
      disposed = true;
      el.remove();
    },
  };
}
