/**
 * Échelon 4 de DA9 : canvas d'interaction en WebGL2 (DA2 : seule l'implémentation change). La scène reste au Canvas 2D
 * (`Canvas2DRenderer` sans canvas d'interaction). Contours remplis en « nonzero » comme le Canvas 2D, par le stencil :
 * éventail couleur coupée qui compte les tours, puis rectangle englobant en couleur là où le compte n'est pas nul. Un
 * éventail en couleur remplirait mal un contour concave (lettres « o », « e », boucles). Queue prédite et aperçu de
 * gomme : segments épais et disques (bouts et jointures ronds).
 */
import type { Change } from "../../core/api";
import type { Camera } from "../camera";
import { PAGE_BACKGROUND, PAGE_WIDTH, SURROUND_COLOR, visiblePageRect } from "../page";
import { PEN_HALF_WIDTH } from "./canvas2d";
import type { EditOverlay } from "./overlay";
import type { EraserPreview, LiveLayer, LiveStrokeView, PageView, Renderer } from "./renderer";

export type Rgba = readonly [number, number, number, number];

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(r, g, b)` et `rgba(r, g, b, a)` (a en nombre ou en %) en composantes
 * 0..1 ; toute autre écriture : null.
 */
export function tryParseColor(css: string): Rgba | null {
  const s = css.trim();
  const hexMatch = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  const hex = hexMatch?.[1];
  if (hex !== undefined) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    const n = Number.parseInt(full, 16);
    if (full.length === 8) {
      return [((n >>> 24) & 255) / 255, ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
  }
  const m = /^rgba?\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*(?:,\s*([\d.]+)(%?)\s*)?\)$/i.exec(s);
  if (m === null) return null;
  const ch = (v: string | undefined): number => clamp01(Number(v) / 255);
  const alpha = m[4] === undefined ? 1 : clamp01(m[5] === "%" ? Number(m[4]) / 100 : Number(m[4]));
  const out: Rgba = [ch(m[1]), ch(m[2]), ch(m[3]), alpha];
  // `1.2.3` ou `.` passent le motif mais ne sont pas des nombres : refusés, jamais un NaN dans l'uniform.
  return out.every(Number.isFinite) ? out : null;
}

/** Voir `tryParseColor` ; écriture inconnue : noir opaque (l'appelant peut le signaler avec `tryParseColor`). */
export function parseColor(css: string): Rgba {
  return tryParseColor(css) ?? [0, 0, 0, 1];
}

/**
 * Monde → espace de découpe : clip = monde × (ax, ay) + (bx, by), y vers le haut. `sx`, `sy` : échelle exacte
 * tampon / CSS (comme `Canvas2DRenderer.setView`).
 */
export function viewTransform(
  c: Camera,
  bufW: number,
  bufH: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  return [
    (2 * c.zoom * sx) / bufW,
    (2 * c.tx * sx) / bufW - 1,
    (-2 * c.zoom * sy) / bufH,
    1 - (2 * c.ty * sy) / bufH,
  ];
}

/** Fond de page en pixels du tampon pour `gl.scissor` (x, y, largeur, hauteur ; origine en bas), jusqu'au bas du tampon. */
export function pageScissor(
  c: Camera,
  bufW: number,
  bufH: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  const x0 = Math.max(0, Math.floor(c.tx * sx));
  const x1 = Math.min(bufW, Math.ceil((PAGE_WIDTH * c.zoom + c.tx) * sx));
  const top = Math.max(0, Math.floor(c.ty * sy));
  // Page infinie en hauteur : le fond va jusqu'au bas du tampon tant que le haut de page est dans la vue.
  const bottom = visiblePageRect(c, bufH / sy) ? bufH : top;
  return [x0, bufH - bottom, Math.max(0, x1 - x0), Math.max(0, bottom - top)];
}

/** Polygones x, y séparés par une paire non finie ; ceux de moins de 3 sommets sont écartés. */
export function splitPolygons(flat: ArrayLike<number>): Float32Array[] {
  const out: Float32Array[] = [];
  let cur: number[] = [];
  const flush = (): void => {
    if (cur.length >= 6) out.push(new Float32Array(cur));
    cur = [];
  };
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i] ?? Number.NaN;
    const y = flat[i + 1] ?? Number.NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      flush();
      continue;
    }
    cur.push(x, y);
  }
  flush();
  return out;
}

/** Boîte englobante x0, y0, x1, y1 d'un polygone (sommets x, y). */
export function boundsOf(poly: Float32Array): [number, number, number, number] {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (let i = 0; i + 1 < poly.length; i += 2) {
    const x = poly[i] ?? 0;
    const y = poly[i + 1] ?? 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/**
 * Trait épais en triangles (mode TRIANGLES) : un quadrilatère par segment, puis un disque à chaque sommet (bouts et
 * jointures ronds, comme `lineCap` / `lineJoin = "round"` du Canvas 2D). `discSegments` < 3 : segments seuls.
 */
export function thickPolyline(path: ArrayLike<number>, half: number, discSegments = 12): Float32Array {
  const v: number[] = [];
  const n = Math.floor(path.length / 2);
  const px = (i: number): number => path[2 * i] ?? 0;
  const py = (i: number): number => path[2 * i + 1] ?? 0;
  for (let i = 0; i + 1 < n; i++) {
    const x0 = px(i);
    const y0 = py(i);
    const x1 = px(i + 1);
    const y1 = py(i + 1);
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (!(len > 0)) continue;
    const nx = (-(y1 - y0) / len) * half;
    const ny = ((x1 - x0) / len) * half;
    v.push(x0 + nx, y0 + ny, x0 - nx, y0 - ny, x1 + nx, y1 + ny);
    v.push(x1 + nx, y1 + ny, x0 - nx, y0 - ny, x1 - nx, y1 - ny);
  }
  if (discSegments >= 3) {
    for (let i = 0; i < n; i++) {
      const cx = px(i);
      const cy = py(i);
      for (let k = 0; k < discSegments; k++) {
        const a0 = (2 * Math.PI * k) / discSegments;
        const a1 = (2 * Math.PI * (k + 1)) / discSegments;
        v.push(cx, cy, cx + Math.cos(a0) * half, cy + Math.sin(a0) * half, cx + Math.cos(a1) * half, cy + Math.sin(a1) * half);
      }
    }
  }
  return new Float32Array(v);
}

/** Options du contexte : stencil pour le remplissage nonzero, `desynchronized` comme le canvas 2D d'interaction (D19). */
export const WEBGL2_CONTEXT: WebGLContextAttributes & { readonly desynchronized?: boolean } = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: true,
  stencil: true,
  depth: false,
  preserveDrawingBuffer: false,
  desynchronized: true,
};

const VERTEX = `#version 300 es
in vec2 a_pos;
uniform vec4 u_view;
void main() {
  gl_Position = vec4(a_pos.x * u_view.x + u_view.y, a_pos.y * u_view.z + u_view.w, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 o_color;
void main() {
  o_color = vec4(u_color.rgb * u_color.a, u_color.a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL2 : shader non créé");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new Error(`WebGL2 : shader refusé ${log}`.trim());
  }
  return shader;
}

/** Programme lié ; les shaders sont détachés et supprimés dans tous les cas, le programme aussi si le lien échoue. */
function link(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  let fs: WebGLShader;
  try {
    fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  } catch (e) {
    gl.deleteShader(vs);
    throw e;
  }
  const program = gl.createProgram();
  let failed = true;
  try {
    if (!program) throw new Error("WebGL2 : programme non créé");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
      const log = gl.getProgramInfoLog(program) ?? "";
      throw new Error(`WebGL2 : programme refusé ${log}`.trim());
    }
    failed = false;
  } catch (e) {
    throw e;
  } finally {
    // Détacher avant de supprimer le programme : détacher d'un programme supprimé est une erreur WebGL (INVALID_VALUE).
    if (program) {
      gl.detachShader(program, vs);
      gl.detachShader(program, fs);
      if (failed) gl.deleteProgram(program);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  }
  return program;
}

interface Resources {
  readonly program: WebGLProgram;
  readonly uView: WebGLUniformLocation;
  readonly uColor: WebGLUniformLocation;
}

/** Programme, tampon et états fixes : au constructeur, puis à chaque restauration du contexte. */
function setup(gl: WebGL2RenderingContext): Resources {
  const program = link(gl);
  const buffer = gl.createBuffer();
  const uView = gl.getUniformLocation(program, "u_view");
  const uColor = gl.getUniformLocation(program, "u_color");
  const aPos = gl.getAttribLocation(program, "a_pos");
  if (!buffer || !uView || !uColor || aPos < 0) {
    gl.deleteProgram(program);
    throw new Error("WebGL2 : ressources du programme introuvables");
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return { program, uView, uColor };
}

export class WebGL2LiveRenderer implements Renderer {
  private res: Resources;
  private sx = 1;
  private sy = 1;
  private contextLost = false;
  /** Couleurs de trait non reconnues (dessinées en noir) : à dire à l'utilisateur. */
  readonly badColors = new Set<string>();

  constructor(
    private readonly scene: Pick<Renderer, "drawScene" | "invalidate" | "resize">,
    private readonly gl: WebGL2RenderingContext,
  ) {
    this.res = setup(gl);
    // Sans preventDefault le navigateur ne restaure jamais le contexte : l'encre vive manquerait pour toujours.
    gl.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.contextLost = true;
    });
    gl.canvas.addEventListener("webglcontextrestored", () => {
      try {
        this.res = setup(this.gl);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.contextLost = false;
      } catch {
        this.contextLost = true;
      }
    });
  }

  /** Vrai tant que le contexte est perdu : l'encre vive n'est pas dessinée (la barre pourra le dire). */
  get lost(): boolean {
    return this.contextLost;
  }

  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void {
    this.scene.drawScene(page, camera, hidden, overlay);
  }

  invalidate(change: Change): void {
    this.scene.invalidate(change);
  }

  resize(width: number, height: number, dpr: number): void {
    this.scene.resize(width, height, dpr);
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    const canvas = this.gl.canvas;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    this.sx = width > 0 ? w / width : dpr;
    this.sy = height > 0 ? h / height : dpr;
    this.gl.viewport(0, 0, w, h);
  }

  drawLive(live: LiveLayer, camera: Camera): void {
    if (this.contextLost) return;
    const gl = this.gl;
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    if (live.strokes.length === 0 && live.erasers.length === 0) return;
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    gl.uniform4fv(this.res.uView, new Float32Array(viewTransform(camera, w, h, this.sx, this.sy)));
    for (const e of live.erasers) this.paintEraser(e, camera, w, h);
    for (const s of live.strokes) this.paintStroke(s);
  }

  private draw(mode: number, vertices: Float32Array): void {
    if (vertices.length < 6) return;
    const gl = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
    gl.drawArrays(mode, 0, vertices.length / 2);
  }

  private color(css: string): void {
    const rgba = tryParseColor(css);
    if (rgba === null) this.badColors.add(css);
    this.gl.uniform4fv(this.res.uColor, new Float32Array(rgba ?? [0, 0, 0, 1]));
  }

  /** Remplissage nonzero (parité avec `ctx.fill("nonzero")` du Canvas 2D), puis queue prédite à la largeur du trait. */
  private paintStroke(s: LiveStrokeView): void {
    const gl = this.gl;
    this.color(s.color);
    for (const poly of splitPolygons(s.outline)) {
      gl.enable(gl.STENCIL_TEST);
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
      gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
      this.draw(gl.TRIANGLE_FAN, poly);
      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
      gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
      const [x0, y0, x1, y1] = boundsOf(poly);
      this.draw(gl.TRIANGLE_STRIP, new Float32Array([x0, y0, x1, y0, x0, y1, x1, y1]));
      gl.disable(gl.STENCIL_TEST);
    }
    if (s.predicted.length >= 4) this.draw(gl.TRIANGLES, thickPolyline(s.predicted, s.width / 2));
  }

  /**
   * Gomme partielle (D38, HL3-2) : pourtour peint le long du chemin, puis fond de page par-dessus, découpé au cadre de
   * la page (même résultat que les deux découpes du Canvas 2D). Gomme d'objet : rien ici.
   */
  private paintEraser(e: EraserPreview, camera: Camera, w: number, h: number): void {
    if (e.mode !== "partial" || e.path.length < 2) return;
    const gl = this.gl;
    const band = thickPolyline(e.path, e.radius + PEN_HALF_WIDTH);
    this.color(SURROUND_COLOR);
    this.draw(gl.TRIANGLES, band);
    const [x, y, sw, sh] = pageScissor(camera, w, h, this.sx, this.sy);
    if (sw === 0 || sh === 0) return;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, sw, sh);
    this.color(PAGE_BACKGROUND);
    this.draw(gl.TRIANGLES, band);
    gl.disable(gl.SCISSOR_TEST);
  }
}
