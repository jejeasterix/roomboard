import { describe, expect, it } from "vitest";
import type { Change, Command, CoreDocument, TableData, TextSpan } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { fillCommand, type FillDoc, type ImageFillAt } from "./fill-target";
import type { Measure } from "./text-layout";

/** 10 unités par unité UTF-16, à toute taille. */
const ten: Measure = (s) => s.length * 10;
const RED = "#dc2626";
const BLUE = "#2563eb";
const idOf = (c: Change): string => c.ids[0] ?? "";
const tableOf = (d: CoreDocument, id: string): TableData => {
  const e = d.element(id);
  if (e?.kind !== "table") throw new Error("tableau");
  return e.table;
};
const spansOf = (d: CoreDocument, id: string): readonly TextSpan[] => {
  const e = d.element(id);
  return e?.kind === "text" ? e.text.spans : [];
};

/** Rectangle (100, 100)-(300, 200) ; ligne y = 300 ; texte « Le chat noir » en (500, 100) ; tableau 2 × 2 en
 *  (100, 400), « Lundi matin » en (0, 0) ; trait y = 700 ; tout en noir, épaisseur 4. */
function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const style = { color: "#000000", width: 4 };
  const rect = idOf(doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: null }));
  const line = idOf(doc.apply({ type: "AddShape", page, shape: "line", x0: 100, y0: 300, x1: 300, y1: 300, style, fill: null }));
  const text = idOf(doc.apply({ type: "SetText", page, id: null, x: 500, y: 100, content: "Le chat noir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }));
  const table = idOf(doc.apply({ type: "AddTable", page, x: 100, y: 400, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }));
  const t = tableOf(doc, table);
  const r = t.rows.map((x) => x.id);
  const c = t.cols.map((x) => x.id);
  doc.apply({ type: "SetTableCell", id: table, row: r[0] ?? "", col: c[0] ?? "", content: "Lundi matin" });
  const stroke = idOf(doc.apply({ type: "CommitStroke", page, points: new Float32Array([100, 700, 0.5, 200, 700, 0.5, 300, 700, 0.5]), style }));
  const at = (x: number, y: number, color: string | null = RED, zoom = 1): Command | ImageFillAt | null => fillCommand(doc, page, x, y, zoom, color, ten);
  return { doc, page, rect, line, text, table, stroke, r, c, at };
}

describe("cible du pot (C6a)", () => {
  it("forme, centre : intérieur (S1)", () => {
    const s = setup();
    expect(s.at(200, 150)).toEqual({ type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: RED });
  });

  it("forme, à 3 du bord : contour (S2, D5)", () => {
    const s = setup();
    expect(s.at(103, 150)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: s.rect }, color: RED });
  });

  it("tolérance 6 px écran = 6 / zoom (D3) : à 7 du tracé, contour au zoom 1, intérieur au zoom 2", () => {
    const s = setup();
    expect(s.at(106, 150, RED, 1)).toMatchObject({ target: { kind: "edge" } });
    expect(s.at(106, 150, RED, 2)).toMatchObject({ target: { kind: "inside" } });
  });

  it("le bord vient d'edgeHit du cœur, jamais d'un calcul de la page (DA2, GC11)", () => {
    const s = setup();
    const calls: (readonly [string, number, number, number])[] = [];
    let edge = true;
    // Même document, mais un bord décidé ailleurs : au centre « bord », près du tracé « pas bord ».
    const doc: FillDoc = {
      hitTest: (p, x, y, tol) => s.doc.hitTest(p, x, y, tol),
      element: (id) => s.doc.element(id),
      edgeHit: (id, x, y, tol) => {
        calls.push([id, x, y, tol]);
        return edge;
      },
    };
    expect(fillCommand(doc, s.page, 200, 150, 2, RED, ten)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: s.rect }, color: RED });
    expect(calls).toEqual([[s.rect, 200, 150, 3]]);
    edge = false;
    expect(fillCommand(doc, s.page, 103, 150, 1, RED, ten)).toEqual({ type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: RED });
  });

  it("« Aucune » : intérieur retiré ; sur le contour, aucune commande (D11)", () => {
    const s = setup();
    expect(s.at(200, 150, null)).toEqual({ type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: null });
    expect(s.at(103, 150, null)).toBeNull();
  });

  it("ligne et trait : toujours le contour (D5)", () => {
    const s = setup();
    expect(s.at(200, 301)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: s.line }, color: RED });
    expect(s.at(200, 700)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: s.stroke }, color: RED });
  });

  it("« Aucune » sur un trait : aucune commande (D11)", () => {
    expect(setup().at(200, 700, null)).toBeNull();
  });

  it("texte, sur « chat » : FormatText du mot seul (S3, D6)", () => {
    const s = setup();
    const cmd = s.at(535, 110);
    expect(cmd).toEqual({ type: "FormatText", id: s.text, start: 3, len: 4, attrs: { color: RED } });
    s.doc.apply(cmd as Command);
    expect(spansOf(s.doc, s.text)).toEqual([{ text: "Le ", attrs: {} }, { text: "chat", attrs: { color: RED } }, { text: " noir", attrs: {} }]);
  });

  it("« Aucune » sur un mot : FormatText { color: null }, la couleur du mot seul retirée (D11)", () => {
    const s = setup();
    s.doc.apply({ type: "FormatText", id: s.text, start: 0, len: 12, attrs: { color: BLUE } });
    const cmd = s.at(535, 110, null);
    expect(cmd).toEqual({ type: "FormatText", id: s.text, start: 3, len: 4, attrs: { color: null } });
    s.doc.apply(cmd as Command);
    expect(spansOf(s.doc, s.text)).toEqual([{ text: "Le ", attrs: { color: BLUE } }, { text: "chat", attrs: {} }, { text: " noir", attrs: { color: BLUE } }]);
  });

  it("texte, sur l'espace : texte entier (S3, D7)", () => {
    const s = setup();
    expect(s.at(525, 110)).toEqual({ type: "FormatText", id: s.text, start: 0, len: 12, attrs: { color: RED } });
  });

  it("« Aucune » sur l'espace : texte entier, FormatText { color: null } (D7, D11)", () => {
    const s = setup();
    s.doc.apply({ type: "FormatText", id: s.text, start: 3, len: 4, attrs: { color: BLUE } });
    const cmd = s.at(525, 110, null);
    expect(cmd).toEqual({ type: "FormatText", id: s.text, start: 0, len: 12, attrs: { color: null } });
    s.doc.apply(cmd as Command);
    const spans = spansOf(s.doc, s.text);
    expect(spans.map((x) => x.text).join("")).toBe("Le chat noir");
    expect(spans.every((x) => x.attrs.color === undefined)).toBe(true);
  });

  it("bande à gauche d'un texte : ramené dans la boîte, premier mot (D7, HC6-12)", () => {
    const s = setup();
    expect(s.at(497, 110)).toEqual({ type: "FormatText", id: s.text, start: 0, len: 2, attrs: { color: RED } });
  });

  it("bande sous un mot : ramené dans la boîte, mot « chat » sous lequel on clique, pas le texte entier (HC6-12)", () => {
    const s = setup();
    // boîte (500, 100)-(1100, 145) ; y = 148 est à 3 sous le bas, sous la ligne ; x = 550 est sous « chat »
    expect(s.at(550, 148)).toEqual({ type: "FormatText", id: s.text, start: 3, len: 4, attrs: { color: RED } });
  });

  it("mot après un emoji : FormatText accepté par la fausse liaison (bornes UTF-16)", () => {
    const s = setup();
    const id = idOf(s.doc.apply({ type: "SetText", page: s.page, id: null, x: 500, y: 200, content: "😀 été", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }));
    const cmd = s.at(545, 210);
    expect(cmd).toEqual({ type: "FormatText", id, start: 3, len: 3, attrs: { color: RED } });
    expect(() => s.doc.apply(cmd as Command)).not.toThrow();
  });

  it("cellule, sur « matin » : SetTableCell, même contenu, le mot seul coloré (S3, D8)", () => {
    const s = setup();
    const cmd = s.at(183, 418);
    expect(cmd).toEqual({
      type: "SetTableCell", id: s.table, row: s.r[0], col: s.c[0], content: "Lundi matin",
      spans: [{ text: "Lundi ", attrs: {} }, { text: "matin", attrs: { color: RED } }],
    });
    expect(() => s.doc.apply(cmd as Command)).not.toThrow();
  });

  it("cellule vide, marge d'une cellule : remplissage de la cellule (S3, D9, PC10)", () => {
    const s = setup();
    expect(s.at(460, 432)).toEqual({ type: "SetTableFill", id: s.table, row: s.r[0], col: s.c[1], fill: RED });
    expect(s.at(103, 430)).toEqual({ type: "SetTableFill", id: s.table, row: s.r[0], col: s.c[0], fill: RED });
  });

  it("« Aucune » sur une cellule : SetTableFill { fill: null }, remplissage retiré (D9, D11)", () => {
    const s = setup();
    const cell = { row: s.r[0] ?? "", col: s.c[1] ?? "" };
    s.doc.apply({ type: "SetTableFill", id: s.table, ...cell, fill: RED });
    const cmd = s.at(460, 432, null);
    expect(cmd).toEqual({ type: "SetTableFill", id: s.table, ...cell, fill: null });
    s.doc.apply(cmd as Command);
    const after = tableOf(s.doc, s.table).cells.find((x) => x.row === cell.row && x.col === cell.col);
    expect(after?.fill ?? null).toBeNull();
  });

  it("bande sous le tableau : cellule de la dernière ligne (D7, HC6-12)", () => {
    const s = setup();
    expect(s.at(150, 531)).toEqual({ type: "SetTableFill", id: s.table, row: s.r[1], col: s.c[0], fill: RED });
  });

  it("cellule ombrée : SetTableFill, aucun mot (D9, HC6-8)", () => {
    const s = setup();
    const cell = { row: s.r[1] ?? "", col: s.c[0] ?? "" };
    s.doc.apply({ type: "SetTableCell", id: s.table, ...cell, content: "Mardi" });
    s.doc.apply({ type: "SetTableShade", id: s.table, from: cell, to: cell, shade: "#94a3b8" });
    expect(s.at(118, 474)).toEqual({ type: "SetTableFill", id: s.table, ...cell, fill: RED });
  });

  it("cellule couverte : remplissage de l'ancre (D8)", () => {
    const s = setup();
    const a = { row: s.r[0] ?? "", col: s.c[0] ?? "" };
    s.doc.apply({ type: "MergeTableCells", id: s.table, from: a, to: { row: s.r[0] ?? "", col: s.c[1] ?? "" } });
    expect(s.at(460, 432)).toEqual({ type: "SetTableFill", id: s.table, ...a, fill: RED });
  });

  it("image : action ImageFill au pixel source (B5, B19)", () => {
    const s = setup();
    const id = idOf(s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 700, 500] }));
    expect(s.at(750.6, 520.2)).toEqual({ type: "ImageFill", page: s.page, id, seed: [50, 20], color: RED });
    expect(s.at(750.6, 520.2, null)).toEqual({ type: "ImageFill", page: s.page, id, seed: [50, 20], color: null });
  });

  it("image : point de la bande de tolérance hors de la boîte ramené dans l'image (B5, HB16)", () => {
    const s = setup();
    const id = idOf(s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 700, 500] }));
    expect(s.at(803, 550)).toEqual({ type: "ImageFill", page: s.page, id, seed: [99, 50], color: RED });
  });

  it("C8 : rien sous le pointeur : Fill zone à 2 px / zoom ; « Aucune » gardée (Q7, Q10, DA-Z3)", () => {
    const s = setup();
    expect(s.at(1500, 1000)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 1500, y: 1000, tol: 2 }, color: RED });
    expect(s.at(1500, 1000, null)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 1500, y: 1000, tol: 2 }, color: null });
    expect(s.at(1500, 1000, RED, 4)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 1500, y: 1000, tol: 0.5 }, color: RED });
  });

  // D4, D25 : un objet groupé se colore seul. Discrimine : la remontée de C3 (`expandToGroups([hit], …)`, select.ts)
  // viserait le groupe extérieur entier ; b est le membre du milieu de ((rect, b), c), ni le premier ni le dernier.
  it("objet d'un groupe de groupe : le pot vise l'élément touché, jamais son groupe (D4, D25)", () => {
    const s = setup();
    const style = { color: "#000000", width: 4 };
    const add = (x: number): string => idOf(s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: x, y0: 800, x1: x + 200, y1: 900, style, fill: null }));
    const b = add(100);
    const c = add(400);
    s.doc.apply({ type: "Group", ids: [s.rect, b] });
    s.doc.apply({ type: "Group", ids: [s.rect, c] });
    expect(s.doc.element(b)?.group).toHaveLength(2);
    const fillOf = (id: string): string | null | undefined => {
      const e = s.doc.element(id);
      return e?.kind === "shape" ? e.shape.fill : undefined;
    };
    const inside = s.at(200, 850);
    expect(inside).toEqual({ type: "Fill", page: s.page, target: { kind: "inside", id: b }, color: RED });
    expect(s.doc.apply(inside as Command).ids).toEqual([b]);
    expect([fillOf(s.rect), fillOf(b), fillOf(c)]).toEqual([null, RED, null]);
    expect(s.at(102, 850, BLUE)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: b }, color: BLUE });
  });

  // C8 (DA-Z3) : la page ne cherche pas la zone ; elle envoie `Fill zone` et le cœur décide (zone fermée ou fond).
  it("C8 : quatre lignes en carré, clic au centre : Fill zone, décidée par le cœur", () => {
    const s = setup();
    const style = { color: "#000000", width: 4 };
    const seg = (x0: number, y0: number, x1: number, y1: number): void => {
      s.doc.apply({ type: "AddShape", page: s.page, shape: "line", x0, y0, x1, y1, style, fill: null });
    };
    seg(100, 1000, 300, 1000);
    seg(300, 1000, 300, 1200);
    seg(300, 1200, 100, 1200);
    seg(100, 1200, 100, 1000);
    expect(s.at(200, 1100)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 200, y: 1100, tol: 2 }, color: RED });
  });

  // C8 (Q14) : un `fill` touché (dedans, à plus de 6 px du bord) se recolore ; « Aucune » le supprime en une étape.
  it("C8 : fill sous le pointeur : couleur → inside, « Aucune » → Delete", () => {
    const file = new TextEncoder().encode(JSON.stringify({
      now: "2026-11-21T00:00:00Z", appVersion: "0.1.0", assets: {},
      pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements: [{ id: "f1", kind: "fill", transform: [1, 0, 0, 1, 100, 100], fill: { color: "#facc15", w: 400, h: 400, contours: [[0, 0, 400, 0, 400, 400, 0, 400]] } }] }],
    }));
    const doc = fakeCore.load(file);
    expect(fillCommand(doc, "p1", 300, 300, 1, RED, ten)).toEqual({ type: "Fill", page: "p1", target: { kind: "inside", id: "f1" }, color: RED });
    expect(fillCommand(doc, "p1", 300, 300, 1, null, ten)).toEqual({ type: "Delete", ids: ["f1"] });
    expect(fillCommand(doc, "p1", 103, 300, 1, RED, ten)).toEqual({ type: "Fill", page: "p1", target: { kind: "zone", x: 103, y: 300, tol: 2 }, color: RED });
  });

  // HC6-11 : la fausse liaison ne sait pas créer d'élément inconnu ; une liaison factice en rend un sous le pointeur.
  it("élément de genre inconnu sous le pointeur : fond de la page (D1, HC6-11)", () => {
    const unknown = { id: "u1", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "futur", x: 0, y: 0, w: 10, h: 10 } } as unknown as NonNullable<ReturnType<FillDoc["element"]>>;
    const doc: FillDoc = { hitTest: () => "u1", element: () => unknown, edgeHit: () => false };
    expect(fillCommand(doc, "p", 5, 5, 1, RED, ten)).toEqual({ type: "Fill", page: "p", target: { kind: "background" }, color: RED });
  });
});

