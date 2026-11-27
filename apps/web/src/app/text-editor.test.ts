// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TextSpan } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { IDENTITY } from "../engine/camera";
import { keyAction } from "../engine/input/keys";
import type { InputSample } from "../engine/input/sampler";
import { createTextTool, type TextEditSession, type TextTool } from "../engine/tools/text";
import type { ToolContext } from "../engine/tools/tool";
import { isEditable } from "../platform/paste";
import { readSelection, readText, setSelection } from "./rich-dom";
import { createTextEditor, cssMatrix, editorMove, formatKey, historyKey, plainPaste, TEXT_EDITOR_ID, type TextEditorEvents } from "./text-editor";

const parents: HTMLElement[] = [];
afterEach(() => {
  for (const p of parents.splice(0)) p.remove();
  document.getSelection()?.removeAllRanges();
});

function mount(events: () => TextEditorEvents | null) {
  const parent = document.createElement("div");
  document.body.append(parent);
  parents.push(parent);
  const editor = createTextEditor(parent, events);
  return { parent, zone: editor.element, editor };
}

function recorder() {
  const calls: string[] = [];
  const events: TextEditorEvents = {
    compositionStart: () => calls.push("start"),
    compositionEnd: () => calls.push("end"),
    requestCommit: () => calls.push("commit"),
  };
  return { calls, events };
}

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const session: TextEditSession = {
  page: "p", id: null, matrix: [1, 0, 0, 1, 100, 50], boxWidth: 600, color: "#1e40af", size: 48, initial: "Bonjour",
  spans: [plain("Bonjour")],
};
const withText = (spans: TextSpan[]): TextEditSession => ({ ...session, initial: spans.map((s) => s.text).join(""), spans });
const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const key = (k: string, o: KeyboardEventInit = {}): KeyboardEvent => new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...o });
const fire = (zone: HTMLElement, e: Event): Event => {
  zone.dispatchEvent(e);
  return e;
};
const before = (inputType: string): InputEvent => new InputEvent("beforeinput", { inputType, bubbles: true, cancelable: true });
const selectionChange = (): void => {
  document.dispatchEvent(new Event("selectionchange"));
};
const compose = (type: "compositionstart" | "compositionupdate" | "compositionend", data = ""): CompositionEvent =>
  new CompositionEvent(type, { bubbles: true, data });
/** Le navigateur insère `s` à la sélection (DOM aplati ici), place le curseur après, puis émet `input`. */
function typeIn(zone: HTMLElement, s: string): void {
  const sel = readSelection(zone) ?? { start: 0, end: 0 };
  const t = readText(zone);
  zone.textContent = t.slice(0, sel.start) + s + t.slice(sel.end);
  setSelection(zone, sel.start + s.length, sel.start + s.length);
  zone.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: s }));
}
/** Curseur ou sélection posés par l'utilisateur (clic, flèches) : DOM puis `selectionchange`. */
function caret(zone: HTMLElement, start: number, end = start): void {
  setSelection(zone, start, end);
  selectionChange();
}
const paste = (zone: HTMLElement, data: Record<string, string>): Event => {
  const e = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clipboardData", { value: { getData: (t: string) => data[t] ?? "" } });
  return fire(zone, e);
};

