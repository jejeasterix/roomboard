// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileFiles } from "../platform/profile-files";
import { addPreset, setButtonSize, setDock, setHidden, setStartMode } from "../profile-edit";
import { createProfileStore, PROFILES_KEY, type KeyValue } from "../profile-store";
import { visibleItems, type Profile, type RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { createActiveProfile } from "../ui/active-profile";
import { createProfileActions, RESET_ALL_QUESTION } from "./profile-actions";

const NO_CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
const DEFAUT = BUILTIN_PROFILES[0]!;
const SIMPLE = BUILTIN_PROFILES[1]!;
const fixture = (name: string): string => readFileSync(join(__dirname, "..", "fixtures", "profils", name), "utf8");
const outils = (p: Profile) => p.toolbars.find((b) => b.id === "outils")!;
const visible = (p: Profile) => visibleItems(outils(p), NO_CAPS).map((i) => i.id);
let disposers: (() => void)[] = [];
afterEach(() => {
  for (const d of disposers) d();
  disposers = [];
});

function fakeKv(): KeyValue & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

type Picked = { name: string; text: string } | null;
function setup(picks: Picked[] = []) {
  const kv = fakeKv();
  const store = createProfileStore(kv, BUILTIN_PROFILES);
  const active = createRoot((dispose) => {
    disposers.push(dispose);
    return createActiveProfile(store, NO_CAPS);
  });
  const saved: { name: string; text: string }[] = [];
  const files: ProfileFiles = {
    pick: vi.fn(async () => picks.shift() ?? null),
    save: vi.fn(async (name: string, text: string) => {
      saved.push({ name, text });
      return true;
    }),
  };
  const shell = { confirm: vi.fn(async (_m: string) => true), notify: vi.fn(async (_m: string) => undefined) };
  const warn = vi.fn<(m: string) => void>();
  const actions = createProfileActions({ store, active, files, shell, builtins: BUILTIN_PROFILES, warn });
  return { kv, store, active, files, saved, shell, warn, actions, picks };
}
/** Brouillon de S1 : barre d'outils à gauche, grands boutons, sans gomme, cinq préréglages. */
const cm1Draft = (): Profile => addPreset(addPreset(setHidden(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "eraser", true), "pen"), "pen");

describe("gestes de profil (C1)", () => {
  it("S1 : enregistrer comme nouveau « CM1 » : id cm1, basedOn defaut, minor 1, actif ; defaut inchangé", () => {
    const { store, active, actions } = setup();
    const p = actions.saveAsNew(cm1Draft(), "CM1");
    expect([p.id, p.label, p.basedOn, p.minor]).toEqual(["cm1", "CM1", "defaut", 1]);
    expect(active.profile().id).toBe("cm1");
    expect(outils(active.profile()).dock).toBe("left");
    expect(active.profiles().map((x) => x.id)).toContain("cm1");
    expect(store.get("defaut")).toBe(DEFAUT);
  });

  it("S1 : exporter cm1 : cm1.rbprofile, JSON indenté qui se relit", async () => {
    const { actions, saved } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    expect(await actions.exportActive()).toBe(true);
    expect(saved[0]!.name).toBe("cm1.rbprofile");
    const json = JSON.parse(saved[0]!.text) as Record<string, unknown>;
    expect([json.format, json.id, json.basedOn, json.minor]).toEqual(["roomboard-profile", "cm1", "defaut", 1]);
  });

  it("S1 : tout remettre à zéro (confirmé) puis réimporter le fichier : cm1 revient, actif, à gauche, sans gomme", async () => {
    const { store, active, actions, saved, shell, picks, kv } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    await actions.exportActive();
    expect(await actions.resetAll()).toBe(true);
    expect(shell.confirm).toHaveBeenCalledWith(RESET_ALL_QUESTION);
    expect(active.profile().id).toBe("defaut");
    expect(store.get("cm1")).toBeNull();
    expect(kv.map.has(PROFILES_KEY)).toBe(false);
    picks.push(saved[0]!);
    expect(await actions.importFile()).toBe("imported");
    expect(active.profile().id).toBe("cm1");
    expect(outils(active.profile()).dock).toBe("left");
    expect(active.profile().interface.buttonSize).toBe("l");
    expect(visible(active.profile())).not.toContain("eraser");
    expect(active.profile().presets.pen).toHaveLength(5);
  });

  it("S2 : 1.2 importé : actif, avertissements au journal, réexport sans perte", async () => {
    const raw = fixture("1.2-outil-inconnu.rbprofile");
    const { active, actions, saved, warn } = setup([{ name: "1.2-outil-inconnu.rbprofile", text: raw }]);
    expect(await actions.importFile()).toBe("imported");
    expect(active.profile().id).toBe("futur");
    expect(warn).toHaveBeenCalledWith("profil importé 1.2-outil-inconnu.rbprofile : outil inconnu masqué : laser");
    expect(visible(active.profile())).not.toContain("laser");
    await actions.exportActive();
    expect(JSON.parse(saved[0]!.text)).toEqual(JSON.parse(raw));
  });

  it("S2 : 2.0 refusé : message « mettez RoomBoard à jour », profil actif inchangé", async () => {
    const { active, actions, shell, store } = setup([{ name: "2.0-majeure.rbprofile", text: fixture("2.0-majeure.rbprofile") }]);
    expect(await actions.importFile()).toBe("refused");
    const msg = String(shell.notify.mock.calls[0]![0]);
    expect(msg.startsWith("Profil non importé (2.0-majeure.rbprofile) : ")).toBe(true);
    expect(msg).toContain("mettez RoomBoard à jour");
    expect(active.profile().id).toBe("defaut");
    expect(store.get("majeure")).toBeNull();
  });

  it("S2 : id pris, Annuler : rien n'est importé", async () => {
    const { store, active, actions, saved, shell, picks } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    await actions.exportActive();
    active.choose("defaut");
    const before = store.get("cm1");
    shell.confirm.mockResolvedValueOnce(false);
    picks.push({ name: "cm1.rbprofile", text: saved[0]!.text.replace('"CM1"', '"CM1 bis"') });
    expect(await actions.importFile()).toBe("cancelled");
    expect(shell.confirm).toHaveBeenCalledWith("Remplacer le profil « CM1 » ?");
    expect(store.get("cm1")).toBe(before);
    expect(active.profile().id).toBe("defaut");
  });

  it("id pris, Oui : remplacé ; id d'un livré : copie de même id (P5)", async () => {
    const text = JSON.stringify({ format: "roomboard-profile", schema: 1, id: "defaut", label: "Pirate", toolbars: [] });
    const { store, active, actions, shell } = setup([{ name: "pirate.rbprofile", text }]);
    expect(await actions.importFile()).toBe("imported");
    expect(shell.confirm).toHaveBeenCalledWith("Remplacer le profil « Par défaut » ?");
    expect(store.hasOverride("defaut")).toBe(true);
    expect(active.profile().label).toBe("Pirate");
    expect(store.list().filter((p) => p.id === "defaut")).toHaveLength(1);
  });

  it("S3 : Enregistrer sur defaut (taille s) : même nom, copie ; Remettre à zéro ce profil : taille m, copie retirée", () => {
    const { store, active, actions, kv } = setup();
    expect(actions.canResetCurrent()).toBe(false);
    actions.save(setButtonSize(DEFAUT, "s"));
    expect(active.profile().label).toBe("Par défaut");
    expect(active.profile().interface.buttonSize).toBe("s");
    expect(createProfileStore(kv, BUILTIN_PROFILES).get("defaut")!.interface.buttonSize).toBe("s");
    expect(actions.canResetCurrent()).toBe(true);
    actions.resetCurrent();
    expect(store.hasOverride("defaut")).toBe(false);
    expect(active.profile()).toBe(DEFAUT);
    expect(JSON.parse(kv.map.get(PROFILES_KEY)!)).toEqual([]);
  });

  it("S3 : copie de simple remise à zéro : simple revient", () => {
    const { active, actions } = setup();
    active.choose("simple");
    actions.save({ ...SIMPLE, label: "Ma copie" });
    actions.resetCurrent();
    expect(active.profile()).toBe(SIMPLE);
  });

  it("S3 : cm1 remis à zéro : barres, préréglages, démarrage de defaut ; nom CM1, id cm1 gardés", () => {
    const { active, actions } = setup();
    actions.saveAsNew(setStartMode(cm1Draft(), "desktop-annotation"), "CM1");
    expect(actions.canResetCurrent()).toBe(true);
    actions.resetCurrent();
    const p = active.profile();
    expect([p.id, p.label, p.basedOn]).toEqual(["cm1", "CM1", "defaut"]);
    expect(p.toolbars).toEqual(DEFAUT.toolbars);
    expect(p.presets).toEqual(DEFAUT.presets);
    expect(p.behavior).toEqual(DEFAUT.behavior);
    expect(p.interface.buttonSize).toBe("m");
  });

  it("Supprimer : jamais un livré ; cm1 confirmé → retiré, defaut actif ; refusé → rien", async () => {
    const { store, active, actions, shell } = setup();
    expect(actions.canRemove()).toBe(false);
    expect(await actions.remove()).toBe(false);
    actions.saveAsNew(cm1Draft(), "CM1");
    expect(actions.canRemove()).toBe(true);
    shell.confirm.mockResolvedValueOnce(false);
    expect(await actions.remove()).toBe(false);
    expect(store.get("cm1")).not.toBeNull();
    expect(await actions.remove()).toBe(true);
    expect(shell.confirm).toHaveBeenLastCalledWith("Supprimer le profil « CM1 » ?");
    expect(store.get("cm1")).toBeNull();
    expect(active.profile().id).toBe("defaut");
    expect(active.profiles().map((p) => p.id)).not.toContain("cm1");
  });

  it("tout remettre à zéro refusé : rien n'est effacé", async () => {
    const { store, actions, shell } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    shell.confirm.mockResolvedValueOnce(false);
    expect(await actions.resetAll()).toBe(false);
    expect(store.get("cm1")).not.toBeNull();
  });

  it("RF3 : nom qui donnerait un livré ou un slug vide : id unique, jamais un livré ; nom vide refusé", () => {
    const { actions } = setup();
    expect(actions.saveAsNew(DEFAUT, "Simple").id).toBe("simple-2");
    expect(actions.saveAsNew(DEFAUT, "Annotation").id).toBe("annotation-2");
    expect(actions.saveAsNew(DEFAUT, "!!!").id).toBe("profil");
    expect(actions.saveAsNew(DEFAUT, "!!!").id).toBe("profil-2");
    expect(() => actions.saveAsNew(DEFAUT, "   ")).toThrow("nom de profil vide");
  });

  it("P33 : profil importé sans accès Profil : accès ajouté, avertissement au journal", async () => {
    const ferme = {
      format: "roomboard-profile", schema: 1, id: "ferme", label: "Fermé",
      toolbars: [{ id: "outils", role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }] }] }],
    };
    const { active, actions, warn } = setup([{ name: "ferme.rbprofile", text: JSON.stringify(ferme) }]);
    expect(await actions.importFile()).toBe("imported");
    expect(visible(active.profile())).toEqual(["pen", "profiles"]);
    expect(warn).toHaveBeenCalledWith("profil importé ferme.rbprofile : accès au menu Profil ajouté");
  });

  it("Importer annulé (boîte fermée) : rien, aucune question", async () => {
    const { store, actions, shell } = setup();
    expect(await actions.importFile()).toBe("cancelled");
    expect(shell.confirm).not.toHaveBeenCalled();
    expect(shell.notify).not.toHaveBeenCalled();
    expect(store.list()).toEqual(BUILTIN_PROFILES);
  });

  it("fichier illisible : message, rien n'est importé", async () => {
    const { store, actions, shell } = setup([{ name: "x.rbprofile", text: "{pas du json" }]);
    expect(await actions.importFile()).toBe("refused");
    expect(String(shell.notify.mock.calls[0]![0])).toMatch(/^Profil non importé \(x\.rbprofile\) : fichier de profil illisible/);
    expect(store.list()).toEqual(BUILTIN_PROFILES);
  });

  it("export qui lève : message, faux", async () => {
    const { actions, files, shell } = setup();
    vi.mocked(files.save).mockRejectedValueOnce(new Error("disque plein"));
    expect(await actions.exportActive()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Profil non exporté (par-defaut.rbprofile) : disque plein");
  });
});

