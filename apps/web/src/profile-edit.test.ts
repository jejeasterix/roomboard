import { describe, expect, it } from "vitest";
import {
  addItem, addPreset, canHide, catalog, moveItem, originOf, presetFields, PRESET_TOOLS, removePreset, resetAllPresets,
  resetToolbars, resetToOrigin, setButtonSize, setDock, setHidden, setLabel, setStartMode, updatePreset,
} from "./profile-edit";
import { parseProfile, serializeProfile, TABLE_ACTIONS, visibleItems, type Profile, type RuntimeCapabilities } from "./toolbar";
import { BUILTIN_PROFILES, builtinProfile, DEFAULT_PROFILE_JSON } from "./toolbar-profiles";

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const DEFAUT = builtinProfile("defaut")!;
const SIMPLE = builtinProfile("simple")!;
const bar = (p: Profile, id = "outils") => p.toolbars.find((b) => b.id === id)!;
const ids = (p: Profile, id = "outils") => bar(p, id).groups.flatMap((g) => g.items.map((i) => i.id));
const groupsOf = (p: Profile, id = "outils") => bar(p, id).groups.map((g) => g.items.map((i) => i.id));
const item = (p: Profile, itemId: string) => p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items)).find((i) => i.id === itemId)!;
const pens = (p: Profile) => (p.presets.pen ?? []).map((x) => x.id);

/** `defaut` avec des clés inconnues à chaque niveau, et des préréglages de gomme non montrés. */
function withUnknownKeys(): Profile {
  const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
  json.theme = "sombre";
  json.interface.langue = "fr";
  json.behavior.pageDefaut = "seyes";
  json.toolbars[0].couleur = "bleu";
  json.toolbars[0].groups[0].replie = true;
  json.toolbars[0].groups[0].items[0].raccourci = "P";
  json.presets.pen[0].opacite = 0.5;
  json.presets.eraser = [{ id: "fine", label: "Fine", size: 8 }];
  const r = parseProfile(json);
  if ("errors" in r) throw new Error(r.errors.join(" ; "));
  return r.profile;
}

