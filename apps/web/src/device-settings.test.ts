import { describe, expect, it, vi } from "vitest";
import { createDeviceSettings, FRAME_KEY, NO_ISLAND, islandKey } from "./device-settings";
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

describe("device-settings : îlots (design-l2 L2-7, DA-L2-3)", () => {
  const memoryKv = () => {
    const m = new Map<string, string>();
    return { m, kv: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } };
  };
  it("design-l2 L2-7 : clé roomboard.ilot.<profil>.<barre> ; rien d'enregistré : NO_ISLAND", () => {
    expect(islandKey("defaut", "outils")).toBe("roomboard.ilot.defaut.outils");
    expect(islandKey("a.b", "c")).not.toBe(islandKey("a", "b.c"));
    expect(islandKey("a.b", "c")).toBe("roomboard.ilot.a%2Eb.c");
    expect(createDeviceSettings(memoryKv().kv).island("defaut", "outils")).toEqual({ at: null, collapsed: null });
    expect(NO_ISLAND).toEqual({ at: null, collapsed: null });
  });
  it("design-l2 L2-7 : position et repli écrits en JSON entier, relus par un autre réglage (rechargement)", () => {
    const { m, kv } = memoryKv();
    expect(createDeviceSettings(kv).setIsland("defaut", "outils", { at: { x: 40.6, y: 200 }, collapsed: true })).toBe(true);
    expect(m.get("roomboard.ilot.defaut.outils")).toBe('{"x":41,"y":200,"collapsed":true}');
    expect(createDeviceSettings(kv).island("defaut", "outils")).toEqual({ at: { x: 41, y: 200 }, collapsed: true });
  });
  it("design-l2 L2-7 : champs facultatifs ; rien à garder : clé retirée", () => {
    const { m, kv } = memoryKv();
    const d = createDeviceSettings(kv);
    d.setIsland("defaut", "outils", { at: null, collapsed: false });
    expect(m.get("roomboard.ilot.defaut.outils")).toBe('{"collapsed":false}');
    d.setIsland("defaut", "outils", { at: null, collapsed: null });
    expect(m.has("roomboard.ilot.defaut.outils")).toBe(false);
    expect(d.island("defaut", "outils")).toEqual({ at: null, collapsed: null });
  });
  it("design-l2 L2-7 : valeur illisible ou partielle : absente, champ par champ, sans exception", () => {
    const { m, kv } = memoryKv();
    const read = (v: string) => {
      m.set("roomboard.ilot.p.b", v);
      return createDeviceSettings(kv).island("p", "b");
    };
    expect(read("{oops")).toEqual({ at: null, collapsed: null });
    expect(read("[1,2]")).toEqual({ at: null, collapsed: null });
    expect(read('"texte"')).toEqual({ at: null, collapsed: null });
    expect(read('{"x":1}')).toEqual({ at: null, collapsed: null });
    expect(read('{"x":"1","y":2,"collapsed":"oui"}')).toEqual({ at: null, collapsed: null });
    expect(read('{"collapsed":true}')).toEqual({ at: null, collapsed: true });
    expect(read('{"x":3.4,"y":-2.6}')).toEqual({ at: { x: 3, y: -3 }, collapsed: null });
  });
  it("design-l2 L2-7 : par profil et par barre", () => {
    const { kv } = memoryKv();
    const d = createDeviceSettings(kv);
    d.setIsland("defaut", "outils", { at: { x: 1, y: 2 }, collapsed: null });
    expect(d.island("simple", "outils")).toEqual({ at: null, collapsed: null });
    expect(d.island("defaut", "pages")).toEqual({ at: null, collapsed: null });
  });
  it("design-l2 L2-7 : sans stockage : mémoire seule, setIsland rend faux", () => {
    const d = createDeviceSettings(null);
    expect(d.setIsland("defaut", "outils", { at: { x: 5, y: 6 }, collapsed: true })).toBe(false);
    expect(d.island("defaut", "outils")).toEqual({ at: { x: 5, y: 6 }, collapsed: true });
  });
  it("design-l2 L2-7 : stockage qui refuse l'écriture ou la lecture : faux, mémoire gardée, aucune exception", () => {
    const boom = () => {
      throw new Error("quota");
    };
    const d = createDeviceSettings({ getItem: boom, setItem: boom, removeItem: boom });
    expect(d.island("defaut", "outils")).toEqual({ at: null, collapsed: null });
    expect(d.setIsland("defaut", "outils", { at: { x: 1, y: 1 }, collapsed: null })).toBe(false);
    expect(d.island("defaut", "outils")).toEqual({ at: { x: 1, y: 1 }, collapsed: null });
  });
  it("design-l2 : onChange inchangé : setIsland ne le déclenche pas, le cadre si", () => {
    const d = createDeviceSettings(null);
    let n = 0;
    d.onChange(() => n++);
    d.setIsland("defaut", "outils", { at: { x: 1, y: 1 }, collapsed: null });
    expect(n).toBe(0);
    d.setFrame(false);
    expect(n).toBe(1);
  });
});

describe("design-l2 T11 : clé d'îlot", () => {
  it("design-l2 T11 (discrimine) : chaque partie de la clé est encodée (encodeURIComponent)", () => {
    expect(islandKey("mon profil", "outils/a")).toBe("roomboard.ilot.mon%20profil.outils%2Fa");
    expect(islandKey("defaut", "outils")).toBe("roomboard.ilot.defaut.outils");
  });
});