describe("gestes de profil : échecs (T11)", () => {
  const quota = (kv: ReturnType<typeof fakeKv>): void => {
    kv.setItem = () => {
      throw new Error("QuotaExceededError");
    };
  };
  const ferme = (id: string) =>
    JSON.stringify({ format: "roomboard-profile", schema: 1, id, label: "Fermé", toolbars: [{ id: "outils", role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] }] });

  it("import, lecture qui lève : message, refusé, rien ne change", async () => {
    const { actions, files, shell, store } = setup();
    vi.mocked(files.pick).mockRejectedValueOnce(new Error("accès refusé"));
    expect(await actions.importFile()).toBe("refused");
    expect(shell.notify).toHaveBeenCalledWith("Profil non importé : accès refusé");
    expect(store.list()).toEqual(BUILTIN_PROFILES);
  });

  it("import, écriture refusée (quota) : pas « imported », profil non actif, message", async () => {
    const { actions, kv, shell, store, active } = setup([{ name: "f.rbprofile", text: ferme("ferme") }]);
    quota(kv);
    expect(await actions.importFile()).toBe("refused");
    expect(String(shell.notify.mock.calls[0]![0])).toMatch(/^Profil non importé \(f\.rbprofile\) : .*QuotaExceededError/);
    expect(store.get("ferme")).toBeNull();
    expect(active.profile().id).toBe("defaut");
  });

  it("enregistrer, écriture refusée : faux, message, brouillon non appliqué", () => {
    const { actions, kv, shell, active } = setup();
    quota(kv);
    expect(actions.save(setDock(DEFAUT, "outils", "left"))).toBe(false);
    expect(String(shell.notify.mock.calls[0]![0])).toMatch(/^Profil non enregistré : .*QuotaExceededError/);
    expect(active.profile().toolbars.find((b) => b.id === "outils")!.dock).toBe("top");
    expect(actions.saveAsNew(DEFAUT, "Autre")).toBeNull();
    expect(shell.notify).toHaveBeenCalledTimes(2);
  });

  it("supprimer et remettre à zéro le profil courant, écriture refusée : message, profil gardé", async () => {
    const { actions, kv, shell, store } = setup();
    actions.saveAsNew(DEFAUT, "Perso");
    quota(kv);
    expect(await actions.remove()).toBe(false);
    expect(String(shell.notify.mock.calls[0]![0])).toMatch(/^Profil non supprimé : /);
    expect(store.get("perso")).not.toBeNull();
    actions.resetCurrent();
    expect(String(shell.notify.mock.calls[1]![0])).toMatch(/^Profil non remis à zéro : /);
  });

  it("fichier hostile imbriqué à l'excès : refusé avec un message, le magasin reste utilisable", async () => {
    const deep = `{"format":"roomboard-profile","schema":1,"id":"deep","label":"D","x":${"[".repeat(50000)}${"]".repeat(50000)},"toolbars":[]}`;
    const { actions, shell, store } = setup([{ name: "d.rbprofile", text: deep }]);
    expect(await actions.importFile()).toBe("refused");
    expect(String(shell.notify.mock.calls[0]![0])).toMatch(/^Profil non importé \(d\.rbprofile\) : /);
    expect(store.get("deep")).toBeNull();
    expect(actions.saveAsNew(DEFAUT, "Après")!.id).toBe("apres");
  });

  it("fichier de plus d'un mégaoctet : refusé avec un message clair", async () => {
    const { actions, shell } = setup([{ name: "gros.rbprofile", text: " ".repeat(1_048_577) }]);
    expect(await actions.importFile()).toBe("refused");
    expect(String(shell.notify.mock.calls[0]![0])).toMatch(/^Profil non importé \(gros\.rbprofile\) : fichier trop gros/);
  });
});
