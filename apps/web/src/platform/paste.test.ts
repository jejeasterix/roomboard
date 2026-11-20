// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { isEditable, pastedFiles, pastedTableHtml } from "./paste";

const files = (...f: File[]) => ({ files: f });
const png = new File([new Uint8Array([1])], "a.png", { type: "image/png" });
const txt = new File(["x"], "a.txt", { type: "text/plain" });

describe("collage (R19)", () => {
  it("fichiers image/* du presse-papiers, les autres ignorés", () => {
    const r = pastedFiles({ target: document.body, clipboardData: files(png, txt) });
    expect(r.map((f) => [f.name, f.mime, f.size])).toEqual([["a.png", "image/png", 1]]);
  });

  it("cible éditable (zone de texte, champ, contenteditable) : rien", () => {
    const area = document.createElement("textarea");
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    for (const t of [area, input, div]) expect(pastedFiles({ target: t, clipboardData: files(png) }), t.tagName).toEqual([]);
  });

  it("bouton et case à cocher ne sont pas éditables ; aucun presse-papiers : rien", () => {
    const b = document.createElement("input");
    b.type = "checkbox";
    expect(isEditable(b)).toBe(false);
    expect(isEditable(document.createElement("button"))).toBe(false);
    expect(pastedFiles({ target: document.body, clipboardData: null })).toEqual([]);
  });
});

describe("collage d'un tableau HTML (F19)", () => {
  const data = (html: string, f: File[] = []) => ({ files: f, getData: (t: string) => (t === "text/html" ? html : "") });
  it("HTML avec <table> : rendu tel quel ; sans tableau, sans HTML ou sans presse-papiers : null", () => {
    const html = "<TABLE><tr><td>a</td></tr></TABLE>";
    expect(pastedTableHtml({ target: document.body, clipboardData: data(html) })).toBe(html);
    expect(pastedTableHtml({ target: document.body, clipboardData: data("<p>a</p><tablex>") })).toBeNull();
    expect(pastedTableHtml({ target: document.body, clipboardData: { files: [] } })).toBeNull();
    expect(pastedTableHtml({ target: document.body, clipboardData: null })).toBeNull();
  });
  it("cible éditable : null (collage normal dans la zone de texte)", () => {
    const area = document.createElement("textarea");
    expect(pastedTableHtml({ target: area, clipboardData: data("<table><tr><td>a</td></tr></table>") })).toBeNull();
  });
  it("effet de bord : le tableau passe avant l'image jointe ; une image seule se colle comme avant", () => {
    const png = new File([new Uint8Array([1])], "x.png", { type: "image/png" });
    const both = { target: document.body, clipboardData: data("<table><tr><td>a</td></tr></table>", [png]) };
    expect(pastedTableHtml(both)).not.toBeNull();
    expect(pastedFiles(both)).toHaveLength(1);
    const only = { target: document.body, clipboardData: data("", [png]) };
    expect(pastedTableHtml(only)).toBeNull();
    expect(pastedFiles(only)).toHaveLength(1);
  });
});
