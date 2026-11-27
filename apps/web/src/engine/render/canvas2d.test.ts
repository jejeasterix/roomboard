import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Bounds, CoreDocument, ElementView, MediaData, Model3dData, GridInput, GridLevel, GridView, ImageElement, TableElement, TextElement } from "../../core/api";
import { NO_CHANGE } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { orientMatrix } from "../../core/image-params";
import { arrowWings } from "../../core/shapes";
import { IDENTITY, type Camera } from "../camera";
import { PAGE_BACKGROUND, SURROUND_COLOR, visibleGridRect } from "../page";
import { AUDIO_CARD_FILL, AUDIO_CARD_LABEL, BACKDROP_PLACEHOLDER, MEDIA_BADGE_FILL, MEDIA_PROGRESS_COLOR, BACKDROP_UNREADABLE_LABEL, CROP_VEIL, Canvas2DRenderer, createCanvas2DRenderer, exportPainterOptions, HANDLE_FILL, MODEL3D_CARD_LABEL, paintShape, PLACEHOLDER_FILL, SELECTION_COLOR, traceRings, tracePolygons, UNKNOWN_LABEL } from "./canvas2d";
import { asCtx, FakeCtx } from "./fake-ctx";
import { MIN_DOT_PX, MIN_GRID_PX, paintGrid } from "./grid-paint";
import type { ImageSource } from "./image-cache";
import type { MediaFrames } from "./media-frames";
import type { ModelFrames } from "./model-frames";
import { EMPTY_OVERLAY } from "./overlay";
import type { BackdropPainter, BackdropState, SceneSource } from "./renderer";

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

  it("drawLive : efface, puis trait vif rempli, sans queue tracée à part (OF44)", () => {
    const { r, live } = make({});
    r.resize(100, 100, 1);
    r.drawLive({ strokes: [{ outline: square, color: "#1e40af" }], erasers: [] }, IDENTITY);
    expect(live.log[0]).toBe("setTransform 1,0,0,1,0,0");
    expect(live.log[1]).toBe("clearRect");
    expect(live.log).toContain("fill #1e40af");
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
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

  it("faux contexte en mode navigateur : une couleur illisible est ignorée, la valeur d'avant reste", () => {
    const strict = new FakeCtx({ browserColors: true });
    strict.fillStyle = "#abc";
    strict.fillStyle = "zzz";
    expect(strict.fillStyle).toBe("#abc");
    strict.fillStyle = "Red";
    expect(strict.fillStyle).toBe("Red");
    const loose = new FakeCtx();
    loose.fillStyle = "zzz";
    expect(loose.fillStyle).toBe("zzz");
  });

  // Discrimine le patron écarté (T12) : `fillStyle = st.color ?? color` laisse au canvas la couleur d'avant quand il
  // ignore « zzz » (acceptée par T15) : fond de page pour « Le », rouge de « chat » pour « noir ».
  it("couleur de segment illisible par le canvas : segment et souligné dans la couleur de l'élément", () => {
    const scene = new FakeCtx({ browserColors: true });
    const view: TextElement = {
      ...RICH,
      text: {
        ...RICH.text,
        spans: [
          { text: "Le ", attrs: { color: "zzz", underline: true } },
          { text: "chat", attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } },
          { text: " noir", attrs: { color: "zzz" } },
        ],
      },
    };
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: () => view, outline: () => null });
    r.drawScene({ id: "p", elementIds: ["rt"] }, IDENTITY, new Set());
    expect(scene.texts.map((t) => t.fill)).toEqual(["#000000", "#ff0000", "#000000"]);
    expect(scene.log.filter((l) => l.startsWith("fillRect")).slice(-2)).toEqual(["fillRect #000000", "fillRect #ff0000"]);
  });

  it("socle : une ligne vide émet encore fillText(\"\") à son y", () => {
    const t = VIEWS["t"];
    if (!t || t.kind !== "text") throw new Error("vue t");
    const scene = draw({ ...t, text: { ...t.text, content: "a\n\nb", spans: [{ text: "a\n\nb", attrs: {} }] } });
    expect(scene.log.filter((l) => l.startsWith("fillText"))).toEqual(["fillText a 0,0", "fillText  0,25", "fillText b 0,50"]);
  });
});

const gridLevel = (kind: string, s: number, color: string): GridLevel => ({
  kind,
  spacingX: s,
  spacingY: s,
  originX: 0,
  originY: 0,
  color,
  line: "solid",
  lineWidth: 1,
  snap: false,
  visible: true,
});
const gridOf = (levels: GridLevel[], above = false): GridInput => ({ visible: true, snap: false, above, levels });

/** Scène de la fausse liaison avec une grille, vue 800 × 600 CSS, caméra S5. */
function gridScene(dpr: number, zoom: number, levels: GridLevel[]) {
  const doc = fakeCore.blank();
  const p = doc.pageIds()[0] ?? "";
  doc.apply({ type: "SetGrid", page: p, grid: gridOf(levels) });
  const scene = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), null, doc, { makePath: () => new FakePath() as unknown as Path2D });
  r.resize(800, 600, dpr);
  r.drawScene({ id: p, elementIds: doc.elementIds(p) }, { zoom, tx: 13.3, ty: -1_000_007 * zoom }, new Set());
  return scene;
}

/** Verticales (x) et horizontales (y) relevées dans les paires moveTo / lineTo. */
function gridSegments(f: FakeCtx): { v: number[]; h: number[] } {
  const v: number[] = [];
  const h: number[] = [];
  for (let i = 0; i + 1 < f.path.length; i++) {
    const a = f.path[i];
    const b = f.path[i + 1];
    if (a?.[0] !== "M" || b?.[0] !== "L") continue;
    if (a[1] === b[1]) v.push(a[1]);
    else if (a[2] === b[2]) h.push(a[2]);
  }
  return { v, h };
}

