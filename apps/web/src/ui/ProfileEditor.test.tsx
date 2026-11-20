// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addPreset, setButtonSize, setDock, setHidden } from "../profile-edit";
import { parseProfile, visibleItems, type Profile, type RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES, DEFAULT_PROFILE_JSON } from "../toolbar-profiles";
import { ProfileEditor } from "./ProfileEditor";

afterEach(cleanup);

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const DEFAUT = BUILTIN_PROFILES[0]!;
const DOCK = '[data-edit-bar="outils"] select[data-edit="dock"]';
const shown = (id: string): string => `[data-edit-item="${id}"] input[data-edit="shown"]`;

function setup(profile: Profile = DEFAUT, origin: Profile = DEFAUT) {
  const save = vi.fn<(p: Profile) => void>();
  const saveAsNew = vi.fn<(p: Profile, label: string) => void>();
  const close = vi.fn<() => void>();
  const r = render(() => <ProfileEditor profile={profile} origin={origin} save={save} saveAsNew={saveAsNew} close={close} />);
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  return { ...r, save, saveAsNew, close, q };
}
const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string): void => {
  el.value = value;
  fireEvent.change(el);
};
const setChecked = (el: HTMLInputElement, checked: boolean): void => {
  el.checked = checked;
  fireEvent.change(el);
};
const typeIn = (el: HTMLInputElement, value: string): void => {
  el.value = value;
  fireEvent.input(el);
};
const last = (fn: { mock: { calls: unknown[][] } }): Profile => fn.mock.calls.at(-1)![0] as Profile;
const outils = (p: Profile) => p.toolbars.find((b) => b.id === "outils")!;
const itemOf = (p: Profile, id: string) => p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items)).find((i) => i.id === id)!;

