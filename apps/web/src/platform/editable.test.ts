// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isEditable } from "./editable";
import * as paste from "./paste";

describe("isEditable (OF13, D4)", () => {
  it("zone de texte, champ texte, contenteditable : éditables", () => {
    const area = document.createElement("textarea");
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    const empty = document.createElement("div");
    empty.setAttribute("contenteditable", "");
    for (const t of [area, input, div, empty]) expect(isEditable(t), t.outerHTML).toBe(true);
  });

  it("case à cocher, bouton, élément ordinaire, null : non éditables", () => {
    const box = document.createElement("input");
    box.type = "checkbox";
    const btn = document.createElement("input");
    btn.type = "button";
    for (const t of [box, btn, document.createElement("button"), document.createElement("div"), null]) expect(isEditable(t)).toBe(false);
  });

  it("même fonction réexportée par paste.ts (H3)", () => {
    expect(paste.isEditable).toBe(isEditable);
  });

  it("feuille : aucun import", () => {
    expect(readFileSync(join(__dirname, "editable.ts"), "utf8")).not.toMatch(/^\s*(import|export .* from)\s/m);
  });
});
