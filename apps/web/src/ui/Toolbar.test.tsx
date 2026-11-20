// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ButtonSize, RuntimeCapabilities, Toolbar as Bar, ToolItem } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { ToolbarHost } from "../app/toolbar-host";
import { Toolbar } from "./Toolbar";
import type { ToolbarView } from "./item-state";

afterEach(cleanup);

const NO_CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
const VIEW: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: true, canRedo: false, pageIndex: 0, pageCount: 1 };
const outils = BUILTIN_PROFILES[0]!.toolbars.find((b) => b.id === "outils")!;

const mkBar = (items: ToolItem[], dock: Bar["dock"] = "top"): Bar => ({
  id: "b", role: "tools", dock, collapsed: false, groups: [{ id: "g", items, rest: {} }], rest: {},
});
const tool = (id: string, t = id): ToolItem => ({ id, kind: "tool", tool: t, label: id, requires: [], rest: {} });

function setup(bar: Bar = outils, caps: RuntimeCapabilities = NO_CAPS, size: ButtonSize = "m") {
  const host: ToolbarHost = { setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn() };
  const [c, setC] = createSignal(caps);
  const [v, setV] = createSignal(VIEW);
  const [s, setS] = createSignal(size);
  const r = render(() => <Toolbar bar={bar} caps={c} view={v} size={s} host={host} />);
  return { ...r, host, setC, setV, setS };
}

describe("Toolbar", () => {
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
