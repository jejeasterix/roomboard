import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineState } from "../engine/engine";
import { createSettingsStore, DEFAULT_SETTINGS, type EffectiveEchelons } from "../engine/settings";
import { barModel, mountBar, mountSettings, settingsModel } from "./barre";

const base: EngineState = {
  tool: "pen",
  eraserMode: "partial",
  canUndo: false,
  canRedo: false,
  page: "p",
  elementCount: 0,
  version: 0,
  error: null,
};

const OFF: EffectiveEchelons = { prediction: false, inkTrail: "off", webgl: "off" };

describe("barModel", () => {
  it("six boutons : stylo, gomme, main, mode de gomme, annuler, rétablir ; libellés de toolbar.ts", () => {
    expect(barModel(base).map((b) => [b.action, b.label])).toEqual([
      ["pen", "Stylo"],
      ["eraser", "Gomme"],
      ["hand", "Main"],
      ["eraser-mode", "Gomme : partielle"],
      ["undo", "Annuler"],
      ["redo", "Rétablir"],
    ]);
  });

  it("l'outil courant est pressé, les autres non (main comprise)", () => {
    expect(barModel({ ...base, tool: "eraser" }).map((b) => b.pressed)).toEqual([false, true, false, false, null, null]);
    expect(barModel({ ...base, tool: "hand" }).map((b) => b.pressed)).toEqual([false, false, true, false, null, null]);
  });

  it("annuler et rétablir désactivés sans étape", () => {
    expect(barModel(base).map((b) => b.disabled)).toEqual([false, false, false, false, true, true]);
    expect(barModel({ ...base, canUndo: true, canRedo: true }).map((b) => b.disabled)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("mode de gomme : libellé et état pressé suivent le mode (gomme d'objet, D38)", () => {
    expect(barModel({ ...base, eraserMode: "object" }).find((b) => b.action === "eraser-mode")).toMatchObject({
      label: "Gomme : objet",
      pressed: true,
    });
  });
});

describe("settingsModel", () => {
  it("cinq réglages, doigt et paume d'abord ; seuls les échelons 3 et 4 rechargent", () => {
    expect(settingsModel(DEFAULT_SETTINGS, OFF).map((b) => [b.key, b.label, b.reload])).toEqual([
      ["finger", "Doigt : vue", false],
      ["palm", "Paume : stricte", false],
      ["prediction", "É2 prédiction : auto (éteinte)", false],
      ["inkTrail", "É3 traînée : éteinte", true],
      ["webgl", "É4 WebGL2 : éteint", true],
    ]);
  });
});

/** Faux nœud DOM minimal (pas d'environnement DOM dans la suite) : `append` déplace un nœud déjà attaché, comme le vrai. */
class FakeNode {
  children: FakeNode[] = [];
  parent: FakeNode | null = null;
  dataset: Record<string, string> = {};
  attrs: Record<string, string> = {};
  listeners = new Map<string, () => void>();
  id = "";
  type = "";
  title = "";
  disabled = false;
  textContent = "";
  ownerDocument: { getElementById(id: string): FakeNode | null };
  constructor(owner: { getElementById(id: string): FakeNode | null }) {
    this.ownerDocument = owner;
  }
  append(...nodes: FakeNode[]): void {
    for (const n of nodes) {
      n.parent?.children.splice(n.parent.children.indexOf(n), 1);
      n.parent = this;
      this.children.push(n);
    }
  }
  appendChild(n: FakeNode): FakeNode {
    this.append(n);
    return n;
  }
  addEventListener(type: string, cb: () => void): void {
    this.listeners.set(type, cb);
  }
  click(): void {
    this.listeners.get("click")?.();
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v;
  }
  removeAttribute(k: string): void {
    delete this.attrs[k];
  }
}

const NONE = { getElementById: (_: string): FakeNode | null => null };

describe("mountBar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("les boutons précèdent la zone d'état #etat, même déjà présente avant eux dans la page", () => {
    const owner = { getElementById: (_: string): FakeNode | null => status };
    const root = new FakeNode(owner);
    const status = new FakeNode(owner);
    status.id = "etat";
    root.append(status);
    vi.stubGlobal("document", { createElement: () => new FakeNode(owner) });
    mountBar(root as unknown as HTMLElement, {
      setTool: () => {},
      setEraserMode: () => {},
      undo: () => {},
      redo: () => {},
      state: () => base,
      onState: () => () => {},
    });
    expect(root.children.map((c) => c.dataset["action"] ?? c.id)).toEqual([
      "pen",
      "eraser",
      "hand",
      "eraser-mode",
      "undo",
      "redo",
      "etat",
    ]);
  });

  it("mode de gomme : un clic bascule partielle ↔ objet", () => {
    const root = new FakeNode(NONE);
    vi.stubGlobal("document", { createElement: () => new FakeNode(NONE) });
    let state: EngineState = base;
    const modes: string[] = [];
    mountBar(root as unknown as HTMLElement, {
      setTool: () => {},
      setEraserMode: (m) => {
        modes.push(m);
        state = { ...state, eraserMode: m };
      },
      undo: () => {},
      redo: () => {},
      state: () => state,
      onState: () => () => {},
    });
    const button = root.children.find((c) => c.dataset["action"] === "eraser-mode");
    button?.click();
    button?.click();
    expect(modes).toEqual(["object", "partial"]);
  });
});

describe("mountSettings", () => {
  afterEach(() => vi.unstubAllGlobals());

  function mount(search = "") {
    const root = new FakeNode(NONE);
    vi.stubGlobal("document", { createElement: () => new FakeNode(NONE) });
    const store = createSettingsStore(DEFAULT_SETTINGS);
    const went: string[] = [];
    mountSettings(root as unknown as HTMLElement, {
      store,
      effective: () => OFF,
      notes: ["échelon inconnu : 7"],
      search: () => search,
      navigate: (s) => went.push(s),
    });
    const button = (key: string): FakeNode | undefined => root.children.find((c) => c.dataset["reglage"] === key);
    return { root, store, went, button };
  }

  it("doigt : un clic bascule le réglage sans recharger, le libellé suit", () => {
    const { store, went, button } = mount();
    button("finger")?.click();
    expect(store.get().finger).toBe("draw");
    expect(button("finger")?.textContent).toBe("Doigt : trace");
    expect(went).toEqual([]);
  });

  it("É4 : un clic recharge avec ?echelons=4:on et garde ?banc", () => {
    const { store, went, button } = mount("?banc");
    button("webgl")?.click();
    expect(went).toEqual(["?banc=&echelons=4:on"]);
    expect(store.get().webgl).toBe("off");
    expect(button("webgl")?.title).toBe("Recharge la page : le dessin en cours est perdu");
  });

  it("notes du démarrage affichées après les boutons (adresse mal écrite, repli WebGL2)", () => {
    const { root } = mount();
    expect(root.children).toHaveLength(6);
    const last = root.children.at(-1);
    expect(last?.id).toBe("echelons-notes");
    expect(last?.textContent).toBe("échelon inconnu : 7");
  });
});
