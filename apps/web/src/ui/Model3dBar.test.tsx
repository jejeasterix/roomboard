// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOADING_LABEL, Model3dBar, type Model3dBarStatus } from "./Model3dBar";

afterEach(cleanup);

function setup(status: Model3dBarStatus = "instantane", message: string | null = null) {
  const toggle = vi.fn();
  const reset = vi.fn();
  const r = render(() => <Model3dBar name="cube.glb" controls={{ status: () => status, message: () => message, toggle, reset }} />);
  const q = <T extends Element>(k: string): T | null => r.container.querySelector<T>(`[data-model3d="${k}"]`);
  return { ...r, toggle, reset, q };
}

describe("Model3dBar (C15, X24)", () => {
  it("rôle et libellé ; nom ; Tourner et Vue initiale, libellés en toutes lettres", () => {
    const a = setup();
    const root = a.container.querySelector("[data-model3d-bar]")!;
    expect([root.getAttribute("role"), root.getAttribute("aria-label")]).toEqual(["group", "Commandes de l'objet 3D"]);
    expect([a.q("name")!.textContent, a.q("orbit")!.textContent, a.q("reset")!.textContent]).toEqual(["cube.glb", "Tourner", "Vue initiale"]);
  });
  it("Tourner : aria-pressed vrai en orbite, faux sinon ; un clic = un toggle", () => {
    const a = setup("orbite");
    expect(a.q("orbit")!.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(a.q("orbit")!);
    expect(a.toggle).toHaveBeenCalledTimes(1);
    cleanup();
    expect(setup("instantane").q("orbit")!.getAttribute("aria-pressed")).toBe("false");
  });
  it("Vue initiale : un clic = un reset", () => {
    const a = setup();
    fireEvent.click(a.q("reset")!);
    expect(a.reset).toHaveBeenCalledTimes(1);
  });
  it("sans WebGL : Tourner et Vue initiale grisés, message affiché (S5, X26)", () => {
    const a = setup("sans-webgl", "3D indisponible sur ce poste : l'objet garde son image");
    expect([(a.q("orbit") as HTMLButtonElement).disabled, (a.q("reset") as HTMLButtonElement).disabled]).toEqual([true, true]);
    expect(a.q("message")!.textContent).toBe("3D indisponible sur ce poste : l'objet garde son image");
  });
  it("C3 : échec : « Tourner » reste actif (nouvel essai, un clic = un toggle), « Vue initiale » grisée, message affiché", () => {
    const a = setup("echec", "objet 3D illisible sur ce poste : il garde son image");
    const orbit = a.q("orbit") as HTMLButtonElement;
    expect([orbit.disabled, (a.q("reset") as HTMLButtonElement).disabled]).toEqual([false, true]);
    orbit.click();
    expect(a.toggle).toHaveBeenCalledTimes(1);
    expect(a.q("message")!.textContent).toBe("objet 3D illisible sur ce poste : il garde son image");
  });
  it("chargement : « Chargement… », boutons grisés ; aucun message sans texte", () => {
    const a = setup("chargement");
    expect(a.q("status")!.textContent).toBe(LOADING_LABEL);
    expect((a.q("orbit") as HTMLButtonElement).disabled).toBe(true);
    expect(a.q("message")).toBeNull();
  });
});

describe("Model3dBar (OG34) : design des îlots et raccourcis", () => {
  it("icônes Lucide : rotate-3d pour Tourner, scan pour Vue initiale", () => {
    const { q } = setup();
    expect([q("orbit")!.querySelector("svg")!.getAttribute("data-icon"), q("reset")!.querySelector("svg")!.getAttribute("data-icon")]).toEqual(["rotate-3d", "scan"]);
  });
  it("raccourcis dans la barre : T tourne, V revient à la vue initiale ; arrêtés à la barre", () => {
    const { container, toggle, reset } = setup();
    const root = container.querySelector<HTMLElement>("[data-model3d-bar]")!;
    const outside = vi.fn();
    window.addEventListener("keydown", outside);
    fireEvent.keyDown(root, { key: "t" });
    fireEvent.keyDown(root, { key: "v" });
    window.removeEventListener("keydown", outside);
    expect([toggle.mock.calls.length, reset.mock.calls.length]).toEqual([1, 1]);
    expect(outside).not.toHaveBeenCalled();
  });
  it("raccourcis grisés comme leurs boutons (sans WebGL)", () => {
    const { container, toggle, reset } = setup("sans-webgl");
    const root = container.querySelector<HTMLElement>("[data-model3d-bar]")!;
    fireEvent.keyDown(root, { key: "t" });
    fireEvent.keyDown(root, { key: "v" });
    expect([toggle.mock.calls.length, reset.mock.calls.length]).toEqual([0, 0]);
  });
});
