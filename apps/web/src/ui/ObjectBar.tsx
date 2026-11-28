/**
 * Barre d'objet (OG41, D18-D27, DA3) : petite pilule d'icônes collée à la sélection, posée par `placeObjectBar` dans le
 * conteneur des scènes (`.rb-stages`, comme le menu de case) : hors de `#stage`, ses appuis ne vont pas à
 * l'échantillonneur. La racine est ajoutée au conteneur à la main (patron `cell-menu.ts`) : le `Portal` de Solid 1.9
 * l'envelopperait dans un `div` et ne la créerait qu'après les effets du composant. Seuls les boutons utiles
 * (`objectActionShown`) ; « … » porte Premier plan, Arrière-plan, Exporter. Replacée à chaque état et caméra, taille
 * constante à l'écran ; cachée tant qu'un doigt (ou le pointeur) est enfoncé dans la scène, reposée au dernier levé ; la
 * liste « … » se ferme dès que la barre bouge ou qu'une action est jouée. Toucher = action, appui long = infobulle seule
 * (D25 : à la différence des barres d'outils, où l'appui long n'annule pas le clic, `tooltip.ts`) ; pas de menu natif au
 * clic droit ni à l'appui long. Clavier : Maj+F10 ou Menu y met le focus (tabindex itinérant, un arrêt de Tab), ← → Début
 * Fin, Entrée ou Espace, ↓ ou Entrée ouvre « … » (↑ ↓ Début Fin Entrée), Échap ferme puis rend le focus à la scène ; un
 * bouton joué qui disparaît (Supprimer, Grouper) passe le focus au bouton de même rang, ou à la scène. Les touches du
 * moteur pressées dans la barre ne l'atteignent pas (`ENGINE_KEYS`, comme `MenuBar`) ; Ctrl ou Méta remontent.
 */
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, untrack, type Accessor, type JSX } from "solid-js";
import { ENGINE_KEYS } from "../app/table-picker";
import type { ToolbarHost } from "../app/toolbar-host";
import type { Bounds } from "../core/api";
import { worldToScreen, type Camera } from "../engine/camera";
import { objectMenuKey } from "../engine/input/keys";
import { keyOf } from "../key-of";
import { Icon, IconButton } from "./IconButton";
import { placeObjectBar, type ObjectBarPlace, type Rect } from "./island-place";
import type { ToolbarView } from "./item-state";
import { MENU_STEP, placeMenu } from "./MenuBar";
import { OBJECT_ACTIONS, objectActionShown, playObjectAction, type ObjectAction } from "./object-bar";
import { buttonShortcut } from "./shortcuts";
import { TIP_HOLD_MS } from "./tooltip";

export interface ObjectBarEngine {
  camera(): Camera;
  onCamera(cb: (c: Camera) => void): () => void;
  /** Px de la scène (`Engine.selectionKeepOut`, DA2). */
  selectionKeepOut(): readonly Rect[];
}
export type ObjectBarView = ToolbarView & { readonly selectionBounds?: Bounds | null };
export interface ObjectBarProps {
  readonly view: Accessor<ObjectBarView>;
  readonly host: ToolbarHost;
  readonly engine: Accessor<ObjectBarEngine>;
  /** Scène active : repère des rectangles du moteur ; reçoit le focus rendu par Échap. */
  readonly stage: Accessor<HTMLElement>;
  /** Conteneur des scènes (`.rb-stages`, position relative) : racine de la barre. */
  readonly mount: HTMLElement;
  /** Obstacles de l'interface, px de la fenêtre (`getBoundingClientRect`). */
  readonly obstacles: Accessor<readonly Rect[]>;
}
export const OBJECT_BAR_LABEL = "Actions de l'objet";
export const MORE_LABEL = "Plus d'actions";

/** ← → Début Fin dans la barre, sans bouclage. */
const BAR_STEP: Readonly<Record<string, (i: number, n: number) => number>> = {
  ArrowRight: (i, n) => Math.min(n - 1, i + 1),
  ArrowLeft: (i) => Math.max(0, i - 1),
  Home: () => 0,
  End: (_i, n) => n - 1,
};
const shift = (r: Rect, dx: number, dy: number): Rect => ({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h });

