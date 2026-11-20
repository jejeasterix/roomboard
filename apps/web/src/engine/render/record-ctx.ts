/**
 * Contexte enregistreur (C12, PF22, DAPF4) : `paintContent` (même code que l'écran, D7) dessine ici, et la liste
 * d'affichage part au Worker du module `formats` (`write_pdf_pages`, krilla). Codes : table de la tâche T11 du plan
 * (`crates/roomboard-formats/src/pdf.rs`). Couleurs normalisées par un vrai contexte (`real`, couleur illisible =
 * précédente gardée) ; `measureText` délégué. Une méthode absente lève (`TypeError`) : rien n'est perdu en silence.
 */
export const OP = { page: 1, save: 2, restore: 3, fill: 4, stroke: 5, clip: 6, text: 7, image: 8 } as const;
export const SEG = { move: 0, line: 1, cubic: 2, close: 3 } as const;

export interface RecordedList {
  readonly ops: Float32Array;
  readonly texts: readonly string[];
  readonly images: readonly unknown[];
  /** Opérations de dessin de chaque page ; 0 : rien à superposer (T13). */
  readonly drawn: readonly number[];
}

type M = [number, number, number, number, number, number];
const IDENTITY: M = [1, 0, 0, 1, 0, 0];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const TAU = Math.PI * 2;

export class RecordingPath {
  private readonly segs: number[] = [];
  private n = 0;
  private cur: readonly [number, number] | null = null;
  private start: readonly [number, number] | null = null;
  moveTo(x: number, y: number): void {
    this.segs.push(SEG.move, x, y);
    this.n += 1;
    this.cur = this.start = [x, y];
  }
  lineTo(x: number, y: number): void {
    if (this.cur === null) return this.moveTo(x, y);
    this.segs.push(SEG.line, x, y);
    this.n += 1;
    this.cur = [x, y];
  }
  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
    if (this.cur === null) this.moveTo(x1, y1);
    this.segs.push(SEG.cubic, x1, y1, x2, y2, x, y);
    this.n += 1;
    this.cur = [x, y];
  }
  closePath(): void {
    if (this.cur === null) return;
    this.segs.push(SEG.close);
    this.n += 1;
    this.cur = this.start;
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }
  /** Arc d'ellipse en cubiques d'au plus un quart de tour (k = 4/3 · tan(Δ/4)). */
  ellipse(cx: number, cy: number, rx: number, ry: number, rotation: number, a0: number, a1: number, ccw = false): void {
    let sweep = a1 - a0;
    if (Math.abs(sweep) >= TAU) sweep = ccw ? -TAU : TAU;
    else if (!ccw && sweep < 0) sweep += TAU;
    else if (ccw && sweep > 0) sweep -= TAU;
    const [c, s] = [Math.cos(rotation), Math.sin(rotation)];
    const pt = (a: number): [number, number] => {
      const [x, y] = [rx * Math.cos(a), ry * Math.sin(a)];
      return [cx + x * c - y * s, cy + x * s + y * c];
    };
    const tan = (a: number): [number, number] => {
      const [x, y] = [-rx * Math.sin(a), ry * Math.cos(a)];
      return [x * c - y * s, x * s + y * c];
    };
    const n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
    const step = sweep / n;
    const k = (4 / 3) * Math.tan(step / 4);
    const [sx, sy] = pt(a0);
    if (this.cur === null) this.moveTo(sx, sy);
    else this.lineTo(sx, sy);
    for (let i = 0; i < n; i++) {
      const t0 = a0 + i * step;
      const t1 = t0 + step;
      const [p0, p1, d0, d1] = [pt(t0), pt(t1), tan(t0), tan(t1)];
      this.bezierCurveTo(p0[0] + k * d0[0], p0[1] + k * d0[1], p1[0] - k * d1[0], p1[1] - k * d1[1], p1[0], p1[1]);
    }
  }
  get empty(): boolean {
    return this.n === 0;
  }
  encode(): number[] {
    return [this.n, ...this.segs];
  }
}

interface State {
  m: M;
  fill: string;
  stroke: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  dash: number[];
  dashOffset: number;
  alpha: number;
  font: string;
  baseline: CanvasTextBaseline;
}
const initial = (): State => ({ m: [...IDENTITY], fill: "#000000", stroke: "#000000", lineWidth: 1, lineCap: "butt", lineJoin: "miter", dash: [], dashOffset: 0, alpha: 1, font: "10px sans-serif", baseline: "alphabetic" });

/** `#rrggbb` ou `rgb[a](r, g, b[, a])` (formes rendues par un canvas) → [r, g, b, a] ; autre : noir. */
function rgbaOf(c: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
  if (hex) return [parseInt(hex[1]!, 16), parseInt(hex[2]!, 16), parseInt(hex[3]!, 16), 1];
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4])];
  return [0, 0, 0, 1];
}
const CAP: Record<CanvasLineCap, number> = { butt: 0, round: 1, square: 2 };
const JOIN: Record<CanvasLineJoin, number> = { miter: 0, round: 1, bevel: 2 };

export class RecordingContext2D {
  readonly canvas = { width: 0, height: 0 };
  private readonly ops: number[] = [];
  private readonly texts: string[] = [];
  private readonly images: unknown[] = [];
  private readonly drawn: number[] = [];
  private st: State = initial();
  private readonly stack: State[] = [];
  private path = new RecordingPath();

  constructor(private readonly real: Pick<CanvasRenderingContext2D, "fillStyle" | "font" | "measureText">) {}

