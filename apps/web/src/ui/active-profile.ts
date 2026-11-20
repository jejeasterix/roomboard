import { createSignal, type Accessor } from "solid-js";
import type { ProfileStore } from "../profile-store";
import type { Profile, RuntimeCapabilities } from "../toolbar";
import { builtinProfile, DEFAULT_PROFILE_ID } from "../toolbar-profiles";

export interface ActiveProfile {
  readonly profile: Accessor<Profile>;
  /** Liste du magasin, relue par `refresh` (C1, DAC1-2). */
  readonly profiles: Accessor<readonly Profile[]>;
  readonly capabilities: Accessor<RuntimeCapabilities>;
  /** Rend `id` actif (id inconnu : avertissement, profil inchangé), puis relit le magasin. */
  choose(id: string): void;
  /** Relit la liste et le profil actif après un changement du magasin (enregistrer, importer, remettre à zéro). */
  refresh(): void;
  setCapabilities(c: RuntimeCapabilities): void;
}

export function createActiveProfile(store: ProfileStore, caps: RuntimeCapabilities): ActiveProfile {
  const current = (id: string): Profile => store.get(id) ?? builtinProfile(DEFAULT_PROFILE_ID)!;
  const [profile, setProfile] = createSignal<Profile>(current(store.activeId()));
  const [profiles, setProfiles] = createSignal<readonly Profile[]>(store.list(), { equals: false });
  const [capabilities, setCapabilities] = createSignal<RuntimeCapabilities>(caps);
  const refresh = (): void => {
    setProfiles(store.list());
    setProfile(current(store.activeId()));
  };
  return {
    profile,
    profiles,
    capabilities,
    choose(id) {
      try {
        store.setActive(id);
      } catch (e) {
        console.warn(String(e));
      }
      refresh();
    },
    refresh,
    setCapabilities: (c) => void setCapabilities(c),
  };
}
