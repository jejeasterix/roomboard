import { describe, expect, it } from "vitest";
import { detectPlatform, runtimeCapabilities } from "./runtime-capabilities";

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
