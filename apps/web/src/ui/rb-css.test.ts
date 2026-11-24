import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "rb.css"), "utf8").replace(/\s+/g, " ");
const MAQUETTE = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "01-tableau.html"), "utf8");
/** Corps de la règle dont le sélecteur est exactement `sel` ; "" si absente. */
const rule = (sel: string): string =>
  (CSS.replace(/\/\*.*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? []).find((r) => r.split("{")[0]!.trim() === sel) ?? "";

describe("rb.css (design-l1, L1-6)", () => {
  it("les 29 jetons --rf-* de la maquette 01 sont recopiés à l'identique", () => {
    const start = MAQUETTE.indexOf(":root {");
    const root = MAQUETTE.slice(start, MAQUETTE.indexOf("}", start));
    const decls = [...root.matchAll(/(--rf-[\w-]+):\s*([^;]+);/g)].map(([, k, v]) => `${k}: ${v!.replace(/\s+/g, " ").trim()};`);
    expect(decls).toHaveLength(29);
    for (const d of decls) expect(CSS, d).toContain(d);
  });
  it("tailles S 44, M 48, L 64, icône 24, cases du sélecteur 36", () => {
    for (const d of ["--rb-btn-s: 44px;", "--rb-btn-m: 48px;", "--rb-btn-l: 64px;", "--rb-icon: 24px;", "--rb-cell: 36px;"]) expect(CSS).toContain(d);
    expect(rule(".rb-table-picker-grid")).toContain("repeat(8, var(--rb-cell))");
    expect(rule(".rb-table-picker-grid button")).toMatch(/inline-size: var\(--rb-cell\); block-size: var\(--rb-cell\);/);
  });
  it("accents hors charte retirés ; #a1a1aa ne reste que sur la bande et les onglets (L2)", () => {
    for (const c of ["#1e3a8a", "#94a3b8", "#bfdbfe"]) expect(CSS.toLowerCase(), c).not.toContain(c);
    const keep = (CSS.match(/[^{}]+\{[^}]*#a1a1aa[^}]*\}/gi) ?? []).map((r) => r.replace(/\/\*.*?\*\//g, "").split("{")[0]!.trim());
    expect(keep).toEqual([".rb-tabs", ".rb-tab"]);
  });
  it("barre : fond blanc, padding 4px, aucune bordure (aucun pixel de hauteur ajouté)", () => {
    const bar = rule(".rb-bar");
    expect(bar).toContain("background: var(--rf-white);");
    expect(bar).toContain("padding: 4px;");
    expect(bar).not.toMatch(/border/);
  });
  it("bouton : sans bordure, rayon lg, navy ; survol gris ; enfoncé et page violets ; grisé ; focus en outline", () => {
    expect(rule(".rb-bar button")).toMatch(/border: none;.*border-radius: var\(--rf-radius-lg\);.*background: transparent;.*color: var\(--rf-navy-500\);/);
    expect(CSS).toMatch(/:hover \{ background: var\(--rf-gray-50\); \}/);
    const on = "background: var(--rf-violet-100); border-color: var(--rf-violet-600); color: var(--rf-violet-700);";
    const flat = "background: var(--rf-violet-100); color: var(--rf-violet-700);";
    expect(rule('.rb-bar button[aria-pressed="true"]')).toContain(flat);
    expect(rule('.rb-bar button[aria-pressed="true"]')).not.toContain("border-color");
    expect(rule('.rb-bar button[aria-current="page"]')).toContain(flat);
    expect(rule('.rb-bar button[aria-current="page"]')).not.toContain("border-color");
    expect(rule('.rb-media-bar-inner button[aria-pressed="true"]')).toContain(on);
    // #888888 jamais pour du texte (charte.md:28) : gris AA sur les boutons à texte, gris 500 sur les boutons à icône
    expect(rule(".rb-bar button:disabled")).toContain("color: var(--rf-text-muted-aa);");
    expect(rule(".rb-bar button.rb-ib:disabled")).toContain("color: var(--rf-gray-500);");
    expect(rule(".rb-bar button:focus-visible")).toContain("outline: 2px solid var(--rf-violet-600);");
    expect(rule('.rb-tab[aria-selected="true"]')).toContain("border-color: var(--rf-violet-600);");
  });
  it("bouton à icône carré de --rb-btn, icône de --rb-icon", () => {
    expect(rule(".rb-bar button.rb-ib")).toMatch(/inline-size: var\(--rb-btn\);.*block-size: var\(--rb-btn\);.*padding: 0;.*flex: none;/);
    expect(rule(".rb-icon")).toMatch(/inline-size: var\(--rb-icon\);.*block-size: var\(--rb-icon\);/);
  });
  it(".rb-sr et .rb-tip de premier niveau ; infobulle fixe, inerte, navy, sans transform", () => {
    expect(rule(".rb-sr")).toContain("position: absolute;");
    const tip = rule(".rb-tip");
    expect(tip).toMatch(/position: fixed;.*pointer-events: none;.*background: var\(--rf-navy-500\);.*color: var\(--rf-white\);.*font-size: 14px;.*font-weight: 500;.*border-radius: var\(--rf-radius-md\);.*box-shadow: var\(--rf-shadow-card\);/);
    expect(tip).not.toMatch(/transform/);
    expect(CSS).not.toMatch(/\.rb-bar[^{}]*\.rb-(sr|tip)\b/);
  });
});
