// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createEraserRing } from "./eraser-ring";

afterEach(() => {
  document.body.innerHTML = "";
});

function setup() {
  const stage = document.createElement("div");
  document.body.append(stage);
  const queued: (() => void)[] = [];
  const ring = createEraserRing(stage, (cb) => void queued.push(cb));
  const flush = (): void => {
    for (const cb of queued.splice(0)) cb();
  };
  const el = (): HTMLElement | null => stage.querySelector<HTMLElement>(".rb-eraser-ring");
  return { ring, flush, el, queued };
}

describe("anneau de la gomme automatique (OG25, déc. 24, A4)", () => {
  it("OG25 anneau : posé caché dans la scène, hors de l'arbre d'accessibilité", () => {
    const { el } = setup();
    expect(el()?.hidden).toBe(true);
    expect(el()?.getAttribute("aria-hidden")).toBe("true");
  });
  it("OG25 anneau : une écriture par image, au dernier cercle demandé ; px entiers, diamètre = 2 × rayon", () => {
    const { ring, flush, el, queued } = setup();
    ring.show({ x: 100, y: 200, radius: 30 });
    ring.show({ x: 110.4, y: 205.6, radius: 70 });
    expect(queued).toHaveLength(1);
    expect(el()?.hidden).toBe(true);
    flush();
    const e = el()!;
    expect(e.hidden).toBe(false);
    expect(e.style.width).toBe("140px");
    expect(e.style.height).toBe("140px");
    expect(e.style.transform).toBe("translate(40px, 136px)");
    expect(e.dataset["rayon"]).toBe("70");
  });
  it("OG25 anneau : show(null) le cache à l'image suivante ; dispose le retire, plus aucune écriture", () => {
    const { ring, flush, el } = setup();
    ring.show({ x: 50, y: 50, radius: 24 });
    flush();
    ring.show(null);
    flush();
    expect(el()?.hidden).toBe(true);
    expect(el()?.dataset["rayon"]).toBeUndefined();
    ring.show({ x: 50, y: 50, radius: 24 });
    ring.dispose();
    expect(() => flush()).not.toThrow();
    expect(el()).toBeNull();
  });
});
