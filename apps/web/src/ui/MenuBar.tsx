import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, type Accessor, type JSX } from "solid-js";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ButtonSize, Toolbar as Bar, ToolItem } from "../toolbar";
import { Icon, TipBubble, tipPointerHandlers } from "./IconButton";
import { iconFor } from "./icons";
import { itemState, type ToolbarView } from "./item-state";
import { ENGINE_KEYS } from "../app/table-picker";
import { buttonShortcut } from "./shortcuts";
import { TIP_GAP, createTip } from "./tooltip";

/**
 * Rôle `menu` (design-l2, L2-6, D-DS1) : un bouton Menu ; la liste s'ouvre sous lui, lignes icône + libellé,
 * `button[role="menuitem"][data-item]` (état et libellé par `itemState`). La liste reste dans le DOM, `hidden` quand
 * elle est fermée. Clavier : focus sur la première ligne à l'ouverture, flèches (bouclage), Début, Fin, Entrée ou
 * Espace (bouton natif), Échap rend le focus au bouton, Tab ferme sans le rendre. Même rendu en bande. Styles : `[data-menu-list]` dans rb.css.
 */
export const MENU_LABEL = "Menu";

/** Rang de la ligne suivante par touche (table, jamais un branchement sur la touche) ; OG41 : partagée avec la barre d'objet. */
export const MENU_STEP: Readonly<Record<string, (i: number, n: number) => number>> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_i, n) => n - 1,
};

/** Place la liste en position fixe : sous le bouton (au-dessus s'il manque la place), entiers, bornée à la fenêtre. */
export function placeMenu(
  anchor: { left: number; right: number; top: number; bottom: number },
  list: { width: number; height: number },
  view: { width: number; height: number },
): { left: number; top: number } {
  const below = anchor.bottom + TIP_GAP;
  const top = below + list.height <= view.height ? below : anchor.top - TIP_GAP - list.height;
  const left = Math.min(Math.max(0, anchor.left), Math.max(0, view.width - list.width));
  return { left: Math.round(left), top: Math.round(Math.max(0, top)) };
}

export interface MenuBarProps {
  readonly bar: Bar;
  /** Éléments montrés, déjà filtrés (`itemsForMode`) ; une zone de dépôt n'est pas rendue. */
  readonly items: Accessor<readonly ToolItem[]>;
  readonly view: Accessor<ToolbarView>;
  readonly size: Accessor<ButtonSize>;
  readonly host: Pick<ToolbarHost, "setTool" | "runAction">;
}

function Row(props: { item: ToolItem; view: Accessor<ToolbarView>; press: () => void }): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.view()));
  // OG27 : texte et annonce lus de la table par la même aide que la barre d'outils (`buttonShortcut`).
  const keys = buttonShortcut(props.item.id);
  const icon = (): string | null => iconFor(props.item, st().icon);
  return (
    <button type="button" role="menuitem" data-item={props.item.id} aria-keyshortcuts={keys?.aria ?? undefined} disabled={st().disabled} onClick={() => props.press()}>
      <Show when={icon()} fallback={<span class="rb-menu-blank" aria-hidden="true" />}>
        {(name) => <Icon name={name()} />}
      </Show>
      <span>{st().label}</span>
      <Show when={keys}>{(k) => <span class="rb-menu-key" data-shortcut aria-hidden="true">{k().text}</span>}</Show>
    </button>
  );
}

