import { describe, expect, it } from "vitest";
import { appShortcut, editAction, inEditable, isCtrlKey, isPanKey, lineEditKey, linkedKey, keyAction, objectKey, orderKey, pageKey, type KeyLike } from "./keys";

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

describe("objectKey : S et G (OG11, T16)", () => {
  it("S ouvre le trait", () => {
    expect(objectKey(k("s"))).toBe("stroke-picker");
    expect(objectKey(k("S"))).toBe("stroke-picker");
  });
  it("G ouvre le fond", () => {
    expect(objectKey(k("g"))).toBe("fill-picker");
  });
  it("S et G : rien avec modificateur, en champ ou en composition", () => {
    for (const key of ["s", "g"]) {
      expect(objectKey(k(key, { ctrlKey: true }))).toBeNull();
      expect(objectKey(k(key, { metaKey: true }))).toBeNull();
      expect(objectKey(k(key, { shiftKey: true }))).toBeNull();
      expect(objectKey(k(key, { altKey: true }))).toBeNull();
      expect(objectKey(k(key, { target: { tagName: "INPUT", type: "text" } }))).toBeNull();
      expect(objectKey(k(key, { isComposing: true }))).toBeNull();
    }
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

describe("pageKey (DA9)", () => {
  it("pageKey : PageUp, PageDown, Ctrl+M (aussi Mac), Ctrl+Maj+D, Ctrl+Maj+P, Ctrl+Maj+L", () => {
    expect(pageKey(k("PageUp"))).toBe("prev");
    expect(pageKey(k("PageDown"))).toBe("next");
    expect(pageKey(k("m", { ctrlKey: true }))).toBe("add");
    expect(pageKey(k("D", { ctrlKey: true, shiftKey: true }))).toBe("duplicate");
    expect(pageKey(k("d", { metaKey: true, shiftKey: true }))).toBe("duplicate");
    expect(pageKey(k("P", { ctrlKey: true, shiftKey: true }))).toBe("sidebar-pages");
    expect(pageKey(k("l", { metaKey: true, shiftKey: true }))).toBe("sidebar-layers");
  });
  it("pageKey : Alt Gr et composition IME : null ; Cmd+M : null", () => {
    expect(pageKey(k("m", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(pageKey(k("PageUp", { isComposing: true }))).toBeNull();
    expect(pageKey(k("m", { ctrlKey: true, isComposing: true }))).toBeNull();
    expect(pageKey(k("m", { metaKey: true }))).toBeNull();
    expect(pageKey(k("PageDown", { ctrlKey: true }))).toBeNull();
  });
  it("pageKey : champ de saisie : null ; inEditable exporté", () => {
    expect(pageKey(k("PageUp", { target: { tagName: "INPUT" } }))).toBeNull();
    expect(inEditable({ tagName: "TEXTAREA" })).toBe(true);
    expect(inEditable({ tagName: "BUTTON" })).toBe(false);
  });
});

describe("orderKey (ordre des objets, lot 2)", () => {
  it("orderKey : Ctrl+↑ / Ctrl+↓ un rang, Ctrl+Maj+↑ / Ctrl+Maj+↓ premier plan et arrière-plan (Cmd aussi)", () => {
    expect(orderKey(k("ArrowUp", { ctrlKey: true }))).toBe("up");
    expect(orderKey(k("ArrowDown", { metaKey: true }))).toBe("down");
    expect(orderKey(k("ArrowUp", { ctrlKey: true, shiftKey: true }))).toBe("front");
    expect(orderKey(k("ArrowDown", { metaKey: true, shiftKey: true }))).toBe("back");
  });
  it("orderKey : flèche seule, Maj seul, Alt, composition IME, champ de saisie, autre touche : null", () => {
    expect(orderKey(k("ArrowUp"))).toBeNull();
    expect(orderKey(k("ArrowUp", { shiftKey: true }))).toBeNull();
    expect(orderKey(k("ArrowUp", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(orderKey(k("ArrowUp", { ctrlKey: true, isComposing: true }))).toBeNull();
    expect(orderKey(k("ArrowUp", { ctrlKey: true, target: { tagName: "INPUT" } }))).toBeNull();
    expect(orderKey(k("ArrowUp", { ctrlKey: true, target: { isContentEditable: true } }))).toBeNull();
    expect(orderKey(k("ArrowLeft", { ctrlKey: true }))).toBeNull();
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
  it("OG25 : Ctrl+Maj+H et Cmd+Maj+H → palm-eraser ; hors champ, hors composition, jamais avec Alt ni sans Maj", () => {
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true }))).toBe("palm-eraser");
    expect(appShortcut(k("h", { metaKey: true, shiftKey: true }))).toBe("palm-eraser");
    expect(appShortcut(k("h", { ctrlKey: true }))).toBeNull();
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true, altKey: true }))).toBeNull();
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true, isComposing: true }))).toBeNull();
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true, target: { tagName: "INPUT" } }))).toBeNull();
  });
});

describe("OG12 : lineEditKey, linkedKey, isCtrlKey", () => {
  it("lineEditKey : Ctrl ou Cmd+Entrée, rien d'autre", () => {
    expect(lineEditKey(k("Enter", { ctrlKey: true }))).toBe(true);
    expect(lineEditKey(k("Enter", { metaKey: true }))).toBe(true);
    expect(lineEditKey(k("Enter", { ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(lineEditKey(k("Enter", { ctrlKey: true, altKey: true }))).toBe(false);
    expect(lineEditKey(k("Enter"))).toBe(false);
    expect(lineEditKey(k("Enter", { ctrlKey: true, isComposing: true }))).toBe(false);
    expect(lineEditKey(k("Enter", { ctrlKey: true, target: { tagName: "INPUT" } as unknown as KeyLike["target"] }))).toBe(false);
  });
  it("linkedKey : Alt+Maj+flèche", () => {
    expect(linkedKey(k("ArrowRight", { altKey: true, shiftKey: true }))).toBe("right");
    expect(linkedKey(k("ArrowUp", { altKey: true, shiftKey: true }))).toBe("up");
    expect(linkedKey(k("ArrowDown", { altKey: true, shiftKey: true }))).toBe("down");
    expect(linkedKey(k("ArrowLeft", { altKey: true, shiftKey: true }))).toBe("left");
    expect(linkedKey(k("ArrowRight", { altKey: true }))).toBeNull();
    expect(linkedKey(k("ArrowRight", { altKey: true, shiftKey: true, ctrlKey: true }))).toBeNull();
    expect(linkedKey(k("a", { altKey: true, shiftKey: true }))).toBeNull();
    expect(linkedKey(k("ArrowRight", { altKey: true, shiftKey: true, target: { tagName: "INPUT" } as unknown as KeyLike["target"] }))).toBeNull();
  });
  it("orderKey inchangé pour Ctrl+↑", () => {
    expect(orderKey(k("ArrowUp", { ctrlKey: true }))).not.toBeNull();
  });
  it("isCtrlKey : Control ou Meta", () => {
    expect(isCtrlKey({ key: "Control" })).toBe(true);
    expect(isCtrlKey({ key: "Meta" })).toBe(true);
    expect(isCtrlKey({ key: "Shift" })).toBe(false);
  });
});
