// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTauriShell, openLink, type TauriIpc } from "../platform/host-tauri";
import { createWebShell, type WebShellWindow } from "../platform/shell-web";
import { checkLink, LinkPopover, LINK_BAD_CHARS, LINK_NOT_SAVED, LINK_REFUSED, LINK_TOO_LONG } from "./LinkPopover";
import { LINK_OPEN_FAILED } from "../platform/files";

afterEach(cleanup);

function mount(value: string | null = null, submitResult?: boolean, openLink?: (url: string) => void) {
  const submit = vi.fn(() => submitResult);
  const close = vi.fn();
  const r = render(() => <LinkPopover value={value} submit={submit} close={close} {...(openLink === undefined ? {} : { openLink })} />);
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
    expect(m.alert()?.textContent).toBe(LINK_TOO_LONG);
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

describe("LinkPopover : focus et appui hors de l'îlot", () => {
  it("fermeture : le focus revient à l'élément d'origine", () => {
    const origin = document.createElement("button");
    document.body.appendChild(origin);
    origin.focus();
    const m = mount();
    expect(document.activeElement).toBe(m.input());
    m.unmount();
    expect(document.activeElement).toBe(origin);
    origin.remove();
  });
  it("appui hors de l'îlot : ferme sans écrire", () => {
    const m = mount();
    fireEvent.pointerDown(m.input());
    expect(m.close).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(m.close).toHaveBeenCalledTimes(1);
    expect(m.submit).not.toHaveBeenCalled();
  });
});

describe("LinkPopover : ouvrir le lien (clavier) et refus du cœur", () => {
  const openBtn = (m: ReturnType<typeof mount>): HTMLButtonElement | null => m.container.querySelector<HTMLButtonElement>("[data-link-open]");
  it("sans lien enregistré : pas de bouton Ouvrir", () => {
    expect(openBtn(mount(null, undefined, vi.fn()))).toBeNull();
  });
  it("lien enregistré mais ouverture absente : pas de bouton", () => {
    expect(openBtn(mount("https://example.org"))).toBeNull();
  });
  it("lien enregistré : bouton Ouvrir le lien, atteignable par Tab après Valider, qui ouvre via la prop", () => {
    const open = vi.fn();
    const m = mount("https://example.org", undefined, open);
    const b = openBtn(m)!;
    expect(b.getAttribute("aria-label")).toContain("Ouvrir le lien");
    expect(b.tabIndex).toBeGreaterThanOrEqual(0);
    expect(b.classList.contains("rb-opt-btn")).toBe(true);
    expect(b.querySelector("svg")).not.toBeNull();
    fireEvent.click(b);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("https://example.org");
    expect(m.close).not.toHaveBeenCalled();
  });
  it("ordre du clavier : champ, Valider, puis Ouvrir le lien", () => {
    const m = mount("https://example.org", undefined, vi.fn());
    const order = [...m.container.querySelectorAll("[data-link-popover] input, [data-link-popover] button")].map((e) => e.getAttribute("data-link-ok") !== null ? "ok" : e.hasAttribute("data-link-open") ? "open" : "input");
    expect(order).toEqual(["input", "ok", "open"]);
  });
  it("lien enregistré invalide (hors schéma) : pas de bouton", () => {
    expect(openBtn(mount("javascript:alert(1)", undefined, vi.fn()))).toBeNull();
  });
  it("le cœur refuse (submit rend false) : message affiché, îlot ouvert", () => {
    const m = mount(null, false);
    m.type("https://example.org");
    fireEvent.keyDown(m.input(), { key: "Enter" });
    expect(m.alert()?.textContent).toBe(LINK_NOT_SAVED);
    expect(m.close).not.toHaveBeenCalled();
  });
  it("le cœur accepte (true) ou ne répond rien : aucun message", () => {
    for (const r of [true, undefined]) {
      const m = mount(null, r);
      m.type("https://example.org");
      fireEvent.keyDown(m.input(), { key: "Enter" });
      expect(m.alert()).toBeNull();
      m.unmount();
    }
  });
});

describe("ShellPort.openLink (T18, déc. 38)", () => {
  const web = (open: WebShellWindow["open"]) =>
    createWebShell({ confirm: () => true, alert: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, document: { title: "" }, open });
  it("navigateur : javascript: jamais ouvert ; https et mailto dans un onglet neuf, sans opener", () => {
    const open = vi.fn();
    const shell = web(open);
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", " https://example.org"]) shell.openLink?.(bad);
    expect(open).not.toHaveBeenCalled();
    shell.openLink?.("https://example.org");
    shell.openLink?.("mailto:a@example.org");
    expect(open.mock.calls).toEqual([["https://example.org", "_blank", "noopener"], ["mailto:a@example.org", "_blank", "noopener"]]);
  });
  it("coque : commande open_link de roomboard-shell, jamais plugin:opener", async () => {
    const invoke = vi.fn(() => Promise.resolve());
    await openLink({ invoke, listen: () => Promise.resolve(() => undefined) } as unknown as TauriIpc, "https://example.org");
    expect(invoke.mock.calls).toEqual([["open_link", { url: "https://example.org" }]]);
  });
  it("navigateur : window.open rend null avec noopener (norme HTML) : ouverture réussie, aucune alerte", () => {
    const alert = vi.fn();
    const shell = createWebShell({ confirm: () => true, alert, addEventListener: () => undefined, removeEventListener: () => undefined, document: { title: "" }, open: () => null });
    shell.openLink?.("https://example.org");
    expect(alert).not.toHaveBeenCalled();
  });
  it("navigateur : window.open lève une exception : l'utilisateur en est averti", () => {
    const alert = vi.fn();
    const shell = createWebShell({
      confirm: () => true, alert, addEventListener: () => undefined, removeEventListener: () => undefined, document: { title: "" },
      open: () => { throw new Error("blocked"); },
    });
    shell.openLink?.("https://example.org");
    expect(alert).toHaveBeenCalledWith(LINK_OPEN_FAILED);
  });
  it("coque : la commande échoue : l'utilisateur en est averti, par le message de la coque", async () => {
    const message = vi.fn(() => Promise.resolve());
    const shell = createTauriShell({ message } as never, {} as never, () => false, () => Promise.reject(new Error("boom")));
    shell.openLink?.("https://example.org");
    await vi.waitFor(() => expect(message).toHaveBeenCalledTimes(1));
    expect(message.mock.calls[0]).toEqual([LINK_OPEN_FAILED, expect.objectContaining({ kind: "error" })]);
  });
  it("coque : http, https, mailto seulement, avant la commande", () => {
    const openUrl = vi.fn((_url: string) => Promise.resolve());
    const shell = createTauriShell({} as never, {} as never, () => false, openUrl);
    shell.openLink?.("javascript:alert(1)");
    shell.openLink?.("file:///etc/passwd");
    shell.openLink?.("https://example.org");
    expect(openUrl.mock.calls).toEqual([["https://example.org"]]);
  });
});

describe("checkLink : caractères interdits (T41)", () => {
  it("espace, guillemet, chevrons, antislash : message dédié, non celui du schéma", () => {
    for (const bad of ["https://exemple.org/a b", 'https://exemple.org/"x', "https://exemple.org/<x", "https://exemple.org/>x", "https://exemple.org/a\\b"]) {
      expect(checkLink(bad)).toEqual({ ok: false, message: LINK_BAD_CHARS });
    }
    expect(LINK_BAD_CHARS).toContain("%20");
  });
  it("mauvais schéma : le message du schéma", () => {
    expect(checkLink("ftp://exemple.org")).toEqual({ ok: false, message: LINK_REFUSED });
  });
});
