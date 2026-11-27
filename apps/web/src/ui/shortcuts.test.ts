import { describe, expect, it } from "vitest";
import { appShortcut, cellKey, editAction, isCtrlKey, isPanKey, lineEditKey, linkedKey, keyAction, objectKey, orderKey, pageKey, type KeyLike } from "../engine/input/keys";
import { fileCommandOf } from "../platform/controller";
import { SHORTCUTS, ariaShortcut, isHelpKey, shortcutText } from "./shortcuts";

/** Valeur attendue de chaque raccourci, par reconnaisseur : une ligne ajoutée à SHORTCUTS sans ligne ici fait échouer le test. */
const EXPECT: Readonly<Record<string, readonly [string, string]>> = {
  "file-new": ["file", "new"], "file-open": ["file", "open"], "file-save": ["file", "save"], "file-save-as": ["file", "saveAs"], "export-pdf": ["file", "exportPdf"], help: ["help", "?"],
  undo: ["key", "undo"], redo: ["key", "redo"], group: ["key", "group"], ungroup: ["key", "ungroup"],
  duplicate: ["object", "duplicate"], delete: ["edit", "delete"], escape: ["edit", "escape"],
  front: ["order", "front"], forward: ["order", "up"], backward: ["order", "down"], back: ["order", "back"],
  copy: ["native", "c"], cut: ["native", "x"], paste: ["native", "v"], pan: ["pan", " "], bold: ["rich", "b"],
  "stroke-picker": ["object", "stroke-picker"], "fill-picker": ["object", "fill-picker"], link: ["object", "link"],
  backgrounds: ["app", "backgrounds"], "page-prev": ["page", "prev"], "page-next": ["page", "next"], "page-number": ["page", "sidebar-pages"],
  "line-edit": ["lineEdit", "Enter"], "linked-node": ["linked", "right"], "no-binding": ["ctrlHeld", "Control"],
  "palm-eraser": ["app", "palm-eraser"],
  "cell-place": ["cell", "place"], "cell-unplace": ["cell", "unplace"], "table-fit": ["cell", "fit"], "cell-image": ["cell", "cell-image"],
};
const NAMED: Readonly<Record<string, string>> = { Suppr: "Delete", "Échap": "Escape", Espace: " ", "Pg préc": "PageUp", "Pg suiv": "PageDown", "↑": "ArrowUp", "↓": "ArrowDown", "Entrée": "Enter" };
const press = (keys: string): KeyLike => {
  const parts = keys.split("+");
  const k = parts.at(-1)!;
  const key = Object.hasOwn(NAMED, k) ? NAMED[k]! : k.toLowerCase();
  return { key, ctrlKey: parts.includes("Ctrl"), metaKey: false, shiftKey: parts.includes("Maj"), altKey: false, isComposing: false, target: null };
};

describe("shortcuts", () => {
  it("chaque raccourci a son reconnaisseur", () => {
    for (const s of SHORTCUTS) {
      const want = EXPECT[s.id];
      expect(want, `ligne EXPECT manquante pour ${s.id}`).toBeDefined();
      const [by, value] = want!;
      const e = press(s.keys.split(/, | \+ /)[0]!);
      if (by === "file") expect(fileCommandOf(e), s.id).toBe(value);
      else if (by === "key") expect(keyAction(e), s.id).toBe(value);
      else if (by === "object") expect(objectKey(e), s.id).toBe(value);
      else if (by === "order") expect(orderKey(e), s.id).toBe(value);
      else if (by === "edit") expect(editAction(e), s.id).toBe(value);
      else if (by === "help") expect(isHelpKey({ ...press("?"), key: "?" }), s.id).toBe(true);
      else if (by === "app") expect(appShortcut(e), s.id).toBe(value);
      else if (by === "page") expect(pageKey(e), s.id).toBe(value);
      else if (by === "cell") expect(cellKey({ ...press("Enter"), code: s.keys.endsWith("Entrée") ? "Enter" : `Key${s.keys.slice(-1)}`, altKey: true, shiftKey: s.keys.includes("Maj") }), s.id).toBe(value);
      else if (by === "lineEdit") expect(lineEditKey(e), s.id).toBe(true);
      else if (by === "linked") expect(linkedKey({ ...press("→"), key: "ArrowRight", altKey: true, shiftKey: true }), s.id).toBe(value);
      else if (by === "ctrlHeld") expect(isCtrlKey({ key: "Control" }), s.id).toBe(true);
      else if (by === "pan") expect(isPanKey(press(s.keys.split(/, | \+ /)[0]!)), s.id).toBe(true);
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
  it("OG19 : ariaShortcut (aria-keyshortcuts) : Control ou Meta, Shift, touches nommées ; geste ou liste : null", () => {
    expect(ariaShortcut("backgrounds", false)).toBe("Control+Shift+F");
    expect(ariaShortcut("backgrounds", true)).toBe("Meta+Shift+F");
    expect(ariaShortcut("page-prev", false)).toBe("PageUp");
    expect(ariaShortcut("delete", false)).toBe("Delete");
    expect(ariaShortcut("pan", false)).toBeNull();
    expect(ariaShortcut("bold", false)).toBeNull();
    expect(ariaShortcut("inconnu", false)).toBeNull();
  });
  it("OG25 : palm-eraser dans la table — Ctrl+Maj+H, ⌘⇧H, Control+Shift+H", () => {
    expect(shortcutText("palm-eraser", false)).toBe("Ctrl+Maj+H");
    expect(shortcutText("palm-eraser", true)).toBe("⌘⇧H");
    expect(ariaShortcut("palm-eraser", false)).toBe("Control+Shift+H");
  });
  it("fusion lot 2 + OG19 (discrimine) : ariaShortcut nomme les flèches de Disposition et garde « ? » de l'Aide", () => {
    expect(ariaShortcut("front", false)).toBe("Control+Shift+ArrowUp");
    expect(ariaShortcut("backward", true)).toBe("Meta+ArrowDown");
    expect(ariaShortcut("link", false)).toBe("Control+K");
    expect(ariaShortcut("help", false)).toBe("?");
    expect(ariaShortcut("stroke-picker", false)).toBe("S");
  });
  it("fusion lot 2 + OG19 : aucune touche ne sert deux actions de la table", () => {
    const keys = SHORTCUTS.map((s) => s.keys);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });
  it("ids uniques", () => {
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
    expect(SHORTCUTS.map((s) => s.id).sort()).toEqual(Object.keys(EXPECT).sort());
  });
});

describe("OG12 : raccourcis des lignes", () => {
  it("line-edit, linked-node et no-binding existent", () => {
    for (const id of ["line-edit", "linked-node", "no-binding"]) expect(SHORTCUTS.some((x) => x.id === id), id).toBe(true);
  });
  it("ariaShortcut : line-edit Control+Enter / Meta+Enter ; linked-node (liste de touches) : null", () => {
    expect(ariaShortcut("line-edit", false)).toBe("Control+Enter");
    expect(ariaShortcut("line-edit", true)).toBe("Meta+Enter");
    expect(ariaShortcut("linked-node", false)).toBeNull();
  });
});
