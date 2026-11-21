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
  it("chargement : « Chargement… », boutons grisés ; aucun message sans texte", () => {
    const a = setup("chargement");
    expect(a.q("status")!.textContent).toBe(LOADING_LABEL);
    expect((a.q("orbit") as HTMLButtonElement).disabled).toBe(true);
    expect(a.q("message")).toBeNull();
  });
});
