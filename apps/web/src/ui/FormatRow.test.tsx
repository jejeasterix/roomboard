// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormatAction, FormatState } from "../engine/rich-edit";
import { FormatRow, TEXT_COLORS } from "./FormatRow";
import type { ToolbarView } from "./item-state";

afterEach(cleanup);

const VIEW: ToolbarView = { tool: "text", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const PLAIN: FormatState = { bold: false, italic: false, underline: false, size: 36, color: "default" };

function setup(view: ToolbarView = VIEW) {
  const act = vi.fn<(a: FormatAction) => void>();
  const [v, setV] = createSignal(view);
  const r = render(() => <FormatRow view={v} act={act} />);
  const all = (): HTMLButtonElement[] => [...r.container.querySelectorAll<HTMLButtonElement>("button")];
  const q = (sel: string): HTMLButtonElement => {
    const b = r.container.querySelector<HTMLButtonElement>(sel);
    if (b === null) throw new Error(`absent : ${sel}`);
    return b;
  };
  return { ...r, act, setV, all, q };
}

describe("rangée Format (C7b, R13-R15)", () => {
  it("outil Texte ou Tableau : séparateur, G, I, S, quatre tailles, Défaut puis quatre pastilles ; autre outil : rien", () => {
    const { container, setV, all } = setup();
    expect(container.querySelector("[data-format-sep]")).not.toBeNull();
    expect(all().map((b) => b.getAttribute("aria-label"))).toEqual([
      "Gras", "Italique", "Souligné", "Taille 24", "Taille 36", "Taille 48", "Taille 72", "Défaut", "Noir", "Rouge", "Bleu", "Vert",
    ]);
    expect(all().slice(0, 3).map((b) => b.textContent)).toEqual(["G", "I", "S"]);
    setV({ ...VIEW, tool: "table" });
    expect(all()).toHaveLength(12);
    setV({ ...VIEW, tool: "pen" });
    expect(all()).toHaveLength(0);
    expect(container.querySelector("[data-format-sep]")).toBeNull();
  });

  it("hors séance (textFormat absent ou null) : tous grisés ; séance ouverte : tous actifs", () => {
    const { setV, all } = setup();
    expect(all().every((b) => b.disabled)).toBe(true);
    setV({ ...VIEW, textFormat: null });
    expect(all().every((b) => b.disabled)).toBe(true);
    setV({ ...VIEW, textFormat: PLAIN });
    expect(all().every((b) => !b.disabled)).toBe(true);
  });

  it("aria-pressed : G, I, S selon l'état ; taille de l'élément et « Défaut » enfoncés sans attribut ; mixed : aucun (R15)", () => {
    const { setV, q } = setup({ ...VIEW, textFormat: PLAIN });
    const pressed = (sel: string): string | null => q(sel).getAttribute("aria-pressed");
    expect([pressed('[data-format="bold"]'), pressed('[data-format-size="36"]'), pressed('[data-format-color="defaut"]')]).toEqual(["false", "true", "true"]);
    setV({ ...VIEW, textFormat: { ...PLAIN, bold: true, size: 72, color: "#dc2626" } });
    expect([pressed('[data-format="bold"]'), pressed('[data-format-size="72"]'), pressed('[data-format-size="36"]'), pressed('[data-format-color="rouge"]'), pressed('[data-format-color="defaut"]')]).toEqual(["true", "true", "false", "true", "false"]);
    setV({ ...VIEW, textFormat: { ...PLAIN, size: "mixed", color: "mixed" } });
    expect([...document.querySelectorAll("[data-format-size], [data-format-color]")].some((b) => b.getAttribute("aria-pressed") === "true")).toBe(false);
  });

  it("clic : act reçoit l'action — bascule, taille, couleur, null pour « Défaut » (R8)", () => {
    const { act, q } = setup({ ...VIEW, textFormat: PLAIN });
    fireEvent.click(q('[data-format="bold"]'));
    fireEvent.click(q('[data-format="underline"]'));
    fireEvent.click(q('[data-format-size="48"]'));
    fireEvent.click(q('[data-format-color="rouge"]'));
    fireEvent.click(q('[data-format-color="defaut"]'));
    expect(act.mock.calls.map((c) => c[0])).toEqual([
      { type: "bold" }, { type: "underline" }, { type: "size", size: 48 }, { type: "color", color: "#dc2626" }, { type: "color", color: null },
    ]);
  });

  it("pointerdown et mousedown empêchés sur chaque bouton : la zone garde le focus et la sélection (R13)", () => {
    const { all } = setup({ ...VIEW, textFormat: PLAIN });
    for (const b of all()) {
      for (const type of ["pointerdown", "mousedown"]) {
        const e = new Event(type, { bubbles: true, cancelable: true });
        b.dispatchEvent(e);
        expect(e.defaultPrevented, `${type} ${b.getAttribute("aria-label")}`).toBe(true);
      }
    }
  });

  it("TEXT_COLORS : Défaut, noir, rouge, bleu, vert du stylo (R14)", () => {
    expect(TEXT_COLORS.map((c) => [c.id, c.color])).toEqual([
      ["defaut", null], ["noir", "#000000"], ["rouge", "#dc2626"], ["bleu", "#1d4ed8"], ["vert", "#15803d"],
    ]);
  });
});
