import type { KeyLike } from "./engine/input/keys";

/** Touche du navigateur vers le `KeyLike` du moteur ; `code` est requis par les raccourcis Alt (`arrangeKey`). */
export function keyOf(e: KeyboardEvent): KeyLike {
  return {
    key: e.key,
    code: e.code,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    isComposing: e.isComposing,
    defaultPrevented: e.defaultPrevented,
    target: e.target instanceof HTMLElement ? e.target : null,
  };
}
