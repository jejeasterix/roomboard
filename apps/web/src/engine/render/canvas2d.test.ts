import { describe, expect, it } from "vitest";
import type { ElementView, TextElement } from "../../core/api";
import { arrowWings } from "../../core/shapes";
import { IDENTITY } from "../camera";
import { PAGE_BACKGROUND, SURROUND_COLOR } from "../page";
import { Canvas2DRenderer, createCanvas2DRenderer, tracePolygons } from "./canvas2d";
import { asCtx, FakeCtx } from "./fake-ctx";
import { EMPTY_OVERLAY } from "./overlay";
import type { SceneSource } from "./renderer";

class FakePath {
  moves = 0;
  lines = 0;
  closes = 0;
  moveTo(): void { this.moves++; }
  lineTo(): void { this.lines++; }
  closePath(): void { this.closes++; }
}

const square = new Float32Array([0, 0, 10, 0, 10, 10, 0, 10]);

function make(outlines: Record<string, Float32Array | null>) {
  const calls: string[] = [];
  const src: SceneSource = {
    element: (id) =>
      id in outlines
        ? { id, kind: "stroke", transform: [1, 0, 0, 1, 5, 6], style: { color: "#000000", width: 4 } }
        : null,
    outline: (id) => {
      calls.push(id);
      return outlines[id] ?? null;
    },
  };
  const scene = new FakeCtx();
  const live = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), asCtx(live), src, { makePath: () => new FakePath() as unknown as Path2D });
  return { r, scene, live, calls, src };
}

