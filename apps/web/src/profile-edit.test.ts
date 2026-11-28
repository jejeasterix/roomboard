import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  abandonQuestion, addItem, addPreset, canHide, catalog, moveItem, moveItemTo, originOf, presetFields, PRESET_TOOLS, removePreset,
  resetAllPresets, resetToolbars, resetToOrigin, sameProfile, setAnchor, setButtonSize, setCollapsed, setDock, setHidden, setLabel, setPageMode, setStartMode, updatePreset,
} from "./profile-edit";
import { parseProfile, serializeProfile, TABLE_ACTIONS, visibleItems, type Profile, type RuntimeCapabilities } from "./toolbar";
import { BUILTIN_PROFILES, builtinProfile, DEFAULT_PROFILE_JSON } from "./toolbar-profiles";

/** design-l4 (L4-22) : `DEFAULT_PROFILE_JSON` d'avant L4, tel quel (aucune barre `annotation`). */
const BEFORE_L4: Record<string, unknown> = JSON.parse(readFileSync(join(__dirname, "fixtures", "profils", "defaut-avant-l4.rbprofile"), "utf8"));

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
    expect(bar(p, "pages").dock).toBe("floating");
    expect(p.interface).toEqual({ buttonSize: "l", rest: { langue: "fr" } });
    expect(bar(p).rest).toEqual({ couleur: "bleu" });
    expect(p.rest).toEqual({ theme: "sombre" });
  });

  it("nom et démarrage ; behavior.rest gardé", () => {
    const p = setStartMode(setLabel(withUnknownKeys(), "CM1"), "desktop-annotation");
    expect(p.label).toBe("CM1");
    expect(p.behavior).toEqual({ startMode: "desktop-annotation", pageMode: "landscape", rest: { pageDefaut: "seyes" } });
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
    expect(groupsOf(DEFAUT)[0]).toEqual(["select", "hand"]);
    expect(groupsOf(moveItem(DEFAUT, "outils", "hand", -1))[0]).toEqual(["hand", "select"]);
    const down = moveItem(DEFAUT, "outils", "hand", 1);
    expect(groupsOf(down)[0]).toEqual(["select"]);
    expect(groupsOf(down)[1]![0]).toBe("hand");
    const up = moveItem(DEFAUT, "outils", "sep-1", -1);
    expect(groupsOf(up)[0]).toEqual(["select", "hand", "sep-1"]);
    expect(moveItem(DEFAUT, "outils", "select", -1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "outils", "page-next", 1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "outils", "absent", 1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "pages", "eraser", 1)).toEqual(DEFAUT);
  });

  it("OG12 lot 2a (L4, OG19) : le Losange hors de la barre d'outils par défaut, proposé par l'éditeur de profil et ajoutable", () => {
    for (const id of ["defaut", "annotation"]) {
      const p = builtinProfile(id)!;
      const tools = bar(p).groups.flatMap((g) => g.items).flatMap((i) => (i.kind === "tool" && i.tool !== undefined ? [i.tool] : []));
      expect(tools, id).not.toContain("diamond");
      const offered = catalog(p, "outils").filter((e) => e.kind === "tool");
      expect(offered.map((e) => e.ref), id).toEqual(["diamond"]);
      const added = bar(addItem(p, "outils", offered[0]!)).groups.flatMap((g) => g.items).find((i) => i.tool === "diamond");
      expect(added, id).toMatchObject({ kind: "tool", tool: "diamond", label: "Losange" });
    }
  });

  it("catalogue : barre tools = outils et actions absents ; barre pages = actions seules (P15)", () => {
    expect(catalog(DEFAUT, "outils").map((e) => e.ref)).toEqual(["diamond", "undo", "redo", "page-add", "page-remove", "page-insert-file", "page-duplicate", "edit-original", "export-pdf", "export-iwb", "export-ubz", "fit-page", "file-new", "file-open", "file-import", "file-save", "file-save-as", "settings", "help", "page-clear", "profiles", "grid", "library"]);
    const simple = catalog(SIMPLE, "outils");
    expect(simple.filter((e) => e.kind === "tool").map((e) => e.ref)).toEqual(["select", "rect", "diamond", "ellipse", "line", "arrow", "text", "table", "fill"]);
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

  it("ajouter une action à capacité : l'élément porte les requires de l'action (C11a, edit-original)", () => {
    for (const [ref, requires] of [["desktop-annotation", ["desktopAnnotation"]], ["annotation-pointer", ["desktopAnnotation"]], ["annotation-screen", ["desktopAnnotation"]], ["edit-original", ["officeConverter"]]] as const) {
      const p = addItem(SIMPLE, "outils", { kind: "action", ref, label: ref });
      expect(item(p, ref).requires).toEqual(requires);
    }
    const next = addItem(SIMPLE, "outils", { kind: "action", ref: "page-next", label: "x" });
    expect(item(next, "page-next").requires).toEqual([]);
  });

  it("ajouter : en fin de barre ; id de l'outil s'il est libre, sinon <id>-<n> (P15)", () => {
    const rect = catalog(SIMPLE, "outils").find((e) => e.ref === "rect")!;
    const p = addItem(SIMPLE, "outils", rect);
    expect(ids(p).at(-1)).toBe("rect");
    expect(item(p, "rect")).toEqual({ id: "rect", kind: "tool", tool: "rect", label: "Rectangle", requires: [], rest: {} });
    const next = catalog(DEFAUT, "outils").find((e) => e.ref === "undo")!;
    const q = addItem(DEFAUT, "outils", next);
    expect(ids(q).at(-1)).toBe("undo-2");
    expect(item(q, "undo-2").action).toBe("undo");
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

describe("profile-edit : design-l3 (L3-14, L3-17, L3-20, L3-32)", () => {
  /** Profil d'une barre `b` : groupe g1 = [laser (outil inconnu, clé inconnue)], groupe g2 = [pen, profiles]. */
  function twoGroups(): Profile {
    const r = parseProfile({
      format: "roomboard-profile", schema: 1, id: "x", label: "X",
      toolbars: [{ id: "b", role: "tools", dock: "top", groups: [
        { id: "g1", items: [{ id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" }] },
        { id: "g2", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] },
      ] }],
    });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    // personnalisation-1a (T2) : sans le groupe de la reprise `withPageNav` (sélecteur seul : deux groupes, comme avant).
    return { ...r.profile, toolbars: r.profile.toolbars.map((b) => ({ ...b, groups: b.groups.slice(0, 2) })) };
  }

  it("design-l3 L3-14 : moveItemTo rang 0 : tête du premier groupe, rien de perdu", () => {
    const p = moveItemTo(DEFAUT, "outils", "text", 0);
    expect(groupsOf(p)[0]).toEqual(["text", "select", "hand"]);
    expect(groupsOf(p)[2]).not.toContain("text");
    expect(ids(p)).toHaveLength(ids(DEFAUT).length);
  });

  it("design-l3 L3-14 : moveItemTo : l'élément rejoint le groupe de celui qui le précède (frontière de groupe)", () => {
    expect(groupsOf(moveItemTo(DEFAUT, "outils", "select", 1))[0]).toEqual(["hand", "select"]);
    const p = moveItemTo(DEFAUT, "outils", "select", 2);
    expect(groupsOf(p)[0]).toEqual(["hand"]);
    expect(groupsOf(p)[1]!.slice(0, 3)).toEqual(["sep-1", "select", "pen"]);
  });

  it("design-l3 L3-14 : moveItemTo hors bornes : rang ramené à [0, n] ; rang non fini, barre ou élément absents : rien ne change", () => {
    expect(ids(moveItemTo(DEFAUT, "outils", "pen", 999)).at(-1)).toBe("pen");
    expect(ids(moveItemTo(DEFAUT, "outils", "text", -5))[0]).toBe("text");
    expect(moveItemTo(DEFAUT, "outils", "pen", Number.NaN)).toEqual(DEFAUT);
    expect(moveItemTo(DEFAUT, "outils", "absent", 0)).toEqual(DEFAUT);
    expect(moveItemTo(DEFAUT, "absente", "pen", 0)).toEqual(DEFAUT);
  });

  it("design-l3 L3-14 : moveItemTo garde un groupe vidé et réécrit un élément inconnu tel quel (P16)", () => {
    const before = twoGroups();
    const p = moveItemTo(before, "b", "laser", 2);
    expect(groupsOf(p, "b")).toEqual([[], ["pen", "profiles", "laser"]]);
    expect(item(p, "laser")).toEqual(item(before, "laser"));
    expect(groupsOf(moveItemTo(p, "b", "laser", 0), "b")).toEqual([["laser"], ["pen", "profiles"]]);
  });

  it("design-l3 L3-17 : barre d'annotation : outils absents et actions qui agissent en annotation, rien d'autre", () => {
    const entries = catalog(DEFAUT, "annotation");
    expect(entries.filter((e) => e.kind === "tool").map((e) => e.ref)).toEqual(["hand", "select", "diamond", "ellipse", "line", "table", "fill"]);
    expect(entries.filter((e) => e.kind === "action").map((e) => e.ref)).toEqual(["redo"]);
  });

  it("design-l3 L3-17 : barre pages : ni outils ni actions propres à l'annotation ; l'entrée « Annotation du bureau » reste", () => {
    const refs = catalog(DEFAUT, "pages").map((e) => e.ref);
    for (const a of ["annotation-pointer", "annotation-screen", "annotation-freeze", "annotation-send", "annotation-send-new"]) expect(refs).not.toContain(a);
    expect(refs).toContain("desktop-annotation");
    expect(catalog(DEFAUT, "pages").every((e) => e.kind === "action")).toBe(true);
  });

  it("design-l3 L3-17 : rôle inconnu : catalogue du tableau, outils compris, sans actions propres à l'annotation", () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { toolbars: { id: string; role: string }[] };
    json.toolbars.push({ id: "minuteur", role: "minuteur", dock: "bottom", groups: [{ id: "m", items: [{ id: "m-undo", kind: "action", action: "undo", label: "Annuler" }] }] } as never);
    const r = parseProfile({ ...json, id: "inconnu", label: "Inconnu" });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    const refs = catalog(r.profile, "minuteur").map((e) => e.ref);
    expect(refs).toContain("rect");
    expect(refs).toContain("redo");
    for (const a of ["annotation-pointer", "annotation-screen", "annotation-freeze", "annotation-send", "annotation-send-new"]) expect(refs).not.toContain(a);
  });

  it("design-l3 L3-17 : profil d'avant L4 : sa barre tools, montrée en annotation, propose encore Écran suivant, Figer, Envoyer, nouvel onglet", () => {
    const GONE = ["annotation-screen", "annotation-freeze", "annotation-send", "annotation-send-new"];
    const json = structuredClone(BEFORE_L4) as { toolbars: { groups: { items: { id: string }[] }[] }[] };
    for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => !GONE.includes(i.id));
    const r = parseProfile({ ...json, id: "ancienne", label: "Ancienne" });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    const refs = catalog(r.profile, "outils").map((e) => e.ref);
    for (const a of GONE) expect(refs).toContain(a);
  });

  it("design-l3 L3-20 : sameProfile compare les profils écrits ; nom, emplacement, masquage et clés inconnues comptent", () => {
    expect(sameProfile(DEFAUT, DEFAUT)).toBe(true);
    expect(sameProfile(DEFAUT, setDock(DEFAUT, "outils", "floating"))).toBe(true);
    expect(sameProfile(DEFAUT, setDock(DEFAUT, "outils", "left"))).toBe(false);
    expect(sameProfile(DEFAUT, setLabel(DEFAUT, "Autre"))).toBe(false);
    expect(sameProfile(DEFAUT, setHidden(setHidden(DEFAUT, "eraser", true), "eraser", false))).toBe(true);
    expect(sameProfile(withUnknownKeys(), withUnknownKeys())).toBe(true);
    expect(sameProfile(DEFAUT, withUnknownKeys())).toBe(false);
  });

  it("design-l3 L3-32 : question d'abandon, texte exact", () => {
    expect(abandonQuestion("Par défaut")).toBe("Abandonner les changements du profil « Par défaut » ?");
  });
});

describe("personnalisation-1a T2 : ancre, repli, mode de page neuve, catalogue de navigation", () => {
  it("setAnchor pose puis retire l'ancre (null) ; setCollapsed ; setPageMode ; le reste ne bouge pas, relu à l'identique", () => {
    const a = setAnchor(withUnknownKeys(), "pages", "side-end");
    expect(bar(a, "pages").anchor).toBe("side-end");
    expect(bar(a).anchor).toBeUndefined();
    expect(bar(a).rest).toEqual({ couleur: "bleu" });
    const back = setAnchor(a, "pages", null);
    expect("anchor" in bar(back, "pages")).toBe(false);
    expect(back).toEqual(withUnknownKeys());
    expect(setAnchor(DEFAUT, "absente", "top-end")).toEqual(DEFAUT);
    expect(bar(setCollapsed(DEFAUT, "pages", false), "pages").collapsed).toBe(false);
    expect(bar(setCollapsed(DEFAUT, "outils", true)).collapsed).toBe(true);
    const m = setPageMode(withUnknownKeys(), "infinite");
    expect(m.behavior).toEqual({ startMode: "board", pageMode: "infinite", rest: { pageDefaut: "seyes" } });
    const round = parseProfile(serializeProfile(setPageMode(setAnchor(DEFAUT, "pages", "side-start"), "portrait")));
    if ("errors" in round) throw new Error(round.errors.join(" ; "));
    expect(round.profile.behavior.pageMode).toBe("portrait");
    expect(bar(round.profile, "pages").anchor).toBe("side-start");
  });

  it("catalogue : barre pages sans précédente, suivante ni numéro ; barre tools sans numéro : page-number proposé", () => {
    const pages = catalog(DEFAUT, "pages").map((e) => e.ref);
    for (const a of ["page-prev", "page-next", "page-number"]) expect(pages, a).not.toContain(a);
    expect(pages).toContain("page-insert-file");
    expect(pages).not.toContain("page-duplicate");
    const noNav = setHidden(DEFAUT, "page-number", true);
    expect(catalog(noNav, "outils").map((e) => e.ref)).not.toContain("page-number");
    const stripped = { ...DEFAUT, toolbars: DEFAUT.toolbars.map((b) => (b.id === "outils" ? { ...b, groups: b.groups.slice(0, -1) } : b)) };
    const refs = catalog(stripped, "outils").map((e) => e.ref);
    expect(refs).toContain("page-number");
    expect(refs).toContain("page-duplicate");
  });
});
