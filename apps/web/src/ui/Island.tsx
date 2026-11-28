import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { ISLANDS_RESIZED } from "../app/island-watch";
import { NO_ISLAND, type DeviceSettings } from "../device-settings";
import type { ButtonSize, Toolbar as Bar } from "../toolbar";
import { Icon, TipBubble, tipPointerHandlers } from "./IconButton";
import {
  BUTTON_PX, EDGE, GAP, MOVABLE_ROLES, SHEET_W, TABS_MIN, anchorOf, compactOf, isCentered, laneOf, nudge, pixelPad, placeIsland, sheetLane, sideCorners, tabsWidth,
  beyondObstacles, withContextRow, type Anchor, type Box, type Corners, type Lane, type Point, type Rect,
} from "./island-place";
import { startPointerGesture } from "./pointer-gesture";
import { createTip, placeTip } from "./tooltip";

/**
 * Îlots flottants (design-l2, DA-L2-2). `Island` rend un îlot à la position calculée par `island-place.ts` (`left`,
 * `top`, `max-inline-size` en px entiers ; jamais de translation, L2-12) ; la barre d'outils y gagne poignée, Replier et
 * clavier (L2-8 à L2-10), sa position et son repli vont sur l'appareil (L2-7), jamais dans le profil.
 * `IslandLayer` rend le calque dans la case de la scène : coins en flex à 16 px (L2-5), îlots centrés placés par
 * `laneOf` (L2-30), îlot des onglets et `#etat` en haut à gauche, voie imposée par le panneau des profils (L2-16).
 * L'habillage (fond, rayon, filet, ombre) est porté par la règle `.rb-island` de rb.css ; le style en ligne ne porte que
 * la position et la largeur maximale.
 */
export type IslandStore = Pick<DeviceSettings, "island" | "setIsland">;
/** Rectangle placé d'un îlot, px de la case ; `moved` : position enregistrée ou glisser en cours. */
export interface Placed { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly moved: boolean; readonly ctx?: Rect | null }

export const GRIP_LABEL = "Déplacer la barre (flèches ; Maj : grand pas ; Début : recentrer)";
export const COLLAPSE_LABEL = "Replier la barre";
export const EXPAND_LABEL = "Déplier la barre";
const isSide = (anchor: Anchor): boolean => anchor === "side-start" || anchor === "side-end";

const ZERO: Box = Object.freeze({ w: 0, h: 0 });
const sameBox = (a: Box, b: Box): boolean => a.w === b.w && a.h === b.h;

/** Taille d'un élément, px CSS entiers, relue à l'image suivante après chaque changement (aucune boucle de
 *  `ResizeObserver`) ; sans `ResizeObserver` (tests) : mesurée une fois. Rend la fonction d'arrêt. */
export function observeBox(el: Element, set: (b: Box) => void, round: (n: number) => number = Math.ceil): () => void {
  const read = (): void => {
    const r = el.getBoundingClientRect();
    set({ w: round(r.width), h: round(r.height) });
  };
  read();
  if (typeof ResizeObserver !== "function") return () => undefined;
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(read);
  });
  ro.observe(el);
  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
  };
}

/** Netteté (T9) : porte un texte de largeur fractionnaire (titre d'onglet, `#pages`) au pixel entier supérieur par une
 *  marge de fin (`pixelPad`), relue à chaque changement de sa taille (`observeBox`, largeur brute) : les icônes qui le
 *  suivent restent sur la grille de pixels. La marge ne change pas la boîte observée : aucune boucle. Rend l'arrêt. */
export function padToPixel(el: HTMLElement): () => void {
  return observeBox(
    el,
    (b) => {
      const pad = pixelPad(b.w);
      if (pad > 0) el.style.setProperty("margin-inline-end", `${pad}px`);
      else el.style.removeProperty("margin-inline-end");
    },
    (n) => n,
  );
}

