import { For, type Accessor, type JSX } from "solid-js";
import type { ButtonSize, Toolbar, ToolItem } from "../toolbar";
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

/** C13 (D17) : libellé visible court pour que la barre tienne sur une rangée ; le libellé complet reste en `title` et `aria-label`. */
const SHORT: Readonly<Record<string, string>> = { "export-iwb": "Copie .iwb…", "export-ubz": "Copie .ubz…" };

export const pagesLabel = (v: PagesView): string => `${v.pageIndex + 1} / ${v.pageCount}`;

/** Champs de la vue sans effet sur les pages ; l'application passe la vue complète (`ToolbarView`), qui les remplace. */
const NEUTRAL: Omit<ToolbarView, keyof PagesView> = { tool: "", eraserMode: "partial", canUndo: false, canRedo: false, tableCell: null };

/** État d'un élément par la table de T94 (`itemState`), la même que celle de la barre d'outils. */
const isDisabled = (item: ToolItem, v: PagesView): boolean => itemState(item, { ...NEUTRAL, ...v }).disabled;

export function PagesBar(props: PagesBarProps): JSX.Element {
  const numbers = (): number[] => Array.from({ length: Math.max(0, props.view().pageCount) }, (_, i) => i + 1);
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
          <button
            type="button"
            data-item={item.id}
            title={item.label}
            aria-label={item.label}
            disabled={isDisabled(item, props.view())}
            onClick={() => props.runAction(item.action ?? item.id)}
          >
            {SHORT[item.id] ?? item.label}
          </button>
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
      <span id="pages" class="rb-pages-count">{pagesLabel(props.view())}</span>
    </nav>
  );
}
