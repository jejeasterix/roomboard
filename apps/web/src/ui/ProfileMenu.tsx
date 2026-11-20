import { For, type Accessor, type JSX } from "solid-js";
import type { Profile } from "../toolbar";

export interface ProfileMenuProps {
  readonly profiles: Accessor<readonly Profile[]>;
  readonly activeId: Accessor<string>;
  choose(id: string): void;
}

export function ProfileMenu(props: ProfileMenuProps): JSX.Element {
  return (
    <div role="menu" data-profiles>
      <For each={props.profiles()}>
        {(p) => (
          <button
            type="button"
            role="menuitemradio"
            data-profile={p.id}
            aria-checked={props.activeId() === p.id}
            onClick={() => props.choose(p.id)}
          >
            {p.label}
          </button>
        )}
      </For>
    </div>
  );
}
