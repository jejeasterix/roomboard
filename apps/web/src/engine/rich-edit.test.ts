import { describe, expect, it } from "vitest";
import type { TextAttrs, TextSpan } from "../core/api";
import { attrsBefore, createRichEdit } from "./rich-edit";

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const B: TextAttrs = { bold: true };
const RB: TextAttrs = { bold: true, color: "#dc2626" };
const BASE = { size: 36, color: "#000000" };
/** Frappe relue : `before` + `typed` + `after` autour du curseur, curseur après le neuf. */
const type = (e: ReturnType<typeof createRichEdit>, typed: string): void => {
  const { start, end } = e.state();
  const t = e.text();
  const next = t.slice(0, start) + typed + t.slice(end);
  e.input(next, start + typed.length, start + typed.length);
};

describe("séance riche (C7b)", () => {
  it("état initial : segments reçus, curseur en fin, aucune attente", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: B }], BASE);
    expect(e.state()).toEqual({ spans: [plain("Le "), { text: "chat", attrs: B }], start: 7, end: 7, pending: null });
    expect(e.text()).toBe("Le chat");
  });

  it("Ctrl+B au curseur puis « a » : la deuxième lettre grasse (S1, R3, R9)", () => {
    const e = createRichEdit([plain("aa")], BASE);
    e.select(1, 1);
    expect(e.format({ type: "bold" })).toBe(false);
    expect(e.state().pending).toEqual({ bold: true });
    type(e, "a");
    expect(e.state().spans).toEqual([plain("a"), { text: "a", attrs: B }, plain("a")]);
    expect(e.state().pending).toBeNull();
    expect(e.state()).toMatchObject({ start: 2, end: 2 });
  });

  it("frappe entre deux lettres égales : le neuf est au curseur et hérite de la lettre d'avant, pas de celle d'après (R3, patron editSpans écarté)", () => {
    // Sous `editSpans` (préfixe d'abord), « aaa » relu donnerait p = 2 : le neuf serait la troisième lettre, sans gras.
    const e = createRichEdit([{ text: "a", attrs: B }, plain("a")], BASE);
    e.select(1, 1);
    type(e, "a");
    expect(e.state().spans).toEqual([{ text: "aa", attrs: B }, plain("a")]);
    expect(e.state()).toMatchObject({ start: 2, end: 2 });
  });

  it("frappe : hérite du caractère précédent ; en tête, aucun attribut (T5)", () => {
    const e = createRichEdit([{ text: "chat", attrs: RB }], BASE);
    type(e, "s");
    expect(e.state().spans).toEqual([{ text: "chats", attrs: RB }]);
    e.select(0, 0);
    type(e, "L");
    expect(e.state().spans).toEqual([plain("L"), { text: "chats", attrs: RB }]);
  });

  it("format sur une sélection : bascule G, I, S — toute la sélection l'a : retiré, sinon posé (R8)", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: B }], BASE);
    e.select(3, 7);
    expect(e.format({ type: "bold" })).toBe(true);
    expect(e.state().spans).toEqual([plain("Le chat")]);
    e.select(0, 7);
    e.format({ type: "italic" });
    e.format({ type: "underline" });
    expect(e.state().spans).toEqual([{ text: "Le chat", attrs: { italic: true, underline: true } }]);
    e.select(2, 5);
    e.format({ type: "bold" });
    expect(e.state().spans.map((s) => [s.text, s.attrs.bold === true])).toEqual([["Le", false], [" ch", true], ["at", false]]);
  });

  it("taille égale à celle de l'élément → retirée ; couleur « Défaut » (null) → retirée ; autre → posée (R8, HC7b-13)", () => {
    const e = createRichEdit([plain("chat")], BASE);
    e.select(0, 4);
    e.format({ type: "size", size: 72 });
    e.format({ type: "color", color: "#dc2626" });
    expect(e.state().spans).toEqual([{ text: "chat", attrs: { size: 72, color: "#dc2626" } }]);
    e.format({ type: "size", size: 36 });
    e.format({ type: "color", color: null });
    expect(e.state().spans).toEqual([plain("chat")]);
    e.format({ type: "color", color: "#000000" });
    expect(e.state().spans).toEqual([{ text: "chat", attrs: { color: "#000000" } }]);
  });

  it("format au curseur : attente sans étape ; deux bascules s'annulent ; consommée par la première insertion (R9, PC10)", () => {
    const e = createRichEdit([plain("ab")], BASE);
    e.format({ type: "bold" });
    e.format({ type: "bold" });
    expect(e.state().pending).toEqual({ bold: null });
    expect(e.undo()).toBe(false);
    e.format({ type: "bold" });
    type(e, "cd");
    expect(e.state().spans).toEqual([plain("ab"), { text: "cd", attrs: B }]);
    expect(e.state().pending).toBeNull();
  });

  it("attente oubliée par un déplacement ; gardée si la sélection relue est la même (frappe puis selectionchange) (R9, HC7b-5)", () => {
    const e = createRichEdit([plain("ab")], BASE);
    e.format({ type: "bold" });
    e.select(2, 2);
    expect(e.state().pending).toEqual({ bold: true });
    e.select(0, 0);
    expect(e.state().pending).toBeNull();
    type(e, "x");
    expect(e.state().spans).toEqual([plain("xab")]);
  });

  it("Ctrl+Z annule la dernière mise en forme seule ; texte et sélection restent ; Ctrl+Y la remet (S2, R10)", () => {
    const e = createRichEdit([plain("Le chat noir")], BASE);
    e.select(8, 12);
    e.format({ type: "italic" });
    expect(e.state().spans).toEqual([plain("Le chat "), { text: "noir", attrs: { italic: true } }]);
    expect(e.undo()).toBe(true);
    expect(e.state()).toEqual({ spans: [plain("Le chat noir")], start: 8, end: 12, pending: null });
    expect(e.redo()).toBe(true);
    expect(e.state().spans[1]).toEqual({ text: "noir", attrs: { italic: true } });
  });

  it("une suite de frappe = une étape, coupée par un déplacement ou une action (R10, HC7b-11)", () => {
    const e = createRichEdit([plain("")], BASE);
    type(e, "a");
    type(e, "b");
    type(e, "c");
    e.select(1, 1);
    type(e, "x");
    expect(e.text()).toBe("axbc");
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("abc");
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("");
    expect(e.undo()).toBe(false);
  });

  it("insert : collage et Entrée remplacent la sélection ; attributs du précédent plus l'attente ; une étape (S4, R12)", () => {
    const e = createRichEdit([{ text: "Total", attrs: B }], BASE);
    e.select(3, 3);
    e.insert("collé");
    expect(e.state().spans).toEqual([{ text: "Totcolléal", attrs: B }]);
    expect(e.state()).toMatchObject({ start: 8, end: 8 });
    e.select(0, 10);
    e.insert("x\ny");
    expect(e.state().spans).toEqual([plain("x\ny")]);
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("Totcolléal");
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("Total");
  });

  it("formatState : valeurs effectives ; mixed ; taille de l'élément et « default » sans attribut (R15)", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: { bold: true, size: 72, color: "#dc2626" } }], BASE);
    e.select(0, 2);
    expect(e.formatState()).toEqual({ bold: false, italic: false, underline: false, size: 36, color: "default" });
    e.select(3, 7);
    expect(e.formatState()).toEqual({ bold: true, italic: false, underline: false, size: 72, color: "#dc2626" });
    e.select(0, 7);
    expect(e.formatState()).toEqual({ bold: false, italic: false, underline: false, size: "mixed", color: "mixed" });
    e.select(7, 7);
    expect(e.formatState().bold).toBe(true);
    e.format({ type: "bold" });
    expect(e.formatState().bold).toBe(false);
  });

  it("curseur illisible (-1, -1) : différence sans borne, curseur en fin, attente non posée (PC9)", () => {
    const e = createRichEdit([plain("ab")], BASE);
    e.format({ type: "bold" });
    expect(e.input("abc", -1, -1)).toBe(true);
    expect(e.state()).toMatchObject({ spans: [plain("abc")], start: 3, end: 3 });
  });

  it("rien à annuler ni à rétablir : false ; texte inchangé relu : false, sélection suivie", () => {
    const e = createRichEdit([plain("ab")], BASE);
    expect([e.undo(), e.redo()]).toEqual([false, false]);
    expect(e.input("ab", 1, 1)).toBe(false);
    expect(e.state()).toMatchObject({ start: 1, end: 1 });
  });

  it("composition relue en bloc à la fin d'un mot gras rouge : « にほん » hérite gras rouge, une étape (S3)", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: RB }], BASE);
    e.input("Le chatにほん", 10, 10);
    expect(e.state().spans).toEqual([plain("Le "), { text: "chatにほん", attrs: RB }]);
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("Le chat");
  });

  it("attrsBefore : caractère qui finit en `at` ; en tête et texte vide : aucun attribut", () => {
    const spans = [plain("Le "), { text: "chat", attrs: B }];
    expect(attrsBefore(spans, 4)).toEqual(B);
    expect(attrsBefore(spans, 3)).toEqual({});
    expect(attrsBefore(spans, 0)).toEqual({});
    expect(attrsBefore([plain("")], 0)).toEqual({});
  });
});
