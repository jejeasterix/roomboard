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

describe("rb.css (design-l4, L4-12)", () => {
  it("L4-12 : cadre de l'annotation 3 px violet 600, fixe sur toute la fenêtre, inerte, montré par html[data-cadre=\"1\"]", () => {
    expect(rule(".rb-annot-frame")).toMatch(/display: none;.*position: fixed;.*inset: 0;.*box-shadow: inset 0 0 0 3px var\(--rf-violet-600\);.*pointer-events: none;/);
    expect(rule('html[data-cadre="1"] .rb-annot-frame')).toContain("display: block;");
  });
});

describe("rb.css (design-l4, L4-7 bis, L4-8, L4-10, L4-11)", () => {
  it("design-l4 : commande segmentée, fond gris 50 et rayon lg ; empilée en colonne dans une barre verticale", () => {
    expect(rule(".rb-seg")).toMatch(/display: inline-flex;.*flex: none;.*background: var\(--rf-gray-50\);.*border-radius: var\(--rf-radius-lg\);/);
    expect(rule('.rb-bar[data-dock="left"] .rb-seg, .rb-bar[data-dock="right"] .rb-seg')).toContain("flex-direction: column;");
  });
  it("design-l4 : boutons pleins violet 600 et blanc ; grisés gris 50 et gris 500 ; accolés à 2 px, en ligne et en colonne", () => {
    expect(rule(".rb-bar button.rb-primary")).toMatch(/background: var\(--rf-violet-600\);.*color: var\(--rf-white\);/);
    expect(rule(".rb-bar button.rb-primary:not(:disabled):hover")).toContain("background: var(--rf-violet-700);");
    expect(rule(".rb-bar button.rb-primary:disabled")).toMatch(/background: var\(--rf-gray-50\);.*color: var\(--rf-gray-500\);/);
    expect(rule('.rb-bar:is([data-dock="top"], [data-dock="bottom"]) button.rb-primary + button.rb-primary')).toContain("margin-inline-start: -2px;");
    expect(rule('.rb-bar:is([data-dock="left"], [data-dock="right"]) button.rb-primary + button.rb-primary')).toContain("margin-block-start: -2px;");
  });
  it("design-l4 : zone de dépôt 96 px × --rb-btn, pointillé 1,5 px gris 500, rayon lg ; couchée dans une barre verticale", () => {
    expect(rule(".rb-drop")).toMatch(/display: grid;.*place-items: center;.*box-sizing: border-box;.*inline-size: 96px;.*block-size: var\(--rb-btn\);.*border: 1\.5px dashed var\(--rf-gray-500\);.*border-radius: var\(--rf-radius-lg\);/);
    expect(rule('.rb-bar[data-dock="left"] .rb-drop, .rb-bar[data-dock="right"] .rb-drop')).toMatch(/inline-size: var\(--rb-btn\);.*block-size: 96px;/);
  });
});

describe("rb.css (design-l4, L4-16)", () => {
  it("L4-16 : bandeau dans la case de la scène, en bas à droite, 24 px des bords, inerte ; carte blanche, pastille 32 px succès", () => {
    expect(rule(".rb-toasts")).toMatch(/grid-area: stage;.*align-self: end;.*justify-self: end;.*margin: 24px;.*z-index: 4;.*pointer-events: none;/);
    expect(rule(".rb-toast")).toMatch(/display: flex;.*align-items: center;.*gap: 12px;.*padding: 12px 16px;.*background: var\(--rf-white\);.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);.*font-size: 16px;.*color: var\(--rf-gray-800\);/);
    expect(rule(".rb-toast-ok")).toMatch(/inline-size: 32px;.*block-size: 32px;.*border-radius: 50%;.*background: var\(--rf-success\);.*color: var\(--rf-white\);/);
    expect(rule(".rb-toast b")).toMatch(/font-weight: 600;.*color: var\(--rf-violet-700\);/);
  });
  it("L4-16 : bandeau caché en annotation (fenêtre principale réduite à la barre)", () => {
    expect(CSS).toMatch(/\.rb-layout\[data-mode="annotation"\] > \.rb-toasts \{ display: none; \}/);
  });
  it("relecture : le bandeau mesure sa largeur de bordure (box-sizing: border-box)", () => {
    expect(rule(".rb-toast")).toMatch(/box-sizing: border-box;/);
  });
  it("relecture : focus des boutons pleins en navy 500, décalé de 2 px (visible sur le violet, sépare les boutons accolés)", () => {
    expect(rule(".rb-bar button.rb-primary:focus-visible")).toMatch(/outline-color: var\(--rf-navy-500\);.*outline-offset: 2px;/);
  });
  it("relecture : survol du segment inactif distinct du fond de la commande (gris 300, pas gris 50)", () => {
    const sel = '.rb-bar .rb-seg button:not(:disabled, [aria-pressed="true"], [aria-current="page"]):hover';
    expect(rule(sel)).toMatch(/background: var\(--rf-gray-300\);/);
    expect(rule(".rb-seg")).toContain("background: var(--rf-gray-50);");
  });
});
