import { parseItemStyle, type ItemStyle } from "./engine/item-style";
import type { KeyValue } from "./profile-store";

// Réglages de l'appareil (cadrage design-l4, L4-14, Q4) : gardés sur le poste (stockage local), jamais dans le profil
// ni dans l'adresse. Patron du dossier partagé de la bibliothèque (`app/library.ts:374`) : `kv` injecté, `null` :
// mémoire seule. Clés `roomboard.<zone>.<réglage>`.

/** Cadre violet de l'annotation : « non » quand il est masqué ; absente (ou toute autre valeur) : affiché. */
export const FRAME_KEY = "roomboard.annotation.cadre";
const FRAME_HIDDEN = "non";

/** OG25 (déc. 25) : gomme automatique à la paume ; « non » quand elle est coupée ; absente (ou toute autre valeur) : active. */
export const PALM_ERASER_KEY = "roomboard.gomme.paume";
const PALM_ERASER_OFF = "non";

/** OG11 (déc. 23) : style courant commun aux outils (`ItemStyle`), JSON ; illisible : style par défaut (null). */
export const ITEM_STYLE_KEY = "roomboard.style-courant";

/** OG23 : sections du panneau d'options ouvertes ou repliées par l'utilisateur, JSON objet de booléens ; illisible : `{}`. */
export const OPTION_SECTIONS_KEY = "roomboard.options-sections";
type Sections = Readonly<Partial<Record<string, boolean>>>;
function parseSections(raw: string | null): Sections {
  if (raw === null) return {};
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, x] of Object.entries(v)) if (typeof x === "boolean") out[k] = x;
  return out;
}

/** design-l2 (L2-7, DA-L2-3) : position et repli d'un îlot, par profil et par barre, sur le poste ; jamais dans le
 *  profil (format `.rbprofile` inchangé). Valeur : JSON `{ "x", "y", "collapsed" }`, champs facultatifs. */
export const ISLAND_KEY_PREFIX = "roomboard.ilot.";
/** Chaque partie encodée (`encodeURIComponent`) : un identifiant avec espace ou barre oblique reste une seule partie. */
const part = (s: string): string => encodeURIComponent(s).replaceAll(".", "%2E");
export const islandKey = (profileId: string, barId: string): string => `${ISLAND_KEY_PREFIX}${part(profileId)}.${part(barId)}`;

/** `at` null : aucune position (îlot dans sa voie) ; `collapsed` null : état de départ du profil. */
export interface IslandState {
  readonly at: { readonly x: number; readonly y: number } | null;
  readonly collapsed: boolean | null;
}
export const NO_ISLAND: IslandState = Object.freeze({ at: null, collapsed: null });

/** personnalisation-1a (T2) : onglet et taille des vignettes de la barre latérale, sur le poste ; JSON `{ "tab", "thumb" }`. */
export const SIDEBAR_KEY = "roomboard.laterale";
export interface SidebarState {
  readonly tab: "pages" | "calques";
  readonly thumb: "s" | "m" | "l";
}
const SIDEBAR_DEFAULT: SidebarState = Object.freeze({ tab: "pages", thumb: "m" });
const SIDEBAR_TABS: readonly string[] = ["pages", "calques"];
const SIDEBAR_THUMBS: readonly string[] = ["s", "m", "l"];

