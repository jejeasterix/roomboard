/**
 * Règle de sélection des groupes (C3, Z2, DAZ5) : tenue dans la page sur le champ `group` des vues, sans requête du
 * cœur. Un clic prend le groupe extérieur ; Maj+clic ajoute ou retire le groupe entier ; le rectangle ne prend un groupe
 * que s'il y est entier. Pas d'entrée dans un groupe (HZ1-6).
 */
export interface GroupedView {
  readonly id: string;
  readonly group?: readonly string[];
}

export function outerGroup(e: GroupedView): string | null {
  return e.group?.[0] ?? null;
}

/** Ids augmentés des membres des groupes extérieurs qu'ils touchent ; ordre de la page, ids hors page en fin. */
export function expandToGroups(ids: readonly string[], page: readonly GroupedView[]): string[] {
  const want = new Set(ids);
  const groups = new Set<string>();
  for (const e of page) {
    const g = outerGroup(e);
    if (g !== null && want.has(e.id)) groups.add(g);
  }
  const out = page.filter((e) => want.has(e.id) || groups.has(outerGroup(e) ?? "")).map((e) => e.id);
  const known = new Set(page.map((e) => e.id));
  return [...out, ...ids.filter((id) => !known.has(id))];
}

/** Ids du rectangle, sans les membres d'un groupe dont un membre au moins manque. */
export function keepWholeGroups(ids: readonly string[], page: readonly GroupedView[]): string[] {
  const inRect = new Set(ids);
  const broken = new Set<string>();
  for (const e of page) {
    const g = outerGroup(e);
    if (g !== null && !inRect.has(e.id)) broken.add(g);
  }
  const byId = new Map(page.map((e) => [e.id, e] as const));
  return ids.filter((id) => {
    const e = byId.get(id);
    const g = e === undefined ? null : outerGroup(e);
    return g === null || !broken.has(g);
  });
}

/** Unités (groupe extérieur ou élément libre) et présence d'un groupe ; Grouper exige 2 unités (HZ2-2). */
export function selectionUnits(ids: readonly string[], page: readonly GroupedView[]): { units: number; grouped: boolean } {
  const byId = new Map(page.map((e) => [e.id, e] as const));
  const units = new Set<string>();
  let grouped = false;
  for (const id of ids) {
    const e = byId.get(id);
    const g = e === undefined ? null : outerGroup(e);
    if (g !== null) grouped = true;
    units.add(g === null ? `#${id}` : `g${g}`);
  }
  return { units: units.size, grouped };
}
