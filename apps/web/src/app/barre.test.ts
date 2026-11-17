import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineState } from "../engine/engine";
import { barModel, mountBar } from "./barre";

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

describe("barModel", () => {
  it("quatre boutons : stylo, gomme, annuler, rétablir ; libellés repris de toolbar.ts", () => {
    expect(barModel(base).map((b) => [b.action, b.label])).toEqual([
      ["pen", "Stylo"],
      ["eraser", "Gomme"],
      ["undo", "Annuler"],
      ["redo", "Rétablir"],
    ]);
  });

  it("l'outil courant est pressé, l'autre non", () => {
    expect(barModel({ ...base, tool: "eraser" }).map((b) => b.pressed)).toEqual([false, true, null, null]);
  });

  it("annuler et rétablir désactivés sans étape", () => {
    expect(barModel(base).map((b) => b.disabled)).toEqual([false, false, true, true]);
    expect(barModel({ ...base, canUndo: true, canRedo: true }).map((b) => b.disabled)).toEqual([false, false, false, false]);
  });
});

/** Faux nœud DOM minimal (pas d'environnement DOM dans la suite) : `append` déplace un nœud déjà attaché, comme le vrai. */
class FakeNode {
  children: FakeNode[] = [];
  parent: FakeNode | null = null;
  dataset: Record<string, string> = {};
  attrs: Record<string, string> = {};
  id = "";
  type = "";
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
  addEventListener(): void {}
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v;
  }
  removeAttribute(k: string): void {
    delete this.attrs[k];
  }
}

describe("mountBar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("les quatre boutons précèdent la zone d'état #etat, même déjà présente avant eux dans la page", () => {
    const owner = { getElementById: (_: string): FakeNode | null => status };
    const root = new FakeNode(owner);
    const status = new FakeNode(owner);
    status.id = "etat";
    root.append(status);
    vi.stubGlobal("document", { createElement: () => new FakeNode(owner) });
    mountBar(root as unknown as HTMLElement, {
      setTool: () => {},
      undo: () => {},
      redo: () => {},
      state: () => base,
      onState: () => () => {},
    });
    expect(root.children.map((c) => c.dataset["action"] ?? c.id)).toEqual(["pen", "eraser", "undo", "redo", "etat"]);
  });
});
