// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HelpPanel } from "./HelpPanel";
import { SHORTCUTS } from "./shortcuts";

afterEach(cleanup);

describe("HelpPanel", () => {
  it("Aide liste Dupliquer et Ctrl+D", () => {
    const { container } = render(() => <HelpPanel close={() => undefined} />);
    const root = container.querySelector('[data-panel-aide], [data-panel="aide"]')!;
    expect(root).not.toBeNull();
    expect(root.textContent).toContain("Dupliquer");
    expect(root.textContent).toContain("Ctrl+D");
  });
  it("Aide lit SHORTCUTS : une ligne par raccourci, groupes dans l'ordre de la table", () => {
    const { container } = render(() => <HelpPanel close={() => undefined} />);
    const rows = [...container.querySelectorAll("[data-shortcut-id]")].map((r) => r.getAttribute("data-shortcut-id"));
    expect(rows).toEqual(SHORTCUTS.map((s) => s.id));
    const groups = [...container.querySelectorAll("[data-group]")].map((g) => g.getAttribute("data-group"));
    expect(groups).toEqual([...new Set(SHORTCUTS.map((s) => s.group))]);
  });
  it("bouton Fermer ≥ 44 px (classe de cible tactile) ferme", () => {
    const close = vi.fn();
    const { container } = render(() => <HelpPanel close={close} />);
    fireEvent.click(container.querySelector("button[data-help-close]")!);
    expect(close).toHaveBeenCalled();
  });
  it("bouton Fermer : la règle de rb.css lui donne au moins 44 px, par --rb-btn-s qui vaut 44 px", () => {
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    const rule = /\.rb-help-close\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/min-width:\s*var\(--rb-btn-s\)/);
    expect(rule).toMatch(/min-height:\s*var\(--rb-btn-s\)/);
    expect(/--rb-btn-s:\s*(\d+)px/.exec(css)?.[1]).toBe("44");
    const { container } = render(() => <HelpPanel close={() => undefined} />);
    expect(container.querySelector("button[data-help-close]")!.classList.contains("rb-help-close")).toBe(true);
  });
});
