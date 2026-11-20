import { createSignal, type Accessor } from "solid-js";
import type { ProfileStore } from "../profile-store";
import type { Profile, RuntimeCapabilities } from "../toolbar";
import { builtinProfile, DEFAULT_PROFILE_ID } from "../toolbar-profiles";

export interface ActiveProfile {
  readonly profile: Accessor<Profile>;
  readonly capabilities: Accessor<RuntimeCapabilities>;
  choose(id: string): void;
  setCapabilities(c: RuntimeCapabilities): void;
}

export function createActiveProfile(store: ProfileStore, caps: RuntimeCapabilities): ActiveProfile {
  const current = (id: string): Profile => store.get(id) ?? builtinProfile(DEFAULT_PROFILE_ID)!;
  const [profile, setProfile] = createSignal<Profile>(current(store.activeId()));
  const [capabilities, setCapabilities] = createSignal<RuntimeCapabilities>(caps);
  return {
    profile,
    capabilities,
    choose(id) {
      try {
        store.setActive(id);
      } catch (e) {
        console.warn(String(e));
      }
      setProfile(current(store.activeId()));
    },
    setCapabilities: (c) => void setCapabilities(c),
  };
}
