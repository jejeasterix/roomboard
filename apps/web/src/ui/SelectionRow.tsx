/** Rangée « Sélection » (C3, Z13 ; OG41, D22) : outil Sélection, aucune sélection, presse-papiers interne non vide : un
 *  seul bouton icône « Coller » (Ctrl+V). Avec une sélection, la barre d'objet collée à l'objet porte les actions
 *  (`ObjectBar.tsx`, tables dans `object-bar.ts`). */
import { Show, type Accessor, type JSX } from "solid-js";
import type { ToolbarHost } from "../app/toolbar-host";
import { TOOL_TABLE } from "../toolbar";
import { IconButton } from "./IconButton";
import type { ToolbarView } from "./item-state";
import { buttonShortcut } from "./shortcuts";

export function SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  const shown = (): boolean => {
    const v = props.view();
    return v.tool === TOOL_TABLE["select"]?.choice && (v.selection?.length ?? 0) === 0 && v.canPaste === true;
  };
  return (
    <Show when={shown()}>
      <span class="rb-sep" role="separator" data-selection-sep />
      <IconButton icon="clipboard-paste" label="Coller" attrs={{ "data-selection-action": "paste" }} shortcut={buttonShortcut("paste")} onPress={() => props.host.selection("paste")} />
    </Show>
  );
}
