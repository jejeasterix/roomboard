// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { annotationTabLabel, TabsBar, type TabView } from "./TabsBar";

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
  it("C11a : onglet annotation libellé « Annotation », puis « Annotation — nom » une fois enregistré", () => {
    expect(annotationTabLabel("Sans titre.roomboard")).toBe("Annotation");
    expect(annotationTabLabel("x.roomboard")).toBe("Annotation — x.roomboard");
    const { container } = setup([...TABS, { id: "n", title: "Sans titre.roomboard", dirty: false, kind: "annotation" }]);
    expect(tab(container, "n").getAttribute("data-kind")).toBe("annotation");
    expect(tab(container, "n").textContent).toContain("Annotation");
    expect(tab(container, "n").textContent).not.toContain("Sans titre");
    expect(tab(container, "a").textContent).toContain("Plan");
  });
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
    expect(tab(container, "b").querySelector(".rb-tab-dirty")).not.toBeNull();
    expect(tab(container, "a").hasAttribute("data-dirty")).toBe(false);
    expect(tab(container, "a").querySelector(".rb-tab-dirty")).toBeNull();
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

  it("une impulsion garde les mêmes nœuds d'onglet (le clic après mousedown n'est pas perdu)", () => {
    const { container, setT } = setup();
    const a = tab(container, "a");
    const close = container.querySelector('[data-tab-close="b"]');
    setT(TABS.map((t) => ({ ...t })));
    expect(tab(container, "a")).toBe(a);
    expect(container.querySelector('[data-tab-close="b"]')).toBe(close);
    setT([{ ...TABS[0]!, title: "Renommé" }, { ...TABS[1]!, dirty: false }]);
    expect(tab(container, "a")).toBe(a);
    expect(a.textContent).toContain("Renommé");
    expect(tab(container, "b").hasAttribute("data-dirty")).toBe(false);
    setT([TABS[0]!]);
    expect(container.querySelectorAll("[role=tab]").length).toBe(1);
  });
});

describe("TabsBar (design-l2 L2-17)", () => {
  it("design-l2 L2-17 : Fermer = icône close (nom « Fermer <titre> »), Nouvel onglet = icône plus ; aucun caractère « × » ni « + »", () => {
    const { container } = setup();
    const close = container.querySelector('[data-tab-close="a"]')!;
    expect(close.querySelector("svg")?.getAttribute("data-icon")).toBe("close");
    expect(close.getAttribute("aria-label")).toBe("Fermer Plan");
    expect(close.textContent).toBe("");
    const add = container.querySelector("[data-tab-new]")!;
    expect(add.querySelector("svg")?.getAttribute("data-icon")).toBe("plus");
    expect(add.getAttribute("aria-label")).toBe("Nouvel onglet");
    expect(add.textContent).toBe("");
  });
  it("design-l2 L2-17 : point « modifié » avant le titre, titre dans .rb-tab-title", () => {
    const { container } = setup();
    const b = tab(container, "b");
    expect(b.firstElementChild?.classList.contains("rb-tab-dirty")).toBe(true);
    expect(b.querySelector(".rb-tab-title")?.textContent).toBe("Notes");
    expect(tab(container, "a").firstElementChild?.classList.contains("rb-tab-title")).toBe(true);
  });
});

describe("TabsBar : netteté (T9)", () => {
  it("le titre d'onglet est porté au pixel entier supérieur : Fermer et Nouvel onglet restent sur la grille", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: this.classList.contains("rb-tab-title") ? 159.4375 : 0, height: 0, toJSON: () => ({}) } as DOMRect;
    });
    try {
      const { container } = setup();
      const title = tab(container, "a").querySelector<HTMLElement>(".rb-tab-title")!;
      expect(title.style.getPropertyValue("margin-inline-end")).toBe("0.5625px");
    } finally {
      spy.mockRestore();
    }
  });
});
