import { For, type Accessor, type JSX } from "solid-js";
import type { ButtonSize, Toolbar, ToolItem } from "../toolbar";

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

/** Actions désactivées selon la vue (T95 la remplace par `itemState` de T94). */
const PAGE_STATE: Readonly<Record<string, (v: PagesView) => boolean>> = {
  "page-prev": (v) => v.pageIndex <= 0,
  "page-next": (v) => v.pageIndex >= v.pageCount - 1,
  "page-remove": (v) => v.pageCount <= 1,
};

const isDisabled = (item: ToolItem, v: PagesView): boolean => {
  const rule = Object.hasOwn(PAGE_STATE, item.action ?? "") ? PAGE_STATE[item.action ?? ""] : undefined;
  return rule ? rule(v) : false;
};

export function PagesBar(props: PagesBarProps): JSX.Element {
  const numbers = (): number[] => Array.from({ length: Math.max(0, props.view().pageCount) }, (_, i) => i + 1);
  return (
    <nav
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
            {item.label}
          </button>
        )}
      </For>
      <For each={numbers()}>
        {(n) => (
          <button
            type="button"
            data-page={n}
            aria-current={n === props.view().pageIndex + 1 ? "page" : undefined}
            onClick={() => props.goTo(n - 1)}
          >
            {n}
          </button>
        )}
      </For>
      <span id="pages">{pagesLabel(props.view())}</span>
    </nav>
  );
}
