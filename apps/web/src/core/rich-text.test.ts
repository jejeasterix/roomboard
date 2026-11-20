import { describe, expect, it } from "vitest";
import type { TextAttrsPatch, TextSpan } from "./api";
import { cleanPatch, editSpans, formatSpans, plainSpans, sameSpans, utf16Bounds, validColor, validFont, validPatch } from "./rich-text";

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
