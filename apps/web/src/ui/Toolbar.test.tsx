// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ButtonSize, RuntimeCapabilities, Toolbar as Bar, ToolItem } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { ToolbarHost } from "../app/toolbar-host";
import { Toolbar, type PresetTable } from "./Toolbar";
import type { ToolbarView } from "./item-state";

afterEach(cleanup);

const NO_CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
const VIEW: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: true, canRedo: false, pageIndex: 0, pageCount: 1 };
const outils = BUILTIN_PROFILES[0]!.toolbars.find((b) => b.id === "outils")!;

const mkBar = (items: ToolItem[], dock: Bar["dock"] = "top"): Bar => ({
  id: "b", role: "tools", dock, collapsed: false, groups: [{ id: "g", items, rest: {} }], rest: {},
});
const tool = (id: string, t = id): ToolItem => ({ id, kind: "tool", tool: t, label: id, requires: [], rest: {} });

function setup(bar: Bar = outils, caps: RuntimeCapabilities = NO_CAPS, size: ButtonSize = "m", presets?: PresetTable) {
  const host: ToolbarHost = { setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn(), tableFill: vi.fn(), textFormat: vi.fn(), selection: vi.fn() };
  const [c, setC] = createSignal(caps);
  const [v, setV] = createSignal(VIEW);
  const [s, setS] = createSignal(size);
  const r = render(() => (
    <Toolbar bar={bar} caps={c} view={v} size={s} host={host} presets={presets === undefined ? undefined : () => presets} />
  ));
  return { ...r, host, setC, setV, setS };
}

