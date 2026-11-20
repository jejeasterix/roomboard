import { describe, expect, it } from "vitest";
import type { TextAttrsPatch, TextSpan } from "./api";
import { cleanPatch, editSpans, editSpansAt, formatSpans, insertedRange, normalSpans, patched, plainSpans, sameSpans, spansText, spliceSpans, utf16Bounds, validColor, validFont, validPatch, validSpans } from "./rich-text";

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const RED = { color: "#ff0000" } as const;
const RB = { color: "#ff0000", bold: true } as const;
const redCat = (): TextSpan[] => [plain("Le "), { text: "chat", attrs: RB }, plain(" noir")];
const HEX64 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("rich-text : segments côté page (C7)", () => {
  it("plainSpans : un seul segment sans attribut, même vide", () => {
    expect(plainSpans("Bonjour")).toEqual([plain("Bonjour")]);
    expect(plainSpans("")).toEqual([plain("")]);
  });

  it("editSpans (S1) : « gros » sans attribut, « chat » garde les siens, le « s » hérite du « t »", () => {
    const gros = editSpans(redCat(), "Le gros chat noir");
    expect(gros).toEqual([plain("Le gros "), { text: "chat", attrs: RB }, plain(" noir")]);
    expect(editSpans(gros, "Le gros chats noir")).toEqual([plain("Le gros "), { text: "chats", attrs: RB }, plain(" noir")]);
  });

  it("editSpans (S4) : différence en points de code, jamais en unités UTF-16", () => {
    const cat: TextSpan[] = [plain("Le "), { text: "🐱", attrs: RED }, plain(" noir")];
    const gros = editSpans(cat, "Le gros 🐱 noir");
    expect(gros).toEqual([plain("Le gros "), { text: "🐱", attrs: RED }, plain(" noir")]);
    expect(editSpans(gros, "Le gros 🐱🐱 noir")).toEqual([plain("Le gros "), { text: "🐱🐱", attrs: RED }, plain(" noir")]);
  });

  it("editSpans : un emoji remplacé par un autre ne garde rien par sa moitié haute", () => {
    expect(editSpans([{ text: "🐱", attrs: RED }], "🐶")).toEqual([plain("🐶")]);
  });

  // Review Focus 2 (cadrage T4).
  it("Review Focus 2 : « ab » → « abb », b gras : le préfixe passe d'abord", () => {
    expect(editSpans([plain("a"), { text: "b", attrs: { bold: true } }], "abb")).toEqual([plain("a"), { text: "bb", attrs: { bold: true } }]);
  });

  // Review Focus 1 (cadrage T5).
  it("Review Focus 1 : un mot formaté remplacé en entier prend les attributs du caractère qui le précède", () => {
    expect(editSpans(redCat(), "Le loup noir")).toEqual([plain("Le loup noir")]);
  });

  it("editSpans : insertion en tête sans attribut ; contenu vidé : un segment vide", () => {
    expect(editSpans([{ text: "chat", attrs: { bold: true } }], "Le chat")).toEqual([plain("Le "), { text: "chat", attrs: { bold: true } }]);
    expect(editSpans(redCat(), "")).toEqual([plain("")]);
  });

  it("cleanPatch retire les clés undefined, garde false et null (T7)", () => {
    expect(cleanPatch({ bold: undefined, italic: true, color: null, underline: false })).toStrictEqual({ italic: true, color: null, underline: false });
  });

  it("validPatch : clés et valeurs de T7 et T15", () => {
    const ok: TextAttrsPatch[] = [{}, { bold: true }, { bold: false, italic: null }, { color: "#ff000080" }, { color: "rebeccapurple" }, { size: 72 }, { size: null }, { font: "Comic Sans MS" }, { font: null }];
    for (const p of ok) expect(validPatch(p)).toBe(true);
    const bad: unknown[] = [{ href: "x" }, { bold: "oui" }, { color: "rgb(0,0,0)" }, { color: 5 }, { color: HEX64 }, { size: 0 }, { size: Number.NaN }, { size: 1e39 }, { font: "" }, { font: "a;b" }, { font: HEX64 }];
    for (const p of bad) expect(validPatch(p as TextAttrsPatch)).toBe(false);
  });

  it("validFont refuse tout caractère de contrôle Unicode (Cc : U+0000–U+001F, U+007F–U+009F), comme le cœur", () => {
    const refused = ["a\fb", "a\tb", "a\u0000b", "a\u001fb", "a\u007fb", "a\u0085b", "a\u009fb"];
    expect(refused.map(validFont)).toEqual(refused.map(() => false));
    expect([validFont("a\u00a0b"), validFont("Comic Sans MS"), validFont("a\u2028b")]).toEqual([true, true, true]);
  });

  it("validColor et validFont : formes de T15 (font compté en points de code)", () => {
    expect([validColor("#f00"), validColor("#ff00"), validColor("re"), validColor("ABC")]).toEqual([true, false, false, true]);
    expect([validFont("é".repeat(48)), validFont("é".repeat(49)), validFont("a\nb"), validFont('a"b')]).toEqual([true, false, false, false]);
  });

  it("utf16Bounds : entiers dans le texte, jamais au milieu d'une paire de substitution (T6)", () => {
    const s = "Le 🐱 noir";
    expect([utf16Bounds(s, 3, 2), utf16Bounds(s, 10, 0), utf16Bounds(s, 5, 5)]).toEqual([true, true, true]);
    expect([utf16Bounds(s, 4, 1), utf16Bounds(s, 3, 1), utf16Bounds(s, 8, 3), utf16Bounds(s, -1, 1), utf16Bounds(s, 1.5, 1)]).toEqual([false, false, false, false, false]);
  });

  it("formatSpans : pose, retire par false et null, taille arrondie en f32 comme le cœur", () => {
    const base = plainSpans("Le chat noir");
    const red = formatSpans(base, 3, 4, { color: "#ff0000", bold: true });
    expect(red).toEqual(redCat());
    expect(formatSpans(red, 3, 4, { bold: false })).toEqual([plain("Le "), { text: "chat", attrs: RED }, plain(" noir")]);
    expect(formatSpans(red, 3, 4, { bold: null, color: null })).toEqual(base);
    expect(formatSpans(base, 0, 2, { size: 12.3 })[0]).toEqual({ text: "Le", attrs: { size: Math.fround(12.3) } });
  });

  it("sameSpans : mêmes textes et mêmes attributs, quel que soit l'ordre des clés", () => {
    const red = redCat();
    expect(sameSpans(formatSpans(red, 3, 4, { bold: true }), red)).toBe(true);
    expect(sameSpans([{ text: "a", attrs: { bold: true, color: "red" } }], [{ text: "a", attrs: { color: "red", bold: true } }])).toBe(true);
    expect(sameSpans(red, plainSpans("Le chat noir"))).toBe(false);
  });
});

