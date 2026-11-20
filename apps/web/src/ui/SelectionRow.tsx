/** Rangée « Sélection » (C3, Z13, HZ1-4) : outil Sélection actif ; cinq actions, hors catalogue des profils (C7b R13). */
import { For, Show, type Accessor, type JSX } from "solid-js";
import type { SelectionAction, ToolbarHost } from "../app/toolbar-host";
import { TOOL_TABLE } from "../toolbar";
import type { ToolbarView } from "./item-state";

export const SELECTION_ACTIONS: readonly { readonly id: SelectionAction; readonly label: string }[] = Object.freeze([
  { id: "group", label: "Grouper" },
  { id: "ungroup", label: "Dégrouper" },
  { id: "copy", label: "Copier" },
  { id: "paste", label: "Coller" },
  { id: "export", label: "Exporter" },
]);

/** Table de prédicats (la garde de src/ui interdit `switch`) : vrai = bouton grisé. */
const DISABLED: Readonly<Record<SelectionAction, (v: ToolbarView) => boolean>> = {
  group: (v) => (v.selectionUnits ?? 0) < 2,
  ungroup: (v) => v.selectionGrouped !== true,
  copy: (v) => (v.selection?.length ?? 0) === 0,
  export: (v) => (v.selection?.length ?? 0) === 0,
  paste: (v) => v.canPaste !== true,
};

export function selectionDisabled(a: SelectionAction, v: ToolbarView): boolean {
  return DISABLED[a](v);
}

export function SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  return (
    <Show when={props.view().tool === TOOL_TABLE["select"]?.choice}>
      <span class="rb-sep" role="separator" data-selection-sep />
      <For each={SELECTION_ACTIONS}>
        {(a) => (
          <button type="button" data-selection-action={a.id} disabled={selectionDisabled(a.id, props.view())} onClick={() => props.host.selection(a.id)}>
            {a.label}
          </button>
        )}
      </For>
    </Show>
  );
}
