import { describe, expect, it } from "vitest";
import { editAction, isPanKey, keyAction, objectKey, orderKey, type KeyLike } from "./keys";

const k = (key: string, mods: Partial<Omit<KeyLike, "key">> = {}): KeyLike => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  isComposing: false,
  target: null,
  ...mods,
});

describe("keyAction (D11)", () => {
  it("Ctrl+Z annule", () => {
    expect(keyAction(k("z", { ctrlKey: true }))).toBe("undo");
  });
  it("Cmd+Z annule (macOS)", () => {
    expect(keyAction(k("z", { metaKey: true }))).toBe("undo");
  });
  it("Ctrl+Y rétablit", () => {
    expect(keyAction(k("y", { ctrlKey: true }))).toBe("redo");
  });
  it("Ctrl+Maj+Z rétablit (touche rendue en majuscule)", () => {
    expect(keyAction(k("Z", { ctrlKey: true, shiftKey: true }))).toBe("redo");
  });
  it("Ctrl+Maj+Y : rien", () => {
    expect(keyAction(k("Y", { ctrlKey: true, shiftKey: true }))).toBeNull();
  });
  it("Z sans Ctrl : rien", () => {
    expect(keyAction(k("z"))).toBeNull();
  });
  it("pendant une composition IME : rien", () => {
    expect(keyAction(k("z", { ctrlKey: true, isComposing: true }))).toBeNull();
  });
  it("Alt Gr (Ctrl+Alt sous Windows) : rien", () => {
    expect(keyAction(k("z", { ctrlKey: true, altKey: true }))).toBeNull();
  });
  it("dans un champ de saisie ou une zone éditable : rien", () => {
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "input" } }))).toBeNull();
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "DIV", isContentEditable: true } }))).toBeNull();
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "BUTTON" } }))).toBe("undo");
  });
});

describe("isPanKey (D17 : espace + glisser)", () => {
  it("espace seul : déplacement de vue (Maj admise)", () => {
    expect(isPanKey(k(" "))).toBe(true);
    expect(isPanKey(k(" ", { shiftKey: true }))).toBe(true);
  });
  it("espace avec Ctrl, Cmd ou Alt : non", () => {
    expect(isPanKey(k(" ", { ctrlKey: true }))).toBe(false);
    expect(isPanKey(k(" ", { metaKey: true }))).toBe(false);
    expect(isPanKey(k(" ", { altKey: true }))).toBe(false);
  });
  it("espace dans un champ ou pendant une composition IME : non", () => {
    expect(isPanKey(k(" ", { target: { tagName: "input" } }))).toBe(false);
    expect(isPanKey(k(" ", { target: { isContentEditable: true } }))).toBe(false);
    expect(isPanKey(k(" ", { isComposing: true }))).toBe(false);
    expect(isPanKey(k(" ", { target: { tagName: "BUTTON" } }))).toBe(true);
  });
  it("autre touche : non", () => {
    expect(isPanKey(k("a"))).toBe(false);
    expect(isPanKey(k("Spacebar"))).toBe(false);
  });
});

describe("editAction (D12, CL4-10)", () => {
  it("Suppr et Retour arrière suppriment, Échap vide", () => {
    expect(editAction(k("Delete"))).toBe("delete");
    expect(editAction(k("Backspace"))).toBe("delete");
    expect(editAction(k("Escape"))).toBe("escape");
    expect(editAction(k("a"))).toBeNull();
  });
  it("rien dans un champ, pendant une composition, avec Ctrl, Cmd ou Alt", () => {
    expect(editAction(k("Delete", { target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(editAction(k("Escape", { isComposing: true }))).toBeNull();
    expect(editAction(k("Delete", { ctrlKey: true }))).toBeNull();
    expect(editAction(k("Delete", { metaKey: true }))).toBeNull();
    expect(editAction(k("Delete", { altKey: true }))).toBeNull();
  });
});

describe("keyAction : groupes (Z13)", () => {
  it("Ctrl+G groupe, Cmd+G aussi", () => {
    expect(keyAction(k("g", { ctrlKey: true }))).toBe("group");
    expect(keyAction(k("g", { metaKey: true }))).toBe("group");
  });
  it("Ctrl+Maj+G dégroupe (touche rendue en majuscule)", () => {
    expect(keyAction(k("G", { ctrlKey: true, shiftKey: true }))).toBe("ungroup");
  });
  it("G seul ou Alt+Ctrl+G : rien", () => {
    expect(keyAction(k("g"))).toBeNull();
    expect(keyAction(k("g", { ctrlKey: true, altKey: true }))).toBeNull();
  });
  it("Ctrl+G dans un champ : rien", () => {
    expect(keyAction(k("g", { ctrlKey: true, target: { tagName: "INPUT" } }))).toBeNull();
    expect(keyAction(k("g", { ctrlKey: true, target: { isContentEditable: true } }))).toBeNull();
  });
});

describe("objectKey (OG11)", () => {
  it("objectKey : Ctrl+D duplique, pas en champ, pas avec Maj", () => {
    const k = (over: Partial<KeyLike>): KeyLike => ({ key: "d", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null, ...over });
    expect(objectKey(k({}))).toBe("duplicate");
    expect(objectKey(k({ ctrlKey: false, metaKey: true }))).toBe("duplicate");
    expect(objectKey(k({ shiftKey: true }))).toBeNull();
    expect(objectKey(k({ target: { tagName: "INPUT" } }))).toBeNull();
    expect(objectKey(k({ isComposing: true }))).toBeNull();
  });
});

describe("keyAction : réglette et cases (le focus y reste après un réglage)", () => {
  it("Ctrl+Z sur un input range, checkbox, radio, button : annuler", () => {
    for (const type of ["range", "checkbox", "radio", "button", "color"]) {
      expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "INPUT", type } }))).toBe("undo");
    }
  });
  it("Ctrl+Z sur un input texte ou un champ sans type : rien", () => {
    for (const type of ["text", "number", "search", undefined]) {
      expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "INPUT", type } }))).toBeNull();
    }
  });
});

describe("orderKey (T15)", () => {
  it("orderKey : les quatre combinaisons", () => {
    expect(orderKey(k("ArrowUp", { ctrlKey: true, shiftKey: true }))).toBe("front");
    expect(orderKey(k("ArrowDown", { ctrlKey: true, shiftKey: true }))).toBe("back");
    expect(orderKey(k("ArrowUp", { ctrlKey: true }))).toBe("forward");
    expect(orderKey(k("ArrowDown", { metaKey: true }))).toBe("backward");
  });
  it("orderKey : nul en champ, en composition, avec Alt, sans Ctrl, autre touche", () => {
    expect(orderKey(k("ArrowUp", { ctrlKey: true, target: { tagName: "INPUT", type: "text" } }))).toBeNull();
    expect(orderKey(k("ArrowUp", { ctrlKey: true, isComposing: true }))).toBeNull();
    expect(orderKey(k("ArrowUp", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(orderKey(k("ArrowUp"))).toBeNull();
    expect(orderKey(k("ArrowLeft", { ctrlKey: true }))).toBeNull();
  });
});
