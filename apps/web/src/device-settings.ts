import type { KeyValue } from "./profile-store";

// Réglages de l'appareil (cadrage design-l4, L4-14, Q4) : gardés sur le poste (stockage local), jamais dans le profil
// ni dans l'adresse. Patron du dossier partagé de la bibliothèque (`app/library.ts:374`) : `kv` injecté, `null` :
// mémoire seule. Clés `roomboard.<zone>.<réglage>`.

/** Cadre violet de l'annotation : « non » quand il est masqué ; absente (ou toute autre valeur) : affiché. */
export const FRAME_KEY = "roomboard.annotation.cadre";
const FRAME_HIDDEN = "non";

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
  /** design-l2 (L2-7) : position et repli de l'îlot `barId` du profil `profileId` ; illisible : NO_ISLAND. */
  island(profileId: string, barId: string): IslandState;
  /** Vrai si gardé sur l'appareil ; faux : mémoire seule. Ne déclenche pas `onChange`. */
  setIsland(profileId: string, barId: string, s: IslandState): boolean;
  onChange(cb: () => void): () => void;
}

function readFrame(kv: KeyValue | null): boolean {
  try {
    return kv?.getItem(FRAME_KEY) !== FRAME_HIDDEN;
  } catch {
    return true;
  }
}

export function createDeviceSettings(kv: KeyValue | null): DeviceSettings {
  let frame = readFrame(kv);
  const listeners = new Set<() => void>();
  const islands = new Map<string, IslandState>();
  return {
    frame: () => frame,
    setFrame(on) {
      frame = on;
      let kept = false;
      if (kv !== null) {
        try {
          if (on) kv.removeItem(FRAME_KEY);
          else kv.setItem(FRAME_KEY, FRAME_HIDDEN);
          kept = true;
        } catch {
          kept = false;
        }
      }
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
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
