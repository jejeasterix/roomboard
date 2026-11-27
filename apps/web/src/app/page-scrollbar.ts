/**
 * Ascenseur vertical d'une page portrait (OG24, Jérôme : « En mode portrait la page doit remplir l'écran et un ascenseur
 * permet de monter / descendre »). Posé dans la scène, à droite, du haut de la page ajustée sur `span` px (`pageScroll`) :
 * il ne couvre que la hauteur de la page. Caché en paysage, en infini, et quand la page tient dans la vue.
 *
 * Seul le curseur se saisit (le rail laisse passer les pointeurs vers la scène : on dessine jusqu'au bord de la page),
 * aux événements de pointeur (U12, U24 ; jamais le glisser HTML5), au doigt, au stylet et au bouton gauche de la souris ;
 * saisi là où il est touché, sans saut. Rejet de paume (D18, `penInContact` de l'échantillonneur) : un toucher posé
 * pendant qu'un stylet touche la scène passe à la scène, qui l'écarte. Les pointeurs saisis s'arrêtent à l'ascenseur
 * (aucun trait). Cible : 44 × 44 px au moins. Le DOM n'est réécrit que si une valeur a changé.
 */
import type { Engine } from "../engine/engine";

/** Hauteur minimale du curseur, px : la cible tactile (D-DS3, 44 px). */
export const THUMB_MIN = 44;

export interface PageScrollbar {
  readonly element: HTMLElement;
  /** Relit la position de la page (caméra, page montrée, mode, taille de la vue). */
  update(): void;
}

/** Hauteur du curseur, px, pour un rail de `track` px et une part visible `visible` (0-1). */
export const thumbHeight = (track: number, visible: number): number => Math.min(track, Math.max(THUMB_MIN, track * visible));

export function createPageScrollbar(
  stage: HTMLElement,
  engine: Pick<Engine, "pageScroll" | "scrollPageTo">,
  penInContact: () => boolean,
): PageScrollbar {
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

  // Rail (haut de page ajustée, `span` px) et curseur, px de scène, tenus ici : aucune lecture de mise en page.
  let geom: { readonly span: number; readonly thumb: number; readonly at: number } | null = null;
  let written = "";
  const update = (): void => {
    const s = engine.pageScroll();
    geom = s === null ? null : { span: s.span, thumb: thumbHeight(s.span, s.visible), at: s.at };
    const key = s === null || geom === null ? "" : `${s.top}|${s.span}|${geom.thumb}|${s.at}|${stage.id}`;
    if (key === written) return;
    written = key;
    bar.hidden = geom === null;
    if (s === null || geom === null) return;
    bar.style.top = `${s.top}px`;
    bar.style.height = `${s.span}px`;
    thumb.style.height = `${geom.thumb}px`;
    thumb.style.transform = `translateY(${(s.span - geom.thumb) * s.at}px)`;
    bar.setAttribute("aria-valuenow", String(Math.round(s.at * 100)));
    if (stage.id !== "") bar.setAttribute("aria-controls", stage.id);
  };

  // Saisie : ordonnée du pointeur et `at` de la page au toucher ; un seul pointeur à la fois.
  let drag: { readonly id: number; readonly y: number; readonly at: number } | null = null;
  const stop = (e: Event): void => e.stopPropagation();
  thumb.addEventListener("pointerdown", (e) => {
    if (geom === null || drag !== null || e.button !== 0 || (e.pointerType === "touch" && penInContact())) return;
    e.stopPropagation();
    e.preventDefault();
    drag = { id: e.pointerId, y: e.clientY, at: geom.at };
    thumb.setPointerCapture?.(e.pointerId);
    bar.dataset["drag"] = "1";
  });
  thumb.addEventListener("pointermove", (e) => {
    if (drag === null || e.pointerId !== drag.id || geom === null) return;
    e.stopPropagation();
    const free = geom.span - geom.thumb;
    if (free > 0) engine.scrollPageTo(drag.at + (e.clientY - drag.y) / free);
  });
  const end = (e: PointerEvent): void => {
    if (drag === null || e.pointerId !== drag.id) return;
    e.stopPropagation();
    drag = null;
    delete bar.dataset["drag"];
    if (thumb.hasPointerCapture?.(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) thumb.addEventListener(type, end as EventListener);
  for (const type of ["pointerover", "pointerout", "pointerenter", "pointerleave"]) thumb.addEventListener(type, stop);
  // Appui long sur le curseur : ni menu du navigateur, ni menu de la scène.
  thumb.addEventListener("contextmenu", (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  return { element: bar, update };
}
