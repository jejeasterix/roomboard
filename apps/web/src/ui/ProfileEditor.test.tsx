// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addPreset, setButtonSize, setDock, setHidden } from "../profile-edit";
import { parseProfile, visibleItems, type Profile, type RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES, DEFAULT_PROFILE_JSON } from "../toolbar-profiles";
import { POINTER_SEGMENTS, POINTER_SUMMARY } from "./PointerSwitch";
import { BUTTON_PX, ProfileEditor } from "./ProfileEditor";

afterEach(cleanup);

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const DEFAUT = BUILTIN_PROFILES[0]!;
const QUESTION = "Abandonner les changements du profil « Par défaut » ?";
/** design-l3 (L3-10, L3-8, L3-11) : vignette d'emplacement, segment de taille, œil et poignée d'une ligne. */
const tile = (d: string, bar = "outils"): string => `[data-edit-bar="${bar}"] [data-edit="dock"] [data-choice="${d}"]`;
const seg = (s: string): string => `[data-edit="button-size"] [data-choice="${s}"]`;
const shown = (id: string): string => `[data-edit-item="${id}"] button[data-edit="shown"]`;
const grip = (id: string): string => `[data-edit-item="${id}"] button[data-edit="grip"]`;
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

interface Opts { canRemove?: boolean; canResetCurrent?: boolean; focusProfile?: boolean }
function setup(profile: Profile = DEFAUT, origin: Profile = DEFAUT, opts: Opts = {}) {
  const save = vi.fn<(p: Profile) => void>();
  const saveAsNew = vi.fn<(p: Profile, label: string) => void>();
  const close = vi.fn<() => void>();
  const preview = vi.fn<(p: Profile) => void>();
  const endPreview = vi.fn<() => void>();
  const choose = vi.fn<(id: string) => void>();
  const importFile = vi.fn<() => void>();
  const exportProfile = vi.fn<(p: Profile) => void>();
  const resetCurrent = vi.fn<() => void>();
  const confirm = vi.fn<(m: string) => Promise<boolean>>(async () => true);
  const r = render(() => (
    <ProfileEditor
      profile={profile}
      origin={origin}
      profiles={() => BUILTIN_PROFILES}
      canRemove={() => opts.canRemove ?? false}
      canResetCurrent={() => opts.canResetCurrent ?? false}
      focusProfile={opts.focusProfile ?? false}
      save={save}
      saveAsNew={saveAsNew}
      close={close}
      preview={preview}
      endPreview={endPreview}
      choose={choose}
      importFile={importFile}
      exportProfile={exportProfile}
      resetCurrent={resetCurrent}
      confirm={confirm}
    />
  ));
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  return { ...r, save, saveAsNew, close, preview, endPreview, choose, importFile, exportProfile, resetCurrent, confirm, q };
}
const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string): void => {
  el.value = value;
  fireEvent.change(el);
};
const typeIn = (el: HTMLInputElement, value: string): void => {
  el.value = value;
  fireEvent.input(el);
};
const last = (fn: { mock: { calls: unknown[][] } }): Profile => fn.mock.calls.at(-1)![0] as Profile;
const outils = (p: Profile) => p.toolbars.find((b) => b.id === "outils")!;
const itemOf = (p: Profile, id: string) => p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items)).find((i) => i.id === id)!;
const rowIds = (c: HTMLElement, bar = "outils"): string[] => [...c.querySelectorAll(`[data-edit-bar="${bar}"] li[data-edit-item]`)].map((l) => l.getAttribute("data-edit-item")!);
const revealedRows = (c: HTMLElement): string[] => [...c.querySelectorAll('button[data-edit="up"]')].map((b) => b.closest("[data-edit-item]")!.getAttribute("data-edit-item")!);
/** Mise en page posée à la main (happy-dom n'en calcule aucune) : lignes de 48 px depuis y = 100, corps de 0 à 4000 ;
 *  capture du pointeur neutralisée (un pointeur synthétique n'est pas actif). */
