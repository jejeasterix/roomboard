// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ButtonSize, Toolbar, ToolItem } from "../toolbar";
import { PagesBar, pagesLabel, type PagesView } from "./PagesBar";

afterEach(cleanup);

const item = (action: string): ToolItem => ({
  id: action,
  kind: "action",
  action,
  label: action,
  requires: [],
  rest: {},
});
const bar: Toolbar = { id: "pages", role: "pages", dock: "bottom", collapsed: false, groups: [], rest: {} };
const ORDER = ["page-prev", "page-next", "page-add", "page-remove"].map(item);

function setup(view: PagesView, items: readonly ToolItem[] = ORDER, size: ButtonSize = "m") {
  const runAction = vi.fn();
  const goTo = vi.fn();
  const [v, setV] = createSignal(view);
  const [s, setS] = createSignal(size);
  const r = render(() => (
    <PagesBar bar={bar} items={() => items} view={v} size={s} runAction={runAction} goTo={goTo} />
  ));
  return { ...r, runAction, goTo, setV, setS };
}
const btn = (c: HTMLElement, sel: string) => c.querySelector<HTMLButtonElement>(sel)!;

describe("PagesBar (T91)", () => {
  it("compteur 3 / 7", () => {
    const { container } = setup({ pageIndex: 2, pageCount: 7 });
    expect(container.querySelector("span#pages")?.textContent).toBe("3 / 7");
    expect(pagesLabel({ pageIndex: 0, pageCount: 1 })).toBe("1 / 1");
  });

  it("DOM du contrat : nav data-toolbar, data-role, data-dock", () => {
    const { container } = setup({ pageIndex: 0, pageCount: 2 });
    const nav = container.querySelector("nav")!;
    expect(nav.getAttribute("data-toolbar")).toBe("pages");
    expect(nav.getAttribute("data-role")).toBe("pages");
    expect(nav.getAttribute("data-dock")).toBe("bottom");
    expect(nav.getAttribute("aria-label")).toBe("Pages");
    expect(container.querySelectorAll("button[data-page]").length).toBe(2);
  });

  it("la nav porte la classe rb-bar (jetons de taille s|m|l)", () => {
    const { container } = setup({ pageIndex: 0, pageCount: 2 }, ORDER, "l");
    const nav = container.querySelector("nav")!;
    expect(nav.classList.contains("rb-bar")).toBe(true);
    expect(nav.getAttribute("data-size")).toBe("l");
  });

  it("aller à la page 3", () => {
    const { container, goTo } = setup({ pageIndex: 0, pageCount: 7 });
    fireEvent.click(btn(container, 'button[data-page="3"]'));
    expect(goTo).toHaveBeenCalledWith(2);
  });

  it("page montrée marquée aria-current", () => {
    const { container, setV } = setup({ pageIndex: 1, pageCount: 3 });
    expect(btn(container, 'button[data-page="2"]').getAttribute("aria-current")).toBe("page");
    expect(btn(container, 'button[data-page="1"]').hasAttribute("aria-current")).toBe(false);
    setV({ pageIndex: 2, pageCount: 3 });
    expect(btn(container, 'button[data-page="3"]').getAttribute("aria-current")).toBe("page");
  });

  it("précédente désactivée sur la première, retirer désactivé s'il n'en reste qu'une (D37)", () => {
    const a = setup({ pageIndex: 0, pageCount: 3 });
    expect(btn(a.container, '[data-item="page-prev"]').disabled).toBe(true);
    expect(btn(a.container, '[data-item="page-next"]').disabled).toBe(false);
    expect(btn(a.container, '[data-item="page-remove"]').disabled).toBe(false);
    cleanup();
    const b = setup({ pageIndex: 0, pageCount: 1 });
    expect(btn(b.container, '[data-item="page-remove"]').disabled).toBe(true);
    expect(btn(b.container, '[data-item="page-next"]').disabled).toBe(true);
  });

  it("suivante désactivée sur la dernière page", () => {
    const { container } = setup({ pageIndex: 2, pageCount: 3 });
    expect(btn(container, '[data-item="page-next"]').disabled).toBe(true);
    expect(btn(container, '[data-item="page-prev"]').disabled).toBe(false);
  });

  it("clic Ajouter → runAction(page-add)", () => {
    const { container, runAction } = setup({ pageIndex: 0, pageCount: 2 });
    fireEvent.click(btn(container, '[data-item="page-add"]'));
    expect(runAction).toHaveBeenCalledWith("page-add");
  });

  it("un bouton désactivé ne lance rien", () => {
    const { container, runAction } = setup({ pageIndex: 0, pageCount: 1 });
    fireEvent.click(btn(container, '[data-item="page-prev"]'));
    expect(runAction).not.toHaveBeenCalled();
  });

  it("l'ordre suit le profil", () => {
    const items = ["page-add", "page-remove", "page-next", "page-prev"].map(item);
    const { container } = setup({ pageIndex: 1, pageCount: 3 }, items);
    const ids = [...container.querySelectorAll("button[data-item]")].map((b) => b.getAttribute("data-item"));
    expect(ids).toEqual(["page-add", "page-remove", "page-next", "page-prev"]);
  });

  it("data-size suit le jeton", () => {
    const { container, setS } = setup({ pageIndex: 0, pageCount: 2 }, ORDER, "l");
    const nav = container.querySelector("nav")!;
    expect(nav.getAttribute("data-size")).toBe("l");
    setS("s");
    expect(nav.getAttribute("data-size")).toBe("s");
  });

  it("la liste suit le nombre de pages", () => {
    const { container, setV } = setup({ pageIndex: 0, pageCount: 2 });
    setV({ pageIndex: 0, pageCount: 4 });
    expect(container.querySelectorAll("button[data-page]").length).toBe(4);
  });

  it("mise en forme (T101) : compteur et pages stylés, bornés par les jetons", () => {
    const { container } = setup({ pageIndex: 0, pageCount: 1 });
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    expect(container.querySelector("#pages")!.classList.contains("rb-pages-count")).toBe(true);
    expect(container.querySelector("[data-page]")!.classList.contains("rb-page")).toBe(true);
    expect(css).toMatch(/\.rb-bar\s*\{[^}]*align-items:\s*center/);
    expect(css).toMatch(/\.rb-pages-count\s*\{[^}]*padding/);
    expect(css).toMatch(/\.rb-bar button\s*\{[^}]*padding/);
  });

  it("à 25 pages, les numéros sont dans une liste défilante ; les actions restent hors de la liste", () => {
    const { container } = setup({ pageIndex: 0, pageCount: 25 });
    const list = container.querySelector(".rb-pages-list")!;
    expect(list.querySelectorAll("[data-page]").length).toBe(25);
    expect(list.querySelector("[data-item]")).toBeNull();
    expect(container.querySelector("[data-item=page-add]")!.closest(".rb-pages-list")).toBeNull();
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    expect(css).toMatch(/\.rb-pages-list\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/);
  });
});
