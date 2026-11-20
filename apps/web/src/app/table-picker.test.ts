// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clampLines, createTablePicker, pickerAria, pickerLabel, PICKER_CLASS } from "./table-picker";

afterEach(() => {
  document.body.innerHTML = "";
});

function setup() {
  const parent = document.createElement("div");
  document.body.append(parent);
  const picker = createTablePicker(parent);
  const pick = vi.fn();
  return { parent, picker, pick, cell: (c: number, r: number) => picker.element.querySelector<HTMLButtonElement>(`button[data-cols="${c}"][data-rows="${r}"]`)! };
}
const key = (el: Element, k: string): void => {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
};

describe("grille de choix du tableau (C10a, T6)", () => {
  it("montée cachée ; open : visible au point, 64 cases, libellés « 4 colonnes, 3 lignes » (HC10-1)", () => {
    const { parent, picker, pick } = setup();
    expect(parent.contains(picker.element)).toBe(true);
    expect(picker.element.classList.contains(PICKER_CLASS)).toBe(true);
    expect(picker.isOpen()).toBe(false);
    picker.open({ x: 120, y: 80 }, pick);
    expect(picker.isOpen()).toBe(true);
    expect([picker.element.style.left, picker.element.style.top]).toEqual(["120px", "80px"]);
    expect(picker.element.querySelectorAll("button[data-cols]")).toHaveLength(64);
    expect(picker.element.querySelector('button[aria-label="4 colonnes, 3 lignes"]')).not.toBeNull();
    expect([pickerLabel(4, 3), pickerAria(1, 1)]).toEqual(["4 × 3", "1 colonne, 1 ligne"]);
  });

  it("survol de 4 × 3 : douze cases en surbrillance et libellé « 4 × 3 » ; clic : pick(4, 3), fermée", () => {
    const { picker, pick, cell } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    cell(4, 3).dispatchEvent(new Event("pointerenter"));
    expect(picker.element.querySelectorAll("button[data-on]")).toHaveLength(12);
    expect(picker.element.querySelector("[data-picker-label]")?.textContent).toBe("4 × 3");
    cell(4, 3).click();
    expect(pick).toHaveBeenCalledWith(4, 3);
    expect(picker.isOpen()).toBe(false);
  });

  it("flèches : surbrillance déplacée, bornée à 8 ; Entrée : crée la surbrillance", () => {
    const { picker, pick } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    const grid = picker.element.querySelector(".rb-table-picker-grid")!;
    for (const k of ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowLeft"]) key(grid, k);
    expect(picker.element.querySelector("[data-picker-label]")?.textContent).toBe("2 × 2");
    for (let i = 0; i < 10; i++) key(grid, "ArrowDown");
    expect(picker.element.querySelector("[data-picker-label]")?.textContent).toBe("2 × 8");
    key(grid, "Enter");
    expect(pick).toHaveBeenCalledWith(2, 8);
  });

  it("Échap : fermée, rien de créé", () => {
    const { picker, pick } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    key(picker.element.querySelector(".rb-table-picker-grid")!, "Escape");
    expect(picker.isOpen()).toBe(false);
    expect(pick).not.toHaveBeenCalled();
  });

  it("boîte colonnes, lignes : « Créer » borne à 1..=64 (T4)", () => {
    const { picker, pick } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    const [cols, rows] = [...picker.element.querySelectorAll<HTMLInputElement>("form input")];
    cols!.value = "70";
    rows!.value = "0";
    picker.element.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(pick).toHaveBeenCalledWith(64, 1);
    expect([clampLines(Number.NaN), clampLines(2.6), clampLines(-3)]).toEqual([1, 3, 1]);
  });

  it("close : fermée ; un clic d'avant ne crée plus rien", () => {
    const { picker, pick, cell } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    picker.close();
    cell(2, 2).click();
    expect([picker.isOpen(), pick.mock.calls.length]).toEqual([false, 0]);
  });
});

describe("grille de choix : bornée à la scène, touches consommées (C10a, T14)", () => {
  /** Tailles posées à la main : happy-dom ne met rien en page. */
  const sized = (el: HTMLElement, w: number, h: number, axes: readonly ["clientWidth" | "offsetWidth", "clientHeight" | "offsetHeight"]): void => {
    Object.defineProperty(el, axes[0], { value: w, configurable: true });
    Object.defineProperty(el, axes[1], { value: h, configurable: true });
  };

  it("grille 326 × 406 dans une scène 800 × 658 : clic à y = 450 → remontée à 252 ; clic à x = 700 → décalée à 474 ; scène plus petite : en haut à gauche", () => {
    const { parent, picker, pick } = setup();
    sized(parent, 800, 658, ["clientWidth", "clientHeight"]);
    sized(picker.element, 326, 406, ["offsetWidth", "offsetHeight"]);
    picker.open({ x: 100, y: 450 }, pick);
    expect([picker.element.style.left, picker.element.style.top]).toEqual(["100px", "252px"]);
    picker.open({ x: 700, y: 450 }, pick);
    expect([picker.element.style.left, picker.element.style.top]).toEqual(["474px", "252px"]);
    picker.open({ x: 100, y: 80 }, pick);
    expect([picker.element.style.left, picker.element.style.top]).toEqual(["100px", "80px"]);
    sized(parent, 300, 300, ["clientWidth", "clientHeight"]);
    picker.open({ x: 100, y: 80 }, pick);
    expect([picker.element.style.left, picker.element.style.top]).toEqual(["0px", "0px"]);
  });

  it("Retour arrière, Suppr, Échap pressés dans la grille : ne remontent pas à window (écoute du moteur, main.ts) ; Échap ferme la grille seulement", () => {
    const { parent, picker, pick, cell } = setup();
    const seen: string[] = [];
    const engine = (e: KeyboardEvent): void => {
      seen.push(e.key);
    };
    window.addEventListener("keydown", engine);
    try {
      picker.open({ x: 0, y: 0 }, pick);
      key(cell(1, 1), "Backspace");
      key(cell(1, 1), "Delete");
      expect(picker.isOpen()).toBe(true);
      key(cell(1, 1), "Escape");
      expect(picker.isOpen()).toBe(false);
      picker.open({ x: 0, y: 0 }, pick);
      key(picker.element.querySelector("form input")!, "Escape");
      expect(picker.isOpen()).toBe(false);
      expect(seen).toEqual([]);
      expect(pick).not.toHaveBeenCalled();
      // Témoin : hors de la grille, la touche arrive bien à window.
      key(parent, "Delete");
      expect(seen).toEqual(["Delete"]);
    } finally {
      window.removeEventListener("keydown", engine);
    }
  });

  it("structure ARIA : pas de role=grid sans rangées ; groupe étiqueté", () => {
    const { picker } = setup();
    expect(picker.element.querySelector('[role="grid"]')).toBeNull();
    const grid = picker.element.querySelector(".rb-table-picker-grid")!;
    expect([grid.getAttribute("role"), grid.getAttribute("aria-label")]).toEqual(["group", "Taille du tableau"]);
  });
});
