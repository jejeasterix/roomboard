import { describe, expect, it } from "vitest";
import type { GridInput } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { dropTarget, layerRows, stepTarget } from "./layer-list";

const STYLE = { color: "#000000", width: 4 };
const GRID: GridInput = {
  visible: true,
  snap: false,
  above: false,
  levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }],
};

function scene() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0]!;
  const shape = (kind: "rect" | "ellipse", x: number): string =>
    doc.apply({ type: "AddShape", page, shape: kind, x0: x, y0: 0, x1: x + 50, y1: 50, style: STYLE, fill: null }).ids[0]!;
  const text = (content: string): string =>
    doc.apply({ type: "SetText", page, id: null, x: 0, y: 200, content, color: "#000000", size: 24, boxWidth: 200, boxHeight: 40 } as never).ids[0]!;
  return { doc, page, shape, text };
}

describe("layerRows (calques, décision 17)", () => {
  it("premier plan d'abord : la dernière forme posée est la première ligne, « Fond de la page » en bas", () => {
    const { doc, page, shape } = scene();
    const a = shape("rect", 0);
    const b = shape("ellipse", 10);
    const rows = layerRows(doc, page);
    expect(rows.map((r) => r.ids)).toEqual([[b], [a], []]);
    expect(rows.map((r) => r.label)).toEqual(["Ellipse", "Rectangle", "Fond de la page"]);
    expect(rows.map((r) => r.fixed)).toEqual([false, false, true]);
  });
  it("groupe = une ligne « Groupe (n) » portant tous ses membres", () => {
    const { doc, page, shape } = scene();
    const a = shape("rect", 0);
    const b = shape("ellipse", 10);
    const c = shape("rect", 300);
    doc.apply({ type: "Group", ids: [a, b] });
    const rows = layerRows(doc, page);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ ids: [c], label: "Rectangle", kind: "shape", fixed: false });
    expect(rows[1]).toMatchObject({ ids: [a, b], label: "Groupe (2)", kind: "group", fixed: false });
    expect(rows[2]).toMatchObject({ kind: "backdrop", fixed: true });
  });
  it("grille selon above : au-dessus de tout (above) ou juste au-dessus du fond", () => {
    const { doc, page, shape } = scene();
    shape("rect", 0);
    doc.apply({ type: "SetGrid", page, grid: GRID });
    expect(layerRows(doc, page).map((r) => r.label)).toEqual(["Rectangle", "Grille", "Fond de la page"]);
    doc.apply({ type: "SetGrid", page, grid: { ...GRID, above: true } });
    const rows = layerRows(doc, page);
    expect(rows.map((r) => r.label)).toEqual(["Grille", "Rectangle", "Fond de la page"]);
    expect(rows[0]).toMatchObject({ kind: "grid", fixed: true, ids: [] });
  });
  it("fond en bas : seul, sur une page vide ; un texte se nomme par son contenu", () => {
    const { doc, page, text } = scene();
    expect(layerRows(doc, page).map((r) => r.label)).toEqual(["Fond de la page"]);
    text("Bonjour la classe");
    expect(layerRows(doc, page).map((r) => r.label)).toEqual(["Texte : Bonjour la classe", "Fond de la page"]);
  });
});

describe("dropTarget et stepTarget (rang pour Restack)", () => {
  it("glisser la ligne du bas en haut : le bloc monte au sommet de la pile", () => {
    const { doc, page, shape } = scene();
    const a = shape("rect", 0);
    shape("ellipse", 10);
    shape("rect", 20);
    // lignes (haut → bas) : c, b, a ; `a` (rang 2) lâchée au rang 0 : tout en haut → bas du bloc au rang 2.
    expect(dropTarget(doc, page, a, 0)).toEqual({ ids: [a], to: 2 });
    expect(dropTarget(doc, page, a, 2)).toBeNull();
  });
  it("glisser un groupe sous une ligne : bloc complet, rang du bas = 0", () => {
    const { doc, page, shape } = scene();
    const a = shape("rect", 0);
    const b = shape("ellipse", 10);
    const c = shape("rect", 20);
    doc.apply({ type: "Group", ids: [b, c] });
    const key = layerRows(doc, page)[0]!.key;
    expect(dropTarget(doc, page, key, 1)).toEqual({ ids: [b, c], to: 0 });
    expect(a).toBeTruthy();
  });
  it("stepTarget : monter d'un rang, descendre d'un rang, refus aux extrémités", () => {
    const { doc, page, shape } = scene();
    const a = shape("rect", 0);
    const b = shape("ellipse", 10);
    const c = shape("rect", 20);
    expect(stepTarget(doc, page, [a], "up")).toBe(1);
    expect(stepTarget(doc, page, [b], "down")).toBe(0);
    expect(stepTarget(doc, page, [c], "up")).toBeNull();
    expect(stepTarget(doc, page, [a], "down")).toBeNull();
    expect(stepTarget(doc, page, [], "up")).toBeNull();
  });
});