describe("pot dans une case alignée (D15, DS6)", () => {
  it("D15 : pot sur un mot centré au milieu : le mot dessiné (« matin »), pas celui du coin", () => {
    const m10 = (x: string) => x.length * 10;
    const { doc, page, table, r, c } = setup();
    const cell = { row: r[0] ?? "", col: c[0] ?? "" };
    const colored = (x: number, y: number): string | undefined => {
      const cmd = fillCommand(doc, page, x, y, 1, "#dc2626", m10);
      expect(cmd).toMatchObject({ type: "SetTableCell" });
      return ((cmd as Extract<Command, { type: "SetTableCell" }>).spans ?? []).find((s) => s.attrs.color === "#dc2626")?.text;
    };
    // Centré seul : « Lundi matin » (110) décalé de (224 − 110) / 2 = 57 ; le point local 80 est sur « Lundi » (57..107),
    // alors que la ligne posée au coin y mettrait « matin » (60..110).
    doc.apply({ type: "SetTableLook", id: table, from: cell, to: cell, look: { key: "ha", value: "center" } });
    expect(colored(100 + 8 + 80, 400 + 8 + 20)).toBe("Lundi");
    doc.apply({ type: "SetTableLineSizes", id: table, cols: [], rows: [[r[0] ?? "", 164]] });
    doc.apply({ type: "SetTableLook", id: table, from: cell, to: cell, look: { key: "va", value: "middle" } });
    // Boîte 224 × 148 ; ligne de 110 × 45 décalée de 57 en x, de 51,5 en y ; « matin » en x 100 + 8 + 57 + 60 = 225..275.
    expect(colored(250, 400 + 8 + 51.5 + 20)).toBe("matin");
  });
  it("S12 : pot sur un cache ouvert : le mot (SetTableCell) ; fermé : remplissage (SetTableFill)", () => {
    const m10 = (x: string) => x.length * 10;
    const { doc, page, table, r, c } = setup();
    const cell = { row: r[0] ?? "", col: c[0] ?? "" };
    doc.apply({ type: "SetTableShade", id: table, from: cell, to: cell, shade: "#94a3b8" });
    expect(fillCommand(doc, page, 120, 420, 1, "#dc2626", m10)).toMatchObject({ type: "SetTableFill" });
    doc.apply({ type: "SetTableLook", id: table, from: cell, to: cell, look: { key: "open", value: true } });
    expect(fillCommand(doc, page, 120, 420, 1, "#dc2626", m10)).toMatchObject({ type: "SetTableCell" });
  });
});
