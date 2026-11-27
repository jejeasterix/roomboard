/**
 * Ascenseur vertical d'une page portrait (OG24, Jérôme : « En mode portrait la page doit remplir l'écran et un ascenseur
 * permet de monter / descendre »). Posé dans la scène, à droite, du haut de la page ajustée (`top()`) à `SCROLL_BOTTOM`
 * px du bas : il ne couvre que la hauteur de la page. Caché en paysage, en infini, et quand la page tient dans la vue.
 *
 * Glisser aux événements de pointeur (U12, U24 ; jamais le glisser HTML5), même chose au doigt, au stylet et à la souris :
 * toucher le curseur le saisit là où il est touché ; toucher le rail y amène le milieu du curseur, puis le glisser suit.
 * Les événements de pointeur s'arrêtent à l'ascenseur : le routeur de la scène ne les voit pas (aucun trait).
 * Cible au toucher : 44 px de large (rail et curseur d'au moins 44 px de haut), dessin fin (CSS `.rb-scrollbar`).
 */
import type { Engine, PageScroll } from "../engine/engine";
import { SCROLL_BOTTOM } from "../engine/engine";

/** Hauteur minimale du curseur, px : la cible tactile (D-DS3, 44 px). */
export const THUMB_MIN = 44;

export type ScrollbarEngine = Pick<Engine, "pageScroll" | "scrollPageTo">;

export interface PageScrollbar {
  readonly element: HTMLElement;
  /** Relit la position de la page (caméra, page montrée, mode, taille de la vue). */
  update(): void;
}

/** Hauteur du curseur, px, pour un rail de `track` px et une part visible `visible` (0-1). */
export const thumbHeight = (track: number, visible: number): number => Math.min(track, Math.max(THUMB_MIN, track * visible));

export function createPageScrollbar(stage: HTMLElement, engine: ScrollbarEngine, top: () => number): PageScrollbar {
  const doc = stage.ownerDocument;
  const bar = doc.createElement("div");
  bar.className = "rb-scrollbar";
  bar.dataset["scrollbar"] = "page";
  bar.setAttribute("role", "scrollbar");
  bar.setAttribute("aria-orientation", "vertical");
  bar.setAttribute("aria-label", "Défiler la page (↑ ↓, Maj+↑ ↓, Début, Fin)");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.hidden = true;
  const thumb = doc.createElement("div");
  thumb.className = "rb-scrollbar-thumb";
  bar.append(thumb);
  stage.append(bar);

  let last: PageScroll | null = null;
  const update = (): void => {
    const s = engine.pageScroll();
    last = s;
    bar.hidden = s === null;
    if (s === null) return;
    bar.style.top = `${top()}px`;
    bar.style.bottom = `${SCROLL_BOTTOM}px`;
    const track = bar.clientHeight;
    const h = thumbHeight(track, s.visible);
    thumb.style.height = `${h}px`;
    thumb.style.transform = `translateY(${(track - h) * s.at}px)`;
    bar.setAttribute("aria-valuenow", String(Math.round(s.at * 100)));
    if (stage.id !== "") bar.setAttribute("aria-controls", stage.id);
  };

  // Saisie : `grab` = écart, px, entre le pointeur et le haut du curseur ; un seul pointeur à la fois.
  let drag: { readonly id: number; readonly grab: number } | null = null;
  const atFor = (clientY: number, grab: number): number => {
    const r = bar.getBoundingClientRect();
    const h = thumbHeight(r.height, last?.visible ?? 1);
    return r.height > h ? (clientY - r.top - grab) / (r.height - h) : 0;
  };
  const stop = (e: Event): void => e.stopPropagation();
  bar.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (drag !== null || last === null) return;
    const t = thumb.getBoundingClientRect();
    const onThumb = e.clientY >= t.top && e.clientY <= t.bottom;
    const grab = onThumb ? e.clientY - t.top : t.height / 2;
    drag = { id: e.pointerId, grab };
    bar.setPointerCapture?.(e.pointerId);
    bar.dataset["drag"] = "1";
    if (!onThumb) engine.scrollPageTo(atFor(e.clientY, grab));
  });
  bar.addEventListener("pointermove", (e) => {
    e.stopPropagation();
    if (drag === null || e.pointerId !== drag.id) return;
    engine.scrollPageTo(atFor(e.clientY, drag.grab));
  });
  const end = (e: PointerEvent): void => {
    e.stopPropagation();
    if (drag === null || e.pointerId !== drag.id) return;
    drag = null;
    delete bar.dataset["drag"];
    if (bar.hasPointerCapture?.(e.pointerId)) bar.releasePointerCapture(e.pointerId);
  };
  bar.addEventListener("pointerup", end);
  bar.addEventListener("pointercancel", end);
  bar.addEventListener("lostpointercapture", end);
  for (const type of ["pointerover", "pointerout", "pointerenter", "pointerleave"]) bar.addEventListener(type, stop);
  // Appui long : ni menu du navigateur, ni menu de la scène.
  bar.addEventListener("contextmenu", (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  return { element: bar, update };
}
