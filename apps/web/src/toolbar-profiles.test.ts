import { describe, expect, it } from "vitest";
import {
  ANNOTATION_PROFILE_ID,
  ANNOTATION_PROFILE_JSON,
  BUILTIN_PROFILES,
  builtinProfile,
  DEFAULT_PROFILE_JSON,
  SIMPLE_PROFILE_JSON,
} from "./toolbar-profiles";
import { annotationBarOf, ANNOTATION_MAIN_ACTIONS, HISTORY_ROLE, itemsForMode, MENU_ROLE, PANELS_ROLE, ACTION_TABLE, parseProfile, sideActions, visibleItems } from "./toolbar";

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

  it("design-l2 L2-4 : Grille et Réglages dans le groupe vue du menu de defaut et d'annotation ; absente de simple", () => {
    for (const id of ["defaut", "annotation"]) {
      const vue = builtinProfile(id)!.toolbars.find((b) => b.id === "menu")!.groups.find((g) => g.id === "vue")!;
      expect(vue.items.slice(1).map((i) => i.id), id).toEqual(["grid", "settings"]);
    }
    expect(ids("simple")).not.toContain("grid");
  });

  it("C4 : Bibliothèque dans defaut et annotation, absente de simple", () => {
    for (const id of ["defaut", "annotation"]) expect(ids(id), id).toContain("library");
    expect(ids("simple")).not.toContain("library");
  });

  it("toolbars en liste : chacune avec son dock (design-l2 L2-2)", () => {
    const d = builtinProfile("defaut")!;
    expect(d.toolbars.map((b) => [b.id, b.role, b.dock])).toEqual([["outils", "tools", "floating"], ["menu", "menu", "floating"], ["historique", "history", "floating"], ["panneaux", "panels", "floating"], ["pages", "pages", "floating"], ["annotation", "annotation", "top"]]);
    expect(builtinProfile("simple")!.toolbars.map((b) => b.dock)).toEqual(["left", "floating", "left"]);
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

  it("defaut : « Importer » après « Ouvrir » dans le groupe fichier du menu ; simple ne l'a pas (R18)", () => {
    const fichier = builtinProfile("defaut")!.toolbars.find((b) => b.id === "menu")!.groups.find((g) => g.id === "fichier")!;
    const fichierIds = fichier.items.map((i) => i.id);
    expect(fichierIds.indexOf("file-import")).toBe(fichierIds.indexOf("file-open") + 1);
    expect(fichier.items.find((i) => i.id === "file-import")?.label).toBe("Importer");
    expect(ids("simple")).not.toContain("file-import");
  });

  it("un profil enregistré sans « Importer » ne le reçoit pas", () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { id: string; toolbars: { groups: { id: string; items: { id: string }[] }[] }[] };
    json.id = "perso";
    for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => i.id !== "file-import");
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

describe("barre : Exporter en PDF (C12, PF19) et copies au format (C13, D17) — design-l2 L2-4", () => {
  const tail = [
    expect.objectContaining({ id: "export-pdf", kind: "action", action: "export-pdf", label: "Exporter en PDF…" }),
    expect.objectContaining({ id: "export-iwb", kind: "action", action: "export-iwb", label: "Enregistrer une copie au format .iwb…" }),
    expect.objectContaining({ id: "export-ubz", kind: "action", action: "export-ubz", label: "Enregistrer une copie au format .ubz…" }),
  ];
  it("defaut et annotation : dans le groupe export du menu, après « Insérer des pages… » ; nulle part ailleurs", () => {
    for (const id of ["defaut", "annotation"]) {
      const bars = builtinProfile(id)!.toolbars;
      const exp = bars.find((b) => b.id === "menu")!.groups.find((g) => g.id === "export")!.items;
      expect(exp.map((i) => i.id), id).toEqual(["sep-5", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "edit-original"]);
      expect(exp.slice(2, 5), id).toEqual(tail);
      const others = bars.filter((b) => b.id !== "menu").flatMap((b) => b.groups.flatMap((g) => g.items));
      expect(others.some((i) => ["page-insert-file", "export-pdf", "export-iwb", "export-ubz"].includes(i.id)), id).toBe(false);
    }
  });
  it("simple : en fin de la barre des pages, flottante", () => {
    const pages = builtinProfile("simple")!.toolbars.find((b) => b.role === "pages")!;
    expect(pages.dock).toBe("floating");
    expect(pages.groups.flatMap((g) => g.items).slice(-3)).toEqual(tail);
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

describe("barre : Modifier dans l'application d'origine (C16, O19) — design-l2 L2-4", () => {
  it("defaut et annotation : « edit-original » en fin du groupe export du menu, après la copie .ubz, requires officeConverter ; simple : absent", () => {
    for (const id of ["defaut", "annotation"]) {
      const items = builtinProfile(id)!.toolbars.find((b) => b.id === "menu")!.groups.flatMap((g) => g.items);
      const i = items.findIndex((x) => x.id === "edit-original");
      expect(i, id).toBeGreaterThanOrEqual(0);
      expect(items[i], id).toMatchObject({ kind: "action", action: "edit-original", label: "Modifier dans l'application d'origine", requires: ["officeConverter"] });
      expect(items[i - 1]!.id, id).toBe("export-ubz");
    }
    const simple = builtinProfile("simple")!.toolbars.flatMap((b) => b.groups.flatMap((x) => x.items.map((i) => i.id)));
    expect(simple).not.toContain("edit-original");
  });
});

describe("C11a : éléments livrés (P6, P19)", () => {
  const NEW = ["desktop-annotation", "annotation-pointer", "annotation-screen", "depot-annotation"];
  const items = (id: string) => builtinProfile(id)!.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items));
  it("defaut et annotation : entrée, bascule, écran suivant et zone ; simple : sans zone", () => {
    for (const id of ["defaut", "annotation"]) expect(ids(id)).toEqual(expect.arrayContaining(NEW));
    expect(ids("simple")).toEqual(expect.arrayContaining(["desktop-annotation", "annotation-pointer", "annotation-screen"]));
    expect(ids("simple")).not.toContain("depot-annotation");
  });
  it("chaque élément C11a exige desktopAnnotation ; la zone est une dropzone « Déposer ici »", () => {
    for (const id of ["defaut", "simple", "annotation"]) {
      for (const it of items(id).filter((i) => NEW.includes(i.id))) expect(it.requires).toContain("desktopAnnotation");
    }
    const zone = items("defaut").find((i) => i.id === "depot-annotation")!;
    expect(zone).toMatchObject({ kind: "dropzone", label: "Déposer ici" });
  });
  it("web (capacité fausse) : la barre de defaut ne change pas", () => {
    const web = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
    expect(visibleItems(builtinProfile("defaut")!.toolbars[0]!, web).some((it) => NEW.includes(it.id))).toBe(false);
  });
});

describe("C11b : profils livrés (P29)", () => {
  it("defaut, annotation et simple portent figer, envoyer et envoyer dans un nouvel onglet, chacun requires desktopAnnotation", () => {
    for (const id of ["defaut", "annotation", "simple"]) {
      const items = builtinProfile(id)!.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items));
      for (const a of ["annotation-freeze", "annotation-send", "annotation-send-new"]) {
        const it = items.find((x) => x.kind === "action" && x.action === a);
        expect(it, `${id} : ${a}`).toBeDefined();
        expect(it!.requires).toEqual(["desktopAnnotation"]);
      }
    }
  });
});

describe("design-l4 : barres d'annotation livrées (L4-1, L4-5 à L4-7)", () => {
  const flat = (b: { readonly groups: readonly { readonly items: readonly { readonly id: string }[] }[] }): string[] => b.groups.flatMap((g) => g.items.map((i) => i.id));
  const bar = (id: string, barId: string) => builtinProfile(id)!.toolbars.find((b) => b.id === barId)!;
  it("design-l4 T6 : L4-6 : defaut et annotation, barre « annotation » en haut, dernière de toolbars, éléments dans l'ordre", () => {
    for (const id of ["defaut", "annotation"]) {
      const p = builtinProfile(id)!;
      expect(p.toolbars.map((b) => b.id), id).toEqual(["outils", "menu", "historique", "panneaux", "pages", "annotation"]);
      expect([bar(id, "annotation").role, bar(id, "annotation").dock]).toEqual(["annotation", "top"]);
      expect(flat(bar(id, "annotation")), id).toEqual([
        "annotation-pointer", "ann-sep-1", "ann-pen", "ann-eraser", "ann-eraser-mode", "ann-arrow", "ann-rect", "ann-text",
        "ann-sep-2", "ann-undo", "annotation-freeze", "annotation-screen", "ann-sep-3", "depot-annotation", "annotation-send",
        "annotation-send-new", "ann-sep-4", "ann-desktop-annotation",
      ]);
      expect(annotationBarOf(p)?.id, id).toBe("annotation");
    }
  });
  it("design-l4 T6 : L4-7 : simple, barre « annotation » à gauche, sans zone", () => {
    const p = builtinProfile("simple")!;
    expect(p.toolbars.map((b) => [b.id, b.dock])).toEqual([["outils", "left"], ["pages", "floating"], ["annotation", "left"]]);
    expect(flat(bar("simple", "annotation"))).toEqual([
      "annotation-pointer", "ann-sep-1", "ann-pen", "ann-eraser", "ann-sep-2", "ann-undo", "ann-sep-3", "annotation-freeze",
      "annotation-screen", "ann-sep-4", "annotation-send", "annotation-send-new", "ann-sep-5", "ann-desktop-annotation",
    ]);
  });
  it("design-l4 T6 : L4-5, H7 : la barre d'outils garde « Annotation du bureau » seule ; au tableau, ni « Souris » ni « Écran suivant »", () => {
    for (const id of ["defaut", "simple", "annotation"]) {
      const outils = bar(id, "outils");
      expect(flat(outils).filter((x) => x.includes("annotation")), id).toEqual(["desktop-annotation"]);
      const board = itemsForMode(outils, ALL, "board").map((i) => i.id);
      expect(board, id).toContain("desktop-annotation");
      expect(board.filter((x) => ["annotation-pointer", "annotation-screen"].includes(x)), id).toEqual([]);
    }
  });
  it("design-l4 T6 : L4-6 : actions d'annotation et zone exigent desktopAnnotation ; outils et actions ann- de dessin, aucune capacité", () => {
    for (const id of ["defaut", "simple"]) {
      for (const it of bar(id, "annotation").groups.flatMap((g) => g.items)) {
        const needs = it.kind === "dropzone" || (it.kind === "action" && ANNOTATION_MAIN_ACTIONS.has(it.action ?? ""));
        expect(it.requires, `${id} : ${it.id}`).toEqual(needs ? ["desktopAnnotation"] : []);
      }
    }
  });
});

describe("design-l2 : profils fournis en îlots (L2-2 à L2-4)", () => {
  const flat = (id: string, barId: string) => builtinProfile(id)!.toolbars.find((b) => b.id === barId)!.groups.flatMap((g) => g.items.map((i) => i.id));
  it("design-l2 L2-4, personnalisation-1b Q23 : outils de defaut et annotation : Sélection, Main | Stylo, Gomme, Gomme : partielle | formes, Texte, Tableau, Pot | Fonds | Annotation du bureau", () => {
    for (const id of ["defaut", "annotation"]) {
      expect(flat(id, "outils"), id).toEqual(["select", "hand", "sep-1", "pen", "eraser", "eraser-mode", "sep-2", "rect", "ellipse", "line", "arrow", "text", "table", "fill", "sep-fonds", "backgrounds", "sep-3", "desktop-annotation", "page-prev", "page-number", "page-next"]);
      expect(builtinProfile(id)!.toolbars[0]!.groups.map((g) => g.id), id).toEqual(["navigation", "dessin", "edition", "page", "bureau", "pages"]);
      expect(visibleItems(builtinProfile(id)!.toolbars[0]!, ALL)[0]!.id, id).toBe("select");
    }
  });
  it("design-l2 L2-4 : menu, historique, panneaux et pages de defaut", () => {
    expect(flat("defaut", "menu")).toEqual(["file-new", "file-open", "file-import", "file-save", "file-save-as", "sep-5", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "edit-original", "sep-6", "grid", "settings"]);
    expect(flat("defaut", "historique")).toEqual(["undo", "redo", "fit-page"]);
    expect(flat("defaut", "panneaux")).toEqual(["library", "profiles"]);
    expect(flat("defaut", "pages")).toEqual(["page-add", "page-duplicate", "page-remove"]);
  });
  it("design-l2 L2-4, H1 : simple : outils et pages inchangés, pages en îlot", () => {
    expect(flat("simple", "outils")).toEqual(["pen", "eraser", "hand", "sep-1", "undo", "redo", "sep-2", "fit-page", "profiles", "settings", "backgrounds", "desktop-annotation", "page-prev", "page-number", "page-next"]);
    expect(flat("simple", "pages")).toEqual(["page-add", "page-duplicate", "page-remove", "page-insert-file", "export-pdf", "export-iwb", "export-ubz"]);
  });
  it("design-l2 L2-3 : rôles tools, menu, history, panels, pages, annotation ; ids uniques dans le profil", () => {
    const d = builtinProfile("defaut")!;
    expect(d.toolbars.map((b) => b.role)).toEqual(["tools", MENU_ROLE, HISTORY_ROLE, PANELS_ROLE, "pages", "annotation"]);
    const all = d.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)));
    expect(new Set(all).size).toBe(all.length);
  });
  it("design-l2 L2-2 : aucune bande horizontale au tableau dans un profil fourni", () => {
    for (const p of BUILTIN_PROFILES) {
      expect(p.toolbars.filter((b) => b.role !== "annotation" && (b.dock === "top" || b.dock === "bottom")).map((b) => b.id), p.id).toEqual([]);
    }
  });
});

