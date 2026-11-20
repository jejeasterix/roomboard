import { parseProfile, serializeProfile, type Profile } from "./toolbar";
import { DEFAULT_PROFILE_ID } from "./toolbar-profiles";

export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export const PROFILES_KEY = "roomboard.profils";
export const ACTIVE_KEY = "roomboard.profil-actif";

/**
 * Magasin des profils (T89, C1 DAC1-2). Les profils livrés sont figés ; une copie de même `id` les remplace dans
 * `list()` et `get()`, à la même place (U11, P5), et `revert` la retire. Le stockage ne contient que les profils de
 * l'utilisateur et ces copies. Aucun fichier ni boîte ici : import et export passent par `profile-file.ts` (HC2-12).
 */
export interface ProfileStore {
  list(): readonly Profile[];
  get(id: string): Profile | null;
  /** Vrai pour un profil livré, copié ou non. */
  isBuiltin(id: string): boolean;
  /** Vrai si une copie de l'utilisateur remplace le profil livré `id`. */
  hasOverride(id: string): boolean;
  /** Ajoute ou remplace ; un id livré crée ou remplace sa copie. Lève si l'écriture échoue (mémoire alors inchangée). */
  save(p: Profile): void;
  /** Retire un profil de l'utilisateur ; lève pour un id livré (passer par `revert`) ou si l'écriture échoue. */
  remove(id: string): void;
  /** Retire la copie du profil livré `id` (sans copie : rien) ; lève pour un id non livré ou si l'écriture échoue. */
  revert(id: string): void;
  /** Retire tous les profils de l'utilisateur et toutes les copies ; profil actif → `defaut`. Faux si le stockage n'a pas pu être effacé (mémoire vidée quand même). */
  resetAll(): boolean;
  activeId(): string;
  /** Rend `id` actif ; lève pour un id inconnu. Faux si le choix n'a pas pu être écrit (il reste en mémoire). */
  setActive(id: string): boolean;
  warnings(): readonly string[];
}

/** `kv` null (stockage absent ou qui lève) : mémoire seule. */
export function createProfileStore(kv: KeyValue | null, builtins: readonly Profile[]): ProfileStore {
  const warnings: string[] = [];
  const builtinIds = new Set(builtins.map((b) => b.id));
  /** Profils de l'utilisateur et copies des livrés, dans l'ordre d'enregistrement. */
  let saved: Profile[] = [];
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
  /** Faux si l'écriture a échoué (avertissement noté) ; vrai sans stockage : il n'y a rien à garder. */
  const write = (key: string, value: string): boolean => {
    if (kv === null) return true;
    try {
      kv.setItem(key, value);
      return true;
    } catch (e) {
      warnings.push(`stockage non écrit (${key}) : ${String(e)}`);
      return false;
    }
  };
  const erase = (key: string): boolean => {
    if (kv === null) return true;
    try {
      kv.removeItem(key);
      return true;
    } catch (e) {
      warnings.push(`stockage non effacé (${key}) : ${String(e)}`);
      return false;
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
        } else if (saved.some((u) => u.id === r.profile.id)) {
          warnings.push(`profil stocké écarté : ${r.profile.id} en double`);
        } else {
          saved.push(r.profile);
          warnings.push(...r.warnings);
        }
      }
    }
  }
  active = read(ACTIVE_KEY);

  /** Écrit `next` d'abord (sérialisation et stockage peuvent lever) ; la mémoire ne change qu'une fois l'écriture faite. */
  const commit = (next: Profile[]): void => {
    const text = JSON.stringify(next.map(serializeProfile));
    if (kv !== null) kv.setItem(PROFILES_KEY, text);
    saved = next;
  };
  const copyOf = (id: string): Profile | undefined => saved.find((p) => p.id === id);
  /** Chaque livré à sa place, remplacé par sa copie s'il en a une, puis les profils de l'utilisateur. */
  const all = (): Profile[] => [...builtins.map((b) => copyOf(b.id) ?? b), ...saved.filter((p) => !builtinIds.has(p.id))];

  return {
    list: () => all(),
    get: (id) => all().find((p) => p.id === id) ?? null,
    isBuiltin: (id) => builtinIds.has(id),
    hasOverride: (id) => builtinIds.has(id) && copyOf(id) !== undefined,
    save(p) {
      commit(copyOf(p.id) !== undefined ? saved.map((u) => (u.id === p.id ? p : u)) : [...saved, p]);
    },
    remove(id) {
      if (builtinIds.has(id)) throw new Error(`profil livré : ${id} ne se supprime pas (revert retire sa copie)`);
      commit(saved.filter((u) => u.id !== id));
      if (active === id) active = null;
    },
    revert(id) {
      if (!builtinIds.has(id)) throw new Error(`profil non livré : ${id} (rien à rétablir)`);
      if (copyOf(id) === undefined) return;
      commit(saved.filter((u) => u.id !== id));
    },
    resetAll() {
      saved = [];
      active = null;
      const profilesErased = erase(PROFILES_KEY);
      const activeErased = erase(ACTIVE_KEY);
      return profilesErased && activeErased;
    },
    activeId() {
      return active !== null && all().some((p) => p.id === active) ? active : DEFAULT_PROFILE_ID;
    },
    setActive(id) {
      if (!all().some((p) => p.id === id)) throw new Error(`profil inconnu : ${id}`);
      active = id;
      return write(ACTIVE_KEY, id);
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
