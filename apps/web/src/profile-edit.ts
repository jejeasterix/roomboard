/**
 * Opérations d'édition d'un profil (C1, DAC1-1) : fonctions pures `Profile → Profile`, sans DOM ni stockage. Chaque
 * niveau garde son `rest` (clés inconnues) ; un élément inconnu n'est jamais réécrit autrement que tel quel (P16).
 * L'éditeur (`ui/ProfileEditor.tsx`) ne fait qu'appeler ces fonctions sur son brouillon.
 */
import {
  ACTION_TABLE,
  isKnownItem,
  isProfilesAccess,
  resetPresets,
  TOOL_TABLE,
  uniqueId,
  type ButtonSize,
  type Dock,
  type Preset,
  type Profile,
  type StartMode,
  type ToolId,
  type ToolItem,
  type Toolbar,
} from "./toolbar";
import { DEFAULT_PROFILE_ID } from "./toolbar-profiles";

export interface CatalogEntry { readonly kind: "tool" | "action"; readonly ref: string; readonly label: string }
export interface PresetField { readonly key: "color" | "width"; readonly label: string; readonly input: "color" | "number" }
export interface PresetPatch { readonly label?: string; readonly color?: string; readonly width?: number }

/** Champs que le moteur applique, par outil (P17) : seul `setPenStyle` existe (`engine.ts:446`). */
const PRESET_FIELDS: Readonly<Record<ToolId, readonly PresetField[]>> = Object.freeze({
  pen: Object.freeze([
    { key: "color", label: "Couleur", input: "color" },
    { key: "width", label: "Épaisseur", input: "number" },
  ] as const),
});
export const PRESET_TOOLS: readonly ToolId[] = Object.freeze(Object.keys(PRESET_FIELDS));

export function presetFields(tool: ToolId): readonly PresetField[] {
  return Object.hasOwn(PRESET_FIELDS, tool) ? (PRESET_FIELDS[tool] ?? []) : [];
}

/** Préréglage ajouté : noir, épaisseur 4 (celle des livrés). */
const NEW_PRESET = { color: "#000000", width: 4 } as const;

const mapBar = (p: Profile, barId: string, f: (b: Toolbar) => Toolbar): Profile => ({
  ...p,
  toolbars: p.toolbars.map((b) => (b.id === barId ? f(b) : b)),
});
const mapItems = (p: Profile, f: (it: ToolItem) => ToolItem): Profile => ({
  ...p,
  toolbars: p.toolbars.map((b) => ({ ...b, groups: b.groups.map((g) => ({ ...g, items: g.items.map(f) })) })),
});
const itemIds = (p: Profile): Set<string> => new Set(p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id))));
const presetsOf = (p: Profile, tool: ToolId): readonly Preset[] => (Object.hasOwn(p.presets, tool) ? (p.presets[tool] ?? []) : []);
const withPresets = (p: Profile, tool: ToolId, list: readonly Preset[]): Profile => ({ ...p, presets: { ...p.presets, [tool]: list } });

export const setLabel = (p: Profile, label: string): Profile => ({ ...p, label });
export const setStartMode = (p: Profile, mode: StartMode): Profile => ({ ...p, behavior: { ...p.behavior, startMode: mode } });
export const setButtonSize = (p: Profile, size: ButtonSize): Profile => ({ ...p, interface: { ...p.interface, buttonSize: size } });
export const setDock = (p: Profile, barId: string, dock: Dock): Profile => mapBar(p, barId, (b) => ({ ...b, dock }));

/** Faux pour l'accès au menu Profil (P33) et pour un élément inconnu (P16, réécrit tel quel). */
export const canHide = (item: ToolItem): boolean => isKnownItem(item) && !isProfilesAccess(item);

export function setHidden(p: Profile, itemId: string, hidden: boolean): Profile {
  return mapItems(p, (it) => {
    if (it.id !== itemId || !canHide(it)) return it;
    if (hidden) return { ...it, hidden: true };
    const { hidden: _shown, ...kept } = it;
    return kept;
  });
}

/** Un cran vers le haut (-1) ou le bas (1) ; à la frontière d'un groupe, l'élément entre dans le groupe voisin (P14). */
export function moveItem(p: Profile, barId: string, itemId: string, delta: -1 | 1): Profile {
  return mapBar(p, barId, (bar) => {
    const g = bar.groups.findIndex((gr) => gr.items.some((it) => it.id === itemId));
    if (g === -1) return bar;
    const items = bar.groups[g]!.items;
    const i = items.findIndex((it) => it.id === itemId);
    const moved = items[i]!;
    const lists = bar.groups.map((gr) => [...gr.items]);
    const j = i + delta;
    if (j >= 0 && j < items.length) {
      lists[g]![i] = items[j]!;
      lists[g]![j] = moved;
    } else {
      const ng = g + delta;
      if (ng < 0 || ng >= bar.groups.length) return bar;
      lists[g]!.splice(i, 1);
      if (delta === -1) lists[ng]!.push(moved);
      else lists[ng]!.unshift(moved);
    }
    return { ...bar, groups: bar.groups.map((gr, k) => ({ ...gr, items: lists[k]! })) };
  });
}

