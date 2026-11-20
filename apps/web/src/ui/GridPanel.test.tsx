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

function setup(initial: GridView | null = null) {
  const preview = vi.fn<(g: GridView | null) => void>();
  const endPreview = vi.fn<() => void>();
  const apply = vi.fn<(g: GridView | null) => string | null>(() => null);
  const cancel = vi.fn<() => void>();
  const r = render(() => <GridPanel initial={initial} preview={preview} endPreview={endPreview} apply={apply} cancel={cancel} />);
  const q = <T extends Element>(k: string): T => {
    const el = r.container.querySelector<T>(`[data-grille="${k}"]`);
    if (el === null) throw new Error(`absent : ${k}`);
    return el;
  };
  return { ...r, preview, endPreview, apply, cancel, q };
}
const choose = (el: HTMLSelectElement, v: string): void => {
  el.value = v;
  fireEvent.change(el);
};
const typeIn = (el: HTMLInputElement, v: string): void => {
  el.value = v;
  fireEvent.input(el);
};
const tick = (el: HTMLInputElement, on: boolean): void => {
  el.checked = on;
  fireEvent.change(el);
};
const last = (fn: { mock: { calls: unknown[][] } }): GridView | null => fn.mock.calls.at(-1)![0] as GridView | null;

describe("GridPanel (C9 éditeur, E9)", () => {
  it("E9 : #grille, groupe nommé, sept types dans l'ordre ; épaisseurs 1 à 4 ; champs désactivés sur « Aucune »", () => {
    const { container, q } = setup();
    const root = container.querySelector("#grille")!;
    expect([root.getAttribute("role"), root.getAttribute("aria-label")]).toEqual(["group", "Grille de la page"]);
    expect([...q<HTMLSelectElement>("kind").options].map((o) => o.textContent)).toEqual(["Aucune", "Carreaux", "Lignes", "Points", "Isométrique", "Portée", "Seyès"]);
    expect(q<HTMLSelectElement>("kind").value).toBe("none");
    expect([...q<HTMLSelectElement>("lineWidth").options].map((o) => o.value)).toEqual(["1", "2", "3", "4"]);
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
    expect(q<HTMLSelectElement>("kind").value).toBe("squares");
    fireEvent.click(q("apply"));
    expect(preview).not.toHaveBeenCalled();
    expect(last(apply)).toEqual(g);
  });

  it("S2, E4 : premier niveau hexagon → « Autre (non pris en charge) » montré, désactivé ; pas, couleur, épaisseur désactivés ; niveau gardé", () => {
    const g = grid([level("hexagon", 12), level("dots", 40)]);
    const { q, apply } = setup(g);
    const kind = q<HTMLSelectElement>("kind");
    expect(kind.value).toBe("other");
    const other = [...kind.options].find((o) => o.value === "other")!;
    expect([other.textContent, other.disabled]).toEqual(["Autre (non pris en charge)", true]);
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
});
