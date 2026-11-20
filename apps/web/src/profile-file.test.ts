import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_PROFILE_TEXT, planImport, PROFILE_EXTENSION, PROFILE_MIME, profileFromText, profileToFile, slug } from "./profile-file";
import { uniqueId } from "./toolbar";
import { BUILTIN_PROFILES } from "./toolbar-profiles";

const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", "profils", name), "utf8");
const ok = (text: string) => {
  const r = profileFromText(text);
  if ("errors" in r) throw new Error(r.errors.join(" ; "));
  return r;
};
const errorsOf = (text: string): string[] => {
  const r = profileFromText(text);
  return "errors" in r ? r.errors : [];
};
const DEFAUT = BUILTIN_PROFILES[0]!;
const BUILTIN_IDS = new Set(BUILTIN_PROFILES.map((p) => p.id));

describe("profile-file (C1, DAC1-3)", () => {
  it("constantes : extension .rbprofile, type application/vnd.roomboard.profile+json (P23)", () => {
    expect(PROFILE_EXTENSION).toBe(".rbprofile");
    expect(PROFILE_MIME).toBe("application/vnd.roomboard.profile+json");
  });

  it("profileToFile(defaut) : par-defaut.rbprofile, JSON indenté de 2, relu à l'identique (P23)", () => {
    const f = profileToFile(DEFAUT);
    expect(f.name).toBe("par-defaut.rbprofile");
    expect(f.text.startsWith('{\n  "format": "roomboard-profile"')).toBe(true);
    expect(ok(f.text).profile).toEqual(DEFAUT);
  });

  it("S2 : 1.2 à outil inconnu : lu avec avertissements, réécrit sans rien perdre", () => {
    const raw = fixture("1.2-outil-inconnu.rbprofile");
    const { profile, warnings } = ok(raw);
    expect(warnings).toEqual(
      expect.arrayContaining([
        "profil 1.2 plus récent que 1.1 : clés inconnues conservées",
        "outil inconnu masqué : laser",
        "action inconnue masquée : minuteur",
        "capacité inconnue : projector (élément projeter masqué)",
      ]),
    );
    expect(JSON.parse(profileToFile(profile).text)).toEqual(JSON.parse(raw));
  });

  it("S2 : 2.0 refusé : mettez RoomBoard à jour", () => {
    expect(errorsOf(fixture("2.0-majeure.rbprofile")).join(" ")).toContain("mettez RoomBoard à jour");
  });

  it("fichier illisible : erreur lisible, jamais d'exception (vide, non JSON, tableau, null)", () => {
    for (const text of ["", "{pas du json", "[]", "null"]) {
      expect(() => profileFromText(text), text).not.toThrow();
      expect(errorsOf(text).length, text).toBeGreaterThan(0);
    }
    expect(errorsOf("{pas du json")[0]).toMatch(/^fichier de profil illisible : /);
    expect(errorsOf("[]")).toEqual(["profil : objet JSON attendu"]);
  });

  it("P33 à l'import : profil sans accès Profil, accès ajouté", () => {
    const ferme = {
      format: "roomboard-profile", schema: 1, id: "ferme", label: "Fermé",
      toolbars: [{ id: "outils", role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }] }] }],
    };
    const { profile, warnings } = ok(JSON.stringify(ferme));
    expect(warnings).toContain("accès au menu Profil ajouté");
    expect(profile.toolbars[0]!.groups[0]!.items.map((i) => i.id)).toEqual(["pen", "profiles"]);
  });

  it("slug : accents retirés, [a-z0-9-], vide → profil (P28)", () => {
    expect(slug("Par défaut")).toBe("par-defaut");
    expect(slug("CM1")).toBe("cm1");
    expect(slug("Par défaut (copie)")).toBe("par-defaut-copie");
    expect(slug("  Écran — Été  ")).toBe("ecran-ete");
    expect(slug("!!!")).toBe("profil");
    expect(slug("")).toBe("profil");
  });

  it("uniqueId réexporté : cm1 pris → cm1-2", () => {
    expect(uniqueId("cm1", new Set(["cm1"]))).toBe("cm1-2");
  });

  it("planImport : id libre → add ; id pris (livré ou utilisateur) → confirm avec le libellé existant (P24)", () => {
    const cm1 = { ...DEFAUT, id: "cm1", label: "CM1" };
    const existing = [...BUILTIN_PROFILES, cm1];
    expect(planImport({ ...DEFAUT, id: "neuf" }, existing, BUILTIN_IDS)).toEqual({ kind: "add" });
    expect(planImport({ ...DEFAUT, label: "Pirate" }, existing, BUILTIN_IDS)).toEqual({ kind: "confirm", message: "Remplacer le profil « Par défaut » ?" });
    expect(planImport({ ...cm1, label: "Autre" }, existing, BUILTIN_IDS)).toEqual({ kind: "confirm", message: "Remplacer le profil « CM1 » ?" });
    expect(planImport({ ...DEFAUT, id: "simple" }, [], BUILTIN_IDS)).toEqual({ kind: "confirm", message: "Remplacer le profil « simple » ?" });
  });
});

describe("profile-file : plafond de taille (T11)", () => {
  it("plus d'un mégaoctet de texte : erreur claire, avant toute lecture JSON", () => {
    expect(MAX_PROFILE_TEXT).toBe(1_048_576);
    const r = profileFromText(" ".repeat(MAX_PROFILE_TEXT + 1));
    expect("errors" in r && r.errors[0]).toMatch(/^fichier trop gros/);
  });
  it("exactement le plafond : lu comme un JSON ordinaire", () => {
    const r = profileFromText(" ".repeat(MAX_PROFILE_TEXT));
    expect("errors" in r && r.errors[0]).toMatch(/^fichier de profil illisible/);
  });
});
