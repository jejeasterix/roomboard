import { parseProfile, serializeProfile, type Profile } from "./toolbar";
import { DEFAULT_PROFILE_ID } from "./toolbar-profiles";

export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export const PROFILES_KEY = "roomboard.profils";
export const ACTIVE_KEY = "roomboard.profil-actif";

export interface ProfileStore {
  list(): readonly Profile[];
  get(id: string): Profile | null;
  isReadOnly(id: string): boolean;
  save(p: Profile): void;
  remove(id: string): void;
  activeId(): string;
  setActive(id: string): void;
  warnings(): readonly string[];
}

/** `kv` null (stockage absent ou qui lève) : mémoire seule. */
export function createProfileStore(kv: KeyValue | null, builtins: readonly Profile[]): ProfileStore {
  const warnings: string[] = [];
  const builtinIds = new Set(builtins.map((b) => b.id));
  let users: Profile[] = [];
  let active: string | null = null;

  const read = (key: string): string | null => {
    if (kv === null) return null;
    try {
      return kv.getItem(key);
    } catch (e) {
      warnings.push(`stockage illisible : ${String(e)}`);
      return null;
    }
  };
  const write = (key: string, value: string): void => {
    if (kv === null) return;
    try {
      kv.setItem(key, value);
    } catch (e) {
      warnings.push(`stockage non écrit (${key}) : ${String(e)}`);
    }
  };

  const raw = read(PROFILES_KEY);
  if (raw !== null) {
    let arr: unknown;
    try {
      arr = JSON.parse(raw);
    } catch (e) {
      warnings.push(`profils stockés illisibles : ${String(e)}`);
    }
    if (arr !== undefined && !Array.isArray(arr)) warnings.push("profils stockés illisibles : tableau attendu");
    else if (Array.isArray(arr)) {
      for (const entry of arr) {
        const r = parseProfile(entry);
        if ("errors" in r) {
          warnings.push(`profil stocké écarté : ${r.errors.join(" ; ")}`);
        } else if (builtinIds.has(r.profile.id)) {
          warnings.push(`profil stocké écarté : ${r.profile.id} est un profil livré`);
        } else if (users.some((u) => u.id === r.profile.id)) {
          warnings.push(`profil stocké écarté : ${r.profile.id} en double`);
        } else {
          users.push(r.profile);
          warnings.push(...r.warnings);
        }
      }
    }
  }
  active = read(ACTIVE_KEY);

  const persist = (): void => write(PROFILES_KEY, JSON.stringify(users.map(serializeProfile)));
  const all = (): Profile[] => [...builtins, ...users];
  const guard = (id: string): void => {
    if (builtinIds.has(id)) throw new Error(`profil en lecture seule : ${id}`);
  };

  return {
    list: () => all(),
    get: (id) => all().find((p) => p.id === id) ?? null,
    isReadOnly: (id) => builtinIds.has(id),
    save(p) {
      guard(p.id);
      users = users.some((u) => u.id === p.id) ? users.map((u) => (u.id === p.id ? p : u)) : [...users, p];
      persist();
    },
    remove(id) {
      guard(id);
      users = users.filter((u) => u.id !== id);
      if (active === id) active = null;
      persist();
    },
    activeId() {
      return active !== null && all().some((p) => p.id === active) ? active : DEFAULT_PROFILE_ID;
    },
    setActive(id) {
      if (!all().some((p) => p.id === id)) throw new Error(`profil inconnu : ${id}`);
      active = id;
      write(ACTIVE_KEY, id);
    },
    warnings: () => warnings,
  };
}

export function browserKeyValue(w: { readonly localStorage?: Storage }): KeyValue | null {
  try {
    return w.localStorage ?? null;
  } catch {
    return null;
  }
}