interface ChromeProps {
  readonly icon: string;
  readonly label: string;
  readonly mark: "data-island-grip" | "data-island-collapse";
  readonly expanded?: boolean;
  onPress?(): void;
  onDown?(e: PointerEvent): void;
  onKey?(e: KeyboardEvent): void;
  onDouble?(): void;
}

/** Bouton de chrome d'îlot, hors profil (L2-8) : icône, libellé en `.rb-sr`, infobulle de L1. Frère du contenu de
 *  l'îlot, jamais dedans : il reste visible quand le contenu défile (L2-30 a). */
function ChromeButton(props: ChromeProps): JSX.Element {
  const tip = createTip();
  const h = tipPointerHandlers(tip);
  const mark = { [props.mark]: "" };
  let el: HTMLButtonElement | undefined;
  return (
    <>
      <button
        ref={el}
        type="button"
        class="rb-island-chrome"
        {...mark}
        aria-label={props.label}
        aria-expanded={props.expanded}
        onClick={() => props.onPress?.()}
        onPointerEnter={h.onPointerEnter}
        onPointerLeave={h.onPointerLeave}
        onPointerDown={(e) => {
          h.onPointerDown(e);
          props.onDown?.(e);
        }}
        onPointerUp={h.onPointerUp}
        onPointerCancel={h.onPointerCancel}
        onKeyDown={(e) => props.onKey?.(e)}
        onDblClick={() => props.onDouble?.()}
        onFocus={() => tip.focus()}
        onBlur={() => tip.blur(document.hasFocus())}
      >
        <Icon name={props.icon} />
        <span class="rb-sr">{props.label}</span>
      </button>
      <TipBubble tip={tip} label={props.label} anchor={() => el!} />
    </>
  );
}

export interface IslandProps {
  readonly bar: Bar;
  readonly anchor: Anchor;
  /** L2-8 : barre `floating` de rôle `tools` ou `pages` (`MOVABLE_ROLES`) : poignée, Replier, clavier, appareil. */
  readonly movable: boolean;
  readonly profileId: string;
  readonly store?: IslandStore;
  /** Case des îlots (la case de la scène), px entiers. */
  readonly area: Accessor<Box>;
  readonly corners: Accessor<Corners>;
  /** L2-16 : voie imposée par le panneau des profils ouvert ; null sinon. */
  readonly sheet: Accessor<Lane | null>;
  /** Change quand le contenu de l'îlot peut changer de largeur (pages, outil) : remesure. */
  readonly watch?: Accessor<unknown>;
  onPlaced?(p: Placed | null): void;
  /** OG30 : confie l'îlot à l'observateur de taille du calque (`IslandLayer`) ; rend l'arrêt. */
  track?(el: Element): () => void;
  readonly children: (collapsed: Accessor<boolean>, expand: () => void) => JSX.Element;
}

