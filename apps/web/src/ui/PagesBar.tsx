import { For, Show, createMemo, type Accessor, type JSX } from "solid-js";
import type { ButtonSize, Toolbar, ToolItem } from "../toolbar";
import { IconButton } from "./IconButton";
import { iconFor } from "./icons";
import { itemState, type ToolbarView } from "./item-state";

export interface PagesView {
  readonly pageIndex: number;
  readonly pageCount: number;
}

export interface PagesBarProps {
  readonly bar: Toolbar;
  readonly items: Accessor<readonly ToolItem[]>;
  readonly view: Accessor<PagesView>;
  readonly size: Accessor<ButtonSize>;
  runAction(id: string): void;
  goTo(index: number): void;
}

export const pagesLabel = (v: PagesView): string => `${v.pageIndex + 1} / ${v.pageCount}`;

/** Champs de la vue sans effet sur les pages ; l'application passe la vue complète (`ToolbarView`), qui les remplace. */
const NEUTRAL: Omit<ToolbarView, keyof PagesView> = { tool: "", eraserMode: "partial", canUndo: false, canRedo: false, tableCell: null };

/** État d'un élément par la table de T94 (`itemState`), la même que celle de la barre d'outils. */
const isDisabled = (item: ToolItem, v: PagesView): boolean => itemState(item, { ...NEUTRAL, ...v }).disabled;

const isAction = (it: ToolItem | undefined, action: string): boolean => it !== undefined && it.kind === "action" && it.action === action;

/** design-l2 (L2-18) : `#pages` se pose entre Précédente et Suivante quand elles se suivent ; rend l'id de Précédente, ou null (compteur en fin de barre). */
export function counterAfter(items: readonly ToolItem[]): string | null {
  const i = items.findIndex((it) => isAction(it, "page-prev"));
  return i >= 0 && isAction(items[i + 1], "page-next") ? items[i]!.id : null;
}

/** Barre des pages (design-l2 L2-18) : boutons à icône comme la barre d'outils, liste des numéros, compteur `#pages`. */
export function PagesBar(props: PagesBarProps): JSX.Element {
  const numbers = (): number[] => Array.from({ length: Math.max(0, props.view().pageCount) }, (_, i) => i + 1);
  const after = createMemo(() => counterAfter(props.items()));
  const counter = (): JSX.Element => (
    <span id="pages" class="rb-pages-count">{pagesLabel(props.view())}</span>
  );
  return (
    <nav
      class="rb-bar"
      data-toolbar={props.bar.id}
      data-role="pages"
      data-dock={props.bar.dock}
      data-size={props.size()}
      aria-label="Pages"
    >
      <For each={props.items()}>
        {(item) => (
          <>
            <IconButton
              icon={iconFor(item)}
              label={item.label}
              disabled={isDisabled(item, props.view())}
              attrs={{ "data-item": item.id }}
              onPress={() => props.runAction(item.action ?? item.id)}
            />
            <Show when={after() === item.id}>{counter()}</Show>
          </>
        )}
      </For>
      <div class="rb-pages-list">
        <For each={numbers()}>
          {(n) => (
            <button
              type="button"
              class="rb-page"
              data-page={n}
              aria-current={n === props.view().pageIndex + 1 ? "page" : undefined}
              onClick={() => props.goTo(n - 1)}
            >
              {n}
            </button>
          )}
        </For>
      </div>
      <Show when={after() === null}>{counter()}</Show>
    </nav>
  );
}
