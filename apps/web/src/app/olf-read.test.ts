import { describe, expect, it } from "vitest";
import { MAX_POINTS, MAX_SPANS, type BoardObject } from "./board-io";
import { BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, boardFirstPagesMessage } from "./board-files";
import { OLF_BROKEN_MESSAGE, olfColor, olfMatrix, readOlf } from "./olf-read";

/** Fichiers fabriqués ici (G8) : forme relevée sur les exemples myViewBoard, `{ olf: { pageset: [{ page }] } }`. */
type El = Record<string, Record<string, unknown>>;
const page = (elements: El[], extra: Record<string, unknown> = {}): unknown => ({
  page: { viewbox: "0 0 3840 2160", matrix: "1,0,0,0,1,0,0,0,1", elements, backgrounds: [], ...extra },
});
const olf = (pages: unknown[], extra: Record<string, unknown> = {}): string => JSON.stringify({ olf: { width: 3840, height: 2160, pageset: pages, ...extra } });
const stroke = (extra: Record<string, unknown> = {}): El => ({
  stroke: { points: "10,20 30,40", stroke: "#000000", "pen-width": 9, "is-highlighter": false, matrix: "1,0,0,0,1,0,0,0,1", ...extra },
});
const only = (json: string): BoardObject => {
  const { pages } = readOlf(json);
  expect(pages).toHaveLength(1);
  expect(pages[0]!.objects).toHaveLength(1);
  return pages[0]!.objects[0]!;
};
const mOf = (o: BoardObject): readonly number[] => (o.kind === "group" ? [] : o.m);