export function Island(props: IslandProps): JSX.Element {
  const saved = props.movable ? (props.store?.island(props.profileId, props.bar.id) ?? NO_ISLAND) : NO_ISLAND;
  const [at, setAt] = createSignal<Point | null>(saved.at);
  const [own, setOwn] = createSignal<boolean | null>(saved.collapsed);
  const [drag, setDrag] = createSignal<Point | null>(null);
  const [natural, setNatural] = createSignal<Box>(ZERO, { equals: sameBox });
  /** OG19 (H0) : largeur de l'îlot compacté (`data-compact`), mesurée avec la naturelle ; îlot mobile centré seulement. */
  const [compactSize, setCompactSize] = createSignal<Box>(ZERO, { equals: sameBox });
  const compactable = props.movable && isCentered(props.anchor);
  const collapsed = (): boolean => props.movable && (own() ?? props.bar.collapsed);
  const positioned = props.movable || isCentered(props.anchor) || isSide(props.anchor);
  /** Le panneau des profils ne repousse que l'îlot d'outils (L2-16) ; les autres îlots mobiles restent où ils sont. */
  const sheetLane_ = (): Lane | null => (props.bar.role === "tools" ? props.sheet() : null);
  let el: HTMLDivElement | undefined;
  let stopDrag: (() => void) | null = null;

  /** OG19 (H0) : compacté selon la fenêtre, déplacé ou glissé compris (sinon un cran de flèche lui rendrait sa largeur
   *  naturelle par-dessus les panneaux) ; jamais dans la voie du panneau des profils, qui passe à la ligne. */
  const compact = createMemo((): boolean => {
    if (!compactable || sheetLane_() !== null) return false;
    const area = props.area();
    return area.w > 0 && compactOf(props.anchor, natural(), compactSize(), area, props.corners());
  });
  /** Taille de l'îlot tel qu'il est montré. */
  const size = (): Box => (compact() ? compactSize() : natural());

  /** Position et largeur maximale, px entiers ; null : îlot de coin, posé par la règle CSS de son groupe. */
  const pos = createMemo((): (Lane & { readonly wrap: boolean }) | null => {
    if (!positioned) return null;
    const area = props.area();
    /** T11 : case pas encore mesurée (ou cachée) : rien de placé, aucun geste. */
    if (area.w === 0 || area.h === 0) return null;
    const s = size();
    const c = props.corners();
    const lane = props.movable ? sheetLane_() : null;
    if (lane !== null) return { ...lane, wrap: true };
    const full = Math.max(0, area.w - 2 * EDGE);
    /** Voie latérale : l'îlot déplacé garde une hauteur bornée à la case sous lui. */
    const tall = (p: Point): { readonly maxHeight?: number } => (isSide(props.anchor) ? { maxHeight: Math.max(0, area.h - EDGE - p.y) } : {});
    const d = drag();
    if (d !== null) return { ...d, ...tall(d), maxWidth: full, wrap: false };
    const a = at();
    if (a !== null) {
      const p = placeIsland(props.anchor, s, area, a, c);
      return { ...p, ...tall(p), maxWidth: full, wrap: false };
    }
    return { ...laneOf(props.anchor, s, area, c), wrap: false };
  });

  /** Largeur naturelle, `max-inline-size` levée le temps de la lecture : la voie dépend de ce que l'îlot demande,
   *  jamais de ce qu'on lui laisse (sinon la voie et la largeur se répondent). */
  const measure = (): void => {
    if (el === undefined) return;
    const prev = el.style.getPropertyValue("max-inline-size");
    const was = el.getAttribute("data-compact");
    el.style.setProperty("max-inline-size", "none");
    const read = (on: boolean): Box => {
      if (on) el!.setAttribute("data-compact", "1");
      else el!.removeAttribute("data-compact");
      const r = el!.getBoundingClientRect();
      return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
    };
    // OG19 (H0) : les deux largeurs, naturelle et compacte, lues dans la même tâche ; l'attribut est rendu tel quel.
    const n = read(false);
    const c = compactable ? read(true) : n;
    if (was === null) el.removeAttribute("data-compact");
    else el.setAttribute("data-compact", was);
    if (prev === "") el.style.removeProperty("max-inline-size");
    else el.style.setProperty("max-inline-size", prev);
    setNatural(n);
    setCompactSize(c);
  };
  /** L2-13 : îlot contextuel centré sous la barre, borné à la case, px entiers (`placeTip`) ; coordonnées relatives à
   *  l'îlot, son bloc conteneur. */
  const [ctxRect, setCtxRect] = createSignal<Rect | null>(null, { equals: (a, b) => a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h) });
  const placeContext = (): void => {
    const p = pos();
    const ctx = el?.querySelector<HTMLElement>("[data-island-context]");
    if (el === undefined || p === null) return;
    if (ctx === null || ctx === undefined) {
      setCtxRect(null);
      return;
    }
    const me = el.getBoundingClientRect();
    const r = ctx.getBoundingClientRect();
    const area = props.area();
    const t = placeTip({ left: p.x, top: p.y, right: p.x + me.width, bottom: p.y + me.height }, { width: r.width, height: r.height }, { width: area.w, height: area.h }, GAP);
    const top = t.top - p.y;
    const obstacles: Rect[] = [];
    for (const o of el.parentElement?.querySelectorAll<HTMLElement>('.rb-island[data-anchor^="side-"]') ?? []) {
      if (o === el) continue;
      const b = o.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) obstacles.push({ x: b.left - me.left, y: b.top - me.top, w: b.width, h: b.height });
    }
    ctx.style.left = `${beyondObstacles(t.left - p.x, { top, height: r.height }, obstacles, GAP)}px`;
    ctx.style.top = `${top}px`;
    // Rectangle de la rangée dans le repère de la case, pour que le panneau d'options passe dessous.
    const l = beyondObstacles(t.left - p.x, { top, height: r.height }, obstacles, GAP);
    setCtxRect({ x: Math.round(p.x + l), y: Math.round(p.y + top), w: Math.ceil(r.width), h: Math.ceil(r.height) });
  };

  onMount(() => {
    measure();
    if (el !== undefined && props.track !== undefined) onCleanup(props.track(el));
    let frame = 0;
    const later = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        measure();
        placeContext();
        // T22 : la rangée contextuelle suit aussi les barres latérales (dépliées, repliées, déplacées).
        for (const o of el?.parentElement?.querySelectorAll<HTMLElement>('.rb-island[data-anchor^="side-"]') ?? []) {
          if (o !== el && !watched.has(o)) {
            watched.add(o);
            ro?.observe(o);
          }
        }
      });
    };
    const watched = new WeakSet<Element>();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function" && el !== undefined) {
      ro = new ResizeObserver(later);
      ro.observe(el);
      const ctx = el.querySelector("[data-island-context]");
      if (ctx !== null) ro.observe(ctx);
    }
    later();
    onCleanup(() => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      stopDrag?.();
      props.onPlaced?.(null);
    });
  });
  let remeasure = 0;
  createEffect(
    on(
      () => [props.watch?.(), collapsed()],
      () => {
        cancelAnimationFrame(remeasure);
        remeasure = requestAnimationFrame(measure);
      },
      { defer: true },
    ),
  );
  onCleanup(() => cancelAnimationFrame(remeasure));
  createEffect(() => {
    const p = pos();
    if (p === null) return;
    queueMicrotask(placeContext);
    props.onPlaced?.({ x: p.x, y: p.y, w: Math.min(size().w, p.maxWidth), h: size().h, moved: at() !== null || drag() !== null, ...(ctxRect() !== null ? { ctx: ctxRect() } : {}) });
  });

  const write = (): void => {
    props.store?.setIsland(props.profileId, props.bar.id, { at: at(), collapsed: own() });
  };
  const commit = (p: Point | null): void => {
    setAt(p);
    write();
  };
  /** L2-9 : glisser la poignée ; écrit au lâcher seulement ; Échap, `pointercancel` : retour au départ. */
  const startDrag = (e: PointerEvent): void => {
    const p0 = pos();
    if (p0 === null || sheetLane_() !== null) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    stopDrag = startPointerGesture(e, {
      move: (m) => setDrag(placeIsland(props.anchor, size(), props.area(), { x: p0.x + m.clientX - x0, y: p0.y + m.clientY - y0 }, props.corners())),
      finish: (u, dragged) => {
        const d = drag();
        setDrag(null);
        stopDrag = null;
        if (u !== null && dragged && d !== null) commit(d);
      },
    });
  };
  /** L2-10 : flèches 16 px, Maj 64 px, Début recentre ; la touche traitée ne va pas au moteur. */
  const onGripKey = (e: KeyboardEvent): void => {
    if (sheetLane_() !== null) return;
    if (e.key === "Home") {
      if (pos() === null) return;
      e.preventDefault();
      e.stopPropagation();
      commit(null);
      return;
    }
    const p = pos();
    const n = p === null ? null : nudge({ x: p.x, y: p.y }, e.key, e.shiftKey);
    if (n === null) return;
    e.preventDefault();
    e.stopPropagation();
    commit(placeIsland(props.anchor, size(), props.area(), n, props.corners()));
  };
  const toggle = (): void => {
    setOwn(!collapsed());
    write();
  };
  /** Déplie l'îlot replié (toucher un onglet de la barre repliée) ; sans effet s'il est déjà déplié. */
  const expand = (): void => {
    if (collapsed()) toggle();
  };

  return (
    <div
      ref={el}
      class="rb-island"
      data-island={props.bar.id}
      data-anchor={anchorOf(props.bar)}
      data-wrap={pos()?.wrap === true ? "1" : undefined}
      data-compact={compact() ? "1" : undefined}
      data-collapsed={collapsed() ? "1" : undefined}
      style={
        pos() === null
          ? undefined
          : {
              left: `${pos()!.x}px`,
              top: `${pos()!.y}px`,
              "max-inline-size": `${pos()!.maxWidth}px`,
              ...(pos()!.maxHeight !== undefined ? { "max-block-size": `${pos()!.maxHeight}px` } : {}),
            }
      }
    >
      <Show when={props.movable}>
        <ChromeButton icon="grip" label={GRIP_LABEL} mark="data-island-grip" onDown={startDrag} onKey={onGripKey} onDouble={() => sheetLane_() === null && commit(null)} />
      </Show>
      {props.children(collapsed, expand)}
      <Show when={props.movable}>
        <ChromeButton
          icon={collapsed() ? "down" : "collapse"}
          label={collapsed() ? EXPAND_LABEL : COLLAPSE_LABEL}
          mark="data-island-collapse"
          expanded={!collapsed()}
          onPress={toggle}
        />
      </Show>
    </div>
  );
}

