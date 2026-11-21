/**
 * Glisser d'une carte de la bibliothèque vers la scène (C4, D13, DA4) : Pointer Events seuls (souris, stylet, doigt),
 * jamais le glisser HTML5 (empêché par le glisser-déposer natif de la fenêtre Tauri sous Windows, mal joué au doigt).
 * Capture du pointeur, fantôme qui suit au-delà de 4 px, lâcher au-dessus de `.rb-stages` = `onDrop` au point client
 * (même forme que `DropHandler`) ; ailleurs, Échap, `pointercancel` ou capture perdue (carte démontée) : rien.
 * Au doigt, la carte laisse défiler la liste (`touch-action: pan-y`, rb.css) : le glisser ne part que sur un mouvement
 * horizontal dominant ; vertical, il est abandonné au défilement. Souris et stylet : tout mouvement au-delà du seuil.
 */
import type { Point } from "../platform/files";

export const DRAG_THRESHOLD_PX = 4;
export interface DragOptions {
  readonly label: string;
  readonly thumbnail?: string | null;
  /** Éléments sous le point, du dessus au dessous (tests) ; défaut : `document.elementsFromPoint`. */
  readonly hits?: (x: number, y: number) => readonly Element[];
}

export function startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void, opts: DragOptions): void {
  const source = e.currentTarget as HTMLElement | null;
  if (source === null || e.button > 0) return;
  const doc = source.ownerDocument;
  const hits = opts.hits ?? ((x: number, y: number) => doc.elementsFromPoint(x, y));
  /** D28 : l'élément du dessus (fantôme exclu) doit être sous `.rb-stages` et hors de tout `.rb-popover`. */
  const onStage = (x: number, y: number): boolean => {
    const top = hits(x, y).find((el) => el.closest(".rb-drag-ghost") === null);
    return top !== undefined && top.closest(".rb-popover") === null && top.closest(".rb-stages") !== null;
  };
  const x0 = e.clientX;
  const y0 = e.clientY;
  let ghost: HTMLElement | null = null;
  source.setPointerCapture?.(e.pointerId);

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
  const end = (): void => {
    source.removeEventListener("pointermove", move);
    source.removeEventListener("pointerup", up);
    source.removeEventListener("pointercancel", end);
    source.removeEventListener("lostpointercapture", end);
    doc.removeEventListener("keydown", key, true);
    source.releasePointerCapture?.(e.pointerId);
    ghost?.remove();
    ghost = null;
  };
  function move(m: PointerEvent): void {
    if (ghost === null) {
      const dx = Math.abs(m.clientX - x0);
      const dy = Math.abs(m.clientY - y0);
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (e.pointerType === "touch" && dy >= dx) {
        end(); // la liste défile : ce n'est pas un glisser
        return;
      }
    }
    place(m.clientX, m.clientY);
  }
  function up(u: PointerEvent): void {
    const dragged = ghost !== null;
    end();
    if (dragged && onStage(u.clientX, u.clientY)) onDrop({ x: u.clientX, y: u.clientY });
  }
  function key(k: KeyboardEvent): void {
    if (k.key !== "Escape") return;
    k.preventDefault();
    end();
  }
  source.addEventListener("pointermove", move);
  source.addEventListener("pointerup", up);
  source.addEventListener("pointercancel", end);
  source.addEventListener("lostpointercapture", end);
  doc.addEventListener("keydown", key, true);
}