describe("rich-text : segments voulus et frappe ancrée (C7b)", () => {
  const BOLD = { bold: true } as const;

  it("editSpansAt : « aa », curseur au milieu : le milieu neuf est la deuxième lettre (S1, R3)", () => {
    // Première lettre rouge, seconde sans attribut ; « a » tapé entre les deux, curseur relu en 2 après la frappe.
    const old: TextSpan[] = [{ text: "a", attrs: RED }, plain("a")];
    expect(editSpansAt(old, "aaa", 2)).toEqual([{ text: "aa", attrs: RED }, plain("a")]);
    expect(insertedRange("aa", "aaa", 2)).toEqual([1, 2]);
    // Patron écarté : le préfixe d'abord place le neuf en troisième, avec les attributs de la seconde.
    expect(editSpans(old, "aaa")).toEqual([{ text: "a", attrs: RED }, plain("aa")]);
  });

  it("editSpansAt : effacement au curseur ; insertion en tête sans attribut (T5)", () => {
    expect(editSpansAt([{ text: "ab", attrs: RED }, plain("c")], "ac", 1)).toEqual([{ text: "a", attrs: RED }, plain("c")]);
    expect(insertedRange("abc", "ac", 1)).toEqual([1, 1]);
    expect(editSpansAt([{ text: "chat", attrs: RED }], "Lchat", 1)).toEqual([plain("L"), { text: "chat", attrs: RED }]);
  });

  it("editSpansAt : curseur en unités UTF-16 (paire de substitution)", () => {
    expect(editSpansAt([plain("🐱")], "🐱🐱", 4)).toEqual([plain("🐱🐱")]);
    expect(insertedRange("🐱", "🐱🐱", 4)).toEqual([2, 4]);
    expect(insertedRange("ab", "aXb", 2)).toEqual([1, 2]);
  });

  it("spliceSpans : remplace une plage par un texte aux attributs donnés, voisins fusionnés (R12)", () => {
    expect(spliceSpans(redCat(), 3, 7, "chien", BOLD)).toEqual([plain("Le "), { text: "chien", attrs: BOLD }, plain(" noir")]);
    expect(spliceSpans(redCat(), 5, 5, "x", RB)).toEqual([plain("Le "), { text: "chxat", attrs: RB }, plain(" noir")]);
    expect(spliceSpans([plain("ab")], 0, 2, "", {})).toEqual([plain("")]);
  });

  it("spansText : concaténation", () => {
    expect(spansText(redCat())).toBe("Le chat noir");
    expect(spansText([])).toBe("");
  });

  it("validSpans : concaténation égale au contenu, valeurs du patch permises (R7)", () => {
    expect(validSpans("Le chat noir", redCat())).toBe(true);
    expect(validSpans("", [])).toBe(true);
    expect(validSpans("Le chat", redCat())).toBe(false);
    const one = (attrs: unknown): TextSpan[] => [{ text: "x", attrs } as TextSpan];
    expect(validSpans("x", one({ bold: false, color: null }))).toBe(true);
    for (const bad of [{ size: 0 }, { size: 1e39 }, { color: 5 }, { href: "y" }, { font: "a;b" }]) expect(validSpans("x", one(bad)), JSON.stringify(bad)).toBe(false);
    expect(validSpans("x", [null as unknown as TextSpan])).toBe(false);
    expect(validSpans("x", [{ text: "x" } as unknown as TextSpan])).toBe(false);
  });

  it("normalSpans : false et null retirés, size en f32, voisins égaux fusionnés, vides retirés (forme de read_spans)", () => {
    const raw = [plain("Le"), plain(" "), { text: "chat", attrs: { bold: false, size: 0.1 } }, { text: "", attrs: RED }] as unknown as TextSpan[];
    expect(normalSpans(raw)).toEqual([plain("Le "), { text: "chat", attrs: { size: Math.fround(0.1) } }]);
    expect(normalSpans([])).toEqual([plain("")]);
    expect(sameSpans(normalSpans(redCat()), redCat())).toBe(true);
  });

  it("patched : exporté ; false et null retirent, size arrondi en f32", () => {
    expect(patched({ bold: true }, { bold: null, color: "#ff0000" })).toEqual({ color: "#ff0000" });
    expect(patched({}, { size: 0.1 })).toEqual({ size: Math.fround(0.1) });
  });

  it("editSpansAt avec le curseur en fin : même résultat qu'editSpans pour un ajout en fin", () => {
    const next = "Le chat noir !";
    expect(editSpansAt(redCat(), next, next.length)).toEqual(editSpans(redCat(), next));
  });
});