export interface IslandLayerProps {
  /** Barres `floating` montrées au tableau (aucune en annotation). */
  readonly bars: Accessor<readonly Bar[]>;
  readonly render: (bar: Bar, collapsed: Accessor<boolean>, expand: () => void) => JSX.Element;
  /** Contenu de l'îlot des onglets (TabsBar). */
  readonly head: JSX.Element;
  /** `<p id="etat" role="status">`, après les onglets. */
  readonly status: JSX.Element;
  readonly profileId: Accessor<string>;
  readonly store?: IslandStore;
  readonly size: Accessor<ButtonSize>;
  /** L2-16 : panneau des profils ouvert. */
  readonly sheetOpen: Accessor<boolean>;
  readonly watch?: Accessor<unknown>;
  /** T22 : îlot posé dans la zone du calque (panneau d'options) : mêmes bornes que les îlots. OG11 × OG4 : reçoit le
   *  rectangle de l'îlot latéral de début (`side-start`, barre latérale ou outils, déplié ou replié) pour se poser à sa droite. */
  readonly extra?: (sideStart: Accessor<Rect | null>, above: Accessor<readonly Rect[]>) => JSX.Element;
  /** T16 (design-l4) : haut libre des panneaux passagers, px de la case : 16 px sous la rangée des coins et sous l'îlot
   *  d'outils qu'elle place (sur la rangée ou descendu sur la voie suivante ; déplacé : non compté). */
  onTopFree?(y: number): void;
}

