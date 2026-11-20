// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabsBar, type TabView } from "./TabsBar";

afterEach(cleanup);

const TABS: TabView[] = [
  { id: "a", title: "Plan", dirty: false, kind: "board" },
  { id: "b", title: "Notes", dirty: true, kind: "board" },
];

function setup(tabs: readonly TabView[] = TABS, active: string | null = "a") {
  const activate = vi.fn();
  const close = vi.fn();
  const newTab = vi.fn();
  const [t, setT] = createSignal(tabs);
  const [a, setA] = createSignal(active);
  const r = render(() => <TabsBar tabs={t} active={a} activate={activate} close={close} newTab={newTab} />);
  return { ...r, activate, close, newTab, setT, setA };
}
const tab = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-tab="${id}"]`)!;

describe("TabsBar (T91)", () => {
  it("un onglet par document, actif aria-selected", () => {
    const { container, setA } = setup();
    expect(container.querySelector("[role=tablist][data-tabs]")).not.toBeNull();
    expect(container.querySelectorAll("[role=tab]").length).toBe(2);
    expect(tab(container, "a").getAttribute("aria-selected")).toBe("true");
    expect(tab(container, "b").getAttribute("aria-selected")).toBe("false");
    setA("b");
    expect(tab(container, "b").getAttribute("aria-selected")).toBe("true");
  });

  it("aucun onglet actif : aucun aria-selected vrai", () => {
    const { container } = setup(TABS, null);
    expect(container.querySelectorAll('[aria-selected="true"]').length).toBe(0);
  });

  it("onglet modifié marqué", () => {
    const { container } = setup();
    expect(tab(container, "b").getAttribute("data-dirty")).toBe("1");
    expect(tab(container, "b").textContent).toContain("•");
    expect(tab(container, "a").hasAttribute("data-dirty")).toBe(false);
    expect(tab(container, "a").textContent).not.toContain("•");
  });

  it("le titre est affiché", () => {
    const { container } = setup();
    expect(tab(container, "a").textContent).toContain("Plan");
  });

  it("fermer appelle close(id) sans activer", () => {
    const { container, close, activate } = setup();
    const x = container.querySelector<HTMLButtonElement>('button[data-tab-close="b"]')!;
    expect(x.getAttribute("aria-label")).toBe("Fermer Notes");
    fireEvent.click(x);
    expect(close).toHaveBeenCalledWith("b");
    expect(activate).not.toHaveBeenCalled();
  });

  it("+ appelle newTab", () => {
    const { container, newTab } = setup();
    fireEvent.click(container.querySelector("button[data-tab-new]")!);
    expect(newTab).toHaveBeenCalledTimes(1);
  });

  it("clic sur l'onglet appelle activate", () => {
    const { container, activate } = setup();
    fireEvent.click(tab(container, "b"));
    expect(activate).toHaveBeenCalledWith("b");
  });

  it("la liste suit les onglets", () => {
    const { container, setT } = setup();
    setT([TABS[0]!]);
    expect(container.querySelectorAll("[role=tab]").length).toBe(1);
  });

  it("mise en forme (T101) : une rangée, classes posées, règles de rb.css", () => {
    const { container } = setup();
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    const rule = (sel: string): string => new RegExp(`${sel.replace(/[.[\]="]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
    const list = container.querySelector("[role=tablist]")!;
    expect(list.classList.contains("rb-tabs")).toBe(true);
    expect(rule(".rb-tabs")).toMatch(/display:\s*flex/);
    expect(rule(".rb-tabs")).toMatch(/flex-wrap:\s*nowrap/);
    expect(rule(".rb-tab")).toMatch(/display:\s*inline-flex/);
    expect(rule(".rb-tab")).toMatch(/gap:/);
    expect(rule(".rb-tab")).toMatch(/min-height:\s*var\(--rb-tab-h\)/);
    expect(css).toMatch(/--rb-tab-h:/);
    expect(css).toMatch(/\.rb-tab\[aria-selected="true"\]\s*\{[^}]*(background|border-color)/);
    for (const el of container.querySelectorAll("[role=tab]")) expect(el.classList.contains("rb-tab")).toBe(true);
    expect(container.querySelector("[data-tab-close]")!.classList.contains("rb-tab-close")).toBe(true);
    expect(container.querySelector("[data-tab-new]")!.classList.contains("rb-tab-new")).toBe(true);
    expect(container.querySelector("[data-tab=b] .rb-tab-dirty")).not.toBeNull();
  });
});
