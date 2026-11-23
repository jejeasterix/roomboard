import { describe, expect, it } from "vitest";
import { detectPlatform, runtimeCapabilities } from "./runtime-capabilities";
import { visibleItems } from "./toolbar";
import { builtinProfile } from "./toolbar-profiles";

describe("RuntimeCapabilities (U10, DAU8)", () => {
  it("web : rien de la coque, même si le cœur dit oui", () => {
    expect(runtimeCapabilities({ desktopAnnotation: true, multiWindow: true }, { tauri: false })).toEqual({
      desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false,
    });
  });
  it("coque : dropPaths vrai ; annotation et fenêtres selon le cœur", () => {
    expect(runtimeCapabilities({ desktopAnnotation: true, multiWindow: true }, { tauri: true })).toEqual({
      desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: false,
    });
  });
  it("table du cœur illisible : tout faux sauf dropPaths en coque", () => {
    expect(runtimeCapabilities(null, { tauri: true }).desktopAnnotation).toBe(false);
    expect(runtimeCapabilities("x", { tauri: true }).dropPaths).toBe(true);
  });
  it("plateforme : web hors coque ; dans la coque d'après l'agent utilisateur", () => {
    expect(detectPlatform({ tauri: false, userAgent: "Mozilla/5.0 (Windows NT 10.0)" })).toBe("web");
    expect(detectPlatform({ tauri: true, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64)" })).toBe("windows");
    expect(detectPlatform({ tauri: true, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)" })).toBe("macos");
    expect(detectPlatform({ tauri: true, userAgent: "Mozilla/5.0 (X11; Linux x86_64)" })).toBe("linux");
  });
});

describe("officeConverter (C16, O24)", () => {
  it("vrai seulement dans la coque et si l'hôte l'annonce", () => {
    expect(runtimeCapabilities({}, { tauri: true, officeConverter: true }).officeConverter).toBe(true);
    expect(runtimeCapabilities({}, { tauri: true, officeConverter: false }).officeConverter).toBe(false);
    expect(runtimeCapabilities({}, { tauri: true }).officeConverter).toBe(false);
    expect(runtimeCapabilities({}, { tauri: false, officeConverter: true }).officeConverter).toBe(false);
  });
});

describe("annotation de bureau à l'exécution (C11a, P16, P29)", () => {
  it("coque : statique ∧ détecté ; champ absent : statique gardé", () => {
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: true }).desktopAnnotation).toBe(true);
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: false }).desktopAnnotation).toBe(false);
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true }).desktopAnnotation).toBe(true);
    expect(runtimeCapabilities({ desktopAnnotation: false }, { tauri: true, annotationSupported: true }).desktopAnnotation).toBe(false);
  });
  it("Wayland natif (support faux) : entrée masquée par visibleItems", () => {
    const caps = runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: false });
    const bar = builtinProfile("defaut")!.toolbars[0]!;
    expect(visibleItems(bar, caps).some((it) => it.action === "desktop-annotation")).toBe(false);
  });
  it("X11 et XWayland (support vrai) : entrée visible", () => {
    const caps = runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: true });
    expect(visibleItems(builtinProfile("defaut")!.toolbars[0]!, caps).some((it) => it.action === "desktop-annotation")).toBe(true);
  });
  it("forceAnnotation (?annotation=faux) : vrai hors coque seulement", () => {
    expect(runtimeCapabilities({}, { tauri: false, forceAnnotation: true }).desktopAnnotation).toBe(true);
    expect(runtimeCapabilities({}, { tauri: false }).desktopAnnotation).toBe(false);
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: false, forceAnnotation: true }).desktopAnnotation).toBe(false);
  });
});
