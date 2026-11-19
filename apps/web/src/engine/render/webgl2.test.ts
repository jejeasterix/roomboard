import { describe, expect, it } from "vitest";
import type { Change } from "../../core/api";
import { IDENTITY, type Camera } from "../camera";
import { PAGE_BACKGROUND, SURROUND_COLOR } from "../page";
import { asGL, FakeGL } from "./fake-gl";
import type { LiveLayer, PageView, Renderer } from "./renderer";
import {
  pageScissor,
  parseColor,
  splitPolygons,
  tryParseColor,
  thickPolyline,
  viewTransform,
  WebGL2LiveRenderer,
} from "./webgl2";

class FakeScene implements Pick<Renderer, "drawScene" | "invalidate" | "resize"> {
  readonly log: string[] = [];
  drawScene(page: PageView): void {
    this.log.push(`scene ${page.id}`);
  }
  invalidate(change: Change): void {
    this.log.push(`invalidate ${change.version}`);
  }
  resize(w: number, h: number, dpr: number): void {
    this.log.push(`resize ${w},${h},${dpr}`);
  }
}

function make() {
  const gl = new FakeGL();
  const scene = new FakeScene();
  const r = new WebGL2LiveRenderer(scene, asGL(gl));
  r.resize(200, 100, 1);
  return { gl, scene, r };
}

const f32 = (v: readonly number[]): number[] => Array.from(new Float32Array(v));
/** Contour concave en U (8 sommets) : un éventail en couleur depuis le premier sommet déborderait dans le creux. */
const U = new Float32Array([0, 0, 30, 0, 30, 30, 20, 30, 20, 10, 10, 10, 10, 30, 0, 30]);
const stroke = (outline: Float32Array, predicted = new Float32Array(0)): LiveLayer => ({
  strokes: [{ outline, predicted, color: "#ff0000", width: 4 }],
  erasers: [],
});

describe("géométrie WebGL2 (échelon 4)", () => {
  it("parseColor : #rrggbb et #rgb ; autre chose → noir opaque", () => {
    expect(parseColor("#ff8000")).toEqual([1, 128 / 255, 0, 1]);
    expect(parseColor("#F00")).toEqual([1, 0, 0, 1]);
    expect(parseColor("rouge")).toEqual([0, 0, 0, 1]);
  });

  it("parseColor : #rrggbbaa, #rgba, rgb() et rgba() (alpha en nombre ou en pourcentage)", () => {
    expect(parseColor("#ff000080")).toEqual([1, 0, 0, 128 / 255]);
    expect(parseColor("#f008")).toEqual([1, 0, 0, 136 / 255]);
    expect(parseColor("rgb(255, 128, 0)")).toEqual([1, 128 / 255, 0, 1]);
    expect(parseColor("rgba(0,0,255,0.5)")).toEqual([0, 0, 1, 0.5]);
    expect(parseColor("RGBA( 0 , 0 , 255 , 50% )")).toEqual([0, 0, 1, 0.5]);
    expect(parseColor("rgb(300, -5, 0)")).toEqual([1, 0, 0, 1]);
  });

  it("tryParseColor : null pour une écriture inconnue", () => {
    expect(tryParseColor("hsl(10, 50%, 50%)")).toBeNull();
    expect(tryParseColor("rouge")).toBeNull();
    expect(tryParseColor("#ff0000")).toEqual([1, 0, 0, 1]);
  });

  it("viewTransform : coins du tampon en coins de découpe", () => {
    const cam: Camera = { zoom: 2, tx: 10, ty: 20 };
    const [ax, bx, ay, by] = viewTransform(cam, 200, 100, 1, 1);
    expect(-5 * ax + bx).toBeCloseTo(-1);
    expect(95 * ax + bx).toBeCloseTo(1);
    expect(-10 * ay + by).toBeCloseTo(1);
    expect(40 * ay + by).toBeCloseTo(-1);
  });

  it("pageScissor : cadre de page en pixels du tampon, origine en bas, borné au tampon", () => {
    expect(pageScissor({ zoom: 0.5, tx: 10, ty: 20 }, 1280, 720, 1, 1)).toEqual([10, 160, 960, 540]);
    expect(pageScissor({ zoom: 0.5, tx: 10, ty: 20 }, 1280, 720, 2, 2)[2]).toBe(1260);
  });

  it("splitPolygons : une paire NaN sépare deux polygones ; moins de 3 sommets écarté", () => {
    const flat = [0, 0, 1, 0, 1, 1, NaN, NaN, 5, 5, 6, 6, NaN, NaN, 9, 9, 10, 9, 10, 10];
    expect(splitPolygons(flat).map((p) => Array.from(p))).toEqual([
      [0, 0, 1, 0, 1, 1],
      [9, 9, 10, 9, 10, 10],
    ]);
  });

  it("thickPolyline : un segment = deux triangles à ± demi-épaisseur ; un disque par sommet", () => {
    expect(Array.from(thickPolyline([0, 0, 10, 0], 2, 0))).toEqual([0, 2, 0, -2, 10, 2, 10, 2, 0, -2, 10, -2]);
    expect(thickPolyline([0, 0, 10, 0], 2, 12)).toHaveLength(12 + 2 * 12 * 6);
    expect(thickPolyline([5, 5], 3, 12)).toHaveLength(12 * 6);
  });
});

