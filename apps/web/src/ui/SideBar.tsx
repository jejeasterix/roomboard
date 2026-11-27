/**
 * Barre latérale (personnalisation-1a, décisions 19, 22, 23, 24, 26) : la barre de rôle `pages`, en îlot flottant et
 * repliable. En-tête d'onglets (Pages ; Calques au lot 2, seulement si l'application branche `layers`), rangée d'actions
 * de la barre, mode de la page montrée, liste verticale des miniatures, taille des miniatures ; onglet Calques : les
 * objets de la page, premier plan en haut (décisions 16 et 17). Repliée : poignée, onglets et Déplier restent visibles ;
 * la rangée et les listes sont cachées mais restent dans le DOM.
 *
 * Gestes : toucher montre la page ; glisser (événements de pointeur, jamais le glisser HTML5) la déplace ; appui long
 * (`TIP_HOLD_MS`) ou Maj+F10 ouvre le menu de la page. Clavier : voir `onThumbKey`. Calques : toucher une ligne
 * sélectionne l'objet (Ctrl, Cmd ou Maj : ajoute ou retire) ; glisser une ligne (`startSortDrag`) la réordonne.
 */
import { For, Show, createEffect, createSignal, onCleanup, type Accessor, type JSX } from "solid-js";
import type { LayerRow } from "../app/layer-list";
import type { ToolbarHost } from "../app/toolbar-host";
import type { PageLayout } from "../core/api";
import type { DeviceSettings, SidebarState } from "../device-settings";
import { sideActions, type ButtonSize, type Toolbar } from "../toolbar";
import { Icon, IconButton } from "./IconButton";
import { iconFor } from "./icons";
import { itemState, type ToolbarView } from "./item-state";
import { RadioChoices } from "./RadioChoices";
import { startSortDrag } from "./sort-drag";
import { TIP_HOLD_MS } from "./tooltip";

/** Ce que la barre latérale sait de la page : branché sur le moteur par l'application. */
export interface PagesPort {
  readonly ids: Accessor<readonly string[]>;
  readonly shown: Accessor<string>;
  readonly layout: Accessor<PageLayout>;
  /** Vrai si le cadre est fixé par le fond PDF (infobulle « cadre fixé par le fond PDF »). */
  readonly fixedByBackdrop: Accessor<boolean>;
  show(id: string): void;
  move(id: string, to: number): void;
  duplicate(id: string): void;
  remove(id: string): void;
  addAfter(id: string): void;
  setLayout(m: PageLayout): void;
  thumb(id: string, width: number): Promise<string | null>;
}

/** Ce que l'onglet Calques sait de la page : branché sur le moteur par l'application. */
export interface LayersPort {
  /** Lignes de la page montrée, premier plan d'abord ; lues seulement onglet montré (H14). */
  readonly rows: Accessor<readonly LayerRow[]>;
  /** Ids sélectionnés dans la scène. */
  readonly selected: Accessor<readonly string[]>;
  /** Remplace la sélection (outil Sélection). */
  select(ids: readonly string[]): void;
  /** Lâcher de la ligne `key` au rang `slot` des lignes mobiles, ligne tirée exclue (premier plan = 0). */
  drop(key: string, slot: number): void;
}

export type SideBarStore = Pick<DeviceSettings, "sidebar" | "setSidebar">;

export interface SideBarProps {
  readonly bar: Toolbar;
  readonly collapsed: Accessor<boolean>;
  readonly view: Accessor<ToolbarView>;
  readonly host: ToolbarHost;
  readonly pages: PagesPort;
  /** Onglet Calques (lot 2) ; absent : la barre n'a que l'onglet Pages. */
  readonly layers?: LayersPort;
  /** Onglet et taille des miniatures gardés sur l'appareil ; absent : mémoire seule. */
  readonly store?: SideBarStore;
  readonly size?: Accessor<ButtonSize>;
}

/** Largeur minimale CSS de la miniature par taille (petites, moyennes, grandes) : la liste ne descend pas dessous, le panneau
 * s'élargit au besoin ; au-delà (panneau plus large), la miniature prend toute la largeur utile de la ligne. */