describe("Canvas2DRenderer — grille (C9)", () => {
  it("épaisseur du niveau (E1) : lineWidth 3 à dpr 1 → trait de 3 pixels", () => {
    const scene = gridScene(1, 1, [{ ...gridLevel("squares", 40, "#7b68ee"), lineWidth: 3 }]);
    expect(scene.log).toContain("stroke #7b68ee 3");
  });

  it("grille (C9, S5 a) : carreaux de 40 de la fausse liaison, au loin sur la page, calés sur les pixels", () => {
    const cases = [
      { dpr: 1, x: 13.5, y: 33.5, step: 40, width: 1 },
      { dpr: 1.25, x: 17.5, y: 41.5, step: 50, width: 1 },
      { dpr: 2, x: 27, y: 66, step: 80, width: 2 },
    ];
    for (const c of cases) {
      const scene = gridScene(c.dpr, 1, [gridLevel("squares", 40, "#7b68ee")]);
      const { v, h } = gridSegments(scene);
      expect(v).toEqual(Array.from({ length: 20 }, (_, i) => c.x + c.step * i));
      expect(h).toEqual(Array.from({ length: 15 }, (_, k) => c.y + c.step * k));
      expect(scene.log).toContain(`stroke #7b68ee ${c.width}`);
    }
  });

  it("grille (C9, S5) : tout zoom, tout dpr — calage, épaisseur, au plus 202 verticales et 152 horizontales ; 20 absent à z = 0,15", () => {
    for (const zoom of [0.15, 0.37, 1, 2.5, 8]) {
      for (const dpr of [1, 1.25, 2]) {
        for (const s of [40, 20]) {
          const scene = gridScene(dpr, zoom, [gridLevel("squares", s, "#7b68ee")]);
          const { v, h } = gridSegments(scene);
          const w = Math.max(1, Math.round(dpr));
          if (s === 20 && zoom === 0.15) {
            expect(v.length + h.length).toBe(0);
            continue;
          }
          expect(v.length).toBeGreaterThan(0);
          expect(v.length).toBeLessThanOrEqual(202);
          expect(h.length).toBeLessThanOrEqual(152);
          for (const x of [...v, ...h]) expect(Number.isInteger(w % 2 === 1 ? x - 0.5 : x)).toBe(true);
          expect(scene.log).toContain(`stroke #7b68ee ${w}`);
        }
      }
    }
  });

  it("ordre des couches (G11) : grille après le fond et avant les éléments ; above : après le fantôme, avant le cadre", () => {
    const strokes = (above: boolean): string[] => {
      const doc = fakeCore.blank();
      const p = doc.pageIds()[0] ?? "";
      const id = doc.apply({ type: "AddShape", page: p, shape: "rect", x0: 100, y0: 100, x1: 200, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
      doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")], above) });
      const scene = new FakeCtx();
      const r = new Canvas2DRenderer(asCtx(scene), null, doc, { makePath: () => new FakePath() as unknown as Path2D });
      r.resize(800, 600, 1);
      const overlay = above
        ? { ...EMPTY_OVERLAY, ghosts: [{ id, matrix: [1, 0, 0, 1, 10, 0] as const }], frame: { x0: 110, y0: 100, x1: 210, y1: 200 } }
        : EMPTY_OVERLAY;
      r.drawScene({ id: p, elementIds: [id] }, IDENTITY, above ? new Set([id]) : new Set(), overlay);
      return scene.log.filter((l) => l.startsWith("stroke") || l.startsWith("fillRect"));
    };
    expect(strokes(false)).toEqual([`fillRect ${SURROUND_COLOR}`, `fillRect ${PAGE_BACKGROUND}`, "stroke #7b68ee 1", "stroke #000000 4"]);
    expect(strokes(true)).toEqual([
      `fillRect ${SURROUND_COLOR}`,
      `fillRect ${PAGE_BACKGROUND}`,
      "stroke #000000 4",
      "stroke #7b68ee 1",
      `stroke ${SELECTION_COLOR} 1`,
    ]);
  });

  it("source sans gridLines ou avant resize : aucune grille", () => {
    const { r, scene } = make({});
    r.resize(800, 600, 1);
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")]) });
    const fresh = new FakeCtx();
    new Canvas2DRenderer(asCtx(fresh), null, doc).drawScene({ id: p, elementIds: [] }, IDENTITY, new Set());
    expect(fresh.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
  });
});

/** Scène dont la source compte les appels de gridLines (S4) : vue 800 × 600 CSS, dpr 1, caméra S5 descendue de `dy` px. */
function cachedScene(levels: GridLevel[] = [gridLevel("squares", 40, "#7b68ee")]) {
  const doc = fakeCore.blank();
  const p = doc.pageIds()[0] ?? "";
  doc.apply({ type: "SetGrid", page: p, grid: gridOf(levels) });
  const gridLines = vi.fn((page: string, rect: Bounds, minStep: number, minDotStep: number) => doc.gridLines(page, rect, minStep, minDotStep));
  const gridLinesOf = vi.fn((page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number) =>
    doc.gridLinesOf(page, grid, rect, minStep, minDotStep),
  );
  const src: SceneSource = { element: (id) => doc.element(id), outline: (id) => doc.outline(id), gridLines, gridLinesOf };
  const scene = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), null, src, { makePath: () => new FakePath() as unknown as Path2D });
  r.resize(800, 600, 1);
  const cam = (dy = 0, zoom = 1): Camera => ({ zoom, tx: 13.3, ty: -1_000_007 * zoom - dy });
  const draw = (c: Camera, page = p): void => {
    scene.path.length = 0;
    scene.log.length = 0;
    r.drawScene({ id: page, elementIds: [] }, c, new Set());
  };
  return { doc, p, r, scene, gridLines, gridLinesOf, cam, draw };
}

/** Segments d'un rendu sans cache : lignes du cœur pour la seule vue, peintes directement. */
function uncached(doc: CoreDocument, p: string, c: Camera): { v: number[]; h: number[] } {
  const f = new FakeCtx();
  const rect = visibleGridRect(c, 800, 600);
  const lines = rect ? doc.gridLines(p, rect, MIN_GRID_PX / c.zoom, MIN_DOT_PX / c.zoom) : null;
  if (lines) paintGrid(asCtx(f), lines, c, 1, 1, 1);
  return gridSegments(f);
}

describe("Canvas2DRenderer — cache de la grille (C9 éditeur, E3, S4)", () => {
  it("S4 : dix images de même caméra → un seul appel au cœur", () => {
    const { gridLines, cam, draw } = cachedScene();
    for (let i = 0; i < 10; i++) draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(1);
  });

  it("S4 : défilement de 50 px → toujours un appel, segments d'un rendu sans cache ; au-delà de la marge → 2 ; zoom → 3", () => {
    const { doc, p, scene, gridLines, cam, draw } = cachedScene();
    draw(cam());
    draw(cam(50));
    expect(gridLines).toHaveBeenCalledTimes(1);
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam(50)));
    draw(cam(400));
    expect(gridLines).toHaveBeenCalledTimes(2);
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam(400)));
    draw(cam(400, 1.25));
    expect(gridLines).toHaveBeenCalledTimes(3);
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam(400, 1.25)));
  });

  it("S4, Review Focus 2 : ligne sur le haut de la vue après défilement : présente, comme sans cache", () => {
    const { doc, p, scene, gridLines, cam, draw } = cachedScene();
    draw(cam());
    draw(cam(33)); // haut de vue à y = 1 000 040, une ligne
    expect(gridLines).toHaveBeenCalledTimes(1);
    const segs = gridSegments(scene);
    expect(segs).toEqual(uncached(doc, p, cam(33)));
    expect(segs.h[0]).toBe(0.5);
  });

  it("S4 : invalidate d'une autre page → aucun appel ; de la page ou full → un appel neuf ; resize → un appel neuf", () => {
    const { p, r, gridLines, cam, draw } = cachedScene();
    draw(cam());
    r.invalidate({ ...NO_CHANGE, pages: ["autre"] });
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(1);
    r.invalidate({ ...NO_CHANGE, pages: [p] });
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(2);
    r.invalidate({ ...NO_CHANGE, full: true });
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(3);
    r.resize(800, 600, 1);
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(4);
  });

  it("S4 : SetGrid puis invalidate : les lignes peintes suivent la nouvelle grille ; page changée : un appel, null gardé", () => {
    const { doc, p, r, scene, gridLines, cam, draw } = cachedScene();
    draw(cam());
    r.invalidate(doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 80, "#7b68ee")]) }));
    draw(cam());
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam()));
    expect(gridSegments(scene).v.length).toBe(10);
    const q = doc.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    const before = gridLines.mock.calls.length;
    draw(cam(), q);
    draw(cam(), q);
    expect(gridLines.mock.calls.length).toBe(before + 1);
    expect(scene.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
  });

  it("S4, DAE1 : setGridPreview → gridLinesOf appelé avec le brouillon, gridLines non ; null → aucune grille ; fin → grille du document", () => {
    const { p, r, scene, gridLines, gridLinesOf, cam, draw } = cachedScene();
    const draft = gridOf([{ ...gridLevel("squares", 80, "#94a3b8"), lineWidth: 3 }]);
    r.setGridPreview({ page: p, grid: draft });
    draw(cam());
    expect(gridLines).not.toHaveBeenCalled();
    expect(gridLinesOf).toHaveBeenCalledTimes(1);
    expect(gridLinesOf.mock.calls[0]?.[1]).toBe(draft);
    expect(scene.log).toContain("stroke #94a3b8 3");
    expect(gridSegments(scene).v.length).toBe(10);
    draw(cam(50));
    expect(gridLinesOf).toHaveBeenCalledTimes(1);
    r.setGridPreview({ page: p, grid: null });
    draw(cam());
    expect(scene.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
    r.setGridPreview(null);
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(1);
    expect(scene.log).toContain("stroke #7b68ee 1");
  });

  it("aperçu posé pour une autre page : la page montrée garde sa grille", () => {
    const { r, scene, gridLines, gridLinesOf, cam, draw } = cachedScene();
    r.setGridPreview({ page: "autre", grid: null });
    draw(cam());
    expect(gridLinesOf).not.toHaveBeenCalled();
    expect(gridLines).toHaveBeenCalledTimes(1);
    expect(scene.log).toContain("stroke #7b68ee 1");
  });
});

