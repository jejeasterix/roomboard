/** Faux contexte WebGL2 des tests du rendu (Node n'a pas WebGL) : journalise états et dessins. Tests seulement. */

export interface FakeDraw {
  readonly mode: number;
  readonly count: number;
  /** colorMask au moment du dessin. */
  readonly color: boolean;
  readonly stencil: boolean;
  readonly scissor: boolean;
  /** Dernière couleur passée à `u_color` (valeurs Float32). */
  readonly rgba: readonly number[];
}

export class FakeGL {
  readonly canvas = { width: 0, height: 0 };
  readonly log: string[] = [];
  readonly draws: FakeDraw[] = [];
  compileOk = true;
  linkOk = true;
  readonly VERTEX_SHADER = 0x8b31;
  readonly FRAGMENT_SHADER = 0x8b30;
  readonly COMPILE_STATUS = 0x8b81;
  readonly LINK_STATUS = 0x8b82;
  readonly ARRAY_BUFFER = 0x8892;
  readonly STREAM_DRAW = 0x88e0;
  readonly FLOAT = 0x1406;
  readonly TRIANGLES = 0x0004;
  readonly TRIANGLE_STRIP = 0x0005;
  readonly TRIANGLE_FAN = 0x0006;
  readonly COLOR_BUFFER_BIT = 0x4000;
  readonly STENCIL_BUFFER_BIT = 0x0400;
  readonly STENCIL_TEST = 0x0b90;
  readonly SCISSOR_TEST = 0x0c11;
  readonly DEPTH_TEST = 0x0b71;
  readonly CULL_FACE = 0x0b44;
  readonly BLEND = 0x0be2;
  readonly ALWAYS = 0x0207;
  readonly NOTEQUAL = 0x0205;
  readonly KEEP = 0x1e00;
  readonly ZERO = 0;
  readonly ONE = 1;
  readonly ONE_MINUS_SRC_ALPHA = 0x0303;
  readonly INCR_WRAP = 0x8507;
  readonly DECR_WRAP = 0x8508;
  readonly FRONT = 0x0404;
  readonly BACK = 0x0405;
  private colorOn = true;
  private stencilOn = false;
  private scissorOn = false;
  private rgba: readonly number[] = [];

  createShader(): object {
    return {};
  }
  shaderSource(): void {}
  compileShader(): void {}
  getShaderParameter(): boolean {
    return this.compileOk;
  }
  getShaderInfoLog(): string {
    return "erreur de compilation simulée";
  }
  deleteShader(): void {}
  createProgram(): object {
    return {};
  }
  attachShader(): void {}
  linkProgram(): void {}
  getProgramParameter(): boolean {
    return this.linkOk;
  }
  getProgramInfoLog(): string {
    return "erreur d'édition de liens simulée";
  }
  useProgram(): void {}
  createBuffer(): object {
    return {};
  }
  bindBuffer(): void {}
  bufferData(): void {}
  enableVertexAttribArray(): void {}
  vertexAttribPointer(): void {}
  getAttribLocation(): number {
    return 0;
  }
  getUniformLocation(_program: unknown, name: string): { name: string } {
    return { name };
  }
  uniform4fv(loc: { name: string }, v: ArrayLike<number>): void {
    if (loc.name === "u_color") this.rgba = Array.from(v);
    else this.log.push(`${loc.name} ${Array.from(v, (n) => +n.toFixed(4)).join(",")}`);
  }
  blendFunc(): void {}
  viewport(x: number, y: number, w: number, h: number): void {
    this.log.push(`viewport ${x},${y},${w},${h}`);
  }
  enable(cap: number): void {
    this.toggle(cap, true);
  }
  disable(cap: number): void {
    this.toggle(cap, false);
  }
  colorMask(r: boolean): void {
    this.colorOn = r;
  }
  stencilFunc(func: number): void {
    this.log.push(`stencilFunc ${func}`);
  }
  stencilOp(fail: number, zfail: number, zpass: number): void {
    this.log.push(`stencilOp ${fail} ${zfail} ${zpass}`);
  }
  stencilOpSeparate(face: number, _fail: number, _zfail: number, zpass: number): void {
    this.log.push(`stencilOpSeparate ${face} ${zpass}`);
  }
  clearColor(): void {}
  clearStencil(): void {}
  clear(mask: number): void {
    this.log.push(`clear ${mask}`);
  }
  scissor(x: number, y: number, w: number, h: number): void {
    this.log.push(`scissor ${x},${y},${w},${h}`);
  }
  drawArrays(mode: number, _first: number, count: number): void {
    this.draws.push({
      mode,
      count,
      color: this.colorOn,
      stencil: this.stencilOn,
      scissor: this.scissorOn,
      rgba: this.rgba,
    });
  }
  private toggle(cap: number, on: boolean): void {
    if (cap === this.STENCIL_TEST) this.stencilOn = on;
    if (cap === this.SCISSOR_TEST) this.scissorOn = on;
  }
}

export const asGL = (f: FakeGL): WebGL2RenderingContext => f as unknown as WebGL2RenderingContext;