describe("profile-edit (C1, DAC1-1)", () => {
  it("S1 : barre d'outils à gauche, grands boutons ; clés inconnues gardées", () => {
    const p = setButtonSize(setDock(withUnknownKeys(), "outils", "left"), "l");
    expect(bar(p).dock).toBe("left");
    expect(bar(p, "pages").dock).toBe("bottom");
    expect(p.interface).toEqual({ buttonSize: "l", rest: { langue: "fr" } });
    expect(bar(p).rest).toEqual({ couleur: "bleu" });
    expect(p.rest).toEqual({ theme: "sombre" });
  });

  it("nom et démarrage ; behavior.rest gardé", () => {
    const p = setStartMode(setLabel(withUnknownKeys(), "CM1"), "desktop-annotation");
    expect(p.label).toBe("CM1");
    expect(p.behavior).toEqual({ startMode: "desktop-annotation", rest: { pageDefaut: "seyes" } });
  });

  it("masquer la gomme : sautée par visibleItems, gardée (ordre, id) ; montrer retire le champ (P2)", () => {
    const hidden = setHidden(DEFAUT, "eraser", true);
    expect(ids(hidden)).toEqual(ids(DEFAUT));
    expect(item(hidden, "eraser").hidden).toBe(true);
    expect(visibleItems(bar(hidden), ALL).map((i) => i.id)).not.toContain("eraser");
    const shown = setHidden(hidden, "eraser", false);
    expect("hidden" in item(shown, "eraser")).toBe(false);
    expect(shown).toEqual(DEFAUT);
  });

  it("Profil ne se masque pas ; élément inconnu non plus (P33, P16)", () => {
    expect(canHide(item(DEFAUT, "profiles"))).toBe(false);
    expect(setHidden(DEFAUT, "profiles", true)).toEqual(DEFAUT);
    const laser = { id: "laser", kind: "tool", tool: "laser", label: "Laser", requires: [], rest: {} } as const;
    expect(canHide(laser)).toBe(false);
    expect(canHide(item(DEFAUT, "eraser"))).toBe(true);
    expect(canHide(item(DEFAUT, "sep-1"))).toBe(true);
  });

  it("Monter / Descendre dans un groupe ; à la frontière, l'élément entre dans le groupe voisin (P14)", () => {
    expect(groupsOf(DEFAUT)[0]).toEqual(["pen", "eraser", "eraser-mode", "hand"]);
    expect(groupsOf(moveItem(DEFAUT, "outils", "eraser", -1))[0]).toEqual(["eraser", "pen", "eraser-mode", "hand"]);
    const down = moveItem(DEFAUT, "outils", "hand", 1);
    expect(groupsOf(down)[0]).toEqual(["pen", "eraser", "eraser-mode"]);
    expect(groupsOf(down)[1]![0]).toBe("hand");
    const up = moveItem(DEFAUT, "outils", "sep-1", -1);
    expect(groupsOf(up)[0]).toEqual(["pen", "eraser", "eraser-mode", "hand", "sep-1"]);
    expect(moveItem(DEFAUT, "outils", "pen", -1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "outils", "settings", 1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "outils", "absent", 1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "pages", "eraser", 1)).toEqual(DEFAUT);
  });

  it("catalogue : barre tools = outils et actions absents ; barre pages = actions seules (P15)", () => {
    expect(catalog(DEFAUT, "outils").map((e) => e.ref)).toEqual(["page-prev", "page-next", "page-add", "page-remove", "page-insert-file", "edit-original", "export-pdf"]);
    const simple = catalog(SIMPLE, "outils");
    expect(simple.filter((e) => e.kind === "tool").map((e) => e.ref)).toEqual(["select", "rect", "ellipse", "line", "arrow", "text", "table", "fill"]);
    const pages = catalog(DEFAUT, "pages");
    expect(pages.every((e) => e.kind === "action")).toBe(true);
    expect(pages.map((e) => e.ref)).not.toContain("page-next");
    expect(pages.map((e) => e.ref)).toContain("undo");
    expect(catalog(DEFAUT, "absente")).toEqual([]);
  });

  it("actions contextuelles du tableau absentes du catalogue (C10a)", () => {
    for (const bar of ["outils", "pages"]) {
      const refs = catalog(DEFAUT, bar).map((e) => e.ref);
      for (const a of TABLE_ACTIONS) expect(refs).not.toContain(a);
    }
  });

  it("ajouter : en fin de barre ; id de l'outil s'il est libre, sinon <id>-<n> (P15)", () => {
    const rect = catalog(SIMPLE, "outils").find((e) => e.ref === "rect")!;
    const p = addItem(SIMPLE, "outils", rect);
    expect(ids(p).at(-1)).toBe("rect");
    expect(item(p, "rect")).toEqual({ id: "rect", kind: "tool", tool: "rect", label: "Rectangle", requires: [], rest: {} });
    const next = catalog(DEFAUT, "outils").find((e) => e.ref === "page-next")!;
    const q = addItem(DEFAUT, "outils", next);
    expect(ids(q).at(-1)).toBe("page-next-2");
    expect(item(q, "page-next-2").action).toBe("page-next");
    expect("errors" in parseProfile(serializeProfile(q))).toBe(false);
  });

  it("préréglages du stylo : ajouter deux couleurs (fin de liste), modifier, retirer (P17, S1)", () => {
    const five = addPreset(addPreset(DEFAUT, "pen"), "pen");
    expect(pens(five)).toEqual(["noir", "rouge", "bleu", "couleur", "couleur-2"]);
    expect(five.presets.pen![3]).toEqual({ id: "couleur", label: "Couleur 4", color: "#000000", width: 4, rest: {} });
    const edited = updatePreset(five, "pen", "couleur", { label: " Vert ", color: "#16a34a", width: 6 });
    expect(edited.presets.pen![3]).toMatchObject({ label: "Vert", color: "#16a34a", width: 6 });
    expect(updatePreset(edited, "pen", "couleur", { width: 0, label: "  " }).presets.pen![3]).toMatchObject({ label: "Vert", width: 6 });
    expect(updatePreset(edited, "pen", "couleur", { width: Number.NaN }).presets.pen![3]!.width).toBe(6);
    expect(pens(removePreset(edited, "pen", "noir"))).toEqual(["rouge", "bleu", "couleur", "couleur-2"]);
    expect(removePreset(DEFAUT, "text", "x")).toEqual(DEFAUT);
  });

  it("champs modifiables : stylo = couleur et épaisseur ; autres outils : aucun ; clés et outils non montrés gardés", () => {
    expect(PRESET_TOOLS).toEqual(["pen", "fill"]);
    expect(presetFields("pen").map((f) => [f.key, f.input])).toEqual([["color", "color"], ["width", "number"]]);
    expect(presetFields("eraser")).toEqual([]);
    const p = updatePreset(withUnknownKeys(), "pen", "noir", { color: "#111111" });
    expect(p.presets.pen![0]!.rest).toEqual({ opacite: 0.5 });
    expect(p.presets.eraser).toEqual(withUnknownKeys().presets.eraser);
  });

  it("S4 : Rétablir les barres : barres et taille de l'origine, préréglages gardés", () => {
    const cm1 = addPreset(setHidden(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "eraser", true), "pen");
    const r = resetToolbars(cm1, DEFAUT);
    expect(r.toolbars).toEqual(DEFAUT.toolbars);
    expect(r.interface.buttonSize).toBe("m");
    expect(pens(r)).toHaveLength(4);
  });

  it("S4 : Rétablir les préréglages : trois couleurs, barres gardées", () => {
    const cm1 = addPreset(addPreset(setDock(DEFAUT, "outils", "left"), "pen"), "pen");
    const r = resetAllPresets(cm1, DEFAUT);
    expect(pens(r)).toEqual(["noir", "rouge", "bleu"]);
    expect(bar(r).dock).toBe("left");
  });

  it("S3 : resetToOrigin : barres, taille, préréglages, démarrage de l'origine ; id, nom, basedOn gardés", () => {
    const cm1: Profile = {
      ...setStartMode(addPreset(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "pen"), "desktop-annotation"),
      id: "cm1",
      label: "CM1",
      basedOn: "defaut",
    };
    const r = resetToOrigin(cm1, DEFAUT);
    expect(r.toolbars).toEqual(DEFAUT.toolbars);
    expect(r.interface.buttonSize).toBe("m");
    expect(r.presets).toEqual(DEFAUT.presets);
    expect(r.behavior).toEqual(DEFAUT.behavior);
    expect([r.id, r.label, r.basedOn]).toEqual(["cm1", "CM1", "defaut"]);
  });

  it("originOf : livré de même id, puis basedOn, puis defaut (P3)", () => {
    expect(originOf({ ...SIMPLE, label: "Ma copie", basedOn: "defaut" }, BUILTIN_PROFILES).id).toBe("simple");
    expect(originOf({ ...DEFAUT, id: "cm1", basedOn: "simple" }, BUILTIN_PROFILES).id).toBe("simple");
    expect(originOf({ ...DEFAUT, id: "cm1" }, BUILTIN_PROFILES).id).toBe("defaut");
    expect(originOf({ ...DEFAUT, id: "x", basedOn: "disparu" }, BUILTIN_PROFILES).id).toBe("defaut");
  });

  it("barre absente : setDock, moveItem et addItem ne changent rien", () => {
    const entry = catalog(DEFAUT, "outils")[0]!;
    expect(setDock(DEFAUT, "absente", "left")).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "absente", "pen", 1)).toEqual(DEFAUT);
    expect(addItem(DEFAUT, "absente", entry)).toBe(DEFAUT);
  });

  it("opérations pures : un profil livré (figé) passe par toutes sans lever ni changer", () => {
    const before = JSON.stringify(serializeProfile(DEFAUT));
    const entry = catalog(DEFAUT, "outils")[0]!;
    const all = [
      setLabel(DEFAUT, "X"), setStartMode(DEFAUT, "desktop-annotation"), setButtonSize(DEFAUT, "s"), setDock(DEFAUT, "outils", "right"),
      setHidden(DEFAUT, "pen", true), moveItem(DEFAUT, "outils", "hand", 1), addItem(DEFAUT, "outils", entry), addPreset(DEFAUT, "pen"),
      updatePreset(DEFAUT, "pen", "noir", { width: 9 }), removePreset(DEFAUT, "pen", "noir"), resetToolbars(DEFAUT, SIMPLE),
      resetAllPresets(DEFAUT, SIMPLE), resetToOrigin(DEFAUT, SIMPLE),
    ];
    expect(all).toHaveLength(13);
    expect(JSON.stringify(serializeProfile(DEFAUT))).toBe(before);
  });
});