describe("images et éléments inconnus (R16, U3)", () => {
  const IMG = "ef".repeat(32);
  const image: ElementView = { id: "i", kind: "image", transform: [1, 0, 0, 1, 5, 6], image: { asset: IMG, w: 200, h: 100 } };
  function sceneOf(el: ElementView, images?: ImageSource, hidden: ReadonlySet<string> = new Set(), overlay = EMPTY_OVERLAY) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => (id === el.id ? el : null), outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, images ? { images } : {});
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [el.id] }, IDENTITY, hidden, overlay);
    return scene;
  }

  it("image : bitmap dessiné dans sa boîte (0, 0)-(w, h), sous la transformation de l'élément", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const bitmap = vi.fn((a: string) => (a === IMG ? bmp : null));
    const scene = sceneOf(image, { bitmap });
    expect(bitmap).toHaveBeenCalledWith(IMG);
    expect(scene.images).toEqual([{ img: bmp, x: 0, y: 0, w: 200, h: 100 }]);
    expect(scene.log).toContain("transform 1,0,0,1,5,6");
  });

  it("image en décodage ou absente : cadre gris de sa taille, aucun drawImage", () => {
    const scene = sceneOf(image, { bitmap: () => null });
    expect(scene.images).toEqual([]);
    expect(scene.rects).toContainEqual([0, 0, 200, 100]);
    expect(scene.log).toContain(`fillRect ${PLACEHOLDER_FILL}`);
  });

  it("sans source d'images (contrat Wasm, tests) : cadre gris", () => {
    const scene = sceneOf(image);
    expect(scene.images).toEqual([]);
    expect(scene.rects).toContainEqual([0, 0, 200, 100]);
  });

  it("élément inconnu : cadre gris et libellé « objet non pris en charge »", () => {
    const unknown: ElementView = { id: "u", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "pdf-page", w: 50, h: 40 } };
    const scene = sceneOf(unknown);
    expect(scene.rects).toContainEqual([0, 0, 50, 40]);
    expect(scene.texts.map((t) => t.text)).toContain(UNKNOWN_LABEL);
  });

  it("fantôme d'une image : dessiné par paintElement avec la matrice provisoire (R17)", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const scene = sceneOf(image, { bitmap: () => bmp }, new Set(["i"]), { ...EMPTY_OVERLAY, ghosts: [{ id: "i", matrix: [1, 0, 0, 1, 30, 0] }] });
    expect(scene.images).toHaveLength(1);
    expect(scene.log).toContain("transform 1,0,0,1,30,0");
  });

  /** Rendu de `el` avec un aperçu d'image posé avant la scène. */
  function previewed(el: ElementView, images: ImageSource, preview: Parameters<Canvas2DRenderer["setImagePreview"]>[0]) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => (id === el.id ? el : null), outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, { images });
    r.resize(100, 100, 1);
    r.setImagePreview(preview);
    r.drawScene({ id: "p", elementIds: [el.id] }, IDENTITY, new Set());
    return { scene, r };
  }

  it("image sans réglage : drawImage à 5 arguments, journal inchangé", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const scene = sceneOf(image, { bitmap: () => bmp });
    expect(scene.log).toContain("drawImage 0,0,200,100");
    expect(scene.images[0]?.src).toBeUndefined();
  });

  it("image rognée, retournée, tournée : rognage par clip, drawImage à 5 arguments de l'image entière, matrice d'orientation (I23)", () => {
    const i = { asset: IMG, w: 200, h: 100, crop: [20, 10, 100, 50] as const, flipX: true, quarterTurns: 1 };
    const el: ElementView = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: i };
    const half = { tag: "copie réduite", width: 100, height: 50 } as unknown as CanvasImageSource;
    const scene = sceneOf(el, { bitmap: () => half });
    expect(scene.images).toEqual([{ img: half, x: -20, y: -10, w: 200, h: 100 }]);
    expect(scene.log).toContain("clip");
    expect(orientMatrix(i)).toEqual([0, -1, -1, 0, 50, 100]);
    expect(scene.log).toContain("transform 0,-1,-1,0,50,100");
  });

  it("image tournée sans bitmap : cadre gris de la boîte affichée", () => {
    const el: ElementView = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: IMG, w: 200, h: 100, quarterTurns: 1 } };
    const scene = sceneOf(el, { bitmap: () => null });
    expect(scene.rects).toContainEqual([0, 0, 100, 200]);
  });

  it("bitmapOf préféré quand la source le fournit ; aperçu : réglages et matrice de l'aperçu, drapeau preview", () => {
    const bmp = { tag: "retouchée" } as unknown as CanvasImageSource;
    const bitmapOf = vi.fn((_el: ImageElement, _preview?: boolean) => bmp);
    const { scene, r } = previewed(image, { bitmap: () => null, bitmapOf }, { id: "i", params: { brightness: 10 }, matrix: [1, 0, 0, 1, 30, 0] });
    expect(bitmapOf).toHaveBeenCalledWith({ ...image, transform: [1, 0, 0, 1, 30, 0], image: { asset: IMG, w: 200, h: 100, brightness: 10 } }, true);
    expect(scene.log).toContain("transform 1,0,0,1,30,0");
    expect(scene.images[0]?.img).toBe(bmp);
    r.setImagePreview(null);
    r.drawScene({ id: "p", elementIds: ["i"] }, IDENTITY, new Set());
    expect(bitmapOf).toHaveBeenLastCalledWith(image, false);
  });

  it("T21 (I33) : drawScene encadre ses images de beginScene et endScene, fantômes compris", () => {
    const order: string[] = [];
    const images: ImageSource = {
      bitmap: () => null,
      bitmapOf: (el) => {
        order.push(`bitmapOf ${el.id}`);
        return null;
      },
      beginScene: () => order.push("begin"),
      endScene: () => order.push("end"),
    };
    sceneOf(image, images, new Set(["i"]), { ...EMPTY_OVERLAY, ghosts: [{ id: "i", matrix: [1, 0, 0, 1, 30, 0] }] });
    expect(order).toEqual(["begin", "bitmapOf i", "end"]);
  });

  it("cadre de rognage : voile hors du cadre (evenodd), cadre, huit poignées (I28)", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const { scene } = previewed(image, { bitmap: () => bmp }, { id: "i", params: {}, matrix: [1, 0, 0, 1, 5, 6], frame: { x0: 10, y0: 10, x1: 60, y1: 40 } });
    expect(scene.log).toContain(`fill ${CROP_VEIL}`);
    expect(scene.log.filter((l) => l === `fill ${HANDLE_FILL}`)).toHaveLength(8);
  });

  it("invalidate : les éléments retirés sont oubliés par la source d'images (I19)", () => {
    const forget = vi.fn();
    const src: SceneSource = { element: () => null, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, src, { images: { bitmap: () => null, forget } });
    r.invalidate({ ...NO_CHANGE, ids: ["a"], removed: ["b"] });
    expect(forget).toHaveBeenCalledWith(["b"]);
  });
});

