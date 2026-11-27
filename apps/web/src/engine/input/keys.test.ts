import { describe, expect, it } from "vitest";
import { appShortcut, editAction, isPanKey, keyAction, type KeyLike } from "./keys";

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

describe("appShortcut (personnalisation-1b, Q28)", () => {
  it("Ctrl+Maj+F et Cmd+Maj+F → backgrounds, touche rendue en majuscule ou non", () => {
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true }))).toBe("backgrounds");
    expect(appShortcut(k("f", { metaKey: true, shiftKey: true }))).toBe("backgrounds");
  });
  it("sans Maj, avec Alt, en composition, dans un champ, autre touche, sans Ctrl ni Cmd : null", () => {
    expect(appShortcut(k("f", { ctrlKey: true }))).toBeNull();
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true, altKey: true }))).toBeNull();
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true, isComposing: true }))).toBeNull();
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true, target: { tagName: "INPUT" } }))).toBeNull();
    expect(appShortcut(k("G", { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(appShortcut(k("F", { shiftKey: true }))).toBeNull();
  });
  it("Ctrl+Maj+F n'est pas une touche du moteur (annuler, grouper)", () => {
    expect(keyAction(k("F", { ctrlKey: true, shiftKey: true }))).toBeNull();
  });
});