/** Largeur du panneau des profils, lue dans `--rb-sheet-w` (rb.css) ; illisible : `SHEET_W`. */
function sheetWidth(): number {
  const v = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--rb-sheet-w"), 10);
  return Number.isFinite(v) && v > 0 ? v : SHEET_W;
}

export function IslandLayer(props: IslandLayerProps): JSX.Element {
  let layer: HTMLDivElement | undefined;
  let topStart: HTMLDivElement | undefined;
  let menu: HTMLDivElement | undefined;
  let topEnd: HTMLDivElement | undefined;
  let bottomStart: HTMLDivElement | undefined;
  let head: HTMLDivElement | undefined;
  const [area, setArea] = createSignal<Box>(ZERO, { equals: sameBox });
  const [startBox, setStartBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [menuBox, setMenuBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [endBox, setEndBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [bottomBox, setBottomBox] = createSignal<Box>(ZERO, { equals: sameBox });
  /** T11 : `#etat` suit les onglets ; non vide, sa largeur compte dans la rangée du haut (vide : 0, rb.css). */
  const [statusBox, setStatusBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const statusW = (): number => statusBox().w;
  const [tools, setTools] = createSignal<Placed | null>(null);
  /** OG11 × OG4 : îlots latéraux de début posés (par id de barre) ; le panneau d'options se pose à droite du plus à droite. */
  const [sidePlaced, setSidePlaced] = createSignal<Readonly<Record<string, Rect>>>({});
  const sideStart = createMemo((): Rect | null => {
    let best: Rect | null = null;
    for (const r of Object.values(sidePlaced())) if (r.w > 0 && r.h > 0 && (best === null || r.x + r.w > best.x + best.w)) best = r;
    return best;
  });
  /** Îlot d'outils posé et non déplacé : le panneau d'options passe dessous s'il le surplombe (comme la voie latérale). */
  const toolsAbove = createMemo((): readonly Rect[] => {
    const t = tools();
    return t === null || t.moved ? [] : withContextRow({ x: t.x, y: t.y, w: t.w, h: t.h }, t.ctx ?? null);
  });
  const placeSide = (id: string, p: Placed | null): void => {
    setSidePlaced((m) => {
      const { [id]: _old, ...rest } = m;
      return p === null ? rest : { ...rest, [id]: { x: p.x, y: p.y, w: p.w, h: p.h } };
    });
  };
  /** Îlot posé par `left` / `top` dans le calque : centré, latéral ou mobile ; les autres vont dans leur groupe de coin. */
  const free = (b: Bar): boolean => isCentered(anchorOf(b)) || isSide(anchorOf(b)) || MOVABLE_ROLES.has(b.role);
  const byAnchor = (anchor: Anchor) => createMemo(() => props.bars().filter((b) => !free(b) && anchorOf(b) === anchor));
  const starts = byAnchor("top-start");
  const ends = byAnchor("top-end");
  const bottoms = byAnchor("bottom-start");
  /** `design-l4:81` : les îlots latéraux viennent après les centrés dans le DOM, quel que soit l'ordre du profil. */
  const centered = createMemo(() => props.bars().filter((b) => free(b) && !isSide(anchorOf(b))));
  const sides = createMemo(() => props.bars().filter((b) => isSide(anchorOf(b))));
  /** Abscisse de l'îlot des onglets : après les îlots du menu et leur écart. */
  const startX = (): number => EDGE + menuBox().w + (menuBox().w > 0 ? GAP : 0);
  const topCorners = createMemo((): Corners => ({
    start: startX() - EDGE + TABS_MIN + (statusW() > 0 ? GAP + statusW() : 0),
    end: endBox().w,
    band: Math.max(startBox().h, endBox().h),
  }));
  const bottomCorners = createMemo((): Corners => ({ start: bottomBox().w, end: 0, band: bottomBox().h }));
  /** T16 : la voie latérale passe aussi sous l'îlot d'outils qui la surplombe (descendu sur la voie suivante, ou dans la
   *  place du panneau des profils), jamais sous la seule rangée des coins. */
  const sideBase = createMemo((): Corners => ({ start: 0, end: 0, band: topCorners().band, foot: bottomBox().h }));
  const sideCornersOf = (role: string): Accessor<Corners> =>
    createMemo(() => {
      const t = tools();
      return sideCorners(sideBase(), role, t === null ? null : { x: t.x, y: t.y, w: t.w, h: t.h });
    });
  const sheet = createMemo((): Lane | null => (props.sheetOpen() ? sheetLane(area(), sheetWidth(), topCorners().band, BUTTON_PX[props.size()]) : null));
  const topFree = createMemo(() => {
    const t = tools();
    const row = EDGE + topCorners().band;
    return (t === null || t.moved ? row : Math.max(row, t.y + t.h)) + EDGE;
  });
  createEffect(() => props.onTopFree?.(topFree()));
  const tabsMax = createMemo(() => {
    const t = tools();
    return tabsWidth(area(), startX(), endBox().w, t === null || t.moved ? null : { x: t.x, y: t.y }, statusW());
  });
  /** OG30 : un seul observateur de taille pour les îlots de barre et l'îlot des onglets (ceux qui réservent le haut de la
   *  page, `fitTop`) : une hauteur changée sans attribut prévient la session montrée (`ISLANDS_RESIZED`, `watchIslands`). */
  const sizes = typeof ResizeObserver === "function" ? new ResizeObserver(() => layer?.dispatchEvent(new Event(ISLANDS_RESIZED, { bubbles: true }))) : null;
  onCleanup(() => sizes?.disconnect());
  const track = (el: Element): (() => void) => {
    sizes?.observe(el);
    return () => sizes?.unobserve(el);
  };
  onMount(() => {
    const offs = [
      track(head!),
      observeBox(layer!, setArea, Math.floor),
      observeBox(topStart!, setStartBox),
      observeBox(menu!, setMenuBox),
      observeBox(topEnd!, setEndBox),
      observeBox(bottomStart!, setBottomBox),
    ];
    const status = topStart!.querySelector('[role="status"]');
    if (status !== null) offs.push(observeBox(status, setStatusBox));
    onCleanup(() => {
      for (const off of offs) off();
    });
  });
  /** T11 : les îlots sont recréés à chaque changement de profil (mêmes objets `bar` après « Enregistrer comme
   *  nouveau ») : position et repli relus sur l'appareil du nouveau profil, écrits sous sa clé. */
  const profile = createMemo(() => [props.profileId()] as const, undefined, { equals: (a, b) => a[0] === b[0] });
  const islands = (list: Accessor<readonly Bar[]>): JSX.Element => (
    <Show keyed when={profile()}>
      {([id]) => <For each={list()}>{(bar) => island(bar, id)}</For>}
    </Show>
  );
  const island = (bar: Bar, profileId: string): JSX.Element => {
    const anchor = anchorOf(bar);
    const movable = MOVABLE_ROLES.has(bar.role);
    return (
      <Island
        bar={bar}
        anchor={anchor}
        movable={movable}
        profileId={profileId}
        {...(props.store !== undefined ? { store: props.store } : {})}
        area={area}
        corners={isSide(anchor) ? sideCornersOf(bar.role) : anchor.startsWith("top") ? topCorners : bottomCorners}
        sheet={sheet}
        track={track}
        {...(props.watch !== undefined ? { watch: props.watch } : {})}
        {...(bar.role === "tools" || anchor === "side-start"
          ? {
              onPlaced: (p: Placed | null) => {
                if (bar.role === "tools") setTools(p);
                if (anchor === "side-start") placeSide(bar.id, p);
              },
            }
          : {})}
      >
        {(c, expand) => props.render(bar, c, expand)}
      </Island>
    );
  };
  return (
    <div ref={layer} class="rb-islands">
      {props.extra?.(sideStart, toolsAbove)}
      <div ref={topStart} class="rb-corner" data-corner="top-start">
        <div ref={menu} class="rb-corner-menu">
          {islands(starts)}
        </div>
        <div ref={head} class="rb-island rb-head" data-island="onglets" style={{ "max-inline-size": `${tabsMax()}px` }}>
          {props.head}
        </div>
        {props.status}
      </div>
      <div ref={topEnd} class="rb-corner" data-corner="top-end">
        {islands(ends)}
      </div>
      <div ref={bottomStart} class="rb-corner" data-corner="bottom-start">
        {islands(bottoms)}
      </div>
      {islands(centered)}
      {islands(sides)}
    </div>
  );
}