describe("Canvas2DRenderer — tableau (C10a)", () => {
  const TABLE: TableElement = {
    id: "tb",
    kind: "table",
    transform: [1, 0, 0, 1, 10, 20],
    table: {
      color: "#000000",
      size: 36,
      cols: [{ id: "c1", width: 240 }, { id: "c2", width: 240 }],
      rows: [{ id: "r1", height: 64 }],
      cells: [
        { row: "r1", col: "c1", text: "Lundi", fill: null, shade: null, spans: [{ text: "Lundi", attrs: {} }] },
        { row: "r1", col: "c2", text: "", fill: "#fef08a", shade: null, spans: [{ text: "", attrs: {} }] },
      ],
      merges: [],
    },
  };
  function draw(els: ElementView[]) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => els.find((e) => e.id === id) ?? null, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, {});
    r.resize(100, 100, 1);
    const page = { id: "p", elementIds: els.map((e) => e.id) };
    r.drawScene(page, IDENTITY, new Set());
    return { r, scene, page };
  }

  it("fonds et traits sous la matrice du tableau, puis le texte dans la cellule (découpe, coin intérieur)", () => {
    const { scene } = draw([TABLE]);
    expect(scene.log).toContain("transform 1,0,0,1,10,20");
    expect(scene.rects).toContainEqual([240, 0, 240, 64]);
    const i = scene.log.indexOf("transform 1,0,0,1,8,8");
    expect(i).toBeGreaterThan(scene.log.indexOf("clip"));
    expect(scene.log.indexOf("fillText Lundi 0,0")).toBeGreaterThan(i);
  });

  it("mêmes fillText qu'un texte d'un segment (B1) : police, couleur, ligne de base", () => {
    const text: TextElement = {
      id: "tx",
      kind: "text",
      transform: [1, 0, 0, 1, 0, 0],
      style: { color: "#000000", width: 0 },
      text: { content: "Lundi", size: 36, boxWidth: 224, boxHeight: 45, spans: [{ text: "Lundi", attrs: {} }] },
    };
    const a = draw([TABLE]).scene.texts;
    const b = draw([text]).scene.texts;
    expect(a).toEqual(b);
    expect(a).toEqual([{ text: "Lundi", x: 0, y: 0, font: '36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" }]);
  });

  it("cellules par segments (C7b, R17) : le segment gras rouge est peint avec sa police et sa couleur", () => {
    const rich: TableElement = {
      ...TABLE,
      table: { ...TABLE.table, cells: [{ row: "r1", col: "c1", text: "Le chat", fill: null, shade: null, spans: [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { bold: true, color: "#dc2626" } }] }] },
    };
    const texts = draw([rich]).scene.texts;
    expect(texts).toContainEqual(expect.objectContaining({ text: "chat", font: 'bold 36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#dc2626" }));
    expect(texts).toContainEqual(expect.objectContaining({ text: "Le ", fill: "#000000" }));
  });

  it("cellules par segments (C7b, R17) : mêmes textes, autres segments : lignes recalculées sans invalidate (clé du cache)", () => {
    let el: TableElement = TABLE;
    const scene = new FakeCtx();
    const src: SceneSource = { element: () => el, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, {});
    r.resize(100, 100, 1);
    const page = { id: "p", elementIds: ["tb"] };
    r.drawScene(page, IDENTITY, new Set());
    el = { ...TABLE, table: { ...TABLE.table, cells: [{ row: "r1", col: "c1", text: "Lundi", fill: null, shade: null, spans: [{ text: "Lundi", attrs: { bold: true } }] }] } };
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.texts.at(-1)).toMatchObject({ text: "Lundi", font: 'bold 36px "Atkinson Hyperlegible", system-ui, sans-serif' });
  });

  it("cache des lignes de cellules : remesuré seulement après invalidate (Change)", () => {
    const { r, scene, page } = draw([TABLE]);
    const first = scene.measures;
    expect(first).toBeGreaterThan(0);
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBe(first);
    r.invalidate({ pages: [], ids: ["tb"], removed: [], full: false, version: 2 });
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBeGreaterThan(first);
  });
});

describe("Canvas2DRenderer — tableau (C10b)", () => {
  const els: ElementView[] = [];
  const ZT: TableElement = {
    id: "tz",
    kind: "table",
    transform: [1, 0, 0, 1, 0, 0],
    table: {
      color: "#000000",
      size: 36,
      cols: [{ id: "c1", width: 240 }, { id: "c2", width: 240 }],
      rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }],
      cells: [
        { row: "r1", col: "c1", text: "Lundi mardi mercredi jeudi", fill: null, shade: null, spans: [{ text: "Lundi mardi mercredi jeudi", attrs: {} }] },
        { row: "r2", col: "c1", text: "réponse", fill: null, shade: "#94a3b8", spans: [{ text: "réponse", attrs: {} }] },
      ],
      merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }],
    },
  };
  function draw() {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => els.find((e) => e.id === id) ?? null, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, {});
    r.resize(100, 100, 1);
    const page = { id: "p", elementIds: ["tz"] };
    r.drawScene(page, IDENTITY, new Set());
    return { r, scene, page };
  }

  it("texte d'une zone mis en lignes à la largeur réunie (une ligne) ; cellule ombrée : aucun fillText (F11)", () => {
    els.splice(0, els.length, ZT);
    const { scene } = draw();
    expect(scene.texts.map((t) => t.text)).toEqual(["Lundi mardi mercredi jeudi"]);
  });

  it("zone défaite : le cache est remesuré sans invalidate (la clé suit la largeur des boîtes)", () => {
    els.splice(0, els.length, ZT);
    const { r, scene, page } = draw();
    const first = scene.measures;
    els.splice(0, els.length, { ...ZT, table: { ...ZT.table, merges: [] } });
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBeGreaterThan(first);
    expect(scene.texts.filter((t) => t.text !== "réponse").length).toBeGreaterThan(1);
  });
});

describe("Canvas2DRenderer — fond de page (C6a)", () => {
  it("drawScene : le fond reçu (#bfdbfe) est peint au lieu du blanc (DA4)", () => {
    const { r, scene } = make({});
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [], background: "#bfdbfe" }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillRect"))).toEqual([`fillRect ${SURROUND_COLOR}`, "fillRect #bfdbfe"]);
  });

  it("gomme partielle : le fond retenu du dernier drawScene est repeint (D20)", () => {
    const { r, live } = make({});
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [], background: "#bfdbfe" }, IDENTITY, new Set());
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "partial" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual(["stroke #bfdbfe 16", `stroke ${SURROUND_COLOR} 16`]);
  });

  it("gomme partielle : fond « rouge » ignoré par le canvas, la bande reprend le blanc retenu (point 1)", () => {
    const scene = new FakeCtx({ browserColors: true });
    const live = new FakeCtx();
    const src: SceneSource = { element: () => null, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(live), src, { makePath: () => new FakePath() as unknown as Path2D });
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [], background: "rouge" }, IDENTITY, new Set());
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "partial" }] }, IDENTITY);
    expect(scene.log.filter((l) => l.startsWith("fillRect"))).toEqual([`fillRect ${SURROUND_COLOR}`, `fillRect ${PAGE_BACKGROUND}`]);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([`stroke ${PAGE_BACKGROUND} 16`, `stroke ${SURROUND_COLOR} 16`]);
  });
});