export function MenuBar(props: MenuBarProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const tip = createTip();
  let root: HTMLDivElement | undefined;
  let toggle: HTMLButtonElement | undefined;
  let list: HTMLDivElement | undefined;
  const rows = (): HTMLButtonElement[] => [...(list?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [])];
  const close = (refocus: boolean): void => {
    setOpen(false);
    if (refocus) toggle?.focus();
  };
  const place = (): void => {
    if (list === undefined || toggle === undefined) return;
    const r = list.getBoundingClientRect();
    const at = placeMenu(toggle.getBoundingClientRect(), { width: r.width, height: r.height }, { width: window.innerWidth, height: window.innerHeight });
    list.style.left = `${at.left}px`;
    list.style.top = `${at.top}px`;
  };
  /** Dernier geste dans la liste : à la souris, le focus n'est pas rendu au bouton Menu (son infobulle resterait). */
  let byPointer = false;
  const show = (): void => {
    byPointer = false;
    setOpen(true);
    queueMicrotask(() => {
      place();
      rows()[0]?.focus();
    });
  };
  // Fermé par un appui hors de lui ; écoute posée à l'ouverture, retirée à la fermeture et au démontage.
  const outside = (e: PointerEvent): void => {
    if (root !== undefined && !root.contains(e.target as Node)) close(false);
  };
  createEffect(
    on(open, (o) => {
      if (!o) return;
      const doc = root?.ownerDocument ?? document;
      const win = doc.defaultView ?? window;
      doc.addEventListener("pointerdown", outside, true);
      win.addEventListener("resize", place);
      onCleanup(() => {
        doc.removeEventListener("pointerdown", outside, true);
        win.removeEventListener("resize", place);
      });
    }),
  );
  const onKey = (e: KeyboardEvent): void => {
    // Comme la grille du tableau : les touches du moteur restent au menu ; Ctrl ou Méta remontent.
    byPointer = false;
    if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation();
    if (e.key === "Tab") {
      close(false); // pas de preventDefault : le focus suit Tab
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (!Object.hasOwn(MENU_STEP, e.key)) return;
    e.preventDefault();
    const all = rows();
    if (all.length === 0) return;
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    all[MENU_STEP[e.key]!(Math.max(i, 0), all.length)]?.focus();
  };
  const choose = (run: () => void) => (): void => {
    close(!byPointer && root?.contains(document.activeElement) === true);
    run();
  };
  /** Rendu par sorte d'élément (table) ; zone de dépôt : rien. */
  const RENDER: Readonly<Record<ToolItem["kind"], (it: ToolItem) => JSX.Element>> = {
    tool: (it) => {
      const preset = typeof it.options?.preset === "string" ? it.options.preset : undefined;
      return <Row item={it} view={props.view} press={choose(() => (preset === undefined ? props.host.setTool(it.tool ?? "") : props.host.setTool(it.tool ?? "", preset)))} />;
    },
    action: (it) => <Row item={it} view={props.view} press={choose(() => props.host.runAction(it.action ?? ""))} />,
    separator: () => <span class="rb-menu-sep" role="separator" />,
    dropzone: () => null,
  };
  const handlers = tipPointerHandlers(tip);
  return (
    <div
      ref={root}
      class="rb-bar rb-menu"
      data-toolbar={props.bar.id}
      data-role={props.bar.role}
      data-dock={props.bar.dock}
      data-size={props.size()}
      role="toolbar"
      aria-label={MENU_LABEL}
      onFocusOut={(e) => {
        const to = e.relatedTarget as Node | null;
        if (open() && to !== null && root !== undefined && !root.contains(to)) close(false);
      }}
    >
      <button
        ref={toggle}
        type="button"
        class="rb-ib"
        data-menu-toggle
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label={MENU_LABEL}
        onClick={() => (open() ? close(false) : show())}
        onPointerEnter={handlers.onPointerEnter}
        onPointerLeave={handlers.onPointerLeave}
        onPointerDown={handlers.onPointerDown}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        onFocus={() => tip.focus()}
        onBlur={() => tip.blur(document.hasFocus())}
      >
        <Icon name="menu" />
        <span class="rb-sr">{MENU_LABEL}</span>
      </button>
      <TipBubble tip={tip} label={MENU_LABEL} anchor={() => toggle!} />
      <div ref={list} role="menu" aria-label={MENU_LABEL} data-menu-list hidden={!open()} onKeyDown={onKey} onPointerDown={() => (byPointer = true)}>
        <For each={props.items()}>{(it) => RENDER[it.kind](it)}</For>
      </div>
    </div>
  );
}
