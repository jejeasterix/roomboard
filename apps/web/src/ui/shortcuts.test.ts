import { describe, expect, it } from "vitest";
import { editAction, isPanKey, keyAction, objectKey, orderKey, type KeyLike } from "../engine/input/keys";
import { fileCommandOf } from "../platform/controller";
import { isHelpKey, SHORTCUTS, shortcutText } from "./shortcuts";

/** Valeur attendue de chaque raccourci, par reconnaisseur : une ligne ajoutée à SHORTCUTS sans ligne ici fait échouer le test. */
const EXPECT: Readonly<Record<string, readonly [string, string]>> = {
  "file-new": ["file", "new"], "file-open": ["file", "open"], "file-save": ["file", "save"], "file-save-as": ["file", "saveAs"], "export-pdf": ["file", "exportPdf"], help: ["help", "?"],
  undo: ["key", "undo"], redo: ["key", "redo"], group: ["key", "group"], ungroup: ["key", "ungroup"],
  duplicate: ["object", "duplicate"], delete: ["edit", "delete"], escape: ["edit", "escape"],
  front: ["order", "front"], forward: ["order", "up"], backward: ["order", "down"], back: ["order", "back"],
  copy: ["native", "c"], cut: ["native", "x"], paste: ["native", "v"], pan: ["pan", " "], bold: ["rich", "b"],
  "stroke-picker": ["object", "stroke-picker"], "fill-picker": ["object", "fill-picker"], link: ["object", "link"],
};
const press = (keys: string): KeyLike => {
  const parts = keys.split("+");
  const k = parts.at(-1)!;
  const key = k === "↑" ? "ArrowUp" : k === "↓" ? "ArrowDown" : k === "Suppr" ? "Delete" : k === "Échap" ? "Escape" : k === "Espace" ? " " : k.toLowerCase();
  return { key, ctrlKey: parts.includes("Ctrl"), metaKey: false, shiftKey: parts.includes("Maj"), altKey: false, isComposing: false, target: null };
};

describe("shortcuts", () => {
  it("chaque raccourci a son reconnaisseur", () => {
    for (const s of SHORTCUTS) {
      const want = EXPECT[s.id];
      expect(want, `ligne EXPECT manquante pour ${s.id}`).toBeDefined();
      const [by, value] = want!;
      const e = press(s.keys.split(/[ ,]/)[0]!);
      if (by === "file") expect(fileCommandOf(e), s.id).toBe(value);
      else if (by === "key") expect(keyAction(e), s.id).toBe(value);
      else if (by === "object") expect(objectKey(e), s.id).toBe(value);
      else if (by === "order") expect(orderKey(e), s.id).toBe(value);
      else if (by === "edit") expect(editAction(e), s.id).toBe(value);
      else if (by === "help") expect(isHelpKey({ ...press("?"), key: "?" }), s.id).toBe(true);
      else if (by === "pan") expect(isPanKey(press(s.keys.split(/[ ,]/)[0]!)), s.id).toBe(true);
      else {
        // Copier, couper, coller (événements natifs) et Ctrl+B (rich-edit) : aucun reconnaisseur ne les vole.
        expect(e.key, s.id).toBe(value);
        expect(e.ctrlKey, s.id).toBe(true);
        expect(keyAction(e) ?? objectKey(e) ?? fileCommandOf(e) ?? editAction(e), s.id).toBeNull();
      }
    }
  });
  it("shortcutText : Ctrl sous Linux, ⌘ sous macOS", () => {
    expect(shortcutText("file-open", false)).toBe("Ctrl+O");
    expect(shortcutText("file-save-as", true)).toBe("⌘⇧S");
    expect(shortcutText("inconnu", false)).toBeNull();
  });
  it("isHelpKey : « ? » hors champ, sans Ctrl ni Alt, hors composition", () => {
    const q = { ...press("?"), key: "?" };
    expect(isHelpKey(q)).toBe(true);
    expect(isHelpKey({ ...q, ctrlKey: true })).toBe(false);
    expect(isHelpKey({ ...q, altKey: true })).toBe(false);
    expect(isHelpKey({ ...q, isComposing: true })).toBe(false);
    expect(isHelpKey({ ...q, target: { tagName: "INPUT", type: "text" } })).toBe(false);
    expect(isHelpKey({ ...q, key: "/" })).toBe(false);
  });
  it("ids uniques", () => {
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
    expect(SHORTCUTS.map((s) => s.id).sort()).toEqual(Object.keys(EXPECT).sort());
  });
});