describe("Canvas2DRenderer — fond de page (C12)", () => {
  const PDF = { id: "ab".repeat(32), name: "a.pdf", mime: "application/pdf", size: 3 };
  const PNG = { id: "cd".repeat(32), name: "a.png", mime: "image/png", size: 3 };
  const pdfDoc = (): CoreDocument => fakeCore.fromPdfPages(PDF, [{ w: 612, h: 792 }]);
  const pageOf = (doc: CoreDocument, ids: string[] = []) => {
    const id = doc.pageIds()[0] ?? "";
    return { id, elementIds: ids, backdrop: doc.page(id)?.backdrop ?? null };
  };
  const painter = (state: "attente" | "pret" | "echec", calls: unknown[][] = []): BackdropPainter => ({
    paint: (ctx, b, camera, view) => {
      (ctx as unknown as FakeCtx).log.push("peintre");
      calls.push([b.kind, b.page, camera, view]);
      return state;
    },
  });

  it("fond pdf-page : placeholder sur rect, puis le peintre ; sous la grille et les éléments (PF14, G11)", () => {
    const doc = pdfDoc();
    const p = doc.pageIds()[0] ?? "";
    const id = doc.apply({ type: "AddShape", page: p, shape: "rect", x0: 100, y0: 100, x1: 200, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")]) });
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, doc, { makePath: () => new FakePath() as unknown as Path2D, backdrop: painter("pret") });
    r.resize(800, 600, 1);
    r.drawScene(pageOf(doc, [id]), IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillRect") || l.startsWith("stroke") || l === "peintre")).toEqual([
      `fillRect ${SURROUND_COLOR}`,
      `fillRect ${PAGE_BACKGROUND}`,
      `fillRect ${BACKDROP_PLACEHOLDER}`,
      "peintre",
      "stroke #7b68ee 1",
      "stroke #000000 4",
    ]);
    expect(scene.rects[2]).toEqual([0, 0, 1920, (792 * 1920) / 612]);
  });

  it("le peintre reçoit le fond, la caméra et la vue (largeur et hauteur CSS, dpr) (PF13)", () => {
    const doc = pdfDoc();
    const calls: unknown[][] = [];
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { backdrop: painter("attente", calls) });
    r.resize(800, 600, 2);
    const cam = { zoom: 0.5, tx: 10, ty: 20 };
    r.drawScene(pageOf(doc), cam, new Set());
    expect(calls).toEqual([["pdf-page", 0, cam, { w: 800, h: 600, dpr: 2 }]]);
  });

  it("onBackdrop : état du peintre après chaque scène ; page sans fond : chaîne vide (PF15)", () => {
    const states: BackdropState[] = [];
    const doc = pdfDoc();
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { backdrop: painter("attente"), onBackdrop: (s) => void states.push(s) });
    r.resize(800, 600, 1);
    r.drawScene(pageOf(doc), IDENTITY, new Set());
    r.drawScene({ id: "x", elementIds: [] }, IDENTITY, new Set());
    r.drawScene({ id: "x", elementIds: [], backdrop: null }, IDENTITY, new Set());
    expect(states).toEqual(["attente", "", ""]);
  });

  it("fond pdf-page en échec (sans peintre, ou peintre en échec) : placeholder et libellé « page PDF illisible » (Review Focus 5)", () => {
    for (const backdrop of [undefined, painter("echec")]) {
      const doc = pdfDoc();
      const scene = new FakeCtx();
      const states: BackdropState[] = [];
      const r = new Canvas2DRenderer(asCtx(scene), null, doc, { ...(backdrop ? { backdrop } : {}), onBackdrop: (s) => void states.push(s) });
      r.resize(800, 600, 1);
      r.drawScene(pageOf(doc), IDENTITY, new Set());
      expect(scene.texts.map((t) => t.text)).toContain(BACKDROP_UNREADABLE_LABEL);
      expect(states).toEqual(["echec"]);
    }
    expect(BACKDROP_UNREADABLE_LABEL).toBe("page PDF illisible");
  });

  it("libellé « illisible » : police, couleur et ligne de base encadrées par save / restore (relecture T16)", () => {
    const doc = pdfDoc();
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, doc, { backdrop: painter("echec") });
    r.resize(800, 600, 1);
    r.drawScene(pageOf(doc), IDENTITY, new Set());
    const at = scene.log.findIndex((l) => l.startsWith(`fillText ${BACKDROP_UNREADABLE_LABEL}`));
    expect(at).toBeGreaterThan(0);
    const save = scene.log.lastIndexOf("save", at);
    expect(save).toBeGreaterThanOrEqual(0);
    expect(scene.log.slice(save, at)).not.toContain("restore");
    expect(scene.log[at + 1]).toBe("restore");
  });

  it("fond image : bitmap étiré sur rect, avant la grille ; non décodé : placeholder seul, attente (effet de bord C12)", () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    doc.apply({ type: "SetBackdrop", page: p, backdrop: { asset: PNG, w: 1000, h: 500, fit: "width" } });
    const bmp = { width: 1000, height: 500 } as unknown as CanvasImageSource;
    const states: BackdropState[] = [];
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, doc, { images: { bitmap: (a) => (a === PNG.id ? bmp : null) }, onBackdrop: (s) => void states.push(s) });
    r.resize(800, 600, 1);
    r.drawScene(pageOf(doc), IDENTITY, new Set());
    expect(scene.images).toEqual([{ img: bmp, x: 0, y: 0, w: 1920, h: 960 }]);
    const blind = new FakeCtx();
    const r2 = new Canvas2DRenderer(asCtx(blind), null, doc, { images: { bitmap: () => null }, onBackdrop: (s) => void states.push(s) });
    r2.resize(800, 600, 1);
    r2.drawScene(pageOf(doc), IDENTITY, new Set());
    expect(blind.images).toEqual([]);
    expect(blind.log).toContain(`fillRect ${BACKDROP_PLACEHOLDER}`);
    expect(states).toEqual(["pret", "attente"]);
  });

  it("fond sans rect (w ou h illisibles) : rien dessiné, echec ; genre inconnu (version plus récente) : placeholder seul, état vide", () => {
    const states: BackdropState[] = [];
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, fakeCore.blank(), { backdrop: painter("pret"), onBackdrop: (s) => void states.push(s) });
    r.resize(800, 600, 1);
    const base = { asset: PDF.id, page: 0, w: 612, h: 792, fit: "width", original: null };
    r.drawScene({ id: "p", elementIds: [], backdrop: { ...base, kind: "pdf-page", rect: null } }, IDENTITY, new Set());
    r.drawScene({ id: "p", elementIds: [], backdrop: { ...base, kind: "video", rect: { x0: 0, y0: 0, x1: 1920, y1: 2000 } } }, IDENTITY, new Set());
    expect(states).toEqual(["echec", ""]);
    expect(scene.log.filter((l) => l === `fillRect ${BACKDROP_PLACEHOLDER}`)).toHaveLength(1);
    expect(scene.log).not.toContain("peintre");
  });
});

describe("Canvas2DRenderer — paintContent (C12)", () => {
  const shapeDoc = () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    const id = doc.apply({ type: "AddShape", page: p, shape: "rect", x0: 100, y0: 100, x1: 200, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    return { doc, p, id };
  };

  it("rect projeté à l'échelle et découpé ; éléments dessinés ; ni pourtour, ni fond blanc, ni fond de page (PF21)", () => {
    const { doc, p, id } = shapeDoc();
    const calls: unknown[] = [];
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { makePath: () => new FakePath() as unknown as Path2D, backdrop: { paint: () => (calls.push(1), "pret") } });
    const out = new FakeCtx();
    r.paintContent(asCtx(out), { id: p, elementIds: [id], backdrop: null }, { x0: 0, y0: 0, x1: 1920, y1: 2715 }, 0.5);
    expect(out.log.slice(0, 5)).toEqual(["save", "setTransform 0.5,0,0,0.5,0,0", "beginPath", "rect", "clip"]);
    expect(out.log.at(-1)).toBe("restore");
    expect(out.log).toContain("stroke #000000 4");
    expect(out.log.filter((l) => l.startsWith("fillRect"))).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("rect décalé : translation de -x0 × scale, -y0 × scale", () => {
    const { doc, p, id } = shapeDoc();
    const out = new FakeCtx();
    new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { makePath: () => new FakePath() as unknown as Path2D }).paintContent(asCtx(out), { id: p, elementIds: [id] }, { x0: 100, y0: 50, x1: 300, y1: 250 }, 2);
    expect(out.log[1]).toBe("setTransform 2,0,0,2,-200,-100");
  });

  it("grille de la page : sous les éléments, sur eux si above (G11)", () => {
    for (const above of [false, true]) {
      const { doc, p, id } = shapeDoc();
      doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")], above) });
      const out = new FakeCtx();
      new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { makePath: () => new FakePath() as unknown as Path2D }).paintContent(asCtx(out), { id: p, elementIds: [id] }, { x0: 0, y0: 0, x1: 1920, y1: 1080 }, 1);
      const strokes = out.log.filter((l) => l.startsWith("stroke"));
      expect(strokes, String(above)).toEqual(above ? ["stroke #000000 4", "stroke #7b68ee 1"] : ["stroke #7b68ee 1", "stroke #000000 4"]);
    }
  });
});

