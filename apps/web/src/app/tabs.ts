/**
 * Onglets de la fenêtre (D27 amendée, Q1, CL5b-1, CL5b-5, CL5b-20) : liste ordonnée, un onglet actif, pur et générique
 * (la session d'un onglet est opaque ici). Retirer l'onglet actif montre le précédent, le suivant s'il était le premier
 * (même règle que retirer une page, CL4-9).
 */
export type TabKind = "board" | "annotation";

export const ONE_ANNOTATION_TAB = "un seul onglet d'annotation à la fois";
export const MAX_TABS = 12;
export const TOO_MANY_TABS = "12 onglets au plus ; fermez-en un";

export interface TabEntry<S> {
  readonly id: string;
  readonly kind: TabKind;
  readonly session: S;
}

export interface Tabs<S> {
  list(): readonly TabEntry<S>[];
  active(): TabEntry<S> | null;
  /** Lève ONE_ANNOTATION_TAB pour un second "annotation", et TOO_MANY_TABS au-delà de MAX_TABS. */
  add(kind: TabKind, session: S, activate?: boolean): TabEntry<S>;
  activate(id: string): boolean;
  /** Retire ; si c'était l'actif, active le précédent (le suivant s'il était premier). Rend l'onglet retiré. */
  remove(id: string): TabEntry<S> | null;
  /** C11a (P4) : remplace la session de l'onglet `id` (même id, même sorte, même place, actif inchangé). */
  replace(id: string, session: S): TabEntry<S> | null;
  onChange(cb: () => void): () => void;
}

export function createTabs<S>(newId: () => string): Tabs<S> {
  const entries: TabEntry<S>[] = [];
  let activeId: string | null = null;
  const listeners = new Set<() => void>();
  const changed = (): void => {
    for (const cb of [...listeners]) cb();
  };

  return {
    list: () => entries.slice(),
    active: () => entries.find((t) => t.id === activeId) ?? null,
    add(kind, session, activate = true) {
      if (kind === "annotation" && entries.some((t) => t.kind === "annotation")) throw new Error(ONE_ANNOTATION_TAB);
      if (entries.length >= MAX_TABS) throw new Error(TOO_MANY_TABS);
      const entry: TabEntry<S> = { id: newId(), kind, session };
      entries.push(entry);
      if (activate || activeId === null) activeId = entry.id;
      changed();
      return entry;
    },
    activate(id) {
      if (id === activeId || !entries.some((t) => t.id === id)) return id === activeId && activeId !== null;
      activeId = id;
      changed();
      return true;
    },
    remove(id) {
      const i = entries.findIndex((t) => t.id === id);
      if (i < 0) return null;
      const [removed] = entries.splice(i, 1);
      if (activeId === id) activeId = (entries[i - 1] ?? entries[i] ?? null)?.id ?? null;
      changed();
      return removed ?? null;
    },
    replace(id, session) {
      const i = entries.findIndex((t) => t.id === id);
      if (i < 0) return null;
      const entry: TabEntry<S> = { id, kind: entries[i]!.kind, session };
      entries[i] = entry;
      changed();
      return entry;
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
