import { describe, expect, it } from "vitest";
import { ARRANGE_HOWS } from "../../core/arrange";
import { appShortcut, arrangeKey, gridKey, cellKey, editAction, inEditable, isCtrlKey, isPanKey, keyAction, lineEditKey, linkedKey, nudgeKey, objectKey, orderKey, pageKey, tableKey, toolKey, type KeyLike } from "./keys";

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

describe("cellKey (H12)", () => {
  it("cellKey : Alt+Entrée, Alt+Maj+Entrée, Alt+F, Alt+I ; Ctrl ou champ : null", () => {
    const c = (o: Partial<KeyLike>): KeyLike => ({ key: "", code: "", ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null, ...o });
    expect(cellKey(c({ key: "Enter", code: "Enter" }))).toBe("place");
    expect(cellKey(c({ key: "Enter", code: "Enter", shiftKey: true }))).toBe("unplace");
    expect(cellKey(c({ key: "ƒ", code: "KeyF" }))).toBe("fit");
    expect(cellKey(c({ key: "i", code: "KeyI" }))).toBe("cell-image");
    expect(cellKey(c({ key: "Enter", code: "Enter", ctrlKey: true }))).toBeNull();
    expect(cellKey(c({ key: "Enter", code: "Enter", target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(cellKey(c({ key: "Enter", code: "Enter", altKey: false }))).toBeNull();
  });
});

describe("tableKey (H12)", () => {
  it("tableKey : Alt+flèches seules ; avec Ctrl, Maj, Cmd, sans Alt, en saisie ou en composition : null", () => {
    const a = (key: string, o: Partial<KeyLike> = {}): KeyLike => ({ key, code: key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null, ...o });
    expect(tableKey(a("a", { code: "KeyA" }))).toBe("fit-content");
    expect(tableKey(a("ArrowRight"))).toBe("col-wider");
    expect(tableKey(a("ArrowLeft"))).toBe("col-narrower");
    expect(tableKey(a("ArrowDown"))).toBe("row-taller");
    expect(tableKey(a("ArrowUp"))).toBe("row-shorter");
    expect(tableKey(a("ArrowRight", { ctrlKey: true }))).toBeNull();
    expect(tableKey(a("ArrowRight", { metaKey: true }))).toBeNull();
    expect(tableKey(a("ArrowRight", { altKey: false }))).toBeNull();
    expect(tableKey(a("ArrowRight", { shiftKey: true }))).toBeNull();
    expect(tableKey(a("ArrowRight", { isComposing: true }))).toBeNull();
    expect(tableKey(a("ArrowRight", { target: { isContentEditable: true } }))).toBeNull();
  });
});

describe("tableKey TB2", () => {
  it("tableKey : Alt+E bascule l'en-tête, sans Maj ni Ctrl", () => {
    const a = (o: Partial<KeyLike> = {}): KeyLike => ({ key: "e", code: "KeyE", ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null, ...o });
    expect(tableKey(a())).toBe("header-toggle");
    expect(tableKey(a({ shiftKey: true }))).toBeNull();
    expect(tableKey(a({ ctrlKey: true }))).toBeNull();
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

describe("arrangeKey (OG23, déc. 24)", () => {
  const letter = (l: string, code: string, mods: Partial<Omit<KeyLike, "key">>, azerty: boolean): KeyLike =>
    mods.altKey === true ? k(azerty ? "˙" : "Ó", { ...mods, code }) : k(l, { ...mods, code });
  const SPECS: ReadonlyArray<readonly [string, "h" | "v" | "r" | "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown", Partial<Omit<KeyLike, "key">>]> = [
    ["flip-h", "h", { shiftKey: true }], ["flip-v", "v", { shiftKey: true }], ["rotate-cw", "r", { shiftKey: true }],
    ["rotate-ccw", "r", { altKey: true, shiftKey: true }], ["align-center", "h", { altKey: true, shiftKey: true }], ["align-middle", "v", { altKey: true, shiftKey: true }],
    ["distribute-h", "h", { altKey: true }], ["distribute-v", "v", { altKey: true }],
    ["align-left", "ArrowLeft", { altKey: true, shiftKey: true }], ["align-right", "ArrowRight", { altKey: true, shiftKey: true }],
    ["align-top", "ArrowUp", { altKey: true, shiftKey: true }], ["align-bottom", "ArrowDown", { altKey: true, shiftKey: true }],
  ];
  it("arrangeKey AZERTY et QWERTY", () => {
    expect(SPECS.map(([how]) => how).sort()).toEqual([...ARRANGE_HOWS].sort());
    for (const [how, l, mods] of SPECS) {
      const named = l.startsWith("Arrow");
      for (const azerty of [true, false]) {
        const e = named ? k(l, mods) : letter(mods.shiftKey === true && mods.altKey !== true ? l.toUpperCase() : l, `Key${l.toUpperCase()}`, mods, azerty);
        expect(arrangeKey(e), `${how} ${azerty ? "AZERTY" : "QWERTY"}`).toBe(how);
      }
    }
  });
  it("arrangeKey lit code avec Alt", () => {
    expect(arrangeKey(k("˙", { code: "KeyH", altKey: true }))).toBe("distribute-h");
    expect(arrangeKey(k("Ó", { code: "KeyH", altKey: true, shiftKey: true }))).toBe("align-center");
    expect(arrangeKey(k("h", { altKey: true }))).toBeNull();
  });
  it("arrangeKey : un champ de saisie ou un évènement déjà traité ne range rien ; un bouton, un radio, une case de grille focalisés ne bloquent pas (OG23, T21)", () => {
    const role = (r: string) => ({ tagName: "DIV", getAttribute: (n: string) => (n === "role" ? r : null) });
    for (const target of [{ tagName: "INPUT", type: "text" }, { tagName: "TEXTAREA" }, { tagName: "DIV", isContentEditable: true }]) {
      expect(arrangeKey(k("ArrowLeft", { altKey: true, shiftKey: true, target })), JSON.stringify(target)).toBeNull();
      expect(arrangeKey(k("H", { shiftKey: true, target })), JSON.stringify(target)).toBeNull();
    }
    for (const target of [{ tagName: "BUTTON" }, { tagName: "INPUT", type: "range" }, { tagName: "INPUT", type: "radio" }, role("radio"), role("gridcell"), role("tab")]) {
      expect(arrangeKey(k("H", { shiftKey: true, target })), JSON.stringify(target)).toBe("flip-h");
      expect(arrangeKey(k("ArrowLeft", { altKey: true, shiftKey: true, target })), JSON.stringify(target)).toBe("align-left");
    }
    expect(arrangeKey(k("ArrowLeft", { altKey: true, shiftKey: true, defaultPrevented: true }))).toBeNull();
    expect(arrangeKey(k("H", { shiftKey: true, defaultPrevented: true }))).toBeNull();
    expect(arrangeKey(k("ArrowLeft", { altKey: true, shiftKey: true, target: { tagName: "CANVAS" } }))).toBe("align-left");
    expect(arrangeKey(k("ArrowLeft", { altKey: true, shiftKey: true, target: null }))).toBe("align-left");
  });
  it("nudgeKey : une flèche seule sur un bouton ou un contrôle ne pousse rien (inchangé)", () => {
    expect(nudgeKey(k("ArrowLeft", { target: { tagName: "BUTTON" } }))).toBeNull();
    expect(nudgeKey(k("ArrowLeft", { target: { tagName: "DIV", getAttribute: (n: string) => (n === "role" ? "radio" : null) } }))).toBeNull();
  });
  it("arrangeKey refuse Ctrl, saisie, composition", () => {
    expect(arrangeKey(k("H", { shiftKey: true, ctrlKey: true }))).toBeNull();
    expect(arrangeKey(k("H", { shiftKey: true, metaKey: true }))).toBeNull();
    expect(arrangeKey(k("H", { shiftKey: true, target: { tagName: "INPUT", type: "text" } }))).toBeNull();
    expect(arrangeKey(k("H", { shiftKey: true, isComposing: true }))).toBeNull();
    expect(arrangeKey(k("h"))).toBeNull();
    expect(arrangeKey(k("ArrowUp", { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(orderKey(k("ArrowUp", { ctrlKey: true, shiftKey: true }))).toBe("front");
  });
  it("nudgeKey", () => {
    expect(nudgeKey(k("ArrowLeft"))).toEqual({ dx: -1, dy: 0 });
    expect(nudgeKey(k("ArrowRight"))).toEqual({ dx: 1, dy: 0 });
    expect(nudgeKey(k("ArrowUp"))).toEqual({ dx: 0, dy: -1 });
    expect(nudgeKey(k("ArrowDown", { shiftKey: true }))).toEqual({ dx: 0, dy: 5 });
    expect(nudgeKey(k("ArrowLeft", { ctrlKey: true }))).toBeNull();
    expect(nudgeKey(k("ArrowLeft", { metaKey: true }))).toBeNull();
    expect(nudgeKey(k("ArrowLeft", { altKey: true }))).toBeNull();
    expect(nudgeKey(k("ArrowLeft", { target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(nudgeKey(k("a"))).toBeNull();
  });
  it("nudgeKey : les flèches d'un contrôle de l'interface ne déplacent rien (OG23, T17)", () => {
    const role = (r: string) => ({ tagName: "DIV", getAttribute: (n: string) => (n === "role" ? r : null) });
    for (const target of [
      { tagName: "BUTTON" },
      { tagName: "INPUT", type: "range" },
      { tagName: "INPUT", type: "checkbox" },
      { tagName: "SELECT" },
      role("radio"),
      role("gridcell"),
      role("tab"),
      role("menuitem"),
      role("slider"),
      role("option"),
      { tagName: "DIV", isContentEditable: true },
    ]) {
      expect(nudgeKey(k("ArrowLeft", { target }))).toBeNull();
    }
  });
  it("nudgeKey : une flèche déjà traitée (defaultPrevented) ne déplace rien", () => {
    expect(nudgeKey(k("ArrowLeft", { defaultPrevented: true }))).toBeNull();
  });
  it("nudgeKey : focus sur la scène, le body ou rien : la flèche déplace", () => {
    expect(nudgeKey(k("ArrowLeft", { target: { tagName: "CANVAS" } }))).toEqual({ dx: -1, dy: 0 });
    expect(nudgeKey(k("ArrowLeft", { target: { tagName: "BODY" } }))).toEqual({ dx: -1, dy: 0 });
    expect(nudgeKey(k("ArrowLeft", { target: null }))).toEqual({ dx: -1, dy: 0 });
  });
});

describe("fusion OG23 × OG26 : touches de l'outil Tableau et Disposer disjointes", () => {
  // Les touches du Tableau (Alt+flèches, Alt+E, Alt+F, Alt+I, Alt+Entrée, Alt+Maj+Entrée, Alt+Maj+C, Alt+Maj+M) ne tombent sur aucun
  // raccourci d'OG23 (Alt+Maj+flèches, Alt+Maj+H/V/R, Alt+H/V, Maj+H/V/R, flèches) : aucun arbitrage de contexte requis.
  const table: KeyLike[] = [
    ...["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].map((a) => k(a, { code: a, altKey: true })),
    k("e", { code: "KeyE", altKey: true }),
    k("a", { code: "KeyA", altKey: true }),
    k("f", { code: "KeyF", altKey: true }),
    k("i", { code: "KeyI", altKey: true }),
    k("Enter", { code: "Enter", altKey: true }),
    k("Enter", { code: "Enter", altKey: true, shiftKey: true }),
    k("C", { code: "KeyC", altKey: true, shiftKey: true }),
    k("M", { code: "KeyM", altKey: true, shiftKey: true }),
    k("b", { code: "KeyB", altKey: true }),
    k("B", { code: "KeyB", altKey: true, shiftKey: true }),
    ...["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].map((a) => k(a, { code: a, ctrlKey: true, shiftKey: true })),
  ];
  const og23: KeyLike[] = [
    ...["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].flatMap((a) => [k(a, { code: a, altKey: true, shiftKey: true }), k(a, { code: a }), k(a, { code: a, shiftKey: true })]),
    ...["h", "v", "r"].flatMap((l) => [k(l, { code: `Key${l.toUpperCase()}`, altKey: true, shiftKey: true }), k(l.toUpperCase(), { code: `Key${l.toUpperCase()}`, shiftKey: true })]),
    k("h", { code: "KeyH", altKey: true }),
    k("v", { code: "KeyV", altKey: true }),
  ];
  it("une touche du Tableau n'est ni Disposer ni un pas de flèche", () => {
    for (const e of table) {
      expect(tableKey(e) ?? cellKey(e), `${e.code}`).not.toBeNull();
      expect(arrangeKey(e), `${e.code}`).toBeNull();
      expect(nudgeKey(e), `${e.code}`).toBeNull();
    }
  });
  it("une touche d'OG23 n'est ni une touche de l'outil Tableau ni une touche de case", () => {
    for (const e of og23) {
      expect(arrangeKey(e) ?? nudgeKey(e), `${e.code}`).not.toBeNull();
      expect(tableKey(e), `${e.code}`).toBeNull();
      expect(cellKey(e), `${e.code}`).toBeNull();
    }
  });
});

describe("tableKey D15 : alignements", () => {
  it("tableKey : Alt+Maj+C → ha-next, Alt+Maj+M → va-next (lus par code) ; Alt+Maj+→, Alt+C, Ctrl+Alt+Maj+C : null", () => {
    const a = (key: string, code: string, o: Partial<KeyLike> = {}): KeyLike => ({ key, code, ctrlKey: false, metaKey: false, shiftKey: true, altKey: true, isComposing: false, target: null, ...o });
    expect(tableKey(a("C", "KeyC"))).toBe("ha-next");
    expect(tableKey(a("Ç", "KeyC"))).toBe("ha-next");
    expect(tableKey(a("M", "KeyM"))).toBe("va-next");
    expect(tableKey(a("ArrowRight", "ArrowRight"))).toBeNull();
    expect(tableKey(a("c", "KeyC", { shiftKey: false }))).toBeNull();
    expect(tableKey(a("C", "KeyC", { ctrlKey: true }))).toBeNull();
    expect(tableKey(a("C", "KeyC", { target: { isContentEditable: true } }))).toBeNull();
  });
});

describe("tableKey S9 : bordures", () => {
  it("tableKey : Alt+B → border-set, Alt+Maj+B → border-none (lus par code) ; Ctrl+Alt+B : null", () => {
    const a = (key: string, code: string, o: Partial<KeyLike> = {}): KeyLike => ({ key, code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null, ...o });
    expect(tableKey(a("b", "KeyB"))).toBe("border-set");
    expect(tableKey(a("B", "KeyB", { shiftKey: true }))).toBe("border-none");
    expect(tableKey(a("b", "KeyB", { ctrlKey: true }))).toBeNull();
  });
});

describe("tableKey S11 : déplacer une ligne ou une colonne", () => {
  const c = (key: string, o: Partial<KeyLike> = {}): KeyLike => ({ key, code: key, ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, isComposing: false, target: null, ...o });
  it("tableKey : Ctrl+Maj+flèches → row-up, row-down, col-left, col-right ; Ctrl+↑ seul : null", () => {
    expect(tableKey(c("ArrowUp"))).toBe("row-up");
    expect(tableKey(c("ArrowDown"))).toBe("row-down");
    expect(tableKey(c("ArrowLeft"))).toBe("col-left");
    expect(tableKey(c("ArrowRight"))).toBe("col-right");
    expect(tableKey(c("ArrowUp", { shiftKey: false }))).toBeNull();
    expect(tableKey(c("ArrowUp", { altKey: true }))).toBeNull();
  });
});

describe("lettres des outils", () => {
  it("toolKey : lettres et chiffres d'Excalidraw libres", () => {
    const m: Record<string, string> = { v: "select", r: "rect", d: "diamond", o: "ellipse", a: "arrow", l: "line", p: "pen", t: "text", e: "eraser", h: "hand", "1": "select", "2": "rect", "3": "diamond", "4": "ellipse", "5": "arrow", "6": "line", "7": "pen", "8": "text", "0": "eraser" };
    for (const [key, tool] of Object.entries(m)) expect(toolKey(k(key))).toBe(tool);
    expect(toolKey(k("R"))).toBe("rect");
  });
  it("toolKey : S et G restent aux sélecteurs de couleur ; rien avec modificateur, IME ou champ", () => {
    expect(toolKey(k("s"))).toBeNull();
    expect(toolKey(k("g"))).toBeNull();
    expect(toolKey(k("9"))).toBeNull();
    expect(toolKey(k("r", { ctrlKey: true }))).toBeNull();
    expect(toolKey(k("r", { metaKey: true }))).toBeNull();
    expect(toolKey(k("r", { altKey: true }))).toBeNull();
    expect(toolKey(k("r", { shiftKey: true }))).toBeNull();
    expect(toolKey(k("r", { isComposing: true }))).toBeNull();
    expect(toolKey(k("r", { target: { tagName: "INPUT", type: "text" } }))).toBeNull();
  });
});

describe("gridKey (OG69, G4 et G5 ; HE5 levée)", () => {
  it("Ctrl+' bascule la grille, Ctrl+Maj+' ouvre le Créateur, en QWERTY comme en AZERTY ; Cmd sous macOS", () => {
    expect(gridKey(k("'", { ctrlKey: true, code: "Quote" }))).toBe("grid-toggle");
    expect(gridKey(k("'", { metaKey: true, code: "Digit4" }))).toBe("grid-toggle");
    expect(gridKey(k('"', { ctrlKey: true, shiftKey: true, code: "Quote" }))).toBe("grid");
    expect(gridKey(k("4", { ctrlKey: true, shiftKey: true, code: "Digit4" }))).toBe("grid");
    expect(gridKey(k("4", { ctrlKey: true, code: "Digit4" }))).toBeNull();
    expect(gridKey(k("'", {}))).toBeNull();
    // QWERTZ : l'apostrophe est Maj+# : elle bascule ; Ctrl+ù (AZERTY, code Quote) ne fait rien.
    expect(gridKey(k("'", { ctrlKey: true, shiftKey: true, code: "Backslash" }))).toBe("grid-toggle");
    expect(gridKey(k("ù", { ctrlKey: true, code: "Quote" }))).toBeNull();
    expect(gridKey(k("Dead", { ctrlKey: true, code: "Quote" }))).toBe("grid-toggle");
  });
  it("Alt+G bascule l'aimant (lu par code : Option+G donne « © ») ; jamais avec Ctrl ou Maj, ni dans un champ", () => {
    expect(gridKey(k("g", { altKey: true, code: "KeyG" }))).toBe("magnet");
    expect(gridKey(k("©", { altKey: true, code: "KeyG" }))).toBe("magnet");
    expect(gridKey(k("g", { altKey: true, shiftKey: true, code: "KeyG" }))).toBeNull();
    expect(gridKey(k("g", { altKey: true, ctrlKey: true, code: "KeyG" }))).toBeNull();
    const field = { tagName: "INPUT", type: "text" } as KeyLike["target"];
    expect(gridKey(k("g", { altKey: true, code: "KeyG", target: field }))).toBeNull();
    expect(gridKey(k("'", { ctrlKey: true, code: "Quote", target: field }))).toBeNull();
  });
});
