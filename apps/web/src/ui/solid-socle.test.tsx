// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { Socle } from "./Socle";

afterEach(cleanup);

describe("socle SolidJS (T82)", () => {
  it("monte un composant Solid", () => {
    const { container } = render(() => <Socle label="Essai" />);
    expect(container.querySelector("button[data-socle]")?.textContent).toBe("Essai 0");
  });

  it("un signal met le bouton à jour au clic", () => {
    const { container } = render(() => <Socle label="Essai" />);
    const b = container.querySelector("button");
    if (!b) throw new Error("bouton absent");
    fireEvent.click(b);
    expect(b.textContent).toBe("Essai 1");
  });
});
