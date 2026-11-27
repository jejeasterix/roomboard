// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ButtonSize, RuntimeCapabilities, StartMode, Toolbar as Bar, ToolItem } from "../toolbar";
import { ACTION_TABLE } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { ToolbarHost } from "../app/toolbar-host";
import { SideBar, type PagesPort } from "./SideBar";
import { Toolbar, type PresetTable } from "./Toolbar";
import type { ToolbarView } from "./item-state";
import { TIP_HOVER_MS } from "./tooltip";

afterEach(cleanup);

const NO_CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
const VIEW: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: true, canRedo: false, pageIndex: 0, pageCount: 1 };
const outils = BUILTIN_PROFILES[0]!.toolbars.find((b) => b.id === "outils")!;
const historique = BUILTIN_PROFILES[0]!.toolbars.find((b) => b.id === "historique")!;

const mkBar = (items: ToolItem[], dock: Bar["dock"] = "top"): Bar => ({
  id: "b", role: "tools", dock, collapsed: false, groups: [{ id: "g", items, rest: {} }], rest: {},
});
const tool = (id: string, t = id): ToolItem => ({ id, kind: "tool", tool: t, label: id, requires: [], rest: {} });

function setup(bar: Bar = outils, caps: RuntimeCapabilities = NO_CAPS, size: ButtonSize = "m", presets?: PresetTable, mode?: StartMode) {
  const host: ToolbarHost = { setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn(), tableFill: vi.fn(), fillColor: vi.fn(), fillTolerance: vi.fn(), textFormat: vi.fn(), selection: vi.fn(), imagePanel: vi.fn() };
  const [c, setC] = createSignal(caps);
  const [v, setV] = createSignal(VIEW);
  const [s, setS] = createSignal(size);
  const r = render(() => (
    <Toolbar bar={bar} caps={c} view={v} size={s} host={host} presets={presets === undefined ? undefined : () => presets} mode={mode === undefined ? undefined : () => mode} />
  ));
  return { ...r, host, setC, setV, setS };
}

