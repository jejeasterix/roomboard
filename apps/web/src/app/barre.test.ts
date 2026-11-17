import { describe, expect, it } from "vitest";
import type { EngineState } from "../engine/engine";
import { barModel } from "./barre";

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
