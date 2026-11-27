// @vitest-environment happy-dom
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
  it("Échap ferme", () => {
    const close = vi.fn();
    const { container } = render(() => <HelpPanel close={close} />);
    fireEvent.keyDown(container.querySelector('[data-panel="aide"]')!, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("bouton Fermer ≥ 44 px (classe de cible tactile) ferme", () => {
    const close = vi.fn();
    const { container } = render(() => <HelpPanel close={close} />);
    fireEvent.click(container.querySelector("button[data-help-close]")!);
    expect(close).toHaveBeenCalled();
  });
});