describe("ProfileEditor (C1, P20)", () => {
  it("trois sections : Général, Barres (une par barre), Préréglages du stylo", () => {
    const { container } = setup();
    expect([...container.querySelectorAll("[data-edit-section]")].map((s) => s.getAttribute("data-edit-section"))).toEqual(["general", "bars", "presets"]);
    expect([...container.querySelectorAll("[data-edit-bar]")].map((b) => b.getAttribute("data-edit-bar"))).toEqual(["outils", "pages"]);
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(3);
    expect(container.querySelector("[data-profile-editor]")!.getAttribute("role")).toBe("dialog");
  });

  it("S1 : brouillon, rien n'est rendu avant Enregistrer ; Enregistrer rend barre à gauche et grands boutons", () => {
    const { q, save } = setup();
    setValue(q<HTMLSelectElement>(DOCK), "left");
    setValue(q<HTMLSelectElement>('select[data-edit="button-size"]'), "l");
    expect(save).not.toHaveBeenCalled();
    expect(q<HTMLSelectElement>(DOCK).value).toBe("left");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).dock).toBe("left");
    expect(p.interface.buttonSize).toBe("l");
    expect(p.id).toBe("defaut");
  });

  it("S1 : masquer la gomme ; la case de Profil est grisée (P2, P33)", () => {
    const { q, save } = setup();
    expect(q<HTMLInputElement>(shown("profiles")).disabled).toBe(true);
    expect(q<HTMLInputElement>(shown("eraser")).disabled).toBe(false);
    setChecked(q<HTMLInputElement>(shown("eraser")), false);
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(itemOf(p, "eraser").hidden).toBe(true);
    expect(visibleItems(outils(p), ALL).map((i) => i.id)).not.toContain("eraser");
    expect(q('[data-edit-item="eraser"]')).toBeTruthy();
  });

  it("Monter / Descendre : à la frontière, l'élément entre dans le groupe voisin (P14)", () => {
    const { q, save } = setup();
    expect(q<HTMLButtonElement>('[data-edit-item="pen"] button[data-edit="up"]').disabled).toBe(true);
    expect(q<HTMLButtonElement>('[data-edit-item="settings"] button[data-edit="down"]').disabled).toBe(true);
    fireEvent.click(q('[data-edit-item="hand"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const groups = outils(last(save)).groups.map((g) => g.items.map((i) => i.id));
    expect(groups[0]).toEqual(["pen", "eraser", "eraser-mode"]);
    expect(groups[1]![0]).toBe("hand");
  });

  it("Monter au clavier deux fois : le focus reste sur le bouton de la ligne déplacée (P14)", async () => {
    const { q, save } = setup();
    const up = (): HTMLButtonElement => q<HTMLButtonElement>('[data-edit-item="hand"] button[data-edit="up"]');
    const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
    up().focus();
    fireEvent.click(document.activeElement!); // Entrée ou Espace sur un bouton = clic
    await tick();
    expect(document.activeElement).toBe(up());
    fireEvent.click(document.activeElement!);
    await tick();
    expect(document.activeElement).toBe(up());
    expect((document.activeElement as HTMLElement).closest("[data-edit-item]")!.getAttribute("data-edit-item")).toBe("hand");
    fireEvent.click(q('button[data-edit="save"]'));
    expect(outils(last(save)).groups[0]!.items.map((i) => i.id)).toEqual(["pen", "hand", "eraser", "eraser-mode"]);
  });

  it("Monter jusqu'en tête : le bouton grisé rend le focus à l'autre bouton de la ligne", async () => {
    const { q } = setup();
    q<HTMLButtonElement>('[data-edit-item="eraser"] button[data-edit="up"]').focus();
    fireEvent.click(document.activeElement!);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(q('[data-edit-item="eraser"] button[data-edit="down"]'));
  });

  it("Ajouter un élément absent : en fin de barre, id rendu unique (P15)", () => {
    const { q, save } = setup();
    const add = q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]');
    expect(add.disabled).toBe(true);
    setValue(q<HTMLSelectElement>('[data-edit-bar="outils"] select[data-edit="add-choice"]'), "action:page-next");
    fireEvent.click(q('[data-edit-bar="outils"] button[data-edit="add"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    expect(outils(last(save)).groups.flatMap((g) => g.items.map((i) => i.id)).at(-1)).toBe("page-next-2");
  });

  it("S1 : stylo, ajouter deux couleurs, couleur et épaisseur, retirer (P17)", () => {
    const { q, container, save } = setup();
    fireEvent.click(q('button[data-edit="preset-add"]'));
    fireEvent.click(q('button[data-edit="preset-add"]'));
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(5);
    setValue(q<HTMLInputElement>('[data-edit-preset="couleur"] input[data-edit="preset-color"]'), "#16a34a");
    setValue(q<HTMLInputElement>('[data-edit-preset="couleur"] input[data-edit="preset-width"]'), "6");
    fireEvent.click(q('[data-edit-preset="noir"] button[data-edit="preset-remove"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const pen = last(save).presets.pen!;
    expect(pen.map((x) => x.id)).toEqual(["rouge", "bleu", "couleur", "couleur-2"]);
    expect(pen[2]).toMatchObject({ color: "#16a34a", width: 6 });
  });

  it("S4 : Rétablir les préréglages : trois couleurs ; Rétablir les barres : barre en haut, taille m, gomme revenue", () => {
    const cm1: Profile = {
      ...addPreset(addPreset(setHidden(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "eraser", true), "pen"), "pen"),
      id: "cm1",
      label: "CM1",
      basedOn: "defaut",
    };
    const { q, container, save } = setup(cm1, DEFAUT);
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(5);
    fireEvent.click(q('button[data-edit="reset-presets"]'));
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(3);
    fireEvent.click(q('button[data-edit="reset-bars"]'));
    expect(q<HTMLSelectElement>(DOCK).value).toBe("top");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).dock).toBe("top");
    expect(p.interface.buttonSize).toBe("m");
    expect(itemOf(p, "eraser").hidden).toBeUndefined();
    expect([p.id, p.label]).toEqual(["cm1", "CM1"]);
  });

  it("Enregistrer comme nouveau : nom proposé « Par défaut (copie) », remplacé par « CM1 » ; nom vide : grisé (P28)", () => {
    const { q, saveAsNew, save } = setup();
    const name = q<HTMLInputElement>('input[data-edit="new-name"]');
    expect(name.value).toBe("Par défaut (copie)");
    typeIn(name, "   ");
    expect(q<HTMLButtonElement>('button[data-edit="save-new"]').disabled).toBe(true);
    typeIn(name, " CM1 ");
    setValue(q<HTMLSelectElement>(DOCK), "left");
    fireEvent.click(q('button[data-edit="save-new"]'));
    expect(saveAsNew).toHaveBeenCalledTimes(1);
    expect(saveAsNew.mock.calls[0]![1]).toBe("CM1");
    expect(outils(saveAsNew.mock.calls[0]![0]).dock).toBe("left");
    expect(save).not.toHaveBeenCalled();
  });

  it("nom du profil vide : Enregistrer grisé", () => {
    const { q } = setup();
    typeIn(q<HTMLInputElement>('input[data-edit="label"]'), " ");
    expect(q<HTMLButtonElement>('button[data-edit="save"]').disabled).toBe(true);
  });

  it("démarrage : Annotation du bureau enregistré dans behavior (P10)", () => {
    const { q, save } = setup();
    setValue(q<HTMLSelectElement>('select[data-edit="start-mode"]'), "desktop-annotation");
    fireEvent.click(q('button[data-edit="save"]'));
    expect(last(save).behavior.startMode).toBe("desktop-annotation");
  });

  it("élément inconnu : ligne grisée « inconnu (version plus récente) », case désactivée, déplaçable, réécrit tel quel (P16, S2)", () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
    json.toolbars[0].groups[0].items.splice(1, 0, { id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" });
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { q, save } = setup(r.profile);
    const row = q('[data-edit-item="laser"]');
    expect(row.hasAttribute("data-unknown")).toBe(true);
    expect(row.textContent).toContain("inconnu (version plus récente)");
    expect(q<HTMLInputElement>(shown("laser")).disabled).toBe(true);
    fireEvent.click(q('[data-edit-item="laser"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).groups[0]!.items.map((i) => i.id)).toEqual(["pen", "eraser", "laser", "eraser-mode", "hand"]);
    expect(itemOf(p, "laser")).toEqual(itemOf(r.profile, "laser"));
  });

  it("Fermer : close appelé, rien n'est enregistré (P20)", () => {
    const { q, save, saveAsNew, close } = setup();
    setValue(q<HTMLSelectElement>(DOCK), "left");
    fireEvent.click(q('button[data-edit="close"]'));
    expect(close).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(saveAsNew).not.toHaveBeenCalled();
  });
});

describe("ProfileEditor : sélecteur Ajouter et focus des préréglages (T11)", () => {
  const ADD = '[data-edit-bar="outils"] select[data-edit="add-choice"]';
  it("après une autre édition, le sélecteur Ajouter garde son choix affiché et cohérent avec le bouton", () => {
    const { q } = setup();
    setValue(q<HTMLSelectElement>(ADD), "action:page-next");
    expect(q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]').disabled).toBe(false);
    setValue(q<HTMLSelectElement>('select[data-edit="button-size"]'), "l");
    expect(q<HTMLSelectElement>(ADD).value).toBe("action:page-next");
    expect(q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]').disabled).toBe(false);
  });

  it("modifier un préréglage garde le focus sur son champ", () => {
    const { q } = setup();
    const color = q<HTMLInputElement>('[data-edit-preset="rouge"] input[data-edit="preset-color"]');
    color.focus();
    setValue(color, "#16a34a");
    expect(document.activeElement).toBe(color);
    expect(q<HTMLInputElement>('[data-edit-preset="rouge"] input[data-edit="preset-color"]')).toBe(color);
    const label = q<HTMLInputElement>('[data-edit-preset="bleu"] input[data-edit="preset-label"]');
    label.focus();
    setValue(label, "Azur");
    expect(document.activeElement).toBe(label);
    expect(label.value).toBe("Azur");
  });
});
