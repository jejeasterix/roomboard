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
      "page-prev", "page-next", "page-add", "page-remove", "file-new", "file-open", "file-save", "file-save-as", "fit-page", "settings", "profiles"]) {
      expect(ids("defaut"), id).toContain(id);
    }
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
});
