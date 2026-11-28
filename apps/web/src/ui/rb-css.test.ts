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
  it("toute var(--…) de rb.css est définie dans rb.css (OG23, T19 : --rf-gray-200 n'existait pas, le damier n'était pas peint)", () => {
    // Posée à l'exécution par un composant (style en ligne de OptionsPanel, ligne 610), pas dans rb.css.
    const defined = new Set(["--rb-btn-size", ...[...CSS.matchAll(/(--[\w-]+)\s*:/g)].map(([, n]) => n!)]);
    const used = [...CSS.matchAll(/var\(\s*(--[\w-]+)\s*(,|\))/g)].filter(([, , end]) => end === ")").map(([, n]) => n!);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((n) => !defined.has(n))).toEqual([]);
  });
  it("le damier de la case Transparent emploie des jetons de gris définis", () => {
    const r = rule(".rb-pick[data-transparent] .rb-pick-dot, .rb-color-transparent .rb-pick-dot");
    expect(r).toContain("repeating-conic-gradient(var(--rf-gray-300) 0 25%, var(--rf-white) 0 50%)");
  });
  it("les en-têtes d'accordéon : règle .rb-opt-h, aucun style en ligne dans OptionsPanel", () => {
    expect(rule(".rb-opt-h")).toContain("margin: 0;");
    expect(rule(".rb-opt-h")).toContain("font: inherit;");
    expect(readFileSync(join(__dirname, "OptionsPanel.tsx"), "utf8")).not.toMatch(/class="rb-opt-h" style=/);
  });
  it("tailles S 44, M 48, L 64, icône 24, cases du sélecteur 36", () => {
    for (const d of ["--rb-btn-s: 44px;", "--rb-btn-m: 48px;", "--rb-btn-l: 64px;", "--rb-icon: 24px;", "--rb-cell: 36px;"]) expect(CSS).toContain(d);
    expect(rule(".rb-table-picker-grid")).toContain("repeat(8, var(--rb-cell))");
    expect(rule(".rb-table-picker-grid button")).toMatch(/inline-size: var\(--rb-cell\); block-size: var\(--rb-cell\);/);
  });
  it("accents hors charte retirés ; plus aucun reste de la bande des onglets (L2-17)", () => {
    for (const c of ["#1e3a8a", "#94a3b8", "#bfdbfe"]) expect(CSS.toLowerCase(), c).not.toContain(c);
    const keep = (CSS.match(/[^{}]+\{[^}]*#a1a1aa[^}]*\}/gi) ?? []).map((r) => r.replace(/\/\*.*?\*\//g, "").split("{")[0]!.trim());
    expect(keep).toEqual([]);
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
    expect(rule('.rb-tab[aria-selected="true"]')).toContain("background: var(--rf-violet-100); color: var(--rf-violet-700);");
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

describe("rb.css (OG19, H1-11)", () => {
  it("raccourci de l'infobulle : `attr(data-keys)` après le libellé, blanc mêlé de navy, graisse normale, hors du texte de la bulle", () => {
    expect(rule(".rb-tip[data-keys]::after")).toMatch(/content: attr\(data-keys\);.*margin-inline-start: 12px;.*color: color-mix\(in srgb, var\(--rf-white\) 72%, var\(--rf-navy-500\)\);.*font-weight: 400;/);
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
  it("design-l4 : zone de dépôt 96 px × --rb-btn, pointillé 1 px gris 500, rayon lg ; couchée dans une barre verticale", () => {
    expect(rule(".rb-drop")).toMatch(/display: grid;.*place-items: center;.*box-sizing: border-box;.*inline-size: 96px;.*block-size: var\(--rb-btn\);.*border: 1px dashed var\(--rf-gray-500\);.*border-radius: var\(--rf-radius-lg\);/);
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
  it("design-l4 (fin de lot) : pastille de préréglage, liseré 1 px aux jetons (plus de gris hors charte), géométrie d'avant inchangée", () => {
    const sw = rule(".rb-swatch");
    expect(sw).not.toContain("#52525b");
    expect(sw).toContain("border: 1px solid color-mix(in srgb, var(--rf-navy-500) 40%, transparent);");
    expect(sw).toContain("inline-size: calc(var(--rb-btn) / 3);");
    expect(sw).toContain("block-size: calc(var(--rb-btn) / 3);");
    expect(sw).not.toContain("+ 2px");
    expect(sw).not.toContain("box-shadow");
  });
  it("design-l4 (fin de lot) : zone de dépôt à bordure pointillée de 1 px entière (1.5px était rendu à 1 px)", () => {
    const drop = rule(".rb-drop");
    expect(drop).toContain("border: 1px dashed var(--rf-gray-500);");
    expect(drop).not.toContain("1.5px");
  });
  it("design-l3 L3-1 : panneau des profils calé à droite dans la scène, toute sa hauteur, 600 px au plus, filet et ombre modale", () => {
    expect(rule('.rb-popover[data-panel="profils"]')).toMatch(/justify-self: end;.*align-self: stretch;.*inline-size: min\(var\(--rb-sheet-w\), 100%\);.*overflow: hidden;.*border: 0;.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-modal\);/);
    expect(rule(".rb-sheet")).toMatch(/display: flex;.*flex-direction: column;.*block-size: 100%;/);
    expect(rule(".rb-sheet-head")).toContain("block-size: 80px;");
    expect(rule(".rb-sheet-foot")).toContain("block-size: 80px;");
    expect(rule(".rb-sheet-body")).toMatch(/overflow-y: auto;/);
  });
  it("design-l3 L3-24 : règles du panneau aux jetons de la charte, tailles de texte 20 / 16 / 15 / 14", () => {
    const own = (CSS.replace(/\/\*.*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? []).filter((r) => /rb-sheet|rb-radio|rb-item|rb-grip|rb-select|rb-tag|rb-note|rb-field|rb-add-list|rb-preset-row|rb-presets|rb-saved/.test(r.split("{")[0]!));
    expect(own.length).toBeGreaterThan(20);
    for (const r of own) {
      expect(r, r).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      for (const [, px] of r.matchAll(/font-size: (\d+)px/g)) expect(["14", "15", "16", "20"], r).toContain(px);
    }
  });
  it("design-l3 L3-24 : cibles de 48 px ou plus (poignée, boutons à icône, segments, vignettes de 80 px, cartes de 104 px)", () => {
    expect(rule(".rb-grip")).toContain("color: var(--rf-navy-500);");
    expect(rule(".rb-grip")).toContain("margin-inline-end: -16px;");
    // OF83 : l'icône de ligne, décorative, recouvre 4 px de la poignée (et son tracé 1 px de plus) : transparente au pointeur,
    // elle laisse les 48 px à la poignée (mesurés au navigateur par design-l3-navigateur.mjs, S2).
    expect(rule(".rb-item > .rb-icon")).toContain("pointer-events: none;");
    expect(rule(".rb-item[data-hidden] .rb-grip")).toContain("color: var(--rf-gray-500);");
    expect(rule(".rb-grip")).toMatch(/inline-size: 48px;.*block-size: 48px;.*touch-action: none;/);
    expect(rule(".rb-sheet button.rb-ib")).toMatch(/inline-size: 48px;.*block-size: 48px;/);
    expect(rule('.rb-radios[data-look="segment"] .rb-radio')).toContain("min-block-size: 48px;");
    expect(rule('.rb-radios[data-look="tile"] .rb-radio')).toContain("min-block-size: 80px;");
    expect(rule('.rb-radios[data-look="card"] .rb-radio')).toContain("min-block-size: 104px;");
    expect(rule(".rb-item")).toContain("min-block-size: 48px;");
    expect(rule('.rb-radios[data-look="tile"]')).toContain("grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));");
  });
  it("design-l3 L3-24 : .rb-editor inchangée (Grille, Image l'emploient)", () => {
    const keep: readonly [string, string][] = [
      [".rb-editor", ".rb-editor { display: grid; gap: var(--rb-gap); padding: var(--rb-pad); }"],
      [".rb-editor section", ".rb-editor section { display: grid; gap: var(--rb-gap); }"],
      [".rb-editor h3", ".rb-editor h3 { margin: 0; font-size: 1rem; }"],
      [".rb-editor fieldset", ".rb-editor fieldset { display: grid; gap: var(--rb-gap); border: 1px solid #d4d4d8; }"],
      [".rb-editor ul", ".rb-editor ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }"],
      [".rb-editor li", ".rb-editor li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rb-gap); }"],
      [".rb-editor li[data-unknown]", ".rb-editor li[data-unknown] { color: #71717a; font-style: italic; }"],
      ['.rb-editor input[type="checkbox"]', '.rb-editor input[type="checkbox"] { inline-size: calc(var(--rb-btn-m) / 2); block-size: calc(var(--rb-btn-m) / 2); }'],
      [".rb-editor-actions", ".rb-editor-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rb-gap); }"],
    ];
    for (const [sel, text] of keep) expect(rule(sel).trim(), sel).toBe(text);
  });
  it("design-l3 L3-7, L3-10, L3-8 : carte et vignette choisies en violet 100 / 600 / 700 ; segment choisi blanc, ombre de carte", () => {
    expect(rule('.rb-radios[data-look="card"] .rb-radio[aria-checked="true"]')).toMatch(/border-color: var\(--rf-violet-600\);.*box-shadow: inset 0 0 0 1px var\(--rf-violet-600\);.*background: var\(--rf-violet-100\);/);
    expect(rule(".rb-radio-chk")).toMatch(/inline-size: 32px;.*block-size: 32px;.*border-radius: 50%;.*background: var\(--rf-violet-600\);.*color: var\(--rf-white\);/);
    expect(rule('.rb-radios[data-look="tile"] .rb-radio[aria-checked="true"]')).toMatch(/background: var\(--rf-violet-100\);.*color: var\(--rf-violet-700\);.*font-weight: 600;/);
    expect(rule('.rb-radios[data-look="segment"] .rb-radio[aria-checked="true"]')).toMatch(/background: var\(--rf-white\);.*color: var\(--rf-violet-700\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-card\);/);
    expect(rule(".rb-item[data-hidden]")).toMatch(/background: var\(--rf-gray-100\);.*color: var\(--rf-text-muted-aa\);/);
  });
  it("design-l3 netteté (exigence de Jérôme) : panneau en pixels entiers ; aucune translation ni longueur fractionnaire ou relative", () => {
    const own = (CSS.replace(/\/\*.*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? []).filter((r) => /rb-sheet|rb-radio|rb-item|rb-grip|rb-select|rb-tag|rb-note|rb-field|rb-add-list|rb-preset-|rb-presets|rb-saved|data-panel="profils"/.test(r.split("{")[0]!));
    expect(own.length).toBeGreaterThan(20);
    for (const r of own) expect(r, r).not.toMatch(/translate|\d\.\d+px|\d(r?em|vw|vh)\b|calc\(|line-height: normal/);
    // Interlignes entiers : une ligne de texte « normal » (dépend de la police) décalerait tout ce qui la suit d'une fraction.
    expect(rule(".rb-sheet")).toContain("line-height: 24px;");
    expect(rule('.rb-radios[data-look="tile"] .rb-radio')).toContain("line-height: 20px;");
    // Corps : 600 - 2 x 24 = 552 ; gouttière des deux côtés (barre b) : colonne de 512 centrée à (552 - 2b - 512) / 2 = 20 - b,
    // entier quelle que soit la barre de défilement ; bords de la colonne à 44 px du panneau, comme l'en-tête et le pied.
    expect(rule(".rb-sheet-body")).toMatch(/scrollbar-gutter: stable both-edges;.*display: grid;.*grid-template-columns: min\(512px, 100%\);.*justify-content: center;.*padding: 20px var\(--rf-space-lg\);/);
    expect(rule(".rb-sheet-head")).toContain("padding: 0 28px 0 44px;");
    expect(rule(".rb-sheet-foot")).toContain("padding: 0 44px;");
    // En-tête et pied : 80 px de contenu, bordure en plus (pas border-box) : un bouton de 48 px y tombe à 16 px.
    for (const sel of [".rb-sheet-head", ".rb-sheet-foot"]) expect(rule(sel), sel).not.toContain("border-box");
    // Divisions de la colonne de 512 : vignettes (auto-fit 88, écart 8 : 5 x 96), cartes (écart 12 : 2 x 250),
    // segments (marge 4, écart 0 : 504 / 2, 3, 4) ; liste « Ajouter » (bord 1, marge 4, écart 4 : 2 x 249).
    expect(rule('.rb-radios[data-look="tile"]')).toContain("gap: var(--rf-space-sm);");
    expect(rule('.rb-radios[data-look="card"]')).toMatch(/grid-template-columns: 1fr 1fr;.*gap: 12px;/);
    expect(rule('.rb-radios[data-look="segment"]')).toMatch(/gap: 0;.*padding: var\(--rf-space-xs\);/);
    const COL = 512;
    const tiles = Math.floor((COL + 8) / (88 + 8));
    for (const w of [(COL - (tiles - 1) * 8) / tiles, (COL - 12) / 2, ...[2, 3, 4].map((n) => (COL - 2 * 4) / n), (COL - 2 - 8 - 4) / 2]) expect(Number.isInteger(w), String(w)).toBe(true);
    expect(((COL - (tiles - 1) * 8) / tiles - 24) % 2).toBe(0); // icône de 24 centrée dans la vignette : décalage entier
    // Commandes calées à droite d'une ligne : largeur fixe, sinon la largeur du texte décale leur icône ou leur bord.
    expect(rule(".rb-sheet-solid")).toContain("inline-size: 160px;");
    expect(rule(".rb-sheet-outline")).toContain("inline-size: 264px;");
    expect(rule(".rb-sheet-h2row .rb-sheet-add")).toContain("inline-size: 136px;");
    expect(rule(".rb-item .rb-sheet-ghost")).toContain("inline-size: 112px;");
    expect(rule(".rb-preset-width > span")).toContain("inline-size: 80px;");
    expect(rule(".rb-saved")).not.toContain("row-reverse");
    expect(rule(".rb-sheet-row > .rb-sheet-ghost")).toContain("inline-size: 128px;"); // Importer, Exporter : largeur fixe, icônes sur la grille de pixels
    for (const sel of [".rb-sheet-ghost", ".rb-sheet-solid", ".rb-sheet-outline", ".rb-sheet-add"]) expect(rule(sel), sel).not.toMatch(/padding: 0 [^;]*\d+\.\d/);
  });
  it("design-l3 L3-2, design-l2 L2-16 : panneau des profils ouvert : la barre d'outils passe sur plusieurs rangées dans la place libre", () => {
    expect(rule('.rb-island[data-wrap="1"] > .rb-bar')).toContain("flex-wrap: wrap;");
    expect(rule('.rb-island[data-wrap="1"] > .rb-bar')).not.toMatch(/position/);
  });
  it("design-l3 L3-22 : menu Profil en îlot (rayon xl, filet gris 300, ombre modale) ; lignes de 48 px icône + texte", () => {
    expect(rule('.rb-popover[data-panel="menu-profils"]')).toMatch(/border: 0;.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-modal\);/);
    expect(rule(":is([data-profiles], [data-menu-list]) button")).toMatch(/display: flex;.*align-items: center;.*gap: 12px;.*min-height: var\(--rb-btn-m\);.*font-size: 16px;/);
    expect(rule('[data-profiles] button[aria-checked="true"]')).toMatch(/color: var\(--rf-violet-700\);.*font-weight: 600;/);
  });
});

describe("rb.css (design-l2)", () => {
  const own = (re: RegExp): string[] => (CSS.replace(/\/\*.*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? []).filter((r) => re.test(r.split("{")[0]!));
  it("design-l2 L2-14 : calque des îlots dans la case de la scène, au-dessus d'elle, inerte ; îlots actifs", () => {
    expect(rule(".rb-islands")).toMatch(/grid-area: stage;.*position: relative;.*z-index: 2;.*pointer-events: none;/);
    expect(rule(".rb-island")).toMatch(/position: absolute;.*pointer-events: auto;/);
    expect(rule(".rb-corner")).toContain("pointer-events: none;");
  });
  it("design-l2 G5 : îlot et îlot contextuel blancs, rayon 12, filet gris 300, ombre de survol, largeur au contenu", () => {
    const look = /inline-size: max-content;.*background: var\(--rf-white\);.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);/;
    expect(rule(".rb-island")).toMatch(look);
    expect(rule(".rb-context")).toMatch(look);
    expect(rule(".rb-context")).toContain("position: absolute;");
  });
  it("design-l2 L2-30 (a) : poignée et Replier en flex à côté de la barre qui rétrécit, jamais rétrécis eux-mêmes", () => {
    expect(rule(".rb-island")).toMatch(/display: flex;.*min-inline-size: 0;/);
    expect(rule(".rb-island-chrome")).toContain("flex: none;");
  });
  it("design-l2 L2-12 : coins à 16 px entiers ; aucune translation, colonne 1fr ni demi-pixel dans les règles des îlots", () => {
    expect(rule('.rb-corner[data-corner="top-start"]')).toContain("left: 16px; top: 16px;");
    expect(rule('.rb-corner[data-corner="top-end"]')).toContain("right: 16px; top: 16px;");
    expect(rule('.rb-corner[data-corner="bottom-start"]')).toContain("left: 16px; bottom: 16px;");
    const rules = own(/rb-island|rb-corner|rb-context|data-menu-list/);
    expect(rules.length).toBeGreaterThan(8);
    for (const r of rules) expect(r, r).not.toMatch(/translate|1fr|\d\.\d+px|backdrop-filter|blur/);
  });
  it("design-l2 L2-30 (a), L2-16, L2-8 : barre qui défile dans l'îlot ; plusieurs rangées dans la place du panneau ; repliée : cachée", () => {
    expect(rule(".rb-island > .rb-bar")).toMatch(/min-inline-size: 0;.*overflow-x: auto;/);
    expect(rule('.rb-island[data-wrap="1"] > .rb-bar')).toContain("flex-wrap: wrap;");
    expect(rule('.rb-island .rb-bar[data-collapsed="1"]')).toContain("display: none;");
    expect(rule(".rb-island-chrome[data-island-grip]")).toContain("touch-action: none;");
  });
  it("personnalisation-1a T10 : barre latérale : liste verticale défilante ; compteur en bleu nuit, marges réduites ; aucun 48 px littéral", () => {
    expect(rule(".rb-pages-list")).toMatch(/flex-direction: column;.*overflow-y: auto;/);
    expect(rule(".rb-pages-list")).not.toMatch(/overflow-x: auto/);
    expect(rule(".rb-side .rb-page-thumb")).toMatch(/touch-action: none;/);
    // T16 : îlot latéral en colonne (volet) ; replié : bande d'un bouton de large, onglets en icônes empilés, puis Déplier.
    const side = '.rb-island[data-anchor^="side-"]';
    expect(rule(side)).toMatch(/flex-direction: column;.*align-items: stretch;/);
    expect(rule(`${side} > .rb-island-chrome`)).toMatch(/inline-size: auto;/);
    expect(rule(`${side}[data-collapsed="1"] .rb-side-tabs`)).toContain("flex-direction: column;");
    expect(rule(`${side}[data-collapsed="1"] .rb-side .rb-tab`)).toMatch(/inline-size: var\(--rb-btn\); block-size: var\(--rb-btn\);.*padding: 0;/);
    expect(rule(`${side}[data-collapsed="1"] .rb-side .rb-tab-title`)).toContain("clip-path: inset(50%);");
    // T16 (design-l4) : panneaux passagers sous les îlots du haut, outil descendu compris (--rb-pop-top posé par App)
    expect(rule(".rb-popover")).toMatch(/max-height: calc\(100% - var\(--rb-pop-top, 88px\) - 16px\);.*margin: var\(--rb-pop-top, 88px\) 0 0 16px;/);
    expect(rule('.rb-popover[data-panel="image"]')).toContain("margin: var(--rb-pop-top, 88px) 16px 0 0;");
    expect(rule(".rb-side .rb-page-thumb[aria-current=\"page\"]")).toContain("var(--rf-violet-600)");
    expect(own(/rb-side|rb-page-|rb-pages-list/).length).toBeGreaterThan(10);
    for (const r of own(/rb-side|rb-page-|rb-pages-list/)) expect(r, r).not.toMatch(/\b48px|\d\.\d+px|translate|blur/);
    expect(rule(".rb-pages-count")).toMatch(/color: var\(--rf-navy-500\);/);
    expect(rule(".rb-pages-count")).not.toMatch(/margin-inline: var\(--rb-gap\)/);
  });
  it("design-l2 L2-13 : îlot contextuel vide caché ; séparateur de tête masqué", () => {
    expect(rule(".rb-context:empty")).toContain("display: none;");
    expect(rule(".rb-context > .rb-sep:first-child")).toContain("display: none;");
  });
  it("design-l2 L2-19 : en annotation, le calque des îlots est caché ; plus aucune règle .rb-floating", () => {
    expect(rule('.rb-layout[data-mode="annotation"] > .rb-islands, .rb-layout[data-mode="annotation"] > .rb-stages, .rb-layout[data-mode="annotation"] > .rb-popover, .rb-layout[data-mode="annotation"] > .rb-toasts')).toContain("display: none;");
    expect(CSS).not.toMatch(/rb-floating/);
  });
  it("design-l2 L2-5 : #etat vide sans fond, filet ni ombre, jamais display: none ; avec un message, en îlot", () => {
    expect(rule("#etat")).not.toMatch(/background|box-shadow|display: none/);
    expect(rule("#etat:not(:empty)")).toMatch(/background: var\(--rf-white\);.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);/);
  });
  it("design-l2 L2-6 : lignes du menu = lignes du menu Profil ; liste en îlot de 320 px sous le bouton ; fermée : cachée", () => {
    expect(rule(":is([data-profiles], [data-menu-list]) button")).toMatch(/display: flex;.*align-items: center;.*gap: 12px;.*min-height: var\(--rb-btn-m\);.*font-size: 16px;/);
    expect(rule("[data-menu-list]")).toMatch(/position: fixed;.*inline-size: max-content;.*min-inline-size: 320px;.*max-inline-size: calc\(100vw - 16px\);.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-modal\);/);
    expect(rule("[data-menu-list] button")).toContain("white-space: nowrap;");
    expect(rule("[data-menu-list][hidden]")).toContain("display: none;");
    expect(rule('.rb-bar button[data-menu-toggle][aria-expanded="true"]')).toMatch(/background: var\(--rf-violet-100\);.*color: var\(--rf-violet-700\);/);
  });
  it("design-l2 L2-15 : panneaux passagers en îlot, sous la rangée du haut ; menu Profil à droite ; barres du média au-dessus des pages", () => {
    expect(rule(".rb-popover")).toMatch(/border: 0;.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);.*margin: var\(--rb-pop-top, 88px\) 0 0 16px;/);
    expect(rule('.rb-popover[data-panel="image"]')).toMatch(/justify-self: end;.*margin: var\(--rb-pop-top, 88px\) 16px 0 0;/);
    expect(rule('.rb-popover[data-panel="menu-profils"]')).toMatch(/justify-self: end;.*margin: 88px 16px 0 0;/);
    expect(rule(".rb-media-bar")).toContain("margin: 0 0 88px;");
  });
  it("design-l2 L2-16 : largeur du panneau des profils en --rb-sheet-w ; panneau et bibliothèque sur toute la hauteur", () => {
    expect(CSS).toContain("--rb-sheet-w: 600px;");
    expect(rule('.rb-popover[data-panel="profils"]')).toMatch(/inline-size: min\(var\(--rb-sheet-w\), 100%\);.*max-width: 100%;.*max-height: 100%;.*margin: 0;/);
    expect(rule('.rb-popover[data-panel="library"]')).toMatch(/align-self: stretch;.*margin: 0;/);
  });
  it("design-l2 L2-18 : la règle des libellés courts .iwb / .ubz est retirée", () => {
    expect(CSS).not.toMatch(/export-iwb/);
  });
  it("design-l2 L2-17 : onglets de 48 px ; montré en violet 100 / 700 ; point violet ; Fermer 44 px ; Nouvel onglet 48 px", () => {
    expect(rule(".rb-tab")).toMatch(/block-size: 48px;.*border-radius: var\(--rf-radius-lg\);.*font-size: 15px;/);
    expect(rule('.rb-tab[aria-selected="true"]')).toMatch(/background: var\(--rf-violet-100\);.*color: var\(--rf-violet-700\);/);
    expect(rule(".rb-tab-dirty")).toMatch(/inline-size: 8px;.*block-size: 8px;.*border-radius: 50%;.*background: var\(--rf-violet-600\);/);
    expect(rule(".rb-tab-close")).toMatch(/inline-size: 44px;.*block-size: 44px;/);
    expect(rule(".rb-tab-new")).toMatch(/inline-size: 48px;.*block-size: 48px;/);
  });
  it("design-l2 L2-21 : plus de trois barres : segments de 168 px (504 / 3) sur des rangées de trois", () => {
    expect(rule('.rb-radios[data-look="segment"]:has(> .rb-radio:nth-child(4))')).toContain("flex-wrap: wrap;");
    expect(rule('.rb-radios[data-look="segment"]:has(> .rb-radio:nth-child(4)) > .rb-radio')).toContain("flex: 0 0 168px;");
    expect(Number.isInteger((512 - 2 * 4) / 3)).toBe(true);
  });
});

describe("empilement et calage du panneau d'options (T22)", () => {
  const z = (sel: string): number => Number(/z-index: (\d+)/.exec(rule(sel))?.[1] ?? NaN);
  it("le panneau d'options est sous le calque des îlots, qui porte les menus, ouvert au-dessus de lui", () => {
    expect(z(".rb-options")).toBeLessThan(z(".rb-islands"));
    expect(z("[data-menu-list]")).toBeGreaterThan(z(".rb-options"));
    expect(z(".rb-popover")).toBeGreaterThan(z(".rb-options"));
    expect(z(".rb-tip")).toBeGreaterThan(z(".rb-islands"));
  });
});

describe("rb.css (T33)", () => {
  it("bouton de l'éditeur de lien : le style des boutons d'îlot, pas celui du navigateur", () => {
    const r = rule(".rb-options .rb-opt-btn, .rb-link-pop .rb-opt-btn");
    for (const d of ["border: 0", "background: transparent", "border-radius: var(--rf-radius-lg)", "color: var(--rf-navy-500)"]) expect(r, d).toContain(d);
    expect(rule(".rb-options .rb-opt-btn:hover, .rb-options .rb-pick:hover, .rb-link-pop .rb-opt-btn:hover")).toContain("background: var(--rf-gray-50)");
  });
  it("choix de texte du panneau : marge intérieure de 8 px de chaque côté", () => {
    expect(rule('.rb-options .rb-radios[data-look="segment"] .rb-radio:not(:has(.rb-icon))')).toContain("padding-inline: 8px");
  });
  it("OG23 T18 : la pipette du sélecteur de couleur est une cible de 44 px au moins", () => {
    expect(rule(".rb-color-picker .rb-color-pipette")).toMatch(/inline-size: max\(44px, var\(--rb-btn-size, 44px\)\);.*block-size: max\(44px, var\(--rb-btn-size, 44px\)\);/);
  });
  it("OG23 T20 : la pipette n'a pas l'apparence native (appearance, background, border) ni la pleine largeur", () => {
    const r = rule(".rb-color-picker .rb-color-pipette");
    for (const d of ["appearance: none", "background: transparent", "border: 0", "border-radius: var(--rf-radius-lg)"]) expect(r, d).toContain(d);
    expect(r).not.toMatch(/inline-size: 100%|width: 100%/);
    expect(rule(".rb-color-picker .rb-color-pipette:hover")).toContain("background: var(--rf-gray-50)");
  });
  it("OG23 T20 : Transparente et pipette sur une même ligne, alignée sur la grille", () => {
    const r = rule(".rb-color-tools");
    expect(r).toContain("display: flex");
    expect(r).toContain("gap: 2px");
    expect(rule(".rb-color-transparent")).not.toContain("margin-block-end");
  });
});

describe("barre d'objet (OG41, D18, D26)", () => {
  it("îlot blanc rayon xl, filet et ombre ; caché par [hidden] ; boutons de 36 px, cible de 44 px", () => {
    expect(rule(".rb-object-bar")).toContain("position: absolute");
    expect(rule(".rb-object-bar")).toContain("block-size: 44px");
    expect(rule(".rb-object-bar")).toContain("gap: 8px");
    expect(rule(".rb-object-bar")).toContain("var(--rf-radius-xl)");
    expect(rule(".rb-object-bar")).toContain("var(--rf-shadow-hover)");
    expect(rule(".rb-object-bar[hidden]")).toContain("display: none");
    expect(rule(".rb-object-bar > button.rb-ib")).toContain("inline-size: 36px");
    expect(rule(".rb-object-bar > button.rb-ib::before")).toContain("inset: -4px");
  });
});
