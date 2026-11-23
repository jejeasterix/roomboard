import { describe, expect, it, vi } from "vitest";
import { createTabs, MAX_TABS, ONE_ANNOTATION_TAB, TOO_MANY_TABS } from "./tabs";

function make() {
  let n = 0;
  return createTabs<string>(() => `t${++n}`);
}

describe("onglets (CL5b-1, CL5b-5, CL5b-20)", () => {
  it("ajout et activation : le premier onglet est actif, un ajout active le nouveau sauf activate=false", () => {
    const tabs = make();
    expect(tabs.active()).toBeNull();
    const a = tabs.add("board", "A");
    expect([a.id, a.kind, a.session]).toEqual(["t1", "board", "A"]);
    expect(tabs.active()).toBe(a);
    const b = tabs.add("board", "B");
    expect(tabs.active()).toBe(b);
    const c = tabs.add("board", "C", false);
    expect(tabs.active()).toBe(b);
    expect(tabs.list().map((t) => t.session)).toEqual(["A", "B", "C"]);
    expect(tabs.activate(c.id)).toBe(true);
    expect(tabs.active()).toBe(c);
    expect(tabs.activate("inconnu")).toBe(false);
    expect(tabs.active()).toBe(c);
  });

  it("ajout sans activation dans une liste vide : l'onglet devient actif quand même (toujours un actif)", () => {
    const tabs = make();
    const a = tabs.add("board", "A", false);
    expect(tabs.active()).toBe(a);
  });

  it("retirer l'actif montre le précédent ; le premier : le suivant", () => {
    const tabs = make();
    const a = tabs.add("board", "A");
    const b = tabs.add("board", "B");
    const c = tabs.add("board", "C");
    expect(tabs.remove(c.id)).toBe(c);
    expect(tabs.active()).toBe(b);
    tabs.activate(a.id);
    expect(tabs.remove(a.id)).toBe(a);
    expect(tabs.active()).toBe(b);
    expect(tabs.remove(b.id)).toBe(b);
    expect(tabs.active()).toBeNull();
    expect(tabs.list()).toEqual([]);
  });

  it("retirer un onglet caché : l'actif ne change pas ; id inconnu : null", () => {
    const tabs = make();
    const a = tabs.add("board", "A");
    const b = tabs.add("board", "B");
    expect(tabs.remove(a.id)).toBe(a);
    expect(tabs.active()).toBe(b);
    expect(tabs.remove("inconnu")).toBeNull();
    expect(tabs.list()).toEqual([b]);
  });

  it("annotation : acceptée, une seule à la fois (C11a, P3)", () => {
    let n = 0;
    const tabs = createTabs<string>(() => `t${++n}`);
    tabs.add("board", "A");
    const a = tabs.add("annotation", "X", false);
    expect(a.kind).toBe("annotation");
    expect(tabs.active()?.session).toBe("A");
    expect(() => tabs.add("annotation", "Y")).toThrow(ONE_ANNOTATION_TAB);
  });

  it("replace : même place, même id, même actif (C11a, P4)", () => {
    let n = 0;
    const tabs = createTabs<string>(() => `t${++n}`);
    tabs.add("board", "A");
    const x = tabs.add("annotation", "X", false);
    tabs.add("board", "B");
    const seen: number[] = [];
    tabs.onChange(() => seen.push(1));
    const r = tabs.replace(x.id, "X2");
    expect(r).toEqual({ id: x.id, kind: "annotation", session: "X2" });
    expect(tabs.list().map((t) => t.session)).toEqual(["A", "X2", "B"]);
    expect(tabs.active()?.session).toBe("B");
    expect(seen).toHaveLength(1);
    expect(tabs.replace("absent", "Z")).toBeNull();
  });

  it("13e onglet refusé : TOO_MANY_TABS", () => {
    const tabs = make();
    for (let i = 0; i < MAX_TABS; i++) tabs.add("board", `s${i}`);
    expect(MAX_TABS).toBe(12);
    expect(() => tabs.add("board", "13e")).toThrow(TOO_MANY_TABS);
    expect(tabs.list()).toHaveLength(12);
    expect(tabs.active()?.session).toBe("s11");
  });

  it("onChange appelé à chaque changement (ajout, activation, retrait), rien pour un appel sans effet ; désabonnement", () => {
    const tabs = make();
    const cb = vi.fn();
    const off = tabs.onChange(cb);
    const a = tabs.add("board", "A");
    const b = tabs.add("board", "B");
    expect(cb).toHaveBeenCalledTimes(2);
    tabs.activate(a.id);
    expect(cb).toHaveBeenCalledTimes(3);
    tabs.activate(a.id); // déjà actif
    tabs.activate("inconnu");
    tabs.remove("inconnu");
    expect(cb).toHaveBeenCalledTimes(3);
    tabs.remove(b.id);
    expect(cb).toHaveBeenCalledTimes(4);
    off();
    tabs.add("board", "C");
    expect(cb).toHaveBeenCalledTimes(4);
  });
});