/** Raccourci d'une action dans la barre : texte de l'infobulle toujours ; `aria-keyshortcuts` seulement si la touche agit
 *  aussi depuis la barre. Une touche du moteur sans Ctrl ni Méta (Suppr) y est avalée (D24, `ENGINE_KEYS`) : pas d'annonce. */
function barShortcut(id: string | null): { readonly text: string; readonly aria: string | null } | null {
  const k = id === null ? null : buttonShortcut(id);
  return k !== null && k.aria !== null && ENGINE_KEYS.has(k.aria) ? { text: k.text, aria: null } : k;
}

export function ObjectBar(props: ObjectBarProps): JSX.Element {
  let root: HTMLDivElement | undefined;
  let list: HTMLDivElement | undefined;
  const doc = props.mount.ownerDocument;
  const win = doc.defaultView ?? window;
  /** Pointeurs enfoncés dans la scène (pincement : plusieurs doigts) ; la barre revient au dernier levé. */
  const [down, setDown] = createSignal<ReadonlySet<number>>(new Set());
  const [open, setOpen] = createSignal(false);
  const [camTick, setCamTick] = createSignal(0);
  const [at, setAt] = createSignal<ObjectBarPlace | null>(null);
  const [listAt, setListAt] = createSignal<{ left: number; top: number } | null>(null);
  let current = 0;
  let downAt = 0;
  let downType = "mouse";
  /** Dernier appui tenu au moins `TIP_HOLD_MS` au doigt ou au stylet : son clic est avalé (infobulle seule, D25). */
  let held = false;
  /** Dernier geste au pointeur (et non au clavier) : une ligne choisie au pointeur ne rend pas le focus à « … ». */
  let byPointer = false;
  /** Le focus est dans la barre (ou y était quand son bouton a disparu). */
  let inside = false;

  const visible = createMemo(() => {
    const v = props.view();
    return v.tool === "select" && (v.selection?.length ?? 0) > 0 && v.annotation?.active !== true && (v.selectionBounds ?? null) !== null;
  });
  const shown = createMemo(() => visible() && down().size === 0);
  const main = createMemo(() => OBJECT_ACTIONS.filter((a) => !a.more && objectActionShown(a.id, props.view())));
  const more = createMemo(() => OBJECT_ACTIONS.filter((a) => a.more && objectActionShown(a.id, props.view())));
  const buttons = (): HTMLButtonElement[] => (root === undefined ? [] : [...root.querySelectorAll<HTMLButtonElement>("button[data-object-button]")]);
  const moreButton = (): HTMLButtonElement | null => root?.querySelector<HTMLButtonElement>("[data-object-more]") ?? null;
  const syncTabs = (all: readonly HTMLButtonElement[]): void => all.forEach((b, k) => (b.tabIndex = k === current ? 0 : -1));

  const place = (): void => {
    const b = props.view().selectionBounds ?? null;
    if (root === undefined || b === null) return;
    const c = props.engine().camera();
    const [x0, y0] = worldToScreen(c, b.x0, b.y0);
    const [x1, y1] = worldToScreen(c, b.x1, b.y1);
    const host = props.mount.getBoundingClientRect();
    const st = props.stage().getBoundingClientRect();
    const ox = st.left - host.left;
    const oy = st.top - host.top;
    const frame: Rect = { x: Math.min(x0, x1) + ox, y: Math.min(y0, y1) + oy, w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
    const keep = props.engine().selectionKeepOut().map((r) => shift(r, ox, oy));
    const obstacles = props.obstacles().map((r) => shift(r, -host.left, -host.top));
    const next = placeObjectBar(frame, { w: root.offsetWidth, h: root.offsetHeight }, { w: props.mount.clientWidth, h: props.mount.clientHeight }, keep, obstacles);
    // La liste est posée sous « … » en px de la fenêtre : la barre qui bouge la laisserait détachée.
    const prev = untrack(at);
    if (prev !== null && (prev.left !== next.left || prev.top !== next.top) && untrack(open)) setOpen(false);
    setAt(next);
  };

  // Les îlots se posent par image et par ResizeObserver (Island.tsx) : les obstacles sont relus une image après chaque
  // place (un seul replacement, jamais en boucle), et à chaque changement de taille du conteneur.
  let settle = 0;
  const placeNow = (): void => {
    if (!shown()) return;
    place();
    win.cancelAnimationFrame(settle);
    settle = win.requestAnimationFrame(() => {
      if (shown()) place();
    });
  };
  onCleanup(() => win.cancelAnimationFrame(settle));

  const focusAt = (i: number): void => {
    const all = buttons();
    if (all.length === 0) return;
    current = Math.max(0, Math.min(i, all.length - 1));
    syncTabs(all);
    all[current]!.focus();
  };
  const toScene = (): void => {
    setOpen(false);
    inside = false;
    const st = props.stage();
    st.focus({ preventScroll: true });
    if (doc.activeElement !== st && doc.activeElement instanceof HTMLElement) doc.activeElement.blur();
  };
  /** Le bouton qui avait le focus a disparu (retiré, ou barre cachée) : focus au bouton de même rang, sinon à la scène. */
  const rescueFocus = (): void => {
    if (!inside || root === undefined) return;
    const a = doc.activeElement;
    const lost = a === null || a === doc.body || !a.isConnected || (root.contains(a) && !visible());
    if (!lost) {
      if (!root.contains(a)) inside = false;
      return;
    }
    if (visible() && buttons().length > 0) focusAt(current);
    else toScene();
  };
  const openMore = (): void => {
    setOpen(true);
    const anchor = moreButton();
    if (list === undefined || anchor === null) return;
    setListAt(placeMenu(anchor.getBoundingClientRect(), { width: list.offsetWidth, height: list.offsetHeight }, { width: win.innerWidth, height: win.innerHeight }));
    list.querySelector<HTMLButtonElement>("button")?.focus();
  };
  const closeMore = (giveBack: boolean): void => {
    setOpen(false);
    if (giveBack) moreButton()?.focus();
  };
  /** Un appui long n'agit pas (son infobulle a été montrée). */
  const unlessHeld = (run: () => void) => (): void => {
    if (held) {
      held = false;
      return;
    }
    run();
  };
  const play = (a: ObjectAction): void => {
    setOpen(false);
    playObjectAction(a.id, props.host);
    rescueFocus();
  };
  const pressMore = unlessHeld(() => (open() ? closeMore(false) : openMore()));
  /** Ligne de « … » : libellé visible, elle agit toujours ; au clavier, le focus revient à « … ». */
  const choose = (a: ObjectAction): void => {
    held = false;
    closeMore(!byPointer);
    playObjectAction(a.id, props.host);
    rescueFocus();
  };

  const onListKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMore(true);
      return;
    }
    if (e.key === "Tab") {
      closeMore(false);
      return;
    }
    const step = Object.hasOwn(MENU_STEP, e.key) ? MENU_STEP[e.key]! : undefined;
    if (step === undefined) return;
    e.preventDefault();
    const rows = [...(list?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    if (rows.length === 0) return;
    const i = rows.indexOf(e.target as HTMLButtonElement);
    rows[step(i < 0 ? 0 : i, rows.length)]?.focus();
  };
  const onKey = (e: KeyboardEvent): void => {
    // Comme `MenuBar` : les touches du moteur restent à la barre ; Ctrl ou Méta remontent.
    if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation();
    held = false;
    byPointer = false;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (open() && list?.contains(e.target as Node)) return onListKey(e);
    if (e.key === "Escape") {
      e.preventDefault();
      toScene();
      return;
    }
    const all = buttons();
    const i = all.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    if (e.key === "ArrowDown" && all[i] === moreButton()) {
      e.preventDefault();
      openMore();
      return;
    }
    const step = Object.hasOwn(BAR_STEP, e.key) ? BAR_STEP[e.key]! : undefined;
    if (step === undefined) return;
    e.preventDefault();
    focusAt(step(i, all.length));
  };

  const el = (
    <div
      ref={root}
      class="rb-object-bar"
      role="toolbar"
      aria-label={OBJECT_BAR_LABEL}
      data-object-bar
      data-side={at()?.side}
      hidden={!shown()}
      style={at() === null ? { visibility: "hidden" } : { left: `${at()!.left}px`, top: `${at()!.top}px` }}
      onKeyDown={onKey}
      onContextMenu={(e) => e.preventDefault()}
      onFocusIn={(e) => {
        inside = true;
        const i = buttons().indexOf(e.target as HTMLButtonElement);
        if (i < 0) return;
        current = i;
        syncTabs(buttons());
      }}
      onFocusOut={(e) => {
        // Comme `MenuBar` : le focus parti ailleurs ferme la liste ; un bouton retiré (relatedTarget nul) ne compte pas.
        const to = e.relatedTarget as Node | null;
        if (to === null || root === undefined || root.contains(to)) return;
        inside = false;
        if (open()) setOpen(false);
      }}
      onPointerDown={(e) => {
        downAt = Date.now();
        downType = e.pointerType;
        held = false;
        byPointer = true;
      }}
      onPointerUp={() => {
        held = downType !== "mouse" && Date.now() - downAt >= TIP_HOLD_MS;
      }}
      onPointerCancel={() => {
        held = false;
      }}
    >
      <For each={main()}>
        {(a) => (
          <IconButton
            icon={a.icon}
            label={a.label}
            shortcut={barShortcut(a.shortcut)}
            attrs={{ "data-selection-action": a.id, "data-object-button": "" }}
            onPress={unlessHeld(() => play(a))}
          />
        )}
      </For>
      <Show when={more().length > 0}>
        <IconButton icon="ellipsis" label={MORE_LABEL} attrs={{ "data-object-more": "", "data-object-button": "", "aria-haspopup": "menu" }} onPress={pressMore} />
      </Show>
      <Show when={open()}>
        <div
          ref={list}
          role="menu"
          aria-label={MORE_LABEL}
          data-menu-list
          data-object-menu
          style={listAt() === null ? {} : { left: `${listAt()!.left}px`, top: `${listAt()!.top}px` }}
        >
          <For each={more()}>
            {(a) => {
              const keys = barShortcut(a.shortcut);
              return (
                <button type="button" role="menuitem" data-selection-action={a.id} aria-keyshortcuts={keys?.aria ?? undefined} onClick={() => choose(a)}>
                  <Icon name={a.icon} />
                  <span>{a.label}</span>
                  <Show when={keys}>{(k) => <span class="rb-menu-key" data-shortcut aria-hidden="true">{k().text}</span>}</Show>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  ) as HTMLDivElement;
  props.mount.append(el);
  onCleanup(() => el.remove());

  createEffect(() => {
    void props.view();
    void main().length;
    void more().length;
    void camTick();
    placeNow();
  });
  onMount(() => {
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(() => placeNow());
    ro.observe(props.mount);
    onCleanup(() => ro.disconnect());
  });
  createEffect(() => {
    const off = props.engine().onCamera(() => setCamTick((n) => n + 1));
    onCleanup(off);
  });
  createEffect(() => {
    const st = props.stage();
    const press = (e: PointerEvent): void => {
      setOpen(false);
      setDown((s) => new Set(s).add(e.pointerId));
    };
    st.addEventListener("pointerdown", press);
    onCleanup(() => st.removeEventListener("pointerdown", press));
  });
  createEffect(() => {
    if (!visible()) setOpen(false);
  });
  createEffect(() => {
    void main();
    void more().length;
    void visible();
    const all = buttons();
    if (current >= all.length) current = Math.max(0, all.length - 1);
    syncTabs(all);
    moreButton()?.setAttribute("aria-expanded", open() ? "true" : "false");
    untrack(rescueFocus);
  });

  onMount(() => {
    const up = (e: PointerEvent): void => {
      if (!down().has(e.pointerId)) return;
      setDown((s) => {
        const n = new Set(s);
        n.delete(e.pointerId);
        return n;
      });
    };
    const key = (e: KeyboardEvent): void => {
      if (!shown() || !objectMenuKey(keyOf(e))) return;
      e.preventDefault();
      focusAt(0);
    };
    const outside = (e: Event): void => {
      if (open() && root !== undefined && !root.contains(e.target as Node | null)) setOpen(false);
    };
    win.addEventListener("pointerup", up);
    win.addEventListener("pointercancel", up);
    win.addEventListener("keydown", key);
    doc.addEventListener("pointerdown", outside, true);
    onCleanup(() => {
      win.removeEventListener("pointerup", up);
      win.removeEventListener("pointercancel", up);
      win.removeEventListener("keydown", key);
      doc.removeEventListener("pointerdown", outside, true);
    });
  });

  return null;
}
