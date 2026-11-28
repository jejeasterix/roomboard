// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GridLevel, GridView } from "../core/api";
import { GridPanel } from "./GridPanel";

afterEach(cleanup);

const level = (kind: string, s: number, over: Partial<GridLevel> = {}): GridLevel => ({
  kind, spacingX: s, spacingY: s, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: true, visible: true, ...over,
});
const grid = (levels: GridLevel[], over: Partial<GridView> = {}): GridView => ({ visible: true, snap: true, above: false, levels, ...over });

function setup(initial: GridView | null = null, more: { tooFine?: (g: GridView | null) => boolean; onView?: (cb: () => void) => () => void } = {}) {
  const preview = vi.fn<(g: GridView | null) => void>();
  const endPreview = vi.fn<() => void>();
  const apply = vi.fn<(g: GridView | null) => string | null>(() => null);
  const cancel = vi.fn<() => void>();
  const r = render(() => <GridPanel initial={initial} preview={preview} endPreview={endPreview} apply={apply} cancel={cancel} {...more} />);
  const q = <T extends Element>(k: string): T => {
    const el = r.container.querySelector<T>(`[data-grille="${k}"]`);
    if (el === null) throw new Error(`absent : ${k}`);
    return el;
  };
  return { ...r, preview, endPreview, apply, cancel, q };
}
// OG69 (G2) : Type et Épaisseur sont des pastilles (`role="radio"`, `data-choice`), Magnétisme un interrupteur.
const choose = (el: Element, v: string): void => {
  const b = el.querySelector<HTMLButtonElement>(`[data-choice="${v}"]`);
  if (b === null) throw new Error(`pastille absente : ${v}`);
  fireEvent.click(b);
};
const chosen = (el: Element): string | null => el.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute("data-choice") ?? null;
const choices = (el: Element): (string | null)[] => [...el.querySelectorAll("[data-choice]")].map((b) => b.getAttribute("data-choice"));
const typeIn = (el: HTMLInputElement, v: string): void => {
  el.value = v;
  fireEvent.input(el);
};
const tick = (el: HTMLElement, on: boolean): void => {
  if ((el.getAttribute("aria-checked") === "true") !== on) fireEvent.click(el);
};
const last = (fn: { mock: { calls: unknown[][] } }): GridView | null => fn.mock.calls.at(-1)![0] as GridView | null;

