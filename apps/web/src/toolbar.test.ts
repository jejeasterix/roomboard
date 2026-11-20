import { describe, expect, it } from "vitest";
import {
  ACTION_TABLE, CAPABILITY_KEYS, isKnownItem, parseProfile, PROFILE_MINOR, RESERVED_BAR_IDS, resetItemOptions, resetPresets,
  resolveStartMode, serializeProfile, FILL_COLORS, FILL_NONE_LABEL, fillChoices, TABLE_ACTIONS, TABLE_FILLS, TOOL_TABLE, uniqueId, visibleItems, withCurrentMinor, type Profile, type RuntimeCapabilities,
} from "./toolbar";
import { layoutFor } from "./ui/layout";
import profilesSource from "./toolbar-profiles.ts?raw";
import toolbarSource from "./toolbar.ts?raw";

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
      { id: "vue", role: "tools", dock: "right", groups: [{ id: "v", items: [{ id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] },
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

  it.each(["stage", "tabs"])("identifiant de barre réservé %s : refusé avec un message clair", (name) => {
    const json = base();
    (json.toolbars as any[])[0].id = name;
    expect(errs(json)).toContain(`toolbars[0].id : « ${name} » est réservé à la grille (${RESERVED_BAR_IDS.join(", ")})`);
  });

  it("RESERVED_BAR_IDS égale les noms de cases fixes de layoutFor", () => {
    const names = new Set(layoutFor([]).areas.replace(/"/g, "").split(/\s+/));
    expect([...RESERVED_BAR_IDS].sort()).toEqual([...names].sort());
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
    expect(resolveStartMode(profile, ALL)).toEqual({ mode: "desktop-annotation", fellBack: false }); // C1 : la capacité décide (P10)
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
    expect(Object.keys(TOOL_TABLE).sort()).toEqual(["arrow", "ellipse", "eraser", "fill", "hand", "line", "pen", "rect", "select", "table", "text"]);
    for (const a of ["eraser-mode", "undo", "redo", "page-prev", "page-next", "page-add", "page-remove", "fit-page", "file-new", "file-open", "file-save", "file-save-as", "settings", "profiles", "grid"]) {
      expect(ACTION_TABLE[a], a).toBeDefined();
    }
    expect(ACTION_TABLE["grid"]?.label).toBe("Grille");
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

describe("C1 : modèle du profil (P2-P4, P10, P33)", () => {
  /** Profil de base sans la barre « vue » : aucun accès au menu Profil. */
  const bare = (): Record<string, any> => {
    const j = base() as Record<string, any>;
    j.toolbars = [j.toolbars[0]];
    return j;
  };

  it("accès profiles ajouté : en fin de la première barre tools, avertissement, relu sans alerte", () => {
    const { profile, warnings } = ok(bare());
    expect(warnings).toContain("accès au menu Profil ajouté");
    const items = profile.toolbars[0]!.groups.flatMap((g) => g.items);
    expect(items.at(-1)).toMatchObject({ id: "profiles", kind: "action", action: "profiles", label: "Profil" });
    expect(visibleItems(profile.toolbars[0]!, NONE).map((i) => i.id)).toEqual(["pen", "undo", "profiles"]);
    expect(ok(serializeProfile(profile)).warnings).toEqual([]);
  });

  it("accès profiles ajouté : id profiles pris par un autre élément → profiles-2", () => {
    const j = bare();
    j.toolbars[0].groups[0].items.push({ id: "profiles", kind: "tool", tool: "pen", label: "Stylo bis" });
    const items = ok(j).profile.toolbars[0]!.groups.flatMap((g) => g.items);
    expect(items.at(-1)).toMatchObject({ id: "profiles-2", action: "profiles" });
  });

  it("profiles caché : montré, avertissement", () => {
    const j = base() as Record<string, any>;
    j.toolbars[1].groups[0].items[0].hidden = true;
    const { profile, warnings } = ok(j);
    expect(warnings).toContain("profiles : l'accès au menu Profil ne se masque pas, élément montré");
    expect(profile.toolbars[1]!.groups[0]!.items[0]!.hidden).toBeUndefined();
    expect(visibleItems(profile.toolbars[1]!, NONE).map((i) => i.id)).toEqual(["profiles"]);
  });

  it("sans barre tools : barre outils ajoutée (role tools, dock top) qui porte profiles", () => {
    const j = base() as Record<string, any>;
    j.toolbars = [
      { id: "pages", role: "pages", dock: "bottom", groups: [{ id: "p", items: [{ id: "page-next", kind: "action", action: "page-next", label: "Page suivante" }] }] },
    ];
    const { profile, warnings } = ok(j);
    expect(warnings).toContain("accès au menu Profil ajouté");
    expect(profile.toolbars.map((b) => [b.id, b.role, b.dock])).toEqual([["pages", "pages", "bottom"], ["outils", "tools", "top"]]);
    expect(profile.toolbars[1]!.groups[0]!.items.map((i) => i.id)).toEqual(["profiles"]);
  });

  it("hidden : masqué gardé (ordre, id, options), sauté par visibleItems, écrit seulement s'il est vrai", () => {
    const j = base() as Record<string, any>;
    j.toolbars[0].groups[0].items[0].hidden = true;
    j.toolbars[0].groups[0].items[0].options = { epaisseur: 9 };
    j.toolbars[0].groups[0].items[1].hidden = false;
    const { profile, warnings } = ok(j);
    expect(warnings).toEqual([]);
    const items = profile.toolbars[0]!.groups[0]!.items;
    expect(items.map((i) => i.id)).toEqual(["pen", "undo"]);
    expect(items[0]).toMatchObject({ id: "pen", hidden: true, options: { epaisseur: 9 } });
    expect(items[1]!.hidden).toBeUndefined();
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["undo"]);
    const out = serializeProfile(profile) as Record<string, any>;
    expect(out.toolbars[0].groups[0].items[0].hidden).toBe(true);
    expect("hidden" in out.toolbars[0].groups[0].items[1]).toBe(false);
    expect(ok(out).profile).toEqual(profile);
  });

  it("hidden non booléen : erreur", () => {
    const j = base() as Record<string, any>;
    j.toolbars[0].groups[0].items[0].hidden = "oui";
    expect(errs(j)).toContain("toolbars[0].groups[0].items[0].hidden : booléen attendu");
  });

  it("basedOn : lu et écrit ; absent : absent ; chaîne vide : erreur", () => {
    const { profile } = ok({ ...base(), basedOn: "simple" });
    expect(profile.basedOn).toBe("simple");
    expect(profile.rest).toEqual({});
    expect((serializeProfile(profile) as Record<string, unknown>).basedOn).toBe("simple");
    expect(ok(base()).profile.basedOn).toBeUndefined();
    expect("basedOn" in serializeProfile(ok(base()).profile)).toBe(false);
    expect(errs({ ...base(), basedOn: " " })).toContain("profil.basedOn : chaîne non vide attendue");
  });

  it("écriture en 1.1 : PROFILE_MINOR vaut 1, withCurrentMinor relève la mineure sans la baisser", () => {
    expect(PROFILE_MINOR).toBe(1);
    const p = ok(base()).profile;
    expect(p.minor).toBe(0);
    // Lu en 1.0 et non touché : réécrit en 1.0 (serializeProfile n'écrit pas PROFILE_MINOR, seuls les gestes d'écriture le font).
    expect("minor" in serializeProfile(p)).toBe(false);
    const stamped = withCurrentMinor(p);
    expect(stamped.minor).toBe(1);
    expect((serializeProfile(stamped) as Record<string, unknown>).minor).toBe(1);
    expect(ok(serializeProfile(stamped)).warnings).toEqual([]);
    const newer = ok({ ...base(), minor: 2 }).profile;
    expect(withCurrentMinor(newer)).toBe(newer);
  });

  it("mineure 2 : avertissement « plus récent que 1.1 »", () => {
    expect(ok({ ...base(), minor: 2 }).warnings).toContain("profil 1.2 plus récent que 1.1 : clés inconnues conservées");
  });

  it("resolveStartMode : desktop-annotation avec la capacité, board sans (repli sans bruit)", () => {
    const ann = ok({ ...base(), behavior: { startMode: "desktop-annotation" } }).profile;
    expect(resolveStartMode(ann, ALL)).toEqual({ mode: "desktop-annotation", fellBack: false });
    expect(resolveStartMode(ann, NONE)).toEqual({ mode: "board", fellBack: true });
    expect(resolveStartMode(ok(base()).profile, ALL)).toEqual({ mode: "board", fellBack: false });
  });

  it("uniqueId : base libre, sinon premier <base>-<n> libre, n ≥ 2", () => {
    expect(uniqueId("pen", new Set())).toBe("pen");
    expect(uniqueId("pen", new Set(["pen"]))).toBe("pen-2");
    expect(uniqueId("pen", new Set(["pen", "pen-2", "pen-3"]))).toBe("pen-4");
  });

  it("isKnownItem : outil, action ou capacité inconnus → faux ; séparateur → vrai", () => {
    const it0 = { id: "x", label: "X", requires: [], rest: {} } as const;
    expect(isKnownItem({ ...it0, kind: "tool", tool: "pen" })).toBe(true);
    expect(isKnownItem({ ...it0, kind: "tool", tool: "laser" })).toBe(false);
    expect(isKnownItem({ ...it0, kind: "action", action: "minuteur" })).toBe(false);
    expect(isKnownItem({ ...it0, kind: "action", action: "undo", requires: ["projector" as never] })).toBe(false);
    expect(isKnownItem({ ...it0, kind: "dropzone", requires: ["dropPaths"] })).toBe(true);
    expect(isKnownItem({ ...it0, kind: "separator" })).toBe(true);
  });
});

describe("actions du tableau (C10a)", () => {
  it("TOOL_TABLE.table : « Tableau », choix table", () => {
    expect(TOOL_TABLE["table"]).toEqual({ label: "Tableau", choice: "table" });
  });
  it("ACTION_TABLE porte les neuf actions ; TABLE_ACTIONS dans l'ordre de la rangée (T10 de C10a, F15 : actions du tableau (C10b))", () => {
    expect(TABLE_ACTIONS).toEqual(["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform", "table-merge", "table-split", "table-shade", "table-unshade"]);
    expect(TABLE_ACTIONS.map((a) => ACTION_TABLE[a]?.label)).toEqual(["+ Ligne", "+ Colonne", "− Ligne", "− Colonne", "Uniformiser", "Fusionner", "Diviser", "Ombrer", "Désombrer"]);
  });
  it("TABLE_FILLS : aucune puis cinq teintes claires (T12, HC10-5)", () => {
    expect(TABLE_FILLS.map((f) => [f.id, f.label, f.color])).toEqual([
      ["aucun", "Aucun", null],
      ["jaune", "Jaune", "#fef08a"],
      ["vert", "Vert", "#bbf7d0"],
      ["bleu", "Bleu", "#bfdbfe"],
      ["rose", "Rose", "#fecdd3"],
      ["gris", "Gris", "#e5e7eb"],
    ]);
  });
});

describe("couleurs du pot (C6a, D16, D17)", () => {
  it("TOOL_TABLE.fill : « Pot », choix fill ; FILL_COLORS figée : rouge, jaune, vert, bleu, noir ; libellé « Aucune »", () => {
    expect(TOOL_TABLE["fill"]).toEqual({ label: "Pot", choice: "fill" });
    expect(FILL_COLORS.map((c) => [c.id, c.color])).toEqual([
      ["rouge", "#dc2626"], ["jaune", "#facc15"], ["vert", "#16a34a"], ["bleu", "#1d4ed8"], ["noir", "#000000"],
    ]);
    expect(Object.isFrozen(FILL_COLORS)).toBe(true);
    expect(FILL_NONE_LABEL).toBe("Aucune");
  });
  it("fillChoices : sans clé presets.fill, la liste figée", () => {
    expect(fillChoices({})).toEqual(FILL_COLORS);
    expect(fillChoices({ pen: [{ id: "noir", label: "Noir", color: "#000000", width: 4, rest: {} }] })).toEqual(FILL_COLORS);
  });
  it("fillChoices : la clé presets.fill fait foi ; un préréglage sans couleur est sauté (PC7)", () => {
    const table = { fill: [
      { id: "a", label: "Ambre", color: "#f59e0b", rest: {} },
      { id: "b", label: "Sans", rest: {} },
    ] };
    expect(fillChoices(table)).toEqual([{ id: "a", label: "Ambre", color: "#f59e0b" }]);
  });
  it("fillChoices : clé présente mais vide = aucune couleur (le retrait de la clé est fait par l'éditeur)", () => {
    expect(fillChoices({ fill: [] })).toEqual([]);
  });
});
