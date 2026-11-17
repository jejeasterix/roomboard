import { describe, expect, it } from "vitest";
import { keyAction, type KeyLike } from "./keys";

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