/** Lecture champ par champ : un champ illisible prend sa valeur par défaut. */
function parseSidebar(raw: string | null): SidebarState {
  if (raw === null) return SIDEBAR_DEFAULT;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return SIDEBAR_DEFAULT;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return SIDEBAR_DEFAULT;
  const o = v as Record<string, unknown>;
  const tab = typeof o["tab"] === "string" && SIDEBAR_TABS.includes(o["tab"]) ? (o["tab"] as SidebarState["tab"]) : SIDEBAR_DEFAULT.tab;
  const thumb = typeof o["thumb"] === "string" && SIDEBAR_THUMBS.includes(o["thumb"]) ? (o["thumb"] as SidebarState["thumb"]) : SIDEBAR_DEFAULT.thumb;
  return { tab, thumb };
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Lecture champ par champ ; tout ce qui est illisible est absent (L2-7). */
function parseIsland(raw: string | null): IslandState {
  if (raw === null) return NO_ISLAND;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return NO_ISLAND;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return NO_ISLAND;
  const o = v as Record<string, unknown>;
  const x = o["x"];
  const y = o["y"];
  const c = o["collapsed"];
  const at = finite(x) && finite(y) ? { x: Math.round(x), y: Math.round(y) } : null;
  const collapsed = typeof c === "boolean" ? c : null;
  return at === null && collapsed === null ? NO_ISLAND : { at, collapsed };
}

/** JSON à écrire, px entiers ; null : rien à garder (clé retirée). */
function islandText(s: IslandState): string | null {
  if (s.at === null && s.collapsed === null) return null;
  return JSON.stringify({
    ...(s.at !== null ? { x: Math.round(s.at.x), y: Math.round(s.at.y) } : {}),
    ...(s.collapsed !== null ? { collapsed: s.collapsed } : {}),
  });
}

export interface DeviceSettings {
  /** Cadre de l'annotation affiché (L4-12). */
  frame(): boolean;
  /** Vrai si le choix est gardé sur l'appareil ; faux : mémoire seule (aucun stockage, ou stockage qui refuse). */
  setFrame(on: boolean): boolean;
  /** OG25 (déc. 25) : gomme automatique à la paume active. */
  palmEraser(): boolean;
  /** Vrai si le choix est gardé sur l'appareil ; faux : mémoire seule. Prévient `onChange` (comme `setFrame`). */
  setPalmEraser(on: boolean): boolean;
  /** design-l2 (L2-7) : position et repli de l'îlot `barId` du profil `profileId` ; illisible : NO_ISLAND. */
  island(profileId: string, barId: string): IslandState;
  /** Vrai si gardé sur l'appareil ; faux : mémoire seule. Ne déclenche pas `onChange`. */
  setIsland(profileId: string, barId: string, s: IslandState): boolean;
  /** OG11 (déc. 23) : style courant gardé ; null : rien de gardé ou illisible (style par défaut). */
  itemStyle(): ItemStyle | null;
  /** Vrai si gardé sur l'appareil ; faux : mémoire seule. Ne déclenche pas `onChange`. */
  setItemStyle(s: ItemStyle): boolean;
  /** personnalisation-1a (T2) : onglet et vignettes de la barre latérale ; rien ou illisible : `{ tab: "pages", thumb: "m" }`. */
  sidebar(): SidebarState;
  /** Gardé en mémoire, puis sur le poste s'il le permet. Ne déclenche pas `onChange` (comme `setIsland`). */
  setSidebar(s: SidebarState): void;
  /** OG23 : sections du panneau d'options que l'utilisateur a ouvertes ou repliées ; rien ou illisible : `{}`. */
  optionSections(): Sections;
  /** Écrit la seule clé touchée. Vrai si gardé sur l'appareil ; faux : mémoire seule. Ne déclenche pas `onChange`. */
  setOptionSection(key: string, open: boolean): boolean;
  onChange(cb: () => void): () => void;
}

/** Réglage d'appareil booléen : vrai par défaut, la valeur « coupée » écrite sous `key` quand il est faux. */
function readFlag(kv: KeyValue | null, key: string, off: string): boolean {
  try {
    return kv?.getItem(key) !== off;
  } catch {
    return true;
  }
}

/** Garde `on` sous `key` (clé retirée si vrai, `off` écrit sinon) ; faux quand le stockage refuse. */
function keepFlag(kv: KeyValue | null, key: string, off: string, on: boolean): boolean {
  if (kv === null) return false;
  try {
    if (on) kv.removeItem(key);
    else kv.setItem(key, off);
    return true;
  } catch {
    return false;
  }
}

export function createDeviceSettings(kv: KeyValue | null): DeviceSettings {
  let frame = readFlag(kv, FRAME_KEY, FRAME_HIDDEN);
  let palmEraser = readFlag(kv, PALM_ERASER_KEY, PALM_ERASER_OFF);
  const listeners = new Set<() => void>();
  const islands = new Map<string, IslandState>();
  /** Style courant écrit dans cette séance (gardé même si le stockage refuse) ; undefined : lire le stockage. */
  let item: ItemStyle | null | undefined;
  let sidebar: SidebarState | null = null;
  let sections: Sections | null = null;
  return {
    frame: () => frame,
    setFrame(on) {
      frame = on;
      const kept = keepFlag(kv, FRAME_KEY, FRAME_HIDDEN, on);
      for (const cb of [...listeners]) cb();
      return kept;
    },
    palmEraser: () => palmEraser,
    setPalmEraser(on) {
      palmEraser = on;
      const kept = keepFlag(kv, PALM_ERASER_KEY, PALM_ERASER_OFF, on);
      for (const cb of [...listeners]) cb();
      return kept;
    },
    island(profileId, barId) {
      const key = islandKey(profileId, barId);
      const mem = islands.get(key);
      if (mem !== undefined) return mem;
      try {
        return parseIsland(kv?.getItem(key) ?? null);
      } catch {
        return NO_ISLAND;
      }
    },
    setIsland(profileId, barId, s) {
      const key = islandKey(profileId, barId);
      const text = islandText(s);
      islands.set(key, parseIsland(text));
      if (kv === null) return false;
      try {
        if (text === null) kv.removeItem(key);
        else kv.setItem(key, text);
        return true;
      } catch {
        return false;
      }
    },
    itemStyle() {
      if (item !== undefined) return item;
      try {
        return parseItemStyle(kv?.getItem(ITEM_STYLE_KEY) ?? null);
      } catch {
        return null;
      }
    },
    setItemStyle(s) {
      const text = JSON.stringify(s);
      item = parseItemStyle(text);
      if (kv === null) return false;
      try {
        kv.setItem(ITEM_STYLE_KEY, text);
        return true;
      } catch {
        return false;
      }
    },
    sidebar() {
      if (sidebar !== null) return sidebar;
      try {
        return parseSidebar(kv?.getItem(SIDEBAR_KEY) ?? null);
      } catch {
        return SIDEBAR_DEFAULT;
      }
    },
    setSidebar(s) {
      sidebar = parseSidebar(JSON.stringify({ tab: s.tab, thumb: s.thumb }));
      try {
        kv?.setItem(SIDEBAR_KEY, JSON.stringify(sidebar));
      } catch {
        // Stockage qui refuse : mémoire seule.
      }
    },
    optionSections() {
      if (sections !== null) return sections;
      try {
        return parseSections(kv?.getItem(OPTION_SECTIONS_KEY) ?? null);
      } catch {
        return {};
      }
    },
    setOptionSection(key, open) {
      let base: Sections;
      try {
        base = sections ?? parseSections(kv?.getItem(OPTION_SECTIONS_KEY) ?? null);
      } catch {
        base = sections ?? {};
      }
      sections = { ...base, [key]: open };
      if (kv === null) return false;
      try {
        kv.setItem(OPTION_SECTIONS_KEY, JSON.stringify(sections));
        return true;
      } catch {
        return false;
      }
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
