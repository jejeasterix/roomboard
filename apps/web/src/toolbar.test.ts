import { describe, expect, it } from "vitest";
import {
  ACTION_TABLE, CAPABILITY_KEYS, parseProfile, resetItemOptions, resetPresets, resolveStartMode, serializeProfile,
  TOOL_TABLE, toolbar, validateToolbar, visibleItems, type Profile, type RuntimeCapabilities, type ToolDef,
} from "./toolbar";
import profilesSource from "./toolbar-profiles.ts?raw";
import toolbarSource from "./toolbar.ts?raw";

describe("toolbar", () => {
  it("la barre par défaut est valide", () => {
    expect(validateToolbar(toolbar)).toEqual([]);
  });

  it("détecte doublons et libellés vides", () => {
    const bad: ToolDef[] = [
      { id: "pen", label: "A" },
      { id: "pen", label: " " },
    ];
    expect(validateToolbar(bad)).toEqual(["doublon : pen", "libellé vide : pen"]);
  });
});

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const NONE: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };

function base(): Record<string, unknown> {
  return {
    format: "roomboard-profile",
    schema: 1,
    id: "essai",
    label: "Essai",
    toolbars: [
      {
        id: "outils",
        role: "tools",
        dock: "top",
        groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "undo", kind: "action", action: "undo", label: "Annuler" }] }],
      },
    ],
  };
}
const ok = (json: unknown): { profile: Profile; warnings: string[] } => {
  const r = parseProfile(json);
  if ("errors" in r) throw new Error(r.errors.join(" ; "));
  return r;
};
const errs = (json: unknown): string[] => {
  const r = parseProfile(json);
  return "errors" in r ? r.errors : [];
};

