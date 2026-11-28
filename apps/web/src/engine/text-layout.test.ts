import { describe, expect, it } from "vitest";
import { faceOf, graphemes, layoutRich, lineShift, measureOrFallback, offsetAt, wordAt, layoutText, richBoxHeight, styleOf, textBoxHeight, textFont, type Face, type Measure, type RichLine } from "./text-layout";
import type { TextSpan } from "../core/api";

/** Chaque caractère vaut 100 unités, quelle que soit la taille. */
const wide: Measure = (s) => s.length * 100;

describe("mise en lignes du texte (CL4-4)", () => {
  it("une ligne si elle tient", () => {
    expect(layoutText("Bonjour", 36, 1000, wide)).toEqual(["Bonjour"]);
  });

  it("coupe aux espaces dans la largeur de boîte", () => {
    expect(layoutText("aaaa bbbb cc", 36, 700, wide)).toEqual(["aaaa", "bbbb cc"]);
  });

  it("Entrée = nouvelle ligne, lignes vides gardées", () => {
    expect(layoutText("a\n\nb", 36, 600, wide)).toEqual(["a", "", "b"]);
  });

  it("un mot plus long que la boîte est coupé par caractères", () => {
    expect(layoutText("abcdefgh", 36, 300, wide)).toEqual(["abc", "def", "gh"]);
  });

  it("un mot trop long est coupé par point de code : un emoji n'est jamais scindé", () => {
    const lines = layoutText("😀😀😀😀😀", 36, 300, wide); // « wide » mesure en unités UTF-16 : un emoji vaut 200
    expect(lines).toEqual(["😀", "😀", "😀", "😀", "😀"]);
    expect(lines.join("")).toBe("😀😀😀😀😀");
  });

  it("texte vide : une ligne vide", () => {
    expect(layoutText("", 36, 600, wide)).toEqual([""]);
  });

  it("hauteur : lignes × taille × 1,25, au moins une ligne ; police à la taille", () => {
    expect(textBoxHeight(2, 36)).toBe(90);
    expect(textBoxHeight(0, 36)).toBe(45);
    expect(textFont(48)).toBe('48px "Atkinson Hyperlegible", system-ui, sans-serif');
  });

  it("famille ZWJ jamais coupée", () => {
    const family = "👨‍👩‍👧‍👦";
    const measure = (s: string): number => graphemes(s).length * 10;
    expect(layoutText(family + family + family, 36, 15, measure)).toEqual([family, family, family]);
  });

  it("drapeau et teinte de peau restent entiers", () => {
    const measure = (s: string): number => graphemes(s).length * 10;
    expect(layoutText("🇫🇷👍🏽", 36, 15, measure)).toEqual(["🇫🇷", "👍🏽"]);
  });

  it("graphemes : repli sur les points de code sans Intl.Segmenter", () => {
    const saved = Intl.Segmenter;
    delete (Intl as { Segmenter?: unknown }).Segmenter;
    try {
      expect(graphemes("ab")).toEqual(["a", "b"]);
    } finally {
      (Intl as { Segmenter?: unknown }).Segmenter = saved;
    }
  });
});

