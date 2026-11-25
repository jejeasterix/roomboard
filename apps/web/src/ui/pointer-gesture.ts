/**
 * Squelette d'un geste au pointeur (design-l3, DA-L3-1), extrait de `resource-drag.ts` : Pointer Events seuls (souris,
 * stylet, doigt), jamais le glisser HTML5 ; capture du pointeur sur la source ; aucun mouvement rendu sous
 * `DRAG_THRESHOLD_PX` ; Échap, `pointercancel` et capture perdue annulent. `finish(u, dragged)` est appelé une seule
 * fois : `u` nul quand le geste est annulé ou refusé par `accept`, `dragged` faux pour un toucher sous le seuil.
 * Partagé par le glisser des cartes de la bibliothèque et le tri des lignes de l'éditeur de profils.
 */
export const DRAG_THRESHOLD_PX = 4;

export interface PointerGesture {
  /** Au premier mouvement au-delà du seuil (écarts absolus, type de pointeur de l'appui) : faux abandonne le geste. */
  accept?(dx: number, dy: number, pointerType: string): boolean;
  move(m: PointerEvent): void;
  finish(u: PointerEvent | null, dragged: boolean): void;
}

export function startPointerGesture(e: PointerEvent, g: PointerGesture): void {
  const source = e.currentTarget as HTMLElement | null;
  if (source === null || e.button > 0) return;
  const doc = source.ownerDocument;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let dragged = false;
  let done = false;
  source.setPointerCapture?.(e.pointerId);

  const end = (u: PointerEvent | null): void => {
    if (done) return;
    done = true;
    source.removeEventListener("pointermove", move);
    source.removeEventListener("pointerup", up);
    source.removeEventListener("pointercancel", cancel);
    source.removeEventListener("lostpointercapture", cancel);
    doc.removeEventListener("keydown", key, true);
    source.releasePointerCapture?.(e.pointerId);
    g.finish(u, dragged);
  };
  function move(m: PointerEvent): void {
    if (!dragged) {
      const dx = Math.abs(m.clientX - x0);
      const dy = Math.abs(m.clientY - y0);
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (g.accept !== undefined && !g.accept(dx, dy, e.pointerType)) {
        end(null);
        return;
      }
      dragged = true;
    }
    g.move(m);
  }
  function up(u: PointerEvent): void {
    end(u);
  }
  function cancel(): void {
    end(null);
  }
  function key(k: KeyboardEvent): void {
    if (k.key !== "Escape") return;
    k.preventDefault();
    end(null);
  }
  source.addEventListener("pointermove", move);
  source.addEventListener("pointerup", up);
  source.addEventListener("pointercancel", cancel);
  source.addEventListener("lostpointercapture", cancel);
  doc.addEventListener("keydown", key, true);
}
