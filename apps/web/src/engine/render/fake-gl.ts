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

export interface FakeEvent {
  readonly type: string;
  defaultPrevented: boolean;
  preventDefault(): void;
}

export class FakeGL {
  /** Canvas factice : taille + écouteurs (méthodes non énumérables pour que `toEqual({ width, height })` reste vrai). */
  readonly canvas: { width: number; height: number } = this.makeCanvas();
  private readonly listeners = new Map<string, ((e: FakeEvent) => void)[]>();
  /** Vrai si `getExtension("WEBGL_lose_context")` rend l'extension. */
  loseContextAvailable = true;
  readonly log: string[] = [];
  readonly draws: FakeDraw[] = [];
  compileOk = true;
  /** Si renseigné : seul ce compile (0 = sommet, 1 = fragment) est refusé, `compileOk` étant ignoré. */
  failCompileAt: number | null = null;
  private compiles = 0;
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

  private makeCanvas(): { width: number; height: number } {
    const canvas = { width: 0, height: 0 };
    Object.defineProperty(canvas, "addEventListener", {
      value: (type: string, cb: (e: FakeEvent) => void) => {
        const list = this.listeners.get(type) ?? [];
        list.push(cb);
        this.listeners.set(type, list);
      },
    });
    Object.defineProperty(canvas, "removeEventListener", {
      value: (type: string, cb: (e: FakeEvent) => void) => {
        this.listeners.set(type, (this.listeners.get(type) ?? []).filter((x) => x !== cb));
      },
    });
    return canvas;
  }

  /** Simule un évènement du canvas (`webglcontextlost`, `webglcontextrestored`) ; rend l'évènement vu des écouteurs. */
  fire(type: string): FakeEvent {
    const e: FakeEvent = {
      type,
      defaultPrevented: false,
      preventDefault() {
        e.defaultPrevented = true;
      },
    };
    for (const cb of this.listeners.get(type) ?? []) cb(e);
    return e;
  }

  getExtension(name: string): { loseContext(): void } | null {
    if (name !== "WEBGL_lose_context" || !this.loseContextAvailable) return null;
    return { loseContext: () => this.log.push("loseContext") };
  }
  createShader(): object {
    this.log.push("createShader");
    return {};
  }
  shaderSource(): void {}
  compileShader(): void {}
  getShaderParameter(): boolean {
    const nth = this.compiles++;
    return this.failCompileAt === null ? this.compileOk : nth !== this.failCompileAt;
  }
  getShaderInfoLog(): string {
    return "erreur de compilation simulée";
  }
  deleteShader(): void {
    this.log.push("deleteShader");
  }
  detachShader(): void {
    this.log.push("detachShader");
  }
  deleteProgram(): void {
    this.log.push("deleteProgram");
  }
  createProgram(): object {
    this.log.push("createProgram");
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