describe("mise en lignes par segments (C7, T9)", () => {
  const ten: Measure = (s) => s.length * 10;
  const plainSpan = (text: string): TextSpan => ({ text, attrs: {} });
  const texts = (lines: readonly RichLine[]): string[][] => lines.map((l) => l.segments.map((s) => s.text));

  it("un mot à cheval sur deux segments n'est pas coupé entre eux", () => {
    const spans: TextSpan[] = [plainSpan("Le ch"), { text: "at", attrs: { bold: true } }, plainSpan(" noir")];
    const lines = layoutRich(spans, { size: 36 }, 60, ten);
    expect(texts(lines)).toEqual([["Le"], ["ch", "at"], ["noir"]]);
    expect(lines[1]?.segments.map((s) => s.style.bold)).toEqual([false, true]);
  });

  it("S5 : « chat » en 48 gras souligné rouge, boîte étroite : ligne de hauteur 48 × 1,25", () => {
    const spans: TextSpan[] = [plainSpan("Le "), { text: "chat", attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } }, plainSpan(" noir")];
    const lines = layoutRich(spans, { size: 36 }, 70, ten);
    expect(texts(lines)).toEqual([["Le ", "chat"], ["noir"]]);
    expect(lines.map((l) => [l.top, l.height, l.size])).toEqual([[0, 60, 48], [60, 45, 36]]);
    expect(lines[0]?.segments.map((s) => [s.x, s.width])).toEqual([[0, 30], [30, 40]]);
    expect(lines[0]?.segments[1]?.style).toEqual({ size: 48, bold: true, italic: false, underline: true, font: null, color: "#ff0000" });
    expect(richBoxHeight(lines)).toBe(105);
  });

  // Review Focus 3 (cadrage T9, HC7-9).
  it("Review Focus 3 : ligne vide à la taille du \\n qui la termine, sinon à celle de l'élément", () => {
    const spans: TextSpan[] = [plainSpan("a\n"), { text: "\n", attrs: { size: 72 } }, plainSpan("b")];
    expect(layoutRich(spans, { size: 36 }, 600, ten).map((l) => l.height)).toEqual([45, 90, 45]);
    const last = layoutRich([{ text: "a\n", attrs: { size: 72 } }], { size: 36 }, 600, ten);
    expect(last.map((l) => [l.size, l.height])).toEqual([[72, 90], [36, 45]]);
  });

  // Review Focus 4 (cadrage T10, T15).
  it("Review Focus 4 : police nommée devant Atkinson, gras et italique dans l'ordre CSS", () => {
    expect(textFont(48, { bold: true, italic: true, font: "Comic Sans MS" })).toBe('italic bold 48px "Comic Sans MS", "Atkinson Hyperlegible", system-ui, sans-serif');
    expect(textFont(36, {})).toBe(textFont(36));
    expect(textFont(36, faceOf(styleOf({}, { size: 36 })))).toBe('36px "Atkinson Hyperlegible", system-ui, sans-serif');
  });

  it("la mesure reçoit la face du segment ; un texte sans attribut est mesuré comme au socle", () => {
    const calls: [string, number, Face | undefined][] = [];
    const spy: Measure = (s, size, face) => {
      calls.push([s, size, face]);
      return s.length * 10;
    };
    layoutRich([plainSpan("a "), { text: "b", attrs: { bold: true, font: "Georgia" } }], { size: 36 }, 600, spy);
    expect(calls).toContainEqual(["b", 36, { bold: true, italic: false, font: "Georgia" }]);
    expect(calls).toContainEqual(["a ", 36, undefined]);
    expect(layoutText("aaaa bbbb cc", 36, 700, (s) => s.length * 100)).toEqual(["aaaa", "bbbb cc"]);
  });
});

const ten: Measure = (s) => s.length * 10;
const plain = (text: string): TextSpan[] => [{ text, attrs: {} }];

describe("offsetAt (C6a, D6)", () => {
  it("une ligne : rang du caractère sous le point ; espace compris ; hors des caractères : null", () => {
    const s = plain("Le chat noir");
    expect(offsetAt(s, { size: 36 }, 600, ten, 35, 10)).toBe(3);
    expect(offsetAt(s, { size: 36 }, 600, ten, 25, 10)).toBe(2);
    expect(offsetAt(s, { size: 36 }, 600, ten, 125, 10)).toBeNull();
    expect(offsetAt(s, { size: 36 }, 600, ten, 5, 50)).toBeNull();
    expect(offsetAt(s, { size: 36 }, 600, ten, -1, 10)).toBeNull();
  });

  it("deux lignes (coupure à l'espace) : rang dans le contenu, pas dans la ligne", () => {
    const s = plain("Le chat noir");
    expect(offsetAt(s, { size: 36 }, 70, ten, 65, 10)).toBe(6);
    expect(offsetAt(s, { size: 36 }, 70, ten, 5, 50)).toBe(8);
  });

  it("paragraphes : la ligne après le saut de ligne commence après lui", () => {
    expect(offsetAt(plain("ab\ncd"), { size: 36 }, 600, ten, 5, 50)).toBe(3);
  });

  it("segments stylés : rang continu d'un segment à l'autre", () => {
    const s: TextSpan[] = [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { bold: true } }, { text: " noir", attrs: {} }];
    expect(offsetAt(s, { size: 36 }, 600, ten, 35, 10)).toBe(3);
    expect(offsetAt(s, { size: 36 }, 600, ten, 95, 10)).toBe(9);
  });

  it("emoji : un graphème de deux unités UTF-16, rang suivant décalé de deux", () => {
    expect(offsetAt(plain("😀 été"), { size: 36 }, 600, ten, 5, 10)).toBe(0);
    expect(offsetAt(plain("😀 été"), { size: 36 }, 600, ten, 45, 10)).toBe(4);
  });
});