/** Ce qu'on peut ajouter à une barre (P15) : barre `pages` = actions seules, autre rôle = outils puis actions ; moins ce qu'elle a. */
export function catalog(p: Profile, barId: string): CatalogEntry[] {
  const bar = p.toolbars.find((b) => b.id === barId);
  if (bar === undefined) return [];
  const items = bar.groups.flatMap((g) => g.items);
  const tools = new Set(items.flatMap((it) => (it.kind === "tool" && it.tool !== undefined ? [it.tool] : [])));
  const actions = new Set(items.flatMap((it) => (it.kind === "action" && it.action !== undefined ? [it.action] : [])));
  const toolEntries: CatalogEntry[] =
    bar.role === "pages"
      ? []
      : Object.entries(TOOL_TABLE).filter(([id]) => !tools.has(id)).map(([id, e]) => ({ kind: "tool", ref: id, label: e.label }));
  const actionEntries: CatalogEntry[] = Object.entries(ACTION_TABLE)
    .filter(([id]) => !actions.has(id))
    .map(([id, e]) => ({ kind: "action", ref: id, label: e.label }));
  return [...toolEntries, ...actionEntries];
}

/** Ajoute en fin de barre ; id = celui de l'outil ou de l'action s'il est libre dans tout le profil, sinon `<id>-<n>`. */
export function addItem(p: Profile, barId: string, entry: CatalogEntry): Profile {
  if (!p.toolbars.some((b) => b.id === barId)) return p;
  const item: ToolItem = {
    id: uniqueId(entry.ref, itemIds(p)),
    kind: entry.kind,
    ...(entry.kind === "tool" ? { tool: entry.ref } : { action: entry.ref }),
    label: entry.label,
    requires: [],
    rest: {},
  };
  return mapBar(p, barId, (bar) => {
    if (bar.groups.length === 0) return { ...bar, groups: [{ id: "groupe", items: [item], rest: {} }] };
    const last = bar.groups.length - 1;
    return { ...bar, groups: bar.groups.map((g, k) => (k === last ? { ...g, items: [...g.items, item] } : g)) };
  });
}

export function addPreset(p: Profile, tool: ToolId): Profile {
  const list = presetsOf(p, tool);
  const id = uniqueId("couleur", new Set(list.map((x) => x.id)));
  return withPresets(p, tool, [...list, { id, label: `Couleur ${list.length + 1}`, ...NEW_PRESET, rest: {} }]);
}

/** Libellé vide, couleur vide, épaisseur ≤ 0 ou non finie : valeur gardée. */
export function updatePreset(p: Profile, tool: ToolId, id: string, patch: PresetPatch): Profile {
  if (!Object.hasOwn(p.presets, tool)) return p;
  return withPresets(
    p,
    tool,
    presetsOf(p, tool).map((x) => {
      if (x.id !== id) return x;
      const label = patch.label !== undefined && patch.label.trim() !== "" ? patch.label.trim() : x.label;
      const color = patch.color !== undefined && patch.color !== "" ? patch.color : x.color;
      const width = patch.width !== undefined && Number.isFinite(patch.width) && patch.width > 0 ? patch.width : x.width;
      return { ...x, label, ...(color !== undefined ? { color } : {}), ...(width !== undefined ? { width } : {}) };
    }),
  );
}

export function removePreset(p: Profile, tool: ToolId, id: string): Profile {
  if (!Object.hasOwn(p.presets, tool)) return p;
  return withPresets(p, tool, presetsOf(p, tool).filter((x) => x.id !== id));
}

/** « Rétablir les barres » (U12) : barres et taille des boutons de l'origine ; le reste du profil ne bouge pas. */
export function resetToolbars(p: Profile, from: Profile): Profile {
  return { ...p, toolbars: from.toolbars, interface: { ...p.interface, buttonSize: from.interface.buttonSize } };
}

/** « Rétablir les préréglages » (U12) : chaque outil de `p` et de `from` repris de `from`. */
export function resetAllPresets(p: Profile, from: Profile): Profile {
  const tools = [...new Set([...Object.keys(p.presets), ...Object.keys(from.presets)])];
  return tools.reduce((acc, tool) => resetPresets(acc, tool, from), p);
}

/** « Remettre à zéro ce profil » d'un profil de l'utilisateur (P6) : barres, taille, préréglages, démarrage de `from`. */
export function resetToOrigin(p: Profile, from: Profile): Profile {
  return { ...resetAllPresets(resetToolbars(p, from), from), behavior: from.behavior };
}

/** Origine (P3) : le livré de même `id`, sinon celui nommé par `basedOn`, sinon `defaut`. */
export function originOf(p: Profile, builtins: readonly Profile[]): Profile {
  const find = (id: string | undefined): Profile | undefined => (id === undefined ? undefined : builtins.find((b) => b.id === id));
  return find(p.id) ?? find(p.basedOn) ?? find(DEFAULT_PROFILE_ID) ?? builtins[0]!;
}
