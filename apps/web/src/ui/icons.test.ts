import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTION_TABLE, TOOL_TABLE, type ToolItem } from "../toolbar";
import { ACTION_ICONS, ICONS, ICON_VIEWBOX, TOOL_ICONS, iconFor, type IconNode } from "./icons";

const MAQUETTE = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "01-tableau.html"), "utf8");
/** Symbole `i-<nom>` de la maquette 01, lu comme `IconNode`. */
function symbol(name: string): IconNode {
  const m = MAQUETTE.match(new RegExp(`<symbol id="i-${name}" viewBox="-0\\.25 -0\\.25 24 24">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error(`symbole absent : i-${name}`);
  return [...m[1]!.matchAll(/<(path|rect|circle|line|polyline|ellipse)\s([^>]*?)\s*\/>/g)].map(([, tag, attrs]) => [
    tag as IconNode[number][0],
    Object.fromEntries([...attrs!.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, v!])),
  ]);
}
const MAQUETTE_02 = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "02-annotation-bureau.html"), "utf8");
/** Symbole `i-<nom>` de la maquette 02 (design-l4), lu comme `IconNode`. */
function symbol02(name: string): IconNode {
  const m = MAQUETTE_02.match(new RegExp(`<symbol id="i-${name}" viewBox="-0\\.25 -0\\.25 24 24">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error(`symbole absent : i-${name}`);
  return [...m[1]!.matchAll(/<(path|rect|circle|line|polyline|ellipse)\s([^>]*?)\s*\/>/g)].map(([, tag, attrs]) => [
    tag as IconNode[number][0],
    Object.fromEntries([...attrs!.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, v!])),
  ]);
}
const MAQUETTE_03 = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "03-profils.html"), "utf8");
const NOTICE = readFileSync(join(__dirname, "..", "..", "..", "..", "THIRD_PARTY_NOTICES.md"), "utf8");
/** Symbole `i-<nom>` de la maquette 03 (design-l3), lu comme `IconNode`. */
function symbol03(name: string): IconNode {
  const m = MAQUETTE_03.match(new RegExp(`<symbol id="i-${name}" viewBox="-0\\.25 -0\\.25 24 24">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error(`symbole absent : i-${name}`);
  return [...m[1]!.matchAll(/<(path|rect|circle|line|polyline|ellipse)\s([^>]*?)\s*\/>/g)].map(([, tag, attrs]) => [
    tag as IconNode[number][0],
    Object.fromEntries([...attrs!.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, v!])),
  ]);
}
/** design-l3 (L3-25) : icônes du panneau des profils, nom RoomBoard -> nom Lucide. */
const PANEL_ICONS: Readonly<Record<string, string>> = {
  close: "x", grip: "grip-vertical", hidden: "eye-off", "dock-top": "panel-top", "dock-bottom": "panel-bottom",
  "dock-left": "panel-left", "dock-right": "panel-right", "dock-float": "app-window", import: "upload", down: "chevron-down",
};
/** design-l2 (L2-22) : icônes de la maquette 01 propres aux îlots, nom RoomBoard -> nom Lucide. */
const ISLAND_ICONS: Readonly<Record<string, string>> = { menu: "menu", collapse: "chevron-up" };
/** OG11 (T10) : panneau d'options, Lucide (copy-plus, link (T18), trash-2, sliders-horizontal, chevron-*) et icônes dessinées. */
/** OG12 (T3) : types de flèche, pointes neuves, « Modifier les points », liaison. */
const OG12_ICONS = ["arrow-type-sharp", "arrow-type-round", "arrow-type-elbow", "head-bar", "head-circle", "head-circle-outline", "edit-points", "point-remove", "arrow-binding"];
const OPTION_ICONS = ["copy-plus", "link", "external-link", "trash-2", "sliders-horizontal", "chevron-left", "stroke-solid", "stroke-dashed", "stroke-dotted", "sloppiness-0", "sloppiness-1", "sloppiness-2", "corner-sharp", "corner-round",
  "chevron-up", "chevron-down", "align-left", "align-center", "align-right", "fill-solid", "fill-hachure", "fill-cross", "head-none", "head-arrow", "head-triangle", "head-triangle-outline", "palette", "width-thin", "width-medium", "width-thick",
  "pressure-constant", "pressure-variable", "align-start-vertical", "align-center-vertical", "align-end-vertical", "align-start-horizontal", "align-center-horizontal", "align-end-horizontal", "align-horizontal-space-around", "align-vertical-space-around", "flip-horizontal", "flip-vertical", "rotate-ccw-square", "rotate-cw-square", "pipette", "crop"];
const DIALOG_ICONS = ["search", "image-plus", "layout-template"];
const FROM_MOCKUP = ["pen", "eraser", "hand", "select", "rect", "ellipse", "line", "arrow", "text", "table", "fill", "eraser-part", "undo", "redo", "prev", "next", "plus", "trash", "file-import", "pdf", "export", "fit", "file-new", "file-open", "save", "settings", "profile", "grid", "library", "annotate", "pointer", "screen", "freeze", "board", "reset"];
/** personnalisation-1a (T6, GC4) : icônes Lucide du lot 1, recopiées telles quelles (trait 2 d'origine, rendu à 1,5 par la feuille de style). */
const LOT1: Readonly<Record<string, IconNode>> = {
  copy: [["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]],
  "rectangle-horizontal": [["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }]],
  "rectangle-vertical": [["rect", { width: "12", height: "20", x: "6", y: "2", rx: "2" }]],
  infinity: [["path", { d: "M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" }]],
  "rows-2": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 12h18" }]],
  "rows-3": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M21 9H3" }], ["path", { d: "M21 15H3" }]],
  "rows-4": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M21 7.5H3" }], ["path", { d: "M21 12H3" }], ["path", { d: "M21 16.5H3" }]],
};
/** personnalisation-1a (T14, GC4) : icônes Lucide du lot 2 (calques), lues au commit 7981a0798a par `gh api`, recopiées telles quelles. */
const LOT2: Readonly<Record<string, IconNode>> = {
  layers: [
    ["path", { d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" }],
    ["path", { d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" }],
    ["path", { d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" }],
  ],
  "bring-to-front": [["rect", { x: "8", y: "8", width: "8", height: "8", rx: "2" }], ["path", { d: "M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" }], ["path", { d: "M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2" }]],
  "send-to-back": [["rect", { x: "14", y: "14", width: "8", height: "8", rx: "2" }], ["rect", { x: "2", y: "2", width: "8", height: "8", rx: "2" }], ["path", { d: "M7 14v1a2 2 0 0 0 2 2h1" }], ["path", { d: "M14 7h1a2 2 0 0 1 2 2v1" }]],
};
const TAGS = ["path", "rect", "circle", "line", "polyline", "ellipse"];
const tool = (t: string, icon?: string): ToolItem => ({ id: t, kind: "tool", tool: t, label: t, ...(icon !== undefined ? { icon } : {}), requires: [], rest: {} });
const action = (a: string): ToolItem => ({ id: a, kind: "action", action: a, label: a, requires: [], rest: {} });

describe("icons (design-l1, L1-1 à L1-3)", () => {
  it("ICONS : 132 icônes, exactement celles qu'attribuent les tables, les états, la zone de dépôt, le bandeau, le panneau des profils, les îlots, les lots 1 et 2 de personnalisation-1a, la fenêtre des fonds et le panneau d'options (OG11, lien T18), OG12 (9 icônes de lignes)", () => {
    const used = new Set([...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS), "pen-line", "reset", "check", "drop", ...Object.keys(PANEL_ICONS), ...Object.keys(ISLAND_ICONS), ...Object.keys(LOT1), ...Object.keys(LOT2), ...DIALOG_ICONS, ...OPTION_ICONS, ...OG12_ICONS]);
    expect(Object.keys(ICONS).sort()).toEqual([...used].sort());
    expect(Object.keys(ICONS)).toHaveLength(132);
  });
  it("losange : tracé Lucide diamond, trait fin sur la grille 24", () => {
    expect(ICONS["diamond"]).toBeDefined();
    expect(TOOL_ICONS["diamond" as keyof typeof TOOL_ICONS]).toBe("diamond");
  });
  it("design-l4 : check et drop recopiés à l'identique de 02-annotation-bureau.html (Lucide check, file-down)", () => {
    expect(ICONS["check"]).toEqual(symbol02("check"));
    expect(ICONS["drop"]).toEqual(symbol02("drop"));
  });
  it("design-l3 : les dix icônes du panneau recopiées à l'identique de la maquette 03 (Lucide x, grip-vertical, ...)", () => {
    for (const name of Object.keys(PANEL_ICONS)) expect(ICONS[name], name).toEqual(symbol03(name));
  });
  it("design-l3 : notice de licence : chaque icône du panneau nommée avec son nom Lucide", () => {
    expect(NOTICE).toContain("docs/design/maquettes/03-profils.html");
    for (const [name, lucide] of Object.entries(PANEL_ICONS)) expect(NOTICE, name).toContain(`\`${name}\` (Lucide \`${lucide}\`)`);
  });
  it("design-l2 L2-22 : menu et collapse recopiées à l'identique de 01-tableau.html (Lucide menu, chevron-up), nommées dans la notice", () => {
    for (const name of Object.keys(ISLAND_ICONS)) expect(ICONS[name], name).toEqual(symbol(name));
    for (const [name, lucide] of Object.entries(ISLAND_ICONS)) expect(NOTICE, name).toContain(`\`${name}\` (Lucide \`${lucide}\`)`);
  });
  it("calage : viewBox -0.25 -0.25 24 24", () => {
    expect(ICON_VIEWBOX).toBe("-0.25 -0.25 24 24");
  });
  it("chaque outil et chaque action connus ont une icône de la table (12 + 43)", () => {
    expect(Object.keys(TOOL_ICONS).sort()).toEqual(Object.keys(TOOL_TABLE).sort());
    expect(Object.keys(ACTION_ICONS).sort()).toEqual(Object.keys(ACTION_TABLE).sort());
    for (const name of [...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS)]) expect(Object.hasOwn(ICONS, name), name).toBe(true);
    expect(Object.keys(TOOL_ICONS)).toHaveLength(12);
    expect(Object.keys(ACTION_ICONS)).toHaveLength(43);
  });
  it("balises admises, attributs en chaînes non vides", () => {
    for (const [name, node] of Object.entries(ICONS)) {
      expect(node.length, name).toBeGreaterThan(0);
      for (const [tag, attrs] of node) {
        expect(TAGS, name).toContain(tag);
        for (const v of Object.values(attrs)) expect(typeof v === "string" && v.length > 0, name).toBe(true);
      }
    }
  });
  it("les 35 icônes des maquettes sont recopiées à l'identique de 01-tableau.html", () => {
    // T12 : eraser-part a une base redessinée (netteté à 100 %) ; son corps reste celui de la maquette.
    for (const name of FROM_MOCKUP) expect(ICONS[name], name).toEqual(name === "eraser-part" ? [...symbol(name).slice(0, 2), ["path", { d: "M17 21h4" }]] : symbol(name));
  });
  it("row-remove et col-remove : les rectangles de between-*-start, coordonnées entières", () => {
    expect(ICONS["row-remove"]).toEqual([ICONS["between-horizontal-start"]![0], ["path", { d: "M2 12h4" }], ICONS["between-horizontal-start"]![2]]);
    expect(ICONS["col-remove"]).toEqual([ICONS["between-vertical-start"]![0], ["path", { d: "M10 4h4" }], ICONS["between-vertical-start"]![2]]);
  });
  it("attribution du § 2 bis (échantillon)", () => {
    expect([TOOL_ICONS.rect, ACTION_ICONS["eraser-mode"], ACTION_ICONS["edit-original"], ACTION_ICONS["file-save-as"], ACTION_ICONS["annotation-send-new"], ACTION_ICONS["table-unshade"]]).toEqual(["rect", "eraser-part", "square-arrow-up-right-exit", "save", "plus", "droplet-off"]);
  });
  it("iconFor : item.icon connu prioritaire, puis icône d'état, puis table", () => {
    expect(iconFor(tool("pen", "rect"))).toBe("rect");
    expect(iconFor(tool("pen", "rect"), "pen-line")).toBe("rect");
    expect(iconFor(action("annotation-pointer"), "pen-line")).toBe("pen-line");
    expect(iconFor(action("annotation-pointer"))).toBe("pointer");
    expect(iconFor(tool("pen"))).toBe("pen");
  });
  it("iconFor : clé héritée ou inconnue → table ; rien → null", () => {
    for (const bad of ["inconnue", "__proto__", "toString", "constructor"]) expect(iconFor(tool("pen", bad)), bad).toBe("pen");
    expect(iconFor(action("undo"), "constructor")).toBe("undo");
    expect(iconFor(tool("laser"))).toBeNull();
    expect(iconFor(action("inconnue"))).toBeNull();
    expect(iconFor({ id: "z", kind: "dropzone", label: "Déposer", requires: [], rest: {} })).toBeNull();
  });

  it("personnalisation-1b : wallpaper, search et image-plus recopiés de Lucide (7981a0798a), Fonds → wallpaper", () => {
    expect(ICONS["wallpaper"]).toEqual([["path", { d: "M12 17v4" }], ["path", { d: "M8 21h8" }], ["path", { d: "m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15" }], ["circle", { cx: "8", cy: "9", r: "2" }], ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }]]);
    expect(ICONS["search"]).toEqual([["path", { d: "m21 21-4.34-4.34" }], ["circle", { cx: "11", cy: "11", r: "8" }]]);
    expect(ICONS["image-plus"]).toEqual([["path", { d: "M16 5h6" }], ["path", { d: "M19 2v6" }], ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }], ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }], ["circle", { cx: "9", cy: "9", r: "2" }]]);
    expect(ACTION_ICONS["backgrounds"]).toBe("wallpaper");
  });
  it("design-l2 T12 : « Insérer des pages… » a sa propre icône (Lucide file-plus), distincte d'Importer ; notice à jour ; base de eraser-part en tirets d'au moins 2 unités", () => {
    expect(ACTION_ICONS["page-insert-file"]).toBe("file-plus");
    expect(ACTION_ICONS["page-insert-file"]).not.toBe(ACTION_ICONS["file-import"]);
    expect(NOTICE).toContain("`file-plus`");
    const dashes = ICONS["eraser-part"]!.map(([, a]) => a["d"]!).filter((d) => /^M\d+ 21h(\d+)$/.test(d));
    for (const d of dashes) expect(Number(/h(\d+)$/.exec(d)![1])).toBeGreaterThanOrEqual(2);
  });

  it("personnalisation-1a T6 : icônes neuves présentes, tracés Lucide à l'identique, viewBox -0.25 -0.25 24 24, notice à jour", () => {
    expect(ICON_VIEWBOX).toBe("-0.25 -0.25 24 24");
    for (const [name, node] of Object.entries(LOT1)) {
      expect(ICONS[name], name).toEqual(node);
      expect(NOTICE, name).toContain(`\`${name}\``);
    }
    expect(ACTION_ICONS["page-duplicate"]).toBe("copy");
    expect(ACTION_ICONS["page-number"]).toBe("dock-left");
    expect(ICONS["panel-left"]).toBeUndefined();
  });
  it("personnalisation-1a T14 : layers, bring-to-front, send-to-back à l'identique de Lucide, nommées dans la notice", () => {
    for (const [name, node] of Object.entries(LOT2)) {
      expect(ICONS[name], name).toEqual(node);
      expect(NOTICE, name).toContain(`\`${name}\``);
    }
  });
});

describe("icônes de pression (OG23, T20)", () => {
  it("pressure-variable : un chemin plein effilé (rempli, fermé), pas un anneau vide ; pressure-constant reste un trait", () => {
    const [tag, attrs] = ICONS["pressure-variable"]![0]!;
    expect(tag).toBe("path");
    expect(attrs.fill).toBe("currentColor");
    expect(attrs.d).toMatch(/Z$/i);
    expect(ICONS["pressure-variable"]).toHaveLength(1);
    expect(ICONS["pressure-constant"]![0]![1].fill).toBeUndefined();
  });
});

describe("OG12 : icônes des lignes", () => {
  it("les neuf icônes sont dans ICONS, traits fins sur la grille 24 (aucune coordonnée de cercle hors de la grille)", () => {
    for (const name of OG12_ICONS) {
      expect(Object.hasOwn(ICONS, name), name).toBe(true);
      for (const [tag, attrs] of ICONS[name]!) {
        if (tag === "circle") {
          const cx = Number(attrs["cx"]); const cy = Number(attrs["cy"]); const r = Number(attrs["r"]);
          expect(cx - r >= 0 && cx + r <= 24 && cy - r >= 0 && cy + r <= 24, name).toBe(true);
        }
      }
    }
  });
});