describe("personnalisation-1a T2 : navigation en barre d'outils, barre des pages repliée (décisions 25, 27, 34)", () => {
  it("chaque profil fourni : barre pages repliée avec Dupliquer, sans navigation ; barre tools finie par le groupe pages ; paysage", () => {
    for (const p of BUILTIN_PROFILES) {
      const pages = p.toolbars.find((b) => b.role === "pages")!;
      expect(pages.collapsed, p.id).toBe(true);
      const pageIds = pages.groups.flatMap((g) => g.items.map((i) => i.action));
      expect(pageIds.slice(0, 3), p.id).toEqual(["page-add", "page-duplicate", "page-remove"]);
      expect(sideActions(pages).map((i) => i.action), p.id).toEqual(pageIds);
      const tools = p.toolbars.find((b) => b.role === "tools")!;
      const last = tools.groups.at(-1)!;
      expect([last.id, last.items.map((i) => i.id)], p.id).toEqual(["pages", ["page-prev", "page-number", "page-next"]]);
      expect(last.items.map((i) => i.label), p.id).toEqual(["Page précédente", "Numéro de page", "Page suivante"]);
      expect(p.behavior.pageMode, p.id).toBe("landscape");
    }
    expect(builtinProfile("defaut")!.toolbars[0]!.groups.map((g) => g.id)).toEqual(["navigation", "dessin", "edition", "page", "bureau", "pages"]);
    expect(ACTION_TABLE["page-number"]).toEqual({ label: "Numéro de page" });
    expect(ACTION_TABLE["page-duplicate"]).toEqual({ label: "Dupliquer la page" });
    const keys = Object.keys(ACTION_TABLE);
    expect(keys.slice(keys.indexOf("page-insert-file") + 1, keys.indexOf("page-insert-file") + 3)).toEqual(["page-number", "page-duplicate"]);
  });
  it("les profils fournis écrits portent déjà la navigation : la reprise n'y ajoute rien", () => {
    for (const json of [DEFAULT_PROFILE_JSON, SIMPLE_PROFILE_JSON, ANNOTATION_PROFILE_JSON]) {
      const r = parseProfile(json);
      if ("errors" in r) throw new Error(r.errors.join(" ; "));
      const navCount = r.profile.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items)).filter((i) => i.action === "page-number").length;
      expect(navCount, String(json.id)).toBe(1);
    }
  });
});