describe("Canvas2DRenderer — média (C14)", () => {
  const VID = "aa".repeat(32);
  const POSTER = "bb".repeat(32);
  const mediaData = (o: Partial<MediaData> = {}): MediaData => ({
    asset: VID, mediaType: "video", w: 300, h: 150, duration: 10, poster: POSTER, trimStart: 0, trimEnd: null, loop: false, volume: 1, ...o,
  });
  const el = (o: Partial<MediaData> = {}): ElementView => ({ id: "m", kind: "media", transform: [1, 0, 0, 1, 5, 6], media: mediaData(o) });
  function sceneOf(e: ElementView, opts: { images?: ImageSource; media?: MediaFrames; forExport?: boolean; assetName?: (a: string) => string | null } = {}) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => (id === e.id ? e : null), outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, opts);
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [e.id] }, IDENTITY, new Set());
    return scene;
  }
  const frame = { tag: "frame" } as unknown as CanvasImageSource;
  const poster = { tag: "poster" } as unknown as CanvasImageSource;
  const images: ImageSource = { bitmap: (a) => (a === POSTER ? poster : null) };
  const frames = (f: CanvasImageSource | null, playing: boolean, time = 0): MediaFrames => ({ frame: () => f, progress: () => ({ time, playing }) });

  it("vidéo en lecture : image du lecteur dans (0,0)-(w,h), aucun badge", () => {
    const scene = sceneOf(el(), { images, media: frames(frame, true) });
    expect(scene.images).toEqual([{ img: frame, x: 0, y: 0, w: 300, h: 150 }]);
    expect(scene.log).not.toContain(`fillRect ${MEDIA_BADGE_FILL}`);
  });

  it("vidéo sans image : poster du cache, badge", () => {
    const scene = sceneOf(el(), { images, media: frames(null, false) });
    expect(scene.images).toEqual([{ img: poster, x: 0, y: 0, w: 300, h: 150 }]);
    expect(scene.log).toContain(`fillRect ${MEDIA_BADGE_FILL}`);
    expect(scene.rects).toContainEqual([8, 150 - 8 - 25, 25, 25]);
    expect(scene.log).toContain("fill #ffffff");
  });

  it("sans poster ni lecteur : cadre gris de sa taille", () => {
    const scene = sceneOf(el({ poster: null }), { images });
    expect(scene.images).toEqual([]);
    expect(scene.rects).toContainEqual([0, 0, 300, 150]);
    expect(scene.log).toContain(`fillRect ${PLACEHOLDER_FILL}`);
  });

  it("sans MediaFrames (export PDF, M34) : poster", () => {
    const scene = sceneOf(el(), { images });
    expect(scene.images).toEqual([{ img: poster, x: 0, y: 0, w: 300, h: 150 }]);
  });

  it("son : carte « Son », barre à la position du rognage", () => {
    const a = el({ mediaType: "audio", poster: null, trimStart: 2, trimEnd: 6 });
    const scene = sceneOf(a, { media: frames(null, true, 4) });
    expect(scene.log).toContain(`fillRect ${AUDIO_CARD_FILL}`);
    expect(scene.texts.map((t) => t.text)).toContain(AUDIO_CARD_LABEL);
    expect(scene.log).toContain(`fillRect ${MEDIA_PROGRESS_COLOR}`);
    expect(scene.rects.at(-1)).toEqual([0, 150 - 6, 150, 6]);
  });

  it("R7 : la carte du son affiche le nom du média quand il est connu", () => {
    const a = el({ mediaType: "audio", poster: null });
    const scene = sceneOf(a, { assetName: (id) => (id === VID ? "chanson.mp3" : null) });
    expect(scene.texts.map((t) => t.text)).toEqual(["chanson.mp3"]);
  });

  it("R7 : export (forExport) : aucun badge « lecture », ni sur le poster ni sur la carte", () => {
    const v = sceneOf(el(), { images, forExport: true });
    expect(v.log).not.toContain(`fillRect ${MEDIA_BADGE_FILL}`);
    const a = sceneOf(el({ mediaType: "audio", poster: null }), { forExport: true });
    expect(a.log).not.toContain(`fillRect ${MEDIA_BADGE_FILL}`);
    expect(a.texts.map((t) => t.text)).toEqual([AUDIO_CARD_LABEL]);
  });
});

describe("exportPainterOptions (C14, R7, M34)", () => {
  it("rendu d'export : forExport, jamais de lecteurs de média ni de nom (poster, pas de badge)", () => {
    const images = {} as ImageSource;
    const o = exportPainterOptions(images);
    expect(o).toEqual({ images, forExport: true });
    expect("media" in o).toBe(false);
  });
  it("le makePath du producteur vectoriel passe, forExport reste posé", () => {
    const makePath = (): Path2D => ({}) as Path2D;
    expect(exportPainterOptions({} as ImageSource, { makePath })).toMatchObject({ forExport: true, makePath });
  });
  it("mineur C14 : main.ts câble chaque peintre d'export (PNG, PDF vectoriel, vignettes) sur exportPainterOptions", () => {
    // cli-lot3 : le peintre du PDF vectoriel vit dans `vectorPainter` (pdf-overlay-vector.ts), que main.ts appelle.
    const main = readFileSync(join(__dirname, "../../main.ts"), "utf8");
    const vector = readFileSync(join(__dirname, "../../app/pdf-overlay-vector.ts"), "utf8");
    expect(main).toContain("painter: vectorPainter(doc)");
    const painters = [main, vector].flatMap((src) => {
      const found = [...src.matchAll(/new Canvas2DRenderer\(ctx, null, doc, ([A-Za-z]+)\(/g)].map((m) => m[1]);
      expect(src.match(/new Canvas2DRenderer\(/g)?.length).toBe(found.length);
      return found;
    });
    expect(painters).toEqual(["exportPainterOptions", "exportPainterOptions", "exportPainterOptions"]);
  });
});

describe("Canvas2DRenderer — objet 3D (C15, X25)", () => {
  const GLB = "cc".repeat(32);
  const SNAP = "dd".repeat(32);
  const data = (o: Partial<Model3dData> = {}): Model3dData => ({ asset: GLB, format: "glb", w: 640, h: 480, files: [], yaw: Math.PI / 6, pitch: Math.PI / 9, snapshot: SNAP, ...o });
  const el = (o: Partial<Model3dData> = {}): ElementView => ({ id: "o", kind: "model3d", transform: [1, 0, 0, 1, 5, 6], model3d: data(o) });
  function sceneOf(e: ElementView, opts: { images?: ImageSource; models?: ModelFrames; assetName?: (a: string) => string | null } = {}) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => (id === e.id ? e : null), outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, opts);
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [e.id] }, IDENTITY, new Set());
    return scene;
  }
  const frame = { tag: "rendu" } as unknown as CanvasImageSource;
  const snap = { tag: "instantane" } as unknown as CanvasImageSource;
  const images: ImageSource = { bitmap: (a) => (a === SNAP ? snap : null) };

  it("séance ouverte : image du rendu partagé dans (0,0)-(w,h)", () => {
    const scene = sceneOf(el(), { images, models: { frame: (id) => (id === "o" ? frame : null) } });
    expect(scene.images).toEqual([{ img: frame, x: 0, y: 0, w: 640, h: 480 }]);
  });

  it("sans image du rendu : instantané du cache, même boîte (pas de saut au relâché)", () => {
    const scene = sceneOf(el(), { images, models: { frame: () => null } });
    expect(scene.images).toEqual([{ img: snap, x: 0, y: 0, w: 640, h: 480 }]);
  });

  it("ni rendu ni instantané : carte grise « Objet 3D » et le nom", () => {
    const scene = sceneOf(el({ snapshot: null }), { images, assetName: () => "cube.glb" });
    expect(scene.images).toEqual([]);
    expect(scene.log).toContain(`fillRect ${PLACEHOLDER_FILL}`);
    expect(scene.log.join("\n")).toContain(MODEL3D_CARD_LABEL);
    expect(scene.log.join("\n")).toContain("cube.glb");
  });

  it("rendu d'export : instantané, jamais le port", () => {
    const scene = sceneOf(el(), exportPainterOptions(images));
    expect(scene.images).toEqual([{ img: snap, x: 0, y: 0, w: 640, h: 480 }]);
  });
});