describe("Canvas2DRenderer (D19, DA2)", () => {
  it("resize : tampons au devicePixelRatio, échelle exacte tampon / CSS", () => {
    const { r, scene, live } = make({});
    r.resize(1001, 500, 1.5);
    expect([scene.canvas.width, scene.canvas.height, live.canvas.width, live.canvas.height]).toEqual([1502, 750, 1502, 750]);
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set());
    expect(scene.log).toContain(`setTransform ${+(1502 / 1001).toFixed(4)},0,0,1.5,0,0`);
  });

  it("drawScene : pourtour, page blanche, un remplissage par élément à sa transformation", () => {
    const { r, scene } = make({ a: square, b: square });
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: ["a", "b"] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillRect"))).toEqual([`fillRect ${SURROUND_COLOR}`, `fillRect ${PAGE_BACKGROUND}`]);
    expect(scene.log.filter((l) => l.startsWith("fill "))).toEqual(["fill #000000", "fill #000000"]);
    expect(scene.log).toContain("transform 1,0,0,1,5,6");
  });

  it("page dessinée jusqu'au bas de la vue", () => {
    const { r, scene } = make({});
    r.resize(800, 600, 1);
    r.drawScene({ id: "p", elementIds: [] }, { zoom: 1, tx: 0, ty: -5000 }, new Set());
    const fills = scene.log.filter((l) => l.startsWith("fillRect"));
    expect(scene.rects[fills.indexOf(`fillRect ${PAGE_BACKGROUND}`)]).toEqual([0, 0, 1920, 5600]);
  });

  it("drawScene : les éléments masqués (aperçu D38) ne sont pas dessinés", () => {
    const { r, scene } = make({ a: square, b: square });
    r.drawScene({ id: "p", elementIds: ["a", "b"] }, IDENTITY, new Set(["a"]));
    expect(scene.log.filter((l) => l.startsWith("fill "))).toEqual(["fill #000000"]);
  });

  it("Path2D en cache par id, invalidé par Change", () => {
    const { r, calls } = make({ a: square, b: square });
    const page = { id: "p", elementIds: ["a", "b"] };
    r.drawScene(page, IDENTITY, new Set());
    r.drawScene(page, IDENTITY, new Set());
    expect(calls).toEqual(["a", "b"]);
    r.invalidate({ pages: [], ids: ["a"], removed: [], full: false, version: 2 });
    r.drawScene(page, IDENTITY, new Set());
    expect(calls).toEqual(["a", "b", "a"]);
    r.invalidate({ pages: [], ids: [], removed: [], full: true, version: 3 });
    r.drawScene(page, IDENTITY, new Set());
    expect(calls).toEqual(["a", "b", "a", "a", "b"]);
  });

  it("élément sans contour ou inconnu : ignoré sans erreur", () => {
    const { r, scene } = make({ a: null });
    r.drawScene({ id: "p", elementIds: ["a", "inconnu"] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fill "))).toEqual([]);
  });

  it("tracePolygons : une paire NaN sépare deux polygones", () => {
    const p = new FakePath();
    tracePolygons(p, new Float32Array([0, 0, 1, 0, 1, 1, Number.NaN, Number.NaN, 5, 5, 6, 5, 6, 6]));
    expect([p.moves, p.lines, p.closes]).toEqual([2, 4, 2]);
  });

  it("drawLive : efface, puis trait vif rempli et queue prédite tracée", () => {
    const { r, live } = make({});
    r.resize(100, 100, 1);
    r.drawLive(
      { strokes: [{ outline: square, predicted: new Float32Array([10, 10, 14, 12]), color: "#1e40af", width: 4 }], erasers: [] },
      IDENTITY,
    );
    expect(live.log[0]).toBe("setTransform 1,0,0,1,0,0");
    expect(live.log[1]).toBe("clearRect");
    expect(live.log).toContain("fill #1e40af");
    expect(live.log).toContain("stroke #1e40af 4");
  });

  it("drawLive sans aperçu : effacé seulement", () => {
    const { r, live } = make({});
    r.drawLive({ strokes: [], erasers: [] }, IDENTITY);
    expect(live.log).toEqual(["setTransform 1,0,0,1,0,0", "clearRect"]);
  });

  it("gomme partielle : fond de page puis pourtour repeints le long du chemin, largeur 2 × (rayon + demi-épaisseur du stylo)", () => {
    const { r, live } = make({});
    r.resize(100, 100, 1);
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "partial" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([`stroke ${PAGE_BACKGROUND} 16`, `stroke ${SURROUND_COLOR} 16`]);
    expect(live.log.filter((l) => l === "clip")).toHaveLength(2);
  });

  it("gomme d'objet : rien de peint (les traits touchés sont masqués de la scène)", () => {
    const { r, live } = make({});
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "object" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
  });

  it("createCanvas2DRenderer : scène opaque, interaction en desynchronized", () => {
    const opts: unknown[] = [];
    const canvas = (): HTMLCanvasElement =>
      ({
        getContext: (_type: string, o: unknown) => {
          opts.push(o);
          return asCtx(new FakeCtx());
        },
      }) as unknown as HTMLCanvasElement;
    createCanvas2DRenderer(canvas(), canvas(), make({}).src);
    expect(opts).toEqual([{ alpha: false }, { desynchronized: true }]);
  });

  it("sans canvas d'interaction (null) : drawLive ne fait rien, resize ne touche que la scène", () => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: () => null, outline: () => null });
    r.resize(100, 50, 2);
    expect(scene.canvas).toEqual({ width: 200, height: 100 });
    expect(() => r.drawLive({ strokes: [], erasers: [] }, IDENTITY)).not.toThrow();
  });
});

const VIEWS: Record<string, ElementView> = {
  a: { id: "a", kind: "stroke", transform: [1, 0, 0, 1, 5, 6], style: { color: "#000000", width: 4 } },
  r: { id: "r", kind: "shape", transform: [1, 0, 0, 1, 10, 20], style: { color: "#1e40af", width: 4 }, shape: { shape: "rect", w: 200, h: 100, fill: null } },
  e: { id: "e", kind: "shape", transform: [1, 0, 0, 1, 0, 0], style: { color: "#1e40af", width: 4 }, shape: { shape: "ellipse", w: 50, h: 30, fill: "#ff0000" } },
  f: { id: "f", kind: "shape", transform: [1, 0, 0, 1, 0, 0], style: { color: "#1e40af", width: 4 }, shape: { shape: "arrow", w: 100, h: 0, fill: null } },
  t: { id: "t", kind: "text", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 0 }, text: { content: "un deux\ntrois", size: 20, boxWidth: 1000, boxHeight: 50, spans: [{ text: "un deux\ntrois", attrs: {} }] } },
};