describe("Toolbar", () => {
  it("rangée Sélection dans la barre d'outils : outil Sélection seulement (C3)", () => {
    const { container, setV } = setup();
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setV({ ...VIEW, tool: "select" });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(5);
  });
  it("defaut : un bouton par élément visible, dans l'ordre", () => {
    const { container } = setup();
    const ids = [...container.querySelectorAll("[data-item]")].map((e) => e.getAttribute("data-item"));
    const expected = outils.groups.flatMap((g) => g.items).filter((i) => i.kind !== "separator" && i.requires.length === 0).map((i) => i.id);
    expect(ids).toEqual(expected);
    expect(container.querySelectorAll("button[data-item]").length).toBeGreaterThan(10);
  });
  it("outil inconnu : bouton absent", () => {
    const { container } = setup(mkBar([tool("pen"), tool("laser")]));
    expect(container.querySelector('[data-item="laser"]')).toBeNull();
    expect(container.querySelector('[data-item="pen"]')).not.toBeNull();
  });
  it("requires dropPaths sans capacité : absent ; capacité ajoutée (signal) : présent", () => {
    const zone: ToolItem = { id: "zone", kind: "dropzone", label: "Déposer", requires: ["dropPaths"], rest: {} };
    const { container, setC } = setup(mkBar([tool("pen"), zone]));
    expect(container.querySelector('[data-item="zone"]')).toBeNull();
    setC({ ...NO_CAPS, dropPaths: true });
    expect(container.querySelector('[data-item="zone"]')).not.toBeNull();
  });
  it("clic sur Stylo → host.setTool(pen)", () => {
    const { container, host } = setup();
    fireEvent.click(container.querySelector('button[data-item="pen"]')!);
    expect(host.setTool).toHaveBeenCalledWith("pen");
  });
  it("clic sur Annuler → host.runAction(undo)", () => {
    const { container, host } = setup();
    const btn = container.querySelector<HTMLButtonElement>('button[data-item="undo"]')!;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(host.runAction).toHaveBeenCalledWith("undo");
  });
  it("bouton désactivé : redo sans étape", () => {
    const { container } = setup();
    expect(container.querySelector<HTMLButtonElement>('button[data-item="redo"]')!.disabled).toBe(true);
  });
  it("l'état publié change : aria-pressed suit, sans recréer les boutons", () => {
    const { container, setV } = setup();
    const pen = container.querySelector('button[data-item="pen"]')!;
    const eraser = container.querySelector('button[data-item="eraser"]')!;
    expect(pen.getAttribute("aria-pressed")).toBe("true");
    setV({ ...VIEW, tool: "eraser" });
    expect(container.querySelector('button[data-item="pen"]')).toBe(pen);
    expect(container.querySelector('button[data-item="eraser"]')).toBe(eraser);
    expect(pen.getAttribute("aria-pressed")).toBe("false");
    expect(eraser.getAttribute("aria-pressed")).toBe("true");
  });
  it("action sans état pressé : pas d'aria-pressed", () => {
    const { container } = setup();
    expect(container.querySelector('button[data-item="undo"]')!.hasAttribute("aria-pressed")).toBe(false);
  });
  it("data-size suit le jeton", () => {
    const { container, setS } = setup();
    const el = container.querySelector(".rb-bar")!;
    expect(el.getAttribute("data-size")).toBe("m");
    setS("l");
    expect(el.getAttribute("data-size")).toBe("l");
  });
  it("attributs de la barre : data-toolbar, data-role, data-dock, role=toolbar", () => {
    const { container } = setup();
    const el = container.querySelector(".rb-bar")!;
    expect(el.getAttribute("data-toolbar")).toBe("outils");
    expect(el.getAttribute("data-dock")).toBe("top");
    expect(el.getAttribute("role")).toBe("toolbar");
  });
  it("séparateur rendu role=separator", () => {
    const sep: ToolItem = { id: "s", kind: "separator", label: "", requires: [], rest: {} };
    const { container } = setup(mkBar([tool("pen"), sep, tool("eraser")]));
    expect(container.querySelector('.rb-sep[role="separator"]')).not.toBeNull();
  });
  it("libellé de l'état : gomme partielle", () => {
    const { container } = setup();
    expect(container.querySelector('button[data-item="eraser-mode"]')!.textContent).toBe("Gomme : partielle");
  });
  it("zone de dépôt : un dépôt appelle host.dropFiles", () => {
    const zone: ToolItem = { id: "zone", kind: "dropzone", label: "Déposer", requires: [], rest: {} };
    const { container, host } = setup(mkBar([zone]));
    const el = container.querySelector(".rb-drop")!;
    const file = new File(["x"], "a.roomboard");
    const ev = new Event("drop", { cancelable: true }) as Event & { dataTransfer: unknown; clientX: number; clientY: number };
    ev.dataTransfer = { files: [file], dropEffect: "" };
    ev.clientX = 3; ev.clientY = 4;
    el.dispatchEvent(ev);
    expect(host.dropFiles).toHaveBeenCalledTimes(1);
    expect(vi.mocked(host.dropFiles).mock.calls[0]![1]).toEqual({ x: 3, y: 4 });
  });
  it("profil simple : barre à gauche", () => {
    const simple = BUILTIN_PROFILES[1]!;
    const bar = simple.toolbars.find((b) => b.dock === "left")!;
    const { container } = setup(bar, NO_CAPS, simple.interface.buttonSize);
    const el = container.querySelector(".rb-bar")!;
    expect(el.getAttribute("data-dock")).toBe("left");
    expect(el.getAttribute("data-size")).toBe("l");
  });
  it("aucun switch sur l'identifiant, aucun px, aucun localStorage, aucun glisser HTML5 dans src/ui", () => {
    const dir = join(__dirname);
    const files = readdirSync(dir).filter((n) => /\.tsx?$/.test(n) && !/\.test\./.test(n)).map((n) => join(dir, n));
    files.push(join(dir, "..", "app", "toolbar-host.ts"));
    for (const path of files) {
      const f = path.split(/[\\/]/).pop()!;
      const src = readFileSync(path, "utf8");
      expect(src, f).not.toMatch(/switch\s*\(/);
      expect(src, f).not.toMatch(/localStorage/);
      expect(src, f).not.toMatch(/draggable|dragstart/);
      if (f.endsWith(".tsx")) expect(src, f).not.toMatch(/\d+px/);
    }
  });

  it("zone de dépôt : un dépôt ne remonte pas à document (une seule insertion, R29)", () => {
    const zone: ToolItem = { id: "zone", kind: "dropzone", label: "Déposer", requires: [], rest: {} };
    const { container, host } = setup(mkBar([zone]));
    const onDoc = vi.fn();
    document.addEventListener("drop", onDoc);
    try {
      const ev = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown; clientX: number; clientY: number };
      ev.dataTransfer = { files: [new File(["x"], "a.png")], dropEffect: "" };
      ev.clientX = 3;
      ev.clientY = 4;
      container.querySelector(".rb-drop")!.dispatchEvent(ev);
      expect(host.dropFiles).toHaveBeenCalledTimes(1);
      expect(onDoc).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("drop", onDoc);
    }
  });
});