describe("Canvas2DRenderer — fill (C8, Q15)", () => {
  it("C8 fill : chemin des anneaux en cache par id, rempli en pair-impair à sa couleur", () => {
    const rings = new Float32Array([4, 0, 0, 10, 0, 10, 10, 0, 10, 4, 3, 3, 3, 6, 6, 6, 6, 3]);
    let reads = 0;
    const src: SceneSource = {
      element: (id) => (id === "f" ? { id, kind: "fill", transform: [1, 0, 0, 1, 5, 6], fill: { color: "#facc15", w: 10, h: 10 } } : null),
      outline: () => null,
      fillRings: (id) => {
        reads++;
        return id === "f" ? rings : null;
      },
    };
    const scene = new FakeCtx();
    const paths: FakePath[] = [];
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, {
      makePath: () => {
        const p = new FakePath();
        paths.push(p);
        return p as unknown as Path2D;
      },
    });
    const fill = vi.spyOn(scene, "fill");
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    expect(reads).toBe(1);
    expect(paths).toHaveLength(1);
    expect([paths[0]?.moves, paths[0]?.lines, paths[0]?.closes]).toEqual([2, 6, 2]);
    expect(fill.mock.calls.filter((c) => (c as unknown[])[1] === "evenodd")).toHaveLength(2);
    expect(scene.log).toContain("fill #facc15");
  });

  it("C8 fill : sans anneaux lisibles, rien n'est dessiné", () => {
    const src: SceneSource = {
      element: (id) => ({ id, kind: "fill", transform: [1, 0, 0, 1, 0, 0], fill: { color: "#facc15", w: 10, h: 10 } }),
      outline: () => null,
      fillRings: () => null,
    };
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, { makePath: () => new FakePath() as unknown as Path2D });
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    expect(scene.log).not.toContain("fill #facc15");
  });

  it("C8 traceRings : un sous-chemin fermé par anneau ; compte illisible ou anneau tronqué : lecture arrêtée", () => {
    const p = new FakePath();
    traceRings(p, [3, 0, 0, 1, 0, 0, 1, 2.5, 9, 9]);
    expect([p.moves, p.lines, p.closes]).toEqual([1, 2, 1]);
    const q = new FakePath();
    traceRings(q, [4, 0, 0, 1, 0]);
    expect([q.moves, q.lines, q.closes]).toEqual([0, 0, 0]);
  });
});

describe("C11a : rendu transparent (P14)", () => {
  const page = { id: "p", elementIds: [] };
  const src: SceneSource = { element: () => null, outline: () => null };
  it("transparent : clearRect, ni pourtour ni fond peints", () => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, { makePath: () => new FakePath() as unknown as Path2D, transparent: true });
    r.resize(800, 600, 1);
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.log).toContain("clearRect");
    expect(scene.log).not.toContain(`fillRect ${SURROUND_COLOR}`);
    expect(scene.log.some((l) => l.startsWith("fillRect") && l.includes(PAGE_BACKGROUND))).toBe(false);
  });
  it("transparent : l'aperçu de la gomme partielle ne peint ni fond ni pourtour (pas de traînée sur le bureau)", () => {
    const live = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), asCtx(live), src, { makePath: () => new FakePath() as unknown as Path2D, transparent: true });
    r.resize(100, 100, 1);
    r.drawScene(page, IDENTITY, new Set());
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "partial" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
  });
  it("opaque : l'aperçu de la gomme partielle repeint toujours fond puis pourtour", () => {
    const live = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), asCtx(live), src, { makePath: () => new FakePath() as unknown as Path2D });
    r.resize(100, 100, 1);
    r.drawScene(page, IDENTITY, new Set());
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "partial" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([`stroke ${PAGE_BACKGROUND} 16`, `stroke ${SURROUND_COLOR} 16`]);
  });
  it("défaut : pourtour puis fond peints, aucun clearRect (rendu inchangé)", () => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, { makePath: () => new FakePath() as unknown as Path2D });
    r.resize(800, 600, 1);
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.log).toContain(`fillRect ${SURROUND_COLOR}`);
    expect(scene.log).not.toContain("clearRect");
  });
  it("createCanvas2DRenderer : scène alpha seulement si transparent", () => {
    const asked: unknown[] = [];
    const canvas = (ctx: FakeCtx) => ({ getContext: (_k: string, o?: unknown) => { asked.push(o); return asCtx(ctx); } }) as unknown as HTMLCanvasElement;
    createCanvas2DRenderer(canvas(new FakeCtx()), canvas(new FakeCtx()), src, { transparent: true });
    createCanvas2DRenderer(canvas(new FakeCtx()), canvas(new FakeCtx()), src);
    expect(asked[0]).toEqual({ alpha: true });
    expect(asked[2]).toEqual({ alpha: false });
  });
});

