// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { mountAnnotationFrame } from "./annotation-page";

afterEach(() => {
  for (const el of document.querySelectorAll(".rb-annot-frame")) el.remove();
  delete document.documentElement.dataset["cadre"];
});

describe("cadre de la fenêtre annotate (design-l4, L4-12)", () => {
  it("L4-12 : un div.rb-annot-frame caché aux lecteurs d'écran, dans body ; data-cadre suit l'appel", () => {
    const set = mountAnnotationFrame(document);
    const els = document.querySelectorAll(".rb-annot-frame");
    expect(els).toHaveLength(1);
    expect(els[0]!.getAttribute("aria-hidden")).toBe("true");
    expect(els[0]!.parentElement).toBe(document.body);
    set(true);
    expect(document.documentElement.dataset["cadre"]).toBe("1");
    set(false);
    expect(document.documentElement.dataset["cadre"]).toBe("0");
  });
});
