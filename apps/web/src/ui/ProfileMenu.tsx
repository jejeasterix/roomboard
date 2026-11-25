import { For, Show, type Accessor, type JSX } from "solid-js";
import type { Profile } from "../toolbar";
import { Icon } from "./IconButton";

/** Menu Profil (CL5b-9, C1 P22) : les profils, puis les commandes. Aucun geste ici : les props les portent. */
export interface ProfileMenuProps {
  readonly profiles: Accessor<readonly Profile[]>;
  readonly activeId: Accessor<string>;
  /** Faux pour un profil livré sans copie : « Remettre à zéro ce profil » est grisé (P6). */
  readonly canResetCurrent: Accessor<boolean>;
  /** Vrai pour un profil de l'utilisateur seulement : « Supprimer » n'apparaît que là. */
  readonly canRemove: Accessor<boolean>;
  choose(id: string): void;
  edit(): void;
  importFile(): void;
  exportActive(): void;
  resetCurrent(): void;
  remove(): void;
  resetAll(): void;
}

/** design-l3 (L3-22) : icône de chaque commande (table, jamais un branchement sur le nom). */
const COMMAND_ICONS: Readonly<Record<string, string>> = Object.freeze({
  edit: "profile",
  import: "import",
  export: "export",
  reset: "reset",
  remove: "trash",
  "reset-all": "reset",
});

function Command(props: { name: string; label: string; run: () => void; disabled?: boolean }): JSX.Element {
  return (
    <button type="button" role="menuitem" data-profile-cmd={props.name} disabled={props.disabled ?? false} onClick={() => props.run()}>
      <Icon name={Object.hasOwn(COMMAND_ICONS, props.name) ? COMMAND_ICONS[props.name]! : "profile"} />
      <span>{props.label}</span>
    </button>
  );
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
            <Show when={props.activeId() === p.id} fallback={<span class="rb-menu-blank" aria-hidden="true" />}>
              <Icon name="check" />
            </Show>
            <span>{p.label}</span>
          </button>
        )}
      </For>
      <span class="rb-menu-sep" role="separator" />
      <Command name="edit" label="Modifier…" run={() => props.edit()} />
      <Command name="import" label="Importer…" run={() => props.importFile()} />
      <Command name="export" label="Exporter…" run={() => props.exportActive()} />
      <Command name="reset" label="Remettre à zéro ce profil" run={() => props.resetCurrent()} disabled={!props.canResetCurrent()} />
      <Show when={props.canRemove()}>
        <Command name="remove" label="Supprimer" run={() => props.remove()} />
      </Show>
      <Command name="reset-all" label="Tout remettre à zéro" run={() => props.resetAll()} />
    </div>
  );
}