describe("wordAt (C6a, D6, D26)", () => {
  it("UAX 29 : le mot qui contient le rang ; espace et fin de texte : null", () => {
    expect(wordAt("Le chat noir", 3)).toEqual([3, 7]);
    expect(wordAt("Le chat noir", 6)).toEqual([3, 7]);
    expect(wordAt("Le chat noir", 2)).toBeNull();
    expect(wordAt("Le chat noir", 12)).toBeNull();
    expect(wordAt("Le chat noir", -1)).toBeNull();
    expect(wordAt("Lundi matin", 8)).toEqual([6, 11]);
  });

  it("wordAt : « été » après un emoji, bornes UTF-16 ; ponctuation : null", () => {
    expect(wordAt("😀 été", 4)).toEqual([3, 6]);
    expect(wordAt("café, crème", 4)).toBeNull();
    expect(wordAt("café, crème", 7)).toEqual([6, 11]);
  });

  it("chiffres : un nombre est un mot", () => {
    expect(wordAt("page 42 ici", 5)).toEqual([5, 7]);
  });

  it("repli sans Intl.Segmenter : lettres, chiffres, marques (D26)", () => {
    const saved = Intl.Segmenter;
    Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true, writable: true });
    try {
      expect(wordAt("Le chat noir", 3)).toEqual([3, 7]);
      expect(wordAt("café noir", 2)).toEqual([0, 5]);
      expect(wordAt("😀 été", 4)).toEqual([3, 6]);
      expect(wordAt("a b", 1)).toBeNull();
    } finally {
      Object.defineProperty(Intl, "Segmenter", { value: saved, configurable: true, writable: true });
    }
  });
});

describe("measureOrFallback (D11, constat C11a)", () => {
  it("sans contexte 2D : 0,6 × taille par unité UTF-16", () => {
    expect(measureOrFallback(null)("abcd", 10)).toBeCloseTo(24);
  });
  it("avec un contexte : la police du rendu puis measureText, comme measureWith", () => {
    const fonts: string[] = [];
    const ctx = {
      set font(f: string) {
        fonts.push(f);
      },
      measureText: (t: string) => ({ width: t.length * 7 }),
    } as unknown as CanvasRenderingContext2D;
    expect(measureOrFallback(ctx)("abc", 24, { bold: true })).toBe(21);
    expect(fonts).toEqual([textFont(24, { bold: true })]);
  });
});

describe("polices (OG11, lot 2)", () => {
  it("police absente : chaîne inchangée", () => {
    expect(textFont(24)).toBe('24px "Atkinson Hyperlegible", system-ui, sans-serif');
    expect(textFont(24, { bold: true })).toBe('bold 24px "Atkinson Hyperlegible", system-ui, sans-serif');
    expect(textFont(24, { font: "Georgia" })).toContain("Georgia, serif");
    expect(textFont(24, { font: "Courier New" })).toBe('24px "Courier New", monospace');
  });
});

describe("lineShift (D15, DS6)", () => {
  const m = (s: string) => s.length * 10;
  it("lineShift : offsetAt et paintText d'accord : centré dans 100, « ab » (20) décalé de 40 ; le point 45 est sur « a »", () => {
    const spans = [{ text: "ab", attrs: {} }];
    const [line] = layoutRich(spans, { size: 36 }, 100, m);
    expect(lineShift(line!, 100, "center")).toBe(40);
    expect(lineShift(line!, 100, "right")).toBe(80);
    expect(lineShift(line!, 100, "left")).toBe(0);
    expect(offsetAt(spans, { size: 36 }, 100, m, 45, 5, "center")).toBe(0);
    expect(offsetAt(spans, { size: 36 }, 100, m, 45, 5)).toBeNull();
    // À droite : « b » occupe 90..100 ; avant le décalage (75), hors du texte.
    expect(offsetAt(spans, { size: 36 }, 100, m, 95, 5, "right")).toBe(1);
    expect(offsetAt(spans, { size: 36 }, 100, m, 75, 5, "right")).toBeNull();
  });
});
