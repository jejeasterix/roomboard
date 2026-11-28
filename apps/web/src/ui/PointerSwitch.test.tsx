// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolItem } from "../toolbar";
import type { ToolbarView } from "./item-state";
import { ACTION_STATE } from "./item-state";
import { PointerSwitch } from "./PointerSwitch";

afterEach(cleanup);

const ITEM: ToolItem = { id: "annotation-pointer", kind: "action", action: "annotation-pointer", label: "Souris", requires: ["desktopAnnotation"], rest: {} };
const VIEW: ToolbarView = { tool: "pen", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const on = (pointer: "draw" | "mouse"): ToolbarView => ({ ...VIEW, annotation: { active: true, pointer, screens: 1 } });

function setup(view: ToolbarView, withPointer = true) {
  const base = { setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn(), tableFill: vi.fn(), fillColor: vi.fn(), fillTolerance: vi.fn(), textFormat: vi.fn(), selection: vi.fn(), imagePanel: vi.fn() };
  const host: ToolbarHost = withPointer ? { ...base, pointer: vi.fn() } : base;
  const [v, setV] = createSignal(view);
  const r = render(() => <PointerSwitch item={ITEM} view={v} host={host} />);
  const seg = (m: string): HTMLButtonElement => r.container.querySelector<HTMLButtonElement>(`button[data-segment="${m}"]`)!;
  const icon = (m: string): string | null => seg(m).querySelector("svg.rb-icon")?.getAttribute("data-icon") ?? null;
  return { ...r, host, setV, seg, icon };
}

describe("PointerSwitch (design-l4, L4-8)", () => {
  it("PointerSwitch (design-l4) : deux segments accolés dans un .rb-seg, « Dessin » (pen-line) puis « Souris » (pointer)", () => {
    const { container, icon } = setup(on("draw"));
    const segs = [...container.querySelectorAll(".rb-seg > button")];
    expect(segs.map((b) => b.getAttribute("data-segment"))).toEqual(["draw", "mouse"]);
    expect(segs.map((b) => b.textContent)).toEqual(["Dessin", "Souris"]);
    expect([icon("draw"), icon("mouse")]).toEqual(["pen-line", "pointer"]);
  });
  it("PointerSwitch (design-l4) : en dessin, « Dessin » enfoncé ; le segment inactif « Souris » porte data-item", () => {
    const { container, seg } = setup(on("draw"));
    expect([seg("draw").getAttribute("aria-pressed"), seg("mouse").getAttribute("aria-pressed")]).toEqual(["true", "false"]);
    expect(container.querySelectorAll("[data-item]")).toHaveLength(1);
    expect(seg("mouse").getAttribute("data-item")).toBe("annotation-pointer");
  });
  it("PointerSwitch (design-l4) : en souris, l'état et data-item passent à l'autre segment ; libellé et icône d'ACTION_STATE", () => {
    const { container, seg, setV, icon } = setup(on("draw"));
    setV(on("mouse"));
    expect([seg("draw").getAttribute("aria-pressed"), seg("mouse").getAttribute("aria-pressed")]).toEqual(["false", "true"]);
    expect(container.querySelectorAll("[data-item]")).toHaveLength(1);
    expect(seg("draw").getAttribute("data-item")).toBe("annotation-pointer");
    expect(container.querySelector('[data-item="annotation-pointer"]')!.textContent).toBe("Dessin");
    expect(icon("draw")).toBe("pen-line");
  });
  it("PointerSwitch (design-l4) : un clic appelle host.pointer(mode), segment enfoncé compris ; jamais runAction", () => {
    const { seg, host } = setup(on("draw"));
    fireEvent.click(seg("mouse"));
    fireEvent.click(seg("draw"));
    expect(vi.mocked(host.pointer!).mock.calls).toEqual([["mouse"], ["draw"]]);
    expect(host.runAction).not.toHaveBeenCalled();
  });
  it("PointerSwitch (design-l4) : hôte sans pointer, le segment inactif rejoue l'action, le segment enfoncé ne fait rien", () => {
    const { seg, host } = setup(on("draw"), false);
    fireEvent.click(seg("draw"));
    expect(host.runAction).not.toHaveBeenCalled();
    fireEvent.click(seg("mouse"));
    expect(host.runAction).toHaveBeenCalledWith("annotation-pointer");
  });
  it("PointerSwitch (design-l4) : hors annotation, les deux segments sont grisés", () => {
    const { seg } = setup(VIEW);
    expect([seg("draw").disabled, seg("mouse").disabled]).toEqual([true, true]);
  });
  it("PointerSwitch (design-l4) : le conteneur est un groupe nommé « Pointeur »", () => {
    const { container } = setup(on("draw"));
    const g = container.querySelector(".rb-seg")!;
    expect([g.getAttribute("role"), g.getAttribute("aria-label")]).toEqual(["group", "Pointeur"]);
  });
  it("PointerSwitch (design-l4) : en souris, « Souris » enfoncé ; libellé et icône identiques à ceux d'ACTION_STATE en mode dessin", () => {
    const { seg, icon } = setup(on("mouse"));
    expect(seg("mouse").getAttribute("aria-pressed")).toBe("true");
    expect(seg("mouse").textContent).toBe("Souris");
    expect(icon("mouse")).toBe("pointer");
    const vrai = ACTION_STATE["annotation-pointer"]!(on("draw"));
    expect([seg("mouse").textContent, icon("mouse")]).toEqual([vrai.label, vrai.icon]);
  });
});