function layoutRows(): () => void {
  const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const ul = this.parentElement;
    if (this.tagName === "LI" && ul !== null && ul.classList.contains("rb-items")) return new DOMRect(0, 100 + [...ul.children].indexOf(this) * 48, 500, 48);
    if (this.hasAttribute("data-sheet-body")) return new DOMRect(0, 0, 600, 4000);
    return new DOMRect(0, 0, 0, 0);
  });
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  const kept = [proto["setPointerCapture"], proto["releasePointerCapture"]];
  proto["setPointerCapture"] = () => undefined;
  proto["releasePointerCapture"] = () => undefined;
  return () => {
    spy.mockRestore();
    proto["setPointerCapture"] = kept[0];
    proto["releasePointerCapture"] = kept[1];
  };
}
const pointer = (type: string, y: number): PointerEvent => new PointerEvent(type, { clientX: 10, clientY: y, pointerId: 1, bubbles: true });

describe("ProfileEditor (C1, P20 ; design-l3)", () => {
  it("L3-5 : sections profil, général, barres, préréglages, nouveau ; un bloc de barre à la fois ; dialogue « Profils »", () => {
    const { container } = setup();
    expect([...container.querySelectorAll("[data-edit-section]")].map((s) => s.getAttribute("data-edit-section"))).toEqual(["profile", "general", "size", "bars", "presets", "new"]);
    expect(container.querySelector('[data-edit-section="size"] h3')?.textContent).toBe("Taille des boutons");
    expect(container.querySelector('[data-edit-bar] h4')?.classList.contains("rb-sr")).toBe(true);
    expect([...container.querySelectorAll("[data-edit-bar]")].map((b) => b.getAttribute("data-edit-bar"))).toEqual(["outils"]);
    expect([...container.querySelectorAll('[data-edit="bar"] [data-choice]')].map((b) => [b.getAttribute("data-choice"), b.textContent])).toEqual([["outils", "Barre d'outils"], ["menu", "Menu"], ["historique", "Annuler et vue"], ["panneaux", "Bibliothèque et profil"], ["pages", "Barre des pages"], ["annotation", "Barre d'annotation"]]);
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(3);
    const dialog = container.querySelector("[data-profile-editor]")!;
    expect([dialog.tagName, dialog.getAttribute("role"), dialog.getAttribute("aria-label")]).toEqual(["ASIDE", "dialog", "Profils"]);
    expect(container.querySelector(".rb-sheet-head h2")?.textContent).toBe("Profils");
  });

  it("design-l4 T6 : L4-18 : la barre d'annotation est éditable, titre « Barre d'annotation »", () => {
    const { q } = setup();
    fireEvent.click(q('[data-edit="bar"] [data-choice="annotation"]'));
    expect(q('[data-edit-bar="annotation"] h4').textContent).toBe("Barre d'annotation");
    expect(q(tile("top", "annotation"))).toBeTruthy();
  });

  it("S1 : brouillon, rien n'est enregistré avant Enregistrer ; Enregistrer rend barre à gauche et grands boutons", () => {
    const { q, save } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q(seg("l")));
    expect(save).not.toHaveBeenCalled();
    expect(q(tile("left")).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).dock).toBe("left");
    expect(p.interface.buttonSize).toBe("l");
    expect(p.id).toBe("defaut");
  });

  it("S1 : masquer la gomme (œil) ; l'œil de Profil est grisé (P2, P33) ; ligne masquée data-hidden", () => {
    const { q, save } = setup();
    fireEvent.click(q('[data-edit="bar"] [data-choice="panneaux"]'));
    expect(q<HTMLButtonElement>(shown("profiles")).disabled).toBe(true);
    fireEvent.click(q('[data-edit="bar"] [data-choice="outils"]'));
    expect(q<HTMLButtonElement>(shown("eraser")).disabled).toBe(false);
    expect([q(shown("eraser")).getAttribute("aria-pressed"), q(shown("eraser")).getAttribute("aria-label")]).toEqual(["true", "Masquer Gomme"]);
    fireEvent.click(q(shown("eraser")));
    expect([q(shown("eraser")).getAttribute("aria-pressed"), q(shown("eraser")).getAttribute("aria-label")]).toEqual(["false", "Afficher Gomme"]);
    expect(q('[data-edit-item="eraser"]').hasAttribute("data-hidden")).toBe(true);
    expect(q(`${shown("eraser")} svg`).getAttribute("data-icon")).toBe("hidden");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(itemOf(p, "eraser").hidden).toBe(true);
    expect(visibleItems(outils(p), ALL).map((i) => i.id)).not.toContain("eraser");
    expect(q('[data-edit-item="eraser"]')).toBeTruthy();
  });

  it("Monter / Descendre : dévoilés par la poignée ; à la frontière, l'élément entre dans le groupe voisin (P14)", () => {
    const { q, save } = setup();
    fireEvent.click(q(grip("select")));
    expect(q<HTMLButtonElement>('[data-edit-item="select"] button[data-edit="up"]').disabled).toBe(true);
    fireEvent.click(q(grip("desktop-annotation")));
    expect(q<HTMLButtonElement>('[data-edit-item="desktop-annotation"] button[data-edit="down"]').disabled).toBe(true);
    fireEvent.click(q(grip("hand")));
    fireEvent.click(q('[data-edit-item="hand"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const groups = outils(last(save)).groups.map((g) => g.items.map((i) => i.id));
    expect(groups[0]).toEqual(["select"]);
    expect(groups[1]![0]).toBe("hand");
  });

  it("Monter au clavier deux fois : le focus reste sur le bouton de la ligne déplacée (P14)", async () => {
    const { q, save } = setup();
    fireEvent.click(q(grip("eraser-mode")));
    const up = (): HTMLButtonElement => q<HTMLButtonElement>('[data-edit-item="eraser-mode"] button[data-edit="up"]');
    up().focus();
    fireEvent.click(document.activeElement!); // Entrée ou Espace sur un bouton = clic
    await tick();
    expect(document.activeElement).toBe(up());
    fireEvent.click(document.activeElement!);
    await tick();
    expect(document.activeElement).toBe(up());
    expect((document.activeElement as HTMLElement).closest("[data-edit-item]")!.getAttribute("data-edit-item")).toBe("eraser-mode");
    fireEvent.click(q('button[data-edit="save"]'));
    expect(outils(last(save)).groups[1]!.items.map((i) => i.id)).toEqual(["sep-1", "eraser-mode", "pen", "eraser"]);
  });

  it("Monter jusqu'en tête : le bouton grisé rend le focus à l'autre bouton de la ligne", async () => {
    const { q } = setup();
    fireEvent.click(q(grip("hand")));
    q<HTMLButtonElement>('[data-edit-item="hand"] button[data-edit="up"]').focus();
    fireEvent.click(document.activeElement!);
    await tick();
    expect(document.activeElement).toBe(q('[data-edit-item="hand"] button[data-edit="down"]'));
  });

  it("Ajouter un élément absent (« + Ajouter ») : en fin de barre, id rendu unique (P15)", () => {
    const { q, save, container } = setup();
    fireEvent.click(q('[data-edit-bar="outils"] button[data-edit="add"]'));
    fireEvent.click(q('[data-add-choice="action:page-next"]'));
    expect(container.querySelector("[data-add-choice]")).toBeNull();
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
    expect(q(tile("floating")).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).dock).toBe("floating");
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
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="save-new"]'));
    expect(saveAsNew).toHaveBeenCalledTimes(1);
    expect(saveAsNew.mock.calls[0]![1]).toBe("CM1");
    expect(outils(saveAsNew.mock.calls[0]![0]).dock).toBe("left");
    expect(save).not.toHaveBeenCalled();
  });

  it("nom du profil vide : Enregistrer et Exporter grisés (S3, L3-21)", () => {
    const { q } = setup();
    typeIn(q<HTMLInputElement>('input[data-edit="label"]'), " ");
    expect(q<HTMLButtonElement>('button[data-edit="save"]').disabled).toBe(true);
    expect(q<HTMLButtonElement>('button[data-edit="export"]').disabled).toBe(true);
  });

  it("démarrage : carte « Annotation du bureau » enregistrée dans behavior (P10)", () => {
    const { q, save } = setup();
    fireEvent.click(q('[data-edit="start-mode"] [data-choice="desktop-annotation"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    expect(last(save).behavior.startMode).toBe("desktop-annotation");
  });

  it("élément inconnu : ligne grisée « inconnu (version plus récente) », œil désactivé, déplaçable, réécrit tel quel (P16, S2)", () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
    json.toolbars[0].groups[0].items.splice(1, 0, { id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" });
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { q, save } = setup(r.profile);
    const row = q('[data-edit-item="laser"]');
    expect(row.hasAttribute("data-unknown")).toBe(true);
    expect(row.textContent).toContain("inconnu (version plus récente)");
    expect(q<HTMLButtonElement>(shown("laser")).disabled).toBe(true);
    fireEvent.click(q(grip("laser")));
    fireEvent.click(q('[data-edit-item="laser"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).groups[0]!.items.map((i) => i.id)).toEqual(["select", "hand", "laser"]);
    expect(itemOf(p, "laser")).toEqual(itemOf(r.profile, "laser"));
  });

  it("P16 : élément inconnu déplacé à la flèche de sa poignée, réécrit tel quel", async () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
    json.toolbars[0].groups[0].items.splice(1, 0, { id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" });
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { q, save } = setup(r.profile);
    q<HTMLButtonElement>(grip("laser")).focus();
    fireEvent.keyDown(q(grip("laser")), { key: "ArrowDown" });
    await tick();
    expect(document.activeElement).toBe(q(grip("laser")));
    fireEvent.click(q('button[data-edit="save"]'));
    expect(outils(last(save)).groups[0]!.items.map((i) => i.id)).toEqual(["select", "hand", "laser"]);
    expect(itemOf(last(save), "laser")).toEqual(itemOf(r.profile, "laser"));
  });

  it("Fermer un brouillon modifié : la question est posée (prop confirm), Oui : close ; rien n'est enregistré (P20, L3-32)", async () => {
    const { q, save, saveAsNew, close, confirm } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="close"]'));
    expect(confirm).toHaveBeenCalledWith(QUESTION);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(save).not.toHaveBeenCalled();
    expect(saveAsNew).not.toHaveBeenCalled();
  });
});

describe("ProfileEditor : liste « Ajouter » et focus des préréglages (T11 ; design-l3 L3-16)", () => {
  it("la liste « Ajouter » se referme après un ajout ; le catalogue suit le brouillon (élément ajouté : plus proposé)", () => {
    const { q, container } = setup();
    const add = (): HTMLButtonElement => q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]');
    fireEvent.click(add());
    expect(container.querySelector('[data-add-choice="action:page-next"]')).not.toBeNull();
    fireEvent.click(q('[data-add-choice="action:page-next"]'));
    expect(container.querySelector("[data-add-choice]")).toBeNull();
    fireEvent.click(add());
    expect(container.querySelector('[data-add-choice="action:page-next"]')).toBeNull();
    expect(container.querySelector('[data-add-choice="action:page-prev"]')).not.toBeNull();
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

  it("L3-16 : « + Ajouter » : liste du catalogue, icône et libellé ; Échap la referme, focus rendu au bouton", () => {
    const { q, container } = setup();
    const add = q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]');
    expect([add.textContent, add.getAttribute("aria-expanded")]).toEqual(["Ajouter", "false"]);
    fireEvent.click(add);
    expect(add.getAttribute("aria-expanded")).toBe("true");
    expect(q('[data-add-choice="action:page-next"] svg').getAttribute("data-icon")).toBe("next");
    expect(q('[data-add-choice="action:page-next"]').textContent).toBe("Page suivante");
    fireEvent.keyDown(q('[data-add-choice="action:page-next"]'), { key: "Escape" });
    expect(container.querySelector("[data-add-choice]")).toBeNull();
    expect(document.activeElement).toBe(q('[data-edit-bar="outils"] button[data-edit="add"]'));
  });
});

describe("ProfileEditor : panneau latéral (design-l3)", () => {
  it("L3-3 : chaque geste appelle preview(brouillon) ; le démontage appelle endPreview", () => {
    const { q, preview, endPreview, unmount } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q(seg("l")));
    expect(preview).toHaveBeenCalledTimes(2);
    expect(outils(last(preview)).dock).toBe("left");
    expect(last(preview).interface.buttonSize).toBe("l");
    expect(endPreview).not.toHaveBeenCalled();
    unmount();
    expect(endPreview).toHaveBeenCalledTimes(1);
  });

  it("L3-6 : étiquette Fourni / Fourni, modifié / Personnel ; sélecteur sur le profil actif ; Importer et Exporter nommés", () => {
    expect(setup().q('[data-edit="profile-tag"]').textContent).toBe("Fourni");
    cleanup();
    expect(setup(DEFAUT, DEFAUT, { canResetCurrent: true }).q('[data-edit="profile-tag"]').textContent).toBe("Fourni, modifié");
    cleanup();
    const { q } = setup(DEFAUT, DEFAUT, { canRemove: true, canResetCurrent: true });
    expect(q('[data-edit="profile-tag"]').textContent).toBe("Personnel");
    expect(q<HTMLSelectElement>('select[data-edit="profile"]').value).toBe("defaut");
    expect(q('button[data-edit="import"]').getAttribute("aria-label")).toBe("Importer un profil (.rbprofile)");
    expect(q('button[data-edit="export"]').getAttribute("aria-label")).toBe("Exporter ce profil (.rbprofile)");
    expect(q('button[data-edit="close"]').getAttribute("aria-label")).toBe("Fermer");
  });

  it("L3-4 : brouillon égal : choisir « Simple » appelle choose, sans question", () => {
    const { q, choose, confirm } = setup();
    setValue(q<HTMLSelectElement>('select[data-edit="profile"]'), "simple");
    expect(choose).toHaveBeenCalledWith("simple");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("L3-4, L3-32 : brouillon modifié, autre profil : question ; Non : rien ne change, le sélecteur revient au profil actif", async () => {
    const { q, choose, confirm } = setup();
    confirm.mockResolvedValueOnce(false);
    fireEvent.click(q(tile("left")));
    setValue(q<HTMLSelectElement>('select[data-edit="profile"]'), "simple");
    expect(confirm).toHaveBeenCalledWith(QUESTION);
    await tick();
    expect(choose).not.toHaveBeenCalled();
    expect(q<HTMLSelectElement>('select[data-edit="profile"]').value).toBe("defaut");
  });

  it("L3-4 : focusProfile au montage : le focus va au sélecteur", async () => {
    const { q } = setup(DEFAUT, DEFAUT, { focusProfile: true });
    await tick();
    expect(document.activeElement).toBe(q('select[data-edit="profile"]'));
  });

  it("L3-7 : deux cartes de démarrage ; la carte choisie porte la pastille check ; note de repli toujours visible", () => {
    const { q, container } = setup();
    expect([...container.querySelectorAll('[data-edit="start-mode"] [role="radio"]')].map((c) => c.getAttribute("data-choice"))).toEqual(["board", "desktop-annotation"]);
    expect(q('[data-edit="start-mode"] [data-choice="board"] .rb-radio-chk svg').getAttribute("data-icon")).toBe("check");
    expect(container.querySelector('[data-edit="start-mode"] [data-choice="desktop-annotation"] .rb-radio-chk')).toBeNull();
    expect(q('[data-edit="start-mode"] [data-choice="desktop-annotation"] svg[data-icon="annotate"]')).toBeTruthy();
    expect(q('[data-edit="start-mode"] [data-choice="board"] .rb-radio-detail').textContent).toBe("RoomBoard s'ouvre sur le tableau.");
    expect(q('[data-edit-section="general"] .rb-note').textContent).toBe("Sans annotation possible (web, iPad, Wayland) : tableau.");
  });

  it("L3-8 : tailles « Petits · 44 », « Moyens · 48 », « Grands · 64 » ; BUTTON_PX = --rb-btn-* de rb.css (D3)", () => {
    const { container } = setup();
    expect([...container.querySelectorAll('[data-edit="button-size"] [data-choice]')].map((b) => b.textContent)).toEqual(["Petits · 44", "Moyens · 48", "Grands · 64"]);
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    for (const s of ["s", "m", "l"] as const) expect(css).toContain(`--rb-btn-${s}: ${BUTTON_PX[s]}px;`);
  });

  it("L3-10 : cinq vignettes d'emplacement, icônes dock-* ; la barre d'outils de defaut n'a ni note ni détail d'annotation", () => {
    const { container } = setup();
    expect([...container.querySelectorAll('[data-edit-bar="outils"] [data-edit="dock"] [data-choice]')].map((b) => [b.getAttribute("data-choice"), b.querySelector("svg")?.getAttribute("data-icon"), b.textContent])).toEqual([
      ["top", "dock-top", "En haut"], ["bottom", "dock-bottom", "En bas"], ["left", "dock-left", "À gauche"], ["right", "dock-right", "À droite"], ["floating", "dock-float", "Flottante"],
    ]);
    expect(container.querySelector('[data-edit="annotation-note"]')).toBeNull();
    expect(container.querySelector(`${tile("floating")} .rb-radio-detail`)).toBeNull();
  });

  it("L3-9, L3-12 : barre d'annotation : note fixe, « En annotation : en haut » sous Flottante ; ligne « Dessin / Souris » icône pen-line (D4, D5)", () => {
    const { q } = setup();
    fireEvent.click(q('[data-edit="bar"] [data-choice="annotation"]'));
    expect(q('[data-edit="annotation-note"]').textContent).toBe("Montrée seulement en annotation du bureau : réglage visible à l'entrée suivante.");
    expect(q(`${tile("floating", "annotation")} .rb-radio-detail`).textContent).toBe("En annotation : en haut");
    expect(q('[data-edit-item="annotation-pointer"] .rb-item-label').textContent).toBe("Dessin / Souris");
    expect(q('[data-edit-item="annotation-pointer"] > svg').getAttribute("data-icon")).toBe("pen-line");
    expect(q(shown("annotation-pointer")).getAttribute("aria-label")).toBe("Masquer Dessin / Souris");
    expect(POINTER_SUMMARY).toEqual({ label: POINTER_SEGMENTS.map((s) => s.label).join(" / "), icon: POINTER_SEGMENTS[0]!.icon });
  });

  it("L3-9 : deux barres tools et un rôle inconnu : « Barre <id> » ; un seul bloc ; catalogue du tableau pour la barre inconnue", () => {
    const r = parseProfile({
      format: "roomboard-profile", schema: 1, id: "multi", label: "Multi",
      toolbars: [
        { id: "outils", role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] },
        { id: "outils2", role: "tools", dock: "left", groups: [{ id: "g2", items: [{ id: "rect", kind: "tool", tool: "rect", label: "Rectangle" }] }] },
        { id: "x", role: "minuteur", dock: "bottom", groups: [{ id: "g3", items: [{ id: "undo", kind: "action", action: "undo", label: "Annuler" }] }] },
      ],
    });
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { container, q } = setup(r.profile, r.profile);
    expect([...container.querySelectorAll('[data-edit="bar"] [data-choice]')].map((b) => b.textContent)).toEqual(["Barre outils", "Barre outils2", "Barre x"]);
    fireEvent.click(q('[data-edit="bar"] [data-choice="x"]'));
    expect([...container.querySelectorAll("[data-edit-bar]")].map((b) => b.getAttribute("data-edit-bar"))).toEqual(["x"]);
    expect(q('[data-edit-bar="x"] h4').textContent).toBe("Barre x");
    fireEvent.click(q('[data-edit-bar="x"] button[data-edit="add"]'));
    expect(container.querySelector('[data-add-choice="action:annotation-pointer"]')).toBeNull();
    expect(container.querySelector('[data-add-choice="tool:rect"]')).not.toBeNull();
  });

  it("L3-11 : une ligne par élément, dans l'ordre exact de la barre ; « Séparateur » ; icône de la table ; aucun draggable", () => {
    const { container, q } = setup();
    expect(rowIds(container)).toEqual(DEFAUT.toolbars[0]!.groups.flatMap((g) => g.items.map((i) => i.id)));
    expect(q('[data-edit-item="sep-1"]').hasAttribute("data-separator")).toBe(true);
    expect(q('[data-edit-item="sep-1"] .rb-item-label').textContent).toBe("Séparateur");
    expect(q('[data-edit-item="pen"] > svg').getAttribute("data-icon")).toBe("pen");
    expect(q('[data-edit-item="pen"] .rb-item-label').textContent).toBe("Stylo");
    expect(container.querySelector("[draggable]")).toBeNull();
  });

  it("L3-15 : un toucher de poignée dévoile Monter et Descendre pour cette ligne seulement ; un autre toucher les déplace", () => {
    const { q, container } = setup();
    expect(revealedRows(container)).toEqual([]);
    fireEvent.click(q(grip("pen")));
    expect(revealedRows(container)).toEqual(["pen"]);
    fireEvent.click(q(grip("hand")));
    expect(revealedRows(container)).toEqual(["hand"]);
    expect(q('[data-edit-item="hand"] button[data-edit="up"]').getAttribute("aria-label")).toBe("Monter Main");
  });

  it("D-DS1 : Importer et Exporter portent l'icône et le texte visible", () => {
    const { q } = setup();
    for (const [name, text, icon] of [["import", "Importer", "import"], ["export", "Exporter", "export"]] as const) {
      const b = q<HTMLButtonElement>(`button[data-edit="${name}"]`);
      expect(b.textContent?.trim()).toBe(text);
      expect(b.querySelector(`svg[data-icon="${icon}"]`)).not.toBeNull();
    }
  });

  it("L3-15 (relecture) : annonce identique redite : vidée aussitôt, reposée au tour suivant", async () => {
    const { q, container } = setup();
    const first = rowIds(container)[0]!;
    const g = q<HTMLButtonElement>(grip(first));
    fireEvent.keyDown(g, { key: "ArrowUp" });
    const said = q('[data-edit="announce"]').textContent!;
    expect(said).not.toBe("");
    fireEvent.keyDown(q(grip(first)), { key: "ArrowUp" });
    expect(q('[data-edit="announce"]').textContent).toBe("");
    await tick();
    expect(q('[data-edit="announce"]').textContent).toBe(said);
  });

  it("L3-13 (relecture) : éditeur démonté pendant un tri : le lâcher qui suit n'écrit rien", () => {
    const { q, container, preview, unmount } = setup();
    const restore = layoutRows();
    try {
      const y0 = 100 + rowIds(container).indexOf("text") * 48 + 24;
      const g = q<HTMLButtonElement>(grip("text"));
      g.dispatchEvent(pointer("pointerdown", y0));
      for (let y = y0 - 8; y >= 110; y -= 8) g.dispatchEvent(pointer("pointermove", y));
      unmount();
      g.dispatchEvent(pointer("pointerup", 110));
      expect(preview).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("L3-15 : poignée au clavier : Flèche haut = un cran, focus gardé, annonce « Main : rang 1 sur N », aide liée", async () => {
    const { q, container } = setup();
    q<HTMLButtonElement>(grip("hand")).focus();
    fireEvent.keyDown(q(grip("hand")), { key: "ArrowUp" });
    await tick();
    expect(document.activeElement).toBe(q(grip("hand")));
    expect(q('[data-edit="announce"]').textContent).toBe(`Main : rang 1 sur ${rowIds(container).length}`);
    expect(q('[data-edit="announce"]').getAttribute("aria-live")).toBe("polite");
    expect(q(grip("hand")).getAttribute("aria-label")).toBe("Déplacer Main");
    expect(document.getElementById(q(grip("hand")).getAttribute("aria-describedby")!)?.textContent).toBe("Flèches haut et bas pour déplacer ; Entrée pour Monter et Descendre");
  });

  it("L3-13 : tirer la poignée de Texte jusqu'en tête : un seul geste écrit (preview une fois), Texte en tête ; le clic qui suit est ignoré", () => {
    const { q, save, preview, container } = setup();
    const restore = layoutRows();
    try {
      const rows = rowIds(container);
      const y0 = 100 + rows.indexOf("text") * 48 + 24;
      const g = q<HTMLButtonElement>(grip("text"));
      g.dispatchEvent(pointer("pointerdown", y0));
      for (let y = y0 - 8; y >= 110; y -= 8) g.dispatchEvent(pointer("pointermove", y));
      expect(preview).not.toHaveBeenCalled();
      g.dispatchEvent(pointer("pointerup", 110));
      expect(preview).toHaveBeenCalledTimes(1);
      fireEvent.click(q(grip("text")));
      expect(revealedRows(container)).toEqual([]);
      expect(q('[data-edit="announce"]').textContent).toBe(`Texte : rang 1 sur ${rows.length}`);
      fireEvent.click(q('button[data-edit="save"]'));
      expect(outils(last(save)).groups[0]!.items.map((i) => i.id)).toEqual(["text", "select", "hand"]);
    } finally {
      restore();
    }
  });

  it("L3-19 : livré sans copie, brouillon égal : « Revenir à l'origine » grisé ; modifié : le brouillon revient, magasin intact", () => {
    const { q, resetCurrent, endPreview } = setup();
    expect(q<HTMLButtonElement>('button[data-edit="revert"]').disabled).toBe(true);
    fireEvent.click(q(tile("left")));
    expect(q<HTMLButtonElement>('button[data-edit="revert"]').disabled).toBe(false);
    fireEvent.click(q('button[data-edit="revert"]'));
    expect(q(tile("floating")).getAttribute("aria-checked")).toBe("true");
    expect(endPreview).toHaveBeenCalledTimes(1);
    expect(resetCurrent).not.toHaveBeenCalled();
  });

  it("L3-19 : copie d'un livré ou profil de l'utilisateur : resetCurrent, sans question (H3)", () => {
    const { q, resetCurrent, confirm } = setup(DEFAUT, DEFAUT, { canResetCurrent: true });
    expect(q<HTMLButtonElement>('button[data-edit="revert"]').disabled).toBe(false);
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="revert"]'));
    expect(resetCurrent).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("L3-20 : « Enregistré sur cet appareil » seulement quand le brouillon égale le profil enregistré", () => {
    const { q, container } = setup();
    expect(q('[data-edit="saved"]').textContent).toBe("Enregistré sur cet appareil");
    fireEvent.click(q(tile("left")));
    expect(container.querySelector('[data-edit="saved"]')).toBeNull();
    fireEvent.click(q(tile("floating")));
    expect(q('[data-edit="saved"]')).toBeTruthy();
  });

  it("L3-32 : seul le nom change : Fermer demande ; Non : rien ; brouillon égal : Fermer tout de suite, sans question", async () => {
    const a = setup();
    fireEvent.click(a.q('button[data-edit="close"]'));
    expect(a.close).toHaveBeenCalledTimes(1);
    expect(a.confirm).not.toHaveBeenCalled();
    cleanup();
    const b = setup();
    b.confirm.mockResolvedValueOnce(false);
    typeIn(b.q<HTMLInputElement>('input[data-edit="label"]'), "Autre nom");
    fireEvent.click(b.q('button[data-edit="close"]'));
    expect(b.confirm).toHaveBeenCalledWith(QUESTION);
    await tick();
    expect(b.close).not.toHaveBeenCalled();
  });

  it("L3-21 : Importer depuis le panneau : brouillon égal, sans question ; modifié, après Oui", async () => {
    const { q, importFile, confirm } = setup();
    fireEvent.click(q('button[data-edit="import"]'));
    expect(importFile).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="import"]'));
    expect(confirm).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(importFile).toHaveBeenCalledTimes(2));
  });

  it("L3-21 : Exporter écrit le brouillon ; nom vide : Exporter et Enregistrer grisés", () => {
    const { q, exportProfile } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="export"]'));
    expect(outils(last(exportProfile)).dock).toBe("left");
    typeIn(q<HTMLInputElement>('input[data-edit="label"]'), "  ");
    expect(q<HTMLButtonElement>('button[data-edit="export"]').disabled).toBe(true);
    expect(q<HTMLButtonElement>('button[data-edit="save"]').disabled).toBe(true);
  });

  it("L3-15 (relecture) : Échap pendant un tri, lâcher hors de la poignée : au tour suivant, Entrée sur la poignée dévoile Monter et Descendre", async () => {
    const { q, container, preview } = setup();
    const restore = layoutRows();
    try {
      const y0 = 100 + rowIds(container).indexOf("text") * 48 + 24;
      const g = q<HTMLButtonElement>(grip("text"));
      g.dispatchEvent(pointer("pointerdown", y0));
      g.dispatchEvent(pointer("pointermove", y0 - 60));
      fireEvent.keyDown(document, { key: "Escape" });
      document.body.dispatchEvent(pointer("pointerup", y0 - 60)); // lâché ailleurs : aucun click sur la poignée
      expect(preview).not.toHaveBeenCalled();
      await tick();
      g.focus();
      fireEvent.click(g); // Entrée sur un bouton = clic
      expect(revealedRows(container)).toEqual(["text"]);
    } finally {
      restore();
    }
  });

  it("L3-13 (relecture) : lâcher d'un tri sans click qui le suive : au tour suivant, la poignée répond de nouveau", async () => {
    const { q, container, preview } = setup();
    const restore = layoutRows();
    try {
      const y0 = 100 + rowIds(container).indexOf("text") * 48 + 24;
      const g = q<HTMLButtonElement>(grip("text"));
      g.dispatchEvent(pointer("pointerdown", y0));
      for (let y = y0 - 8; y >= 110; y -= 8) g.dispatchEvent(pointer("pointermove", y));
      g.dispatchEvent(pointer("pointerup", 110));
      expect(preview).toHaveBeenCalledTimes(1);
      await tick();
      fireEvent.click(q(grip("text")));
      expect(revealedRows(container)).toEqual(["text"]);
    } finally {
      restore();
    }
  });
});
