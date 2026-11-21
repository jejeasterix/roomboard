import { describe, expect, it } from "vitest";
import {
  ANNOTATION_PROFILE_ID,
  ANNOTATION_PROFILE_JSON,
  BUILTIN_PROFILES,
  builtinProfile,
  DEFAULT_PROFILE_JSON,
  SIMPLE_PROFILE_JSON,
} from "./toolbar-profiles";
import { parseProfile, visibleItems } from "./toolbar";

const ALL = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const ids = (id: string): string[] =>
  builtinProfile(id)!.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)));

describe("profils livrés (T83, CL5b-9)", () => {
  it("defaut, simple et annotation sont valides, sans avertissement", () => {
    for (const json of [DEFAULT_PROFILE_JSON, SIMPLE_PROFILE_JSON, ANNOTATION_PROFILE_JSON]) {
      const r = parseProfile(json);
      expect("errors" in r ? r.errors : r.warnings).toEqual([]);
    }
    expect(BUILTIN_PROFILES.map((p) => p.id)).toEqual(["defaut", "simple", "annotation"]);
  });

  it("annotation : barres et préréglages de defaut, démarrage desktop-annotation (P9, S5)", () => {
    const a = builtinProfile(ANNOTATION_PROFILE_ID)!;
    const d = builtinProfile("defaut")!;
    expect(a.label).toBe("Annotation au démarrage");
    expect(a.toolbars).toEqual(d.toolbars);
    expect(a.presets).toEqual(d.presets);
    expect(a.interface.buttonSize).toBe("m");
    expect(a.behavior.startMode).toBe("desktop-annotation");
    expect(Object.isFrozen(ANNOTATION_PROFILE_JSON)).toBe(true);
  });

  it("defaut porte chaque bouton de l'ancienne barre (inventaire du plan)", () => {
    for (const id of ["pen", "eraser", "hand", "eraser-mode", "undo", "redo", "select", "rect", "ellipse", "line", "arrow", "text",
      "page-prev", "page-next", "page-add", "page-remove", "page-insert-file", "file-new", "file-open", "file-save", "file-save-as", "fit-page", "settings", "profiles", "grid"]) {
      expect(ids("defaut"), id).toContain(id);
    }
  });

  it("Grille (E7, HE5) : dans le groupe vue de defaut et d'annotation, avant Profil ; absente de simple", () => {
    for (const id of ["defaut", "annotation"]) {
      const vue = builtinProfile(id)!.toolbars[0]!.groups.find((g) => g.id === "vue")!;
      expect(vue.items.slice(1).map((i) => i.id), id).toEqual(["fit-page", "grid", "library", "profiles", "settings"]);
    }
    expect(ids("simple")).not.toContain("grid");
  });

  it("C4 : Bibliothèque dans defaut et annotation, absente de simple", () => {
    for (const id of ["defaut", "annotation"]) expect(ids(id), id).toContain("library");
    expect(ids("simple")).not.toContain("library");
  });

  it("toolbars en liste : la barre des pages est une entrée (role pages), chacune avec son dock", () => {
    const d = builtinProfile("defaut")!;
    expect(d.toolbars.map((b) => [b.id, b.role, b.dock])).toEqual([["outils", "tools", "top"], ["pages", "pages", "bottom"]]);
    expect(builtinProfile("simple")!.toolbars.map((b) => b.dock)).toEqual(["left", "bottom"]);
    expect(builtinProfile("simple")!.interface.buttonSize).toBe("l");
  });

  it("simple n'a ni formes ni texte (changement de profil visible à l'e2e)", () => {
    const visible = visibleItems(builtinProfile("simple")!.toolbars[0]!, ALL).map((i) => i.id);
    expect(visible).toContain("pen");
    expect(visible).not.toContain("rect");
  });

  it("profils figés ; id inconnu : null", () => {
    expect(Object.isFrozen(DEFAULT_PROFILE_JSON)).toBe(true);
    expect(builtinProfile("inconnu")).toBeNull();
  });

  it("defaut : « Importer » après « Ouvrir » dans le groupe fichier ; simple ne l'a pas (R18)", () => {
    const fichier = builtinProfile("defaut")!.toolbars[0]!.groups.find((g) => g.id === "fichier")!;
    const fichierIds = fichier.items.map((i) => i.id);
    expect(fichierIds.indexOf("file-import")).toBe(fichierIds.indexOf("file-open") + 1);
    expect(fichier.items.find((i) => i.id === "file-import")?.label).toBe("Importer");
    expect(ids("simple")).not.toContain("file-import");
  });

  it("un profil enregistré sans « Importer » ne le reçoit pas", () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { id: string; toolbars: { groups: { id: string; items: { id: string }[] }[] }[] };
    json.id = "perso";
    for (const g of json.toolbars[0]!.groups) g.items = g.items.filter((i) => i.id !== "file-import");
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    expect(r.profile.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)))).not.toContain("file-import");
  });
});

describe("outil Tableau dans les profils (C10a, T6)", () => {
  it("defaut et annotation : Tableau juste après Texte ; simple : sans Tableau", () => {
    for (const p of ["defaut", "annotation"]) {
      const edition = builtinProfile(p)!.toolbars[0]!.groups.find((g) => g.id === "edition")!.items.map((i) => i.id);
      expect(edition.indexOf("table"), p).toBe(edition.indexOf("text") + 1);
    }
    expect(ids("simple")).not.toContain("table");
  });
});

describe("barre : Exporter en PDF (C12, PF19)", () => {
  it("barre des pages, en bas : « Exporter en PDF… » en dernier dans defaut, simple et annotation ; rien dans la barre du haut", () => {
    for (const id of ["defaut", "simple", "annotation"]) {
      const bars = builtinProfile(id)!.toolbars;
      const pages = bars.find((b) => b.role === "pages")!;
      expect(pages.dock, id).toBe("bottom");
      expect(pages.groups.flatMap((g) => g.items).at(-1), id).toMatchObject({ id: "export-pdf", kind: "action", action: "export-pdf", label: "Exporter en PDF…" });
      expect(bars.filter((b) => b.role !== "pages").flatMap((b) => b.groups.flatMap((g) => g.items)).some((i) => i.id === "export-pdf"), id).toBe(false);
    }
  });
});

describe("outil Pot dans les profils (C6a)", () => {
  it("defaut et annotation : Pot juste après Tableau, sans préréglage fill ; simple : sans Pot", () => {
    for (const p of ["defaut", "annotation"]) {
      const prof = BUILTIN_PROFILES.find((x) => x.id === p)!;
      const ids = prof.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)));
      expect(ids[ids.indexOf("table") + 1]).toBe("fill");
      expect(prof.presets.fill).toBeUndefined();
    }
    const simple = BUILTIN_PROFILES.find((x) => x.id === "simple")!;
    expect(simple.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)))).not.toContain("fill");
  });
});
