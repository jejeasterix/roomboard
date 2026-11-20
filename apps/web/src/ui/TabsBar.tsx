import { For, Show, type Accessor, type JSX } from "solid-js";

export interface TabView {
  readonly id: string;
  readonly title: string;
  readonly dirty: boolean;
  readonly kind: "board" | "annotation";
}

export interface TabsBarProps {
  readonly tabs: Accessor<readonly TabView[]>;
  readonly active: Accessor<string | null>;
  activate(id: string): void;
  close(id: string): void;
  newTab(): void;
}

export function TabsBar(props: TabsBarProps): JSX.Element {
  return (
    <div role="tablist" data-tabs class="rb-tabs">
      <For each={props.tabs()}>
        {(t) => (
          <div
            class="rb-tab"
            role="tab"
            data-tab={t.id}
            data-kind={t.kind}
            data-dirty={t.dirty ? "1" : undefined}
            aria-selected={props.active() === t.id}
            onClick={() => props.activate(t.id)}
          >
            <span>{t.title}</span>
            <Show when={t.dirty}>
              <span class="rb-tab-dirty" aria-hidden="true">
                •
              </span>
            </Show>
            <button
              type="button"
              class="rb-tab-close"
              data-tab-close={t.id}
              aria-label={`Fermer ${t.title}`}
              onClick={(e) => {
                e.stopPropagation();
                props.close(t.id);
              }}
            >
              ×
            </button>
          </div>
        )}
      </For>
      <button type="button" class="rb-tab-new" data-tab-new aria-label="Nouvel onglet" onClick={() => props.newTab()}>
        +
      </button>
    </div>
  );
}
