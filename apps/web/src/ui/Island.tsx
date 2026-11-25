import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { NO_ISLAND, type DeviceSettings } from "../device-settings";
import type { ButtonSize, Toolbar as Bar } from "../toolbar";
import { Icon, TipBubble, tipPointerHandlers } from "./IconButton";
import {
  BUTTON_PX, EDGE, GAP, SHEET_W, TABS_MIN, anchorOf, isCentered, laneOf, nudge, placeIsland, sheetLane, tabsWidth,
  type Anchor, type Box, type Corners, type Lane, type Point,
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
export interface Placed { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly moved: boolean }

export const GRIP_LABEL = "Déplacer la barre (flèches ; Maj : grand pas ; Début : recentrer)";
export const COLLAPSE_LABEL = "Replier la barre";
export const EXPAND_LABEL = "Déplier la barre";
/** L2-8, H4 : seul ce rôle se déplace et se replie. */
export const MOVABLE_ROLE = "tools";

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
  /** L2-8 : barre `floating` de rôle `tools` : poignée, Replier, clavier, appareil. */
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
  readonly children: (collapsed: Accessor<boolean>) => JSX.Element;
}

export function Island(props: IslandProps): JSX.Element {
  const saved = props.movable ? (props.store?.island(props.profileId, props.bar.id) ?? NO_ISLAND) : NO_ISLAND;
  const [at, setAt] = createSignal<Point | null>(saved.at);
  const [own, setOwn] = createSignal<boolean | null>(saved.collapsed);
  const [drag, setDrag] = createSignal<Point | null>(null);
  const [size, setSize] = createSignal<Box>(ZERO, { equals: sameBox });
  const collapsed = (): boolean => props.movable && (own() ?? props.bar.collapsed);
  const positioned = props.movable || isCentered(props.anchor);
  let el: HTMLDivElement | undefined;
  let stopDrag: (() => void) | null = null;

  /** Position et largeur maximale, px entiers ; null : îlot de coin, posé par la règle CSS de son groupe. */
  const pos = createMemo((): (Lane & { readonly wrap: boolean }) | null => {
    if (!positioned) return null;
    const area = props.area();
    const s = size();
    const c = props.corners();
    const lane = props.movable ? props.sheet() : null;
    if (lane !== null) return { ...lane, wrap: true };
    const full = Math.max(0, area.w - 2 * EDGE);
    const d = drag();
    if (d !== null) return { ...d, maxWidth: full, wrap: false };
    const a = at();
    if (a !== null) return { ...placeIsland(props.anchor, s, area, a, c), maxWidth: full, wrap: false };
    return { ...laneOf(props.anchor, s, area, c), wrap: false };
  });

  /** Largeur naturelle, `max-inline-size` levée le temps de la lecture : la voie dépend de ce que l'îlot demande,
   *  jamais de ce qu'on lui laisse (sinon la voie et la largeur se répondent). */
  const measure = (): void => {
    if (el === undefined) return;
    const prev = el.style.getPropertyValue("max-inline-size");
    el.style.setProperty("max-inline-size", "none");
    const r = el.getBoundingClientRect();
    if (prev === "") el.style.removeProperty("max-inline-size");
    else el.style.setProperty("max-inline-size", prev);
    setSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
  };
  /** L2-13 : îlot contextuel centré sous la barre, borné à la case, px entiers (`placeTip`) ; coordonnées relatives à
   *  l'îlot, son bloc conteneur. */
  const placeContext = (): void => {
    const p = pos();
    const ctx = el?.querySelector<HTMLElement>("[data-island-context]");
    if (el === undefined || ctx === null || ctx === undefined || p === null) return;
    const me = el.getBoundingClientRect();
    const r = ctx.getBoundingClientRect();
    const area = props.area();
    const t = placeTip({ left: p.x, top: p.y, right: p.x + me.width, bottom: p.y + me.height }, { width: r.width, height: r.height }, { width: area.w, height: area.h }, GAP);
    ctx.style.left = `${t.left - p.x}px`;
    ctx.style.top = `${t.top - p.y}px`;
  };

  onMount(() => {
    measure();
    let frame = 0;
    const later = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        measure();
        placeContext();
      });
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function" && el !== undefined) {
      ro = new ResizeObserver(later);
      ro.observe(el);
      const ctx = el.querySelector("[data-island-context]");
      if (ctx !== null) ro.observe(ctx);
    }
    onCleanup(() => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      stopDrag?.();
      props.onPlaced?.(null);
    });
  });
  createEffect(on(() => [props.watch?.(), collapsed()], () => requestAnimationFrame(measure), { defer: true }));
  createEffect(() => {
    const p = pos();
    if (p === null) return;
    queueMicrotask(placeContext);
    props.onPlaced?.({ x: p.x, y: p.y, w: Math.min(size().w, p.maxWidth), h: size().h, moved: at() !== null || drag() !== null });
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
    if (p0 === null || props.sheet() !== null) return;
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
    if (props.sheet() !== null) return;
    if (e.key === "Home") {
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

  return (
    <div
      ref={el}
      class="rb-island"
      data-island={props.bar.id}
      data-anchor={props.anchor}
      data-wrap={pos()?.wrap === true ? "1" : undefined}
      data-collapsed={collapsed() ? "1" : undefined}
      style={pos() === null ? undefined : { left: `${pos()!.x}px`, top: `${pos()!.y}px`, "max-inline-size": `${pos()!.maxWidth}px` }}
    >
      <Show when={props.movable}>
        <ChromeButton icon="grip" label={GRIP_LABEL} mark="data-island-grip" onDown={startDrag} onKey={onGripKey} onDouble={() => commit(null)} />
      </Show>
      {props.children(collapsed)}
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
  readonly render: (bar: Bar, collapsed: Accessor<boolean>) => JSX.Element;
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
  const [area, setArea] = createSignal<Box>(ZERO, { equals: sameBox });
  const [startBox, setStartBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [menuBox, setMenuBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [endBox, setEndBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [bottomBox, setBottomBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [tools, setTools] = createSignal<Placed | null>(null);
  const byAnchor = (anchor: Anchor) => createMemo(() => props.bars().filter((b) => anchorOf(b.role) === anchor));
  const starts = byAnchor("top-start");
  const ends = byAnchor("top-end");
  const bottoms = byAnchor("bottom-start");
  const centered = createMemo(() => props.bars().filter((b) => isCentered(anchorOf(b.role))));
  /** Abscisse de l'îlot des onglets : après les îlots du menu et leur écart. */
  const startX = (): number => EDGE + menuBox().w + (menuBox().w > 0 ? GAP : 0);
  const topCorners = createMemo((): Corners => ({ start: startX() - EDGE + TABS_MIN, end: endBox().w, band: Math.max(startBox().h, endBox().h) }));
  const bottomCorners = createMemo((): Corners => ({ start: bottomBox().w, end: 0, band: bottomBox().h }));
  const sheet = createMemo((): Lane | null => (props.sheetOpen() ? sheetLane(area(), sheetWidth(), topCorners().band, BUTTON_PX[props.size()]) : null));
  const tabsMax = createMemo(() => {
    const t = tools();
    return tabsWidth(area(), startX(), endBox().w, t === null || t.moved ? null : { x: t.x, y: t.y });
  });
  onMount(() => {
    const offs = [
      observeBox(layer!, setArea, Math.floor),
      observeBox(topStart!, setStartBox),
      observeBox(menu!, setMenuBox),
      observeBox(topEnd!, setEndBox),
      observeBox(bottomStart!, setBottomBox),
    ];
    onCleanup(() => {
      for (const off of offs) off();
    });
  });
  const island = (bar: Bar): JSX.Element => {
    const anchor = anchorOf(bar.role);
    const movable = bar.role === MOVABLE_ROLE;
    return (
      <Island
        bar={bar}
        anchor={anchor}
        movable={movable}
        profileId={props.profileId()}
        {...(props.store !== undefined ? { store: props.store } : {})}
        area={area}
        corners={anchor.startsWith("top") ? topCorners : bottomCorners}
        sheet={sheet}
        {...(props.watch !== undefined ? { watch: props.watch } : {})}
        {...(movable ? { onPlaced: (p: Placed | null) => setTools(p) } : {})}
      >
        {(c) => props.render(bar, c)}
      </Island>
    );
  };
  return (
    <div ref={layer} class="rb-islands">
      <div ref={topStart} class="rb-corner" data-corner="top-start">
        <div ref={menu} class="rb-corner-menu">
          <For each={starts()}>{island}</For>
        </div>
        <div class="rb-island rb-head" data-island="onglets" style={{ "max-inline-size": `${tabsMax()}px` }}>
          {props.head}
        </div>
        {props.status}
      </div>
      <div ref={topEnd} class="rb-corner" data-corner="top-end">
        <For each={ends()}>{island}</For>
      </div>
      <div ref={bottomStart} class="rb-corner" data-corner="bottom-start">
        <For each={bottoms()}>{island}</For>
      </div>
      <For each={centered()}>{island}</For>
    </div>
  );
}
