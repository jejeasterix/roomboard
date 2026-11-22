// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import type { TextSpan } from "../core/api";
import { attrsKey, END_BR, readSelection, readText, renderSpans, sameRender, setSelection } from "./rich-dom";

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const BASE = { size: 36 };
const roots: HTMLElement[] = [];
function root(): HTMLElement {
  const r = document.createElement("div");
  r.contentEditable = "true";
  document.body.append(r);
  roots.push(r);
  return r;
}
afterEach(() => {
  for (const r of roots.splice(0)) r.remove();
  document.getSelection()?.removeAllRanges();
});

describe("segments ↔ DOM (C7b)", () => {
  it("renderSpans : un span par segment non vide, style en ligne tiré des attributs (R4)", () => {
    const r = root();
    renderSpans(r, [plain("Le "), { text: "chat", attrs: { bold: true, color: "#dc2626" } }, { text: " noir", attrs: { italic: true, underline: true, size: 48, font: "Georgia" } }, plain("")], BASE);
    const spans = [...r.querySelectorAll("span")];
    expect(spans.map((s) => s.textContent)).toEqual(["Le ", "chat", " noir"]);
    expect(spans[0]!.style.fontSize).toBe("36px");
    expect(spans[1]!.style.fontWeight).toBe("bold");
    expect(spans[1]!.style.color).toMatch(/#dc2626|rgb\(220, 38, 38\)/);
    expect([spans[2]!.style.fontStyle, spans[2]!.style.textDecoration, spans[2]!.style.fontSize]).toEqual(["italic", "underline", "48px"]);
    expect(spans[2]!.style.fontFamily).toContain("Georgia");
    expect(spans[0]!.getAttribute("data-rb-attrs")).toBe(attrsKey({}));
  });

  it("texte qui finit par « \\n » : <br data-rb-fin> final, jamais lu (R4, R3)", () => {
    const r = root();
    renderSpans(r, [plain("ab\n")], BASE);
    expect(r.lastElementChild?.tagName).toBe("BR");
    expect(r.lastElementChild?.hasAttribute(END_BR)).toBe(true);
    expect(readText(r)).toBe("ab\n");
  });

  it("sameRender : vrai juste après le rendu ; faux si le navigateur a ajouté un nœud, changé un texte ou un bloc", () => {
    const r = root();
    const spans: TextSpan[] = [plain("Le "), { text: "chat", attrs: { bold: true } }];
    renderSpans(r, spans, BASE);
    expect(sameRender(r, spans)).toBe(true);
    r.append(document.createTextNode("x"));
    expect(sameRender(r, spans)).toBe(false);
    renderSpans(r, spans, BASE);
    r.querySelector("span")!.firstChild!.nodeValue = "La ";
    expect(sameRender(r, spans)).toBe(false);
    renderSpans(r, spans, BASE);
    expect(sameRender(r, [plain("Le "), { text: "chat", attrs: { italic: true } }])).toBe(false);
  });

  it("attrsKey : même clé pour les mêmes attributs, quel que soit l'ordre des clés", () => {
    expect(attrsKey({ bold: true, color: "#f00" })).toBe(attrsKey({ color: "#f00", bold: true }));
    expect(attrsKey({ bold: true })).not.toBe(attrsKey({}));
  });

  it("lecture robuste : <br> et blocs du navigateur, br de fin et ligne vide jamais lus (R3, PC8)", () => {
    const r = root();
    const read = (html: string): string => {
      r.innerHTML = html;
      return readText(r);
    };
    expect(read("a<br>b")).toBe("a\nb");
    expect(read("a<div>b</div>")).toBe("a\nb");
    expect(read("<div>a</div><div>b</div>")).toBe("a\nb");
    expect(read("a<div><br></div>")).toBe("a\n");
    expect(read("<div><br></div><div>x</div>")).toBe("\nx");
    expect(read('<span>ab\n</span><br data-rb-fin="">')).toBe("ab\n");
    expect(read("<div>a</div>b")).toBe("a\nb");
  });

  it("setSelection puis readSelection : positions UTF-16 du texte rendu ; fin après « \\n » : devant le br de fin", () => {
    const r = root();
    renderSpans(r, [plain("Le "), { text: "chat", attrs: { bold: true } }, plain("\n")], BASE);
    setSelection(r, 3, 7);
    expect(readSelection(r)).toEqual({ start: 3, end: 7 });
    expect(String(document.getSelection())).toBe("chat");
    setSelection(r, 8, 8);
    expect(readSelection(r)).toEqual({ start: 8, end: 8 });
    expect(document.getSelection()?.anchorNode).toBe(r);
  });

  it("readSelection : paire de substitution comptée 2 ; sélection hors de la zone : null", () => {
    const r = root();
    renderSpans(r, [plain("🐱a")], BASE);
    setSelection(r, 2, 2);
    expect(readSelection(r)).toEqual({ start: 2, end: 2 });
    const other = root();
    other.textContent = "dehors";
    document.getSelection()?.setBaseAndExtent(other.firstChild!, 1, other.firstChild!, 2);
    expect(readSelection(r)).toBeNull();
  });

  it("readSelection : <br> de fin de zone ou de bloc posé par le navigateur, jugé dans le vrai DOM (PC8)", () => {
    const r = root();
    r.innerHTML = "<span>abc</span><br>";
    expect(readText(r)).toBe("abc");
    document.getSelection()!.setBaseAndExtent(r, 2, r, 2);
    expect(readSelection(r)).toEqual({ start: 3, end: 3 });
    r.innerHTML = "<div>a<br>b</div>";
    expect(readText(r)).toBe("a\nb");
    const div = r.firstChild!;
    document.getSelection()!.setBaseAndExtent(div, 2, div, 2);
    expect(readSelection(r)).toEqual({ start: 2, end: 2 });
    r.innerHTML = "<div>ab<br></div><div>c</div>";
    document.getSelection()!.setBaseAndExtent(r.firstChild!, 2, r.firstChild!, 2);
    expect(readSelection(r)).toEqual({ start: 2, end: 2 });
  });

  it("readSelection sur un DOM du navigateur (blocs) : curseur au début du second bloc = 2", () => {
    const r = root();
    r.innerHTML = "<div>a</div><div>b</div>";
    const b = r.querySelectorAll("div")[1]!.firstChild!;
    document.getSelection()?.setBaseAndExtent(b, 0, b, 0);
    expect(readSelection(r)).toEqual({ start: 2, end: 2 });
  });
});