describe("Toolbar", () => {
  it("C11a : mode annotation → itemsForMode (zone d'annotation visible, sortie ajoutée) ; sans mode → tableau", () => {
    const zone: ToolItem = { id: "depot-annotation", kind: "dropzone", label: "Déposer ici", requires: ["desktopAnnotation"], rest: {} };
    const bar = mkBar([tool("pen"), zone]);
    const caps = { ...NO_CAPS, desktopAnnotation: true };
    const board = setup(bar, caps);
    expect(board.container.querySelector('[data-item="depot-annotation"]')).toBeNull();
    cleanup();
    const ann = setup(bar, caps, "m", undefined, "desktop-annotation");
    expect(ann.container.querySelector('[data-item="depot-annotation"]')).not.toBeNull();
    expect(ann.container.querySelector('[data-item="desktop-annotation-ajout"]')).not.toBeNull();
    expect(ann.container.querySelector('[data-item="annotation-pointer-ajout"]')).not.toBeNull();
  });
  it("rangée Sélection dans la barre d'outils : outil Sélection seulement (C3)", () => {
    const { container, setV } = setup();
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setV({ ...VIEW, tool: "select" });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(6);
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
    const { container, host } = setup(historique);
    const btn = container.querySelector<HTMLButtonElement>('button[data-item="undo"]')!;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(host.runAction).toHaveBeenCalledWith("undo");
  });
  it("bouton désactivé : redo sans étape", () => {
    const { container } = setup(historique);
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
    const { container } = setup(historique);
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
    expect(el.getAttribute("data-dock")).toBe("floating");
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
    const kids = [...bar.querySelector(":scope > [data-island-context]")!.children];
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
    expect(actionIds(container)).toEqual(["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform", "table-merge", "table-split", "table-shade", "table-unshade"]);
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

describe("Toolbar — rangée du pot (C6a)", () => {
  const POT: ToolbarView = { ...VIEW, tool: "fill" };
  const potSetup = (table: PresetTable = {}) => {
    const r = setup(outils, NO_CAPS, "m", table);
    r.setV(POT);
    return r;
  };
  it("pot actif sans presets.fill : Rouge, Jaune, Vert, Bleu, Noir, puis « Aucune » en dernier", () => {
    const { container } = potSetup();
    expect(presetIds(container)).toEqual(["rouge", "jaune", "vert", "bleu", "noir"]);
    const bar = container.querySelector(".rb-bar")!;
    const none = bar.querySelector("button[data-fill-none]")!;
    expect(none.textContent).toContain("Aucune");
    expect(none.hasAttribute("data-preset")).toBe(false);
    expect(none.hasAttribute("data-item")).toBe(false);
    expect(bar.querySelector("[data-presets-sep]")).not.toBeNull();
    const rows = [...bar.querySelectorAll("button[data-preset], button[data-fill-none]")];
    expect(rows[rows.length - 1]).toBe(none);
  });
  it("C6b : curseur de tolérance après « Aucune », valeur de la vue (défaut 5), libellé « Tolérance » ; seulement avec le Pot (B10, B22)", () => {
    const { container, setV } = potSetup();
    const input = container.querySelector<HTMLInputElement>("input[data-fill-tolerance]")!;
    expect([input.type, input.min, input.max, input.step, input.value]).toEqual(["range", "0", "100", "1", "5"]);
    const none = container.querySelector("button[data-fill-none]")!;
    expect(none.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const label = container.querySelector(".rb-fill-tolerance")!;
    expect(label.querySelector(".rb-fill-tolerance-label")?.textContent).toBe("Tolérance");
    expect(label.getAttribute("title")).toBe("Tolérance 5");
    expect(container.querySelector("[data-fill-tolerance-value]")?.textContent).toBe("5");
    setV({ ...VIEW, tool: "fill", fillTolerance: 30 });
    expect([input.value, label.getAttribute("title")]).toEqual(["30", "Tolérance 30"]);
    setV({ ...VIEW, tool: "pen" });
    expect(container.querySelector("input[data-fill-tolerance]")).toBeNull();
  });
  it("C6b : déplacer le curseur appelle host.fillTolerance(valeur), sans setTool", () => {
    const { container, host } = potSetup();
    const input = container.querySelector<HTMLInputElement>("input[data-fill-tolerance]")!;
    input.value = "12";
    fireEvent.input(input);
    expect(host.fillTolerance).toHaveBeenCalledWith(12);
    expect(host.setTool).not.toHaveBeenCalled();
  });
  it("un clic sur une couleur appelle host.setTool(fill, id)", () => {
    const { container, host } = potSetup();
    fireEvent.click(container.querySelector('button[data-preset="vert"]')!);
    expect(host.setTool).toHaveBeenCalledWith("fill", "vert");
  });
  it("un clic sur « Aucune » appelle host.fillColor(null), sans setTool", () => {
    const { container, host } = potSetup();
    fireEvent.click(container.querySelector("button[data-fill-none]")!);
    expect(host.fillColor).toHaveBeenCalledWith(null);
    expect(host.setTool).not.toHaveBeenCalled();
  });
  it("profil avec presets.fill : ses couleurs, puis « Aucune » ; clé vide : « Aucune » seule", () => {
    const { container } = potSetup({ fill: [{ id: "ambre", label: "Ambre", color: "#f59e0b", rest: {} }] });
    expect(presetIds(container)).toEqual(["ambre"]);
    expect(container.querySelector("button[data-fill-none]")).not.toBeNull();
    cleanup();
    const vide = potSetup({ fill: [] });
    expect(presetIds(vide.container)).toEqual([]);
    expect(vide.container.querySelector("button[data-fill-none]")).not.toBeNull();
  });
  it("barre sans presets (prop absente) : pot actif, ni « Aucune » ni préréglage", () => {
    const { container, setV } = setup();
    setV({ ...VIEW, tool: "fill" });
    expect(container.querySelector("button[data-fill-none]")).toBeNull();
    expect(container.querySelector("[data-preset]")).toBeNull();
  });
  it("le stylo garde ses préréglages sans « Aucune » ; Main : la rangée disparaît", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", PEN);
    expect(container.querySelector("button[data-fill-none]")).toBeNull();
    setV({ ...VIEW, tool: "fill" });
    expect(presetIds(container)).toEqual(["rouge", "jaune", "vert", "bleu", "noir"]);
    setV({ ...VIEW, tool: "hand" });
    expect(presetIds(container)).toEqual([]);
    expect(container.querySelector("button[data-fill-none]")).toBeNull();
  });
});

describe("Toolbar : Modifier dans l'application d'origine (C16, S3)", () => {
  it("bouton absent sans la capacité (web), présent avec elle, et clic relayé à l'hôte", () => {
    const menu = BUILTIN_PROFILES[0]!.toolbars.find((b) => b.id === "menu")!;
    const { container, setC, host } = setup(menu);
    expect(container.querySelector('[data-item="edit-original"]')).toBeNull();
    setC({ ...NO_CAPS, officeConverter: true });
    const btn = container.querySelector('[data-item="edit-original"]')!;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(host.runAction).toHaveBeenCalledWith("edit-original");
  });
});

describe("Toolbar — icônes (design-l1, S3, S4)", () => {
  const iconOf = (root: ParentNode, sel: string): string | null =>
    root.querySelector(`${sel} svg.rb-icon`)?.getAttribute("data-icon") ?? null;
  const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };

  it("S4 : item.icon inconnu ou hérité → icône de la table ; item.icon connu → prioritaire", () => {
    const { container } = setup(mkBar([{ ...tool("pen"), icon: "inconnue" }, { ...tool("eraser"), icon: "rect" }, { ...tool("hand"), icon: "__proto__" }]));
    expect(iconOf(container, '[data-item="pen"]')).toBe("pen");
    expect(iconOf(container, '[data-item="eraser"]')).toBe("rect");
    expect(iconOf(container, '[data-item="hand"]')).toBe("hand");
    cleanup();
    const stylo = setup(mkBar([{ ...tool("pen"), icon: "rect" }]));
    expect(iconOf(stylo.container, '[data-item="pen"]')).toBe("rect");
  });
  it("S4 : jamais un bouton vide — chaque bouton des profils livrés a icône, nom accessible et libellé en texte", () => {
    let n = 0;
    for (const p of BUILTIN_PROFILES) {
      for (const bar of p.toolbars) {
        const { container, unmount } = setup(bar, ALL);
        for (const b of container.querySelectorAll<HTMLButtonElement>("button[data-item]")) {
          const id = b.getAttribute("data-item") ?? "?";
          expect(b.querySelector("svg.rb-icon"), id).not.toBeNull();
          expect(b.getAttribute("aria-label"), id).toBeTruthy();
          expect(b.textContent, id).toBe(b.getAttribute("aria-label"));
          expect(b.hasAttribute("title"), id).toBe(false);
          n++;
        }
        unmount();
      }
    }
    expect(n).toBeGreaterThan(20);
  });
  it("S3 : « Annuler » a le nom accessible « Annuler », svg caché aux lecteurs d'écran", () => {
    const { container } = setup(historique);
    const undo = container.querySelector('button[data-item="undo"]')!;
    expect(undo.getAttribute("aria-label")).toBe("Annuler");
    expect(undo.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    expect(iconOf(container, '[data-item="undo"]')).toBe("undo");
  });
  it("S3 : bascule Souris / Dessin en annotation : l'icône suit le libellé", () => {
    const { container, setV } = setup(mkBar([tool("pen")]), { ...NO_CAPS, desktopAnnotation: true }, "m", undefined, "desktop-annotation");
    const sel = '[data-item="annotation-pointer-ajout"]';
    setV({ ...VIEW, annotation: { active: true, pointer: "draw", screens: 1 } });
    expect(container.querySelector(sel)!.textContent).toBe("Souris");
    expect(iconOf(container, sel)).toBe("pointer");
    setV({ ...VIEW, annotation: { active: true, pointer: "mouse", screens: 1 } });
    expect(container.querySelector(sel)!.textContent).toBe("Dessin");
    expect(iconOf(container, sel)).toBe("pen-line");
  });
  it("rangée du tableau : 9 actions en icônes ; pastilles sans title, pastille + rb-sr", () => {
    const { container, setV } = setup();
    setV({ ...VIEW, tool: "table", tableCell: { id: "t", row: 0, col: 0, rows: 3, cols: 4 } });
    expect([...container.querySelectorAll("[data-table-action] svg.rb-icon")].map((s) => s.getAttribute("data-icon"))).toEqual([
      "between-horizontal-start", "between-vertical-start", "row-remove", "col-remove", "columns-3", "table-cells-merge", "table-cells-split", "droplet", "droplet-off",
    ]);
    for (const f of container.querySelectorAll("button[data-table-fill]")) {
      expect(f.hasAttribute("title")).toBe(false);
      expect(f.querySelector(".rb-swatch.rb-swatch-square")).not.toBeNull();
      expect(f.querySelector(".rb-sr")?.textContent).toBe(f.getAttribute("aria-label"));
    }
  });
  it("préréglages et « Aucune » : pastille seule, libellé en rb-sr, aucun title", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", PEN);
    const rouge = container.querySelector('button[data-preset="rouge"]')!;
    expect([rouge.hasAttribute("title"), rouge.getAttribute("aria-label"), rouge.querySelector(".rb-sr")?.textContent]).toEqual([false, "Rouge", "Rouge"]);
    expect(rouge.classList.contains("rb-preset")).toBe(true);
    setV({ ...VIEW, tool: "fill" });
    const none = container.querySelector("button[data-fill-none]")!;
    expect([none.hasAttribute("title"), none.getAttribute("aria-label")]).toEqual([false, "Aucune"]);
  });
});

describe("Toolbar — barre d'annotation (design-l4)", () => {
  const act = (id: string, a = id): ToolItem => ({ id, kind: "action", action: a, label: ACTION_TABLE[a]?.label ?? a, requires: [], rest: {} });
  const iconOf = (root: ParentNode, sel: string): string | null => root.querySelector(`${sel} svg.rb-icon`)?.getAttribute("data-icon") ?? null;
  it("design-l4 (L4-8) : annotation-pointer rendu par la commande segmentée (table ACTION_RENDER), data-item sur le segment inactif", () => {
    const { container } = setup(mkBar([act("annotation-pointer")]), NO_CAPS, "m", undefined, "desktop-annotation");
    expect(container.querySelectorAll(".rb-seg > button[data-segment]")).toHaveLength(2);
    expect(container.querySelectorAll('[data-item="annotation-pointer"]')).toHaveLength(1);
    expect(container.querySelector('[data-item="annotation-pointer"]')!.getAttribute("data-segment")).toBe("mouse");
  });
  it("design-l4 (L4-8, G9) : branché par l'action, jamais par l'identifiant : une action annotation-pointer d'id quelconque est segmentée", () => {
    const { container } = setup(mkBar([act("mon-pointeur", "annotation-pointer")]));
    const el = container.querySelector('[data-item="mon-pointeur"]')!;
    expect([el.getAttribute("data-segment"), el.closest(".rb-seg") !== null]).toEqual(["mouse", true]);
    const src = readFileSync(join(__dirname, "Toolbar.tsx"), "utf8");
    expect(src).not.toMatch(/item\.(id|action)\s*[!=]==?\s*["'`]annotation-pointer/);
  });
  it("design-l4 (L4-10) : « Envoyer au tableau » et « … nouvel onglet » en boutons pleins voisins (board, plus) ; Annuler non", () => {
    const { container } = setup(mkBar([act("undo"), act("annotation-send"), act("annotation-send-new")]), NO_CAPS, "m", undefined, "desktop-annotation");
    const send = container.querySelector('button[data-item="annotation-send"]')!;
    const sendNew = container.querySelector('button[data-item="annotation-send-new"]')!;
    expect([send.classList.contains("rb-primary"), send.classList.contains("rb-ib"), sendNew.classList.contains("rb-primary")]).toEqual([true, true, true]);
    expect(send.nextElementSibling).toBe(sendNew);
    expect([iconOf(container, '[data-item="annotation-send"]'), iconOf(container, '[data-item="annotation-send-new"]')]).toEqual(["board", "plus"]);
    expect(container.querySelector('button[data-item="undo"]')!.classList.contains("rb-primary")).toBe(false);
  });
  it("design-l4 (L4-11) : zone de dépôt à icône drop, libellé en rb-sr, sans title ; infobulle au survol", () => {
    vi.useFakeTimers();
    try {
      const zone: ToolItem = { id: "depot-annotation", kind: "dropzone", label: "Déposer ici", requires: [], rest: {} };
      const { container } = setup(mkBar([zone]));
      const el = container.querySelector<HTMLElement>('[data-item="depot-annotation"]')!;
      expect(el.classList.contains("rb-drop")).toBe(true);
      expect(el.querySelector("svg.rb-icon")?.getAttribute("data-icon")).toBe("drop");
      expect(el.querySelector(".rb-sr")?.textContent).toBe("Déposer ici");
      expect(el.textContent).toBe("Déposer ici");
      expect(el.hasAttribute("title")).toBe(false);
      fireEvent.pointerEnter(el, { pointerType: "mouse" });
      vi.advanceTimersByTime(TIP_HOVER_MS);
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Déposer ici");
      fireEvent.pointerLeave(el, { pointerType: "mouse" });
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it("design-l4 (L4-4) : rangées contextuelles sur une barre de rôle annotation comme sur tools ; aucune sur un autre rôle", () => {
    const ann = setup({ ...mkBar([tool("pen")]), role: "annotation" }, NO_CAPS, "m", PEN);
    expect(ann.container.querySelectorAll("button[data-preset]")).toHaveLength(3);
    ann.setV({ ...VIEW, tool: "select" });
    expect(ann.container.querySelectorAll("[data-selection-action]")).toHaveLength(6);
    cleanup();
    const other = setup({ ...mkBar([tool("pen")]), role: "autre" }, NO_CAPS, "m", PEN);
    expect(other.container.querySelectorAll("button[data-preset]")).toHaveLength(0);
  });
});

describe("Toolbar — design-l2 (L2-8, L2-13)", () => {
  const host = (): ToolbarHost => ({ setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn(), tableFill: vi.fn(), fillColor: vi.fn(), fillTolerance: vi.fn(), textFormat: vi.fn(), selection: vi.fn(), imagePanel: vi.fn() });
  it("design-l2 L2-13 : barre flottante de rôle tools : rangées contextuelles dans [data-island-context], enfant de [data-toolbar]", () => {
    const { container } = setup({ ...outils, dock: "floating" }, NO_CAPS, "m", PEN);
    const ctx = container.querySelector('[data-toolbar="outils"] > [data-island-context]');
    expect(ctx).not.toBeNull();
    expect(ctx!.classList.contains("rb-context")).toBe(true);
    expect(ctx!.querySelectorAll("button[data-preset]")).toHaveLength(3);
    expect(ctx!.firstElementChild?.hasAttribute("data-presets-sep")).toBe(true);
    expect(container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')).toHaveLength(3);
  });
  it("design-l2 L2-13 : barre en bande : rangée inchangée dans la barre, aucun [data-island-context]", () => {
    const { container } = setup({ ...outils, dock: "top" }, NO_CAPS, "m", PEN);
    expect(container.querySelector("[data-island-context]")).toBeNull();
    expect(container.querySelectorAll('[data-toolbar="outils"] > button[data-preset]')).toHaveLength(3);
  });
  it("design-l2 L2-8 : collapsed vrai : data-collapsed=\"1\" sur [data-toolbar] ; faux : aucun attribut", () => {
    const [c, setC] = createSignal(false);
    const { container } = render(() => (
      <Toolbar bar={{ ...outils, dock: "floating" }} caps={() => NO_CAPS} view={() => VIEW} size={() => "m"} host={host()} collapsed={c} />
    ));
    const bar = container.querySelector('[data-toolbar="outils"]')!;
    expect(bar.hasAttribute("data-collapsed")).toBe(false);
    setC(true);
    expect(bar.getAttribute("data-collapsed")).toBe("1");
  });
});

describe("Toolbar — compteur de pages (personnalisation-1a, T6)", () => {
  const nav = mkBar([
    { id: "page-prev", kind: "action", action: "page-prev", label: "Page précédente", requires: [], rest: {} },
    { id: "page-number", kind: "action", action: "page-number", label: "Numéro de page", requires: [], rest: {} },
    { id: "page-next", kind: "action", action: "page-next", label: "Page suivante", requires: [], rest: {} },
  ]);
  it("page-number rend #pages 2 / 5, bouton à icône, seul #pages de la page", () => {
    const { container, setV } = setup(nav);
    setV({ ...VIEW, pageIndex: 1, pageCount: 5 });
    const b = container.querySelector<HTMLButtonElement>('button[data-item="page-number"]')!;
    expect(b.id).toBe("pages");
    expect(b.classList.contains("rb-pages-count")).toBe(true);
    expect(b.textContent).toBe("2 / 5");
    expect(b.getAttribute("aria-label")).toBe("2 / 5");
    expect(b.querySelector("svg.rb-icon")).not.toBeNull();
    expect(document.querySelectorAll("#pages")).toHaveLength(1);
  });
  it("page-number pressed quand sidebarOpen ; clic → runAction(page-number)", () => {
    const { container, setV, host } = setup(nav);
    const b = container.querySelector<HTMLButtonElement>('button[data-item="page-number"]')!;
    expect(b.getAttribute("aria-pressed")).toBe("false");
    setV({ ...VIEW, sidebarOpen: true });
    expect(b.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(b);
    expect(host.runAction).toHaveBeenCalledWith("page-number");
  });
  it("barre latérale (successeur de PagesBar) : aucun second #pages, le compteur reste celui de la barre d'outils", () => {
    const pages: PagesPort = { ids: () => ["a", "b"], shown: () => "a", layout: () => "landscape", fixedByBackdrop: () => false, show() {}, move() {}, duplicate() {}, remove() {}, addAfter() {}, setLayout() {}, thumb: async () => null };
    const { container } = render(() => (
      <SideBar bar={{ id: "pages", role: "pages", dock: "floating", collapsed: false, groups: [{ id: "g", items: [nav.groups[0]!.items[1]!], rest: {} }], rest: {} }} collapsed={() => false} view={() => ({ ...VIEW, pageIndex: 0, pageCount: 2 })} host={{ runAction() {} } as never} pages={pages} />
    ));
    expect(container.querySelector("#pages")).toBeNull();
  });
  it("page-next sur la dernière page : actif, nommé Nouvelle page", () => {
    const { container } = setup(nav);
    const b = container.querySelector<HTMLButtonElement>('button[data-item="page-next"]')!;
    expect(b.disabled).toBe(false);
    expect(b.getAttribute("aria-label")).toBe("Nouvelle page");
  });
});
