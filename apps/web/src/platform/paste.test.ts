// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { isEditable, pastedFiles } from "./paste";

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