describe("préréglages du pot (C6a, D17)", () => {
  it("champs : couleur seule pour fill ; le stylo garde couleur et épaisseur", () => {
    expect(presetFields("fill").map((f) => [f.key, f.input])).toEqual([["color", "color"]]);
    expect(presetFields("pen").map((f) => f.key)).toEqual(["color", "width"]);
  });
  it("addPreset fill : noir, sans épaisseur ; la couleur s'édite, l'épaisseur est ignorée", () => {
    const p = addPreset(DEFAUT, "fill");
    expect(p.presets.fill).toEqual([{ id: "couleur", label: "Couleur 1", color: "#000000", rest: {} }]);
    expect(Object.hasOwn(p.presets.fill![0]!, "width")).toBe(false);
    const q = updatePreset(p, "fill", "couleur", { color: "#123456" });
    expect(q.presets.fill![0]!.color).toBe("#123456");
    expect(p.presets.pen).toEqual(DEFAUT.presets.pen);
  });
  it("removePreset du dernier préréglage du pot : la clé presets.fill est retirée (PC7) ; le stylo garde sa clé vide", () => {
    const two = addPreset(addPreset(DEFAUT, "fill"), "fill");
    const one = removePreset(two, "fill", "couleur");
    expect(one.presets.fill!.map((x) => x.id)).toEqual(["couleur-2"]);
    const none = removePreset(one, "fill", "couleur-2");
    expect(Object.hasOwn(none.presets, "fill")).toBe(false);
    let pen = DEFAUT;
    for (const x of pens(DEFAUT)) pen = removePreset(pen, "pen", x);
    expect(pen.presets.pen).toEqual([]);
  });
});
