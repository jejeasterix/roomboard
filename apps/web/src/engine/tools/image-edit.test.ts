import { describe, expect, it } from "vitest";
import { dragFrame } from "./image-edit";

const from = { x0: 10, y0: 10, x1: 110, y1: 60 };
describe("cadre de rognage (I28)", () => {
  it("poignée sud-est : bords est et sud, bornés à l'image", () => {
    expect(dragFrame({ handle: "se", start: [110, 60], from }, -40, -30, 200, 100)).toEqual({ x0: 10, y0: 10, x1: 70, y1: 30 });
    expect(dragFrame({ handle: "se", start: [110, 60], from }, 500, 500, 200, 100)).toEqual({ x0: 10, y0: 10, x1: 200, y1: 100 });
    expect(dragFrame({ handle: "nw", start: [10, 10], from }, -50, -50, 200, 100)).toEqual({ x0: 0, y0: 0, x1: 110, y1: 60 });
  });
  it("intérieur : déplacement borné à l'image", () => {
    expect(dragFrame({ handle: "move", start: [50, 30], from }, 500, -500, 200, 100)).toEqual({ x0: 100, y0: 0, x1: 200, y1: 50 });
  });
  it("jamais moins d'une unité", () => {
    expect(dragFrame({ handle: "e", start: [110, 30], from }, -500, 0, 200, 100)).toEqual({ x0: 10, y0: 10, x1: 11, y1: 60 });
    expect(dragFrame({ handle: "n", start: [60, 10], from }, 0, 500, 200, 100)).toEqual({ x0: 10, y0: 59, x1: 110, y1: 60 });
  });
});