describe("GridPanel (C9 éditeur, E9)", () => {
  it("E9 : #grille, groupe nommé, sept types dans l'ordre ; épaisseurs 1 à 4 ; champs désactivés sur « Aucune »", () => {
    const { container, q } = setup();
    const root = container.querySelector("#grille")!;
    expect([root.getAttribute("role"), root.getAttribute("aria-label")]).toEqual(["group", "Grille de la page"]);
    expect([...q("kind").querySelectorAll('[role="radio"]')].map((o) => o.textContent)).toEqual(["Aucune", "Carreaux", "Lignes", "Points", "Isométrique", "Portée", "Seyès"]);
    expect(chosen(q("kind"))).toBe("none");
    expect(choices(q("lineWidth"))).toEqual(["1", "2", "3", "4"]);
    for (const k of ["spacing", "color", "lineWidth", "snap"]) expect(q<HTMLInputElement>(k).disabled, k).toBe(true);
    expect([q("apply").textContent, q("cancel").textContent]).toEqual(["Appliquer", "Fermer sans appliquer"]);
  });

  it("S2 : Seyès → preview(seyes 30,24, #94a3b8, lineWidth 1) ; chaque réglage = un preview ; apply jamais appelé", () => {
    const { q, preview, apply } = setup();
    choose(q("kind"), "seyes");
    expect(preview).toHaveBeenCalledTimes(1);
    expect(last(preview)?.levels[0]).toMatchObject({ kind: "seyes", spacingX: 30.24, spacingY: 30.24, color: "#94a3b8", lineWidth: 1 });
    expect(q<HTMLInputElement>("spacing").value).toBe("30.24");
    typeIn(q("spacing"), "50");
    typeIn(q("color"), "#ff0000");
    choose(q("lineWidth"), "3");
    tick(q("snap"), true);
    expect(preview).toHaveBeenCalledTimes(5);
    expect(last(preview)).toMatchObject({ snap: true, levels: [{ kind: "seyes", spacingX: 50, spacingY: 50, color: "#ff0000", lineWidth: 3 }] });
    expect(apply).not.toHaveBeenCalled();
  });

  it("S2 : Appliquer → apply une fois avec la grille finale ; Fermer sans appliquer → cancel, apply jamais", () => {
    const a = setup();
    choose(a.q("kind"), "squares");
    typeIn(a.q("spacing"), "80");
    fireEvent.click(a.q("apply"));
    expect(a.apply).toHaveBeenCalledTimes(1);
    expect(last(a.apply)?.levels[0]).toMatchObject({ kind: "squares", spacingX: 80, spacingY: 80 });
    cleanup();
    const b = setup();
    choose(b.q("kind"), "squares");
    fireEvent.click(b.q("cancel"));
    expect(b.cancel).toHaveBeenCalledTimes(1);
    expect(b.apply).not.toHaveBeenCalled();
  });

  it("S2 : démontage → endPreview, quel que soit le chemin", () => {
    const { unmount, endPreview } = setup();
    expect(endPreview).not.toHaveBeenCalled();
    unmount();
    expect(endPreview).toHaveBeenCalledTimes(1);
  });

  it("S2, E4 : deux niveaux (hexagon en second) : Appliquer sans réglage rend la grille telle quelle", () => {
    const g = grid([level("squares", 40, { originX: 7 }), level("hexagon", 12)], { above: true });
    const { q, apply, preview } = setup(g);
    expect(chosen(q("kind"))).toBe("squares");
    fireEvent.click(q("apply"));
    expect(preview).not.toHaveBeenCalled();
    expect(last(apply)).toEqual(g);
  });

  it("S2, E4 : premier niveau hexagon → « Autre (non pris en charge) » montré, désactivé ; pas, couleur, épaisseur désactivés ; niveau gardé", () => {
    const g = grid([level("hexagon", 12), level("dots", 40)]);
    const { q, apply } = setup(g);
    expect(chosen(q("kind"))).toBeNull();
    expect(q("other").textContent).toBe("Autre (non pris en charge)");
    for (const k of ["spacing", "color", "lineWidth"]) expect(q<HTMLInputElement>(k).disabled, k).toBe(true);
    expect(q<HTMLInputElement>("snap").disabled).toBe(false);
    fireEvent.click(q("apply"));
    expect(last(apply)).toEqual(g);
  });

  it("S2 : « Aucune » puis Appliquer → apply(null)", () => {
    const { q, apply } = setup(grid([level("squares", 40)]));
    choose(q("kind"), "none");
    fireEvent.click(q("apply"));
    expect(apply).toHaveBeenCalledWith(null);
  });

  it("CR6 : refus du cœur : panneau ouvert, message affiché ; accepté : aucun message", () => {
    const { q, apply, container } = setup();
    choose(q("kind"), "squares");
    expect(container.querySelector('[data-grille="error"]')).toBeNull();
    apply.mockReturnValueOnce("grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)");
    fireEvent.click(q("apply"));
    const err = container.querySelector('[data-grille="error"]');
    expect([err?.getAttribute("role"), err?.textContent]).toEqual(["alert", "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)"]);
    expect(container.querySelector("#grille")).not.toBeNull();
    fireEvent.click(q("apply"));
    expect(container.querySelector('[data-grille="error"]')).toBeNull();
  });

  it("HE9, Review Focus 4 : pas saisi hors bornes : aperçu borné, champ ramené à la borne à la validation ; vide : aucun aperçu", () => {
    const { q, preview } = setup(grid([level("squares", 40)]));
    const spacing = q<HTMLInputElement>("spacing");
    typeIn(spacing, "2");
    expect(last(preview)?.levels[0]?.spacingX).toBe(4);
    expect(spacing.value).toBe("2");
    fireEvent.change(spacing);
    expect(spacing.value).toBe("4");
    typeIn(spacing, "");
    expect(preview).toHaveBeenCalledTimes(1);
  });

  it("PC8 (T8) : document à épaisseur 6, on choisit 2 : l'option 6 reste proposée", () => {
    const { q } = setup(grid([level("squares", 40, { lineWidth: 6 })]));
    const sel = q("lineWidth");
    choose(sel, "2");
    expect(choices(sel)).toEqual(["1", "2", "3", "4", "6"]);
    expect(chosen(sel)).toBe("2");
  });

  it("personnalisation-1b (Q21) : « Enregistrer comme fond » rend la grille du brouillon, sans apply ni cancel ; désactivé sur « Aucune » ; absent sans rappel", () => {
    const save = vi.fn<(g: GridView) => void>();
    const apply = vi.fn<(g: GridView | null) => string | null>(() => null);
    const cancel = vi.fn();
    const r = render(() => <GridPanel initial={null} preview={vi.fn()} endPreview={vi.fn()} apply={apply} cancel={cancel} saveAsBackground={save} />);
    const btn = r.container.querySelector<HTMLButtonElement>('[data-grille="save-background"]')!;
    expect(btn.textContent).toBe("Enregistrer comme fond");
    expect(btn.disabled).toBe(true);
    choose(r.container.querySelector('[data-grille="kind"]')!, "dots");
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0].levels[0]).toMatchObject({ kind: "dots", spacingX: 40 });
    expect([apply.mock.calls.length, cancel.mock.calls.length]).toEqual([0, 0]);
    r.unmount();
    const plain = setup();
    expect(plain.container.querySelector('[data-grille="save-background"]')).toBeNull();
  });

  it("OG69 (G1) : focus sur Type à l'ouverture ; Échap = Fermer sans appliquer ; Entrée hors d'un champ = Appliquer", () => {
    const a = setup(grid([level("squares", 40)]));
    expect(document.activeElement?.getAttribute("data-choice")).toBe("squares");
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect([a.cancel.mock.calls.length, a.apply.mock.calls.length]).toEqual([1, 0]);
    cleanup();
    const b = setup();
    expect(document.activeElement?.getAttribute("data-choice")).toBe("none");
    choose(b.q("kind"), "dots");
    fireEvent.keyDown(b.q("kind").querySelector('[data-choice="dots"]')!, { key: "Enter" });
    expect(b.apply).toHaveBeenCalledTimes(1);
    expect(last(b.apply)?.levels[0]?.kind).toBe("dots");
    fireEvent.keyDown(b.q("snap"), { key: "Enter" });
    expect(b.apply).toHaveBeenCalledTimes(2);
    // Dans le champ Pas, Entrée valide la saisie ; sur un bouton d'action, elle garde son rôle.
    fireEvent.keyDown(b.q("spacing"), { key: "Enter" });
    fireEvent.keyDown(b.q("cancel"), { key: "Enter" });
    expect([b.apply.mock.calls.length, b.cancel.mock.calls.length]).toEqual([2, 0]);
  });

  it("OG69 (G2) : pastilles de Type et d'Épaisseur (flèches), interrupteur Magnétisme (Espace, libellé dans la cible) ; indice sur « Aucune »", () => {
    const { q, preview, container } = setup();
    expect(q("hint").textContent).toBe("Choisissez un type pour régler le pas, la couleur et l'épaisseur.");
    const none = q("kind").querySelector<HTMLElement>('[data-choice="none"]')!;
    fireEvent.keyDown(none, { key: "ArrowRight" });
    expect(chosen(q("kind"))).toBe("squares");
    expect(container.querySelector('[data-grille="hint"]')).toBeNull();
    const sw = q("snap");
    expect([sw.tagName, sw.getAttribute("role"), sw.textContent]).toEqual(["BUTTON", "switch", "Magnétisme"]);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(sw, { key: " " });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(last(preview)?.snap).toBe(false);
    const w1 = q("lineWidth").querySelector<HTMLElement>('[data-choice="1"]')!;
    fireEvent.keyDown(w1, { key: "ArrowRight" });
    expect(chosen(q("lineWidth"))).toBe("2");
    expect(last(preview)?.levels[0]?.lineWidth).toBe(2);
  });

  it("OG69 (G3) : pas saisi au-delà de 400 ramené dès la saisie ; niveau trop fin au zoom : message lu par role=status, relu au changement de vue", () => {
    let fine = false;
    let viewChanged: () => void = () => {};
    const tooFine = vi.fn((g: GridView | null) => fine && g !== null);
    const { q } = setup(grid([level("squares", 40)]), { tooFine, onView: (cb) => ((viewChanged = cb), () => {}) });
    const status = q("too-fine");
    expect([status.getAttribute("role"), status.textContent]).toEqual(["status", ""]);
    const spacing = q<HTMLInputElement>("spacing");
    typeIn(spacing, "900");
    expect(spacing.value).toBe("400");
    fine = true;
    viewChanged();
    expect(status.textContent).toBe("Trop fin à ce zoom : agrandissez la page ou le pas");
    fine = false;
    typeIn(spacing, "80");
    expect(status.textContent).toBe("");
  });
});