export const THUMB_CSS: Readonly<Record<SidebarState["thumb"], number>> = { s: 160, m: 220, l: 280 };
/** Ce que la ligne prend en plus de la miniature : marges de la liste (2 × 2), de la ligne (2 × 4), numéro (24) et écart (4). */
const LINE_CHROME = 40;

export const FIXED_BY_BACKDROP = "Cadre fixé par le fond PDF";

const MODES = [
  { value: "landscape", label: "Paysage", icon: "rectangle-horizontal" },
  { value: "portrait", label: "Portrait", icon: "rectangle-vertical" },
  { value: "infinite", label: "Infini", icon: "infinity" },
] as const satisfies readonly { value: PageLayout; label: string; icon: string }[];
const SIZES = [
  { value: "s", label: "Petites", icon: "rows-2" },
  { value: "m", label: "Moyennes", icon: "rows-3" },
  { value: "l", label: "Grandes", icon: "rows-4" },
] as const;

interface MenuAt {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** Miniature d'une page : demandée à la largeur du tampon, l'ancienne image gardée jusqu'à l'arrivée de la neuve. */
function Thumb(props: { id: string; width: Accessor<number>; live: Accessor<boolean>; pages: PagesPort; version: Accessor<unknown>; layout: Accessor<unknown> }): JSX.Element {
  const [url, setUrl] = createSignal<string | null>(null);
  createEffect(() => {
    if (!props.live()) return;
    const id = props.id;
    const width = props.width();
    props.version();
    props.layout(); // le mode de la page change son cadre : la miniature se redessine
    let on = true;
    onCleanup(() => (on = false));
    void props.pages.thumb(id, width).then((u) => {
      if (on && u !== null) setUrl(u);
    });
  });
  return <Show when={url()}>{(u) => <img src={u()} alt="" />}</Show>;
}

export function SideBar(props: SideBarProps): JSX.Element {
  const pages = props.pages;
  const [thumbSize, setThumbSize] = createSignal<SidebarState["thumb"]>(props.store?.sidebar().thumb ?? "m");
  const [menu, setMenu] = createSignal<MenuAt | null>(null);
  const layers = props.layers;
  const [tab, setTab] = createSignal<SidebarState["tab"]>(layers !== undefined && props.store?.sidebar().tab === "calques" ? "calques" : "pages");
  const showLayers = (): boolean => layers !== undefined && tab() === "calques";
  let root: HTMLElement | undefined;
  let list: HTMLDivElement | undefined;
  let layerList: HTMLDivElement | undefined;
  let stopHold: (() => void) | null = null;
  let stopLayer: (() => void) | null = null;
  onCleanup(() => {
    stopHold?.();
    stopLayer?.();
  });

  const actions = () => sideActions(props.bar).filter((it) => it.hidden !== true && it.kind === "action");
  const rows = (): HTMLElement[] => [...(list?.querySelectorAll<HTMLElement>("[data-page-id]") ?? [])];
  const pixelRatio = (): number => root?.ownerDocument.defaultView?.devicePixelRatio || 1;
  const [lineWidth, setLineWidth] = createSignal(0);
  /** Largeur du tampon : la largeur réelle de la miniature (la place utile de la ligne, mesurée, au moins THUMB_CSS) × devicePixelRatio. */
  const bufferWidth = (): number => Math.round(Math.max(lineWidth(), THUMB_CSS[thumbSize()]) * pixelRatio());
  const index = (id: string): number => pages.ids().indexOf(id);
  /** Après un déplacement (le nœud est repris par le DOM) : le focus revient à la miniature. */
  const refocus = (id: string): void => {
    queueMicrotask(() => rows().find((r) => r.dataset["pageId"] === id)?.focus());
  };
  const moveTo = (id: string, to: number): void => {
    const n = pages.ids().length;
    const target = Math.max(0, Math.min(n - 1, to));
    if (target === index(id)) return;
    pages.move(id, target);
    refocus(id);
  };

  const openMenu = (id: string, el: HTMLElement): void => {
    const r = el.getBoundingClientRect();
    setMenu({ id, x: Math.round(r.right + 8), y: Math.round(r.top) });
  };
  const closeMenu = (): void => {
    setMenu(null);
  };
  createEffect(() => {
    if (menu() === null) return;
    const doc = root?.ownerDocument;
    if (doc === undefined) return;
    const away = (e: Event): void => {
      if (!(e.target instanceof Node) || !root?.querySelector("[data-side-menu]")?.contains(e.target)) closeMenu();
    };
    doc.addEventListener("pointerdown", away, true);
    onCleanup(() => doc.removeEventListener("pointerdown", away, true));
  });

  const onDown = (e: PointerEvent, id: string): void => {
    closeMenu();
    stopHold?.();
    const el = e.currentTarget as HTMLElement;
    const win = el.ownerDocument.defaultView;
    let held = false;
    let abort: () => void = () => undefined;
    const timer = win?.setTimeout(() => {
      held = true;
      abort();
      openMenu(id, el);
    }, TIP_HOLD_MS);
    const clear = (): void => {
      if (timer !== undefined) win?.clearTimeout(timer);
    };
    abort = startSortDrag(e, {
      rows,
      scroller: list!,
      from: index(id),
      moved: clear,
      drop: (to) => {
        clear();
        pages.move(id, to);
      },
      tap: () => {
        clear();
        if (!held) pages.show(id);
      },
      cancel: clear,
    });
    stopHold = () => {
      clear();
      abort();
    };
  };

  const stop = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };
  /** Entrée et Espace : le clic natif (détail 0). ↑ ↓ : focus voisine. Ctrl+↑ ↓, Ctrl+Début Fin : déplacer. Suppr, Retour
   *  arrière : retirer. Maj+F10, Menu : menu. Échap : le focus quitte la barre. Ces touches ne vont pas au moteur. */
  const onThumbKey = (e: KeyboardEvent, id: string): void => {
    const i = index(id);
    const last = pages.ids().length - 1;
    const el = e.currentTarget as HTMLElement;
    const key = e.key;
    const mod = e.ctrlKey || e.metaKey;
    if (key === "ArrowUp" || key === "ArrowDown") {
      stop(e);
      const step = key === "ArrowUp" ? -1 : 1;
      if (mod) moveTo(id, i + step);
      else rows()[i + step]?.focus();
    } else if ((key === "Home" || key === "End") && mod) {
      stop(e);
      moveTo(id, key === "Home" ? 0 : last);
    } else if (key === "Delete" || key === "Backspace") {
      stop(e);
      pages.remove(id);
    } else if (key === "ContextMenu" || (key === "F10" && e.shiftKey)) {
      stop(e);
      openMenu(id, el);
    } else if (key === "Escape") {
      stop(e);
      if (menu() !== null) return closeMenu();
      const scene = el.ownerDocument.querySelector<HTMLElement>(".rb-stage[tabindex], main.rb-stages [tabindex]");
      if (scene !== null) scene.focus({ preventScroll: true });
      else el.blur();
    }
  };

