import { describe, expect, it } from "vitest";
import { fakeCore } from "../core/fake-core";
import { linkedNodeIn } from "./flow-nav";

const PEN = { color: "#000000", width: 4 } as const;

function scene() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0]!;
  const rect = (x0: number, y0: number, x1: number, y1: number): string =>
    doc.apply({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: PEN, fill: null }).ids[0] ?? "";
  const link = (a: string | null, b: string | null): string => {
    const id = doc.apply({ type: "AddShape", page, shape: "arrow", x0: 0, y0: 0, x1: 10, y1: 0, style: PEN, fill: null }).ids[0] ?? "";
    doc.apply({ type: "SetLinePoints", id, points: [0, 0, 10, 0], start: a === null ? null : { id: a, fx: 0.5, fy: 0.5 }, end: b === null ? null : { id: b, fx: 0.5, fy: 0.5 } });
    return id;
  };
  return { doc, page, rect, link };
}

describe("linkedNodeIn : objet relié dans une direction (OG33 lot 2b, choix 10)", () => {
  it("B à droite et C en bas : right donne B, down donne C, up rien", () => {
    const { doc, page, rect, link } = scene();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    const c = rect(100, 400, 200, 500);
    link(a, b);
    link(c, a);
    expect(linkedNodeIn(doc, page, a, "right")).toBe(b);
    expect(linkedNodeIn(doc, page, a, "down")).toBe(c);
    expect(linkedNodeIn(doc, page, a, "up")).toBeNull();
    expect(linkedNodeIn(doc, page, a, "left")).toBeNull();
  });
  it("la liaison se lit dans les deux sens : depuis B, left donne A", () => {
    const { doc, page, rect, link } = scene();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    link(a, b);
    expect(linkedNodeIn(doc, page, b, "left")).toBe(a);
  });
  it("flèche liée d'un seul bout, objet voisin non relié, id inconnu : rien", () => {
    const { doc, page, rect, link } = scene();
    const a = rect(100, 100, 200, 200);
    rect(400, 100, 500, 200);
    link(a, null);
    expect(linkedNodeIn(doc, page, a, "right")).toBeNull();
    expect(linkedNodeIn(doc, page, "absent", "right")).toBeNull();
  });
  it("deux objets reliés dans la même direction : le plus proche", () => {
    const { doc, page, rect, link } = scene();
    const a = rect(100, 100, 200, 200);
    const far = rect(800, 100, 900, 200);
    const near = rect(400, 100, 500, 200);
    link(a, far);
    link(a, near);
    expect(linkedNodeIn(doc, page, a, "right")).toBe(near);
  });
});