describe("WebGL2LiveRenderer (échelon 4)", () => {
  it("remplissage nonzero par stencil : couleur coupée pendant l'éventail, puis rectangle couvrant", () => {
    const { gl, r } = make();
    r.drawLive(stroke(U), IDENTITY);
    expect(gl.draws.map((d) => [d.mode, d.count, d.color, d.stencil])).toEqual([
      [gl.TRIANGLE_FAN, 8, false, true],
      [gl.TRIANGLE_STRIP, 4, true, true],
    ]);
    expect(gl.log).toContain(`stencilOpSeparate ${gl.FRONT} ${gl.INCR_WRAP}`);
    expect(gl.log).toContain(`stencilOpSeparate ${gl.BACK} ${gl.DECR_WRAP}`);
    expect(gl.log).toContain(`stencilFunc ${gl.NOTEQUAL}`);
    expect(gl.draws.some((d) => d.mode === gl.TRIANGLE_FAN && d.color)).toBe(false);
    expect(gl.draws[1]?.rgba).toEqual([1, 0, 0, 1]);
  });

  it("contour en blocs (paire NaN) : un passage stencil par polygone", () => {
    const { gl, r } = make();
    const two = new Float32Array([...U, NaN, NaN, ...U.map((v) => v + 40)]);
    r.drawLive(stroke(two), IDENTITY);
    expect(gl.draws.map((d) => d.mode)).toEqual([gl.TRIANGLE_FAN, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN, gl.TRIANGLE_STRIP]);
  });

  it("queue prédite : triangles épais à la largeur du trait, en couleur, hors stencil", () => {
    const { gl, r } = make();
    r.drawLive(stroke(U, new Float32Array([30, 30, 40, 30])), IDENTITY);
    expect(gl.draws[2]).toMatchObject({
      mode: gl.TRIANGLES,
      color: true,
      stencil: false,
      count: thickPolyline([30, 30, 40, 30], 2).length / 2,
    });
  });

  it("drawLive sans aperçu : effacé seulement (couleur et stencil), aucun dessin", () => {
    const { gl, r } = make();
    r.drawLive({ strokes: [], erasers: [] }, IDENTITY);
    expect(gl.draws).toEqual([]);
    expect(gl.log).toContain(`clear ${gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT}`);
  });

  it("gomme partielle : pourtour le long du chemin, puis fond de page découpé au cadre (scissor)", () => {
    const { gl, r } = make();
    const cam: Camera = { zoom: 0.05, tx: 10, ty: 20 };
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 100, 0]), radius: 10, mode: "partial" }] }, cam);
    expect(gl.draws.map((d) => [d.mode, d.scissor, d.rgba])).toEqual([
      [gl.TRIANGLES, false, f32(parseColor(SURROUND_COLOR))],
      [gl.TRIANGLES, true, f32(parseColor(PAGE_BACKGROUND))],
    ]);
    expect(gl.log).toContain(`scissor ${pageScissor(cam, 200, 100, 1, 1).join(",")}`);
    expect(gl.draws[0]?.count).toBe(thickPolyline([0, 0, 100, 0], 12).length / 2);
  });

  it("gomme d'objet : rien de dessiné (les traits touchés sont masqués de la scène)", () => {
    const { gl, r } = make();
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 100, 0]), radius: 10, mode: "object" }] }, IDENTITY);
    expect(gl.draws).toEqual([]);
  });

  it("resize : tampon au devicePixelRatio, viewport, scène redimensionnée", () => {
    const { gl, scene, r } = make();
    r.resize(100.4, 50, 2);
    expect(gl.canvas).toEqual({ width: 201, height: 100 });
    expect(gl.log).toContain("viewport 0,0,201,100");
    expect(scene.log).toContain("resize 100.4,50,2");
  });

  it("drawScene et invalidate passent à la scène Canvas 2D", () => {
    const { scene, r } = make();
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set<string>());
    r.invalidate({ pages: [], ids: [], removed: [], full: true, version: 7 });
    expect(scene.log).toEqual(["resize 200,100,1", "scene p", "invalidate 7"]);
  });

  it("remise à zéro du stencil : le rectangle couvrant remet le compte à ZERO (stencilOp ZERO ZERO ZERO)", () => {
    const { gl, r } = make();
    r.drawLive(stroke(U), IDENTITY);
    expect(gl.log).toContain(`stencilOp ${gl.ZERO} ${gl.ZERO} ${gl.ZERO}`);
    expect(gl.log).not.toContain(`stencilOp ${gl.KEEP} ${gl.KEEP} ${gl.KEEP}`);
  });

  it("couleur non reconnue : noir en direct, mais signalée dans badColors", () => {
    const { gl, r } = make();
    expect(r.badColors.size).toBe(0);
    r.drawLive({ strokes: [{ outline: U, predicted: new Float32Array(0), color: "teal", width: 4 }], erasers: [] }, IDENTITY);
    expect(gl.draws[1]?.rgba).toEqual([0, 0, 0, 1]);
    expect([...r.badColors]).toEqual(["teal"]);
  });

  it("couleur rgba : alpha transmis au dessin", () => {
    const { gl, r } = make();
    r.drawLive({ strokes: [{ outline: U, predicted: new Float32Array(0), color: "rgba(255,0,0,0.5)", width: 4 }], erasers: [] }, IDENTITY);
    expect(gl.draws[1]?.rgba).toEqual(f32([1, 0, 0, 0.5]));
    expect(r.badColors.size).toBe(0);
  });

  it("édition de liens réussie : shaders détachés puis supprimés, programme gardé", () => {
    const { gl } = make();
    expect(gl.log.filter((l) => l === "detachShader")).toHaveLength(2);
    expect(gl.log.filter((l) => l === "deleteShader")).toHaveLength(2);
    expect(gl.log).not.toContain("deleteProgram");
  });

  it("édition de liens ratée : le constructeur lève, programme et shaders supprimés", () => {
    const gl = new FakeGL();
    gl.linkOk = false;
    expect(() => new WebGL2LiveRenderer(new FakeScene(), asGL(gl))).toThrow(/^WebGL2 : programme refusé/);
    expect(gl.log.filter((l) => l === "deleteProgram")).toHaveLength(1);
    expect(gl.log.filter((l) => l === "deleteShader")).toHaveLength(2);
  });

  it("shader de fragment refusé : le shader de sommet déjà compilé est supprimé", () => {
    const gl = new FakeGL();
    gl.failCompileAt = 1;
    expect(() => new WebGL2LiveRenderer(new FakeScene(), asGL(gl))).toThrow(/shader refusé/);
    expect(gl.log.filter((l) => l === "deleteShader")).toHaveLength(2);
  });

  it("perte de contexte : preventDefault, lost vrai, drawLive ne lève pas et ne dessine rien", () => {
    const { gl, r } = make();
    expect(r.lost).toBe(false);
    const e = gl.fire("webglcontextlost");
    expect(e.defaultPrevented).toBe(true);
    expect(r.lost).toBe(true);
    expect(() => r.drawLive(stroke(U), IDENTITY)).not.toThrow();
    expect(gl.draws).toEqual([]);
  });

  it("contexte restauré : programme et tampons recréés, viewport rétabli, l'encre vive revient", () => {
    const { gl, r } = make();
    gl.fire("webglcontextlost");
    gl.log.length = 0;
    gl.fire("webglcontextrestored");
    expect(r.lost).toBe(false);
    expect(gl.log).toContain("createProgram");
    expect(gl.log).toContain("viewport 0,0,200,100");
    r.drawLive(stroke(U), IDENTITY);
    expect(gl.draws.map((d) => d.mode)).toEqual([gl.TRIANGLE_FAN, gl.TRIANGLE_STRIP]);
  });

  it("restauration qui échoue : reste perdu, sans lever", () => {
    const { gl, r } = make();
    gl.fire("webglcontextlost");
    gl.compileOk = false;
    expect(() => gl.fire("webglcontextrestored")).not.toThrow();
    expect(r.lost).toBe(true);
    expect(() => r.drawLive(stroke(U), IDENTITY)).not.toThrow();
  });

  it("shader refusé : le constructeur lève une Error WebGL2", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    expect(() => new WebGL2LiveRenderer(new FakeScene(), asGL(gl))).toThrow(/^WebGL2 : shader refusé/);
  });
});
