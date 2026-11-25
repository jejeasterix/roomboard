// @vitest-environment happy-dom
import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToast, showToast } from "./toast";
import { Toasts } from "./Toasts";

afterEach(() => {
  cleanup();
  clearToast();
  vi.restoreAllMocks();
});

const rect = (width: number): DOMRect =>
  ({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: 56, width, height: 56, toJSON: () => ({}) }) as DOMRect;

describe("bandeau (Toasts, design-l4, L4-16)", () => {
  it("bandeau (Toasts) : vide, un conteneur role=status, aucun .rb-toast", () => {
    const { container } = render(() => <Toasts />);
    expect(container.querySelector(".rb-toasts")?.getAttribute("role")).toBe("status");
    expect(container.querySelector(".rb-toast")).toBeNull();
  });
  it("bandeau (Toasts) : pastille check, texte, puis « page N » en gras ; textContent lisible d'un tenant", () => {
    const { container } = render(() => <Toasts />);
    showToast({ text: "Envoyé au tableau :", strong: "page 2" });
    const t = container.querySelector(".rb-toast")!;
    expect(t.querySelector(".rb-toast-ok svg.rb-icon")?.getAttribute("data-icon")).toBe("check");
    expect(t.querySelector(".rb-toast-ok")?.getAttribute("aria-hidden")).toBe("true");
    expect(t.querySelector("[data-toast-text]")?.textContent).toBe("Envoyé au tableau :");
    expect(t.querySelector("b")?.textContent).toBe("page 2");
    expect(t.textContent).toBe("Envoyé au tableau : page 2");
  });
  it("bandeau (Toasts) : remplacé par le suivant, effacé par clearToast ; sans partie en gras, aucun <b>", () => {
    const { container } = render(() => <Toasts />);
    showToast({ text: "a", strong: "1" });
    showToast({ text: "b" });
    expect(container.querySelectorAll(".rb-toast")).toHaveLength(1);
    expect(container.querySelector(".rb-toast")?.textContent).toBe("b");
    expect(container.querySelector(".rb-toast b")).toBeNull();
    clearToast();
    expect(container.querySelector(".rb-toast")).toBeNull();
  });
  it("bandeau (Toasts) : largeur posée en px entiers (icône calée sur la grille de pixels, § 10)", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect(211.4));
    const { container } = render(() => <Toasts />);
    showToast({ text: "Envoyé au tableau :", strong: "page 2" });
    expect(container.querySelector<HTMLElement>(".rb-toast")!.style.inlineSize).toBe("212px");
  });
  it("bandeau (Toasts) : la valeur posée est l'arrondi supérieur de la largeur de bordure mesurée", () => {
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect");
    const { container } = render(() => <Toasts />);
    for (const [mesure, attendu] of [[180, "180px"], [180.01, "181px"], [99.9, "100px"]] as const) {
      spy.mockReturnValue(rect(mesure));
      showToast({ text: `m${mesure}` });
      expect(container.querySelector<HTMLElement>(".rb-toast")!.style.inlineSize).toBe(attendu);
    }
  });
  it("bandeau (Toasts) : conteneur caché (largeur mesurée 0), aucune largeur posée", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect(0));
    const { container } = render(() => <Toasts />);
    showToast({ text: "Envoyé au tableau :", strong: "page 2" });
    expect(container.querySelector<HTMLElement>(".rb-toast")!.style.inlineSize).toBe("");
  });
});
