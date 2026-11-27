// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { keyOf } from "./key-of";

describe("keyOf", () => {
  it("transmet code au moteur (raccourcis Alt lus par e.code)", () => {
    const e = new KeyboardEvent("keydown", { key: "Ḣ", code: "KeyH", altKey: true, shiftKey: true });
    const k = keyOf(e);
    expect(k.code).toBe("KeyH");
    expect(k.altKey).toBe(true);
    expect(k.shiftKey).toBe(true);
    expect(k.key).toBe("Ḣ");
  });
  it("transmet defaultPrevented : une touche déjà prise par un contrôle ne déplace pas la sélection (T17)", () => {
    const e = new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true });
    expect(keyOf(e).defaultPrevented).toBe(false);
    e.preventDefault();
    expect(keyOf(e).defaultPrevented).toBe(true);
  });
});
