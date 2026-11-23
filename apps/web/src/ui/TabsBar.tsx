import { createMemo, For, Show, type Accessor, type JSX } from "solid-js";
import { UNTITLED } from "../platform/files";

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

/** C11a (P3) : l'onglet d'annotation se lit « Annotation », puis « Annotation — nom » une fois enregistré. */
export function annotationTabLabel(title: string): string {
  return title === UNTITLED || title === "" ? "Annotation" : `Annotation — ${title}`;
}

export function TabsBar(props: TabsBarProps): JSX.Element {
  // Nœuds stables : on itère sur les ids (égalité par contenu) et chaque onglet relit sa vue par id. Des objets neufs à
  // chaque impulsion recréaient les nœuds entre mousedown et mouseup, et le navigateur ne délivrait plus de `click`.
  const ids = createMemo(
    () => props.tabs().map((t) => t.id),
    [],
    { equals: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]) },
  );
  return (
    <div role="tablist" data-tabs class="rb-tabs">
      <For each={ids()}>
        {(id) => {
          const view = createMemo(() => props.tabs().find((x) => x.id === id));
          const t = {
            get id() { return id; },
            get title() { return view()?.title ?? ""; },
            get dirty() { return view()?.dirty ?? false; },
            get kind() { return view()?.kind ?? "board"; },
          };
          return (
          <div
            class="rb-tab"
            role="tab"
            data-tab={t.id}
            data-kind={t.kind}
            data-dirty={t.dirty ? "1" : undefined}
            aria-selected={props.active() === t.id}
            onClick={() => props.activate(t.id)}
          >
            <span>{t.kind === "annotation" ? annotationTabLabel(t.title) : t.title}</span>
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
          );
        }}
      </For>
      <button type="button" class="rb-tab-new" data-tab-new aria-label="Nouvel onglet" onClick={() => props.newTab()}>
        +
      </button>
    </div>
  );
}