function makeViews() {
  const src: SceneSource = { element: (id) => VIEWS[id] ?? null, outline: (id) => (id === "a" ? square : null) };
  const scene = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, { makePath: () => new FakePath() as unknown as Path2D });
  const after = (marker: string): string[] => scene.log.slice(scene.log.indexOf(marker));
  return { r, scene, after };
}

describe("Canvas2DRenderer — lot 4 (formes, texte, calque)", () => {
  it("forme : rectangle tracé dans son repère, contour à l'épaisseur du style, sans remplissage", () => {
    const { r, after } = makeViews();
    r.drawScene({ id: "p", elementIds: ["r"] }, IDENTITY, new Set());
    const tail = after("transform 1,0,0,1,10,20");
    expect(tail.slice(0, 4)).toEqual(["transform 1,0,0,1,10,20", "beginPath", "rect", "stroke #1e40af 4"]);
    expect(tail.some((l) => l.startsWith("fill "))).toBe(false);
  });

  it("forme remplie : ellipse, fill de la couleur de remplissage puis stroke", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: ["e"] }, IDENTITY, new Set());
    const i = scene.log.indexOf("ellipse");
    expect(i).toBeGreaterThan(0);
    expect(scene.log.slice(i + 1, i + 3)).toEqual(["fill #ff0000", "stroke #1e40af 4"]);
  });

  it("flèche : segment puis pointe (deux moveTo, trois lineTo)", () => {
    const { r, after } = makeViews();
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    const tail = after("transform 1,0,0,1,0,0");
    expect(tail.filter((l) => l === "moveTo")).toHaveLength(2);
    expect(tail.filter((l) => l === "lineTo")).toHaveLength(3);
  });

  it("arrowWings : pointe à ±25° derrière la fin, longueur max(12, 3 × épaisseur)", () => {
    const a = (25 * Math.PI) / 180;
    const head = arrowWings(100, 0, 4);
    expect(head).not.toBeNull();
    const [x1, y1, x2, y2] = head ?? [0, 0, 0, 0];
    expect(x1).toBeCloseTo(100 - 12 * Math.cos(a));
    expect(x2).toBeCloseTo(100 - 12 * Math.cos(a));
    expect(Math.abs(y1)).toBeCloseTo(12 * Math.sin(a));
    expect(y2).toBeCloseTo(-y1);
    expect(Math.hypot(100 - (arrowWings(100, 0, 10)?.[0] ?? 0), arrowWings(100, 0, 10)?.[1] ?? 0)).toBeCloseTo(30);
    expect(arrowWings(0, 0, 4)).toBeNull();
  });

  it("texte : une ligne par fillText, interligne 1,25, police à la taille", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: ["t"] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillText"))).toEqual(["fillText un deux 0,0", "fillText trois 0,25"]);
    expect(scene.font).toBe('20px "Atkinson Hyperlegible", system-ui, sans-serif');
  });

  it("calque d'édition : fantômes, formes, cadre, poignées, rectangle", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set(), {
      ghosts: [{ id: "a", matrix: [1, 0, 0, 1, 100, 0] }],
      shapes: [{ shape: "rect", x0: 300, y0: 200, x1: 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null }],
      frame: { x0: 0, y0: 0, x1: 50, y1: 50 },
      handles: true,
      band: { x0: 1, y0: 1, x1: 2, y1: 2 },
    });
    const g = scene.log.indexOf("transform 1,0,0,1,100,0");
    expect(scene.log[g + 1]).toBe("transform 1,0,0,1,5,6");
    expect(scene.log).toContain("transform 1,0,0,1,100,50");
    expect(scene.log.filter((l) => l === "rect")).toHaveLength(1 + 1 + 1 + 8);
    expect(scene.log.filter((l) => l.startsWith("setLineDash"))).toEqual(["setLineDash 4,4", "setLineDash 6,4", "setLineDash "]);
  });

  it("élément masqué : absent de la scène, présent une fois en fantôme", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: ["a"] }, IDENTITY, new Set(["a"]), {
      ...EMPTY_OVERLAY,
      ghosts: [{ id: "a", matrix: [2, 0, 0, 2, 0, 0] }],
    });
    expect(scene.log.filter((l) => l === "transform 1,0,0,1,5,6")).toHaveLength(1);
    expect(scene.log).toContain("transform 2,0,0,2,0,0");
  });

  it("texte : lignes en cache par id, remesurées seulement après invalidate (CL4-1)", () => {
    const { r, scene } = makeViews();
    const page = { id: "p", elementIds: ["t"] };
    r.drawScene(page, IDENTITY, new Set());
    const first = scene.measures;
    expect(first).toBeGreaterThan(0);
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBe(first);
    r.invalidate({ pages: [], ids: ["t"], removed: [], full: false, version: 2 });
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBeGreaterThan(first);
  });
});

