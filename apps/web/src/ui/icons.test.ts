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
const FROM_MOCKUP = ["pen", "eraser", "hand", "select", "rect", "ellipse", "line", "arrow", "text", "table", "fill", "eraser-part", "undo", "redo", "prev", "next", "plus", "trash", "file-import", "pdf", "export", "fit", "file-new", "file-open", "save", "settings", "profile", "grid", "library", "annotate", "pointer", "screen", "freeze", "board", "reset"];
const TAGS = ["path", "rect", "circle", "line", "polyline", "ellipse"];
const tool = (t: string, icon?: string): ToolItem => ({ id: t, kind: "tool", tool: t, label: t, ...(icon !== undefined ? { icon } : {}), requires: [], rest: {} });
const action = (a: string): ToolItem => ({ id: a, kind: "action", action: a, label: a, requires: [], rest: {} });

describe("icons (design-l1, L1-1 à L1-3)", () => {
  it("ICONS : 58 icônes, exactement celles qu'attribuent les tables, les états, la zone de dépôt, le bandeau et le panneau des profils", () => {
    const used = new Set([...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS), "pen-line", "reset", "check", "drop", ...Object.keys(PANEL_ICONS)]);
    expect(Object.keys(ICONS).sort()).toEqual([...used].sort());
    expect(Object.keys(ICONS)).toHaveLength(58);
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
  it("calage : viewBox -0.25 -0.25 24 24", () => {
    expect(ICON_VIEWBOX).toBe("-0.25 -0.25 24 24");
  });
  it("chaque outil et chaque action connus ont une icône de la table (11 + 37)", () => {
    expect(Object.keys(TOOL_ICONS).sort()).toEqual(Object.keys(TOOL_TABLE).sort());
    expect(Object.keys(ACTION_ICONS).sort()).toEqual(Object.keys(ACTION_TABLE).sort());
    for (const name of [...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS)]) expect(Object.hasOwn(ICONS, name), name).toBe(true);
    expect(Object.keys(TOOL_ICONS)).toHaveLength(11);
    expect(Object.keys(ACTION_ICONS)).toHaveLength(37);
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
    for (const name of FROM_MOCKUP) expect(ICONS[name], name).toEqual(symbol(name));
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
});
