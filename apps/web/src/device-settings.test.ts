import { describe, expect, it, vi } from "vitest";
import { createDeviceSettings, FRAME_KEY } from "./device-settings";
import type { KeyValue } from "./profile-store";

function memoryKv(init: Record<string, string> = {}): KeyValue & { readonly map: Map<string, string> } {
  const map = new Map(Object.entries(init));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}
const throwing: KeyValue = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("réglages de l'appareil (design-l4, L4-14)", () => {
  it("réglages de l'appareil : clé roomboard.annotation.cadre ; absente : cadre affiché", () => {
    expect(FRAME_KEY).toBe("roomboard.annotation.cadre");
    expect(createDeviceSettings(memoryKv()).frame()).toBe(true);
  });
  it("réglages de l'appareil : masquer écrit « non », réafficher retire la clé ; relu par une nouvelle instance (rechargement)", () => {
    const kv = memoryKv();
    const s = createDeviceSettings(kv);
    expect(s.setFrame(false)).toBe(true);
    expect(kv.map.get(FRAME_KEY)).toBe("non");
    expect(createDeviceSettings(kv).frame()).toBe(false);
    expect(s.setFrame(true)).toBe(true);
    expect(kv.map.has(FRAME_KEY)).toBe(false);
    expect(createDeviceSettings(kv).frame()).toBe(true);
  });
  it("réglages de l'appareil : valeur inconnue (« oui », vide) : affiché", () => {
    expect(createDeviceSettings(memoryKv({ [FRAME_KEY]: "oui" })).frame()).toBe(true);
    expect(createDeviceSettings(memoryKv({ [FRAME_KEY]: "" })).frame()).toBe(true);
  });
  it("réglages de l'appareil : onChange prévenu à chaque setFrame ; désabonnement", () => {
    const s = createDeviceSettings(memoryKv());
    const cb = vi.fn();
    const off = s.onChange(cb);
    s.setFrame(false);
    s.setFrame(true);
    off();
    s.setFrame(false);
    expect(cb).toHaveBeenCalledTimes(2);
  });
  it("réglages de l'appareil : sans stockage (null) : mémoire seule, setFrame rend faux", () => {
    const s = createDeviceSettings(null);
    expect(s.frame()).toBe(true);
    expect(s.setFrame(false)).toBe(false);
    expect(s.frame()).toBe(false);
  });
  it("réglages de l'appareil : stockage qui lève : affiché par défaut, choix gardé en mémoire, setFrame rend faux, rien ne lève", () => {
    const s = createDeviceSettings(throwing);
    expect(s.frame()).toBe(true);
    expect(() => s.setFrame(false)).not.toThrow();
    expect(s.setFrame(false)).toBe(false);
    expect(s.frame()).toBe(false);
  });
});