describe("profil de barre (T83, usage § 8)", () => {
  it("profil valide : défauts posés (taille m, board, presets vides, collapsed faux)", () => {
    const { profile, warnings } = ok(base());
    expect(warnings).toEqual([]);
    expect(profile.interface.buttonSize).toBe("m");
    expect(profile.behavior.startMode).toBe("board");
    expect(profile.presets).toEqual({});
    expect(profile.toolbars[0]?.collapsed).toBe(false);
    expect(profile.toolbars[0]?.dock).toBe("top");
  });

  it("majeure supérieure refusée", () => {
    expect(errs({ ...base(), schema: 2 }).join(" ")).toContain("mettez RoomBoard à jour");
  });

  it("mineure supérieure : clés conservées à la réécriture, à chaque niveau", () => {
    const json = base();
    json.minor = 3;
    json.futur = { a: 1 };
    const bar = (json.toolbars as Record<string, unknown>[])[0]!;
    bar.couleur = "bleu";
    const group = (bar.groups as Record<string, unknown>[])[0]!;
    group.repli = true;
    const item = (group.items as Record<string, unknown>[])[0]!;
    item.raccourci = "P";
    json.interface = { buttonSize: "l", theme: "sombre" };
    json.behavior = { startMode: "board", pageDefaut: "seyes" };
    json.presets = { pen: [{ id: "n", label: "Noir", color: "#000", width: 4, opacite: 0.5 }] };
    const { profile, warnings } = ok(json);
    expect(warnings.join(" ")).toContain("clés inconnues conservées");
    const again = serializeProfile(profile) as Record<string, any>;
    expect(again.futur).toEqual({ a: 1 });
    expect(again.minor).toBe(3);
    expect(again.toolbars[0].couleur).toBe("bleu");
    expect(again.toolbars[0].groups[0].repli).toBe(true);
    expect(again.toolbars[0].groups[0].items[0].raccourci).toBe("P");
    expect(again.interface.theme).toBe("sombre");
    expect(again.behavior.pageDefaut).toBe("seyes");
    expect(again.presets.pen[0].opacite).toBe(0.5);
    expect(ok(again).profile).toEqual(profile);
  });

  it("outil inconnu gardé, masqué, réécrit tel quel", () => {
    const json = base();
    const items = ((json.toolbars as any[])[0].groups[0].items as unknown[]);
    items.push({ id: "laser", kind: "tool", tool: "laser", label: "Laser" });
    const { profile, warnings } = ok(json);
    expect(warnings).toContain("outil inconnu masqué : laser");
    expect(profile.toolbars[0]!.groups[0]!.items.map((i) => i.id)).toContain("laser");
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["pen", "undo"]);
    expect(JSON.stringify(serializeProfile(profile))).toContain('"tool":"laser"');
  });

  it("action inconnue gardée et masquée", () => {
    const json = base();
    ((json.toolbars as any[])[0].groups[0].items as unknown[]).push({ id: "x", kind: "action", action: "teleporter", label: "X" });
    const { profile, warnings } = ok(json);
    expect(warnings).toContain("action inconnue masquée : teleporter");
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).not.toContain("x");
  });

  it("doublon d'id et libellé vide : erreurs (contrôles de validateToolbar gardés), toutes rassemblées", () => {
    const json = base();
    const items = (json.toolbars as any[])[0].groups[0].items as unknown[];
    items.push({ id: "pen", kind: "tool", tool: "eraser", label: "Gomme" });
    items.push({ id: "redo", kind: "action", action: "redo", label: "  " });
    const e = errs(json);
    expect(e).toContain("doublon : pen");
    expect(e).toContain("libellé vide : redo");
  });

  it("dock, kind et buttonSize invalides : erreurs", () => {
    const json = base();
    (json.toolbars as any[])[0].dock = "haut";
    ((json.toolbars as any[])[0].groups[0].items as any[])[0].kind = "bouton";
    json.interface = { buttonSize: "xl" };
    const e = errs(json).join(" | ");
    expect(e).toContain("dock");
    expect(e).toContain("kind");
    expect(e).toContain("buttonSize");
  });

  it("capacité absente : élément masqué, startMode rabattu sur board", () => {
    const json = base();
    ((json.toolbars as any[])[0].groups[0].items as unknown[]).push({ id: "drop", kind: "dropzone", label: "Déposer", requires: ["dropPaths"] });
    json.behavior = { startMode: "desktop-annotation" };
    const { profile } = ok(json);
    expect(visibleItems(profile.toolbars[0]!, NONE).map((i) => i.id)).toEqual(["pen", "undo"]);
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["pen", "undo", "drop"]);
    expect(resolveStartMode(profile, NONE)).toEqual({ mode: "board", fellBack: true });
    expect(resolveStartMode(profile, ALL)).toEqual({ mode: "board", fellBack: true }); // seul board est honoré au lot 5b
  });

  it("séparateurs : jamais en tête, en fin, ni doublés", () => {
    const json = base();
    (json.toolbars as any[])[0].groups = [
      { id: "a", items: [{ id: "s0", kind: "separator", label: "" }, { id: "pen", kind: "tool", tool: "pen", label: "Stylo" }] },
      { id: "b", items: [{ id: "s1", kind: "separator", label: "" }, { id: "laser", kind: "tool", tool: "laser", label: "L" }, { id: "s2", kind: "separator", label: "" }] },
      { id: "c", items: [{ id: "undo", kind: "action", action: "undo", label: "Annuler" }, { id: "s3", kind: "separator", label: "" }] },
    ];
    expect(visibleItems(ok(json).profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["pen", "s1", "undo"]);
  });

  it("préréglages séparés des options ; deux remises à zéro", () => {
    const json = base();
    ((json.toolbars as any[])[0].groups[0].items as any[])[0].options = { epaisseur: 9 };
    json.presets = { pen: [{ id: "rose", label: "Rose", color: "#f0f", width: 2 }] };
    const p = ok(json).profile;
    const from = ok({ ...base(), presets: { pen: [{ id: "noir", label: "Noir", color: "#000", width: 4 }] } }).profile;
    expect(resetItemOptions(p, "pen").toolbars[0]!.groups[0]!.items[0]!.options).toBeUndefined();
    expect(resetItemOptions(p, "pen").presets).toEqual(p.presets);
    expect(resetPresets(p, "pen", from).presets.pen!.map((x) => x.id)).toEqual(["noir"]);
    expect(resetPresets(p, "pen", from).toolbars).toEqual(p.toolbars);
  });

  it("tables : chaque outil du moteur a son entrée ; actions de l'ancienne barre présentes", () => {
    expect(Object.keys(TOOL_TABLE).sort()).toEqual(["arrow", "ellipse", "eraser", "hand", "line", "pen", "rect", "select", "text"]);
    for (const a of ["eraser-mode", "undo", "redo", "page-prev", "page-next", "page-add", "page-remove", "fit-page", "file-new", "file-open", "file-save", "file-save-as", "settings", "profiles"]) {
      expect(ACTION_TABLE[a], a).toBeDefined();
    }
    expect(CAPABILITY_KEYS).toEqual(["desktopAnnotation", "multiWindow", "dropPaths", "officeConverter"]);
  });

  it("source : ToolId ouvert, aucun switch, ni localStorage ni DOM (usage § 8 points 3 et 7)", () => {
    expect(toolbarSource).toMatch(/export type ToolId = string;/);
    for (const src of [toolbarSource, profilesSource]) {
      expect(src).not.toMatch(/\bswitch\s*\(/);
      expect(src).not.toMatch(/\blocalStorage\b|\bdocument\.[a-z]|\bwindow\.[a-z]/);
    }
  });

  it("aller-retour : parse(serialize(p)) = p", () => {
    const p = ok(base()).profile;
    expect(ok(serializeProfile(p)).profile).toEqual(p);
  });
});