// OG11 (T8) : trace complète d'un contexte — chaque appel avec ses arguments, chaque propriété affectée avec sa valeur.
// `FakeCtx.log` ne voit ni `globalAlpha`, ni `lineCap`, ni les coordonnées : un relevé sur lui ne prouverait pas
// « au pixel près ». `bezierCurveTo` est ajouté, `quadraticCurveTo` et `roundRect` non (comme `RecordingContext2D`).
class CurveCtx extends FakeCtx {
  bezierCurveTo(): void { this.log.push("bezierCurveTo"); }
}
type Call = readonly unknown[];
function tracing(): { ctx: CanvasRenderingContext2D; calls: Call[]; base: CurveCtx } {
  const base = new CurveCtx();
  const calls: Call[] = [];
  const norm = (v: unknown): unknown => (Array.isArray(v) ? [...(v as unknown[])] : typeof v === "object" && v !== null ? "<obj>" : v);
  const ctx = new Proxy(base, {
    get(t, k) {
      const v: unknown = Reflect.get(t, k, t);
      if (typeof v !== "function" || typeof k !== "string") return v;
      return (...a: unknown[]) => {
        calls.push([k, ...a.map(norm)]);
        return (v as (...x: unknown[]) => unknown).apply(t, a);
      };
    },
    set(t, k, v) {
      if (typeof k === "string") calls.push([`${k}=`, norm(v)]);
      return Reflect.set(t, k, v, t);
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, base };
}
const withLook = (look: unknown): SceneSource => ({
  element: (id) => {
    const v = VIEWS[id];
    return v === undefined ? null : ({ ...v, ...(look === undefined ? {} : { look }) } as ElementView);
  },
  outline: (id) => (id === "a" ? square : null),
});
const BOX: Bounds = { x0: 0, y0: 0, x1: 400, y1: 300 };
/** `paintContent` (export, même `paintElement` que l'écran) des éléments `ids`, aspect `look` posé sur chacun. */
function traceContent(ids: string[], look?: unknown): Call[] {
  const r = new Canvas2DRenderer(asCtx(new FakeCtx()), asCtx(new FakeCtx()), withLook(look), { makePath: () => new FakePath() as unknown as Path2D });
  const t = tracing();
  r.paintContent(t.ctx, { id: "p", elementIds: ids }, BOX, 1);
  return t.calls;
}
/** Calque d'édition seul (aperçu d'une forme) sur la scène. */
function traceOverlay(shape: Record<string, unknown>): Call[] {
  const t = tracing();
  const r = new Canvas2DRenderer(t.ctx, asCtx(new FakeCtx()), withLook(undefined), { makePath: () => new FakePath() as unknown as Path2D });
  r.resize(400, 300, 1);
  t.calls.length = 0;
  r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set(), { ...EMPTY_OVERLAY, shapes: [shape as never] });
  return t.calls;
}

// Relevé sur `main` AVANT toute modification de canvas2d.ts (console.log(JSON.stringify(...)) une fois, recopié tel quel).
const ARCHITECTE_RECT_MAIN: readonly Call[] = [
  ["save"],
  ["setTransform",1,0,0,1,-0,-0], // -rect.x0 * scale : -0 (JSON.stringify l’efface)
  ["beginPath"],
  ["rect",0,0,400,300],
  ["clip"],
  ["save"],
  ["transform",1,0,0,1,10,20],
  ["beginPath"],
  ["rect",0,0,200,100],
  ["strokeStyle=","#1e40af"],
  ["lineWidth=",4],
  ["lineCap=","round"],
  ["lineJoin=","round"],
  ["stroke"],
  ["restore"],
  ["restore"],
];
const ARCHITECTE_SCENE_MAIN: readonly Call[] = [
  ["save"],
  ["setTransform",1,0,0,1,-0,-0], // -rect.x0 * scale : -0 (JSON.stringify l’efface)
  ["beginPath"],
  ["rect",0,0,400,300],
  ["clip"],
  ["save"],
  ["transform",1,0,0,1,5,6],
  ["fillStyle=","#000000"],
  ["fill","<obj>","nonzero"],
  ["restore"],
  ["save"],
  ["transform",1,0,0,1,0,0],
  ["beginPath"],
  ["ellipse",25,15,25,15,0,0,6.283185307179586],
  ["fillStyle=","#ff0000"],
  ["fill"],
  ["strokeStyle=","#1e40af"],
  ["lineWidth=",4],
  ["lineCap=","round"],
  ["lineJoin=","round"],
  ["stroke"],
  ["restore"],
  ["save"],
  ["transform",1,0,0,1,0,0],
  ["beginPath"],
  ["moveTo",0,0],
  ["lineTo",100,0],
  ["moveTo",89.1243065555602,-5.071419140888394],
  ["lineTo",100,0],
  ["lineTo",89.1243065555602,5.071419140888391],
  ["strokeStyle=","#1e40af"],
  ["lineWidth=",4],
  ["lineCap=","round"],
  ["lineJoin=","round"],
  ["stroke"],
  ["restore"],
  ["save"],
  ["transform",1,0,0,1,0,0],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","un"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","un"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","un"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","un deux"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","un deux"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","un deux"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","trois"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["measureText","trois"],
  ["textBaseline=","top"],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["fillStyle=","#000000"],
  ["fillText","un deux",0,0],
  ["font=","20px \"Atkinson Hyperlegible\", system-ui, sans-serif"],
  ["fillStyle=","#000000"],
  ["fillText","trois",0,25],
  ["restore"],
  ["restore"],
];
const ARCHITECTE_APERCU_MAIN: readonly Call[] = [
  ["setTransform",1,0,0,1,0,0],
  ["fillStyle=","#f5f5f8"],
  ["fillRect",0,0,400,300],
  ["setTransform",1,0,0,1,0,0],
  ["fillStyle=","#ffffff"],
  ["fillStyle=","#ffffff"],
  ["fillRect",0,0,1920,300],
  ["save"],
  ["transform",1,0,0,1,100,50],
  ["beginPath"],
  ["rect",0,0,200,150],
  ["strokeStyle=","#000000"],
  ["lineWidth=",4],
  ["lineCap=","round"],
  ["lineJoin=","round"],
  ["stroke"],
  ["restore"],
];

describe("OG11 (T8) — rendu net inchangé", () => {
  it("architecte au pixel près : mêmes appels qu'avant (rectangle, scène, aperçu), aspect absent ou neutre", () => {
    const preview = { shape: "rect", x0: 300, y0: 200, x1: 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null };
    // Aspect absent, vide ou à ses valeurs neutres (opacité 100) : exactement la suite d'appels de main.
    for (const look of [undefined, {}, { opacity: 100 }]) {
      expect(traceContent(["r"], look)).toEqual(ARCHITECTE_RECT_MAIN);
      expect(traceContent(["a", "e", "f", "t"], look)).toEqual(ARCHITECTE_SCENE_MAIN);
      expect(traceOverlay(look === undefined ? preview : { ...preview, look, seed: 0 })).toEqual(ARCHITECTE_APERCU_MAIN);
    }
    expect(ARCHITECTE_RECT_MAIN.length).toBeGreaterThan(0);
  });
});

const RECT_R = { shape: "rect" as const, w: 200, h: 100, fill: null };
const PEN_R = { color: "#1e40af", width: 4 };
const named = (calls: readonly Call[], name: string): Call[] => calls.filter((c) => c[0] === name);
/** Appels entre le `save` de l'élément (après la découpe de `paintContent`) et son `restore`. */
const elementPart = (calls: readonly Call[]): Call[] => calls.slice(calls.findIndex((c) => c[0] === "clip") + 1, -1);

describe("OG11 (T8) — tirets, alpha, angles, roughjs", () => {
  it("architecte au pixel près : paintShape exporté, aspect absent ou vide, graine 0 — la suite de main", () => {
    const inner = ARCHITECTE_RECT_MAIN.slice(ARCHITECTE_RECT_MAIN.findIndex((c) => c[0] === "transform") + 1, -2);
    expect(inner.length).toBeGreaterThan(0);
    const a = tracing();
    paintShape(a.ctx, RECT_R, PEN_R);
    expect(a.calls).toEqual(inner);
    const b = tracing();
    paintShape(b.ctx, RECT_R, PEN_R, {}, 0);
    expect(b.calls).toEqual(inner);
  });

  it("tirets, alpha, angles en Bézier : setLineDash [8, 12], globalAlpha 0,5 dans le save/restore de l'élément, jamais roundRect ni quadraticCurveTo", () => {
    const calls = traceContent(["r"], { strokeStyle: "dashed", roundness: "round", opacity: 50 });
    const part = elementPart(calls);
    expect(part[0]).toEqual(["save"]);
    expect(part[part.length - 1]).toEqual(["restore"]);
    expect(part).toContainEqual(["globalAlpha=", 0.5]);
    expect(part).toContainEqual(["setLineDash", [8, 12]]);
    const dash = part.findIndex((c) => c[0] === "setLineDash" && (c[1] as number[]).length > 0);
    const stroke = part.findIndex((c) => c[0] === "stroke");
    expect(dash).toBeGreaterThan(-1);
    expect(stroke).toBeGreaterThan(dash);
    expect(calls.some((c) => c[0] === "roundRect" || c[0] === "quadraticCurveTo" || c[0] === "rect" && c[3] === 200)).toBe(false);
    expect(named(part, "bezierCurveTo")).toHaveLength(4);
    // Coins à min(0,25 · min(w, h), 32) = 25 : le premier côté va de (25, 0) à (175, 0).
    expect(named(part, "moveTo")[0]).toEqual(["moveTo", 25, 0]);
    expect(named(part, "lineTo")[0]).toEqual(["lineTo", 175, 0]);
  });

  it("pointillés : setLineDash [0, 6 + w] ; alpha posé aussi sur un trait et un texte (dans leur save/restore)", () => {
    expect(elementPart(traceContent(["r"], { strokeStyle: "dotted" }))).toContainEqual(["setLineDash", [0, 10]]);
    for (const id of ["a", "t"]) {
      const part = elementPart(traceContent([id], { opacity: 40 }));
      expect(part[0]).toEqual(["save"]);
      expect(part).toContainEqual(["globalAlpha=", 0.4]);
      expect(part[part.length - 1]).toEqual(["restore"]);
    }
  });

  it("aperçu et objet posé : même empreinte (graine du geste)", () => {
    const look = { roughness: 1 as const, seed: 7 };
    const a = tracing();
    paintShape(a.ctx, RECT_R, { color: "#000000", width: 4 }, look, 7);
    const curves = named(a.calls, "bezierCurveTo");
    expect(curves.length).toBeGreaterThan(0);
    const preview = traceOverlay({ shape: "rect", x0: 0, y0: 0, x1: 200, y1: 100, style: { color: "#000000", width: 4 }, fill: null, look, seed: 7 });
    expect(named(preview, "bezierCurveTo")).toEqual(curves);
    expect(named(elementPart(traceContent(["r"], look)), "bezierCurveTo")).toEqual(curves);
    const other = tracing();
    paintShape(other.ctx, RECT_R, { color: "#000000", width: 4 }, { roughness: 1, seed: 8 }, 8);
    expect(named(other.calls, "bezierCurveTo")).not.toEqual(curves);
  });

  it("graine absente : seedOf(id) de l'élément ; aperçu : alpha de son aspect", async () => {
    const { seedOf } = await import("./sketch");
    const a = tracing();
    paintShape(a.ctx, RECT_R, PEN_R, { roughness: 2 }, seedOf("r"));
    expect(named(elementPart(traceContent(["r"], { roughness: 2 })), "bezierCurveTo")).toEqual(named(a.calls, "bezierCurveTo"));
    const preview = traceOverlay({ shape: "rect", x0: 0, y0: 0, x1: 200, y1: 100, style: { color: "#000000", width: 4 }, fill: null, look: { opacity: 50 } });
    expect(preview).toContainEqual(["globalAlpha=", 0.5]);
  });

  it("opacité du trait vif : style.opacity du canvas d'interaction, remise à \"\" sans opacité", () => {
    const { r, live } = make({});
    const style = { opacity: "" };
    Object.assign(live.canvas, { style });
    r.resize(100, 100, 1);
    r.drawLive({ strokes: [{ outline: square, color: "#1e40af" }], erasers: [], opacity: 50 } as never, IDENTITY);
    expect(style.opacity).toBe("0.5");
    r.drawLive({ strokes: [], erasers: [] }, IDENTITY);
    expect(style.opacity).toBe("");
    r.drawLive({ strokes: [{ outline: square, color: "#1e40af" }], erasers: [], opacity: 100 } as never, IDENTITY);
    expect(style.opacity).toBe("");
  });
});