  /** Nouvelle page (code PAGE) : état remis à zéro. */
  page(w: number, h: number): void {
    this.ops.push(OP.page, w, h);
    this.drawn.push(0);
    this.st = initial();
    this.stack.length = 0;
    this.path = new RecordingPath();
    this.canvas.width = w;
    this.canvas.height = h;
  }
  encode(): RecordedList {
    return { ops: Float32Array.from(this.ops), texts: [...this.texts], images: [...this.images], drawn: [...this.drawn] };
  }

  private color(v: unknown, prev: string): string {
    if (typeof v !== "string") return prev;
    this.real.fillStyle = prev;
    this.real.fillStyle = v;
    return String(this.real.fillStyle);
  }
  get fillStyle(): string { return this.st.fill; }
  set fillStyle(v: string) { this.st.fill = this.color(v, this.st.fill); }
  get strokeStyle(): string { return this.st.stroke; }
  set strokeStyle(v: string) { this.st.stroke = this.color(v, this.st.stroke); }
  get lineWidth(): number { return this.st.lineWidth; }
  set lineWidth(v: number) { if (Number.isFinite(v) && v > 0) this.st.lineWidth = v; }
  get lineCap(): CanvasLineCap { return this.st.lineCap; }
  set lineCap(v: CanvasLineCap) { this.st.lineCap = v; }
  get lineJoin(): CanvasLineJoin { return this.st.lineJoin; }
  set lineJoin(v: CanvasLineJoin) { this.st.lineJoin = v; }
  get globalAlpha(): number { return this.st.alpha; }
  set globalAlpha(v: number) { if (v >= 0 && v <= 1) this.st.alpha = v; }
  get lineDashOffset(): number { return this.st.dashOffset; }
  set lineDashOffset(v: number) { this.st.dashOffset = v; }
  get font(): string { return this.st.font; }
  set font(v: string) { this.st.font = v; }
  get textBaseline(): CanvasTextBaseline { return this.st.baseline; }
  set textBaseline(v: CanvasTextBaseline) { this.st.baseline = v; }

  save(): void {
    this.stack.push({ ...this.st, m: [...this.st.m], dash: [...this.st.dash] });
    this.ops.push(OP.save);
  }
  restore(): void {
    const s = this.stack.pop();
    if (s === undefined) return;
    this.st = s;
    this.ops.push(OP.restore);
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void { this.st.m = [a, b, c, d, e, f]; }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void { this.st.m = mul(this.st.m, [a, b, c, d, e, f]); }
  setLineDash(d: number[]): void { this.st.dash = [...d]; }
  getLineDash(): number[] { return [...this.st.dash]; }
  beginPath(): void { this.path = new RecordingPath(); }
  moveTo(x: number, y: number): void { this.path.moveTo(x, y); }
  lineTo(x: number, y: number): void { this.path.lineTo(x, y); }
  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void { this.path.bezierCurveTo(x1, y1, x2, y2, x, y); }
  closePath(): void { this.path.closePath(); }
  rect(x: number, y: number, w: number, h: number): void { this.path.rect(x, y, w, h); }
  ellipse(cx: number, cy: number, rx: number, ry: number, rotation: number, a0: number, a1: number, ccw?: boolean): void {
    this.path.ellipse(cx, cy, rx, ry, rotation, a0, a1, ccw);
  }

  private paint(c: string): number[] {
    const [r, g, b, a] = rgbaOf(c);
    return [r, g, b, a * this.st.alpha];
  }
  private count(): void {
    const k = this.drawn.length - 1;
    if (k >= 0) this.drawn[k] = (this.drawn[k] ?? 0) + 1;
  }
  fill(a?: RecordingPath | CanvasFillRule, b?: CanvasFillRule): void {
    const path = a instanceof RecordingPath ? a : this.path;
    const rule = typeof a === "string" ? a : b;
    if (path.empty) return;
    this.ops.push(OP.fill, ...this.st.m, ...this.paint(this.st.fill), rule === "evenodd" ? 1 : 0, ...path.encode());
    this.count();
  }
  stroke(p?: RecordingPath): void {
    const path = p ?? this.path;
    if (path.empty) return;
    const s = this.st;
    this.ops.push(OP.stroke, ...s.m, ...this.paint(s.stroke), s.lineWidth, CAP[s.lineCap] ?? 0, JOIN[s.lineJoin] ?? 0, s.dash.length, ...s.dash, s.dashOffset, ...path.encode());
    this.count();
  }
  clip(rule?: CanvasFillRule): void {
    this.ops.push(OP.clip, ...this.st.m, rule === "evenodd" ? 1 : 0, ...this.path.encode());
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    const p = new RecordingPath();
    p.rect(x, y, w, h);
    this.fill(p);
  }
  fillText(text: string, x: number, y: number): void {
    if (text === "") return;
    const f = /^(italic )?(bold )?([\d.]+)px/.exec(this.st.font);
    const size = f ? Number(f[3]) : 10;
    const face = (f?.[2] ? 1 : 0) + (f?.[1] ? 2 : 0);
    this.texts.push(text);
    this.ops.push(OP.text, ...this.st.m, ...this.paint(this.st.fill), size, x, y, this.st.baseline === "top" ? 0 : 1, this.texts.length - 1, face);
    this.count();
  }
  measureText(text: string): TextMetrics {
    this.real.font = this.st.font;
    return this.real.measureText(text);
  }
  drawImage(img: CanvasImageSource, x = 0, y = 0, w?: number, h?: number): void {
    let i = this.images.indexOf(img);
    if (i < 0) i = this.images.push(img) - 1;
    const size = img as { width?: number; height?: number };
    this.ops.push(OP.image, ...this.st.m, i, x, y, w ?? size.width ?? 0, h ?? size.height ?? 0, this.st.alpha);
    this.count();
  }
}