const PEN: PresetTable = BUILTIN_PROFILES[0]!.presets;
const FIVE: PresetTable = {
  pen: [
    ...(PEN.pen ?? []),
    { id: "couleur", label: "Couleur 4", color: "#16a34a", width: 6, rest: {} },
    { id: "couleur-2", label: "Couleur 5", color: "#9333ea", width: 2, rest: {} },
  ],
};
const presetIds = (root: ParentNode): (string | null)[] =>
  [...root.querySelectorAll("button[data-preset]")].map((b) => b.getAttribute("data-preset"));

describe("Toolbar — rangée des préréglages (C1, P18, S4)", () => {
  it("stylo actif : préréglages en fin de barre, après un séparateur, data-preset et jamais data-item", () => {
    const plain = setup().container.querySelectorAll("button[data-item]").length;
    cleanup();
    const { container } = setup(outils, NO_CAPS, "m", PEN);
    const bar = container.querySelector(".rb-bar")!;
    expect(presetIds(bar)).toEqual(["noir", "rouge", "bleu"]);
    expect(bar.querySelectorAll("button[data-item]").length).toBe(plain);
    expect(bar.querySelector("button[data-preset][data-item]")).toBeNull();
    const kids = [...bar.children];
    expect(kids.indexOf(bar.querySelector("[data-presets-sep]")!)).toBe(kids.length - 4);
    expect(bar.querySelector('[data-preset="rouge"]')!.hasAttribute("aria-pressed")).toBe(false);
    expect(bar.querySelector('[data-preset="rouge"]')!.textContent).toContain("Rouge");
  });

  it("cinq préréglages : un clic sur le quatrième appelle host.setTool(pen, couleur)", () => {
    const { container, host } = setup(outils, NO_CAPS, "m", FIVE);
    expect(presetIds(container)).toEqual(["noir", "rouge", "bleu", "couleur", "couleur-2"]);
    fireEvent.click(container.querySelector('button[data-preset="couleur"]')!);
    expect(host.setTool).toHaveBeenCalledWith("pen", "couleur");
  });

  it("Main active : la rangée disparaît ; retour au stylo : elle revient", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", PEN);
    setV({ ...VIEW, tool: "hand" });
    expect(presetIds(container)).toEqual([]);
    expect(container.querySelector("[data-presets-sep]")).toBeNull();
    setV({ ...VIEW, tool: "pen" });
    expect(presetIds(container)).toHaveLength(3);
  });

  it("barre de rôle pages : aucune rangée", () => {
    const pages: Bar = { ...mkBar([tool("pen")]), role: "pages" };
    expect(presetIds(setup(pages, NO_CAPS, "m", PEN).container)).toEqual([]);
  });

  it("sans préréglages fournis : aucune rangée", () => {
    expect(presetIds(setup().container)).toEqual([]);
  });
});

