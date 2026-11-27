import { For, onMount, type JSX } from "solid-js";
import { isMac, SHORTCUTS, shortcutText, type Shortcut } from "./shortcuts";

export interface HelpPanelProps {
  close(): void;
}

/** Les raccourcis de la table unique `shortcuts.ts`, par groupe dans l'ordre de la table (aucune liste recopiée ici). */
export function groupedShortcuts(list: readonly Shortcut[] = SHORTCUTS): ReadonlyArray<readonly [string, readonly Shortcut[]]> {
  const groups = new Map<string, Shortcut[]>();
  for (const s of list) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  return [...groups];
}

/** Aide — raccourcis (H4) : ouverte par « ? » ou le menu ☰ ; Échap ou « Fermer » la ferme. */
export function HelpPanel(props: HelpPanelProps): JSX.Element {
  let root: HTMLElement | undefined;
  onMount(() => root?.focus());
  return (
    <section
      ref={root}
      class="rb-help-panel"
      data-panel="aide"
      aria-label="Aide — raccourcis"
      tabindex="-1"
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        props.close();
      }}
    >
      <header class="rb-help-head">
        <h2>Aide — raccourcis</h2>
        <button type="button" class="rb-help-close" data-help-close onClick={() => props.close()}>
          Fermer
        </button>
      </header>
      <For each={groupedShortcuts()}>
        {([group, rows]) => (
          <div class="rb-help-group" data-group={group}>
            <h3>{group}</h3>
            <ul>
              <For each={rows}>
                {(s) => (
                  <li data-shortcut-id={s.id}>
                    <span>{s.label}</span>
                    <kbd>{shortcutText(s.id, isMac())}</kbd>
                  </li>
                )}
              </For>
            </ul>
          </div>
        )}
      </For>
    </section>
  );
}
