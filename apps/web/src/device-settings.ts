import type { KeyValue } from "./profile-store";

// Réglages de l'appareil (cadrage design-l4, L4-14, Q4) : gardés sur le poste (stockage local), jamais dans le profil
// ni dans l'adresse. Patron du dossier partagé de la bibliothèque (`app/library.ts:374`) : `kv` injecté, `null` :
// mémoire seule. Clés `roomboard.<zone>.<réglage>`.

/** Cadre violet de l'annotation : « non » quand il est masqué ; absente (ou toute autre valeur) : affiché. */
export const FRAME_KEY = "roomboard.annotation.cadre";
const FRAME_HIDDEN = "non";

export interface DeviceSettings {
  /** Cadre de l'annotation affiché (L4-12). */
  frame(): boolean;
  /** Vrai si le choix est gardé sur l'appareil ; faux : mémoire seule (aucun stockage, ou stockage qui refuse). */
  setFrame(on: boolean): boolean;
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
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
