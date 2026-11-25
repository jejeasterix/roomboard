import { For, createMemo, type Accessor, type JSX } from "solid-js";
import type { ToolbarHost } from "../app/toolbar-host";
import type { PointerMode } from "../platform/annotation-port";
import type { ToolItem } from "../toolbar";
import { IconButton } from "./IconButton";
import { itemState, type ToolbarView } from "./item-state";

interface Segment {
  readonly mode: PointerMode;
  readonly label: string;
  readonly icon: string;
}
/** Segments dans l'ordre de la maquette 02 : « Dessin » (`pen-line`, distinct de l'outil Stylo, L1-3) puis « Souris ». */
export const POINTER_SEGMENTS: readonly Segment[] = Object.freeze([
  { mode: "draw", label: "Dessin", icon: "pen-line" },
  { mode: "mouse", label: "Souris", icon: "pointer" },
]);

export interface PointerSwitchProps {
  readonly item: ToolItem;
  readonly view: Accessor<ToolbarView>;
  readonly host: ToolbarHost;
}

/**
 * Commande segmentée Dessin / Souris (cadrage design-l4, L4-8, Q3) : deux boutons à icône accolés sur un fond commun.
 * Le segment de l'état présent est enfoncé ; le segment inactif porte `data-item` (c'est lui qui bascule, H2) et reprend
 * le libellé et l'icône qu'`ACTION_STATE` rend pour l'action. Un clic appelle `host.pointer(mode)` (L4-9 : sans
 * aller-retour au double clic) ; hôte sans `pointer` : le segment inactif rejoue l'action, l'autre ne fait rien.
 */
export function PointerSwitch(props: PointerSwitchProps): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.view()));
  const current = (): PointerMode => (props.view().annotation?.pointer === "mouse" ? "mouse" : "draw");
  const press = (mode: PointerMode): void => {
    if (props.host.pointer !== undefined) props.host.pointer(mode);
    else if (mode !== current()) props.host.runAction(props.item.action ?? "");
  };
  return (
    <span class="rb-seg" role="group" aria-label="Pointeur">
      <For each={POINTER_SEGMENTS}>
        {(seg) => {
          const on = (): boolean => current() === seg.mode;
          return (
            <IconButton
              icon={on() ? seg.icon : (st().icon ?? seg.icon)}
              label={on() ? seg.label : st().label}
              pressed={on()}
              disabled={st().disabled}
              attrs={on() ? { "data-segment": seg.mode } : { "data-segment": seg.mode, "data-item": props.item.id }}
              onPress={() => press(seg.mode)}
            />
          );
        }}
      </For>
    </span>
  );
}