describe("zone de saisie du texte (CL4-2, CL4-3)", () => {
  it("cssMatrix : caméra × matrice de l'élément", () => {
    expect(cssMatrix({ zoom: 2, tx: 10, ty: 20 }, [1, 0, 0, 1, 100, 50])).toBe("matrix(2, 0, 0, 2, 210, 120)");
    expect(cssMatrix(IDENTITY, [2, 0, 0, 3, 5, 6])).toBe("matrix(2, 0, 0, 3, 5, 6)");
  });

  it("montée cachée hors de la scène ; open : visible, placée, police du rendu, valeur initiale, focus", () => {
    const { parent, zone, editor } = mount(() => null);
    expect([...parent.children]).toEqual([zone]);
    expect(zone.id).toBe(TEXT_EDITOR_ID);
    expect(zone.hidden).toBe(true);
    expect(zone.tagName).toBe("DIV");
    expect(zone.getAttribute("contenteditable")).toBe("true");
    const focus = vi.spyOn(zone, "focus");
    editor.open(session, { zoom: 2, tx: 10, ty: 20 });
    expect(zone.hidden).toBe(false);
    expect(editor.value()).toBe("Bonjour");
    expect(zone.textContent).toBe("Bonjour");
    expect(zone.style.transform).toBe("matrix(2, 0, 0, 2, 210, 120)");
    expect(zone.style.transformOrigin).toMatch(/^0(px)? 0(px)?$/);
    expect(zone.style.width).toBe("600px");
    expect(zone.style.fontSize).toBe("48px");
    expect(zone.style.fontFamily).toBe('"Atkinson Hyperlegible", system-ui, sans-serif');
    expect(zone.style.lineHeight).toBe("1.25");
    expect(zone.style.color).toMatch(/^(#1e40af|rgb\(30, 64, 175\))$/);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(readSelection(zone)).toEqual({ start: 7, end: 7 });
  });

  it("close : zone cachée et vidée ; value lit la saisie", () => {
    const { zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    typeIn(zone, " à tous");
    expect(editor.value()).toBe("Bonjour à tous");
    editor.close();
    expect(zone.hidden).toBe(true);
    expect(zone.childNodes).toHaveLength(0);
    expect(editor.value()).toBe("");
  });

  it("composition : début et fin transmis à l'outil", () => {
    const { calls, events } = recorder();
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    fire(zone, compose("compositionstart"));
    fire(zone, compose("compositionend"));
    expect(calls).toEqual(["start", "end"]);
  });

  it("Échap hors composition : validation demandée, touche gardée", () => {
    const { calls, events } = recorder();
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const e = fire(zone, key("Escape"));
    expect(calls).toEqual(["commit"]);
    expect(e.defaultPrevented).toBe(true);
    const enter = fire(zone, key("Enter"));
    expect(enter.defaultPrevented).toBe(false);
    expect(calls).toEqual(["commit"]);
  });

  it("Échap pendant la composition reste à l'IME : rien d'écrit avant compositionend (outil réel)", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const ctx: ToolContext = { doc, page: () => page, camera: () => IDENTITY, run: (cmd) => doc.apply(cmd) };
    let tool: TextTool | null = null;
    const { zone, editor } = mount(() => tool);
    tool = createTextTool(ctx, editor, () => ({ color: "#000000", size: 36 }), (s) => s.length * 10);
    tool.begin(1, [at(100, 200)]);
    tool.close(1, "end");
    expect(zone.hidden).toBe(false);
    fire(zone, compose("compositionstart"));
    zone.textContent = "こん";
    const esc = fire(zone, key("Escape", { isComposing: true }));
    fire(zone, new Event("blur"));
    expect(esc.defaultPrevented).toBe(false);
    expect(doc.elementIds(page)).toEqual([]);
    expect(zone.hidden).toBe(false);
    zone.textContent = "こんにちは";
    setSelection(zone, 5, 5);
    fire(zone, compose("compositionend", "こんにちは"));
    const ids = doc.elementIds(page);
    expect(ids).toHaveLength(1);
    expect(doc.element(ids[0] ?? "")).toMatchObject({ kind: "text", text: { content: "こんにちは" } });
    expect(zone.hidden).toBe(true);
  });

  it("réglette : saisie gardée (blur vers le panneau d'options sans validation, focus rendu après change)", () => {
    const { calls, events } = recorder();
    const { parent, zone, editor } = mount(() => events);
    const panel = document.createElement("aside");
    panel.setAttribute("data-options", "");
    const range = document.createElement("input");
    range.type = "range";
    panel.append(range);
    document.body.append(panel);
    parents.push(panel);
    editor.open(session, IDENTITY);
    const focus = vi.spyOn(zone, "focus");
    fire(zone, new FocusEvent("blur", { relatedTarget: range }));
    expect(calls).not.toContain("commit");
    range.dispatchEvent(new Event("change", { bubbles: true }));
    expect(focus).toHaveBeenCalledTimes(1);
    // Un second blur vers une zone hors du panneau valide encore.
    fire(zone, new FocusEvent("blur", { relatedTarget: parent }));
    expect(calls).toContain("commit");
  });
  it("perte du focus : validation demandée ; zone fermée, la perte du focus ne redemande rien", () => {
    const { calls, events } = recorder();
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    fire(zone, new Event("blur"));
    expect(calls).toEqual(["commit"]);
    editor.close();
    fire(zone, new Event("blur"));
    expect(calls).toEqual(["commit"]);
  });

  it("aucun outil branché : événements sans effet, sans erreur", () => {
    const { zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    expect(() => {
      fire(zone, compose("compositionstart"));
      fire(zone, compose("compositionupdate"));
      fire(zone, compose("compositionend"));
      fire(zone, key("Escape"));
      fire(zone, new Event("blur"));
      fire(zone, new InputEvent("input", { bubbles: true }));
      fire(zone, before("insertParagraph"));
      paste(zone, { "text/plain": "x" });
      selectionChange();
    }).not.toThrow();
  });

  it("la zone suit le zoom", () => {
    const { zone, editor } = mount(() => null);
    editor.follow({ zoom: 3, tx: 1, ty: 1 });
    expect(zone.style.transform).toBe("");
    editor.open(session, { zoom: 1, tx: 0, ty: 0 });
    editor.follow({ zoom: 2, tx: 10, ty: 20 });
    expect(zone.style.transform).toBe(cssMatrix({ zoom: 2, tx: 10, ty: 20 }, session.matrix));
    editor.close();
    editor.follow({ zoom: 5, tx: 0, ty: 0 });
    expect(zone.style.transform).toBe(cssMatrix({ zoom: 2, tx: 10, ty: 20 }, session.matrix));
  });
});

describe("zone de saisie — navigation du tableau (C10a, DAC3)", () => {
  it("editorMove : Tab, Maj+Tab ; Ctrl+Tab et Alt+Tab non pris", () => {
    expect(editorMove({ key: "Tab" }, "ab", 1, 1)).toBe("next");
    expect(editorMove({ key: "Tab", shiftKey: true }, "ab", 1, 1)).toBe("prev");
    expect(editorMove({ key: "Tab", ctrlKey: true }, "ab", 1, 1)).toBeNull();
    expect(editorMove({ key: "Tab", altKey: true }, "ab", 1, 1)).toBeNull();
  });

  it("editorMove : flèches au bord du texte seulement (lignes logiques, HC10-8) ; sélection, Maj, Entrée : rien", () => {
    expect(editorMove({ key: "ArrowLeft" }, "xy", 0, 0)).toBe("left");
    expect(editorMove({ key: "ArrowLeft" }, "xy", 1, 1)).toBeNull();
    expect(editorMove({ key: "ArrowRight" }, "xy", 2, 2)).toBe("right");
    expect(editorMove({ key: "ArrowRight" }, "xy", 1, 1)).toBeNull();
    expect(editorMove({ key: "ArrowUp" }, "a\nb", 1, 1)).toBe("up");
    expect(editorMove({ key: "ArrowUp" }, "a\nb", 3, 3)).toBeNull();
    expect(editorMove({ key: "ArrowDown" }, "a\nb", 2, 2)).toBe("down");
    expect(editorMove({ key: "ArrowDown" }, "a\nb", 1, 1)).toBeNull();
    expect(editorMove({ key: "ArrowRight" }, "xy", 0, 2)).toBeNull();
    expect(editorMove({ key: "ArrowLeft", shiftKey: true }, "xy", 0, 0)).toBeNull();
    expect(editorMove({ key: "Enter" }, "xy", 2, 2)).toBeNull();
  });

  it("keydown : navigate reçoit le mouvement ; touche prise (preventDefault) seulement s'il rend vrai", () => {
    const moves: string[] = [];
    let answer = true;
    const events: TextEditorEvents = { ...recorder().events, navigate: (m) => (moves.push(m), answer) };
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const tab = fire(zone, key("Tab"));
    expect([moves, tab.defaultPrevented]).toEqual([["next"], true]);
    answer = false;
    caret(zone, 0, 7);
    typeIn(zone, "xy");
    setSelection(zone, 1, 1);
    fire(zone, key("ArrowLeft"));
    expect(moves).toEqual(["next"]);
    setSelection(zone, 0, 0);
    const left = fire(zone, key("ArrowLeft"));
    expect([moves, left.defaultPrevented]).toEqual([["next", "left"], false]);
  });

  it("composition : aucune touche prise, navigate jamais appelé", () => {
    const moves: string[] = [];
    const events: TextEditorEvents = { ...recorder().events, navigate: (m) => (moves.push(m), true) };
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const tab = fire(zone, key("Tab", { isComposing: true }));
    expect([moves, tab.defaultPrevented]).toEqual([[], false]);
  });

  it("outil sans navigate (outil Texte) : Tab non pris, rien de demandé", () => {
    const r = recorder();
    const { zone, editor } = mount(() => r.events);
    editor.open(session, IDENTITY);
    const tab = fire(zone, key("Tab"));
    expect([r.calls, tab.defaultPrevented]).toEqual([[], false]);
  });

  it("fond : celui de la session (cellule, HC10-10), transparent sinon", () => {
    const { zone, editor } = mount(() => null);
    editor.open({ ...session, background: "#fef08a" }, IDENTITY);
    expect(zone.style.background).toMatch(/^(#fef08a|rgb\(254, 240, 138\))$/);
    editor.close();
    editor.open(session, IDENTITY);
    expect(zone.style.background).toBe("transparent");
  });
});

describe("zone de saisie riche (C7b)", () => {
  const B = { bold: true } as const;
  const counter = () => {
    let n = 0;
    const events: TextEditorEvents = { ...recorder().events, formatChanged: () => void n++ };
    return { events, count: () => n };
  };

  it("frappe relue : « aa », curseur au milieu, Ctrl+B, « a » : la deuxième lettre est grasse (S1, R3, R9)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("aa")]), IDENTITY);
    caret(zone, 1);
    expect(fire(zone, key("b", { ctrlKey: true })).defaultPrevented).toBe(true);
    typeIn(zone, "a");
    selectionChange();
    expect(editor.spans()).toEqual([plain("a"), { text: "a", attrs: B }, plain("a")]);
    expect(zone.querySelectorAll("span")).toHaveLength(3);
    expect(readSelection(zone)).toEqual({ start: 2, end: 2 });
  });

  it("Ctrl+B puis composition « に » : le format en attente survit aux selectionchange ; un déplacement l'oublie (S3, R9)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    fire(zone, key("b", { ctrlKey: true }));
    fire(zone, compose("compositionstart"));
    fire(zone, compose("compositionupdate", "に"));
    zone.textContent = "abに";
    setSelection(zone, 3, 3);
    selectionChange();
    fire(zone, new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: "に", isComposing: true }));
    fire(zone, compose("compositionend", "に"));
    selectionChange();
    expect(editor.spans()).toEqual([plain("ab"), { text: "に", attrs: B }]);
    fire(zone, key("b", { ctrlKey: true }));
    caret(zone, 1);
    typeIn(zone, "x");
    expect(editor.spans()).toEqual([plain("axb"), { text: "に", attrs: B }]);
  });

  it("sélection posée par l'IME, texte encore inchangé (recomposition) : le format en attente survit jusqu'à compositionend (R5, R9)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    fire(zone, key("b", { ctrlKey: true }));
    fire(zone, compose("compositionstart"));
    caret(zone, 0, 2);
    fire(zone, compose("compositionupdate", "abに"));
    zone.textContent = "abに";
    setSelection(zone, 3, 3);
    fire(zone, compose("compositionend", "abに"));
    expect(editor.spans()).toEqual([plain("ab"), { text: "に", attrs: B }]);
  });

  it("pendant la composition : aucune relecture, aucun redessin, aucun raccourci, aucune action de barre (R5)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    fire(zone, compose("compositionstart"));
    fire(zone, compose("compositionupdate", "こ"));
    zone.textContent = "abこ";
    const kept = zone.firstChild;
    fire(zone, new InputEvent("input", { bubbles: true, isComposing: true }));
    const ctrlB = fire(zone, key("b", { ctrlKey: true, isComposing: true }));
    editor.format({ type: "bold" });
    expect(ctrlB.defaultPrevented).toBe(false);
    expect(zone.firstChild).toBe(kept);
    expect(editor.value()).toBe("ab");
    expect(editor.formatState()?.bold).toBe(false);
  });

  it("compositionupdate sans compositionstart : la composition reste protégée jusqu'à compositionend (PC13)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    fire(zone, compose("compositionupdate", "こ"));
    zone.textContent = "abこ";
    setSelection(zone, 3, 3);
    const kept = zone.firstChild;
    fire(zone, new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: "こ" }));
    expect(fire(zone, key("b", { ctrlKey: true })).defaultPrevented).toBe(false);
    expect([zone.firstChild === kept, editor.value()]).toEqual([true, "ab"]);
    fire(zone, compose("compositionend", "こ"));
    expect(editor.spans()).toEqual([plain("abこ")]);
    expect(zone.querySelectorAll("span")).toHaveLength(1);
  });

  it("ordre à compositionend : relire, redessiner, puis relayer — la validation voit le texte composé (R5)", () => {
    const seen: string[] = [];
    const holder: { editor?: ReturnType<typeof createTextEditor>; zone?: HTMLElement } = {};
    const events: TextEditorEvents = {
      ...recorder().events,
      compositionEnd: () => void seen.push(`${holder.editor?.value() ?? ""}|${holder.zone?.firstChild?.nodeName ?? ""}`),
    };
    const { zone, editor } = mount(() => events);
    holder.editor = editor;
    holder.zone = zone;
    editor.open(withText([plain("")]), IDENTITY);
    fire(zone, compose("compositionstart"));
    fire(zone, compose("compositionupdate", "にほん"));
    zone.textContent = "にほん";
    setSelection(zone, 3, 3);
    fire(zone, compose("compositionend", "にほん"));
    expect(seen).toEqual(["にほん|SPAN"]);
  });

  it("Entrée : « \\n » inséré par le modèle (beforeinput empêché), une étape ; br de fin (R3, R4, R10)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    expect(fire(zone, before("insertParagraph")).defaultPrevented).toBe(true);
    expect(editor.value()).toBe("ab\n");
    expect(zone.lastElementChild?.hasAttribute("data-rb-fin")).toBe(true);
    expect(fire(zone, before("insertLineBreak")).defaultPrevented).toBe(true);
    expect(editor.value()).toBe("ab\n\n");
    fire(zone, key("z", { ctrlKey: true }));
    expect(editor.value()).toBe("ab\n");
  });

  it("Ctrl+Z dans la zone annule la dernière mise en forme seule ; texte et sélection restent ; Ctrl+Y et historyRedo la remettent (S2, R10)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("Le chat noir")]), IDENTITY);
    caret(zone, 8, 12);
    fire(zone, key("i", { ctrlKey: true }));
    expect(editor.spans()).toEqual([plain("Le chat "), { text: "noir", attrs: { italic: true } }]);
    expect(fire(zone, key("z", { ctrlKey: true })).defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([plain("Le chat noir")]);
    expect(readSelection(zone)).toEqual({ start: 8, end: 12 });
    fire(zone, key("y", { ctrlKey: true }));
    expect(editor.spans()[1]).toEqual({ text: "noir", attrs: { italic: true } });
    expect(fire(zone, before("historyUndo")).defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([plain("Le chat noir")]);
    expect(fire(zone, before("historyRedo")).defaultPrevented).toBe(true);
    expect(editor.spans()[1]).toEqual({ text: "noir", attrs: { italic: true } });
  });

  it("collage : texte simple seulement, attributs du caractère précédent, une étape (S4, R12)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([{ text: "Total", attrs: B }]), IDENTITY);
    caret(zone, 3);
    const e = paste(zone, { "text/plain": "x\r\ny", "text/html": "<b>z</b><img src=x>" });
    expect(e.defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([{ text: "Totx\nyal", attrs: B }]);
    expect(zone.querySelector("img, b")).toBeNull();
    fire(zone, key("z", { ctrlKey: true }));
    expect(editor.value()).toBe("Total");
  });

  it("repli beforeinput insertFromPaste (moteur sans `paste`) : même texte simple, une étape ; vide : rien (R12)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([{ text: "Total", attrs: B }]), IDENTITY);
    caret(zone, 3);
    const pasted = (text: string, inputType = "insertFromPaste"): Event => {
      const e = new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType });
      Object.defineProperty(e, "dataTransfer", { value: { getData: (t: string) => (t === "text/plain" ? text : "<b>z</b>") } });
      return fire(zone, e);
    };
    expect(pasted("x\r\ny").defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([{ text: "Totx\nyal", attrs: B }]);
    expect(zone.querySelector("b")).toBeNull();
    expect(pasted("", "insertFromPasteAsQuotation").defaultPrevented).toBe(true);
    expect(editor.value()).toBe("Totx\nyal");
    fire(zone, key("z", { ctrlKey: true }));
    expect(editor.value()).toBe("Total");
  });

  it("dépôt dans la zone : refusé, ne remonte pas (R12, PC17)", () => {
    const { parent, zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    const up = vi.fn();
    parent.addEventListener("drop", up);
    const e = fire(zone, new Event("drop", { bubbles: true, cancelable: true }));
    expect(e.defaultPrevented).toBe(true);
    expect(up).not.toHaveBeenCalled();
    expect(fire(zone, before("insertFromDrop")).defaultPrevented).toBe(true);
    expect(editor.value()).toBe("Bonjour");
  });

  it("barre : format(a) sur la sélection, zone ouverte ; formatState suit ; formatChanged à chaque changement (R8, R15, PC12)", () => {
    const c = counter();
    const { zone, editor } = mount(() => c.events);
    editor.open(withText([plain("Le chat")]), IDENTITY);
    const afterOpen = c.count();
    expect(afterOpen).toBeGreaterThan(0);
    caret(zone, 3, 7);
    editor.format({ type: "bold" });
    editor.format({ type: "color", color: "#dc2626" });
    expect(editor.spans()).toEqual([plain("Le "), { text: "chat", attrs: { bold: true, color: "#dc2626" } }]);
    expect(editor.formatState()).toEqual({ bold: true, italic: false, underline: false, size: 48, color: "#dc2626" });
    expect(readSelection(zone)).toEqual({ start: 3, end: 7 });
    expect(c.count()).toBeGreaterThanOrEqual(afterOpen + 3);
    editor.close();
    expect(c.count()).toBeGreaterThanOrEqual(afterOpen + 4);
  });

  it("une frappe publie formatChanged une seule fois ; un selectionchange sans déplacement n'en publie pas, un déplacement oui (R15)", () => {
    const c = counter();
    const { zone, editor } = mount(() => c.events);
    editor.open(withText([plain("ab")]), IDENTITY);
    caret(zone, 2);
    selectionChange();
    const before = c.count();
    typeIn(zone, "c");
    selectionChange();
    expect(editor.value()).toBe("abc");
    expect(c.count()).toBe(before + 1);
    caret(zone, 1);
    selectionChange();
    expect(c.count()).toBe(before + 2);
  });

  it("zone fermée : un segment vide, formatState null, format sans effet", () => {
    const { zone, editor } = mount(() => null);
    expect([editor.value(), editor.spans(), editor.formatState()]).toEqual(["", [plain("")], null]);
    editor.open(withText([plain("chat")]), IDENTITY);
    editor.close();
    editor.format({ type: "bold" });
    expect([editor.value(), editor.spans(), editor.formatState()]).toEqual(["", [plain("")], null]);
    expect(zone.childNodes).toHaveLength(0);
  });

  it("gras natif jamais : beforeinput formatBold empêché, appliqué par le modèle ; Alt Gr (Ctrl+Alt+B) non pris", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("chat")]), IDENTITY);
    caret(zone, 0, 4);
    expect(fire(zone, before("formatBold")).defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([{ text: "chat", attrs: B }]);
    expect(fire(zone, key("b", { ctrlKey: true, altKey: true })).defaultPrevented).toBe(false);
    expect(editor.spans()).toEqual([{ text: "chat", attrs: B }]);
  });

  it("formatKey, historyKey, plainPaste : Ctrl ou Cmd, jamais Alt ; Ctrl+Maj+Z rétablit ; \\r\\n et \\r → \\n (R10-R12, PC16)", () => {
    expect(formatKey({ key: "B", ctrlKey: true })).toEqual({ type: "bold" });
    expect(formatKey({ key: "i", metaKey: true })).toEqual({ type: "italic" });
    expect(formatKey({ key: "u", ctrlKey: true })).toEqual({ type: "underline" });
    expect(formatKey({ key: "b", ctrlKey: true, altKey: true })).toBeNull();
    expect(formatKey({ key: "b" })).toBeNull();
    expect(historyKey({ key: "z", ctrlKey: true })).toBe("undo");
    expect(historyKey({ key: "Z", ctrlKey: true, shiftKey: true })).toBe("redo");
    expect(historyKey({ key: "y", metaKey: true })).toBe("redo");
    expect(historyKey({ key: "z", ctrlKey: true, altKey: true })).toBeNull();
    expect(plainPaste("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("raccourcis globaux et collage global : la zone est une cible éditable (keys.ts, paste.ts inchangés)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    expect(isEditable(zone)).toBe(true);
    expect(keyAction({ key: "z", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: zone })).toBeNull();
  });

  it("DOM mis à mal par le navigateur (bloc ajouté) : relu, puis redessiné en segments (R3)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([{ text: "ab", attrs: B }]), IDENTITY);
    zone.innerHTML = "<span>ab</span><div>c</div>";
    const c = zone.querySelector("div")!.firstChild!;
    document.getSelection()?.setBaseAndExtent(c, 1, c, 1);
    fire(zone, new InputEvent("input", { bubbles: true, inputType: "insertParagraph" }));
    expect(editor.value()).toBe("ab\nc");
    expect(zone.querySelector("div")).toBeNull();
    expect(readSelection(zone)).toEqual({ start: 4, end: 4 });
  });
});