describe("readOlf (C13 lot 2, N8, N9, DA3)", () => {
  it("C13 N9 : matrice lue par lignes", () => {
    // `a,c,e,b,d,f,0,0,1` : translation en 3e et 6e place, viewbox 3840 → échelle 0,5.
    expect(mOf(only(olf([page([stroke({ matrix: "1,0,-10,0,1,-480,0,0,1" })])])))).toEqual([0.5, 0, 0, 0.5, -5, -240]);
    // Rotation (b ≠ c) : seule une lecture par lignes rend b = 1 et c = -1 ; par colonnes, b et c seraient échangés.
    expect(mOf(only(olf([page([stroke({ matrix: "0,-1,100,1,0,50,0,0,1" })])])))).toEqual([0, 0.5, -0.5, 0, 50, 25]);
    expect(olfMatrix("0,-1,100,1,0,50,0,0,1", 1)).toEqual([0, 1, -1, 0, 100, 50]);
    expect(olfMatrix(undefined, 2)).toEqual([2, 0, 0, 2, 0, 0]);
    expect(olfMatrix("1,0,x,0,1,0,0,0,1", 1)).toBeNull();
    expect(olfMatrix("1,0,0", 1)).toBeNull();
  });

  it("C13 S2 : trait avec matrice à l'échelle 1920", () => {
    expect(only(olf([page([stroke()])]))).toEqual({ kind: "stroke", m: [0.5, 0, 0, 0.5, 0, 0], color: "#000000", width: 9, points: [10, 20, 1, 30, 40, 1] });
    // Viewbox à virgules (exemples réels) : 1920 de large → échelle 1.
    expect(mOf(only(olf([page([stroke()], { viewbox: "0,0,1920,1080" })])))).toEqual([1, 0, 0, 1, 0, 0]);
    // Sans viewbox de page : repli `olf.width`, puis 1920.
    expect(mOf(only(olf([page([stroke()], { viewbox: undefined })], { width: 960 })))).toEqual([2, 0, 0, 2, 0, 0]);
    expect(mOf(only(olf([page([stroke()], { viewbox: undefined })], { width: undefined })))).toEqual([1, 0, 0, 1, 0, 0]);
    // `#AARRGGBB` : alpha ignoré.
    const argb = only(olf([page([stroke({ stroke: "#80FF0000" })])]));
    expect(argb.kind === "stroke" && argb.color).toBe("#ff0000");
  });

  it("C13 S2 : image avec matrice", () => {
    const img = { image: { source: "images/a.png", "mime-type": "image/png", x: 1, y: 2, width: 294, height: 300, matrix: "0.5,0,848,0,0.5,427,0,0,1" } };
    expect(only(olf([page([img], { viewbox: "0 0 1920 1080" })]))).toEqual({ kind: "image", m: [0.5, 0, 0, 0.5, 848, 427], x: 1, y: 2, w: 294, h: 300, path: "images/a.png" });
  });

  it("C13 S2 : zone de texte à deux paragraphes", () => {
    const seg = (t: Record<string, unknown>): unknown => ({ text: t });
    const textarea = {
      textarea: {
        x: 10,
        y: 20,
        width: 300,
        height: 100,
        matrix: "1,0,0,0,1,0,0,0,1",
        "custom-data-tag": "RTFxamlStr_UWP",
        "custom-data": "<FlowDocument><Run>NE PAS LIRE</Run></FlowDocument>",
        "text-blocks-container": [
          {
            paragraph: {
              "font-size": 64,
              "text-list-container": [
                seg({ text: "Piano", "font-size": 64, "font-weight": "bold", "font-style": "normal", "text-decoration": "underline", "font-family": "Calibri", fill: "#FF000000" }),
              ],
            },
          },
          {
            paragraph: {
              "text-list-container": [
                seg({ text: "Keys", "font-size": 32, "font-weight": "normal", "font-style": "italic", "text-decoration": "normal", "font-family": "Verdana", fill: "#FFFF0000" }),
              ],
            },
          },
        ],
      },
    };
    expect(only(olf([page([textarea], { viewbox: "0 0 1920 1080" })]))).toEqual({
      kind: "text",
      m: [1, 0, 0, 1, 0, 0],
      x: 10,
      y: 20,
      boxWidth: 300,
      boxHeight: 100,
      size: 64,
      color: "#000000",
      spans: [
        { text: "Piano", attrs: { bold: true, underline: true, color: "#000000", size: 64, font: "Calibri" } },
        { text: "\n", attrs: {} },
        { text: "Keys", attrs: { italic: true, color: "#ff0000", size: 32, font: "Verdana" } },
      ],
    });
    // Poids numérique ≥ 600 : gras ; sans segment lisible : taille 24 et noir.
    const heavy = only(olf([page([{ textarea: { x: 0, y: 0, width: 10, height: 10, "text-blocks-container": [{ paragraph: { "text-list-container": [seg({ text: "A", "font-weight": 700 })] } }] } }])]));
    expect(heavy.kind === "text" && heavy.spans).toEqual([{ text: "A", attrs: { bold: true } }]);
    expect(heavy.kind === "text" && [heavy.size, heavy.color]).toEqual([24, "#000000"]);
  });

  it("C13 S2 : fond couleur", () => {
    const { pages, warnings } = readOlf(olf([page([], { backgrounds: [{ background: { type: "color", fill: "#FFFFFF", opacity: 1 } }] })]));
    expect(pages).toEqual([{ background: "#ffffff", objects: [] }]);
    expect(warnings).toEqual([]);
  });

  it("C13 S2 : widget non lu", () => {
    const widget = { "widget-player": { source: "https://myviewboard.com/x", x: 0, y: 0, width: 10, height: 10, matrix: "1,0,0,0,1,0,0,0,1" } };
    const { pages, warnings } = readOlf(olf([page([widget]), page([widget, stroke({ "is-highlighter": true }), widget])]));
    expect(pages.map((p) => p.objects.length)).toEqual([0, 1]);
    // Comptés par (page, sorte), ordre de première apparition, singulier et pluriel.
    expect(warnings).toEqual(["page 1 : 1 widget non lu", "page 2 : 2 widgets non lus", "page 2 : 1 surligneur rendu en trait"]);
  });

  it("C13 N9 : type inconnu averti", () => {
    const { pages, warnings } = readOlf(olf([page([{ hologram: { x: 0 } }, { hologram: {} }, { video: {} }])]));
    expect(pages[0]!.objects).toEqual([]);
    expect(warnings).toEqual(["page 1 : 3 objets d'un type non lu"]);
  });

  it("C13 N9 : surligneur averti", () => {
    const { pages, warnings } = readOlf(olf([page([stroke({ "is-highlighter": true })])]));
    expect(pages[0]!.objects.map((o) => o.kind)).toEqual(["stroke"]);
    expect(warnings).toEqual(["page 1 : 1 surligneur rendu en trait"]);
  });

  it("C13 N9 : page masquée lue et avertie", () => {
    const { pages, warnings } = readOlf(olf([page([stroke()], { "is-hidden": false }), page([stroke()], { "is-hidden": true })]));
    expect(pages.map((p) => p.objects.length)).toEqual([1, 1]);
    expect(warnings).toEqual(["page 2 : 1 page masquée importée"]);
  });

  it("C13 N9 : fond image en bas de pile", () => {
    const { pages, warnings } = readOlf(
      olf([
        page([stroke()], {
          backgrounds: [{ background: { type: "image", "image-source": "images/fond.png", opacity: 1 } }, { background: { type: "gradient" } }],
        }),
      ]),
    );
    expect(pages[0]!.objects[0]).toEqual({ kind: "image", m: [0.5, 0, 0, 0.5, 0, 0], x: 0, y: 0, w: 3840, h: 2160, path: "images/fond.png" });
    expect(pages[0]!.objects.map((o) => o.kind)).toEqual(["image", "stroke"]);
    expect(pages[0]!.background).toBeNull();
    expect(warnings).toEqual(["page 1 : 1 fond non lu"]);
  });

  it("C13 N9 : matrice de page ignorée", () => {
    // `page.matrix` est la caméra : l'élément ne garde que sa propre matrice (ici, la même que celle de la page).
    const cam = "1,0,-10,0,1,-480,0,0,1";
    expect(mOf(only(olf([page([stroke()], { matrix: cam })])))).toEqual([0.5, 0, 0, 0.5, 0, 0]);
    expect(mOf(only(olf([page([stroke({ matrix: cam })], { matrix: cam })])))).toEqual([0.5, 0, 0, 0.5, -5, -240]);
  });

  it("C13 N9 : couleur #RRGGBB ou #AARRGGBB", () => {
    expect(olfColor("#FF000000")).toBe("#000000");
    expect(olfColor(" #ABCDEF ")).toBe("#abcdef");
    expect(olfColor("#FFFFFFFF")).toBe("#ffffff");
    expect(olfColor("red")).toBeNull();
    expect(olfColor("#12345")).toBeNull();
    expect(olfColor(3)).toBeNull();
  });

  it("C13 N9 : 500 premières pages", () => {
    // `total` (pages avant la coupe) : l'avis `boardFirstPagesMessage(total)` est écrit par la page (T8), comme au lot 1.
    const cut = readOlf(olf(Array.from({ length: 501 }, () => page([]))));
    expect(cut.pages).toHaveLength(500);
    expect(cut.total).toBe(501);
    expect(cut.warnings).toEqual([]);
    expect(boardFirstPagesMessage(cut.total)).toBe("500 premières pages importées sur 501");
    expect(readOlf(olf([page([]), page([])])).total).toBe(2);
  });

  it("C13 N13 : image distante jamais chargée", () => {
    const sources = ["http://x/a.png", "https://x/a.png", "file:///a.png", "data:image/png;base64,AAAA", "/abs/a.png", "../a.png", "images/../../a.png"];
    const els = sources.map((source) => ({ image: { source, x: 0, y: 0, width: 10, height: 10 } }));
    const { pages, warnings } = readOlf(olf([page(els, { backgrounds: [{ background: { type: "image", "image-source": "http://x/fond.png" } }] })]));
    expect(pages[0]!.objects).toEqual([]);
    expect(warnings).toEqual(["page 1 : 8 images distantes ou hors de l'archive non chargées"]);
  });

  it("C13 S3 : content.json invalide", () => {
    for (const json of ["{", "", "[]", "null", '{"olf":1}', '{"olf":{}}', '{"olf":{"pageset":{}}}']) {
      expect(() => readOlf(json), json).toThrowError(new Error(OLF_BROKEN_MESSAGE));
    }
    // Champs absurdes : objet illisible, jamais une exception.
    const { pages, warnings } = readOlf(
      olf([page([stroke({ points: "1,2" }), stroke({ "pen-width": "x" }), stroke({ stroke: "bleu" }), stroke({ matrix: "1,0" }), { image: { source: "a.png", x: "0" } }])]),
    );
    expect(pages[0]!.objects).toEqual([]);
    expect(warnings).toEqual(["page 1 : 5 objets illisibles ignorés"]);
  });

  it("C13 N13 : JSON très imbriqué", () => {
    // JSON valide et profond : à la racine, fichier endommagé (pile dépassée ou racine illisible), jamais une autre erreur.
    const deep = (n: number): string => `${"[".repeat(n)}${"]".repeat(n)}`;
    expect(() => readOlf(deep(1e6))).toThrowError(new Error(OLF_BROKEN_MESSAGE));
    expect(() => readOlf(`{"olf":{"pageset":[]},"x":${deep(1e6)}}`)).not.toThrowError(RangeError);
    // Profond dans un champ lu : objet illisible, pas d'exception.
    const inner = JSON.parse(olf([page([stroke()])])) as { olf: { pageset: Array<{ page: { elements: unknown[] } }> } };
    const json = JSON.stringify(inner).replace('"points":"10,20 30,40"', `"points":${deep(1e4)}`);
    const { pages, warnings } = readOlf(json);
    expect(pages[0]!.objects).toEqual([]);
    expect(warnings).toEqual(["page 1 : 1 objet illisible ignoré"]);
  });

  it("C13 N13 : 100 001 objets refusés", () => {
    const strokes = (n: number): El[] => Array.from({ length: n }, () => stroke());
    expect(() => readOlf(olf([page(strokes(BOARD_MAX_OBJECTS + 1))]))).toThrowError(new Error(BOARD_OBJECTS_MESSAGE));
    // Le fond image compte comme un objet.
    const bg = { backgrounds: [{ background: { type: "image", "image-source": "f.png" } }] };
    expect(() => readOlf(olf([page(strokes(BOARD_MAX_OBJECTS), bg)]))).toThrowError(new Error(BOARD_OBJECTS_MESSAGE));
    expect(readOlf(olf([page(strokes(BOARD_MAX_OBJECTS))])).pages[0]!.objects).toHaveLength(BOARD_MAX_OBJECTS);
  });

  it("C13 N13 : trait de plus de MAX_POINTS points illisible", () => {
    const pts = (n: number): string => Array.from({ length: n }, (_, i) => `${i % 7},1`).join(" ");
    const { pages, warnings } = readOlf(olf([page([stroke({ points: pts(MAX_POINTS + 1) }), stroke({ points: pts(2) })])]));
    expect(pages[0]!.objects).toHaveLength(1);
    expect(warnings).toEqual(["page 1 : 1 objet illisible ignoré"]);
  });

  it("C13 N13 : texte de plus de MAX_SPANS segments illisible", () => {
    const segs = (n: number): unknown[] => Array.from({ length: n }, () => ({ text: { text: "a" } }));
    const box = (n: number): El => ({ textarea: { x: 0, y: 0, width: 10, height: 10, "text-blocks-container": [{ paragraph: { "text-list-container": segs(n) } }] } });
    const { pages, warnings } = readOlf(olf([page([box(MAX_SPANS + 1), box(MAX_SPANS)])]));
    expect(pages[0]!.objects).toHaveLength(1);
    expect(warnings).toEqual(["page 1 : 1 objet illisible ignoré"]);
  });
});