  const choose = (v: SidebarState["thumb"]): void => {
    setThumbSize(v);
    props.store?.setSidebar({ tab: tab(), thumb: v });
  };
  const openTab = (t: SidebarState["tab"]): void => {
    if (t === "calques" && layers === undefined) return;
    closeMenu();
    setTab(t);
    props.store?.setSidebar({ tab: t, thumb: thumbSize() });
  };
  const onTabActivate = (e: KeyboardEvent, t: SidebarState["tab"]): void => {
    if (e.key !== "Enter" && e.key !== " ") return;
    stop(e);
    openTab(t);
  };

  const layerEls = (): HTMLElement[] => [...(layerList?.querySelectorAll<HTMLElement>("[data-layer]:not([data-fixed])") ?? [])];
  const pickLayer = (row: LayerRow, add: boolean): void => {
    if (layers === undefined || row.fixed) return;
    const now = layers.selected();
    if (!add) return layers.select(row.ids);
    const all = row.ids.every((id) => now.includes(id));
    layers.select(all ? now.filter((id) => !row.ids.includes(id)) : [...now, ...row.ids.filter((id) => !now.includes(id))]);
  };
  const onLayerDown = (e: PointerEvent, row: LayerRow): void => {
    if (layers === undefined || row.fixed) return;
    stopLayer?.();
    const add = e.ctrlKey || e.metaKey || e.shiftKey;
    stopLayer = startSortDrag(e, {
      rows: layerEls,
      scroller: layerList!,
      from: layerEls().findIndex((r) => r.dataset["layer"] === row.key),
      moved: () => undefined,
      drop: (to) => layers.drop(row.key, to),
      tap: () => pickLayer(row, add),
      cancel: () => undefined,
    });
  };
  const onLayerKey = (e: KeyboardEvent): void => {
    const mod = e.ctrlKey || e.metaKey;
    const el = e.currentTarget as HTMLElement;
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !mod) {
      stop(e);
      const els = layerEls();
      els[els.indexOf(el) + (e.key === "ArrowUp" ? -1 : 1)]?.focus();
    } else if (e.key === "Escape") {
      stop(e);
      const scene = el.ownerDocument.querySelector<HTMLElement>(".rb-stage[tabindex], main.rb-stages [tabindex]");
      if (scene !== null) scene.focus({ preventScroll: true });
      else el.blur();
    }
  };
  /** Lignes calculées seulement onglet montré et barre dépliée (H14). */
  const layerRows = (): readonly LayerRow[] => (showLayers() && !props.collapsed() ? layers!.rows() : []);
  const onTabKey = (e: KeyboardEvent): void => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const tabs = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')];
    const at = tabs.indexOf(e.target as HTMLElement);
    tabs[(at + (e.key === "ArrowLeft" ? -1 : 1) + tabs.length) % tabs.length]?.focus();
  };
  const menuItems = (id: string): readonly { key: string; label: string; disabled: boolean; run: () => void }[] => {
    const i = index(id);
    const n = pages.ids().length;
    return [
      { key: "add-after", label: "Insérer une page après", disabled: false, run: () => pages.addAfter(id) },
      { key: "duplicate", label: "Dupliquer", disabled: false, run: () => pages.duplicate(id) },
      { key: "remove", label: "Retirer", disabled: n <= 1, run: () => pages.remove(id) },
      { key: "up", label: "Monter", disabled: i <= 0, run: () => moveTo(id, i - 1) },
      { key: "down", label: "Descendre", disabled: i < 0 || i >= n - 1, run: () => moveTo(id, i + 1) },
    ];
  };
  const onMenuKey = (e: KeyboardEvent, m: MenuAt): void => {
    const items = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')];
    const at = items.indexOf(e.target as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      stop(e);
      items[(at + (e.key === "ArrowUp" ? -1 : 1) + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      stop(e);
      closeMenu();
      rows().find((r) => r.dataset["pageId"] === m.id)?.focus();
    }
  };

  return (
    <nav
      ref={root}
      class="rb-bar rb-side"
      data-toolbar={props.bar.id}
      data-role="pages"
      data-dock={props.bar.dock}
      data-size={props.size?.() ?? "m"}
      data-folded={props.collapsed() ? "1" : undefined}
      aria-label="Pages"
    >
      <div role="tablist" class="rb-side-tabs" aria-label="Barre latérale" onKeyDown={onTabKey}>
        <div class="rb-tab" role="tab" tabIndex={0} data-side-tab="pages" aria-selected={tab() === "pages" ? "true" : "false"} onClick={() => openTab("pages")} onKeyDown={(e) => onTabActivate(e, "pages")}>
          <Icon name="panel-left" />
          <span class="rb-tab-title">Pages</span>
        </div>
        <Show when={layers !== undefined}>
          <div class="rb-tab" role="tab" tabIndex={0} data-side-tab="calques" aria-selected={tab() === "calques" ? "true" : "false"} onClick={() => openTab("calques")} onKeyDown={(e) => onTabActivate(e, "calques")}>
            <Icon name="layers" />
            <span class="rb-tab-title">Calques</span>
          </div>
        </Show>
      </div>
      <div class="rb-side-actions" hidden={props.collapsed() || tab() !== "pages"}>
        <For each={actions()}>
          {(item) => (
            <IconButton
              icon={iconFor(item)}
              label={item.label}
              disabled={itemState(item, props.view()).disabled}
              attrs={{ "data-item": item.id }}
              onPress={() => props.host.runAction(item.action ?? item.id)}
            />
          )}
        </For>
      </div>
      <div class="rb-side-body" hidden={props.collapsed()}>
        <div class="rb-side-pane" data-pane="pages" hidden={tab() !== "pages"}>
        <div class="rb-side-group" data-side-mode title={pages.fixedByBackdrop() ? FIXED_BY_BACKDROP : undefined}>
          <span class="rb-side-label">Mode</span>
          <RadioChoices<PageLayout> name="page-mode" label="Mode de la page" look="segment" options={MODES} value={pages.layout()} choose={(m) => pages.setLayout(m)} />
        </div>
        <div
          ref={(el) => {
            list = el;
            const w = (): number => el.clientWidth - LINE_CHROME;
            if (w() > 0) setLineWidth(w());
            if (typeof ResizeObserver === "undefined") return;
            const ro = new ResizeObserver(() => w() > 0 && setLineWidth(w()));
            ro.observe(el);
            onCleanup(() => ro.disconnect());
          }}
          class="rb-pages-list"
          data-thumb={thumbSize()}
          style={{ "--rb-thumb": `${THUMB_CSS[thumbSize()]}px` }}
        >
          <For each={pages.ids()}>
            {(id, n) => (
              <button
                type="button"
                class="rb-page rb-page-thumb"
                data-page={n() + 1}
                data-page-id={id}
                aria-current={pages.shown() === id ? "page" : undefined}
                aria-label={`Page ${n() + 1}`}
                tabIndex={pages.shown() === id ? 0 : -1}
                onPointerDown={(e) => onDown(e, id)}
                onClick={(e) => e.detail === 0 && pages.show(id)}
                onKeyDown={(e) => onThumbKey(e, id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMenu(id, e.currentTarget);
                }}
              >
                <span class="rb-page-num">{n() + 1}</span>
                <span class="rb-page-img">
                  <Thumb id={id} width={bufferWidth} live={() => !props.collapsed() && tab() === "pages"} pages={pages} version={() => (props.view() as { version?: number }).version} layout={pages.layout} />
                </span>
              </button>
            )}
          </For>
        </div>
        <div class="rb-side-group">
          <span class="rb-side-label">Taille</span>
          <RadioChoices<SidebarState["thumb"]> name="page-thumb" label="Taille des miniatures" look="segment" options={SIZES} value={thumbSize()} choose={choose} />
        </div>
        </div>
        <Show when={layers !== undefined}>
          <div class="rb-side-pane" data-pane="calques" hidden={!showLayers()}>
            <div ref={layerList} class="rb-layers-list" role="group" aria-label="Objets de la page, du premier plan à l'arrière-plan">
              <For each={layerRows()}>
                {(row) => (
                  <Show
                    when={!row.fixed}
                    fallback={
                      <div class="rb-layer" data-layer={row.key} data-fixed="1" data-kind={row.kind}>
                        <Icon name={row.icon} />
                        <span class="rb-layer-name">{row.label}</span>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      class="rb-layer"
                      data-layer={row.key}
                      data-kind={row.kind}
                      aria-pressed={row.ids.every((id) => layers!.selected().includes(id)) ? "true" : "false"}
                      onPointerDown={(e) => onLayerDown(e, row)}
                      onClick={(e) => e.detail === 0 && pickLayer(row, e.ctrlKey || e.metaKey || e.shiftKey)}
                      onKeyDown={onLayerKey}
                    >
                      <Icon name={row.icon} />
                      <span class="rb-layer-name">{row.label}</span>
                    </button>
                  </Show>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
      <Show when={menu()}>
        {(m) => (
          <div class="rb-side-menu" role="menu" data-side-menu style={{ left: `${m().x}px`, top: `${m().y}px` }} onKeyDown={(e) => onMenuKey(e, m())}>
            <For each={menuItems(m().id)}>
              {(it) => (
                <button
                  type="button"
                  role="menuitem"
                  data-menu={it.key}
                  disabled={it.disabled}
                  onClick={() => {
                    closeMenu();
                    it.run();
                  }}
                >
                  {it.label}
                </button>
              )}
            </For>
          </div>
        )}
      </Show>
    </nav>
  );
}
