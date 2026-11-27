// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkPopover } from "./LinkPopover";

afterEach(cleanup);

function mount(value: string | null = null) {
  const submit = vi.fn();
  const close = vi.fn();
  const r = render(() => <LinkPopover value={value} submit={submit} close={close} />);
  const input = (): HTMLInputElement => r.container.querySelector<HTMLInputElement>("[data-link-popover] input")!;
  const type = (text: string): void => {
    input().value = text;
    fireEvent.input(input());
  };
  const alert = (): HTMLElement | null => r.container.querySelector<HTMLElement>("[data-link-popover] [role=alert]");
  return { ...r, submit, close, input, type, alert };
}

describe("LinkPopover (T18, déc. 38)", () => {
  it("montage : le champ a le focus et porte la valeur", () => {
    const m = mount("https://roomboard.app");
    expect(document.activeElement).toBe(m.input());
    expect(m.input().value).toBe("https://roomboard.app");
  });

  it("javascript: refusé", () => {
    const m = mount();
    for (const bad of ["javascript:alert(1)", "  JavaScript:alert(1)", "data:text/html,<b>x</b>", "file:///etc/passwd", "vbscript:x"]) {
      m.type(bad);
      fireEvent.keyDown(m.input(), { key: "Enter" });
      expect(m.submit).not.toHaveBeenCalled();
      expect(m.alert()?.textContent ?? "").not.toBe("");
    }
    expect(m.close).not.toHaveBeenCalled();
  });

  it("Entrée valide une étape", () => {
    const m = mount();
    m.type("https://example.org");
    fireEvent.keyDown(m.input(), { key: "Enter" });
    expect(m.submit).toHaveBeenCalledTimes(1);
    expect(m.submit).toHaveBeenCalledWith("https://example.org");
    expect(m.alert()).toBeNull();
  });

  it("mailto: et http: acceptés, espaces de bord retirés", () => {
    const m = mount();
    m.type("  mailto:contact@example.org ");
    fireEvent.keyDown(m.input(), { key: "Enter" });
    m.type("http://example.org/a?b=1");
    fireEvent.keyDown(m.input(), { key: "Enter" });
    expect(m.submit.mock.calls).toEqual([["mailto:contact@example.org"], ["http://example.org/a?b=1"]]);
  });

  it("vide retire", () => {
    const m = mount("https://example.org");
    m.type("   ");
    fireEvent.keyDown(m.input(), { key: "Enter" });
    expect(m.submit).toHaveBeenCalledTimes(1);
    expect(m.submit).toHaveBeenCalledWith(null);
  });

  it("plus de 2 048 caractères : refusé", () => {
    const m = mount();
    m.type(`https://example.org/${"a".repeat(2048)}`);
    fireEvent.keyDown(m.input(), { key: "Enter" });
    expect(m.submit).not.toHaveBeenCalled();
    expect(m.alert()).not.toBeNull();
  });

  it("Échap ferme sans écrire", () => {
    const m = mount("https://example.org");
    m.type("https://autre.example");
    fireEvent.keyDown(m.input(), { key: "Escape" });
    expect(m.close).toHaveBeenCalledTimes(1);
    expect(m.submit).not.toHaveBeenCalled();
  });

  it("Entrée en composition IME : rien", () => {
    const m = mount();
    m.type("https://example.org");
    fireEvent.keyDown(m.input(), { key: "Enter", isComposing: true });
    expect(m.submit).not.toHaveBeenCalled();
  });
});
