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

export function runtimeCapabilities(staticCaps: unknown, env: { readonly tauri: boolean }): RuntimeCapabilities {
  const s = typeof staticCaps === "object" && staticCaps !== null ? (staticCaps as Record<string, unknown>) : {};
  const flag = (k: string): boolean => env.tauri && s[k] === true;
  const caps = {
    desktopAnnotation: flag("desktopAnnotation"),
    multiWindow: flag("multiWindow"),
    dropPaths: env.tauri,
    officeConverter: false,
  };
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, caps[k]])) as RuntimeCapabilities;
}