describe("Toolbar — rangée du tableau (C10a, T10)", () => {
  const CELL = { id: "t", row: 0, col: 0, rows: 3, cols: 4 };
  const actionIds = (root: ParentNode): (string | null)[] =>
    [...root.querySelectorAll("button[data-table-action]")].map((b) => b.getAttribute("data-table-action"));

  it("outil Tableau actif : séparateur, cinq actions puis six pastilles ; autre outil : rien", () => {
    const { container, setV } = setup();
    expect(container.querySelector("[data-table-sep]")).toBeNull();
    setV({ ...VIEW, tool: "table", tableCell: CELL });
    expect(actionIds(container)).toEqual(["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform"]);
    expect(container.querySelector('[data-table-action="table-row-insert"]')!.textContent).toBe("+ Ligne");
    expect([...container.querySelectorAll("button[data-table-fill]")].map((b) => b.textContent)).toEqual(["Aucun", "Jaune", "Vert", "Bleu", "Rose", "Gris"]);
    expect(container.querySelector("button[data-table-action][data-item]")).toBeNull();
    setV({ ...VIEW, tool: "pen" });
    expect(actionIds(container)).toEqual([]);
  });

  it("sans cellule active : tout grisé ; une seule ligne : « − Ligne » grisé ; 64 colonnes : « + Colonne » grisé", () => {
    const { container, setV } = setup();
    setV({ ...VIEW, tool: "table", tableCell: null });
    expect([...container.querySelectorAll<HTMLButtonElement>("button[data-table-action], button[data-table-fill]")].every((b) => b.disabled)).toBe(true);
    setV({ ...VIEW, tool: "table", tableCell: { ...CELL, rows: 1, cols: 64 } });
    const q = (id: string) => container.querySelector<HTMLButtonElement>(`[data-table-action="${id}"]`)!;
    expect([q("table-row-remove").disabled, q("table-col-insert").disabled, q("table-row-insert").disabled]).toEqual([true, true, false]);
  });

  it("clic : runAction de l'action ; pastille : tableFill (null pour « Aucun »)", () => {
    const { container, host, setV } = setup();
    setV({ ...VIEW, tool: "table", tableCell: CELL });
    fireEvent.click(container.querySelector('[data-table-action="table-col-insert"]')!);
    expect(host.runAction).toHaveBeenCalledWith("table-col-insert");
    fireEvent.click(container.querySelector('[data-table-fill="jaune"]')!);
    fireEvent.click(container.querySelector('[data-table-fill="aucun"]')!);
    expect((host.tableFill as ReturnType<typeof vi.fn>).mock.calls).toEqual([["#fef08a"], [null]]);
  });
});

describe("Toolbar — rangée Format (C7b, R13)", () => {
  const PLAIN = { bold: false, italic: false, underline: false, size: 36, color: "default" } as const;

  it("outil Texte : rangée Format ; outil Tableau : après la rangée du tableau ; autre outil : rien", () => {
    const { container, setV } = setup();
    expect(container.querySelector("[data-format-sep]")).toBeNull();
    setV({ ...VIEW, tool: "text" });
    expect(container.querySelectorAll("button[data-format], button[data-format-size], button[data-format-color]")).toHaveLength(12);
    setV({ ...VIEW, tool: "table", tableCell: null });
    const buttons = [...container.querySelectorAll("button")];
    const lastFill = buttons.map((b) => b.hasAttribute("data-table-fill")).lastIndexOf(true);
    const firstFormat = buttons.findIndex((b) => b.hasAttribute("data-format"));
    expect(lastFill).toBeGreaterThanOrEqual(0);
    expect(firstFormat).toBeGreaterThan(lastFill);
    setV({ ...VIEW, tool: "pen" });
    expect(container.querySelector("[data-format-sep]")).toBeNull();
  });

  it("clic sur G : host.textFormat({ type: \"bold\" }) ; grisé sans séance", () => {
    const { container, host, setV } = setup();
    setV({ ...VIEW, tool: "text", textFormat: null });
    expect(container.querySelector<HTMLButtonElement>('[data-format="bold"]')!.disabled).toBe(true);
    setV({ ...VIEW, tool: "text", textFormat: PLAIN });
    fireEvent.click(container.querySelector('[data-format="bold"]')!);
    expect((host.textFormat as ReturnType<typeof vi.fn>).mock.calls).toEqual([[{ type: "bold" }]]);
  });
});
