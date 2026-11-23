import { CAPABILITY_KEYS, type RuntimeCapabilities } from "./toolbar";

export type PlatformName = "web" | "windows" | "macos" | "linux" | "android" | "ipados";

export function detectPlatform(env: { readonly tauri: boolean; readonly userAgent: string }): PlatformName {
  if (!env.tauri) return "web";
  const ua = env.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Android/i.test(ua)) return "android";
  return "linux";
}

/**
 * Capacités du poste (U10, DAU8) ; C11a (P16, P29) : `annotationSupported` (commande `annotation_support`) abaisse
 * `desktopAnnotation` (statique ∧ détecté ; absent : statique gardé) ; `forceAnnotation` (`?annotation=faux`) la rend
 * vraie hors coque seulement, jamais sans ce paramètre.
 */
export function runtimeCapabilities(
  staticCaps: unknown,
  env: { readonly tauri: boolean; readonly officeConverter?: boolean; readonly annotationSupported?: boolean; readonly forceAnnotation?: boolean },
): RuntimeCapabilities {
  const s = typeof staticCaps === "object" && staticCaps !== null ? (staticCaps as Record<string, unknown>) : {};
  const flag = (k: string): boolean => env.tauri && s[k] === true;
  const caps = {
    desktopAnnotation: (!env.tauri && env.forceAnnotation === true) || (flag("desktopAnnotation") && env.annotationSupported !== false),
    multiWindow: flag("multiWindow"),
    dropPaths: env.tauri,
    officeConverter: env.tauri && env.officeConverter === true,
  };
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, caps[k]])) as RuntimeCapabilities;
}
