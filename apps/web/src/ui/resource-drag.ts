/**
 * Glisser d'une carte de la bibliothèque vers la scène (C4, D13, DA4) : Pointer Events seuls (souris, stylet, doigt),
 * jamais le glisser HTML5 (empêché par le glisser-déposer natif de la fenêtre Tauri sous Windows, mal joué au doigt).
 * Squelette du geste partagé (`pointer-gesture.ts`, design-l3 DA-L3-1) : capture, seuil, Échap, `pointercancel`,
 * capture perdue. Ici : fantôme qui suit au-delà du seuil, lâcher au-dessus de `.rb-stages` = `onDrop` au point client
 * (même forme que `DropHandler`) ; ailleurs ou annulé : rien. Au doigt, la carte laisse défiler la liste
 * (`touch-action: pan-y`, rb.css) : le glisser ne part que sur un mouvement horizontal dominant ; vertical, il est
 * abandonné au défilement. Souris et stylet : tout mouvement au-delà du seuil.
 */
import type { Point } from "../platform/files";
import { DRAG_THRESHOLD_PX, startPointerGesture } from "./pointer-gesture";

export { DRAG_THRESHOLD_PX };
export interface DragOptions {
  readonly label: string;
  readonly thumbnail?: string | null;
  /** Éléments sous le point, du dessus au dessous (tests) ; défaut : `document.elementsFromPoint`. */
  readonly hits?: (x: number, y: number) => readonly Element[];
}

export function startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void, opts: DragOptions): void {
  const source = e.currentTarget as HTMLElement | null;
  if (source === null) return;
  const doc = source.ownerDocument;
  const hits = opts.hits ?? ((x: number, y: number) => doc.elementsFromPoint(x, y));
  /** D28 : l'élément du dessus (fantôme exclu) doit être sous `.rb-stages` et hors de tout `.rb-popover`. */
  const onStage = (x: number, y: number): boolean => {
    const top = hits(x, y).find((el) => el.closest(".rb-drag-ghost") === null);
    return top !== undefined && top.closest(".rb-popover") === null && top.closest(".rb-stages") !== null;
  };
  let ghost: HTMLElement | null = null;
  const place = (x: number, y: number): void => {
    if (ghost === null) {
      ghost = doc.createElement("div");
      ghost.className = "rb-drag-ghost";
      if (opts.thumbnail) {
        const img = doc.createElement("img");
        img.src = opts.thumbnail;
        img.alt = "";
        ghost.append(img);
      }
      ghost.append(doc.createTextNode(opts.label));
      doc.body.append(ghost);
    }
    ghost.style.transform = `translate(${x + 8}px, ${y + 8}px)`;
  };
  startPointerGesture(e, {
    // Au doigt, un mouvement vertical dominant fait défiler la liste : ce n'est pas un glisser.
    accept: (dx, dy, pointerType) => !(pointerType === "touch" && dy >= dx),
    move: (m) => place(m.clientX, m.clientY),
    finish: (u, dragged) => {
      ghost?.remove();
      ghost = null;
      if (u !== null && dragged && onStage(u.clientX, u.clientY)) onDrop({ x: u.clientX, y: u.clientY });
    },
  });
}
