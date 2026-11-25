/**
 * Tri d'une liste au pointeur (design-l3, L3-13, L3-14, DA-L3-1), sur le squelette `startPointerGesture` : Pointer
 * Events seuls, aucun événement de glisser HTML5 (U12). La ligne tirée suit le pointeur (`translateY`, attribut
 * `data-dragging`), les autres s'écartent ; le `scroller` défile quand le pointeur est à moins de `SORT_EDGE_PX` de ses
 * bords (H13). Au lâcher : un seul `drop(to)`, `to` = rang dans la liste sans la ligne tirée ; lâchée à son rang :
 * `cancel()`. Sous le seuil : `tap()`. Échap, `pointercancel`, capture perdue : `cancel()`. Les lignes ne quittent
 * jamais le DOM pendant le geste ; leurs `transform` sont remis à `""` avant tout rappel de fin.
 */
import { startPointerGesture } from "./pointer-gesture";

/** Distance au bord du `scroller` où la liste défile pendant un tri (H13). */
export const SORT_EDGE_PX = 48;
/** Pas de défilement par image, atteint au bord même. */
const SCROLL_STEP_PX = 12;

export interface SortDragOptions {
  /** Lignes de la liste, dans l'ordre, la ligne tirée comprise (au rang `from`). */
  rows(): readonly HTMLElement[];
  readonly scroller: HTMLElement;
  readonly from: number;
  moved(dy: number, slot: number): void;
  drop(to: number): void;
  tap(): void;
  cancel(): void;
}

/** Rang de lâcher : nombre de milieux de lignes (la ligne tirée exclue) strictement au-dessus de `y`. */
export function slotOf(mids: readonly number[], y: number): number {
  let n = 0;
  for (const m of mids) if (m < y) n++;
  return n;
}

/** Rend la fonction d'abandon (démontage pendant le geste) : lignes remises, image annulée, aucun rappel. */
export function startSortDrag(e: PointerEvent, opts: SortDragOptions): () => void {
  const rows = opts.rows();
  const dragged = rows[opts.from];
  if (dragged === undefined) return () => undefined;
  const sc = opts.scroller;
  const win = sc.ownerDocument.defaultView;
  const top0 = sc.scrollTop;
  const y0 = e.clientY;
  const height = dragged.getBoundingClientRect().height;
  const others = rows.filter((_, i) => i !== opts.from);
  // Milieux des autres lignes, en coordonnées du contenu du `scroller` : indépendants du défilement pendant le geste.
  const mids = others.map((r) => {
    const b = r.getBoundingClientRect();
    return b.top + b.height / 2 + top0;
  });
  const contentY = (clientY: number): number => clientY + sc.scrollTop;
  let lastY = y0;
  let frame = 0;

  const paint = (): void => {
    const dy = contentY(lastY) - (y0 + top0);
    const slot = slotOf(mids, contentY(lastY));
    dragged.style.transform = `translateY(${dy}px)`;
    others.forEach((r, i) => {
      // `i` : rang sans la ligne tirée ; une ligne passée de l'autre côté de la ligne tirée s'écarte de sa hauteur.
      const shift = i >= opts.from && i < slot ? -height : i < opts.from && i >= slot ? height : 0;
      r.style.transform = shift === 0 ? "" : `translateY(${shift}px)`;
    });
    opts.moved(dy, slot);
  };
  const edgeSpeed = (): number => {
    const b = sc.getBoundingClientRect();
    // Au bord même le pas est maximal ; plus loin (pointeur hors du corps), il ne grandit pas.
    const depth = (d: number): number => Math.ceil(Math.min(1, d / SORT_EDGE_PX) * SCROLL_STEP_PX);
    if (lastY < b.top + SORT_EDGE_PX) return -depth(b.top + SORT_EDGE_PX - lastY);
    if (lastY > b.bottom - SORT_EDGE_PX) return depth(lastY - (b.bottom - SORT_EDGE_PX));
    return 0;
  };
  const tick = (): void => {
    frame = 0;
    const v = edgeSpeed();
    if (v === 0) return;
    const before = sc.scrollTop;
    sc.scrollTop = before + v;
    if (sc.scrollTop === before) return; // au bout du défilement : plus d'image tant que le pointeur ne bouge pas
    paint();
    frame = win?.requestAnimationFrame(tick) ?? 0;
  };
  const reset = (): void => {
    if (frame !== 0) win?.cancelAnimationFrame(frame);
    frame = 0;
    dragged.removeAttribute("data-dragging");
    for (const r of rows) r.style.transform = "";
  };
  let over = false;
  const abort = startPointerGesture(e, {
    move: (m) => {
      lastY = m.clientY;
      dragged.setAttribute("data-dragging", "");
      paint();
      if (frame === 0 && edgeSpeed() !== 0) frame = win?.requestAnimationFrame(tick) ?? 0;
    },
    finish: (u, moved) => {
      over = true;
      reset();
      if (u === null) return opts.cancel();
      if (!moved) return opts.tap();
      lastY = u.clientY;
      const to = slotOf(mids, contentY(lastY));
      if (to === opts.from) return opts.cancel();
      opts.drop(to);
    },
  });
  return () => {
    if (over) return;
    over = true;
    abort();
    reset();
  };
}
