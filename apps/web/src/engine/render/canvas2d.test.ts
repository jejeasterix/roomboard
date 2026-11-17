import { describe, expect, it } from "vitest";
import { IDENTITY } from "../camera";
import { PAGE_BACKGROUND, SURROUND_COLOR } from "../page";
import { Canvas2DRenderer, createCanvas2DRenderer, tracePolygons } from "./canvas2d";
import type { SceneSource } from "./renderer";

class FakeCtx {
  readonly canvas = { width: 0, height: 0 };
  readonly log: string[] = [];
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
  save(): void { this.log.push("save"); }
  restore(): void { this.log.push("restore"); }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`setTransform ${[a, b, c, d, e, f].map((v) => +v.toFixed(4)).join(",")}`);
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`transform ${[a, b, c, d, e, f].join(",")}`);
  }
  clearRect(): void { this.log.push("clearRect"); }
  fillRect(): void { this.log.push(`fillRect ${this.fillStyle}`); }
  beginPath(): void { this.log.push("beginPath"); }
  moveTo(): void { this.log.push("moveTo"); }
  lineTo(): void { this.log.push("lineTo"); }
  closePath(): void { this.log.push("closePath"); }
  rect(): void { this.log.push("rect"); }
  clip(): void { this.log.push("clip"); }
  fill(): void { this.log.push(`fill ${this.fillStyle}`); }
  stroke(): void { this.log.push(`stroke ${this.strokeStyle} ${this.lineWidth}`); }
}

class FakePath {
  moves = 0;
  lines = 0;
  closes = 0;
  moveTo(): void { this.moves++; }
  lineTo(): void { this.lines++; }
  closePath(): void { this.closes++; }
}

const asCtx = (f: FakeCtx): CanvasRenderingContext2D => f as unknown as CanvasRenderingContext2D;
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
});