const RICH: TextElement = {
  id: "rt",
  kind: "text",
  transform: [1, 0, 0, 1, 0, 0],
  style: { color: "#000000", width: 0 },
  text: {
    content: "Le chat noir",
    size: 36,
    boxWidth: 1000,
    boxHeight: 60,
    spans: [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } }, { text: " noir", attrs: {} }],
  },
};

describe("Canvas2DRenderer — C7 (texte par segments)", () => {
  const draw = (view: ElementView): FakeCtx => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: (id) => (id === view.id ? view : null), outline: () => null });
    r.drawScene({ id: "p", elementIds: [view.id] }, IDENTITY, new Set());
    return scene;
  };

  it("S5 : un fillText par segment, police et couleur du segment, ligne de base alignée, souligné sous « chat »", () => {
    const scene = draw(RICH);
    const [le, chat, noir] = scene.texts;
    expect(le).toMatchObject({ text: "Le ", x: 0, font: '36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" });
    expect(le?.y).toBeCloseTo(9.6);
    expect(chat).toEqual({ text: "chat", x: 30, y: 0, font: 'bold 48px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#ff0000", baseline: "top" });
    expect(noir).toMatchObject({ text: " noir", x: 70, fill: "#000000" });
    const underline = scene.rects.at(-1) ?? [];
    expect(underline[0]).toBe(30);
    expect(underline[1]).toBeCloseTo(44.16);
    expect(underline[2]).toBe(40);
    expect(underline[3]).toBe(3);
    expect(scene.log.filter((l) => l === "fillRect #ff0000")).toHaveLength(1);
  });

  it("une ligne d'une seule taille est dessinée comme au socle : même police, même y, aucun souligné", () => {
    const t = VIEWS["t"];
    if (!t) throw new Error("vue t");
    const scene = draw(t);
    expect(scene.texts).toEqual([
      { text: "un deux", x: 0, y: 0, font: '20px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" },
      { text: "trois", x: 0, y: 25, font: '20px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" },
    ]);
    const tail = scene.log.slice(scene.log.indexOf("transform 1,0,0,1,0,0"));
    expect(tail.some((l) => l.startsWith("fillRect"))).toBe(false);
  });

  it("cache : un changement de segments seul refait la mise en lignes", () => {
    let view: TextElement = RICH;
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: () => view, outline: () => null });
    const page = { id: "p", elementIds: ["rt"] };
    r.drawScene(page, IDENTITY, new Set());
    const first = scene.measures;
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBe(first);
    view = { ...RICH, text: { ...RICH.text, spans: [{ text: "Le chat noir", attrs: {} }] } };
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBeGreaterThan(first);
  });
});
