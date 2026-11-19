/**
 * Bouton du milieu de la souris (D17) : glisser déplace la vue, jamais un trait (l'échantillonneur ignore ce bouton,
 * T27). Module à part pour garder l'échantillonneur sur le tracé ; même surface que lui. Sans capture du pointeur
 * (cadrage § 3 : `setPointerCapture` seulement dans sampler.ts) : la zone couvre la fenêtre, et un relâché hors de
 * la fenêtre se voit au premier mouvement de retour (`buttons` sans le bit du milieu).
 */
import type { ViewSink } from "./gesture";
import type { PointerLike, PointerSurface } from "./sampler";

const LEFT = 1;
const MIDDLE = 4;

export interface MiddlePan {
  dispose(): void;
}

export function createMiddlePan(surface: PointerSurface, view: ViewSink): MiddlePan {
  let drag: { readonly id: number; x: number; y: number } | null = null;

  const onDown = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (drag !== null || e.pointerType !== "mouse") return;
    if ((e.buttons & MIDDLE) === 0 || (e.buttons & LEFT) !== 0) return;
    e.preventDefault(); // pas de défilement automatique du bouton du milieu
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onMove = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (drag === null || e.pointerId !== drag.id) return;
    if ((e.buttons & MIDDLE) === 0) {
      drag = null;
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (dx !== 0 || dy !== 0) view.panBy(dx, dy);
  };

  const onEnd = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (drag !== null && e.pointerId === drag.id) drag = null;
  };

  const bindings: ReadonlyArray<readonly [string, (e: Event) => void]> = [
    ["pointerdown", onDown],
    ["pointermove", onMove],
    ["pointerup", onEnd],
    ["pointercancel", onEnd],
    ["lostpointercapture", onEnd],
  ];
  for (const [type, listener] of bindings) surface.addEventListener(type, listener);

  return {
    dispose() {
      for (const [type, listener] of bindings) surface.removeEventListener(type, listener);
      drag = null;
    },
  };
}
